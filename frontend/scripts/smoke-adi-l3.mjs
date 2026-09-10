/**
 * Smoke checks for Epic L3 Assistance Dependency Index.
 *
 * Run:
 *   npx esbuild scripts/smoke-adi-l3.mjs --bundle --platform=node --format=esm \
 *     --outfile=scripts/smoke-l3-bundle.mjs
 *   node scripts/smoke-l3-bundle.mjs
 */
import assert from "node:assert/strict";
import {
  ADI_VERSION,
  ADI_MIN_SAMPLES,
  assistanceWeightForTurn,
  adiBand,
  adiIndependenceCopy,
  computeAdi,
  computeAdiFromContext,
  shouldPreferLighterHelp,
  applyAdiLadderPreference,
  serializeAdi,
  adiDirectives,
  syntheticTurnsFromProfile,
} from "../src/services/learning/adi.js";
import { selectInterventionLevel, InterventionLevel } from "../src/services/learning/interventionLadder.js";
import { buildLearnerState } from "../src/services/learning/learnerState.js";
import { LearningEventType } from "../src/services/learning/types.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic L3 smoke — Assistance Dependency Index\n");

ok("version 1", ADI_VERSION === 1);
ok("min samples 3", ADI_MIN_SAMPLES === 3);
ok("event type learning.adi", LearningEventType.LEARNING_ADI === "learning.adi");

const solo = assistanceWeightForTurn({
  correctness: "correct",
  interventionLevel: 0,
});
const guided = assistanceWeightForTurn({
  correctness: "correct",
  interventionActive: true,
  interventionLevel: 3,
});
ok("solo weight low", solo < 0.15);
ok("guided weight higher", guided > solo && guided > 0.4);

const heavyTurns = Array.from({ length: 6 }, () => ({
  correctness: "correct",
  interventionActive: true,
  interventionLevel: 3,
}));
const heavy = computeAdi(heavyTurns, { topicScore: 40 });
ok("heavy reliable", heavy.reliable);
ok("heavy band scaffold", heavy.band === "scaffold_heavy" || heavy.value >= 0.45);
ok("heavy has non-shame copy", heavy.copy && !/shame|bad|weak|fail/i.test(heavy.copy));

const lightTurns = Array.from({ length: 6 }, () => ({
  correctness: "correct",
  interventionLevel: 0,
}));
const light = computeAdi(lightTurns, { topicScore: 72 });
ok("light independence band", light.band === "gaining_independence");
ok("light prefer lighter", light.preferLighterHelp === true);
ok("independence pct high", light.independencePct >= 70);

const faded = applyAdiLadderPreference(InterventionLevel.FULL_GUIDE, light);
ok("ladder fades full guide", faded <= InterventionLevel.WORKED_EXAMPLE);
ok(
  "manual no fade",
  applyAdiLadderPreference(InterventionLevel.FULL_GUIDE, light, {
    manual: true,
  }) === InterventionLevel.FULL_GUIDE
);

const levelWithAdi = selectInterventionLevel({
  reason: "incorrect_streak",
  consecutiveIncorrect: 3,
  adi: light,
});
const levelNoAdi = selectInterventionLevel({
  reason: "incorrect_streak",
  consecutiveIncorrect: 3,
});
ok(
  "selectInterventionLevel respects ADI fade",
  levelWithAdi <= levelNoAdi
);

ok(
  "high mastery + mid ADI prefers lighter",
  shouldPreferLighterHelp({ adi: 0.48, topicScore: 75 }) === true
);

const copy = adiIndependenceCopy({
  adi: 0.6,
  topicScore: 80,
  forDigest: true,
});
ok("high ADI + high score encourages independence", /no-hint|lighter/i.test(copy || ""));

const profile = {
  studentId: "t",
  totals: { exchanges: 10, correct: 5, incorrect: 3, partial: 2 },
  behavior: { hintRate: 0.5, adi: 0.4 },
  mastery: {
    "Math::Fractions": { score: 70, attempts: 8, correct: 5, incorrect: 2, partial: 1 },
  },
};
const synth = syntheticTurnsFromProfile(profile);
ok("synthetic turns from profile", synth.length >= ADI_MIN_SAMPLES);

const fromCtx = computeAdiFromContext({
  sessionSnapshot: {
    turns: heavyTurns.map((t, i) => ({
      index: i,
      signals: {
        correctness: t.correctness,
        interventionActive: t.interventionActive,
        interventionLevel: t.interventionLevel,
      },
    })),
    scaffoldingBias: 0.4,
  },
  intervention: { status: "active", level: 3 },
  profile,
  topicScore: 70,
});
ok("context ADI reliable", fromCtx.reliable);

const state = buildLearnerState({
  profile,
  subject: "Math",
  topic: "Fractions",
  adi: light,
});
ok("learnerState has adi", state.adi?.reliable);
ok("assistance.adi set", state.assistance.adi != null || state.assistance.adiBand);
ok("pulse independence note", state.pulse.independenceNote);

const ser = serializeAdi(light);
ok("serialize has value", ser.value != null && ser.band);

const dirs = adiDirectives(light);
ok("adi directives when prefer lighter", dirs.length >= 1);

const thin = computeAdi([{ correctness: "correct" }]);
ok("thin not reliable", thin.reliable === false);

console.log(`\nAll ${passed} L3 ADI checks passed.`);
