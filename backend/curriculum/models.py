from django.db import models

from students.models import StudentProfile


class Subject(models.Model):
    """A subject area owned by a student (e.g. Math, Software Development Level 1)."""

    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="subjects",
    )
    name = models.CharField(max_length=160)
    icon = models.CharField(max_length=40, blank=True, default="book")
    color = models.CharField(max_length=20, blank=True, default="#E8F4F8")
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["student", "sort_order"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.student.name})"


class Topic(models.Model):
    """A topic within a subject (e.g. Comparing fractions)."""

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="topics",
    )
    name = models.CharField(max_length=200)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["subject", "sort_order"]),
        ]

    def __str__(self):
        return f"{self.name} · {self.subject.name}"
