from django.contrib import admin

from .models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "grade", "curriculum", "is_onboarded")
    list_filter = ("is_onboarded", "grade")
    search_fields = ("name", "user__email", "school_name")
    raw_id_fields = ("user",)
