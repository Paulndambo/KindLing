"""
Epic C1 / C1+.1 — Spaced review (Review spark).

Selects weak / rusty skills across every subject and domain the learner has
practiced, materializes SkillReviewItem rows, and reschedules after success
or fail using a simple SM-2-lite interval. The student-facing due list is
balanced so one subject or domain cannot crowd the others out.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict, List, Optional, Sequence

from django.db import transaction
from django.utils import timezone

from curriculum.models import Skill, SkillPrerequisite, TopicSkillLink
from learning.mastery_engine import (
    STATE_LABELS,
    get_or_init_skill_mastery,
    prereq_readiness,
    skill_mastery_to_dict,
)
from learning.models import LearningProfile, SkillMastery, SkillReviewItem

# Tunables
STRUGGLE_WINDOW_DAYS = 7
WEAK_P_KNOW = 0.55
MIN_ATTEMPTS_FOR_WEAK = 1
STREAK_INCORRECT = 2
DEFAULT_EASE = 2.3
MIN_EASE = 1.3
MAX_DUE_LIST = 12
MAX_REVIEW_INTERVAL_DAYS = 180
REVIEW_INTERVAL_STEPS = (1.0, 3.0, 7.0, 14.0, 30.0, 60.0)
# Soft caps while filling the due list. Caps relax if they would leave
# empty slots and other due skills still exist.
MAX_PER_DOMAIN = 4
MAX_PER_SUBJECT = 6

MATH_SUBJECT = "Math Foundations"
CS_SUBJECT = "Computer Science"
_CS_DOMAINS = frozenset(
    {
        Skill.Domain.CS_LITERACY,
        Skill.Domain.COMP_THINKING,
        Skill.Domain.CS_FOUNDATIONS,
        Skill.Domain.PROGRAMMING,
        Skill.Domain.ALGORITHMS,
        Skill.Domain.MATH_FOR_CS,
        Skill.Domain.SYSTEMS,
        Skill.Domain.SOFTWARE_ENG,
        Skill.Domain.DATA_SYSTEMS,
        Skill.Domain.NETWORKS,
        Skill.Domain.WEB_CLOUD,
        Skill.Domain.AI_DS,
    }
)


def fallback_subject_for_skill(skill: Skill) -> str:
    """Subject label when a skill has no topic link."""
    domain = (getattr(skill, "domain", None) or "").strip()
    if domain in (Skill.Domain.FRACTIONS, Skill.Domain.EARLY_ALGEBRA):
        return MATH_SUBJECT
    if domain in _CS_DOMAINS:
        return CS_SUBJECT
    if domain:
        try:
            return str(Skill.Domain(domain).label)
        except ValueError:
            return domain.replace("_", " ").title()
    return "General"


def _enrolled_subject_keys(profile: LearningProfile) -> set[str]:
    """Case-folded names of subjects this learner actually has."""
    student = getattr(profile, "student", None)
    if student is None:
        return set()
    return {
        name.casefold()
        for name in student.subjects.values_list("name", flat=True)
        if name
    }


def _choose_topic_link(
    links: Sequence[TopicSkillLink], enrolled: set[str]
) -> Optional[TopicSkillLink]:
    """Prefer a link into a subject the learner is enrolled in."""
    if not links:
        return None
    if enrolled:
        for link in links:
            if (link.subject_name or "").casefold() in enrolled:
                return link
    return links[0]


def _topic_launch_for_skill(
    skill: Skill,
    *,
    links: Optional[Sequence[TopicSkillLink]] = None,
    enrolled: Optional[set[str]] = None,
) -> tuple[str, str]:
    """Best subject/topic labels to open a lesson for this skill."""
    if links is None:
        links = list(
            TopicSkillLink.objects.filter(skill=skill).order_by("-is_primary", "id")
        )
    enrolled = enrolled if enrolled is not None else set()
    link = _choose_topic_link(links, enrolled)
    if link:
        subject = link.subject_name or fallback_subject_for_skill(skill)
        topic = link.topic_name or skill.short_label or skill.name
        return subject, topic
    label = skill.short_label or skill.name or "Review"
    return fallback_subject_for_skill(skill), label


def _candidate_reasons(sm: SkillMastery, now=None) -> List[str]:
    """Why this skill should enter the review schedule."""
    now = now or timezone.now()
    reasons: List[str] = []
    if sm.state == SkillMastery.State.RUSTY:
        reasons.append("rusty")
    if sm.p_know < WEAK_P_KNOW and sm.attempts >= MIN_ATTEMPTS_FOR_WEAK:
        reasons.append("weak")
    if sm.consecutive_incorrect >= STREAK_INCORRECT:
        reasons.append("streak")
    if sm.incorrect >= 1 and sm.last_evidence_at:
        last = sm.last_evidence_at
        if timezone.is_naive(last):
            last = timezone.make_aware(last, timezone.utc)
        age = (now - last).total_seconds() / 86400.0
        if 0 <= age <= STRUGGLE_WINDOW_DAYS:
            reasons.append("recent_struggle")
    # Also pick up reflection-driven practice intent via low mastery + any attempt
    if sm.attempts >= 1 and sm.score < 45 and "weak" not in reasons:
        reasons.append("weak")
    return reasons


def _priority_for(sm: SkillMastery, reasons: List[str]) -> float:
    p = 1.0 - float(sm.p_know or 0.2)
    if "streak" in reasons:
        p += 0.25
    if "rusty" in reasons:
        p += 0.15
    if "recent_struggle" in reasons:
        p += 0.2
    return round(min(2.0, p), 3)


def select_review_candidates(
    profile: LearningProfile, *, now=None
) -> List[Dict[str, Any]]:
    """
    C1+.1 — weak/rusty skills from BKT + recent struggle (7-day window).

    Any practiced skill qualifies: pilot math, Computer Science layers, and
    non-pilot skills that already have mastery evidence. Untouched rows
    (no attempts, not rusty) stay off the schedule.
    """
    now = now or timezone.now()
    enrolled = _enrolled_subject_keys(profile)
    masteries = list(
        SkillMastery.objects.filter(profile=profile)
        .select_related("skill")
        .order_by("skill__domain", "skill__sort_order")
    )
    grouped: Dict[int, List[TopicSkillLink]] = {}
    skill_ids = [sm.skill_id for sm in masteries]
    if skill_ids:
        for link in TopicSkillLink.objects.filter(skill_id__in=skill_ids).order_by(
            "-is_primary", "id"
        ):
            grouped.setdefault(link.skill_id, []).append(link)

    out: List[Dict[str, Any]] = []
    for sm in masteries:
        reasons = _candidate_reasons(sm, now=now)
        if not reasons:
            continue
        subject, topic = _topic_launch_for_skill(
            sm.skill,
            links=grouped.get(sm.skill_id, []),
            enrolled=enrolled,
        )
        out.append(
            {
                "skill": sm.skill,
                "mastery": sm,
                "reasons": reasons,
                "priority": _priority_for(sm, reasons),
                "subject_name": subject,
                "topic_name": topic,
                "domain": sm.skill.domain,
            }
        )
    out.sort(key=lambda c: (-c["priority"], c["skill"].domain, c["skill"].sort_order))
    return out


@transaction.atomic
def schedule_reviews_for_profile(
    profile: LearningProfile,
    *,
    dry_run: bool = False,
    now=None,
) -> Dict[str, Any]:
    """
    C1.2 — materialize / refresh SkillReviewItem rows for a profile.
    Existing intervals preserved when still scheduled in the future.
    """
    now = now or timezone.now()
    candidates = select_review_candidates(profile, now=now)
    created = 0
    updated = 0
    due_count = 0

    seen_ids = set()
    for c in candidates:
        skill = c["skill"]
        seen_ids.add(skill.id)
        reason = c["reasons"][0]
        priority = c["priority"]
        subject = c["subject_name"]
        topic = c["topic_name"]

        existing = (
            SkillReviewItem.objects.select_for_update()
            .filter(profile=profile, skill=skill)
            .first()
        )
        if dry_run:
            if not existing or existing.due_at <= now:
                due_count += 1
            continue

        if existing:
            # Refresh reason/priority/launch; pull due sooner if newly struggling
            existing.reason = reason
            existing.priority = priority
            existing.subject_name = subject
            existing.topic_name = topic
            if existing.snoozed_until and existing.snoozed_until > now:
                # A learner's explicit postponement takes precedence over a
                # scheduler refresh, even when the skill remains a struggle.
                existing.due_at = max(existing.due_at, existing.snoozed_until)
                existing.status = SkillReviewItem.Status.SCHEDULED
                existing.save()
                updated += 1
                continue
            if existing.snoozed_until:
                existing.snoozed_until = None

            if existing.status in (
                SkillReviewItem.Status.COMPLETED,
                SkillReviewItem.Status.SKIPPED,
            ):
                # Re-open if still a candidate
                existing.status = SkillReviewItem.Status.DUE
                existing.due_at = now
                existing.interval_days = min(existing.interval_days or 1.0, 1.0)
            elif existing.due_at > now and reason in ("streak", "recent_struggle"):
                # Struggle → pull forward to due now
                existing.due_at = now
                existing.status = SkillReviewItem.Status.DUE
            elif existing.due_at <= now:
                existing.status = SkillReviewItem.Status.DUE
            else:
                existing.status = SkillReviewItem.Status.SCHEDULED
            existing.save()
            updated += 1
            if existing.due_at <= now:
                due_count += 1
        else:
            item = SkillReviewItem.objects.create(
                profile=profile,
                skill=skill,
                status=SkillReviewItem.Status.DUE,
                due_at=now,
                reason=reason,
                priority=priority,
                interval_days=1.0,
                ease=DEFAULT_EASE,
                subject_name=subject,
                topic_name=topic,
            )
            created += 1
            due_count += 1
            _ = item

    return {
        "ok": True,
        "candidates": len(candidates),
        "created": created,
        "updated": updated,
        "due": due_count,
        "dry_run": dry_run,
    }


def schedule_reviews_all_profiles(*, dry_run: bool = False) -> Dict[str, Any]:
    """Job entry: refresh schedules for every learning profile with skill data."""
    profiles = LearningProfile.objects.filter(skill_masteries__isnull=False).distinct()
    total = {"profiles": 0, "created": 0, "updated": 0, "due": 0, "dry_run": dry_run}
    for profile in profiles.iterator():
        r = schedule_reviews_for_profile(profile, dry_run=dry_run)
        total["profiles"] += 1
        total["created"] += r.get("created", 0)
        total["updated"] += r.get("updated", 0)
        total["due"] += r.get("due", 0)
    total["ok"] = True
    return total


def review_item_to_dict(item: SkillReviewItem, *, now=None) -> Dict[str, Any]:
    now = now or timezone.now()
    sm = SkillMastery.objects.filter(profile=item.profile, skill=item.skill).first()
    mastery = skill_mastery_to_dict(sm) if sm else None
    due = item.due_at <= now
    status = item.status
    if due and status == SkillReviewItem.Status.SCHEDULED:
        status = SkillReviewItem.Status.DUE
    return {
        "id": item.id,
        "skillSlug": item.skill.slug,
        "skillName": item.skill.name,
        "shortLabel": item.skill.label,
        "domain": item.skill.domain,
        "status": status,
        "dueAt": item.due_at.isoformat() if item.due_at else None,
        "snoozedUntil": item.snoozed_until.isoformat() if item.snoozed_until else None,
        "isDue": due and status in (SkillReviewItem.Status.DUE, SkillReviewItem.Status.SCHEDULED),
        "reason": item.reason,
        "priority": item.priority,
        "intervalDays": item.interval_days,
        "ease": item.ease,
        "repetitions": item.repetitions,
        "subject": item.subject_name or fallback_subject_for_skill(item.skill),
        "topic": item.topic_name or item.skill.label,
        "domainLabel": item.skill.get_domain_display(),
        "stateLabel": (mastery or {}).get("stateLabel")
        or STATE_LABELS.get((mastery or {}).get("state"), ""),
        "score": (mastery or {}).get("score"),
        "pKnow": (mastery or {}).get("pKnow"),
        "lastOutcome": item.last_outcome or None,
        "lastReviewedAt": item.last_reviewed_at.isoformat()
        if item.last_reviewed_at
        else None,
    }


def _review_item_key(item: Dict[str, Any]) -> tuple:
    if item.get("id") is not None:
        return ("id", item["id"])
    return ("slug", item.get("skillSlug") or item.get("skillName") or "")


def balance_due_reviews(
    items: List[Dict[str, Any]],
    *,
    limit: int = MAX_DUE_LIST,
    max_per_domain: int = MAX_PER_DOMAIN,
    max_per_subject: int = MAX_PER_SUBJECT,
) -> List[Dict[str, Any]]:
    """
    C1+.1 — keep the highest-priority reviews, but reserve room for every
    subject and domain that is actually due.

    Pass 1 takes the best due item per subject. Pass 2 takes the best due
    item per domain not yet represented. Pass 3 fills by priority under soft
    caps. Caps relax only to fill remaining slots.
    """
    due = [i for i in items if i.get("isDue")]
    later = [i for i in items if not i.get("isDue")]
    due.sort(key=lambda d: -float(d.get("priority") or 0))
    later.sort(key=lambda d: -float(d.get("priority") or 0))

    picked: List[Dict[str, Any]] = []
    picked_keys: set = set()

    def take(item: Dict[str, Any]) -> bool:
        key = _review_item_key(item)
        if key in picked_keys:
            return False
        picked.append(item)
        picked_keys.add(key)
        return True

    seen_subjects: set = set()
    for item in due:
        if len(picked) >= limit:
            break
        subject = item.get("subject") or ""
        if subject in seen_subjects:
            continue
        seen_subjects.add(subject)
        take(item)

    seen_domains = {item.get("domain") or "" for item in picked}
    for item in due:
        if len(picked) >= limit:
            break
        domain = item.get("domain") or ""
        if domain in seen_domains:
            continue
        if take(item):
            seen_domains.add(domain)

    subject_counts: Dict[str, int] = {}
    domain_counts: Dict[str, int] = {}
    for item in picked:
        subject = item.get("subject") or ""
        domain = item.get("domain") or ""
        subject_counts[subject] = subject_counts.get(subject, 0) + 1
        domain_counts[domain] = domain_counts.get(domain, 0) + 1

    deferred: List[Dict[str, Any]] = []
    for item in due:
        if len(picked) >= limit:
            break
        if _review_item_key(item) in picked_keys:
            continue
        subject = item.get("subject") or ""
        domain = item.get("domain") or ""
        if (
            subject_counts.get(subject, 0) >= max_per_subject
            or domain_counts.get(domain, 0) >= max_per_domain
        ):
            deferred.append(item)
            continue
        take(item)
        subject_counts[subject] = subject_counts.get(subject, 0) + 1
        domain_counts[domain] = domain_counts.get(domain, 0) + 1

    for item in deferred:
        if len(picked) >= limit:
            break
        take(item)

    for item in later:
        if len(picked) >= limit:
            break
        take(item)

    picked.sort(
        key=lambda d: (0 if d.get("isDue") else 1, -float(d.get("priority") or 0))
    )
    return picked[:limit]


def review_coverage(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Subject and domain counts for the list the student actually sees."""
    due = [item for item in items if item.get("isDue")]
    by_subject: Dict[str, Dict[str, Any]] = {}
    by_domain: Dict[str, Dict[str, Any]] = {}
    for item in due:
        subject = item.get("subject") or "General"
        domain = item.get("domain") or "general"
        subject_row = by_subject.setdefault(
            subject, {"subject": subject, "count": 0, "domains": set()}
        )
        subject_row["count"] += 1
        subject_row["domains"].add(domain)
        domain_row = by_domain.setdefault(
            domain,
            {
                "domain": domain,
                "domainLabel": item.get("domainLabel") or domain,
                "count": 0,
            },
        )
        domain_row["count"] += 1
    subjects = [
        {**row, "domains": sorted(row["domains"])} for row in by_subject.values()
    ]
    subjects.sort(key=lambda row: (-row["count"], row["subject"]))
    domains = sorted(by_domain.values(), key=lambda row: (-row["count"], row["domain"]))
    return {
        "subjectCount": len(subjects),
        "domainCount": len(domains),
        "subjects": subjects,
        "domains": domains,
    }


def list_due_reviews(
    profile: LearningProfile,
    *,
    refresh: bool = True,
    include_upcoming: bool = True,
    limit: int = MAX_DUE_LIST,
    now=None,
) -> List[Dict[str, Any]]:
    """
    Due (and optionally near-due) review sparks for the student UI.
    On-read refresh keeps cron optional. The returned window is balanced
    across subjects and domains (C1+.1).
    """
    now = now or timezone.now()
    if refresh:
        schedule_reviews_for_profile(profile, dry_run=False, now=now)

    horizon = now + timedelta(days=3) if include_upcoming else now
    qs = (
        SkillReviewItem.objects.filter(profile=profile)
        .exclude(status=SkillReviewItem.Status.SKIPPED)
        .filter(due_at__lte=horizon)
        .select_related("skill")
        .order_by("-priority", "due_at")
    )
    items = [review_item_to_dict(i, now=now) for i in qs]
    return balance_due_reviews(items, limit=limit)


def suggest_easier_skill_slug(profile: LearningProfile, skill: Skill) -> Optional[str]:
    """Optional easier prerequisite after a failed review."""
    ready, blocking = prereq_readiness(profile, skill)
    if blocking:
        return blocking[0].get("slug")
    prereq = (
        SkillPrerequisite.objects.filter(skill=skill)
        .select_related("prerequisite")
        .order_by("prerequisite__sort_order")
        .first()
    )
    if prereq:
        return prereq.prerequisite.slug
    return None


@transaction.atomic
def complete_review(
    profile: LearningProfile,
    *,
    skill_slug: str = "",
    review_id: Optional[int] = None,
    outcome: str = "success",
    now=None,
) -> Dict[str, Any]:
    """
    C1.5 — after review success, push due further out; after fail, sooner
    (+ optional easier prerequisite skill).
    """
    now = now or timezone.now()
    outcome = (outcome or "success").lower().strip()
    if outcome not in ("success", "fail", "partial"):
        outcome = "success"

    item = None
    if review_id:
        item = (
            SkillReviewItem.objects.select_for_update()
            .filter(profile=profile, id=review_id)
            .select_related("skill")
            .first()
        )
    if not item and skill_slug:
        item = (
            SkillReviewItem.objects.select_for_update()
            .filter(profile=profile, skill__slug=skill_slug)
            .select_related("skill")
            .first()
        )
    if not item:
        return {"ok": False, "error": "review_not_found"}

    ease = float(item.ease or DEFAULT_EASE)
    interval = float(item.interval_days or 1.0)
    reps = int(item.repetitions or 0)

    if outcome == "success":
        reps += 1
        # Gentle spaced steps for the first successful recalls, then grow by
        # the learner's ease factor with a finite horizon.
        interval = (
            REVIEW_INTERVAL_STEPS[reps - 1]
            if reps <= len(REVIEW_INTERVAL_STEPS)
            else max(1.0, interval * ease)
        )
        interval = min(MAX_REVIEW_INTERVAL_DAYS, interval)
        ease = min(3.0, ease + 0.12)
        status = SkillReviewItem.Status.SCHEDULED
    elif outcome == "partial":
        reps = max(0, reps - 1)
        interval = max(1.0, min(7.0, interval * 0.5))
        ease = max(MIN_EASE, ease - 0.05)
        status = SkillReviewItem.Status.SCHEDULED
    else:  # fail
        reps = 0
        interval = 1.0
        ease = max(MIN_EASE, ease - 0.2)
        status = SkillReviewItem.Status.SCHEDULED

    item.interval_days = round(interval, 2)
    item.ease = round(ease, 3)
    item.repetitions = reps
    item.last_outcome = outcome
    item.last_reviewed_at = now
    item.due_at = now + timedelta(days=interval)
    item.snoozed_until = None
    item.status = status
    item.save()

    easier = None
    if outcome == "fail":
        easier = suggest_easier_skill_slug(profile, item.skill)
        if easier:
            # Ensure easier skill is due soon
            easy_skill = Skill.objects.filter(slug=easier).first()
            if easy_skill:
                sm = get_or_init_skill_mastery(profile, easy_skill)
                subject, topic = _topic_launch_for_skill(
                    easy_skill, enrolled=_enrolled_subject_keys(profile)
                )
                easy_item, _ = SkillReviewItem.objects.get_or_create(
                    profile=profile,
                    skill=easy_skill,
                    defaults={
                        "due_at": now,
                        "status": SkillReviewItem.Status.DUE,
                        "reason": "prerequisite",
                        "priority": _priority_for(sm, ["weak"]),
                        "subject_name": subject,
                        "topic_name": topic,
                        "interval_days": 1.0,
                        "ease": DEFAULT_EASE,
                    },
                )
                if easy_item.due_at > now:
                    easy_item.due_at = now
                    easy_item.status = SkillReviewItem.Status.DUE
                    easy_item.reason = "prerequisite"
                    easy_item.save(
                        update_fields=["due_at", "status", "reason", "updated_at"]
                    )

    return {
        "ok": True,
        "review": review_item_to_dict(item, now=now),
        "outcome": outcome,
        "nextDueAt": item.due_at.isoformat(),
        "easierSkillSlug": easier,
    }


def build_reviews_payload(
    profile: LearningProfile | None,
    *,
    refresh: bool = True,
) -> Dict[str, Any]:
    if not profile:
        return {"due": [], "count": 0, "hasDue": False}
    due = list_due_reviews(profile, refresh=refresh)
    due_only = [d for d in due if d.get("isDue")]
    coverage = review_coverage(due)
    return {
        "due": due,
        "dueNow": due_only,
        "count": len(due_only),
        "hasDue": bool(due_only),
        "upcomingCount": max(0, len(due) - len(due_only)),
        "subjectCount": coverage["subjectCount"],
        "domainCount": coverage["domainCount"],
        "subjects": coverage["subjects"],
        "domains": coverage["domains"],
    }
