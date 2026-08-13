"""Epic B3 — affect.checkin + persistence event ingestion and digest."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from learning.digest_service import build_digest_summary, render_digest_copy
from learning.models import LearningEvent, LearningEventType
from students.models import StudentProfile

User = get_user_model()


class AffectCheckInEventTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="b3_parent", password="test-pass-b3"
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="B3 Kid",
            grade="4",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_event_types_exist(self):
        self.assertEqual(LearningEventType.AFFECT_CHECKIN, "affect.checkin")
        self.assertEqual(LearningEventType.PERSISTENCE_NOTED, "affect.persistence")

    def test_ingest_affect_checkin_and_persistence(self):
        events = [
            {
                "id": "b3-checkin-prompt",
                "type": LearningEventType.AFFECT_CHECKIN,
                "timestamp": "2026-08-13T15:00:00.000Z",
                "context": {"studentId": "b3_kid", "sessionId": "ses_b3"},
                "payload": {
                    "sessionId": "ses_b3",
                    "phase": "prompted",
                    "reason": "frustration_streak",
                },
            },
            {
                "id": "b3-checkin-resp",
                "type": LearningEventType.AFFECT_CHECKIN,
                "timestamp": "2026-08-13T15:01:00.000Z",
                "context": {"studentId": "b3_kid", "sessionId": "ses_b3"},
                "payload": {
                    "sessionId": "ses_b3",
                    "phase": "response",
                    "optionId": "stuck",
                    "affect": "hesitant",
                    "label": "A bit stuck",
                },
            },
            {
                "id": "b3-persist",
                "type": LearningEventType.PERSISTENCE_NOTED,
                "timestamp": "2026-08-13T15:02:00.000Z",
                "context": {"studentId": "b3_kid", "sessionId": "ses_b3"},
                "payload": {
                    "sessionId": "ses_b3",
                    "tags": ["bounce_back"],
                    "delta": 1,
                    "copy": "You bounced back — that takes real grit.",
                },
            },
        ]
        res = self.client.post(
            "/api/learning/events/",
            {"events": events, "source": "kindling-web", "schemaVersion": 1},
            format="json",
        )
        self.assertIn(res.status_code, (200, 201, 202), res.content)
        self.assertEqual(
            LearningEvent.objects.filter(
                event_type=LearningEventType.AFFECT_CHECKIN
            ).count(),
            2,
        )
        self.assertEqual(
            LearningEvent.objects.filter(
                event_type=LearningEventType.PERSISTENCE_NOTED
            ).count(),
            1,
        )


class AffectDigestCopyTests(TestCase):
    def test_digest_celebrates_persistence_not_only_accuracy(self):
        summary = {
            "studentName": "Maya",
            "sessions": 2,
            "exchanges": 8,
            "active": True,
            "timeOnTaskLabel": "25m",
            "accuracy": 0.4,
            "persistenceNotes": 3,
            "affectCheckInResponses": 1,
            "interventionsEntered": 0,
            "strengths": [],
            "focusAreas": [],
            "skillSparks": [],
            "topTopics": [],
        }
        headline, body, html = render_digest_copy(summary)
        self.assertIn("Maya", headline)
        self.assertIn("persistence", body.lower())
        self.assertIn("sticking with it", body.lower())
        self.assertNotIn("failed", body.lower())
        self.assertIn("persistence", html.lower())
