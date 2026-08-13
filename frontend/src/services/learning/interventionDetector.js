/**
 * Detect when a student is struggling enough for Kindling to intervene.
 *
 * Epic B1: multi-signal struggle model — incorrect streaks, hints, affect,
 * idle time, short answers, topic thrashing, rapid guessing, off-topic drift.
 */

import { InterventionStatus, StruggleSignal } from "./types";
import {
  INCORRECT_STREAK_THRESHOLD,
  STRUGGLE_THRESHOLDS,
} from "./struggleThresholds";
import {
  selectInterventionLevel,
  enrichInterventionContext,
  shouldOfferEscalation,
  InterventionLevel,
  levelMeta,
  normalizeLevel,
} from "./interventionLadder";

export { InterventionStatus, StruggleSignal };
export { INCORRECT_STREAK_THRESHOLD, STRUGGLE_THRESHOLDS };
export {
  selectInterventionLevel,
  enrichInterventionContext,
  shouldOfferEscalation,
  InterventionLevel,
  levelMeta,
  normalizeLevel,
};

/**
 * Evaluate idle-time struggle while awaiting a student answer.
 * Soft nudge first; full help offer only after a longer wait.
 *
 * @returns {{
 *   shouldNudge: boolean,
 *   shouldOffer: boolean,
 *   reason: string | null,
 *   idleMs: number,
 * }}
 */
export function evaluateIdleStruggle({
  idleMs = 0,
  currentStatus = InterventionStatus.IDLE,
  alreadyNudged = false,
  alreadyOfferedIdle = false,
  thresholds = STRUGGLE_THRESHOLDS,
} = {}) {
  if (
    currentStatus === InterventionStatus.OFFERED ||
    currentStatus === InterventionStatus.ACTIVE
  ) {
    return {
      shouldNudge: false,
      shouldOffer: false,
      reason: null,
      idleMs,
    };
  }

  if (idleMs >= thresholds.IDLE_OFFER_MS && !alreadyOfferedIdle) {
    return {
      shouldNudge: false,
      shouldOffer: true,
      reason: StruggleSignal.IDLE,
      idleMs,
    };
  }

  if (idleMs >= thresholds.IDLE_NUDGE_MS && !alreadyNudged) {
    return {
      shouldNudge: true,
      shouldOffer: false,
      reason: StruggleSignal.IDLE,
      idleMs,
    };
  }

  return {
    shouldNudge: false,
    shouldOffer: false,
    reason: null,
    idleMs,
  };
}

/**
 * Evaluate whether to offer or auto-start intervention after a turn.
 *
 * @returns {{
 *   shouldOffer: boolean,
 *   shouldAutoEnter: boolean,
 *   shouldEscalate: boolean,
 *   reason: string | null,
 *   signals: string[],
 *   scaffoldingBias: number,
 *   level: number,
 * }}
 */
export function evaluateInterventionTrigger({
  consecutiveIncorrect = 0,
  currentStatus = InterventionStatus.IDLE,
  affect = null,
  consecutiveHints = 0,
  consecutiveShortAnswers = 0,
  consecutiveRapidGuesses = 0,
  consecutiveOffTopic = 0,
  topicThrashing = false,
  scaffoldingBias = 0,
  thresholds = STRUGGLE_THRESHOLDS,
  highestLevelUsed = 0,
  currentLevel = 0,
  alreadyOfferedEscalate = false,
} = {}) {
  // Offered — wait for accept/decline
  if (currentStatus === InterventionStatus.OFFERED) {
    return {
      shouldOffer: false,
      shouldAutoEnter: false,
      shouldEscalate: false,
      reason: null,
      signals: [],
      scaffoldingBias,
      level: InterventionLevel.NONE,
    };
  }

  // Active — maybe offer escalate one rung (not auto-enter higher)
  if (currentStatus === InterventionStatus.ACTIVE) {
    const escalate = shouldOfferEscalation({
      currentLevel,
      consecutiveIncorrect,
      consecutiveHints,
      affect,
      alreadyOfferedEscalate,
    });
    if (!escalate) {
      return {
        shouldOffer: false,
        shouldAutoEnter: false,
        shouldEscalate: false,
        reason: null,
        signals: [],
        scaffoldingBias,
        level: normalizeLevel(currentLevel),
      };
    }
    const nextLevel = selectInterventionLevel({
      escalateFrom: currentLevel,
    });
    return {
      shouldOffer: true,
      shouldAutoEnter: false,
      shouldEscalate: true,
      reason: "escalate",
      signals: ["escalate"],
      scaffoldingBias,
      level: nextLevel,
    };
  }

  const streakHit = consecutiveIncorrect >= INCORRECT_STREAK_THRESHOLD;
  const heavyHinting = consecutiveHints >= 2;
  const frustrated = affect === "frustrated";
  const shortStreak =
    consecutiveShortAnswers >= thresholds.SHORT_ANSWER_STREAK;
  const rapidStreak =
    consecutiveRapidGuesses >= thresholds.RAPID_GUESS_STREAK;
  const offTopicHit = consecutiveOffTopic >= thresholds.OFF_TOPIC_STREAK;

  const activeSignals = [];
  if (streakHit) activeSignals.push(StruggleSignal.INCORRECT_STREAK);
  if (frustrated && streakHit) activeSignals.push(StruggleSignal.FRUSTRATION);
  if (heavyHinting) activeSignals.push(StruggleSignal.REPEATED_HINTS);
  if (shortStreak) activeSignals.push(StruggleSignal.SHORT_ANSWERS);
  if (rapidStreak) activeSignals.push(StruggleSignal.RAPID_GUESSING);
  if (topicThrashing) activeSignals.push(StruggleSignal.TOPIC_THRASHING);
  if (offTopicHit) activeSignals.push(StruggleSignal.OFF_TOPIC);

  // Primary reason: strongest / most actionable first
  let reason = null;
  if (streakHit && frustrated) {
    reason = StruggleSignal.FRUSTRATION;
  } else if (rapidStreak && (streakHit || consecutiveIncorrect >= 1)) {
    reason = StruggleSignal.RAPID_GUESSING;
  } else if (topicThrashing) {
    reason = StruggleSignal.TOPIC_THRASHING;
  } else if (offTopicHit) {
    reason = StruggleSignal.OFF_TOPIC;
  } else if (streakHit) {
    reason = StruggleSignal.INCORRECT_STREAK;
  } else if (heavyHinting) {
    reason = StruggleSignal.REPEATED_HINTS;
  } else if (shortStreak && consecutiveIncorrect >= 1) {
    reason = StruggleSignal.SHORT_ANSWERS;
  } else if (rapidStreak) {
    reason = StruggleSignal.RAPID_GUESSING;
  } else if (shortStreak && scaffoldingBias >= 0.45) {
    // Repeated thin answers alone — offer help once bias is elevated
    reason = StruggleSignal.SHORT_ANSWERS;
  }

  const shouldFire = reason != null;

  // Auto-enter when clearly stuck
  const shouldAutoEnter =
    shouldFire &&
    (consecutiveIncorrect >= INCORRECT_STREAK_THRESHOLD + 1 ||
      (streakHit && frustrated) ||
      (rapidStreak && consecutiveIncorrect >= INCORRECT_STREAK_THRESHOLD));

  const level = shouldFire
    ? selectInterventionLevel({
        reason,
        consecutiveIncorrect,
        consecutiveHints,
        affect,
        scaffoldingBias,
        topicThrashing,
        shouldAutoEnter,
        highestLevelUsed,
      })
    : InterventionLevel.NONE;

  return {
    shouldOffer: shouldFire && !shouldAutoEnter,
    shouldAutoEnter,
    shouldEscalate: false,
    reason,
    signals: activeSignals,
    scaffoldingBias,
    level,
  };
}

const REASON_COPY = {
  [StruggleSignal.FRUSTRATION]: {
    reasonText: "this feels tough right now",
    body: (topic) =>
      `Want me to slow down and walk you through "${topic}" step by step? No pressure — we can go at your pace. You can leave the guide anytime.`,
  },
  [StruggleSignal.REPEATED_HINTS]: {
    reasonText: "you've been asking for a few hints",
    body: (topic) =>
      `Want me to walk you through "${topic}" step by step — with clear explanations and examples? You can leave the guide anytime.`,
  },
  [StruggleSignal.INCORRECT_STREAK]: {
    reasonText: null, // filled with topic-aware default
    body: (topic) =>
      `Want me to walk you through "${topic}" step by step — with clear explanations and examples? You can leave the guide anytime.`,
  },
  [StruggleSignal.IDLE]: {
    reasonText: "you've been thinking on this for a bit",
    body: (topic) =>
      `No rush. Want a gentle step-by-step guide on "${topic}"? You can leave anytime.`,
  },
  [StruggleSignal.SHORT_ANSWERS]: {
    reasonText: "your answers have been pretty short lately",
    body: (topic) =>
      `Want me to scaffold "${topic}" with smaller steps and examples? You can leave the guide anytime.`,
  },
  [StruggleSignal.RAPID_GUESSING]: {
    reasonText: "answers are coming in pretty fast",
    body: (topic) =>
      `Want to slow down together on "${topic}"? I can walk you through it step by step and double-check answers carefully.`,
  },
  [StruggleSignal.TOPIC_THRASHING]: {
    reasonText: "we've been hopping between topics",
    body: (topic) =>
      `Want to focus on "${topic}" with a clear step-by-step path — or step back to a related idea that unlocks this one? You can leave the guide anytime.`,
  },
  [StruggleSignal.OFF_TOPIC]: {
    reasonText: "we drifted a little from the lesson",
    body: (topic) =>
      `Want me to gently bring us back to "${topic}" with a clear step-by-step guide? You can leave anytime.`,
  },
};

/**
 * Soft idle nudge copy (not a full intervention offer).
 */
export function describeIdleNudge({ topic } = {}) {
  const topicLabel = topic || "this idea";
  return {
    reason: StruggleSignal.IDLE,
    topic: topicLabel,
    headline: "Still thinking?",
    body: `Take your time on "${topicLabel}". I'm right here if a small hint or step-by-step guide would help.`,
    reasonText: "you've been thinking on this for a bit",
  };
}

/**
 * Build human-readable context for the intervention UI and tutor.
 * Epic B2: includes ladder level + optional worked example / easier skill.
 */
export function describeInterventionContext({
  subject,
  topic,
  consecutiveIncorrect = 0,
  reason = StruggleSignal.INCORRECT_STREAK,
  signals = [],
  level = null,
  profile = null,
  highestLevelUsed = 0,
  shouldAutoEnter = false,
  escalateFrom = 0,
  forcedLevel = null,
  grade = null,
} = {}) {
  const topicLabel = topic || "this idea";
  const subjectLabel = subject || "this subject";
  const pack =
    reason === "escalate"
      ? {
          reasonText: "a little more support might help",
          body: null,
        }
      : REASON_COPY[reason] || REASON_COPY[StruggleSignal.INCORRECT_STREAK];

  let reasonText = pack.reasonText;
  if (!reasonText) {
    reasonText =
      consecutiveIncorrect >= 2
        ? `a couple of answers on "${topicLabel}" didn't land`
        : `you're finding "${topicLabel}" tricky`;
  }

  const resolvedLevel =
    forcedLevel != null || level != null
      ? normalizeLevel(forcedLevel ?? level)
      : selectInterventionLevel({
          reason,
          consecutiveIncorrect,
          affect: null,
          scaffoldingBias: 0,
          shouldAutoEnter,
          highestLevelUsed,
          escalateFrom,
        });

  const meta = levelMeta(resolvedLevel);
  const base = {
    subject: subjectLabel,
    topic: topicLabel,
    reason,
    reasonText,
    consecutiveIncorrect,
    signals: signals.length ? signals : reason ? [reason] : [],
    headline:
      reason === "escalate"
        ? `Want a bit more help on "${topicLabel}"?`
        : `I noticed ${reasonText}`,
    body: pack.body ? pack.body(topicLabel) : meta.description,
    level: resolvedLevel,
  };

  return enrichInterventionContext(base, {
    profile,
    subject: subjectLabel,
    topic: topicLabel,
    level: resolvedLevel,
    grade,
  });
}

/**
 * Tutor personalization directives from live struggle signals (session-scoped).
 * Never shaming — bias toward scaffolds, pace, and focus.
 */
export function struggleDirectivesFromSnapshot(snapshot = {}) {
  const directives = [];
  const bias = snapshot.scaffoldingBias || 0;
  const {
    consecutiveShortAnswers = 0,
    consecutiveRapidGuesses = 0,
    consecutiveOffTopic = 0,
    topicThrashing = false,
  } = snapshot;

  if (bias >= 0.25 || consecutiveShortAnswers >= 2) {
    directives.push(
      "Scaffolding bias elevated — use smaller steps, one micro-question at a time, and invite fuller reasoning without pressure."
    );
  }
  if (consecutiveRapidGuesses >= 1) {
    directives.push(
      "Rapid guessing detected — slow the pace, ask them to explain why before the next answer, and verify carefully when a checkable answer appears."
    );
  }
  if (topicThrashing) {
    directives.push(
      "Topic thrashing — gently suggest focusing on one idea; if stuck, offer a simpler related prerequisite skill rather than jumping topics."
    );
  }
  if (consecutiveOffTopic >= 1) {
    directives.push(
      "Off-topic drift — warmly acknowledge, then redirect to the lesson goal with a short bridge question. Do not scold."
    );
  }
  return directives;
}
