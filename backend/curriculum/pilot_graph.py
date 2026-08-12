"""
Pilot skill graph: Fractions → Early Algebra.

Seeded into Skill / SkillPrerequisite / TopicSkillLink and attached to the
demo student's "Math Foundations" subject.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

# (slug, name, short_label, domain, description, standard_codes, sort, p_init, transit, slip, guess)
SKILLS: List[Tuple] = [
    (
        "frac.parts_of_whole",
        "Parts of a whole",
        "Equal parts",
        "fractions",
        "Understand a fraction as equal parts of a whole; name unit fractions.",
        ["CCSS.MATH.CONTENT.3.NF.A.1"],
        10,
        0.25,
        0.14,
        0.08,
        0.2,
    ),
    (
        "frac.numerator_denominator",
        "Numerator & denominator",
        "Num / den",
        "fractions",
        "Read and write fractions; know what numerator and denominator mean.",
        ["CCSS.MATH.CONTENT.3.NF.A.1"],
        20,
        0.22,
        0.13,
        0.08,
        0.18,
    ),
    (
        "frac.number_line",
        "Fractions on a number line",
        "Number line",
        "fractions",
        "Place unit and non-unit fractions on a number line.",
        ["CCSS.MATH.CONTENT.3.NF.A.2"],
        30,
        0.18,
        0.11,
        0.1,
        0.18,
    ),
    (
        "frac.equivalent",
        "Equivalent fractions",
        "Equivalence",
        "fractions",
        "Recognize and generate equivalent fractions with visual models.",
        ["CCSS.MATH.CONTENT.4.NF.A.1"],
        40,
        0.15,
        0.1,
        0.1,
        0.15,
    ),
    (
        "frac.compare",
        "Comparing fractions",
        "Compare",
        "fractions",
        "Compare fractions with like/unlike denominators using reasoning or models.",
        ["CCSS.MATH.CONTENT.4.NF.A.2"],
        50,
        0.12,
        0.1,
        0.1,
        0.15,
    ),
    (
        "frac.add_like",
        "Adding like denominators",
        "Add like",
        "fractions",
        "Add and subtract fractions with the same denominator.",
        ["CCSS.MATH.CONTENT.4.NF.B.3"],
        60,
        0.12,
        0.12,
        0.08,
        0.15,
    ),
    (
        "frac.add_unlike",
        "Adding unlike denominators",
        "Add unlike",
        "fractions",
        "Add fractions with unlike denominators by finding a common denominator.",
        ["CCSS.MATH.CONTENT.5.NF.A.1"],
        70,
        0.1,
        0.09,
        0.12,
        0.12,
    ),
    (
        "alg.variable_as_unknown",
        "Variables as unknowns",
        "Variables",
        "early_algebra",
        "Use a letter to stand for an unknown quantity in a simple situation.",
        ["CCSS.MATH.CONTENT.6.EE.B.6"],
        80,
        0.15,
        0.12,
        0.08,
        0.18,
    ),
    (
        "alg.balance_idea",
        "Balance / equality idea",
        "Balance",
        "early_algebra",
        "Understand that both sides of an equation must stay equal.",
        ["CCSS.MATH.CONTENT.6.EE.B.5"],
        90,
        0.14,
        0.11,
        0.08,
        0.16,
    ),
    (
        "alg.one_step_equation",
        "One-step equations",
        "Solve x",
        "early_algebra",
        "Solve one-step equations with whole numbers (add/subtract/multiply).",
        ["CCSS.MATH.CONTENT.6.EE.B.7"],
        100,
        0.1,
        0.1,
        0.1,
        0.14,
    ),
]

# (skill_slug, prerequisite_slug, strength)
PREREQS: List[Tuple[str, str, str]] = [
    ("frac.numerator_denominator", "frac.parts_of_whole", "required"),
    ("frac.number_line", "frac.parts_of_whole", "required"),
    ("frac.number_line", "frac.numerator_denominator", "recommended"),
    ("frac.equivalent", "frac.numerator_denominator", "required"),
    ("frac.equivalent", "frac.parts_of_whole", "required"),
    ("frac.compare", "frac.equivalent", "required"),
    ("frac.compare", "frac.number_line", "recommended"),
    ("frac.add_like", "frac.numerator_denominator", "required"),
    ("frac.add_like", "frac.parts_of_whole", "required"),
    ("frac.add_unlike", "frac.add_like", "required"),
    ("frac.add_unlike", "frac.equivalent", "required"),
    ("alg.variable_as_unknown", "frac.parts_of_whole", "recommended"),
    ("alg.balance_idea", "alg.variable_as_unknown", "required"),
    ("alg.one_step_equation", "alg.balance_idea", "required"),
    ("alg.one_step_equation", "alg.variable_as_unknown", "required"),
]

PILOT_SUBJECT = "Math Foundations"
PILOT_COLOR = "#FFF4E5"
PILOT_ICON = "target"

# topic_name → list of (skill_slug, weight, is_primary)
TOPIC_SKILLS: Dict[str, List[Tuple[str, float, bool]]] = {
    "Fraction sense": [
        ("frac.parts_of_whole", 1.0, True),
        ("frac.numerator_denominator", 0.85, True),
    ],
    "Fractions on a number line": [
        ("frac.number_line", 1.0, True),
        ("frac.numerator_denominator", 0.5, False),
    ],
    "Equivalent fractions": [
        ("frac.equivalent", 1.0, True),
        ("frac.parts_of_whole", 0.4, False),
    ],
    "Comparing fractions": [
        ("frac.compare", 1.0, True),
        ("frac.equivalent", 0.55, False),
    ],
    "Adding fractions": [
        ("frac.add_like", 0.7, True),
        ("frac.add_unlike", 0.7, True),
    ],
    "Variables & unknowns": [
        ("alg.variable_as_unknown", 1.0, True),
        ("alg.balance_idea", 0.6, False),
    ],
    "Simple equations": [
        ("alg.one_step_equation", 1.0, True),
        ("alg.balance_idea", 0.7, False),
        ("alg.variable_as_unknown", 0.5, False),
    ],
}

PILOT_TOPIC_ORDER: List[str] = list(TOPIC_SKILLS.keys())


def skill_dicts() -> List[Dict[str, Any]]:
    out = []
    for row in SKILLS:
        (
            slug,
            name,
            short,
            domain,
            desc,
            codes,
            sort,
            p_init,
            transit,
            slip,
            guess,
        ) = row
        out.append(
            {
                "slug": slug,
                "name": name,
                "short_label": short,
                "domain": domain,
                "description": desc,
                "standard_codes": codes,
                "sort_order": sort,
                "p_init": p_init,
                "p_transit": transit,
                "p_slip": slip,
                "p_guess": guess,
            }
        )
    return out
