/**
 * Epic C6 — Low-stakes assessment session engine.
 *
 * One MCQ at a time → immediate grade → tutor explanation (revision) → next.
 * Separate from open chat; offline-capable via assessmentBank.
 */

import {
  filterQuestionsForCoveredLesson,
  questionsForTopic,
  getAssessmentQuestion,
} from "./assessmentBank";

export const ASSESSMENT_DEFAULT_COUNT = 5;

export const AssessmentPhase = {
  OFFERED: "offered",
  ACTIVE: "active",
  EXPLAINING: "explaining",
  COMPLETED: "completed",
  EXITED: "exited",
};

/**
 * @param {object} opts
 * @param {string} [opts.subject]
 * @param {string} [opts.topic] active subtopic / lesson leaf
 * @param {string} [opts.unit] parent topic unit name
 * @param {string} [opts.skillSlug]
 * @param {string[]} [opts.skillSlugs] skills for the current lesson
 * @param {number} [opts.count]
 * @param {boolean} [opts.timed]
 * @param {number} [opts.secondsPerQuestion]
 * @param {string} [opts.source] how the check was started
 * @param {string} [opts.form] Optional Math Foundations parallel form (A/B)
 * @param {string} [opts.purpose] practice | pre | post
 * @param {object|null} [opts.baseline] Completed before-check summary for post form
 * @param {string} [opts.coveredText] Tutor transcript to restrict lesson checks
 */
export function createAssessmentSession({
  subject = "",
  topic = "",
  unit = "",
  skillSlug = "",
  skillSlugs = [],
  count = ASSESSMENT_DEFAULT_COUNT,
  timed = false,
  secondsPerQuestion = 45,
  source = "manual",
  form = "",
  purpose = "practice",
  baseline = null,
  questions: providedQuestions = null,
  coveredText = undefined,
} = {}) {
  const n = Math.min(10, Math.max(3, Number(count) || ASSESSMENT_DEFAULT_COUNT));
  const slugs = [
    ...new Set(
      [...(Array.isArray(skillSlugs) ? skillSlugs : []), skillSlug].filter(Boolean)
    ),
  ];
  const candidateQuestions = Array.isArray(providedQuestions)
    ? providedQuestions
    : questionsForTopic(subject, topic, {
        skillSlug: slugs[0] || "",
        skillSlugs: slugs,
        unit,
        limit: n,
        form,
        ...(typeof coveredText === "string" ? { coveredText } : {}),
      });
  const relevantQuestions = typeof coveredText === "string"
    ? filterQuestionsForCoveredLesson(candidateQuestions, {
        subject,
        topic,
        coveredText,
        limit: n,
      })
    : candidateQuestions.slice(0, n);
  const questions = relevantQuestions.map((q) => ({
    ...q,
    // freeze options snapshot
    options: (q.options || []).map((o) => ({ ...o })),
  }));

  if (!questions.length) return null;

  return {
    id: `assess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    status: AssessmentPhase.ACTIVE,
    phase: AssessmentPhase.ACTIVE,
    subject: subject || "",
    topic: topic || "",
    unit: unit || "",
    skillSlug: slugs[0] || questions[0]?.skillSlug || "",
    skillSlugs: slugs,
    source: source || "manual",
    purpose: ["pre", "post"].includes(purpose) ? purpose : "practice",
    form: ["A", "B"].includes(form) ? form : "",
    baseline: purpose === "post" ? baseline : null,
    timed: Boolean(timed),
    secondsPerQuestion: Math.max(15, Number(secondsPerQuestion) || 45),
    questions,
    currentIndex: 0,
    questionStartedAt: Date.now(),
    /** @type {Array<{ questionId: string, selectedIndex: number, correct: boolean, explanation: string, at: number }>} */
    answers: [],
    startedAt: Date.now(),
    completedAt: null,
    lastResult: null,
  };
}

export function currentQuestion(session) {
  if (!session?.questions?.length) return null;
  const i = session.currentIndex ?? 0;
  if (i < 0 || i >= session.questions.length) return null;
  return session.questions[i];
}

/**
 * Grade a selected option index for the current question.
 * Moves phase to EXPLAINING and stores lastResult.
 */
export function applyAssessmentAnswer(session, selectedIndex, { timedOut = false } = {}) {
  if (!session || session.status !== AssessmentPhase.ACTIVE) {
    return { session, advanced: false };
  }
  if (session.phase === AssessmentPhase.EXPLAINING) {
    return { session, advanced: false };
  }

  const q = currentQuestion(session);
  if (!q) return { session, advanced: false };

  timedOut = Boolean(
    timedOut ||
      (session.timed &&
        Date.now() >=
          (session.questionStartedAt || Date.now()) +
            (session.secondsPerQuestion || 45) * 1000)
  );

  const idx = timedOut ? null : Number(selectedIndex);
  if (
    !timedOut &&
    (selectedIndex == null ||
      !Number.isFinite(idx) ||
      idx < 0 ||
      idx >= (q.options?.length || 0))
  ) {
    return { session, advanced: false };
  }

  const correct = !timedOut && idx === q.correctIndex;
  const explanation = correct
    ? q.explanationCorrect || "Solid — that idea is locked in."
    : timedOut
      ? "That one ran out of time. Take a look at the idea, then keep going at your own pace."
      : q.explanationIncorrect ||
        "Not this time — revisit the idea, then try the next one.";

  const result = {
    questionId: q.id,
    questionIndex: session.currentIndex,
    selectedIndex: idx,
    correctIndex: q.correctIndex,
    correct,
    correctness: timedOut ? "unanswered" : correct ? "correct" : "incorrect",
    timedOut: Boolean(timedOut),
    explanation,
    concept: q.concept || "",
    skillSlug: q.skillSlug || "",
    prompt: q.prompt,
    selectedText: idx == null ? "" : q.options[idx]?.text || "",
    correctText: q.options[q.correctIndex]?.text || "",
    at: Date.now(),
  };

  const answers = [...(session.answers || []), result];
  const next = {
    ...session,
    phase: AssessmentPhase.EXPLAINING,
    answers,
    lastResult: result,
  };

  return { session: next, advanced: false, result };
}

/**
 * After reading the explanation, advance to next question or complete.
 */
export function advanceAssessment(session) {
  if (!session) return { session: null, completed: false };
  if (session.status === AssessmentPhase.COMPLETED) {
    return { session, completed: true };
  }
  if (session.phase !== AssessmentPhase.EXPLAINING) {
    return { session, completed: false };
  }

  const nextIndex = (session.currentIndex || 0) + 1;
  if (nextIndex >= (session.questions?.length || 0)) {
    const completed = {
      ...session,
      status: AssessmentPhase.COMPLETED,
      phase: AssessmentPhase.COMPLETED,
      currentIndex: nextIndex,
      completedAt: Date.now(),
      lastResult: session.lastResult,
    };
    return { session: completed, completed: true };
  }

  return {
    session: {
      ...session,
      phase: AssessmentPhase.ACTIVE,
      currentIndex: nextIndex,
      questionStartedAt: Date.now(),
      lastResult: null,
    },
    completed: false,
  };
}

export function exitAssessment(session) {
  if (!session) return null;
  if (session.status === AssessmentPhase.COMPLETED) return session;
  return {
    ...session,
    status: AssessmentPhase.EXITED,
    phase: AssessmentPhase.EXITED,
    completedAt: Date.now(),
  };
}

/**
 * Score summary for mastery feed + UI.
 */
export function scoreAssessment(session) {
  const answers = session?.answers || [];
  const total = session?.questions?.length || answers.length || 0;
  const correct = answers.filter((a) => a.correct).length;
  const incorrect = answers.filter((a) => a && a.correct === false && !a.timedOut).length;
  const unanswered = answers.filter((a) => a?.timedOut).length;
  const answered = answers.length - unanswered;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const skillCounts = {};
  for (const a of answers) {
    if (a.timedOut) continue;
    const slug = a.skillSlug || "unknown";
    if (!skillCounts[slug]) skillCounts[slug] = { correct: 0, incorrect: 0 };
    if (a.correct) skillCounts[slug].correct += 1;
    else skillCounts[slug].incorrect += 1;
  }
  return {
    correct,
    incorrect,
    answered,
    unanswered,
    total,
    percent,
    skillCounts,
    passed: percent >= 60,
    strong: percent >= 80,
  };
}

/**
 * Map assessment outcome to graded correctness for profile/mastery.
 * Strong checks boost; weak ones still count as graded practice.
 */
export function assessmentToCorrectness(score, { itemCorrect } = {}) {
  if (itemCorrect === true) return "correct";
  if (itemCorrect === false) return "incorrect";
  if (!score) return "unknown";
  if (score.strong) return "correct";
  if (score.passed) return "partial";
  if (score.answered > 0) return "incorrect";
  return "unknown";
}

export function assessmentProgressLabel(session) {
  if (!session?.questions?.length) return "";
  const total = session.questions.length;
  const i = Math.min((session.currentIndex || 0) + 1, total);
  if (session.status === AssessmentPhase.COMPLETED) {
    const s = scoreAssessment(session);
    return `${s.correct}/${s.total} correct`;
  }
  if (session.phase === AssessmentPhase.EXPLAINING) {
    return `Question ${i} of ${total} · review`;
  }
  return `Question ${i} of ${total}`;
}

export function assessmentCelebrationCopy(session) {
  const s = scoreAssessment(session);
  const topic = session?.topic || "this topic";
  if (s.strong) {
    return {
      headline: "Strong check",
      body: `You landed ${s.correct} of ${s.total} on ${topic}. That revision stuck.`,
      text: `Quick check complete — ${s.correct}/${s.total} on ${topic}.`,
    };
  }
  if (s.passed) {
    return {
      headline: "Solid effort",
      body: `${s.correct} of ${s.total} correct on ${topic}. Re-read any miss explanations — that is how revision works.`,
      text: `Quick check done — ${s.correct}/${s.total} on ${topic}.`,
    };
  }
  return {
    headline: "Good try",
    body: `${s.correct} of ${s.total} this round on ${topic}. The explanations are your tutor notes — skim them once more when you can.`,
    text: `Quick check finished — ${s.correct}/${s.total}. Keep the explanations handy.`,
  };
}

/**
 * Offer card when learner signals understanding / readiness.
 */
export function buildAssessmentOfferCard({
  topic = "this topic",
  subject = "",
  reason = "ready",
} = {}) {
  const reasons = {
    ready: "You said this makes sense — a short check locks it in.",
    clicked: "Something clicked — want a quick revision check?",
    manual: "A short multiple-choice check with a tutor note after each answer.",
    practice: "Low-stakes practice — one question at a time, then an explanation.",
  };
  return {
    reason,
    eyebrow: "Quick check",
    headline: `Ready to check ${topic}?`,
    body:
      reasons[reason] ||
      reasons.ready +
        (subject ? ` (${subject})` : ""),
    cta: "Start quick check",
    skipLabel: "Not yet",
    topic,
    subject,
  };
}

/**
 * Heuristic: enough solid graded turns → offer a check (tutor-like).
 */
export function shouldOfferAssessment({
  correctStreak = 0,
  gradedCorrect = 0,
  alreadyOffered = false,
  assessmentActive = false,
  messageCount = 0,
  minCorrect = 2,
  minMessages = 4,
} = {}) {
  if (alreadyOffered || assessmentActive) return false;
  if (messageCount < minMessages) return false;
  if (correctStreak >= minCorrect) return true;
  if (gradedCorrect >= minCorrect + 1) return true;
  return false;
}

export function resolveQuestion(idOrQuestion) {
  if (!idOrQuestion) return null;
  if (typeof idOrQuestion === "object") return idOrQuestion;
  return getAssessmentQuestion(idOrQuestion);
}
