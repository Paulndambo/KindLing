"""Reliability gates shared by learning analytics and mastery updates."""

SIGNAL_RELIABILITY_THRESHOLD = 0.65
GRADED_CORRECTNESS = {"correct", "partial", "incorrect"}


def correctness_evidence(signals):
    signals = signals or {}
    evidence = signals.get("signalEvidence") or {}
    correctness = signals.get("correctness") or "unknown"
    correctness_evidence = evidence.get("correctness") or {}
    source = signals.get("gradeSource")
    if source in {"assessment", "multistep", "multistep_step"}:
        confidence = 1.0
    elif correctness_evidence.get("source") == "math_verifier":
        confidence = correctness_evidence.get("confidence", 0)
    else:
        confidence = correctness_evidence.get(
            "confidence", signals.get("correctnessConfidence", 0)
        )
    try:
        confidence = float(confidence or 0)
    except (TypeError, ValueError):
        confidence = 0
    reliable = (
        correctness in GRADED_CORRECTNESS
        and confidence >= SIGNAL_RELIABILITY_THRESHOLD
    )
    return reliable, confidence


def affect_is_reliable(signals):
    signals = signals or {}
    evidence = signals.get("signalEvidence") or {}
    try:
        confidence = float((evidence.get("affect") or {}).get("confidence") or 0)
    except (TypeError, ValueError):
        confidence = 0
    return confidence >= SIGNAL_RELIABILITY_THRESHOLD


def learner_confidence_value(signals):
    evidence = ((signals or {}).get("signalEvidence") or {}).get(
        "learnerConfidence"
    ) or {}
    try:
        confidence = float(evidence.get("confidence") or 0)
        value = evidence.get("value")
        return (
            float(value)
            if value is not None and confidence >= SIGNAL_RELIABILITY_THRESHOLD
            else None
        )
    except (TypeError, ValueError):
        return None
