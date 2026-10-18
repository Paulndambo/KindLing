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
        "tagline": "30-day trial of Kindling's adaptive tutor",
        "priceMonthly": 0,
        "priceYearly": 0,
        "highlight": False,
        "trialDays": 30,
        "features": [
            "Full teaching system for 30 days",
            "Live adaptive lessons (daily platform-AI request and usage cap)",
            "Student dashboard & mastery pulse",
            "Then choose Forge or Ember to continue",
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
    PlanId.FORGE: {
        "id": PlanId.FORGE,
        "name": "Forge",
        "tagline": "Rent the algorithm — bring your own AI keys",
        "priceMonthly": 30,
        "priceYearly": 300,
        "highlight": False,
        "features": [
            "Kindling teaching system (algorithm rent)",
            "You pay AI tokens via your own keys (BYOK)",
            "Multi-provider routing (Gemini, OpenAI, Anthropic, Groq, OpenRouter)",
            "Per-task model routing · homework photo · digests",
        ],
        "entitlements": {
            "platformAi": False,
            "byok": True,
            "multiProvider": True,
            "advancedRouting": True,
            "familyDigest": True,
            "prioritySupport": False,
            "dailyLessonSoftCap": None,
            "dailyPlatformAiRequests": 0,
            "dailyPlatformAiTokens": 0,
        },
    },
    PlanId.EMBER: {
        "id": PlanId.EMBER,
        "name": "Ember",
        "tagline": "Nightly tutoring with platform AI included",
        "priceMonthly": 99,
        "priceYearly": 990,
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
