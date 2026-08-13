/**
 * Smoke checks for Epic B6 multi-step show-your-work.
 */
import assert from "node:assert/strict";
import {
  createMultiStepSession,
  applyStepAttempt,
  scorePartialCredit,
  multiStepToCorrectness,
  buildMultiStepTutorBlock,
  parseStepTags,
  stripStepTags,
} from "../src/services/learning/multiStepEngine.js";
import {
  pickMultiStepProblem,
  problemsForTopic,
} from "../src/services/learning/multiStepProblems.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic B6 smoke — multi-step show your work\n");

const pool = problemsForTopic("Math Foundations", "Adding fractions");
ok("problems for Adding fractions", pool.length >= 1);

const problem = pickMultiStepProblem({
  subject: "Math Foundations",
  topic: "Adding fractions",
});
ok("picked problem", Boolean(problem?.steps?.length >= 3));

let ses = createMultiStepSession(problem);
ok("session starts active", ses.status === "active");
ok("first step current", ses.steps[0].status === "current");

// wrong answer stays
let r = applyStepAttempt(ses, "5");
ok("wrong stays on step", !r.advanced && r.session.currentIndex === 0);
ses = r.session;

// step 1 correct
r = applyStepAttempt(ses, "6");
ok("step1 advances", r.advanced && r.session.currentIndex === 1);
ses = r.session;

r = applyStepAttempt(ses, "2/6");
ok("step2 advances", r.advanced);
ses = r.session;

r = applyStepAttempt(ses, "3/6");
ok("step3 advances", r.advanced);
ses = r.session;

r = applyStepAttempt(ses, "1/2");
ok("completes", r.completed && r.session.status === "completed");
const credit = scorePartialCredit(r.session);
ok("full credit", credit.percent === 100);
ok(
  "graded correct",
  multiStepToCorrectness(credit, { completed: true }) === "correct"
);

const block = buildMultiStepTutorBlock(ses);
ok("tutor block", /SHOW YOUR WORK/i.test(block));
ok("has step tag instructions", /⟦step/.test(block));

const tags = parseStepTags('Nice. ⟦step n="2" expected="2/6" result="correct"⟧');
ok("parse step tag", tags[0]?.n === 2 && tags[0]?.result === "correct");
ok(
  "strip step tags",
  stripStepTags('Hi ⟦step n="1" result="correct"⟧ there').includes("Hi")
);

const alg = pickMultiStepProblem({
  subject: "Math Foundations",
  topic: "Simple equations",
});
ok("algebra multistep exists", alg?.skillSlug === "alg.one_step_equation");

console.log(`\nAll ${passed} checks passed.`);
