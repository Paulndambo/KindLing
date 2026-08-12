from django.urls import path

from .views import (
    StudentMeView,
    StudentProfileDetailView,
    StudentProfileListCreateView,
)

urlpatterns = [
    path("", StudentProfileListCreateView.as_view(), name="student-list"),
    path("me/", StudentMeView.as_view(), name="student-me"),
    path("<int:pk>/", StudentProfileDetailView.as_view(), name="student-detail"),
]
