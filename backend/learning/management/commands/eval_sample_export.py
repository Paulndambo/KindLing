"""
C8.3 — Export a sample of recent sessions as manual score sheets.

  python manage.py eval_sample_export
  python manage.py eval_sample_export --limit 10 --out eval_samples
  python manage.py eval_sample_export --session-id abc123
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from learning.eval_rubric import (
    RUBRIC_VERSION,
    TARGET_SAMPLE_SIZE,
    empty_score_sheet,
    extract_session_evidence,
    render_score_sheet_markdown,
)
from learning.eval_scorer import audit_math_playbook_signals, audit_science_playbook_signals
from learning.models import LessonSession, ManualSessionEval


class Command(BaseCommand):
    help = "Export session score sheets for manual C8.3 rubric scoring."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=TARGET_SAMPLE_SIZE,
            help=f"How many recent sessions (default {TARGET_SAMPLE_SIZE})",
        )
        parser.add_argument(
            "--out",
            type=str,
            default="eval_samples",
            help="Output directory (relative to cwd or absolute)",
        )
        parser.add_argument(
            "--session-id",
            type=str,
            default="",
            help="Export a single session id",
        )
        parser.add_argument(
            "--min-turns",
            type=int,
            default=2,
            help="Skip sessions with fewer turns (default 2)",
        )
        parser.add_argument(
            "--cohort",
            type=str,
            default="beta-c8.3",
            help="Cohort label written into pack metadata",
        )

    def handle(self, *args, **options):
        out_dir = Path(options["out"]).resolve()
        out_dir.mkdir(parents=True, exist_ok=True)
        limit = max(1, int(options["limit"]))
        min_turns = max(0, int(options["min_turns"]))
        cohort = options["cohort"] or "beta-c8.3"
        sid = (options.get("session_id") or "").strip()

        if sid:
            qs = LessonSession.objects.filter(session_id=sid)
            if not qs.exists():
                raise CommandError(f"No session {sid!r}")
            sessions = list(qs)
        else:
            sessions = list(
                LessonSession.objects.filter(turn_count__gte=min_turns)
                .prefetch_related("turns")
                .order_by("-started_at")[:limit]
            )

        if not sessions:
            raise CommandError(
                "No sessions found. Run a few lessons first, or lower --min-turns."
            )

        already = set(
            ManualSessionEval.objects.filter(cohort=cohort).values_list(
                "client_session_key", flat=True
            )
        )

        manifest = {
            "rubricVersion": RUBRIC_VERSION,
            "cohort": cohort,
            "targetSampleSize": TARGET_SAMPLE_SIZE,
            "exportedAt": timezone.now().isoformat(),
            "count": 0,
            "sessions": [],
        }

        for session in sessions:
            evidence = extract_session_evidence(session)
            tutor_texts = [
                str(turn.get("tutor") or "")
                for turn in evidence.get("turnsPreview") or []
            ]
            playbook_audit = audit_science_playbook_signals(
                subject=session.subject,
                topic=session.topic,
                tutor_texts=tutor_texts,
            )
            if not playbook_audit.get("applicable"):
                playbook_audit = audit_math_playbook_signals(
                    subject=session.subject,
                    topic=session.topic,
                    tutor_texts=tutor_texts,
                )
            if playbook_audit.get("applicable"):
                evidence["playbookAudit"] = playbook_audit
                evidence.setdefault("scorerHints", []).append(
                    f"C7 {playbook_audit.get('domain')} playbook surface cues (not a score): "
                    + ", ".join(
                        f"{name}={'seen' if seen else 'not seen'}"
                        for name, seen in playbook_audit["signals"].items()
                    )
                    + ". Review fit, accuracy, and pacing manually."
                )
            sheet = empty_score_sheet()
            meta = {
                "sessionId": session.session_id,
                "subject": session.subject,
                "topic": session.topic,
                "studentId": session.client_student_id,
                "alreadyScored": session.session_id in already,
            }
            base = f"{session.session_id}"
            md_path = out_dir / f"{base}.md"
            json_path = out_dir / f"{base}.json"
            pack = {
                "meta": meta,
                "evidence": evidence,
                "scoreSheet": sheet,
                "cohort": cohort,
            }
            md_path.write_text(
                render_score_sheet_markdown(
                    session_meta=meta, evidence=evidence, sheet=sheet
                ),
                encoding="utf-8",
            )
            json_path.write_text(
                json.dumps(pack, indent=2, default=str), encoding="utf-8"
            )
            manifest["sessions"].append(
                {
                    **meta,
                    "markdown": str(md_path.name),
                    "json": str(json_path.name),
                }
            )
            manifest["count"] += 1
            flag = " (already scored)" if meta["alreadyScored"] else ""
            self.stdout.write(
                f"  wrote {md_path.name} · {session.subject}/{session.topic} "
                f"· {session.turn_count} turns{flag}"
            )

        man_path = out_dir / "manifest.json"
        man_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        scored_n = ManualSessionEval.objects.filter(cohort=cohort).count()
        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Exported {manifest['count']} session(s) → {out_dir}\n"
                f"Cohort '{cohort}' has {scored_n}/{TARGET_SAMPLE_SIZE} scored.\n"
                f"Score with: python manage.py eval_score --session-id <id> "
                f"--scores socratic=4,hint=4,... --scorer yourname"
            )
        )
