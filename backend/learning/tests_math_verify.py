from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from learning.math_verify import (
    parse_math_value,
    resolve_graded_correctness,
    strip_math_check_tags,
    verify_math_answer,
)
from learning.models import Correctness


class MathParseTests(TestCase):
    def test_fraction_and_decimal_equiv(self):
        self.assertEqual(parse_math_value("3/4"), parse_math_value("0.75"))
        self.assertEqual(parse_math_value("6/8"), parse_math_value("3/4"))
        self.assertEqual(parse_math_value("1 1/2"), parse_math_value("3/2"))

    def test_percent(self):
        self.assertEqual(parse_math_value("50%"), parse_math_value("1/2"))


class MathVerifyTests(TestCase):
    def test_correct_via_tag(self):
        tutor = 'Nice thinking! ⟦check expected="3/4" alts="0.75|6/8" result="correct"⟧'
        v = verify_math_answer("I think it is 6/8", tutor_text=tutor)
        self.assertTrue(v["checked"])
        self.assertEqual(v["correctness"], "correct")
        self.assertEqual(v["method"], "rational_equiv")

    def test_incorrect_overrides_tutor_correct_claim(self):
        tutor = 'Yes that looks right! ⟦check expected="3/4" result="correct"⟧'
        v = verify_math_answer("The answer is 2/3", tutor_text=tutor)
        self.assertTrue(v["checked"])
        self.assertEqual(v["correctness"], "incorrect")
        self.assertTrue(v["discrepancy"])

    def test_prefer_checker_in_resolve(self):
        v = verify_math_answer(
            "3/4",
            expected="3/4",
            tutor_text='Not quite. ⟦check expected="3/4" result="incorrect"⟧',
        )
        graded = resolve_graded_correctness(Correctness.INCORRECT, v)
        self.assertEqual(graded["source"], "math_verifier")
        self.assertEqual(graded["correctness"], "correct")
        self.assertTrue(v["discrepancy"])

    def test_strip_tags(self):
        text = 'Great work!\n⟦check expected="1/2" result="correct"⟧'
        self.assertNotIn("⟦", strip_math_check_tags(text))
        self.assertIn("Great work", strip_math_check_tags(text))

    def test_no_expected_not_checked(self):
        v = verify_math_answer("maybe 3", tutor_text="Keep thinking!")
        self.assertFalse(v["checked"])


class MathVerifyApiTests(TestCase):
    def test_verify_endpoint(self):
        client = APIClient()
        res = client.post(
            "/api/learning/verify-math/",
            {
                "studentText": "The answer is 3/4",
                "tutorText": 'Perfect! ⟦check expected="3/4" result="correct"⟧',
                "linguistic": "correct",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["verification"]["checked"])
        self.assertEqual(res.data["verification"]["correctness"], "correct")
        self.assertEqual(res.data["graded"]["source"], "math_verifier")
