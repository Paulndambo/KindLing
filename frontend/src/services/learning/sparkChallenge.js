/**
 * Epic G1 — Light spark challenge (optional, post-C1).
 * Short optional “3 solid graded turns” on a weak pilot skill.
 * Celebration only (persistence + skill sparks) — no badge inventory.
 */

export const SPARK_CHALLENGE_TARGET = 3;

/**
 * Tutor directives while a spark challenge is active.
 */
export function challengeModeDirectives({
  skillLabel = "this skill",
  skillSlug = "",
  topic = "",
  target = SPARK_CHALLENGE_TARGET,
} = {}) {
  const label = skillLabel || topic || "this skill";
  const n = Math.max(1, Number(target) || SPARK_CHALLENGE_TARGET);
  return [
    `SPARK CHALLENGE MODE: Optional short challenge — aim for ${n} solid correct graded turns on «${label}»${
      skillSlug ? ` (${skillSlug})` : ""
    }.`,
    "Keep items approachable and progressive. Celebrate each solid hit; do not shame misses.",
    "This is tutor-first practice, not a game economy — no badges, points inventory, or unlocks.",
    "Prefer 3–6 focused turns total. Offer to stop anytime; never pressure them to “finish the challenge.”",
    "When they land solid answers, briefly name the skill spark getting brighter — keep it warm and brief.",
  ];
}

export function buildChallengeOpeningHint({
  skillLabel,
  topic,
  target = SPARK_CHALLENGE_TARGET,
} = {}) {
  const label = skillLabel || topic || "this skill";
  const n = Math.max(1, Number(target) || SPARK_CHALLENGE_TARGET);
  return (
    `Spark challenge on ${label}: invite them warmly to try for ${n} solid answers. ` +
    `Start with one clear, grade-right check — not a trick. Keep energy light and optional.`
  );
}

/**
 * Pick a weak / ready skill for a challenge from dashboard signals.
 * Preference: due Review spark → recommended next skill → focus area → mastery map weak row.
 *
 * @returns {{
 *   skillSlug: string,
 *   skillLabel: string,
 *   subject: string,
 *   topic: string,
 *   score?: number|null,
 *   stateLabel?: string,
 *   reviewId?: number|null,
 *   source: string,
 *   target: number,
 * } | null}
 */
export function pickSparkChallengeCandidate({
  dueReviews = [],
  recommendedNextSkill = null,
  focusAreas = [],
  masteryMap = [],
  target = SPARK_CHALLENGE_TARGET,
} = {}) {
  const n = Math.max(1, Number(target) || SPARK_CHALLENGE_TARGET);

  const due = (Array.isArray(dueReviews) ? dueReviews : []).filter(
    (d) => d && d.isDue !== false && (d.skillSlug || d.skill)
  );
  if (due.length) {
    // Prefer lowest score among due items
    const sorted = [...due].sort((a, b) => {
      const sa = a.score != null ? Number(a.score) : 50;
      const sb = b.score != null ? Number(b.score) : 50;
      return sa - sb;
    });
    const item = sorted[0];
    return {
      skillSlug: item.skillSlug || item.skill || "",
      skillLabel: item.shortLabel || item.skillName || item.topic || "this skill",
      subject: item.subject || "Math Foundations",
      topic: item.topic || item.shortLabel || item.skillName || "Practice",
      score: item.score ?? null,
      stateLabel: item.stateLabel || "",
      reviewId: item.id ?? null,
      source: "review_due",
      target: n,
    };
  }

  if (recommendedNextSkill && (recommendedNextSkill.slug || recommendedNextSkill.skillSlug)) {
    const s = recommendedNextSkill;
    const slug = s.slug || s.skillSlug;
    const label = s.shortLabel || s.name || s.skillName || slug;
    return {
      skillSlug: slug,
      skillLabel: label,
      subject: s.subject || s.subjectName || "Math Foundations",
      topic: s.topic || s.topicName || label,
      score: s.score ?? null,
      stateLabel: s.stateLabel || s.state || "",
      reviewId: null,
      source: "recommended_next",
      target: n,
    };
  }

  const focus = (Array.isArray(focusAreas) ? focusAreas : []).find(
    (f) => f && (f.skillSlug || f.slug || f.topic)
  );
  if (focus) {
    const label = focus.shortLabel || focus.label || focus.skill || focus.topic;
    return {
      skillSlug: focus.skillSlug || focus.slug || "",
      skillLabel: label || "Focus skill",
      subject: focus.subject || "Math Foundations",
      topic: focus.topic || label || "Practice",
      score: focus.score ?? focus.level ?? null,
      stateLabel: focus.status || "",
      reviewId: null,
      source: "focus_area",
      target: n,
    };
  }

  const rows = Array.isArray(masteryMap) ? masteryMap : [];
  const weak = [...rows]
    .filter((r) => r && (r.skillSlug || r.slug || r.skill))
    .sort((a, b) => {
      const sa = a.level != null ? Number(a.level) : a.score != null ? Number(a.score) : 100;
      const sb = b.level != null ? Number(b.level) : b.score != null ? Number(b.score) : 100;
      return sa - sb;
    })[0];
  if (weak) {
    const label = weak.skill || weak.shortLabel || weak.name || "Practice skill";
    return {
      skillSlug: weak.skillSlug || weak.slug || "",
      skillLabel: label,
      subject: weak.subject || "Math Foundations",
      topic: weak.topic || label,
      score: weak.level ?? weak.score ?? null,
      stateLabel: weak.status || "",
      reviewId: null,
      source: "mastery_map",
      target: n,
    };
  }

  return null;
}

export function emptyChallengeProgress({
  target = SPARK_CHALLENGE_TARGET,
  skillSlug = "",
  skillLabel = "",
} = {}) {
  return {
    correct: 0,
    incorrect: 0,
    partial: 0,
    target: Math.max(1, Number(target) || SPARK_CHALLENGE_TARGET),
    completed: false,
    startedLogged: false,
    skillSlug: skillSlug || "",
    skillLabel: skillLabel || "",
  };
}

/**
 * Apply one graded correctness signal. Returns next progress snapshot.
 */
export function applyChallengeGradedTurn(progress, correctness) {
  const next = {
    ...(progress || emptyChallengeProgress()),
    correct: progress?.correct || 0,
    incorrect: progress?.incorrect || 0,
    partial: progress?.partial || 0,
  };
  if (next.completed) return next;

  const c = String(correctness || "").toLowerCase();
  if (c === "correct") next.correct += 1;
  else if (c === "incorrect") next.incorrect += 1;
  else if (c === "partial") next.partial += 1;
  else return next; // exploring / unknown don't count

  if (next.correct >= next.target) {
    next.completed = true;
  }
  return next;
}

export function challengeProgressLabel(progress) {
  if (!progress) return "";
  const t = progress.target || SPARK_CHALLENGE_TARGET;
  const c = Math.min(progress.correct || 0, t);
  if (progress.completed) return `${t}/${t} solid — challenge complete`;
  return `${c}/${t} solid`;
}

/**
 * Encouraging completion copy — no badge language.
 */
export function challengeCelebrationCopy({
  skillLabel = "that skill",
  correct = SPARK_CHALLENGE_TARGET,
  target = SPARK_CHALLENGE_TARGET,
} = {}) {
  const label = skillLabel || "that skill";
  const n = correct || target || SPARK_CHALLENGE_TARGET;
  return {
    text: `Spark challenge complete — ${n} solid hits on ${label}. That skill spark just got brighter.`,
    persistenceNote: `You stuck with ${label} for ${n} solid turns. Effort counts here.`,
    headline: "Challenge complete",
    body: `Nice work landing ${n} solid answers on ${label}. No badges needed — the skill spark is the win.`,
  };
}

/**
 * Partial progress encouragement (optional mid-challenge chip).
 */
export function challengeProgressChipCopy(progress) {
  if (!progress || progress.completed) return null;
  const t = progress.target || SPARK_CHALLENGE_TARGET;
  const c = progress.correct || 0;
  if (c <= 0) return null;
  if (c >= t - 1) {
    return `One more solid hit to finish the spark challenge (${c}/${t}).`;
  }
  return `Spark challenge: ${c}/${t} solid so far — keep going if you want.`;
}
