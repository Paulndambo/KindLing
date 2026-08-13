/**
 * Tunable thresholds for richer struggle signals (Epic B1).
 * Kept separate so detectors, extractors, and trackers can share them
 * without circular imports.
 */

export const INCORRECT_STREAK_THRESHOLD = 2;

export const STRUGGLE_THRESHOLDS = {
  /** Soft "still here?" nudge after waiting for an answer */
  IDLE_NUDGE_MS: 45_000,
  /** Offer step-by-step help if still idle after the soft nudge window */
  IDLE_OFFER_MS: 90_000,
  /** Extra wait after student says "I'm still thinking" */
  IDLE_THINKING_GRACE_MS: 60_000,
  /** Consecutive very short replies before scaffolding bias / offer */
  SHORT_ANSWER_STREAK: 3,
  SHORT_ANSWER_MAX_WORDS: 3,
  SHORT_ANSWER_MAX_CHARS: 18,
  /** Fast + thin answers treated as rapid guessing */
  RAPID_GUESS_MS: 2_800,
  RAPID_GUESS_MAX_WORDS: 5,
  RAPID_GUESS_STREAK: 2,
  /** Topic switches inside a rolling window → thrashing */
  TOPIC_THRASH_SWITCHES: 3,
  TOPIC_THRASH_WINDOW_MS: 8 * 60_000,
  /** Consecutive off-topic turns before gentle redirect / offer */
  OFF_TOPIC_STREAK: 2,
  /** Scaffolding bias caps (0–1) */
  SCAFFOLD_SHORT_STEP: 0.12,
  SCAFFOLD_RAPID_STEP: 0.15,
  SCAFFOLD_MAX: 0.85,
};
