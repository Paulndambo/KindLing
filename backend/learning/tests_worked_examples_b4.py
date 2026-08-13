"""Epic B4 — worked-example library seed + API."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from curriculum.models import Skill, WorkedExample
from curriculum.worked_examples_data import WORKED_EXAMPLES
from learning.worked_example_service import (
    find_best_worked_example,
    find_worked_examples,
    library_prompt_block,
)
from students.models import StudentProfile

User = get_user_model()


class WorkedExampleLibraryTests(TestCase):
    def setUp(self):
        # Minimal skills referenced by catalog
        for slug in {
            row["skill_slug"] for row in WORKED_EXAMPLES
        }:
            Skill.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": slug,
                    "short_label": slug.split(".")[-1],
                    "domain": "fractions" if slug.startswith("frac") else "early_algebra",
                    "is_pilot": True,
                },
            )
        for row in WORKED_EXAMPLES:
            skill = Skill.objects.get(slug=row["skill_slug"])
            WorkedExample.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "skill": skill,
                    "title": row["title"],
                    "summary": row.get("summary") or "",
                    "problem": row["problem"],
                    "steps": row.get("steps") or [],
                    "takeaway": row.get("takeaway") or "",
                    "counterexample": row.get("counterexample") or "",
                    "kind": row.get("kind") or "example",
                    "subject_name": row.get("subject_name") or "",
                    "topic_names": row.get("topic_names") or [],
                    "grade_min": row.get("grade_min", 0),
                    "grade_max": row.get("grade_max", 12),
                    "sort_order": row.get("sort_order", 0),
                    "is_active": True,
                },
            )
        self.client = APIClient()

    def test_catalog_covers_pilot_skills(self):
        skill_slugs = set(
            WorkedExample.objects.values_list("skill__slug", flat=True)
        )
        # Every pilot skill that appears in data should have ≥1 row
        for slug in {r["skill_slug"] for r in WORKED_EXAMPLES}:
            self.assertIn(slug, skill_slugs)
        self.assertGreaterEqual(WorkedExample.objects.count(), 12)
        self.assertTrue(
            WorkedExample.objects.filter(kind="counterexample").exists()
        )

    def test_find_best_for_fraction_sense(self):
        best = find_best_worked_example(
            subject="Math Foundations",
            topic="Fraction sense",
            grade=4,
        )
        self.assertIsNotNone(best)
        self.assertEqual(best["source"], "library")
        self.assertTrue(best["steps"])
        self.assertIn("fraction", (best["problem"] + best["title"]).lower())

    def test_grade_band_prefers_age_fit(self):
        # Algebra examples are grade 5+; young grade should still get fractions
        young = find_worked_examples(
            subject="Math Foundations",
            topic="Fraction sense",
            grade=3,
            kind="example",
            limit=5,
        )
        self.assertTrue(young)
        for ex in young:
            self.assertLessEqual(ex["gradeMin"], 3)
            self.assertGreaterEqual(ex["gradeMax"], 3)

    def test_api_list(self):
        res = self.client.get(
            "/api/learning/worked-examples/",
            {
                "subject": "Math Foundations",
                "topic": "Equivalent fractions",
                "grade": "4",
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("examples") or data.get("best"))
        self.assertIn("promptBlock", data)
        if data.get("best"):
            self.assertEqual(data["best"]["source"], "library")
            block = library_prompt_block([data["best"]])
            self.assertIn("CURATED WORKED-EXAMPLE LIBRARY", block)
            self.assertIn(data["best"]["title"], block)

    def test_counterexample_filter(self):
        res = self.client.get(
            "/api/learning/worked-examples/",
            {
                "subject": "Math Foundations",
                "topic": "Comparing fractions",
                "kind": "counterexample",
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        for ex in data.get("examples") or []:
            self.assertEqual(ex["kind"], "counterexample")
