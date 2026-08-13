"""
Platform subscription and AI routing preferences.

API keys for BYOK mode are intentionally NOT stored here — they stay on the
client (or a future encrypted vault). This layer owns durable plan state and
routing policy so the SPA can restore choices across devices.
"""

from django.conf import settings
from django.db import models


class PlanId(models.TextChoices):
    SPARK = "spark", "Spark"
    EMBER = "ember", "Ember"
    FORGE = "forge", "Forge"


class SubscriptionStatus(models.TextChoices):
    TRIALING = "trialing", "Trialing"
    ACTIVE = "active", "Active"
    PAST_DUE = "past_due", "Past due"
    CANCELED = "canceled", "Canceled"
    INCOMPLETE = "incomplete", "Incomplete"


class BillingCycle(models.TextChoices):
    MONTHLY = "monthly", "Monthly"
    YEARLY = "yearly", "Yearly"


class RoutingMode(models.TextChoices):
    PLATFORM = "platform", "Platform"
    BYOK = "byok", "Bring your own key"
    AUTO = "auto", "Auto (BYOK when available)"


class PlatformSubscription(models.Model):
    """One subscription row per account (family seat root)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="platform_subscription",
    )
    plan = models.CharField(
        max_length=32,
        choices=PlanId.choices,
        default=PlanId.SPARK,
    )
    status = models.CharField(
        max_length=32,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )
    billing_cycle = models.CharField(
        max_length=16,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
    )
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    # Soft entitlements override (JSON) for pilots / comps
    entitlements_override = models.JSONField(default=dict, blank=True)
    notes = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.plan}:{self.status}"


class AiRoutingPreference(models.Model):
    """
    How this account resolves LLM calls.

    Raw secrets never land in this model. Clients may store a non-secret
    fingerprint map so the UI can show which providers have keys configured.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_routing",
    )
    routing_mode = models.CharField(
        max_length=16,
        choices=RoutingMode.choices,
        default=RoutingMode.AUTO,
    )
    primary_provider = models.CharField(max_length=64, default="gemini")
    primary_model = models.CharField(max_length=128, default="gemini-3.1-flash-lite")
    fallback_provider = models.CharField(max_length=64, blank=True, default="")
    fallback_model = models.CharField(max_length=128, blank=True, default="")
    # Optional per-task routes: { "chat": {...}, "vision": {...}, "tts": {...} }
    task_routes = models.JSONField(default=dict, blank=True)
    # { "gemini": { "fingerprint": "…ab12", "label": "Personal", "updatedAt": "…" }, … }
    key_fingerprints = models.JSONField(default=dict, blank=True)
    # Free-form advanced knobs (temperature prefs, etc.)
    advanced = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI routing preference"
        verbose_name_plural = "AI routing preferences"

    def __str__(self) -> str:
        return f"{self.user_id}:{self.routing_mode}:{self.primary_provider}"
