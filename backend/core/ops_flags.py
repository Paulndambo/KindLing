"""Create privacy-preserving internal support flags from existing signals."""

from .models import OpsReviewFlag, SafetyEvent


DISTRESS_CATEGORIES = {"self_harm", "abuse", "acute_distress"}


def flag_safety_distress(event: SafetyEvent) -> OpsReviewFlag | None:
    """Flag high-severity distress without copying any free-text content."""
    if event.severity != SafetyEvent.Severity.HIGH or event.category not in DISTRESS_CATEGORIES:
        return None
    return OpsReviewFlag.objects.get_or_create(
        trigger_key=f"safety-event:{event.pk}",
        defaults={
            "category": OpsReviewFlag.Category.DISTRESS,
            "severity": SafetyEvent.Severity.HIGH,
            "session_id": event.session_id,
            "user_id": event.user_id,
            "safety_event": event,
            "details": {
                "safetyEventId": event.pk,
                "code": event.code,
                "component": event.component,
                "ageBand": event.age_band,
            },
        },
    )[0]


def flag_repeated_learning_difficulty(session) -> OpsReviewFlag | None:
    """Flag a session after at least three incorrect graded turns in its last five."""
    recent = list(
        session.turns.exclude(correctness="")
        .exclude(is_hint_request=True)
        .order_by("-index")[:5]
    )
    incorrect = [turn for turn in recent if turn.correctness == "incorrect"]
    if len(incorrect) < 3:
        return None
    trigger_index = max(turn.index for turn in incorrect)
    return OpsReviewFlag.objects.get_or_create(
        trigger_key=f"session:{session.session_id}:repeated-fail",
        defaults={
            "category": OpsReviewFlag.Category.REPEATED_FAIL,
            "severity": SafetyEvent.Severity.INFO,
            "session_id": session.session_id,
            "user_id": session.student.user_id if session.student_id else None,
            "details": {
                "subject": session.subject[:160],
                "topic": session.topic[:200],
                "incorrectGradedTurns": len(incorrect),
                "sampleSize": len(recent),
                "triggerTurnIndex": trigger_index,
            },
        },
    )[0]
