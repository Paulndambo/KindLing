"""Epic C8.3 — manual eval rubric unit + command tests."""

from datetime import timedelta
from io import StringIO
from pathlib import Path
import json
import tempfile

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from learning.eval_rubric import (
    DIMENSION_IDS,
    RUBRIC_VERSION,
    TARGET_SAMPLE_SIZE,
    completeness,
    empty_score_sheet,
    extract_session_evidence,
    parse_score_kv,
    summarize_cohort,
    validate_scores,
    weighted_mean,
)
from learning.models import (
    LearningEvent,
    LearningEventType,
    LessonSession,
    ManualSessionEval,
    SessionTurn,
)


class EvalRubricUnitTests(TestCase):
    def test_dimension_count(self):
        self.assertEqual(len(DIMENSION_IDS), 10)
        self.assertEqual(TARGET_SAMPLE_SIZE, 10)
        self.assertEqual(RUBRIC_VERSION, 1)

    def test_validate_and_mean(self):
        scores = validate_scores(
            {
                "socratic_fidelity": 4,
                "hint_quality": 5,
                "overall_learning_quality": 4,
            }
        )
        self.assertEqual(scores["socratic_fidelity"], 4)
        self.assertIsNone(scores["decision_compliance"])
        mean = weighted_mean(scores)
        self.assertIsNotNone(mean)
        self.assertGreaterEqual(mean, 1.0)
        self.assertLessEqual(mean, 5.0)
        self.assertGreater(completeness(scores), 0.2)

    def test_parse_aliases(self):
        d = parse_score_kv(["socratic=4", "hint=3", "overall=5"])
        self.assertEqual(d["socratic_fidelity"], 4)
        self.assertEqual(d["hint_quality"], 3)
        self.assertEqual(d["overall_learning_quality"], 5)

    def test_invalid_score(self):
        with self.assertRaises(ValueError):
            validate_scores({"socratic_fidelity": 9})

    def test_summarize_cohort(self):
        evals = [
            {
                "sessionId": "a",
                "scores": {did: 4 for did in DIMENSION_IDS},
            },
            {
                "sessionId": "b",
                "scores": {did: 3 for did in DIMENSION_IDS},
            },
        ]
        summary = summarize_cohort(evals)
        self.assertEqual(summary["scoredCount"], 2)
        self.assertFalse(summary["sampleComplete"])
        self.assertIsNotNone(summary["overallMean"])
        self.assertIn("socratic_fidelity", summary["dimensions"])

    def test_empty_sheet_has_all_dims(self):
        sheet = empty_score_sheet()
        ids = [d["id"] for d in sheet["dimensions"]]
        self.assertEqual(ids, DIMENSION_IDS)


class EvalCommandsTests(TestCase):
    def setUp(self):
        now = timezone.now()
        self.session = LessonSession.objects.create(
            session_id="sess-c8-demo",
            client_student_id="c8_kid",
            subject="Computer Science",
            topic="Hardware",
            started_at=now - timedelta(minutes=20),
            ended_at=now,
            turn_count=4,
            accuracy=0.5,
            counters={"hints": 1, "correct": 2, "incorrect": 2},
        )
        for i in range(4):
            SessionTurn.objects.create(
                session=self.session,
                index=i,
                occurred_at=now - timedelta(minutes=15 - i),
                student_text=f"answer {i}",
                tutor_text=f"guide {i}",
                correctness="correct" if i % 2 == 0 else "incorrect",
                affect="curious",
            )
        LearningEvent.objects.create(
            client_event_id="c8-pd-1",
            event_type=LearningEventType.PEDAGOGY_DECISION,
            timestamp=now,
            session_id=self.session.session_id,
            client_student_id="c8_kid",
            payload={
                "action": "MICRO_HINT",
                "decisionId": "pd_x",
                "reasons": ["incorrect_streak"],
            },
        )
        LearningEvent.objects.create(
            client_event_id="c8-adi-1",
            event_type=LearningEventType.LEARNING_ADI,
            timestamp=now,
            session_id=self.session.session_id,
            payload={"value": 0.4, "band": "balanced_support", "trend": "stable"},
        )

    def test_extract_evidence_includes_decisions(self):
        ev = extract_session_evidence(self.session)
        self.assertEqual(ev["sessionId"], "sess-c8-demo")
        self.assertGreaterEqual(len(ev["turnsPreview"]), 1)
        self.assertTrue(ev["pedagogyDecisions"])
        self.assertEqual(ev["pedagogyDecisions"][0]["action"], "MICRO_HINT")
        self.assertTrue(ev["adiSnapshots"])
        self.assertTrue(any("pedagogy.decision" in h for h in ev["scorerHints"]))

    def test_export_and_score_and_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = StringIO()
            call_command(
                "eval_sample_export",
                "--session-id",
                self.session.session_id,
                "--out",
                tmp,
                stdout=out,
            )
            md = Path(tmp) / f"{self.session.session_id}.md"
            js = Path(tmp) / f"{self.session.session_id}.json"
            self.assertTrue(md.is_file())
            self.assertTrue(js.is_file())
            pack = json.loads(js.read_text(encoding="utf-8"))
            self.assertIn("evidence", pack)
            self.assertIn("scoreSheet", pack)

            # Fill scores in JSON pack path
            for d in pack["scoreSheet"]["dimensions"]:
                d["score"] = 4
            pack["scoreSheet"]["scorer"] = "tester"
            pack["scoreSheet"]["overallNotes"] = "Solid pilot session"
            filled = Path(tmp) / "filled.json"
            filled.write_text(json.dumps(pack), encoding="utf-8")

            call_command(
                "eval_score",
                "--from-json",
                str(filled),
                "--cohort",
                "test-c8",
                stdout=StringIO(),
            )
            row = ManualSessionEval.objects.get(
                client_session_key=self.session.session_id, cohort="test-c8"
            )
            self.assertEqual(row.scorer, "tester")
            self.assertIsNotNone(row.weighted_mean)
            self.assertGreaterEqual(row.completeness, 0.99)

            # CLI scores path
            call_command(
                "eval_score",
                "--session-id",
                self.session.session_id,
                "--cohort",
                "test-c8",
                "--scores",
                "socratic=5,hint=4,timing=4,decision=5,affect=5,"
                "mc=3,realworld=4,independence=4,persistence=4,overall=5",
                "--scorer",
                "tester2",
                stdout=StringIO(),
            )
            row.refresh_from_db()
            self.assertEqual(row.scorer, "tester2")
            self.assertEqual(row.scores.get("socratic_fidelity"), 5)

            report_out = StringIO()
            call_command(
                "eval_report",
                "--cohort",
                "test-c8",
                stdout=report_out,
            )
            text = report_out.getvalue()
            self.assertIn("C8.3", text)
            self.assertIn("Socratic", text)
