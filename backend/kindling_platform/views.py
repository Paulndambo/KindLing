import json
import random
import re
import time
from decimal import Decimal
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import permissions, throttling
from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BillingCycle, BillingInvoice, PlanId, SubscriptionStatus
from .plans import PLAN_CATALOG, plan_entitlements, serialize_plan
from .serializers import (
    AiRoutingPreferenceSerializer,
    BillingInvoiceSerializer,
    InvoiceRequestSerializer,
    PlatformSubscriptionSerializer,
    SubscriptionSelectSerializer,
    ensure_ai_routing,
    ensure_subscription,
)
from .usage import daily_ai_usage, reserve_daily_ai_request


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
        payload = PlatformSubscriptionSerializer(sub).data
        payload["platform_ai_daily_usage"] = daily_ai_usage(request.user, sub)
        return Response(payload)

    def post(self, request):
        """Keep the free Spark selection self-serve; paid plans use invoices."""
        serializer = SubscriptionSelectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.validated_data["plan"]
        cycle = serializer.validated_data.get("billing_cycle") or "monthly"
        sub = ensure_subscription(request.user)
        if plan != PlanId.SPARK:
            if not settings.ALLOW_SELF_SERVICE_PLAN_ACTIVATION:
                return Response(
                    {"detail": "Paid plans require an invoice request and payment confirmation."},
                    status=400,
                )
            # Explicit development/demo escape hatch; disabled in production.
            now = timezone.now()
            sub.plan = plan
            sub.status = SubscriptionStatus.ACTIVE
            sub.billing_cycle = cycle
            sub.current_period_start = now
            sub.current_period_end = now + timedelta(days=365 if cycle == "yearly" else 30)
            sub.cancel_at_period_end = False
            sub.save()
            return Response(PlatformSubscriptionSerializer(sub).data)
        if sub.plan != PlanId.SPARK:
            return Response(
                {"detail": "Contact support to change a paid subscription."},
                status=400,
            )
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


class BillingInvoiceView(APIView):
    """Student-owned invoice requests; payment is recorded by staff."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        invoices = BillingInvoice.objects.filter(user=request.user)
        return Response(BillingInvoiceSerializer(invoices, many=True).data)

    def post(self, request):
        serializer = InvoiceRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.validated_data["plan"]
        cycle = serializer.validated_data["billing_cycle"]
        existing = BillingInvoice.objects.filter(
            user=request.user,
            plan=plan,
            billing_cycle=cycle,
            status=BillingInvoice.Status.REQUESTED,
        ).first()
        if existing:
            return Response(BillingInvoiceSerializer(existing).data)

        plan_data = serialize_plan(plan)
        price_key = "priceYearly" if cycle == BillingCycle.YEARLY else "priceMonthly"
        invoice = BillingInvoice.objects.create(
            user=request.user,
            plan=plan,
            billing_cycle=cycle,
            amount=Decimal(str(plan_data[price_key])),
        )
        return Response(BillingInvoiceSerializer(invoice).data, status=201)


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


class GeminiContentNegotiation(DefaultContentNegotiation):
    """Allow SSE requests through DRF's pre-view renderer negotiation."""

    def select_renderer(self, request, renderers, format_suffix=None):
        accept = request.META.get("HTTP_ACCEPT", "")
        if "text/event-stream" in accept.lower():
            json_renderer = next(
                (renderer for renderer in renderers if isinstance(renderer, JSONRenderer)),
                None,
            )
            if json_renderer is not None:
                # Successful streaming replies are Django StreamingHttpResponses
                # with an explicit text/event-stream content type. JSON is only
                # used to let DRF negotiate API errors and execute the view.
                return json_renderer, "application/json"
        return super().select_renderer(request, renderers, format_suffix)


class PlatformGeminiView(APIView):
    """Authenticated, bounded proxy for Kindling's server-held Gemini key."""

    permission_classes = [permissions.IsAuthenticated]
    content_negotiation_class = GeminiContentNegotiation
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "platform_ai"
    max_body_bytes = 1 * 1024 * 1024
    max_output_tokens = 4096

    @staticmethod
    def _resolve_platform_gemini_key(force_reload: bool = False) -> str:
        api_key = str(getattr(settings, "PLATFORM_GEMINI_API_KEY", "") or "").strip()
        explicit = getattr(getattr(settings, "_wrapped", None), "_explicit_settings", set())
        if "PLATFORM_GEMINI_API_KEY" in explicit:
            return api_key
        # Hot-reload backend/.env in local development or when rotating keys
        if force_reload or getattr(settings, "DEBUG", False) or not api_key:
            try:
                from backend.settings import read_local_env_values

                env_key = read_local_env_values().get("PLATFORM_GEMINI_API_KEY", "").strip()
                if env_key:
                    api_key = env_key
                    settings.PLATFORM_GEMINI_API_KEY = env_key
            except Exception:
                pass
        return api_key

    def post(self, request):
        api_key = self._resolve_platform_gemini_key()
        if not api_key:
            return Response(
                {
                    "detail": (
                        "Platform AI is not configured. Set a valid "
                        "PLATFORM_GEMINI_API_KEY in backend/.env and restart Django."
                    )
                },
                status=503,
            )

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
        # The web/mobile SDKs pass systemInstruction as a string. Gemini REST
        # expects a Content object with text parts.
        if system_instruction:
            if isinstance(system_instruction, str):
                payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
            elif isinstance(system_instruction, dict) and isinstance(system_instruction.get("parts"), list):
                payload["systemInstruction"] = system_instruction
            else:
                return Response({"detail": "Invalid Gemini system instruction."}, status=400)
        request_body = json.dumps(payload).encode("utf-8")
        if len(request_body) > self.max_body_bytes:
            return Response({"detail": "AI request is too large."}, status=413)
        # Byte-based estimate is deliberately conservative and also reserves the
        # requested maximum output, preventing large prompts from bypassing the cap.
        estimated_tokens = max(1, (len(request_body) + 2) // 3) + config["maxOutputTokens"]
        usage = reserve_daily_ai_request(request.user, sub, estimated_tokens)
        if not usage["allowed"]:
            return Response(
                {
                    "detail": "Today's platform AI allowance is used up. It resets at midnight UTC.",
                    "code": "daily_ai_cap_reached",
                    "usage": {key: value for key, value in usage.items() if key != "allowed"},
                },
                status=429,
            )
        streaming = bool(data.get("stream"))
        method = "streamGenerateContent" if streaming else "generateContent"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:{method}?key={api_key}"
        if streaming:
            url += "&alt=sse"
        upstream_request = Request(
            url,
            data=request_body,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream" if streaming else "application/json",
            },
            method="POST",
        )
        upstream = None
        upstream_error = None
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                upstream = urlopen(upstream_request, timeout=90)
                break
            except HTTPError as exc:
                if exc.code in (401, 403) and attempt == 0:
                    reloaded_key = self._resolve_platform_gemini_key(force_reload=True)
                    if reloaded_key and reloaded_key != api_key:
                        api_key = reloaded_key
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:{method}?key={api_key}"
                        if streaming:
                            url += "&alt=sse"
                        upstream_request = Request(
                            url,
                            data=request_body,
                            headers={
                                "Content-Type": "application/json",
                                "Accept": "text/event-stream" if streaming else "application/json",
                            },
                            method="POST",
                        )
                        exc.close()
                        continue
                # Gemini can briefly return 503 while capacity is recovering.
                # Retry transient server failures with bounded exponential
                # backoff and jitter; never retry malformed requests or auth
                # and quota failures.
                if exc.code not in (500, 502, 503, 504) or attempt == max_attempts - 1:
                    upstream_error = exc
                    break
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                try:
                    retry_delay = min(max(0.0, float(retry_after)), 4.0)
                except (TypeError, ValueError):
                    retry_delay = min(0.5 * (2**attempt), 2.0)
                exc.close()
                time.sleep(retry_delay + random.uniform(0.0, 0.25))
            except (URLError, TimeoutError):
                return Response(
                    {"detail": "Gemini service is temporarily unavailable. Please try again shortly."},
                    status=502,
                )

        if upstream_error is not None:
            exc = upstream_error
            # Do not pass raw provider bodies to clients; report actionable
            # configuration/quota failures without leaking request details.
            if exc.code in (401, 403):
                return Response(
                    {
                        "detail": (
                            "The platform Gemini API key was rejected. Set a valid "
                            "PLATFORM_GEMINI_API_KEY in backend/.env and restart Django."
                        ),
                        "provider_status": exc.code,
                    },
                    status=503,
                )
            if exc.code == 429:
                return Response(
                    {"detail": "Gemini quota or rate limit reached. Check the provider project quota."},
                    status=503,
                )
            if exc.code == 503:
                return Response(
                    {"detail": "Gemini is temporarily overloaded. Please try again shortly."},
                    status=503,
                    headers={"Retry-After": "2"},
                )
            if exc.code in (400, 404):
                return Response(
                    {
                        "detail": "Gemini rejected the request or model. Check the configured Gemini model.",
                        "provider_status": exc.code,
                    },
                    status=502,
                )
            return Response(
                {"detail": "Gemini request failed.", "provider_status": exc.code},
                status=502,
            )

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
            response["X-Kindling-AI-Daily-Remaining"] = str(usage["remaining"])
            response["X-Kindling-AI-Daily-Limit"] = str(usage["limit"])
            response["X-Kindling-AI-Estimated-Tokens-Remaining"] = str(usage["estimatedTokensRemaining"])
            response["X-Kindling-AI-Daily-Soft-Warning"] = str(usage["softWarning"]).lower()
            return response

        try:
            result = json.loads(upstream.read(self.max_body_bytes + 1))
        finally:
            upstream.close()
        if len(json.dumps(result).encode("utf-8")) > self.max_body_bytes:
            return Response({"detail": "Gemini response is too large."}, status=502)
        response = Response(result)
        response["X-Kindling-AI-Daily-Remaining"] = str(usage["remaining"])
        response["X-Kindling-AI-Daily-Limit"] = str(usage["limit"])
        response["X-Kindling-AI-Estimated-Tokens-Remaining"] = str(usage["estimatedTokensRemaining"])
        response["X-Kindling-AI-Daily-Soft-Warning"] = str(usage["softWarning"]).lower()
        return response
