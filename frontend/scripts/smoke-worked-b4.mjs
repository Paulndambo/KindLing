/**
 * Smoke checks for Epic B4 worked-example library (local pack).
 */
import assert from "node:assert/strict";
import {
  findWorkedExample,
  listWorkedExamples,
  buildLibraryPromptBlock,
  parseGradeNumber,
  listLocalWorkedExamples,
} from "../src/services/learning/workedExamples.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic B4 smoke — worked-example library\n");

const all = listLocalWorkedExamples();
ok("local pack has many examples", all.length >= 12);
ok(
  "covers fraction + algebra skills",
  all.some((e) => e.skillSlug?.startsWith("frac.")) &&
    all.some((e) => e.skillSlug?.startsWith("alg."))
);
ok(
  "has counterexamples",
  all.some((e) => e.kind === "counterexample")
);

const frac = findWorkedExample({
  subject: "Math Foundations",
  topic: "Fraction sense",
  grade: 4,
});
ok("finds fraction sense example", Boolean(frac?.title && frac.steps?.length));
ok("age band fits grade 4", frac.gradeMin <= 4 && frac.gradeMax >= 4);

const equiv = findWorkedExample({
  subject: "Math Foundations",
  topic: "Equivalent fractions",
  grade: 4,
});
ok("equivalent fractions match", /equiv|same amount|2\/4/i.test(equiv?.title + equiv?.problem));

const counter = listWorkedExamples({
  subject: "Math Foundations",
  topic: "Comparing fractions",
  kind: "counterexample",
});
ok("counterexamples for compare", counter.length >= 1);

const alg = findWorkedExample({
  subject: "Math Foundations",
  topic: "Simple equations",
  grade: 6,
});
ok("algebra example", alg?.skillSlug?.startsWith("alg."));

ok("parseGrade 5th Grade", parseGradeNumber("5th Grade") === 5);
ok("parseGrade K", parseGradeNumber("K") === 0);

const block = buildLibraryPromptBlock([frac, equiv].filter(Boolean));
ok("prompt prefers library", /CURATED WORKED-EXAMPLE LIBRARY/i.test(block));
ok("prompt includes problem", block.includes(frac.problem));
ok("no shame language", !/stupid|fail|lazy/i.test(block));

console.log(`\nAll ${passed} checks passed.`);
