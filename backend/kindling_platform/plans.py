"""
Canonical plan catalog shared by serializers and views.

Mirrors frontend/src/constants/subscription.js — keep keys aligned.
Commercial thesis: MONEY.md — algorithm rent + token envelope / BYOK.
"""

from __future__ import annotations

from typing import Any, Dict

from .models import PlanId

PLAN_CATALOG: Dict[str, Dict[str, Any]] = {
    PlanId.SPARK: {
        "id": PlanId.SPARK,
        "name": "Spark",
        "tagline": "Free access to Kindling's adaptive tutor",
        "priceMonthly": 0,
        "priceYearly": 0,
        "highlight": False,
        "features": [
            "Kindling's adaptive teaching system, free",
            "Live adaptive lessons (daily platform-AI request and usage cap)",
            "Student dashboard & mastery pulse",
            "Bring your own AI keys for additional providers",
        ],
        "entitlements": {
            "platformAi": True,
            "byok": True,
            "multiProvider": False,
            "advancedRouting": False,
            "familyDigest": False,
            "prioritySupport": False,
            "dailyLessonSoftCap": 4,
            "dailyPlatformAiRequests": 250,
            "dailyPlatformAiTokens": 1000000,
        },
    },
    PlanId.PREMIUM: {
        "id": PlanId.PREMIUM,
        "name": "Premium",
        "tagline": "More AI and advanced learning tools",
        "priceMonthly": 25,
        "priceYearly": 250,
        "highlight": True,
        "features": [
            "Everything in the teaching system",
            "Platform AI included (daily request and usage cap)",
            "Homework photo help · guardian digests",
            "BYOK optional · priority support",
        ],
        "entitlements": {
            "platformAi": True,
            "byok": True,
            "multiProvider": True,
            "advancedRouting": True,
            "familyDigest": True,
            "prioritySupport": True,
            "dailyLessonSoftCap": None,
            "dailyPlatformAiRequests": 500,
            "dailyPlatformAiTokens": 2000000,
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
