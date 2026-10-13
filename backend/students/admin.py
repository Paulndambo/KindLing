from django.contrib import admin

from .models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "user",
        "grade",
        "curriculum",
        "preferred_language",
        "is_onboarded",
        "digest_opt_in",
        "week_focus",
        "target_date",
    )
    list_filter = ("is_onboarded", "digest_opt_in", "grade")
    search_fields = ("name", "user__email", "school_name", "family_email", "week_focus", "goal")
    raw_id_fields = ("user",)
    fields = (
        "user",
        "name",
        "grade",
        "avatar",
        "country",
        "country_flag",
        "preferred_language",
        "school_name",
        "school_type",
        "curriculum",
        "academic_target",
        "learning_style",
        "interests",
        "focus_subjects",
        "goal",
        "week_focus",
        "target_label",
        "target_date",
        "is_onboarded",
        "digest_opt_in",
        "family_email",
    )
