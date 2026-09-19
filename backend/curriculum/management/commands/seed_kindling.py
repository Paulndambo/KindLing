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
    TopicSkillLink,
)
from curriculum.pilot_graph import (
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
                "grade": "High School (9–10)",
                "avatar": "sparkles",
                "country": "Kenya",
                "country_flag": "🇰🇪",
                "school_name": "Kindling Demo Academy",
                "school_type": "Public / State School",
                "curriculum": "Custom / Other Curriculum",
                "academic_target": "Course pass / solid understanding",
                "learning_style": "logic",
                "interests": ["💻 Coding", "🎮 Games", "🚀 Space & Astronomy"],
                "focus_subjects": [PILOT_SUBJECT],
                "goal": "Learn computer science from the ground up",
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
            first_topic = PILOT_TOPIC_ORDER[0] if PILOT_TOPIC_ORDER else "Understanding technology"
            TopicMastery.objects.create(
                profile=profile,
                subject=PILOT_SUBJECT,
                topic=first_topic,
                topic_key=f"{PILOT_SUBJECT}::{first_topic}",
                score=48,
                attempts=3,
                correct=1,
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
                f"  Pilot subject: {PILOT_SUBJECT} "
                f"({len(PILOT_TOPIC_ORDER)} lessons in topic units · CS graph L0+)\n"
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
        keep_pairs = set()
        for topic_name, skill_rows in TOPIC_SKILLS.items():
            for slug, weight, is_primary in skill_rows:
                skill = Skill.objects.filter(slug=slug).first()
                if not skill:
                    continue
                keep_pairs.add((topic_name, skill.id))
                _, was = TopicSkillLink.objects.update_or_create(
                    subject_name=PILOT_SUBJECT,
                    topic_name=topic_name,
                    skill=skill,
                    defaults={"weight": weight, "is_primary": is_primary},
                )
                if was:
                    links += 1

        # Drop stale pilot links (old merged lesson names or extra skill rows)
        stale_qs = TopicSkillLink.objects.filter(subject_name=PILOT_SUBJECT)
        stale_ids = [
            row.id
            for row in stale_qs.only("id", "topic_name", "skill_id")
            if (row.topic_name, row.skill_id) not in keep_pairs
        ]
        stale_n = len(stale_ids)
        if stale_ids:
            TopicSkillLink.objects.filter(id__in=stale_ids).delete()

        # Drop obsolete higher-layer pilot skills no longer in L0–L5 graph
        keep_slugs = {d["slug"] for d in skill_dicts()}
        obsolete = Skill.objects.filter(is_pilot=True).exclude(slug__in=keep_slugs)
        obsolete_n = obsolete.count()
        if obsolete_n:
            obsolete.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Skill graph: {Skill.objects.count()} skills "
                f"(+{created_skills} new), {SkillPrerequisite.objects.count()} prereqs, "
                f"{TopicSkillLink.objects.count()} topic links"
                + (f", removed {stale_n} stale links" if stale_n else "")
                + (f", removed {obsolete_n} obsolete skills" if obsolete_n else "")
            )
        )

    def _ensure_subjects(self, student):
        from curriculum.cs_provision import ensure_computer_science_subject

        ensure_computer_science_subject(student)
        self.stdout.write(self.style.SUCCESS(f"Ensured subject {PILOT_SUBJECT}"))

        # Multi-subject off: remove legacy demo subjects that are not CS
        extras = student.subjects.exclude(name=PILOT_SUBJECT)
        if extras.exists():
            n = extras.count()
            extras.delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Removed {n} non-pilot subject(s); sole subject is {PILOT_SUBJECT}."
                )
            )

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
        from django.utils import timezone
        from datetime import timedelta
        from learning.review_service import schedule_reviews_for_profile

        now = timezone.now()
        seeds = {
            # slug: p, state, attempts, correct, incorrect, consecutive_incorrect, last_days_ago
            "cs.l0.tech_basics": (0.82, "mastered", 5, 4, 1, 0, 12),
            "cs.l0.what_is_computer": (0.7, "learning", 4, 3, 1, 0, 6),
            "cs.l0.hardware": (0.42, "learning", 4, 1, 2, 1, 2),
            "cs.l0.software": (0.38, "learning", 3, 1, 2, 1, 1),
            "cs.l1.problem_solving": (0.3, "learning", 3, 1, 2, 2, 1),
        }
        for slug, (p, state, attempts, correct, incorrect, cinc, days_ago) in seeds.items():
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
                    "consecutive_incorrect": cinc,
                    "last_evidence_at": now - timedelta(days=days_ago),
                    "last_correctness": "incorrect" if cinc else "correct",
                },
            )
        # Epic C1 — materialize Review spark due items for demo
        result = schedule_reviews_for_profile(profile, dry_run=False)
        self.stdout.write(self.style.SUCCESS("Seeded demo skill mastery sparks"))
        self.stdout.write(
            self.style.SUCCESS(
                f"Review spark schedule: due≈{result.get('due', 0)} "
                f"(created {result.get('created', 0)}, updated {result.get('updated', 0)})"
            )
        )
