from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from students.models import StudentProfile, get_student_profile
from students.serializers import StudentProfileSerializer


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
        serializer.save()
        return Response(serializer.data)

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
        serializer.save()
        return Response(serializer.data)
