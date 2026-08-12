"""
Run a single Kindling background job by name.

Examples:
  python manage.py run_job heartbeat
  python manage.py run_job weekly_digest --dry-run
  python manage.py run_job list
"""

from django.core.management.base import BaseCommand, CommandError

from core.jobs import list_jobs, run_job
from core.jobs.registry import effective_schedule


class Command(BaseCommand):
    help = "Run a registered Kindling background job (or list jobs)."

    def add_arguments(self, parser):
        parser.add_argument(
            "name",
            type=str,
            help='Job name, or "list" to show registered jobs',
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Pass dry_run=True to the job handler (no side effects where implemented)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Run even if the job is disabled in settings",
        )

    def handle(self, *args, **options):
        name = options["name"].strip()
        if name in ("list", "ls", "--list"):
            self._list_jobs()
            return

        dry_run = options["dry_run"]
        force = options["force"]

        try:
            run = run_job(
                name,
                dry_run=dry_run,
                trigger="manual",
                force=force,
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Job {run.name!r} finished: status={run.status} "
                f"duration_ms={run.duration_ms} id={run.pk}"
            )
        )
        if run.error:
            self.stdout.write(self.style.ERROR(run.error))
        if run.result:
            self.stdout.write(str(run.result))

        if run.status == "failed":
            raise CommandError(f"Job {name!r} failed")

    def _list_jobs(self):
        jobs = list_jobs()
        if not jobs:
            self.stdout.write("No jobs registered.")
            return
        self.stdout.write("Registered Kindling jobs:\n")
        for name in sorted(jobs):
            sched = effective_schedule(name)
            flag = "on" if sched["enabled"] else "off"
            interval = sched["interval_seconds"]
            self.stdout.write(
                f"  • {name:20} [{flag}] every {interval}s — {sched['description']}"
            )
