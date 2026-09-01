/**
 * Smoke checks for Epic C5 Goals surface (lite) helpers.
 *
 * Run (bundle required for extensionless Vite imports):
 *   npx esbuild scripts/smoke-goals-c5.mjs --bundle --platform=node --format=esm \
 *     --outfile=scripts/smoke-c5-bundle.mjs
 *   node scripts/smoke-c5-bundle.mjs
 */
import assert from "node:assert/strict";
import {
  resolveLessonGoals,
  goalsToTopicContext,
  truncateGoal,
  formatGoalsOrientationLine,
  buildWeekFocusPromptLines,
  goalEchoForReflection,
  sanitizeWeekFocus,
  WEEK_FOCUS_MAX,
} from "../src/services/learning/goalsSurface.js";
import { buildSessionReflectionCard } from "../src/services/learning/sessionReflection.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic C5 smoke — Goals surface (lite)\n");

const goals = resolveLessonGoals({
  topicName: "Fraction sense",
  subjectName: "Math Foundations",
  topic: {
    familiarity: "beginner",
    learningGoal: "Understand what a fraction means as part of a whole",
  },
  subject: { learningGoal: "Grow steadily in math" },
  student: {
    goal: "Feel confident in math",
    weekFocus: "Practice comparing fractions",
  },
});

ok("effective goal prefers topic", goals.effectiveGoal.includes("part of a whole"));
ok("familiarity short", goals.familiarityShort === "Beginner");
ok("week focus present", goals.weekFocus === "Practice comparing fractions");
ok("hasLessonGoal", goals.hasLessonGoal === true);
ok("profile goal kept", goals.profileGoal === "Feel confident in math");
ok("goalSource topic", goals.goalSource === "topic");

const ctx = goalsToTopicContext(goals);
ok("topic context learningGoal", ctx.learningGoal.includes("part of a whole"));
ok("topic context weekFocus", ctx.weekFocus === "Practice comparing fractions");
ok("topic context subjectGoal", ctx.subjectGoal.includes("Grow steadily"));
ok("topic context familiarity", ctx.familiarity === "beginner");

const weekLines = buildWeekFocusPromptLines(goals);
ok("week lines non-empty", weekLines.length >= 1);
ok(
  "week lines mention weekly focus",
  weekLines.some((l) => /Practice comparing fractions/i.test(l))
);
ok(
  "week lines mention profile goal",
  weekLines.some((l) => /Feel confident/i.test(l))
);

const echo = goalEchoForReflection(goals, "Fraction sense");
ok("reflection echo uses goal", /part of a whole/i.test(echo || ""));

const card = buildSessionReflectionCard({
  topic: "Fraction sense",
  learningGoal: goals.effectiveGoal,
  weekFocus: goals.weekFocus,
});
ok("reflection card body echoes goal", /part of a whole/i.test(card.body));
ok("reflection stores learningGoal", card.learningGoal.includes("part of a whole"));

ok("truncate short unchanged", truncateGoal("hi", 10) === "hi");
ok("truncate long", truncateGoal("x".repeat(50), 20).endsWith("…"));
ok(
  "sanitize week focus length",
  sanitizeWeekFocus("a".repeat(WEEK_FOCUS_MAX + 20)).length === WEEK_FOCUS_MAX
);

const fallback = resolveLessonGoals({
  topic: { familiarity: "some", learningGoal: "" },
  subject: { learningGoal: "Subject hope line" },
  student: { weekFocus: "" },
});
ok("falls back to subject goal", fallback.effectiveGoal === "Subject hope line");
ok("goalSource subject", fallback.goalSource === "subject");
ok(
  "orientation line has familiarity",
  /Basics/i.test(formatGoalsOrientationLine(fallback))
);

const empty = resolveLessonGoals({});
ok("empty has no lesson goal", empty.hasLessonGoal === false);
ok("empty familiarity defaults", empty.familiarity === "new");

const weekOnly = resolveLessonGoals({
  student: { weekFocus: "Only week line" },
});
const weekEcho = goalEchoForReflection(weekOnly, "Algebra");
ok("week-only echo", /Only week line/i.test(weekEcho || ""));

const weekCard = buildSessionReflectionCard({
  topic: "Algebra",
  weekFocus: "Only week line",
});
ok("week-only reflection body", /Only week line/i.test(weekCard.body));

console.log(`\n${passed} checks passed.`);
