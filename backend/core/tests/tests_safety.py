from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import SafetyEvent
from core.safety import detect_distress, resolve_age_band, policy_notes_for_grade
from students.models import StudentProfile

User = get_user_model()


class AgeBandTests(TestCase):
    def test_child_and_teen_and_adult(self):
        self.assertEqual(resolve_age_band("5th Grade"), "child")
        self.assertEqual(resolve_age_band("8th Grade"), "teen")
        self.assertEqual(resolve_age_band("High School (9–10)"), "teen")
        self.assertEqual(resolve_age_band("College / University (Year 1)"), "adult")
        self.assertEqual(resolve_age_band(""), "unknown")

    def test_policy_notes_default_child_safe(self):
        notes = policy_notes_for_grade("")
        self.assertTrue(notes["child_safe_defaults"])
        self.assertIn("no_sexual_content", notes["rules"])


class DistressDetectTests(TestCase):
    def test_high_suicide_language(self):
        hit = detect_distress("I want to die")
        self.assertEqual(hit["severity"], "high")
        self.assertEqual(hit["category"], "suicide")

    def test_academic_venting_not_crisis(self):
        hit = detect_distress("I'm dying at this math test")
        # May still be none if pattern only matches kill myself etc.
        self.assertIn(hit["severity"], ("none", "low"))


class SafetyApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_policy_endpoint(self):
        res = self.client.get("/api/safety/policy/", {"grade": "4th Grade"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["age_band"], "child")

    def test_safety_event_ingest_no_raw_message_field(self):
        res = self.client.post(
            "/api/safety/events/",
            {
                "category": "self_harm",
                "code": "SELF_HARM",
                "severity": "high",
                "ageBand": "child",
                "sessionId": "sess_1",
                "extra": {"topic": "Fractions"},
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        event = SafetyEvent.objects.get()
        self.assertEqual(event.category, "self_harm")
        self.assertEqual(event.code, "SELF_HARM")
        self.assertNotIn("message", event.extra)


class PrivacyApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="learner@example.com",
            email="learner@example.com",
            password="test-pass-123",
        )
        StudentProfile.objects.create(
            user=self.user,
            name="Alex",
            grade="5th Grade",
            is_onboarded=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_export(self):
        res = self.client.get("/api/auth/export/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["student_profile"]["name"], "Alex")
        self.assertIn("account", res.data)

    def test_delete_requires_confirm(self):
        res = self.client.delete("/api/auth/account/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_account(self):
        res = self.client.delete(
            "/api/auth/account/",
            {"confirm": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["deleted"])
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_demo_cannot_delete(self):
        demo = User.objects.create_user(
            username="student@kindling.edu",
            email="student@kindling.edu",
            password="kindling-demo",
        )
        self.client.force_authenticate(user=demo)
        res = self.client.delete(
            "/api/auth/account/",
            {"confirm": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
