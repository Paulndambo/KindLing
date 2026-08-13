"""
Epic B5 — misconception catalog lookup, detection helpers, playbook packaging.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from curriculum.models import MisconceptionDef


def def_to_dict(d: MisconceptionDef) -> Dict[str, Any]:
    skill = d.skill
    return {
        "id": d.slug,
        "slug": d.slug,
        "label": d.label,
        "domain": d.domain,
        "description": d.description or "",
        "skillSlug": skill.slug if skill else None,
        "skillName": skill.name if skill else None,
        "topics": list(d.topic_names or []),
        "studentCues": list(d.student_cues or []),
        "patterns": list(d.patterns or []),
        "playbook": dict(d.playbook or {}),
        "relatedExampleSlug": d.related_example_slug or None,
        "relatedCounterSlug": d.related_counter_slug or None,
        "sortOrder": d.sort_order,
        "source": "catalog",
    }


def list_misconception_defs(
    *,
    domain: str = "",
    topic: str = "",
    skill: str = "",
    limit: int = 40,
) -> List[Dict[str, Any]]:
    qs = MisconceptionDef.objects.filter(is_active=True).select_related("skill")
    if domain:
        qs = qs.filter(domain=domain)
    if skill:
        qs = qs.filter(skill__slug=skill)

    t = (topic or "").strip().lower()
    out: List[tuple] = []
    for d in qs:
        score = 0
        if skill and d.skill_id and d.skill and d.skill.slug == skill:
            score += 10
        if t:
            for name in d.topic_names or []:
                n = (name or "").strip().lower()
                if not n:
                    continue
                if t == n:
                    score += 8
                elif t in n or n in t:
                    score += 5
        if not t and not skill:
            score = 1
        if score > 0 or (not t and not skill):
            out.append((score if score else 1, d))

    out.sort(key=lambda p: (-p[0], p[1].sort_order, p[1].slug))
    return [def_to_dict(d) for _, d in out[: max(1, min(limit, 80))]]


def _compile(patterns: List[str]) -> List[re.Pattern]:
    compiled = []
    for p in patterns or []:
        try:
            compiled.append(re.compile(p, re.I))
        except re.error:
            continue
    return compiled


def detect_misconceptions_text(
    student_text: str,
    tutor_text: str = "",
    *,
    topic: str = "",
    subject: str = "",
    skill: str = "",
    catalog: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Server-side detection (mirrors FE engine). Prefer student_cues, then patterns.
    """
    if catalog is None:
        catalog = list_misconception_defs(topic=topic, skill=skill, limit=40)
        # Also include domain-wide if topic empty
        if not catalog:
            catalog = list_misconception_defs(limit=40)

    student = student_text or ""
    blob = f"{student_text or ''} {tutor_text or ''}"
    hits: List[Dict[str, Any]] = []

    for entry in catalog:
        cues = _compile(entry.get("studentCues") or [])
        pats = _compile(entry.get("patterns") or [])
        matched = False
        source = None
        if cues and any(c.search(student) for c in cues):
            matched = True
            source = "student_cue"
        elif pats and any(p.search(blob) for p in pats):
            # Broader patterns: require some student content to avoid tutor-only hits
            if student.strip() and any(p.search(student) for p in pats):
                matched = True
                source = "pattern_student"
            elif student.strip() and any(p.search(blob) for p in pats):
                matched = True
                source = "pattern_blob"
        if not matched:
            continue
        pb = entry.get("playbook") or {}
        hits.append(
            {
                "id": entry.get("id") or entry.get("slug"),
                "label": entry.get("label"),
                "domain": entry.get("domain"),
                "skillSlug": entry.get("skillSlug"),
                "description": entry.get("description"),
                "playbook": pb,
                "tutorDirectives": list(pb.get("tutor_directives") or []),
                "relatedExampleSlug": entry.get("relatedExampleSlug"),
                "relatedCounterSlug": entry.get("relatedCounterSlug"),
                "matchSource": source,
                "source": entry.get("source") or "catalog",
            }
        )
    return hits


def playbook_prompt_block(hits: List[Dict[str, Any]], *, max_hits: int = 2) -> str:
    if not hits:
        return ""
    lines = [
        "MISCONCEPTION REMEDIATION PLAYBOOK (use silently; never name 'misconception engine'):",
    ]
    for h in hits[:max_hits]:
        pb = h.get("playbook") or {}
        lines.append(f"— {h.get('label')} (id={h.get('id')})")
        if pb.get("open"):
            lines.append(f"  Open: {pb['open']}")
        steps = pb.get("steps") or []
        if steps:
            lines.append("  Steps: " + " | ".join(str(s) for s in steps))
        if pb.get("check_question"):
            lines.append(f"  Check: {pb['check_question']}")
        for d in pb.get("tutor_directives") or h.get("tutorDirectives") or []:
            lines.append(f"  Directive: {d}")
        if h.get("relatedExampleSlug"):
            lines.append(f"  Prefer library example: {h['relatedExampleSlug']}")
    lines.append(
        "Celebrate when they correct the idea. Do not shame. Keep language age-appropriate."
    )
    return "\n".join(lines)
