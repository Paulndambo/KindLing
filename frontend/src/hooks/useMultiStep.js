import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createMultiStepSession,
  applyStepAttempt,
  skipCurrentStep,
  scorePartialCredit,
  multiStepSummary,
  multiStepToCorrectness,
} from "../services/learning/multiStepEngine";
import { problemsForTopic } from "../services/learning/multiStepProblems";
import {
  LearningEventType,
  createLearningEvent,
  submitLearningEvents,
} from "../services/learning";
import { trackMetric } from "../services/telemetry";
import { getMultiStepProblems } from "../services/api/learning";

function normalizeRemoteProblem(p) {
  if (!p) return null;
  return {
    id: p.id || p.slug,
    skillSlug: p.skillSlug,
    subject: p.subject,
    topics: p.topics || [],
    title: p.title,
    prompt: p.prompt,
    promptPlain: p.promptPlain || p.prompt,
    finalExpected: p.finalExpected,
    finalAlts: p.finalAlts || [],
    steps: p.steps || [],
  };
}

/**
 * Epic B6 — multi-step show-your-work session for a lesson topic.
 */
export function useMultiStep({
  studentId,
  subjectName,
  topicName,
  getSessionId = () => null,
}) {
  const [session, setSession] = useState(null);
  const [available, setAvailable] = useState(() =>
    problemsForTopic(subjectName, topicName)
  );
  const [lastStepResult, setLastStepResult] = useState(null);

  useEffect(() => {
    setSession(null);
    setLastStepResult(null);
    setAvailable(problemsForTopic(subjectName, topicName));
    let cancelled = false;
    getMultiStepProblems({ subject: subjectName, topic: topicName })
      .then((data) => {
        if (cancelled) return;
        const remote = (data?.problems || [])
          .map(normalizeRemoteProblem)
          .filter((p) => p?.steps?.length);
        if (remote.length) setAvailable(remote);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [subjectName, topicName]);

  const active = Boolean(session && session.status === "active");
  const completed = session?.status === "completed";
  const partialCredit = useMemo(() => scorePartialCredit(session), [session]);

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

  const startMultiStep = useCallback(
    (problemId = null) => {
      const problem =
        (problemId && available.find((p) => p.id === problemId)) ||
        available[0] ||
        problemsForTopic(subjectName, topicName)[0] ||
        null;
      if (!problem) return null;
      const ses = createMultiStepSession(problem);
      if (!ses) return null;
      setSession(ses);
      setLastStepResult(null);
      emit(LearningEventType.MULTISTEP_STARTED, {
        problemId: ses.problemId,
        title: ses.problem?.title,
        skillSlug: ses.problem?.skillSlug,
        stepCount: ses.steps?.length,
      });
      trackMetric("multistep.started", {
        sessionId: getSessionId?.(),
        tags: { problemId: ses.problemId },
      });
      return ses;
    },
    [available, subjectName, topicName, emit, getSessionId]
  );

  const recordStepAnswer = useCallback(
    (studentText, { tutorText = "" } = {}) => {
      if (!session || session.status !== "active") return null;
      const result = applyStepAttempt(session, studentText, { tutorText });
      setSession(result.session);
      setLastStepResult(result.stepResult);
      const credit = result.partialCredit;

      emit(LearningEventType.MULTISTEP_STEP, {
        problemId: result.session.problemId,
        stepIndex: result.stepResult?.stepIndex,
        stepId: result.stepResult?.stepId,
        correctness: result.stepResult?.correctness,
        advanced: result.advanced,
        partialCredit: credit,
        studentText,
      });

      if (result.completed) {
        emit(LearningEventType.MULTISTEP_COMPLETED, {
          problemId: result.session.problemId,
          partialCredit: credit,
          finalCorrect: result.session.finalCorrect,
          summary: multiStepSummary(result.session),
        });
        trackMetric("multistep.completed", {
          sessionId: getSessionId?.(),
          tags: {
            problemId: result.session.problemId,
            percent: String(credit.percent),
          },
        });
      }

      return {
        ...result,
        gradedCorrectness: multiStepToCorrectness(credit, {
          completed: result.completed,
        }),
      };
    },
    [session, emit, getSessionId]
  );

  const skipMultiStep = useCallback(() => {
    setSession((prev) => (prev ? skipCurrentStep(prev) : prev));
  }, []);

  const exitMultiStep = useCallback(() => {
    setSession((prev) => {
      if (!prev) return null;
      emit(LearningEventType.MULTISTEP_EXITED, {
        problemId: prev.problemId,
        partialCredit: scorePartialCredit(prev),
        summary: multiStepSummary(prev),
        status: prev.status,
      });
      trackMetric("multistep.exited", {
        sessionId: getSessionId?.(),
        tags: { problemId: prev.problemId },
      });
      return null;
    });
    setLastStepResult(null);
  }, [emit, getSessionId]);

  return {
    multiStepSession: session,
    multiStepActive: active,
    multiStepCompleted: completed,
    multiStepAvailable: available.length > 0,
    multiStepProblems: available,
    multiStepPartialCredit: partialCredit,
    multiStepCurrentStep: session?.steps?.[session.currentIndex] || null,
    multiStepLastResult: lastStepResult,
    multiStepSummary: multiStepSummary(session),
    startMultiStep,
    recordStepAnswer,
    skipMultiStep,
    exitMultiStep,
  };
}
