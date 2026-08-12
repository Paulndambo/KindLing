"""
Run all due Kindling jobs according to interval schedule.

Intended for cron / process supervisor:

  */5 * * * * cd /app/backend && python manage.py run_scheduled_jobs

Examples:
  python manage.py run_scheduled_jobs
  python manage.py run_scheduled_jobs --dry-run
  python manage.py run_scheduled_jobs --force   # ignore intervals / enabled
"""

from django.core.management.base import BaseCommand

from core.jobs import run_due_jobs


class Command(BaseCommand):
    help = "Run all due scheduled Kindling background jobs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Pass dry_run=True into each job handler",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Run all enabled (or all if combined carefully) jobs ignoring intervals",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        force = options["force"]

        runs = run_due_jobs(dry_run=dry_run, force=force)
        if not runs:
            self.stdout.write("No jobs were due.")
            return

        ok = 0
        failed = 0
        skipped = 0
        for run in runs:
            line = (
                f"{run.name}: {run.status} "
                f"(duration_ms={run.duration_ms}, id={run.pk})"
            )
            if run.status == "success":
                ok += 1
                self.stdout.write(self.style.SUCCESS(line))
            elif run.status == "failed":
                failed += 1
                self.stdout.write(self.style.ERROR(line))
                if run.error:
                    self.stdout.write(f"  {run.error}")
            else:
                skipped += 1
                self.stdout.write(line)

        self.stdout.write(
            f"Done. success={ok} failed={failed} other={skipped} total={len(runs)}"
        )
