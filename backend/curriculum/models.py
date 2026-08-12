from django.db import models

from students.models import StudentProfile


class Subject(models.Model):
    """A subject area owned by a student (e.g. Math, Software Development Level 1)."""

    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="subjects",
    )
    name = models.CharField(max_length=160)
    icon = models.CharField(max_length=40, blank=True, default="book")
    color = models.CharField(max_length=20, blank=True, default="#E8F4F8")
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["student", "sort_order"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.student.name})"


class Topic(models.Model):
    """A topic within a subject (e.g. Comparing fractions)."""

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="topics",
    )
    name = models.CharField(max_length=200)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["subject", "sort_order"]),
        ]

    def __str__(self):
        return f"{self.name} · {self.subject.name}"


class Skill(models.Model):
    """
    Fine-grained knowledge component in the Kindling skill graph (Epic A1).

    Global catalog (not per-student). Pilot domains: fractions, early_algebra.
    """

    class Domain(models.TextChoices):
        FRACTIONS = "fractions", "Fractions"
        EARLY_ALGEBRA = "early_algebra", "Early algebra"
        GENERAL = "general", "General"

    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=160)
    short_label = models.CharField(max_length=80, blank=True, default="")
    description = models.TextField(blank=True, default="")
    domain = models.CharField(
        max_length=40, choices=Domain.choices, default=Domain.GENERAL, db_index=True
    )
    # Optional curriculum framework codes (e.g. CCSS.MATH.CONTENT.4.NF.A.1)
    standard_codes = models.JSONField(default=list, blank=True)
    # BKT-ish defaults (can be tuned per skill)
    p_init = models.FloatField(default=0.2)
    p_transit = models.FloatField(default=0.12)
    p_slip = models.FloatField(default=0.08)
    p_guess = models.FloatField(default=0.18)
    sort_order = models.PositiveIntegerField(default=0)
    is_pilot = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["domain", "sort_order", "name"]

    def __str__(self):
        return f"{self.slug} · {self.name}"

    @property
    def label(self) -> str:
        return self.short_label or self.name


class SkillPrerequisite(models.Model):
    """Directed edge: skill requires prerequisite (DAG)."""

    class Strength(models.TextChoices):
        REQUIRED = "required", "Required"
        RECOMMENDED = "recommended", "Recommended"

    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="prerequisite_links",
    )
    prerequisite = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="unlocks",
    )
    strength = models.CharField(
        max_length=20, choices=Strength.choices, default=Strength.REQUIRED
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["skill", "prerequisite"],
                name="uniq_skill_prereq",
            ),
        ]

    def __str__(self):
        return f"{self.prerequisite.slug} → {self.skill.slug} ({self.strength})"


class TopicSkillLink(models.Model):
    """
    Maps a subject×topic label (as used in lessons) to graph skills.

    Matching is by name (case-insensitive) so student-owned topics that
    match pilot names inherit the graph.
    """

    subject_name = models.CharField(max_length=160, db_index=True)
    topic_name = models.CharField(max_length=200, db_index=True)
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="topic_links",
    )
    weight = models.FloatField(
        default=1.0,
        help_text="Contribution of this skill to topic mastery (primary ≈ 1.0)",
    )
    is_primary = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["subject_name", "topic_name", "skill"],
                name="uniq_topic_skill_link",
            ),
        ]
        indexes = [
            models.Index(fields=["subject_name", "topic_name"]),
        ]

    def __str__(self):
        return f"{self.subject_name}::{self.topic_name} → {self.skill.slug}"
