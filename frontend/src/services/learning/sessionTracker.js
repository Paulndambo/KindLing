/**
 * In-memory tracker for a single live lesson session.
 * Captures timing, tool use, and turn-level detail for the learning API.
 */

export function createSessionTracker({
  sessionId,
  studentId,
  subject,
  topic,
  studentProfile,
}) {
  const startedAt = Date.now();
  const state = {
    sessionId,
    studentId,
    subject,
    topic,
    studentProfileSnapshot: {
      name: studentProfile?.name,
      grade: studentProfile?.grade,
      curriculum: studentProfile?.curriculum,
      learningStyle: studentProfile?.learningStyle,
      interests: studentProfile?.interests || [],
      academicTarget: studentProfile?.academicTarget,
      goal: studentProfile?.goal,
    },
    startedAt: new Date(startedAt).toISOString(),
    turns: [],
    tools: {
      visuals: true,
      encourage: false,
      voiceOutput: false,
    },
    counters: {
      hints: 0,
      correct: 0,
      partial: 0,
      incorrect: 0,
      exploring: 0,
      voiceInputs: 0,
      topicSwitches: 0,
      interventionsOffered: 0,
      interventionsEntered: 0,
    },
    /** Consecutive incorrect graded answers (resets on correct/partial). */
    consecutiveIncorrect: 0,
    /** Consecutive hint requests without a correct answer. */
    consecutiveHints: 0,
    intervention: {
      status: "idle", // idle | offered | active
      reason: null,
      enteredAt: null,
      offeredAt: null,
      topic: null,
      subject: null,
      autoEntered: false,
    },
    /** Timestamp when we last presented a prompt the student should answer */
    awaitingAnswerSince: null,
  };

  return {
    get id() {
      return state.sessionId;
    },
    get subject() {
      return state.subject;
    },
    get topic() {
      return state.topic;
    },
    get snapshot() {
      return structuredClone(state);
    },

    markPromptReady() {
      state.awaitingAnswerSince = Date.now();
    },

    /** Call when the student submits an answer — returns response latency ms. */
    consumeResponseMs() {
      if (!state.awaitingAnswerSince) return null;
      const ms = Date.now() - state.awaitingAnswerSince;
      state.awaitingAnswerSince = null;
      return ms;
    },

    setTopic(subject, topic) {
      if (subject !== state.subject || topic !== state.topic) {
        state.counters.topicSwitches += 1;
      }
      state.subject = subject;
      state.topic = topic;
    },

    setTools(tools) {
      state.tools = { ...state.tools, ...tools };
    },

    recordTurn({ studentText, tutorText, signals, inputModality }) {
      const turn = {
        index: state.turns.length,
        at: new Date().toISOString(),
        subject: state.subject,
        topic: state.topic,
        studentText,
        tutorText,
        signals,
        inputModality,
      };
      state.turns.push(turn);

      if (signals?.isHintRequest) {
        state.counters.hints += 1;
        state.consecutiveHints += 1;
      }
      if (signals?.correctness === "correct") {
        state.counters.correct += 1;
        state.consecutiveIncorrect = 0;
        state.consecutiveHints = 0;
      }
      if (signals?.correctness === "partial") {
        state.counters.partial += 1;
        // Partial understanding soft-resets the hard fail streak
        state.consecutiveIncorrect = 0;
      }
      if (signals?.correctness === "incorrect") {
        state.counters.incorrect += 1;
        state.consecutiveIncorrect += 1;
      }
      if (signals?.correctness === "exploring") state.counters.exploring += 1;
      if (inputModality === "voice") state.counters.voiceInputs += 1;

      return turn;
    },

    get consecutiveIncorrect() {
      return state.consecutiveIncorrect;
    },

    get consecutiveHints() {
      return state.consecutiveHints;
    },

    get intervention() {
      return structuredClone(state.intervention);
    },

    setIntervention(patch) {
      state.intervention = { ...state.intervention, ...patch };
      if (patch.status === "offered") {
        state.counters.interventionsOffered += 1;
        state.intervention.offeredAt =
          state.intervention.offeredAt || new Date().toISOString();
      }
      if (patch.status === "active") {
        state.counters.interventionsEntered += 1;
        state.intervention.enteredAt = new Date().toISOString();
        // Fresh start for struggle counters while guiding
        state.consecutiveIncorrect = 0;
        state.consecutiveHints = 0;
      }
      if (patch.status === "idle") {
        state.intervention.reason = null;
        state.intervention.enteredAt = null;
        state.intervention.offeredAt = null;
        state.intervention.autoEntered = false;
        // Avoid immediate re-offer after exit/decline
        state.consecutiveIncorrect = 0;
        state.consecutiveHints = 0;
      }
      return this.intervention;
    },

    summarize() {
      const durationMs = Date.now() - startedAt;
      const graded =
        state.counters.correct +
        state.counters.partial +
        state.counters.incorrect;
      const accuracy =
        graded > 0
          ? Number(((state.counters.correct + state.counters.partial * 0.5) / graded).toFixed(3))
          : null;

      const avgEngagement =
        state.turns.length > 0
          ? Number(
              (
                state.turns.reduce(
                  (s, t) => s + (t.signals?.engagement || 0),
                  0
                ) / state.turns.length
              ).toFixed(3)
            )
          : null;

      const avgConfidence =
        state.turns.length > 0
          ? Number(
              (
                state.turns.reduce(
                  (s, t) => s + (t.signals?.confidence || 0),
                  0
                ) / state.turns.length
              ).toFixed(3)
            )
          : null;

      return {
        sessionId: state.sessionId,
        studentId: state.studentId,
        subject: state.subject,
        topic: state.topic,
        startedAt: state.startedAt,
        durationMs,
        turnCount: state.turns.length,
        counters: { ...state.counters },
        tools: { ...state.tools },
        accuracy,
        avgEngagement,
        avgConfidence,
        // Full turns for backend training data (PII-aware later)
        turns: state.turns.map((t) => ({
          index: t.index,
          at: t.at,
          subject: t.subject,
          topic: t.topic,
          studentText: t.studentText,
          tutorText: t.tutorText,
          signals: t.signals,
          inputModality: t.inputModality,
        })),
        studentProfileSnapshot: state.studentProfileSnapshot,
      };
    },
  };
}

export function newSessionId() {
  return `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
