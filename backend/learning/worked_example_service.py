"""
Epic B4 — query and rank curated worked examples for a lesson context.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from curriculum.models import WorkedExample, _parse_grade


def example_to_dict(ex: WorkedExample) -> Dict[str, Any]:
    skill = ex.skill
    return {
        "id": ex.slug,
        "slug": ex.slug,
        "skillSlug": skill.slug if skill else None,
        "skillName": skill.name if skill else None,
        "title": ex.title,
        "summary": ex.summary or "",
        "problem": ex.problem,
        "steps": list(ex.steps or []),
        "takeaway": ex.takeaway or "",
        "counterexample": ex.counterexample or "",
        "kind": ex.kind,
        "subject": ex.subject_name or "",
        "topics": list(ex.topic_names or []),
        "gradeMin": ex.grade_min,
        "gradeMax": ex.grade_max,
        "languageNotes": ex.language_notes or "",
        "sortOrder": ex.sort_order,
        "source": "library",
    }


def _score_example(
    ex: WorkedExample,
    *,
    subject: str,
    topic: str,
    skill_slug: Optional[str],
    grade,
    prefer_kind: str,
) -> int:
    score = 0
    sub = (subject or "").strip().lower()
    t = (topic or "").strip().lower()

    if skill_slug and ex.skill_id and ex.skill and ex.skill.slug == skill_slug:
        score += 20
    if ex.matches_topic(topic):
        score += 12
        # exact topic name boost
        for name in ex.topic_names or []:
            if (name or "").strip().lower() == t:
                score += 6
                break
    if sub and ex.subject_name:
        sn = ex.subject_name.strip().lower()
        if sn == sub or sn in sub or sub in sn:
            score += 4
    if ex.matches_grade(grade):
        score += 3
    else:
        # still usable but deprioritized
        score -= 8
    if prefer_kind and ex.kind == prefer_kind:
        score += 2
    # Prefer primary worked examples slightly over pure counterexamples
    # when kind not forced
    if not prefer_kind and ex.kind == WorkedExample.Kind.EXAMPLE:
        score += 1
    score += max(0, 50 - (ex.sort_order or 0) // 10)
    return score


def find_worked_examples(
    *,
    subject: str = "",
    topic: str = "",
    skill: str = "",
    grade=None,
    kind: str = "",
    limit: int = 8,
) -> List[Dict[str, Any]]:
    qs = WorkedExample.objects.filter(is_active=True).select_related("skill")
    if skill:
        qs = qs.filter(skill__slug=skill)
    if kind in (
        WorkedExample.Kind.EXAMPLE,
        WorkedExample.Kind.COUNTEREXAMPLE,
    ):
        qs = qs.filter(kind=kind)
    if subject:
        # Soft filter: keep empty subject_name or matching
        from django.db.models import Q

        qs = qs.filter(
            Q(subject_name__iexact=subject)
            | Q(subject_name__icontains=subject[:12])
            | Q(subject_name="")
        )

    ranked: List[tuple] = []
    for ex in qs:
        s = _score_example(
            ex,
            subject=subject,
            topic=topic,
            skill_slug=skill or None,
            grade=grade,
            prefer_kind=kind or "",
        )
        # Require some topical or skill relevance unless skill filter set
        if skill:
            ranked.append((s, ex))
        elif ex.matches_topic(topic) or s >= 10:
            ranked.append((s, ex))

    ranked.sort(key=lambda pair: (-pair[0], pair[1].sort_order, pair[1].slug))
    out = []
    for s, ex in ranked[: max(1, min(limit, 40))]:
        if s < 0 and not skill:
            continue
        d = example_to_dict(ex)
        d["matchScore"] = s
        out.append(d)
    return out


def find_best_worked_example(
    *,
    subject: str = "",
    topic: str = "",
    skill: str = "",
    grade=None,
    kind: str = "example",
) -> Optional[Dict[str, Any]]:
    rows = find_worked_examples(
        subject=subject,
        topic=topic,
        skill=skill,
        grade=grade,
        kind=kind or "example",
        limit=1,
    )
    return rows[0] if rows else None


def library_prompt_block(
    examples: List[Dict[str, Any]],
    *,
    max_examples: int = 2,
) -> str:
    """Compact tutor-facing library block (prefer over free generation)."""
    if not examples:
        return ""
    lines = [
        "CURATED WORKED-EXAMPLE LIBRARY (prefer these over inventing new ones):",
        "Use age-appropriate language. Do not dump every example — pick the best fit.",
    ]
    for ex in examples[:max_examples]:
        kind = ex.get("kind") or "example"
        lines.append(f"— [{kind}] {ex.get('title')} (id={ex.get('id')})")
        lines.append(f"  Problem: {ex.get('problem')}")
        steps = ex.get("steps") or []
        if steps:
            lines.append("  Steps: " + " → ".join(str(s) for s in steps))
        if ex.get("takeaway"):
            lines.append(f"  Takeaway: {ex['takeaway']}")
        if ex.get("counterexample"):
            lines.append(f"  Gentle counterexample: {ex['counterexample']}")
    lines.append(
        "When you use a library example, stay faithful to its structure; "
        "you may lightly adapt names/interests for engagement."
    )
    return "\n".join(lines)
