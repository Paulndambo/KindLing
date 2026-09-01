import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LearningEventType,
  InterventionStatus,
  StruggleSignal,
  InterventionLevel,
  levelMeta,
  analyzeExchange,
  loadLearningProfile,
  saveLearningProfile,
  applyExchangeToProfile,
  applyAffectCheckInToProfile,
  applySessionStart,
  applySessionEnd,
  applySessionReflectionToProfile,
  buildPersonalizationInsights,
  submitLearningEvents,
  flushEventQueue,
  createLearningEvent,
  createSessionTracker,
  newSessionId,
  evaluateInterventionTrigger,
  evaluateIdleStruggle,
  describeInterventionContext,
  describeIdleNudge,
  struggleDirectivesFromSnapshot,
  evaluateAffectCheckIn,
  getAffectOption,
  getCheckInOption,
  isLowEnergyOption,
  buildSessionStartCheckInCard,
  AFFECT_CHECKIN_THRESHOLDS,
  SESSION_START_REASON,
  affectDirectivesFromState,
  persistenceCelebrationCopy,
  buildSessionReflectionCard,
  formatReflectionNote,
  shouldOfferSessionReflection,
  suggestReviewSparkCta,
  reviewModeDirectives,
  finishReviewSpark,
  loadReviewSparks,
  pickReviewCtaFromDue,
  challengeModeDirectives,
  emptyChallengeProgress,
  applyChallengeGradedTurn,
  challengeCelebrationCopy,
  challengeProgressChipCopy,
  SPARK_CHALLENGE_TARGET,
  loadWorkedExamplesLibrary,
  clearWorkedExampleCache,
  findWorkedExample,
  loadMisconceptionCatalog,
  clearMisconceptionCache,
  detectRemediationSuccess,
  buildMisconceptionPromptBlock,
  misconceptionDirectives,
} from "../services/learning";
import {
  markSessionStarted,
  markSessionFirstMessage,
  markSessionDropOff,
  trackMetric,
  reportError,
} from "../services/telemetry";

/**
 * Orchestrates Kindling's student-understanding loop:
 * observe exchange → extract signals → update profile → personalize → sync API.
 * Also drives intervention (step-by-step guide) when struggle is detected.
 */
export function useStudentLearning({
  student,
  subjectName,
  topicName,
  tools,
  /** Epic C1 — optional Review spark mode */
  reviewMode = false,
  reviewSkill = null,
  reviewSkillLabel = null,
  reviewId = null,
  /** Epic G1 — optional light spark challenge */
  challengeMode = false,
  challengeSkill = null,
  challengeSkillLabel = null,
  challengeTarget = SPARK_CHALLENGE_TARGET,
}) {
  const studentId =
    student?.name?.toLowerCase().replace(/\s+/g, "_") || "anonymous";

  const [profile, setProfile] = useState(() =>
    loadLearningProfile(studentId)
  );
  const [sessionSummary, setSessionSummary] = useState(null);
  const [lastSignals, setLastSignals] = useState(null);
  const [intervention, setIntervention] = useState({
    status: InterventionStatus.IDLE,
    reason: null,
    context: null,
    autoEntered: false,
    level: InterventionLevel.NONE,
    escalate: false,
  });
  /** Soft idle nudge (Epic B1) — not a full intervention offer. */
  const [softNudge, setSoftNudge] = useState(null);
  const [struggleSnapshot, setStruggleSnapshot] = useState(null);
  /** Epic B3 / B7 affective check-in card (mid-session or session-start energy) */
  const [affectCheckIn, setAffectCheckIn] = useState(null);
  /** Epic B8 end-of-session reflection card */
  const [sessionReflection, setSessionReflection] = useState(null);
  /** Last completed reflection this session (for ended card CTA) */
  const [lastSessionReflection, setLastSessionReflection] = useState(null);
  /** Short non-shaming persistence chip */
  const [persistenceNote, setPersistenceNote] = useState(null);
  /** Epic G1 — live challenge progress for banner */
  const [challengeProgress, setChallengeProgress] = useState(null);
  const [lastCheckInResponse, setLastCheckInResponse] = useState(null);
  /**
   * Epic B7 — deferred gate so fresh greeting can wait briefly for energy chip
   * without permanently blocking the lesson.
   * @type {React.MutableRefObject<null | { resolve: () => void, promise: Promise<void>, settled: boolean }>}
   */
  const sessionStartEnergyGateRef = useRef(null);
  /** Epic B4 curated library pack for current topic */
  const [exampleLibrary, setExampleLibrary] = useState(null);
  /** Epic B5 last hits for UI / prompt */
  const [activeMisconceptionHits, setActiveMisconceptionHits] = useState([]);

  const trackerRef = useRef(null);
  const profileRef = useRef(profile);
  const lastModalityRef = useRef("text");
  const toolsRef = useRef(tools);
  const interventionRef = useRef(intervention);
  const softNudgeRef = useRef(softNudge);
  const affectCheckInRef = useRef(affectCheckIn);
  const sessionReflectionRef = useRef(sessionReflection);
  const reflectedThisSessionRef = useRef(false);
  /** Pending wrap-up resolve after reflection submit/skip */
  const wrapUpResolveRef = useRef(null);
  /** When escalate is offered, keep prior active mode for decline. */
  const priorActiveRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    toolsRef.current = tools;
    trackerRef.current?.setTools(tools);
  }, [tools]);

  useEffect(() => {
    interventionRef.current = intervention;
  }, [intervention]);

  useEffect(() => {
    softNudgeRef.current = softNudge;
  }, [softNudge]);

  useEffect(() => {
    affectCheckInRef.current = affectCheckIn;
  }, [affectCheckIn]);

  useEffect(() => {
    sessionReflectionRef.current = sessionReflection;
  }, [sessionReflection]);

  const baseInsights = buildPersonalizationInsights(profile, {
    subject: subjectName,
    topic: topicName,
  });

  const insights = useMemo(() => {
    const live = struggleDirectivesFromSnapshot(struggleSnapshot || {});
    const affectDirs = affectDirectivesFromState({
      lastCheckIn: lastCheckInResponse,
      persistenceScore:
        struggleSnapshot?.persistenceScore ||
        profile?.behavior?.persistenceScore ||
        0,
      persistenceTags: struggleSnapshot?.persistenceTags || [],
    });
    const extra = [...live, ...affectDirs];
    if (reviewMode && !challengeMode) {
      extra.push(
        ...reviewModeDirectives({
          skillLabel: reviewSkillLabel || reviewSkill || topicName,
          skillSlug: reviewSkill || "",
          topic: topicName,
        })
      );
    }
    if (challengeMode) {
      extra.push(
        ...challengeModeDirectives({
          skillLabel:
            challengeSkillLabel ||
            reviewSkillLabel ||
            challengeSkill ||
            topicName,
          skillSlug: challengeSkill || reviewSkill || "",
          topic: topicName,
          target: challengeTarget,
        })
      );
    }
    const bestEx = exampleLibrary?.best || null;
    if (bestEx?.title) {
      extra.push(
        `Prefer curated library example “${bestEx.title}” when demonstrating this topic (do not invent a conflicting worked example).`
      );
    }
    const mcDirs = misconceptionDirectives(
      activeMisconceptionHits,
      profile?.misconceptions || {}
    );
    extra.push(...mcDirs);
    const directives = [...(baseInsights.directives || [])];
    for (const d of extra) {
      if (!directives.includes(d)) directives.push(d);
    }
    return {
      ...baseInsights,
      reviewMode: Boolean(reviewMode),
      reviewSkill: reviewSkill || null,
      challengeMode: Boolean(challengeMode),
      challengeSkill: challengeSkill || null,
      directives: directives.slice(0, 16),
      struggle: struggleSnapshot,
      lastCheckIn: lastCheckInResponse,
      persistenceScore:
        struggleSnapshot?.persistenceScore ||
        profile?.behavior?.persistenceScore ||
        0,
      libraryPromptBlock: exampleLibrary?.promptBlock || "",
      libraryExampleTitle: bestEx?.title || null,
      libraryBest: bestEx,
      libraryCount: exampleLibrary?.examples?.length || 0,
      misconceptionPromptBlock: buildMisconceptionPromptBlock(
        activeMisconceptionHits
      ),
      activeMisconceptions: activeMisconceptionHits,
    };
  }, [
    baseInsights,
    struggleSnapshot,
    lastCheckInResponse,
    profile,
    exampleLibrary,
    activeMisconceptionHits,
    reviewMode,
    reviewSkill,
    reviewSkillLabel,
    challengeMode,
    challengeSkill,
    challengeSkillLabel,
    challengeTarget,
    topicName,
  ]);

  /** Epic C1 — graded outcomes during a Review spark session */
  const reviewProgressRef = useRef({
    correct: 0,
    incorrect: 0,
    partial: 0,
    completed: false,
    startedLogged: false,
  });

  /** Epic G1 — solid-turn counter for spark challenge */
  const challengeProgressRef = useRef(
    emptyChallengeProgress({
      target: challengeTarget,
      skillSlug: challengeSkill || "",
      skillLabel: challengeSkillLabel || "",
    })
  );

  useEffect(() => {
    reviewProgressRef.current = {
      correct: 0,
      incorrect: 0,
      partial: 0,
      completed: false,
      startedLogged: false,
    };
  }, [reviewMode, reviewSkill, reviewId, subjectName, topicName]);

  useEffect(() => {
    const next = emptyChallengeProgress({
      target: challengeTarget,
      skillSlug: challengeSkill || "",
      skillLabel: challengeSkillLabel || "",
    });
    challengeProgressRef.current = next;
    setChallengeProgress(challengeMode ? { ...next } : null);
  }, [
    challengeMode,
    challengeSkill,
    challengeSkillLabel,
    challengeTarget,
    subjectName,
    topicName,
  ]);

  // Epic B4/B5 — load library + misconception catalog when topic changes
  useEffect(() => {
    let cancelled = false;
    clearWorkedExampleCache();
    clearMisconceptionCache();
    loadWorkedExamplesLibrary({
      subject: subjectName,
      topic: topicName,
      grade: student?.grade || "",
    }).then((pack) => {
      if (!cancelled) setExampleLibrary(pack);
    });
    loadMisconceptionCatalog({ topic: topicName }).then(() => {
      /* catalog cached in module for detect */
    });
    return () => {
      cancelled = true;
    };
  }, [subjectName, topicName, student?.grade]);

  const persistProfile = useCallback((next) => {
    profileRef.current = next;
    setProfile(next);
    saveLearningProfile(next);
  }, []);

  const syncInterventionState = useCallback((next) => {
    const level =
      next.level ??
      next.context?.level ??
      InterventionLevel.NONE;
    const merged = { ...next, level };
    interventionRef.current = merged;
    setIntervention(merged);
    trackerRef.current?.setIntervention({
      status: merged.status,
      reason: merged.reason,
      topic: merged.context?.topic,
      subject: merged.context?.subject,
      autoEntered: merged.autoEntered,
      level,
      levelId: merged.context?.levelId || levelMeta(level).id,
      escalate: merged.escalate || merged.reason === "escalate",
    });
    if (
      merged.status === InterventionStatus.OFFERED ||
      merged.status === InterventionStatus.ACTIVE
    ) {
      setSoftNudge(null);
    }
  }, []);

  const refreshStruggleSnapshot = useCallback(() => {
    const snap = trackerRef.current?.getStruggleSnapshot?.() || null;
    setStruggleSnapshot(snap);
    return snap;
  }, []);

  /**
   * Emit struggle.signal learning event (deduped per session key when provided).
   */
  const emitStruggleSignal = useCallback(
    (signal, detail = {}, { dedupeKey } = {}) => {
      const tracker = trackerRef.current;
      if (!tracker || !signal) return false;
      const key = dedupeKey || `${signal}:${detail.phase || "hit"}`;
      if (dedupeKey !== false && !tracker.noteStruggleEmit(key)) {
        return false;
      }
      submitLearningEvents(
        createLearningEvent(
          LearningEventType.STRUGGLE_SIGNAL,
          {
            sessionId: tracker.id,
            subject: tracker.subject || subjectName,
            topic: tracker.topic || topicName,
            signal,
            ...detail,
            snapshot: tracker.getStruggleSnapshot?.(),
          },
          { studentId, sessionId: tracker.id }
        )
      );
      trackMetric("struggle.signal", {
        sessionId: tracker.id,
        tags: { signal, phase: detail.phase || "hit" },
      });
      refreshStruggleSnapshot();
      return true;
    },
    [studentId, subjectName, topicName, refreshStruggleSnapshot]
  );

  /**
   * Start (or restart) a tracked lesson session.
   */
  const settleSessionStartEnergyGate = useCallback(() => {
    const gate = sessionStartEnergyGateRef.current;
    if (gate && !gate.settled) {
      gate.settled = true;
      gate.resolve();
    }
  }, []);

  /**
   * Epic B7 — optional energy chip at lesson open.
   * Does not block starting forever; greeting may await briefly via waitForSessionStartEnergy.
   */
  const promptSessionStartEnergyCheckIn = useCallback(() => {
    const tracker = trackerRef.current;
    if (!tracker) return null;
    if (affectCheckInRef.current) return affectCheckInRef.current;

    const card = buildSessionStartCheckInCard();
    if (typeof tracker.noteSessionStartEnergyPrompted === "function") {
      tracker.noteSessionStartEnergyPrompted();
    } else {
      tracker.noteAffectCheckInPrompted?.(SESSION_START_REASON);
    }
    setAffectCheckIn(card);
    affectCheckInRef.current = card;

    submitLearningEvents(
      createLearningEvent(
        LearningEventType.AFFECT_CHECKIN,
        {
          sessionId: tracker.id,
          subject: tracker.subject || subjectName,
          topic: tracker.topic || topicName,
          phase: "prompted",
          reason: SESSION_START_REASON,
          snapshot: tracker.getSessionStartEnergyState?.() || {},
        },
        { studentId, sessionId: tracker.id }
      )
    );
    trackMetric("affect.checkin_prompted", {
      sessionId: tracker.id,
      tags: { reason: SESSION_START_REASON },
    });
    trackMetric("affect.session_start_prompted", {
      sessionId: tracker.id,
    });
    return card;
  }, [studentId, subjectName, topicName]);

  /**
   * Fresh greeting waits until energy answered/skipped or timeout.
   * Resume paths can call this too — it resolves immediately if no gate.
   */
  const waitForSessionStartEnergy = useCallback(
    (timeoutMs = AFFECT_CHECKIN_THRESHOLDS.SESSION_START_GREETING_WAIT_MS) => {
      const gate = sessionStartEnergyGateRef.current;
      if (!gate || gate.settled) return Promise.resolve();
      return Promise.race([
        gate.promise,
        new Promise((resolve) => {
          window.setTimeout(resolve, Math.max(0, timeoutMs));
        }),
      ]);
    },
    []
  );

  const beginSession = useCallback(() => {
    if (trackerRef.current) {
      const summary = trackerRef.current.summarize();
      // Drop-off: previous session ended without a student turn
      if (!summary.turnCount) {
        markSessionDropOff(summary.sessionId, {
          subject: summary.subject,
          topic: summary.topic,
          reason: "session_replaced",
        });
      }
      const ended = applySessionEnd(profileRef.current, summary);
      persistProfile(ended);
      submitLearningEvents(
        createLearningEvent(
          LearningEventType.SESSION_END,
          summary,
          { studentId, sessionId: summary.sessionId }
        )
      );
    }

    const sessionId = newSessionId();
    const tracker = createSessionTracker({
      sessionId,
      studentId,
      subject: subjectName,
      topic: topicName,
      studentProfile: student,
    });
    tracker.setTools(toolsRef.current || {});
    trackerRef.current = tracker;

    const started = applySessionStart(profileRef.current, {
      sessionId,
      startedAt: tracker.snapshot.startedAt,
      subject: subjectName,
      topic: topicName,
    });
    persistProfile(started);
    setSessionSummary(null);
    setLastSignals(null);
    setSoftNudge(null);
    setStruggleSnapshot(null);
    setAffectCheckIn(null);
    affectCheckInRef.current = null;
    setSessionReflection(null);
    sessionReflectionRef.current = null;
    setLastSessionReflection(null);
    reflectedThisSessionRef.current = false;
    wrapUpResolveRef.current = null;
    setPersistenceNote(null);
    setLastCheckInResponse(null);
    syncInterventionState({
      status: InterventionStatus.IDLE,
      reason: null,
      context: null,
      autoEntered: false,
      level: InterventionLevel.NONE,
      escalate: false,
    });

    // Epic B7 — fresh gate for optional energy chip (never blocks forever)
    let resolveGate = () => {};
    const promise = new Promise((resolve) => {
      resolveGate = resolve;
    });
    sessionStartEnergyGateRef.current = {
      resolve: resolveGate,
      promise,
      settled: false,
    };

    submitLearningEvents(
      createLearningEvent(
        LearningEventType.SESSION_START,
        {
          sessionId,
          subject: subjectName,
          topic: topicName,
          studentSnapshot: tracker.snapshot.studentProfileSnapshot,
          tools: toolsRef.current,
          personalization: buildPersonalizationInsights(started, {
            subject: subjectName,
            topic: topicName,
          }),
        },
        { studentId, sessionId }
      )
    );

    markSessionStarted(sessionId, {
      subject: subjectName,
      topic: topicName,
    });

    // Show energy chip after tracker is live (same tick as session start)
    promptSessionStartEnergyCheckIn();

    return sessionId;
  }, [
    studentId,
    subjectName,
    topicName,
    student,
    persistProfile,
    syncInterventionState,
    promptSessionStartEnergyCheckIn,
  ]);

  const markAwaitingStudent = useCallback(() => {
    trackerRef.current?.markPromptReady();
    setSoftNudge(null);
    refreshStruggleSnapshot();
  }, [refreshStruggleSnapshot]);

  const noteInputModality = useCallback((modality) => {
    lastModalityRef.current = modality === "voice" ? "voice" : "text";
  }, []);

  const offerInterventionRef = useRef(null);

  /** Student dismisses soft nudge but keeps thinking. */
  const dismissSoftNudge = useCallback(() => {
    const tracker = trackerRef.current;
    tracker?.extendIdleGrace?.();
    setSoftNudge(null);
    emitStruggleSignal(
      StruggleSignal.IDLE,
      { phase: "thinking" },
      { dedupeKey: false }
    );
    refreshStruggleSnapshot();
  }, [emitStruggleSignal, refreshStruggleSnapshot]);

  /**
   * Offer intervention at a ladder level (student can accept or decline).
   * @param {object} opts
   * @param {number} [opts.level] - forced ladder rank
   * @param {boolean} [opts.escalate] - offer is an in-mode escalation
   */
  const offerIntervention = useCallback(
    ({
      reason = StruggleSignal.INCORRECT_STREAK,
      autoEnter = false,
      signals = [],
      level = null,
      escalate = false,
      escalateFrom = 0,
    } = {}) => {
      const tracker = trackerRef.current;
      const context = describeInterventionContext({
        subject: tracker?.subject || subjectName,
        topic: tracker?.topic || topicName,
        consecutiveIncorrect: tracker?.consecutiveIncorrect || 0,
        reason,
        signals,
        level,
        profile: profileRef.current,
        highestLevelUsed: tracker?.highestLevelUsed || 0,
        shouldAutoEnter: autoEnter,
        escalateFrom: escalateFrom || (escalate ? interventionRef.current.level : 0),
        forcedLevel: level,
        grade: student?.grade || null,
      });

      if (reason === StruggleSignal.IDLE) {
        tracker?.markIdleOffer?.();
      }
      if (escalate || reason === "escalate") {
        tracker?.markEscalateOffered?.(true);
        if (
          interventionRef.current.status === InterventionStatus.ACTIVE &&
          !autoEnter
        ) {
          priorActiveRef.current = {
            reason: interventionRef.current.reason,
            context: interventionRef.current.context,
            level: interventionRef.current.level,
            autoEntered: interventionRef.current.autoEntered,
          };
        }
      }

      if (autoEnter) {
        priorActiveRef.current = null;
        syncInterventionState({
          status: InterventionStatus.ACTIVE,
          reason,
          context,
          autoEntered: true,
          level: context.level,
          escalate: false,
        });
        submitLearningEvents(
          createLearningEvent(
            LearningEventType.INTERVENTION_ENTERED,
            {
              sessionId: tracker?.id,
              subject: context.subject,
              topic: context.topic,
              reason,
              autoEntered: true,
              consecutiveIncorrect: context.consecutiveIncorrect,
              signals: context.signals,
              level: context.level,
              levelId: context.levelId,
              workedExampleId: context.workedExample?.id || null,
              easierSkillSlug: context.easierSkill?.slug || null,
            },
            { studentId, sessionId: tracker?.id }
          )
        );
        return { action: "auto_enter", context };
      }

      syncInterventionState({
        status: InterventionStatus.OFFERED,
        reason,
        context,
        autoEntered: false,
        level: context.level,
        escalate: Boolean(escalate || reason === "escalate"),
      });
      submitLearningEvents(
        createLearningEvent(
          LearningEventType.INTERVENTION_OFFERED,
          {
            sessionId: tracker?.id,
            subject: context.subject,
            topic: context.topic,
            reason,
            consecutiveIncorrect: context.consecutiveIncorrect,
            signals: context.signals,
            level: context.level,
            levelId: context.levelId,
            escalate: Boolean(escalate || reason === "escalate"),
            workedExampleId: context.workedExample?.id || null,
            easierSkillSlug: context.easierSkill?.slug || null,
          },
          { studentId, sessionId: tracker?.id }
        )
      );
      return { action: "offer", context };
    },
    [studentId, subjectName, topicName, syncInterventionState, student?.grade]
  );

  offerInterventionRef.current = offerIntervention;

  /**
   * Poll idle wait while the student has not answered (Epic B1).
   * Soft nudge first; then offer lightest ladder help.
   */
  const checkIdleStruggle = useCallback(() => {
    const tracker = trackerRef.current;
    if (!tracker) return null;
    if (interventionRef.current.status !== InterventionStatus.IDLE) return null;

    const idleMs = tracker.getIdleMs?.();
    if (idleMs == null) return null;

    const flags = tracker.idleFlags || {};
    const decision = evaluateIdleStruggle({
      idleMs,
      currentStatus: interventionRef.current.status,
      alreadyNudged: flags.nudged,
      alreadyOfferedIdle: flags.offered,
    });

    if (decision.shouldOffer) {
      emitStruggleSignal(
        StruggleSignal.IDLE,
        { phase: "offer", idleMs: decision.idleMs },
        { dedupeKey: `idle:offer:${Math.floor(idleMs / 30_000)}` }
      );
      setSoftNudge(null);
      const result = offerInterventionRef.current?.({
        reason: StruggleSignal.IDLE,
        signals: [StruggleSignal.IDLE],
        level: InterventionLevel.MICRO_HINT,
      });
      trackMetric("intervention.offered", {
        sessionId: tracker.id,
        tags: {
          reason: StruggleSignal.IDLE,
          level: String(InterventionLevel.MICRO_HINT),
        },
      });
      refreshStruggleSnapshot();
      return result;
    }

    if (decision.shouldNudge && !softNudgeRef.current) {
      tracker.markIdleNudge?.();
      const nudge = describeIdleNudge({
        topic: tracker.topic || topicName,
      });
      setSoftNudge(nudge);
      emitStruggleSignal(
        StruggleSignal.IDLE,
        { phase: "nudge", idleMs: decision.idleMs },
        { dedupeKey: `idle:nudge:${Math.floor(idleMs / 30_000)}` }
      );
      refreshStruggleSnapshot();
      return { action: "nudge", context: nudge };
    }

    return null;
  }, [emitStruggleSignal, topicName, refreshStruggleSnapshot]);

  /**
   * Epic B3 — maybe open an affective check-in card.
   */
  const maybePromptAffectCheckIn = useCallback(() => {
    const tracker = trackerRef.current;
    if (!tracker) return null;
    if (affectCheckInRef.current) return null;

    const ac = tracker.getAffectCheckInState?.() || {};
    const decision = evaluateAffectCheckIn({
      turnCount: ac.turnCount || 0,
      sessionDurationMs: ac.sessionDurationMs || 0,
      consecutiveFrustrated: ac.consecutiveFrustrated || 0,
      recentAffects: ac.recentAffects || [],
      checkInsThisSession: ac.count || 0,
      lastCheckInAt: ac.lastAt,
      interventionStatus: interventionRef.current.status,
      softNudgeVisible: Boolean(softNudgeRef.current),
      checkInAlreadyOpen: Boolean(affectCheckInRef.current),
    });

    if (!decision.shouldPrompt) return null;

    const card = {
      ...decision.copy,
      reason: decision.reason,
      openedAt: Date.now(),
    };
    tracker.noteAffectCheckInPrompted?.(decision.reason);
    setAffectCheckIn(card);
    affectCheckInRef.current = card;

    submitLearningEvents(
      createLearningEvent(
        LearningEventType.AFFECT_CHECKIN,
        {
          sessionId: tracker.id,
          subject: tracker.subject || subjectName,
          topic: tracker.topic || topicName,
          phase: "prompted",
          reason: decision.reason,
          snapshot: ac,
        },
        { studentId, sessionId: tracker.id }
      )
    );
    trackMetric("affect.checkin_prompted", {
      sessionId: tracker.id,
      tags: { reason: decision.reason },
    });
    return card;
  }, [studentId, subjectName, topicName]);

  // Idle + long-session affect check — every 5s while a session is live
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!trackerRef.current) return;
      checkIdleStruggle();
      maybePromptAffectCheckIn();
    }, 5000);
    return () => window.clearInterval(id);
  }, [checkIdleStruggle, maybePromptAffectCheckIn]);

  /** Student picks a feeling on the check-in card (B3 mid-session or B7 start). */
  const respondAffectCheckIn = useCallback(
    (optionId) => {
      const tracker = trackerRef.current;
      const reason = affectCheckInRef.current?.reason || null;
      const isSessionStart = reason === SESSION_START_REASON;
      const option = getAffectOption(optionId, reason) || getCheckInOption(optionId);
      if (!option) {
        setAffectCheckIn(null);
        affectCheckInRef.current = null;
        settleSessionStartEnergyGate();
        return null;
      }

      tracker?.noteAffectCheckInResponse?.(option.id, option.affect, { reason });

      const response = {
        optionId: option.id,
        label: option.label,
        affect: option.affect,
        tutorHint: option.tutorHint,
        reason,
        lowEnergy: isLowEnergyOption(option),
        at: new Date().toISOString(),
      };
      setLastCheckInResponse(response);
      setAffectCheckIn(null);
      affectCheckInRef.current = null;
      settleSessionStartEnergyGate();

      const nextProfile = applyAffectCheckInToProfile(profileRef.current, {
        optionId: option.id,
        affect: option.affect,
      });
      persistProfile(nextProfile);

      submitLearningEvents(
        createLearningEvent(
          LearningEventType.AFFECT_CHECKIN,
          {
            sessionId: tracker?.id,
            subject: tracker?.subject || subjectName,
            topic: tracker?.topic || topicName,
            phase: "response",
            reason,
            optionId: option.id,
            affect: option.affect,
            label: option.label,
            lowEnergy: Boolean(response.lowEnergy),
          },
          { studentId, sessionId: tracker?.id }
        )
      );
      trackMetric("affect.checkin_response", {
        sessionId: tracker?.id,
        tags: {
          optionId: option.id,
          affect: option.affect,
          reason: reason || "",
        },
      });
      if (isSessionStart) {
        trackMetric("affect.session_start_response", {
          sessionId: tracker?.id,
          tags: {
            optionId: option.id,
            lowEnergy: response.lowEnergy ? "1" : "0",
          },
        });
      }

      // Soft chip when they name low energy / stuck / break
      if (
        option.id === "stuck" ||
        option.id === "break" ||
        option.id === "low"
      ) {
        setPersistenceNote({
          text: isSessionStart
            ? "Thanks — we’ll keep this gentle."
            : "Thanks for telling us — that helps Kindling support you.",
          at: Date.now(),
        });
      }

      // Epic B7 — low energy → optional break/easier path offer (reuse B2 L4, no auto-enter)
      if (isSessionStart && isLowEnergyOption(option)) {
        const status = interventionRef.current?.status;
        if (status === InterventionStatus.IDLE || !status) {
          offerInterventionRef.current?.({
            reason: "session_start_low_energy",
            signals: ["session_start_low_energy"],
            level: InterventionLevel.BREAK_OR_EASIER,
            autoEnter: false,
          });
          trackMetric("intervention.offered", {
            sessionId: tracker?.id,
            tags: {
              reason: "session_start_low_energy",
              level: String(InterventionLevel.BREAK_OR_EASIER),
            },
          });
        }
      }

      return response;
    },
    [persistProfile, studentId, subjectName, topicName, settleSessionStartEnergyGate]
  );

  /** Dismiss check-in without choosing (still records skip). Never blocks lesson. */
  const dismissAffectCheckIn = useCallback(() => {
    const tracker = trackerRef.current;
    const reason = affectCheckInRef.current?.reason || null;
    setAffectCheckIn(null);
    affectCheckInRef.current = null;
    // Count as prompted already; mark response skipped so cooldown holds
    tracker?.noteAffectCheckInResponse?.("skipped", null, { reason });
    settleSessionStartEnergyGate();
    submitLearningEvents(
      createLearningEvent(
        LearningEventType.AFFECT_CHECKIN,
        {
          sessionId: tracker?.id,
          subject: tracker?.subject || subjectName,
          topic: tracker?.topic || topicName,
          phase: "skipped",
          reason,
        },
        { studentId, sessionId: tracker?.id }
      )
    );
    trackMetric("affect.checkin_skipped", {
      sessionId: tracker?.id,
      tags: { reason: reason || "" },
    });
    if (reason === SESSION_START_REASON) {
      trackMetric("affect.session_start_skipped", {
        sessionId: tracker?.id,
      });
    }
  }, [studentId, subjectName, topicName, settleSessionStartEnergyGate]);

  const dismissPersistenceNote = useCallback(() => {
    setPersistenceNote(null);
  }, []);

  /**
   * Soft nudge "Yes, help me" → enter suggested ladder level (usually micro-hint).
   */
  const acceptSoftNudgeHelp = useCallback(() => {
    setSoftNudge(null);
    emitStruggleSignal(
      StruggleSignal.IDLE,
      { phase: "nudge_accepted" },
      { dedupeKey: false }
    );
    return offerIntervention({
      reason: StruggleSignal.IDLE,
      autoEnter: true,
      signals: [StruggleSignal.IDLE],
      level: InterventionLevel.MICRO_HINT,
    });
  }, [emitStruggleSignal, offerIntervention]);

  /**
   * Student accepts offered help, or manually starts a ladder level.
   * @param {{ level?: number } } [opts] - override level when picking from tools
   */
  const acceptIntervention = useCallback(
    (opts = {}) => {
      const tracker = trackerRef.current;
      const prev = interventionRef.current;
      const forcedLevel =
        opts.level != null
          ? opts.level
          : prev.context?.level ?? prev.level ?? InterventionLevel.FULL_GUIDE;

      const context = describeInterventionContext({
        subject: tracker?.subject || subjectName,
        topic: tracker?.topic || topicName,
        consecutiveIncorrect: tracker?.consecutiveIncorrect || 0,
        reason: prev.reason || opts.reason || "student_request",
        signals: prev.context?.signals || [],
        profile: profileRef.current,
        highestLevelUsed: tracker?.highestLevelUsed || 0,
        forcedLevel,
        grade: student?.grade || null,
      });

      // Preserve offer copy when accepting the offered card as-is
      const mergedContext =
        prev.context && opts.level == null
          ? { ...prev.context, ...context, level: prev.context.level ?? context.level }
          : context;

      // Prefer freshest library best when entering worked-example mode
      if (
        mergedContext.level === InterventionLevel.WORKED_EXAMPLE &&
        !mergedContext.workedExample &&
        exampleLibrary?.best
      ) {
        mergedContext.workedExample = exampleLibrary.best;
      }

      syncInterventionState({
        status: InterventionStatus.ACTIVE,
        reason: prev.reason || opts.reason || "student_request",
        context: mergedContext,
        autoEntered: false,
        level: mergedContext.level,
        escalate: false,
      });

      submitLearningEvents(
        createLearningEvent(
          LearningEventType.INTERVENTION_ENTERED,
          {
            sessionId: tracker?.id,
            subject: mergedContext.subject,
            topic: mergedContext.topic,
            reason: prev.reason || opts.reason || "student_request",
            autoEntered: false,
            consecutiveIncorrect: mergedContext.consecutiveIncorrect,
            level: mergedContext.level,
            levelId: mergedContext.levelId,
            workedExampleId: mergedContext.workedExample?.id || null,
            easierSkillSlug: mergedContext.easierSkill?.slug || null,
          },
          { studentId, sessionId: tracker?.id }
        )
      );

      return mergedContext;
    },
    [
      studentId,
      subjectName,
      topicName,
      syncInterventionState,
      student?.grade,
      exampleLibrary,
    ]
  );

  /** Tools panel / UI: start a specific ladder level immediately. */
  const requestInterventionLevel = useCallback(
    (level) => {
      const context = acceptIntervention({
        level,
        reason: "student_request",
      });
      return context;
    },
    [acceptIntervention]
  );

  /**
   * Epic B4 — start worked-example mode with the best library example for this topic.
   */
  const requestLibraryExample = useCallback(() => {
    const best =
      exampleLibrary?.best ||
      findWorkedExample({
        subject: subjectName,
        topic: topicName,
        grade: student?.grade,
        kind: "example",
      });
    const context = acceptIntervention({
      level: InterventionLevel.WORKED_EXAMPLE,
      reason: "library_example",
    });
    if (best && context) {
      context.workedExample = {
        id: best.id,
        title: best.title,
        skillSlug: best.skillSlug,
        problem: best.problem,
        summary: best.summary || best.title,
        steps: best.steps,
        takeaway: best.takeaway,
        counterexample: best.counterexample,
        kind: best.kind,
        source: best.source || "library",
      };
      context.body = `Want me to walk through “${best.title}” from Kindling’s example library, then let you try a twin? You can leave anytime.`;
      syncInterventionState({
        status: InterventionStatus.ACTIVE,
        reason: "library_example",
        context,
        autoEntered: false,
        level: InterventionLevel.WORKED_EXAMPLE,
        escalate: false,
      });
    }
    return context;
  }, [
    acceptIntervention,
    exampleLibrary,
    subjectName,
    topicName,
    student?.grade,
    syncInterventionState,
  ]);

  /** While active: offer or jump to next ladder rung. */
  const escalateIntervention = useCallback(
    ({ autoEnter = false } = {}) => {
      const prev = interventionRef.current;
      const from = prev.level || prev.context?.level || InterventionLevel.MICRO_HINT;
      return offerIntervention({
        reason: "escalate",
        signals: ["escalate"],
        escalate: true,
        escalateFrom: from,
        autoEnter,
      });
    },
    [offerIntervention]
  );

  /** Student declines the offer — stay in normal lesson (or prior active level). */
  const declineIntervention = useCallback(() => {
    const tracker = trackerRef.current;
    const prev = interventionRef.current;
    const wasEscalate = prev.escalate || prev.reason === "escalate";

    submitLearningEvents(
      createLearningEvent(
        LearningEventType.INTERVENTION_DECLINED,
        {
          sessionId: tracker?.id,
          subject: prev.context?.subject || subjectName,
          topic: prev.context?.topic || topicName,
          reason: prev.reason,
          level: prev.level || prev.context?.level || null,
          escalate: wasEscalate,
        },
        { studentId, sessionId: tracker?.id }
      )
    );

    // Escalate decline → remain on previous active ladder level
    if (wasEscalate && priorActiveRef.current) {
      const prior = priorActiveRef.current;
      priorActiveRef.current = null;
      tracker?.markEscalateOffered?.(true); // don't re-offer immediately
      syncInterventionState({
        status: InterventionStatus.ACTIVE,
        reason: prior.reason,
        context: prior.context,
        autoEntered: prior.autoEntered,
        level: prior.level,
        escalate: false,
      });
      return;
    }

    priorActiveRef.current = null;
    syncInterventionState({
      status: InterventionStatus.IDLE,
      reason: null,
      context: null,
      autoEntered: false,
      level: InterventionLevel.NONE,
      escalate: false,
    });
  }, [studentId, subjectName, topicName, syncInterventionState]);

  /** Student (or UI) exits active intervention. */
  const exitIntervention = useCallback(() => {
    const tracker = trackerRef.current;
    const prev = interventionRef.current;

    submitLearningEvents(
      createLearningEvent(
        LearningEventType.INTERVENTION_EXITED,
        {
          sessionId: tracker?.id,
          subject: prev.context?.subject || subjectName,
          topic: prev.context?.topic || topicName,
          reason: prev.reason,
          level: prev.level || prev.context?.level || null,
          levelId: prev.context?.levelId || null,
          durationMs: null,
        },
        { studentId, sessionId: tracker?.id }
      )
    );

    // Reset fail streak so we don't immediately re-offer
    if (tracker) {
      tracker.setIntervention({ status: "idle" });
    }

    syncInterventionState({
      status: InterventionStatus.IDLE,
      reason: null,
      context: null,
      autoEntered: false,
      level: InterventionLevel.NONE,
      escalate: false,
    });
  }, [studentId, subjectName, topicName, syncInterventionState]);

  /**
   * Core: student message + tutor reply → signals → profile → API → maybe intervene.
   */
  const recordExchange = useCallback(
    async ({
      studentText,
      tutorText,
      wasHintRequest = false,
      multiStepOutcome = null,
    } = {}) => {
      const tracker = trackerRef.current;
      if (!tracker || !studentText) return null;

      const responseMs = tracker.consumeResponseMs();
      const inputModality = lastModalityRef.current || "text";
      lastModalityRef.current = "text";

      const signals = analyzeExchange({
        studentText,
        tutorText,
        responseMs,
        wasHintRequest,
        inputModality,
        subject: tracker.subject || subjectName,
        topic: tracker.topic || topicName,
      });

      // Epic B6 — align graded correctness with multi-step partial credit
      if (multiStepOutcome?.partialCredit) {
        const pc = multiStepOutcome.partialCredit;
        signals.multiStep = {
          problemId: multiStepOutcome.session?.problemId,
          stepIndex: multiStepOutcome.stepResult?.stepIndex,
          stepCorrectness: multiStepOutcome.stepResult?.correctness,
          partialCredit: pc,
          completed: multiStepOutcome.completed,
        };
        if (multiStepOutcome.gradedCorrectness) {
          // Prefer step-path grade for mastery when in show-your-work mode
          if (
            multiStepOutcome.gradedCorrectness === "partial" ||
            multiStepOutcome.completed
          ) {
            signals.correctness = multiStepOutcome.gradedCorrectness;
            signals.gradeSource = "multistep";
          } else if (
            multiStepOutcome.stepResult?.correctness === "correct"
          ) {
            signals.correctness = "partial"; // micro-win on a step
            signals.gradeSource = "multistep_step";
          }
        }
      }

      // Epic B5 — remediation if prior MCs clear on correct/partial
      const remediated = detectRemediationSuccess({
        activeMisconceptionIds: tracker.getActiveMisconceptionIds?.() || [],
        previousHits: tracker.getLastMisconceptionIds?.() || [],
        currentHits: signals.misconceptions || [],
        correctness: signals.correctness,
      });
      if (remediated.length) {
        signals.misconceptionsRemediated = remediated.map((id) => {
          const hit =
            (signals.misconceptions || []).find((m) => m.id === id) ||
            activeMisconceptionHits.find((m) => m.id === id) ||
            profileRef.current?.misconceptions?.[id] ||
            {};
          return {
            id,
            label: hit.label || id,
            skillSlug: hit.skillSlug || null,
          };
        });
      }
      if (signals.misconceptions?.length) {
        setActiveMisconceptionHits(signals.misconceptions);
      } else if (remediated.length) {
        setActiveMisconceptionHits((prev) =>
          prev.filter((h) => !remediated.includes(h.id))
        );
      }

      // Epic A3: log when math checker overrides / disagrees with tutor language
      if (signals.verification?.discrepancy) {
        trackMetric("math.grade_disagreement", {
          sessionId: tracker.id,
          tags: {
            linguistic: signals.linguisticCorrectness,
            verified: signals.verification.correctness,
            method: signals.verification.method,
            subject: tracker.subject,
            topic: tracker.topic,
          },
        });
        reportError({
          kind: "lesson",
          code: "MATH_GRADE_DISCREPANCY",
          message: "Math verifier disagreed with tutor linguistic grade",
          component: "mathVerifier",
          sessionId: tracker.id,
          extra: {
            linguistic: signals.linguisticCorrectness,
            verified: signals.verification.correctness,
            method: signals.verification.method,
          },
        });
      } else if (
        signals.gradeSource === "math_verifier" &&
        signals.verification?.checked
      ) {
        trackMetric("math.grade_verified", {
          sessionId: tracker.id,
          tags: {
            result: signals.correctness,
            method: signals.verification.method,
          },
        });
      }

      // Funnel: first real student message in this session
      if ((tracker.snapshot.turns?.length || 0) === 0) {
        markSessionFirstMessage(tracker.id, {
          subject: tracker.subject,
          topic: tracker.topic,
          modality: inputModality,
        });
      }

      const turn = tracker.recordTurn({
        studentText,
        tutorText,
        signals,
        inputModality,
      });

      // Fold persistence into signals for profile
      if (turn?.persistence?.delta) {
        signals.persistenceDelta = turn.persistence.delta;
        signals.persistenceTags = turn.persistence.tags;
        const note = persistenceCelebrationCopy(
          turn.persistence.tags,
          tracker.persistenceScore
        );
        if (note) {
          setPersistenceNote({ text: note, at: Date.now(), tags: turn.persistence.tags });
          submitLearningEvents(
            createLearningEvent(
              LearningEventType.PERSISTENCE_NOTED,
              {
                sessionId: tracker.id,
                subject: tracker.subject,
                topic: tracker.topic,
                tags: turn.persistence.tags,
                delta: turn.persistence.delta,
                score: tracker.persistenceScore,
                copy: note,
              },
              { studentId, sessionId: tracker.id }
            )
          );
        }
      }

      // Clear soft idle nudge on any student reply
      setSoftNudge(null);
      // Don't auto-close affect check-in on reply — student may answer card first

      tracker.markPromptReady();

      const nextProfile = applyExchangeToProfile(profileRef.current, {
        subject: tracker.subject,
        topic: tracker.topic,
        signals,
      });
      persistProfile(nextProfile);
      setLastSignals(signals);

      // Epic C1 — track graded turns in Review spark mode
      // (skip separate review auto-complete while G1 challenge owns the session)
      if (
        reviewMode &&
        reviewSkill &&
        !challengeMode &&
        !reviewProgressRef.current.completed
      ) {
        const c = signals.correctness;
        if (c === "correct") reviewProgressRef.current.correct += 1;
        else if (c === "incorrect") reviewProgressRef.current.incorrect += 1;
        else if (c === "partial") reviewProgressRef.current.partial += 1;

        if (!reviewProgressRef.current.startedLogged) {
          reviewProgressRef.current.startedLogged = true;
          submitLearningEvents(
            createLearningEvent(
              LearningEventType.REVIEW_STARTED,
              {
                sessionId: tracker.id,
                subject: subjectName,
                topic: topicName,
                skillSlug: reviewSkill,
                reviewId: reviewId || null,
              },
              { studentId, sessionId: tracker.id }
            )
          );
          trackMetric("review.started", {
            sessionId: tracker.id,
            tags: { skill: reviewSkill },
          });
        }

        // Auto-complete after 2 solid hits or 3 graded attempts with majority correct
        const rp = reviewProgressRef.current;
        const graded = rp.correct + rp.incorrect + rp.partial;
        const successEnough =
          rp.correct >= 2 || (graded >= 3 && rp.correct + rp.partial * 0.5 >= rp.incorrect);
        const failEnough = rp.incorrect >= 2 && rp.correct === 0;
        if (successEnough || failEnough) {
          const outcome = failEnough
            ? "fail"
            : rp.correct >= 2
              ? "success"
              : "partial";
          rp.completed = true;
          void finishReviewSpark({
            skillSlug: reviewSkill,
            reviewId,
            outcome,
          }).then((res) => {
            submitLearningEvents(
              createLearningEvent(
                LearningEventType.REVIEW_COMPLETED,
                {
                  sessionId: tracker.id,
                  subject: subjectName,
                  topic: topicName,
                  skillSlug: reviewSkill,
                  reviewId: reviewId || null,
                  outcome,
                  ok: Boolean(res?.ok),
                  nextDueAt: res?.nextDueAt || null,
                  easierSkillSlug: res?.easierSkillSlug || null,
                },
                { studentId, sessionId: tracker.id }
              )
            );
            trackMetric("review.completed", {
              sessionId: tracker.id,
              tags: { skill: reviewSkill, outcome },
            });
            if (res?.ok) {
              setPersistenceNote({
                text:
                  outcome === "fail"
                    ? "Thanks for the try — we'll warm this up again soon."
                    : "Nice review spark — that skill just got a little brighter.",
                at: Date.now(),
              });
            }
          });
        }
      }

      // Epic G1 — light spark challenge: N solid (correct) graded turns
      if (challengeMode && !challengeProgressRef.current.completed) {
        const skillKey = challengeSkill || reviewSkill || "";
        const skillLabel =
          challengeSkillLabel || reviewSkillLabel || topicName || "this skill";

        if (!challengeProgressRef.current.startedLogged) {
          challengeProgressRef.current.startedLogged = true;
          submitLearningEvents(
            createLearningEvent(
              LearningEventType.CHALLENGE_STARTED,
              {
                sessionId: tracker.id,
                subject: subjectName,
                topic: topicName,
                skillSlug: skillKey,
                skillLabel,
                target: challengeProgressRef.current.target,
                reviewId: reviewId || null,
              },
              { studentId, sessionId: tracker.id }
            )
          );
          trackMetric("challenge.started", {
            sessionId: tracker.id,
            tags: { skill: skillKey },
          });
        }

        const before = challengeProgressRef.current.correct;
        const next = applyChallengeGradedTurn(
          challengeProgressRef.current,
          signals.correctness
        );
        challengeProgressRef.current = next;
        setChallengeProgress({ ...next, skillLabel });

        // Mid-challenge encouragement on new solid hits
        if (next.correct > before && !next.completed) {
          const chip = challengeProgressChipCopy(next);
          if (chip) {
            setPersistenceNote({ text: chip, at: Date.now() });
          }
        }

        if (next.completed) {
          const celeb = challengeCelebrationCopy({
            skillLabel,
            correct: next.correct,
            target: next.target,
          });
          setPersistenceNote({
            text: celeb.text,
            at: Date.now(),
            kind: "challenge_complete",
          });
          submitLearningEvents(
            createLearningEvent(
              LearningEventType.CHALLENGE_COMPLETED,
              {
                sessionId: tracker.id,
                subject: subjectName,
                topic: topicName,
                skillSlug: skillKey,
                skillLabel,
                correct: next.correct,
                incorrect: next.incorrect,
                partial: next.partial,
                target: next.target,
                reviewId: reviewId || null,
              },
              { studentId, sessionId: tracker.id }
            )
          );
          trackMetric("challenge.completed", {
            sessionId: tracker.id,
            tags: { skill: skillKey },
            value: next.correct,
          });
          // Persistence spark note (reuse B3 event)
          submitLearningEvents(
            createLearningEvent(
              LearningEventType.PERSISTENCE_NOTED,
              {
                sessionId: tracker.id,
                subject: subjectName,
                topic: topicName,
                tags: ["spark_challenge"],
                copy: celeb.persistenceNote,
                skillSlug: skillKey,
              },
              { studentId, sessionId: tracker.id }
            )
          );
          // If launched from a due review, reschedule like C1 success
          if (skillKey && (reviewId || reviewMode)) {
            void finishReviewSpark({
              skillSlug: skillKey,
              reviewId,
              outcome: "success",
            }).then((res) => {
              if (res?.ok) {
                submitLearningEvents(
                  createLearningEvent(
                    LearningEventType.REVIEW_COMPLETED,
                    {
                      sessionId: tracker.id,
                      subject: subjectName,
                      topic: topicName,
                      skillSlug: skillKey,
                      reviewId: reviewId || null,
                      outcome: "success",
                      ok: true,
                      via: "spark_challenge",
                      nextDueAt: res?.nextDueAt || null,
                    },
                    { studentId, sessionId: tracker.id }
                  )
                );
              }
            });
          }
        }
      }

      // Epic B5 learning events
      if (signals.misconceptions?.length) {
        submitLearningEvents(
          signals.misconceptions.map((mc) =>
            createLearningEvent(
              LearningEventType.MISCONCEPTION_DETECTED,
              {
                sessionId: tracker.id,
                subject: tracker.subject,
                topic: tracker.topic,
                misconceptionId: mc.id,
                label: mc.label,
                skillSlug: mc.skillSlug,
                playbook: mc.playbook,
                matchSource: mc.matchSource,
              },
              { studentId, sessionId: tracker.id }
            )
          )
        );
        trackMetric("misconception.detected", {
          sessionId: tracker.id,
          tags: {
            ids: signals.misconceptions.map((m) => m.id).join(","),
          },
        });
      }
      if (signals.misconceptionsRemediated?.length) {
        submitLearningEvents(
          signals.misconceptionsRemediated.map((mc) =>
            createLearningEvent(
              LearningEventType.MISCONCEPTION_REMEDIATED,
              {
                sessionId: tracker.id,
                subject: tracker.subject,
                topic: tracker.topic,
                misconceptionId: mc.id || mc,
                label: mc.label,
                skillSlug: mc.skillSlug,
              },
              { studentId, sessionId: tracker.id }
            )
          )
        );
        trackMetric("misconception.remediated", {
          sessionId: tracker.id,
          tags: {
            ids: signals.misconceptionsRemediated
              .map((m) => m.id || m)
              .join(","),
          },
        });
      }

      const struggle = tracker.getStruggleSnapshot?.() || null;
      setStruggleSnapshot(struggle);

      const liveSummary = {
        accuracy: tracker.summarize().accuracy,
        counters: tracker.snapshot.counters,
        turnCount: tracker.snapshot.turns.length,
        scaffoldingBias: tracker.scaffoldingBias,
        struggle,
        persistenceScore: tracker.persistenceScore,
        persistenceTags: tracker.snapshot.persistenceTags || [],
        affectCheckIns: tracker.snapshot.affectCheckIn?.count || 0,
      };
      setSessionSummary(liveSummary);

      // Epic B1: emit discrete struggle.signal events for new streak hits
      const struggleEvents = [];
      if (signals.shortAnswer && tracker.consecutiveShortAnswers >= 2) {
        if (
          emitStruggleSignal(
            StruggleSignal.SHORT_ANSWERS,
            {
              phase: "streak",
              consecutive: tracker.consecutiveShortAnswers,
              scaffoldingBias: tracker.scaffoldingBias,
            },
            {
              dedupeKey: `short:${tracker.consecutiveShortAnswers}`,
            }
          )
        ) {
          struggleEvents.push(StruggleSignal.SHORT_ANSWERS);
        }
      }
      if (signals.rapidGuess && tracker.consecutiveRapidGuesses >= 1) {
        if (
          emitStruggleSignal(
            StruggleSignal.RAPID_GUESSING,
            {
              phase: "streak",
              consecutive: tracker.consecutiveRapidGuesses,
              responseMs,
              preferSlowDown: signals.preferSlowDown,
              gradeSource: signals.gradeSource,
              verified: Boolean(signals.verification?.checked),
            },
            {
              dedupeKey: `rapid:${tracker.consecutiveRapidGuesses}`,
            }
          )
        ) {
          struggleEvents.push(StruggleSignal.RAPID_GUESSING);
        }
      }
      if (signals.offTopic && tracker.consecutiveOffTopic >= 1) {
        if (
          emitStruggleSignal(
            StruggleSignal.OFF_TOPIC,
            {
              phase: "streak",
              consecutive: tracker.consecutiveOffTopic,
              cues: signals.offTopicMeta?.cues,
              confidence: signals.offTopicMeta?.confidence,
            },
            {
              dedupeKey: `off_topic:${tracker.consecutiveOffTopic}`,
            }
          )
        ) {
          struggleEvents.push(StruggleSignal.OFF_TOPIC);
        }
      }
      if (tracker.topicThrashing) {
        if (
          emitStruggleSignal(
            StruggleSignal.TOPIC_THRASHING,
            {
              phase: "window",
              topicSwitches: tracker.snapshot.counters.topicSwitches,
            },
            { dedupeKey: `thrash:${tracker.snapshot.counters.topicSwitches}` }
          )
        ) {
          struggleEvents.push(StruggleSignal.TOPIC_THRASHING);
        }
      }

      await submitLearningEvents([
        createLearningEvent(
          LearningEventType.TURN_EXCHANGE,
          {
            sessionId: tracker.id,
            subject: tracker.subject,
            topic: tracker.topic,
            studentText,
            tutorText,
            signals,
            inputModality,
            responseMs,
            runningSession: liveSummary,
            interventionStatus: interventionRef.current.status,
            struggle,
            profileDigest: {
              exchanges: nextProfile.totals.exchanges,
              focusAreas: nextProfile.focusAreas,
              strengths: nextProfile.strengths,
              hintRate: nextProfile.behavior.hintRate,
              shortAnswerRate: nextProfile.behavior.shortAnswerRate,
              rapidGuessRate: nextProfile.behavior.rapidGuessRate,
            },
          },
          { studentId, sessionId: tracker.id }
        ),
        ...(wasHintRequest || signals.isHintRequest
          ? [
              createLearningEvent(
                LearningEventType.HINT_REQUESTED,
                {
                  sessionId: tracker.id,
                  subject: tracker.subject,
                  topic: tracker.topic,
                  studentText,
                },
                { studentId, sessionId: tracker.id }
              ),
            ]
          : []),
      ]);

      // Multi-signal struggle + ladder (Epic B1/B2)
      let interventionAction = null;
      const cur = interventionRef.current;
      if (
        cur.status === InterventionStatus.IDLE ||
        cur.status === InterventionStatus.ACTIVE
      ) {
        const decision = evaluateInterventionTrigger({
          consecutiveIncorrect: tracker.consecutiveIncorrect,
          currentStatus: cur.status,
          affect: signals.affect,
          consecutiveHints: tracker.consecutiveHints,
          consecutiveShortAnswers: tracker.consecutiveShortAnswers,
          consecutiveRapidGuesses: tracker.consecutiveRapidGuesses,
          consecutiveOffTopic: tracker.consecutiveOffTopic,
          topicThrashing: tracker.topicThrashing,
          scaffoldingBias: tracker.scaffoldingBias,
          highestLevelUsed: tracker.highestLevelUsed || 0,
          currentLevel: cur.level || cur.context?.level || 0,
          alreadyOfferedEscalate: Boolean(tracker.escalateOffered),
        });

        if (decision.shouldAutoEnter || decision.shouldOffer) {
          interventionAction = offerIntervention({
            reason: decision.reason,
            autoEnter: decision.shouldAutoEnter,
            signals: decision.signals,
            level: decision.level,
            escalate: decision.shouldEscalate,
            escalateFrom: decision.shouldEscalate
              ? cur.level || cur.context?.level || 0
              : 0,
          });
          trackMetric(
            decision.shouldAutoEnter
              ? "intervention.auto_entered"
              : decision.shouldEscalate
                ? "intervention.escalate_offered"
                : "intervention.offered",
            {
              sessionId: tracker.id,
              tags: {
                reason: decision.reason,
                signals: (decision.signals || []).join(","),
                level: String(decision.level || ""),
                levelId: levelMeta(decision.level).id,
              },
            }
          );
        }
      }

      // Epic B3: affective check-in after turn settles (no stack on new intervention offer)
      let checkInAction = null;
      if (
        !interventionAction &&
        interventionRef.current.status !== InterventionStatus.OFFERED
      ) {
        checkInAction = maybePromptAffectCheckIn();
      }

      return {
        signals,
        interventionAction,
        struggleEvents,
        struggle,
        checkInAction,
        persistence: turn?.persistence || null,
      };
    },
    [
      persistProfile,
      studentId,
      subjectName,
      topicName,
      offerIntervention,
      emitStruggleSignal,
      maybePromptAffectCheckIn,
      reviewMode,
      reviewSkill,
      challengeMode,
      challengeSkill,
      challengeSkillLabel,
      challengeTarget,
      reviewId,
      activeMisconceptionHits,
    ]
  );

  const recordToolToggle = useCallback(
    (key, value) => {
      const tracker = trackerRef.current;
      tracker?.setTools({ [key]: value });
      submitLearningEvents(
        createLearningEvent(
          LearningEventType.TOOL_TOGGLED,
          {
            sessionId: tracker?.id,
            tool: key,
            enabled: value,
            subject: tracker?.subject || subjectName,
            topic: tracker?.topic || topicName,
          },
          { studentId, sessionId: tracker?.id }
        )
      );
    },
    [studentId, subjectName, topicName]
  );

  const recordTopicSwitch = useCallback(
    (subject, topic) => {
      const tracker = trackerRef.current;
      if (!tracker) return;
      const from = { subject: tracker.subject, topic: tracker.topic };
      tracker.setTopic(subject, topic);
      setSoftNudge(null);
      // Leaving a topic clears open offers (active mode can continue if student wants)
      if (interventionRef.current.status === InterventionStatus.OFFERED) {
        syncInterventionState({
          status: InterventionStatus.IDLE,
          reason: null,
          context: null,
          autoEntered: false,
        });
      }
      submitLearningEvents(
        createLearningEvent(
          LearningEventType.TOPIC_SWITCHED,
          { sessionId: tracker.id, from, to: { subject, topic } },
          { studentId, sessionId: tracker.id }
        )
      );
      if (tracker.topicThrashing) {
        emitStruggleSignal(
          StruggleSignal.TOPIC_THRASHING,
          {
            phase: "switch",
            from,
            to: { subject, topic },
            topicSwitches: tracker.snapshot.counters.topicSwitches,
          },
          {
            dedupeKey: `thrash:switch:${tracker.snapshot.counters.topicSwitches}`,
          }
        );
      }
      refreshStruggleSnapshot();
    },
    [studentId, syncInterventionState, emitStruggleSignal, refreshStruggleSnapshot]
  );

  /**
   * Epic B8 — offer wrap-up reflection before a natural end.
   * Resolves with { reflected, skipped, payload } when card completes or is not needed.
   * Does not force on error exits (caller passes isErrorExit).
   */
  const requestSessionReflection = useCallback(
    ({
      messageCount = 0,
      forced = false,
      isErrorExit = false,
      /** Epic C5 — optional goal echo on wrap-up */
      learningGoal = "",
      weekFocus = "",
    } = {}) => {
      const tracker = trackerRef.current;
      const summaryTurns =
        typeof tracker?.summarize === "function"
          ? tracker.summarize()?.turnCount || 0
          : 0;

      const offer = shouldOfferSessionReflection({
        turnCount: summaryTurns,
        messageCount,
        alreadyReflected: reflectedThisSessionRef.current,
        forced,
        isErrorExit,
      });

      if (!offer) {
        return Promise.resolve({
          reflected: reflectedThisSessionRef.current,
          skipped: !reflectedThisSessionRef.current,
          offered: false,
          payload: lastSessionReflection,
        });
      }

      if (sessionReflectionRef.current) {
        // Already open — wait for existing gate
        return new Promise((resolve) => {
          const prev = wrapUpResolveRef.current;
          wrapUpResolveRef.current = (result) => {
            prev?.(result);
            resolve(result);
          };
        });
      }

      const resolvedWeek =
        String(weekFocus || "").trim() ||
        String(student?.weekFocus || student?.week_focus || "").trim();
      const card = buildSessionReflectionCard({
        topic: tracker?.topic || topicName,
        subject: tracker?.subject || subjectName,
        learningGoal: String(learningGoal || "").trim(),
        weekFocus: resolvedWeek,
      });
      // Prefer live due Review sparks (C1) over thin B8 heuristic
      let reviewCta = suggestReviewSparkCta({
        profile: profileRef.current,
        subject: tracker?.subject || subjectName,
        topic: tracker?.topic || topicName,
      });
      void loadReviewSparks({ refresh: false }).then((pack) => {
        const fromDue = pickReviewCtaFromDue(pack.dueNow || pack.due, {
          subject: tracker?.subject || subjectName,
          topic: tracker?.topic || topicName,
        });
        if (fromDue && sessionReflectionRef.current) {
          setSessionReflection((prev) =>
            prev ? { ...prev, reviewCtaPreview: fromDue } : prev
          );
        }
      });
      card.reviewCtaPreview = reviewCta;

      setSessionReflection(card);
      sessionReflectionRef.current = card;

      submitLearningEvents(
        createLearningEvent(
          LearningEventType.SESSION_REFLECT,
          {
            sessionId: tracker?.id,
            subject: tracker?.subject || subjectName,
            topic: tracker?.topic || topicName,
            phase: "prompted",
          },
          { studentId, sessionId: tracker?.id }
        )
      );
      trackMetric("session.reflect_prompted", {
        sessionId: tracker?.id,
      });

      return new Promise((resolve) => {
        wrapUpResolveRef.current = resolve;
      });
    },
    [studentId, subjectName, topicName, lastSessionReflection, student]
  );

  const finishSessionReflection = useCallback(
    (result) => {
      setSessionReflection(null);
      sessionReflectionRef.current = null;
      const resolve = wrapUpResolveRef.current;
      wrapUpResolveRef.current = null;
      resolve?.(result);
      return result;
    },
    []
  );

  /** Student submits wrap-up choices. */
  const respondSessionReflection = useCallback(
    async ({ clickedId = null, nextId = null, freeNote = "" } = {}) => {
      const tracker = trackerRef.current;
      const topic = tracker?.topic || topicName;
      const subject = tracker?.subject || subjectName;
      const note = formatReflectionNote({
        clickedId,
        nextId,
        freeNote,
        topic,
      });
      const payload = {
        clickedId,
        nextId,
        freeNote: String(freeNote || "").trim().slice(0, 200),
        note,
        subject,
        topic,
        sessionId: tracker?.id || null,
        at: new Date().toISOString(),
        skipped: false,
      };
      let reviewCta = suggestReviewSparkCta({
        profile: profileRef.current,
        subject,
        topic,
        nextId,
        clickedId,
      });
      // Prefer C1 due item when available
      try {
        const pack = await loadReviewSparks({ refresh: false });
        const fromDue = pickReviewCtaFromDue(pack.dueNow || pack.due, {
          subject,
          topic,
        });
        if (fromDue && nextId !== "rest") reviewCta = fromDue;
      } catch {
        /* keep heuristic */
      }
      payload.reviewCta = reviewCta;

      reflectedThisSessionRef.current = true;
      setLastSessionReflection(payload);

      const nextProfile = applySessionReflectionToProfile(
        profileRef.current,
        payload
      );
      persistProfile(nextProfile);

      submitLearningEvents(
        createLearningEvent(
          LearningEventType.SESSION_REFLECT,
          {
            sessionId: tracker?.id,
            subject,
            topic,
            phase: "response",
            clickedId,
            nextId,
            freeNote: payload.freeNote,
            note,
            reviewCtaKind: reviewCta?.kind || null,
          },
          { studentId, sessionId: tracker?.id }
        )
      );
      trackMetric("session.reflect_response", {
        sessionId: tracker?.id,
        tags: {
          clickedId: clickedId || "",
          nextId: nextId || "",
        },
      });

      return finishSessionReflection({
        reflected: true,
        skipped: false,
        offered: true,
        payload,
      });
    },
    [
      finishSessionReflection,
      persistProfile,
      studentId,
      subjectName,
      topicName,
    ]
  );

  /** Skip wrap-up without choices (still records skip). */
  const dismissSessionReflection = useCallback(() => {
    const tracker = trackerRef.current;
    const topic = tracker?.topic || topicName;
    const subject = tracker?.subject || subjectName;
    reflectedThisSessionRef.current = true;
    const payload = {
      skipped: true,
      subject,
      topic,
      sessionId: tracker?.id || null,
      at: new Date().toISOString(),
    };
    setLastSessionReflection(payload);
    const nextProfile = applySessionReflectionToProfile(
      profileRef.current,
      payload
    );
    persistProfile(nextProfile);

    submitLearningEvents(
      createLearningEvent(
        LearningEventType.SESSION_REFLECT,
        {
          sessionId: tracker?.id,
          subject,
          topic,
          phase: "skipped",
        },
        { studentId, sessionId: tracker?.id }
      )
    );
    trackMetric("session.reflect_skipped", {
      sessionId: tracker?.id,
    });

    return finishSessionReflection({
      reflected: false,
      skipped: true,
      offered: true,
      payload,
    });
  }, [
    finishSessionReflection,
    persistProfile,
    studentId,
    subjectName,
    topicName,
  ]);

  const endSession = useCallback(async () => {
    const tracker = trackerRef.current;
    if (!tracker) return null;

    const summary = tracker.summarize();
    if (!summary.turnCount) {
      markSessionDropOff(summary.sessionId, {
        subject: summary.subject,
        topic: summary.topic,
        reason: "session_end",
      });
    }

    // Epic C1 — if review mode ended without auto-complete, score from session grades
    // (challenge mode handles its own completion + optional review reschedule)
    if (
      reviewMode &&
      reviewSkill &&
      !challengeMode &&
      !reviewProgressRef.current.completed
    ) {
      const rp = reviewProgressRef.current;
      const graded = rp.correct + rp.incorrect + rp.partial;
      if (graded > 0) {
        const outcome =
          rp.incorrect > rp.correct && rp.correct === 0
            ? "fail"
            : rp.correct >= 1
              ? "success"
              : "partial";
        rp.completed = true;
        try {
          const res = await finishReviewSpark({
            skillSlug: reviewSkill,
            reviewId,
            outcome,
          });
          submitLearningEvents(
            createLearningEvent(
              LearningEventType.REVIEW_COMPLETED,
              {
                sessionId: summary.sessionId,
                subject: subjectName,
                topic: topicName,
                skillSlug: reviewSkill,
                reviewId: reviewId || null,
                outcome,
                ok: Boolean(res?.ok),
                phase: "session_end",
              },
              { studentId, sessionId: summary.sessionId }
            )
          );
        } catch {
          /* ignore */
        }
      }
    }

    let ended = applySessionEnd(profileRef.current, summary);
    // Attach last reflection onto session summary for consumers
    if (lastSessionReflection && !lastSessionReflection.skipped) {
      summary.lastReflection = lastSessionReflection;
    }
    persistProfile(ended);
    setSessionSummary(summary);

    await submitLearningEvents([
      createLearningEvent(
        LearningEventType.SESSION_END,
        summary,
        { studentId, sessionId: summary.sessionId }
      ),
      createLearningEvent(
        LearningEventType.PROFILE_SNAPSHOT,
        {
          profile: ended,
          insights: buildPersonalizationInsights(ended, {
            subject: summary.subject,
            topic: summary.topic,
          }),
        },
        { studentId, sessionId: summary.sessionId }
      ),
    ]);

    await flushEventQueue();
    trackerRef.current = null;
    return summary;
  }, [
    persistProfile,
    studentId,
    lastSessionReflection,
    reviewMode,
    reviewSkill,
    reviewId,
    challengeMode,
    subjectName,
    topicName,
  ]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") flushEventQueue();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    return () => {
      if (trackerRef.current) {
        const summary = trackerRef.current.summarize();
        if (!summary.turnCount) {
          markSessionDropOff(summary.sessionId, {
            subject: summary.subject,
            topic: summary.topic,
            reason: "unmount",
          });
        }
        const ended = applySessionEnd(profileRef.current, summary);
        saveLearningProfile(ended);
        submitLearningEvents(
          createLearningEvent(
            LearningEventType.SESSION_END,
            summary,
            { studentId, sessionId: summary.sessionId }
          )
        );
        trackerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Apply a saved resume snapshot (Epic A2).
   * Intervention is restored as *offered* when it was active — student opts in.
   */
  const applyResumeSnapshot = useCallback(
    (snapshot) => {
      if (!snapshot) return;
      const inter = snapshot.intervention;
      if (
        inter &&
        (inter.status === "active" ||
          inter.status === "offered" ||
          inter.restoredFromSnapshot)
      ) {
        const level =
          inter.level ??
          inter.context?.level ??
          InterventionLevel.FULL_GUIDE;
        const context =
          inter.context ||
          describeInterventionContext({
            subject: subjectName,
            topic: topicName,
            consecutiveIncorrect: 0,
            reason: inter.reason || "resume",
            profile: profileRef.current,
            forcedLevel: level,
            grade: student?.grade || null,
          });
        const levelLabel = context.levelLabel || levelMeta(level).label;
        syncInterventionState({
          status: InterventionStatus.OFFERED,
          reason: inter.reason || "resume",
          context: {
            ...context,
            level: context.level ?? level,
            headline: context.headline || "Welcome back",
            body:
              context.body ||
              `You were using ${levelLabel.toLowerCase()} last time. Want to continue that help, or practice on your own?`,
          },
          autoEntered: false,
          level: context.level ?? level,
          escalate: false,
          restoredFromSnapshot: true,
        });
      }
      if (snapshot.tools && trackerRef.current) {
        trackerRef.current.setTools(snapshot.tools);
      }
    },
    [subjectName, topicName, syncInterventionState, student?.grade]
  );

  const getSessionId = useCallback(
    () => trackerRef.current?.sessionId || trackerRef.current?.id || null,
    []
  );

  return {
    profile,
    insights,
    lastSignals,
    sessionSummary,
    intervention,
    softNudge,
    struggleSnapshot,
    affectCheckIn,
    sessionReflection,
    lastSessionReflection,
    persistenceNote,
    challengeProgress,
    lastCheckInResponse,
    exampleLibrary,
    activeMisconceptionHits,
    beginSession,
    endSession,
    requestSessionReflection,
    respondSessionReflection,
    dismissSessionReflection,
    recordExchange,
    recordToolToggle,
    recordTopicSwitch,
    markAwaitingStudent,
    noteInputModality,
    offerIntervention,
    acceptIntervention,
    declineIntervention,
    exitIntervention,
    requestInterventionLevel,
    requestLibraryExample,
    escalateIntervention,
    dismissSoftNudge,
    acceptSoftNudgeHelp,
    checkIdleStruggle,
    maybePromptAffectCheckIn,
    promptSessionStartEnergyCheckIn,
    waitForSessionStartEnergy,
    respondAffectCheckIn,
    dismissAffectCheckIn,
    dismissPersistenceNote,
    applyResumeSnapshot,
    getSessionId,
  };
}
