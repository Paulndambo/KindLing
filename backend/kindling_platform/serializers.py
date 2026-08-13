from django.utils import timezone
from rest_framework import serializers

from .models import (
    AiRoutingPreference,
    BillingCycle,
    PlanId,
    PlatformSubscription,
    RoutingMode,
    SubscriptionStatus,
)
from .plans import plan_entitlements, serialize_plan


class PlatformSubscriptionSerializer(serializers.ModelSerializer):
    planDetail = serializers.SerializerMethodField()
    entitlements = serializers.SerializerMethodField()
    planName = serializers.SerializerMethodField()

    class Meta:
        model = PlatformSubscription
        fields = (
            "plan",
            "planName",
            "planDetail",
            "status",
            "billing_cycle",
            "current_period_start",
            "current_period_end",
            "cancel_at_period_end",
            "entitlements",
            "updated_at",
        )
        read_only_fields = fields

    def get_planDetail(self, obj):
        return serialize_plan(obj.plan)

    def get_planName(self, obj):
        return serialize_plan(obj.plan).get("name", obj.plan)

    def get_entitlements(self, obj):
        return plan_entitlements(obj.plan, obj.entitlements_override or {})


class SubscriptionSelectSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=PlanId.choices)
    billing_cycle = serializers.ChoiceField(
        choices=BillingCycle.choices, required=False, default=BillingCycle.MONTHLY
    )


class AiRoutingPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiRoutingPreference
        fields = (
            "routing_mode",
            "primary_provider",
            "primary_model",
            "fallback_provider",
            "fallback_model",
            "task_routes",
            "key_fingerprints",
            "advanced",
            "updated_at",
        )
        read_only_fields = ("updated_at",)

    def validate_routing_mode(self, value):
        if value not in RoutingMode.values:
            raise serializers.ValidationError("Invalid routing mode.")
        return value

    def validate_primary_provider(self, value):
        value = (value or "").strip().lower()
        if not value:
            raise serializers.ValidationError("Provider is required.")
        if len(value) > 64:
            raise serializers.ValidationError("Provider id too long.")
        return value

    def validate_primary_model(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Model is required.")
        if len(value) > 128:
            raise serializers.ValidationError("Model id too long.")
        return value

    def validate_task_routes(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("task_routes must be an object.")
        # Shallow sanitize — only known task keys
        allowed = {"chat", "vision", "tts", "summary"}
        cleaned = {}
        for key, route in value.items():
            if key not in allowed:
                continue
            if not isinstance(route, dict):
                continue
            entry = {}
            if route.get("provider"):
                entry["provider"] = str(route["provider"])[:64]
            if route.get("model"):
                entry["model"] = str(route["model"])[:128]
            if entry:
                cleaned[key] = entry
        return cleaned

    def validate_key_fingerprints(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("key_fingerprints must be an object.")
        cleaned = {}
        for provider, meta in value.items():
            pid = str(provider)[:64].lower()
            if not isinstance(meta, dict):
                continue
            # Never accept raw keys
            if any(k in meta for k in ("apiKey", "api_key", "key", "secret", "token")):
                raise serializers.ValidationError(
                    "Raw API keys must not be uploaded. Send fingerprints only."
                )
            cleaned[pid] = {
                "fingerprint": str(meta.get("fingerprint") or "")[:32],
                "label": str(meta.get("label") or "")[:80],
                "updatedAt": str(meta.get("updatedAt") or "")[:40],
                "hasKey": bool(meta.get("hasKey", True)),
            }
        return cleaned


def ensure_subscription(user) -> PlatformSubscription:
    sub, _ = PlatformSubscription.objects.get_or_create(
        user=user,
        defaults={
            "plan": PlanId.SPARK,
            "status": SubscriptionStatus.ACTIVE,
            "current_period_start": timezone.now(),
        },
    )
    return sub


def ensure_ai_routing(user) -> AiRoutingPreference:
    pref, _ = AiRoutingPreference.objects.get_or_create(user=user)
    return pref
