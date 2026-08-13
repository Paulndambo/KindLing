/**
 * Smoke checks for Epic B1 struggle signal logic (no browser).
 * Run (from frontend/):
 *   npx esbuild scripts/smoke-struggle-b1.mjs --bundle --platform=node --format=esm \
 *     --define:import.meta.env={} --outfile=scripts/smoke-b1-bundle.mjs
 *   node scripts/smoke-b1-bundle.mjs
 *
 * Or import pure modules only via the bundled path above.
 */
import assert from "node:assert/strict";
import {
  evaluateInterventionTrigger,
  evaluateIdleStruggle,
  describeInterventionContext,
  describeIdleNudge,
  struggleDirectivesFromSnapshot,
} from "../src/services/learning/interventionDetector.js";
import {
  STRUGGLE_THRESHOLDS,
} from "../src/services/learning/struggleThresholds.js";
import { StruggleSignal } from "../src/services/learning/types.js";
import {
  isShortAnswer,
  isRapidGuess,
  detectOffTopicDrift,
  analyzeExchange,
} from "../src/services/learning/signalExtractor.js";
import { createSessionTracker } from "../src/services/learning/sessionTracker.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic B1 smoke — struggle signals\n");

// Short answers
ok("short: ok/k is short", isShortAnswer("ok"));
ok("short: math fraction not short", !isShortAnswer("3/4"));
ok("short: long sentence not short", !isShortAnswer("I think the answer is one half because the bar is split in two"));

// Rapid guessing
ok(
  "rapid: fast thin incorrect",
  isRapidGuess({
    responseMs: 1200,
    studentText: "2",
    correctness: "incorrect",
  })
);
ok(
  "rapid: slow thoughtful not rapid",
  !isRapidGuess({
    responseMs: 12000,
    studentText: "I think it is 1/2",
    correctness: "incorrect",
  })
);

// Off-topic
const ot = detectOffTopicDrift({
  studentText: "can we talk about minecraft instead",
  topic: "Fraction sense",
  subject: "Math Foundations",
});
ok("off-topic: explicit pattern", ot.isOffTopic);

const onTopic = detectOffTopicDrift({
  studentText: "is 1/2 bigger than 1/4?",
  topic: "Fraction sense",
  subject: "Math Foundations",
});
ok("off-topic: math question not flagged lightly", !onTopic.isOffTopic || onTopic.confidence < 0.9);

// Idle
const idleNudge = evaluateIdleStruggle({
  idleMs: STRUGGLE_THRESHOLDS.IDLE_NUDGE_MS + 100,
  alreadyNudged: false,
});
ok("idle: nudge after threshold", idleNudge.shouldNudge && !idleNudge.shouldOffer);

const idleOffer = evaluateIdleStruggle({
  idleMs: STRUGGLE_THRESHOLDS.IDLE_OFFER_MS + 100,
  alreadyNudged: true,
  alreadyOfferedIdle: false,
});
ok("idle: offer after longer wait", idleOffer.shouldOffer && idleOffer.reason === StruggleSignal.IDLE);

// Multi-signal trigger
const rapid = evaluateInterventionTrigger({
  consecutiveIncorrect: 1,
  consecutiveRapidGuesses: 2,
});
ok("trigger: rapid guessing reason", rapid.shouldOffer && rapid.reason === StruggleSignal.RAPID_GUESSING);

const thrash = evaluateInterventionTrigger({
  topicThrashing: true,
});
ok("trigger: topic thrashing", thrash.shouldOffer && thrash.reason === StruggleSignal.TOPIC_THRASHING);

const off = evaluateInterventionTrigger({
  consecutiveOffTopic: 2,
});
ok("trigger: off-topic", off.shouldOffer && off.reason === StruggleSignal.OFF_TOPIC);

const short = evaluateInterventionTrigger({
  consecutiveShortAnswers: 3,
  consecutiveIncorrect: 1,
});
ok("trigger: short answers with miss", short.shouldOffer && short.reason === StruggleSignal.SHORT_ANSWERS);

// Copy is non-shaming
const ctx = describeInterventionContext({
  topic: "Fractions",
  reason: StruggleSignal.RAPID_GUESSING,
});
ok("copy: no shame words", !/stupid|fail|bad|lazy/i.test(ctx.headline + ctx.body));
ok("copy: idle nudge gentle", /thinking/i.test(describeIdleNudge({ topic: "Fractions" }).headline));

// Session tracker streaks
const tracker = createSessionTracker({
  sessionId: "ses_smoke",
  studentId: "kid",
  subject: "Math Foundations",
  topic: "Fraction sense",
  studentProfile: { name: "Kid" },
});
tracker.markPromptReady();
const signals = analyzeExchange({
  studentText: "nope",
  tutorText: "Not quite — let's rethink this together.",
  responseMs: 900,
  subject: "Math Foundations",
  topic: "Fraction sense",
});
ok("analyze: shortAnswer flag", signals.shortAnswer === true);
ok("analyze: rapidGuess flag", signals.rapidGuess === true);
tracker.recordTurn({
  studentText: "nope",
  tutorText: "Not quite",
  signals,
  inputModality: "text",
});
ok("tracker: short streak", tracker.consecutiveShortAnswers >= 1);
ok("tracker: scaffolding bias rises", tracker.scaffoldingBias > 0);

// Topic thrashing
tracker.setTopic("Math Foundations", "Equivalent fractions");
tracker.setTopic("Math Foundations", "Mixed numbers");
tracker.setTopic("Math Foundations", "Fraction sense");
ok("tracker: thrashing after 3 switches", tracker.topicThrashing === true);

const dirs = struggleDirectivesFromSnapshot(tracker.getStruggleSnapshot());
ok("directives: non-empty under struggle", dirs.length >= 1);

console.log(`\nAll ${passed} checks passed.`);
