/**
 * Smoke checks for Epic B8 end-of-session reflection.
 */
import assert from "node:assert/strict";
import {
  REFLECTION_CLICKED_OPTIONS,
  REFLECTION_NEXT_OPTIONS,
  buildSessionReflectionCard,
  formatReflectionNote,
  reflectionDirectivesFromLast,
  suggestReviewSparkCta,
  shouldOfferSessionReflection,
  getClickedOption,
  getNextOption,
} from "../src/services/learning/sessionReflection.js";
import {
  applySessionReflectionToProfile,
  createEmptyProfile,
  buildPersonalizationInsights,
} from "../src/services/learning/profileStore.js";
import { LearningEventType } from "../src/services/learning/types.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Epic B8 smoke — session reflection\n");

ok("clicked options present", REFLECTION_CLICKED_OPTIONS.length >= 3);
ok("next options present", REFLECTION_NEXT_OPTIONS.length >= 3);
ok(
  "no shame labels",
  [...REFLECTION_CLICKED_OPTIONS, ...REFLECTION_NEXT_OPTIONS].every(
    (o) => !/stupid|fail|lazy|bad student/i.test(o.label)
  )
);

const card = buildSessionReflectionCard({ topic: "Fraction sense" });
ok("card has headline", /wrap/i.test(card.headline));
ok("card mentions topic", /Fraction sense/.test(card.body));

ok(
  "offer when has turns",
  shouldOfferSessionReflection({ turnCount: 2, messageCount: 0 })
);
ok(
  "no offer on error exit",
  !shouldOfferSessionReflection({ turnCount: 5, isErrorExit: true })
);
ok(
  "no offer when empty",
  !shouldOfferSessionReflection({ turnCount: 0, messageCount: 0 })
);
ok(
  "no double offer",
  !shouldOfferSessionReflection({
    turnCount: 3,
    alreadyReflected: true,
  })
);

const note = formatReflectionNote({
  clickedId: "fuzzy",
  nextId: "practice",
  topic: "Adding fractions",
});
ok("formats note without free text", /fuzzy|practice|Adding/i.test(note));

const free = formatReflectionNote({
  freeNote: "  Pizza fractions clicked  ",
  clickedId: "clicked",
});
ok("prefers free note", free === "Pizza fractions clicked");

const dirs = reflectionDirectivesFromLast({
  clickedId: "fuzzy",
  nextId: "practice",
  note,
  skipped: false,
});
ok("directives non-empty", dirs.length >= 1);

const restCta = suggestReviewSparkCta({
  nextId: "rest",
  topic: "Fractions",
  subject: "Math",
});
ok("rest suppresses review CTA", restCta === null);

const practiceCta = suggestReviewSparkCta({
  nextId: "practice",
  topic: "Fraction sense",
  subject: "Math Foundations",
});
ok(
  "practice suggests review spark",
  practiceCta && /review|practice/i.test(practiceCta.label)
);

let profile = createEmptyProfile("b8_kid");
profile = applySessionReflectionToProfile(profile, {
  clickedId: "clicked",
  nextId: "continue",
  note: "Something clicked on Fraction sense",
  subject: "Math Foundations",
  topic: "Fraction sense",
  skipped: false,
});
ok("profile stores lastReflection", profile.lastReflection?.clickedId === "clicked");
ok(
  "profile history grows",
  Array.isArray(profile.reflectionHistory) && profile.reflectionHistory.length === 1
);

const insights = buildPersonalizationInsights(profile, {
  subject: "Math Foundations",
  topic: "Fraction sense",
});
// Need exchanges >= 1 for full path — seed a fake exchange
profile.totals.exchanges = 3;
const insights2 = buildPersonalizationInsights(profile, {
  subject: "Math Foundations",
  topic: "Fraction sense",
});
ok(
  "insights include reflection directive",
  (insights2.directives || []).some((d) => /reflection|click/i.test(d))
);

ok(
  "event type constant",
  LearningEventType.SESSION_REFLECT === "session.reflect"
);
ok("getters work", getClickedOption("tried")?.id === "tried");
ok("next getter", getNextOption("rest")?.kind === "rest");

// unused var silence
ok("card built", Boolean(card) && Boolean(insights));

console.log(`\n${passed} checks passed.`);
