"""Epic B6 — multi-step problems seed + API."""

from django.test import TestCase
from rest_framework.test import APIClient

from curriculum.models import MultiStepProblem, Skill
from curriculum.multistep_data import MULTI_STEP_PROBLEMS
from learning.multistep_service import list_multistep_problems, pick_multistep_problem


class MultiStepProblemTests(TestCase):
    def setUp(self):
        for slug in {r.get("skill_slug") for r in MULTI_STEP_PROBLEMS}:
            if not slug:
                continue
            Skill.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": slug,
                    "short_label": slug.split(".")[-1],
                    "domain": "fractions" if slug.startswith("frac") else "early_algebra",
                    "is_pilot": True,
                },
            )
        for row in MULTI_STEP_PROBLEMS:
            skill = Skill.objects.filter(slug=row.get("skill_slug")).first()
            MultiStepProblem.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "skill": skill,
                    "title": row["title"],
                    "prompt": row["prompt"],
                    "subject_name": row.get("subject_name") or "",
                    "topic_names": row.get("topic_names") or [],
                    "steps": row.get("steps") or [],
                    "final_expected": row.get("final_expected") or "",
                    "final_alts": row.get("final_alts") or [],
                    "sort_order": row.get("sort_order") or 0,
                    "is_active": True,
                },
            )
        self.client = APIClient()

    def test_catalog_has_add_unlike(self):
        self.assertGreaterEqual(MultiStepProblem.objects.count(), 2)
        rows = list_multistep_problems(topic="Adding fractions")
        self.assertTrue(rows)
        self.assertTrue(any(r["skillSlug"] == "frac.add_unlike" for r in rows))
        best = pick_multistep_problem(topic="Adding fractions")
        self.assertIsNotNone(best)
        self.assertGreaterEqual(len(best["steps"]), 3)

    def test_api_list(self):
        res = self.client.get(
            "/api/learning/multistep/",
            {"subject": "Math Foundations", "topic": "Adding fractions"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data.get("count", 0), 1)
        self.assertTrue(data.get("best") or data.get("problems"))

    def test_simple_equations_problem(self):
        best = pick_multistep_problem(topic="Simple equations")
        self.assertIsNotNone(best)
        self.assertEqual(best["skillSlug"], "alg.one_step_equation")
