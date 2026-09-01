/**
 * In-memory tracker for a single live lesson session.
 * Captures timing, tool use, struggle streaks, and turn-level detail.
 */

import { STRUGGLE_THRESHOLDS } from "./struggleThresholds";
import { Affect } from "./types";
import { scorePersistenceDelta } from "./affectCheckIn";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pushRolling(arr, value, max = 12) {
  const next = [...arr, value];
  return next.length > max ? next.slice(next.length - max) : next;
}

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
      ladderEscalations: 0,
      shortAnswers: 0,
      rapidGuesses: 0,
      offTopic: 0,
      idleNudges: 0,
      struggleSignals: 0,
      affectCheckIns: 0,
      persistenceEvents: 0,
    },
    /** Consecutive incorrect graded answers (resets on correct/partial). */
    consecutiveIncorrect: 0,
    /** Consecutive hint requests without a correct answer. */
    consecutiveHints: 0,
    /** Epic B1 streaks */
    consecutiveShortAnswers: 0,
    consecutiveRapidGuesses: 0,
    consecutiveOffTopic: 0,
    /** Epic B3 affect */
    consecutiveFrustrated: 0,
    recentAffects: [],
    affectCheckIn: {
      count: 0,
      lastAt: null,
      lastOptionId: null,
      lastReason: null,
    },
    /** Epic B7 — session-start energy (does not consume B3 mid-session budget) */
    sessionStartEnergy: {
      prompted: false,
      responded: false,
      skipped: false,
      optionId: null,
      at: null,
    },
    persistenceScore: 0,
    persistenceTags: [],
    lastWasHint: false,
    lastCorrectness: null,
    afterCheckInStuck: false,
    /** Epic B5 — last detected misconception ids (for remediation) */
    lastMisconceptionIds: [],
    activeMisconceptionIds: [],
    /** 0–1 live bias toward heavier scaffolding */
    scaffoldingBias: 0,
    /** Timestamps of topic switches (ms) for thrashing window */
    topicSwitchAt: [],
    /** Idle-wait bookkeeping while awaiting student answer */
    idle: {
      nudged: false,
      offered: false,
      lastSignalAt: null,
    },
    intervention: {
      status: "idle", // idle | offered | active
      reason: null,
      enteredAt: null,
      offeredAt: null,
      topic: null,
      subject: null,
      autoEntered: false,
      /** Epic B2 ladder rank 0–4 */
      level: 0,
      levelId: null,
    },
    /** Epic B2: highest ladder rank entered this session */
    highestLevelUsed: 0,
    /** Prevent repeat escalate offers until student accepts/declines or exits */
    escalateOffered: false,
    /** Timestamp when we last presented a prompt the student should answer */
    awaitingAnswerSince: null,
    /** Recent struggle signal ids this session (deduped emit helpers) */
    emittedStruggleKeys: {},
  };

  function bumpScaffold(step) {
    state.scaffoldingBias = clamp(
      Number((state.scaffoldingBias + step).toFixed(3)),
      0,
      STRUGGLE_THRESHOLDS.SCAFFOLD_MAX
    );
  }

  function isTopicThrashing(now = Date.now()) {
    const windowMs = STRUGGLE_THRESHOLDS.TOPIC_THRASH_WINDOW_MS;
    const recent = state.topicSwitchAt.filter((t) => now - t <= windowMs);
    state.topicSwitchAt = recent;
    return recent.length >= STRUGGLE_THRESHOLDS.TOPIC_THRASH_SWITCHES;
  }

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
      // New prompt cycle — allow idle nudge/offer again
      state.idle.nudged = false;
      state.idle.offered = false;
    },

    /** Call when the student submits an answer — returns response latency ms. */
    consumeResponseMs() {
      if (!state.awaitingAnswerSince) return null;
      const ms = Date.now() - state.awaitingAnswerSince;
      state.awaitingAnswerSince = null;
      return ms;
    },

    /** Ms since tutor prompt became ready (null if not awaiting). */
    getIdleMs(now = Date.now()) {
      if (!state.awaitingAnswerSince) return null;
      return Math.max(0, now - state.awaitingAnswerSince);
    },

    get idleFlags() {
      return { ...state.idle };
    },

    markIdleNudge() {
      state.idle.nudged = true;
      state.idle.lastSignalAt = Date.now();
      state.counters.idleNudges += 1;
    },

    markIdleOffer() {
      state.idle.offered = true;
      state.idle.nudged = true;
      state.idle.lastSignalAt = Date.now();
    },

    /**
     * Student said "I'm still thinking" — push the wait clock forward
     * so we do not immediately re-nudge.
     */
    extendIdleGrace(ms = STRUGGLE_THRESHOLDS.IDLE_THINKING_GRACE_MS) {
      if (state.awaitingAnswerSince) {
        state.awaitingAnswerSince = Date.now() - Math.max(0, STRUGGLE_THRESHOLDS.IDLE_NUDGE_MS - ms);
      }
      state.idle.nudged = true;
      state.idle.offered = false;
    },

    setTopic(subject, topic) {
      if (subject !== state.subject || topic !== state.topic) {
        state.counters.topicSwitches += 1;
        state.topicSwitchAt.push(Date.now());
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

      // Snapshot priors for persistence (before counters mutate)
      const priorForPersist = {
        lastCorrectness: state.lastCorrectness,
        lastWasHint: state.lastWasHint,
        consecutiveIncorrect: state.consecutiveIncorrect,
        afterCheckInStuck: state.afterCheckInStuck,
      };

      if (signals?.isHintRequest) {
        state.counters.hints += 1;
        state.consecutiveHints += 1;
      }
      if (signals?.correctness === "correct") {
        state.counters.correct += 1;
        state.consecutiveIncorrect = 0;
        state.consecutiveHints = 0;
        state.consecutiveShortAnswers = 0;
        state.consecutiveRapidGuesses = 0;
        // Successful reasoning eases scaffolding bias slightly
        state.scaffoldingBias = clamp(
          Number((state.scaffoldingBias * 0.7).toFixed(3)),
          0,
          STRUGGLE_THRESHOLDS.SCAFFOLD_MAX
        );
      }
      if (signals?.correctness === "partial") {
        state.counters.partial += 1;
        // Partial understanding soft-resets the hard fail streak
        state.consecutiveIncorrect = 0;
        state.consecutiveRapidGuesses = 0;
      }
      if (signals?.correctness === "incorrect") {
        state.counters.incorrect += 1;
        state.consecutiveIncorrect += 1;
      }
      if (signals?.correctness === "exploring") state.counters.exploring += 1;
      if (inputModality === "voice") state.counters.voiceInputs += 1;

      // Epic B1 per-turn struggle aggregates
      if (signals?.shortAnswer) {
        state.counters.shortAnswers += 1;
        state.consecutiveShortAnswers += 1;
        bumpScaffold(STRUGGLE_THRESHOLDS.SCAFFOLD_SHORT_STEP);
      } else if (signals && !signals.isHintRequest) {
        state.consecutiveShortAnswers = 0;
      }

      if (signals?.rapidGuess) {
        state.counters.rapidGuesses += 1;
        state.consecutiveRapidGuesses += 1;
        bumpScaffold(STRUGGLE_THRESHOLDS.SCAFFOLD_RAPID_STEP);
      } else if (signals && !signals.isHintRequest) {
        state.consecutiveRapidGuesses = 0;
      }

      if (signals?.offTopic) {
        state.counters.offTopic += 1;
        state.consecutiveOffTopic += 1;
      } else if (signals) {
        state.consecutiveOffTopic = 0;
      }

      // Epic B3 affect + persistence
      if (signals?.affect) {
        state.recentAffects = pushRolling(state.recentAffects, signals.affect);
        if (signals.affect === Affect.FRUSTRATED) {
          state.consecutiveFrustrated += 1;
        } else if (signals.affect !== Affect.HESITANT) {
          // Soft reset: hesitant doesn't wipe streak, but confident/neutral does
          state.consecutiveFrustrated = 0;
        }
      }

      const persist = scorePersistenceDelta(signals, priorForPersist);
      if (persist.delta > 0) {
        state.persistenceScore += persist.delta;
        state.counters.persistenceEvents += 1;
        for (const t of persist.tags) {
          if (!state.persistenceTags.includes(t)) {
            state.persistenceTags.push(t);
          }
        }
        turn.persistence = persist;
      }
      state.afterCheckInStuck = false;
      state.lastWasHint = Boolean(signals?.isHintRequest);
      state.lastCorrectness = signals?.correctness || state.lastCorrectness;

      // Epic B5 misconception session memory
      if (signals?.misconceptions?.length) {
        const ids = signals.misconceptions.map((m) => m.id).filter(Boolean);
        state.lastMisconceptionIds = ids;
        for (const id of ids) {
          if (!state.activeMisconceptionIds.includes(id)) {
            state.activeMisconceptionIds.push(id);
          }
        }
      }
      for (const mid of signals?.misconceptionsRemediated || []) {
        const id = typeof mid === "string" ? mid : mid?.id;
        state.activeMisconceptionIds = state.activeMisconceptionIds.filter(
          (x) => x !== id
        );
      }

      return turn;
    },

    getActiveMisconceptionIds() {
      return [...state.activeMisconceptionIds];
    },

    getLastMisconceptionIds() {
      return [...state.lastMisconceptionIds];
    },

    getSessionDurationMs(now = Date.now()) {
      return Math.max(0, now - startedAt);
    },

    get consecutiveFrustrated() {
      return state.consecutiveFrustrated;
    },

    get recentAffects() {
      return [...state.recentAffects];
    },

    get persistenceScore() {
      return state.persistenceScore;
    },

    getAffectCheckInState() {
      return {
        count: state.affectCheckIn.count,
        lastAt: state.affectCheckIn.lastAt,
        lastOptionId: state.affectCheckIn.lastOptionId,
        lastReason: state.affectCheckIn.lastReason,
        consecutiveFrustrated: state.consecutiveFrustrated,
        recentAffects: [...state.recentAffects],
        turnCount: state.turns.length,
        sessionDurationMs: Date.now() - startedAt,
        persistenceScore: state.persistenceScore,
        persistenceTags: [...state.persistenceTags],
        sessionStartEnergy: { ...state.sessionStartEnergy },
      };
    },

    getSessionStartEnergyState() {
      return { ...state.sessionStartEnergy };
    },

    noteAffectCheckInPrompted(reason) {
      // B7 session-start is tracked separately so it doesn't burn B3 budget
      if (reason === "session_start") {
        state.sessionStartEnergy.prompted = true;
        state.sessionStartEnergy.at = Date.now();
        state.counters.affectCheckIns += 1;
        return;
      }
      state.affectCheckIn.count += 1;
      state.affectCheckIn.lastAt = Date.now();
      state.affectCheckIn.lastReason = reason || null;
      state.counters.affectCheckIns += 1;
    },

    noteSessionStartEnergyPrompted() {
      state.sessionStartEnergy.prompted = true;
      state.sessionStartEnergy.at = Date.now();
      state.counters.affectCheckIns += 1;
    },

    noteAffectCheckInResponse(optionId, affectLabel, { reason = null } = {}) {
      const isSessionStart = reason === "session_start";
      if (isSessionStart) {
        state.sessionStartEnergy.responded = optionId !== "skipped";
        state.sessionStartEnergy.skipped = optionId === "skipped";
        state.sessionStartEnergy.optionId =
          optionId && optionId !== "skipped" ? optionId : null;
        state.sessionStartEnergy.at = Date.now();
      } else {
        state.affectCheckIn.lastOptionId = optionId || null;
        state.affectCheckIn.lastAt = Date.now();
      }
      if (affectLabel) {
        state.recentAffects = pushRolling(state.recentAffects, affectLabel);
        if (affectLabel === Affect.FRUSTRATED) {
          state.consecutiveFrustrated += 1;
        } else {
          state.consecutiveFrustrated = 0;
        }
      }
      // low / stuck / break → next real turn can earn stay-after-checkin persistence
      if (
        optionId === "stuck" ||
        optionId === "break" ||
        optionId === "low"
      ) {
        state.afterCheckInStuck = true;
      }
    },

    get consecutiveIncorrect() {
      return state.consecutiveIncorrect;
    },

    get consecutiveHints() {
      return state.consecutiveHints;
    },

    get consecutiveShortAnswers() {
      return state.consecutiveShortAnswers;
    },

    get consecutiveRapidGuesses() {
      return state.consecutiveRapidGuesses;
    },

    get consecutiveOffTopic() {
      return state.consecutiveOffTopic;
    },

    get scaffoldingBias() {
      return state.scaffoldingBias;
    },

    get topicThrashing() {
      return isTopicThrashing();
    },

    /**
     * Snapshot of live struggle state for detector / personalization.
     */
    getStruggleSnapshot() {
      return {
        consecutiveIncorrect: state.consecutiveIncorrect,
        consecutiveHints: state.consecutiveHints,
        consecutiveShortAnswers: state.consecutiveShortAnswers,
        consecutiveRapidGuesses: state.consecutiveRapidGuesses,
        consecutiveOffTopic: state.consecutiveOffTopic,
        scaffoldingBias: state.scaffoldingBias,
        topicThrashing: isTopicThrashing(),
        topicSwitches: state.counters.topicSwitches,
        idleMs: this.getIdleMs(),
        idle: { ...state.idle },
        highestLevelUsed: state.highestLevelUsed,
        currentLevel: state.intervention.level || 0,
        escalateOffered: state.escalateOffered,
        consecutiveFrustrated: state.consecutiveFrustrated,
        persistenceScore: state.persistenceScore,
        affectCheckIns: state.affectCheckIn.count,
      };
    },

    get highestLevelUsed() {
      return state.highestLevelUsed;
    },

    get escalateOffered() {
      return state.escalateOffered;
    },

    markEscalateOffered(yes = true) {
      state.escalateOffered = Boolean(yes);
      if (yes) state.counters.ladderEscalations += 1;
    },

    /**
     * Mark a struggle signal as emitted (dedupe repeated identical emits).
     * @returns {boolean} true if this key is new for the session
     */
    noteStruggleEmit(key) {
      if (!key) return false;
      if (state.emittedStruggleKeys[key]) return false;
      state.emittedStruggleKeys[key] = Date.now();
      state.counters.struggleSignals += 1;
      return true;
    },

    get intervention() {
      return structuredClone(state.intervention);
    },

    setIntervention(patch) {
      state.intervention = { ...state.intervention, ...patch };
      if (patch.level != null) {
        state.intervention.level = Number(patch.level) || 0;
      }
      if (patch.status === "offered") {
        state.counters.interventionsOffered += 1;
        state.intervention.offeredAt =
          state.intervention.offeredAt || new Date().toISOString();
        if (patch.escalate || patch.reason === "escalate") {
          state.escalateOffered = true;
        }
      }
      if (patch.status === "active") {
        state.counters.interventionsEntered += 1;
        state.intervention.enteredAt = new Date().toISOString();
        const lvl = Number(state.intervention.level) || 0;
        if (lvl > state.highestLevelUsed) state.highestLevelUsed = lvl;
        state.escalateOffered = false;
        // Fresh start for struggle counters while guiding
        state.consecutiveIncorrect = 0;
        state.consecutiveHints = 0;
        state.consecutiveShortAnswers = 0;
        state.consecutiveRapidGuesses = 0;
        state.consecutiveOffTopic = 0;
      }
      if (patch.status === "idle") {
        state.intervention.reason = null;
        state.intervention.enteredAt = null;
        state.intervention.offeredAt = null;
        state.intervention.autoEntered = false;
        state.intervention.level = 0;
        state.intervention.levelId = null;
        state.escalateOffered = false;
        // Avoid immediate re-offer after exit/decline
        state.consecutiveIncorrect = 0;
        state.consecutiveHints = 0;
        state.consecutiveShortAnswers = 0;
        state.consecutiveRapidGuesses = 0;
        state.consecutiveOffTopic = 0;
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
        scaffoldingBias: state.scaffoldingBias,
        topicThrashing: isTopicThrashing(),
        highestLevelUsed: state.highestLevelUsed,
        persistenceScore: state.persistenceScore,
        persistenceTags: [...state.persistenceTags],
        affectCheckIns: state.affectCheckIn.count,
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
