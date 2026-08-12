from django.conf import settings
from django.db import models


class StudentProfile(models.Model):
    """
    Learner identity / onboarding profile for a student user account.
    One profile per user — the account holder is the student.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    name = models.CharField(max_length=120)
    grade = models.CharField(max_length=40, blank=True, default="")
    avatar = models.CharField(max_length=40, blank=True, default="sparkles")
    country = models.CharField(max_length=80, blank=True, default="")
    country_flag = models.CharField(max_length=16, blank=True, default="")
    school_name = models.CharField(max_length=200, blank=True, default="")
    school_type = models.CharField(max_length=80, blank=True, default="")
    curriculum = models.CharField(max_length=120, blank=True, default="")
    academic_target = models.CharField(max_length=80, blank=True, default="")
    learning_style = models.CharField(max_length=40, blank=True, default="visual")
    interests = models.JSONField(default=list, blank=True)
    goal = models.CharField(max_length=200, blank=True, default="")
    is_onboarded = models.BooleanField(default=False)
    # Family digest preferences (Epic A5) — single-student account for now
    digest_opt_in = models.BooleanField(
        default=False,
        help_text="When true, Kindling may generate weekly parent digests.",
    )
    family_email = models.EmailField(
        blank=True,
        default="",
        help_text="Where to send digests; falls back to account email when blank.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def digest_recipient(self) -> str:
        """Email address for parent digests."""
        if self.family_email:
            return self.family_email.strip()
        user = getattr(self, "user", None)
        if user is not None:
            return (user.email or user.username or "").strip()
        return ""

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.user.email})"


def get_student_profile(user) :
    """Return the student profile for this user, or None."""
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    try:
        return user.profile
    except StudentProfile.DoesNotExist:
        return None