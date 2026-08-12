from django.contrib import admin

from .models import (
    ConversationMessage,
    HomeworkUpload,
    LearningEvent,
    LearningProfile,
    LessonSession,
    Misconception,
    SessionTurn,
    SkillMastery,
    TopicConversation,
    TopicMastery,
)


@admin.register(LearningEvent)
class LearningEventAdmin(admin.ModelAdmin):
    list_display = (
        "event_type",
        "client_event_id",
        "student",
        "session_id",
        "timestamp",
        "received_at",
    )
    list_filter = ("event_type", "source")
    search_fields = ("client_event_id", "session_id", "client_student_id")
    readonly_fields = ("received_at",)


class SessionTurnInline(admin.TabularInline):
    model = SessionTurn
    extra = 0
    readonly_fields = ("index", "occurred_at", "correctness", "affect")


@admin.register(LessonSession)
class LessonSessionAdmin(admin.ModelAdmin):
    list_display = (
        "session_id",
        "student",
        "subject",
        "topic",
        "started_at",
        "turn_count",
        "accuracy",
    )
    list_filter = ("subject",)
    search_fields = ("session_id", "subject", "topic")
    inlines = [SessionTurnInline]


class TopicMasteryInline(admin.TabularInline):
    model = TopicMastery
    extra = 0


class SkillMasteryInline(admin.TabularInline):
    model = SkillMastery
    extra = 0
    raw_id_fields = ("skill",)


class MisconceptionInline(admin.TabularInline):
    model = Misconception
    extra = 0


@admin.register(LearningProfile)
class LearningProfileAdmin(admin.ModelAdmin):
    list_display = ("student", "client_student_id", "updated_at")
    search_fields = ("client_student_id", "student__name")
    inlines = [TopicMasteryInline, SkillMasteryInline, MisconceptionInline]


@admin.register(SkillMastery)
class SkillMasteryAdmin(admin.ModelAdmin):
    list_display = ("skill", "score", "p_know", "state", "attempts", "profile")
    list_filter = ("state", "skill__domain")
    search_fields = ("skill__slug", "skill__name")


@admin.register(TopicMastery)
class TopicMasteryAdmin(admin.ModelAdmin):
    list_display = ("topic_key", "score", "attempts", "profile")
    search_fields = ("topic_key", "subject", "topic")


@admin.register(Misconception)
class MisconceptionAdmin(admin.ModelAdmin):
    list_display = ("label", "count", "last_seen", "profile")
    search_fields = ("label", "misconception_id")


class ConversationMessageInline(admin.TabularInline):
    model = ConversationMessage
    extra = 0
    readonly_fields = ("client_message_id", "role", "occurred_at")
    fields = ("client_message_id", "role", "kind", "occurred_at", "text")


@admin.register(TopicConversation)
class TopicConversationAdmin(admin.ModelAdmin):
    list_display = (
        "client_id",
        "student",
        "subject",
        "topic",
        "status",
        "message_count",
        "updated_at",
    )
    list_filter = ("status", "subject")
    search_fields = ("client_id", "subject", "topic", "title", "summary")
    inlines = [ConversationMessageInline]


@admin.register(ConversationMessage)
class ConversationMessageAdmin(admin.ModelAdmin):
    list_display = ("client_message_id", "role", "conversation", "occurred_at")
    list_filter = ("role",)
    search_fields = ("client_message_id", "text")


@admin.register(HomeworkUpload)
class HomeworkUploadAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "student",
        "subject",
        "topic",
        "status",
        "byte_size",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("original_name", "subject", "topic", "conversation_id")
    readonly_fields = ("created_at", "updated_at", "byte_size", "content_type")
