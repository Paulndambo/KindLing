/**
 * Smoke checks for Epic C1 Review spark helpers (client).
 */
import assert from "node:assert/strict";
import {
  reviewModeDirectives,
  pickReviewCtaFromDue,
  buildReviewOpeningHint,
} from "../src/services/learning/reviewSpark.js";
import { LearningEventType } from "../src/services/learning/types.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic C1 smoke — Review spark\n");

const dirs = reviewModeDirectives({
  skillLabel: "Fraction sense",
  skillSlug: "frac.sense",
  topic: "Fraction sense",
});
ok("review directives non-empty", dirs.length >= 3);
ok(
  "directives mention review mode",
  dirs.some((d) => /REVIEW SPARK|retrieval|warm-up/i.test(d))
);

const hint = buildReviewOpeningHint({ skillLabel: "Equiv. fractions" });
ok("opening hint", /Review spark|Equiv/i.test(hint));

const cta = pickReviewCtaFromDue(
  [
    {
      id: 1,
      isDue: true,
      skillSlug: "frac.number_line",
      shortLabel: "Number line",
      topic: "Fractions on a number line",
      subject: "Math Foundations",
    },
  ],
  { topic: "Fractions on a number line" }
);
ok("CTA from due list", cta?.kind === "review_spark");
ok("CTA has skill", cta?.skillSlug === "frac.number_line");

ok(
  "event types",
  LearningEventType.REVIEW_STARTED === "review.started" &&
    LearningEventType.REVIEW_COMPLETED === "review.completed"
);

console.log(`\n${passed} checks passed.`);
