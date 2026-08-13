/**
 * Smoke checks for Epic B5 misconception engine (local catalog).
 */
import assert from "node:assert/strict";
import {
  detectMisconceptions,
  detectRemediationSuccess,
  buildMisconceptionPromptBlock,
  misconceptionDirectives,
  listLocalMisconceptions,
} from "../src/services/learning/misconceptionEngine.js";
import { analyzeExchange } from "../src/services/learning/signalExtractor.js";
import {
  applyExchangeToProfile,
  createEmptyProfile,
} from "../src/services/learning/profileStore.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic B5 smoke — misconception engine\n");

const all = listLocalMisconceptions();
ok("catalog size", all.length >= 6);

const hits = detectMisconceptions(
  "I added the denominators together",
  "Not quite",
  { topic: "Adding fractions" }
);
ok("detects adds_denominators", hits.some((h) => h.id === "adds_denominators"));
ok("playbook present", hits[0]?.playbook?.steps?.length > 0);

const block = buildMisconceptionPromptBlock(hits);
ok("prompt block", /REMEDIATION PLAYBOOK/i.test(block));
ok("no shame", !/stupid|fail|lazy/i.test(block));

const dirs = misconceptionDirectives(hits, {});
ok("tutor directives", dirs.length >= 1);

const remediated = detectRemediationSuccess({
  activeMisconceptionIds: ["adds_denominators"],
  previousHits: [{ id: "adds_denominators" }],
  currentHits: [],
  correctness: "correct",
});
ok("remediation on correct", remediated.includes("adds_denominators"));

const noRem = detectRemediationSuccess({
  activeMisconceptionIds: ["adds_denominators"],
  currentHits: [{ id: "adds_denominators" }],
  correctness: "correct",
});
ok("still active if cue remains", noRem.length === 0);

const sig = analyzeExchange({
  studentText: "1/8 is bigger because bigger bottom means bigger fraction",
  tutorText: "Hmm, not quite.",
  subject: "Math Foundations",
  topic: "Comparing fractions",
});
ok(
  "analyzeExchange flags bigger_bottom",
  sig.misconceptions.some((m) => m.id === "bigger_bottom_bigger")
);

let profile = createEmptyProfile("kid");
profile = applyExchangeToProfile(profile, {
  subject: "Math Foundations",
  topic: "Adding fractions",
  signals: {
    ...sig,
    correctness: "incorrect",
    misconceptions: hits,
    confidence: 0.4,
    affect: "hesitant",
    engagement: 0.4,
  },
});
ok("profile stores MC", profile.misconceptions.adds_denominators?.count >= 1);
ok("MC active", profile.misconceptions.adds_denominators?.isActive !== false);

profile = applyExchangeToProfile(profile, {
  subject: "Math Foundations",
  topic: "Adding fractions",
  signals: {
    correctness: "correct",
    misconceptions: [],
    misconceptionsRemediated: [
      { id: "adds_denominators", skillSlug: "frac.add_like" },
    ],
    confidence: 0.7,
    affect: "neutral",
    engagement: 0.6,
  },
});
ok(
  "remediated deactivates",
  profile.misconceptions.adds_denominators?.isActive === false
);
ok(
  "remediation count",
  profile.misconceptions.adds_denominators?.remediationSuccessCount >= 1
);

console.log(`\nAll ${passed} checks passed.`);
