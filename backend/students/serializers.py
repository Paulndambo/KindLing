from rest_framework import serializers

from .models import StudentProfile, StudentPushDevice


class StudentProfileSerializer(serializers.ModelSerializer):
    """API shape aligned with frontend student profile keys (camelCase via source)."""

    countryFlag = serializers.CharField(
        source="country_flag", required=False, allow_blank=True
    )
    preferredLanguage = serializers.CharField(
        source="preferred_language",
        required=False,
        allow_blank=True,
        max_length=80,
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
    targetLabel = serializers.CharField(
        source="target_label", required=False, allow_blank=True, max_length=120
    )
    targetDate = serializers.DateField(
        source="target_date", required=False, allow_null=True
    )
    pushEnabled = serializers.BooleanField(source="push_enabled", required=False)
    dailyReminderEnabled = serializers.BooleanField(
        source="daily_reminder_enabled", required=False
    )
    streakReminderEnabled = serializers.BooleanField(
        source="streak_reminder_enabled", required=False
    )
    reminderHour = serializers.IntegerField(
        source="reminder_hour", required=False, min_value=0, max_value=23
    )
    reminderMinute = serializers.IntegerField(
        source="reminder_minute", required=False, min_value=0, max_value=59
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
            "preferredLanguage",
            "schoolName",
            "schoolType",
            "curriculum",
            "academicTarget",
            "learningStyle",
            "interests",
            "focusSubjects",
            "goal",
            "weekFocus",
            "targetLabel",
            "targetDate",
            "isOnboarded",
            "digestOptIn",
            "familyEmail",
            "pushEnabled",
            "dailyReminderEnabled",
            "streakReminderEnabled",
            "reminderHour",
            "reminderMinute",
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


class StudentPushDeviceSerializer(serializers.ModelSerializer):
    expoPushToken = serializers.CharField(source="expo_push_token")
    deviceName = serializers.CharField(source="device_name", required=False, allow_blank=True)
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    lastSeenAt = serializers.DateTimeField(source="last_seen_at", read_only=True)

    class Meta:
        model = StudentPushDevice
        fields = (
            "id",
            "expoPushToken",
            "platform",
            "deviceName",
            "isActive",
            "lastSeenAt",
        )
        read_only_fields = ("id", "isActive", "lastSeenAt")


class StudentPushSettingsInputSerializer(serializers.Serializer):
    expoPushToken = serializers.CharField(required=False, allow_blank=True, max_length=255)
    platform = serializers.CharField(required=False, allow_blank=True, max_length=32)
    deviceName = serializers.CharField(required=False, allow_blank=True, max_length=120)
    pushEnabled = serializers.BooleanField(required=False)
    dailyReminderEnabled = serializers.BooleanField(required=False)
    streakReminderEnabled = serializers.BooleanField(required=False)
    reminderHour = serializers.IntegerField(required=False, min_value=0, max_value=23)
    reminderMinute = serializers.IntegerField(required=False, min_value=0, max_value=59)
