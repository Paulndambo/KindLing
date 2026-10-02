"""Student actions for rescheduling review sparks."""

from datetime import timedelta
from typing import Any, Dict

from django.db import transaction
from django.utils import timezone

from learning.models import LearningProfile, SkillReviewItem
from learning.review_service import review_item_to_dict

SNOOZE_OPTIONS_DAYS = (1, 3, 7)


@transaction.atomic
def snooze_review(
    profile: LearningProfile,
    *,
    review_id: int | None = None,
    skill_slug: str = "",
    days: int = 1,
    now=None,
) -> Dict[str, Any]:
    """Postpone a due review by one of the supported, predictable intervals."""
    now = now or timezone.now()
    if isinstance(days, float) and not days.is_integer():
        return {"ok": False, "error": "invalid_snooze_days"}
    try:
        days = int(days)
    except (TypeError, ValueError):
        return {"ok": False, "error": "invalid_snooze_days"}
    if days not in SNOOZE_OPTIONS_DAYS:
        return {"ok": False, "error": "invalid_snooze_days"}

    items = SkillReviewItem.objects.select_for_update().filter(profile=profile)
    if review_id is not None:
        try:
            review_id = int(review_id)
        except (TypeError, ValueError):
            return {"ok": False, "error": "review_not_found"}
    item = items.filter(id=review_id).first() if review_id else None
    if item is None and skill_slug:
        item = items.filter(skill__slug=skill_slug).first()
    if item is None:
        return {"ok": False, "error": "review_not_found"}
    if item.status in (SkillReviewItem.Status.COMPLETED, SkillReviewItem.Status.SKIPPED):
        return {"ok": False, "error": "review_not_snoozable"}
    if item.due_at > now:
        return {"ok": False, "error": "review_not_due"}

    item.snoozed_until = now + timedelta(days=days)
    item.due_at = item.snoozed_until
    item.status = SkillReviewItem.Status.SCHEDULED
    item.save(update_fields=["snoozed_until", "due_at", "status", "updated_at"])
    return {
        "ok": True,
        "review": review_item_to_dict(item, now=now),
        "snoozedDays": days,
        "snoozedUntil": item.snoozed_until.isoformat(),
    }
