"""Epic B5 — misconception catalog, detection, remediation mastery boost."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from curriculum.misconceptions_data import MISCONCEPTIONS
from curriculum.models import MisconceptionDef, Skill
from learning.misconception_service import (
    detect_misconceptions_text,
    list_misconception_defs,
    playbook_prompt_block,
)
from learning.models import LearningProfile, Misconception, SkillMastery
from learning.mastery_engine import apply_remediation_boost
from students.models import StudentProfile

User = get_user_model()


class MisconceptionEngineTests(TestCase):
    def setUp(self):
        for slug in {r.get("skill_slug") for r in MISCONCEPTIONS if r.get("skill_slug")}:
            Skill.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": slug,
                    "short_label": slug.split(".")[-1],
                    "domain": "fractions" if str(slug).startswith("frac") else "early_algebra",
                    "is_pilot": True,
                },
            )
        for row in MISCONCEPTIONS:
            skill = Skill.objects.filter(slug=row.get("skill_slug")).first()
            MisconceptionDef.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "label": row["label"],
                    "domain": row.get("domain") or "general",
                    "description": row.get("description") or "",
                    "skill": skill,
                    "topic_names": row.get("topic_names") or [],
                    "student_cues": row.get("student_cues") or [],
                    "patterns": row.get("patterns") or [],
                    "playbook": row.get("playbook") or {},
                    "related_example_slug": row.get("related_example_slug") or "",
                    "related_counter_slug": row.get("related_counter_slug") or "",
                    "sort_order": row.get("sort_order") or 0,
                    "is_active": True,
                },
            )
        self.client = APIClient()

    def test_catalog_seeded_size(self):
        self.assertGreaterEqual(MisconceptionDef.objects.count(), 6)
        defs = list_misconception_defs(topic="Adding fractions")
        self.assertTrue(any(d["id"] == "adds_denominators" for d in defs))

    def test_detect_adds_denominators(self):
        hits = detect_misconceptions_text(
            "I added the denominators to get the answer",
            "Not quite",
            topic="Adding fractions",
        )
        ids = {h["id"] for h in hits}
        self.assertIn("adds_denominators", ids)
        hit = next(h for h in hits if h["id"] == "adds_denominators")
        self.assertTrue(hit.get("playbook", {}).get("steps"))
        block = playbook_prompt_block(hits)
        self.assertIn("REMEDIATION PLAYBOOK", block)

    def test_detect_bigger_bottom(self):
        hits = detect_misconceptions_text(
            "1/8 is bigger because bigger bottom means bigger fraction",
            "",
            topic="Comparing fractions",
        )
        self.assertTrue(any(h["id"] == "bigger_bottom_bigger" for h in hits))

    def test_api_list_and_detect(self):
        res = self.client.get(
            "/api/learning/misconceptions/",
            {"topic": "Equivalent fractions"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data.get("count", 0), 1)

        res2 = self.client.post(
            "/api/learning/misconceptions/",
            {
                "studentText": "I added the same number to top and bottom so 1/2 = 2/3",
                "tutorText": "Hmm",
                "topic": "Equivalent fractions",
            },
            format="json",
        )
        self.assertEqual(res2.status_code, 200)
        body = res2.json()
        self.assertGreaterEqual(body.get("count", 0), 1)
        self.assertIn("promptBlock", body)

    def test_remediation_boost(self):
        user = User.objects.create_user(username="b5u", password="x")
        student = StudentProfile.objects.create(user=user, name="B5", grade="4")
        profile = LearningProfile.objects.create(
            student=student, client_student_id="b5"
        )
        skill = Skill.objects.get(slug="frac.add_like")
        sm = SkillMastery.objects.create(
            profile=profile,
            skill=skill,
            p_know=0.3,
            score=30,
            attempts=2,
        )
        before = sm.p_know
        apply_remediation_boost(profile, "frac.add_like")
        sm.refresh_from_db()
        self.assertGreater(sm.p_know, before)

        mc = Misconception.objects.create(
            profile=profile,
            misconception_id="adds_denominators",
            label="Adding denominators",
            count=2,
            is_active=True,
            skill_slug="frac.add_like",
        )
        mc.remediation_success_count = 1
        mc.is_active = False
        mc.last_remediated_at = timezone.now()
        mc.save()
        mc.refresh_from_db()
        self.assertFalse(mc.is_active)
        self.assertEqual(mc.remediation_success_count, 1)
