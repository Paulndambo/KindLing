"""
Homework image upload + analysis attach (Epic A4).
"""

from __future__ import annotations

from django.conf import settings
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from students.models import get_student_profile

from .homework import sanitize_analysis, validate_homework_file
from .models import HomeworkUpload


def homework_to_dict(hw: HomeworkUpload, request=None) -> dict:
    url = None
    if hw.image:
        try:
            url = hw.image.url
            if request is not None:
                url = request.build_absolute_uri(url)
        except Exception:
            url = None
    return {
        "id": hw.pk,
        "status": hw.status,
        "subject": hw.subject,
        "topic": hw.topic,
        "conversationId": hw.conversation_id or None,
        "contentType": hw.content_type,
        "byteSize": hw.byte_size,
        "originalName": hw.original_name,
        "rejectReason": hw.reject_reason or None,
        "analysis": hw.analysis or {},
        "imageUrl": url,
        "createdAt": hw.created_at.isoformat() if hw.created_at else None,
        "retentionDays": getattr(settings, "KINDLING_HOMEWORK_RETENTION_DAYS", 30),
    }


class HomeworkUploadView(APIView):
    """
    POST /api/learning/homework/

    multipart/form-data:
      image (required)
      subject, topic, conversationId, studentId (optional)
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        student = get_student_profile(request.user)
        upload = request.FILES.get("image") or request.FILES.get("file")
        if not upload:
            return Response(
                {"detail": "Missing image file (field name: image)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = getattr(upload, "content_type", "") or ""
        size = int(getattr(upload, "size", 0) or 0)
        filename = getattr(upload, "name", "") or ""

        ok, reason = validate_homework_file(
            content_type=content_type,
            byte_size=size,
            filename=filename,
        )
        if not ok:
            return Response(
                {"detail": reason, "code": "HOMEWORK_REJECTED"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hw = HomeworkUpload.objects.create(
            student=student,
            client_student_id=request.data.get("studentId") or "",
            conversation_id=request.data.get("conversationId") or "",
            subject=request.data.get("subject") or "",
            topic=request.data.get("topic") or "",
            image=upload,
            content_type=content_type,
            byte_size=size,
            original_name=filename[:200],
            status=HomeworkUpload.Status.UPLOADED,
        )
        return Response(
            homework_to_dict(hw, request),
            status=status.HTTP_201_CREATED,
        )


class HomeworkDetailView(APIView):
    """GET /api/learning/homework/<id>/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        student = get_student_profile(request.user)
        hw = HomeworkUpload.objects.filter(pk=pk, student=student).first()
        if not hw:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(homework_to_dict(hw, request))

    def delete(self, request, pk):
        student = get_student_profile(request.user)
        hw = HomeworkUpload.objects.filter(pk=pk, student=student).first()
        if not hw:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if hw.image:
            hw.image.delete(save=False)
        hw.delete()
        return Response({"ok": True, "deleted": pk})


class HomeworkAnalyzeView(APIView):
    """
    POST /api/learning/homework/<id>/analyze/

    Attach client-side (or server) vision analysis JSON to the upload.
    Body: { analysis: { problem, studentWork, errors[], ... } }
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, pk):
        student = get_student_profile(request.user)
        hw = HomeworkUpload.objects.filter(pk=pk, student=student).first()
        if not hw:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if hw.status == HomeworkUpload.Status.REJECTED:
            return Response(
                {"detail": "Upload was rejected.", "reason": hw.reject_reason},
                status=status.HTTP_400_BAD_REQUEST,
            )

        analysis = sanitize_analysis(request.data.get("analysis") or request.data)

        # Soft content gate from vision model flags
        if analysis.get("isHomework") is False:
            hw.status = HomeworkUpload.Status.REJECTED
            hw.reject_reason = "Image does not look like school work."
            hw.analysis = analysis
            hw.save(
                update_fields=["status", "reject_reason", "analysis", "updated_at"]
            )
            return Response(
                {
                    "detail": hw.reject_reason,
                    "code": "NOT_HOMEWORK",
                    "homework": homework_to_dict(hw, request),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reject if analysis includes distress / unsafe flags
        notes = str(analysis.get("notes") or "").lower()
        if any(
            x in notes
            for x in ("self-harm", "suicide", "porn", "nude", "weapon build")
        ):
            hw.status = HomeworkUpload.Status.REJECTED
            hw.reject_reason = "This image cannot be used for tutoring."
            hw.analysis = {"blocked": True}
            hw.save(
                update_fields=["status", "reject_reason", "analysis", "updated_at"]
            )
            return Response(
                {"detail": hw.reject_reason, "code": "UNSAFE_CONTENT"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hw.analysis = analysis
        hw.status = HomeworkUpload.Status.ANALYZED
        hw.save(update_fields=["analysis", "status", "updated_at"])
        return Response(homework_to_dict(hw, request))
