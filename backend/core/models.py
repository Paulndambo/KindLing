"""
Observability models: client errors and product metrics.

Designed for short retention and no PII. Free-text fields are sanitized at
ingest time (see views / logging_utils).
"""

from django.db import models


class ClientErrorReport(models.Model):
    """
    Browser-reported failure (Gemini, TTS, API, lesson shell).

    Keep payload small and scrubbed — enough to answer
    "which subsystem is failing?" not full stack forensics.
    """

    class Kind(models.TextChoices):
        GEMINI = "gemini", "Gemini / tutor chat"
        TTS = "tts", "Text-to-speech"
        STT = "stt", "Speech-to-text"
        API = "api", "Backend API"
        LESSON = "lesson", "Lesson UI"
        LEARNING = "learning", "Learning events"
        UNKNOWN = "unknown", "Unknown"

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    kind = models.CharField(max_length=32, choices=Kind.choices, default=Kind.UNKNOWN, db_index=True)
    message = models.CharField(max_length=240, blank=True, default="")
    code = models.CharField(max_length=64, blank=True, default="")
    component = models.CharField(max_length=80, blank=True, default="")
    path = models.CharField(max_length=200, blank=True, default="")
    session_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    client_ts = models.DateTimeField(null=True, blank=True)
    user_agent = models.CharField(max_length=200, blank=True, default="")
    # Optional opaque user id (pk only) when authenticated — never email/name
    user_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    extra = models.JSONField(default=dict, blank=True)
    request_id = models.CharField(max_length=40, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["kind", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.kind}: {self.message[:60]}"


class ProductMetric(models.Model):
    """
    Lightweight product funnel / counter events from the SPA.

    Examples:
      session.started, session.first_message, session.drop_off
      intervention.offer_seen (optional; learning events also cover interventions)
    """

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    name = models.CharField(max_length=80, db_index=True)
    value = models.FloatField(default=1.0)
    session_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    client_ts = models.DateTimeField(null=True, blank=True)
    # Optional opaque user id when authenticated
    user_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    tags = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["name", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name}={self.value}"


class SafetyEvent(models.Model):
    """
    Scrubbed child-safety / distress escalation events.

    Never store the raw student utterance — only category, code, and metadata.
    """

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        HIGH = "high", "High"
        INFO = "info", "Info"

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    category = models.CharField(max_length=40, db_index=True)
    code = models.CharField(max_length=64, blank=True, default="", db_index=True)
    severity = models.CharField(
        max_length=16, choices=Severity.choices, default=Severity.HIGH, db_index=True
    )
    age_band = models.CharField(max_length=20, blank=True, default="")
    session_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    component = models.CharField(max_length=80, blank=True, default="lesson")
    user_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    client_ts = models.DateTimeField(null=True, blank=True)
    extra = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["severity", "-created_at"]),
            models.Index(fields=["category", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.severity}:{self.category}:{self.code}"


class JobRun(models.Model):
    """
    Audit log for background job executions (Phase 0.5).

    Written by core.jobs.runner — used by ops, health snapshots, and
    interval scheduling (last successful start + interval_seconds).
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    name = models.CharField(max_length=80, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    trigger = models.CharField(
        max_length=40,
        blank=True,
        default="manual",
        help_text="manual | schedule | api",
    )
    dry_run = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True, db_index=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    result = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["name", "-started_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} [{self.status}]"
