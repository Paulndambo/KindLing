/**
 * Smoke checks for Epic B3 affective check-ins + persistence.
 */
import assert from "node:assert/strict";
import {
  evaluateAffectCheckIn,
  describeAffectCheckIn,
  scorePersistenceDelta,
  affectDirectivesFromState,
  persistenceCelebrationCopy,
  AFFECT_CHECKIN_OPTIONS,
  getCheckInOption,
  AFFECT_CHECKIN_THRESHOLDS,
} from "../src/services/learning/affectCheckIn.js";
import { Affect } from "../src/services/learning/types.js";
import { createSessionTracker } from "../src/services/learning/sessionTracker.js";
import { applyAffectCheckInToProfile, createEmptyProfile } from "../src/services/learning/profileStore.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic B3 smoke — affective check-ins\n");

ok("four gentle options", AFFECT_CHECKIN_OPTIONS.length === 4);
ok("no shame words in options", AFFECT_CHECKIN_OPTIONS.every((o) => !/stupid|fail|lazy|bad/i.test(o.label)));

const early = evaluateAffectCheckIn({ turnCount: 1, consecutiveFrustrated: 5 });
ok("no check-in before min turns", !early.shouldPrompt);

const frust = evaluateAffectCheckIn({
  turnCount: 5,
  consecutiveFrustrated: 2,
});
ok("frustration streak prompts", frust.shouldPrompt && frust.reason === "frustration_streak");

const long = evaluateAffectCheckIn({
  turnCount: 12,
  sessionDurationMs: AFFECT_CHECKIN_THRESHOLDS.LONG_SESSION_MS + 1000,
  consecutiveFrustrated: 0,
  recentAffects: [],
});
ok("long session prompts", long.shouldPrompt && long.reason === "long_session");

const cooldown = evaluateAffectCheckIn({
  turnCount: 10,
  consecutiveFrustrated: 3,
  lastCheckInAt: Date.now() - 1000,
  checkInsThisSession: 1,
});
ok("cooldown blocks", !cooldown.shouldPrompt);

const copy = describeAffectCheckIn("frustration_streak");
ok("copy is gentle", /feeling|courage|sticky/i.test(copy.body + copy.headline));
ok("copy no shame", !/stupid|fail|lazy|wrong of you/i.test(copy.body));

const persist = scorePersistenceDelta(
  { correctness: "correct", responseMs: 25000, wordCount: 5 },
  { consecutiveIncorrect: 2, lastCorrectness: "incorrect" }
);
ok("persistence recovery scored", persist.delta >= 1 && persist.tags.includes("recovery"));

const dirs = affectDirectivesFromState({
  lastCheckIn: getCheckInOption("stuck"),
  persistenceScore: 3,
});
ok("directives celebrate persistence", dirs.some((d) => /persist|stuck|effort/i.test(d)));

const chip = persistenceCelebrationCopy(["bounce_back"], 1);
ok("celebration chip", /bounce|grit/i.test(chip || ""));

const tracker = createSessionTracker({
  sessionId: "ses_b3",
  studentId: "kid",
  subject: "Math Foundations",
  topic: "Fraction sense",
  studentProfile: { name: "Kid" },
});
tracker.recordTurn({
  studentText: "this is hard and stupid",
  tutorText: "Not quite — let's rethink.",
  signals: {
    affect: Affect.FRUSTRATED,
    correctness: "incorrect",
    responseMs: 3000,
    wordCount: 5,
  },
  inputModality: "text",
});
tracker.recordTurn({
  studentText: "ugh I hate this",
  tutorText: "I hear you — let's slow down.",
  signals: {
    affect: Affect.FRUSTRATED,
    correctness: "incorrect",
    responseMs: 4000,
    wordCount: 4,
  },
  inputModality: "text",
});
ok("tracker frustration streak", tracker.consecutiveFrustrated >= 2);

const profile = applyAffectCheckInToProfile(createEmptyProfile("kid"), {
  optionId: "okay",
  affect: Affect.NEUTRAL,
});
ok("profile records check-in", profile.behavior.affectCheckIns === 1);
ok("profile history", profile.affectCheckInHistory.includes("okay"));

console.log(`\nAll ${passed} checks passed.`);
