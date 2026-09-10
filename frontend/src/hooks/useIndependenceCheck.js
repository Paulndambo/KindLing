import { useCallback, useEffect, useState } from "react";
import {
  shouldOfferIndependenceTwin,
  buildIndependenceOfferCard,
  createIndependenceSession,
  applyIndependenceAnswer,
  completeIndependenceAfterExplain,
  declineIndependenceOffer,
  skipIndependenceSession,
  independenceCelebrationCopy,
  preferTransferForLadder,
  IndependencePhase,
  HEAVY_HELP_MIN_LEVEL,
} from "../services/learning/independenceCheck";
import {
  LearningEventType,
  createLearningEvent,
  submitLearningEvents,
  levelMeta,
} from "../services/learning";
import { trackMetric } from "../services/telemetry";

/**
 * Epic L4 — post-ladder no-scaffold independence twin.
 */
export function useIndependenceCheck({
  studentId,
  subjectName,
  topicName,
  getSessionId = () => null,
  unitName = "",
  skillSlugs = [],
  onGradedItem = null,
}) {
  const [offer, setOffer] = useState(null);
  const [session, setSession] = useState(null);
  const [offeredThisSession, setOfferedThisSession] = useState(false);
  const [completedThisSession, setCompletedThisSession] = useState(false);
  const [lastOutcome, setLastOutcome] = useState(null);
  /** Track success while help is active for offer gating */
  const [successDuringHelp, setSuccessDuringHelp] = useState(false);

  useEffect(() => {
    setOffer(null);
    setSession(null);
    setOfferedThisSession(false);
    setCompletedThisSession(false);
    setLastOutcome(null);
    setSuccessDuringHelp(false);
  }, [subjectName, topicName]);

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

  const noteScaffoldedSuccess = useCallback(() => {
    setSuccessDuringHelp(true);
  }, []);

  const clearScaffoldedSuccess = useCallback(() => {
    setSuccessDuringHelp(false);
  }, []);

  const active =
    Boolean(session) &&
    (session.status === IndependencePhase.ACTIVE ||
      session.status === IndependencePhase.EXPLAINING ||
      session.phase === IndependencePhase.ACTIVE ||
      session.phase === IndependencePhase.EXPLAINING);

  const completed = session?.status === IndependencePhase.COMPLETED;

  const maybeOfferAfterLadderExit = useCallback(
    ({
      ladderLevel = 0,
      ladderLevelId = "",
      hadGradedSuccess = null,
      assessmentActive = false,
      multiStepActive = false,
    } = {}) => {
      const ok = shouldOfferIndependenceTwin({
        ladderLevel,
        hadGradedSuccessDuringHelp:
          hadGradedSuccess != null ? hadGradedSuccess : successDuringHelp,
        alreadyOfferedThisSession: offeredThisSession,
        alreadyCompletedThisSession: completedThisSession,
        assessmentActive,
        multiStepActive,
        interventionActive: false,
      });
      if (!ok) return null;

      const transfer = preferTransferForLadder(ladderLevel);
      const card = buildIndependenceOfferCard({
        topic: topicName,
        skillLabel: topicName,
        transfer,
        ladderLevel,
      });
      card.ladderLevelId = ladderLevelId || levelMeta(ladderLevel).id;
      setOffer(card);
      setOfferedThisSession(true);
      emit(LearningEventType.INDEPENDENCE_OFFERED, {
        transfer: card.transfer,
        ladderLevel: card.ladderLevel,
        ladderLevelId: card.ladderLevelId,
        phase: "offered",
      });
      trackMetric("independence.offered", {
        sessionId: getSessionId?.(),
        tags: {
          level: String(card.ladderLevel),
          transfer: card.transfer ? "1" : "0",
        },
      });
      return card;
    },
    [
      successDuringHelp,
      offeredThisSession,
      completedThisSession,
      topicName,
      emit,
      getSessionId,
    ]
  );

  const declineOffer = useCallback(() => {
    if (offer) {
      emit(LearningEventType.INDEPENDENCE_DECLINED, {
        transfer: offer.transfer,
        ladderLevel: offer.ladderLevel,
        phase: "declined",
      });
      trackMetric("independence.declined", {
        sessionId: getSessionId?.(),
      });
    }
    setOffer(null);
    declineIndependenceOffer();
  }, [offer, emit, getSessionId]);

  const startTwin = useCallback(
    ({ ladderLevel, ladderLevelId, transfer } = {}) => {
      const level = ladderLevel ?? offer?.ladderLevel ?? HEAVY_HELP_MIN_LEVEL;
      const preferTransfer =
        transfer != null ? transfer : preferTransferForLadder(level);
      const ses = createIndependenceSession({
        subject: subjectName,
        topic: topicName,
        unit: unitName,
        skillSlugs,
        ladderLevel: level,
        ladderLevelId: ladderLevelId || offer?.ladderLevelId || "",
        preferTransfer,
        source: "post_ladder",
      });
      if (!ses) {
        setOffer(null);
        return null;
      }
      setOffer(null);
      setSession(ses);
      emit(LearningEventType.INDEPENDENCE_STARTED, {
        independenceId: ses.id,
        transfer: ses.transfer,
        ladderLevel: ses.ladderLevel,
        ladderLevelId: ses.ladderLevelId,
        questionId: ses.questions?.[0]?.id,
        skillSlug: ses.skillSlug,
        noScaffold: true,
        phase: "started",
      });
      trackMetric("independence.started", {
        sessionId: getSessionId?.(),
        tags: {
          transfer: ses.transfer ? "1" : "0",
          level: String(ses.ladderLevel),
        },
      });
      return ses;
    },
    [offer, subjectName, topicName, unitName, skillSlugs, emit, getSessionId]
  );

  const answerTwin = useCallback(
    (selectedIndex) => {
      if (!session) return null;
      const { session: next, result } = applyIndependenceAnswer(
        session,
        selectedIndex
      );
      if (!result) return null;
      setSession(next);
      emit(LearningEventType.INDEPENDENCE_ANSWERED, {
        independenceId: next.id,
        questionId: result.questionId,
        correct: result.correct,
        correctness: result.correctness,
        transfer: next.transfer,
        noScaffold: true,
        ladderLevel: next.ladderLevel,
        skillSlug: result.skillSlug,
        phase: "answered",
      });
      trackMetric("independence.answered", {
        sessionId: getSessionId?.(),
        tags: {
          correct: result.correct ? "1" : "0",
          transfer: next.transfer ? "1" : "0",
        },
      });
      if (typeof onGradedItem === "function") {
        try {
          onGradedItem({
            correctness: result.correctness,
            skillSlug: result.skillSlug,
            concept: result.concept,
            questionId: result.questionId,
            studentText: result.selectedText,
            tutorText: result.explanation,
            expected: result.correctText,
            independenceTwin: true,
            noScaffold: true,
            transfer: next.transfer,
          });
        } catch {
          /* non-fatal */
        }
      }
      return { session: next, result };
    },
    [session, emit, getSessionId, onGradedItem]
  );

  const continueAfterExplain = useCallback(() => {
    if (!session) return null;
    const { session: next, completed: done, outcome, score } =
      completeIndependenceAfterExplain(session);
    setSession(next);
    if (done && outcome) {
      setCompletedThisSession(true);
      setLastOutcome(outcome);
      setSuccessDuringHelp(false);
      const celeb = independenceCelebrationCopy(next);
      emit(LearningEventType.INDEPENDENCE_COMPLETED, {
        independenceId: next.id,
        ...outcome,
        phase: "completed",
      });
      trackMetric("independence.completed", {
        sessionId: getSessionId?.(),
        tags: {
          success: outcome.success ? "1" : "0",
          transfer: outcome.transfer ? "1" : "0",
        },
      });
      return { session: next, completed: true, outcome, score, celebration: celeb };
    }
    return { session: next, completed: false };
  }, [session, emit, getSessionId]);

  const exitTwin = useCallback(() => {
    if (!session) {
      setOffer(null);
      return null;
    }
    const skipped = skipIndependenceSession(session);
    setSession(skipped);
    setLastOutcome(skipped?.outcome || null);
    emit(LearningEventType.INDEPENDENCE_SKIPPED, {
      independenceId: session.id,
      transfer: session.transfer,
      ladderLevel: session.ladderLevel,
      phase: "skipped",
    });
    return skipped;
  }, [session, emit]);

  return {
    independenceOffer: offer,
    independenceSession: session,
    independenceActive: active,
    independenceCompleted: completed,
    independenceOutcome: lastOutcome || session?.outcome || null,
    maybeOfferAfterLadderExit,
    declineIndependenceOffer: declineOffer,
    startIndependenceTwin: startTwin,
    answerIndependenceTwin: answerTwin,
    continueIndependenceExplain: continueAfterExplain,
    exitIndependenceTwin: exitTwin,
    noteScaffoldedSuccess,
    clearScaffoldedSuccess,
  };
}
