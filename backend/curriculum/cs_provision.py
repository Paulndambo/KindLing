"""
Provision the sole pilot subject (Computer Science) for a student.

Hierarchy: Subject → Topic (unit) → Subtopic (lesson).
"""

from __future__ import annotations

from curriculum.models import Subject, Topic, Subtopic
from curriculum.pilot_graph import (
    PILOT_COLOR,
    PILOT_ICON,
    PILOT_SUBJECT,
    PILOT_UNITS,
    subtopic_learning_goal,
    subtopic_name,
)


def ensure_computer_science_subject(student) -> Subject:
    """
    Ensure the student has Computer Science with unit → subtopic path.
    Rebuilds CS structure to match PILOT_UNITS (idempotent upsert).

    Each L0–L5 layer is a Topic (unit); every Lx.y section is a Subtopic
    lesson with a learning_goal that lists the source-doc concepts.
    """
    subject = student.subjects.filter(name=PILOT_SUBJECT).first()
    subject_goal = (
        "Build computer science from first principles — "
        "digital literacy through computational thinking, foundations, "
        "programming, algorithms, and mathematics for CS (L0–L5)."
    )
    if not subject:
        subject = Subject.objects.create(
            student=student,
            name=PILOT_SUBJECT,
            icon=PILOT_ICON,
            color=PILOT_COLOR,
            sort_order=0,
            learning_goal=subject_goal,
        )
    else:
        updates = []
        if subject.icon != PILOT_ICON:
            subject.icon = PILOT_ICON
            updates.append("icon")
        if subject.color != PILOT_COLOR:
            subject.color = PILOT_COLOR
            updates.append("color")
        if (subject.learning_goal or "").strip() != subject_goal:
            subject.learning_goal = subject_goal
            updates.append("learning_goal")
        if updates:
            subject.save(update_fields=updates)

    unit_names = [u["name"] for u in PILOT_UNITS]
    # Remove legacy flat topics that are not units (old leaf names)
    subject.topics.exclude(name__in=unit_names).delete()

    for i, unit in enumerate(PILOT_UNITS):
        topic, _ = Topic.objects.update_or_create(
            subject=subject,
            name=unit["name"],
            defaults={
                "sort_order": i,
                "familiarity": Topic.Familiarity.BEGINNER,
                "learning_goal": unit.get("learning_goal")
                or f"Grow in {unit['name']}.",
            },
        )
        raw_subs = list(unit.get("subtopics") or [])
        sub_names = [subtopic_name(s) for s in raw_subs if subtopic_name(s)]
        topic.subtopics.exclude(name__in=sub_names).delete()
        for j, sub in enumerate(raw_subs):
            name = subtopic_name(sub)
            if not name:
                continue
            Subtopic.objects.update_or_create(
                topic=topic,
                name=name,
                defaults={
                    "sort_order": j,
                    "familiarity": Topic.Familiarity.BEGINNER,
                    "learning_goal": subtopic_learning_goal(sub),
                },
            )

    return subject
