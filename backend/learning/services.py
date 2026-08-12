"""
Server-side learning profile updates.

Mirrors frontend profileStore.js so the API can recompute mastery even when
only events (not full snapshots) are posted.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from students.models import StudentProfile

from .models import (
    Affect,
    Correctness,
    LearningEvent,
    LearningEventType,
    LearningProfile,
    LessonSession,
    Misconception,
    SessionTurn,
    TopicMastery,
)

DEFAULT_TOTALS = {
    "sessions": 0,
    "exchanges": 0,
    "correct": 0,
    "partial": 0,
    "incorrect": 0,
    "hints": 0,
    "questionsAsked": 0,
    "totalResponseMs": 0,
    "responseSamples": 0,
}

DEFAULT_DELIVERY = {
    "visual": 0,
    "story": 0,
    "step_by_step": 0,
    "energetic": 0,
}

DEFAULT_BEHAVIOR = {
    "hintRate": 0,
    "avgResponseMs": None,
    "shortAnswerRate": 0,
    "voiceInputCount": 0,
    "sessionRestarts": 0,
}

ROLLING_MAX = 40


def empty_profile_dict(student_id: str = "anonymous") -> dict:
    return {
        "version": 1,
        "studentId": student_id,
        "updatedAt": timezone.now().isoformat(),
        "totals": deepcopy(DEFAULT_TOTALS),
        "mastery": {},
        "misconceptions": {},
        "deliveryPreferences": deepcopy(DEFAULT_DELIVERY),
        "affectHistory": [],
        "engagementHistory": [],
        "confidenceHistory": [],
        "strengths": [],
        "focusAreas": [],
        "behavior": deepcopy(DEFAULT_BEHAVIOR),
        "lastSession": None,
    }


def topic_key(subject: str | None, topic: str | None) -> str:
    return f"{subject or 'General'}::{topic or 'General'}"


def push_rolling(arr: list, value: Any, max_len: int = ROLLING_MAX) -> list:
    next_arr = list(arr or []) + [value]
    return next_arr[-max_len:] if len(next_arr) > max_len else next_arr


def parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        if timezone.is_naive(value):
            return timezone.make_aware(value, timezone.utc)
        return value
    if not value:
        return timezone.now()
    dt = parse_datetime(str(value))
    if dt is None:
        return timezone.now()
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.utc)
    return dt


def resolve_student(
    user=None, client_student_id: str = "", student_id: int | None = None
) -> StudentProfile | None:
    if student_id:
        qs = StudentProfile.objects.filter(pk=student_id)
        if user:
            qs = qs.filter(user=user)
        return qs.first()
    if user:
        try:
            return user.profile
        except StudentProfile.DoesNotExist:
            return None
    return None


def get_or_create_profile(
    student: StudentProfile | None = None,
    client_student_id: str = "",
) -> LearningProfile:
    if student:
        profile, _ = LearningProfile.objects.get_or_create(
            student=student,
            defaults={
                "client_student_id": client_student_id
                or student.name.lower().replace(" ", "_"),
                "totals": deepcopy(DEFAULT_TOTALS),
                "delivery_preferences": deepcopy(DEFAULT_DELIVERY),
                "behavior": deepcopy(DEFAULT_BEHAVIOR),
            },
        )
        return profile

    cid = client_student_id or "anonymous"
    profile = LearningProfile.objects.filter(
        student__isnull=True, client_student_id=cid
    ).first()
    if profile:
        return profile
    return LearningProfile.objects.create(
        client_student_id=cid,
        totals=deepcopy(DEFAULT_TOTALS),
        delivery_preferences=deepcopy(DEFAULT_DELIVERY),
        behavior=deepcopy(DEFAULT_BEHAVIOR),
    )


def apply_exchange_to_profile_model(
    profile: LearningProfile,
    subject: str,
    topic: str,
    signals: dict,
) -> LearningProfile:
    """Fold one analyzed exchange into LearningProfile + related models."""
    totals = {**DEFAULT_TOTALS, **(profile.totals or {})}
    behavior = {**DEFAULT_BEHAVIOR, **(profile.behavior or {})}
    delivery = {**DEFAULT_DELIVERY, **(profile.delivery_preferences or {})}

    totals["exchanges"] = totals.get("exchanges", 0) + 1
    correctness = (signals or {}).get("correctness") or Correctness.UNKNOWN

    if correctness == Correctness.CORRECT:
        totals["correct"] = totals.get("correct", 0) + 1
    elif correctness == Correctness.PARTIAL:
        totals["partial"] = totals.get("partial", 0) + 1
    elif correctness == Correctness.INCORRECT:
        totals["incorrect"] = totals.get("incorrect", 0) + 1

    if signals.get("isHintRequest"):
        totals["hints"] = totals.get("hints", 0) + 1
    if signals.get("isQuestion"):
        totals["questionsAsked"] = totals.get("questionsAsked", 0) + 1

    response_ms = signals.get("responseMs")
    if response_ms is not None:
        totals["totalResponseMs"] = totals.get("totalResponseMs", 0) + int(response_ms)
        totals["responseSamples"] = totals.get("responseSamples", 0) + 1
        samples = totals["responseSamples"] or 1
        behavior["avgResponseMs"] = round(totals["totalResponseMs"] / samples)

    if signals.get("inputModality") == "voice":
        behavior["voiceInputCount"] = behavior.get("voiceInputCount", 0) + 1

    # Mastery row
    key = topic_key(subject, topic)
    mastery, _ = TopicMastery.objects.get_or_create(
        profile=profile,
        topic_key=key,
        defaults={"subject": subject or "General", "topic": topic or "General", "score": 40},
    )
    mastery.attempts += 1
    mastery.last_correctness = correctness
    confidence = float(signals.get("confidence") or 0.5)

    if correctness == Correctness.CORRECT:
        mastery.correct += 1
        mastery.score = min(98, mastery.score + 8 + confidence * 4)
    elif correctness == Correctness.PARTIAL:
        mastery.score = min(95, mastery.score + 3)
    elif correctness == Correctness.INCORRECT:
        mastery.incorrect += 1
        mastery.score = max(5, mastery.score - 6 - (1 - confidence) * 3)
    elif signals.get("isHintRequest"):
        mastery.hints += 1
        mastery.score = max(5, mastery.score - 2)
    mastery.save()

    # Misconceptions
    for mc in signals.get("misconceptions") or []:
        mid = mc.get("id") or mc.get("label")
        if not mid:
            continue
        obj, _ = Misconception.objects.get_or_create(
            profile=profile,
            misconception_id=mid,
            defaults={"label": mc.get("label") or mid, "count": 0, "subjects": {}},
        )
        obj.count += 1
        obj.label = mc.get("label") or obj.label
        obj.last_seen = timezone.now()
        subjects_map = dict(obj.subjects or {})
        subjects_map[subject or "General"] = subjects_map.get(subject or "General", 0) + 1
        obj.subjects = subjects_map
        obj.save()

    for pref in signals.get("deliveryPreferences") or []:
        if pref in delivery:
            delivery[pref] = delivery.get(pref, 0) + 1

    affect = signals.get("affect") or Affect.NEUTRAL
    profile.affect_history = push_rolling(profile.affect_history, affect)
    profile.engagement_history = push_rolling(
        profile.engagement_history, signals.get("engagement", 0.5)
    )
    profile.confidence_history = push_rolling(
        profile.confidence_history, signals.get("confidence", 0.5)
    )

    ex = totals.get("exchanges") or 1
    behavior["hintRate"] = round(totals.get("hints", 0) / ex, 3)
    short = sum(1 for e in (profile.engagement_history or []) if (e or 0) < 0.35)
    hist_len = max(len(profile.engagement_history or []), 1)
    behavior["shortAnswerRate"] = round(short / hist_len, 3)

    ranked = list(profile.mastery_entries.all().order_by("-score"))
    profile.strengths = [
        {
            "subject": m.subject,
            "topic": m.topic,
            "score": round(m.score),
        }
        for m in ranked
        if m.score >= 70 and m.attempts >= 2
    ][:5]
    profile.focus_areas = [
        {
            "subject": m.subject,
            "topic": m.topic,
            "score": round(m.score),
        }
        for m in ranked
        if m.score < 55 and m.attempts >= 1
    ][:5]

    profile.totals = totals
    profile.behavior = behavior
    profile.delivery_preferences = delivery
    profile.save()
    return profile


def apply_session_start(profile: LearningProfile, session_meta: dict) -> LearningProfile:
    totals = {**DEFAULT_TOTALS, **(profile.totals or {})}
    totals["sessions"] = totals.get("sessions", 0) + 1
    profile.totals = totals
    profile.last_session = {
        "id": session_meta.get("sessionId"),
        "startedAt": session_meta.get("startedAt"),
        "subject": session_meta.get("subject"),
        "topic": session_meta.get("topic"),
    }
    profile.save()
    return profile


def apply_session_end(profile: LearningProfile, summary: dict) -> LearningProfile:
    last = dict(profile.last_session or {})
    last.update(summary or {})
    last["endedAt"] = timezone.now().isoformat()
    profile.last_session = last
    profile.save()
    return profile


def build_personalization_insights(
    profile: LearningProfile, subject: str = "", topic: str = ""
) -> dict:
    totals = profile.totals or {}
    exchanges = totals.get("exchanges") or 0
    if exchanges < 1:
        return {
            "summary": (
                "New or lightly observed learner — build trust, start gently, "
                "probe prior knowledge."
            ),
            "directives": [
                "Begin with a quick warm-up to gauge level.",
                "Watch for hesitation and offer a scaffold before frustration builds.",
            ],
            "stats": None,
        }

    key = topic_key(subject, topic)
    topic_mastery = profile.mastery_entries.filter(topic_key=key).first()
    recent_affect = (profile.affect_history or [])[-5:]
    eng_hist = profile.engagement_history or []
    conf_hist = profile.confidence_history or []
    avg_engagement = sum(eng_hist) / len(eng_hist) if eng_hist else 0.5
    avg_confidence = sum(conf_hist) / len(conf_hist) if conf_hist else 0.5

    frustrated = sum(1 for a in recent_affect if a == Affect.FRUSTRATED)
    hesitant = sum(1 for a in recent_affect if a == Affect.HESITANT)

    prefs = profile.delivery_preferences or {}
    top_prefs = [
        k
        for k, v in sorted(prefs.items(), key=lambda x: x[1], reverse=True)
        if v and v > 0
    ][:2]

    top_mc = list(profile.misconceptions.all().order_by("-count")[:3])
    behavior = profile.behavior or {}
    directives: list[str] = []

    if topic_mastery:
        if topic_mastery.score < 40:
            directives.append(
                "This topic is a struggle zone — use smaller steps, more scaffolds, "
                "and celebrate micro-wins."
            )
        elif topic_mastery.score > 75:
            directives.append(
                "Student shows strength here — stretch with a slightly harder "
                "variant after a quick check."
            )

    if frustrated >= 2:
        directives.append(
            "Recent frustration detected — slow down, normalize struggle, reduce cognitive load."
        )
    elif hesitant >= 2:
        directives.append(
            "Student often hesitates — invite thinking aloud and validate partial reasoning."
        )

    if (behavior.get("hintRate") or 0) > 0.35:
        directives.append(
            "High hint usage — offer lighter nudges first (questions, not answers)."
        )

    if "visual" in top_prefs:
        directives.append("Lean on visual models, drawings, and concrete representations.")
    if "story" in top_prefs:
        directives.append("Use story / real-world analogies tied to their interests.")
    if "step_by_step" in top_prefs:
        directives.append("Prefer clear numbered steps and one micro-question at a time.")

    if avg_engagement < 0.4:
        directives.append(
            "Engagement is low — shorten turns, add a curiosity spark, use their passions."
        )

    for mc in top_mc:
        directives.append(f"Watch for misconception: {mc.label} (seen {mc.count}×).")

    if not directives:
        directives.append("Maintain adaptive Socratic pace; reassess after each answer.")

    graded = (
        (totals.get("correct") or 0)
        + (totals.get("partial") or 0)
        + (totals.get("incorrect") or 0)
    )
    accuracy = round((totals.get("correct") or 0) / graded * 100) if graded else None

    summary_parts = [
        f"{exchanges} observed exchanges across {totals.get('sessions', 0)} sessions.",
        f"Recent accuracy signal ~{accuracy}%." if accuracy is not None else None,
        (
            f"Current topic mastery estimate: {round(topic_mastery.score)}/100."
            if topic_mastery
            else "No mastery data for this topic yet."
        ),
        (
            f"Avg confidence ~{round(avg_confidence * 100)}%, "
            f"engagement ~{round(avg_engagement * 100)}%."
        ),
    ]

    return {
        "summary": " ".join(p for p in summary_parts if p),
        "directives": directives,
        "stats": {
            "accuracy": accuracy,
            "topicMastery": round(topic_mastery.score) if topic_mastery else None,
            "avgEngagement": round(avg_engagement, 2),
            "avgConfidence": round(avg_confidence, 2),
            "hintRate": behavior.get("hintRate", 0),
            "focusAreas": profile.focus_areas or [],
            "strengths": profile.strengths or [],
            "topMisconceptions": [m.label for m in top_mc],
            "preferredDelivery": top_prefs,
        },
    }


def profile_to_api_dict(profile: LearningProfile) -> dict:
    """Serialize LearningProfile to the frontend profile shape."""
    mastery = {}
    for m in profile.mastery_entries.all():
        mastery[m.topic_key] = {
            "subject": m.subject,
            "topic": m.topic,
            "score": m.score,
            "attempts": m.attempts,
            "correct": m.correct,
            "incorrect": m.incorrect,
            "hints": m.hints,
            "lastCorrectness": m.last_correctness or None,
            "updatedAt": m.updated_at.isoformat() if m.updated_at else None,
        }

    misconceptions = {}
    for mc in profile.misconceptions.all():
        misconceptions[mc.misconception_id] = {
            "id": mc.misconception_id,
            "label": mc.label,
            "count": mc.count,
            "lastSeen": mc.last_seen.isoformat() if mc.last_seen else None,
            "subjects": mc.subjects or {},
        }

    student_id = (
        profile.client_student_id
        or (profile.student.name.lower().replace(" ", "_") if profile.student else "anonymous")
    )

    return {
        "version": profile.version,
        "studentId": student_id,
        "updatedAt": profile.updated_at.isoformat() if profile.updated_at else None,
        "totals": {**DEFAULT_TOTALS, **(profile.totals or {})},
        "mastery": mastery,
        "misconceptions": misconceptions,
        "deliveryPreferences": {
            **DEFAULT_DELIVERY,
            **(profile.delivery_preferences or {}),
        },
        "affectHistory": profile.affect_history or [],
        "engagementHistory": profile.engagement_history or [],
        "confidenceHistory": profile.confidence_history or [],
        "strengths": profile.strengths or [],
        "focusAreas": profile.focus_areas or [],
        "behavior": {**DEFAULT_BEHAVIOR, **(profile.behavior or {})},
        "lastSession": profile.last_session,
    }


@transaction.atomic
def ingest_events(
    events: list[dict],
    *,
    user=None,
    source: str = "kindling-web",
    schema_version: int = 1,
) -> dict:
    """
    Persist a batch of learning events and update sessions/profiles.
    Returns counts for the API response.
    """
    created = 0
    skipped = 0
    errors: list[str] = []

    for raw in events:
        try:
            event_id = raw.get("id") or ""
            if not event_id:
                skipped += 1
                continue
            if LearningEvent.objects.filter(client_event_id=event_id).exists():
                skipped += 1
                continue

            event_type = raw.get("type") or ""
            context = raw.get("context") or {}
            payload = raw.get("payload") or {}
            client_student_id = (
                context.get("studentId")
                or payload.get("studentId")
                or ""
            )
            session_id = (
                context.get("sessionId")
                or payload.get("sessionId")
                or ""
            )
            student = resolve_student(user=user, client_student_id=client_student_id)

            LearningEvent.objects.create(
                client_event_id=event_id,
                student=student,
                client_student_id=client_student_id,
                event_type=event_type,
                timestamp=parse_ts(raw.get("timestamp")),
                session_id=session_id or "",
                source=source,
                schema_version=schema_version,
                context=context,
                payload=payload,
            )
            created += 1

            profile = get_or_create_profile(student, client_student_id)

            if event_type == LearningEventType.SESSION_START:
                sid = payload.get("sessionId") or session_id
                started = parse_ts(raw.get("timestamp"))
                LessonSession.objects.update_or_create(
                    session_id=sid,
                    defaults={
                        "student": student,
                        "client_student_id": client_student_id,
                        "subject": payload.get("subject") or "",
                        "topic": payload.get("topic") or "",
                        "started_at": started,
                        "tools": payload.get("tools") or {},
                        "student_profile_snapshot": payload.get("studentSnapshot") or {},
                        "personalization": payload.get("personalization") or {},
                    },
                )
                apply_session_start(
                    profile,
                    {
                        "sessionId": sid,
                        "startedAt": started.isoformat(),
                        "subject": payload.get("subject"),
                        "topic": payload.get("topic"),
                    },
                )

            elif event_type == LearningEventType.TURN_EXCHANGE:
                sid = payload.get("sessionId") or session_id
                session, _ = LessonSession.objects.get_or_create(
                    session_id=sid or f"orphan_{event_id}",
                    defaults={
                        "student": student,
                        "client_student_id": client_student_id,
                        "subject": payload.get("subject") or "",
                        "topic": payload.get("topic") or "",
                        "started_at": parse_ts(raw.get("timestamp")),
                    },
                )
                signals = payload.get("signals") or {}
                turn_index = session.turn_count
                SessionTurn.objects.create(
                    session=session,
                    index=turn_index,
                    occurred_at=parse_ts(raw.get("timestamp")),
                    subject=payload.get("subject") or session.subject,
                    topic=payload.get("topic") or session.topic,
                    student_text=payload.get("studentText") or "",
                    tutor_text=payload.get("tutorText") or "",
                    input_modality=payload.get("inputModality")
                    or signals.get("inputModality")
                    or "text",
                    response_ms=payload.get("responseMs") or signals.get("responseMs"),
                    correctness=signals.get("correctness") or "",
                    affect=signals.get("affect") or "",
                    engagement=signals.get("engagement"),
                    confidence=signals.get("confidence"),
                    is_hint_request=bool(signals.get("isHintRequest")),
                    is_question=bool(signals.get("isQuestion")),
                    signals=signals,
                )
                session.turn_count = turn_index + 1
                running = payload.get("runningSession") or {}
                if running.get("counters"):
                    session.counters = running["counters"]
                if running.get("accuracy") is not None:
                    session.accuracy = running["accuracy"]
                session.subject = payload.get("subject") or session.subject
                session.topic = payload.get("topic") or session.topic
                session.save()

                apply_exchange_to_profile_model(
                    profile,
                    subject=payload.get("subject") or session.subject,
                    topic=payload.get("topic") or session.topic,
                    signals=signals,
                )

            elif event_type == LearningEventType.SESSION_END:
                sid = payload.get("sessionId") or session_id
                session = LessonSession.objects.filter(session_id=sid).first()
                if session:
                    session.ended_at = parse_ts(raw.get("timestamp"))
                    session.duration_ms = payload.get("durationMs")
                    session.turn_count = payload.get("turnCount") or session.turn_count
                    session.counters = payload.get("counters") or session.counters
                    session.tools = payload.get("tools") or session.tools
                    session.accuracy = payload.get("accuracy")
                    session.avg_engagement = payload.get("avgEngagement")
                    session.avg_confidence = payload.get("avgConfidence")
                    if payload.get("studentProfileSnapshot"):
                        session.student_profile_snapshot = payload[
                            "studentProfileSnapshot"
                        ]
                    session.subject = payload.get("subject") or session.subject
                    session.topic = payload.get("topic") or session.topic
                    session.save()

                    # Persist full turn list if provided (session end summary)
                    for t in payload.get("turns") or []:
                        idx = t.get("index", 0)
                        if session.turns.filter(index=idx).exists():
                            continue
                        sig = t.get("signals") or {}
                        SessionTurn.objects.create(
                            session=session,
                            index=idx,
                            occurred_at=parse_ts(t.get("at") or raw.get("timestamp")),
                            subject=t.get("subject") or "",
                            topic=t.get("topic") or "",
                            student_text=t.get("studentText") or "",
                            tutor_text=t.get("tutorText") or "",
                            input_modality=t.get("inputModality") or "text",
                            response_ms=sig.get("responseMs"),
                            correctness=sig.get("correctness") or "",
                            affect=sig.get("affect") or "",
                            engagement=sig.get("engagement"),
                            confidence=sig.get("confidence"),
                            is_hint_request=bool(sig.get("isHintRequest")),
                            is_question=bool(sig.get("isQuestion")),
                            signals=sig,
                        )

                apply_session_end(profile, payload)

            elif event_type == LearningEventType.PROFILE_SNAPSHOT:
                snap = payload.get("profile") or {}
                if snap:
                    profile.raw_snapshot = snap
                    if snap.get("totals"):
                        profile.totals = snap["totals"]
                    if snap.get("deliveryPreferences"):
                        profile.delivery_preferences = snap["deliveryPreferences"]
                    if snap.get("behavior"):
                        profile.behavior = snap["behavior"]
                    if "affectHistory" in snap:
                        profile.affect_history = snap["affectHistory"]
                    if "engagementHistory" in snap:
                        profile.engagement_history = snap["engagementHistory"]
                    if "confidenceHistory" in snap:
                        profile.confidence_history = snap["confidenceHistory"]
                    if "strengths" in snap:
                        profile.strengths = snap["strengths"]
                    if "focusAreas" in snap:
                        profile.focus_areas = snap["focusAreas"]
                    if "lastSession" in snap:
                        profile.last_session = snap["lastSession"]
                    profile.save()

                    for key, m in (snap.get("mastery") or {}).items():
                        TopicMastery.objects.update_or_create(
                            profile=profile,
                            topic_key=key,
                            defaults={
                                "subject": m.get("subject") or "General",
                                "topic": m.get("topic") or "General",
                                "score": m.get("score", 40),
                                "attempts": m.get("attempts", 0),
                                "correct": m.get("correct", 0),
                                "incorrect": m.get("incorrect", 0),
                                "hints": m.get("hints", 0),
                                "last_correctness": m.get("lastCorrectness") or "",
                            },
                        )
                    for mid, mc in (snap.get("misconceptions") or {}).items():
                        Misconception.objects.update_or_create(
                            profile=profile,
                            misconception_id=mc.get("id") or mid,
                            defaults={
                                "label": mc.get("label") or mid,
                                "count": mc.get("count", 0),
                                "last_seen": parse_ts(mc.get("lastSeen"))
                                if mc.get("lastSeen")
                                else None,
                                "subjects": mc.get("subjects") or {},
                            },
                        )

            elif event_type == LearningEventType.TOPIC_SWITCHED:
                sid = payload.get("sessionId") or session_id
                to = payload.get("to") or {}
                session = LessonSession.objects.filter(session_id=sid).first()
                if session and to:
                    session.subject = to.get("subject") or session.subject
                    session.topic = to.get("topic") or session.topic
                    counters = dict(session.counters or {})
                    counters["topicSwitches"] = counters.get("topicSwitches", 0) + 1
                    session.counters = counters
                    session.save()

        except Exception as exc:  # noqa: BLE001 — isolate bad events in a batch
            errors.append(f"{raw.get('id', '?')}: {exc}")

    return {"created": created, "skipped": skipped, "errors": errors}


def build_dashboard(student: StudentProfile | None) -> dict:
    """Aggregate dashboard stats for the student view."""
    if not student:
        return {
            "hasData": False,
            "weekStats": None,
            "masteryMap": [],
            "recentActivity": [],
            "strengths": [],
            "focusAreas": [],
            "confidenceHistory": [],
            "insights": None,
        }

    profile = LearningProfile.objects.filter(student=student).first()
    sessions = LessonSession.objects.filter(student=student).order_by("-started_at")[:20]

    now = timezone.now()
    week_ago = now - timezone.timedelta(days=7)
    two_weeks_ago = now - timezone.timedelta(days=14)

    this_week = LessonSession.objects.filter(
        student=student, started_at__gte=week_ago
    )
    last_week = LessonSession.objects.filter(
        student=student, started_at__gte=two_weeks_ago, started_at__lt=week_ago
    )

    def week_block(qs):
        count = qs.count()
        duration = sum(s.duration_ms or 0 for s in qs)
        turns = sum(s.turn_count or 0 for s in qs)
        subjects = {}
        for s in qs:
            if s.subject:
                subjects[s.subject] = subjects.get(s.subject, 0) + 1
        subj_cap = " · ".join(f"{v} {k}" for k, v in list(subjects.items())[:3]) or "—"
        focus = qs.order_by("-started_at").first()
        avg_min = round((duration / count / 60000), 0) if count else 0
        return {
            "sessions": {"value": str(count), "cap": subj_cap},
            "time": {
                "value": _fmt_duration(duration),
                "cap": f"Avg. {int(avg_min)} min per session" if count else "No sessions",
            },
            "streak": {"value": f"{count} days" if count else "0 days", "cap": "This period"},
            "focus": {
                "value": focus.topic if focus else "—",
                "cap": focus.subject if focus else "Start a lesson",
            },
            "masteryDelta": _mastery_delta(profile),
            "questions": str(turns),
        }

    mastery_map = []
    if profile:
        for m in profile.mastery_entries.all().order_by("-updated_at")[:8]:
            level = int(round(m.score))
            segs = _mastery_segs(level)
            if level >= 75:
                status = "Strong"
            elif level >= 50:
                status = "In progress"
            else:
                status = "Building"
            mastery_map.append(
                {
                    "subject": m.subject,
                    "skill": m.topic,
                    "level": level,
                    "segs": segs,
                    "status": status,
                }
            )

    recent = []
    for s in sessions[:8]:
        when = _relative_when(s.started_at)
        tone = "good"
        if s.accuracy is not None and s.accuracy < 0.5:
            tone = "focus"
        detail_parts = []
        if s.accuracy is not None:
            detail_parts.append(f"Accuracy ~{int(s.accuracy * 100)}%")
        if s.turn_count:
            detail_parts.append(f"{s.turn_count} exchanges")
        recent.append(
            {
                "id": s.session_id,
                "when": when,
                "subject": s.subject or "Lesson",
                "title": s.topic or "Session",
                "detail": " · ".join(detail_parts) or "Completed a lesson session.",
                "tone": tone,
            }
        )

    strengths = (profile.strengths if profile else None) or []
    focus_areas = (profile.focus_areas if profile else None) or []
    # Normalize for dashboard cards
    strength_cards = [
        {
            "label": s.get("topic") or "Strength",
            "hint": (
                f"{s.get('subject', '')} · mastery ~{s.get('score', 0)}%"
                if s.get("subject")
                else f"Mastery ~{s.get('score', 0)}%"
            ),
        }
        for s in strengths
    ]
    focus_cards = [
        {
            "label": f.get("topic") or "Focus area",
            "hint": (
                f"{f.get('subject', '')} · needs practice (~{f.get('score', 0)}%)"
                if f.get("subject")
                else f"Needs practice (~{f.get('score', 0)}%)"
            ),
        }
        for f in focus_areas
    ]

    conf_hist = (profile.confidence_history if profile else None) or []
    conf_all = [int(round((c or 0) * 100)) for c in conf_hist]
    conf_this = conf_all[-7:] if conf_all else []
    conf_last = (
        conf_all[-14:-7]
        if len(conf_all) >= 14
        else (conf_all[:7] if len(conf_all) > 7 else list(conf_this))
    )
    conf_this = _pad_series(conf_this, 7, default=40)
    conf_last = _pad_series(conf_last, 7, default=40)

    insights = None
    if profile:
        insights = build_personalization_insights(profile)

    week_plan = _build_week_plan(student, focus_areas, mastery_map)
    totals = (profile.totals if profile else None) or deepcopy(DEFAULT_TOTALS)
    session_count = LessonSession.objects.filter(student=student).count()
    has_data = bool(
        session_count
        or (totals.get("exchanges") or 0) > 0
        or mastery_map
    )

    return {
        "hasData": has_data,
        "weekStats": {
            "this": week_block(this_week),
            "last": week_block(last_week),
        },
        "masteryMap": mastery_map,
        "recentActivity": recent,
        "strengths": strength_cards,
        "focusAreas": focus_cards,
        "confidenceHistory": {
            "this": conf_this,
            "last": conf_last,
        },
        "weekPlan": week_plan,
        "insights": insights,
        "profile": profile_to_api_dict(profile) if profile else None,
        "totals": totals,
    }


def _fmt_duration(ms: int) -> str:
    if not ms:
        return "0m"
    minutes = ms // 60000
    if minutes < 60:
        return f"{minutes}m"
    h, m = divmod(minutes, 60)
    return f"{h}h {m}m"


def _mastery_delta(profile: LearningProfile | None) -> str:
    if not profile:
        return "—"
    entries = list(profile.mastery_entries.all()[:5])
    if not entries:
        return "—"
    avg = sum(m.score for m in entries) / len(entries)
    # Placeholder delta until we store weekly snapshots
    return f"+{max(0, int(avg // 10))}%"


def _mastery_segs(level: int) -> list[str]:
    filled = min(6, max(0, level // 17))
    segs = []
    for i in range(6):
        if i < filled - 1:
            segs.append("on")
        elif i == filled - 1:
            segs.append("now")
        else:
            segs.append("")
    return segs


def _pad_series(values: list, length: int, default: int = 40) -> list:
    series = list(values or [])
    if not series:
        return [default] * length
    while len(series) < length:
        series.insert(0, series[0])
    return series[-length:]


def _build_week_plan(student, focus_areas: list, mastery_map: list) -> list[dict]:
    """Suggest next lessons from focus areas, low mastery, or curriculum topics."""
    days = ["Mon", "Wed", "Fri"]
    candidates: list[dict] = []

    for f in focus_areas or []:
        topic = f.get("topic")
        if not topic:
            continue
        candidates.append(
            {
                "title": topic,
                "tag": f.get("subject") or "Lesson",
                "text": (
                    f"Guided practice on {topic} — smaller steps and more "
                    "scaffolds until confidence climbs."
                ),
                "duration": "20 min",
            }
        )

    for m in mastery_map or []:
        if m.get("level", 100) >= 55:
            continue
        skill = m.get("skill")
        if not skill or any(c["title"] == skill for c in candidates):
            continue
        candidates.append(
            {
                "title": skill,
                "tag": m.get("subject") or "Lesson",
                "text": f"Build {skill} with visual models, then number-only checks.",
                "duration": "20 min",
            }
        )

    # Fall back to the student's curriculum topics
    if len(candidates) < 3 and student:
        for subject in student.subjects.prefetch_related("topics").all()[:4]:
            for topic in subject.topics.all()[:3]:
                if any(c["title"] == topic.name for c in candidates):
                    continue
                candidates.append(
                    {
                        "title": topic.name,
                        "tag": subject.name,
                        "text": (
                            f"Continue {topic.name} in {subject.name} at "
                            f"{student.name}'s pace."
                        ),
                        "duration": "25 min",
                    }
                )
                if len(candidates) >= 3:
                    break
            if len(candidates) >= 3:
                break

    plan = []
    for i, day in enumerate(days):
        if i < len(candidates):
            item = candidates[i]
            plan.append({"day": day, **item})
        else:
            plan.append(
                {
                    "day": day,
                    "title": "Open lesson",
                    "tag": "Kindling",
                    "text": "Start any subject to generate a personalized plan.",
                    "duration": "20 min",
                }
            )
    return plan


def _relative_when(dt: datetime | None) -> str:
    if not dt:
        return "Recently"
    now = timezone.now()
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.utc)
    delta = now - dt
    if delta.days == 0:
        return "Today"
    if delta.days == 1:
        return "Yesterday"
    if delta.days < 7:
        return f"{delta.days} days ago"
    return dt.strftime("%b %d")
