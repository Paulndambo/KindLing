/**
 * Smoke checks for practical how-to teaching (hands-on skill guides).
 *
 * Run:
 *   npx esbuild scripts/smoke-practical-howto.mjs --bundle --platform=node --format=esm \
 *     --banner:js="if(typeof import.meta!=='undefined'){try{import.meta.env=import.meta.env||{VITE_API_URL:'http://127.0.0.1:8000'}}catch(e){}}" \
 *     --outfile=scripts/smoke-practical-howto-bundle.mjs
 *   node scripts/smoke-practical-howto-bundle.mjs
 */
import assert from "node:assert/strict";
import {
  isPracticalSkillTopic,
  findPracticalGuide,
  listPracticalGuides,
  buildPracticalHowToPromptBlock,
  buildPracticalOpeningAddendum,
  practicalHowToDirectives,
  practicalHowToSuggestionPool,
} from "../src/services/learning/practicalGuides.js";
import {
  decidePedagogy,
  PedagogicalAction,
  executionBriefForAction,
} from "../src/services/learning/pedagogicalPolicy.js";
import {
  buildSystemPrompt,
  buildLessonOpeningPrompt,
} from "../src/services/gemini.js";
import {
  buildFallbackSuggestions,
  buildSuggestPromptBlock,
} from "../src/services/learning/tutorSuggestions.js";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("Practical how-to smoke\n");

ok(
  "detects Files & folders as practical",
  isPracticalSkillTopic("Files & folders", "Computer Science")
);
ok(
  "fraction topic is not auto-practical",
  !isPracticalSkillTopic("Fraction sense", "Math Foundations")
);

const guide = findPracticalGuide({
  topic: "Files & folders",
  subject: "Computer Science",
});
ok("finds create-folder guide", guide?.id === "pg.cs.files.create_folder");
ok("guide has 5+ steps", (guide?.steps || []).length >= 5);
ok("guide has try-it checklist", (guide?.tryIt || []).length >= 2);

const guides = listPracticalGuides({ topic: "Files & folders" });
ok("lists multiple related guides", guides.length >= 2);

const block = buildPracticalHowToPromptBlock({
  topic: "Files & folders",
  subject: "Computer Science",
  studentName: "Amina",
  isFirstSession: true,
});
ok("prompt block is mandatory", /MANDATORY/i.test(block));
ok("prompt block includes curated steps", /Create a new folder/i.test(block));
ok(
  "prompt says do not withhold how-to",
  /do not withhold|Show the steps|numbered/i.test(block)
);

const dirs = practicalHowToDirectives({
  topic: "Files & folders",
  subject: "Computer Science",
});
ok("directives mention hands-on", dirs.some((d) => /hands-on|how-to/i.test(d)));

const openDec = decidePedagogy(null, {
  subject: "Computer Science",
  topic: "Files & folders",
  sessionPhase: "open",
  preferPracticalHowTo: true,
});
ok("open session chooses EXPLAIN", openDec.action === PedagogicalAction.EXPLAIN);
ok("open session sets practicalHowTo", openDec.params?.practicalHowTo === true);
ok(
  "execution brief is procedural",
  /how-to|steps|device|try-it/i.test(openDec.executionBrief || "")
);

const midDec = decidePedagogy(null, {
  subject: "Computer Science",
  topic: "Files & folders",
  sessionPhase: "active",
  preferPracticalHowTo: true,
  lastSignals: { correctness: "correct" },
});
ok(
  "mid success stays Socratic with how-to flag",
  midDec.action === PedagogicalAction.CONTINUE_SOCRATIC &&
    midDec.params?.practicalHowTo === true
);

const howToQ = decidePedagogy(null, {
  subject: "Computer Science",
  topic: "Files & folders",
  sessionPhase: "active",
  preferPracticalHowTo: true,
  lastSignals: {
    correctness: "exploring",
    isQuestion: true,
    studentText: "How do I create a folder?",
  },
});
ok(
  "how-do-I question → EXPLAIN how-to",
  howToQ.action === PedagogicalAction.EXPLAIN && howToQ.params?.practicalHowTo
);

const brief = executionBriefForAction(PedagogicalAction.FULL_GUIDE, {
  practicalHowTo: true,
  topic: "Files & folders",
});
ok("FULL_GUIDE practical brief", /device how-to|try-it/i.test(brief));

const chips = buildFallbackSuggestions({
  topic: "Files & folders",
  subject: "Computer Science",
});
ok(
  "fallback chips include step-by-step",
  chips.some((c) => /step by step|walk me|try-it/i.test(c))
);
ok(
  "suggestion pool has how-to",
  practicalHowToSuggestionPool("Files").some((c) => /step by step/i.test(c))
);

const suggestBlock = buildSuggestPromptBlock({
  studentName: "Amina",
  topic: "Files & folders",
  subject: "Computer Science",
});
ok("suggest prompt requires hands-on chip", /hands-on chip/i.test(suggestBlock));

const opening = buildLessonOpeningPrompt({
  topicName: "Files & folders",
  subjectName: "Computer Science",
  studentName: "Amina",
  topicContext: { familiarity: "new", isFirstSession: true },
});
ok(
  "opening requires hands-on path",
  /hands-on|step by step|how-to/i.test(opening)
);
ok(
  "opening addendum present",
  buildPracticalOpeningAddendum({ topicName: "Files & folders" }).includes(
    "PRACTICAL"
  )
);

const sys = buildSystemPrompt(
  "Computer Science",
  "Files & folders",
  { encourage: true, visuals: true },
  {
    name: "Amina",
    grade: "Grade 6",
    country: "Kenya",
    curriculum: "CBC",
    learningStyle: "visual",
  },
  null,
  { topicContext: { familiarity: "new", isFirstSession: true } }
);
ok("system prompt has practical how-to section", /Practical how-to teaching/i.test(sys));
ok("system prompt embeds create-folder guide", /Create a folder/i.test(sys));
ok(
  "system philosophy is practical mode",
  /practical skill|how-to mode|numbered how-to/i.test(sys)
);
ok(
  "Socratic carve-out for procedures",
  /Procedural|how-to \/ procedural|withhold how-to/i.test(sys)
);

console.log(`\n${passed} checks passed.`);
