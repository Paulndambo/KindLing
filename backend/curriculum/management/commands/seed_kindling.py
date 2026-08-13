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
        self._seed_worked_examples()
        self._seed_misconceptions()
        self._seed_multistep_problems()

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
                # Epic A5 — demo family digests on by default
                "digest_opt_in": True,
                "family_email": DEMO_EMAIL,
            },
        )
        if s_created:
            self.stdout.write(self.style.SUCCESS(f"Created student profile {student.name}"))
        else:
            # Keep re-seeds aligned with demo digest prefs
            updated = False
            if not student.digest_opt_in:
                student.digest_opt_in = True
                updated = True
            if not student.family_email:
                student.family_email = DEMO_EMAIL
                updated = True
            if updated:
                student.save(update_fields=["digest_opt_in", "family_email", "updated_at"])
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
        self._seed_demo_digest(student)

        self.stdout.write(
            self.style.SUCCESS(
                "\nDone. Demo login:\n"
                f"  email:    {DEMO_EMAIL}\n"
                f"  password: {DEMO_PASSWORD}\n"
                "  or POST /api/auth/demo/\n"
                f"  Pilot subject: {PILOT_SUBJECT} (fractions → early algebra skill graph)\n"
                "  Family digests: opt-in on (Dashboard → Family digest)"
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
                                    subject=subject,
                                    name=topic_name,
                                    sort_order=j,
                                    familiarity=Topic.Familiarity.BEGINNER,
                                    learning_goal=(
                                        f"Build a clear foundation in {topic_name}."
                                    ),
                                )
                continue
            subject = Subject.objects.create(
                student=student,
                name=subj["name"],
                icon=subj["icon"],
                color=subj["color"],
                sort_order=i,
                learning_goal=subj.get(
                    "learning_goal",
                    f"Grow steadily in {subj['name']} with Kindling.",
                ),
            )
            for j, topic_name in enumerate(subj["topics"]):
                Topic.objects.create(
                    subject=subject,
                    name=topic_name,
                    sort_order=j,
                    familiarity=Topic.Familiarity.BEGINNER,
                    learning_goal=f"Build a clear foundation in {topic_name}.",
                )
            self.stdout.write(self.style.SUCCESS(f"Created subject {subj['name']}"))

        if not student.subjects.exists():
            self.stdout.write(self.style.WARNING("No subjects created."))

    def _seed_worked_examples(self):
        """Epic B4 — curated worked examples + counterexamples for pilot skills."""
        from curriculum.models import Skill, WorkedExample
        from curriculum.worked_examples_data import WORKED_EXAMPLES

        created = 0
        updated = 0
        for row in WORKED_EXAMPLES:
            skill = Skill.objects.filter(slug=row["skill_slug"]).first()
            defaults = {
                "skill": skill,
                "title": row["title"],
                "summary": row.get("summary") or "",
                "problem": row["problem"],
                "steps": row.get("steps") or [],
                "takeaway": row.get("takeaway") or "",
                "counterexample": row.get("counterexample") or "",
                "kind": row.get("kind") or WorkedExample.Kind.EXAMPLE,
                "subject_name": row.get("subject_name") or "",
                "topic_names": row.get("topic_names") or [],
                "grade_min": row.get("grade_min", 0),
                "grade_max": row.get("grade_max", 12),
                "language_notes": row.get("language_notes") or "",
                "sort_order": row.get("sort_order", 0),
                "is_active": True,
            }
            _, was_created = WorkedExample.objects.update_or_create(
                slug=row["slug"],
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Worked examples: {WorkedExample.objects.count()} total "
                f"(+{created} new, {updated} updated)"
            )
        )

    def _seed_misconceptions(self):
        """Epic B5 — misconception catalog + remediation playbooks."""
        from curriculum.misconceptions_data import MISCONCEPTIONS
        from curriculum.models import MisconceptionDef, Skill

        created = 0
        updated = 0
        for row in MISCONCEPTIONS:
            skill = None
            if row.get("skill_slug"):
                skill = Skill.objects.filter(slug=row["skill_slug"]).first()
            defaults = {
                "label": row["label"],
                "domain": row.get("domain") or "general",
                "description": row.get("description") or "",
                "skill": skill,
                "topic_names": row.get("topic_names") or [],
                "student_cues": row.get("student_cues") or [],
                "patterns": row.get("patterns") or [],
                "playbook": row.get("playbook") or {},
                "related_example_slug": row.get("related_example_slug") or "",
                "related_counter_slug": row.get("related_counter_slug") or "",
                "sort_order": row.get("sort_order") or 0,
                "is_active": True,
            }
            _, was = MisconceptionDef.objects.update_or_create(
                slug=row["slug"],
                defaults=defaults,
            )
            if was:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Misconception defs: {MisconceptionDef.objects.count()} total "
                f"(+{created} new, {updated} updated)"
            )
        )

    def _seed_multistep_problems(self):
        """Epic B6 — multi-step show-your-work problems."""
        from curriculum.models import MultiStepProblem, Skill
        from curriculum.multistep_data import MULTI_STEP_PROBLEMS

        created = 0
        updated = 0
        for row in MULTI_STEP_PROBLEMS:
            skill = Skill.objects.filter(slug=row.get("skill_slug")).first()
            defaults = {
                "skill": skill,
                "title": row["title"],
                "prompt": row["prompt"],
                "subject_name": row.get("subject_name") or "",
                "topic_names": row.get("topic_names") or [],
                "steps": row.get("steps") or [],
                "final_expected": row.get("final_expected") or "",
                "final_alts": row.get("final_alts") or [],
                "sort_order": row.get("sort_order") or 0,
                "is_active": True,
            }
            _, was = MultiStepProblem.objects.update_or_create(
                slug=row["slug"],
                defaults=defaults,
            )
            if was:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Multi-step problems: {MultiStepProblem.objects.count()} total "
                f"(+{created} new, {updated} updated)"
            )
        )

    def _seed_demo_digest(self, student):
        """Generate an in-app digest so the dashboard has something to show."""
        from learning.digest_service import (
            deliver_digest,
            generate_digest_for_student,
        )

        digest = generate_digest_for_student(student, force=True)
        deliver_digest(digest, dry_run=True)
        self.stdout.write(
            self.style.SUCCESS(
                f"Parent digest ready (id={digest.pk}, status={digest.status})"
            )
        )

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
