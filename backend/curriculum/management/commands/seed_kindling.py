"""
Seed demo student user, profile, subjects, pilot skill graph, and learning profile.

Usage:
    python manage.py seed_kindling
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from curriculum.models import (
    Skill,
    SkillPrerequisite,
    Subject,
    Topic,
    TopicSkillLink,
)
from curriculum.pilot_graph import (
    PILOT_COLOR,
    PILOT_ICON,
    PILOT_SUBJECT,
    PILOT_TOPIC_ORDER,
    PREREQS,
    TOPIC_SKILLS,
    skill_dicts,
)
from learning.models import LearningProfile, SkillMastery, TopicMastery
from learning.services import DEFAULT_BEHAVIOR, DEFAULT_DELIVERY, DEFAULT_TOTALS
from students.models import StudentProfile

User = get_user_model()

DEMO_EMAIL = "student@kindling.edu"
DEMO_PASSWORD = "kindling-demo"

DEFAULT_SUBJECTS = [
    {
        "name": PILOT_SUBJECT,
        "icon": PILOT_ICON,
        "color": PILOT_COLOR,
        "topics": PILOT_TOPIC_ORDER,
    },
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
]


class Command(BaseCommand):
    help = "Seed Kindling demo student, pilot skill graph, and default subjects."

    def handle(self, *args, **options):
        self._seed_skill_graph()

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

        self._ensure_subjects(student)

        profile, p_created = LearningProfile.objects.get_or_create(
            student=student,
            defaults={
                "client_student_id": "maya",
                "totals": {**DEFAULT_TOTALS, "sessions": 2, "exchanges": 6},
                "delivery_preferences": {**DEFAULT_DELIVERY, "visual": 3},
                "behavior": {**DEFAULT_BEHAVIOR},
            },
        )
        if p_created:
            TopicMastery.objects.create(
                profile=profile,
                subject=PILOT_SUBJECT,
                topic="Fraction sense",
                topic_key=f"{PILOT_SUBJECT}::Fraction sense",
                score=58,
                attempts=4,
                correct=2,
                incorrect=1,
            )
            self.stdout.write(self.style.SUCCESS("Created learning profile"))
        else:
            self.stdout.write("Learning profile already exists.")

        self._seed_demo_skill_mastery(profile)

        self.stdout.write(
            self.style.SUCCESS(
                "\nDone. Demo login:\n"
                f"  email:    {DEMO_EMAIL}\n"
                f"  password: {DEMO_PASSWORD}\n"
                "  or POST /api/auth/demo/\n"
                f"  Pilot subject: {PILOT_SUBJECT} (fractions → early algebra skill graph)"
            )
        )

    def _seed_skill_graph(self):
        created_skills = 0
        for data in skill_dicts():
            obj, was_created = Skill.objects.update_or_create(
                slug=data["slug"],
                defaults={
                    "name": data["name"],
                    "short_label": data["short_label"],
                    "description": data["description"],
                    "domain": data["domain"],
                    "standard_codes": data["standard_codes"],
                    "sort_order": data["sort_order"],
                    "p_init": data["p_init"],
                    "p_transit": data["p_transit"],
                    "p_slip": data["p_slip"],
                    "p_guess": data["p_guess"],
                    "is_pilot": True,
                },
            )
            if was_created:
                created_skills += 1

        prereq_created = 0
        for skill_slug, pre_slug, strength in PREREQS:
            skill = Skill.objects.filter(slug=skill_slug).first()
            pre = Skill.objects.filter(slug=pre_slug).first()
            if not skill or not pre:
                continue
            _, was = SkillPrerequisite.objects.get_or_create(
                skill=skill,
                prerequisite=pre,
                defaults={"strength": strength},
            )
            if was:
                prereq_created += 1

        links = 0
        for topic_name, skill_rows in TOPIC_SKILLS.items():
            for slug, weight, is_primary in skill_rows:
                skill = Skill.objects.filter(slug=slug).first()
                if not skill:
                    continue
                _, was = TopicSkillLink.objects.update_or_create(
                    subject_name=PILOT_SUBJECT,
                    topic_name=topic_name,
                    skill=skill,
                    defaults={"weight": weight, "is_primary": is_primary},
                )
                if was:
                    links += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Skill graph: {Skill.objects.count()} skills "
                f"(+{created_skills} new), {SkillPrerequisite.objects.count()} prereqs, "
                f"{TopicSkillLink.objects.count()} topic links"
            )
        )

    def _ensure_subjects(self, student):
        existing_names = set(student.subjects.values_list("name", flat=True))
        # Always ensure Math Foundations pilot subject exists
        for i, subj in enumerate(DEFAULT_SUBJECTS):
            if subj["name"] in existing_names:
                # Ensure pilot topics present
                if subj["name"] == PILOT_SUBJECT:
                    subject = student.subjects.filter(name=PILOT_SUBJECT).first()
                    if subject:
                        have = set(subject.topics.values_list("name", flat=True))
                        for j, topic_name in enumerate(subj["topics"]):
                            if topic_name not in have:
                                Topic.objects.create(
                                    subject=subject, name=topic_name, sort_order=j
                                )
                continue
            subject = Subject.objects.create(
                student=student,
                name=subj["name"],
                icon=subj["icon"],
                color=subj["color"],
                sort_order=i,
            )
            for j, topic_name in enumerate(subj["topics"]):
                Topic.objects.create(subject=subject, name=topic_name, sort_order=j)
            self.stdout.write(self.style.SUCCESS(f"Created subject {subj['name']}"))

        if not student.subjects.exists():
            self.stdout.write(self.style.WARNING("No subjects created."))

    def _seed_demo_skill_mastery(self, profile):
        """Give Maya a believable spark trail into fractions."""
        seeds = {
            "frac.parts_of_whole": (0.78, "mastered", 5, 4, 1),
            "frac.numerator_denominator": (0.62, "learning", 4, 2, 1),
            "frac.number_line": (0.35, "learning", 2, 0, 1),
            "frac.equivalent": (0.22, "ready", 0, 0, 0),
        }
        for slug, (p, state, attempts, correct, incorrect) in seeds.items():
            skill = Skill.objects.filter(slug=slug).first()
            if not skill:
                continue
            SkillMastery.objects.update_or_create(
                profile=profile,
                skill=skill,
                defaults={
                    "p_know": p,
                    "score": round(p * 100, 1),
                    "state": state,
                    "attempts": attempts,
                    "correct": correct,
                    "incorrect": incorrect,
                    "consecutive_correct": 2 if state == "mastered" else 0,
                },
            )
        self.stdout.write(self.style.SUCCESS("Seeded demo skill mastery sparks"))
