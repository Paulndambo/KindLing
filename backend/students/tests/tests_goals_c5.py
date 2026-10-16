"""Epic C5 lite — week_focus on student profile API."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from students.models import StudentProfile

User = get_user_model()


class WeekFocusC5Tests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="c5student@example.com",
            email="c5student@example.com",
            password="test-pass-c5",
        )
        self.profile = StudentProfile.objects.create(
            user=self.user,
            name="C5 Learner",
            grade="6",
            is_onboarded=True,
            goal="Feel confident in math",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_me_includes_week_focus(self):
        res = self.client.get("/api/students/me/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("weekFocus", res.data)
        self.assertEqual(res.data.get("weekFocus") or "", "")

    def test_patch_week_focus(self):
        res = self.client.patch(
            "/api/students/me/",
            {"weekFocus": "Fraction sense this week"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["weekFocus"], "Fraction sense this week")
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.week_focus, "Fraction sense this week")

    def test_week_focus_max_length(self):
        long = "x" * 300
        res = self.client.patch(
            "/api/students/me/",
            {"weekFocus": long},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
