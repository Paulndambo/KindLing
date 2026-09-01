/**
 * Smoke checks for Epic G1 light spark challenge helpers.
 *
 * Run:
 *   npx esbuild scripts/smoke-challenge-g1.mjs --bundle --platform=node --format=esm \
 *     --outfile=scripts/smoke-g1-bundle.mjs
 *   node scripts/smoke-g1-bundle.mjs
 */
import assert from "node:assert/strict";
import {
  SPARK_CHALLENGE_TARGET,
  challengeModeDirectives,
  buildChallengeOpeningHint,
  pickSparkChallengeCandidate,
  emptyChallengeProgress,
  applyChallengeGradedTurn,
  challengeProgressLabel,
  challengeCelebrationCopy,
  challengeProgressChipCopy,
} from "../src/services/learning/sparkChallenge.js";
import { LearningEventType } from "../src/services/learning/types.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic G1 smoke — Spark challenge\n");

ok("target is 3", SPARK_CHALLENGE_TARGET === 3);

const dirs = challengeModeDirectives({
  skillLabel: "Fraction sense",
  skillSlug: "frac.sense",
  target: 3,
});
ok("directives non-empty", dirs.length >= 3);
ok(
  "directives name challenge",
  dirs.some((d) => /SPARK CHALLENGE/i.test(d))
);
ok(
  "no badge economy language",
  dirs.every((d) => !/badge inventory|collectible|unlockable/i.test(d)) &&
    dirs.some((d) => /no badges/i.test(d))
);

const hint = buildChallengeOpeningHint({ skillLabel: "Number line", target: 3 });
ok("opening hint", /Spark challenge|Number line/i.test(hint));

const fromDue = pickSparkChallengeCandidate({
  dueReviews: [
    {
      id: 9,
      isDue: true,
      skillSlug: "frac.sense",
      shortLabel: "Fraction sense",
      topic: "Fraction sense",
      subject: "Math Foundations",
      score: 32,
    },
  ],
});
ok("picks due review", fromDue?.source === "review_due");
ok("due has reviewId", fromDue?.reviewId === 9);
ok("due skill", fromDue?.skillSlug === "frac.sense");

const fromRec = pickSparkChallengeCandidate({
  recommendedNextSkill: {
    slug: "alg.expr",
    shortLabel: "Expressions",
    score: 40,
    stateLabel: "Learning",
  },
});
ok("picks recommended", fromRec?.source === "recommended_next");
ok("rec slug", fromRec?.skillSlug === "alg.expr");

const empty = pickSparkChallengeCandidate({});
ok("empty candidate null", empty === null);

let prog = emptyChallengeProgress({ target: 3, skillSlug: "frac.sense" });
prog = applyChallengeGradedTurn(prog, "correct");
prog = applyChallengeGradedTurn(prog, "exploring"); // ignore
prog = applyChallengeGradedTurn(prog, "incorrect");
prog = applyChallengeGradedTurn(prog, "correct");
ok("two solid so far", prog.correct === 2 && !prog.completed);
ok("progress label mid", /2\/3/.test(challengeProgressLabel(prog)));
const chip = challengeProgressChipCopy(prog);
ok("progress chip near end", /One more solid/i.test(chip || ""));

prog = applyChallengeGradedTurn(prog, "correct");
ok("completed at 3", prog.completed && prog.correct === 3);
ok(
  "complete label",
  /complete/i.test(challengeProgressLabel(prog))
);

const celeb = challengeCelebrationCopy({
  skillLabel: "Fraction sense",
  correct: 3,
});
ok("celebration text", /Spark challenge complete/i.test(celeb.text));
ok("no badge in celebration", !/badge|trophy inventory/i.test(celeb.text));
ok("persistence note", /solid turns/i.test(celeb.persistenceNote));

ok(
  "event types",
  LearningEventType.CHALLENGE_STARTED === "challenge.started" &&
    LearningEventType.CHALLENGE_COMPLETED === "challenge.completed"
);

console.log(`\n${passed} checks passed.`);
