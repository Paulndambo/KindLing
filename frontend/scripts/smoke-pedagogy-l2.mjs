/**
 * Smoke checks for Epic L2 pedagogical policy.
 *
 * Run:
 *   npx esbuild scripts/smoke-pedagogy-l2.mjs --bundle --platform=node --format=esm \
 *     --banner:js="if(typeof import.meta!=='undefined'){try{import.meta.env=import.meta.env||{VITE_API_URL:'http://127.0.0.1:8000'}}catch(e){}}" \
 *     --outfile=scripts/smoke-l2-bundle.mjs
 *   node --input-type=module -e "import.meta.env={VITE_API_URL:'http://127.0.0.1:8000'}; await import('./scripts/smoke-l2-bundle.mjs')"
 */
import assert from "node:assert/strict";
import {
  PEDAGOGY_POLICY_VERSION,
  PedagogicalAction,
  PEDAGOGICAL_ACTIONS,
  decidePedagogy,
  findWeakPrerequisite,
  buildPedagogyPromptBlock,
  pedagogyDirectives,
  serializePedagogyDecision,
  rankNextBestActions,
  actionFromLadderLevel,
} from "../src/services/learning/pedagogicalPolicy.js";
import { LearningEventType } from "../src/services/learning/types.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic L2 smoke — Pedagogical policy\n");

ok("policy version 1", PEDAGOGY_POLICY_VERSION === 1);
ok("action catalog size", PEDAGOGICAL_ACTIONS.length >= 15);
ok(
  "event type pedagogy.decision",
  LearningEventType.PEDAGOGY_DECISION === "pedagogy.decision"
);

// Golden paths
const stuck = decidePedagogy(
  {
    behaviour: { flags: ["rapid_guessing"] },
    confidence: { calibration: "unknown" },
  },
  {
    lastSignals: { correctness: "incorrect", rapidGuess: true, affect: "neutral" },
    consecutiveIncorrect: 1,
  }
);
ok("stuck guessing → SLOW_DOWN", stuck.action === PedagogicalAction.SLOW_DOWN);

const lowEnergy = decidePedagogy(
  {},
  {
    lowEnergy: true,
    lastCheckIn: { optionId: "tired", lowEnergy: true },
    consecutiveIncorrect: 2,
    lastSignals: { affect: "frustrated", correctness: "incorrect" },
  }
);
ok(
  "low energy + struggle → OFFER_BREAK or AFFECT",
  [PedagogicalAction.OFFER_BREAK, PedagogicalAction.AFFECT_SUPPORT].includes(
    lowEnergy.action
  )
);

const dueReview = decidePedagogy(
  {},
  {
    dueReview: { skillSlug: "frac.add", skillLabel: "Add fractions" },
    sessionPhase: "open",
  }
);
ok("due review at open → REVIEW", dueReview.action === PedagogicalAction.REVIEW);

const reviewMode = decidePedagogy(
  {},
  { reviewMode: true, reviewSkillLabel: "Variables" }
);
ok("review mode lock", reviewMode.action === PedagogicalAction.REVIEW);

const over = decidePedagogy(
  { confidence: { calibration: "overconfident", competence: 0.3 } },
  { lastSignals: { correctness: "partial" } }
);
ok("overconfident → CHECK_UNDERSTANDING", over.action === PedagogicalAction.CHECK_UNDERSTANDING);

const under = decidePedagogy(
  { confidence: { calibration: "underconfident", competence: 0.75 } },
  { lastSignals: { correctness: "correct" } }
);
ok("underconfident capable → CHALLENGE", under.action === PedagogicalAction.CHALLENGE);

const prereq = decidePedagogy(
  {
    knowledge: {
      skills: [
        {
          isPrimary: true,
          score: 25,
          blockingPrereqs: [
            { slug: "cs.l0.hardware", name: "Hardware basics", score: 20 },
          ],
        },
      ],
    },
  },
  {
    consecutiveIncorrect: 3,
    lastSignals: { correctness: "incorrect", affect: "frustrated" },
    subject: "Computer Science",
    topic: "Computer hardware",
  }
);
ok(
  "severe stuck + weak prereq → REMEDIATE_PREREQUISITE",
  prereq.action === PedagogicalAction.REMEDIATE_PREREQUISITE
);
ok("prereq label set", /Hardware/i.test(prereq.params?.prereqLabel || ""));

const mc = decidePedagogy(
  {
    misconceptions: [
      { id: "mc.x", label: "RAM is storage", isActive: true, confidence: 0.7 },
    ],
  },
  { lastSignals: { correctness: "incorrect" } }
);
ok("misconception → REMEDIATE_MISCONCEPTION", mc.action === PedagogicalAction.REMEDIATE_MISCONCEPTION);

const iv = decidePedagogy(
  {},
  { intervention: { status: "active", level: 3 } }
);
ok("active guide → FULL_GUIDE", iv.action === PedagogicalAction.FULL_GUIDE);

const adi = decidePedagogy(
  {
    adi: { preferLighterHelp: true, reliable: true },
    knowledge: { topicScore: 72 },
  },
  { lastSignals: { correctness: "correct" } }
);
ok("ADI light → INDEPENDENT_PRACTICE", adi.action === PedagogicalAction.INDEPENDENT_PRACTICE);

ok(
  "ladder map L1 micro",
  actionFromLadderLevel(1) === PedagogicalAction.MICRO_HINT
);

const block = buildPedagogyPromptBlock(stuck);
ok("prompt has EXECUTE ONLY", /EXECUTE ONLY/i.test(block));
ok("prompt has decision id", block.includes(stuck.id));
ok("prompt has action", block.includes("SLOW_DOWN"));

const dirs = pedagogyDirectives(stuck);
ok("directives non-empty", dirs.length >= 1);

const ser = serializePedagogyDecision(stuck);
ok("serialize action", ser.action === "SLOW_DOWN" && ser.decisionId);

const nba = rankNextBestActions({
  dueReviews: [{ skillSlug: "a", skillLabel: "Loops" }],
  recommendedSkill: { slug: "b", shortLabel: "Vars" },
});
ok("NBA ranks review first", nba[0].action === PedagogicalAction.REVIEW);

// Prompt contract shape (gemini.js injects pedagogyPromptBlock into system prompt)
const fakeSystem = [
  "You are Kindling…",
  "Live learner model…",
  block,
  "Your teaching philosophy…",
].join("\n");
ok("system assembly includes pedagogy block", /Pedagogical decision/i.test(fakeSystem));
ok("system assembly includes EXECUTE", /EXECUTE ONLY/i.test(fakeSystem));
ok("system assembly includes decision id", fakeSystem.includes(stuck.id));
ok(
  "insights carry decision + block block fields",
  ser.action && block.includes(ser.decisionId || stuck.id)
);

// findWeakPrerequisite helper
const weak = findWeakPrerequisite({
  consecutiveIncorrect: 3,
  last: { correctness: "incorrect" },
  learnerState: {
    knowledge: {
      skills: [
        {
          isPrimary: true,
          score: 20,
          blockingPrereqs: [{ slug: "p1", name: "Foundations", score: 15 }],
        },
      ],
    },
  },
});
ok("findWeakPrerequisite returns blocker", weak?.slug === "p1");

console.log(`\nAll ${passed} L2 pedagogy checks passed.`);
