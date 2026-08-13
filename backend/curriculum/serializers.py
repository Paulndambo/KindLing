from rest_framework import serializers
from typing import Any, Dict, List, Union

from .models import Subject, Topic

FAMILIARITY_VALUES = {c.value for c in Topic.Familiarity}


def normalize_topic_input(raw: Union[str, Dict[str, Any]], sort_order: int = 0) -> Dict[str, Any]:
    """Accept a plain name string or {name, familiarity, learning_goal}."""
    if isinstance(raw, str):
        name = raw.strip()
        return {
            "name": name,
            "familiarity": Topic.Familiarity.NEW,
            "learning_goal": "",
            "sort_order": sort_order,
        }
    if not isinstance(raw, dict):
        raise serializers.ValidationError("Each topic must be a string or object.")
    name = str(raw.get("name") or "").strip()
    if not name:
        raise serializers.ValidationError("Topic name is required.")
    fam = str(raw.get("familiarity") or Topic.Familiarity.NEW).strip().lower()
    if fam not in FAMILIARITY_VALUES:
        fam = Topic.Familiarity.NEW
    goal = str(raw.get("learning_goal") or raw.get("learningGoal") or "").strip()
    order = raw.get("sort_order", raw.get("sortOrder", sort_order))
    try:
        order = int(order)
    except (TypeError, ValueError):
        order = sort_order
    return {
        "name": name,
        "familiarity": fam,
        "learning_goal": goal[:4000],
        "sort_order": order,
    }


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = (
            "id",
            "name",
            "sort_order",
            "familiarity",
            "learning_goal",
            "created_at",
            "updated_at",
        )
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
            "learning_goal",
            "topics",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data: Dict[str, Any]) -> Subject:
        student = self.context["student"]
        return Subject.objects.create(student=student, **validated_data)


class SubjectCreateSerializer(serializers.ModelSerializer):
    """Create subject with optional initial topics (names or objects)."""

    topics = serializers.ListField(
        child=serializers.JSONField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = Subject
        fields = (
            "id",
            "name",
            "icon",
            "color",
            "sort_order",
            "learning_goal",
            "topics",
        )
        read_only_fields = ("id",)

    def validate_topics(self, value: List[Any]) -> List[Dict[str, Any]]:
        if not value:
            return []
        normalized = []
        for i, item in enumerate(value):
            # JSONField may already be a plain string from some clients
            if isinstance(item, (str, dict)):
                normalized.append(normalize_topic_input(item, sort_order=i))
            else:
                raise serializers.ValidationError(
                    f"Topic at index {i} must be a string or object."
                )
        return normalized

    def create(self, validated_data: Dict[str, Any]) -> Subject:
        topics_data = validated_data.pop("topics", [])
        student = self.context["student"]
        subject = Subject.objects.create(student=student, **validated_data)
        for row in topics_data:
            Topic.objects.create(subject=subject, **row)
        return subject


class TopicCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ("id", "name", "sort_order", "familiarity", "learning_goal")
        read_only_fields = ("id",)
        extra_kwargs = {
            "familiarity": {"required": False},
            "learning_goal": {"required": False},
        }

    def validate_familiarity(self, value: str) -> str:
        if not value:
            return Topic.Familiarity.NEW
        v = str(value).strip().lower()
        if v not in FAMILIARITY_VALUES:
            raise serializers.ValidationError("Invalid familiarity level.")
        return v

    def create(self, validated_data: Dict[str, Any]) -> Topic:
        subject = self.context["subject"]
        validated_data.setdefault("familiarity", Topic.Familiarity.NEW)
        validated_data.setdefault("learning_goal", "")
        return Topic.objects.create(subject=subject, **validated_data)