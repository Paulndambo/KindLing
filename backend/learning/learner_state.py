"""
Epic L1 — LearnerState contract (Python mirror).

Builds a structured learner snapshot from LearningProfile + optional live
session fields. Kept aligned with frontend/src/services/learning/learnerState.js
so policy / pulse / exports share one shape.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


LEARNER_STATE_VERSION = 1


def _clamp01(x: Any) -> Optional[float]:
    try:
        n = float(x)
    except (TypeError, ValueError):
        return None
    if n != n:  # NaN
        return None
    return max(0.0, min(1.0, n))


def _mean(values: List[Any]) -> Optional[float]:
    nums = []
    for v in values or []:
        c = _clamp01(v) if isinstance(v, float) else None
        if c is None:
            try:
                c = float(v)
            except (TypeError, ValueError):
                continue
        if c == c:
            nums.append(max(0.0, min(1.0, c)) if 0 <= c <= 1 else c)
    if not nums:
        return None
    # If values look like 0-100, normalize
    if any(n > 1.0 for n in nums):
        nums = [n / 100.0 if n > 1.0 else n for n in nums]
    return sum(nums) / len(nums)


def _topic_key(subject: str, topic: str) -> str:
    return f"{subject or 'General'}::{topic or 'General'}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def empty_learner_state(
    *,
    student_id: str = "",
    subject: str = "",
    topic: str = "",
    unit: str = "",
) -> Dict[str, Any]:
    return {
        "version": LEARNER_STATE_VERSION,
        "studentId": student_id or "",
        "subject": subject or "",
        "topic": topic or "",
        "unit": unit or "",
        "updatedAt": _now_iso(),
        "knowledge": {
            "topicScore": None,
            "topicAttempts": 0,
            "topicCorrect": 0,
            "topicIncorrect": 0,
            "skills": [],
            "primarySkills": [],
            "strengths": [],
            "focusAreas": [],
            "recommendedNext": None,
        },
        "misconceptions": [],
        "behaviour": {
            "hintRate": 0.0,
            "shortAnswerRate": 0.0,
            "rapidGuessRate": 0.0,
            "offTopicRate": 0.0,
            "avgResponseMs": None,
            "persistenceScore": 0,
            "flags": [],
        },
        "engagement": {"level": None, "label": "unknown", "recent": []},
        "confidence": {
            "level": None,
            "label": "unknown",
            "mean": None,
            "competence": None,
            "calibration": "unknown",
            "calibrationError": None,
        },
        "assistance": {
            "level": 0.0,
            "label": "unknown",
            "hintRate": 0.0,
            "interventionActive": False,
            "interventionLevel": 0,
            "scaffoldingBias": 0.0,
            "adi": None,
            "adiBand": "unknown",
            "independencePct": None,
            "preferLighterHelp": False,
        },
        "objective": {
            "lessonGoal": "",
            "weekFocus": "",
            "unitName": unit or "",
            "lessonName": topic or "",
            "familiarity": "",
            "effectiveGoal": "",
        },
        "interaction": {
            "deliveryPrefs": [],
            "prefersVisual": False,
            "prefersStory": False,
            "prefersStepByStep": False,
            "prefersEnergetic": False,
            "lowTypingTolerance": False,
            "voiceInputCount": 0,
        },
        "summary": "New or lightly observed learner.",
        "pulse": {
            "correctnessTone": "muted",
            "correctnessText": "Observing…",
            "affectLabel": "—",
            "confidencePct": None,
            "engagementPct": None,
            "thinkTimeLabel": None,
            "knowledgeLabel": None,
            "assistanceLabel": None,
            "calibrationLabel": None,
            "misconceptionLabels": [],
            "misconceptionTip": None,
            "persistenceNote": None,
            "independenceNote": None,
        },
    }


def calibrate_confidence_competence(
    confidence_mean: Optional[float], competence: Optional[float]
) -> Dict[str, Any]:
    c = _clamp01(confidence_mean)
    k = _clamp01(competence)
    if c is None or k is None:
        return {"calibration": "unknown", "error": None}
    err = abs(c - k)
    if err < 0.18:
        return {"calibration": "calibrated", "error": err}
    if c > k + 0.18:
        return {"calibration": "overconfident", "error": err}
    if k > c + 0.18:
        return {"calibration": "underconfident", "error": err}
    return {"calibration": "calibrated", "error": err}


def engagement_label(level: Optional[float]) -> str:
    if level is None:
        return "unknown"
    if level >= 0.72:
        return "engaged"
    if level >= 0.45:
        return "steady"
    if level >= 0.25:
        return "low"
    return "disengaged"


def assistance_label(level: float, intervention_active: bool = False) -> str:
    if intervention_active and level >= 0.55:
        return "high_support"
    if level < 0.18:
        return "independent"
    if level < 0.4:
        return "light_support"
    if level < 0.7:
        return "guided"
    return "high_support"


def build_learner_state_from_profile(
    profile_payload: Optional[Dict[str, Any]],
    *,
    student_id: str = "",
    subject: str = "",
    topic: str = "",
    unit: str = "",
    last_signals: Optional[Dict[str, Any]] = None,
    intervention: Optional[Dict[str, Any]] = None,
    lesson_goals: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build LearnerState from a profile JSON dict (LearningProfile fields
    or frontend profile snapshot).
    """
    profile = profile_payload or {}
    state = empty_learner_state(
        student_id=student_id or profile.get("studentId") or profile.get("client_student_id") or "",
        subject=subject,
        topic=topic,
        unit=unit,
    )

    totals = profile.get("totals") or {}
    behavior = profile.get("behavior") or profile.get("behaviour") or {}
    mastery_map = profile.get("mastery") or {}
    key = _topic_key(subject, topic)
    mastery_row = mastery_map.get(key) or {}

    if mastery_row:
        score = mastery_row.get("score")
        state["knowledge"]["topicScore"] = (
            int(round(float(score))) if score is not None else None
        )
        state["knowledge"]["topicAttempts"] = int(mastery_row.get("attempts") or 0)
        state["knowledge"]["topicCorrect"] = int(mastery_row.get("correct") or 0)
        state["knowledge"]["topicIncorrect"] = int(mastery_row.get("incorrect") or 0)

    state["knowledge"]["strengths"] = list(profile.get("strengths") or [])[:5]
    state["knowledge"]["focusAreas"] = list(profile.get("focusAreas") or profile.get("focus_areas") or [])[:5]

    # Skills from profile.skills if present
    skills_raw = profile.get("skills") or {}
    skill_list = []
    if isinstance(skills_raw, dict):
        for slug, row in list(skills_raw.items())[:12]:
            if not isinstance(row, dict):
                continue
            sc = row.get("score")
            if sc is None and row.get("pKnow") is not None:
                sc = float(row["pKnow"]) * 100
            skill_list.append(
                {
                    "slug": slug,
                    "name": row.get("name") or row.get("shortLabel") or slug,
                    "shortLabel": row.get("shortLabel") or row.get("name") or slug,
                    "score": int(round(float(sc))) if sc is not None else None,
                    "state": row.get("state"),
                    "stateLabel": row.get("stateLabel") or "",
                    "isPrimary": bool(row.get("isPrimary")),
                }
            )
    state["knowledge"]["skills"] = skill_list
    state["knowledge"]["primarySkills"] = [s for s in skill_list if s.get("isPrimary")]

    # Misconceptions
    mc_out: List[Dict[str, Any]] = []
    raw_mc = profile.get("misconceptions") or {}
    if isinstance(raw_mc, dict):
        rows = sorted(
            (v for v in raw_mc.values() if isinstance(v, dict) and v.get("isActive", True) is not False),
            key=lambda m: int(m.get("count") or 0),
            reverse=True,
        )
        for m in rows[:6]:
            count = int(m.get("count") or 1)
            conf = min(0.95, 0.35 + count * 0.12)
            playbook = m.get("playbook") or {}
            mc_out.append(
                {
                    "id": m.get("id") or m.get("slug"),
                    "label": m.get("label") or m.get("id"),
                    "count": count,
                    "confidence": round(conf, 2),
                    "isActive": m.get("isActive", True) is not False,
                    "skillSlug": m.get("skillSlug") or m.get("skill_slug"),
                    "playbook": playbook,
                    "checkQuestion": playbook.get("check_question")
                    or playbook.get("checkQuestion"),
                }
            )
    state["misconceptions"] = mc_out

    hint_rate = float(behavior.get("hintRate") or behavior.get("hint_rate") or 0)
    short_rate = float(behavior.get("shortAnswerRate") or 0)
    rapid_rate = float(behavior.get("rapidGuessRate") or 0)
    off_rate = float(behavior.get("offTopicRate") or 0)
    flags = []
    if rapid_rate > 0.25:
        flags.append("rapid_guessing")
    if short_rate > 0.4:
        flags.append("short_answers")
    if off_rate > 0.2:
        flags.append("off_topic")
    if hint_rate > 0.35:
        flags.append("hint_dependent")
    pers = int(behavior.get("persistenceScore") or 0)
    if pers >= 3:
        flags.append("persistent")

    state["behaviour"] = {
        "hintRate": hint_rate,
        "shortAnswerRate": short_rate,
        "rapidGuessRate": rapid_rate,
        "offTopicRate": off_rate,
        "avgResponseMs": behavior.get("avgResponseMs"),
        "persistenceScore": pers,
        "flags": flags,
    }

    eng_hist = profile.get("engagementHistory") or profile.get("engagement_history") or []
    conf_hist = profile.get("confidenceHistory") or profile.get("confidence_history") or []
    last = last_signals or {}
    eng_level = _clamp01(last.get("engagement"))
    if eng_level is None:
        eng_level = _mean(eng_hist)
    state["engagement"] = {
        "level": eng_level,
        "label": engagement_label(eng_level),
        "recent": list(eng_hist)[-8:],
    }

    conf_level = _clamp01(last.get("confidence"))
    conf_mean = _mean(conf_hist)
    if conf_level is None:
        conf_level = conf_mean

    competence = None
    attempts = int(mastery_row.get("attempts") or 0)
    if attempts >= 2:
        correct = float(mastery_row.get("correct") or 0)
        partial = float(mastery_row.get("partial") or 0)
        competence = _clamp01((correct + partial * 0.5) / max(1, attempts))
    else:
        graded = (
            float(totals.get("correct") or 0)
            + float(totals.get("incorrect") or 0)
            + float(totals.get("partial") or 0)
        )
        if graded >= 3:
            competence = _clamp01(
                (float(totals.get("correct") or 0) + float(totals.get("partial") or 0) * 0.5)
                / graded
            )

    cal = calibrate_confidence_competence(
        conf_mean if conf_mean is not None else conf_level, competence
    )
    if conf_level is None:
        conf_label = "unknown"
    elif conf_level >= 0.7:
        conf_label = "high"
    elif conf_level >= 0.4:
        conf_label = "moderate"
    else:
        conf_label = "low"

    state["confidence"] = {
        "level": conf_level,
        "label": conf_label,
        "mean": conf_mean,
        "competence": competence,
        "calibration": cal["calibration"],
        "calibrationError": cal["error"],
    }

    iv = intervention or {}
    iv_active = iv.get("status") == "active" or bool(iv.get("active"))
    iv_level = int(iv.get("level") or (iv.get("context") or {}).get("level") or 0)
    bias = float(iv.get("scaffoldingBias") or 0)
    assist = min(1.0, hint_rate * 0.55 + bias * 0.35 + (0.25 + iv_level * 0.12 if iv_active else 0))
    # Epic L3 — ADI from profile behavior when present
    prior_adi = behavior.get("adi")
    try:
        prior_adi_f = float(prior_adi) if prior_adi is not None else None
    except (TypeError, ValueError):
        prior_adi_f = None
    adi_band_s = str(behavior.get("adiBand") or behavior.get("adi_band") or "unknown")
    indep_pct = behavior.get("independencePct") or behavior.get("independence_pct")
    try:
        indep_pct_i = int(indep_pct) if indep_pct is not None else (
            int(round((1.0 - prior_adi_f) * 100)) if prior_adi_f is not None else None
        )
    except (TypeError, ValueError):
        indep_pct_i = None

    from learning.adi import (
        adi_independence_copy,
        should_prefer_lighter_help,
        adi_band as _adi_band,
    )

    if prior_adi_f is not None and adi_band_s == "unknown":
        adi_band_s = _adi_band(prior_adi_f)
    prefer_light = should_prefer_lighter_help(
        adi=prior_adi_f,
        topic_score=state["knowledge"]["topicScore"],
        trend=str(behavior.get("adiTrend") or "unknown"),
    )
    indep_copy = adi_independence_copy(
        adi=prior_adi_f,
        topic_score=state["knowledge"]["topicScore"],
        trend=str(behavior.get("adiTrend") or "unknown"),
        for_digest=False,
    )

    state["assistance"] = {
        "level": round(assist, 2),
        "label": assistance_label(assist, iv_active),
        "hintRate": hint_rate,
        "interventionActive": iv_active,
        "interventionLevel": iv_level,
        "scaffoldingBias": bias,
        "adi": prior_adi_f,
        "adiBand": adi_band_s,
        "independencePct": indep_pct_i,
        "preferLighterHelp": prefer_light,
    }
    state["adi"] = (
        {
            "value": prior_adi_f,
            "band": adi_band_s,
            "independencePct": indep_pct_i,
            "preferLighterHelp": prefer_light,
            "reliable": prior_adi_f is not None,
            "copy": indep_copy,
        }
        if prior_adi_f is not None
        else None
    )

    goals = lesson_goals or {}
    state["objective"] = {
        "lessonGoal": str(goals.get("learningGoal") or goals.get("effectiveGoal") or "").strip(),
        "weekFocus": str(goals.get("weekFocus") or goals.get("week_focus") or "").strip(),
        "unitName": unit or str(goals.get("unitName") or "").strip(),
        "lessonName": topic or "",
        "familiarity": str(goals.get("familiarity") or goals.get("familiarityLabel") or "").strip(),
        "effectiveGoal": str(goals.get("effectiveGoal") or goals.get("learningGoal") or "").strip(),
    }

    prefs = profile.get("deliveryPreferences") or profile.get("delivery_preferences") or {}
    pref_entries = sorted(
        (
            {"id": k, "weight": float(v or 0)}
            for k, v in prefs.items()
            if float(v or 0) > 0
        ),
        key=lambda p: p["weight"],
        reverse=True,
    )
    top = pref_entries[0]["id"] if pref_entries else ""
    state["interaction"] = {
        "deliveryPrefs": pref_entries[:4],
        "prefersVisual": top == "visual" or float(prefs.get("visual") or 0) >= 2,
        "prefersStory": top == "story" or float(prefs.get("story") or 0) >= 2,
        "prefersStepByStep": top == "step_by_step" or float(prefs.get("step_by_step") or 0) >= 2,
        "prefersEnergetic": top == "energetic" or float(prefs.get("energetic") or 0) >= 2,
        "lowTypingTolerance": short_rate > 0.4,
        "voiceInputCount": int(behavior.get("voiceInputCount") or 0),
    }

    bits = []
    if state["knowledge"]["topicScore"] is not None:
        bits.append(f"topic ~{state['knowledge']['topicScore']}%")
    if state["engagement"]["label"] != "unknown":
        bits.append(f"engagement {state['engagement']['label']}")
    if state["confidence"]["label"] != "unknown":
        bits.append(f"confidence {state['confidence']['label']}")
    if state["confidence"]["calibration"] not in ("unknown", "calibrated"):
        bits.append(state["confidence"]["calibration"])
    if state["assistance"]["label"] != "unknown":
        bits.append(state["assistance"]["label"].replace("_", " "))
    if mc_out:
        bits.append(f"mc: {mc_out[0].get('label')}")
    state["summary"] = (
        " · ".join(bits)
        if bits
        else (
            "Observed learner — still forming a clear picture."
            if int(totals.get("exchanges") or 0) > 0
            else "New or lightly observed learner."
        )
    )

    conf_pct = int(round(conf_level * 100)) if conf_level is not None else None
    eng_pct = int(round(eng_level * 100)) if eng_level is not None else None
    cal_label = None
    if state["confidence"]["calibration"] == "overconfident":
        cal_label = "May feel ahead of evidence — invite show-your-work"
    elif state["confidence"]["calibration"] == "underconfident":
        cal_label = "Stronger than they feel — affirm solid reasoning"
    elif state["confidence"]["calibration"] == "calibrated":
        cal_label = "Confidence roughly matches performance"

    assist_labels = {
        "independent": "Working independently",
        "light_support": "Light support",
        "guided": "Guided practice",
        "high_support": "High support right now",
    }
    knowledge_label = None
    if state["knowledge"]["topicScore"] is not None:
        knowledge_label = f"Topic mastery ~{state['knowledge']['topicScore']}%"

    state["pulse"] = {
        "correctnessTone": "muted",
        "correctnessText": "Observing…",
        "affectLabel": "—",
        "confidencePct": conf_pct,
        "engagementPct": eng_pct,
        "thinkTimeLabel": None,
        "knowledgeLabel": knowledge_label,
        "assistanceLabel": assist_labels.get(state["assistance"]["label"]),
        "calibrationLabel": cal_label,
        "misconceptionLabels": [m["label"] for m in mc_out[:3] if m.get("label")],
        "misconceptionTip": (mc_out[0].get("checkQuestion") if mc_out else None),
        "persistenceNote": (
            "Persistence spark: effort and bounce-backs count — not only correct answers."
            if pers >= 2
            else None
        ),
        "independenceNote": indep_copy,
    }

    if last:
        corr = str(last.get("correctness") or "").lower()
        tone_map = {
            "correct": ("good", "On track"),
            "partial": ("mid", "Partial understanding"),
            "incorrect": ("focus", "Needs scaffold"),
            "exploring": ("mid", "Exploring / asking"),
        }
        tone, text = tone_map.get(corr, ("muted", "Observing…"))
        state["pulse"]["correctnessTone"] = tone
        state["pulse"]["correctnessText"] = text
        affect = last.get("affect")
        if affect:
            state["pulse"]["affectLabel"] = str(affect).replace("_", " ").title()

    state["updatedAt"] = _now_iso()
    return state
