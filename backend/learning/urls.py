from django.urls import path

from .views import (
    DashboardView,
    HealthView,
    LearningEventIngestView,
    LearningEventListView,
    LearningProfileView,
    PersonalizationView,
    SessionDetailView,
    SessionListView,
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
    path("sessions/", SessionListView.as_view(), name="learning-sessions"),
    path(
        "sessions/<str:session_id>/",
        SessionDetailView.as_view(),
        name="learning-session-detail",
    ),
    path("dashboard/", DashboardView.as_view(), name="learning-dashboard"),
    # Durable topic conversations (resume + journal)
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
        "conversations/<str:client_id>/",
        TopicConversationDetailView.as_view(),
        name="learning-conversation-detail",
    ),
]
