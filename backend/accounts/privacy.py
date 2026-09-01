"""
Privacy export / account deletion helpers (Phase 0.4).
"""

from __future__ import annotations

from typing import Any, Dict

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from curriculum.models import Subject
from learning.models import (
    LearningEvent,
    LearningProfile,
    LessonSession,
    TopicConversation,
)
from students.models import get_student_profile

User = get_user_model()


def build_user_export(user) -> Dict[str, Any]:
    """Assemble a JSON-serializable export of data held for this user."""
    profile = get_student_profile(user)
    payload: Dict[str, Any] = {
        "exported_at": timezone.now().isoformat(),
        "export_version": 1,
        "account": {
            "id": user.pk,
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "date_joined": user.date_joined.isoformat()
            if getattr(user, "date_joined", None)
            else None,
        },
        "student_profile": None,
        "subjects": [],
        "learning_profile": None,
        "sessions": [],
        "learning_events": [],
        "conversations": [],
        "notes": [
            "This export includes account and learning data stored by Kindling.",
            "Client-side localStorage may hold additional caches until cleared in the browser.",
            "See docs/SAFETY_AND_PRIVACY.md for retention and contact details.",
        ],
    }

    if not profile:
        return payload

    payload["student_profile"] = {
        "id": profile.pk,
        "name": profile.name,
        "grade": profile.grade,
        "avatar": profile.avatar,
        "country": profile.country,
        "school_name": profile.school_name,
        "school_type": profile.school_type,
        "curriculum": profile.curriculum,
        "academic_target": profile.academic_target,
        "learning_style": profile.learning_style,
        "interests": profile.interests,
        "goal": profile.goal,
        "week_focus": profile.week_focus,
        "is_onboarded": profile.is_onboarded,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }

    subjects = Subject.objects.filter(student=profile).prefetch_related("topics")
    payload["subjects"] = [
        {
            "id": s.pk,
            "name": s.name,
            "topics": [
                {"id": t.pk, "name": t.name, "sort_order": t.sort_order}
                for t in s.topics.all()
            ],
        }
        for s in subjects
    ]

    lp = LearningProfile.objects.filter(student=profile).first()
    if lp:
        payload["learning_profile"] = {
            "id": lp.pk,
            "version": lp.version,
            "totals": lp.totals,
            "delivery_preferences": lp.delivery_preferences,
            "strengths": lp.strengths,
            "focus_areas": lp.focus_areas,
            "behavior": lp.behavior,
            "last_session": lp.last_session,
            "raw_snapshot": lp.raw_snapshot,
            "updated_at": lp.updated_at.isoformat() if lp.updated_at else None,
        }

    sessions = LessonSession.objects.filter(student=profile).order_by("-started_at")[
        :200
    ]
    payload["sessions"] = [
        {
            "session_id": s.session_id,
            "subject": s.subject,
            "topic": s.topic,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "turn_count": s.turn_count,
            "accuracy": s.accuracy,
        }
        for s in sessions
    ]

    events = LearningEvent.objects.filter(student=profile).order_by("-timestamp")[
        :500
    ]
    payload["learning_events"] = [
        {
            "client_event_id": e.client_event_id,
            "event_type": e.event_type,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "session_id": e.session_id,
            "context": e.context,
            "payload": e.payload,
        }
        for e in events
    ]

    convos = TopicConversation.objects.filter(student=profile).order_by(
        "-updated_at"
    )[:100]
    payload["conversations"] = [
        {
            "client_id": c.client_id,
            "subject": c.subject,
            "topic": c.topic,
            "status": c.status,
            "message_count": c.message_count,
            "title": c.title,
            "summary": c.summary,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in convos
    ]

    return payload


@transaction.atomic
def delete_user_account(user) -> Dict[str, Any]:
    """
    Permanently delete the user and cascaded profile data.
    Demo account is blocked to protect shared demo credentials.
    """
    email = (user.email or user.username or "").lower()
    if email == "student@kindling.edu":
        raise PermissionError("Demo account cannot be deleted.")

    user_id = user.pk
    user.delete()
    return {
        "deleted": True,
        "user_id": user_id,
        "deleted_at": timezone.now().isoformat(),
    }
