"""
Job registry: name → callable + schedule metadata defaults.

Schedule intervals can be overridden in Django settings.KINDLING_JOBS.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

from django.conf import settings


@dataclass(frozen=True)
class JobSpec:
    name: str
    handler: Callable[..., Dict[str, Any]]
    description: str
    # Default interval between automatic runs (seconds). 0 = manual only.
    interval_seconds: int = 0
    enabled: bool = True


# Populated by tasks module at import time
JOB_REGISTRY: Dict[str, JobSpec] = {}


def register_job(
    name: str,
    *,
    description: str,
    interval_seconds: int = 0,
    enabled: bool = True,
):
    """Decorator to register a job handler."""

    def decorator(fn: Callable[..., Dict[str, Any]]):
        JOB_REGISTRY[name] = JobSpec(
            name=name,
            handler=fn,
            description=description,
            interval_seconds=interval_seconds,
            enabled=enabled,
        )
        return fn

    return decorator


def get_job(name: str) -> Optional[JobSpec]:
    _ensure_loaded()
    return JOB_REGISTRY.get(name)


def list_jobs() -> Dict[str, JobSpec]:
    _ensure_loaded()
    return dict(JOB_REGISTRY)


def effective_schedule(name: str) -> Dict[str, Any]:
    """
    Merge registry defaults with settings.KINDLING_JOBS[name].
    """
    _ensure_loaded()
    spec = JOB_REGISTRY.get(name)
    if not spec:
        raise KeyError(name)

    overrides = getattr(settings, "KINDLING_JOBS", {}) or {}
    job_cfg = overrides.get(name) or {}
    if not isinstance(job_cfg, dict):
        job_cfg = {}

    return {
        "name": name,
        "description": spec.description,
        "interval_seconds": int(
            job_cfg.get("interval_seconds", spec.interval_seconds)
        ),
        "enabled": bool(job_cfg.get("enabled", spec.enabled)),
    }


def _ensure_loaded() -> None:
    if JOB_REGISTRY:
        return
    # Import side-effects register handlers
    from . import tasks  # noqa: F401
