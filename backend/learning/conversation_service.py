"""
Topic conversation persistence — durable chat history for resume & journal.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from students.models import StudentProfile

from .models import (
    ConversationMessage,
    ConversationStatus,
    MessageRole,
    TopicConversation,
)


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
        return timezone.make_aware(dt, timezone.utc)
    return dt


def topic_key(subject: str | None, topic: str | None) -> str:
    return f"{subject or 'General'}::{topic or 'General'}"


def conversation_to_dict(
    conv: TopicConversation,
    include_messages: bool = True,
    include_snapshot: bool = True,
) -> dict:
    data = {
        "id": conv.client_id,
        "status": conv.status,
        "subject": conv.subject,
        "topic": conv.topic,
        "createdAt": conv.started_at.isoformat() if conv.started_at else None,
        "updatedAt": conv.updated_at.isoformat() if conv.updated_at else None,
        "endedAt": conv.ended_at.isoformat() if conv.ended_at else None,
        "title": conv.title or None,
        "summary": conv.summary or None,
        "highlights": conv.highlights or [],
        "nextStep": conv.next_step or None,
        "messageCount": conv.message_count,
        "apiHistory": conv.api_history or [],
        "previewText": conv.preview_text or None,
    }
    if include_snapshot:
        data["resumeSnapshot"] = conv.resume_snapshot or {}
    if include_messages:
        data["messages"] = [
            {
                "id": m.client_message_id,
                "role": m.role,
                "text": m.text,
                "kind": m.kind or None,
                "at": m.occurred_at.isoformat() if m.occurred_at else None,
            }
            for m in conv.messages.all()
        ]
    return data


def _preview_from_text(text: str, max_len: int = 180) -> str:
    cleaned = " ".join(str(text or "").split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1] + "…"


def update_resume_snapshot(
    conv: TopicConversation, snapshot: dict | None
) -> TopicConversation:
    """Merge resume snapshot (intervention, tools, personalization)."""
    if not snapshot or not isinstance(snapshot, dict):
        return conv
    current = dict(conv.resume_snapshot or {})
    # Shallow merge top-level keys; nested dicts replaced per key
    for key, value in snapshot.items():
        if value is None:
            current.pop(key, None)
        else:
            current[key] = value
    current["savedAt"] = timezone.now().isoformat()
    conv.resume_snapshot = current
    conv.save(update_fields=["resume_snapshot", "updated_at"])
    return conv


def list_continuable(
    student: StudentProfile | None,
    *,
    limit: int = 20,
) -> list[dict]:
    """
    Active conversations with real transcript content — for Continue cards.
    """
    if not student:
        return []
    qs = (
        TopicConversation.objects.filter(
            student=student,
            status=ConversationStatus.ACTIVE,
            message_count__gte=1,
        )
        .order_by("-updated_at")[:limit]
    )
    out = []
    for conv in qs:
        d = conversation_to_dict(conv, include_messages=False, include_snapshot=True)
        d["canContinue"] = True
        out.append(d)
    return out


def search_transcripts(
    student: StudentProfile | None,
    query: str,
    *,
    subject: str = "",
    topic: str = "",
    limit: int = 40,
) -> list[dict]:
    """
    Keyword search over message text for a student's conversations.
    Returns snippets suitable for student/family views (no internal API history).
    """
    if not student:
        return []
    q = (query or "").strip()
    if len(q) < 2:
        return []

    msg_qs = ConversationMessage.objects.filter(
        conversation__student=student,
        text__icontains=q,
    ).select_related("conversation")

    if subject:
        msg_qs = msg_qs.filter(conversation__subject__iexact=subject.strip())
    if topic:
        msg_qs = msg_qs.filter(conversation__topic__iexact=topic.strip())

    # Prefer tutor/child messages over system chrome
    msg_qs = msg_qs.exclude(role=MessageRole.SYSTEM).order_by("-occurred_at")[:limit]

    results = []
    for m in msg_qs:
        conv = m.conversation
        text = m.text or ""
        # Highlight window around first match
        lower = text.lower()
        idx = lower.find(q.lower())
        if idx < 0:
            snippet = _preview_from_text(text, 200)
        else:
            start = max(0, idx - 40)
            end = min(len(text), idx + len(q) + 80)
            snippet = text[start:end].strip()
            if start > 0:
                snippet = "…" + snippet
            if end < len(text):
                snippet = snippet + "…"

        results.append(
            {
                "messageId": m.client_message_id,
                "role": m.role,
                "snippet": snippet,
                "at": m.occurred_at.isoformat() if m.occurred_at else None,
                "conversationId": conv.client_id,
                "subject": conv.subject,
                "topic": conv.topic,
                "conversationStatus": conv.status,
                "conversationTitle": conv.title or None,
            }
        )
    return results


def get_topic_qs(student: StudentProfile | None, subject: str, topic: str):
    key = topic_key(subject, topic)
    qs = TopicConversation.objects.filter(topic_key=key)
    if student:
        qs = qs.filter(student=student)
    else:
        qs = qs.none()
    return qs.prefetch_related("messages")


def build_shelf(
    student: StudentProfile | None,
    subject: str,
    topic: str,
    client_student_id: str = "",
) -> dict:
    qs = get_topic_qs(student, subject, topic).order_by("-updated_at")
    conversations = [conversation_to_dict(c, include_messages=True) for c in qs[:40]]
    active = next((c for c in conversations if c["status"] == "active"), None)
    return {
        "version": 1,
        "studentId": client_student_id
        or (f"id_{student.id}" if student else "anonymous"),
        "subject": subject or "General",
        "topic": topic or "General",
        "activeConversationId": active["id"] if active else None,
        "conversations": conversations,
        "updatedAt": timezone.now().isoformat(),
        "source": "backend",
    }


@transaction.atomic
def upsert_conversation(
    *,
    student: StudentProfile | None,
    client_student_id: str,
    payload: dict[str, Any],
    deactivate_other_actives: bool = False,
) -> TopicConversation:
    client_id = payload["id"]
    subject = payload.get("subject") or "General"
    topic = payload.get("topic") or "General"
    key = topic_key(subject, topic)

    conv, created = TopicConversation.objects.get_or_create(
        client_id=client_id,
        defaults={
            "student": student,
            "client_student_id": client_student_id or "",
            "subject": subject,
            "topic": topic,
            "topic_key": key,
            "status": payload.get("status") or ConversationStatus.ACTIVE,
            "title": payload.get("title") or "",
            "summary": payload.get("summary") or "",
            "highlights": payload.get("highlights") or [],
            "next_step": payload.get("nextStep") or "",
            "api_history": payload.get("apiHistory") or [],
            "started_at": parse_ts(payload.get("createdAt")),
            "ended_at": parse_ts(payload["endedAt"])
            if payload.get("endedAt")
            else None,
            "message_count": payload.get("messageCount") or 0,
        },
    )

    if not created:
        conv.student = student or conv.student
        if client_student_id:
            conv.client_student_id = client_student_id
        conv.subject = subject
        conv.topic = topic
        conv.topic_key = key
        if "status" in payload and payload["status"]:
            conv.status = payload["status"]
        if "title" in payload:
            conv.title = payload.get("title") or ""
        if "summary" in payload:
            conv.summary = payload.get("summary") or ""
        if "highlights" in payload:
            conv.highlights = payload.get("highlights") or []
        if "nextStep" in payload:
            conv.next_step = payload.get("nextStep") or ""
        if "apiHistory" in payload and payload["apiHistory"] is not None:
            conv.api_history = payload["apiHistory"] or []
        if "resumeSnapshot" in payload and payload["resumeSnapshot"] is not None:
            conv.resume_snapshot = payload.get("resumeSnapshot") or {}
        if "previewText" in payload and payload["previewText"] is not None:
            conv.preview_text = _preview_from_text(payload.get("previewText") or "")
        if payload.get("endedAt"):
            conv.ended_at = parse_ts(payload["endedAt"])
        elif payload.get("status") == ConversationStatus.ARCHIVED and not conv.ended_at:
            conv.ended_at = timezone.now()
        conv.save()

    if deactivate_other_actives and conv.status == ConversationStatus.ACTIVE and student:
        TopicConversation.objects.filter(
            student=student,
            topic_key=key,
            status=ConversationStatus.ACTIVE,
        ).exclude(pk=conv.pk).update(
            status=ConversationStatus.ARCHIVED,
            ended_at=timezone.now(),
        )

    # Create path: also accept snapshot / preview
    if created:
        dirty = []
        if payload.get("resumeSnapshot"):
            conv.resume_snapshot = payload.get("resumeSnapshot") or {}
            dirty.append("resume_snapshot")
        if payload.get("previewText"):
            conv.preview_text = _preview_from_text(payload.get("previewText") or "")
            dirty.append("preview_text")
        if dirty:
            conv.save(update_fields=dirty + ["updated_at"])

    # Optional full message replace / merge
    messages = payload.get("messages")
    if messages is not None:
        _merge_messages(conv, messages)
        conv.message_count = conv.messages.filter(
            role__in=[MessageRole.TUTOR, MessageRole.CHILD]
        ).count()
        # Refresh preview from last child/tutor message
        last = (
            conv.messages.filter(role__in=[MessageRole.TUTOR, MessageRole.CHILD])
            .order_by("-occurred_at")
            .first()
        )
        if last and last.text:
            conv.preview_text = _preview_from_text(last.text)
        conv.save(update_fields=["message_count", "preview_text", "updated_at"])

    return conv


def _merge_messages(conv: TopicConversation, messages: list[dict]) -> None:
    for raw in messages:
        mid = raw.get("id") or raw.get("client_message_id")
        if not mid:
            continue
        role = raw.get("role") or MessageRole.TUTOR
        if role not in {MessageRole.TUTOR, MessageRole.CHILD, MessageRole.SYSTEM}:
            continue
        ConversationMessage.objects.update_or_create(
            conversation=conv,
            client_message_id=mid,
            defaults={
                "role": role,
                "text": raw.get("text") or "",
                "kind": raw.get("kind") or "",
                "occurred_at": parse_ts(raw.get("at")),
            },
        )


@transaction.atomic
def append_message(
    *,
    conv: TopicConversation,
    message: dict[str, Any],
    api_pair: dict | None = None,
) -> ConversationMessage:
    mid = message.get("id") or f"msg_{timezone.now().timestamp()}"
    role = message.get("role") or MessageRole.TUTOR
    msg, _ = ConversationMessage.objects.update_or_create(
        conversation=conv,
        client_message_id=mid,
        defaults={
            "role": role,
            "text": message.get("text") or "",
            "kind": message.get("kind") or "",
            "occurred_at": parse_ts(message.get("at")),
            "api_user_text": (api_pair or {}).get("user") or "",
            "api_model_text": (api_pair or {}).get("model") or "",
        },
    )

    # Append API history pair when provided
    if api_pair:
        history = list(conv.api_history or [])
        if api_pair.get("user") is not None:
            history.append({"role": "user", "text": str(api_pair["user"])})
        if api_pair.get("model") is not None:
            history.append({"role": "model", "text": str(api_pair["model"])})
        conv.api_history = history[-80:]

    conv.message_count = conv.messages.filter(
        role__in=[MessageRole.TUTOR, MessageRole.CHILD]
    ).count()
    if role in (MessageRole.TUTOR, MessageRole.CHILD) and (message.get("text") or "").strip():
        conv.preview_text = _preview_from_text(message.get("text") or "")
        conv.save(
            update_fields=["api_history", "message_count", "preview_text", "updated_at"]
        )
    else:
        conv.save(update_fields=["api_history", "message_count", "updated_at"])
    return msg


@transaction.atomic
def archive_conversation(
    conv: TopicConversation,
    *,
    title: str = "",
    summary: str = "",
    highlights: list | None = None,
    next_step: str = "",
    ended_at=None,
) -> TopicConversation:
    conv.status = ConversationStatus.ARCHIVED
    conv.ended_at = parse_ts(ended_at) if ended_at else timezone.now()
    if title:
        conv.title = title
    if summary:
        conv.summary = summary
    if highlights is not None:
        conv.highlights = highlights
    if next_step:
        conv.next_step = next_step
    conv.save()
    return conv


@transaction.atomic
def replace_topic_shelf(
    *,
    student: StudentProfile | None,
    client_student_id: str,
    subject: str,
    topic: str,
    active_conversation_id: str | None,
    conversations: list[dict],
) -> dict:
    """
    Sync a full client shelf for one subject×topic.
    Upserts listed conversations; does not delete remote-only archives
    (safer for multi-device).
    """
    key = topic_key(subject, topic)
    for raw in conversations:
        raw = {**raw, "subject": subject, "topic": topic}
        # Only the active id should be active
        if active_conversation_id and raw.get("id") == active_conversation_id:
            raw["status"] = ConversationStatus.ACTIVE
        elif raw.get("status") == ConversationStatus.ACTIVE and raw.get("id") != active_conversation_id:
            raw["status"] = ConversationStatus.ARCHIVED
            if not raw.get("endedAt"):
                raw["endedAt"] = timezone.now().isoformat()
        upsert_conversation(
            student=student,
            client_student_id=client_student_id,
            payload=raw,
            deactivate_other_actives=False,
        )

    # Ensure only one active for this topic
    if student and active_conversation_id:
        TopicConversation.objects.filter(
            student=student,
            topic_key=key,
            status=ConversationStatus.ACTIVE,
        ).exclude(client_id=active_conversation_id).update(
            status=ConversationStatus.ARCHIVED,
            ended_at=timezone.now(),
        )
        TopicConversation.objects.filter(
            student=student,
            client_id=active_conversation_id,
        ).update(status=ConversationStatus.ACTIVE, ended_at=None)

    return build_shelf(student, subject, topic, client_student_id)
