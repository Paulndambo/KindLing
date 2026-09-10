"""
Epic C8.2 — Weekly eval sample pipeline.

Picks recent sessions, runs C8.1 auto-scorer, optionally persists scores,
writes a cohort report under MEDIA/eval_reports (no transcript PII in JobRun).
"""

from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.utils import timezone

from learning.eval_rubric import (
    TARGET_SAMPLE_SIZE,
    render_report_markdown,
    summarize_cohort,
)
from learning.eval_scorer import SCORER_ID, result_to_score_payload, score_lesson_session


DEFAULT_SAMPLE_SIZE = TARGET_SAMPLE_SIZE
DEFAULT_LOOKBACK_DAYS = 7
COHORT_PREFIX = "auto-weekly"


def weekly_cohort_id(now=None) -> str:
    """Stable cohort id for ISO week, e.g. auto-weekly-2026-W37."""
    now = now or timezone.now()
    iso = now.isocalendar()
    return f"{COHORT_PREFIX}-{iso.year}-W{iso.week:02d}"


def default_report_dir() -> Path:
    root = Path(getattr(settings, "MEDIA_ROOT", None) or Path.cwd() / "media")
    return root / "eval_reports"


def select_weekly_sessions(
    *,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    limit: int = DEFAULT_SAMPLE_SIZE,
    min_turns: int = 2,
    now=None,
):
    """Recent sessions with enough turns (newest first)."""
    from learning.models import LessonSession

    now = now or timezone.now()
    since = now - timedelta(days=max(1, int(lookback_days)))
    qs = (
        LessonSession.objects.filter(
            started_at__gte=since,
            turn_count__gte=max(0, int(min_turns)),
        )
        .prefetch_related("turns")
        .order_by("-started_at")
    )
    return list(qs[: max(1, int(limit))])


def run_weekly_eval_sample(
    *,
    dry_run: bool = False,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    limit: int = DEFAULT_SAMPLE_SIZE,
    min_turns: int = 2,
    save: bool = True,
    write_report: bool = True,
    report_dir: Optional[Path] = None,
    cohort: Optional[str] = None,
    now=None,
) -> Dict[str, Any]:
    """
    Execute the weekly sample pipeline.

    dry_run=True: score in memory, do not write ManualSessionEval or files
      (still returns summary).
    save=False: skip DB persist even when dry_run=False.
    """
    now = now or timezone.now()
    cohort_id = cohort or weekly_cohort_id(now)
    sessions = select_weekly_sessions(
        lookback_days=lookback_days,
        limit=limit,
        min_turns=min_turns,
        now=now,
    )

    results: List[Dict[str, Any]] = []
    saved = 0
    errors: List[str] = []

    for session in sessions:
        try:
            result = score_lesson_session(session)
            # Drop heavy evidence from in-memory list used for summary
            slim = {k: v for k, v in result.items() if k != "evidence"}
            slim["sessionId"] = session.session_id
            results.append(slim)

            if not dry_run and save:
                from learning.models import ManualSessionEval

                payload = result_to_score_payload(result)
                ManualSessionEval.objects.update_or_create(
                    client_session_key=session.session_id,
                    cohort=cohort_id,
                    defaults={
                        "lesson_session": session,
                        "rubric_version": result.get("rubricVersion") or 1,
                        "scores": payload["scores"],
                        "dimension_notes": payload["dimension_notes"],
                        "overall_notes": payload["overall_notes"],
                        "scorer": payload["scorer"],
                        "evidence": payload.get("evidence")
                        or result.get("evidence")
                        or {},
                        "weighted_mean": payload["weighted_mean"],
                        "completeness": payload["completeness"],
                        "scored_at": now,
                    },
                )
                saved += 1
        except Exception as exc:  # noqa: BLE001 — isolate bad sessions
            errors.append(f"{getattr(session, 'session_id', '?')}: {type(exc).__name__}")

    evals = [
        {
            "sessionId": r.get("sessionId"),
            "scores": r.get("scores") or {},
            "weightedMean": r.get("weightedMean"),
        }
        for r in results
    ]
    summary = summarize_cohort(evals)
    summary.update(
        {
            "job": "weekly_eval_sample",
            "cohort": cohort_id,
            "scorer": SCORER_ID,
            "mode": "automated_weekly",
            "lookbackDays": lookback_days,
            "candidateSessions": len(sessions),
            "scoredOk": len(results),
            "saved": saved if (not dry_run and save) else 0,
            "dryRun": bool(dry_run),
            "errors": errors[:10],
            "errorCount": len(errors),
            "overallMean": summary.get("overallMean"),
            "weakest": summary.get("weakest") or [],
            "strongest": summary.get("strongest") or [],
            # No session ids / transcripts in job payload by default
            "sessionIds": [r.get("sessionId") for r in results][:limit],
        }
    )

    report_paths: Dict[str, str] = {}
    if write_report and not dry_run:
        out_root = Path(report_dir) if report_dir else default_report_dir()
        out_root.mkdir(parents=True, exist_ok=True)
        stamp = now.strftime("%Y%m%d")
        base = out_root / f"{cohort_id}_{stamp}"
        md_path = Path(str(base) + ".md")
        json_path = Path(str(base) + ".json")
        md = render_report_markdown(
            summary, title=f"C8.2 weekly eval — {cohort_id}"
        )
        md_path.write_text(md, encoding="utf-8")
        # JSON keeps session ids for ops; JobRun.result stays lean
        json_path.write_text(
            json.dumps(
                {
                    "summary": summary,
                    "results": [
                        {k: v for k, v in r.items() if k != "evidence"}
                        for r in results
                    ],
                },
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )
        report_paths = {
            "markdown": str(md_path),
            "json": str(json_path),
        }
        summary["reportPaths"] = {
            "markdown": md_path.name,
            "json": json_path.name,
            "dir": str(out_root),
        }

    summary["ok"] = summary.get("errorCount", 0) == 0 or summary.get("scoredOk", 0) > 0
    # Strip full session id list from return if very long? keep capped above
    return summary


def latest_weekly_cohort_rows(limit: int = 5) -> List[Dict[str, Any]]:
    """List recent auto-weekly cohorts from ManualSessionEval (ops)."""
    from django.db.models import Avg, Count

    from learning.models import ManualSessionEval

    qs = (
        ManualSessionEval.objects.filter(cohort__startswith=COHORT_PREFIX)
        .values("cohort")
        .annotate(
            n=Count("id"),
            mean=Avg("weighted_mean"),
        )
        .order_by("-cohort")[:limit]
    )
    return [
        {
            "cohort": row["cohort"],
            "scoredCount": row["n"],
            "overallMean": round(row["mean"], 3) if row["mean"] is not None else None,
        }
        for row in qs
    ]
