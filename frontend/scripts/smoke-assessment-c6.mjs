/**
 * Smoke checks for Epic C6 low-stakes assessment helpers.
 *
 * Run:
 *   npx esbuild scripts/smoke-assessment-c6.mjs --bundle --platform=node --format=esm \
 *     --outfile=scripts/smoke-c6-bundle.mjs
 *   node scripts/smoke-c6-bundle.mjs
 */
import assert from "node:assert/strict";
import {
  ASSESSMENT_QUESTIONS,
  questionsForTopic,
  getAssessmentQuestion,
} from "../src/services/learning/assessmentBank.js";
import {
  ASSESSMENT_DEFAULT_COUNT,
  AssessmentPhase,
  createAssessmentSession,
  currentQuestion,
  applyAssessmentAnswer,
  advanceAssessment,
  exitAssessment,
  scoreAssessment,
  assessmentToCorrectness,
  assessmentProgressLabel,
  assessmentCelebrationCopy,
  buildAssessmentOfferCard,
  shouldOfferAssessment,
} from "../src/services/learning/assessmentEngine.js";
import { LearningEventType } from "../src/services/learning/types.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic C6 smoke — Assessment / quick check\n");

ok("bank has pilot items", ASSESSMENT_QUESTIONS.length >= 10);
ok("default count is 5", ASSESSMENT_DEFAULT_COUNT === 5);

const fracQs = questionsForTopic("Math Foundations", "Adding fractions", {
  limit: 5,
});
ok("topic match returns questions", fracQs.length >= 3);
ok(
  "prefers add fractions skills",
  fracQs.some((q) => /add/i.test(q.skillSlug) || /add/i.test(q.prompt))
);

const csHw = questionsForTopic("Computer Science", "Computer hardware", {
  limit: 4,
});
ok("CS hardware check available", csHw.length >= 2);
const hwPrimary = csHw.filter((q) => q.skillSlug === "cs.l0.hardware").length;
ok(
  "CS hardware majority on primary skill",
  hwPrimary >= Math.ceil(csHw.length * 0.5)
);
ok(
  "CS hardware not generic study filler",
  csHw.every((q) => !(q.topics || []).includes("*"))
);
ok(
  "CS hardware not math bank",
  csHw.every((q) => !/math foundations/i.test(q.subject || ""))
);

const csProg = questionsForTopic(
  "Computer Science",
  "Variables, types & operators",
  { skillSlugs: ["cs.l3.variables", "cs.l3.types", "cs.l3.operators"], limit: 4 }
);
ok("CS variables lesson check", csProg.length >= 2);
ok(
  "CS variables prefers programming skills",
  csProg.every((q) => String(q.skillSlug || "").startsWith("cs.l3."))
);

const eqQs = questionsForTopic("Math Foundations", "Simple equations", {
  limit: 4,
});
ok("equations pack", eqQs.length >= 2);

const generic = questionsForTopic("Kiswahili", "Insha", { limit: 3 });
ok("unknown topic still gets fallback", generic.length >= 1);

const one = getAssessmentQuestion("aq.frac.add_unlike.1");
ok("get by id", one?.correctIndex === 1);

// Session lifecycle
const ses = createAssessmentSession({
  subject: "Math Foundations",
  topic: "Adding fractions",
  count: 3,
  source: "ready",
});
ok("session created", Boolean(ses?.id));
ok("active phase", ses.status === AssessmentPhase.ACTIVE);
ok("has 3 questions", ses.questions.length === 3);

const q0 = currentQuestion(ses);
ok("current question", Boolean(q0?.prompt && q0.options?.length >= 2));

// Wrong answer → explanation
const wrongIdx = q0.correctIndex === 0 ? 1 : 0;
const { session: afterWrong, result: wrongRes } = applyAssessmentAnswer(
  ses,
  wrongIdx
);
ok("wrong graded", wrongRes?.correct === false);
ok("explaining after answer", afterWrong.phase === AssessmentPhase.EXPLAINING);
ok(
  "incorrect explanation present",
  Boolean(wrongRes.explanation) && wrongRes.explanation.length > 20
);
ok(
  "progress label review",
  /review|Question/i.test(assessmentProgressLabel(afterWrong))
);

// Cannot double-answer while explaining
const double = applyAssessmentAnswer(afterWrong, wrongIdx);
ok("no double grade", double.session.answers.length === 1);

const { session: q2, completed: notDone } = advanceAssessment(afterWrong);
ok("advance to next", !notDone && q2.phase === AssessmentPhase.ACTIVE);
ok("index 1", q2.currentIndex === 1);

// Correct path on Q2
const q1 = currentQuestion(q2);
const { session: afterRight, result: rightRes } = applyAssessmentAnswer(
  q2,
  q1.correctIndex
);
ok("correct graded", rightRes?.correct === true);
ok(
  "correct explanation",
  Boolean(rightRes.explanation) && /yes|right|correct|solid|exactly|nice/i.test(rightRes.explanation)
);

// Finish remaining
let cur = afterRight;
while (cur.status !== AssessmentPhase.COMPLETED) {
  if (cur.phase === AssessmentPhase.EXPLAINING) {
    const adv = advanceAssessment(cur);
    cur = adv.session;
    if (adv.completed) break;
  } else {
    const cq = currentQuestion(cur);
    const ans = applyAssessmentAnswer(cur, cq.correctIndex);
    cur = ans.session;
  }
}
ok("completed", cur.status === AssessmentPhase.COMPLETED);
const score = scoreAssessment(cur);
ok("score totals", score.total === 3 && score.answered === 3);
ok("percent in range", score.percent >= 0 && score.percent <= 100);
ok(
  "celebration copy",
  Boolean(assessmentCelebrationCopy(cur).headline)
);
ok(
  "toCorrectness",
  ["correct", "partial", "incorrect"].includes(
    assessmentToCorrectness(score)
  )
);

// Exit mid-session
const mid = createAssessmentSession({
  subject: "Math Foundations",
  topic: "Fraction sense",
  count: 4,
});
const exited = exitAssessment(mid);
ok("exit marks exited", exited.status === AssessmentPhase.EXITED);

// Offer heuristics
ok(
  "offer after streak",
  shouldOfferAssessment({
    correctStreak: 2,
    messageCount: 6,
    alreadyOffered: false,
  })
);
ok(
  "no offer too early",
  !shouldOfferAssessment({
    correctStreak: 2,
    messageCount: 1,
  })
);
ok(
  "no re-offer",
  !shouldOfferAssessment({
    correctStreak: 5,
    messageCount: 20,
    alreadyOffered: true,
  })
);

const offer = buildAssessmentOfferCard({
  topic: "Adding fractions",
  reason: "ready",
});
ok("offer card", /check/i.test(offer.headline) && offer.cta);

// Event types
ok(
  "event types",
  LearningEventType.ASSESSMENT_STARTED === "assessment.started" &&
    LearningEventType.ASSESSMENT_ANSWERED === "assessment.answered" &&
    LearningEventType.ASSESSMENT_COMPLETED === "assessment.completed" &&
    LearningEventType.ASSESSMENT_EXITED === "assessment.exited"
);

// Every bank item has dual explanations (offline revision requirement)
for (const q of ASSESSMENT_QUESTIONS) {
  ok(
    `explain dual ${q.id}`,
    q.explanationCorrect?.length > 15 && q.explanationIncorrect?.length > 15
  );
  ok(
    `options ${q.id}`,
    Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.correctIndex >= 0 &&
      q.correctIndex < q.options.length
  );
}

console.log(`\n${passed} checks passed.`);
