"""
Epic C8.2 — Run the weekly eval sample pipeline (or via jobs runner).

  python manage.py eval_weekly_sample
  python manage.py eval_weekly_sample --dry-run
  python manage.py eval_weekly_sample --lookback-days 14 --limit 10
  python manage.py run_job weekly_eval_sample
  python manage.py run_job weekly_eval_sample --dry-run
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from learning.eval_weekly import latest_weekly_cohort_rows, run_weekly_eval_sample


class Command(BaseCommand):
    help = "C8.2 weekly eval sample: auto-score recent sessions + write report."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Score in memory only (no DB rows, no report files)",
        )
        parser.add_argument("--lookback-days", type=int, default=7)
        parser.add_argument("--limit", type=int, default=10)
        parser.add_argument("--min-turns", type=int, default=2)
        parser.add_argument(
            "--cohort",
            type=str,
            default="",
            help="Override cohort id (default auto-weekly-YYYY-Www)",
        )
        parser.add_argument(
            "--out-dir",
            type=str,
            default="",
            help="Report directory (default MEDIA/eval_reports)",
        )
        parser.add_argument(
            "--list-cohorts",
            action="store_true",
            help="List recent auto-weekly cohorts and exit",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Print full JSON summary",
        )

    def handle(self, *args, **options):
        if options["list_cohorts"]:
            rows = latest_weekly_cohort_rows(limit=12)
            if not rows:
                self.stdout.write("No auto-weekly cohorts yet.")
                return
            for r in rows:
                self.stdout.write(
                    f"  {r['cohort']}: n={r['scoredCount']} mean={r['overallMean']}"
                )
            return

        report_dir = options.get("out_dir") or None
        if report_dir:
            report_dir = Path(report_dir)

        result = run_weekly_eval_sample(
            dry_run=bool(options["dry_run"]),
            lookback_days=int(options["lookback_days"]),
            limit=int(options["limit"]),
            min_turns=int(options["min_turns"]),
            save=not bool(options["dry_run"]),
            write_report=not bool(options["dry_run"]),
            report_dir=report_dir,
            cohort=(options.get("cohort") or "").strip() or None,
        )

        if options["json"]:
            # Avoid dumping huge notes
            slim = {
                k: v
                for k, v in result.items()
                if k not in ("sessionIds",)
            }
            slim["sessionCount"] = len(result.get("sessionIds") or [])
            self.stdout.write(json.dumps(slim, indent=2, default=str))
            return

        self.stdout.write(
            f"Cohort: {result.get('cohort')}\n"
            f"Candidates: {result.get('candidateSessions')} · "
            f"scored: {result.get('scoredOk')} · saved: {result.get('saved')}\n"
            f"Overall mean: {result.get('overallMean')}\n"
            f"Sample complete: {result.get('sampleComplete')}\n"
            f"Dry run: {result.get('dryRun')}"
        )
        if result.get("weakest"):
            self.stdout.write("Weakest:")
            for w in result["weakest"]:
                self.stdout.write(f"  - {w.get('label') or w.get('id')}: {w.get('mean')}")
        if result.get("strongest"):
            self.stdout.write("Strongest:")
            for w in result["strongest"]:
                self.stdout.write(f"  - {w.get('label') or w.get('id')}: {w.get('mean')}")
        paths = result.get("reportPaths") or {}
        if paths:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Report: {paths.get('dir')}/{paths.get('markdown')}"
                )
            )
        if result.get("errorCount"):
            self.stdout.write(
                self.style.WARNING(f"Errors: {result.get('errorCount')} {result.get('errors')}")
            )
