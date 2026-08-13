/**
 * Shared vocabulary for Kindling's student-understanding layer.
 * Events and profiles are designed so a future backend can ingest them as-is.
 */

/** Discrete interaction event types submitted to the learning API. */
export const LearningEventType = {
  SESSION_START: "session.start",
  SESSION_END: "session.end",
  TURN_EXCHANGE: "turn.exchange",
  HINT_REQUESTED: "behavior.hint_requested",
  TOOL_TOGGLED: "behavior.tool_toggled",
  TOPIC_SWITCHED: "session.topic_switched",
  VOICE_USED: "behavior.voice_input",
  PROFILE_SNAPSHOT: "profile.snapshot",
  INTERVENTION_OFFERED: "intervention.offered",
  INTERVENTION_ENTERED: "intervention.entered",
  INTERVENTION_EXITED: "intervention.exited",
  INTERVENTION_DECLINED: "intervention.declined",
  /** Interactive manipulative use (Epic A6) */
  MANIPULATIVE_USED: "behavior.manipulative_used",
  /** Epic B1 — richer struggle signals (payload.signal = subtype) */
  STRUGGLE_SIGNAL: "struggle.signal",
  /** Epic B3 — affective check-in prompted / answered */
  AFFECT_CHECKIN: "affect.checkin",
  /** Epic B3 — persistence moment celebrated (optional metric) */
  PERSISTENCE_NOTED: "affect.persistence",
  /** Epic B5 */
  MISCONCEPTION_DETECTED: "misconception.detected",
  MISCONCEPTION_REMEDIATED: "misconception.remediated",
  /** Epic B6 */
  MULTISTEP_STARTED: "multistep.started",
  MULTISTEP_STEP: "multistep.step",
  MULTISTEP_COMPLETED: "multistep.completed",
  MULTISTEP_EXITED: "multistep.exited",
};

/** Live intervention (step-by-step guide) lifecycle. */
export const InterventionStatus = {
  IDLE: "idle",
  OFFERED: "offered",
  ACTIVE: "active",
};

/**
 * Epic B2 — graduated intervention ladder ranks / ids.
 * Prefer InterventionLevel from interventionLadder.js for full metadata.
 */
export const InterventionLevelId = {
  MICRO_HINT: "micro_hint",
  WORKED_EXAMPLE: "worked_example",
  FULL_GUIDE: "full_guide",
  BREAK_OR_EASIER: "break_or_easier",
};

/**
 * Struggle signal subtypes (Epic B1).
 * Used as intervention reasons and struggle.signal event payload.signal.
 */
export const StruggleSignal = {
  IDLE: "idle",
  SHORT_ANSWERS: "short_answers",
  TOPIC_THRASHING: "topic_thrashing",
  RAPID_GUESSING: "rapid_guessing",
  OFF_TOPIC: "off_topic",
  INCORRECT_STREAK: "incorrect_streak",
  FRUSTRATION: "frustration",
  REPEATED_HINTS: "repeated_hints",
};

/** Assessment of a student turn relative to the tutor's response. */
export const Correctness = {
  CORRECT: "correct",
  PARTIAL: "partial",
  INCORRECT: "incorrect",
  EXPLORING: "exploring", // asked a question / thinking out loud
  UNKNOWN: "unknown",
};

/** Affective / confidence signals inferred from language. */
export const Affect = {
  CONFIDENT: "confident",
  NEUTRAL: "neutral",
  HESITANT: "hesitant",
  FRUSTRATED: "frustrated",
  DISENGAGED: "disengaged",
  CURIOUS: "curious",
};

export const STORAGE_KEYS = {
  learningProfile: "kindling_learning_profile_v1",
  eventQueue: "kindling_learning_event_queue_v1",
  /** Root key prefix; store appends :studentId */
  topicConversations: "kindling_topic_conversations_v1",
};

/**
 * Graded-turn contract (Epic A3) — optional structured fields for verification.
 * @typedef {object} GradedTurnContract
 * @property {'math'} kind
 * @property {string} [studentAnswer]
 * @property {string} [expected]
 * @property {string[]} [alts]
 * @property {'equivalent'|'exact'|'numeric_tol'} [mode]
 * @property {number} [tolerance]
 */
