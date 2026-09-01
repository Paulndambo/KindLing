"""Epic C1 — spaced review / Review spark."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from curriculum.models import Skill, TopicSkillLink
from learning.models import (
    LearningEventType,
    LearningProfile,
    SkillMastery,
    SkillReviewItem,
)
from learning.review_service import (
    complete_review,
    list_due_reviews,
    schedule_reviews_for_profile,
    select_review_candidates,
)
from students.models import StudentProfile

User = get_user_model()


class ReviewServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="c1_user", password="test-pass-c1", email="c1@test.edu"
        )
        self.student = StudentProfile.objects.create(
            user=self.user, name="C1 Kid", grade="5"
        )
        self.profile = LearningProfile.objects.create(
            student=self.student, client_student_id="c1_kid"
        )
        self.skill, _ = Skill.objects.get_or_create(
            slug="frac.equiv",
            defaults={
                "name": "Equivalent fractions",
                "short_label": "Equiv. fractions",
                "domain": "fractions",
                "is_pilot": True,
                "sort_order": 10,
            },
        )
        TopicSkillLink.objects.get_or_create(
            subject_name="Math Foundations",
            topic_name="Equivalent fractions",
            skill=self.skill,
            defaults={"is_primary": True, "weight": 1.0},
        )
        self.sm = SkillMastery.objects.create(
            profile=self.profile,
            skill=self.skill,
            p_know=0.35,
            score=35,
            attempts=5,
            correct=1,
            incorrect=4,
            consecutive_incorrect=2,
            state=SkillMastery.State.LEARNING,
            last_evidence_at=timezone.now() - timedelta(days=1),
            last_correctness="incorrect",
        )

    def test_event_types(self):
        self.assertEqual(LearningEventType.REVIEW_STARTED, "review.started")
        self.assertEqual(LearningEventType.REVIEW_COMPLETED, "review.completed")

    def test_select_candidates_weak_and_streak(self):
        cands = select_review_candidates(self.profile)
        self.assertTrue(cands)
        slugs = [c["skill"].slug for c in cands]
        self.assertIn("frac.equiv", slugs)
        reasons = cands[0]["reasons"]
        self.assertTrue(
            any(r in reasons for r in ("weak", "streak", "recent_struggle"))
        )

    def test_schedule_and_list_due(self):
        result = schedule_reviews_for_profile(self.profile, dry_run=False)
        self.assertTrue(result["ok"])
        self.assertGreaterEqual(result["created"] + result["updated"], 1)
        due = list_due_reviews(self.profile, refresh=False)
        self.assertTrue(any(d["skillSlug"] == "frac.equiv" and d["isDue"] for d in due))
        item = SkillReviewItem.objects.get(profile=self.profile, skill=self.skill)
        self.assertEqual(item.subject_name, "Math Foundations")

    def test_complete_success_pushes_due_out(self):
        schedule_reviews_for_profile(self.profile, dry_run=False)
        before = SkillReviewItem.objects.get(profile=self.profile, skill=self.skill)
        r = complete_review(
            self.profile, skill_slug="frac.equiv", outcome="success"
        )
        self.assertTrue(r["ok"])
        before.refresh_from_db()
        self.assertGreater(before.due_at, timezone.now())
        self.assertEqual(before.last_outcome, "success")
        self.assertGreaterEqual(before.repetitions, 1)

    def test_complete_fail_sooner_interval(self):
        schedule_reviews_for_profile(self.profile, dry_run=False)
        r = complete_review(self.profile, skill_slug="frac.equiv", outcome="fail")
        self.assertTrue(r["ok"])
        item = SkillReviewItem.objects.get(profile=self.profile, skill=self.skill)
        self.assertEqual(item.interval_days, 1.0)
        self.assertEqual(item.last_outcome, "fail")


class ReviewApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="c1_api", password="test-pass-c1", email="c1api@test.edu"
        )
        self.student = StudentProfile.objects.create(
            user=self.user, name="API Kid", grade="4"
        )
        self.profile = LearningProfile.objects.create(
            student=self.student, client_student_id="c1_api"
        )
        self.skill, _ = Skill.objects.get_or_create(
            slug="frac.sense",
            defaults={
                "name": "Fraction sense",
                "short_label": "Fraction sense",
                "domain": "fractions",
                "is_pilot": True,
                "sort_order": 1,
            },
        )
        TopicSkillLink.objects.get_or_create(
            subject_name="Math Foundations",
            topic_name="Fraction sense",
            skill=self.skill,
            defaults={"is_primary": True},
        )
        SkillMastery.objects.create(
            profile=self.profile,
            skill=self.skill,
            p_know=0.3,
            score=30,
            attempts=4,
            incorrect=3,
            consecutive_incorrect=2,
            state=SkillMastery.State.LEARNING,
            last_evidence_at=timezone.now(),
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_reviews(self):
        res = self.client.get("/api/learning/reviews/")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertIn("due", body)
        self.assertTrue(body.get("hasDue") or body.get("count", 0) >= 0)
        slugs = [d.get("skillSlug") for d in body.get("due") or []]
        self.assertIn("frac.sense", slugs)

    def test_complete_review_api(self):
        self.client.get("/api/learning/reviews/")
        res = self.client.post(
            "/api/learning/reviews/complete/",
            {"skillSlug": "frac.sense", "outcome": "success"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.json().get("ok"))

    def test_dashboard_includes_review_sparks(self):
        res = self.client.get("/api/learning/dashboard/")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertIn("reviewSparks", body)
