"""
Seed demo student user, profile, subjects, and a starter learning profile.

Usage:
    python manage.py seed_kindling
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from curriculum.models import Subject, Topic
from learning.models import LearningProfile, TopicMastery
from learning.services import DEFAULT_BEHAVIOR, DEFAULT_DELIVERY, DEFAULT_TOTALS
from students.models import StudentProfile

User = get_user_model()

DEMO_EMAIL = "student@kindling.edu"
DEMO_PASSWORD = "kindling-demo"

DEFAULT_SUBJECTS = [
    {
        "name": "Software Development Level 1",
        "icon": "code",
        "color": "#E8F4F8",
        "topics": [
            "Introduction to programming",
            "Data structures",
            "Algorithms",
        ],
    },
    {
        "name": "Software Development Level 2",
        "icon": "code",
        "color": "#E8F4F8",
        "topics": [
            "Software development",
            "Web development",
            "Databases",
        ],
    },
    {
        "name": "Software Development Level 3",
        "icon": "code",
        "color": "#E8F4F8",
        "topics": [
            "Advanced software development",
            "Enterprise web development",
            "Advanced databases",
        ],
    },
    {
        "name": "Software Development Level 4",
        "icon": "code",
        "color": "#E8F4F8",
        "topics": [
            "Software architecture",
            "Cloud computing",
            "DevOps",
        ],
    },
]


class Command(BaseCommand):
    help = "Seed Kindling demo student user, profile, and default subjects."

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            username=DEMO_EMAIL,
            defaults={"email": DEMO_EMAIL, "first_name": "Maya"},
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created demo user {DEMO_EMAIL}"))
        else:
            self.stdout.write(f"Demo user already exists: {DEMO_EMAIL}")

        student, s_created = StudentProfile.objects.get_or_create(
            user=user,
            defaults={
                "name": "Maya",
                "grade": "5th Grade",
                "avatar": "sparkles",
                "country": "United States",
                "country_flag": "🇺🇸",
                "school_name": "Lincoln Elementary",
                "school_type": "Public / State School",
                "curriculum": "US Common Core & State Standards",
                "academic_target": "Honors / Advanced Placement",
                "learning_style": "visual",
                "interests": ["🚀 Space & Astronomy", "🎨 Art & Drawing"],
                "goal": "Get ahead with extra challenge",
                "is_onboarded": True,
            },
        )
        if s_created:
            self.stdout.write(self.style.SUCCESS(f"Created student profile {student.name}"))
        else:
            self.stdout.write(f"Student profile already exists: {student.name}")

        if not student.subjects.exists():
            for i, subj in enumerate(DEFAULT_SUBJECTS):
                subject = Subject.objects.create(
                    student=student,
                    name=subj["name"],
                    icon=subj["icon"],
                    color=subj["color"],
                    sort_order=i,
                )
                for j, topic_name in enumerate(subj["topics"]):
                    Topic.objects.create(
                        subject=subject, name=topic_name, sort_order=j
                    )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Seeded {len(DEFAULT_SUBJECTS)} subjects with topics"
                )
            )
        else:
            self.stdout.write("Subjects already present — skipped.")

        profile, p_created = LearningProfile.objects.get_or_create(
            student=student,
            defaults={
                "client_student_id": "maya",
                "totals": {**DEFAULT_TOTALS},
                "delivery_preferences": {**DEFAULT_DELIVERY, "visual": 3},
                "behavior": {**DEFAULT_BEHAVIOR},
            },
        )
        if p_created:
            TopicMastery.objects.create(
                profile=profile,
                subject="Software Development Level 1",
                topic="Introduction to programming",
                topic_key="Software Development Level 1::Introduction to programming",
                score=62,
                attempts=4,
                correct=2,
                incorrect=1,
            )
            self.stdout.write(self.style.SUCCESS("Created empty learning profile"))
        else:
            self.stdout.write("Learning profile already exists.")

        self.stdout.write(
            self.style.SUCCESS(
                "\nDone. Demo login:\n"
                f"  email:    {DEMO_EMAIL}\n"
                f"  password: {DEMO_PASSWORD}\n"
                "  or POST /api/auth/demo/"
            )
        )
