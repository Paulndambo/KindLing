from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from learning.conversation_service import (
    append_message,
    list_continuable,
    search_transcripts,
    update_resume_snapshot,
)
from learning.models import ConversationStatus, TopicConversation
from students.models import StudentProfile

User = get_user_model()


class ResumeApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="resume@example.com",
            email="resume@example.com",
            password="test-pass-123",
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="Riley",
            grade="5th Grade",
            is_onboarded=True,
        )
        self.client.force_authenticate(user=self.user)

        self.conv = TopicConversation.objects.create(
            client_id="conv_test_resume_1",
            student=self.student,
            subject="Math Foundations",
            topic="Fraction sense",
            topic_key="Math Foundations::Fraction sense",
            status=ConversationStatus.ACTIVE,
            started_at=timezone.now(),
            message_count=0,
        )
        append_message(
            conv=self.conv,
            message={
                "id": "msg_1",
                "role": "tutor",
                "text": "Let's explore equal parts of a whole.",
                "at": timezone.now().isoformat(),
            },
        )
        append_message(
            conv=self.conv,
            message={
                "id": "msg_2",
                "role": "child",
                "text": "Like cutting a pizza into 4 equal slices?",
                "at": timezone.now().isoformat(),
            },
            api_pair={
                "user": "Like cutting a pizza into 4 equal slices?",
                "model": "Yes — that's a unit fraction idea!",
            },
        )
        self.conv.refresh_from_db()

    def test_preview_text_updated(self):
        self.assertIn("pizza", (self.conv.preview_text or "").lower())

    def test_continue_list(self):
        items = list_continuable(self.student)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["topic"], "Fraction sense")
        self.assertTrue(items[0]["canContinue"])

        res = self.client.get("/api/learning/conversations/continue/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_search_transcripts(self):
        hits = search_transcripts(self.student, "pizza")
        self.assertGreaterEqual(len(hits), 1)
        self.assertIn("pizza", hits[0]["snippet"].lower())

        res = self.client.get(
            "/api/learning/conversations/search/", {"q": "equal parts"}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data["count"], 1)

    def test_search_too_short(self):
        res = self.client.get("/api/learning/conversations/search/", {"q": "a"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resume_snapshot(self):
        update_resume_snapshot(
            self.conv,
            {
                "intervention": {
                    "status": "active",
                    "reason": "incorrect_streak",
                    "context": {"topic": "Fraction sense"},
                },
                "tools": {"visuals": True},
            },
        )
        self.conv.refresh_from_db()
        self.assertEqual(
            self.conv.resume_snapshot.get("intervention", {}).get("status"),
            "active",
        )

        res = self.client.put(
            f"/api/learning/conversations/{self.conv.client_id}/resume/",
            {
                "intervention": {"status": "offered", "reason": "resume"},
                "tools": {"encourage": True},
                "subject": "Math Foundations",
                "topic": "Fraction sense",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res.data["resumeSnapshot"]["intervention"]["status"], "offered"
        )
