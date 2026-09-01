/**
 * Smoke checks for Epic B7 session-start energy check-in.
 */
import assert from "node:assert/strict";
import {
  SESSION_START_ENERGY_OPTIONS,
  SESSION_START_REASON,
  buildSessionStartCheckInCard,
  describeSessionStartCheckIn,
  getSessionStartOption,
  getAffectOption,
  isLowEnergyOption,
  affectDirectivesFromState,
  evaluateAffectCheckIn,
  AFFECT_CHECKIN_THRESHOLDS,
} from "../src/services/learning/affectCheckIn.js";
import { createSessionTracker } from "../src/services/learning/sessionTracker.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic B7 smoke — session-start energy check-in\n");

ok("four energy options", SESSION_START_ENERGY_OPTIONS.length === 4);
ok(
  "no shame words in energy labels",
  SESSION_START_ENERGY_OPTIONS.every(
    (o) => !/stupid|fail|lazy|bad|weak/i.test(o.label)
  )
);
ok(
  "ready and okay are not low energy",
  !isLowEnergyOption("ready") && !isLowEnergyOption("okay")
);
ok(
  "low and break are low energy",
  isLowEnergyOption("low") && isLowEnergyOption("break")
);

const card = buildSessionStartCheckInCard();
ok("card reason is session_start", card.reason === SESSION_START_REASON);
ok("card has options", Array.isArray(card.options) && card.options.length === 4);
ok("card copy invites skip", /skip|no wrong/i.test(card.body));

const copy = describeSessionStartCheckIn();
ok("describe matches reason", copy.reason === SESSION_START_REASON);

const low = getSessionStartOption("low");
ok("low option has softer tutor hint", /shorter|light|slow/i.test(low?.tutorHint || ""));

const dirs = affectDirectivesFromState({
  lastCheckIn: {
    optionId: "low",
    reason: SESSION_START_REASON,
    tutorHint: low.tutorHint,
  },
});
ok(
  "low energy adds gentle-open directive",
  dirs.some((d) => /shorter|gentle|light/i.test(d))
);

const breakOpt = getAffectOption("break", SESSION_START_REASON);
ok("getAffectOption resolves break for session_start", breakOpt?.id === "break");

// Tracker: session-start does not burn B3 mid-session budget
const tracker = createSessionTracker({
  sessionId: "ses_b7",
  studentId: "kid",
  subject: "Math Foundations",
  topic: "Fraction sense",
  studentProfile: { name: "Kid" },
});
tracker.noteSessionStartEnergyPrompted();
tracker.noteAffectCheckInResponse("low", "hesitant", { reason: "session_start" });
const ac = tracker.getAffectCheckInState();
ok("session start prompted on tracker", ac.sessionStartEnergy?.prompted === true);
ok("session start option recorded", ac.sessionStartEnergy?.optionId === "low");
ok(
  "B3 mid-session count stays 0 after B7 only",
  ac.count === 0
);

// Mid-session B3 still works after B7
const mid = evaluateAffectCheckIn({
  turnCount: 5,
  consecutiveFrustrated: 2,
  checkInsThisSession: ac.count,
  lastCheckInAt: null,
});
ok("B3 frustration check-in still available", mid.shouldPrompt);

ok(
  "greeting wait threshold is finite",
  AFFECT_CHECKIN_THRESHOLDS.SESSION_START_GREETING_WAIT_MS > 0 &&
    AFFECT_CHECKIN_THRESHOLDS.SESSION_START_GREETING_WAIT_MS < 60_000
);

console.log(`\n${passed} checks passed.`);
