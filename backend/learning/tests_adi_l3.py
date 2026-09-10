"""Epic L3 — Assistance Dependency Index unit + API tests."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from learning.adi import (
    ADI_VERSION,
    adi_band,
    apply_adi_ladder_preference,
    assistance_weight_for_turn,
    compute_adi,
    compute_adi_from_events,
    should_prefer_lighter_help,
)
from learning.models import LearningEvent, LearningEventType, LearningProfile
from students.models import StudentProfile

User = get_user_model()


class AdiUnitTests(TestCase):
    def test_weight_hint_and_level(self):
        w_hint = assistance_weight_for_turn(
            {"correctness": "correct", "isHintRequest": True}
        )
        self.assertGreater(w_hint, 0.25)
        w_guide = assistance_weight_for_turn(
            {
                "correctness": "correct",
                "interventionActive": True,
                "interventionLevel": 3,
            }
        )
        self.assertGreater(w_guide, 0.4)
        w_solo = assistance_weight_for_turn(
            {"correctness": "correct", "interventionLevel": 0}
        )
        self.assertLess(w_solo, 0.15)

    def test_compute_adi_high_dependency(self):
        turns = [
            {
                "correctness": "correct",
                "interventionActive": True,
                "interventionLevel": 3,
            }
            for _ in range(6)
        ]
        result = compute_adi(turns)
        self.assertTrue(result["reliable"])
        self.assertEqual(result["version"], ADI_VERSION)
        self.assertGreaterEqual(result["value"], 0.45)
        self.assertEqual(adi_band(result["value"]), result["band"])
        self.assertTrue(result["copy"])
        self.assertNotIn("dependent", (result["copy"] or "").lower())
        self.assertNotIn("bad", (result["copy"] or "").lower())

    def test_compute_adi_independence(self):
        turns = [
            {"correctness": "correct", "interventionLevel": 0}
            for _ in range(6)
        ]
        result = compute_adi(turns, topic_score=72)
        self.assertTrue(result["reliable"])
        self.assertLess(result["value"], 0.3)
        self.assertEqual(result["band"], "gaining_independence")
        self.assertTrue(result["preferLighterHelp"])
        self.assertIn("independen", (result["copy"] or "").lower())

    def test_insufficient_samples(self):
        result = compute_adi(
            [{"correctness": "correct", "interventionLevel": 0}]
        )
        self.assertFalse(result["reliable"])
        self.assertIsNone(result["value"])

    def test_trend_falling_means_independence_up(self):
        heavy = {
            "correctness": "correct",
            "interventionActive": True,
            "interventionLevel": 3,
        }
        light = {"correctness": "correct", "interventionLevel": 0}
        turns = [heavy, heavy, heavy, heavy, light, light, light, light]
        result = compute_adi(turns)
        self.assertEqual(result["trend"], "falling")

    def test_ladder_preference_fades(self):
        adi = compute_adi(
            [{"correctness": "correct", "interventionLevel": 0} for _ in range(6)],
            topic_score=75,
        )
        faded = apply_adi_ladder_preference(3, adi)
        self.assertLessEqual(faded, 2)
        # Manual / escalate untouched
        self.assertEqual(apply_adi_ladder_preference(3, adi, manual=True), 3)
        self.assertEqual(apply_adi_ladder_preference(4, adi, escalate=True), 4)

    def test_prefer_lighter_high_mastery_high_adi(self):
        self.assertTrue(
            should_prefer_lighter_help(adi=0.5, topic_score=75, trend="stable")
        )


class AdiApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="l3student@example.com",
            email="l3student@example.com",
            password="test-pass-l3",
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="L3 Learner",
            grade="6",
            is_onboarded=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        LearningProfile.objects.create(
            student=self.student,
            client_student_id="l3_kid",
            totals={"exchanges": 8, "correct": 4, "incorrect": 3, "partial": 1},
            behavior={"hintRate": 0.3},
        )

    def test_event_type_includes_learning_adi(self):
        values = {c[0] for c in LearningEventType.choices}
        self.assertIn("learning.adi", values)

    def test_ingest_learning_adi_updates_profile(self):
        events = [
            {
                "id": "l3-adi-1",
                "type": LearningEventType.LEARNING_ADI,
                "timestamp": "2026-09-09T14:00:00.000Z",
                "context": {"studentId": "l3_kid", "sessionId": "sess-l3"},
                "payload": {
                    "sessionId": "sess-l3",
                    "version": 1,
                    "value": 0.22,
                    "independence": 0.78,
                    "band": "gaining_independence",
                    "trend": "falling",
                    "sampleCount": 8,
                    "preferLighterHelp": True,
                    "reliable": True,
                    "copy": "Growing independence — more solid answers with lighter support.",
                    "phase": "session_end",
                },
            }
        ]
        res = self.client.post(
            "/api/learning/events/",
            {"events": events, "source": "kindling-web", "schemaVersion": 1},
            format="json",
        )
        self.assertIn(res.status_code, (200, 201, 202), res.content)
        ev = LearningEvent.objects.get(client_event_id="l3-adi-1")
        self.assertEqual(ev.event_type, LearningEventType.LEARNING_ADI)
        profile = LearningProfile.objects.filter(client_student_id="l3_kid").first()
        self.assertIsNotNone(profile)
        self.assertAlmostEqual(float(profile.behavior.get("adi")), 0.22, places=2)
        self.assertEqual(profile.behavior.get("adiBand"), "gaining_independence")

    def test_compute_from_exchange_payloads(self):
        payloads = [
            {
                "payload": {
                    "signals": {
                        "correctness": "correct",
                        "interventionActive": True,
                        "interventionLevel": 2,
                    }
                }
            }
            for _ in range(5)
        ]
        result = compute_adi_from_events(payloads)
        self.assertTrue(result["reliable"])
        self.assertIsNotNone(result["value"])
