from django.contrib import admin
from django.contrib import messages
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .models import (
    AiRoutingPreference,
    BillingInvoice,
    PlatformAiDailyUsage,
    PlatformSubscription,
    SubscriptionStatus,
)


@admin.register(PlatformSubscription)
class PlatformSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "status", "billing_cycle", "updated_at")
    list_filter = ("plan", "status", "billing_cycle")
    search_fields = ("user__email", "user__username")
    raw_id_fields = ("user",)


@admin.action(description="Mark selected invoices paid and activate their student plans")
def mark_invoices_paid(modeladmin, request, queryset):
    with transaction.atomic():
        for invoice in queryset.select_for_update():
            if invoice.status != BillingInvoice.Status.REQUESTED:
                continue
            if not invoice.payment_reference.strip():
                modeladmin.message_user(
                    request,
                    f"Invoice KND-{invoice.created_at:%Y}-{invoice.pk:06d} needs a payment reference before activation.",
                    level=messages.WARNING,
                )
                continue
            now = timezone.now()
            period_days = 365 if invoice.billing_cycle == "yearly" else 30
            subscription, _ = PlatformSubscription.objects.get_or_create(user=invoice.user)
            period_start = now
            if (
                subscription.status == SubscriptionStatus.ACTIVE
                and subscription.current_period_end
                and subscription.current_period_end > now
            ):
                period_start = subscription.current_period_end
            subscription.plan = invoice.plan
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.billing_cycle = invoice.billing_cycle
            subscription.current_period_start = period_start
            subscription.current_period_end = period_start + timedelta(days=period_days)
            subscription.cancel_at_period_end = False
            subscription.save()

            invoice.status = BillingInvoice.Status.PAID
            invoice.paid_at = now
            invoice.marked_paid_by = request.user
            invoice.save(update_fields=("status", "paid_at", "marked_paid_by"))


@admin.register(BillingInvoice)
class BillingInvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "id", "user", "plan", "billing_cycle", "amount", "currency",
        "status", "created_at", "paid_at",
    )
    list_filter = ("status", "plan", "billing_cycle", "currency")
    search_fields = ("user__email", "user__username", "payment_reference")
    raw_id_fields = ("user", "marked_paid_by")
    readonly_fields = ("created_at", "paid_at", "marked_paid_by")
    actions = (mark_invoices_paid,)


@admin.register(PlatformAiDailyUsage)
class PlatformAiDailyUsageAdmin(admin.ModelAdmin):
    list_display = ("user", "usage_date", "request_count", "estimated_tokens", "updated_at")
    list_filter = ("usage_date",)
    search_fields = ("user__email", "user__username")
    raw_id_fields = ("user",)
    readonly_fields = ("user", "usage_date", "request_count", "estimated_tokens", "updated_at")


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
