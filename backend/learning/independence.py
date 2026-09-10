"""
Epic L4 — Independence twin helpers (Python mirror).

Used for research metrics: independence rate from completed twin events.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional


HEAVY_HELP_MIN_LEVEL = 2  # WORKED_EXAMPLE


def should_offer_independence_twin(
    *,
    ladder_level: int = 0,
    had_graded_success_during_help: bool = False,
    already_offered: bool = False,
    already_completed: bool = False,
    assessment_active: bool = False,
    multi_step_active: bool = False,
) -> bool:
    if already_offered or already_completed:
        return False
    if assessment_active or multi_step_active:
        return False
    level = int(ladder_level or 0)
    if level < HEAVY_HELP_MIN_LEVEL:
        return False
    if not had_graded_success_during_help and level < 3:
        return False
    return True


def independence_rate(outcomes: Iterable[Dict[str, Any]]) -> Optional[float]:
    """Fraction of non-skipped twins that succeeded (0–1)."""
    scored = [o for o in (outcomes or []) if o and not o.get("skipped")]
    if not scored:
        return None
    wins = sum(1 for o in scored if o.get("success"))
    return round(wins / len(scored), 3)


def independence_rate_from_events(events: List[Any]) -> Dict[str, Any]:
    """
    Aggregate independence.completed events into a rate summary.
    events: LearningEvent rows or payload dicts.
    """
    outcomes = []
    offered = started = declined = skipped = 0
    for ev in events or []:
        if isinstance(ev, dict):
            et = ev.get("type") or ev.get("event_type") or ""
            payload = ev.get("payload") or ev
        else:
            et = getattr(ev, "event_type", "") or ""
            payload = getattr(ev, "payload", None) or {}
        if et == "independence.offered":
            offered += 1
        elif et == "independence.started":
            started += 1
        elif et == "independence.declined":
            declined += 1
        elif et == "independence.skipped":
            skipped += 1
            outcomes.append({"success": False, "skipped": True})
        elif et == "independence.completed":
            outcomes.append(
                {
                    "success": bool(payload.get("success")),
                    "transfer": bool(payload.get("transfer")),
                    "skipped": False,
                }
            )
    rate = independence_rate(outcomes)
    transfer_outcomes = [o for o in outcomes if o.get("transfer") and not o.get("skipped")]
    transfer_rate = independence_rate(transfer_outcomes)
    return {
        "offered": offered,
        "started": started,
        "declined": declined,
        "skipped": skipped,
        "completed": len([o for o in outcomes if not o.get("skipped")]),
        "successes": sum(1 for o in outcomes if o.get("success")),
        "independenceRate": rate,
        "transferRate": transfer_rate,
    }
