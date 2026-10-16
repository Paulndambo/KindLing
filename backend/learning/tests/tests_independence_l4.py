"""Epic L4 — independence twin event types + rate helpers."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from learning.independence import (
    independence_rate,
    independence_rate_from_events,
    should_offer_independence_twin,
)
from learning.models import LearningEvent, LearningEventType
from students.models import StudentProfile

User = get_user_model()


class IndependenceUnitTests(TestCase):
    def test_offer_gating(self):
        self.assertFalse(
            should_offer_independence_twin(ladder_level=1, had_graded_success_during_help=True)
        )
        self.assertTrue(
            should_offer_independence_twin(ladder_level=2, had_graded_success_during_help=True)
        )
        self.assertTrue(
            should_offer_independence_twin(ladder_level=3, had_graded_success_during_help=False)
        )
        self.assertFalse(
            should_offer_independence_twin(
                ladder_level=3,
                had_graded_success_during_help=True,
                already_offered=True,
            )
        )

    def test_independence_rate(self):
        rate = independence_rate(
            [
                {"success": True},
                {"success": False},
                {"success": True},
                {"skipped": True},
            ]
        )
        self.assertEqual(rate, 0.667)


class IndependenceApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="l4@example.com",
            email="l4@example.com",
            password="test-l4",
        )
        StudentProfile.objects.create(
            user=self.user, name="L4", grade="5", is_onboarded=True
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_event_types_include_independence(self):
        values = {c[0] for c in LearningEventType.choices}
        self.assertIn("independence.offered", values)
        self.assertIn("independence.completed", values)
        self.assertIn("independence.declined", values)

    def test_ingest_and_rate(self):
        events = [
            {
                "id": "l4-off-1",
                "type": LearningEventType.INDEPENDENCE_OFFERED,
                "timestamp": "2026-09-10T10:00:00.000Z",
                "context": {"studentId": "l4", "sessionId": "s-l4"},
                "payload": {
                    "ladderLevel": 3,
                    "transfer": True,
                    "phase": "offered",
                },
            },
            {
                "id": "l4-start-1",
                "type": LearningEventType.INDEPENDENCE_STARTED,
                "timestamp": "2026-09-10T10:01:00.000Z",
                "context": {"studentId": "l4", "sessionId": "s-l4"},
                "payload": {
                    "independenceId": "indep_1",
                    "transfer": True,
                    "noScaffold": True,
                    "questionId": "aq.cs.hw.2",
                },
            },
            {
                "id": "l4-done-1",
                "type": LearningEventType.INDEPENDENCE_COMPLETED,
                "timestamp": "2026-09-10T10:02:00.000Z",
                "context": {"studentId": "l4", "sessionId": "s-l4"},
                "payload": {
                    "independenceId": "indep_1",
                    "success": True,
                    "transfer": True,
                    "noScaffold": True,
                    "independence": "demonstrated",
                },
            },
        ]
        res = self.client.post(
            "/api/learning/events/",
            {"events": events, "source": "kindling-web", "schemaVersion": 1},
            format="json",
        )
        self.assertIn(res.status_code, (200, 201, 202), res.content)
        rows = list(
            LearningEvent.objects.filter(session_id="s-l4").order_by("timestamp")
        )
        self.assertEqual(len(rows), 3)
        summary = independence_rate_from_events(rows)
        self.assertEqual(summary["offered"], 1)
        self.assertEqual(summary["completed"], 1)
        self.assertEqual(summary["successes"], 1)
        self.assertEqual(summary["independenceRate"], 1.0)
        self.assertEqual(summary["transferRate"], 1.0)
