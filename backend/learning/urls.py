from django.urls import path

from .digest_views import DigestDetailView, DigestGenerateView, DigestListView
from .homework_views import (
    HomeworkAnalyzeView,
    HomeworkDetailView,
    HomeworkUploadView,
)
from .views import (
    ConversationContinueListView,
    ConversationResumeSnapshotView,
    ConversationSearchView,
    DashboardView,
    HealthView,
    LearningEventIngestView,
    LearningEventListView,
    LearningProfileView,
    MathVerifyView,
    PersonalizationView,
    SessionDetailView,
    SessionListView,
    SkillCatalogView,
    SkillPathView,
    SkillRecommendView,
    TopicConversationAppendMessageView,
    TopicConversationArchiveView,
    TopicConversationDetailView,
    TopicConversationEnsureView,
    TopicConversationShelfView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="learning-health"),
    path("events/", LearningEventIngestView.as_view(), name="learning-events-ingest"),
    path("events/list/", LearningEventListView.as_view(), name="learning-events-list"),
    path("profile/", LearningProfileView.as_view(), name="learning-profile"),
    path(
        "personalization/",
        PersonalizationView.as_view(),
        name="learning-personalization",
    ),
    path("skills/", SkillCatalogView.as_view(), name="learning-skills-catalog"),
    path("skills/path/", SkillPathView.as_view(), name="learning-skills-path"),
    path("skills/next/", SkillRecommendView.as_view(), name="learning-skills-next"),
    path("verify-math/", MathVerifyView.as_view(), name="learning-verify-math"),
    path("homework/", HomeworkUploadView.as_view(), name="learning-homework-upload"),
    path(
        "homework/<int:pk>/",
        HomeworkDetailView.as_view(),
        name="learning-homework-detail",
    ),
    path(
        "homework/<int:pk>/analyze/",
        HomeworkAnalyzeView.as_view(),
        name="learning-homework-analyze",
    ),
    path("sessions/", SessionListView.as_view(), name="learning-sessions"),
    path(
        "sessions/<str:session_id>/",
        SessionDetailView.as_view(),
        name="learning-session-detail",
    ),
    path("dashboard/", DashboardView.as_view(), name="learning-dashboard"),
    # Parent digests (Epic A5)
    path("digests/", DigestListView.as_view(), name="learning-digests"),
    path(
        "digests/generate/",
        DigestGenerateView.as_view(),
        name="learning-digests-generate",
    ),
    path(
        "digests/<int:pk>/",
        DigestDetailView.as_view(),
        name="learning-digest-detail",
    ),
    # Durable topic conversations (resume + journal + search)
    path(
        "conversations/shelf/",
        TopicConversationShelfView.as_view(),
        name="learning-conversation-shelf",
    ),
    path(
        "conversations/ensure/",
        TopicConversationEnsureView.as_view(),
        name="learning-conversation-ensure",
    ),
    path(
        "conversations/continue/",
        ConversationContinueListView.as_view(),
        name="learning-conversations-continue",
    ),
    path(
        "conversations/search/",
        ConversationSearchView.as_view(),
        name="learning-conversations-search",
    ),
    path(
        "conversations/<str:client_id>/messages/",
        TopicConversationAppendMessageView.as_view(),
        name="learning-conversation-append-message",
    ),
    path(
        "conversations/<str:client_id>/archive/",
        TopicConversationArchiveView.as_view(),
        name="learning-conversation-archive",
    ),
    path(
        "conversations/<str:client_id>/resume/",
        ConversationResumeSnapshotView.as_view(),
        name="learning-conversation-resume-snapshot",
    ),
    path(
        "conversations/<str:client_id>/",
        TopicConversationDetailView.as_view(),
        name="learning-conversation-detail",
    ),
]
