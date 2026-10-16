"""Epic C8.1 — offline automated scorer tests."""

from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from learning.eval_scorer import (
    SCORER_ID,
    compare_auto_vs_human,
    score_lesson_session,
    score_session_evidence,
)
from learning.models import (
    LearningEvent,
    LearningEventType,
    LessonSession,
    ManualSessionEval,
    SessionTurn,
)


class EvalScorerUnitTests(TestCase):
    def _session(self, **kwargs):
        now = timezone.now()
        defaults = dict(
            session_id="sess-auto-1",
            client_student_id="auto_kid",
            subject="Math Foundations",
            topic="Adding fractions",
            started_at=now - timedelta(minutes=15),
            ended_at=now,
            turn_count=4,
            accuracy=0.5,
            counters={"hints": 2, "incorrect": 2, "correct": 2, "persistenceEvents": 1},
        )
        defaults.update(kwargs)
        return LessonSession.objects.create(**defaults)

    def test_scores_socratic_heavy_questions(self):
        evidence = {
            "sessionId": "x",
            "counters": {},
            "turnsPreview": [
                {
                    "tutor": "What do you notice about the pieces? Why?",
                    "student": "same size?",
                    "correctness": "partial",
                },
                {
                    "tutor": "Nice thinking — can you try one more?",
                    "student": "ok",
                    "correctness": "correct",
                },
            ],
            "pedagogyDecisions": [],
            "interventions": [],
            "adiSnapshots": [],
            "struggleSignals": [],
            "misconceptions": [],
        }
        result = score_session_evidence(
            evidence,
            tutor_texts=[t["tutor"] for t in evidence["turnsPreview"]],
        )
        self.assertEqual(result["scorer"], SCORER_ID)
        self.assertIn("socratic_fidelity", result["scores"])
        self.assertIsNotNone(result["scores"]["socratic_fidelity"])
        self.assertGreaterEqual(result["scores"]["socratic_fidelity"], 3)

    def test_shame_lowers_affect(self):
        evidence = {
            "sessionId": "y",
            "counters": {},
            "turnsPreview": [],
            "pedagogyDecisions": [],
            "interventions": [],
            "adiSnapshots": [],
            "struggleSignals": [],
            "misconceptions": [],
        }
        bad = score_session_evidence(
            evidence,
            tutor_texts=["That is wrong again. You should know this. So easy."],
        )
        good = score_session_evidence(
            evidence,
            tutor_texts=["Great try — that's okay, we can work together. Take your time."],
        )
        self.assertLess(
            bad["scores"]["affect_respect"],
            good["scores"]["affect_respect"],
        )

    def test_decision_compliance_with_cues(self):
        evidence = {
            "sessionId": "z",
            "counters": {},
            "turnsPreview": [],
            "pedagogyDecisions": [
                {"action": "SLOW_DOWN", "decisionId": "1"},
                {"action": "MICRO_HINT", "decisionId": "2"},
            ],
            "interventions": [],
            "adiSnapshots": [],
            "struggleSignals": [],
            "misconceptions": [],
        }
        result = score_session_evidence(
            evidence,
            tutor_texts=[
                "Slow down — why did you pick that? Show your reason.",
                "One small hint: look at the bottom number.",
            ],
        )
        self.assertIsNotNone(result["scores"]["decision_compliance"])
        self.assertGreaterEqual(result["scores"]["decision_compliance"], 4)

    def test_misconception_remediated(self):
        evidence = {
            "sessionId": "m",
            "counters": {},
            "turnsPreview": [{"tutor": "ok", "student": "x"}],
            "pedagogyDecisions": [],
            "interventions": [],
            "adiSnapshots": [],
            "struggleSignals": [],
            "misconceptions": [
                {"type": "misconception.detected", "id": "mc1"},
                {"type": "misconception.remediated", "id": "mc1"},
            ],
        }
        result = score_session_evidence(evidence, tutor_texts=["ok"])
        self.assertGreaterEqual(result["scores"]["misconception_handling"], 4)

    def test_compare_auto_vs_human(self):
        cmp_ = compare_auto_vs_human(
            {"socratic_fidelity": 4, "hint_quality": 3},
            {"socratic_fidelity": 5, "hint_quality": 3, "affect_respect": 4},
        )
        self.assertEqual(cmp_["n"], 2)
        self.assertIsNotNone(cmp_["mae"])
        self.assertEqual(cmp_["within1"], 1.0)

    def test_score_lesson_session_end_to_end(self):
        s = self._session()
        now = timezone.now()
        SessionTurn.objects.create(
            session=s,
            index=0,
            occurred_at=now,
            student_text="1/2",
            tutor_text="What do the pieces mean? Can you show why?",
            correctness="incorrect",
            affect="frustrated",
        )
        SessionTurn.objects.create(
            session=s,
            index=1,
            occurred_at=now,
            student_text="equal parts",
            tutor_text="Great try — take your time. One small hint: bottoms match.",
            correctness="correct",
            affect="curious",
        )
        LearningEvent.objects.create(
            client_event_id="auto-pd-1",
            event_type=LearningEventType.PEDAGOGY_DECISION,
            timestamp=now,
            session_id=s.session_id,
            payload={"action": "MICRO_HINT", "decisionId": "pd1"},
        )
        LearningEvent.objects.create(
            client_event_id="auto-str-1",
            event_type=LearningEventType.STRUGGLE_SIGNAL,
            timestamp=now,
            session_id=s.session_id,
            payload={"signal": "incorrect_streak"},
        )
        LearningEvent.objects.create(
            client_event_id="auto-iv-1",
            event_type=LearningEventType.INTERVENTION_ENTERED,
            timestamp=now,
            session_id=s.session_id,
            payload={"level": 1, "reason": "incorrect_streak"},
        )
        LearningEvent.objects.create(
            client_event_id="auto-adi-1",
            event_type=LearningEventType.LEARNING_ADI,
            timestamp=now,
            session_id=s.session_id,
            payload={
                "value": 0.25,
                "band": "gaining_independence",
                "trend": "falling",
            },
        )
        result = score_lesson_session(s)
        self.assertIsNotNone(result["weightedMean"])
        self.assertGreater(result["completeness"], 0.5)
        self.assertTrue(result["summary"])


class EvalAutoScoreCommandTests(TestCase):
    def setUp(self):
        now = timezone.now()
        self.session = LessonSession.objects.create(
            session_id="sess-cmd-auto",
            client_student_id="cmd",
            subject="CS",
            topic="Hardware",
            started_at=now,
            turn_count=2,
            accuracy=0.5,
            counters={"hints": 1},
        )
        SessionTurn.objects.create(
            session=self.session,
            index=0,
            occurred_at=now,
            student_text="ram?",
            tutor_text="What keeps files when power is off? Take your time.",
            correctness="partial",
        )
        SessionTurn.objects.create(
            session=self.session,
            index=1,
            occurred_at=now,
            student_text="storage",
            tutor_text="Nice thinking — for example, a USB stick keeps files.",
            correctness="correct",
        )

    def test_command_preview_and_save(self):
        out = StringIO()
        call_command(
            "eval_auto_score",
            "--session-id",
            self.session.session_id,
            stdout=out,
        )
        self.assertIn("sess-cmd-auto", out.getvalue())

        call_command(
            "eval_auto_score",
            "--session-id",
            self.session.session_id,
            "--save",
            "--cohort",
            "auto-test",
            stdout=StringIO(),
        )
        row = ManualSessionEval.objects.get(
            client_session_key=self.session.session_id, cohort="auto-test"
        )
        self.assertEqual(row.scorer, SCORER_ID)
        self.assertIsNotNone(row.weighted_mean)
        self.assertTrue(row.scores)
