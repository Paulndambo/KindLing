import { useCallback, useEffect, useRef, useState } from "react";
import {
  LearningEventType,
  InterventionStatus,
  analyzeExchange,
  loadLearningProfile,
  saveLearningProfile,
  applyExchangeToProfile,
  applySessionStart,
  applySessionEnd,
  buildPersonalizationInsights,
  submitLearningEvents,
  flushEventQueue,
  createLearningEvent,
  createSessionTracker,
  newSessionId,
  evaluateInterventionTrigger,
  describeInterventionContext,
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
export function useStudentLearning({ student, subjectName, topicName, tools }) {
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
  });

  const trackerRef = useRef(null);
  const profileRef = useRef(profile);
  const lastModalityRef = useRef("text");
  const toolsRef = useRef(tools);
  const interventionRef = useRef(intervention);

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

  const insights = buildPersonalizationInsights(profile, {
    subject: subjectName,
    topic: topicName,
  });

  const persistProfile = useCallback((next) => {
    profileRef.current = next;
    setProfile(next);
    saveLearningProfile(next);
  }, []);

  const syncInterventionState = useCallback((next) => {
    interventionRef.current = next;
    setIntervention(next);
    trackerRef.current?.setIntervention({
      status: next.status,
      reason: next.reason,
      topic: next.context?.topic,
      subject: next.context?.subject,
      autoEntered: next.autoEntered,
    });
  }, []);

  /**
   * Start (or restart) a tracked lesson session.
   */
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
    syncInterventionState({
      status: InterventionStatus.IDLE,
      reason: null,
      context: null,
      autoEntered: false,
    });

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

    return sessionId;
  }, [studentId, subjectName, topicName, student, persistProfile, syncInterventionState]);

  const markAwaitingStudent = useCallback(() => {
    trackerRef.current?.markPromptReady();
  }, []);

  const noteInputModality = useCallback((modality) => {
    lastModalityRef.current = modality === "voice" ? "voice" : "text";
  }, []);

  /**
   * Offer intervention (student can accept or decline).
   */
  const offerIntervention = useCallback(
    ({ reason = "incorrect_streak", autoEnter = false } = {}) => {
      const tracker = trackerRef.current;
      const context = describeInterventionContext({
        subject: tracker?.subject || subjectName,
        topic: tracker?.topic || topicName,
        consecutiveIncorrect: tracker?.consecutiveIncorrect || 0,
        reason,
      });

      if (autoEnter) {
        syncInterventionState({
          status: InterventionStatus.ACTIVE,
          reason,
          context,
          autoEntered: true,
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
          },
          { studentId, sessionId: tracker?.id }
        )
      );
      return { action: "offer", context };
    },
    [studentId, subjectName, topicName, syncInterventionState]
  );

  /** Student accepts offered guide (or requests guide manually). */
  const acceptIntervention = useCallback(() => {
    const tracker = trackerRef.current;
    const prev = interventionRef.current;
    const context =
      prev.context ||
      describeInterventionContext({
        subject: tracker?.subject || subjectName,
        topic: tracker?.topic || topicName,
        consecutiveIncorrect: tracker?.consecutiveIncorrect || 0,
        reason: prev.reason || "student_request",
      });

    syncInterventionState({
      status: InterventionStatus.ACTIVE,
      reason: prev.reason || "student_request",
      context,
      autoEntered: false,
    });

    submitLearningEvents(
      createLearningEvent(
        LearningEventType.INTERVENTION_ENTERED,
        {
          sessionId: tracker?.id,
          subject: context.subject,
          topic: context.topic,
          reason: prev.reason || "student_request",
          autoEntered: false,
          consecutiveIncorrect: context.consecutiveIncorrect,
        },
        { studentId, sessionId: tracker?.id }
      )
    );

    return context;
  }, [studentId, subjectName, topicName, syncInterventionState]);

  /** Student declines the offer — stay in normal lesson. */
  const declineIntervention = useCallback(() => {
    const tracker = trackerRef.current;
    const prev = interventionRef.current;

    submitLearningEvents(
      createLearningEvent(
        LearningEventType.INTERVENTION_DECLINED,
        {
          sessionId: tracker?.id,
          subject: prev.context?.subject || subjectName,
          topic: prev.context?.topic || topicName,
          reason: prev.reason,
        },
        { studentId, sessionId: tracker?.id }
      )
    );

    syncInterventionState({
      status: InterventionStatus.IDLE,
      reason: null,
      context: null,
      autoEntered: false,
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
          durationMs: prev.context
            ? null
            : null,
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
    });
  }, [studentId, subjectName, topicName, syncInterventionState]);

  /**
   * Core: student message + tutor reply → signals → profile → API → maybe intervene.
   */
  const recordExchange = useCallback(
    async ({ studentText, tutorText, wasHintRequest = false }) => {
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

      tracker.recordTurn({
        studentText,
        tutorText,
        signals,
        inputModality,
      });

      tracker.markPromptReady();

      const nextProfile = applyExchangeToProfile(profileRef.current, {
        subject: tracker.subject,
        topic: tracker.topic,
        signals,
      });
      persistProfile(nextProfile);
      setLastSignals(signals);

      const liveSummary = {
        accuracy: tracker.summarize().accuracy,
        counters: tracker.snapshot.counters,
        turnCount: tracker.snapshot.turns.length,
      };
      setSessionSummary(liveSummary);

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
            profileDigest: {
              exchanges: nextProfile.totals.exchanges,
              focusAreas: nextProfile.focusAreas,
              strengths: nextProfile.strengths,
              hintRate: nextProfile.behavior.hintRate,
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

      // Struggle detection — only when not already guiding
      let interventionAction = null;
      if (interventionRef.current.status === InterventionStatus.IDLE) {
        const decision = evaluateInterventionTrigger({
          consecutiveIncorrect: tracker.consecutiveIncorrect,
          currentStatus: interventionRef.current.status,
          affect: signals.affect,
          consecutiveHints: tracker.consecutiveHints,
        });

        if (decision.shouldAutoEnter || decision.shouldOffer) {
          interventionAction = offerIntervention({
            reason: decision.reason,
            autoEnter: decision.shouldAutoEnter,
          });
          trackMetric(
            decision.shouldAutoEnter
              ? "intervention.auto_entered"
              : "intervention.offered",
            {
              sessionId: tracker.id,
              tags: { reason: decision.reason },
            }
          );
        }
      }

      return { signals, interventionAction };
    },
    [persistProfile, studentId, offerIntervention]
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
    },
    [studentId, syncInterventionState]
  );

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
    const ended = applySessionEnd(profileRef.current, summary);
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
  }, [persistProfile, studentId]);

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
        const context =
          inter.context ||
          describeInterventionContext({
            subject: subjectName,
            topic: topicName,
            consecutiveIncorrect: 0,
            reason: inter.reason || "resume",
          });
        syncInterventionState({
          status: InterventionStatus.OFFERED,
          reason: inter.reason || "resume",
          context: {
            ...context,
            headline: context.headline || "Welcome back",
            body:
              context.body ||
              "You were working with step-by-step help last time. Want to continue that guide, or practice on your own?",
          },
          autoEntered: false,
          restoredFromSnapshot: true,
        });
      }
      if (snapshot.tools && trackerRef.current) {
        trackerRef.current.setTools(snapshot.tools);
      }
    },
    [subjectName, topicName, syncInterventionState]
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
    beginSession,
    endSession,
    recordExchange,
    recordToolToggle,
    recordTopicSwitch,
    markAwaitingStudent,
    noteInputModality,
    offerIntervention,
    acceptIntervention,
    declineIntervention,
    exitIntervention,
    applyResumeSnapshot,
    getSessionId,
  };
}
