from rest_framework import serializers

from .models import (
    ConversationMessage,
    LearningEvent,
    LessonSession,
    SessionTurn,
    TopicConversation,
)


class LearningEventItemSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=64)
    type = serializers.CharField(max_length=64)
    timestamp = serializers.CharField(required=False, allow_blank=True)
    context = serializers.DictField(required=False, default=dict)
    payload = serializers.DictField(required=False, default=dict)


class LearningEventEnvelopeSerializer(serializers.Serializer):
    """
    Matches frontend analyticsApi makeEnvelope:
    { schemaVersion, source, sentAt, events[] }
    """

    schemaVersion = serializers.IntegerField(required=False, default=1)
    source = serializers.CharField(required=False, default="kindling-web")
    sentAt = serializers.CharField(required=False, allow_blank=True)
    events = LearningEventItemSerializer(many=True)

    def validate_events(self, value):
        if not value:
            raise serializers.ValidationError("events must not be empty.")
        if len(value) > 200:
            raise serializers.ValidationError("Maximum 200 events per batch.")
        return value


class SessionTurnSerializer(serializers.ModelSerializer):
    studentText = serializers.CharField(source="student_text", read_only=True)
    tutorText = serializers.CharField(source="tutor_text", read_only=True)
    inputModality = serializers.CharField(source="input_modality", read_only=True)
    responseMs = serializers.IntegerField(source="response_ms", read_only=True)
    isHintRequest = serializers.BooleanField(source="is_hint_request", read_only=True)
    isQuestion = serializers.BooleanField(source="is_question", read_only=True)
    at = serializers.DateTimeField(source="occurred_at", read_only=True)

    class Meta:
        model = SessionTurn
        fields = (
            "id",
            "index",
            "at",
            "subject",
            "topic",
            "studentText",
            "tutorText",
            "inputModality",
            "responseMs",
            "correctness",
            "affect",
            "engagement",
            "confidence",
            "isHintRequest",
            "isQuestion",
            "signals",
        )


class LessonSessionSerializer(serializers.ModelSerializer):
    sessionId = serializers.CharField(source="session_id", read_only=True)
    startedAt = serializers.DateTimeField(source="started_at", read_only=True)
    endedAt = serializers.DateTimeField(source="ended_at", read_only=True)
    durationMs = serializers.IntegerField(source="duration_ms", read_only=True)
    turnCount = serializers.IntegerField(source="turn_count", read_only=True)
    avgEngagement = serializers.FloatField(source="avg_engagement", read_only=True)
    avgConfidence = serializers.FloatField(source="avg_confidence", read_only=True)
    studentProfileSnapshot = serializers.JSONField(
        source="student_profile_snapshot", read_only=True
    )
    turns = SessionTurnSerializer(many=True, read_only=True)

    class Meta:
        model = LessonSession
        fields = (
            "id",
            "sessionId",
            "subject",
            "topic",
            "startedAt",
            "endedAt",
            "durationMs",
            "turnCount",
            "counters",
            "tools",
            "accuracy",
            "avgEngagement",
            "avgConfidence",
            "studentProfileSnapshot",
            "personalization",
            "turns",
        )


class LessonSessionListSerializer(serializers.ModelSerializer):
    sessionId = serializers.CharField(source="session_id", read_only=True)
    startedAt = serializers.DateTimeField(source="started_at", read_only=True)
    endedAt = serializers.DateTimeField(source="ended_at", read_only=True)
    durationMs = serializers.IntegerField(source="duration_ms", read_only=True)
    turnCount = serializers.IntegerField(source="turn_count", read_only=True)
    avgEngagement = serializers.FloatField(source="avg_engagement", read_only=True)
    avgConfidence = serializers.FloatField(source="avg_confidence", read_only=True)

    class Meta:
        model = LessonSession
        fields = (
            "id",
            "sessionId",
            "subject",
            "topic",
            "startedAt",
            "endedAt",
            "durationMs",
            "turnCount",
            "counters",
            "accuracy",
            "avgEngagement",
            "avgConfidence",
        )


class LearningEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningEvent
        fields = (
            "id",
            "client_event_id",
            "event_type",
            "timestamp",
            "session_id",
            "source",
            "schema_version",
            "context",
            "payload",
            "received_at",
        )


class ConversationMessageSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="client_message_id", read_only=True)
    at = serializers.DateTimeField(source="occurred_at", read_only=True)

    class Meta:
        model = ConversationMessage
        fields = ("id", "role", "text", "kind", "at")


class TopicConversationSerializer(serializers.ModelSerializer):
    """Full conversation including messages — matches frontend store shape."""

    id = serializers.CharField(source="client_id", read_only=True)
    createdAt = serializers.DateTimeField(source="started_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    endedAt = serializers.DateTimeField(source="ended_at", read_only=True, allow_null=True)
    messageCount = serializers.IntegerField(source="message_count", read_only=True)
    nextStep = serializers.CharField(source="next_step", read_only=True)
    apiHistory = serializers.JSONField(source="api_history", read_only=True)
    messages = ConversationMessageSerializer(many=True, read_only=True)

    class Meta:
        model = TopicConversation
        fields = (
            "id",
            "status",
            "subject",
            "topic",
            "createdAt",
            "updatedAt",
            "endedAt",
            "title",
            "summary",
            "highlights",
            "nextStep",
            "messageCount",
            "apiHistory",
            "messages",
        )


class TopicConversationListSerializer(serializers.ModelSerializer):
    """Lighter list entry (journal cards); messages omitted unless include_messages."""

    id = serializers.CharField(source="client_id", read_only=True)
    createdAt = serializers.DateTimeField(source="started_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    endedAt = serializers.DateTimeField(source="ended_at", read_only=True, allow_null=True)
    messageCount = serializers.IntegerField(source="message_count", read_only=True)
    nextStep = serializers.CharField(source="next_step", read_only=True)

    class Meta:
        model = TopicConversation
        fields = (
            "id",
            "status",
            "subject",
            "topic",
            "createdAt",
            "updatedAt",
            "endedAt",
            "title",
            "summary",
            "highlights",
            "nextStep",
            "messageCount",
        )


class ConversationMessageWriteSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=["tutor", "child", "system"])
    text = serializers.CharField(required=False, allow_blank=True, default="")
    kind = serializers.CharField(required=False, allow_blank=True, default="")
    at = serializers.CharField(required=False, allow_blank=True)


class ConversationUpsertSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=64)
    subject = serializers.CharField(max_length=160, required=False, allow_blank=True)
    topic = serializers.CharField(max_length=200, required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=["active", "archived"], required=False, default="active"
    )
    title = serializers.CharField(required=False, allow_blank=True, default="")
    summary = serializers.CharField(required=False, allow_blank=True, default="")
    highlights = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    nextStep = serializers.CharField(required=False, allow_blank=True, default="")
    createdAt = serializers.CharField(required=False, allow_blank=True)
    endedAt = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    apiHistory = serializers.ListField(required=False, default=list)
    messages = ConversationMessageWriteSerializer(many=True, required=False)
    messageCount = serializers.IntegerField(required=False)
    resumeSnapshot = serializers.DictField(required=False)
    previewText = serializers.CharField(
        required=False, allow_blank=True, max_length=240
    )


class AppendMessageSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=["tutor", "child", "system"])
    text = serializers.CharField(required=False, allow_blank=True, default="")
    kind = serializers.CharField(required=False, allow_blank=True, default="")
    at = serializers.CharField(required=False, allow_blank=True)
    apiPair = serializers.DictField(required=False)


class ArchiveConversationSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True, default="")
    summary = serializers.CharField(required=False, allow_blank=True, default="")
    highlights = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    nextStep = serializers.CharField(required=False, allow_blank=True, default="")
    endedAt = serializers.CharField(required=False, allow_blank=True)


class ResumeSnapshotSerializer(serializers.Serializer):
    """Partial resume state: intervention, tools, personalization, sessionId."""

    intervention = serializers.DictField(required=False)
    tools = serializers.DictField(required=False)
    personalization = serializers.DictField(required=False)
    sessionId = serializers.CharField(
        required=False, allow_blank=True, max_length=64
    )
    topic = serializers.CharField(required=False, allow_blank=True, max_length=200)
    subject = serializers.CharField(required=False, allow_blank=True, max_length=160)


class TopicShelfSerializer(serializers.Serializer):
    """Full shelf PUT body from the client."""

    subject = serializers.CharField(max_length=160)
    topic = serializers.CharField(max_length=200)
    activeConversationId = serializers.CharField(
        max_length=64, required=False, allow_blank=True, allow_null=True
    )
    conversations = ConversationUpsertSerializer(many=True)
