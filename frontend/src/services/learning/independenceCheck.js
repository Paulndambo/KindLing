/**
 * Epic L4 — Independence & transfer checks
 *
 * After heavy scaffold (ladder L2 worked-example or L3 full-guide), offer one
 * no-help “twin” item. Success without hints = independent performance (G15).
 * Optional transfer items (structurally new surface) flag G16.
 *
 * Never shame: copy frames “try one on your own” as growth, not a test.
 */

import { InterventionLevel, normalizeLevel } from "./interventionLadder";
import {
  questionsForTopic,
  getAssessmentQuestion,
} from "./assessmentBank";
import {
  AssessmentPhase,
  applyAssessmentAnswer,
  advanceAssessment,
  scoreAssessment,
} from "./assessmentEngine";

export const INDEPENDENCE_CHECK_VERSION = 1;

/** Minimum ladder level that counts as “heavy help” before a twin. */
export const HEAVY_HELP_MIN_LEVEL = InterventionLevel.WORKED_EXAMPLE; // 2

export const IndependencePhase = {
  IDLE: "idle",
  OFFERED: "offered",
  ACTIVE: "active",
  EXPLAINING: "explaining",
  COMPLETED: "completed",
  SKIPPED: "skipped",
  DECLINED: "declined",
};

/**
 * @param {object} opts
 * @param {number} opts.ladderLevel just-exited ladder rank
 * @param {boolean} [opts.hadGradedSuccessDuringHelp] correct/partial while help active
 * @param {boolean} [opts.alreadyOfferedThisSession]
 * @param {boolean} [opts.alreadyCompletedThisSession]
 * @param {boolean} [opts.assessmentActive]
 * @param {boolean} [opts.multiStepActive]
 * @param {boolean} [opts.interventionActive]
 */
export function shouldOfferIndependenceTwin({
  ladderLevel = 0,
  hadGradedSuccessDuringHelp = false,
  alreadyOfferedThisSession = false,
  alreadyCompletedThisSession = false,
  assessmentActive = false,
  multiStepActive = false,
  interventionActive = false,
} = {}) {
  if (alreadyOfferedThisSession || alreadyCompletedThisSession) return false;
  if (assessmentActive || multiStepActive || interventionActive) return false;
  const level = normalizeLevel(ladderLevel);
  if (level < HEAVY_HELP_MIN_LEVEL) return false;
  // Prefer after a successful scaffolded moment; still allow after L3/L4 exit
  if (!hadGradedSuccessDuringHelp && level < InterventionLevel.FULL_GUIDE) {
    return false;
  }
  return true;
}

/**
 * Build a soft offer card (no shame).
 */
export function buildIndependenceOfferCard({
  topic = "",
  skillLabel = "",
  transfer = false,
  ladderLevel = 0,
} = {}) {
  const focus = skillLabel || topic || "this idea";
  const level = normalizeLevel(ladderLevel);
  return {
    kind: "independence_twin",
    headline: transfer ? "Try a fresh angle" : "Try one on your own",
    body: transfer
      ? `You just got help on «${focus}». Ready for one new-looking question with no hints — just to see what stuck?`
      : `You just worked through «${focus}» with support. Want one short twin with no hints — a confidence check, not a test?`,
    acceptCta: "Yes, one question",
    declineCta: "Not now",
    eyebrow: "Independence spark",
    transfer: Boolean(transfer),
    ladderLevel: level,
    topic: topic || "",
    skillLabel: focus,
  };
}

/**
 * Pick one MCQ for the twin. Prefer transfer items when available.
 *
 * @returns {{ question: object, transfer: boolean } | null}
 */
export function pickIndependenceTwinQuestion({
  subject = "",
  topic = "",
  unit = "",
  skillSlug = "",
  skillSlugs = [],
  preferTransfer = true,
  excludeIds = [],
} = {}) {
  const baseOpts = {
    skillSlug,
    skillSlugs,
    unit,
    limit: 8,
    minScore: 4,
  };
  const exclude = new Set((excludeIds || []).map(String));

  let pool = [];
  if (preferTransfer) {
    pool = questionsForTopic(subject, topic, {
      ...baseOpts,
      transferOnly: true,
    });
  }
  let transfer = pool.length > 0;
  if (!pool.length) {
    pool = questionsForTopic(subject, topic, {
      ...baseOpts,
      // standard items OK as near-twins
      transferOnly: false,
    });
    transfer = false;
  }

  pool = pool.filter((q) => q && !exclude.has(String(q.id)));
  if (!pool.length) return null;

  // Prefer medium difficulty for independence; fall back to first
  const medium = pool.find((q) => q.difficulty === "medium");
  const question = medium || pool[0];
  return {
    question: {
      ...question,
      options: (question.options || []).map((o) => ({ ...o })),
    },
    transfer: Boolean(transfer || question.transfer),
  };
}

/**
 * Create a 1-item no-scaffold independence session.
 */
export function createIndependenceSession({
  subject = "",
  topic = "",
  unit = "",
  skillSlug = "",
  skillSlugs = [],
  ladderLevel = 0,
  ladderLevelId = "",
  preferTransfer = true,
  source = "post_ladder",
  excludeIds = [],
} = {}) {
  const picked = pickIndependenceTwinQuestion({
    subject,
    topic,
    unit,
    skillSlug,
    skillSlugs,
    preferTransfer,
    excludeIds,
  });
  if (!picked?.question) return null;

  const q = picked.question;
  return {
    id: `indep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    version: INDEPENDENCE_CHECK_VERSION,
    kind: "independence_twin",
    status: IndependencePhase.ACTIVE,
    phase: IndependencePhase.ACTIVE,
    noScaffold: true,
    transfer: Boolean(picked.transfer),
    subject: subject || "",
    topic: topic || "",
    unit: unit || "",
    skillSlug: skillSlug || q.skillSlug || "",
    skillSlugs: skillSlugs || [],
    ladderLevel: normalizeLevel(ladderLevel),
    ladderLevelId: ladderLevelId || "",
    source: source || "post_ladder",
    // Reuse assessment engine shape (1 question)
    questions: [q],
    currentIndex: 0,
    answers: [],
    startedAt: Date.now(),
    completedAt: null,
    lastResult: null,
    outcome: null,
  };
}

export function applyIndependenceAnswer(session, selectedIndex) {
  if (!session || session.status !== IndependencePhase.ACTIVE) {
    return { session, result: null };
  }
  // Map to assessment engine phases temporarily
  const asAssess = {
    ...session,
    status: AssessmentPhase.ACTIVE,
    phase: AssessmentPhase.ACTIVE,
  };
  const { session: next, result } = applyAssessmentAnswer(asAssess, selectedIndex);
  if (!result) return { session, result: null };

  const mapped = {
    ...next,
    kind: "independence_twin",
    noScaffold: true,
    transfer: session.transfer,
    ladderLevel: session.ladderLevel,
    ladderLevelId: session.ladderLevelId,
    source: session.source,
    status: IndependencePhase.EXPLAINING,
    phase: IndependencePhase.EXPLAINING,
  };
  return { session: mapped, result };
}

export function completeIndependenceAfterExplain(session) {
  if (!session) return { session: null, completed: false, outcome: null };
  const asAssess = {
    ...session,
    status: AssessmentPhase.ACTIVE,
    phase: AssessmentPhase.EXPLAINING,
  };
  const { session: next, completed } = advanceAssessment(asAssess);
  if (!completed || !next) {
    return {
      session: {
        ...next,
        kind: "independence_twin",
        noScaffold: true,
        transfer: session.transfer,
        status: IndependencePhase.ACTIVE,
        phase: IndependencePhase.ACTIVE,
      },
      completed: false,
      outcome: null,
    };
  }

  const score = scoreAssessment(next);
  const success = Boolean(score.correct >= 1 && score.total >= 1);
  const outcome = {
    success,
    correct: score.correct,
    total: score.total,
    transfer: Boolean(session.transfer),
    noScaffold: true,
    ladderLevel: session.ladderLevel,
    skillSlug: session.skillSlug || next.questions?.[0]?.skillSlug || "",
    questionId: next.answers?.[0]?.questionId || next.questions?.[0]?.id || "",
    independence: success ? "demonstrated" : "not_yet",
  };

  const done = {
    ...next,
    kind: "independence_twin",
    noScaffold: true,
    transfer: session.transfer,
    ladderLevel: session.ladderLevel,
    ladderLevelId: session.ladderLevelId,
    source: session.source,
    status: IndependencePhase.COMPLETED,
    phase: IndependencePhase.COMPLETED,
    completedAt: Date.now(),
    outcome,
  };
  return { session: done, completed: true, outcome, score };
}

export function declineIndependenceOffer() {
  return { status: IndependencePhase.DECLINED, at: Date.now() };
}

export function skipIndependenceSession(session) {
  if (!session) return null;
  return {
    ...session,
    status: IndependencePhase.SKIPPED,
    phase: IndependencePhase.SKIPPED,
    completedAt: Date.now(),
    outcome: {
      success: false,
      skipped: true,
      transfer: Boolean(session.transfer),
      noScaffold: true,
      independence: "skipped",
    },
  };
}

export function independenceCelebrationCopy(session) {
  const topic = session?.topic || "this idea";
  const transfer = session?.transfer;
  const ok = session?.outcome?.success;
  if (ok && transfer) {
    return {
      headline: "Independent transfer",
      body: `You solved a new-looking question on «${topic}» with no hints. That is real independence.`,
    };
  }
  if (ok) {
    return {
      headline: "You owned it",
      body: `You answered the twin on «${topic}» without scaffold. Confidence earned.`,
    };
  }
  return {
    headline: "Good try on your own",
    body: `Solo tries still teach. Re-read the note on «${topic}» — we can practice again with a light hint later.`,
  };
}

/**
 * Rolling independence rate from completed twin outcomes (0–1).
 * @param {Array<{ success?: boolean, skipped?: boolean }>} outcomes
 */
export function independenceRate(outcomes = []) {
  const scored = (outcomes || []).filter((o) => o && !o.skipped);
  if (!scored.length) return null;
  const wins = scored.filter((o) => o.success).length;
  return Math.round((wins / scored.length) * 1000) / 1000;
}

/**
 * Whether to prefer a transfer surface for this twin.
 * After full guide / easier path, transfer is more informative.
 */
export function preferTransferForLadder(level) {
  const n = normalizeLevel(level);
  return n >= InterventionLevel.FULL_GUIDE;
}

export function getIndependenceQuestion(session) {
  if (!session?.questions?.length) return null;
  return session.questions[session.currentIndex || 0] || null;
}

/** Re-export for tests that need bank lookup */
export { getAssessmentQuestion };
