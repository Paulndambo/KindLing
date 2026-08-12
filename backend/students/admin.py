from django.contrib import admin

from .models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "user",
        "grade",
        "curriculum",
        "is_onboarded",
        "digest_opt_in",
    )
    list_filter = ("is_onboarded", "digest_opt_in", "grade")
    search_fields = ("name", "user__email", "school_name", "family_email")
    raw_id_fields = ("user",)
