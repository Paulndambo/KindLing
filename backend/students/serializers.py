from rest_framework import serializers

from .models import StudentProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    """API shape aligned with frontend student profile keys (camelCase via source)."""

    countryFlag = serializers.CharField(
        source="country_flag", required=False, allow_blank=True
    )
    schoolName = serializers.CharField(
        source="school_name", required=False, allow_blank=True
    )
    schoolType = serializers.CharField(
        source="school_type", required=False, allow_blank=True
    )
    academicTarget = serializers.CharField(
        source="academic_target", required=False, allow_blank=True
    )
    learningStyle = serializers.CharField(
        source="learning_style", required=False, allow_blank=True
    )
    focusSubjects = serializers.ListField(
        child=serializers.CharField(max_length=80),
        source="focus_subjects",
        required=False,
        allow_empty=True,
    )
    isOnboarded = serializers.BooleanField(source="is_onboarded", required=False)
    digestOptIn = serializers.BooleanField(source="digest_opt_in", required=False)
    familyEmail = serializers.EmailField(
        source="family_email", required=False, allow_blank=True
    )
    weekFocus = serializers.CharField(
        source="week_focus",
        required=False,
        allow_blank=True,
        max_length=240,
    )

    class Meta:
        model = StudentProfile
        fields = (
            "id",
            "name",
            "grade",
            "avatar",
            "country",
            "countryFlag",
            "schoolName",
            "schoolType",
            "curriculum",
            "academicTarget",
            "learningStyle",
            "interests",
            "focusSubjects",
            "goal",
            "weekFocus",
            "isOnboarded",
            "digestOptIn",
            "familyEmail",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        user = self.context["request"].user
        if StudentProfile.objects.filter(user=user).exists():
            raise serializers.ValidationError(
                {"detail": "This account already has a student profile."}
            )
        return StudentProfile.objects.create(user=user, **validated_data)
