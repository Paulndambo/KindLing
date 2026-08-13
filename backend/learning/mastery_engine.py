"""
BKT-lite mastery engine + readiness on the Kindling skill graph (Epic A1).

Creative product language maps states to warm labels (Growing roots → Glowing)
while the math stays a transparent Bayesian Knowledge Tracing variant.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict, Iterable, List, Optional, Sequence

from django.db import transaction
from django.utils import timezone

from curriculum.models import Skill, SkillPrerequisite, TopicSkillLink
from learning.models import Correctness, LearningProfile, SkillMastery, TopicMastery

# Thresholds (tunable)
READY_PREREQ_P = 0.55  # required prereq p_know to unlock
MASTERED_P = 0.85
MASTERED_STREAK = 2
RUSTY_DAYS = 14
MAX_EVIDENCE = 12

# Warm UI labels (mirrors SkillMastery.State help text)
STATE_LABELS = {
    SkillMastery.State.LOCKED: "Growing roots",
    SkillMastery.State.READY: "Ready to spark",
    SkillMastery.State.LEARNING: "Catching fire",
    SkillMastery.State.MASTERED: "Glowing",
    SkillMastery.State.RUSTY: "Needs a warm-up",
}


def clamp(x: float, lo: float = 0.0, hi: float = 0.995) -> float:
    return max(lo, min(hi, x))


def observation_from_correctness(correctness: str) -> Optional[bool]:
    """
    Map exchange correctness to a binary BKT observation.
    partial → soft positive handled outside classic BKT as fractional update.
    """
    if correctness == Correctness.CORRECT:
        return True
    if correctness == Correctness.INCORRECT:
        return False
    return None  # partial / exploring / unknown → special path


def bkt_update(
    p_know: float,
    *,
    correct: Optional[bool],
    partial: bool = False,
    p_transit: float = 0.12,
    p_slip: float = 0.08,
    p_guess: float = 0.18,
) -> float:
    """
    One-step Bayesian Knowledge Tracing update.

    - correct True/False: classic BKT posterior then learn transition
    - partial: pull p_know gently toward ~0.65 without full credit
    """
    p = clamp(float(p_know), 0.01, 0.99)

    if partial and correct is None:
        target = 0.65
        return clamp(p + 0.08 * (target - p))

    if correct is None:
        # exploring / unknown — tiny exploration prior bump only
        return clamp(p + 0.01)

    # Likelihood of observation
    if correct:
        # P(correct) = p*(1-slip) + (1-p)*guess
        p_obs = p * (1 - p_slip) + (1 - p) * p_guess
        if p_obs <= 1e-9:
            p_post = p
        else:
            p_post = (p * (1 - p_slip)) / p_obs
    else:
        # P(incorrect) = p*slip + (1-p)*(1-guess)
        p_obs = p * p_slip + (1 - p) * (1 - p_guess)
        if p_obs <= 1e-9:
            p_post = p
        else:
            p_post = (p * p_slip) / p_obs

    p_post = clamp(p_post)
    # Learn transition after observation
    p_next = p_post + (1 - p_post) * p_transit
    return clamp(p_next)


def apply_forgetting(p_know: float, last_evidence_at, now=None) -> float:
    """Light exponential decay if skill has been idle (rusty path)."""
    if not last_evidence_at:
        return p_know
    now = now or timezone.now()
    if timezone.is_naive(last_evidence_at):
        last = timezone.make_aware(last_evidence_at, timezone.utc)
    else:
        last = last_evidence_at
    days = max(0.0, (now - last).total_seconds() / 86400.0)
    if days < RUSTY_DAYS:
        return p_know
    # Slow decay toward prior after long gap
    decay = 0.04 * min(days - RUSTY_DAYS, 60) / 30.0
    return clamp(p_know * (1 - decay), 0.05, 0.99)


def prereq_readiness(
    profile: LearningProfile, skill: Skill
) -> tuple[bool, List[Dict[str, Any]]]:
    """Return (ready, blocking_prereqs)."""
    links = SkillPrerequisite.objects.filter(
        skill=skill, strength=SkillPrerequisite.Strength.REQUIRED
    ).select_related("prerequisite")
    blocking = []
    for link in links:
        sm = SkillMastery.objects.filter(
            profile=profile, skill=link.prerequisite
        ).first()
        p = sm.p_know if sm else link.prerequisite.p_init
        p = apply_forgetting(p, sm.last_evidence_at if sm else None)
        if p < READY_PREREQ_P:
            blocking.append(
                {
                    "slug": link.prerequisite.slug,
                    "name": link.prerequisite.name,
                    "p_know": round(p, 3),
                    "score": round(p * 100),
                }
            )
    return (len(blocking) == 0, blocking)


def derive_state(
    p_know: float,
    *,
    locked: bool,
    consecutive_correct: int,
    attempts: int,
    last_evidence_at,
) -> str:
    p = apply_forgetting(p_know, last_evidence_at)
    if locked:
        return SkillMastery.State.LOCKED
    if (
        p >= MASTERED_P
        and consecutive_correct >= MASTERED_STREAK
        and attempts >= 2
    ):
        # Check rusty
        if last_evidence_at:
            now = timezone.now()
            last = last_evidence_at
            if timezone.is_naive(last):
                last = timezone.make_aware(last, timezone.utc)
            if (now - last) > timedelta(days=RUSTY_DAYS):
                return SkillMastery.State.RUSTY
        return SkillMastery.State.MASTERED
    if attempts == 0:
        return SkillMastery.State.READY
    if p >= MASTERED_P * 0.95 and consecutive_correct >= 1:
        return SkillMastery.State.LEARNING
    return SkillMastery.State.LEARNING if attempts else SkillMastery.State.READY


def get_or_init_skill_mastery(
    profile: LearningProfile, skill: Skill
) -> SkillMastery:
    sm, created = SkillMastery.objects.get_or_create(
        profile=profile,
        skill=skill,
        defaults={
            "p_know": skill.p_init,
            "score": skill.p_init * 100,
            "state": SkillMastery.State.READY,
        },
    )
    if created:
        ready, _ = prereq_readiness(profile, skill)
        sm.state = (
            SkillMastery.State.READY if ready else SkillMastery.State.LOCKED
        )
        sm.save(update_fields=["state"])
    return sm


def apply_remediation_boost(
    profile: LearningProfile,
    skill_slug: str,
    amount: float = 0.08,
) -> Optional[SkillMastery]:
    """
    Epic B5 — after a misconception is remediated, nudge linked skill mastery up.
    Soft positive evidence without counting as a full correct attempt.
    """
    skill = Skill.objects.filter(slug=skill_slug).first()
    if not skill or not profile:
        return None
    sm = get_or_init_skill_mastery(profile, skill)
    now = timezone.now()
    p_before = apply_forgetting(sm.p_know, sm.last_evidence_at, now=now)
    # Gentle lift toward mastery (not a full BKT correct)
    p_after = clamp(p_before + amount * (1.0 - p_before))
    sm.p_know = p_after
    sm.score = round(p_after * 100, 2)
    sm.last_evidence_at = now
    sm.last_correctness = Correctness.PARTIAL
    ready, _ = prereq_readiness(profile, skill)
    sm.state = derive_state(
        sm.p_know,
        locked=not ready,
        consecutive_correct=sm.consecutive_correct,
        attempts=sm.attempts,
        last_evidence_at=sm.last_evidence_at,
    )
    sm.save()
    return sm

@transaction.atomic
def update_skills_for_exchange(
    profile: LearningProfile,
    subject: str,
    topic: str,
    signals: dict,
) -> List[SkillMastery]:
    """
    Update all skills linked to this subject×topic from one graded exchange.
    Also refreshes topic-level TopicMastery as a weighted blend of skill scores.
    """
    links = list(
        TopicSkillLink.objects.filter(
            subject_name__iexact=(subject or "").strip(),
            topic_name__iexact=(topic or "").strip(),
        ).select_related("skill")
    )
    if not links:
        # Fuzzy: topic name only (pilot topics unique enough)
        links = list(
            TopicSkillLink.objects.filter(
                topic_name__iexact=(topic or "").strip()
            ).select_related("skill")
        )
    if not links:
        return []

    correctness = (signals or {}).get("correctness") or Correctness.UNKNOWN
    confidence = float((signals or {}).get("confidence") or 0.5)
    is_hint = bool((signals or {}).get("isHintRequest"))
    obs = observation_from_correctness(correctness)
    partial = correctness == Correctness.PARTIAL

    updated: List[SkillMastery] = []
    now = timezone.now()

    for link in links:
        skill = link.skill
        sm = get_or_init_skill_mastery(profile, skill)
        ready, _blocking = prereq_readiness(profile, skill)

        # Slightly damp updates when locked (still learn if they practice early)
        damp = 1.0 if ready else 0.55
        # Confidence modulates transit-ish strength
        conf_boost = 0.85 + 0.3 * confidence

        p_before = apply_forgetting(sm.p_know, sm.last_evidence_at, now=now)
        p_transit = skill.p_transit * damp * conf_boost
        if is_hint and obs is not False:
            # Hint request without incorrect: small uncertainty bump down
            p_after = clamp(p_before - 0.02 * damp)
        else:
            p_after = bkt_update(
                p_before,
                correct=obs,
                partial=partial,
                p_transit=min(0.35, p_transit),
                p_slip=skill.p_slip,
                p_guess=skill.p_guess,
            )

        sm.p_know = p_after
        sm.score = round(p_after * 100, 2)
        sm.attempts += 1
        sm.last_evidence_at = now
        sm.last_correctness = correctness

        if correctness == Correctness.CORRECT:
            sm.correct += 1
            sm.consecutive_correct += 1
            sm.consecutive_incorrect = 0
        elif correctness == Correctness.INCORRECT:
            sm.incorrect += 1
            sm.consecutive_incorrect += 1
            sm.consecutive_correct = 0
        elif partial:
            sm.partial += 1
            sm.consecutive_correct = 0

        sm.state = derive_state(
            sm.p_know,
            locked=not ready,
            consecutive_correct=sm.consecutive_correct,
            attempts=sm.attempts,
            last_evidence_at=sm.last_evidence_at,
        )

        evidence = list(sm.evidence or [])
        evidence.append(
            {
                "at": now.isoformat(),
                "obs": correctness,
                "p_know": round(sm.p_know, 4),
                "weight": link.weight,
            }
        )
        sm.evidence = evidence[-MAX_EVIDENCE:]
        sm.save()
        updated.append(sm)

    # Recompute topic mastery as weighted skill blend
    _sync_topic_mastery_from_skills(profile, subject, topic, links)
    # Unlock cascade: recompute states for skills that depend on updated ones
    _refresh_related_states(profile, [u.skill_id for u in updated])
    return updated


def _sync_topic_mastery_from_skills(
    profile: LearningProfile,
    subject: str,
    topic: str,
    links: Sequence[TopicSkillLink],
) -> None:
    from learning.services import topic_key

    key = topic_key(subject, topic)
    total_w = sum(max(0.05, float(l.weight)) for l in links) or 1.0
    blend = 0.0
    attempts = 0
    correct = 0
    incorrect = 0
    for link in links:
        sm = SkillMastery.objects.filter(profile=profile, skill=link.skill).first()
        p = sm.p_know if sm else link.skill.p_init
        w = max(0.05, float(link.weight))
        blend += p * w
        if sm:
            attempts += sm.attempts
            correct += sm.correct
            incorrect += sm.incorrect
    score = (blend / total_w) * 100

    mastery, _ = TopicMastery.objects.get_or_create(
        profile=profile,
        topic_key=key,
        defaults={
            "subject": subject or "General",
            "topic": topic or "General",
            "score": score,
        },
    )
    # Blend with existing heuristic score so non-skill path still matters lightly
    mastery.score = round(0.75 * score + 0.25 * float(mastery.score or score), 2)
    mastery.attempts = max(mastery.attempts, attempts)
    mastery.correct = max(mastery.correct, correct)
    mastery.incorrect = max(mastery.incorrect, incorrect)
    mastery.save()


def _refresh_related_states(profile: LearningProfile, skill_ids: Iterable[int]) -> None:
    # Skills unlocked by these skills
    dependents = SkillPrerequisite.objects.filter(
        prerequisite_id__in=list(skill_ids)
    ).select_related("skill")
    for dep in dependents:
        sm = SkillMastery.objects.filter(profile=profile, skill=dep.skill).first()
        if not sm:
            continue
        ready, _ = prereq_readiness(profile, dep.skill)
        sm.state = derive_state(
            sm.p_know,
            locked=not ready,
            consecutive_correct=sm.consecutive_correct,
            attempts=sm.attempts,
            last_evidence_at=sm.last_evidence_at,
        )
        sm.save(update_fields=["state", "updated_at"])


def skill_mastery_to_dict(sm: SkillMastery) -> Dict[str, Any]:
    ready, blocking = prereq_readiness(sm.profile, sm.skill)
    return {
        "slug": sm.skill.slug,
        "name": sm.skill.name,
        "shortLabel": sm.skill.label,
        "domain": sm.skill.domain,
        "description": sm.skill.description,
        "standardCodes": sm.skill.standard_codes or [],
        "pKnow": round(sm.p_know, 4),
        "score": round(sm.score, 1),
        "attempts": sm.attempts,
        "correct": sm.correct,
        "incorrect": sm.incorrect,
        "partial": sm.partial,
        "consecutiveCorrect": sm.consecutive_correct,
        "state": sm.state,
        "stateLabel": STATE_LABELS.get(sm.state, sm.state),
        "ready": ready,
        "blockingPrereqs": blocking,
        "lastEvidenceAt": sm.last_evidence_at.isoformat()
        if sm.last_evidence_at
        else None,
        "lastCorrectness": sm.last_correctness or None,
    }


def build_topic_skill_path(
    profile: LearningProfile | None,
    subject: str,
    topic: str,
) -> Dict[str, Any]:
    """Skills for a topic + readiness + recommended next skill in domain."""
    links = list(
        TopicSkillLink.objects.filter(
            subject_name__iexact=(subject or "").strip(),
            topic_name__iexact=(topic or "").strip(),
        )
        .select_related("skill")
        .order_by("skill__sort_order")
    )
    if not links:
        links = list(
            TopicSkillLink.objects.filter(topic_name__iexact=(topic or "").strip())
            .select_related("skill")
            .order_by("skill__sort_order")
        )

    skills_out = []
    for link in links:
        skill = link.skill
        if profile:
            sm = get_or_init_skill_mastery(profile, skill)
            d = skill_mastery_to_dict(sm)
        else:
            d = {
                "slug": skill.slug,
                "name": skill.name,
                "shortLabel": skill.label,
                "domain": skill.domain,
                "description": skill.description,
                "standardCodes": skill.standard_codes or [],
                "pKnow": skill.p_init,
                "score": round(skill.p_init * 100, 1),
                "attempts": 0,
                "state": SkillMastery.State.READY,
                "stateLabel": STATE_LABELS[SkillMastery.State.READY],
                "ready": True,
                "blockingPrereqs": [],
            }
        d["weight"] = link.weight
        d["isPrimary"] = link.is_primary
        skills_out.append(d)

    next_rec = recommend_next_skill(profile, subject, topic)
    topic_state = _aggregate_topic_state(skills_out)

    return {
        "subject": subject,
        "topic": topic,
        "skills": skills_out,
        "topicState": topic_state,
        "topicStateLabel": STATE_LABELS.get(topic_state, topic_state),
        "recommendedNext": next_rec,
        "hasGraph": bool(skills_out),
    }


def _aggregate_topic_state(skills: List[dict]) -> str:
    if not skills:
        return SkillMastery.State.READY
    states = [s.get("state") for s in skills]
    if all(s == SkillMastery.State.MASTERED for s in states):
        return SkillMastery.State.MASTERED
    if any(s == SkillMastery.State.LOCKED for s in states):
        return SkillMastery.State.LOCKED
    if any(s == SkillMastery.State.RUSTY for s in states):
        return SkillMastery.State.RUSTY
    if any(s == SkillMastery.State.LEARNING for s in states):
        return SkillMastery.State.LEARNING
    return SkillMastery.State.READY


def recommend_next_skill(
    profile: LearningProfile | None,
    subject: str = "",
    topic: str = "",
) -> Optional[Dict[str, Any]]:
    """
    Pick the best next skill: unlocked, lowest p_know among ready/learning,
    prefer current domain.
    """
    qs = Skill.objects.filter(is_pilot=True).order_by("sort_order")
    # Prefer domain of current topic skills
    topic_links = TopicSkillLink.objects.filter(
        topic_name__iexact=(topic or "").strip()
    ).select_related("skill")
    domains = {l.skill.domain for l in topic_links}
    candidates = []
    for skill in qs:
        if domains and skill.domain not in domains and domains:
            # still allow later; score domain match
            domain_bonus = 0
        else:
            domain_bonus = 1
        if profile:
            sm = get_or_init_skill_mastery(profile, skill)
            ready, blocking = prereq_readiness(profile, skill)
            if not ready:
                continue
            if sm.state == SkillMastery.State.MASTERED:
                continue
            candidates.append(
                (
                    domain_bonus,
                    -sm.p_know,  # weaker first
                    skill.sort_order,
                    skill,
                    sm,
                    blocking,
                )
            )
        else:
            candidates.append((domain_bonus, 0, skill.sort_order, skill, None, []))

    if not candidates:
        return None
    candidates.sort(key=lambda x: (-x[0], x[1], x[2]))
    _b, _p, _s, skill, sm, _blocking = candidates[0]
    if sm:
        return skill_mastery_to_dict(sm)
    return {
        "slug": skill.slug,
        "name": skill.name,
        "shortLabel": skill.label,
        "domain": skill.domain,
        "score": round(skill.p_init * 100, 1),
        "state": SkillMastery.State.READY,
        "stateLabel": STATE_LABELS[SkillMastery.State.READY],
    }


def skill_directives_for_topic(
    profile: LearningProfile,
    subject: str,
    topic: str,
) -> List[str]:
    """Human tutor directives derived from the skill graph (no score jargon)."""
    path = build_topic_skill_path(profile, subject, topic)
    directives: List[str] = []
    if not path["hasGraph"]:
        return directives

    if path["topicState"] == SkillMastery.State.LOCKED:
        blockers = []
        for s in path["skills"]:
            for b in s.get("blockingPrereqs") or []:
                blockers.append(b["name"])
        if blockers:
            uniq = list(dict.fromkeys(blockers))[:2]
            directives.append(
                "This topic may feel early — warmly revisit "
                + " and ".join(uniq)
                + " with a quick visual warm-up before the main idea."
            )

    for s in path["skills"]:
        if not s.get("isPrimary"):
            continue
        score = s.get("score") or 0
        label = s.get("shortLabel") or s.get("name")
        if s.get("state") == SkillMastery.State.MASTERED:
            directives.append(
                f"Strength on «{label}» — stretch with a slightly richer variant after a quick check."
            )
        elif score < 40:
            directives.append(
                f"«{label}» is still fragile — smaller steps, concrete models, celebrate micro-wins."
            )
        elif s.get("state") == SkillMastery.State.RUSTY:
            directives.append(
                f"«{label}» needs a gentle warm-up before new challenges."
            )

    nxt = path.get("recommendedNext")
    if nxt and nxt.get("slug") not in {s["slug"] for s in path["skills"]}:
        directives.append(
            f"When they feel steady, you can spark curiosity toward «{nxt.get('shortLabel') or nxt.get('name')}» next."
        )

    return directives[:4]


def all_skill_masteries_dict(profile: LearningProfile) -> Dict[str, Any]:
    out = {}
    for sm in SkillMastery.objects.filter(profile=profile).select_related("skill"):
        out[sm.skill.slug] = skill_mastery_to_dict(sm)
    return out
