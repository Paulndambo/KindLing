from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subject, Topic
from students.models import get_student_profile

from .serializers import (
    SubjectCreateSerializer,
    SubjectSerializer,
    TopicCreateSerializer,
    TopicSerializer,
)


class SubjectListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_student(self):
        student = get_student_profile(self.request.user)
        if not student:
            raise NotFound("Create a student profile before managing subjects.")
        return student

    def get_queryset(self):
        return Subject.objects.filter(student=self.get_student()).prefetch_related(
            "topics"
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SubjectCreateSerializer
        return SubjectSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["student"] = self.get_student()
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        return Response(
            SubjectSerializer(subject).data, status=status.HTTP_201_CREATED
        )


class SubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        student = get_student_profile(self.request.user)
        if not student:
            return Subject.objects.none()
        return Subject.objects.filter(student=student).prefetch_related("topics")


class TopicListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_subject(self, request, subject_id):
        student = get_student_profile(request.user)
        if not student:
            raise NotFound("No student profile.")
        try:
            return Subject.objects.get(pk=subject_id, student=student)
        except Subject.DoesNotExist:
            raise NotFound("Subject not found.")

    def get(self, request, subject_id):
        subject = self.get_subject(request, subject_id)
        return Response(TopicSerializer(subject.topics.all(), many=True).data)

    def post(self, request, subject_id):
        subject = self.get_subject(request, subject_id)
        serializer = TopicCreateSerializer(
            data=request.data, context={"subject": subject}
        )
        serializer.is_valid(raise_exception=True)
        topic = serializer.save()
        return Response(TopicSerializer(topic).data, status=status.HTTP_201_CREATED)


class TopicDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TopicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        student = get_student_profile(self.request.user)
        if not student:
            return Topic.objects.none()
        return Topic.objects.filter(subject__student=student)
