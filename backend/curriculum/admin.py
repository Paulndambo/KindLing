from django.contrib import admin

from .models import Subject, Topic


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 0


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "student", "icon", "sort_order")
    list_filter = ("icon",)
    search_fields = ("name", "student__name")
    inlines = [TopicInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ("name", "subject", "sort_order")
    search_fields = ("name", "subject__name")
