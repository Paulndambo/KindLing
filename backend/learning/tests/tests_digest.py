"""Epic A5 — parent digest service + API."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.jobs import run_job
from core.models import JobRun
from learning.digest_service import (
    build_digest_summary,
    deliver_digest,
    generate_digest_for_student,
    render_digest_copy,
    run_weekly_digests,
    week_window,
)
from learning.models import (
    LearningEvent,
    LearningEventType,
    LessonSession,
    ParentDigest,
)
from students.models import StudentProfile

User = get_user_model()


class DigestCopyTests(TestCase):
    def test_inactive_week_is_gentle(self):
        summary = {
            "studentName": "Maya",
            "sessions": 0,
            "exchanges": 0,
            "active": False,
            "timeOnTaskLabel": "0m",
        }
        headline, body, html = render_digest_copy(summary)
        self.assertIn("ready", headline.lower())
        self.assertIn("okay", body.lower())
        # No shame language
        for banned in ("failed", "behind", "poor", "lazy", "struggling child"):
            self.assertNotIn(banned, body.lower())
            self.assertNotIn(banned, html.lower())

    def test_active_week_celebrates_effort(self):
        summary = {
            "studentName": "Maya",
            "sessions": 3,
            "exchanges": 12,
            "active": True,
            "timeOnTaskLabel": "42m",
            "accuracy": 0.67,
            "strengths": [{"topic": "Fraction sense", "score": 72}],
            "focusAreas": [{"topic": "Equivalent fractions", "score": 40}],
            "interventionsEntered": 1,
            "topTopics": [{"topic": "Fraction sense"}],
            "skillSparks": [],
        }
        headline, body, _ = render_digest_copy(summary)
        self.assertIn("Maya", headline)
        self.assertIn("rhythm", headline.lower())
        self.assertIn("persistence", body.lower())
        self.assertIn("not red flags", body.lower())


class DigestServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="parent@example.com",
            email="parent@example.com",
            password="test-pass-123",
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="Maya",
            grade="5th Grade",
            is_onboarded=True,
            digest_opt_in=True,
            family_email="family@example.com",
        )
        start, end = week_window()
        self.start, self.end = start, end
        LessonSession.objects.create(
            student=self.student,
            session_id="sess-digest-1",
            subject="Math Foundations",
            topic="Fraction sense",
            started_at=timezone.now() - timedelta(days=1),
            duration_ms=15 * 60 * 1000,
            turn_count=5,
        )
        LearningEvent.objects.create(
            student=self.student,
            client_event_id="digest-evt-turn-1",
            event_type=LearningEventType.TURN_EXCHANGE,
            context={"subject": "Math Foundations", "topic": "Fraction sense"},
            payload={
                "signals": {"correctness": "correct", "confidence": 0.7},
            },
            timestamp=timezone.now() - timedelta(hours=2),
        )
        LearningEvent.objects.create(
            student=self.student,
            client_event_id="digest-evt-int-1",
            event_type=LearningEventType.INTERVENTION_ENTERED,
            context={"subject": "Math Foundations", "topic": "Fraction sense"},
            payload={},
            timestamp=timezone.now() - timedelta(hours=1),
        )

    def test_week_window_stable_same_day(self):
        a1, b1 = week_window()
        a2, b2 = week_window()
        self.assertEqual(a1, a2)
        self.assertEqual(b1, b2)

    def test_build_summary_from_events(self):
        summary = build_digest_summary(self.student, self.start, self.end)
        self.assertTrue(summary["active"])
        self.assertGreaterEqual(summary["sessions"], 1)
        self.assertGreaterEqual(summary["exchanges"], 1)
        self.assertEqual(summary["interventionsEntered"], 1)
        self.assertEqual(summary["correct"], 1)

    def test_generate_and_deliver_console(self):
        digest = generate_digest_for_student(
            self.student, period_start=self.start, period_end=self.end
        )
        self.assertEqual(digest.status, ParentDigest.Status.DRAFT)
        self.assertIn("Maya", digest.headline)
        delivered = deliver_digest(digest, dry_run=False)
        self.assertEqual(delivered.status, ParentDigest.Status.SENT)
        self.assertIn(
            delivered.channel,
            (
                ParentDigest.Channel.CONSOLE,
                ParentDigest.Channel.EMAIL,
                ParentDigest.Channel.IN_APP,
            ),
        )
        self.assertEqual(delivered.recipient_email, "family@example.com")
        # Console backend should still put a message in outbox
        self.assertGreaterEqual(len(mail.outbox), 0)

    def test_opt_out_skips_real_delivery(self):
        self.student.digest_opt_in = False
        self.student.save(update_fields=["digest_opt_in"])
        digest = generate_digest_for_student(
            self.student, period_start=self.start, period_end=self.end
        )
        delivered = deliver_digest(digest, dry_run=False)
        self.assertEqual(delivered.status, ParentDigest.Status.SKIPPED)

    def test_idempotent_generate(self):
        d1 = generate_digest_for_student(
            self.student, period_start=self.start, period_end=self.end
        )
        d2 = generate_digest_for_student(
            self.student, period_start=self.start, period_end=self.end
        )
        self.assertEqual(d1.pk, d2.pk)
        self.assertEqual(
            ParentDigest.objects.filter(
                student=self.student,
                period_start=self.start,
                period_end=self.end,
            ).count(),
            1,
        )

    def test_weekly_job_opted_in(self):
        result = run_weekly_digests(dry_run=True)
        self.assertTrue(result["ok"])
        self.assertGreaterEqual(result["generated"], 1)
        self.assertGreaterEqual(result["sent"], 1)

    def test_job_registry_weekly_digest(self):
        run = run_job("weekly_digest", dry_run=True, trigger="test")
        self.assertEqual(run.status, JobRun.Status.SUCCESS)
        self.assertTrue(run.result.get("ok"))
        self.assertEqual(run.result.get("job"), "weekly_digest")


class DigestApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="api-digest@example.com",
            email="api-digest@example.com",
            password="test-pass-123",
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="Sam",
            grade="4th Grade",
            is_onboarded=True,
            digest_opt_in=False,
        )
        self.client.force_authenticate(user=self.user)

    def test_list_empty(self):
        res = self.client.get("/api/learning/digests/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)
        self.assertFalse(res.data["digestOptIn"])

    def test_generate_preview(self):
        res = self.client.post(
            "/api/learning/digests/generate/",
            {"deliver": True, "dryRun": True, "forcePreview": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["ok"])
        digest = res.data["digest"]
        self.assertIn("Sam", digest["headline"])
        self.assertEqual(digest["status"], "sent")

        listed = self.client.get("/api/learning/digests/")
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(listed.data["count"], 1)

    def test_detail(self):
        gen = self.client.post(
            "/api/learning/digests/generate/",
            {"deliver": True, "dryRun": True},
            format="json",
        )
        pk = gen.data["digest"]["id"]
        res = self.client.get(f"/api/learning/digests/{pk}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id"], pk)

    def test_profile_digest_fields(self):
        res = self.client.patch(
            "/api/students/me/",
            {"digestOptIn": True, "familyEmail": "caregiver@example.com"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["digestOptIn"])
        self.assertEqual(res.data["familyEmail"], "caregiver@example.com")
        self.student.refresh_from_db()
        self.assertTrue(self.student.digest_opt_in)
        self.assertEqual(self.student.family_email, "caregiver@example.com")


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class DigestEmailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="mail@example.com",
            email="mail@example.com",
            password="test-pass-123",
        )
        self.student = StudentProfile.objects.create(
            user=self.user,
            name="Alex",
            is_onboarded=True,
            digest_opt_in=True,
            family_email="caregiver@example.com",
        )

    def test_email_sent(self):
        digest = generate_digest_for_student(self.student, force=True)
        deliver_digest(digest, dry_run=False)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Alex", mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ["caregiver@example.com"])
        self.assertEqual(digest.status, ParentDigest.Status.SENT)
        self.assertEqual(digest.channel, ParentDigest.Channel.EMAIL)
