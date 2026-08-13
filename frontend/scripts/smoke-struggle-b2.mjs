/**
 * Smoke checks for Epic B2 graduated intervention ladder.
 * Run (from frontend/):
 *   npx esbuild scripts/smoke-struggle-b2.mjs --bundle --platform=node --format=esm \
 *     --define:import.meta.env="{}" --outfile=scripts/smoke-b2-bundle.mjs
 *   node scripts/smoke-b2-bundle.mjs
 */
import assert from "node:assert/strict";
import {
  InterventionLevel,
  selectInterventionLevel,
  levelMeta,
  shouldOfferEscalation,
  enrichInterventionContext,
  buildLadderEnterMessage,
  buildLadderTutorBlock,
} from "../src/services/learning/interventionLadder.js";
import { evaluateInterventionTrigger } from "../src/services/learning/interventionDetector.js";
import { findWorkedExample } from "../src/services/learning/workedExamples.js";
import { suggestEasierRelatedSkill } from "../src/services/learning/skillGraph.js";
import { StruggleSignal } from "../src/services/learning/types.js";
import { describeInterventionContext } from "../src/services/learning/interventionDetector.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic B2 smoke — graduated interventions\n");

ok(
  "idle → micro-hint",
  selectInterventionLevel({ reason: StruggleSignal.IDLE }) ===
    InterventionLevel.MICRO_HINT
);
ok(
  "incorrect streak → worked example",
  selectInterventionLevel({
    reason: StruggleSignal.INCORRECT_STREAK,
    consecutiveIncorrect: 2,
  }) === InterventionLevel.WORKED_EXAMPLE
);
ok(
  "frustration auto → full guide",
  selectInterventionLevel({
    reason: StruggleSignal.FRUSTRATION,
    consecutiveIncorrect: 2,
    affect: "frustrated",
    shouldAutoEnter: true,
  }) === InterventionLevel.FULL_GUIDE
);
ok(
  "thrashing → break/easier",
  selectInterventionLevel({
    reason: StruggleSignal.TOPIC_THRASHING,
    topicThrashing: true,
  }) === InterventionLevel.BREAK_OR_EASIER
);
ok(
  "escalates after using level 1",
  selectInterventionLevel({
    reason: StruggleSignal.IDLE,
    highestLevelUsed: 1,
  }) >= InterventionLevel.WORKED_EXAMPLE
);
ok(
  "escalateFrom 2 → 3",
  selectInterventionLevel({ escalateFrom: 2 }) === InterventionLevel.FULL_GUIDE
);

ok(
  "shouldOfferEscalation at L1 with misses",
  shouldOfferEscalation({
    currentLevel: 1,
    consecutiveIncorrect: 2,
  }) === true
);
ok(
  "no escalate at L4",
  shouldOfferEscalation({
    currentLevel: 4,
    consecutiveIncorrect: 5,
  }) === false
);

const we = findWorkedExample({
  subject: "Math Foundations",
  topic: "Fraction sense",
});
ok("worked example for fractions", Boolean(we?.title && we?.steps?.length));

const easier = suggestEasierRelatedSkill(
  { skills: {} },
  "Math Foundations",
  "Equivalent fractions"
);
ok(
  "easier skill suggestion available or null-safe",
  easier === null || Boolean(easier.slug && easier.name)
);

const ctx = describeInterventionContext({
  subject: "Math Foundations",
  topic: "Fraction sense",
  reason: StruggleSignal.INCORRECT_STREAK,
  consecutiveIncorrect: 2,
  level: InterventionLevel.WORKED_EXAMPLE,
});
ok("context has level metadata", ctx.level === 2 && ctx.acceptCta);
ok("context body mentions example or steps", /example|step/i.test(ctx.body));
ok(
  "no shame language",
  !/stupid|fail|lazy|bad student/i.test(ctx.headline + ctx.body)
);

const enter = buildLadderEnterMessage({
  studentName: "Maya",
  topic: "Fraction sense",
  subject: "Math Foundations",
  level: InterventionLevel.MICRO_HINT,
  reasonText: "a couple of answers didn't land",
});
ok("enter message is micro-hint", /MICRO-HINT/i.test(enter));

const block = buildLadderTutorBlock({
  studentName: "Maya",
  topic: "Fraction sense",
  subject: "Math Foundations",
  level: InterventionLevel.FULL_GUIDE,
});
ok("tutor block is level 3 guide", /LEVEL 3/i.test(block));

const decision = evaluateInterventionTrigger({
  consecutiveIncorrect: 2,
  currentStatus: "idle",
});
ok(
  "trigger returns level",
  decision.shouldOffer && decision.level === InterventionLevel.WORKED_EXAMPLE
);

const esc = evaluateInterventionTrigger({
  currentStatus: "active",
  currentLevel: 2,
  consecutiveIncorrect: 2,
  alreadyOfferedEscalate: false,
});
ok("active can offer escalate", esc.shouldEscalate && esc.level === 3);

const meta = levelMeta(1);
ok("levelMeta micro", meta.id === "micro_hint");

const enriched = enrichInterventionContext(
  {
    subject: "Math Foundations",
    topic: "Fraction sense",
    reasonText: "tricky",
    headline: "I noticed this is tricky",
  },
  { level: InterventionLevel.BREAK_OR_EASIER, profile: { skills: {} } }
);
ok("enrich break level", enriched.level === 4 && enriched.levelId === "break_or_easier");

console.log(`\nAll ${passed} checks passed.`);
