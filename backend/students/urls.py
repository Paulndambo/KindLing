from django.urls import path

from .views import (
    StudentMeView,
    StudentProfileDetailView,
    StudentProfileListCreateView,
    StudentPushPreferenceAndDeviceView,
    StudentPushTestView,
)

urlpatterns = [
    path("", StudentProfileListCreateView.as_view(), name="student-list"),
    path("me/", StudentMeView.as_view(), name="student-me"),
    path("me/push/", StudentPushPreferenceAndDeviceView.as_view(), name="student-me-push"),
    path("me/push/test/", StudentPushTestView.as_view(), name="student-me-push-test"),
    path("<int:pk>/", StudentProfileDetailView.as_view(), name="student-detail"),
]
