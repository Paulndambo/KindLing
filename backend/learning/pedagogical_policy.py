"""
Epic L2 — Pedagogical policy engine (Python mirror, v1).

decide_pedagogy(learner_state, context) → PedagogicalDecision
Aligned with frontend/src/services/learning/pedagogicalPolicy.js
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import random
import re
import time

from learning.signal_quality import SIGNAL_RELIABILITY_THRESHOLD, correctness_evidence


PEDAGOGY_POLICY_VERSION = 1


class PedagogicalAction:
    CONTINUE_SOCRATIC = "CONTINUE_SOCRATIC"
    EXPLAIN = "EXPLAIN"
    MICRO_HINT = "MICRO_HINT"
    WORKED_EXAMPLE = "WORKED_EXAMPLE"
    FULL_GUIDE = "FULL_GUIDE"
    EASIER_PATH = "EASIER_PATH"
    ASSESS = "ASSESS"
    REVIEW = "REVIEW"
    REMEDIATE_MISCONCEPTION = "REMEDIATE_MISCONCEPTION"
    REMEDIATE_PREREQUISITE = "REMEDIATE_PREREQUISITE"
    CHALLENGE = "CHALLENGE"
    SLOW_DOWN = "SLOW_DOWN"
    AFFECT_SUPPORT = "AFFECT_SUPPORT"
    CHECK_UNDERSTANDING = "CHECK_UNDERSTANDING"
    CHANGE_REPRESENTATION = "CHANGE_REPRESENTATION"
    CELEBRATE_PERSISTENCE = "CELEBRATE_PERSISTENCE"
    INDEPENDENT_PRACTICE = "INDEPENDENT_PRACTICE"
    OFFER_BREAK = "OFFER_BREAK"


ACTION_LABELS = {
    PedagogicalAction.CONTINUE_SOCRATIC: "Socratic practice",
    PedagogicalAction.EXPLAIN: "Clear explanation",
    PedagogicalAction.MICRO_HINT: "Micro-hint",
    PedagogicalAction.WORKED_EXAMPLE: "Worked example",
    PedagogicalAction.FULL_GUIDE: "Step-by-step guide",
    PedagogicalAction.EASIER_PATH: "Easier path",
    PedagogicalAction.ASSESS: "Quick check",
    PedagogicalAction.REVIEW: "Spaced review",
    PedagogicalAction.REMEDIATE_MISCONCEPTION: "Rework a pattern",
    PedagogicalAction.REMEDIATE_PREREQUISITE: "Strengthen a foundation",
    PedagogicalAction.CHALLENGE: "Fair stretch",
    PedagogicalAction.SLOW_DOWN: "Slow the pace",
    PedagogicalAction.AFFECT_SUPPORT: "Warm support",
    PedagogicalAction.CHECK_UNDERSTANDING: "Show-your-work check",
    PedagogicalAction.CHANGE_REPRESENTATION: "Different representation",
    PedagogicalAction.CELEBRATE_PERSISTENCE: "Celebrate effort",
    PedagogicalAction.INDEPENDENT_PRACTICE: "Independent try",
    PedagogicalAction.OFFER_BREAK: "Offer a break",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _decision_id() -> str:
    return f"pd_{int(time.time() * 1000):x}_{random.randint(0, 1_000_000):x}"


def action_from_ladder_level(level: Any) -> str:
    try:
        rank = int(round(float(level)))
    except (TypeError, ValueError):
        rank = 0
    rank = max(0, min(4, rank))
    if rank >= 4:
        return PedagogicalAction.EASIER_PATH
    if rank >= 3:
        return PedagogicalAction.FULL_GUIDE
    if rank >= 2:
        return PedagogicalAction.WORKED_EXAMPLE
    if rank >= 1:
        return PedagogicalAction.MICRO_HINT
    return PedagogicalAction.CONTINUE_SOCRATIC


def execution_brief(action: str, params: Optional[Dict[str, Any]] = None) -> str:
    p = params or {}
    skill = p.get("skillLabel") or p.get("prereqLabel") or p.get("topic") or "this idea"
    mc = p.get("misconceptionLabel") or "the sticky pattern"
    practical = bool(p.get("practicalHowTo"))
    mapping = {
        PedagogicalAction.REVIEW: f"Run short retrieval on «{skill}». One prompt, brief feedback. No brand-new teaching.",
        PedagogicalAction.CHALLENGE: f"One fair stretch on «{skill}». Stay Socratic.",
        PedagogicalAction.ASSESS: "Low-stakes understanding check. No shame.",
        PedagogicalAction.MICRO_HINT: "Exactly one small clue. No full solution.",
        PedagogicalAction.WORKED_EXAMPLE: "One worked example + twin try. Not a full guide.",
        PedagogicalAction.FULL_GUIDE: (
            f"Hands-on full guide for «{skill}»: concept → numbered device how-to → try-it → confirm. Do not withhold steps."
            if practical
            else "Step-by-step: explain → example → check. One step per message. For practical skills, use numbered device how-tos."
        ),
        PedagogicalAction.EASIER_PATH: f"Softer path"
        + (f" via «{p.get('prereqLabel')}»" if p.get("prereqLabel") else "")
        + ". Normalize reset.",
        PedagogicalAction.OFFER_BREAK: "Normalize pause. Offer break or easy warm-up.",
        PedagogicalAction.REMEDIATE_MISCONCEPTION: f"Gently rework «{mc}». Targeted check. No shame.",
        PedagogicalAction.REMEDIATE_PREREQUISITE: f"Walk back to foundation «{skill}» before the hard skill.",
        PedagogicalAction.SLOW_DOWN: "Slow pace. Ask for one reason before next try.",
        PedagogicalAction.AFFECT_SUPPORT: "Warmth first. One tiny next step. No pile-on.",
        PedagogicalAction.CHECK_UNDERSTANDING: "Ask show-your-work before stretching.",
        PedagogicalAction.CHANGE_REPRESENTATION: "Same idea, new model/story/visual.",
        PedagogicalAction.CELEBRATE_PERSISTENCE: "Name effort briefly, then one next question.",
        PedagogicalAction.INDEPENDENT_PRACTICE: "Prefer no-hint or micro-hint. Let them own the try.",
        PedagogicalAction.EXPLAIN: (
            f"Practical how-to for «{skill}»: one-line concept, numbered device steps, try-it check. Show the procedure clearly."
            if practical
            else "Mini-explanation + everyday example + one check. If hands-on, prefer numbered how-to + try-it."
        ),
        PedagogicalAction.CONTINUE_SOCRATIC: (
            f"Practical skill default: prioritize hands-on how-to for «{skill}» (numbered steps + try-it). Never withhold procedures."
            if practical
            else "Adaptive Socratic: one question, guide before give. For hands-on skills, switch to numbered how-to + try-it."
        ),
    }
    return mapping.get(action, mapping[PedagogicalAction.CONTINUE_SOCRATIC])


def build_pedagogy_prompt_block(decision: Optional[Dict[str, Any]]) -> str:
    if not decision or not decision.get("action"):
        return ""
    action = decision["action"]
    label = ACTION_LABELS.get(action, decision.get("label") or action)
    alts = ", ".join(decision.get("alternatives") or []) or "none"
    gap = decision.get("gap") or {}
    gap_line = ""
    if gap:
        gap_line = f"- Control gap: Desired: {gap.get('desired')} · Observed: {gap.get('observed')}\n"
    reasons = ", ".join(decision.get("reasons") or []) or "policy"
    return (
        "## Pedagogical decision (Kindling policy engine — EXECUTE ONLY THIS MOVE)\n"
        f"- Decision id: {decision.get('id')}\n"
        f"- Action: **{action}** ({label})\n"
        f"- Confidence: {decision.get('confidence', '—')}\n"
        f"- Why (internal): {reasons}\n"
        f"{gap_line}"
        f"- **Your job this turn:** {decision.get('executionBrief') or execution_brief(action, decision.get('params'))}\n"
        "- Do **not** freestyle a different major move.\n"
        f"- Stay on **{action}** unless safety requires a micro-flex.\n"
        f"- Other candidates: {alts}"
    )


def _finalize(
    action: str,
    *,
    reasons: Optional[List[str]] = None,
    params: Optional[Dict[str, Any]] = None,
    confidence: float = 0.5,
    gap: Optional[Dict[str, str]] = None,
    alternatives: Optional[List[str]] = None,
) -> Dict[str, Any]:
    params = params or {}
    return {
        "id": _decision_id(),
        "action": action,
        "label": ACTION_LABELS.get(action, action),
        "shortLabel": ACTION_LABELS.get(action, action),
        "confidence": round(confidence, 3),
        "reasons": [r for r in (reasons or []) if r],
        "params": params,
        "executionBrief": execution_brief(action, params),
        "alternatives": [a for a in (alternatives or []) if a and a != action][:4],
        "gap": gap,
        "policyVersion": PEDAGOGY_POLICY_VERSION,
        "decidedAt": _now(),
    }


def decide_pedagogy(
    learner_state: Optional[Dict[str, Any]] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Pure rules mirror of frontend decidePedagogy.
    """
    state = learner_state or {}
    ctx = context or {}
    params: Dict[str, Any] = {
        "subject": ctx.get("subject") or state.get("subject") or "",
        "topic": ctx.get("topic") or state.get("topic") or "",
    }
    raw_last = ctx.get("lastSignals") or {}
    correctness_reliable, _ = correctness_evidence(raw_last)
    evidence = raw_last.get("signalEvidence") or {}
    affect_reliable = float(
        (evidence.get("affect") or {}).get("confidence") or 0
    ) >= SIGNAL_RELIABILITY_THRESHOLD
    last = {
        **raw_last,
        "correctness": (
            raw_last.get("correctness")
            if correctness_reliable
            or (
                raw_last.get("correctness") == "exploring"
                and float(
                    (evidence.get("correctness") or {}).get("confidence") or 0
                )
                >= SIGNAL_RELIABILITY_THRESHOLD
            )
            else "unknown"
        ),
        "affect": raw_last.get("affect") if affect_reliable else None,
    }
    intervention = ctx.get("intervention") or {}
    adi = state.get("adi") or ctx.get("adi") or {}
    behaviour = state.get("behaviour") or {}
    conf = state.get("confidence") or {}
    knowledge = state.get("knowledge") or {}
    consecutive = int(
        ctx.get("consecutiveIncorrect")
        or behaviour.get("consecutiveIncorrect")
        or 0
    )
    affect = (
        (ctx.get("lastCheckIn") or {}).get("affect")
        or last.get("affect")
        or ctx.get("affect")
    )
    flags = behaviour.get("flags") or []

    if ctx.get("assessmentActive"):
        return _finalize(
            PedagogicalAction.ASSESS,
            reasons=["assessment_session_active"],
            params=params,
            confidence=0.95,
            gap={"desired": "complete_check", "observed": "in_assessment"},
        )
    if ctx.get("multiStepActive"):
        return _finalize(
            PedagogicalAction.CHECK_UNDERSTANDING,
            reasons=["multistep_active"],
            params=params,
            confidence=0.9,
        )
    if ctx.get("reviewMode"):
        params["skillLabel"] = ctx.get("reviewSkillLabel") or ctx.get("reviewSkill") or params["topic"]
        return _finalize(
            PedagogicalAction.REVIEW,
            reasons=["review_spark_mode"],
            params=params,
            confidence=0.95,
        )
    if ctx.get("challengeMode"):
        return _finalize(
            PedagogicalAction.CHALLENGE,
            reasons=["spark_challenge_mode"],
            params=params,
            confidence=0.92,
        )

    if intervention.get("status") == "active":
        level = intervention.get("level") or (intervention.get("context") or {}).get("level") or 0
        action = action_from_ladder_level(level)
        return _finalize(
            action,
            reasons=["intervention_active", f"ladder_l{level}"],
            params={**params, "ladderLevel": level},
            confidence=0.9,
        )

    if affect == "frustrated" and consecutive >= 2:
        return _finalize(
            PedagogicalAction.OFFER_BREAK,
            reasons=["low_energy_plus_struggle"],
            params=params,
            confidence=0.78,
        )

    consecutive_rapid = int(
        ctx.get("consecutiveRapidGuesses")
        or behaviour.get("consecutiveRapidGuesses")
        or 0
    )
    if (
        consecutive_rapid >= 2
        and last.get("correctness") == "incorrect"
    ):
        return _finalize(
            PedagogicalAction.SLOW_DOWN,
            reasons=["rapid_guessing"],
            params=params,
            confidence=0.82,
        )

    # L2.3 prereq — use context.weakPrereq if provided
    weak = ctx.get("weakPrereq")
    if weak and consecutive >= 2:
        params.update(
            {
                "prereqSlug": weak.get("slug"),
                "prereqLabel": weak.get("shortLabel") or weak.get("name"),
                "skillLabel": weak.get("shortLabel") or weak.get("name"),
            }
        )
        return _finalize(
            PedagogicalAction.REMEDIATE_PREREQUISITE,
            reasons=["severe_stuck_weak_prereq", weak.get("slug") or ""],
            params=params,
            confidence=0.84,
            alternatives=[
                PedagogicalAction.EASIER_PATH,
                PedagogicalAction.FULL_GUIDE,
            ],
        )

    mcs = state.get("misconceptions") or ctx.get("activeMisconceptions") or []
    supported_misconception = next(
        (
            m
            for m in mcs
            if isinstance(m, dict)
            and float(m.get("confidence") or 0) >= SIGNAL_RELIABILITY_THRESHOLD
        ),
        None,
    )
    if supported_misconception and last.get("correctness") in ("incorrect", "partial"):
        top = supported_misconception
        params["misconceptionLabel"] = top.get("label")
        params["misconceptionId"] = top.get("id")
        return _finalize(
            PedagogicalAction.REMEDIATE_MISCONCEPTION,
            reasons=["active_misconception"],
            params=params,
            confidence=0.8,
        )

    prefer_light = bool(adi.get("preferLighterHelp"))
    if consecutive >= 3:
        action = (
            PedagogicalAction.WORKED_EXAMPLE
            if prefer_light
            else PedagogicalAction.FULL_GUIDE
        )
        return _finalize(
            action,
            reasons=["incorrect_streak"],
            params=params,
            confidence=0.8,
        )

    cal = conf.get("calibration") or "unknown"
    if cal == "overconfident" and last.get("correctness") != "correct":
        return _finalize(
            PedagogicalAction.CHECK_UNDERSTANDING,
            reasons=["overconfident_calibration"],
            params=params,
            confidence=0.74,
        )
    if cal == "underconfident" and (conf.get("competence") or 0) >= 0.55:
        return _finalize(
            PedagogicalAction.CHALLENGE,
            reasons=["underconfident_but_capable"],
            params=params,
            confidence=0.72,
        )

    if prefer_light and (
        last.get("correctness") == "correct" or (knowledge.get("topicScore") or 0) >= 60
    ):
        return _finalize(
            PedagogicalAction.INDEPENDENT_PRACTICE,
            reasons=["adi_prefer_lighter"],
            params=params,
            confidence=0.7,
        )

    if last.get("correctness") == "exploring" or last.get("isQuestion"):
        practical_q = bool(ctx.get("preferPracticalHowTo") or ctx.get("practicalHowTo"))
        if practical_q:
            params = {**params, "practicalHowTo": True}
        return _finalize(
            PedagogicalAction.EXPLAIN,
            reasons=["student_exploring"]
            + (["practical_how_to_question"] if practical_q else []),
            params=params,
            confidence=0.72 if practical_q else 0.62,
        )

    # Practical skill topics — prefer hands-on how-to early (mirror frontend)
    practical_skill = bool(
        ctx.get("preferPracticalHowTo")
        or ctx.get("practicalHowTo")
        or params.get("practicalHowTo")
    )
    session_phase = str(ctx.get("sessionPhase") or "")
    student_text = str(last.get("studentText") or last.get("text") or "")
    how_to_request = bool(last.get("isQuestion")) or bool(
        re.search(
            r"how\s+(do|to|can)|show\s+me|step\s*by\s*step|walk\s+me",
            student_text,
            re.I,
        )
    )
    early_practical = practical_skill and (
        ctx.get("isFirstSession")
        or session_phase in ("open", "orient")
        or not last
        or how_to_request
    )
    if early_practical:
        params = {**params, "practicalHowTo": True}
        return _finalize(
            PedagogicalAction.EXPLAIN,
            reasons=["practical_skill_howto"],
            params=params,
            confidence=0.7,
            gap={"desired": "can_do_procedure", "observed": "theory_without_practice"},
            alternatives=[
                PedagogicalAction.FULL_GUIDE,
                PedagogicalAction.CONTINUE_SOCRATIC,
                PedagogicalAction.WORKED_EXAMPLE,
            ],
        )

    if practical_skill:
        params = {**params, "practicalHowTo": True}

    return _finalize(
        PedagogicalAction.CONTINUE_SOCRATIC,
        reasons=["default_socratic"]
        + (["practical_topic_keep_howto_ready"] if practical_skill else []),
        params=params,
        confidence=0.55,
    )


def rank_next_best_actions(
    *,
    learner_state: Optional[Dict[str, Any]] = None,
    due_reviews: Optional[List[Dict[str, Any]]] = None,
    recommended_skill: Optional[Dict[str, Any]] = None,
    focus_areas: Optional[List[Any]] = None,
    can_assess: bool = True,
) -> List[Dict[str, Any]]:
    state = learner_state or {}
    items: List[Dict[str, Any]] = []
    due = due_reviews or []
    if due:
        d = due[0]
        items.append(
            {
                "action": PedagogicalAction.REVIEW,
                "score": 0.92,
                "label": "Review today",
                "reason": f"Spaced practice on {d.get('skillLabel') or d.get('skillSlug') or 'a due skill'}",
                "cta": "Start review spark",
                "kind": "review",
            }
        )
    adi = state.get("adi") or {}
    knowledge = state.get("knowledge") or {}
    if adi.get("preferLighterHelp") and (knowledge.get("topicScore") or 0) >= 55:
        items.append(
            {
                "action": PedagogicalAction.INDEPENDENT_PRACTICE,
                "score": 0.78,
                "label": "Independent practice",
                "reason": "Independence is rising — try with lighter help",
                "cta": "Continue lesson",
                "kind": "lesson",
            }
        )
    if recommended_skill:
        items.append(
            {
                "action": PedagogicalAction.CONTINUE_SOCRATIC,
                "score": 0.7,
                "label": recommended_skill.get("shortLabel")
                or recommended_skill.get("name")
                or "Next skill",
                "reason": "Recommended next skill on your path",
                "cta": "Practice skill",
                "kind": "skill",
                "skillSlug": recommended_skill.get("slug"),
            }
        )
    if can_assess and (knowledge.get("topicAttempts") or 0) >= 2:
        items.append(
            {
                "action": PedagogicalAction.ASSESS,
                "score": 0.55,
                "label": "Quick check",
                "reason": "Low-stakes check on this lesson’s idea",
                "cta": "Start quick check",
                "kind": "assess",
            }
        )
    if not items:
        items.append(
            {
                "action": PedagogicalAction.CONTINUE_SOCRATIC,
                "score": 0.4,
                "label": "Continue learning",
                "reason": "Keep the spark going with a short lesson",
                "cta": "Start a lesson",
                "kind": "default",
            }
        )
    items.sort(key=lambda x: x.get("score", 0), reverse=True)
    return items[:5]
