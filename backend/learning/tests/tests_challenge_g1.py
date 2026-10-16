"""Epic G1 — light spark challenge event types accepted by ingest."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from learning.models import LearningEvent, LearningEventType
from students.models import StudentProfile

User = get_user_model()


class SparkChallengeG1Tests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="g1student@example.com",
            email="g1student@example.com",
            password="test-pass-g1",
        )
        self.profile = StudentProfile.objects.create(
            user=self.user,
            name="G1 Learner",
            grade="5",
            is_onboarded=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_event_type_choices_include_challenge(self):
        values = {c[0] for c in LearningEventType.choices}
        self.assertIn("challenge.started", values)
        self.assertIn("challenge.completed", values)

    def test_ingest_challenge_events(self):
        events = [
            {
                "id": "g1-start-1",
                "type": LearningEventType.CHALLENGE_STARTED,
                "timestamp": "2026-08-31T18:00:00.000Z",
                "context": {"studentId": "g1_kid", "sessionId": "sess-g1"},
                "payload": {
                    "sessionId": "sess-g1",
                    "skillSlug": "frac.sense",
                    "target": 3,
                },
            },
            {
                "id": "g1-done-1",
                "type": LearningEventType.CHALLENGE_COMPLETED,
                "timestamp": "2026-08-31T18:05:00.000Z",
                "context": {"studentId": "g1_kid", "sessionId": "sess-g1"},
                "payload": {
                    "sessionId": "sess-g1",
                    "skillSlug": "frac.sense",
                    "correct": 3,
                    "target": 3,
                },
            },
        ]
        res = self.client.post(
            "/api/learning/events/",
            {"events": events, "source": "kindling-web", "schemaVersion": 1},
            format="json",
        )
        self.assertIn(res.status_code, (200, 201, 202), res.content)
        types = set(
            LearningEvent.objects.filter(session_id="sess-g1").values_list(
                "event_type", flat=True
            )
        )
        # session_id may live on context — fall back to type count
        if not types:
            types = set(
                LearningEvent.objects.filter(
                    event_type__in=[
                        LearningEventType.CHALLENGE_STARTED,
                        LearningEventType.CHALLENGE_COMPLETED,
                    ]
                ).values_list("event_type", flat=True)
            )
        self.assertIn(LearningEventType.CHALLENGE_STARTED, types)
        self.assertIn(LearningEventType.CHALLENGE_COMPLETED, types)
        done = LearningEvent.objects.filter(
            client_event_id="g1-done-1"
        ).first()
        self.assertIsNotNone(done)
        self.assertEqual(done.payload.get("correct"), 3)
