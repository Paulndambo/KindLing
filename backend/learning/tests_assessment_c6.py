"""Epic C6 — assessment event types accepted by ingest."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from learning.models import LearningEvent, LearningEventType
from students.models import StudentProfile

User = get_user_model()


class AssessmentC6Tests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="c6student@example.com",
            email="c6student@example.com",
            password="test-pass-c6",
        )
        self.profile = StudentProfile.objects.create(
            user=self.user,
            name="C6 Learner",
            grade="5",
            is_onboarded=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_event_type_choices_include_assessment(self):
        values = {c[0] for c in LearningEventType.choices}
        self.assertIn("assessment.started", values)
        self.assertIn("assessment.answered", values)
        self.assertIn("assessment.completed", values)
        self.assertIn("assessment.exited", values)

    def test_ingest_assessment_events(self):
        events = [
            {
                "id": "c6-start-1",
                "type": LearningEventType.ASSESSMENT_STARTED,
                "timestamp": "2026-09-09T10:00:00.000Z",
                "context": {"studentId": "c6_kid", "sessionId": "sess-c6"},
                "payload": {
                    "sessionId": "sess-c6",
                    "assessmentId": "assess_demo",
                    "questionCount": 5,
                    "source": "ready",
                    "subject": "Math Foundations",
                    "topic": "Adding fractions",
                },
            },
            {
                "id": "c6-ans-1",
                "type": LearningEventType.ASSESSMENT_ANSWERED,
                "timestamp": "2026-09-09T10:01:00.000Z",
                "context": {"studentId": "c6_kid", "sessionId": "sess-c6"},
                "payload": {
                    "sessionId": "sess-c6",
                    "assessmentId": "assess_demo",
                    "questionId": "aq.frac.add_unlike.1",
                    "correct": True,
                    "correctness": "correct",
                    "skillSlug": "frac.add_unlike",
                },
            },
            {
                "id": "c6-done-1",
                "type": LearningEventType.ASSESSMENT_COMPLETED,
                "timestamp": "2026-09-09T10:05:00.000Z",
                "context": {"studentId": "c6_kid", "sessionId": "sess-c6"},
                "payload": {
                    "sessionId": "sess-c6",
                    "assessmentId": "assess_demo",
                    "correct": 4,
                    "total": 5,
                    "percent": 80,
                    "passed": True,
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
            LearningEvent.objects.filter(
                event_type__in=[
                    LearningEventType.ASSESSMENT_STARTED,
                    LearningEventType.ASSESSMENT_ANSWERED,
                    LearningEventType.ASSESSMENT_COMPLETED,
                ]
            ).values_list("event_type", flat=True)
        )
        self.assertIn(LearningEventType.ASSESSMENT_STARTED, types)
        self.assertIn(LearningEventType.ASSESSMENT_ANSWERED, types)
        self.assertIn(LearningEventType.ASSESSMENT_COMPLETED, types)
