from django.urls import path

from .views import (
    ClientErrorIngestView,
    HealthView,
    LivenessView,
    ObservabilitySummaryView,
    ProductMetricIngestView,
    ReadinessView,
    JobsStatusView,
    SafetyEventIngestView,
    SafetyPolicyView,
)

urlpatterns = [
    # Health probes
    path("health/", HealthView.as_view(), name="health-combined"),
    path("health/live/", LivenessView.as_view(), name="health-live"),
    path("health/ready/", ReadinessView.as_view(), name="health-ready"),
    path("api/health/", HealthView.as_view(), name="api-health-combined"),
    path("api/health/live/", LivenessView.as_view(), name="api-health-live"),
    path("api/health/ready/", ReadinessView.as_view(), name="api-health-ready"),
    # Telemetry
    path(
        "api/telemetry/errors/",
        ClientErrorIngestView.as_view(),
        name="telemetry-errors",
    ),
    path(
        "api/telemetry/metrics/",
        ProductMetricIngestView.as_view(),
        name="telemetry-metrics",
    ),
    path(
        "api/telemetry/summary/",
        ObservabilitySummaryView.as_view(),
        name="telemetry-summary",
    ),
    # Child safety floor
    path(
        "api/safety/events/",
        SafetyEventIngestView.as_view(),
        name="safety-events",
    ),
    path(
        "api/safety/policy/",
        SafetyPolicyView.as_view(),
        name="safety-policy",
    ),
    # Background jobs
    path(
        "api/jobs/status/",
        JobsStatusView.as_view(),
        name="jobs-status",
    ),
]
