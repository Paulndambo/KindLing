from django.contrib import admin

from .models import ClientErrorReport, JobRun, ProductMetric, SafetyEvent


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
