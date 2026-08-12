from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from curriculum.management.commands.seed_kindling import Command as SeedCommand
from curriculum.models import Skill, TopicSkillLink
from learning.mastery_engine import (
    bkt_update,
    build_topic_skill_path,
    update_skills_for_exchange,
)
from learning.models import Correctness, LearningProfile, SkillMastery
from learning.services import (
    apply_exchange_to_profile_model,
    build_personalization_insights,
    get_or_create_profile,
)
from students.models import StudentProfile

User = get_user_model()


class BktMathTests(TestCase):
    def test_correct_increases_p_know(self):
        p0 = 0.3
        p1 = bkt_update(p0, correct=True, p_transit=0.15, p_slip=0.1, p_guess=0.2)
        self.assertGreater(p1, p0)

    def test_incorrect_decreases_p_know(self):
        p0 = 0.6
        p1 = bkt_update(p0, correct=False, p_transit=0.1, p_slip=0.1, p_guess=0.2)
        self.assertLess(p1, p0)


class SkillGraphIntegrationTests(TestCase):
    def setUp(self):
        SeedCommand().handle()
        self.user = User.objects.get(username="student@kindling.edu")
        self.student = StudentProfile.objects.get(user=self.user)
        self.profile = get_or_create_profile(self.student, "maya")

    def test_pilot_skills_seeded(self):
        self.assertGreaterEqual(Skill.objects.filter(is_pilot=True).count(), 8)
        self.assertTrue(
            TopicSkillLink.objects.filter(topic_name="Fraction sense").exists()
        )

    def test_exchange_updates_skill_mastery(self):
        skill = Skill.objects.get(slug="frac.parts_of_whole")
        before = SkillMastery.objects.filter(
            profile=self.profile, skill=skill
        ).first()
        p_before = before.p_know if before else skill.p_init

        updated = update_skills_for_exchange(
            self.profile,
            "Math Foundations",
            "Fraction sense",
            {"correctness": Correctness.CORRECT, "confidence": 0.8},
        )
        self.assertTrue(updated)
        sm = SkillMastery.objects.get(profile=self.profile, skill=skill)
        self.assertGreater(sm.p_know, p_before)
        self.assertGreaterEqual(sm.attempts, 1)

    def test_apply_exchange_hooks_skills(self):
        apply_exchange_to_profile_model(
            self.profile,
            "Math Foundations",
            "Comparing fractions",
            {
                "correctness": Correctness.INCORRECT,
                "confidence": 0.4,
                "engagement": 0.5,
                "affect": "hesitant",
            },
        )
        # Comparing fractions skill should exist after update
        self.assertTrue(
            SkillMastery.objects.filter(
                profile=self.profile, skill__slug="frac.compare"
            ).exists()
        )

    def test_skill_path_api(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.get(
            "/api/learning/skills/path/",
            {"subject": "Math Foundations", "topic": "Equivalent fractions"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["hasGraph"])
        self.assertTrue(len(res.data["skills"]) >= 1)

    def test_catalog_api(self):
        client = APIClient()
        res = client.get("/api/learning/skills/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data["skills"]), 8)

    def test_personalization_includes_skill_path(self):
        update_skills_for_exchange(
            self.profile,
            "Math Foundations",
            "Fraction sense",
            {"correctness": Correctness.CORRECT, "confidence": 0.7},
        )
        # Ensure exchanges > 0 for personalization
        totals = dict(self.profile.totals or {})
        totals["exchanges"] = max(1, totals.get("exchanges") or 0)
        self.profile.totals = totals
        self.profile.save()

        insights = build_personalization_insights(
            self.profile, "Math Foundations", "Fraction sense"
        )
        self.assertIsNotNone(insights["stats"])
        self.assertIsNotNone(insights["stats"].get("skillPath"))
        self.assertTrue(insights["stats"]["skillPath"]["hasGraph"])

    def test_path_builder_without_profile(self):
        path = build_topic_skill_path(None, "Math Foundations", "Simple equations")
        self.assertTrue(path["hasGraph"])
