"""Epic B8 — session.reflect event ingestion."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from learning.models import LearningEvent, LearningEventType
from students.models import StudentProfile

User = get_user_model()


class SessionReflectEventTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="b8_parent", password="test-pass-b8"
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="B8 Kid",
            grade="5",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_event_type_exists(self):
        self.assertEqual(LearningEventType.SESSION_REFLECT, "session.reflect")

    def test_ingest_session_reflect(self):
        events = [
            {
                "id": "b8-reflect-prompt",
                "type": LearningEventType.SESSION_REFLECT,
                "timestamp": "2026-08-30T18:00:00.000Z",
                "context": {"studentId": "b8_kid", "sessionId": "ses_b8"},
                "payload": {
                    "sessionId": "ses_b8",
                    "phase": "prompted",
                    "topic": "Fraction sense",
                },
            },
            {
                "id": "b8-reflect-resp",
                "type": LearningEventType.SESSION_REFLECT,
                "timestamp": "2026-08-30T18:00:20.000Z",
                "context": {"studentId": "b8_kid", "sessionId": "ses_b8"},
                "payload": {
                    "sessionId": "ses_b8",
                    "phase": "response",
                    "topic": "Fraction sense",
                    "clickedId": "fuzzy",
                    "nextId": "practice",
                    "note": "Fraction sense still feels fuzzy · wants to practice again soon",
                },
            },
            {
                "id": "b8-reflect-skip",
                "type": LearningEventType.SESSION_REFLECT,
                "timestamp": "2026-08-30T19:00:00.000Z",
                "context": {"studentId": "b8_kid", "sessionId": "ses_b8b"},
                "payload": {
                    "sessionId": "ses_b8b",
                    "phase": "skipped",
                },
            },
        ]
        res = self.client.post(
            "/api/learning/events/",
            {"events": events, "source": "kindling-web", "schemaVersion": 1},
            format="json",
        )
        self.assertIn(res.status_code, (200, 201, 202), res.content)
        rows = LearningEvent.objects.filter(
            event_type=LearningEventType.SESSION_REFLECT
        )
        self.assertEqual(rows.count(), 3)
        resp = rows.filter(client_event_id="b8-reflect-resp").first()
        self.assertIsNotNone(resp)
        self.assertEqual(resp.payload.get("clickedId"), "fuzzy")
        self.assertEqual(resp.payload.get("nextId"), "practice")
