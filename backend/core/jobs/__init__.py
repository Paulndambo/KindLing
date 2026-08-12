"""
Kindling background jobs skeleton (Phase 0.5).

Jobs are plain callables registered by name and invoked via:

  python manage.py run_job heartbeat
  python manage.py run_scheduled_jobs

Schedule in staging/production with system cron (or a process supervisor):

  */5 * * * * cd /path/to/backend && python manage.py run_scheduled_jobs

No Redis/Celery required for the skeleton. Horizon A digests/mastery can
keep the same task signatures when a heavier broker is introduced later.
"""

from .registry import JOB_REGISTRY, get_job, list_jobs
from .runner import run_job, run_due_jobs

__all__ = [
    "JOB_REGISTRY",
    "get_job",
    "list_jobs",
    "run_job",
    "run_due_jobs",
]
