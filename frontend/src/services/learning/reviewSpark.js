/**
 * Epic C1 — Review spark helpers (client).
 */

import {
  completeReviewSpark as apiComplete,
  getReviewSparks as apiList,
} from "../api/learning";

/** Tutor directives for a short retrieval-practice review session. */
export function reviewModeDirectives({
  skillLabel = "this skill",
  skillSlug = "",
  topic = "",
} = {}) {
  const label = skillLabel || topic || "this skill";
  return [
    `REVIEW SPARK MODE: This is a short spaced-review warm-up on «${label}»${
      skillSlug ? ` (${skillSlug})` : ""
    } — not a full new-topic lecture.`,
    "Open with one quick retrieval question or micro-prompt. Prefer 2–4 focused turns.",
    "Celebrate correct recall; if they miss, give a tiny scaffold then try a twin item.",
    "Keep energy light and time-boxed. Do not expand into a long new unit unless they ask.",
  ];
}

export function buildReviewOpeningHint({ skillLabel, topic } = {}) {
  const label = skillLabel || topic || "this idea";
  return `Quick Review spark on ${label}: one short check-in question, then practice. Keep it brief and warm.`;
}

/**
 * Fetch due reviews; returns empty list on failure (offline / unauth).
 */
export async function loadReviewSparks({ refresh = true } = {}) {
  try {
    const data = await apiList({ refresh });
    const due = Array.isArray(data?.due) ? data.due : [];
    const dueNow = Array.isArray(data?.dueNow)
      ? data.dueNow
      : due.filter((d) => d.isDue);
    return {
      due,
      dueNow,
      count: data?.count ?? dueNow.length,
      hasDue: Boolean(data?.hasDue ?? dueNow.length),
      upcomingCount: data?.upcomingCount ?? 0,
      raw: data,
    };
  } catch {
    return {
      due: [],
      dueNow: [],
      count: 0,
      hasDue: false,
      upcomingCount: 0,
      raw: null,
    };
  }
}

export async function finishReviewSpark({
  skillSlug,
  reviewId,
  outcome = "success",
} = {}) {
  try {
    return await apiComplete({ skillSlug, reviewId, outcome });
  } catch (err) {
    return { ok: false, error: err?.message || "complete_failed" };
  }
}

/**
 * Prefer a real due Review spark for B8 CTA when available.
 */
export function pickReviewCtaFromDue(dueList = [], { subject, topic } = {}) {
  if (!Array.isArray(dueList) || !dueList.length) return null;
  const topicLc = String(topic || "").toLowerCase();
  const match =
    dueList.find(
      (d) =>
        d.isDue !== false &&
        topicLc &&
        String(d.topic || "").toLowerCase() === topicLc
    ) || dueList.find((d) => d.isDue !== false) || dueList[0];
  if (!match) return null;
  return {
    kind: "review_spark",
    label: `Review spark: ${match.shortLabel || match.skillName || match.topic}`,
    subject: match.subject || subject || "Math Foundations",
    topic: match.topic || topic || "",
    skillSlug: match.skillSlug,
    reviewId: match.id,
    due: true,
    hrefTab: "lesson",
  };
}
