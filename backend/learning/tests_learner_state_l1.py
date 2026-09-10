"""Epic L1 — LearnerState contract unit + API tests."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from learning.learner_state import (
    LEARNER_STATE_VERSION,
    assistance_label,
    build_learner_state_from_profile,
    calibrate_confidence_competence,
    empty_learner_state,
    engagement_label,
)
from learning.models import LearningEvent, LearningEventType, LearningProfile
from students.models import StudentProfile

User = get_user_model()


class LearnerStateUnitTests(TestCase):
    def test_empty_has_all_slices(self):
        state = empty_learner_state(student_id="kid", subject="CS", topic="Hardware")
        self.assertEqual(state["version"], LEARNER_STATE_VERSION)
        for key in (
            "knowledge",
            "misconceptions",
            "behaviour",
            "engagement",
            "confidence",
            "assistance",
            "objective",
            "interaction",
            "pulse",
            "summary",
        ):
            self.assertIn(key, state)

    def test_calibration_overconfident(self):
        cal = calibrate_confidence_competence(0.9, 0.4)
        self.assertEqual(cal["calibration"], "overconfident")
        self.assertIsNotNone(cal["error"])

    def test_calibration_underconfident(self):
        cal = calibrate_confidence_competence(0.3, 0.85)
        self.assertEqual(cal["calibration"], "underconfident")

    def test_calibration_aligned(self):
        cal = calibrate_confidence_competence(0.7, 0.72)
        self.assertEqual(cal["calibration"], "calibrated")

    def test_engagement_labels(self):
        self.assertEqual(engagement_label(0.9), "engaged")
        self.assertEqual(engagement_label(0.5), "steady")
        self.assertEqual(engagement_label(0.1), "disengaged")
        self.assertEqual(engagement_label(None), "unknown")

    def test_assistance_labels(self):
        self.assertEqual(assistance_label(0.05), "independent")
        self.assertEqual(assistance_label(0.5), "guided")
        self.assertEqual(assistance_label(0.8, intervention_active=True), "high_support")

    def test_build_from_profile_payload(self):
        profile = {
            "studentId": "ada",
            "totals": {
                "exchanges": 12,
                "correct": 6,
                "incorrect": 4,
                "partial": 2,
                "sessions": 3,
            },
            "mastery": {
                "Computer Science::Computer hardware": {
                    "score": 62,
                    "attempts": 8,
                    "correct": 4,
                    "incorrect": 3,
                    "partial": 1,
                }
            },
            "behavior": {
                "hintRate": 0.4,
                "shortAnswerRate": 0.1,
                "rapidGuessRate": 0.0,
                "offTopicRate": 0.0,
                "persistenceScore": 2,
            },
            "engagementHistory": [0.6, 0.7, 0.65],
            "confidenceHistory": [0.85, 0.9, 0.88],
            "strengths": ["curious questions"],
            "focusAreas": [{"topic": "RAM vs storage"}],
            "misconceptions": {
                "mc.ram_is_storage": {
                    "id": "mc.ram_is_storage",
                    "label": "RAM is long-term storage",
                    "count": 3,
                    "isActive": True,
                    "playbook": {"check_question": "Where does a file stay when power is off?"},
                }
            },
            "deliveryPreferences": {"visual": 3, "step_by_step": 1},
        }
        state = build_learner_state_from_profile(
            profile,
            student_id="ada",
            subject="Computer Science",
            topic="Computer hardware",
            last_signals={
                "correctness": "partial",
                "affect": "hesitant",
                "confidence": 0.8,
                "engagement": 0.55,
            },
            intervention={"status": "active", "level": 2},
            lesson_goals={
                "learningGoal": "Name the main parts of a computer",
                "weekFocus": "Hardware basics",
                "familiarity": "some",
            },
        )
        self.assertEqual(state["knowledge"]["topicScore"], 62)
        self.assertEqual(state["knowledge"]["topicAttempts"], 8)
        self.assertTrue(len(state["misconceptions"]) >= 1)
        self.assertEqual(state["misconceptions"][0]["id"], "mc.ram_is_storage")
        self.assertGreaterEqual(state["misconceptions"][0]["confidence"], 0.5)
        self.assertEqual(state["confidence"]["calibration"], "overconfident")
        self.assertIn(state["assistance"]["label"], ("guided", "high_support"))
        self.assertEqual(state["objective"]["lessonGoal"], "Name the main parts of a computer")
        self.assertTrue(state["interaction"]["prefersVisual"])
        self.assertEqual(state["pulse"]["correctnessText"], "Partial understanding")
        self.assertEqual(state["pulse"]["correctnessTone"], "mid")
        self.assertIsNotNone(state["pulse"]["confidencePct"])
        self.assertTrue(state["pulse"]["calibrationLabel"])
        self.assertIn("RAM", state["pulse"]["misconceptionLabels"][0])
        self.assertTrue(state["summary"])


class LearnerStateApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="l1student@example.com",
            email="l1student@example.com",
            password="test-pass-l1",
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="L1 Learner",
            grade="6",
            is_onboarded=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        LearningProfile.objects.create(
            student=self.student,
            client_student_id="l1_kid",
            totals={"exchanges": 5, "correct": 3, "incorrect": 2, "partial": 0, "sessions": 1},
            behavior={"hintRate": 0.2, "shortAnswerRate": 0.1},
            engagement_history=[0.7, 0.75],
            confidence_history=[0.6, 0.55],
            strengths=["asks why"],
            focus_areas=[],
        )

    def test_profile_endpoint_includes_learner_state(self):
        res = self.client.get(
            "/api/learning/profile/",
            {"studentId": "l1_kid", "subject": "Math", "topic": "Fractions"},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("profile", body)
        self.assertIn("learnerState", body)
        ls = body["learnerState"]
        self.assertEqual(ls["version"], LEARNER_STATE_VERSION)
        self.assertIn("knowledge", ls)
        self.assertIn("confidence", ls)
        self.assertIn("assistance", ls)
        self.assertIn("pulse", ls)

    def test_ingest_profile_snapshot_with_learner_state(self):
        events = [
            {
                "id": "l1-snap-1",
                "type": LearningEventType.PROFILE_SNAPSHOT,
                "timestamp": "2026-09-09T12:00:00.000Z",
                "context": {"studentId": "l1_kid", "sessionId": "sess-l1"},
                "payload": {
                    "profile": {
                        "totals": {
                            "exchanges": 6,
                            "correct": 4,
                            "incorrect": 2,
                            "partial": 0,
                            "sessions": 2,
                        },
                        "behavior": {"hintRate": 0.15},
                    },
                    "learnerState": {
                        "version": 1,
                        "summary": "topic ~50% · engagement steady",
                        "confidence": {"calibration": "calibrated"},
                        "assistance": {"label": "light_support"},
                    },
                },
            }
        ]
        res = self.client.post(
            "/api/learning/events/",
            {"events": events, "source": "kindling-web", "schemaVersion": 1},
            format="json",
        )
        self.assertIn(res.status_code, (200, 201, 202), res.content)
        ev = LearningEvent.objects.get(client_event_id="l1-snap-1")
        self.assertEqual(ev.event_type, LearningEventType.PROFILE_SNAPSHOT)
        self.assertIn("learnerState", ev.payload)
        self.assertEqual(ev.payload["learnerState"]["version"], 1)
        profile = LearningProfile.objects.filter(client_student_id="l1_kid").first()
        self.assertIsNotNone(profile)
        raw = profile.raw_snapshot or {}
        self.assertIn("_learnerState", raw)
        self.assertEqual(raw["_learnerState"]["summary"], "topic ~50% · engagement steady")
