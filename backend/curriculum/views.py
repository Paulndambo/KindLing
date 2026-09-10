from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subject, Topic, Subtopic
from students.models import get_student_profile

from .serializers import (
    SubjectCreateSerializer,
    SubjectSerializer,
    TopicCreateSerializer,
    TopicSerializer,
    SubtopicCreateSerializer,
    SubtopicSerializer,
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
            "topics__subtopics"
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
        from django.conf import settings

        # Multi-subject creation gated off while Computer Science is sole pilot
        if not getattr(settings, "ALLOW_CUSTOM_SUBJECTS", False):
            return Response(
                {
                    "detail": (
                        "Custom subjects are temporarily disabled. "
                        "Kindling currently offers Computer Science only — "
                        "multi-subject will return in a later release."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )
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
        return Subject.objects.filter(student=student).prefetch_related(
            "topics__subtopics"
        )


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
        qs = subject.topics.prefetch_related("subtopics").all()
        return Response(TopicSerializer(qs, many=True).data)

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
        return Topic.objects.filter(subject__student=student).prefetch_related(
            "subtopics"
        )


class SubtopicListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_topic(self, request, topic_id):
        student = get_student_profile(request.user)
        if not student:
            raise NotFound("No student profile.")
        try:
            return Topic.objects.get(pk=topic_id, subject__student=student)
        except Topic.DoesNotExist:
            raise NotFound("Topic not found.")

    def get(self, request, topic_id):
        topic = self.get_topic(request, topic_id)
        return Response(SubtopicSerializer(topic.subtopics.all(), many=True).data)

    def post(self, request, topic_id):
        topic = self.get_topic(request, topic_id)
        serializer = SubtopicCreateSerializer(
            data=request.data, context={"topic": topic}
        )
        serializer.is_valid(raise_exception=True)
        sub = serializer.save()
        return Response(SubtopicSerializer(sub).data, status=status.HTTP_201_CREATED)


class SubtopicDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubtopicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        student = get_student_profile(self.request.user)
        if not student:
            return Subtopic.objects.none()
        return Subtopic.objects.filter(topic__subject__student=student)
