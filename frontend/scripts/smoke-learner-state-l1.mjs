/**
 * Smoke checks for Epic L1 LearnerState contract.
 *
 * Run (bundled so skillGraph JSON imports resolve):
 *   npx esbuild scripts/smoke-learner-state-l1.mjs --bundle --platform=node --format=esm \
 *     --outfile=scripts/smoke-l1-bundle.mjs
 *   node scripts/smoke-l1-bundle.mjs
 */
import assert from "node:assert/strict";
import {
  LEARNER_STATE_VERSION,
  emptyLearnerState,
  buildLearnerState,
  buildLearnerStateSummary,
  learnerStateDirectives,
  serializeLearnerState,
  calibrateConfidenceCompetence,
  engagementLabelFromLevel,
  assistanceLabelFromLevel,
  correctnessPulse,
} from "../src/services/learning/learnerState.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic L1 smoke — LearnerState contract\n");

ok("version is 1", LEARNER_STATE_VERSION === 1);

const empty = emptyLearnerState({ studentId: "t", subject: "CS", topic: "HW" });
ok("empty has knowledge slice", empty.knowledge && Array.isArray(empty.knowledge.skills));
ok("empty has misconceptions", Array.isArray(empty.misconceptions));
ok("empty has behaviour", empty.behaviour && "hintRate" in empty.behaviour);
ok("empty has engagement", empty.engagement?.label === "unknown");
ok("empty has confidence calibration", empty.confidence?.calibration === "unknown");
ok("empty has assistance", empty.assistance?.label === "unknown");
ok("empty has objective", "lessonGoal" in empty.objective);
ok("empty has interaction", "prefersVisual" in empty.interaction);
ok("empty has pulse", empty.pulse?.correctnessText);

ok(
  "correctness pulse correct",
  correctnessPulse("correct").tone === "good"
);
ok(
  "engagement engaged",
  engagementLabelFromLevel(0.9) === "engaged"
);
ok(
  "assistance independent",
  assistanceLabelFromLevel(0.05) === "independent"
);

const calOver = calibrateConfidenceCompetence(0.9, 0.35);
ok("calibration overconfident", calOver.calibration === "overconfident");
const calUnder = calibrateConfidenceCompetence(0.25, 0.8);
ok("calibration underconfident", calUnder.calibration === "underconfident");
const calOk = calibrateConfidenceCompetence(0.6, 0.62);
ok("calibration aligned", calOk.calibration === "calibrated");

const profile = {
  studentId: "ada",
  totals: {
    exchanges: 10,
    correct: 3,
    incorrect: 5,
    partial: 2,
    sessions: 2,
  },
  mastery: {
    "Math Foundations::Adding fractions": {
      score: 48,
      attempts: 6,
      correct: 2,
      incorrect: 3,
      partial: 1,
    },
  },
  behavior: {
    hintRate: 0.45,
    shortAnswerRate: 0.5,
    rapidGuessRate: 0.3,
    offTopicRate: 0,
    persistenceScore: 2,
    avgResponseMs: 4200,
  },
  engagementHistory: [0.4, 0.35, 0.5],
  confidenceHistory: [0.85, 0.9],
  strengths: ["tries again"],
  focusAreas: [{ topic: "unlike denominators" }],
  misconceptions: {
    "mc.add_tops": {
      id: "mc.add_tops",
      label: "Adds numerators and denominators",
      count: 2,
      isActive: true,
      playbook: { check_question: "What stays the same when parts are equal size?" },
    },
  },
  deliveryPreferences: { step_by_step: 4, visual: 1 },
};

const state = buildLearnerState({
  profile,
  studentId: "ada",
  subject: "Math Foundations",
  topic: "Adding fractions",
  lastSignals: {
    correctness: "incorrect",
    affect: "frustrated",
    confidence: 0.82,
    engagement: 0.4,
    responseMs: 900,
    rapidGuess: true,
  },
  intervention: { status: "active", level: 2 },
  struggleSnapshot: { persistenceScore: 2, scaffoldingBias: 0.4 },
  lessonGoals: {
    learningGoal: "Add fractions with unlike denominators",
    weekFocus: "Fraction fluency",
    familiarity: "building",
  },
  scaffoldingBias: 0.4,
});

ok("topic score from mastery", state.knowledge.topicScore === 48);
ok("misconception present", state.misconceptions[0]?.id === "mc.add_tops");
ok("mc confidence thin model", state.misconceptions[0].confidence >= 0.5);
ok("behaviour flags rapid", state.behaviour.flags.includes("rapid_guessing"));
ok("behaviour flags short", state.behaviour.flags.includes("short_answers"));
ok("overconfident calibration", state.confidence.calibration === "overconfident");
ok("competence computed", state.confidence.competence != null);
ok("assistance elevated", ["guided", "high_support"].includes(state.assistance.label));
ok("objective goal", state.objective.lessonGoal.includes("unlike"));
ok("interaction step-by-step", state.interaction.prefersStepByStep === true);
ok("low typing tolerance", state.interaction.lowTypingTolerance === true);
ok("pulse needs scaffold", state.pulse.correctnessTone === "focus");
ok("pulse affect", state.pulse.affectLabel === "Frustrated");
ok("pulse knowledge label", /48/.test(state.pulse.knowledgeLabel || ""));
ok("pulse calibration tip", /show-your-work|ahead/i.test(state.pulse.calibrationLabel || ""));
ok("pulse assistance label", Boolean(state.pulse.assistanceLabel));
ok("pulse mc tip", /equal size/i.test(state.pulse.misconceptionTip || ""));
ok("summary non-empty", state.summary.length > 10);

const dirs = learnerStateDirectives(state);
ok("directives from overconfidence", dirs.some((d) => /show steps|confidence/i.test(d)));
ok("directives rapid guessing", dirs.some((d) => /rapid/i.test(d)));
ok("directives typing", dirs.some((d) => /types little|chips/i.test(d)));

const ser = serializeLearnerState(state);
ok("serialize round-trip version", ser.version === 1);
ok("serialize has pulse", ser.pulse.correctnessText);

const light = buildLearnerState({
  profile: { studentId: "new", totals: { exchanges: 0 } },
  studentId: "new",
});
ok(
  "new learner summary gentle",
  /new or lightly/i.test(buildLearnerStateSummary(light, { exchanges: 0 }))
);

console.log(`\nAll ${passed} L1 checks passed.`);
