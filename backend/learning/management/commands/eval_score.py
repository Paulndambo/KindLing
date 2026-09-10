"""
C8.3 — Record a manual rubric score for one session.

  python manage.py eval_score --session-id SID \\
    --scores socratic=4,hint=4,timing=3,decision=4,affect=5,mc=3,realworld=4,independence=4,persistence=4,overall=4 \\
    --scorer ada --notes "Solid guide-before-give"

  python manage.py eval_score --from-json path/to/SID.json
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from learning.eval_rubric import (
    RUBRIC_VERSION,
    TARGET_SAMPLE_SIZE,
    completeness,
    extract_session_evidence,
    parse_score_kv,
    validate_scores,
    weighted_mean,
)
from learning.models import LessonSession, ManualSessionEval


class Command(BaseCommand):
    help = "Save a manual C8.3 rubric score for a session."

    def add_arguments(self, parser):
        parser.add_argument("--session-id", type=str, default="")
        parser.add_argument(
            "--scores",
            type=str,
            default="",
            help="Comma-separated dim=1-5 (aliases ok: socratic, hint, timing, ...)",
        )
        parser.add_argument("--scorer", type=str, default="")
        parser.add_argument("--notes", type=str, default="")
        parser.add_argument("--cohort", type=str, default="beta-c8.3")
        parser.add_argument(
            "--from-json",
            type=str,
            default="",
            help="Path to exported *.json pack with filled scoreSheet.dimensions",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and print result without saving",
        )

    def handle(self, *args, **options):
        cohort = options["cohort"] or "beta-c8.3"
        from_json = (options.get("from_json") or "").strip()
        session_id = (options.get("session_id") or "").strip()
        scores_raw: dict = {}
        dim_notes: dict = {}
        overall_notes = options.get("notes") or ""
        scorer = options.get("scorer") or ""

        if from_json:
            path = Path(from_json)
            if not path.is_file():
                raise CommandError(f"File not found: {path}")
            pack = json.loads(path.read_text(encoding="utf-8"))
            meta = pack.get("meta") or {}
            session_id = session_id or meta.get("sessionId") or ""
            sheet = pack.get("scoreSheet") or {}
            scorer = scorer or sheet.get("scorer") or ""
            overall_notes = overall_notes or sheet.get("overallNotes") or ""
            for d in sheet.get("dimensions") or []:
                did = d.get("id")
                if not did:
                    continue
                if d.get("score") is not None and d.get("score") != "":
                    scores_raw[did] = d["score"]
                if d.get("note"):
                    dim_notes[did] = d["note"]
            if pack.get("cohort"):
                cohort = options["cohort"] or pack.get("cohort") or cohort

        if not session_id:
            raise CommandError("Provide --session-id or --from-json with meta.sessionId")

        if options.get("scores"):
            parts = [p.strip() for p in options["scores"].split(",") if p.strip()]
            try:
                scores_raw.update(parse_score_kv(parts))
            except ValueError as exc:
                raise CommandError(str(exc)) from exc

        if not scores_raw:
            raise CommandError(
                "No scores provided. Use --scores dim=n,... or fill scoreSheet in JSON."
            )

        try:
            scores = validate_scores(scores_raw)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        mean = weighted_mean(scores)
        comp = completeness(scores)
        present = sum(1 for v in scores.values() if v is not None)
        if present < 3:
            raise CommandError("Need at least 3 dimension scores to save a sheet.")

        session = LessonSession.objects.filter(session_id=session_id).first()
        evidence = {}
        if session:
            evidence = extract_session_evidence(session)
        elif from_json:
            evidence = pack.get("evidence") or {}

        self.stdout.write(
            f"Session {session_id} · cohort {cohort}\n"
            f"  scores present: {present}/10 · mean={mean} · completeness={comp}\n"
            f"  scorer={scorer or '(anonymous)'}"
        )
        for k, v in scores.items():
            if v is not None:
                self.stdout.write(f"    {k}: {v}")

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("Dry run — not saved."))
            return

        obj, created = ManualSessionEval.objects.update_or_create(
            client_session_key=session_id,
            cohort=cohort,
            defaults={
                "lesson_session": session,
                "rubric_version": RUBRIC_VERSION,
                "scores": scores,
                "dimension_notes": dim_notes,
                "overall_notes": overall_notes,
                "scorer": scorer,
                "evidence": evidence,
                "weighted_mean": mean,
                "completeness": comp,
                "scored_at": timezone.now(),
            },
        )
        scored_n = ManualSessionEval.objects.filter(cohort=cohort).count()
        verb = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} ManualSessionEval id={obj.pk}. "
                f"Cohort progress: {scored_n}/{TARGET_SAMPLE_SIZE}.\n"
                f"Report: python manage.py eval_report --cohort {cohort}"
            )
        )
