/**
 * Kindling skill graph — pilot Fractions → Early Algebra (Epic A1).
 *
 * Client-side BKT-lite mirrors backend/learning/mastery_engine.py so mastery
 * updates even in local-mock mode. When the API is available, server remains
 * source of truth after event ingest.
 */

import { Correctness } from "./types";

export const PILOT_SUBJECT = "Math Foundations";

export const STATE = {
  LOCKED: "locked",
  READY: "ready",
  LEARNING: "learning",
  MASTERED: "mastered",
  RUSTY: "rusty",
};

export const STATE_LABELS = {
  locked: "Growing roots",
  ready: "Ready to spark",
  learning: "Catching fire",
  mastered: "Glowing",
  rusty: "Needs a warm-up",
};

const READY_PREREQ_P = 0.55;
const MASTERED_P = 0.85;
const MASTERED_STREAK = 2;

/** @type {Array<object>} */
export const PILOT_SKILLS = [
  {
    slug: "frac.parts_of_whole",
    name: "Parts of a whole",
    shortLabel: "Equal parts",
    domain: "fractions",
    description: "Equal parts of a whole; unit fractions.",
    pInit: 0.25,
    pTransit: 0.14,
    pSlip: 0.08,
    pGuess: 0.2,
    prereqs: [],
  },
  {
    slug: "frac.numerator_denominator",
    name: "Numerator & denominator",
    shortLabel: "Num / den",
    domain: "fractions",
    description: "Read fractions; know num/den roles.",
    pInit: 0.22,
    pTransit: 0.13,
    pSlip: 0.08,
    pGuess: 0.18,
    prereqs: [{ slug: "frac.parts_of_whole", strength: "required" }],
  },
  {
    slug: "frac.number_line",
    name: "Fractions on a number line",
    shortLabel: "Number line",
    domain: "fractions",
    description: "Place fractions on a number line.",
    pInit: 0.18,
    pTransit: 0.11,
    pSlip: 0.1,
    pGuess: 0.18,
    prereqs: [
      { slug: "frac.parts_of_whole", strength: "required" },
      { slug: "frac.numerator_denominator", strength: "recommended" },
    ],
  },
  {
    slug: "frac.equivalent",
    name: "Equivalent fractions",
    shortLabel: "Equivalence",
    domain: "fractions",
    description: "Generate equivalent fractions with models.",
    pInit: 0.15,
    pTransit: 0.1,
    pSlip: 0.1,
    pGuess: 0.15,
    prereqs: [
      { slug: "frac.numerator_denominator", strength: "required" },
      { slug: "frac.parts_of_whole", strength: "required" },
    ],
  },
  {
    slug: "frac.compare",
    name: "Comparing fractions",
    shortLabel: "Compare",
    domain: "fractions",
    description: "Compare fractions with reasoning or models.",
    pInit: 0.12,
    pTransit: 0.1,
    pSlip: 0.1,
    pGuess: 0.15,
    prereqs: [
      { slug: "frac.equivalent", strength: "required" },
      { slug: "frac.number_line", strength: "recommended" },
    ],
  },
  {
    slug: "frac.add_like",
    name: "Adding like denominators",
    shortLabel: "Add like",
    domain: "fractions",
    description: "Add fractions with the same denominator.",
    pInit: 0.12,
    pTransit: 0.12,
    pSlip: 0.08,
    pGuess: 0.15,
    prereqs: [
      { slug: "frac.numerator_denominator", strength: "required" },
      { slug: "frac.parts_of_whole", strength: "required" },
    ],
  },
  {
    slug: "frac.add_unlike",
    name: "Adding unlike denominators",
    shortLabel: "Add unlike",
    domain: "fractions",
    description: "Add unlike denominators via common denominator.",
    pInit: 0.1,
    pTransit: 0.09,
    pSlip: 0.12,
    pGuess: 0.12,
    prereqs: [
      { slug: "frac.add_like", strength: "required" },
      { slug: "frac.equivalent", strength: "required" },
    ],
  },
  {
    slug: "alg.variable_as_unknown",
    name: "Variables as unknowns",
    shortLabel: "Variables",
    domain: "early_algebra",
    description: "A letter can stand for an unknown.",
    pInit: 0.15,
    pTransit: 0.12,
    pSlip: 0.08,
    pGuess: 0.18,
    prereqs: [{ slug: "frac.parts_of_whole", strength: "recommended" }],
  },
  {
    slug: "alg.balance_idea",
    name: "Balance / equality idea",
    shortLabel: "Balance",
    domain: "early_algebra",
    description: "Both sides of an equation stay equal.",
    pInit: 0.14,
    pTransit: 0.11,
    pSlip: 0.08,
    pGuess: 0.16,
    prereqs: [{ slug: "alg.variable_as_unknown", strength: "required" }],
  },
  {
    slug: "alg.one_step_equation",
    name: "One-step equations",
    shortLabel: "Solve x",
    domain: "early_algebra",
    description: "Solve one-step equations with whole numbers.",
    pInit: 0.1,
    pTransit: 0.1,
    pSlip: 0.1,
    pGuess: 0.14,
    prereqs: [
      { slug: "alg.balance_idea", strength: "required" },
      { slug: "alg.variable_as_unknown", strength: "required" },
    ],
  },
];

/** topic name → skill links */
export const TOPIC_SKILL_MAP = {
  "Fraction sense": [
    { slug: "frac.parts_of_whole", weight: 1, isPrimary: true },
    { slug: "frac.numerator_denominator", weight: 0.85, isPrimary: true },
  ],
  "Fractions on a number line": [
    { slug: "frac.number_line", weight: 1, isPrimary: true },
    { slug: "frac.numerator_denominator", weight: 0.5, isPrimary: false },
  ],
  "Equivalent fractions": [
    { slug: "frac.equivalent", weight: 1, isPrimary: true },
    { slug: "frac.parts_of_whole", weight: 0.4, isPrimary: false },
  ],
  "Comparing fractions": [
    { slug: "frac.compare", weight: 1, isPrimary: true },
    { slug: "frac.equivalent", weight: 0.55, isPrimary: false },
  ],
  "Adding fractions": [
    { slug: "frac.add_like", weight: 0.7, isPrimary: true },
    { slug: "frac.add_unlike", weight: 0.7, isPrimary: true },
  ],
  "Variables & unknowns": [
    { slug: "alg.variable_as_unknown", weight: 1, isPrimary: true },
    { slug: "alg.balance_idea", weight: 0.6, isPrimary: false },
  ],
  "Simple equations": [
    { slug: "alg.one_step_equation", weight: 1, isPrimary: true },
    { slug: "alg.balance_idea", weight: 0.7, isPrimary: false },
    { slug: "alg.variable_as_unknown", weight: 0.5, isPrimary: false },
  ],
};

const skillBySlug = Object.fromEntries(PILOT_SKILLS.map((s) => [s.slug, s]));

function clamp(x, lo = 0.01, hi = 0.995) {
  return Math.max(lo, Math.min(hi, x));
}

export function bktUpdate(
  pKnow,
  { correct = null, partial = false, pTransit = 0.12, pSlip = 0.08, pGuess = 0.18 } = {}
) {
  let p = clamp(Number(pKnow) || 0.2);
  if (partial && correct == null) {
    return clamp(p + 0.08 * (0.65 - p));
  }
  if (correct == null) return clamp(p + 0.01);

  if (correct) {
    const pObs = p * (1 - pSlip) + (1 - p) * pGuess;
    const pPost = pObs <= 1e-9 ? p : (p * (1 - pSlip)) / pObs;
    p = clamp(pPost);
  } else {
    const pObs = p * pSlip + (1 - p) * (1 - pGuess);
    const pPost = pObs <= 1e-9 ? p : (p * pSlip) / pObs;
    p = clamp(pPost);
  }
  return clamp(p + (1 - p) * pTransit);
}

function emptySkillState(slug) {
  const meta = skillBySlug[slug] || { pInit: 0.2, shortLabel: slug, name: slug };
  return {
    slug,
    name: meta.name,
    shortLabel: meta.shortLabel || meta.name,
    domain: meta.domain,
    pKnow: meta.pInit ?? 0.2,
    score: Math.round((meta.pInit ?? 0.2) * 100),
    attempts: 0,
    correct: 0,
    incorrect: 0,
    partial: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    state: STATE.READY,
    stateLabel: STATE_LABELS[STATE.READY],
    lastEvidenceAt: null,
    lastCorrectness: null,
  };
}

function prereqReady(skillsMap, slug) {
  const meta = skillBySlug[slug];
  if (!meta) return { ready: true, blocking: [] };
  const blocking = [];
  for (const p of meta.prereqs || []) {
    if (p.strength !== "required") continue;
    const sm = skillsMap[p.slug] || emptySkillState(p.slug);
    if ((sm.pKnow ?? 0) < READY_PREREQ_P) {
      blocking.push({
        slug: p.slug,
        name: skillBySlug[p.slug]?.name || p.slug,
        pKnow: sm.pKnow,
        score: Math.round((sm.pKnow || 0) * 100),
      });
    }
  }
  return { ready: blocking.length === 0, blocking };
}

function deriveState(sm, locked) {
  if (locked) return STATE.LOCKED;
  if (
    sm.pKnow >= MASTERED_P &&
    sm.consecutiveCorrect >= MASTERED_STREAK &&
    sm.attempts >= 2
  ) {
    return STATE.MASTERED;
  }
  if (sm.attempts === 0) return STATE.READY;
  return STATE.LEARNING;
}

/**
 * Apply one graded exchange to profile.skills for the active topic.
 */
export function applySkillsToProfile(profile, { subject, topic, signals }) {
  const links = TOPIC_SKILL_MAP[topic];
  if (!links?.length) return profile;

  const next = structuredClone(profile);
  if (!next.skills) next.skills = {};

  const correctness = signals?.correctness || Correctness.UNKNOWN;
  const confidence = Number(signals?.confidence ?? 0.5);
  const isHint = Boolean(signals?.isHintRequest);
  let obs = null;
  if (correctness === Correctness.CORRECT) obs = true;
  else if (correctness === Correctness.INCORRECT) obs = false;
  const partial = correctness === Correctness.PARTIAL;

  for (const link of links) {
    const meta = skillBySlug[link.slug];
    if (!meta) continue;
    const sm = {
      ...emptySkillState(link.slug),
      ...(next.skills[link.slug] || {}),
    };
    const { ready } = prereqReady(next.skills, link.slug);
    const damp = ready ? 1 : 0.55;
    const confBoost = 0.85 + 0.3 * confidence;
    const pTransit = Math.min(0.35, meta.pTransit * damp * confBoost);

    let pAfter;
    if (isHint && obs !== false) {
      pAfter = clamp((sm.pKnow || meta.pInit) - 0.02 * damp);
    } else {
      pAfter = bktUpdate(sm.pKnow || meta.pInit, {
        correct: obs,
        partial,
        pTransit,
        pSlip: meta.pSlip,
        pGuess: meta.pGuess,
      });
    }

    sm.pKnow = pAfter;
    sm.score = Math.round(pAfter * 1000) / 10;
    sm.attempts = (sm.attempts || 0) + 1;
    sm.lastEvidenceAt = new Date().toISOString();
    sm.lastCorrectness = correctness;

    if (correctness === Correctness.CORRECT) {
      sm.correct = (sm.correct || 0) + 1;
      sm.consecutiveCorrect = (sm.consecutiveCorrect || 0) + 1;
      sm.consecutiveIncorrect = 0;
    } else if (correctness === Correctness.INCORRECT) {
      sm.incorrect = (sm.incorrect || 0) + 1;
      sm.consecutiveIncorrect = (sm.consecutiveIncorrect || 0) + 1;
      sm.consecutiveCorrect = 0;
    } else if (partial) {
      sm.partial = (sm.partial || 0) + 1;
      sm.consecutiveCorrect = 0;
    }

    sm.state = deriveState(sm, !ready);
    sm.stateLabel = STATE_LABELS[sm.state] || sm.state;
    next.skills[link.slug] = sm;
  }

  // Refresh lock states after updates
  for (const slug of Object.keys(next.skills)) {
    const { ready } = prereqReady(next.skills, slug);
    const sm = next.skills[slug];
    sm.state = deriveState(sm, !ready);
    sm.stateLabel = STATE_LABELS[sm.state] || sm.state;
  }

  // Epic B5 — remediation success boosts linked skills
  for (const mid of signals?.misconceptionsRemediated || []) {
    const id = typeof mid === "string" ? mid : mid?.id;
    const mcObj = typeof mid === "object" && mid ? mid : null;
    const mc =
      mcObj ||
      (next.misconceptions || {})[id] ||
      (profile.misconceptions || {})[id] ||
      {};
    const skillSlug = mc.skillSlug || mcObj?.skillSlug;
    if (!skillSlug || !skillBySlug[skillSlug]) continue;
    const meta = skillBySlug[skillSlug];
    const sm = {
      ...emptySkillState(skillSlug),
      ...(next.skills[skillSlug] || {}),
    };
    const pBefore = sm.pKnow || meta.pInit || 0.2;
    const pAfter = clamp(pBefore + 0.08 * (1 - pBefore));
    sm.pKnow = pAfter;
    sm.score = Math.round(pAfter * 1000) / 10;
    sm.lastEvidenceAt = new Date().toISOString();
    sm.lastCorrectness = Correctness.PARTIAL;
    const { ready } = prereqReady(next.skills, skillSlug);
    sm.state = deriveState(sm, !ready);
    sm.stateLabel = STATE_LABELS[sm.state] || sm.state;
    next.skills[skillSlug] = sm;
  }

  // Blend topic mastery from skills
  const key = `${subject || "General"}::${topic || "General"}`;
  if (!next.mastery) next.mastery = {};
  if (!next.mastery[key]) {
    next.mastery[key] = {
      subject,
      topic,
      score: 40,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      hints: 0,
    };
  }
  let tw = 0;
  let blend = 0;
  for (const link of links) {
    const sm = next.skills[link.slug];
    if (!sm) continue;
    const w = link.weight || 1;
    tw += w;
    blend += (sm.pKnow || 0) * w;
  }
  if (tw > 0) {
    const skillScore = (blend / tw) * 100;
    const m = next.mastery[key];
    m.score = Math.round((0.75 * skillScore + 0.25 * (m.score || skillScore)) * 10) / 10;
    m.updatedAt = new Date().toISOString();
  }

  return next;
}

/**
 * Build skill path payload for a topic (lesson path UI + insights).
 */
export function buildLocalSkillPath(profile, subject, topic) {
  const links = TOPIC_SKILL_MAP[topic];
  if (!links?.length) {
    return {
      subject,
      topic,
      skills: [],
      hasGraph: false,
      topicState: STATE.READY,
      topicStateLabel: STATE_LABELS[STATE.READY],
      recommendedNext: null,
    };
  }

  const skillsMap = profile?.skills || {};
  const skills = links.map((link) => {
    const meta = skillBySlug[link.slug];
    const sm = { ...emptySkillState(link.slug), ...(skillsMap[link.slug] || {}) };
    const { ready, blocking } = prereqReady(skillsMap, link.slug);
    sm.state = deriveState(sm, !ready);
    sm.stateLabel = STATE_LABELS[sm.state];
    return {
      ...sm,
      description: meta?.description,
      weight: link.weight,
      isPrimary: link.isPrimary,
      ready,
      blockingPrereqs: blocking,
    };
  });

  const states = skills.map((s) => s.state);
  let topicState = STATE.READY;
  if (states.every((s) => s === STATE.MASTERED)) topicState = STATE.MASTERED;
  else if (states.some((s) => s === STATE.LOCKED)) topicState = STATE.LOCKED;
  else if (states.some((s) => s === STATE.LEARNING)) topicState = STATE.LEARNING;

  return {
    subject,
    topic,
    skills,
    hasGraph: true,
    topicState,
    topicStateLabel: STATE_LABELS[topicState],
    recommendedNext: recommendLocalNext(skillsMap, topic),
  };
}

function recommendLocalNext(skillsMap, topic) {
  const links = TOPIC_SKILL_MAP[topic] || [];
  const domains = new Set(
    links.map((l) => skillBySlug[l.slug]?.domain).filter(Boolean)
  );
  const candidates = [];
  for (const meta of PILOT_SKILLS) {
    const { ready } = prereqReady(skillsMap, meta.slug);
    if (!ready) continue;
    const sm = skillsMap[meta.slug] || emptySkillState(meta.slug);
    if (sm.state === STATE.MASTERED) continue;
    const domainBonus = domains.size && domains.has(meta.domain) ? 1 : 0;
    candidates.push({ domainBonus, p: sm.pKnow || 0, meta, sm });
  }
  candidates.sort((a, b) => b.domainBonus - a.domainBonus || a.p - b.p);
  if (!candidates.length) return null;
  const c = candidates[0];
  return {
    slug: c.meta.slug,
    name: c.meta.name,
    shortLabel: c.meta.shortLabel,
    score: c.sm.score,
    state: c.sm.state,
    stateLabel: STATE_LABELS[c.sm.state],
  };
}

export function skillDirectivesLocal(profile, subject, topic) {
  const path = buildLocalSkillPath(profile, subject, topic);
  if (!path.hasGraph) return [];
  const directives = [];
  if (path.topicState === STATE.LOCKED) {
    const blockers = [];
    path.skills.forEach((s) =>
      (s.blockingPrereqs || []).forEach((b) => blockers.push(b.name))
    );
    const uniq = [...new Set(blockers)].slice(0, 2);
    if (uniq.length) {
      directives.push(
        `This topic may feel early — warmly revisit ${uniq.join(" and ")} with a quick visual warm-up before the main idea.`
      );
    }
  }
  for (const s of path.skills.filter((x) => x.isPrimary)) {
    const label = s.shortLabel || s.name;
    if (s.state === STATE.MASTERED) {
      directives.push(
        `Strength on «${label}» — stretch with a slightly richer variant after a quick check.`
      );
    } else if ((s.score || 0) < 40) {
      directives.push(
        `«${label}» is still fragile — smaller steps, concrete models, celebrate micro-wins.`
      );
    }
  }
  return directives.slice(0, 4);
}

/** Aggregate skill fill 0–100 for a topic name from profile. */
export function topicSkillScore(profile, topic) {
  const path = buildLocalSkillPath(profile, "", topic);
  if (!path.hasGraph) return null;
  const primary = path.skills.filter((s) => s.isPrimary);
  if (!primary.length) return null;
  const avg =
    primary.reduce((a, s) => a + (s.score || 0), 0) / primary.length;
  return Math.round(avg);
}

/** Reverse map: skill slug → first topic that lists it. */
function topicForSkillSlug(slug) {
  for (const [topic, links] of Object.entries(TOPIC_SKILL_MAP)) {
    if ((links || []).some((l) => l.slug === slug)) return topic;
  }
  return null;
}

/**
 * Epic B2 level 4 — suggest a related easier / prerequisite skill.
 * Prefers blocking prereqs, then lowest-score foundation skill on the path.
 */
export function suggestEasierRelatedSkill(profile, subject, topic) {
  const path = buildLocalSkillPath(profile, subject, topic);
  const skillsMap = profile?.skills || {};

  // 1) Blocking required prereqs on this topic's skills
  for (const s of path.skills || []) {
    const blockers = s.blockingPrereqs || [];
    if (blockers.length) {
      const b = blockers[0];
      return {
        slug: b.slug,
        name: b.name,
        shortLabel: skillBySlug[b.slug]?.shortLabel || b.name,
        topic: topicForSkillSlug(b.slug),
        subject: subject || PILOT_SUBJECT,
        reason: "prerequisite",
        score: b.score,
      };
    }
  }

  // 2) Weakest primary skill on this topic (if any attempts / low p)
  const primaries = (path.skills || [])
    .filter((s) => s.isPrimary)
    .slice()
    .sort((a, b) => (a.pKnow || 0) - (b.pKnow || 0));
  if (primaries.length && (primaries[0].pKnow || 0) < 0.55) {
    const s = primaries[0];
    // Prefer a prereq of that primary if one exists and is weaker/equal
    const meta = skillBySlug[s.slug];
    for (const p of meta?.prereqs || []) {
      const sm = skillsMap[p.slug] || emptySkillState(p.slug);
      if ((sm.pKnow || 0) < READY_PREREQ_P + 0.15) {
        return {
          slug: p.slug,
          name: skillBySlug[p.slug]?.name || p.slug,
          shortLabel: skillBySlug[p.slug]?.shortLabel,
          topic: topicForSkillSlug(p.slug),
          subject: subject || PILOT_SUBJECT,
          reason: "foundation",
          score: Math.round((sm.pKnow || 0) * 100),
        };
      }
    }
    return {
      slug: s.slug,
      name: s.name,
      shortLabel: s.shortLabel,
      topic: topic || path.topic,
      subject: subject || PILOT_SUBJECT,
      reason: "strengthen_current",
      score: s.score,
    };
  }

  // 3) Domain-wide easiest non-mastered ready skill
  const next = recommendLocalNext(skillsMap, topic);
  if (next && next.slug) {
    // Prefer something other than the hardest on this topic if possible
    const meta = skillBySlug[next.slug];
    return {
      slug: next.slug,
      name: next.name,
      shortLabel: next.shortLabel,
      topic: topicForSkillSlug(next.slug) || topic,
      subject: subject || PILOT_SUBJECT,
      reason: "ready_next",
      score: next.score,
      domain: meta?.domain,
    };
  }

  return null;
}
