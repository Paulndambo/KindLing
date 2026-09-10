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
)


def ensure_computer_science_subject(student) -> Subject:
    """
    Ensure the student has Computer Science with unit → subtopic path.
    Rebuilds CS structure to match PILOT_UNITS (idempotent upsert).
    """
    subject = student.subjects.filter(name=PILOT_SUBJECT).first()
    if not subject:
        subject = Subject.objects.create(
            student=student,
            name=PILOT_SUBJECT,
            icon=PILOT_ICON,
            color=PILOT_COLOR,
            sort_order=0,
            learning_goal=(
                "Build computer science from first principles — "
                "literacy through programming, systems, and beyond."
            ),
        )
    else:
        updates = []
        if subject.icon != PILOT_ICON:
            subject.icon = PILOT_ICON
            updates.append("icon")
        if subject.color != PILOT_COLOR:
            subject.color = PILOT_COLOR
            updates.append("color")
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
        sub_names = list(unit.get("subtopics") or [])
        topic.subtopics.exclude(name__in=sub_names).delete()
        for j, sub_name in enumerate(sub_names):
            Subtopic.objects.update_or_create(
                topic=topic,
                name=sub_name,
                defaults={
                    "sort_order": j,
                    "familiarity": Topic.Familiarity.BEGINNER,
                    "learning_goal": f"Build a clear foundation in {sub_name}.",
                },
            )

    return subject
