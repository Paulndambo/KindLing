"""
Epic C8.1 — Offline automated session scorer (heuristic v1).

Scores the C8.3 rubric dimensions from LessonSession turns + LearningEvents.
Not a replacement for human C8.3 labels — produces a pilot baseline and
flags weak dimensions for product work.

Outputs 1–5 (or null if not observable) with per-dimension confidence + notes.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from learning.eval_rubric import (
    DIMENSION_IDS,
    RUBRIC_VERSION,
    completeness,
    extract_session_evidence,
    validate_scores,
    weighted_mean,
)

SCORER_ID = "auto-c8.1"
SCORER_VERSION = 1

# Shame / pressure cues (tutor text)
_SHAME_RE = re.compile(
    r"\b("
    r"wrong again|so easy|you should know|obviously|just guess|"
    r"not that hard|come on|pay attention|stupid|dumb|lazy"
    r")\b",
    re.I,
)
_WARM_RE = re.compile(
    r"\b("
    r"great try|nice thinking|proud of|that's okay|no pressure|"
    r"we can|together|good effort|bounce.?back|stuck is normal|"
    r"take your time|well done|love that"
    r")\b",
    re.I,
)
_ANSWER_DUMP_RE = re.compile(
    r"\b("
    r"the answer is|correct answer is|equals?\s+\d|it'?s simply|"
    r"just do this|here is the full solution|final answer\s*:"
    r")\b",
    re.I,
)
_QUESTION_RE = re.compile(r"\?")
_REAL_WORLD_RE = re.compile(
    r"\b("
    r"for example|imagine|like when|in real life|everyday|"
    r"chapati|juice|share|market|ball|pizza|story|picture|"
    r"think of|suppose you"
    r")\b",
    re.I,
)
_STEP_RE = re.compile(r"\b(step\s*\d|first,|next,|then,|finally)\b", re.I)
_REASON_ASK_RE = re.compile(
    r"\b(why|how did you|show (me )?your|explain|what makes you)\b", re.I
)
_PERSIST_RE = re.compile(
    r"\b(kept trying|stuck with|effort|persistence|bounce|try again|another go)\b",
    re.I,
)
_MATH_SUBJECT_RE = re.compile(r"\b(math|mathematics|algebra|arithmetic|numeracy)\b", re.I)
_MATH_TOPIC_RE = re.compile(
    r"\b(fraction|decimal|place value|equation|algebra|ratio|proportion|"
    r"multiplication|division|number line|arithmetic)\b",
    re.I,
)
_SCIENCE_SUBJECT_RE = re.compile(r"\b(science|biology|chemistry|physics|environmental science)\b", re.I)
_SCIENCE_TOPIC_RE = re.compile(
    r"\b(matter|particle|chemical reaction|reactant|product|force|motion|energy|heat|"
    r"ecosystem|food chain|cell|organelle|investigation|fair test|variable|water cycle|earth system)\b",
    re.I,
)
_SCAFFOLD_AUDIT_CUES = {
    "representation": re.compile(
        r"\b(bar|number line|array|equal groups?|balance|chart|table|draw|picture|model|pizza|chapati|share equally)\b",
        re.I,
    ),
    "sequenced_step": re.compile(
        r"\b(first|next|then|step\s*\d|one step|let'?s start|let'?s try)\b",
        re.I,
    ),
    "understanding_check": re.compile(r"\?"),
    "fade_or_transfer": re.compile(
        r"\b(your turn|try (it )?(yourself|on your own)|on your own|show me|"
        r"explain how|what do you notice|what would you do)\b",
        re.I,
    ),
}
_SCIENCE_AUDIT_CUES = {
    "scientific_representation": re.compile(
        r"\b(diagram|model|particle|food chain|food web|cell|equation|graph|table|draw|sketch)\b",
        re.I,
    ),
    "evidence_or_reasoning": re.compile(
        r"\b(because|evidence|observe|observation|data|result|therefore|suggests)\b",
        re.I,
    ),
    "investigation_sequence": re.compile(
        r"\b(first|next|then|measure|control|variable|fair test|repeat|record)\b",
        re.I,
    ),
    "understanding_check": re.compile(r"\?"),
    "prediction_or_transfer": re.compile(
        r"\b(predict|what would happen|new example|another situation|your turn|try it yourself|explain how)\b",
        re.I,
    ),
}

# Pedagogy action → tutor-text cues (loose compliance)
_ACTION_CUES: Dict[str, re.Pattern] = {
    "MICRO_HINT": re.compile(r"\b(hint|clue|nudge|tiny tip|one small)\b", re.I),
    "WORKED_EXAMPLE": re.compile(
        r"\b(example|for instance|watch this|similar problem)\b", re.I
    ),
    "FULL_GUIDE": re.compile(r"\b(step|together|walk through|let'?s start)\b", re.I),
    "EASIER_PATH": re.compile(
        r"\b(easier|simpler|warm.?up|foundation|go back)\b", re.I
    ),
    "SLOW_DOWN": re.compile(
        r"\b(slow|pause|reason|why|show your|before you answer)\b", re.I
    ),
    "AFFECT_SUPPORT": _WARM_RE,
    "OFFER_BREAK": re.compile(r"\b(break|rest|pause|come back)\b", re.I),
    "CHECK_UNDERSTANDING": _REASON_ASK_RE,
    "REMEDIATE_MISCONCEPTION": re.compile(
        r"\b(pattern|often people|common mix.?up|let'?s rework)\b", re.I
    ),
    "REMEDIATE_PREREQUISITE": re.compile(
        r"\b(foundation|earlier skill|build up|prerequisite|go back to)\b", re.I
    ),
    "CHALLENGE": re.compile(r"\b(stretch|challenge|richer|level up|try this)\b", re.I),
    "INDEPENDENT_PRACTICE": re.compile(
        r"\b(your turn|try (it )?yourself|without a hint|on your own)\b", re.I
    ),
    "REVIEW": re.compile(r"\b(remember|last time|quick check|retrieve)\b", re.I),
    "ASSESS": re.compile(r"\b(quick check|which of|option|multiple)\b", re.I),
    "EXPLAIN": re.compile(r"\b(means|idea is|in other words|because)\b", re.I),
    "CONTINUE_SOCRATIC": _QUESTION_RE,
    "CELEBRATE_PERSISTENCE": _PERSIST_RE,
    "CHANGE_REPRESENTATION": re.compile(
        r"\b(picture|model|diagram|another way|visual|story)\b", re.I
    ),
}


def _clamp_score(n: float) -> int:
    return max(1, min(5, int(round(n))))


def _tutor_blob(evidence: Dict[str, Any]) -> str:
    parts = []
    for t in evidence.get("turnsPreview") or []:
        parts.append(str(t.get("tutor") or ""))
    return "\n".join(parts)


def _all_tutor_texts(session) -> List[str]:
    return [str(t.tutor_text or "") for t in session.turns.all().order_by("index")[:40]]


def _count_matches(texts: List[str], pattern: re.Pattern) -> int:
    return sum(1 for tx in texts if pattern.search(tx or ""))


def score_socratic_fidelity(evidence: Dict[str, Any], tutor_texts: List[str]) -> Dict[str, Any]:
    if not tutor_texts:
        return _dim(None, 0.0, "No tutor turns to score.")
    n = len(tutor_texts)
    q_turns = _count_matches(tutor_texts, _QUESTION_RE)
    dumps = _count_matches(tutor_texts, _ANSWER_DUMP_RE)
    q_ratio = q_turns / n
    dump_ratio = dumps / n
    # Base from question rate
    score = 2.5 + q_ratio * 2.5 - dump_ratio * 2.0
    # Long monologues without questions
    mono = sum(1 for t in tutor_texts if len(t) > 400 and "?" not in t)
    score -= mono * 0.35
    conf = 0.55 + min(0.35, n * 0.04)
    note = f"q_ratio={q_ratio:.2f} dump_ratio={dump_ratio:.2f} mono={mono}"
    return _dim(_clamp_score(score), conf, note)


def score_hint_quality(evidence: Dict[str, Any], tutor_texts: List[str]) -> Dict[str, Any]:
    counters = evidence.get("counters") or {}
    hints = int(counters.get("hints") or 0)
    interventions = evidence.get("interventions") or []
    entered = [i for i in interventions if i.get("type") == "intervention.entered"]
    levels = [int(i.get("level") or 0) for i in entered if i.get("level") is not None]
    dumps_after_hint = 0
    # Heuristic: spoilers near hint language
    for tx in tutor_texts:
        if re.search(r"\bhint\b", tx or "", re.I) and _ANSWER_DUMP_RE.search(tx or ""):
            dumps_after_hint += 1

    if hints == 0 and not entered:
        # No scaffold path observed — neutral / light N/A as 3 with low conf
        return _dim(3, 0.35, "No hints/interventions observed.")

    score = 3.5
    if levels:
        # Prefer starting light (avg level lower is better if help worked)
        avg_l = sum(levels) / len(levels)
        if avg_l <= 1.5:
            score += 1.0
        elif avg_l <= 2.5:
            score += 0.4
        elif avg_l >= 3.5:
            score -= 0.6
        # Escalation present without only L4 spam
        if max(levels) - min(levels) >= 1 and max(levels) <= 3:
            score += 0.3
    if dumps_after_hint:
        score -= 0.8 * dumps_after_hint
    if hints >= 1 and dumps_after_hint == 0:
        score += 0.4
    conf = 0.5 + (0.15 if levels else 0) + (0.1 if hints else 0)
    return _dim(
        _clamp_score(score),
        min(0.9, conf),
        f"hints={hints} levels={levels} spoilers={dumps_after_hint}",
    )


def score_intervention_timing(evidence: Dict[str, Any]) -> Dict[str, Any]:
    struggle = evidence.get("struggleSignals") or []
    interventions = evidence.get("interventions") or []
    entered = [i for i in interventions if i.get("type") == "intervention.entered"]
    offered = [i for i in interventions if i.get("type") == "intervention.offered"]
    incorrect = 0
    for t in evidence.get("turnsPreview") or []:
        if t.get("correctness") == "incorrect":
            incorrect += 1
    counters = evidence.get("counters") or {}
    incorrect += int(counters.get("incorrect") or 0) // 2  # avoid double count

    if not struggle and not entered and incorrect < 2:
        return _dim(4, 0.4, "Little struggle; heavy help not required.")

    score = 3.0
    if struggle and (entered or offered):
        score += 1.2  # help after struggle signals present in session
    if struggle and not entered and not offered and incorrect >= 2:
        score -= 1.2  # stuck without help
    if entered and not struggle and incorrect == 0:
        score -= 0.8  # early heavy help without struggle
    # Multiple enters without exit — messy
    exits = [i for i in interventions if i.get("type") == "intervention.exited"]
    if len(entered) > len(exits) + 2:
        score -= 0.3
    conf = 0.45 + (0.2 if struggle else 0) + (0.15 if entered else 0)
    return _dim(
        _clamp_score(score),
        min(0.88, conf),
        f"struggle={len(struggle)} entered={len(entered)} incorrect~={incorrect}",
    )


def score_decision_compliance(
    evidence: Dict[str, Any], tutor_texts: List[str]
) -> Dict[str, Any]:
    decisions = evidence.get("pedagogyDecisions") or []
    if not decisions:
        return _dim(None, 0.2, "No pedagogy.decision events — not observable.")

    hits = 0
    checked = 0
    blob = "\n".join(tutor_texts)
    for d in decisions:
        action = str(d.get("action") or "")
        if not action:
            continue
        checked += 1
        pat = _ACTION_CUES.get(action)
        if pat is None:
            # Unknown action — mild credit if any tutor text
            hits += 0.5 if blob.strip() else 0
            continue
        if pat.search(blob):
            hits += 1
    if checked == 0:
        return _dim(None, 0.2, "Decisions lacked action field.")
    ratio = hits / checked
    score = 1.5 + ratio * 3.5
    conf = 0.5 + min(0.35, checked * 0.05)
    return _dim(
        _clamp_score(score),
        conf,
        f"cue_match={hits:.0f}/{checked} ratio={ratio:.2f}",
    )


def score_affect_respect(evidence: Dict[str, Any], tutor_texts: List[str]) -> Dict[str, Any]:
    if not tutor_texts:
        return _dim(None, 0.0, "No tutor text.")
    shame = _count_matches(tutor_texts, _SHAME_RE)
    warm = _count_matches(tutor_texts, _WARM_RE)
    frustrated_turns = sum(
        1
        for t in evidence.get("turnsPreview") or []
        if str(t.get("affect") or "") == "frustrated"
    )
    score = 3.2 + warm * 0.35 - shame * 1.2
    if frustrated_turns and warm == 0:
        score -= 0.6
    if frustrated_turns and warm >= 1:
        score += 0.4
    conf = 0.55 + min(0.25, len(tutor_texts) * 0.03)
    return _dim(
        _clamp_score(score),
        conf,
        f"warm={warm} shame={shame} frustrated_turns={frustrated_turns}",
    )


def score_misconception_handling(evidence: Dict[str, Any]) -> Dict[str, Any]:
    mcs = evidence.get("misconceptions") or []
    if not mcs:
        return _dim(None, 0.25, "No misconception events — skip or N/A.")
    detected = sum(1 for m in mcs if m.get("type") == "misconception.detected")
    remediated = sum(1 for m in mcs if m.get("type") == "misconception.remediated")
    if detected and remediated:
        score = 4.5 if remediated >= detected else 4.0
    elif detected and not remediated:
        score = 2.5
    elif remediated and not detected:
        score = 3.5
    else:
        score = 3.0
    conf = 0.6 + min(0.25, len(mcs) * 0.08)
    return _dim(
        _clamp_score(score),
        conf,
        f"detected={detected} remediated={remediated}",
    )


def score_real_world_clarity(tutor_texts: List[str]) -> Dict[str, Any]:
    if not tutor_texts:
        return _dim(None, 0.0, "No tutor text.")
    hits = _count_matches(tutor_texts, _REAL_WORLD_RE)
    ratio = hits / len(tutor_texts)
    score = 2.2 + min(2.8, hits * 0.55 + ratio * 1.5)
    conf = 0.5 + min(0.3, hits * 0.05)
    return _dim(_clamp_score(score), conf, f"real_world_hits={hits} ratio={ratio:.2f}")


def score_independence_orientation(evidence: Dict[str, Any]) -> Dict[str, Any]:
    adi = evidence.get("adiSnapshots") or []
    decisions = evidence.get("pedagogyDecisions") or []
    actions = [str(d.get("action") or "") for d in decisions]
    interventions = evidence.get("interventions") or []
    entered = [i for i in interventions if i.get("type") == "intervention.entered"]
    levels = [int(i.get("level") or 0) for i in entered]
    acc = evidence.get("accuracy")
    try:
        acc_f = float(acc) if acc is not None else None
    except (TypeError, ValueError):
        acc_f = None

    score = 3.0
    notes = []
    if adi:
        last = adi[-1]
        band = str(last.get("band") or "")
        val = last.get("value")
        notes.append(f"adi={val} band={band}")
        if band == "gaining_independence":
            score += 1.0
        elif band == "scaffold_heavy":
            score -= 0.4
        if last.get("trend") == "falling":
            score += 0.5  # independence improving
        if last.get("trend") == "rising" and acc_f is not None and acc_f >= 0.7:
            score -= 0.6  # still more dependent while accurate
    if "INDEPENDENT_PRACTICE" in actions:
        score += 0.6
        notes.append("independent_practice_decision")
    if levels and acc_f is not None and acc_f >= 0.75 and max(levels) >= 3:
        score -= 0.7
        notes.append("heavy_help_high_accuracy")
    if not adi and not levels and not actions:
        return _dim(3, 0.3, "Limited ADI/help signal.")
    conf = 0.45 + (0.25 if adi else 0) + (0.1 if actions else 0)
    return _dim(_clamp_score(score), min(0.9, conf), "; ".join(notes) or "mixed")


def score_persistence_support(
    evidence: Dict[str, Any], tutor_texts: List[str]
) -> Dict[str, Any]:
    counters = evidence.get("counters") or {}
    persist_events = int(counters.get("persistenceEvents") or 0)
    # Also scan events via struggle? — tutor language
    lang = _count_matches(tutor_texts, _PERSIST_RE)
    warm = _count_matches(tutor_texts, _WARM_RE)
    if persist_events == 0 and lang == 0:
        # Still give mild score if warm encouragement exists
        if warm >= 2:
            return _dim(3, 0.4, f"No explicit persistence; warm={warm}")
        return _dim(2, 0.4, "Little persistence language or events.")
    score = 3.0 + min(2.0, persist_events * 0.5 + lang * 0.45)
    conf = 0.5 + min(0.3, (persist_events + lang) * 0.08)
    return _dim(
        _clamp_score(score),
        conf,
        f"persist_events={persist_events} lang={lang}",
    )


def score_overall(
    dim_results: Dict[str, Dict[str, Any]], evidence: Dict[str, Any]
) -> Dict[str, Any]:
    scores = {
        k: v.get("score")
        for k, v in dim_results.items()
        if k != "overall_learning_quality" and v.get("score") is not None
    }
    if not scores:
        return _dim(3, 0.3, "Insufficient dimension scores.")
    # Local weighted mean using rubric weights via validate + weighted_mean
    filled = {did: None for did in DIMENSION_IDS}
    filled.update(scores)
    try:
        validated = validate_scores(filled)
    except ValueError:
        validated = filled
    mean = weighted_mean(validated)
    if mean is None:
        return _dim(3, 0.3, "No mean.")
    # Nudge by session accuracy lightly
    acc = evidence.get("accuracy")
    try:
        if acc is not None:
            a = float(acc)
            if a >= 0.7:
                mean = min(5.0, mean + 0.2)
            elif a < 0.35:
                mean = max(1.0, mean - 0.15)
    except (TypeError, ValueError):
        pass
    conf = 0.5 + 0.05 * len(scores)
    return _dim(_clamp_score(mean), min(0.92, conf), f"from_{len(scores)}_dims mean={mean}")


def _dim(score: Optional[int], confidence: float, note: str) -> Dict[str, Any]:
    return {
        "score": score,
        "confidence": round(max(0.0, min(1.0, confidence)), 3),
        "note": note,
        "source": SCORER_ID,
    }


def score_session_evidence(
    evidence: Dict[str, Any],
    *,
    tutor_texts: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Pure scorer from an evidence pack (+ optional full tutor texts).
    """
    if tutor_texts is None:
        tutor_texts = [
            str(t.get("tutor") or "") for t in (evidence.get("turnsPreview") or [])
        ]

    dims: Dict[str, Dict[str, Any]] = {}
    dims["socratic_fidelity"] = score_socratic_fidelity(evidence, tutor_texts)
    dims["hint_quality"] = score_hint_quality(evidence, tutor_texts)
    dims["intervention_timing"] = score_intervention_timing(evidence)
    dims["decision_compliance"] = score_decision_compliance(evidence, tutor_texts)
    dims["affect_respect"] = score_affect_respect(evidence, tutor_texts)
    dims["misconception_handling"] = score_misconception_handling(evidence)
    dims["real_world_clarity"] = score_real_world_clarity(tutor_texts)
    dims["independence_orientation"] = score_independence_orientation(evidence)
    dims["persistence_support"] = score_persistence_support(evidence, tutor_texts)
    dims["overall_learning_quality"] = score_overall(dims, evidence)

    scores = {k: v.get("score") for k, v in dims.items()}
    try:
        validated = validate_scores(scores)
    except ValueError:
        validated = scores
    mean = weighted_mean(validated)
    comp = completeness(validated)

    return {
        "scorer": SCORER_ID,
        "scorerVersion": SCORER_VERSION,
        "rubricVersion": RUBRIC_VERSION,
        "sessionId": evidence.get("sessionId"),
        "scores": validated,
        "dimensions": dims,
        "weightedMean": mean,
        "completeness": comp,
        "summary": _auto_summary(dims, mean),
    }


def score_lesson_session(session) -> Dict[str, Any]:
    """Score a LessonSession ORM object end-to-end."""
    evidence = extract_session_evidence(session)
    # Prefer full tutor texts when available
    try:
        tutor_texts = _all_tutor_texts(session)
    except Exception:
        tutor_texts = None
    result = score_session_evidence(evidence, tutor_texts=tutor_texts)
    audit_texts = tutor_texts
    if audit_texts is None:
        audit_texts = [str(turn.get("tutor") or "") for turn in evidence.get("turnsPreview") or []]
    subject = getattr(session, "subject", "")
    topic = getattr(session, "topic", "")
    if _SCIENCE_SUBJECT_RE.search(subject or "") or _SCIENCE_TOPIC_RE.search(topic or ""):
        playbook_audit = audit_science_playbook_signals(
            subject=subject, topic=topic, tutor_texts=audit_texts
        )
    else:
        playbook_audit = audit_math_playbook_signals(
            subject=subject, topic=topic, tutor_texts=audit_texts
        )
    result["playbookAudit"] = playbook_audit
    if playbook_audit.get("applicable"):
        evidence["playbookAudit"] = playbook_audit
        evidence.setdefault("scorerHints", []).append(
            f"C7 {playbook_audit.get('domain', 'domain')}-playbook surface cues (not a quality score): "
            + ", ".join(
                f"{name}={'seen' if seen else 'not seen'}"
                for name, seen in playbook_audit["signals"].items()
            )
            + ". Review fit and pacing manually."
        )
    result["evidence"] = evidence
    return result


def audit_math_playbook_signals(
    *, subject: str = "", topic: str = "", tutor_texts: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Collect non-scoring surface cues for C7 playbook spot-checks in C8 samples."""
    if not (_MATH_SUBJECT_RE.search(subject or "") or _MATH_TOPIC_RE.search(topic or "")):
        return {"applicable": False, "subject": subject or "", "topic": topic or ""}

    tutor_texts = [str(text or "") for text in (tutor_texts or []) if str(text or "").strip()]
    signals = {
        key: any(pattern.search(text) for text in tutor_texts)
        for key, pattern in _SCAFFOLD_AUDIT_CUES.items()
    }
    observed = sum(signals.values())
    return {
        "applicable": True,
        "domain": "math",
        "subject": subject or "",
        "topic": topic or "",
        "signals": signals,
        "observedCount": observed,
        "signalCount": len(signals),
        "coverage": round(observed / len(signals), 3),
        "interpretation": "Heuristic surface cues only; use the C8 human sample to judge whether the scaffold fit the learner and topic.",
    }


def audit_science_playbook_signals(
    *, subject: str = "", topic: str = "", tutor_texts: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Collect non-scoring science-playbook cues for C8 human spot-checks."""
    if not (_SCIENCE_SUBJECT_RE.search(subject or "") or _SCIENCE_TOPIC_RE.search(topic or "")):
        return {"applicable": False, "subject": subject or "", "topic": topic or ""}

    tutor_texts = [str(text or "") for text in (tutor_texts or []) if str(text or "").strip()]
    signals = {
        key: any(pattern.search(text) for text in tutor_texts)
        for key, pattern in _SCIENCE_AUDIT_CUES.items()
    }
    observed = sum(signals.values())
    return {
        "applicable": True,
        "domain": "science",
        "subject": subject or "",
        "topic": topic or "",
        "signals": signals,
        "observedCount": observed,
        "signalCount": len(signals),
        "coverage": round(observed / len(signals), 3),
        "interpretation": "Heuristic surface cues only; use the C8 human sample to judge scientific accuracy, scaffold fit, and learner understanding.",
    }


def _auto_summary(dims: Dict[str, Dict[str, Any]], mean: Optional[float]) -> str:
    scored = [
        (k, v["score"], v.get("confidence") or 0)
        for k, v in dims.items()
        if v.get("score") is not None
    ]
    if not scored:
        return "Insufficient data for automated scores."
    weak = sorted(scored, key=lambda x: (x[1], -x[2]))[:2]
    strong = sorted(scored, key=lambda x: (-x[1], -x[2]))[:2]
    parts = []
    if mean is not None:
        parts.append(f"Auto mean ~{mean:.2f}/5.")
    if weak:
        parts.append(
            "Watch: "
            + ", ".join(f"{k}={s}" for k, s, _ in weak)
            + "."
        )
    if strong:
        parts.append(
            "Strong: "
            + ", ".join(f"{k}={s}" for k, s, _ in strong)
            + "."
        )
    parts.append("Heuristic only — spot-check with C8.3 human rubric.")
    return " ".join(parts)


def result_to_score_payload(result: Dict[str, Any]) -> Dict[str, Any]:
    """Shape suitable for ManualSessionEval defaults."""
    notes = {
        k: (v.get("note") or "")
        for k, v in (result.get("dimensions") or {}).items()
        if v.get("note")
    }
    return {
        "scores": result.get("scores") or {},
        "dimension_notes": notes,
        "overall_notes": result.get("summary") or "",
        "weighted_mean": result.get("weightedMean"),
        "completeness": result.get("completeness"),
        "scorer": result.get("scorer") or SCORER_ID,
        "evidence": result.get("evidence") or {},
    }


def compare_auto_vs_human(
    auto_scores: Dict[str, Optional[int]],
    human_scores: Dict[str, Optional[int]],
) -> Dict[str, Any]:
    """MAE / agreement helpers for calibrating heuristics against C8.3 labels."""
    pairs: List[Tuple[str, int, int]] = []
    for did in DIMENSION_IDS:
        a, h = auto_scores.get(did), human_scores.get(did)
        if a is None or h is None:
            continue
        pairs.append((did, int(a), int(h)))
    if not pairs:
        return {"n": 0, "mae": None, "exact": None, "within1": None, "byDim": {}}
    abs_err = [abs(a - h) for _, a, h in pairs]
    exact = sum(1 for e in abs_err if e == 0) / len(abs_err)
    within1 = sum(1 for e in abs_err if e <= 1) / len(abs_err)
    by_dim = {
        did: {"auto": a, "human": h, "absErr": abs(a - h)} for did, a, h in pairs
    }
    return {
        "n": len(pairs),
        "mae": round(sum(abs_err) / len(abs_err), 3),
        "exact": round(exact, 3),
        "within1": round(within1, 3),
        "byDim": by_dim,
    }
