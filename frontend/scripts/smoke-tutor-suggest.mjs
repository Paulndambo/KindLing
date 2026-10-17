/**
 * Smoke: strict on-topic suggestion helpers (0–5 dynamic count) + wind-down flow.
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

console.log("Tutor suggestions (strict topic + dynamic 0–5 count) smoke\n");

ok("min/max (0 to 5 allowed)", SUGGEST_MIN === 0 && SUGGEST_MAX === 5);

const body = parseSuggestBody(
  ": Let's move to the next step | Give me a practice problem | Explain that visual again"
);
ok("parse pipes", body.length === 3);
ok("parse first", body[0] === "Let's move to the next step");

// Off-topic hobby tangent filtered out
const filteredBody = parseSuggestBody(
  ": Let's move to the next step | Connect this to football | Talk about something else"
);
ok("filters off-topic tangents", filteredBody.length === 1 && filteredBody[0] === "Let's move to the next step");

const raw =
  "Fractions are equal parts — like sharing a chapati into 4. Want to try?\n\n" +
  "⟦suggests: Let's move to the next step in Fractions | Try a practice problem on Fractions⟧";

const extracted = extractTutorSuggestions(raw);
ok("extract exact count (2)", extracted.suggestions.length === 2);
ok("clean hides tag", !/suggests/i.test(extracted.cleanText));
ok("clean keeps example", /chapati/i.test(extracted.cleanText));
ok("strip alone", !/⟦/.test(stripSuggestTags(raw)));

// 1 suggestion is NOT padded to 3
const single = resolveTutorSuggestions(
  "Great work! ⟦suggests: Yes, start the quick assessment on Fractions⟧",
  { topic: "Fractions" }
);
ok("single suggestion not padded", single.suggestions.length === 1);

// Explicit `⟦suggests: none⟧` returns 0 suggestions
const explicitNone = resolveTutorSuggestions(
  "Quick Assessment on Fractions:\n1. What is 1/4 + 2/4?\n⟦suggests: none⟧",
  { topic: "Fractions" }
);
ok("explicit none returns 0 chips", explicitNone.suggestions.length === 0);

// Quick Assessment without tag also omits fallback chips so student answers in own words
const assessmentNoTag = resolveTutorSuggestions(
  "Here is your Quick Assessment on Fractions:\nQuestion 1 of 3: What is 1/2 + 1/4?",
  { topic: "Fractions" }
);
ok("assessment turn without tag returns 0 chips", assessmentNoTag.suggestions.length === 0);

// Wind-down confirmation fallback offers focused confirmation chips
const windDownFb = buildFallbackSuggestions({
  topic: "Adding fractions",
  tutorText: "We have covered the key milestones! Are you ready for a quick assessment before we wrap up?",
});
ok(
  "wind-down confirmation chips",
  windDownFb.length === 2 && /quick assessment/i.test(windDownFb[0])
);

// Post-assessment next steps fallback includes Next topic
const postAssessmentFb = buildFallbackSuggestions({
  topic: "Adding fractions",
  nextTopic: "Subtracting fractions",
  tutorText: "You've mastered the core ideas and completed our training! Here are your potential next steps.",
});
ok(
  "post-assessment next topic chip",
  postAssessmentFb.some((s) => /Next topic:\s*Subtracting fractions/i.test(s))
);

// Normal fallback stays 100% on-topic (never hobby tangent)
const fb = buildFallbackSuggestions({
  topic: "Adding fractions",
  country: "Kenya",
  interests: ["football"],
});
ok("fallback strictly on topic", fb.every((s) => /Adding fractions/i.test(s)));
ok("fallback never has hobby tangent", !fb.some((s) => /football/i.test(s)));

const sp = buildSuggestPromptBlock({
  studentName: "Amina",
  topic: "Adding fractions",
  nextTopic: "Subtracting fractions",
});
ok("suggest prompt enforces zero deviation", /ZERO DEVIATION/i.test(sp));
ok("suggest prompt allows 0 to 5", /0, 1, 2, 3|none/i.test(sp));
ok("suggest prompt format", /⟦suggests:/i.test(sp));

const rw = buildRealWorldExamplePromptBlock({
  studentName: "Amina",
  country: "Kenya",
  interestsStr: "football, cooking",
});
ok("real-world prompt", /real-world|everyday/i.test(rw) && /Kenya|East African/i.test(rw));

// Display/TTS path uses stripSuggestTags before speech — verify clean text
const forSpeech = stripSuggestTags(raw);
ok("speech path strips tag", !/suggests|⟦/i.test(forSpeech));
ok("speech keeps content", /chapati|Fractions/i.test(forSpeech));

const { parseVisualDemo } = await import("../src/services/learning/diagramRenderer.js");
const studyPlanSpec = parseVisualDemo(`type: study-plan
title: Study Plan — Adding Fractions
objectives: Understand common denominators | Add fractions visually and algebraically
concepts: Numerator & Denominator | Equivalent Fractions | Common Denominator
1. Section 1: Core Intuition & Visual Foundation | See how fraction pieces combine visually
2. Section 2: Core Mechanism & Worked Application | Find common denominators and add step by step
3. Section 3: Guided Practice & Problem Solving | Solve practice problems together
4. Section 4: Wind-Down, Quick Assessment & Next Steps | Quick check and next steps`);

ok("study-plan kind parsed", studyPlanSpec?.kind === "study-plan");
ok("study-plan objectives parsed", studyPlanSpec?.objectives?.length === 2);
ok("study-plan concepts parsed", studyPlanSpec?.concepts?.length === 3);
ok("study-plan 4 sections parsed", studyPlanSpec?.sections?.length === 4);

console.log(`\n${passed} checks passed.`);


