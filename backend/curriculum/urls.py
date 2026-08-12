from django.urls import path

from .views import (
    SubjectDetailView,
    SubjectListCreateView,
    TopicDetailView,
    TopicListCreateView,
)

urlpatterns = [
    path("", SubjectListCreateView.as_view(), name="subject-list"),
    path("<int:pk>/", SubjectDetailView.as_view(), name="subject-detail"),
    path(
        "<int:subject_id>/topics/",
        TopicListCreateView.as_view(),
        name="topic-list-create",
    ),
    path("topics/<int:pk>/", TopicDetailView.as_view(), name="topic-detail"),
]
