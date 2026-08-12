from django.db import models

from students.models import StudentProfile


class LearningEventType(models.TextChoices):
    SESSION_START = "session.start", "Session start"
    SESSION_END = "session.end", "Session end"
    TURN_EXCHANGE = "turn.exchange", "Turn exchange"
    HINT_REQUESTED = "behavior.hint_requested", "Hint requested"
    TOOL_TOGGLED = "behavior.tool_toggled", "Tool toggled"
    TOPIC_SWITCHED = "session.topic_switched", "Topic switched"
    VOICE_USED = "behavior.voice_input", "Voice input"
    PROFILE_SNAPSHOT = "profile.snapshot", "Profile snapshot"
    INTERVENTION_OFFERED = "intervention.offered", "Intervention offered"
    INTERVENTION_ENTERED = "intervention.entered", "Intervention entered"
    INTERVENTION_EXITED = "intervention.exited", "Intervention exited"
    INTERVENTION_DECLINED = "intervention.declined", "Intervention declined"


class Correctness(models.TextChoices):
    CORRECT = "correct", "Correct"
    PARTIAL = "partial", "Partial"
    INCORRECT = "incorrect", "Incorrect"
    EXPLORING = "exploring", "Exploring"
    UNKNOWN = "unknown", "Unknown"


class Affect(models.TextChoices):
    CONFIDENT = "confident", "Confident"
    NEUTRAL = "neutral", "Neutral"
    HESITANT = "hesitant", "Hesitant"
    FRUSTRATED = "frustrated", "Frustrated"
    DISENGAGED = "disengaged", "Disengaged"
    CURIOUS = "curious", "Curious"


class LearningEvent(models.Model):
    """
    Canonical learning analytics event ingested from the web client.
    Payload shape matches frontend createLearningEvent / analyticsApi envelope.
    """

    client_event_id = models.CharField(max_length=64, db_index=True)
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="learning_events",
        null=True,
        blank=True,
    )
    # Loose student id from client (e.g. name slug) when no auth/profile link yet
    client_student_id = models.CharField(max_length=120, blank=True, default="")
    event_type = models.CharField(max_length=64, choices=LearningEventType.choices)
    timestamp = models.DateTimeField()
    session_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    source = models.CharField(max_length=40, blank=True, default="kindling-web")
    schema_version = models.PositiveSmallIntegerField(default=1)
    context = models.JSONField(default=dict, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["student", "event_type", "-timestamp"]),
            models.Index(fields=["session_id", "event_type"]),
            models.Index(fields=["client_event_id"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["client_event_id"],
                name="uniq_learning_client_event_id",
            ),
        ]

    def __str__(self):
        return f"{self.event_type} @ {self.timestamp}"


class LessonSession(models.Model):
    """A tracked tutoring session (lesson)."""

    session_id = models.CharField(max_length=64, unique=True, db_index=True)
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="sessions",
        null=True,
        blank=True,
    )
    client_student_id = models.CharField(max_length=120, blank=True, default="")
    subject = models.CharField(max_length=160, blank=True, default="")
    topic = models.CharField(max_length=200, blank=True, default="")
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    turn_count = models.PositiveIntegerField(default=0)
    counters = models.JSONField(default=dict, blank=True)
    tools = models.JSONField(default=dict, blank=True)
    accuracy = models.FloatField(null=True, blank=True)
    avg_engagement = models.FloatField(null=True, blank=True)
    avg_confidence = models.FloatField(null=True, blank=True)
    student_profile_snapshot = models.JSONField(default=dict, blank=True)
    personalization = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["student", "-started_at"]),
        ]

    def __str__(self):
        return f"{self.session_id} · {self.subject}/{self.topic}"


class SessionTurn(models.Model):
    """One student ↔ tutor exchange within a session."""

    session = models.ForeignKey(
        LessonSession,
        on_delete=models.CASCADE,
        related_name="turns",
    )
    index = models.PositiveIntegerField(default=0)
    occurred_at = models.DateTimeField()
    subject = models.CharField(max_length=160, blank=True, default="")
    topic = models.CharField(max_length=200, blank=True, default="")
    student_text = models.TextField(blank=True, default="")
    tutor_text = models.TextField(blank=True, default="")
    input_modality = models.CharField(max_length=20, blank=True, default="text")
    response_ms = models.PositiveIntegerField(null=True, blank=True)
    correctness = models.CharField(
        max_length=20, choices=Correctness.choices, blank=True, default=""
    )
    affect = models.CharField(
        max_length=20, choices=Affect.choices, blank=True, default=""
    )
    engagement = models.FloatField(null=True, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    is_hint_request = models.BooleanField(default=False)
    is_question = models.BooleanField(default=False)
    signals = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["session", "index"]
        indexes = [
            models.Index(fields=["session", "index"]),
        ]

    def __str__(self):
        return f"Turn {self.index} of {self.session.session_id}"


class LearningProfile(models.Model):
    """
    Longitudinal student learning profile.
    Mirrors frontend createEmptyProfile / profileStore shape.
    """

    student = models.OneToOneField(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="learning_profile",
        null=True,
        blank=True,
    )
    client_student_id = models.CharField(max_length=120, blank=True, default="", db_index=True)
    version = models.PositiveSmallIntegerField(default=1)
    totals = models.JSONField(default=dict, blank=True)
    delivery_preferences = models.JSONField(default=dict, blank=True)
    affect_history = models.JSONField(default=list, blank=True)
    engagement_history = models.JSONField(default=list, blank=True)
    confidence_history = models.JSONField(default=list, blank=True)
    strengths = models.JSONField(default=list, blank=True)
    focus_areas = models.JSONField(default=list, blank=True)
    behavior = models.JSONField(default=dict, blank=True)
    last_session = models.JSONField(default=dict, blank=True, null=True)
    # Full profile digest for snapshot sync from client
    raw_snapshot = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["client_student_id"]),
        ]

    def __str__(self):
        label = self.student.name if self.student else self.client_student_id
        return f"LearningProfile({label})"


class TopicMastery(models.Model):
    """Per topic mastery estimate (subject::topic key from frontend)."""

    profile = models.ForeignKey(
        LearningProfile,
        on_delete=models.CASCADE,
        related_name="mastery_entries",
    )
    subject = models.CharField(max_length=160)
    topic = models.CharField(max_length=200)
    topic_key = models.CharField(max_length=360, db_index=True)
    score = models.FloatField(default=40.0)
    attempts = models.PositiveIntegerField(default=0)
    correct = models.PositiveIntegerField(default=0)
    incorrect = models.PositiveIntegerField(default=0)
    hints = models.PositiveIntegerField(default=0)
    last_correctness = models.CharField(max_length=20, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "topic masteries"
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "topic_key"],
                name="uniq_profile_topic_key",
            ),
        ]
        ordering = ["-score"]

    def __str__(self):
        return f"{self.topic_key}: {self.score:.0f}"


class Misconception(models.Model):
    """Accumulated misconception signals for a learner."""

    profile = models.ForeignKey(
        LearningProfile,
        on_delete=models.CASCADE,
        related_name="misconceptions",
    )
    misconception_id = models.CharField(max_length=80)
    label = models.CharField(max_length=200)
    count = models.PositiveIntegerField(default=0)
    last_seen = models.DateTimeField(null=True, blank=True)
    subjects = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "misconception_id"],
                name="uniq_profile_misconception",
            ),
        ]
        ordering = ["-count"]

    def __str__(self):
        return f"{self.label} ({self.count}×)"


class ConversationStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"


class MessageRole(models.TextChoices):
    TUTOR = "tutor", "Tutor"
    CHILD = "child", "Child"
    SYSTEM = "system", "System"


class TopicConversation(models.Model):
    """
    Durable tutoring conversation for a student on a subject×topic.
    client_id matches the frontend conversation id (conv_…).
    """

    client_id = models.CharField(max_length=64, unique=True, db_index=True)
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="topic_conversations",
        null=True,
        blank=True,
    )
    client_student_id = models.CharField(max_length=120, blank=True, default="")
    subject = models.CharField(max_length=160, blank=True, default="")
    topic = models.CharField(max_length=200, blank=True, default="")
    topic_key = models.CharField(max_length=360, db_index=True, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=ConversationStatus.choices,
        default=ConversationStatus.ACTIVE,
        db_index=True,
    )
    title = models.CharField(max_length=200, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    highlights = models.JSONField(default=list, blank=True)
    next_step = models.TextField(blank=True, default="")
    message_count = models.PositiveIntegerField(default=0)
    # Gemini API history for resume: [{role, text}, ...]
    api_history = models.JSONField(default=list, blank=True)
    started_at = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["student", "topic_key", "status"]),
            models.Index(fields=["student", "subject", "topic", "status"]),
            models.Index(fields=["client_student_id", "topic_key"]),
        ]

    def save(self, *args, **kwargs):
        if not self.topic_key:
            self.topic_key = f"{self.subject or 'General'}::{self.topic or 'General'}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client_id} · {self.topic_key} ({self.status})"


class ConversationMessage(models.Model):
    """One UI message within a topic conversation."""

    conversation = models.ForeignKey(
        TopicConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    client_message_id = models.CharField(max_length=64, db_index=True)
    role = models.CharField(max_length=20, choices=MessageRole.choices)
    text = models.TextField(blank=True, default="")
    kind = models.CharField(max_length=64, blank=True, default="")
    occurred_at = models.DateTimeField()
    # Optional API pair fragments stored on the message for debugging
    api_user_text = models.TextField(blank=True, default="")
    api_model_text = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["occurred_at", "id"]
        indexes = [
            models.Index(fields=["conversation", "occurred_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "client_message_id"],
                name="uniq_conversation_client_message",
            ),
        ]

    def __str__(self):
        return f"{self.role} @ {self.occurred_at}"
