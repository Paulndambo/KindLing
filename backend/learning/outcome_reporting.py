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
from learning.models import (
    LearningEvent,
    LessonSession,
    SkillReviewAttempt,
)


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


def _build_review_return_association(*, start, now) -> list[dict[str, Any]]:
    """Compare mature post-review return windows with the same learners' prior windows."""
    windows = (7, 14, 30)
    first_attempt_by_student = {}
    attempts = (
        SkillReviewAttempt.objects.filter(
            profile__student__isnull=False,
            completed_at__gte=start,
            completed_at__lte=now,
        )
        .select_related("profile__student")
        .order_by("completed_at", "id")
    )
    for attempt in attempts.iterator():
        student_id = attempt.profile.student_id
        first_attempt_by_student.setdefault(student_id, attempt)
    if not first_attempt_by_student:
        return []

    earliest_window_start = min(
        attempt.scheduled_due_at - timedelta(days=max(windows))
        for attempt in first_attempt_by_student.values()
    )
    sessions_by_student: dict[int, list] = defaultdict(list)
    for student_id, started_at in LessonSession.objects.filter(
        student_id__in=first_attempt_by_student,
        started_at__gte=earliest_window_start,
        started_at__lte=now,
    ).values_list("student_id", "started_at").iterator():
        sessions_by_student[student_id].append(started_at)

    results = []
    for days in windows:
        eligible = before_returned = after_returned = 0
        for student_id, attempt in first_attempt_by_student.items():
            student = attempt.profile.student
            baseline_start = attempt.scheduled_due_at - timedelta(days=days)
            followup_end = attempt.completed_at + timedelta(days=days)
            if student.created_at > baseline_start or now < followup_end:
                continue
            eligible += 1
            learner_sessions = sessions_by_student.get(student_id, ())
            before_returned += int(
                any(baseline_start <= session_at < attempt.scheduled_due_at for session_at in learner_sessions)
            )
            after_returned += int(
                any(attempt.completed_at < session_at <= followup_end for session_at in learner_sessions)
            )
        before_rate = round(100 * before_returned / eligible, 1) if eligible else None
        after_rate = round(100 * after_returned / eligible, 1) if eligible else None
        results.append(
            {
                "windowDays": days,
                "eligibleLearners": eligible,
                "returnedBefore": before_returned,
                "returnedAfter": after_returned,
                "returnRateBeforePct": before_rate,
                "returnRateAfterPct": after_rate,
                "changePoints": (
                    round(after_rate - before_rate, 1)
                    if before_rate is not None and after_rate is not None
                    else None
                ),
            }
        )
    return results


def build_learning_outcome_report(*, days: int = 90, now=None) -> dict[str, Any]:
    """Summarize outcomes by subject and grade band, without learner identifiers."""
    now = now or timezone.now()
    start = now - timedelta(days=max(1, int(days)))
    rows: dict = {}
    gain_rows: dict[tuple[str, str, str], list[tuple[float, float]]] = defaultdict(list)
    first_form_score_by_learner: dict[
        tuple[int, str, str, str, str], tuple[str, float]
    ] = {}
    events = LearningEvent.objects.filter(
        student__isnull=False,
        timestamp__gte=start,
        event_type__in=("assessment.completed", "independence.completed"),
    ).select_related("student").order_by("timestamp", "id")
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
                phase = str(payload.get("purpose") or "")
                form = str(payload.get("form") or "").upper()
                if phase in ("pre", "post") and form in ("A", "B"):
                    form_key = (
                        event.student_id,
                        band,
                        subject or "Unspecified",
                        str(payload.get("skillSlug") or "unspecified"),
                        phase,
                    )
                    first_form_score_by_learner.setdefault(form_key, (form, percent))
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

    form_groups: dict[tuple[str, str, str, str], dict[str, list[float]]] = defaultdict(
        lambda: {"A": [], "B": []}
    )
    for (_, band, subject, skill, phase), (form, score) in first_form_score_by_learner.items():
        form_groups[(band, subject, skill, phase)][form].append(score)

    form_balance = []
    for (band, subject, skill, phase), scores_by_form in sorted(form_groups.items()):
        scores_a = scores_by_form["A"]
        scores_b = scores_by_form["B"]
        mean_a = sum(scores_a) / len(scores_a) if scores_a else None
        mean_b = sum(scores_b) / len(scores_b) if scores_b else None
        margin = None
        if len(scores_a) > 1 and len(scores_b) > 1:
            variance_a = sum((score - mean_a) ** 2 for score in scores_a) / (len(scores_a) - 1)
            variance_b = sum((score - mean_b) ** 2 for score in scores_b) / (len(scores_b) - 1)
            margin = 1.96 * sqrt(variance_a / len(scores_a) + variance_b / len(scores_b))
        difference = mean_b - mean_a if mean_a is not None and mean_b is not None else None
        form_balance.append(
            {
                "gradeBand": band,
                "subject": subject,
                "skillSlug": skill,
                "phase": phase,
                "formACount": len(scores_a),
                "formBCount": len(scores_b),
                "formAMeanPct": round(mean_a, 1) if mean_a is not None else None,
                "formBMeanPct": round(mean_b, 1) if mean_b is not None else None,
                "formBDifferencePoints": round(difference, 1) if difference is not None else None,
                "differenceCi95Points": (
                    [round(difference - margin, 1), round(difference + margin, 1)]
                    if difference is not None and margin is not None
                    else None
                ),
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
        "reviewReturnAssociation": _build_review_return_association(
            start=start, now=now
        ),
        "formBalance": form_balance,
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
    lines.extend(
        [
            "## Counterbalanced A/B form comparison",
            "",
            "Baseline form assignment is randomized and the follow-up uses the opposite form. This table compares A and B score means separately at pre and post phase, grouped by subject, skill, and learner band. The 95% interval is a normal-approximation interval for the difference in means; small samples and item differences still limit equivalence claims.",
            "",
            "| Grade band | Subject | Skill | Phase | Form A (n, mean) | Form B (n, mean) | B − A points | 95% CI |",
            "|---|---|---|---|---:|---:|---:|---:|",
        ]
    )
    for row in report["formBalance"]:
        mean_a = f"{row['formAMeanPct']}%" if row["formAMeanPct"] is not None else "—"
        mean_b = f"{row['formBMeanPct']}%" if row["formBMeanPct"] is not None else "—"
        difference = row["formBDifferencePoints"]
        ci = row["differenceCi95Points"]
        ci_text = f"[{ci[0]}, {ci[1]}]" if ci is not None else "—"
        difference_text = f"{difference:+.1f}" if difference is not None else "—"
        lines.append(
            f"| {row['gradeBand']} | {row['subject']} | {row['skillSlug']} | {row['phase']} | "
            f"{row['formACount']}, {mean_a} | {row['formBCount']}, {mean_b} | "
            f"{difference_text} | {ci_text} |"
        )
    if not report["formBalance"]:
        lines.append("| No counterbalanced form scores in this report window | — | — | — | — | — | — | — |")
    lines.append("")
    lines.extend(
        [
            "## Return after a completed spaced review",
            "",
            "For each learner's first completed review in this report window, this compares whether they started another lesson in the N days before the scheduled due time with whether they started one in the N days after completing the review. Only learners whose account existed for the full baseline and whose follow-up window is complete are included. This within-learner association is observational: it has no non-review control group and cannot show that the review caused a return.",
            "",
            "| Window | Learners | Returned before due | Before rate | Returned after review | After rate | Change (points) |",
            "|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for row in report["reviewReturnAssociation"]:
        before = row["returnRateBeforePct"]
        after = row["returnRateAfterPct"]
        change = row["changePoints"]
        lines.append(
            f"| {row['windowDays']} days | {row['eligibleLearners']} | "
            f"{row['returnedBefore']} | {f'{before}%' if before is not None else '—'} | "
            f"{row['returnedAfter']} | {f'{after}%' if after is not None else '—'} | "
            f"{f'{change:+.1f}' if change is not None else '—'} |"
        )
    if not report["reviewReturnAssociation"] or not any(
        row["eligibleLearners"] for row in report["reviewReturnAssociation"]
    ):
        lines.append("| No review-return windows have complete observation yet | — | — | — | — | — | — |")
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
