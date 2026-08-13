"""Epic B6 — multi-step problem API helpers."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from curriculum.models import MultiStepProblem


def problem_to_dict(p: MultiStepProblem) -> Dict[str, Any]:
    skill = p.skill
    return {
        "id": p.slug,
        "slug": p.slug,
        "skillSlug": skill.slug if skill else None,
        "skillName": skill.name if skill else None,
        "subject": p.subject_name or "",
        "topics": list(p.topic_names or []),
        "title": p.title,
        "prompt": p.prompt,
        "promptPlain": p.prompt,
        "finalExpected": p.final_expected or "",
        "finalAlts": list(p.final_alts or []),
        "steps": list(p.steps or []),
        "sortOrder": p.sort_order,
        "source": "library",
    }


def list_multistep_problems(
    *,
    subject: str = "",
    topic: str = "",
    skill: str = "",
    limit: int = 20,
) -> List[Dict[str, Any]]:
    qs = MultiStepProblem.objects.filter(is_active=True).select_related("skill")
    if skill:
        qs = qs.filter(skill__slug=skill)

    out: List[tuple] = []
    t = (topic or "").strip().lower()
    s = (subject or "").strip().lower()
    for p in qs:
        score = 0
        if skill and p.skill_id and p.skill and p.skill.slug == skill:
            score += 10
        if t and p.matches_topic(topic):
            score += 8
        if s and p.subject_name:
            sn = p.subject_name.lower()
            if sn == s or sn in s or s in sn:
                score += 3
        if score > 0 or (not t and not skill):
            out.append((score if score else 1, p))

    out.sort(key=lambda pair: (-pair[0], pair[1].sort_order, pair[1].slug))
    return [problem_to_dict(p) for _, p in out[: max(1, min(limit, 40))]]


def pick_multistep_problem(
    *,
    subject: str = "",
    topic: str = "",
    skill: str = "",
) -> Optional[Dict[str, Any]]:
    rows = list_multistep_problems(
        subject=subject, topic=topic, skill=skill, limit=1
    )
    return rows[0] if rows else None
