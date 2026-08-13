from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SubscriptionStatus
from .plans import PLAN_CATALOG, serialize_plan
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
