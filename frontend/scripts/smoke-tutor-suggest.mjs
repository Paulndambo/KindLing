/**
 * Smoke: real-world + suggestion chip helpers.
 *
 *   npx esbuild scripts/smoke-tutor-suggest.mjs --bundle --platform=node --format=esm \
 *     --outfile=scripts/smoke-suggest-bundle.mjs
 *   node scripts/smoke-suggest-bundle.mjs
 */
import assert from "node:assert/strict";
import {
  SUGGEST_MIN,
  SUGGEST_MAX,
  stripSuggestTags,
  parseSuggestBody,
  extractTutorSuggestions,
  buildFallbackSuggestions,
  resolveTutorSuggestions,
  buildSuggestPromptBlock,
  buildRealWorldExamplePromptBlock,
} from "../src/services/learning/tutorSuggestions.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Tutor suggestions + real-world smoke\n");

ok("min/max", SUGGEST_MIN === 3 && SUGGEST_MAX === 5);

const body = parseSuggestBody(
  ': Let me try one | Why does that work? | Show another everyday example | Go slower'
);
ok("parse pipes", body.length === 4);
ok("parse first", body[0] === "Let me try one");

const raw =
  'Fractions are equal parts — like sharing a chapati into 4. Want to try?\n\n' +
  '⟦suggests: Let me try one | Why equal parts? | Another market example | I get it — check me | Go slower⟧';

const extracted = extractTutorSuggestions(raw);
ok("extract count", extracted.suggestions.length === 5);
ok("clean hides tag", !/suggests/i.test(extracted.cleanText));
ok("clean keeps example", /chapati/i.test(extracted.cleanText));
ok("strip alone", !/⟦/.test(stripSuggestTags(raw)));

const fb = buildFallbackSuggestions({
  topic: "Adding fractions",
  country: "Kenya",
  interests: ["football"],
});
ok("fallback >= 3", fb.length >= SUGGEST_MIN && fb.length <= SUGGEST_MAX);
ok("kenya-ish fallback", fb.some((s) => /market|home|everyday|real/i.test(s)));

const resolved = resolveTutorSuggestions(
  "Nice work on thirds.",
  { topic: "Fractions", country: "Kenya" }
);
ok(
  "resolve fills 3-5",
  resolved.suggestions.length >= 3 && resolved.suggestions.length <= 5
);

const partial = resolveTutorSuggestions(
  'Ok. ⟦suggests: Only one chip⟧',
  { topic: "Math" }
);
ok("partial padded", partial.suggestions.length >= 3);

const sp = buildSuggestPromptBlock({ studentName: "Amina" });
ok("suggest prompt", /3 to 5|3–5|suggests/i.test(sp));
ok("suggest prompt format", /⟦suggests:/i.test(sp));

const rw = buildRealWorldExamplePromptBlock({
  studentName: "Amina",
  country: "Kenya",
  interestsStr: "football, cooking",
});
ok("real-world prompt", /real-world|everyday/i.test(rw) && /Kenya|East African/i.test(rw));
ok("real-world interests", /football|cooking/i.test(rw));

// Display/TTS path uses stripSuggestTags before speech — verify clean text
const forSpeech = stripSuggestTags(raw);
ok("speech path strips tag", !/suggests|⟦/i.test(forSpeech));
ok("speech keeps content", /chapati|Fractions/i.test(forSpeech));
ok(
  "speech no chip dump",
  !/Let me try one/i.test(forSpeech)
);

console.log(`\n${passed} checks passed.`);
