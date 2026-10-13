"""Aggregated learning outcome reporting across assessment, transfer and review."""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import timedelta
from math import sqrt
from typing import Any

from django.db.models import Min
from django.utils import timezone

from curriculum.models import TopicSkillLink
from learning.models import LearningEvent, LessonSession, SkillReviewAttempt


def grade_band(value: str | None) -> str:
    """Map the learner's self-reported school grade to a broad age proxy."""
    grade = str(value or "").strip().lower()
    if not grade:
        return "unspecified"
    if any(term in grade for term in ("adult", "university", "college", "tertiary")):
        return "adult"
    if any(
        term in grade
        for term in ("kindergarten", "pre-k", "preschool", "reception")
    ):
        return "early_years"
    if re.search(r"\b(form|senior|secondary)\s*\d+\b", grade):
        return "high_school"
    match = re.search(r"\d{1,2}", grade)
    if not match:
        return "unspecified"
    level = int(match.group())
    if level <= 2:
        return "early_elementary"
    if level <= 5:
        return "upper_elementary"
    if level <= 8:
        return "middle_school"
    if level <= 12:
        return "high_school"
    return "adult"


def _bucket(rows: dict, band: str, subject: str) -> dict:
    key = (band, subject or "Unspecified")
    if key not in rows:
        rows[key] = {
            "gradeBand": band,
            "subject": subject or "Unspecified",
            "assessmentPercents": [],
            "prePostGains": [],
            "transferAttempts": 0,
            "transferSuccesses": 0,
            "reviewAttempts": 0,
            "reviewSuccesses": 0,
            "reviewByInterval": defaultdict(
                lambda: {"attempts": 0, "successes": 0}
            ),
        }
    return rows[key]


def _build_activation_retention(*, start, now) -> list[dict[str, Any]]:
    """Return weekly first-lesson cohorts and mature D7/D14/D30 return rates."""
    windows = (("D7", 1, 7), ("D14", 8, 14), ("D30", 22, 30))
    first_sessions = list(
        LessonSession.objects.filter(student__isnull=False)
        .values("student_id")
        .annotate(first_session=Min("started_at"))
        .filter(first_session__gte=start, first_session__lte=now)
    )
    if not first_sessions:
        return []

    first_by_student = {
        row["student_id"]: row["first_session"] for row in first_sessions
    }
    last_window_end = max(end for _, _, end in windows)
    activity: dict[int, list] = defaultdict(list)
    for student_id, started_at in LessonSession.objects.filter(
        student_id__in=first_by_student,
        started_at__gt=min(first_by_student.values()),
        started_at__lte=now,
    ).values_list("student_id", "started_at").iterator():
        first_at = first_by_student[student_id]
        if started_at <= first_at + timedelta(days=last_window_end):
            activity[student_id].append(started_at)

    cohorts: dict[str, dict[str, Any]] = {}
    for student_id, first_at in first_by_student.items():
        week_start = (first_at.date() - timedelta(days=first_at.weekday())).isoformat()
        cohort = cohorts.setdefault(
            week_start,
            {
                "cohortWeekStarting": week_start,
                "activatedLearners": 0,
                **{
                    key: {"eligible": 0, "returned": 0}
                    for key, _, _ in windows
                },
            },
        )
        cohort["activatedLearners"] += 1
        for key, window_start, window_end in windows:
            mature_at = first_at + timedelta(days=window_end)
            if now < mature_at:
                continue
            cohort[key]["eligible"] += 1
            returned = any(
                first_at + timedelta(days=window_start)
                <= session_at
                <= mature_at
                for session_at in activity.get(student_id, ())
            )
            cohort[key]["returned"] += int(returned)

    result = []
    for cohort in sorted(cohorts.values(), key=lambda item: item["cohortWeekStarting"]):
        for key, _, _ in windows:
            values = cohort[key]
            values["returnRatePct"] = (
                round(100 * values["returned"] / values["eligible"], 1)
                if values["eligible"]
                else None
            )
        result.append(cohort)
    return result


def build_learning_outcome_report(*, days: int = 90, now=None) -> dict[str, Any]:
    """Summarize outcomes by subject and grade band, without learner identifiers."""
    now = now or timezone.now()
    start = now - timedelta(days=max(1, int(days)))
    rows: dict = {}
    gain_rows: dict[tuple[str, str, str], list[tuple[float, float]]] = defaultdict(list)
    events = LearningEvent.objects.filter(
        student__isnull=False,
        timestamp__gte=start,
        event_type__in=("assessment.completed", "independence.completed"),
    ).select_related("student")
    session_ids = set(events.values_list("session_id", flat=True))
    session_subjects = dict(
        LessonSession.objects.filter(session_id__in=session_ids)
        .values_list("session_id", "subject")
    )
    for event in events.iterator():
        payload = event.payload or {}
        context = event.context or {}
        subject = (
            payload.get("subject")
            or context.get("subject")
            or session_subjects.get(event.session_id)
            or "Unspecified"
        )
        band = grade_band(event.student.grade)
        row = _bucket(rows, band, subject)

        if event.event_type == "assessment.completed":
            try:
                percent = float(payload.get("percent"))
            except (TypeError, ValueError):
                percent = None
            if percent is not None and 0 <= percent <= 100:
                row["assessmentPercents"].append(percent)
            try:
                gain = float(payload.get("gainPoints"))
            except (TypeError, ValueError):
                gain = None
            if gain is not None and -100 <= gain <= 100:
                row["prePostGains"].append(gain)
            if payload.get("purpose") == "post":
                try:
                    before = float(payload.get("baselinePercent"))
                    after = float(payload.get("postPercent"))
                except (TypeError, ValueError):
                    before = after = None
                reported_gain = (
                    gain
                    if gain is not None
                    else after - before
                    if after is not None and before is not None
                    else None
                )
                if (
                    before is not None
                    and after is not None
                    and 0 <= before <= 100
                    and 0 <= after <= 100
                    and reported_gain is not None
                    and abs((after - before) - reported_gain) < 0.01
                ):
                    key = (
                        band,
                        subject or "Unspecified",
                        str(payload.get("skillSlug") or "unspecified"),
                    )
                    gain_rows[key].append((before, after))
        elif payload.get("transfer"):
            row["transferAttempts"] += 1
            row["transferSuccesses"] += int(bool(payload.get("success")))

    review_attempts = SkillReviewAttempt.objects.filter(
        completed_at__gte=start,
        completed_at__lte=now,
    ).values_list(
        "profile__student__grade",
        "skill_id",
        "outcome",
        "planned_interval_days",
    )
    subject_by_skill: dict[int, str] = {}
    skill_ids = set(
        review_attempts.values_list("skill_id", flat=True).distinct()
    )
    for skill_id, subject in TopicSkillLink.objects.filter(
        skill_id__in=skill_ids
    ).order_by("subject_name").values_list("skill_id", "subject_name"):
        subject_by_skill.setdefault(skill_id, subject)

    for grade, skill_id, outcome, planned_interval in review_attempts.iterator():
        if grade is None:
            continue
        subject = subject_by_skill.get(skill_id, "Unspecified")
        row = _bucket(rows, grade_band(grade), subject)
        row["reviewAttempts"] += 1
        success = outcome == SkillReviewAttempt.Outcome.SUCCESS
        row["reviewSuccesses"] += int(success)
        interval = float(planned_interval or 1)
        interval_band = (
            "1–3 days"
            if interval <= 3
            else "4–14 days"
            if interval <= 14
            else "15+ days"
        )
        interval_row = row["reviewByInterval"][interval_band]
        interval_row["attempts"] += 1
        interval_row["successes"] += int(success)

    summaries = []
    for key in sorted(rows):
        row = rows[key]
        assessment = row.pop("assessmentPercents")
        gains = row.pop("prePostGains")
        intervals = row.pop("reviewByInterval")
        summaries.append(
            {
                **row,
                "assessmentCount": len(assessment),
                "meanAssessmentPercent": (
                    round(sum(assessment) / len(assessment), 1)
                    if assessment
                    else None
                ),
                "prePostCount": len(gains),
                "meanPrePostGainPoints": (
                    round(sum(gains) / len(gains), 1) if gains else None
                ),
                "transferRatePct": (
                    round(
                        100 * row["transferSuccesses"] / row["transferAttempts"],
                        1,
                    )
                    if row["transferAttempts"]
                    else None
                ),
                "reviewRecallRatePct": (
                    round(100 * row["reviewSuccesses"] / row["reviewAttempts"], 1)
                    if row["reviewAttempts"]
                    else None
                ),
                "reviewByInterval": {
                    label: {
                        **values,
                        "successRatePct": (
                            round(100 * values["successes"] / values["attempts"], 1)
                            if values["attempts"]
                            else None
                        ),
                    }
                    for label, values in sorted(intervals.items())
                },
            }
        )

    pre_post_calibration = []
    for (band, subject, skill), pairs in sorted(gain_rows.items()):
        count = len(pairs)
        before_mean = sum(before for before, _ in pairs) / count
        after_mean = sum(after for _, after in pairs) / count
        gains = [after - before for before, after in pairs]
        mean_gain = sum(gains) / count
        sample_sd = (
            sqrt(sum((gain - mean_gain) ** 2 for gain in gains) / (count - 1))
            if count > 1
            else None
        )
        margin = 1.96 * sample_sd / sqrt(count) if sample_sd is not None else None
        pre_post_calibration.append(
            {
                "gradeBand": band,
                "subject": subject,
                "skillSlug": skill,
                "pairedChecks": count,
                "meanBeforePct": round(before_mean, 1),
                "meanAfterPct": round(after_mean, 1),
                "meanGainPoints": round(mean_gain, 1),
                "gainStdDevPoints": round(sample_sd, 1) if sample_sd is not None else None,
                "gainCi95Points": (
                    [round(mean_gain - margin, 1), round(mean_gain + margin, 1)]
                    if margin is not None
                    else None
                ),
            }
        )

    return {
        "windowDays": max(1, int(days)),
        "from": start.isoformat(),
        "through": now.isoformat(),
        "gradeBandNote": "Grade bands are broad proxies from the learner's self-reported grade, not verified ages.",
        "activationRetention": _build_activation_retention(start=start, now=now),
        "prePostCalibration": pre_post_calibration,
        "groups": summaries,
    }


def render_learning_outcome_report(report: dict[str, Any]) -> str:
    lines = [
        "# Learning outcomes by subject and grade band",
        "",
        f"Window: {report['windowDays']} days ({report['from']} through {report['through']})",
        "",
        report["gradeBandNote"],
        "",
        "Assessment values include completed checks; pre/post gain is shown only when a linked follow-up was recorded. Transfer is measured on no-scaffold transfer checks. Review recall is spaced-review success, grouped by planned interval.",
        "",
        "| Grade band | Subject | Assessment mean (n) | Pre/post gain (n) | Transfer success (n) | Review recall (n) |",
        "|---|---|---:|---:|---:|---:|",
    ]
    for group in report["groups"]:
        assessment = group["meanAssessmentPercent"]
        gain = group["meanPrePostGainPoints"]
        transfer = group["transferRatePct"]
        recall = group["reviewRecallRatePct"]
        lines.append(
            f"| {group['gradeBand']} | {group['subject']} | "
            f"{f'{assessment}%' if assessment is not None else '—'} "
            f"({group['assessmentCount']}) | "
            f"{f'{gain:+.1f} pts' if gain is not None else '—'} "
            f"({group['prePostCount']}) | "
            f"{f'{transfer}%' if transfer is not None else '—'} "
            f"({group['transferAttempts']}) | "
            f"{f'{recall}%' if recall is not None else '—'} "
            f"({group['reviewAttempts']}) |"
        )
    if not report["groups"]:
        lines.extend(["", "No outcome records were found in this window."])
    lines.extend(
        [
            "",
            "## First-lesson cohort return",
            "",
            "Learners are grouped by the week of their first recorded lesson. D7 counts another lesson on days 1–7, D14 on days 8–14, and D30 on days 22–30 after that first lesson. Each rate uses only learners with a fully observed window; these descriptive rates do not establish that spaced review caused a return.",
            "",
            "| Cohort week | Activated | D7 returned / eligible | D7 rate | D14 returned / eligible | D14 rate | D30 returned / eligible | D30 rate |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for cohort in report["activationRetention"]:
        cells = [cohort["cohortWeekStarting"], str(cohort["activatedLearners"])]
        for key in ("D7", "D14", "D30"):
            values = cohort[key]
            rate = values["returnRatePct"]
            cells.extend(
                [
                    f"{values['returned']} / {values['eligible']}",
                    f"{rate}%" if rate is not None else "—",
                ]
            )
        lines.append("| " + " | ".join(cells) + " |")
    if not report["activationRetention"]:
        lines.append("| No first-lesson cohorts in this report window | — | — | — | — | — | — | — |")
    lines.append("")
    lines.extend(
        [
            "## Alternate-form pre/post calibration",
            "",
            "Paired checks are grouped by subject, skill, and learner grade band. The interval is a normal-approximation 95% confidence interval for the mean paired percentage-point change; small samples are descriptive and do not establish causal learning gain or prove that forms are equivalent.",
            "",
            "| Grade band | Subject | Skill | Paired checks | Mean before | Mean after | Mean gain | Gain SD | 95% CI for gain |",
            "|---|---|---|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for row in report["prePostCalibration"]:
        ci = row["gainCi95Points"]
        ci_text = f"[{ci[0]}, {ci[1]}]" if ci is not None else "—"
        sd_text = f"{row['gainStdDevPoints']} pts" if row["gainStdDevPoints"] is not None else "—"
        lines.append(
            f"| {row['gradeBand']} | {row['subject']} | {row['skillSlug']} | "
            f"{row['pairedChecks']} | {row['meanBeforePct']}% | {row['meanAfterPct']}% | "
            f"{row['meanGainPoints']:+.1f} pts | {sd_text} | {ci_text} |"
        )
    if not report["prePostCalibration"]:
        lines.append("| No alternate-form pre/post pairs in this report window | — | — | — | — | — | — | — | — |")
    lines.append("")
    lines.extend(["", "## Review recall by planned interval", ""])
    for group in report["groups"]:
        if not group["reviewByInterval"]:
            continue
        lines.append(f"### {group['gradeBand']} · {group['subject']}")
        for interval, values in group["reviewByInterval"].items():
            rate = values["successRatePct"]
            lines.append(
                f"- {interval}: {rate if rate is not None else '—'}% "
                f"({values['successes']}/{values['attempts']})"
            )
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"
