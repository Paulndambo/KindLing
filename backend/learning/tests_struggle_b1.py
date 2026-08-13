"""Epic B1 — struggle.signal event ingestion."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from learning.models import LearningEvent, LearningEventType
from students.models import StudentProfile

User = get_user_model()


class StruggleSignalEventTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="b1_parent", password="test-pass-b1"
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="B1 Kid",
            grade="4",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_struggle_signal_choice_exists(self):
        self.assertEqual(LearningEventType.STRUGGLE_SIGNAL, "struggle.signal")
        labels = dict(LearningEventType.choices)
        self.assertIn("struggle.signal", labels)

    def test_ingest_struggle_signal_subtypes(self):
        subtypes = [
            "idle",
            "short_answers",
            "topic_thrashing",
            "rapid_guessing",
            "off_topic",
        ]
        events = []
        for i, signal in enumerate(subtypes):
            events.append(
                {
                    "id": f"b1-struggle-{i}",
                    "type": LearningEventType.STRUGGLE_SIGNAL,
                    "timestamp": "2026-08-13T12:00:00.000Z",
                    "context": {
                        "studentId": "b1_kid",
                        "sessionId": "ses_b1_test",
                    },
                    "payload": {
                        "sessionId": "ses_b1_test",
                        "subject": "Math Foundations",
                        "topic": "Fraction sense",
                        "signal": signal,
                        "phase": "streak",
                    },
                }
            )

        res = self.client.post(
            "/api/learning/events/",
            {"events": events, "source": "kindling-web", "schemaVersion": 1},
            format="json",
        )
        self.assertIn(res.status_code, (200, 201, 202), res.content)

        stored = LearningEvent.objects.filter(
            event_type=LearningEventType.STRUGGLE_SIGNAL
        )
        self.assertEqual(stored.count(), len(subtypes))
        seen = {ev.payload.get("signal") for ev in stored}
        self.assertEqual(seen, set(subtypes))
