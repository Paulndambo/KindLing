"""
Epic C8.1 — Run offline heuristic scorer on recorded sessions.

  python manage.py eval_auto_score --limit 10
  python manage.py eval_auto_score --session-id SID --save
  python manage.py eval_auto_score --limit 20 --save --cohort auto-c8.1
  python manage.py eval_auto_score --limit 10 --out eval_samples/auto_report.md
  python manage.py eval_auto_score --compare-cohort beta-c8.3
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from learning.eval_rubric import TARGET_SAMPLE_SIZE, render_report_markdown, summarize_cohort
from learning.eval_scorer import (
    SCORER_ID,
    compare_auto_vs_human,
    result_to_score_payload,
    score_lesson_session,
)
from learning.models import LessonSession, ManualSessionEval


class Command(BaseCommand):
    help = "C8.1 offline automated rubric scores for recent sessions."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=TARGET_SAMPLE_SIZE)
        parser.add_argument("--session-id", type=str, default="")
        parser.add_argument("--min-turns", type=int, default=2)
        parser.add_argument(
            "--save",
            action="store_true",
            help=f"Persist scores as ManualSessionEval (scorer={SCORER_ID})",
        )
        parser.add_argument(
            "--cohort",
            type=str,
            default="auto-c8.1",
            help="Cohort when --save (default auto-c8.1)",
        )
        parser.add_argument(
            "--out",
            type=str,
            default="",
            help="Write markdown+json report path prefix",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Print full JSON results to stdout",
        )
        parser.add_argument(
            "--compare-cohort",
            type=str,
            default="",
            help="Compare auto scores to human ManualSessionEval cohort (e.g. beta-c8.3)",
        )

    def handle(self, *args, **options):
        sid = (options.get("session_id") or "").strip()
        min_turns = max(0, int(options["min_turns"]))
        limit = max(1, int(options["limit"]))
        cohort = options.get("cohort") or "auto-c8.1"
        compare_cohort = (options.get("compare_cohort") or "").strip()

        if sid:
            sessions = list(
                LessonSession.objects.filter(session_id=sid).prefetch_related("turns")
            )
            if not sessions:
                raise CommandError(f"No session {sid!r}")
        else:
            sessions = list(
                LessonSession.objects.filter(turn_count__gte=min_turns)
                .prefetch_related("turns")
                .order_by("-started_at")[:limit]
            )
        if not sessions:
            raise CommandError("No sessions found to score.")

        results = []
        for session in sessions:
            result = score_lesson_session(session)
            results.append(result)
            mean = result.get("weightedMean")
            mean_s = f"{mean:.2f}" if mean is not None else "—"
            self.stdout.write(
                f"  {session.session_id} · {session.subject}/{session.topic} · "
                f"mean={mean_s} · {result.get('summary', '')[:100]}"
            )

            if options["save"]:
                payload = result_to_score_payload(result)
                ManualSessionEval.objects.update_or_create(
                    client_session_key=session.session_id,
                    cohort=cohort,
                    defaults={
                        "lesson_session": session,
                        "rubric_version": result.get("rubricVersion") or 1,
                        "scores": payload["scores"],
                        "dimension_notes": payload["dimension_notes"],
                        "overall_notes": payload["overall_notes"],
                        "scorer": payload["scorer"],
                        "evidence": payload.get("evidence") or result.get("evidence") or {},
                        "weighted_mean": payload["weighted_mean"],
                        "completeness": payload["completeness"],
                        "scored_at": timezone.now(),
                    },
                )

        # Cohort-style summary of auto scores
        evals = [
            {
                "sessionId": r.get("sessionId"),
                "scores": r.get("scores") or {},
                "weightedMean": r.get("weightedMean"),
                "playbookAudit": r.get("playbookAudit"),
            }
            for r in results
        ]
        summary = summarize_cohort(evals)
        summary["scorer"] = SCORER_ID
        summary["mode"] = "automated"
        summary["sessionCount"] = len(results)

        # Optional calibration vs human labels
        if compare_cohort:
            comparisons = []
            maes = []
            dimension_pairs = {}
            for r in results:
                human = (
                    ManualSessionEval.objects.filter(
                        client_session_key=r.get("sessionId"),
                        cohort=compare_cohort,
                    )
                    .exclude(scorer=SCORER_ID)
                    .first()
                )
                if not human:
                    continue
                cmp_ = compare_auto_vs_human(r.get("scores") or {}, human.scores or {})
                if cmp_.get("n"):
                    comparisons.append(
                        {"sessionId": r.get("sessionId"), **cmp_}
                    )
                    if cmp_.get("mae") is not None:
                        maes.append(cmp_["mae"])
                    for dimension, pair in (cmp_.get("byDim") or {}).items():
                        bucket = dimension_pairs.setdefault(
                            dimension, {"auto": [], "human": [], "absErr": []}
                        )
                        bucket["auto"].append(pair["auto"])
                        bucket["human"].append(pair["human"])
                        bucket["absErr"].append(pair["absErr"])
            min_human_sessions = TARGET_SAMPLE_SIZE
            by_dimension = {}
            for dimension, values in dimension_pairs.items():
                n = len(values["absErr"])
                by_dimension[dimension] = {
                    "n": n,
                    "mae": round(sum(values["absErr"]) / n, 3) if n else None,
                    # Positive bias means the heuristic tends to score higher than humans.
                    "bias": round(
                        sum(a - h for a, h in zip(values["auto"], values["human"])) / n,
                        3,
                    ) if n else None,
                    "exact": round(
                        sum(error == 0 for error in values["absErr"]) / n, 3
                    ) if n else None,
                    "within1": round(
                        sum(error <= 1 for error in values["absErr"]) / n, 3
                    ) if n else None,
                }
            summary["humanCompare"] = {
                "cohort": compare_cohort,
                "sessionsCompared": len(comparisons),
                "meanMae": round(sum(maes) / len(maes), 3) if maes else None,
                "minimumHumanSessions": min_human_sessions,
                "calibrationSampleReady": len(comparisons) >= min_human_sessions,
                "byDimension": by_dimension,
                "details": comparisons[:20],
            }
            sample_status = (
                "sample threshold met"
                if summary["humanCompare"]["calibrationSampleReady"]
                else f"needs {min_human_sessions} human-labeled sessions"
            )
            self.stdout.write("")
            self.stdout.write(
                f"Human compare ({compare_cohort}): "
                f"{len(comparisons)} session(s) · "
                f"MAE={summary['humanCompare']['meanMae']} · "
                f"{sample_status}"
            )

        md = render_report_markdown(
            summary, title=f"C8.1 auto eval — {cohort if options['save'] else 'preview'}"
        )
        if options["json"]:
            # Strip heavy evidence for stdout
            slim = []
            for r in results:
                slim.append(
                    {
                        k: v
                        for k, v in r.items()
                        if k != "evidence"
                    }
                )
            self.stdout.write(
                json.dumps({"summary": summary, "results": slim}, indent=2, default=str)
            )
        else:
            self.stdout.write("")
            self.stdout.write(md)

        out = (options.get("out") or "").strip()
        if out:
            path = Path(out).resolve()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(md, encoding="utf-8")
            json_path = path.with_suffix(".json")
            slim = [{k: v for k, v in r.items() if k != "evidence"} for r in results]
            json_path.write_text(
                json.dumps(
                    {"summary": summary, "results": slim},
                    indent=2,
                    default=str,
                ),
                encoding="utf-8",
            )
            self.stdout.write(self.style.SUCCESS(f"Wrote {path} and {json_path}"))

        if options["save"]:
            n = ManualSessionEval.objects.filter(cohort=cohort).count()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Saved {len(results)} auto score(s) to cohort '{cohort}' "
                    f"(total rows={n}). Report: python manage.py eval_report --cohort {cohort}"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Preview only — pass --save to persist as ManualSessionEval."
                )
            )
