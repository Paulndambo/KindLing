"""Epic L2 — pedagogical policy unit + API tests."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from learning.models import LearningEvent, LearningEventType, LearningProfile
from learning.pedagogical_policy import (
    PEDAGOGY_POLICY_VERSION,
    PedagogicalAction,
    build_pedagogy_prompt_block,
    decide_pedagogy,
    rank_next_best_actions,
)
from students.models import StudentProfile

User = get_user_model()


class PedagogyUnitTests(TestCase):
    def test_default_socratic(self):
        d = decide_pedagogy({}, {})
        self.assertEqual(d["action"], PedagogicalAction.CONTINUE_SOCRATIC)
        self.assertEqual(d["policyVersion"], PEDAGOGY_POLICY_VERSION)
        self.assertTrue(d["id"])
        self.assertTrue(d["executionBrief"])

    def test_review_mode_lock(self):
        d = decide_pedagogy({}, {"reviewMode": True, "reviewSkillLabel": "Fractions"})
        self.assertEqual(d["action"], PedagogicalAction.REVIEW)

    def test_rapid_guessing(self):
        d = decide_pedagogy(
            {"behaviour": {"flags": ["rapid_guessing"]}},
            {
                "lastSignals": {
                    "correctness": "incorrect",
                    "rapidGuess": True,
                }
            },
        )
        self.assertEqual(d["action"], PedagogicalAction.SLOW_DOWN)

    def test_overconfident(self):
        d = decide_pedagogy(
            {"confidence": {"calibration": "overconfident", "competence": 0.4}},
            {"lastSignals": {"correctness": "incorrect"}},
        )
        self.assertEqual(d["action"], PedagogicalAction.CHECK_UNDERSTANDING)

    def test_underconfident_challenge(self):
        d = decide_pedagogy(
            {
                "confidence": {
                    "calibration": "underconfident",
                    "competence": 0.8,
                }
            },
            {"lastSignals": {"correctness": "correct"}},
        )
        self.assertEqual(d["action"], PedagogicalAction.CHALLENGE)

    def test_prereq_remediate(self):
        d = decide_pedagogy(
            {},
            {
                "consecutiveIncorrect": 3,
                "lastSignals": {"correctness": "incorrect"},
                "weakPrereq": {
                    "slug": "frac.equiv",
                    "name": "Equivalent fractions",
                    "shortLabel": "Equiv. fractions",
                },
            },
        )
        self.assertEqual(d["action"], PedagogicalAction.REMEDIATE_PREREQUISITE)
        self.assertIn("Equiv", d["params"].get("prereqLabel") or "")

    def test_misconception(self):
        d = decide_pedagogy(
            {
                "misconceptions": [
                    {"id": "mc1", "label": "Adds tops and bottoms", "isActive": True}
                ]
            },
            {"lastSignals": {"correctness": "incorrect"}},
        )
        self.assertEqual(d["action"], PedagogicalAction.REMEDIATE_MISCONCEPTION)

    def test_intervention_active_maps_ladder(self):
        d = decide_pedagogy(
            {},
            {"intervention": {"status": "active", "level": 2}},
        )
        self.assertEqual(d["action"], PedagogicalAction.WORKED_EXAMPLE)

    def test_adi_independent(self):
        d = decide_pedagogy(
            {
                "adi": {"preferLighterHelp": True, "reliable": True},
                "knowledge": {"topicScore": 70},
            },
            {"lastSignals": {"correctness": "correct"}},
        )
        self.assertEqual(d["action"], PedagogicalAction.INDEPENDENT_PRACTICE)

    def test_prompt_block_execute_only(self):
        d = decide_pedagogy({}, {"reviewMode": True})
        block = build_pedagogy_prompt_block(d)
        self.assertIn("EXECUTE ONLY", block)
        self.assertIn(d["id"], block)
        self.assertIn("REVIEW", block)

    def test_rank_nba_prefers_review(self):
        ranked = rank_next_best_actions(
            due_reviews=[{"skillSlug": "x", "skillLabel": "Loops"}],
            recommended_skill={"slug": "y", "shortLabel": "Vars"},
        )
        self.assertEqual(ranked[0]["action"], PedagogicalAction.REVIEW)


class PedagogyApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="l2student@example.com",
            email="l2student@example.com",
            password="test-pass-l2",
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="L2 Learner",
            grade="6",
            is_onboarded=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        LearningProfile.objects.create(
            student=self.student,
            client_student_id="l2_kid",
            totals={"exchanges": 5, "correct": 2, "incorrect": 2, "partial": 1},
            behavior={},
        )

    def test_event_type_includes_pedagogy_decision(self):
        values = {c[0] for c in LearningEventType.choices}
        self.assertIn("pedagogy.decision", values)

    def test_ingest_pedagogy_decision(self):
        events = [
            {
                "id": "l2-pd-1",
                "type": LearningEventType.PEDAGOGY_DECISION,
                "timestamp": "2026-09-09T15:00:00.000Z",
                "context": {"studentId": "l2_kid", "sessionId": "sess-l2"},
                "payload": {
                    "sessionId": "sess-l2",
                    "decisionId": "pd_test",
                    "action": "SLOW_DOWN",
                    "confidence": 0.8,
                    "reasons": ["rapid_guessing"],
                    "executionBrief": "Slow the pace.",
                    "policyVersion": 1,
                    "phase": "post_turn",
                },
            }
        ]
        res = self.client.post(
            "/api/learning/events/",
            {"events": events, "source": "kindling-web", "schemaVersion": 1},
            format="json",
        )
        self.assertIn(res.status_code, (200, 201, 202), res.content)
        ev = LearningEvent.objects.get(client_event_id="l2-pd-1")
        self.assertEqual(ev.event_type, LearningEventType.PEDAGOGY_DECISION)
        self.assertEqual(ev.payload.get("action"), "SLOW_DOWN")

    def test_dashboard_includes_next_best_actions(self):
        res = self.client.get("/api/learning/dashboard/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("nextBestActions", body)
        self.assertIsInstance(body["nextBestActions"], list)
        self.assertGreaterEqual(len(body["nextBestActions"]), 1)
