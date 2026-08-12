"""
Execute registered jobs and persist JobRun audit rows.
"""

from __future__ import annotations

import logging
import traceback
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.utils import timezone

from core.logging_utils import log_event

from .registry import effective_schedule, get_job, list_jobs


def run_job(
    name: str,
    *,
    dry_run: bool = False,
    trigger: str = "manual",
    force: bool = False,
    **kwargs: Any,
) -> "JobRun":
    """
    Run a single named job and store a JobRun row.

    force=True skips the enabled check (management command --force).
    """
    from core.models import JobRun

    spec = get_job(name)
    if not spec:
        raise ValueError(f"Unknown job: {name}")

    schedule = effective_schedule(name)
    if not schedule["enabled"] and not force:
        run = JobRun.objects.create(
            name=name,
            status=JobRun.Status.SKIPPED,
            trigger=trigger,
            dry_run=dry_run,
            result={"ok": False, "skipped": True, "reason": "disabled"},
            finished_at=timezone.now(),
        )
        log_event(
            "job.skipped",
            name=name,
            trigger=trigger,
            reason="disabled",
            run_id=run.pk,
        )
        return run

    started = timezone.now()
    run = JobRun.objects.create(
        name=name,
        status=JobRun.Status.RUNNING,
        trigger=trigger,
        dry_run=dry_run,
        started_at=started,
    )

    log_event(
        "job.started",
        name=name,
        trigger=trigger,
        dry_run=dry_run,
        run_id=run.pk,
    )

    try:
        result = spec.handler(dry_run=dry_run, **kwargs) or {}
        if not isinstance(result, dict):
            result = {"ok": True, "result": str(result)}
        run.status = JobRun.Status.SUCCESS
        run.result = result
        run.finished_at = timezone.now()
        run.duration_ms = int(
            (run.finished_at - started).total_seconds() * 1000
        )
        run.save(
            update_fields=[
                "status",
                "result",
                "finished_at",
                "duration_ms",
                "updated_at",
            ]
        )
        log_event(
            "job.finished",
            name=name,
            status="success",
            duration_ms=run.duration_ms,
            run_id=run.pk,
            dry_run=dry_run,
        )
        return run
    except Exception as exc:
        run.status = JobRun.Status.FAILED
        run.error = f"{type(exc).__name__}: {exc}"
        run.result = {
            "ok": False,
            "error": str(exc),
            "traceback": traceback.format_exc()[-2000:],
        }
        run.finished_at = timezone.now()
        run.duration_ms = int(
            (run.finished_at - started).total_seconds() * 1000
        )
        run.save(
            update_fields=[
                "status",
                "error",
                "result",
                "finished_at",
                "duration_ms",
                "updated_at",
            ]
        )
        log_event(
            "job.finished",
            level=logging.ERROR,
            name=name,
            status="failed",
            duration_ms=run.duration_ms,
            run_id=run.pk,
            error=str(exc)[:200],
        )
        return run


def run_due_jobs(*, dry_run: bool = False, force: bool = False) -> List["JobRun"]:
    """
    Run all enabled jobs whose interval has elapsed since last success
    (or that have never run).
    """
    from core.models import JobRun

    results: List[JobRun] = []
    now = timezone.now()

    for name, spec in list_jobs().items():
        schedule = effective_schedule(name)
        if not schedule["enabled"] and not force:
            continue
        interval = schedule["interval_seconds"]
        if interval <= 0 and not force:
            # Manual-only jobs
            continue

        last = (
            JobRun.objects.filter(
                name=name,
                status__in=[JobRun.Status.SUCCESS, JobRun.Status.RUNNING],
            )
            .order_by("-started_at")
            .first()
        )

        due = True
        if last and interval > 0 and not force:
            elapsed = now - (last.started_at or last.created_at)
            due = elapsed >= timedelta(seconds=interval)

        if due:
            results.append(
                run_job(
                    name,
                    dry_run=dry_run,
                    trigger="schedule",
                    force=force,
                )
            )

    return results


def last_successful_run(name: str) -> Optional["JobRun"]:
    from core.models import JobRun

    return (
        JobRun.objects.filter(name=name, status=JobRun.Status.SUCCESS)
        .order_by("-finished_at")
        .first()
    )


def jobs_status_snapshot() -> Dict[str, Any]:
    """Summary for health / ops endpoints."""
    from core.models import JobRun

    jobs = []
    for name in list_jobs():
        schedule = effective_schedule(name)
        last = (
            JobRun.objects.filter(name=name)
            .order_by("-started_at")
            .first()
        )
        jobs.append(
            {
                "name": name,
                "enabled": schedule["enabled"],
                "interval_seconds": schedule["interval_seconds"],
                "description": schedule["description"],
                "last_status": last.status if last else None,
                "last_started_at": last.started_at.isoformat()
                if last and last.started_at
                else None,
                "last_duration_ms": last.duration_ms if last else None,
            }
        )

    recent_fails = JobRun.objects.filter(
        status=JobRun.Status.FAILED,
        created_at__gte=timezone.now() - timedelta(hours=24),
    ).count()

    return {
        "jobs": jobs,
        "failed_runs_24h": recent_fails,
    }
