import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAssessmentSession,
  applyAssessmentAnswer,
  advanceAssessment,
  exitAssessment,
  scoreAssessment,
  assessmentToCorrectness,
  assessmentCelebrationCopy,
  buildAssessmentOfferCard,
  shouldOfferAssessment,
  AssessmentPhase,
  ASSESSMENT_DEFAULT_COUNT,
} from "../services/learning/assessmentEngine";
import { questionsForTopic } from "../services/learning/assessmentBank";
import {
  LearningEventType,
  createLearningEvent,
  submitLearningEvents,
} from "../services/learning";
import { trackMetric } from "../services/telemetry";

/**
 * Epic C6 — low-stakes MCQ assessment for a lesson topic.
 * Offline-first; does not require live AI.
 */
export function useAssessment({
  studentId,
  subjectName,
  topicName,
  getSessionId = () => null,
  /** optional: feed each graded item into mastery / profile */
  onGradedItem = null,
}) {
  const [session, setSession] = useState(null);
  const [offer, setOffer] = useState(null);
  const [offeredThisTopic, setOfferedThisTopic] = useState(false);
  const [prePostBaseline, setPrePostBaseline] = useState(null);
  const [availableCount, setAvailableCount] = useState(() =>
    questionsForTopic(subjectName, topicName, { limit: 10 }).length
  );
  const prePostAvailable = ["A", "B"].every((form) =>
    questionsForTopic(subjectName, topicName, { form, limit: 10 }).length >= 2
  );

  useEffect(() => {
    setSession(null);
    setOffer(null);
    setOfferedThisTopic(false);
    setPrePostBaseline(null);
    setAvailableCount(
      questionsForTopic(subjectName, topicName, { limit: 10 }).length
    );
  }, [subjectName, topicName]);

  const active =
    Boolean(session) &&
    (session.status === AssessmentPhase.ACTIVE ||
      session.phase === AssessmentPhase.EXPLAINING);
  const completed = session?.status === AssessmentPhase.COMPLETED;
  const score = useMemo(() => scoreAssessment(session), [session]);

  const emit = useCallback(
    (type, payload = {}) => {
      const sessionId = getSessionId?.() || null;
      submitLearningEvents(
        createLearningEvent(
          type,
          {
            sessionId,
            subject: subjectName,
            topic: topicName,
            ...payload,
          },
          { studentId, sessionId }
        )
      );
    },
    [getSessionId, studentId, subjectName, topicName]
  );

  const offerAssessment = useCallback(
    ({ reason = "ready" } = {}) => {
      if (active || completed) return null;
      const card = buildAssessmentOfferCard({
        topic: topicName,
        subject: subjectName,
        reason,
      });
      // Emphasize that the check is about this lesson concept
      if (topicName) {
        card.body = `A few questions on «${topicName}» — one at a time — with a short tutor note after each answer.`;
        card.headline = `Quick check: ${topicName}`;
      }
      setOffer(card);
      setOfferedThisTopic(true);
      trackMetric("assessment.offered", {
        sessionId: getSessionId?.(),
        tags: { reason, topic: topicName },
      });
      return card;
    },
    [active, completed, topicName, subjectName, getSessionId]
  );

  const dismissOffer = useCallback(() => {
    setOffer(null);
  }, []);

  const maybeOfferFromSignals = useCallback(
    ({ correctStreak = 0, gradedCorrect = 0, messageCount = 0 } = {}) => {
      if (
        !shouldOfferAssessment({
          correctStreak,
          gradedCorrect,
          alreadyOffered: offeredThisTopic,
          assessmentActive: active || completed,
          messageCount,
        })
      ) {
        return null;
      }
      return offerAssessment({ reason: "ready" });
    },
    [offeredThisTopic, active, completed, offerAssessment]
  );

  const startAssessment = useCallback(
    ({
      count = ASSESSMENT_DEFAULT_COUNT,
      timed = false,
      skillSlug = "",
      skillSlugs = [],
      unit = "",
      source = "manual",
      form = "",
      purpose = "practice",
      baseline = null,
    } = {}) => {
      const ses = createAssessmentSession({
        subject: subjectName,
        topic: topicName,
        unit: unit || "",
        skillSlug,
        skillSlugs,
        count,
        timed,
        source,
        form,
        purpose,
        baseline,
      });
      if (!ses) return null;
      setOffer(null);
      setOfferedThisTopic(true);
      setSession(ses);
      emit(LearningEventType.ASSESSMENT_STARTED, {
        assessmentId: ses.id,
        questionCount: ses.questions.length,
        skillSlug: ses.skillSlug,
        skillSlugs: ses.skillSlugs || [],
        unit: ses.unit || "",
        topic: topicName,
        timed: ses.timed,
        source: ses.source,
        purpose: ses.purpose,
        form: ses.form,
      });
      trackMetric("assessment.started", {
        sessionId: getSessionId?.(),
        tags: {
          count: String(ses.questions.length),
          source: ses.source,
          topic: topicName,
          skill: ses.skillSlug || "",
        },
      });
      return ses;
    },
    [subjectName, topicName, emit, getSessionId]
  );

  const answerQuestion = useCallback(
    (selectedIndex, { timedOut = false } = {}) => {
      if (!session) return null;
      const { session: next, result } = applyAssessmentAnswer(
        session,
        selectedIndex,
        { timedOut }
      );
      if (!result) return null;
      setSession(next);

      emit(LearningEventType.ASSESSMENT_ANSWERED, {
        assessmentId: next.id,
        questionId: result.questionId,
        questionIndex: result.questionIndex,
        selectedIndex: result.selectedIndex,
        correct: result.correct,
        correctness: result.correctness,
        timedOut: result.timedOut,
        skillSlug: result.skillSlug,
        concept: result.concept,
      });

      trackMetric("assessment.answered", {
        sessionId: getSessionId?.(),
        tags: {
          correct: result.correct ? "1" : "0",
          skill: result.skillSlug || "",
        },
      });

      // Feed mastery / learner pulse per item
      if (!result.timedOut && typeof onGradedItem === "function") {
        try {
          onGradedItem({
            correctness: result.correctness,
            skillSlug: result.skillSlug,
            concept: result.concept,
            questionId: result.questionId,
            studentText: result.selectedText,
            tutorText: result.explanation,
            expected: result.correctText,
          });
        } catch {
          /* non-fatal */
        }
      }

      return { session: next, result };
    },
    [session, emit, getSessionId, onGradedItem]
  );

  const continueAfterExplanation = useCallback(() => {
    if (!session) return null;
    const { session: next, completed: done } = advanceAssessment(session);
    if (done && next) {
      const sc = scoreAssessment(next);
      const celeb = assessmentCelebrationCopy(next);
      let completedSession = next;
      let learningGain = null;
      if (next.purpose === "pre") {
        setPrePostBaseline({
          assessmentId: next.id,
          correct: sc.correct,
          total: sc.total,
          percent: sc.percent,
          skillSlug: next.skillSlug,
          skillSlugs: next.skillSlugs || [],
          form: next.form || "A",
        });
      } else if (next.purpose === "post" && next.baseline) {
        learningGain = {
          baselineAssessmentId: next.baseline.assessmentId,
          baselineCorrect: next.baseline.correct,
          baselineTotal: next.baseline.total,
          baselinePercent: next.baseline.percent,
          postCorrect: sc.correct,
          postTotal: sc.total,
          postPercent: sc.percent,
          deltaPoints: sc.percent - Number(next.baseline.percent || 0),
        };
        completedSession = { ...next, learningGain };
      }
      setSession(completedSession);
      emit(LearningEventType.ASSESSMENT_COMPLETED, {
        assessmentId: next.id,
        correct: sc.correct,
        incorrect: sc.incorrect,
        total: sc.total,
        percent: sc.percent,
        passed: sc.passed,
        skillCounts: sc.skillCounts,
        skillSlug: next.skillSlug,
        source: next.source,
        purpose: next.purpose,
        form: next.form,
        ...(learningGain ? {
          baselineAssessmentId: learningGain.baselineAssessmentId,
          baselinePercent: learningGain.baselinePercent,
          postPercent: learningGain.postPercent,
          gainPoints: learningGain.deltaPoints,
        } : {}),
      });
      trackMetric("assessment.completed", {
        sessionId: getSessionId?.(),
        tags: {
          percent: String(sc.percent),
          correct: String(sc.correct),
          total: String(sc.total),
        },
      });
      return { session: completedSession, completed: true, score: sc, celebration: celeb };
    }
    setSession(next);
    return { session: next, completed: false };
  }, [session, emit, getSessionId]);

  const startPrePostBaseline = useCallback((options = {}) => startAssessment({ ...options, source: "pre_post_baseline", form: "A", purpose: "pre" }), [startAssessment]);
  const startPrePostFollowUp = useCallback(() => {
    if (!prePostBaseline) return null;
    return startAssessment({
      source: "pre_post_followup", form: "B", purpose: "post", baseline: prePostBaseline,
      skillSlug: prePostBaseline.skillSlug, skillSlugs: prePostBaseline.skillSlugs,
      count: prePostBaseline.total,
    });
  }, [prePostBaseline, startAssessment]);

  const exit = useCallback(() => {
    setSession((prev) => {
      if (!prev) return null;
      const exited = exitAssessment(prev);
      const sc = scoreAssessment(exited);
      emit(LearningEventType.ASSESSMENT_EXITED, {
        assessmentId: exited?.id,
        correct: sc.correct,
        answered: sc.answered,
        total: sc.total,
        percent: sc.percent,
        status: exited?.status,
      });
      trackMetric("assessment.exited", {
        sessionId: getSessionId?.(),
        tags: { answered: String(sc.answered) },
      });
      return null;
    });
    setOffer(null);
  }, [emit, getSessionId]);

  const clearCompleted = useCallback(() => {
    setSession(null);
  }, []);

  return {
    assessmentSession: session,
    assessmentActive: active,
    assessmentCompleted: completed,
    assessmentOffer: offer,
    assessmentAvailable: availableCount > 0,
    prePostAvailable,
    prePostBaseline,
    assessmentScore: score,
    assessmentCurrent: session
      ? session.questions?.[session.currentIndex] || null
      : null,
    assessmentLastResult: session?.lastResult || null,
    assessmentPhase: session?.phase || null,
    assessmentCelebration: completed
      ? assessmentCelebrationCopy(session)
      : null,
    assessmentGradedCorrectness: assessmentToCorrectness(score),
    startAssessment,
    startPrePostBaseline,
    startPrePostFollowUp,
    answerAssessment: answerQuestion,
    continueAssessment: continueAfterExplanation,
    exitAssessment: exit,
    offerAssessment,
    dismissAssessmentOffer: dismissOffer,
    maybeOfferAssessment: maybeOfferFromSignals,
    clearAssessmentCompleted: clearCompleted,
  };
}
