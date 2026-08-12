"""
Parent weekly digests from learning events (Epic A5).

Principles:
- Clarity for families; never shame the learner
- Celebrate effort and persistence, not only accuracy
- Built from real LearningEvent / LessonSession / mastery data
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.html import escape

from learning.models import (
    LearningEvent,
    LearningEventType,
    LearningProfile,
    LessonSession,
    ParentDigest,
    SkillMastery,
    TopicMastery,
)
from students.models import StudentProfile


def week_window(now=None) -> Tuple[Any, Any]:
    """
    Rolling 7-day window aligned to local midnights so regenerate is
    idempotent within a calendar day (unique constraint on period).

    period_start: 00:00 six days ago (inclusive)
    period_end:   00:00 tomorrow (exclusive end-of-today)
    """
    from datetime import datetime, time as dtime

    now = now or timezone.now()
    end_date = timezone.localtime(now).date()
    tz = timezone.get_current_timezone()
    naive_end = datetime.combine(end_date + timedelta(days=1), dtime.min)
    naive_start = datetime.combine(end_date - timedelta(days=6), dtime.min)
    period_end = timezone.make_aware(naive_end, tz)
    period_start = timezone.make_aware(naive_start, tz)
    return period_start, period_end


def build_digest_summary(
    student: StudentProfile,
    period_start,
    period_end,
) -> Dict[str, Any]:
    """Aggregate learning signals for the period."""
    sessions = list(
        LessonSession.objects.filter(
            student=student,
            started_at__gte=period_start,
            started_at__lt=period_end,
        ).order_by("-started_at")
    )
    events = LearningEvent.objects.filter(
        student=student,
        timestamp__gte=period_start,
        timestamp__lt=period_end,
    )

    session_count = len(sessions)
    total_ms = sum(s.duration_ms or 0 for s in sessions)
    total_turns = sum(s.turn_count or 0 for s in sessions)

    # Topic focus from sessions
    topic_counts: Counter = Counter()
    subject_counts: Counter = Counter()
    for s in sessions:
        if s.topic:
            topic_counts[s.topic] += 1
        if s.subject:
            subject_counts[s.subject] += 1

    # Event tallies
    type_counts = Counter(
        events.values_list("event_type", flat=True)
    )
    exchanges = type_counts.get(LearningEventType.TURN_EXCHANGE, 0)
    hints = type_counts.get(LearningEventType.HINT_REQUESTED, 0)
    interventions = type_counts.get(LearningEventType.INTERVENTION_ENTERED, 0)
    homework = type_counts.get("behavior.manipulative_used", 0)

    # Correctness from turn payloads
    correct = partial = incorrect = 0
    for ev in events.filter(event_type=LearningEventType.TURN_EXCHANGE):
        payload = ev.payload or {}
        signals = payload.get("signals") or {}
        c = signals.get("correctness") or payload.get("correctness") or ""
        if c == "correct":
            correct += 1
        elif c == "partial":
            partial += 1
        elif c == "incorrect":
            incorrect += 1

    graded = correct + partial + incorrect
    accuracy = round(correct / graded, 3) if graded else None

    # Mastery hotspots
    profile = LearningProfile.objects.filter(student=student).first()
    strengths: List[Dict[str, Any]] = []
    focus: List[Dict[str, Any]] = []
    if profile:
        for m in profile.mastery_entries.order_by("-score")[:5]:
            if m.score >= 70 and m.attempts >= 2:
                strengths.append(
                    {"topic": m.topic, "subject": m.subject, "score": round(m.score)}
                )
        for m in profile.mastery_entries.order_by("score")[:5]:
            if m.score < 55 and m.attempts >= 1:
                focus.append(
                    {"topic": m.topic, "subject": m.subject, "score": round(m.score)}
                )
        # Skill sparks if present
        skill_glow = []
        for sm in profile.skill_masteries.select_related("skill").order_by(
            "-score"
        )[:4]:
            skill_glow.append(
                {
                    "name": sm.skill.label,
                    "score": round(sm.score),
                    "state": sm.state,
                }
            )
    else:
        skill_glow = []

    top_topics = [
        {"topic": t, "sessions": n} for t, n in topic_counts.most_common(5)
    ]
    top_subjects = [
        {"subject": s, "sessions": n} for s, n in subject_counts.most_common(4)
    ]

    # Struggle signal: interventions + incorrect without shame framing
    struggle_hotspots = []
    if interventions:
        struggle_hotspots.append(
            {
                "kind": "guide_mode",
                "count": interventions,
                "note": "Used step-by-step help — a healthy learning strategy",
            }
        )
    for f in focus[:3]:
        struggle_hotspots.append(
            {
                "kind": "focus_topic",
                "topic": f["topic"],
                "subject": f.get("subject"),
                "score": f["score"],
                "note": "Worth gentle practice next week",
            }
        )

    return {
        "studentName": student.name,
        "grade": student.grade,
        "periodStart": period_start.isoformat(),
        "periodEnd": period_end.isoformat(),
        "sessions": session_count,
        "timeOnTaskMs": total_ms,
        "timeOnTaskLabel": _fmt_duration(total_ms),
        "exchanges": exchanges or total_turns,
        "hints": hints,
        "interventionsEntered": interventions,
        "correct": correct,
        "partial": partial,
        "incorrect": incorrect,
        "accuracy": accuracy,
        "topTopics": top_topics,
        "topSubjects": top_subjects,
        "strengths": strengths[:4],
        "focusAreas": focus[:4],
        "skillSparks": skill_glow,
        "struggleHotspots": struggle_hotspots,
        "eventCounts": dict(type_counts),
        "active": session_count > 0 or exchanges > 0,
    }


def render_digest_copy(summary: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Return (headline, plain_text, html) — warm, clear, non-shaming.
    """
    name = summary.get("studentName") or "Your learner"
    sessions = summary.get("sessions") or 0
    time_label = summary.get("timeOnTaskLabel") or "0m"
    exchanges = summary.get("exchanges") or 0

    if not summary.get("active"):
        headline = f"{name} is ready when you are"
        body = (
            f"Hi there,\n\n"
            f"This week Kindling didn't record active lessons for {name}. "
            f"That's completely okay — rest weeks are part of learning.\n\n"
            f"When you're ready, a short session on a favorite topic can rebuild momentum. "
            f"We'll cheer for effort, not perfection.\n\n"
            f"— Kindling\n"
        )
        html = _html_wrap(
            headline,
            f"<p>This week Kindling didn't record active lessons for <strong>{escape(name)}</strong>. "
            f"That's completely okay — rest weeks are part of learning.</p>"
            f"<p>When you're ready, a short session on a favorite topic can rebuild momentum. "
            f"We celebrate effort, not perfection.</p>",
        )
        return headline, body, html

    headline = f"{name}'s week with Kindling"
    if sessions >= 3:
        headline = f"{name} kept a strong learning rhythm"
    elif sessions == 1:
        headline = f"{name} showed up for learning this week"

    lines = [
        f"Hi there,",
        "",
        f"Here's a clear snapshot of {name}'s week with Kindling — focused on progress and effort.",
        "",
        f"• Lessons: {sessions}",
        f"• Time learning: {time_label}",
        f"• Practice exchanges: {exchanges}",
    ]

    acc = summary.get("accuracy")
    if acc is not None:
        lines.append(
            f"• Practice accuracy (when answers were graded): about {int(acc * 100)}%"
        )
        lines.append(
            "  (Accuracy is just one signal — asking for hints and revisiting hard ideas is healthy.)"
        )

    strengths = summary.get("strengths") or []
    if strengths:
        bits = ", ".join(
            f"{s.get('topic')} (~{s.get('score')}%)" for s in strengths[:3]
        )
        lines.extend(["", f"Growing strengths: {bits}"])

    focus = summary.get("focusAreas") or []
    if focus:
        bits = ", ".join(f.get("topic") for f in focus[:3])
        lines.extend(
            [
                "",
                f"Gentle next steps: {bits}",
                "These are opportunities for short, low-pressure practice — not red flags.",
            ]
        )

    skills = summary.get("skillSparks") or []
    if skills:
        bits = ", ".join(
            f"{s.get('name')} ({s.get('score')}%)" for s in skills[:3]
        )
        lines.extend(["", f"Skill sparks: {bits}"])

    interventions = summary.get("interventionsEntered") or 0
    if interventions:
        lines.extend(
            [
                "",
                f"{name} used step-by-step guide mode {interventions} time"
                f"{'s' if interventions != 1 else ''}. "
                "That's a positive sign of persistence, not a problem.",
            ]
        )

    top = summary.get("topTopics") or []
    if top:
        lines.extend(
            [
                "",
                "Most-visited topics: "
                + ", ".join(t.get("topic") for t in top[:4]),
            ]
        )

    lines.extend(
        [
            "",
            "Thank you for supporting their learning. Kindling will keep adapting quietly "
            "and celebrating progress.",
            "",
            "— Kindling",
            "",
        ]
    )
    body = "\n".join(lines)

    # HTML version
    parts = [
        f"<p>Here's a clear snapshot of <strong>{escape(name)}</strong>'s week — "
        f"focused on progress and effort.</p>",
        "<ul>",
        f"<li><strong>Lessons:</strong> {sessions}</li>",
        f"<li><strong>Time learning:</strong> {escape(time_label)}</li>",
        f"<li><strong>Practice exchanges:</strong> {exchanges}</li>",
    ]
    if acc is not None:
        parts.append(
            f"<li><strong>Graded accuracy:</strong> about {int(acc * 100)}% "
            f"<em>(one signal among many)</em></li>"
        )
    parts.append("</ul>")
    if strengths:
        parts.append(
            "<p><strong>Growing strengths:</strong> "
            + escape(", ".join(s.get("topic", "") for s in strengths[:3]))
            + "</p>"
        )
    if focus:
        parts.append(
            "<p><strong>Gentle next steps:</strong> "
            + escape(", ".join(f.get("topic", "") for f in focus[:3]))
            + " — short, low-pressure practice, not red flags.</p>"
        )
    if interventions:
        parts.append(
            f"<p>{escape(name)} used step-by-step guide mode {interventions}× — "
            f"a sign of persistence.</p>"
        )
    parts.append(
        "<p>Thank you for supporting their learning.</p><p>— Kindling</p>"
    )
    html = _html_wrap(headline, "".join(parts))
    return headline, body, html


def _html_wrap(headline: str, inner: str) -> str:
    return (
        f'<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;'
        f'line-height:1.5;color:#1F3A34;max-width:560px">'
        f"<h1 style='font-size:1.25rem'>{escape(headline)}</h1>{inner}</body></html>"
    )


def _fmt_duration(ms: int) -> str:
    if not ms:
        return "0m"
    minutes = round(ms / 60000)
    if minutes < 60:
        return f"{minutes}m"
    h = minutes // 60
    m = minutes % 60
    return f"{h}h {m}m" if m else f"{h}h"


@transaction.atomic
def generate_digest_for_student(
    student: StudentProfile,
    *,
    period_start=None,
    period_end=None,
    force: bool = False,
) -> ParentDigest:
    """Create or refresh a digest for the period. Does not deliver."""
    if period_start is None or period_end is None:
        period_start, period_end = week_window()

    existing = ParentDigest.objects.filter(
        student=student,
        period_start=period_start,
        period_end=period_end,
    ).first()
    if existing and existing.status == ParentDigest.Status.SENT and not force:
        return existing

    summary = build_digest_summary(student, period_start, period_end)
    headline, body_text, body_html = render_digest_copy(summary)

    if existing:
        digest = existing
        digest.summary = summary
        digest.headline = headline
        digest.body_text = body_text
        digest.body_html = body_html
        digest.status = ParentDigest.Status.DRAFT
        digest.error = ""
        digest.save()
    else:
        digest = ParentDigest.objects.create(
            student=student,
            period_start=period_start,
            period_end=period_end,
            summary=summary,
            headline=headline,
            body_text=body_text,
            body_html=body_html,
            status=ParentDigest.Status.DRAFT,
        )
    return digest


def deliver_digest(
    digest: ParentDigest,
    *,
    dry_run: bool = False,
    channel: Optional[str] = None,
) -> ParentDigest:
    """
    Deliver digest: prefer email when configured; always keep in-app record.
    dry_run: mark as sent without email (still saves draft content).
    """
    student = digest.student
    recipient = student.digest_recipient()
    digest.recipient_email = recipient or ""

    if not student.digest_opt_in and not dry_run:
        digest.status = ParentDigest.Status.SKIPPED
        digest.error = "digest_opt_in is false"
        digest.channel = ParentDigest.Channel.IN_APP
        digest.save()
        return digest

    # Choose channel
    use_console = getattr(settings, "EMAIL_BACKEND", "").endswith("console")
    want_email = bool(recipient) and not dry_run
    if channel:
        chosen = channel
    elif dry_run:
        chosen = ParentDigest.Channel.IN_APP
    elif want_email and use_console:
        chosen = ParentDigest.Channel.CONSOLE
    elif want_email:
        chosen = ParentDigest.Channel.EMAIL
    else:
        chosen = ParentDigest.Channel.IN_APP

    digest.channel = chosen

    if chosen in (ParentDigest.Channel.EMAIL, ParentDigest.Channel.CONSOLE):
        try:
            send_mail(
                subject=digest.headline or "Kindling weekly update",
                message=digest.body_text,
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "noreply@kindling.local"
                ),
                recipient_list=[recipient],
                html_message=digest.body_html or None,
                fail_silently=False,
            )
            digest.status = ParentDigest.Status.SENT
            digest.sent_at = timezone.now()
            digest.error = ""
        except Exception as exc:
            digest.status = ParentDigest.Status.FAILED
            digest.error = f"{type(exc).__name__}: {exc}"
    else:
        # In-app only (or dry-run)
        digest.status = ParentDigest.Status.SENT
        digest.sent_at = timezone.now()
        digest.error = ""

    digest.save()
    return digest


def run_weekly_digests(*, dry_run: bool = False, force: bool = False) -> Dict[str, Any]:
    """
    Generate + deliver digests for all opted-in students (or all onboarded if force).
    """
    start, end = week_window()
    if force:
        qs = StudentProfile.objects.filter(is_onboarded=True)
    else:
        qs = StudentProfile.objects.filter(is_onboarded=True, digest_opt_in=True)

    generated = 0
    sent = 0
    skipped = 0
    failed = 0
    digests = []

    for student in qs.select_related("user"):
        digest = generate_digest_for_student(
            student, period_start=start, period_end=end, force=True
        )
        generated += 1
        # dry_run still generates; delivery skips real email
        digest = deliver_digest(digest, dry_run=dry_run)
        digests.append(digest.pk)
        if digest.status == ParentDigest.Status.SENT:
            sent += 1
        elif digest.status == ParentDigest.Status.SKIPPED:
            skipped += 1
        elif digest.status == ParentDigest.Status.FAILED:
            failed += 1

    return {
        "ok": True,
        "job": "weekly_digest",
        "dry_run": dry_run,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "candidates": qs.count(),
        "generated": generated,
        "sent": sent,
        "skipped": skipped,
        "failed": failed,
        "digest_ids": digests[:50],
    }


def digest_to_api(digest: ParentDigest) -> Dict[str, Any]:
    return {
        "id": digest.pk,
        "studentId": digest.student_id,
        "periodStart": digest.period_start.isoformat(),
        "periodEnd": digest.period_end.isoformat(),
        "headline": digest.headline,
        "bodyText": digest.body_text,
        "bodyHtml": digest.body_html,
        "summary": digest.summary or {},
        "status": digest.status,
        "channel": digest.channel,
        "recipientEmail": digest.recipient_email or None,
        "sentAt": digest.sent_at.isoformat() if digest.sent_at else None,
        "createdAt": digest.created_at.isoformat() if digest.created_at else None,
    }
