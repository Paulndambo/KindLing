/**
 * Detect when a student is struggling enough for Kindling to intervene.
 *
 * Trigger: two or more consecutive incorrect responses in the current topic
 * (or related struggle signals). Mode can auto-enter or offer entry.
 */

import { InterventionStatus } from "./types";

export { InterventionStatus };

/** Consecutive incorrect answers that open the door to intervention. */
export const INCORRECT_STREAK_THRESHOLD = 2;

/**
 * Evaluate whether to offer or auto-start intervention after a turn.
 *
 * @param {{
 *   consecutiveIncorrect: number,
 *   currentStatus: string,
 *   affect?: string,
 *   consecutiveHints?: number,
 * }} opts
 * @returns {{
 *   shouldOffer: boolean,
 *   shouldAutoEnter: boolean,
 *   reason: string | null,
 * }}
 */
export function evaluateInterventionTrigger({
  consecutiveIncorrect = 0,
  currentStatus = InterventionStatus.IDLE,
  affect = null,
  consecutiveHints = 0,
}) {
  // Already in offer/active — don't re-fire until student leaves or dismisses
  if (
    currentStatus === InterventionStatus.OFFERED ||
    currentStatus === InterventionStatus.ACTIVE
  ) {
    return { shouldOffer: false, shouldAutoEnter: false, reason: null };
  }

  const streakHit = consecutiveIncorrect >= INCORRECT_STREAK_THRESHOLD;
  const heavyHinting = consecutiveHints >= 2;
  const frustrated = affect === "frustrated";

  if (!streakHit && !heavyHinting) {
    return { shouldOffer: false, shouldAutoEnter: false, reason: null };
  }

  let reason = "incorrect_streak";
  if (streakHit && frustrated) {
    reason = "frustration";
  } else if (streakHit) {
    reason = "incorrect_streak";
  } else if (heavyHinting) {
    reason = "repeated_hints";
  }

  // Auto-enter when clearly stuck: 3+ incorrect in a row, or 2+ while frustrated
  const shouldAutoEnter =
    consecutiveIncorrect >= INCORRECT_STREAK_THRESHOLD + 1 ||
    (streakHit && frustrated);

  return {
    shouldOffer: !shouldAutoEnter && (streakHit || heavyHinting),
    shouldAutoEnter,
    reason,
  };
}

/**
 * Build human-readable context for the intervention UI and tutor.
 */
export function describeInterventionContext({
  subject,
  topic,
  consecutiveIncorrect = 0,
  reason = "incorrect_streak",
}) {
  const topicLabel = topic || "this idea";
  const subjectLabel = subject || "this subject";

  const reasonText =
    reason === "frustration"
      ? "this feels tough right now"
      : reason === "repeated_hints"
        ? "you've been asking for a few hints"
        : consecutiveIncorrect >= 2
          ? `a couple of answers on "${topicLabel}" didn't land`
          : `you're finding "${topicLabel}" tricky`;

  return {
    subject: subjectLabel,
    topic: topicLabel,
    reason,
    reasonText,
    consecutiveIncorrect,
    headline: `I noticed ${reasonText}`,
    body: `Want me to walk you through "${topicLabel}" step by step — with clear explanations and examples? You can leave the guide anytime.`,
  };
}
