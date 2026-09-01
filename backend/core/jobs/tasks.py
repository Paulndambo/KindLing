"""
Registered background job handlers.

Each handler returns a small JSON-serializable dict for JobRun.result.
Handlers should be idempotent and free of PII in result payloads.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict

from django.db.models import Count
from django.utils import timezone

from .registry import register_job


@register_job(
    "heartbeat",
    description="Ops health heartbeat — proves the job runner is alive",
    interval_seconds=3600,  # hourly when using run_scheduled_jobs
    enabled=True,
)
def job_heartbeat(**kwargs) -> Dict[str, Any]:
    """
    Lightweight heartbeat written to JobRun + structured logs.
    Done-criterion job for Phase 0.5.
    """
    from django.contrib.auth import get_user_model
    from learning.models import LearningEvent, LessonSession
    from students.models import StudentProfile

    User = get_user_model()
    now = timezone.now()
    since = now - timedelta(hours=24)

    payload = {
        "ok": True,
        "job": "heartbeat",
        "ts": now.isoformat(),
        "counts": {
            "users": User.objects.count(),
            "student_profiles": StudentProfile.objects.count(),
            "sessions_24h": LessonSession.objects.filter(
                started_at__gte=since
            ).count(),
            "learning_events_24h": LearningEvent.objects.filter(
                timestamp__gte=since
            ).count(),
        },
        "dry_run": bool(kwargs.get("dry_run")),
    }
    return payload


@register_job(
    "weekly_digest",
    description="Generate and deliver weekly parent digests (Epic A5)",
    interval_seconds=7 * 24 * 3600,
    enabled=True,
)
def job_weekly_digest(**kwargs) -> Dict[str, Any]:
    """
    Build digests from learning events for opted-in students.
    dry_run=True (default for manual runs): generate + mark sent without SMTP.
    dry_run=False: attempt email (console backend in dev).
    """
    from learning.digest_service import run_weekly_digests

    dry_run = kwargs.get("dry_run", False)
    force = bool(kwargs.get("force", False))
    result = run_weekly_digests(dry_run=dry_run, force=force)
    result["emails_sent"] = result.get("sent", 0)
    return result


@register_job(
    "mastery_recompute",
    description="Placeholder: recompute longitudinal mastery aggregates",
    interval_seconds=24 * 3600,
    enabled=True,
)
def job_mastery_recompute(**kwargs) -> Dict[str, Any]:
    """
    Skeleton for mastery recompute (Horizon A true mastery model).
    Currently reports profile counts without mutating data unless dry_run=False
    and a future implementation lands.
    """
    from learning.models import LearningProfile, TopicMastery

    dry_run = kwargs.get("dry_run", True)
    profiles = LearningProfile.objects.count()
    mastery_rows = TopicMastery.objects.count()

    return {
        "ok": True,
        "job": "mastery_recompute",
        "dry_run": dry_run,
        "profiles": profiles,
        "mastery_rows": mastery_rows,
        "updated": 0,
        "note": "No recompute logic yet — placeholder for Horizon A",
    }


@register_job(
    "review_schedule",
    description="Epic C1: spaced review scheduling from weak/rusty pilot skills",
    interval_seconds=24 * 3600,
    enabled=True,
)
def job_review_schedule(**kwargs) -> Dict[str, Any]:
    """
    Materialize SkillReviewItem rows for learners with skill mastery data.
    dry_run=True: count candidates only; dry_run=False: write schedule.
    """
    from learning.review_service import schedule_reviews_all_profiles

    dry_run = kwargs.get("dry_run", False)
    result = schedule_reviews_all_profiles(dry_run=bool(dry_run))
    result["job"] = "review_schedule"
    result["reviews_scheduled"] = result.get("created", 0) + result.get("updated", 0)
    return result


def _has_field(model, name: str) -> bool:
    try:
        model._meta.get_field(name)
        return True
    except Exception:
        return False
