from rest_framework import serializers
from typing import Dict, Any

from .models import Subject, Topic


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ("id", "name", "sort_order", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")



class SubjectSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = (
            "id",
            "name",
            "icon",
            "color",
            "sort_order",
            "topics",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data: Dict[str, Any]) -> Subject:
        student = self.context["student"]
        return Subject.objects.create(student=student, **validated_data)


class SubjectCreateSerializer(serializers.ModelSerializer):
    """Create subject with optional initial topics list."""

    topics = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = Subject
        fields = ("id", "name", "icon", "color", "sort_order", "topics")
        read_only_fields = ("id",)

    def create(self, validated_data: Dict[str, Any]) -> Subject:
        topic_names = validated_data.pop("topics", [])
        student = self.context["student"]
        subject = Subject.objects.create(student=student, **validated_data)
        for i, name in enumerate(topic_names):
            Topic.objects.create(subject=subject, name=name, sort_order=i)
        return subject


class TopicCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ("id", "name", "sort_order")
        read_only_fields = ("id",)

    def create(self, validated_data: Dict[str, Any]) -> Topic:
        subject = self.context["subject"]
        return Topic.objects.create(subject=subject, **validated_data)