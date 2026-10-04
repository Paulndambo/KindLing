import json
import re
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import permissions, throttling
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SubscriptionStatus
from .plans import PLAN_CATALOG, plan_entitlements, serialize_plan
from .serializers import (
    AiRoutingPreferenceSerializer,
    PlatformSubscriptionSerializer,
    SubscriptionSelectSerializer,
    ensure_ai_routing,
    ensure_subscription,
)


class PlanCatalogView(APIView):
    """Public plan catalog for the settings UI."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        plans = [serialize_plan(pid) for pid in PLAN_CATALOG]
        return Response({"plans": plans})


class SubscriptionView(APIView):
    """GET current subscription · POST select/activate a plan (pilot checkout)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sub = ensure_subscription(request.user)
        return Response(PlatformSubscriptionSerializer(sub).data)

    def post(self, request):
        """
        Pilot-friendly plan activation (no Stripe yet).
        Treats selection as an immediate active subscription period.
        """
        serializer = SubscriptionSelectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.validated_data["plan"]
        cycle = serializer.validated_data.get("billing_cycle") or "monthly"

        sub = ensure_subscription(request.user)
        now = timezone.now()
        period = timedelta(days=365 if cycle == "yearly" else 30)

        sub.plan = plan
        sub.status = SubscriptionStatus.ACTIVE
        sub.billing_cycle = cycle
        sub.current_period_start = now
        sub.current_period_end = now + period
        sub.cancel_at_period_end = False
        sub.save()

        return Response(PlatformSubscriptionSerializer(sub).data)

    def patch(self, request):
        """Cancel at period end or resume."""
        sub = ensure_subscription(request.user)
        if "cancel_at_period_end" in request.data:
            sub.cancel_at_period_end = bool(request.data["cancel_at_period_end"])
            if sub.cancel_at_period_end and sub.status == SubscriptionStatus.ACTIVE:
                pass
            elif not sub.cancel_at_period_end and sub.status == SubscriptionStatus.CANCELED:
                sub.status = SubscriptionStatus.ACTIVE
            sub.save(update_fields=["cancel_at_period_end", "status", "updated_at"])
        return Response(PlatformSubscriptionSerializer(sub).data)


class AiRoutingView(APIView):
    """GET/PATCH AI routing preferences (no raw secrets)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pref = ensure_ai_routing(request.user)
        return Response(AiRoutingPreferenceSerializer(pref).data)

    def patch(self, request):
        pref = ensure_ai_routing(request.user)
        serializer = AiRoutingPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        return self.patch(request)


class PlatformGeminiView(APIView):
    """Authenticated, bounded proxy for Kindling's server-held Gemini key."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "platform_ai"
    max_body_bytes = 8 * 1024 * 1024
    max_output_tokens = 2048

    def post(self, request):
        api_key = settings.PLATFORM_GEMINI_API_KEY
        if not api_key:
            return Response({"detail": "Platform AI is not configured."}, status=503)

        sub = getattr(request.user, "platform_subscription", None)
        if not sub or sub.status not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING):
            return Response({"detail": "An active plan is required for platform AI."}, status=403)
        if not plan_entitlements(sub.plan, sub.entitlements_override or {}).get("platformAi"):
            return Response({"detail": "This plan does not include platform AI."}, status=403)

        try:
            content_length = int(request.META.get("CONTENT_LENGTH") or 0)
        except (TypeError, ValueError):
            content_length = 0
        if content_length > self.max_body_bytes:
            return Response({"detail": "AI request is too large."}, status=413)

        data = request.data
        if not isinstance(data, dict):
            return Response({"detail": "Invalid AI request."}, status=400)
        model = str(data.get("model") or "")
        if not re.fullmatch(r"gemini-[A-Za-z0-9._-]{1,100}", model):
            return Response({"detail": "Unsupported Gemini model."}, status=400)
        contents = data.get("contents")
        if not isinstance(contents, (str, list, dict)):
            return Response({"detail": "Invalid Gemini contents."}, status=400)
        config = data.get("config") or {}
        if not isinstance(config, dict):
            return Response({"detail": "Invalid Gemini config."}, status=400)
        config = dict(config)
        requested_tokens = config.get("maxOutputTokens", self.max_output_tokens)
        try:
            config["maxOutputTokens"] = min(max(1, int(requested_tokens)), self.max_output_tokens)
        except (TypeError, ValueError):
            config["maxOutputTokens"] = self.max_output_tokens

        system_instruction = config.pop("systemInstruction", None)
        payload = {"contents": contents, "generationConfig": config}
        # SDK-style system instruction is translated to Gemini REST's field.
        if system_instruction:
            payload["systemInstruction"] = system_instruction
        streaming = bool(data.get("stream"))
        method = "streamGenerateContent" if streaming else "generateContent"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:{method}?key={api_key}"
        if streaming:
            url += "&alt=sse"
        upstream_request = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream" if streaming else "application/json",
            },
            method="POST",
        )
        try:
            upstream = urlopen(upstream_request, timeout=90)
        except HTTPError as exc:
            detail = exc.read(4096).decode("utf-8", "replace")
            return Response({"detail": "Gemini request failed.", "provider_detail": detail}, status=502)
        except (URLError, TimeoutError):
            return Response({"detail": "Gemini service is temporarily unavailable."}, status=502)

        if streaming:
            def relay():
                try:
                    while True:
                        chunk = upstream.read(4096)
                        if not chunk:
                            break
                        yield chunk
                finally:
                    upstream.close()
            response = StreamingHttpResponse(relay(), content_type="text/event-stream")
            response["Cache-Control"] = "no-cache, no-transform"
            response["X-Accel-Buffering"] = "no"
            return response

        try:
            result = json.loads(upstream.read(self.max_body_bytes + 1))
        finally:
            upstream.close()
        if len(json.dumps(result).encode("utf-8")) > self.max_body_bytes:
            return Response({"detail": "Gemini response is too large."}, status=502)
        return Response(result)
