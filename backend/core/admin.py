from django.contrib import admin, messages
from django.utils import timezone

from .models import ClientErrorReport, JobRun, OpsReviewFlag, ProductMetric, SafetyEvent


@admin.register(ClientErrorReport)
class ClientErrorReportAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "kind",
        "code",
        "component",
        "message",
        "session_id",
        "user_id",
    )
    list_filter = ("kind",)
    search_fields = ("message", "code", "component", "session_id", "path")
    readonly_fields = (
        "created_at",
        "kind",
        "message",
        "code",
        "component",
        "path",
        "session_id",
        "client_ts",
        "user_agent",
        "user_id",
        "extra",
        "request_id",
    )
    ordering = ("-created_at",)


@admin.register(ProductMetric)
class ProductMetricAdmin(admin.ModelAdmin):
    list_display = ("created_at", "name", "value", "session_id", "user_id")
    list_filter = ("name",)
    search_fields = ("name", "session_id")
    readonly_fields = (
        "created_at",
        "name",
        "value",
        "session_id",
        "client_ts",
        "user_id",
        "tags",
    )
    ordering = ("-created_at",)


@admin.register(SafetyEvent)
class SafetyEventAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "severity",
        "category",
        "code",
        "age_band",
        "session_id",
        "user_id",
    )
    list_filter = ("severity", "category")
    search_fields = ("code", "category", "session_id")
    readonly_fields = (
        "created_at",
        "category",
        "code",
        "severity",
        "age_band",
        "session_id",
        "component",
        "user_id",
        "client_ts",
        "extra",
    )
    ordering = ("-created_at",)


@admin.register(OpsReviewFlag)
class OpsReviewFlagAdmin(admin.ModelAdmin):
    """Internal, metadata-only queue for support review; never expose raw text."""

    list_display = (
        "created_at",
        "category",
        "severity",
        "status",
        "session_id",
        "user_id",
        "reviewed_at",
    )
    list_filter = ("status", "category", "severity", "created_at")
    search_fields = ("session_id", "trigger_key")
    readonly_fields = (
        "created_at",
        "category",
        "severity",
        "trigger_key",
        "session_id",
        "user_id",
        "safety_event",
        "details",
        "reviewed_at",
    )
    actions = ("mark_reviewed", "mark_resolved")
    ordering = ("status", "-created_at")
    date_hierarchy = "created_at"
    list_select_related = ("safety_event",)

    @admin.action(description="Mark selected flags as reviewed")
    def mark_reviewed(self, request, queryset):
        updated = queryset.exclude(status=OpsReviewFlag.Status.RESOLVED).update(
            status=OpsReviewFlag.Status.REVIEWED,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"Marked {updated} flag(s) reviewed.", messages.SUCCESS)

    @admin.action(description="Resolve selected flags")
    def mark_resolved(self, request, queryset):
        updated = queryset.update(
            status=OpsReviewFlag.Status.RESOLVED,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"Resolved {updated} flag(s).", messages.SUCCESS)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(JobRun)
class JobRunAdmin(admin.ModelAdmin):
    list_display = (
        "started_at",
        "name",
        "status",
        "trigger",
        "dry_run",
        "duration_ms",
    )
    list_filter = ("name", "status", "trigger", "dry_run")
    search_fields = ("name", "error")
    readonly_fields = (
        "name",
        "status",
        "trigger",
        "dry_run",
        "started_at",
        "finished_at",
        "duration_ms",
        "result",
        "error",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
