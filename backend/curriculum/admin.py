from django.contrib import admin

from .models import Skill, SkillPrerequisite, Subject, Topic, TopicSkillLink


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


class SkillPrerequisiteInline(admin.TabularInline):
    model = SkillPrerequisite
    fk_name = "skill"
    extra = 0


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "domain", "sort_order", "is_pilot")
    list_filter = ("domain", "is_pilot")
    search_fields = ("slug", "name", "description")
    inlines = [SkillPrerequisiteInline]


@admin.register(SkillPrerequisite)
class SkillPrerequisiteAdmin(admin.ModelAdmin):
    list_display = ("skill", "prerequisite", "strength")
    list_filter = ("strength",)


@admin.register(TopicSkillLink)
class TopicSkillLinkAdmin(admin.ModelAdmin):
    list_display = ("subject_name", "topic_name", "skill", "weight", "is_primary")
    list_filter = ("subject_name",)
    search_fields = ("topic_name", "skill__slug")
