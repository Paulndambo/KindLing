"""
Epic L3 — Assistance Dependency Index (ADI) Python mirror.

Aligned with frontend/src/services/learning/adi.js for digest, API, and tests.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


ADI_VERSION = 1
ADI_WINDOW = 12
ADI_MIN_SAMPLES = 3

# Ladder ranks (match InterventionLevel)
LEVEL_NONE = 0
LEVEL_MICRO = 1
LEVEL_EXAMPLE = 2
LEVEL_GUIDE = 3
LEVEL_EASIER = 4


def _clamp01(x: Any) -> float:
    try:
        n = float(x)
    except (TypeError, ValueError):
        return 0.0
    if n != n:
        return 0.0
    return max(0.0, min(1.0, n))


def _normalize_level(level: Any) -> int:
    try:
        n = int(round(float(level)))
    except (TypeError, ValueError):
        return 0
    return max(0, min(4, n))


def assistance_weight_for_turn(turn: Optional[Dict[str, Any]] = None) -> float:
    t = turn or {}
    level = _normalize_level(t.get("interventionLevel") or t.get("intervention_level") or 0)
    active = bool(
        t.get("interventionActive")
        or t.get("intervention_active")
        or t.get("duringIntervention")
        or (str(t.get("interventionStatus") or "") == "active" and level > 0)
    )
    w = 0.0
    if t.get("isHintRequest") or t.get("is_hint_request"):
        w += 0.32
    if active and level > 0:
        w += (level / LEVEL_EASIER) * 0.72
    bias = t.get("scaffoldingBias", t.get("scaffolding_bias"))
    if bias is not None:
        try:
            b = float(bias)
            if b == b and b > 0:
                w += min(0.18, b * 0.22)
        except (TypeError, ValueError):
            pass
    c = str(t.get("correctness") or "").lower()
    if c == "incorrect" and w < 0.15:
        w = max(w, 0.12)
    if c in ("exploring", "unknown", ""):
        w *= 0.5
    return round(_clamp01(w), 3)


def adi_band(adi: Optional[float]) -> str:
    if adi is None:
        return "unknown"
    try:
        v = float(adi)
    except (TypeError, ValueError):
        return "unknown"
    if v != v:
        return "unknown"
    if v < 0.28:
        return "gaining_independence"
    if v < 0.55:
        return "balanced_support"
    return "scaffold_heavy"


def adi_trend_from_weights(weights: List[float]) -> str:
    w = [float(x) for x in (weights or []) if x is not None]
    if len(w) < 4:
        return "unknown"
    mid = len(w) // 2
    older = w[:mid]
    newer = w[mid:]
    mean = lambda arr: sum(arr) / max(1, len(arr))
    d = mean(newer) - mean(older)
    if d <= -0.08:
        return "falling"
    if d >= 0.08:
        return "rising"
    return "stable"


def adi_independence_copy(
    *,
    adi: Optional[float],
    topic_score: Optional[float] = None,
    trend: str = "unknown",
    for_digest: bool = False,
) -> Optional[str]:
    if adi is None:
        return None
    try:
        v = float(adi)
    except (TypeError, ValueError):
        return None
    band = adi_band(v)
    score = float(topic_score) if topic_score is not None else None
    strong = score is not None and score >= 65

    if band == "gaining_independence":
        if trend == "falling":
            return (
                "Growing independence — solving more with lighter support."
                if for_digest
                else "Growing independence — more solid answers with lighter support."
            )
        return (
            "Building independent practice on recent graded work."
            if for_digest
            else "Building independence — keep trusting your own reasoning."
        )
    if band == "balanced_support":
        if strong:
            return (
                "Using help wisely while mastery holds — a good moment for lighter practice."
                if for_digest
                else "Solid progress with balanced support — try the next one with a lighter hint."
            )
        return (
            "Mixing independent tries with healthy help-seeking."
            if for_digest
            else "Mixing your own tries with healthy help — that balance grows learning."
        )
    if strong:
        return (
            "They know this material — encourage a no-hint try next time."
            if for_digest
            else "You know more than the scaffolds suggest — try one with a lighter hint."
        )
    if trend == "rising":
        return (
            "Leaning on guides right now — normal when ideas are new; celebrate persistence."
            if for_digest
            else "Guides are helping a lot right now — that's okay while ideas are new."
        )
    return (
        "Using scaffolds while building foundations — keep effort high; independence follows."
        if for_digest
        else "Using helpful scaffolds while building foundations — your effort still counts."
    )


def should_prefer_lighter_help(
    *,
    adi: Optional[float],
    topic_score: Optional[float] = None,
    trend: str = "unknown",
) -> bool:
    if adi is None:
        return False
    try:
        v = float(adi)
    except (TypeError, ValueError):
        return False
    score = float(topic_score) if topic_score is not None else None
    if v < 0.32 and trend != "rising":
        return True
    if v < 0.45 and score is not None and score >= 60:
        return True
    if trend == "falling" and v < 0.5:
        return True
    if score is not None and score >= 70 and v >= 0.4:
        return True
    return False


def _empty(
    *,
    sample_count: int = 0,
    topic_score: Optional[float] = None,
    reason: str = "",
) -> Dict[str, Any]:
    return {
        "version": ADI_VERSION,
        "value": None,
        "pct": None,
        "independence": None,
        "independencePct": None,
        "band": "unknown",
        "trend": "unknown",
        "sampleCount": sample_count,
        "window": 0,
        "solidIndependentCount": 0,
        "helpedSuccessCount": 0,
        "topicScore": topic_score,
        "preferLighterHelp": False,
        "ladderCap": LEVEL_EASIER,
        "copy": None,
        "digestCopy": None,
        "reliable": False,
        "reason": reason,
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def compute_adi(
    turns: Optional[List[Dict[str, Any]]] = None,
    *,
    window: int = ADI_WINDOW,
    min_samples: int = ADI_MIN_SAMPLES,
    topic_score: Optional[float] = None,
    prior_adi: Optional[float] = None,
) -> Dict[str, Any]:
    turns = list(turns or [])
    graded = [
        t
        for t in turns
        if str((t or {}).get("correctness") or "").lower()
        in ("correct", "partial", "incorrect")
    ]
    pool = graded if graded else turns
    windowed = pool[-window:]
    weights = [assistance_weight_for_turn(t) for t in windowed]
    n = len(weights)
    if n < min_samples:
        return _empty(sample_count=n, topic_score=topic_score, reason="insufficient_samples")

    raw = sum(weights) / max(1, len(weights))
    value = raw
    if prior_adi is not None:
        try:
            p = float(prior_adi)
            if p == p:
                value = p * 0.35 + raw * 0.65
        except (TypeError, ValueError):
            pass
    value = round(_clamp01(value), 3)
    independence = round(1.0 - value, 3)
    trend = adi_trend_from_weights(weights)
    band = adi_band(value)
    ts = float(topic_score) if topic_score is not None else None

    solid = 0
    helped = 0
    for t in windowed:
        c = str((t or {}).get("correctness") or "").lower()
        w = assistance_weight_for_turn(t)
        if c in ("correct", "partial") and w < 0.22:
            solid += 1
        if c in ("correct", "partial") and w >= 0.35:
            helped += 1

    prefer = should_prefer_lighter_help(adi=value, topic_score=ts, trend=trend)
    return {
        "version": ADI_VERSION,
        "value": value,
        "pct": int(round(value * 100)),
        "independence": independence,
        "independencePct": int(round(independence * 100)),
        "band": band,
        "trend": trend,
        "sampleCount": n,
        "window": len(windowed),
        "solidIndependentCount": solid,
        "helpedSuccessCount": helped,
        "topicScore": ts,
        "preferLighterHelp": prefer,
        "ladderCap": LEVEL_EXAMPLE if prefer else LEVEL_EASIER,
        "copy": adi_independence_copy(adi=value, topic_score=ts, trend=trend, for_digest=False),
        "digestCopy": adi_independence_copy(
            adi=value, topic_score=ts, trend=trend, for_digest=True
        ),
        "reliable": True,
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def turns_from_exchange_events(events: List[Any]) -> List[Dict[str, Any]]:
    """
    Build turn samples from LearningEvent rows or payload dicts (turn.exchange).
    """
    out: List[Dict[str, Any]] = []
    for ev in events or []:
        if isinstance(ev, dict):
            payload = ev.get("payload") or ev
        else:
            payload = getattr(ev, "payload", None) or {}
        signals = payload.get("signals") or {}
        correctness = (
            signals.get("correctness")
            or payload.get("correctness")
            or ""
        )
        level = (
            signals.get("interventionLevel")
            or payload.get("interventionLevel")
            or 0
        )
        active = bool(
            signals.get("interventionActive")
            or payload.get("interventionActive")
            or (payload.get("interventionStatus") == "active")
        )
        out.append(
            {
                "correctness": correctness,
                "isHintRequest": bool(
                    signals.get("isHintRequest") or payload.get("isHintRequest")
                ),
                "interventionLevel": level,
                "interventionActive": active,
                "scaffoldingBias": signals.get("scaffoldingBias")
                or payload.get("scaffoldingBias")
                or 0,
            }
        )
    return out


def compute_adi_from_events(
    events: List[Any],
    *,
    topic_score: Optional[float] = None,
    prior_adi: Optional[float] = None,
) -> Dict[str, Any]:
    return compute_adi(
        turns_from_exchange_events(events),
        topic_score=topic_score,
        prior_adi=prior_adi,
    )


def apply_adi_ladder_preference(
    level: int,
    adi_result: Optional[Dict[str, Any]] = None,
    *,
    manual: bool = False,
    escalate: bool = False,
    auto_enter: bool = False,
) -> int:
    rank = _normalize_level(level)
    if not adi_result or not adi_result.get("reliable") or manual or escalate:
        return rank
    if not adi_result.get("preferLighterHelp"):
        return rank
    if auto_enter:
        return min(rank, LEVEL_GUIDE)
    cap = _normalize_level(adi_result.get("ladderCap") or LEVEL_EXAMPLE)
    if rank > cap:
        return max(LEVEL_MICRO, min(rank - 1, cap))
    return rank
