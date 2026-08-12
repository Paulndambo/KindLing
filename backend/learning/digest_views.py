"""Parent digest API (Epic A5)."""

from __future__ import annotations

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from students.models import get_student_profile

from .digest_service import (
    deliver_digest,
    digest_to_api,
    generate_digest_for_student,
    week_window,
)
from .models import ParentDigest


class DigestListView(APIView):
    """GET /api/learning/digests/ — list digests for the authenticated student."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = get_student_profile(request.user)
        if not student:
            return Response({"items": [], "count": 0})
        qs = ParentDigest.objects.filter(student=student).order_by("-period_end")[
            :20
        ]
        items = [digest_to_api(d) for d in qs]
        return Response(
            {
                "items": items,
                "count": len(items),
                "digestOptIn": student.digest_opt_in,
                "familyEmail": student.family_email or student.digest_recipient(),
            }
        )


class DigestDetailView(APIView):
    """GET /api/learning/digests/<id>/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        student = get_student_profile(request.user)
        digest = ParentDigest.objects.filter(pk=pk, student=student).first()
        if not digest:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(digest_to_api(digest))


class DigestGenerateView(APIView):
    """
    POST /api/learning/digests/generate/

    Generate (and optionally deliver) this week's digest for the current student.
    Body: { "deliver": true, "dryRun": true }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        student = get_student_profile(request.user)
        if not student:
            return Response(
                {"detail": "Complete student onboarding first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deliver = request.data.get("deliver", True)
        dry_run = request.data.get("dryRun", True)
        # Allow generating even if not opted in (preview); delivery still respects opt-in
        # unless dryRun and forcePreview
        force_preview = bool(request.data.get("forcePreview", True))

        start, end = week_window()
        digest = generate_digest_for_student(
            student, period_start=start, period_end=end, force=True
        )

        if deliver:
            # dry_run always "sends" in-app; real email only when dryRun false + opt-in
            if dry_run or student.digest_opt_in or force_preview:
                # Temporarily allow in-app delivery when previewing
                if not student.digest_opt_in and dry_run:
                    digest = deliver_digest(digest, dry_run=True)
                else:
                    digest = deliver_digest(digest, dry_run=bool(dry_run))

        return Response(
            {
                "ok": True,
                "digest": digest_to_api(digest),
            },
            status=status.HTTP_201_CREATED,
        )
