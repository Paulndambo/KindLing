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
    # Optional subject-level intent (fallback when a topic has no learning_goal)
    learning_goal = models.TextField(
        blank=True,
        default="",
        help_text="What the student wants from this subject overall.",
    )
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

    class Familiarity(models.TextChoices):
        NEW = "new", "Brand new to me"
        BEGINNER = "beginner", "I've heard of it"
        SOME = "some", "I know the basics"
        COMFORTABLE = "comfortable", "Fairly comfortable"
        REVIEWING = "reviewing", "Reviewing / exam prep"

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="topics",
    )
    name = models.CharField(max_length=200)
    sort_order = models.PositiveIntegerField(default=0)
    # How familiar the student feels (drives first-session pacing)
    familiarity = models.CharField(
        max_length=20,
        choices=Familiarity.choices,
        default=Familiarity.NEW,
        blank=True,
        db_index=True,
    )
    # What they specifically want to learn in this topic
    learning_goal = models.TextField(blank=True, default="")
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


class WorkedExample(models.Model):
    """
    Curated worked example / counterexample for the pilot skill graph (Epic B4).

    Linked to Skill; matched by subject + topic names for lesson routing.
    Age band via grade_min / grade_max (inclusive US-style grades; K≈0).
    """

    class Kind(models.TextChoices):
        EXAMPLE = "example", "Worked example"
        COUNTEREXAMPLE = "counterexample", "Counterexample"

    slug = models.SlugField(max_length=80, unique=True)
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="worked_examples",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=400, blank=True, default="")
    problem = models.TextField(
        help_text="Student-facing problem statement (age-appropriate)."
    )
    steps = models.JSONField(
        default=list,
        blank=True,
        help_text="Ordered list of short teaching steps (strings).",
    )
    takeaway = models.TextField(blank=True, default="")
    counterexample = models.TextField(
        blank=True,
        default="",
        help_text="Optional inline common mix-up to contrast gently.",
    )
    kind = models.CharField(
        max_length=20,
        choices=Kind.choices,
        default=Kind.EXAMPLE,
        db_index=True,
    )
    subject_name = models.CharField(max_length=160, blank=True, default="", db_index=True)
    topic_names = models.JSONField(
        default=list,
        blank=True,
        help_text="Lesson topic labels this example applies to.",
    )
    grade_min = models.PositiveSmallIntegerField(
        default=0,
        help_text="Inclusive minimum grade (0 ≈ Kindergarten).",
    )
    grade_max = models.PositiveSmallIntegerField(
        default=12,
        help_text="Inclusive maximum grade.",
    )
    language_notes = models.CharField(
        max_length=240,
        blank=True,
        default="",
        help_text="Internal cue for tone (e.g. concrete, visual-first).",
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "title"]
        indexes = [
            models.Index(fields=["subject_name", "is_active"]),
            models.Index(fields=["skill", "kind", "is_active"]),
        ]

    def __str__(self):
        return f"{self.slug} · {self.title}"

    def matches_topic(self, topic: str) -> bool:
        t = (topic or "").strip().lower()
        if not t:
            return False
        for name in self.topic_names or []:
            n = (name or "").strip().lower()
            if not n:
                continue
            if t == n or t in n or n in t:
                return True
        return False

    def matches_grade(self, grade) -> bool:
        """grade may be int or string like '4' / 'Grade 4'."""
        g = _parse_grade(grade)
        if g is None:
            return True
        return self.grade_min <= g <= self.grade_max


def _parse_grade(grade) -> int | None:
    if grade is None or grade == "":
        return None
    if isinstance(grade, int):
        return max(0, min(12, grade))
    s = str(grade).strip().lower()
    if s in ("k", "kindergarten"):
        return 0
    import re

    m = re.search(r"(\d{1,2})", s)
    if not m:
        return None
    return max(0, min(12, int(m.group(1))))


class MisconceptionDef(models.Model):
    """
    Catalog entry for a known misconception + remediation playbook (Epic B5).

    Distinct from learning.Misconception (per-learner tallies).
    """

    slug = models.SlugField(max_length=80, unique=True)
    label = models.CharField(max_length=200)
    domain = models.CharField(
        max_length=40,
        choices=Skill.Domain.choices,
        default=Skill.Domain.GENERAL,
        db_index=True,
    )
    description = models.TextField(blank=True, default="")
    skill = models.ForeignKey(
        Skill,
        on_delete=models.SET_NULL,
        related_name="misconception_defs",
        null=True,
        blank=True,
    )
    topic_names = models.JSONField(default=list, blank=True)
    # Regex strings (case-insensitive) — student_cues preferred; patterns is broader fallback
    student_cues = models.JSONField(
        default=list,
        blank=True,
        help_text="Regex list matched primarily against student text.",
    )
    patterns = models.JSONField(
        default=list,
        blank=True,
        help_text="Regex list matched against student+tutor blob.",
    )
    playbook = models.JSONField(
        default=dict,
        blank=True,
        help_text="Remediation playbook: open, steps, check_question, tutor_directives, success_signal.",
    )
    related_example_slug = models.SlugField(max_length=80, blank=True, default="")
    related_counter_slug = models.SlugField(max_length=80, blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["domain", "sort_order", "label"]
        verbose_name = "misconception definition"
        verbose_name_plural = "misconception definitions"

    def __str__(self):
        return f"{self.slug} · {self.label}"


class MultiStepProblem(models.Model):
    """
    Structured multi-step “show your work” problem (Epic B6).
    steps JSON: [{id, index, label, prompt, expected, alts, hint, check_mode?}, ...]
    """

    slug = models.SlugField(max_length=80, unique=True)
    skill = models.ForeignKey(
        Skill,
        on_delete=models.SET_NULL,
        related_name="multistep_problems",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    prompt = models.TextField()
    subject_name = models.CharField(max_length=160, blank=True, default="", db_index=True)
    topic_names = models.JSONField(default=list, blank=True)
    steps = models.JSONField(default=list, blank=True)
    final_expected = models.CharField(max_length=80, blank=True, default="")
    final_alts = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "title"]

    def __str__(self):
        return f"{self.slug} · {self.title}"

    def matches_topic(self, topic: str) -> bool:
        t = (topic or "").strip().lower()
        if not t:
            return False
        for name in self.topic_names or []:
            n = (name or "").strip().lower()
            if n and (t == n or t in n or n in t):
                return True
        return False
