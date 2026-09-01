from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from students.models import get_student_profile

from .conversation_service import (
    append_message,
    archive_conversation,
    build_shelf,
    conversation_to_dict,
    list_continuable,
    replace_topic_shelf,
    search_transcripts,
    update_resume_snapshot,
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
    ResumeSnapshotSerializer,
    TopicShelfSerializer,
)
from .mastery_engine import build_topic_skill_path, recommend_next_skill
from .review_service import (
    build_reviews_payload,
    complete_review,
    schedule_reviews_for_profile,
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


class SkillPathView(APIView):
    """
    GET /api/learning/skills/path/?subject=&topic=

    Skills linked to a lesson topic + readiness + recommended next skill.
    Auth optional so demo/local clients still get the catalog graph.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        subject = request.query_params.get("subject") or ""
        topic = request.query_params.get("topic") or ""
        student = None
        if request.user and request.user.is_authenticated:
            student = get_student_profile(request.user)
        client_id = request.query_params.get("studentId", "")
        profile = None
        if student or client_id:
            profile = get_or_create_profile(student, client_id)
        path = build_topic_skill_path(profile, subject, topic)
        return Response(path)


class SkillRecommendView(APIView):
    """GET /api/learning/skills/next/ — next recommended skill for the learner."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        profile = get_or_create_profile(
            student, request.query_params.get("studentId", "")
        )
        rec = recommend_next_skill(
            profile,
            request.query_params.get("subject", ""),
            request.query_params.get("topic", ""),
        )
        return Response({"recommended": rec})


class ReviewListView(APIView):
    """
    Epic C1 — GET /api/learning/reviews/
    Due / upcoming Review spark items (on-read refresh by default).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        profile = get_or_create_profile(
            student, request.query_params.get("studentId", "")
        )
        refresh = request.query_params.get("refresh", "1") not in ("0", "false", "no")
        payload = build_reviews_payload(profile, refresh=refresh)
        return Response(payload)

    def post(self, request):
        """Force reschedule (same as refresh job for this learner)."""
        student = get_student_profile(request.user)
        profile = get_or_create_profile(
            student, request.data.get("studentId") or request.query_params.get("studentId", "")
        )
        if not profile:
            return Response({"ok": False, "error": "no_profile"}, status=400)
        result = schedule_reviews_for_profile(profile, dry_run=False)
        payload = build_reviews_payload(profile, refresh=False)
        return Response({**payload, "schedule": result})


class ReviewCompleteView(APIView):
    """
    Epic C1 — POST /api/learning/reviews/complete/
    Body: { skillSlug? , reviewId?, outcome: success|fail|partial }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        student = get_student_profile(request.user)
        profile = get_or_create_profile(
            student, request.data.get("studentId") or ""
        )
        if not profile:
            return Response({"ok": False, "error": "no_profile"}, status=400)
        result = complete_review(
            profile,
            skill_slug=request.data.get("skillSlug") or request.data.get("skill_slug") or "",
            review_id=request.data.get("reviewId") or request.data.get("review_id"),
            outcome=request.data.get("outcome") or "success",
        )
        code = status.HTTP_200_OK if result.get("ok") else status.HTTP_404_NOT_FOUND
        return Response(result, status=code)


class SkillCatalogView(APIView):
    """GET /api/learning/skills/ — pilot skill catalog (graph nodes + prereqs)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from curriculum.models import Skill, SkillPrerequisite

        skills = []
        for s in Skill.objects.filter(is_pilot=True).order_by("sort_order"):
            prereqs = list(
                SkillPrerequisite.objects.filter(skill=s).values_list(
                    "prerequisite__slug", "strength"
                )
            )
            skills.append(
                {
                    "slug": s.slug,
                    "name": s.name,
                    "shortLabel": s.label,
                    "domain": s.domain,
                    "description": s.description,
                    "standardCodes": s.standard_codes or [],
                    "sortOrder": s.sort_order,
                    "prerequisites": [
                        {"slug": slug, "strength": strength}
                        for slug, strength in prereqs
                    ],
                }
            )
        return Response({"skills": skills, "pilot": True})


class MultiStepProblemListView(APIView):
    """
    GET /api/learning/multistep/?subject=&topic=&skill=

    Epic B6 — structured show-your-work problems.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from learning.multistep_service import (
            list_multistep_problems,
            pick_multistep_problem,
        )

        subject = request.query_params.get("subject") or ""
        topic = request.query_params.get("topic") or ""
        skill = request.query_params.get("skill") or ""
        try:
            limit = int(request.query_params.get("limit") or 20)
        except (TypeError, ValueError):
            limit = 20
        problems = list_multistep_problems(
            subject=subject, topic=topic, skill=skill, limit=limit
        )
        best = pick_multistep_problem(
            subject=subject, topic=topic, skill=skill
        )
        return Response(
            {
                "problems": problems,
                "best": best,
                "count": len(problems),
                "source": "library",
                "query": {"subject": subject, "topic": topic, "skill": skill},
            }
        )


class MisconceptionCatalogView(APIView):
    """
    GET /api/learning/misconceptions/?topic=&skill=&domain=

    Epic B5 — catalog + playbooks. Optional POST body detect:
    POST { studentText, tutorText, topic, subject } → hits with playbooks.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from learning.misconception_service import list_misconception_defs

        topic = request.query_params.get("topic") or ""
        skill = request.query_params.get("skill") or ""
        domain = request.query_params.get("domain") or ""
        try:
            limit = int(request.query_params.get("limit") or 40)
        except (TypeError, ValueError):
            limit = 40
        defs = list_misconception_defs(
            domain=domain, topic=topic, skill=skill, limit=limit
        )
        return Response(
            {
                "misconceptions": defs,
                "count": len(defs),
                "source": "catalog",
                "query": {"topic": topic, "skill": skill, "domain": domain},
            }
        )

    def post(self, request):
        from learning.misconception_service import (
            detect_misconceptions_text,
            playbook_prompt_block,
        )

        student_text = (
            request.data.get("studentText")
            or request.data.get("student_text")
            or ""
        )
        tutor_text = request.data.get("tutorText") or request.data.get("tutor_text") or ""
        topic = request.data.get("topic") or request.query_params.get("topic") or ""
        subject = request.data.get("subject") or ""
        skill = request.data.get("skill") or ""
        hits = detect_misconceptions_text(
            student_text,
            tutor_text,
            topic=topic,
            subject=subject,
            skill=skill,
        )
        return Response(
            {
                "hits": hits,
                "promptBlock": playbook_prompt_block(hits),
                "count": len(hits),
            }
        )


class WorkedExampleListView(APIView):
    """
    GET /api/learning/worked-examples/?subject=&topic=&skill=&grade=&kind=

    Epic B4 — curated library examples (prefer over free generation).
    Auth optional so demo / local clients can still load the pack.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from learning.worked_example_service import (
            find_best_worked_example,
            find_worked_examples,
            library_prompt_block,
        )

        subject = request.query_params.get("subject") or ""
        topic = request.query_params.get("topic") or ""
        skill = request.query_params.get("skill") or request.query_params.get(
            "skillSlug"
        ) or ""
        grade = request.query_params.get("grade") or ""
        kind = request.query_params.get("kind") or ""
        try:
            limit = int(request.query_params.get("limit") or 8)
        except (TypeError, ValueError):
            limit = 8

        # Optional grade from authenticated student profile
        if not grade and request.user and request.user.is_authenticated:
            student = get_student_profile(request.user)
            if student and student.grade:
                grade = student.grade

        examples = find_worked_examples(
            subject=subject,
            topic=topic,
            skill=skill,
            grade=grade or None,
            kind=kind,
            limit=limit,
        )
        best = examples[0] if examples else find_best_worked_example(
            subject=subject,
            topic=topic,
            skill=skill,
            grade=grade or None,
            kind=kind or "example",
        )
        counters = find_worked_examples(
            subject=subject,
            topic=topic,
            skill=skill,
            grade=grade or None,
            kind="counterexample",
            limit=4,
        )
        return Response(
            {
                "examples": examples,
                "best": best,
                "counterexamples": counters,
                "promptBlock": library_prompt_block(
                    [e for e in examples if e.get("kind") == "example"] or examples,
                    max_examples=2,
                ),
                "source": "library",
                "query": {
                    "subject": subject,
                    "topic": topic,
                    "skill": skill,
                    "grade": grade,
                    "kind": kind,
                },
            }
        )


class MathVerifyView(APIView):
    """
    POST /api/learning/verify-math/

    Independent math check for a student answer vs expected forms.
    Used for debugging and optional server-side re-grade.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from learning.math_verify import (
            resolve_graded_correctness,
            verify_math_answer,
        )

        student_text = request.data.get("studentText") or request.data.get(
            "student_answer"
        ) or ""
        tutor_text = request.data.get("tutorText") or ""
        expected = request.data.get("expected")
        alts = request.data.get("alts") or request.data.get("expectedAlts") or []
        linguistic = request.data.get("linguistic") or request.data.get(
            "linguisticCorrectness"
        )

        verification = verify_math_answer(
            student_text,
            expected=expected,
            alts=list(alts) if isinstance(alts, (list, tuple)) else [],
            tutor_text=tutor_text,
        )
        graded = None
        if linguistic:
            graded = resolve_graded_correctness(linguistic, verification)

        if verification.get("discrepancy"):
            from core.logging_utils import log_event
            import logging

            log_event(
                "math.grade_disagreement",
                level=logging.WARNING,
                linguistic=linguistic,
                verified=verification.get("correctness"),
                method=verification.get("method"),
            )

        return Response(
            {
                "verification": verification,
                "graded": graded,
            }
        )


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


class ConversationContinueListView(APIView):
    """
    GET /api/learning/conversations/continue/

    Active threads with transcript content — power "Continue where we left off".
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        if not student:
            return Response({"items": [], "count": 0})
        try:
            limit = min(50, max(1, int(request.query_params.get("limit", 20))))
        except (TypeError, ValueError):
            limit = 20
        items = list_continuable(student, limit=limit)
        return Response({"items": items, "count": len(items)})


class ConversationSearchView(APIView):
    """
    GET /api/learning/conversations/search/?q=&subject=&topic=

    Transcript keyword search (Epic A2.4).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        q = request.query_params.get("q") or ""
        if not student:
            return Response({"results": [], "query": q, "count": 0})
        if len(q.strip()) < 2:
            return Response(
                {"detail": "Query must be at least 2 characters.", "results": []},
                status=status.HTTP_400_BAD_REQUEST,
            )
        results = search_transcripts(
            student,
            q,
            subject=request.query_params.get("subject") or "",
            topic=request.query_params.get("topic") or "",
        )
        return Response({"results": results, "query": q, "count": len(results)})


class ConversationResumeSnapshotView(APIView):
    """
    PUT /api/learning/conversations/<client_id>/resume/

    Save intervention / tools / personalization snapshot for safe resume.
    """

    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, client_id):
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

        ser = ResumeSnapshotSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        update_resume_snapshot(conv, ser.validated_data)
        conv.refresh_from_db()
        return Response(
            {
                "ok": True,
                "id": conv.client_id,
                "resumeSnapshot": conv.resume_snapshot or {},
                "updatedAt": conv.updated_at.isoformat() if conv.updated_at else None,
            }
        )
