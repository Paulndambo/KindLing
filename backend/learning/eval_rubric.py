"""
Epic C8.3 — Manual session eval rubric (beta bridge).

Human scorers rate ~10 recorded sessions on fixed dimensions.
Scores become the baseline for C8.1 automated offline scoring.

Scale per dimension: 1 (weak) … 5 (excellent). Use null/omit if not observable.
Never shame learners in notes — evaluate the *tutor system*, not the child.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional


RUBRIC_VERSION = 1
TARGET_SAMPLE_SIZE = 10  # C8.3 protocol

# 1–5 anchors (shared)
SCALE_HELP = {
    1: "Rarely / harmful pattern",
    2: "Inconsistent; often misses the mark",
    3: "Adequate / mixed",
    4: "Mostly strong with small gaps",
    5: "Consistently excellent for pilot bar",
}


# Dimension catalog — ids stable for C8.1 automation later
RUBRIC_DIMENSIONS: List[Dict[str, Any]] = [
    {
        "id": "socratic_fidelity",
        "label": "Socratic fidelity",
        "weight": 1.2,
        "prompt": "Did the tutor guide with questions more than dumping answers?",
        "anchors": {
            1: "Frequent full answers with little student work",
            3: "Mix of guiding and telling",
            5: "Consistently one-question / guide-before-give",
        },
    },
    {
        "id": "hint_quality",
        "label": "Hint / scaffold quality",
        "weight": 1.0,
        "prompt": "Were hints graduated and useful (not spoilers, not empty)?",
        "anchors": {
            1: "Hints spoil or confuse",
            3: "Some useful scaffolds",
            5: "Ladder-like, right-sized help",
        },
    },
    {
        "id": "intervention_timing",
        "label": "Intervention timing",
        "weight": 1.0,
        "prompt": "Was heavier help offered when stuck — not too early, not too late?",
        "anchors": {
            1: "Never helps when stuck, or jumps to full guide instantly",
            3: "Sometimes well-timed",
            5: "Help appears after clear struggle signals",
        },
    },
    {
        "id": "decision_compliance",
        "label": "Decision compliance (L2)",
        "weight": 1.1,
        "prompt": "Did tutor turns match logged pedagogical decisions (action intent)?",
        "anchors": {
            1: "Ignores policy moves entirely",
            3: "Partial alignment",
            5: "Clearly executes the decided move",
        },
        "needs_events": ["pedagogy.decision"],
    },
    {
        "id": "affect_respect",
        "label": "Affect & respect",
        "weight": 1.2,
        "prompt": "Warm, non-shaming tone; responds to frustration/low energy well?",
        "anchors": {
            1: "Shame, pressure, or cold tone",
            3: "Neutral polite",
            5: "Warm, normalizes struggle, celebrates effort",
        },
    },
    {
        "id": "misconception_handling",
        "label": "Misconception handling",
        "weight": 1.0,
        "prompt": "Sticky wrong ideas gently reworked (not ignored or ridiculed)?",
        "anchors": {
            1: "Misses or mocks wrong patterns",
            3: "Sometimes addresses",
            5: "Detects and remediates with a check",
        },
    },
    {
        "id": "real_world_clarity",
        "label": "Real-world clarity",
        "weight": 0.8,
        "prompt": "Everyday examples / clear representations when teaching ideas?",
        "anchors": {
            1: "Abstract only; confusing",
            3: "Occasional examples",
            5: "Natural hooks that fit the learner",
        },
    },
    {
        "id": "independence_orientation",
        "label": "Independence orientation (L3)",
        "weight": 1.0,
        "prompt": "Does help fade when the learner can try alone? Healthy help-seeking OK.",
        "anchors": {
            1: "Over-scaffolds strong work, or never scaffolds when needed",
            3: "Mixed",
            5: "Supports then releases; independence encouraged without shame",
        },
    },
    {
        "id": "persistence_support",
        "label": "Persistence support",
        "weight": 0.8,
        "prompt": "Effort / bounce-backs noticed (not only correct answers)?",
        "anchors": {
            1: "Only praises correctness",
            3: "Some effort language",
            5: "Clear persistence sparks without empty flattery",
        },
    },
    {
        "id": "overall_learning_quality",
        "label": "Overall learning quality",
        "weight": 1.3,
        "prompt": "Holistic: did this session likely grow understanding?",
        "anchors": {
            1: "Confusing or harmful session",
            3: "Okay practice",
            5: "Strong learning session for pilot bar",
        },
    },
]

DIMENSION_IDS = [d["id"] for d in RUBRIC_DIMENSIONS]
DIMENSION_BY_ID = {d["id"]: d for d in RUBRIC_DIMENSIONS}


def validate_scores(scores: Dict[str, Any]) -> Dict[str, Optional[int]]:
    """Normalize and validate 1–5 scores; unknown keys ignored."""
    out: Dict[str, Optional[int]] = {}
    for dim_id in DIMENSION_IDS:
        raw = scores.get(dim_id)
        if raw is None or raw == "" or raw == "-":
            out[dim_id] = None
            continue
        try:
            n = int(round(float(raw)))
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid score for {dim_id}: {raw!r}") from exc
        if n < 1 or n > 5:
            raise ValueError(f"Score for {dim_id} must be 1–5, got {n}")
        out[dim_id] = n
    return out


def weighted_mean(scores: Dict[str, Optional[int]]) -> Optional[float]:
    """Weighted mean of present dimensions; None if empty."""
    total_w = 0.0
    acc = 0.0
    for dim in RUBRIC_DIMENSIONS:
        v = scores.get(dim["id"])
        if v is None:
            continue
        w = float(dim.get("weight") or 1.0)
        acc += v * w
        total_w += w
    if total_w <= 0:
        return None
    return round(acc / total_w, 3)


def completeness(scores: Dict[str, Optional[int]]) -> float:
    present = sum(1 for d in DIMENSION_IDS if scores.get(d) is not None)
    return round(present / max(1, len(DIMENSION_IDS)), 3)


def empty_score_sheet() -> Dict[str, Any]:
    return {
        "rubricVersion": RUBRIC_VERSION,
        "scale": {"min": 1, "max": 5, "help": SCALE_HELP},
        "dimensions": [
            {
                "id": d["id"],
                "label": d["label"],
                "prompt": d["prompt"],
                "weight": d["weight"],
                "score": None,
                "note": "",
            }
            for d in RUBRIC_DIMENSIONS
        ],
        "overallNotes": "",
        "scorer": "",
        "scoredAt": None,
    }


def parse_score_kv(pairs: Iterable[str]) -> Dict[str, int]:
    """
    Parse CLI pairs like socratic_fidelity=4 or short aliases.
    Aliases: socratic, hint, timing, decision, affect, mc, realworld,
             independence, persistence, overall
    """
    aliases = {
        "socratic": "socratic_fidelity",
        "hint": "hint_quality",
        "timing": "intervention_timing",
        "decision": "decision_compliance",
        "affect": "affect_respect",
        "mc": "misconception_handling",
        "misconception": "misconception_handling",
        "realworld": "real_world_clarity",
        "real": "real_world_clarity",
        "independence": "independence_orientation",
        "adi": "independence_orientation",
        "persistence": "persistence_support",
        "overall": "overall_learning_quality",
    }
    out: Dict[str, int] = {}
    for raw in pairs:
        if "=" not in raw:
            raise ValueError(f"Expected key=value, got {raw!r}")
        k, v = raw.split("=", 1)
        key = aliases.get(k.strip().lower(), k.strip())
        if key not in DIMENSION_BY_ID:
            raise ValueError(f"Unknown dimension {k!r} (resolved {key!r})")
        out[key] = int(v.strip())
    return out


def extract_session_evidence(session, events: Optional[List[Any]] = None) -> Dict[str, Any]:
    """
    Compact evidence pack for human scorers (and future C8.1 features).
    `session` is a LessonSession; `events` optional LearningEvent queryset/list.
    """
    turns = list(session.turns.all().order_by("index")[:40])
    counters = session.counters or {}
    evidence: Dict[str, Any] = {
        "sessionId": session.session_id,
        "subject": session.subject,
        "topic": session.topic,
        "startedAt": session.started_at.isoformat() if session.started_at else None,
        "endedAt": session.ended_at.isoformat() if session.ended_at else None,
        "durationMs": session.duration_ms,
        "turnCount": session.turn_count or len(turns),
        "accuracy": session.accuracy,
        "avgEngagement": session.avg_engagement,
        "avgConfidence": session.avg_confidence,
        "counters": counters,
        "turnsPreview": [],
        "pedagogyDecisions": [],
        "interventions": [],
        "adiSnapshots": [],
        "struggleSignals": [],
        "misconceptions": [],
    }

    for t in turns[:12]:
        evidence["turnsPreview"].append(
            {
                "index": t.index,
                "correctness": t.correctness,
                "affect": t.affect,
                "hint": t.is_hint_request,
                "student": (t.student_text or "")[:180],
                "tutor": (t.tutor_text or "")[:220],
            }
        )

    if events is None:
        try:
            from learning.models import LearningEvent

            events = list(
                LearningEvent.objects.filter(session_id=session.session_id).order_by(
                    "timestamp"
                )[:200]
            )
        except Exception:
            events = []

    for ev in events or []:
        et = getattr(ev, "event_type", None) or (ev.get("type") if isinstance(ev, dict) else "")
        payload = getattr(ev, "payload", None) or (
            ev.get("payload") if isinstance(ev, dict) else {}
        ) or {}
        if et == "pedagogy.decision":
            evidence["pedagogyDecisions"].append(
                {
                    "action": payload.get("action"),
                    "decisionId": payload.get("decisionId") or payload.get("id"),
                    "reasons": payload.get("reasons") or [],
                    "confidence": payload.get("confidence"),
                }
            )
        elif et in (
            "intervention.offered",
            "intervention.entered",
            "intervention.exited",
            "intervention.declined",
        ):
            evidence["interventions"].append(
                {"type": et, "level": payload.get("level"), "reason": payload.get("reason")}
            )
        elif et == "learning.adi":
            evidence["adiSnapshots"].append(
                {
                    "value": payload.get("value"),
                    "band": payload.get("band"),
                    "trend": payload.get("trend"),
                }
            )
        elif et == "struggle.signal":
            evidence["struggleSignals"].append(
                {"signal": payload.get("signal"), "phase": payload.get("phase")}
            )
        elif et in ("misconception.detected", "misconception.remediated"):
            evidence["misconceptions"].append(
                {
                    "type": et,
                    "id": payload.get("misconceptionId"),
                    "label": payload.get("label"),
                }
            )

    # Cap lists
    for k in (
        "pedagogyDecisions",
        "interventions",
        "adiSnapshots",
        "struggleSignals",
        "misconceptions",
    ):
        evidence[k] = evidence[k][:20]

    evidence["scorerHints"] = _scorer_hints(evidence)
    return evidence


def _scorer_hints(evidence: Dict[str, Any]) -> List[str]:
    hints = []
    decisions = evidence.get("pedagogyDecisions") or []
    if decisions:
        actions = [d.get("action") for d in decisions if d.get("action")]
        hints.append(
            f"{len(decisions)} pedagogy.decision event(s); actions: "
            + ", ".join(actions[:8])
            + ("…" if len(actions) > 8 else "")
        )
        hints.append(
            "For decision_compliance: skim tutor lines after each decision — "
            "does the move match the action?"
        )
    else:
        hints.append(
            "No pedagogy.decision events — score decision_compliance as N/A "
            "or 2 if free-form only."
        )

    iv = evidence.get("interventions") or []
    if iv:
        hints.append(f"{len(iv)} intervention lifecycle event(s) — check timing vs struggle.")
    struggle = evidence.get("struggleSignals") or []
    if struggle:
        kinds = sorted({s.get("signal") for s in struggle if s.get("signal")})
        hints.append(f"Struggle signals: {', '.join(str(k) for k in kinds)}")

    adi = evidence.get("adiSnapshots") or []
    if adi:
        last = adi[-1]
        hints.append(
            f"ADI snapshot value={last.get('value')} band={last.get('band')} — "
            "score independence_orientation with this in mind."
        )

    mc = evidence.get("misconceptions") or []
    if mc:
        hints.append(f"{len(mc)} misconception event(s) — check gentle rework.")

    acc = evidence.get("accuracy")
    if acc is not None:
        hints.append(f"Session accuracy signal ~{round(float(acc) * 100)}% (one signal only).")

    return hints


def render_score_sheet_markdown(
    *,
    session_meta: Dict[str, Any],
    evidence: Dict[str, Any],
    sheet: Optional[Dict[str, Any]] = None,
) -> str:
    """Human-readable score sheet for printing / PR comments."""
    sheet = sheet or empty_score_sheet()
    lines = [
        f"# Kindling session eval — rubric v{RUBRIC_VERSION}",
        "",
        f"- **Session:** `{session_meta.get('sessionId') or evidence.get('sessionId')}`",
        f"- **Subject / topic:** {session_meta.get('subject') or evidence.get('subject')} / "
        f"{session_meta.get('topic') or evidence.get('topic')}",
        f"- **Turns:** {evidence.get('turnCount')}",
        f"- **Started:** {evidence.get('startedAt')}",
        f"- **Cohort target:** {TARGET_SAMPLE_SIZE} sessions (C8.3)",
        "",
        "## Scorer hints (auto)",
    ]
    for h in evidence.get("scorerHints") or []:
        lines.append(f"- {h}")
    lines += ["", "## Dimensions (score 1–5 or leave blank)", ""]
    for d in sheet["dimensions"]:
        lines.append(f"### {d['label']} (`{d['id']}`)")
        lines.append(f"*{d['prompt']}*")
        lines.append(f"- **Score:** {d.get('score') if d.get('score') is not None else '_/_'}")
        lines.append(f"- **Note:** {d.get('note') or ''}")
        lines.append("")
    lines += [
        "## Overall notes",
        "",
        sheet.get("overallNotes") or "_(write here)_",
        "",
        "---",
        f"Scorer: {sheet.get('scorer') or '___'} · Date: {sheet.get('scoredAt') or '___'}",
        "",
        "_Evaluate the tutoring system. Never shame the learner in notes._",
    ]
    return "\n".join(lines)


def summarize_cohort(evals: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Aggregate manual evals into a baseline report.
    Each eval: { scores: {dim: int|null}, sessionId, weightedMean, ... }
    """
    n = len(evals)
    playbook_audits = [
        ev.get("playbookAudit") or {}
        for ev in evals
        if (ev.get("playbookAudit") or {}).get("applicable")
    ]
    per_dim: Dict[str, List[int]] = {d: [] for d in DIMENSION_IDS}
    means = []
    for ev in evals:
        scores = ev.get("scores") or {}
        for dim_id in DIMENSION_IDS:
            v = scores.get(dim_id)
            if v is not None:
                try:
                    per_dim[dim_id].append(int(v))
                except (TypeError, ValueError):
                    pass
        wm = ev.get("weightedMean")
        if wm is None:
            wm = weighted_mean(validate_scores(scores))
        if wm is not None:
            means.append(float(wm))

    dim_stats = {}
    for dim_id, vals in per_dim.items():
        label = DIMENSION_BY_ID[dim_id]["label"]
        if not vals:
            dim_stats[dim_id] = {
                "n": 0,
                "mean": None,
                "min": None,
                "max": None,
                "label": label,
            }
            continue
        dim_stats[dim_id] = {
            "n": len(vals),
            "mean": round(sum(vals) / len(vals), 3),
            "min": min(vals),
            "max": max(vals),
            "label": label,
        }

    weakest = sorted(
        (
            (k, v)
            for k, v in dim_stats.items()
            if v.get("mean") is not None and v.get("n", 0) > 0
        ),
        key=lambda kv: kv[1]["mean"],
    )[:3]
    strongest = sorted(
        (
            (k, v)
            for k, v in dim_stats.items()
            if v.get("mean") is not None and v.get("n", 0) > 0
        ),
        key=lambda kv: -kv[1]["mean"],
    )[:3]

    def summarize_playbook_audit(domain):
        audits = [
            a
            for a in playbook_audits
            if a.get("domain") == domain
            or (domain == "math" and not a.get("domain"))
        ]
        if not audits:
            return None
        signal_names = (audits[0].get("signals") or {}).keys()
        return {
            "applicableSessions": len(audits),
            "sampleSessions": n,
            "meanCueCoverage": round(
                sum(float(a.get("coverage") or 0) for a in audits) / len(audits),
                3,
            ),
            "signalRates": {
                name: round(
                    sum(bool((a.get("signals") or {}).get(name)) for a in audits)
                    / len(audits),
                    3,
                )
                for name in signal_names
            },
            "interpretation": "Heuristic surface cues only; do not treat as a teaching-quality score.",
        }

    math_playbook_audit = summarize_playbook_audit("math")
    science_playbook_audit = summarize_playbook_audit("science")
    writing_playbook_audit = summarize_playbook_audit("writing")

    return {
        "rubricVersion": RUBRIC_VERSION,
        "targetSampleSize": TARGET_SAMPLE_SIZE,
        "scoredCount": n,
        "sampleComplete": n >= TARGET_SAMPLE_SIZE,
        "overallMean": round(sum(means) / len(means), 3) if means else None,
        "dimensions": dim_stats,
        "mathPlaybookAudit": math_playbook_audit,
        "sciencePlaybookAudit": science_playbook_audit,
        "writingPlaybookAudit": writing_playbook_audit,
        "weakest": [
            {"id": k, "label": v["label"], "mean": v["mean"]} for k, v in weakest
        ],
        "strongest": [
            {"id": k, "label": v["label"], "mean": v["mean"]} for k, v in strongest
        ],
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "nextStep": (
            "Sample complete — use means as C8.1 automation baseline."
            if n >= TARGET_SAMPLE_SIZE
            else f"Score {TARGET_SAMPLE_SIZE - n} more session(s) to complete C8.3 cohort."
        ),
    }


def render_report_markdown(summary: Dict[str, Any], *, title: str = "C8.3 eval report") -> str:
    lines = [
        f"# {title}",
        "",
        f"- Rubric version: **{summary.get('rubricVersion')}**",
        f"- Scored: **{summary.get('scoredCount')}** / target **{summary.get('targetSampleSize')}**",
        f"- Sample complete: **{'yes' if summary.get('sampleComplete') else 'no'}**",
        f"- Overall weighted mean: **{summary.get('overallMean') if summary.get('overallMean') is not None else '—'}**",
        f"- Generated: {summary.get('generatedAt')}",
        "",
        "## Dimension means",
        "",
        "| Dimension | n | mean | min | max |",
        "|-----------|---|------|-----|-----|",
    ]
    dims = summary.get("dimensions") or {}
    for dim_id in DIMENSION_IDS:
        st = dims.get(dim_id) or {}
        label = st.get("label") or dim_id
        lines.append(
            f"| {label} | {st.get('n', 0)} | {st.get('mean') if st.get('mean') is not None else '—'} "
            f"| {st.get('min') if st.get('min') is not None else '—'} "
            f"| {st.get('max') if st.get('max') is not None else '—'} |"
        )
    if summary.get("weakest"):
        lines += ["", "## Weakest (focus for product + C8.1)", ""]
        for w in summary["weakest"]:
            lines.append(f"- **{w['label']}**: mean {w['mean']}")
    if summary.get("strongest"):
        lines += ["", "## Strongest", ""]
        for w in summary["strongest"]:
            lines.append(f"- **{w['label']}**: mean {w['mean']}")
    for domain in ("math", "science", "writing"):
        audit = summary.get(f"{domain}PlaybookAudit")
        if not audit:
            continue
        lines += [
            "",
            f"## C7 {domain} playbook surface cues (heuristic, not a score)",
            "",
            f"Eligible {domain} sessions: **{audit['applicableSessions']}** / {audit['sampleSessions']} · "
            f"mean cue coverage: **{audit['meanCueCoverage']}**",
            "",
            "| Cue | Sessions with cue |",
            "|-----|------------------|",
        ]
        for cue, rate in (audit.get("signalRates") or {}).items():
            sessions_with_cue = round(rate * audit["applicableSessions"])
            lines.append(
                f"| {cue.replace('_', ' ').title()} | {sessions_with_cue} / {audit['applicableSessions']} |"
            )
        lines += ["", audit["interpretation"]]
    lines += ["", f"**Next:** {summary.get('nextStep')}", ""]
    return "\n".join(lines)
