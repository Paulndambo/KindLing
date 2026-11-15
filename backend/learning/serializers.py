from rest_framework import serializers

from .models import (
    ConversationMessage,
    LearningEvent,
    LessonSession,
    SessionTurn,
    StudentAssessment,
    TopicConversation,
)
from curriculum.models import Subject, Topic, Subtopic


class StudentAssessmentSerializer(serializers.ModelSerializer):
    questionType = serializers.ChoiceField(source="question_type", choices=StudentAssessment.QuestionType.choices)
    revisionMessages = serializers.ListField(source="revision_messages", child=serializers.DictField(), required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    completedAt = serializers.DateTimeField(source="completed_at", read_only=True)
    subjectId = serializers.IntegerField(source="subject_id", required=False, allow_null=True)
    topicId = serializers.IntegerField(source="topic_id", required=False, allow_null=True)
    subtopicId = serializers.IntegerField(source="subtopic_id", required=False, allow_null=True)
    subjectName = serializers.CharField(source="subject_name", required=False, allow_blank=True)
    topicName = serializers.CharField(source="topic_name", required=False, allow_blank=True)
    subtopicName = serializers.CharField(source="subtopic_name", required=False, allow_blank=True)

    class Meta:
        model = StudentAssessment
        fields = (
            "id", "title", "topic", "description", "subjectId", "topicId", "subtopicId",
            "subjectName", "topicName", "subtopicName", "questionType", "questions",
            "answers", "result", "revisionMessages", "status", "createdAt",
            "updatedAt", "completedAt",
        )
        read_only_fields = ("id", "createdAt", "updatedAt", "completedAt")

    def validate_questions(self, value):
        if not isinstance(value, list) or not 5 <= len(value) <= 15:
            raise serializers.ValidationError("An assessment must contain between 5 and 15 questions.")
        return value

    def validate(self, attrs):
        subject_id = attrs.get("subject_id", getattr(self.instance, "subject_id", None))
        topic_id = attrs.get("topic_id", getattr(self.instance, "topic_id", None))
        subtopic_id = attrs.get("subtopic_id", getattr(self.instance, "subtopic_id", None))
        if subject_id and topic_id and subtopic_id:
            request = self.context.get("request")
            from students.models import StudentProfile
            student = StudentProfile.objects.filter(user=request.user).first() if request else None
            subject = Subject.objects.filter(id=subject_id, student=student).first()
            topic = Topic.objects.filter(id=topic_id, subject=subject).first() if subject else None
            subtopic = Subtopic.objects.filter(id=subtopic_id, topic=topic).first() if topic else None
            if not (subject and topic and subtopic):
                raise serializers.ValidationError("The selected curriculum path is not available in your subjects.")
            attrs.update({
                "subject_name": subject.name,
                "topic_name": topic.name,
                "subtopic_name": subtopic.name,
                "topic": subtopic.name,
            })
        elif subject_id and topic_id:
            request = self.context.get("request")
            from students.models import StudentProfile
            student = StudentProfile.objects.filter(user=request.user).first() if request else None
            subject = Subject.objects.filter(id=subject_id, student=student).first()
            topic = Topic.objects.filter(id=topic_id, subject=subject).first() if subject else None
            if not (subject and topic):
                raise serializers.ValidationError("The selected curriculum path is not available in your subjects.")
            attrs.update({
                "subject_name": subject.name,
                "topic_name": topic.name,
                "subtopic_name": attrs.get("subtopic_name") or topic.name,
                "topic": attrs.get("subtopic_name") or topic.name,
            })
        else:
            topic_text = (attrs.get("topic") or getattr(self.instance, "topic", "")).strip()
            if not topic_text:
                raise serializers.ValidationError("Choose a topic or select a curriculum path from your subjects.")
        return attrs

    def validate_answers(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Answers must be an object keyed by question id.")
        return value

    def validate_result(self, value):
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("Assessment result must be an object.")
        return value

    def validate_revisionMessages(self, value):
        if len(value) > 200:
            raise serializers.ValidationError("Revision history is too long.")
        for message in value:
            if message.get("role") not in {"user", "model"} or not isinstance(message.get("text"), str):
                raise serializers.ValidationError("Revision messages must have a user/model role and text.")
            if len(message["text"]) > 10000:
                raise serializers.ValidationError("A revision message is too long.")
        return value

    def update(self, instance, validated_data):
        finishing = validated_data.get("status") == StudentAssessment.Status.COMPLETED and instance.completed_at is None
        if finishing:
            from django.utils import timezone

            validated_data["completed_at"] = timezone.now()
        assessment = super().update(instance, validated_data)
        if finishing and assessment.result:
            self._record_assessment_mastery(assessment)
        return assessment

    @staticmethod
    def _record_assessment_mastery(assessment):
        from django.db import transaction
        from learning.models import TopicMastery
        from learning.services import get_or_create_profile
        from learning.services import topic_key

        student = assessment.student
        if not student:
            return
        profile = get_or_create_profile(student=student)
        result = assessment.result or {}
        score = result.get("score")
        try:
            score = max(0.0, min(100.0, float(score)))
        except (TypeError, ValueError):
            return
        key = topic_key(assessment.subject_name, assessment.subtopic_name or assessment.topic)
        with transaction.atomic():
            mastery, _ = TopicMastery.objects.select_for_update().get_or_create(
                profile=profile,
                topic_key=key,
                defaults={"subject": assessment.subject_name, "topic": assessment.subtopic_name or assessment.topic, "score": 40.0},
            )
            question_count = len(assessment.questions or [])
            old_count = mastery.attempts
            mastery.score = round(((mastery.score * old_count) + (score * question_count)) / max(1, old_count + question_count), 2)
            mastery.attempts = old_count + question_count
            mastery.correct += int(result.get("correct") or 0)
            mastery.incorrect += max(0, question_count - int(result.get("correct") or 0))
            mastery.last_correctness = "correct" if score >= 80 else "partial" if score >= 50 else "incorrect"
            mastery.save()


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
