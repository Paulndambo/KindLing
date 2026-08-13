/**
 * Epic B2 — Graduated intervention ladder.
 *
 * Levels (light → heavy):
 *  1 micro_hint → 2 worked_example → 3 full_guide → 4 break_or_easier
 */

import { StruggleSignal } from "./types";
import { INCORRECT_STREAK_THRESHOLD } from "./struggleThresholds";
import { findWorkedExample } from "./workedExamples";
import { suggestEasierRelatedSkill } from "./skillGraph";

/** Numeric ladder ranks (higher = more scaffold). */
export const InterventionLevel = {
  NONE: 0,
  MICRO_HINT: 1,
  WORKED_EXAMPLE: 2,
  FULL_GUIDE: 3,
  BREAK_OR_EASIER: 4,
};

export const INTERVENTION_LEVEL_META = {
  [InterventionLevel.MICRO_HINT]: {
    id: "micro_hint",
    rank: InterventionLevel.MICRO_HINT,
    label: "Micro-hint",
    shortLabel: "Hint",
    eyebrow: "A gentle nudge",
    acceptCta: "Yes, a small hint",
    activeTitle: "Micro-hint",
    exitLabel: "Back to practice",
    chipText: (topic) => `Micro-hint · ${topic}`,
    description:
      "One small clue — still Socratic. Kindling won’t give the full answer away.",
  },
  [InterventionLevel.WORKED_EXAMPLE]: {
    id: "worked_example",
    rank: InterventionLevel.WORKED_EXAMPLE,
    label: "Worked example",
    shortLabel: "Example",
    eyebrow: "See one worked out",
    acceptCta: "Show me an example",
    activeTitle: "Worked example",
    exitLabel: "Back to practice",
    chipText: (topic) => `Worked example · ${topic}`,
    description:
      "Watch a similar problem solved step by step, then try a twin yourself.",
  },
  [InterventionLevel.FULL_GUIDE]: {
    id: "full_guide",
    rank: InterventionLevel.FULL_GUIDE,
    label: "Step-by-step guide",
    shortLabel: "Guide",
    eyebrow: "Walk through together",
    acceptCta: "Yes, guide me",
    activeTitle: "Step-by-step guide",
    exitLabel: "Exit guide",
    chipText: (topic) => `Guide mode · ${topic}`,
    description:
      "Clear explanations and examples, one small step at a time. Leave anytime.",
  },
  [InterventionLevel.BREAK_OR_EASIER]: {
    id: "break_or_easier",
    rank: InterventionLevel.BREAK_OR_EASIER,
    label: "Break or easier path",
    shortLabel: "Easier path",
    eyebrow: "A softer path",
    acceptCta: "Yes, easier path",
    activeTitle: "Easier path",
    exitLabel: "Back to practice",
    chipText: (topic) => `Easier path · ${topic}`,
    description:
      "Pause the hard bit, reset with a break, or warm up on a related easier skill.",
  },
};

export const LADDER_LEVELS = [
  InterventionLevel.MICRO_HINT,
  InterventionLevel.WORKED_EXAMPLE,
  InterventionLevel.FULL_GUIDE,
  InterventionLevel.BREAK_OR_EASIER,
];

export function levelMeta(level) {
  const rank = normalizeLevel(level);
  return INTERVENTION_LEVEL_META[rank] || INTERVENTION_LEVEL_META[InterventionLevel.FULL_GUIDE];
}

export function normalizeLevel(level) {
  if (level == null || level === "" || level === "none") return InterventionLevel.NONE;
  if (typeof level === "number" && Number.isFinite(level)) {
    return Math.max(0, Math.min(4, Math.round(level)));
  }
  const id = String(level).toLowerCase();
  const byId = Object.values(INTERVENTION_LEVEL_META).find((m) => m.id === id);
  if (byId) return byId.rank;
  // Legacy binary guide → full guide
  if (id === "guide" || id === "intervention" || id === "step_by_step") {
    return InterventionLevel.FULL_GUIDE;
  }
  return InterventionLevel.FULL_GUIDE;
}

/**
 * Pick a ladder level from struggle signals and session history.
 * Escalates if a lighter level was already used this session.
 */
export function selectInterventionLevel({
  reason = null,
  consecutiveIncorrect = 0,
  consecutiveHints = 0,
  affect = null,
  scaffoldingBias = 0,
  topicThrashing = false,
  shouldAutoEnter = false,
  /** Highest rank already entered this session (0 = none). */
  highestLevelUsed = 0,
  /** If already active, escalate one step from this rank. */
  escalateFrom = 0,
  /** Force a specific level (manual tools pick). */
  forcedLevel = null,
} = {}) {
  if (forcedLevel != null) {
    return normalizeLevel(forcedLevel);
  }

  if (escalateFrom > 0) {
    return Math.min(
      InterventionLevel.BREAK_OR_EASIER,
      normalizeLevel(escalateFrom) + 1
    );
  }

  let level = InterventionLevel.MICRO_HINT;

  const frustrated = affect === "frustrated";
  const heavyStreak = consecutiveIncorrect >= INCORRECT_STREAK_THRESHOLD + 1;
  const streakHit = consecutiveIncorrect >= INCORRECT_STREAK_THRESHOLD;

  if (
    reason === StruggleSignal.TOPIC_THRASHING ||
    topicThrashing ||
    (frustrated && heavyStreak && scaffoldingBias >= 0.5)
  ) {
    level = InterventionLevel.BREAK_OR_EASIER;
  } else if (
    reason === StruggleSignal.FRUSTRATION ||
    heavyStreak ||
    shouldAutoEnter ||
    (streakHit && frustrated)
  ) {
    level = InterventionLevel.FULL_GUIDE;
  } else if (
    reason === StruggleSignal.INCORRECT_STREAK ||
    reason === StruggleSignal.RAPID_GUESSING ||
    reason === StruggleSignal.REPEATED_HINTS ||
    consecutiveHints >= 2 ||
    streakHit
  ) {
    level = InterventionLevel.WORKED_EXAMPLE;
  } else if (
    reason === StruggleSignal.IDLE ||
    reason === StruggleSignal.SHORT_ANSWERS ||
    reason === StruggleSignal.OFF_TOPIC
  ) {
    level = InterventionLevel.MICRO_HINT;
  } else if (scaffoldingBias >= 0.55) {
    level = InterventionLevel.WORKED_EXAMPLE;
  }

  // If student already used this (or higher) level, step up once
  const used = normalizeLevel(highestLevelUsed);
  if (used >= level && used < InterventionLevel.BREAK_OR_EASIER) {
    level = used + 1;
  } else if (used >= InterventionLevel.BREAK_OR_EASIER) {
    level = InterventionLevel.BREAK_OR_EASIER;
  }

  return level;
}

/**
 * Whether active intervention should re-offer escalate after more struggle.
 */
export function shouldOfferEscalation({
  currentLevel = 0,
  consecutiveIncorrect = 0,
  consecutiveHints = 0,
  affect = null,
  alreadyOfferedEscalate = false,
} = {}) {
  const rank = normalizeLevel(currentLevel);
  if (rank <= 0 || rank >= InterventionLevel.BREAK_OR_EASIER) return false;
  if (alreadyOfferedEscalate) return false;

  const frustrated = affect === "frustrated";
  if (consecutiveIncorrect >= 2 || consecutiveHints >= 2 || frustrated) {
    return true;
  }
  return false;
}

/**
 * Enrich intervention context with ladder metadata, worked example, easier skill.
 */
export function enrichInterventionContext(baseContext = {}, opts = {}) {
  const {
    profile = null,
    subject = baseContext.subject,
    topic = baseContext.topic,
    level: levelIn = baseContext.level,
    grade = null,
  } = opts;

  const level = normalizeLevel(levelIn || InterventionLevel.FULL_GUIDE);
  const meta = levelMeta(level);

  const workedExample =
    level === InterventionLevel.WORKED_EXAMPLE ||
    level === InterventionLevel.FULL_GUIDE
      ? findWorkedExample({
          subject,
          topic,
          skillSlug: opts.skillSlug,
          grade,
          kind: "example",
        })
      : level === InterventionLevel.MICRO_HINT
        ? null
        : findWorkedExample({ subject, topic, grade, kind: "example" });
  const easierSkill =
    level === InterventionLevel.BREAK_OR_EASIER
      ? suggestEasierRelatedSkill(profile, subject, topic)
      : null;

  const topicLabel = topic || baseContext.topic || "this idea";
  const body = buildLevelOfferBody(level, topicLabel, {
    workedExample,
    easierSkill,
    reasonText: baseContext.reasonText,
  });

  return {
    ...baseContext,
    level,
    levelId: meta.id,
    levelLabel: meta.label,
    levelShortLabel: meta.shortLabel,
    acceptCta: meta.acceptCta,
    activeTitle: meta.activeTitle,
    exitLabel: meta.exitLabel,
    eyebrow: meta.eyebrow,
    description: meta.description,
    body,
    headline: baseContext.headline || `I noticed ${baseContext.reasonText || "this is tricky"}`,
    workedExample: workedExample
      ? {
          id: workedExample.id,
          title: workedExample.title,
          skillSlug: workedExample.skillSlug,
          problem: workedExample.problem,
          // Steps go to tutor prompt; keep UI summary light
          summary: workedExample.summary || workedExample.title,
        }
      : null,
    easierSkill: easierSkill
      ? {
          slug: easierSkill.slug,
          name: easierSkill.name,
          shortLabel: easierSkill.shortLabel,
          topic: easierSkill.topic,
          subject: easierSkill.subject || subject,
          reason: easierSkill.reason,
          score: easierSkill.score,
        }
      : null,
  };
}

function buildLevelOfferBody(level, topicLabel, { workedExample, easierSkill } = {}) {
  switch (normalizeLevel(level)) {
    case InterventionLevel.MICRO_HINT:
      return `Want a tiny hint on "${topicLabel}" — just enough to unstick you, without giving the answer away? You can leave anytime.`;
    case InterventionLevel.WORKED_EXAMPLE:
      return workedExample
        ? `Want me to walk through a worked example (“${workedExample.title}”) for "${topicLabel}", then let you try a similar one? You can leave anytime.`
        : `Want me to show a worked example for "${topicLabel}", then let you try a twin problem? You can leave anytime.`;
    case InterventionLevel.BREAK_OR_EASIER: {
      if (easierSkill?.name) {
        return `This bit is feeling heavy. Want a short reset — or warm up on “${easierSkill.name}” first, which unlocks "${topicLabel}"? You can leave anytime.`;
      }
      return `This bit is feeling heavy. Want a short reset and a gentler path on "${topicLabel}"? No pressure — you can leave anytime.`;
    }
    case InterventionLevel.FULL_GUIDE:
    default:
      return `Want me to walk you through "${topicLabel}" step by step — with clear explanations and examples? You can leave the guide anytime.`;
  }
}

/**
 * Tutor system-prompt block for an active ladder level.
 */
export function buildLadderTutorBlock({
  studentName,
  topic,
  subject,
  level,
  reasonText,
  workedExample = null,
  easierSkill = null,
  interestsStr = "their interests",
} = {}) {
  const name = studentName || "the student";
  const rank = normalizeLevel(level);
  const meta = levelMeta(rank);
  const why = reasonText || "this part feels tricky";

  if (rank === InterventionLevel.MICRO_HINT) {
    return `
═══════════════════════════════════════
INTERVENTION LADDER — LEVEL 1: MICRO-HINT
═══════════════════════════════════════
${name} needs a light scaffold on "${topic}" (${subject}). Context: ${why}.

Your job at this level:
1. Give ONE small hint or leading question — not the full answer.
2. Stay mostly Socratic. Do not dump steps or a full worked solution.
3. Keep the message short (2–4 sentences). Celebrate effort.
4. If they still struggle after this, the app may offer a stronger level — do not escalate yourself into a full lecture.
5. Never mention "intervention ladder", levels, or scores by those names.
`;
  }

  if (rank === InterventionLevel.WORKED_EXAMPLE) {
    const libraryBlock = workedExample
      ? `
Prefer this curated worked example (adapt language to age; do not read tags aloud):
Title: ${workedExample.title}
Problem: ${workedExample.problem}
Steps:
${(workedExample.steps || []).map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
Takeaway: ${workedExample.takeaway || ""}
${workedExample.counterexample ? `Common mix-up to gently contrast: ${workedExample.counterexample}` : ""}
`
      : `
No library example matched — invent one short, concrete worked example tied to ${name}'s interests (${interestsStr}) when natural.
`;

    return `
═══════════════════════════════════════
INTERVENTION LADDER — LEVEL 2: WORKED EXAMPLE
═══════════════════════════════════════
${name} needs a modeled example on "${topic}" (${subject}). Context: ${why}.

Your job at this level:
1. Warmly acknowledge the sticky part without shame.
2. Present ONE clear worked example (problem → steps → answer), then invite ${name} to try a parallel “twin” problem.
3. Do not open a full multi-step course guide yet — one example + one try.
4. Check understanding with one simple question after the example.
5. Never mention ladder levels or internal tracking by those names.
${libraryBlock}
`;
  }

  if (rank === InterventionLevel.BREAK_OR_EASIER) {
    const skillLine = easierSkill
      ? `Suggested easier related skill: “${easierSkill.name}”${
          easierSkill.topic ? ` (often practiced under “${easierSkill.topic}”)` : ""
        }. Reason: ${easierSkill.reason || "prerequisite / foundation"}.`
      : `No graph suggestion available — offer a simpler warm-up on the same topic or a 30-second reset breath/stretch, then one easy win.`;

    return `
═══════════════════════════════════════
INTERVENTION LADDER — LEVEL 4: BREAK / EASIER PATH
═══════════════════════════════════════
${name} needs a softer path on "${topic}" (${subject}). Context: ${why}.

Your job at this level:
1. Normalize that brains need resets — this is strength, not failure.
2. Offer a brief break idea (stretch, water, 3 slow breaths) OR an easier related skill warm-up.
3. ${skillLine}
4. If they choose the easier skill, start with a tiny confidence-building question on that skill — do not pile on the hard topic yet.
5. Keep tone warm and unhurried. No shame language.
6. Never mention ladder levels or scores by those names.
`;
  }

  // FULL_GUIDE (level 3) — legacy intervention mode
  return `
═══════════════════════════════════════
INTERVENTION LADDER — LEVEL 3: STEP-BY-STEP GUIDE
═══════════════════════════════════════
${name} is struggling with "${topic}" in ${subject}. Context: ${why}. You entered guided teaching mode.

Your job in this mode:
1. Warmly acknowledge that this part is tricky — normalize struggle without shame.
2. Teach with a clear, patient step-by-step guide: explain concepts, then show worked examples / demonstrations.
3. Break ideas into small steps. After each step, check understanding with a simple question before moving on.
4. Use concrete examples (and visual / hands-on ideas when helpful). Tie examples to ${name}'s interests (${interestsStr}) when natural.
5. You MAY fully explain and demonstrate — this is not pure Socratic discovery mode right now.
6. Stay in guide mode until the student exits (UI action) or clearly wants to return to practice.
7. Keep language warm and age-appropriate. Still celebrate micro-wins.
8. Do not mention "intervention mode", ladder levels, scores, or internal tracking by those names.
${
  workedExample
    ? `Optional library example to prefer when relevant: ${workedExample.title} — ${workedExample.problem}`
    : ""
}
`;
}

/**
 * Hidden enter directive for streaming a ladder-level start message.
 */
export function buildLadderEnterMessage({
  studentName,
  topic,
  subject,
  reasonText,
  level,
  workedExample = null,
  easierSkill = null,
} = {}) {
  const name = studentName || "the student";
  const rank = normalizeLevel(level);
  const why = reasonText || "they are finding this tricky";

  if (rank === InterventionLevel.MICRO_HINT) {
    return `[INTERNAL MODE CHANGE — student does not see this line]
Enter MICRO-HINT mode (ladder level 1) for "${topic}" (${subject}).
Context: you noticed ${why}.
Respond to ${name} now: warmly note you'll give one small hint — not the full answer. Give exactly one useful nudge or leading question, then invite them to try again. Keep it short and kind.`;
  }

  if (rank === InterventionLevel.WORKED_EXAMPLE) {
    const ex = workedExample
      ? `Use this library example: “${workedExample.title}” — ${workedExample.problem}. Steps: ${(workedExample.steps || []).join(" → ")}.`
      : `Invent one short worked example.`;
    return `[INTERNAL MODE CHANGE — student does not see this line]
Enter WORKED-EXAMPLE mode (ladder level 2) for "${topic}" (${subject}).
Context: you noticed ${why}.
Respond to ${name} now: say you'll show one worked example, then they can try a twin. ${ex}
Walk the example clearly, then pose one parallel practice question. Do not start a full multi-step course.`;
  }

  if (rank === InterventionLevel.BREAK_OR_EASIER) {
    const skillBit = easierSkill
      ? `Offer warming up on “${easierSkill.name}”${easierSkill.topic ? ` (topic: ${easierSkill.topic})` : ""} as a confidence builder.`
      : `Offer a short reset and one easier warm-up question on the same topic.`;
    return `[INTERNAL MODE CHANGE — student does not see this line]
Enter BREAK / EASIER-PATH mode (ladder level 4) for "${topic}" (${subject}).
Context: you noticed ${why}.
Respond to ${name} now: normalize that a reset is smart. ${skillBit}
Ask what they prefer (tiny break vs easier warm-up). Stay warm; no shame.`;
  }

  return `[INTERNAL MODE CHANGE — student does not see this line]
Enter INTERVENTION / STEP-BY-STEP GUIDE mode (ladder level 3) for "${topic}" (${subject}).
Context: you noticed ${why}.
Respond to ${name} now: warmly tell them you noticed this part is tricky, and that you'll walk them through it step by step with clear explanations and examples. Start with step 1 of the guide. Keep it friendly and unhurried.`;
}

export function buildLadderExitMessage({ studentName, topic, level } = {}) {
  const name = studentName || "the student";
  const rank = normalizeLevel(level);
  const meta = levelMeta(rank);
  return `[INTERNAL MODE CHANGE — student does not see this line]
Exit ${meta.label} mode (ladder). Return to normal Socratic tutoring for "${topic}".
Respond briefly to ${name}: acknowledge you're going back to practice together, celebrate any progress or persistence, and ask one light check question — do NOT give answers away.`;
}
