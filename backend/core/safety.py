"""
Server-side child safety helpers (mirror of frontend safety floor).

Used for policy notes, distress classification of reported events,
and privacy documentation alignment — not a clinical tool.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Literal, Optional

AgeBand = Literal["child", "teen", "adult", "unknown"]
DistressSeverity = Literal["none", "low", "high"]


def resolve_age_band(grade: Optional[str]) -> AgeBand:
    if not grade or not isinstance(grade, str):
        return "unknown"
    g = grade.lower().strip()

    if any(
        x in g
        for x in (
            "college",
            "university",
            "graduate",
            "master",
            "doctoral",
            "phd",
            "professional",
            "continuing",
            "undergrad",
        )
    ):
        return "adult"

    if "high school" in g or "a-level" in g or "gcse" in g:
        return "teen"

    m = re.search(r"\b(1[0-2]|[3-9])(st|nd|rd|th)?\b", g)
    if m:
        n = int(m.group(1))
        if 3 <= n <= 6:
            return "child"
        if 7 <= n <= 12:
            return "teen"

    if any(x in g for x in ("3rd", "4th", "5th", "6th")):
        return "child"
    if any(x in g for x in ("7th", "8th", "9–10", "9-10", "11–12", "11-12")):
        return "teen"

    if "elementary" in g or "primary" in g:
        return "child"
    if "middle school" in g or "junior high" in g:
        return "teen"

    return "unknown"


def use_child_safe_defaults(band: AgeBand) -> bool:
    return band in ("child", "unknown")


def age_band_label(band: AgeBand) -> str:
    return {
        "child": "younger learner",
        "teen": "teen learner",
        "adult": "adult learner",
        "unknown": "learner",
    }.get(band, "learner")


HIGH_PATTERNS = [
    (
        "suicide",
        "SUICIDE_IDEATION",
        re.compile(
            r"\b(kill\s+my\s*self|want\s+to\s+die|end\s+my\s+life|suicid(e|al)|better\s+off\s+dead)\b",
            re.I,
        ),
    ),
    (
        "self_harm",
        "SELF_HARM",
        re.compile(
            r"\b(self[-\s]?harm|cut\s+myself|hurt\s+myself)\b",
            re.I,
        ),
    ),
    (
        "abuse",
        "ABUSE_DISCLOSURE",
        re.compile(
            r"\b(i\s+(am|'m)\s+being\s+(abused|hurt)|someone\s+(is\s+)?(hurting|abusing)\s+me)\b",
            re.I,
        ),
    ),
]


def detect_distress(text: str) -> Dict[str, Any]:
    raw = (text or "").strip()
    if len(raw) < 4:
        return {"severity": "none", "category": "none", "code": ""}
    for category, code, pattern in HIGH_PATTERNS:
        if pattern.search(raw):
            return {"severity": "high", "category": category, "code": code}
    return {"severity": "none", "category": "none", "code": ""}


def policy_notes_for_grade(grade: Optional[str]) -> Dict[str, Any]:
    band = resolve_age_band(grade)
    return {
        "age_band": band,
        "label": age_band_label(band),
        "child_safe_defaults": use_child_safe_defaults(band),
        "rules": [
            "educational_tutor_only",
            "no_sexual_content",
            "no_self_harm_instructions",
            "no_weapons_or_illegal_how_to",
            "distress_escalate_to_trusted_adult",
            "no_shame",
        ],
        "notes": (
            "Strictest child-safe tone when age band is child or unknown."
            if use_child_safe_defaults(band)
            else "Age-calibrated safety policies apply."
        ),
    }
