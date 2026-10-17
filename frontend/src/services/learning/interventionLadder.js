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
  /**
   * Epic L3 — ADI result from computeAdi / computeAdiFromContext.
   * When independence is rising, prefer lighter rungs (never increases help).
   */
  adi = null,
  /** Skip ADI fade (manual tools / explicit escalate already handled). */
  skipAdiPreference = false,
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

  // Epic L3.2 — fade help when ADI says independence is growing
  if (!skipAdiPreference && adi) {
    // Lazy import avoided: apply inline to keep ladder free of circular deps
    // (adi.js imports normalizeLevel from this module)
    if (adi.reliable && adi.preferLighterHelp) {
      if (shouldAutoEnter) {
        level = Math.min(level, InterventionLevel.FULL_GUIDE);
      } else {
        const cap =
          adi.ladderCap != null
            ? normalizeLevel(adi.ladderCap)
            : InterventionLevel.WORKED_EXAMPLE;
        if (level > cap) {
          level = Math.max(
            InterventionLevel.MICRO_HINT,
            Math.min(level - 1, cap)
          );
        }
      }
    }
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
1. Warmly validate their effort and clarify the specific part of the concept where they got stuck.
2. Give ONE clear, illuminating hint or guiding analogy — without handing over the final answer outright.
3. Explain *why* that hint matters in natural, encouraging prose (1–2 paragraphs), then ask one focused guiding question.
4. If they still struggle after this, the app may offer a stronger level — keep your tone patient and supportive.
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
No library example matched — craft one thorough, concrete worked example tied to ${name}'s interests (${interestsStr}) when natural.
`;

    return `
═══════════════════════════════════════
INTERVENTION LADDER — LEVEL 2: WORKED EXAMPLE
═══════════════════════════════════════
${name} needs a modeled example on "${topic}" (${subject}). Context: ${why}.

Your job at this level:
1. Warmly acknowledge the sticky part without shame.
2. Present ONE complete, well-explained worked example (problem → step-by-step reasoning and *why* each step works → final answer), then invite ${name} to try a parallel “twin” problem.
3. Make sure every step in the example is unpacked clearly in natural language so the student genuinely learns the pattern.
4. Check understanding with one parallel practice question after the example.
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
2. Offer a brief break idea (stretch, water, 3 slow breaths) OR an easier related skill warm-up with a clear, gentle explanation.
3. ${skillLine}
4. If they choose the easier skill, explain its core idea warmly with a simple everyday model and start with a confidence-building question — do not pile on the hard topic yet.
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
2. Teach with a thorough, patient step-by-step guide: unpack the underlying concepts and intuition, then show detailed worked examples / demonstrations.
3. Break complex ideas into clear, digestible steps. Explain *why* each step works, and after teaching the current building block, check understanding with a clear question before moving on.
4. Use concrete, relatable examples (and visual / hands-on ideas when helpful). Tie examples to ${name}'s interests (${interestsStr}) when natural.
5. You MAY fully explain and demonstrate — this is not pure Socratic discovery mode right now.
6. Stay in guide mode until the student exits (UI action) or clearly wants to return to practice.
7. Keep language warm, natural, and age-appropriate. Still celebrate micro-wins.
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
Respond to ${name} now: warmly acknowledge their effort, unpack the intuition around the tricky spot, and give one helpful hint or guiding analogy — without giving the final answer away. Then invite them to try again.`;
  }

  if (rank === InterventionLevel.WORKED_EXAMPLE) {
    const ex = workedExample
      ? `Use this library example: “${workedExample.title}” — ${workedExample.problem}. Steps: ${(workedExample.steps || []).join(" → ")}.`
      : `Craft one clear, concrete worked example.`;
    return `[INTERNAL MODE CHANGE — student does not see this line]
Enter WORKED-EXAMPLE mode (ladder level 2) for "${topic}" (${subject}).
Context: you noticed ${why}.
Respond to ${name} now: warmly let them know you'll walk through a complete example together first, and then they can try a similar one. ${ex}
Walk through the example thoroughly (explaining *why* each step happens), then pose one parallel practice question.`;
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
Respond to ${name} now: warmly tell them you noticed this part is tricky, and that you'll walk them through it step by step with thorough explanations and worked examples. Teach step 1 of the guide clearly and naturally.`;
}

export function buildLadderExitMessage({ studentName, topic, level } = {}) {
  const name = studentName || "the student";
  const rank = normalizeLevel(level);
  const meta = levelMeta(rank);
  return `[INTERNAL MODE CHANGE — student does not see this line]
Exit ${meta.label} mode (ladder). Return to normal adaptive tutoring for "${topic}".
Respond warmly to ${name}: acknowledge you're transitioning back to practicing together, celebrate their progress and persistence, recap the key takeaway they just mastered, and ask one focused practice question — do NOT give answers away.`;
}
