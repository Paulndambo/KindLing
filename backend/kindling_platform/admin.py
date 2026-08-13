from django.contrib import admin

from .models import AiRoutingPreference, PlatformSubscription


@admin.register(PlatformSubscription)
class PlatformSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "status", "billing_cycle", "updated_at")
    list_filter = ("plan", "status", "billing_cycle")
    search_fields = ("user__email", "user__username")
    raw_id_fields = ("user",)


@admin.register(AiRoutingPreference)
class AiRoutingPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "routing_mode",
        "primary_provider",
        "primary_model",
        "updated_at",
    )
    list_filter = ("routing_mode", "primary_provider")
    search_fields = ("user__email", "user__username")
    raw_id_fields = ("user",)
