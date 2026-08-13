/**
 * Epic B3 — Affective check-ins + persistence celebration.
 *
 * Gentle “how are you feeling?” prompts after frustration streaks or long
 * sessions. Never shame. Celebrate sticking with it, not only accuracy.
 */

import { Affect } from "./types";

/** Tunable thresholds for check-in prompts. */
export const AFFECT_CHECKIN_THRESHOLDS = {
  /** Consecutive frustrated turns (inferred) before a check-in */
  FRUSTRATION_STREAK: 2,
  /** Frustrated labels in last N affects */
  FRUSTRATION_WINDOW: 5,
  FRUSTRATION_IN_WINDOW: 3,
  /** Session length triggers */
  LONG_SESSION_MS: 12 * 60_000,
  LONG_SESSION_TURNS: 10,
  /** Minimum turns before any check-in (avoid first-message popups) */
  MIN_TURNS: 3,
  /** Cooldown between check-ins in one session */
  COOLDOWN_MS: 8 * 60_000,
  /** Max check-ins per session */
  MAX_PER_SESSION: 2,
  /** Persistence: long think-time counts as effort */
  PERSISTENCE_THINK_MS: 20_000,
};

/**
 * Self-report options shown on the student card.
 * Labels are warm and non-judgmental.
 */
export const AFFECT_CHECKIN_OPTIONS = [
  {
    id: "great",
    label: "Feeling good",
    emoji: "🌟",
    affect: Affect.CONFIDENT,
    tutorHint: "Student feels good — celebrate their effort and keep a steady warm pace.",
  },
  {
    id: "okay",
    label: "Doing okay",
    emoji: "🙂",
    affect: Affect.NEUTRAL,
    tutorHint: "Student feels okay — stay encouraging and check in lightly through the work.",
  },
  {
    id: "stuck",
    label: "A bit stuck",
    emoji: "💭",
    affect: Affect.HESITANT,
    tutorHint:
      "Student feels a bit stuck — slow down, normalize that sticky moments are normal, offer a smaller step. Celebrate that they said so.",
  },
  {
    id: "break",
    label: "Need a break",
    emoji: "🌿",
    affect: Affect.FRUSTRATED,
    tutorHint:
      "Student asked for a break — warmly validate, suggest a short reset or easier warm-up, no pressure to push through.",
  },
];

export function getCheckInOption(id) {
  return AFFECT_CHECKIN_OPTIONS.find((o) => o.id === id) || null;
}

/**
 * Decide whether to show an affective check-in after a turn / on a timer tick.
 *
 * @returns {{
 *   shouldPrompt: boolean,
 *   reason: 'frustration_streak'|'frustration_window'|'long_session'|null,
 *   copy: { headline: string, body: string } | null,
 * }}
 */
export function evaluateAffectCheckIn({
  turnCount = 0,
  sessionDurationMs = 0,
  consecutiveFrustrated = 0,
  recentAffects = [],
  checkInsThisSession = 0,
  lastCheckInAt = null,
  interventionStatus = "idle",
  softNudgeVisible = false,
  checkInAlreadyOpen = false,
  now = Date.now(),
  thresholds = AFFECT_CHECKIN_THRESHOLDS,
} = {}) {
  if (checkInAlreadyOpen) {
    return { shouldPrompt: false, reason: null, copy: null };
  }
  if (softNudgeVisible) {
    return { shouldPrompt: false, reason: null, copy: null };
  }
  // Don't stack on intervention offers
  if (interventionStatus === "offered") {
    return { shouldPrompt: false, reason: null, copy: null };
  }
  if (turnCount < thresholds.MIN_TURNS) {
    return { shouldPrompt: false, reason: null, copy: null };
  }
  if (checkInsThisSession >= thresholds.MAX_PER_SESSION) {
    return { shouldPrompt: false, reason: null, copy: null };
  }
  if (
    lastCheckInAt != null &&
    now - lastCheckInAt < thresholds.COOLDOWN_MS
  ) {
    return { shouldPrompt: false, reason: null, copy: null };
  }

  let reason = null;
  if (consecutiveFrustrated >= thresholds.FRUSTRATION_STREAK) {
    reason = "frustration_streak";
  } else {
    const window = recentAffects.slice(-thresholds.FRUSTRATION_WINDOW);
    const frust = window.filter((a) => a === Affect.FRUSTRATED).length;
    if (frust >= thresholds.FRUSTRATION_IN_WINDOW) {
      reason = "frustration_window";
    } else if (
      sessionDurationMs >= thresholds.LONG_SESSION_MS ||
      turnCount >= thresholds.LONG_SESSION_TURNS
    ) {
      // Long-session check-in only once the session is clearly long
      // and we haven't already checked in for length (caller can still cooldown)
      reason = "long_session";
    }
  }

  if (!reason) {
    return { shouldPrompt: false, reason: null, copy: null };
  }

  return {
    shouldPrompt: true,
    reason,
    copy: describeAffectCheckIn(reason),
  };
}

export function describeAffectCheckIn(reason = "long_session") {
  if (reason === "frustration_streak" || reason === "frustration_window") {
    return {
      reason,
      headline: "Quick check-in",
      body: "This part can feel sticky — and sticking with it takes courage. How are you feeling right now?",
    };
  }
  return {
    reason: reason || "long_session",
    headline: "You've been working hard",
    body: "Just checking in — no wrong answers. How are you feeling about this?",
  };
}

/**
 * Update persistence counters from one analyzed exchange.
 * Persistence = effort and bounce-back, not accuracy alone.
 */
export function scorePersistenceDelta(signals = {}, prior = {}) {
  let delta = 0;
  const tags = [];

  if (
    signals.responseMs != null &&
    signals.responseMs >= AFFECT_CHECKIN_THRESHOLDS.PERSISTENCE_THINK_MS
  ) {
    delta += 1;
    tags.push("think_time");
  }
  // Came back after incorrect / hint and still engaged
  if (
    (prior.lastCorrectness === "incorrect" || prior.lastWasHint) &&
    signals.correctness &&
    signals.correctness !== "unknown" &&
    !signals.isHintRequest
  ) {
    delta += 1;
    tags.push("bounce_back");
  }
  if (
    signals.correctness === "correct" &&
    (prior.consecutiveIncorrect || 0) >= 1
  ) {
    delta += 1;
    tags.push("recovery");
  }
  // Stayed after self-reporting stuck / break and sent another real turn
  if (prior.afterCheckInStuck && !signals.isHintRequest) {
    delta += 1;
    tags.push("stayed_after_checkin");
  }
  // Elaborated answer while struggling
  if (
    (signals.wordCount || 0) >= 12 &&
    (signals.correctness === "incorrect" ||
      signals.correctness === "partial" ||
      signals.affect === Affect.HESITANT)
  ) {
    delta += 1;
    tags.push("elaborated_through_hard");
  }

  return { delta, tags };
}

/**
 * Tutor directives from check-in response + session persistence.
 */
export function affectDirectivesFromState({
  lastCheckIn = null,
  persistenceScore = 0,
  persistenceTags = [],
} = {}) {
  const directives = [];

  if (lastCheckIn?.tutorHint) {
    directives.push(lastCheckIn.tutorHint);
  }
  if (lastCheckIn?.optionId === "break") {
    directives.push(
      "Prefer a micro-reset or easier related idea before hard new material. Celebrate that they asked for what they need."
    );
  }
  if (lastCheckIn?.optionId === "stuck") {
    directives.push(
      "Name that asking for help is smart. Use one smaller step and celebrate any partial reasoning."
    );
  }
  if (persistenceScore >= 2) {
    directives.push(
      "Celebrate persistence and effort explicitly (sticking with hard ideas, thinking time, bouncing back) — not only correct answers."
    );
  } else if (persistenceTags.includes("recovery") || persistenceTags.includes("bounce_back")) {
    directives.push(
      "Warmly notice their bounce-back after a tough moment — effort counts."
    );
  }

  return directives;
}

/**
 * Student-facing celebration chip copy (never shame).
 */
export function persistenceCelebrationCopy(tags = [], score = 0) {
  if (tags.includes("recovery") || tags.includes("bounce_back")) {
    return "You bounced back — that takes real grit.";
  }
  if (tags.includes("stayed_after_checkin")) {
    return "Thanks for sticking with it.";
  }
  if (tags.includes("think_time")) {
    return "Taking your time to think is a superpower.";
  }
  if (tags.includes("elaborated_through_hard")) {
    return "Explaining your thinking helps you grow.";
  }
  if (score >= 3) {
    return "Your persistence is lighting the way.";
  }
  return null;
}
