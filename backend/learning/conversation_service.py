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


def conversation_to_dict(conv: TopicConversation, include_messages: bool = True) -> dict:
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
    }
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

    # Optional full message replace / merge
    messages = payload.get("messages")
    if messages is not None:
        _merge_messages(conv, messages)
        conv.message_count = conv.messages.filter(
            role__in=[MessageRole.TUTOR, MessageRole.CHILD]
        ).count()
        conv.save(update_fields=["message_count", "updated_at"])

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
