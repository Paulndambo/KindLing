"""
C8.3 — Summarize manual eval cohort (baseline for C8.1).

  python manage.py eval_report
  python manage.py eval_report --cohort beta-c8.3 --out eval_samples/report.md
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from learning.eval_rubric import (
    TARGET_SAMPLE_SIZE,
    render_report_markdown,
    summarize_cohort,
)
from learning.models import ManualSessionEval


class Command(BaseCommand):
    help = "Print / write C8.3 manual eval cohort report."

    def add_arguments(self, parser):
        parser.add_argument("--cohort", type=str, default="beta-c8.3")
        parser.add_argument(
            "--out",
            type=str,
            default="",
            help="Optional path for markdown report (also writes .json alongside)",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Print JSON summary to stdout",
        )

    def handle(self, *args, **options):
        cohort = options["cohort"] or "beta-c8.3"
        rows = list(
            ManualSessionEval.objects.filter(cohort=cohort).order_by("scored_at")
        )
        evals = [
            {
                "sessionId": r.client_session_key,
                "scores": r.scores or {},
                "weightedMean": r.weighted_mean,
                "completeness": r.completeness,
                "scorer": r.scorer,
                "scoredAt": r.scored_at.isoformat() if r.scored_at else None,
                "overallNotes": r.overall_notes,
            }
            for r in rows
        ]
        summary = summarize_cohort(evals)
        summary["cohort"] = cohort
        summary["sessions"] = [e["sessionId"] for e in evals]

        md = render_report_markdown(
            summary, title=f"C8.3 eval report — {cohort}"
        )

        if options["json"]:
            self.stdout.write(json.dumps(summary, indent=2))
        else:
            self.stdout.write(md)

        out = (options.get("out") or "").strip()
        if out:
            path = Path(out).resolve()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(md, encoding="utf-8")
            json_path = path.with_suffix(".json")
            json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Wrote {path} and {json_path}"))

        n = summary.get("scoredCount") or 0
        if n >= TARGET_SAMPLE_SIZE:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nC8.3 cohort complete ({n}/{TARGET_SAMPLE_SIZE}). "
                    "Use dimension means as C8.1 automation baseline."
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"\nProgress {n}/{TARGET_SAMPLE_SIZE}. "
                    f"{summary.get('nextStep')}"
                )
            )
