"""Report immediate, transfer and spaced-review outcomes by learner band."""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from learning.outcome_reporting import (
    build_learning_outcome_report,
    render_learning_outcome_report,
)


class Command(BaseCommand):
    help = "Aggregate learning outcomes, review returns, and pre/post checks."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=90)
        parser.add_argument("--out", type=str, default="")
        parser.add_argument("--json", action="store_true")

    def handle(self, *args, **options):
        report = build_learning_outcome_report(days=max(1, options["days"]))
        markdown = render_learning_outcome_report(report)
        output = (options.get("out") or "").strip()
        if output:
            path = Path(output).resolve()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(markdown, encoding="utf-8")
            path.with_suffix(".json").write_text(
                json.dumps(report, indent=2), encoding="utf-8"
            )
            self.stdout.write(
                self.style.SUCCESS(f"Wrote {path} and {path.with_suffix('.json')}")
            )
        elif options.get("json"):
            self.stdout.write(json.dumps(report, indent=2))
        else:
            self.stdout.write(markdown)
