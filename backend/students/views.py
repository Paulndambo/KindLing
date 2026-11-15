from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from students.models import StudentProfile, StudentPushDevice, get_student_profile
from students.push_service import send_expo_push_to_user
from students.serializers import (
    StudentProfileSerializer,
    StudentPushDeviceSerializer,
    StudentPushSettingsInputSerializer,
)


class StudentProfileListCreateView(generics.ListCreateAPIView):
    """List or create the authenticated student's profile (at most one)."""

    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudentProfile.objects.filter(user=self.request.user)


class StudentProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudentProfile.objects.filter(user=self.request.user)


class StudentMeView(APIView):
    """
    GET/PUT/PATCH the profile for the logged-in student user.
    Matches the frontend's single-student onboarding model.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        if not student:
            return Response(
                {"detail": "No student profile yet.", "isOnboarded": False},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(StudentProfileSerializer(student).data)

    def put(self, request):
        """Create or fully update the student's profile (onboarding save)."""
        student = get_student_profile(request.user)
        data = {**request.data, "isOnboarded": True}
        if student:
            serializer = StudentProfileSerializer(
                student, data=data, partial=False, context={"request": request}
            )
        else:
            serializer = StudentProfileSerializer(
                data=data, context={"request": request}
            )
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        # Provision the pilot subject only during single-subject rollouts.
        try:
            from django.conf import settings
            from curriculum.cs_provision import ensure_computer_science_subject

            if not getattr(settings, "ALLOW_CUSTOM_SUBJECTS", False):
                ensure_computer_science_subject(student)
        except Exception:
            pass
        return Response(StudentProfileSerializer(student).data)

    def patch(self, request):
        student = get_student_profile(request.user)
        if not student:
            return Response(
                {"detail": "No student profile yet."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = StudentProfileSerializer(
            student, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        try:
            from django.conf import settings
            from curriculum.cs_provision import ensure_computer_science_subject

            if not getattr(settings, "ALLOW_CUSTOM_SUBJECTS", False):
                ensure_computer_science_subject(student)
        except Exception:
            pass
        return Response(StudentProfileSerializer(student).data)


def _serialize_push_state(user, student: StudentProfile | None) -> dict:
    devices = StudentPushDevice.objects.filter(user=user, is_active=True)
    return {
        "pushEnabled": student.push_enabled if student else True,
        "dailyReminderEnabled": student.daily_reminder_enabled if student else True,
        "streakReminderEnabled": student.streak_reminder_enabled if student else True,
        "reminderHour": student.reminder_hour if student else 17,
        "reminderMinute": student.reminder_minute if student else 0,
        "devices": StudentPushDeviceSerializer(devices, many=True).data,
    }


class StudentPushPreferenceAndDeviceView(APIView):
    """
    GET / POST / PATCH / DELETE /api/students/me/push/
    Manages mobile push notification preferences and Expo push device tokens.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        return Response(_serialize_push_state(request.user, student))

    def _apply_changes(self, request):
        serializer = StudentPushSettingsInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        student = get_student_profile(request.user)
        if student:
            updated_fields = []
            for key, attr in (
                ("pushEnabled", "push_enabled"),
                ("dailyReminderEnabled", "daily_reminder_enabled"),
                ("streakReminderEnabled", "streak_reminder_enabled"),
                ("reminderHour", "reminder_hour"),
                ("reminderMinute", "reminder_minute"),
            ):
                if key in data:
                    setattr(student, attr, data[key])
                    updated_fields.append(attr)
            if updated_fields:
                updated_fields.append("updated_at")
                student.save(update_fields=updated_fields)

        token = (data.get("expoPushToken") or "").strip()
        if token:
            StudentPushDevice.objects.update_or_create(
                expo_push_token=token,
                defaults={
                    "user": request.user,
                    "platform": (data.get("platform") or "").strip()[:32],
                    "device_name": (data.get("deviceName") or "").strip()[:120],
                    "is_active": data.get("pushEnabled", True)
                    if "pushEnabled" in data
                    else True,
                },
            )

        return Response(_serialize_push_state(request.user, student))

    def post(self, request):
        return self._apply_changes(request)

    def patch(self, request):
        return self._apply_changes(request)

    def delete(self, request):
        token = (
            request.data.get("expoPushToken")
            or request.query_params.get("token")
            or ""
        ).strip()
        if token:
            StudentPushDevice.objects.filter(
                user=request.user, expo_push_token=token
            ).update(is_active=False)
        else:
            StudentPushDevice.objects.filter(user=request.user).update(
                is_active=False
            )
        student = get_student_profile(request.user)
        return Response(_serialize_push_state(request.user, student))


class StudentPushTestView(APIView):
    """
    POST /api/students/me/push/test/
    Triggers a test study & streak reminder push notification via Expo Push Service.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        student = get_student_profile(request.user)
        learner_name = (
            (student.name if student else "")
            or getattr(request.user, "name", "")
            or "there"
        ).split(" ")[0]
        title = f"Ready for a quick lesson, {learner_name}? 🔥"
        body = (
            f"Keep your learning streak going! Spend 10 minutes with Kindling on {student.goal.lower() if student and student.goal else 'your next topic'}."
        )
        data = {
            "kind": "study_reminder",
            "route": "/(tabs)/learn",
        }
        delivery = send_expo_push_to_user(
            request.user, title=title, body=body, data=data
        )
        return Response(
            {
                "ok": True,
                "title": title,
                "body": body,
                "data": data,
                "delivery": delivery,
            }
        )
