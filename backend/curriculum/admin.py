from django.contrib import admin

from .models import (
    MisconceptionDef,
    MultiStepProblem,
    Skill,
    SkillPrerequisite,
    Subject,
    Topic,
    TopicSkillLink,
    WorkedExample,
)


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 0
    fields = ("name", "familiarity", "learning_goal", "sort_order")


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "student", "icon", "sort_order")
    list_filter = ("icon",)
    search_fields = ("name", "student__name", "learning_goal")
    inlines = [TopicInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ("name", "subject", "familiarity", "sort_order")
    list_filter = ("familiarity",)
    search_fields = ("name", "subject__name", "learning_goal")


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


@admin.register(WorkedExample)
class WorkedExampleAdmin(admin.ModelAdmin):
    list_display = (
        "slug",
        "title",
        "kind",
        "skill",
        "subject_name",
        "grade_min",
        "grade_max",
        "is_active",
        "sort_order",
    )
    list_filter = ("kind", "is_active", "subject_name", "skill__domain")
    search_fields = ("slug", "title", "problem", "skill__slug")
    raw_id_fields = ("skill",)


@admin.register(MisconceptionDef)
class MisconceptionDefAdmin(admin.ModelAdmin):
    list_display = (
        "slug",
        "label",
        "domain",
        "skill",
        "is_active",
        "sort_order",
    )
    list_filter = ("domain", "is_active")
    search_fields = ("slug", "label", "description", "skill__slug")
    raw_id_fields = ("skill",)


@admin.register(MultiStepProblem)
class MultiStepProblemAdmin(admin.ModelAdmin):
    list_display = (
        "slug",
        "title",
        "skill",
        "subject_name",
        "is_active",
        "sort_order",
    )
    list_filter = ("is_active", "subject_name")
    search_fields = ("slug", "title", "prompt", "skill__slug")
    raw_id_fields = ("skill",)
