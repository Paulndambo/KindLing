"""
Canonical plan catalog shared by serializers and views.

Mirrors frontend/src/constants/subscription.js — keep keys aligned.
"""

from __future__ import annotations

from typing import Any, Dict

from .models import PlanId

PLAN_CATALOG: Dict[str, Dict[str, Any]] = {
    PlanId.SPARK: {
        "id": PlanId.SPARK,
        "name": "Spark",
        "tagline": "Start learning with Kindling's tutor",
        "priceMonthly": 0,
        "priceYearly": 0,
        "highlight": False,
        "features": [
            "Live adaptive lessons",
            "Student dashboard & mastery pulse",
            "Platform AI (Gemini) when configured",
            "Optional personal API keys (BYOK)",
        ],
        "entitlements": {
            "platformAi": True,
            "byok": True,
            "multiProvider": False,
            "advancedRouting": False,
            "familyDigest": False,
            "prioritySupport": False,
            "dailyLessonSoftCap": 20,
        },
    },
    PlanId.EMBER: {
        "id": PlanId.EMBER,
        "name": "Ember",
        "tagline": "Daily tutoring for one learner",
        "priceMonthly": 19,
        "priceYearly": 190,
        "highlight": True,
        "features": [
            "Everything in Spark",
            "Generous daily lessons on platform AI",
            "Homework photo help",
            "Priority session continuity",
            "Optional weekly progress note to a guardian email",
        ],
        "entitlements": {
            "platformAi": True,
            "byok": True,
            "multiProvider": True,
            "advancedRouting": False,
            "familyDigest": True,
            "prioritySupport": False,
            "dailyLessonSoftCap": None,
        },
    },
    PlanId.FORGE: {
        "id": PlanId.FORGE,
        "name": "Forge",
        "tagline": "Builder mode — bring your own AI keys",
        "priceMonthly": 9,
        "priceYearly": 90,
        "highlight": False,
        "features": [
            "Everything in Ember",
            "Full multi-provider BYOK (Gemini, OpenAI, Anthropic, Groq, OpenRouter)",
            "Per-task model routing (chat / vision / TTS)",
            "Hot-switch providers without restarting lessons",
            "Designed for power users & pilots",
        ],
        "entitlements": {
            "platformAi": True,
            "byok": True,
            "multiProvider": True,
            "advancedRouting": True,
            "familyDigest": True,
            "prioritySupport": True,
            "dailyLessonSoftCap": None,
        },
    },
}


def plan_entitlements(plan_id: str, override: dict | None = None) -> dict:
    base = dict(PLAN_CATALOG.get(plan_id, PLAN_CATALOG[PlanId.SPARK])["entitlements"])
    if override:
        base.update({k: v for k, v in override.items() if v is not None})
    return base


def serialize_plan(plan_id: str) -> dict:
    return dict(PLAN_CATALOG.get(plan_id, PLAN_CATALOG[PlanId.SPARK]))
