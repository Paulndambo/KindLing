/**
 * Epic L4 smoke — independence twin + transfer bank.
 *
 *   npx esbuild scripts/smoke-independence-l4.mjs --bundle --platform=node --format=esm \
 *     --banner:js="if(typeof import.meta!=='undefined'){try{import.meta.env=import.meta.env||{VITE_API_URL:'http://127.0.0.1:8000'}}catch(e){}}" \
 *     --outfile=scripts/smoke-l4-bundle.mjs
 *   node --input-type=module -e "import.meta.env={VITE_API_URL:'http://127.0.0.1:8000'}; await import('./scripts/smoke-l4-bundle.mjs')"
 */
import assert from "node:assert/strict";
import {
  shouldOfferIndependenceTwin,
  buildIndependenceOfferCard,
  pickIndependenceTwinQuestion,
  createIndependenceSession,
  applyIndependenceAnswer,
  completeIndependenceAfterExplain,
  independenceRate,
  preferTransferForLadder,
  HEAVY_HELP_MIN_LEVEL,
  IndependencePhase,
} from "../src/services/learning/independenceCheck.js";
import { questionsForTopic } from "../src/services/learning/assessmentBank.js";
import { LearningEventType } from "../src/services/learning/types.js";
import { InterventionLevel } from "../src/services/learning/interventionLadder.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic L4 smoke — Independence & transfer\n");

ok("heavy help min is worked example", HEAVY_HELP_MIN_LEVEL === InterventionLevel.WORKED_EXAMPLE);
ok(
  "events registered",
  LearningEventType.INDEPENDENCE_OFFERED === "independence.offered" &&
    LearningEventType.INDEPENDENCE_COMPLETED === "independence.completed"
);

ok(
  "no offer below L2",
  shouldOfferIndependenceTwin({
    ladderLevel: 1,
    hadGradedSuccessDuringHelp: true,
  }) === false
);
ok(
  "offer after L2 + success",
  shouldOfferIndependenceTwin({
    ladderLevel: 2,
    hadGradedSuccessDuringHelp: true,
  }) === true
);
ok(
  "offer after L3 without success",
  shouldOfferIndependenceTwin({
    ladderLevel: 3,
    hadGradedSuccessDuringHelp: false,
  }) === true
);
ok(
  "no double offer",
  shouldOfferIndependenceTwin({
    ladderLevel: 3,
    hadGradedSuccessDuringHelp: true,
    alreadyOfferedThisSession: true,
  }) === false
);

ok("prefer transfer for full guide", preferTransferForLadder(3) === true);
ok("prefer twin not transfer for L2", preferTransferForLadder(2) === false);

const card = buildIndependenceOfferCard({
  topic: "Computer hardware",
  transfer: true,
  ladderLevel: 3,
});
ok(
  "offer card warm",
  /own|fresh|confidence|stuck|twin|hints/i.test(card.body + " " + card.headline)
);
ok("no shame words", !/fail|test you|wrong/i.test(card.body));

const transferQs = questionsForTopic("Computer Science", "Computer hardware", {
  transferOnly: true,
  limit: 5,
  minScore: 4,
});
ok("CS hardware has transfer items", transferQs.length >= 1);
ok(
  "transfer flag on bank items",
  transferQs.every((q) => q.transfer === true)
);

const picked = pickIndependenceTwinQuestion({
  subject: "Computer Science",
  topic: "Computer hardware",
  preferTransfer: true,
});
ok("pick twin question", Boolean(picked?.question?.prompt));
ok("picked marks transfer when available", picked.transfer === true);

const ses = createIndependenceSession({
  subject: "Computer Science",
  topic: "Computer hardware",
  ladderLevel: 3,
  preferTransfer: true,
});
ok("create session", ses && ses.questions.length === 1);
ok("session noScaffold", ses.noScaffold === true);
ok("session active", ses.status === IndependencePhase.ACTIVE);

const q = ses.questions[0];
const { session: mid, result } = applyIndependenceAnswer(ses, q.correctIndex);
ok("answer grades", result && result.correct === true);
ok("explaining phase", mid.phase === IndependencePhase.EXPLAINING);

const { session: done, completed, outcome } = completeIndependenceAfterExplain(mid);
ok("completed", completed === true);
ok("outcome success", outcome?.success === true);
ok("outcome independence demonstrated", outcome?.independence === "demonstrated");
ok("done status", done.status === IndependencePhase.COMPLETED);

const rate = independenceRate([
  { success: true },
  { success: false },
  { success: true, transfer: true },
  { skipped: true },
]);
ok("independence rate 2/3", rate === 0.667 || rate === 2 / 3);

// Math transfer
const mathTransfer = questionsForTopic("Math Foundations", "Parts of a whole", {
  transferOnly: true,
  limit: 3,
  minScore: 3,
});
ok("math has transfer-flagged item", mathTransfer.some((q) => q.transfer));

console.log(`\nAll ${passed} L4 checks passed.`);
