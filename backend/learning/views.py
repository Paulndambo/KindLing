from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from students.models import get_student_profile

from .conversation_service import (
    append_message,
    archive_conversation,
    build_shelf,
    conversation_to_dict,
    replace_topic_shelf,
    upsert_conversation,
)
from .models import LearningEvent, LessonSession, TopicConversation
from .serializers import (
    AppendMessageSerializer,
    ArchiveConversationSerializer,
    ConversationUpsertSerializer,
    LearningEventEnvelopeSerializer,
    LearningEventSerializer,
    LessonSessionListSerializer,
    LessonSessionSerializer,
    TopicShelfSerializer,
)
from .services import (
    build_dashboard,
    build_personalization_insights,
    get_or_create_profile,
    ingest_events,
    profile_to_api_dict,
)


class LearningEventIngestView(APIView):
    """
    POST /api/learning/events/

    Accepts the frontend analytics envelope. Auth is optional so the client
    can keep posting during demo / pre-login flows; when authenticated, events
    attach to the student's profile.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LearningEventEnvelopeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user if request.user and request.user.is_authenticated else None
        result = ingest_events(
            data["events"],
            user=user,
            source=data.get("source") or "kindling-web",
            schema_version=data.get("schemaVersion") or 1,
        )

        return Response(
            {
                "ok": True,
                "delivered": result["created"],
                "skipped": result["skipped"],
                "errors": result["errors"],
                "mode": "kindling-api",
            },
            status=status.HTTP_202_ACCEPTED if result["created"] else status.HTTP_200_OK,
        )


class LearningProfileView(APIView):
    """GET longitudinal learning profile for the authenticated student."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        client_id = request.query_params.get("studentId", "")
        profile = get_or_create_profile(student, client_id)
        subject = request.query_params.get("subject", "")
        topic = request.query_params.get("topic", "")
        return Response(
            {
                "profile": profile_to_api_dict(profile),
                "insights": build_personalization_insights(profile, subject, topic),
            }
        )


class PersonalizationView(APIView):
    """GET personalization insights for tutor system prompt."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        profile = get_or_create_profile(
            student, request.query_params.get("studentId", "")
        )
        return Response(
            build_personalization_insights(
                profile,
                request.query_params.get("subject", ""),
                request.query_params.get("topic", ""),
            )
        )


class SessionListView(generics.ListAPIView):
    serializer_class = LessonSessionListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        student = get_student_profile(self.request.user)
        if not student:
            return LessonSession.objects.none()
        return LessonSession.objects.filter(student=student)


class SessionDetailView(generics.RetrieveAPIView):
    serializer_class = LessonSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "session_id"
    lookup_url_kwarg = "session_id"

    def get_queryset(self):
        student = get_student_profile(self.request.user)
        if not student:
            return LessonSession.objects.none()
        return LessonSession.objects.filter(student=student).prefetch_related("turns")


class DashboardView(APIView):
    """Aggregated student dashboard payload."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        return Response(build_dashboard(student))


class LearningEventListView(generics.ListAPIView):
    """Debug / admin-style list of recent events for the authenticated student."""

    serializer_class = LearningEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        student = get_student_profile(self.request.user)
        if not student:
            return LearningEvent.objects.none()
        return LearningEvent.objects.filter(student=student)[:100]


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "kindling-api"})


class TopicConversationShelfView(APIView):
    """
    GET  /api/learning/conversations/shelf/?subject=&topic=
    PUT  /api/learning/conversations/shelf/  — full shelf sync
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        if not student:
            return Response(
                {"detail": "Complete student onboarding first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        subject = request.query_params.get("subject") or "General"
        topic = request.query_params.get("topic") or "General"
        client_id = request.query_params.get("studentId") or f"id_{student.id}"
        return Response(build_shelf(student, subject, topic, client_id))

    def put(self, request):
        student = get_student_profile(request.user)
        if not student:
            return Response(
                {"detail": "Complete student onboarding first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = TopicShelfSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        client_id = request.data.get("studentId") or f"id_{student.id}"
        shelf = replace_topic_shelf(
            student=student,
            client_student_id=client_id,
            subject=data["subject"],
            topic=data["topic"],
            active_conversation_id=data.get("activeConversationId") or None,
            conversations=data.get("conversations") or [],
        )
        return Response(shelf)


class TopicConversationEnsureView(APIView):
    """
    POST /api/learning/conversations/ensure/
    Ensure an active conversation exists for subject×topic; create if needed.
    Body: { subject, topic, conversation? }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        student = get_student_profile(request.user)
        if not student:
            return Response(
                {"detail": "Complete student onboarding first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        subject = request.data.get("subject") or "General"
        topic = request.data.get("topic") or "General"
        client_student_id = request.data.get("studentId") or f"id_{student.id}"

        shelf = build_shelf(student, subject, topic, client_student_id)
        active_id = shelf.get("activeConversationId")
        if active_id:
            conv = TopicConversation.objects.filter(
                student=student, client_id=active_id
            ).prefetch_related("messages").first()
            if conv:
                return Response(
                    {
                        "created": False,
                        "conversation": conversation_to_dict(conv),
                        "shelf": shelf,
                    }
                )

        # Create from provided payload or empty active
        payload = request.data.get("conversation") or {}
        if not payload.get("id"):
            from django.utils import timezone

            payload = {
                "id": f"conv_{timezone.now().strftime('%Y%m%d%H%M%S')}_{student.id}",
                "subject": subject,
                "topic": topic,
                "status": "active",
                "createdAt": timezone.now().isoformat(),
                "messages": [],
                "apiHistory": [],
            }
        else:
            payload = {**payload, "subject": subject, "topic": topic, "status": "active"}

        conv = upsert_conversation(
            student=student,
            client_student_id=client_student_id,
            payload=payload,
            deactivate_other_actives=True,
        )
        shelf = build_shelf(student, subject, topic, client_student_id)
        return Response(
            {
                "created": True,
                "conversation": conversation_to_dict(conv),
                "shelf": shelf,
            },
            status=status.HTTP_201_CREATED,
        )


class TopicConversationDetailView(APIView):
    """GET/PATCH /api/learning/conversations/<client_id>/"""

    permission_classes = [permissions.IsAuthenticated]

    def _get_conv(self, request, client_id):
        student = get_student_profile(request.user)
        if not student:
            return None, Response(
                {"detail": "Complete student onboarding first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conv = (
            TopicConversation.objects.filter(student=student, client_id=client_id)
            .prefetch_related("messages")
            .first()
        )
        if not conv:
            return None, Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return conv, None

    def get(self, request, client_id):
        conv, err = self._get_conv(request, client_id)
        if err:
            return err
        return Response(conversation_to_dict(conv))

    def put(self, request, client_id):
        """Upsert full conversation document."""
        student = get_student_profile(request.user)
        if not student:
            return Response(
                {"detail": "Complete student onboarding first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = {**request.data, "id": client_id}
        ser = ConversationUpsertSerializer(data=data)
        ser.is_valid(raise_exception=True)
        client_student_id = request.data.get("studentId") or f"id_{student.id}"
        conv = upsert_conversation(
            student=student,
            client_student_id=client_student_id,
            payload=ser.validated_data,
            deactivate_other_actives=ser.validated_data.get("status") == "active",
        )
        conv = TopicConversation.objects.prefetch_related("messages").get(pk=conv.pk)
        return Response(conversation_to_dict(conv))


class TopicConversationAppendMessageView(APIView):
    """POST /api/learning/conversations/<client_id>/messages/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, client_id):
        student = get_student_profile(request.user)
        if not student:
            return Response(
                {"detail": "Complete student onboarding first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conv = TopicConversation.objects.filter(
            student=student, client_id=client_id
        ).first()
        if not conv:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        ser = AppendMessageSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        append_message(
            conv=conv,
            message={
                "id": data.get("id"),
                "role": data["role"],
                "text": data.get("text") or "",
                "kind": data.get("kind") or "",
                "at": data.get("at"),
            },
            api_pair=data.get("apiPair"),
        )
        conv = TopicConversation.objects.prefetch_related("messages").get(pk=conv.pk)
        return Response(conversation_to_dict(conv), status=status.HTTP_201_CREATED)


class TopicConversationArchiveView(APIView):
    """POST /api/learning/conversations/<client_id>/archive/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, client_id):
        student = get_student_profile(request.user)
        if not student:
            return Response(
                {"detail": "Complete student onboarding first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conv = TopicConversation.objects.filter(
            student=student, client_id=client_id
        ).prefetch_related("messages").first()
        if not conv:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        ser = ArchiveConversationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        archive_conversation(
            conv,
            title=data.get("title") or "",
            summary=data.get("summary") or "",
            highlights=data.get("highlights"),
            next_step=data.get("nextStep") or "",
            ended_at=data.get("endedAt"),
        )
        conv.refresh_from_db()
        conv = TopicConversation.objects.prefetch_related("messages").get(pk=conv.pk)
        return Response(conversation_to_dict(conv))
