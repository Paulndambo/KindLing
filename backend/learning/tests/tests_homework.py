import io

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from learning.homework import validate_homework_file
from learning.models import HomeworkUpload
from students.models import StudentProfile

User = get_user_model()


def _tiny_png():
    # 1x1 PNG
    import base64

    data = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    return data


class HomeworkValidationTests(TestCase):
    def test_rejects_large(self):
        ok, reason = validate_homework_file(
            content_type="image/png",
            byte_size=6 * 1024 * 1024,
            filename="big.png",
        )
        self.assertFalse(ok)
        self.assertIn("large", reason.lower())

    def test_rejects_bad_type(self):
        ok, _ = validate_homework_file(
            content_type="application/pdf",
            byte_size=100,
            filename="x.pdf",
        )
        self.assertFalse(ok)

    def test_accepts_png(self):
        ok, reason = validate_homework_file(
            content_type="image/png",
            byte_size=1200,
            filename="work.png",
        )
        self.assertTrue(ok)
        self.assertEqual(reason, "")


@override_settings(MEDIA_ROOT=None)  # will be set in setUp via tempfile if needed
class HomeworkApiTests(TestCase):
    def setUp(self):
        import tempfile
        from django.conf import settings

        self._tmp = tempfile.mkdtemp()
        settings.MEDIA_ROOT = self._tmp

        self.client = APIClient()
        self.user = User.objects.create_user(
            username="hw@example.com",
            email="hw@example.com",
            password="test-pass-123",
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="Sam",
            grade="5th Grade",
            is_onboarded=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_upload_and_analyze(self):
        png = _tiny_png()
        upload = SimpleUploadedFile("worksheet.png", png, content_type="image/png")
        res = self.client.post(
            "/api/learning/homework/",
            {
                "image": upload,
                "subject": "Math Foundations",
                "topic": "Fraction sense",
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        hw_id = res.data["id"]
        self.assertEqual(res.data["status"], "uploaded")

        res2 = self.client.post(
            f"/api/learning/homework/{hw_id}/analyze/",
            {
                "analysis": {
                    "isHomework": True,
                    "problem": "What is 1/2 + 1/4?",
                    "studentWork": "2/6",
                    "errors": ["Added denominators"],
                    "focusSkill": "Adding fractions",
                    "suggestedApproach": "Ask what same-size pieces means",
                    "confidence": 0.8,
                }
            },
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["status"], "analyzed")
        self.assertIn("Added denominators", res2.data["analysis"]["errors"])

        hw = HomeworkUpload.objects.get(pk=hw_id)
        self.assertEqual(hw.student_id, self.student.id)

    def test_reject_non_homework_analysis(self):
        png = _tiny_png()
        upload = SimpleUploadedFile("pic.png", png, content_type="image/png")
        res = self.client.post(
            "/api/learning/homework/",
            {"image": upload},
            format="multipart",
        )
        hw_id = res.data["id"]
        res2 = self.client.post(
            f"/api/learning/homework/{hw_id}/analyze/",
            {"analysis": {"isHomework": False, "notes": "selfie"}},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res2.data.get("code"), "NOT_HOMEWORK")
