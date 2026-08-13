/**
 * Worked-example library (Epic B4).
 *
 * Prefers server catalog when loaded; falls back to embedded pilot pack.
 * Age-appropriate selection via grade band when provided.
 */

import { getWorkedExamples } from "../api/learning";

/** Embedded pilot pack — used offline / before API loads. */
const LOCAL_PILOT_EXAMPLES = [
  {
    id: "we.frac.parts_pizza",
    skillSlug: "frac.parts_of_whole",
    topics: ["Fraction sense", "Parts of a whole", "Equal parts"],
    subject: "Math Foundations",
    title: "Pizza halves",
    summary: "A pizza cut into 2 equal parts — each is 1/2.",
    problem: "A pizza is cut into 2 equal slices. What fraction is one slice?",
    steps: [
      "The whole pizza is 1 whole.",
      "It is split into 2 equal parts, so each part is the same size.",
      "One of those equal parts is written 1/2 (one out of two).",
    ],
    takeaway: "Equal parts of a whole → unit fraction 1/n.",
    counterexample: "Cutting into 2 parts that are not equal is not halves.",
    kind: "example",
    gradeMin: 2,
    gradeMax: 5,
    source: "local",
  },
  {
    id: "we.frac.parts_chocolate",
    skillSlug: "frac.parts_of_whole",
    topics: ["Fraction sense"],
    subject: "Math Foundations",
    title: "Chocolate bar fourths",
    summary: "Four equal squares make fourths.",
    problem: "A chocolate bar is broken into 4 equal squares. What fraction is one square?",
    steps: [
      "The whole bar is 1 whole.",
      "There are 4 equal squares.",
      "One square is 1 out of 4 equal parts → 1/4.",
    ],
    takeaway: "The bottom number counts how many equal pieces make the whole.",
    counterexample:
      "If the pieces are different sizes, we cannot name them as equal-part fractions yet.",
    kind: "example",
    gradeMin: 2,
    gradeMax: 5,
    source: "local",
  },
  {
    id: "we.frac.num_den_bar",
    skillSlug: "frac.numerator_denominator",
    topics: ["Fraction sense", "Numerator and denominator", "Reading fractions"],
    subject: "Math Foundations",
    title: "Reading 3/4 on a bar",
    summary: "Numerator counts shaded parts; denominator counts equal parts.",
    problem:
      "A bar is split into 4 equal pieces and 3 are shaded. What fraction is shaded?",
    steps: [
      "Count the equal pieces in the whole bar → 4. That is the denominator.",
      "Count the shaded pieces → 3. That is the numerator.",
      "Write shaded-over-whole: 3/4.",
    ],
    takeaway:
      "Numerator = how many; denominator = how many equal parts make the whole.",
    counterexample:
      "Do not swap top and bottom — 4/3 would mean something different.",
    kind: "example",
    gradeMin: 2,
    gradeMax: 5,
    source: "local",
  },
  {
    id: "we.frac.num_den_swap_counter",
    skillSlug: "frac.numerator_denominator",
    topics: ["Fraction sense"],
    subject: "Math Foundations",
    title: "Not upside-down!",
    summary: "Counterexample: swapping num/den changes the amount.",
    problem: "Is 2/5 the same as 5/2?",
    steps: [
      "2/5 means 2 equal fifths of a whole — less than 1 whole.",
      "5/2 means 5 halves — more than 2 wholes.",
      "They are not the same amount.",
    ],
    takeaway: "Top and bottom have different jobs — do not flip them casually.",
    counterexample: "",
    kind: "counterexample",
    gradeMin: 3,
    gradeMax: 6,
    source: "local",
  },
  {
    id: "we.frac.number_line_three_fourths",
    skillSlug: "frac.number_line",
    topics: ["Fractions on a number line", "Fraction sense"],
    subject: "Math Foundations",
    title: "3/4 on the number line",
    summary: "Split 0–1 into fourths; count three jumps.",
    problem: "Where is 3/4 on a number line from 0 to 1?",
    steps: [
      "Draw a line from 0 to 1.",
      "Split the space into 4 equal jumps (fourths).",
      "Start at 0 and take 3 jumps → that point is 3/4.",
    ],
    takeaway:
      "The denominator is how many equal jumps fill 0 to 1; the numerator is how many jumps you take.",
    counterexample:
      "Marking 3 tick marks without equal spacing is not a fair number line.",
    kind: "example",
    gradeMin: 3,
    gradeMax: 5,
    source: "local",
  },
  {
    id: "we.frac.equiv_double",
    skillSlug: "frac.equivalent",
    topics: ["Equivalent fractions", "Fraction sense"],
    subject: "Math Foundations",
    title: "Same amount, different pieces",
    summary: "1/2 = 2/4 by splitting each half in two.",
    problem: "Show that 1/2 is the same amount as 2/4.",
    steps: [
      "Start with 1/2 of a bar.",
      "Split each half into 2 equal mini-pieces → the whole now has 4 equal pieces.",
      "The shaded half is now 2 of those 4 pieces → 2/4.",
      "Same shaded amount, different writing: 1/2 = 2/4.",
    ],
    takeaway:
      "Multiply (or divide) top and bottom by the same number to make equivalents.",
    counterexample:
      "Adding the same number to top and bottom does not keep the value.",
    kind: "example",
    gradeMin: 3,
    gradeMax: 6,
    source: "local",
  },
  {
    id: "we.frac.equiv_add_counter",
    skillSlug: "frac.equivalent",
    topics: ["Equivalent fractions"],
    subject: "Math Foundations",
    title: "Adding to both sides is not equivalence",
    summary: "Counterexample: 1/2 is not 2/3.",
    problem:
      "Someone says 1/2 = 2/3 because they added 1 to top and bottom. Is that right?",
    steps: [
      "1/2 of a bar is half shaded.",
      "2/3 of a bar is more than half shaded.",
      "They are different amounts — adding to top and bottom is not a safe move.",
    ],
    takeaway:
      "Only multiply or divide top and bottom by the same nonzero number.",
    counterexample: "",
    kind: "counterexample",
    gradeMin: 3,
    gradeMax: 6,
    source: "local",
  },
  {
    id: "we.frac.compare_same_den",
    skillSlug: "frac.compare",
    topics: ["Comparing fractions", "Fraction sense"],
    subject: "Math Foundations",
    title: "Same-size pieces",
    summary: "With the same denominator, larger numerator is larger.",
    problem: "Which is larger, 2/5 or 4/5?",
    steps: [
      "Both fractions have denominator 5 → pieces are the same size.",
      "2/5 means 2 pieces; 4/5 means 4 pieces.",
      "More same-size pieces → 4/5 is larger.",
    ],
    takeaway: "Same denominator → compare numerators.",
    counterexample:
      "With different denominators, bigger top is not always bigger overall.",
    kind: "example",
    gradeMin: 3,
    gradeMax: 6,
    source: "local",
  },
  {
    id: "we.frac.compare_bigger_bottom_counter",
    skillSlug: "frac.compare",
    topics: ["Comparing fractions"],
    subject: "Math Foundations",
    title: "Bigger bottom is not bigger amount",
    summary: "Counterexample: 1/2 vs 1/8.",
    problem: "Is 1/8 bigger than 1/2 because 8 is bigger than 2?",
    steps: [
      "1/2 is one of two equal parts — half the whole.",
      "1/8 is one of eight equal parts — a much smaller bite.",
      "So 1/2 is larger, even though 8 > 2.",
    ],
    takeaway: "For unit fractions, a larger denominator means smaller pieces.",
    counterexample: "",
    kind: "counterexample",
    gradeMin: 3,
    gradeMax: 6,
    source: "local",
  },
  {
    id: "we.frac.add_like_pizza",
    skillSlug: "frac.add_like",
    topics: ["Adding fractions"],
    subject: "Math Foundations",
    title: "Adding same-size slices",
    summary: "Keep the denominator; add the tops.",
    problem: "What is 1/6 + 4/6?",
    steps: [
      "Both pieces are sixths — same size.",
      "Add the numerators: 1 + 4 = 5.",
      "Keep the denominator 6 → 5/6.",
    ],
    takeaway: "Like denominators: add tops, keep the bottom.",
    counterexample: "Do not add denominators (1/6 + 4/6 is not 5/12).",
    kind: "example",
    gradeMin: 3,
    gradeMax: 6,
    source: "local",
  },
  {
    id: "we.frac.add_unlike_thirds_sixths",
    skillSlug: "frac.add_unlike",
    topics: ["Adding fractions"],
    subject: "Math Foundations",
    title: "Common pieces first",
    summary: "Rewrite with a common denominator, then add.",
    problem: "What is 1/3 + 1/6?",
    steps: [
      "Thirds and sixths are different sizes — make them match.",
      "1/3 = 2/6 (split each third in half).",
      "2/6 + 1/6 = 3/6, which is also 1/2.",
    ],
    takeaway: "Unlike denominators: find equal-size pieces first, then add.",
    counterexample: "Adding tops and bottoms separately (1/3 + 1/6 ≠ 2/9).",
    kind: "example",
    gradeMin: 4,
    gradeMax: 7,
    source: "local",
  },
  {
    id: "we.alg.variable_bag",
    skillSlug: "alg.variable_as_unknown",
    topics: ["Variables & unknowns", "Simple equations"],
    subject: "Math Foundations",
    title: "A mystery bag",
    summary: "A letter stands for an unknown amount.",
    problem:
      "A bag has some marbles. Call that number m. You add 3 marbles and now have 10. What does that mean?",
    steps: [
      "m stands for how many were in the bag at the start.",
      "Adding 3 means m + 3.",
      "Together that equals 10: m + 3 = 10.",
    ],
    takeaway: "A letter is a stand-in for a number we do not know yet.",
    counterexample:
      "m is not a label for 'marbles word' — it is a number amount.",
    kind: "example",
    gradeMin: 5,
    gradeMax: 8,
    source: "local",
  },
  {
    id: "we.alg.balance_scale",
    skillSlug: "alg.balance_idea",
    topics: ["Variables & unknowns", "Simple equations"],
    subject: "Math Foundations",
    title: "Keep the scale even",
    summary: "Whatever you do to one side, do to the other.",
    problem:
      "A balance has a box and 2 cubes on the left, and 8 cubes on the right. It is balanced. What stays true if we remove 2 cubes from both sides?",
    steps: [
      "Balanced means both sides have the same total weight.",
      "Remove 2 cubes from the left and 2 from the right.",
      "It is still balanced — now the box alone matches 6 cubes.",
    ],
    takeaway: "Equality stays true when both sides get the same change.",
    counterexample: "Removing cubes from only one side tips the balance.",
    kind: "example",
    gradeMin: 5,
    gradeMax: 8,
    source: "local",
  },
  {
    id: "we.alg.balance_one_step",
    skillSlug: "alg.one_step_equation",
    topics: ["Simple equations", "One-step equations"],
    subject: "Math Foundations",
    title: "Balance scale +3",
    summary: "Undo addition with subtraction on both sides.",
    problem: "Solve x + 3 = 10.",
    steps: [
      "Think of a balance: left side x + 3, right side 10.",
      "Subtract 3 from both sides to keep balance.",
      "x + 3 − 3 = 10 − 3 → x = 7.",
      "Check: 7 + 3 = 10 ✓",
    ],
    takeaway: "Do the same undo-step on both sides.",
    counterexample: "Only changing one side tips the balance.",
    kind: "example",
    gradeMin: 5,
    gradeMax: 8,
    source: "local",
  },
  {
    id: "we.alg.one_step_multiply",
    skillSlug: "alg.one_step_equation",
    topics: ["Simple equations"],
    subject: "Math Foundations",
    title: "Undo multiply with divide",
    summary: "3x = 12 → divide both sides by 3.",
    problem: "Solve 3x = 12.",
    steps: [
      "3x means 3 groups of x.",
      "Divide both sides by 3 to undo the multiply.",
      "x = 12 ÷ 3 = 4.",
      "Check: 3 × 4 = 12 ✓",
    ],
    takeaway: "Multiplication and division undo each other on both sides.",
    counterexample: "Subtracting 3 from both sides does not undo 'times 3'.",
    kind: "example",
    gradeMin: 5,
    gradeMax: 8,
    source: "local",
  },
];

/** @type {Array<object>|null} */
let remoteCatalog = null;
/** @type {string} */
let remoteKey = "";
/** @type {string} */
let lastPromptBlock = "";

export function parseGradeNumber(grade) {
  if (grade == null || grade === "") return null;
  if (typeof grade === "number" && Number.isFinite(grade)) {
    return Math.max(0, Math.min(12, Math.round(grade)));
  }
  const s = String(grade).trim().toLowerCase();
  if (s === "k" || s === "kindergarten") return 0;
  const m = s.match(/(\d{1,2})/);
  if (!m) return null;
  return Math.max(0, Math.min(12, parseInt(m[1], 10)));
}

function normalizeExample(raw) {
  if (!raw) return null;
  return {
    id: raw.id || raw.slug,
    skillSlug: raw.skillSlug || raw.skill_slug || null,
    skillName: raw.skillName || null,
    topics: raw.topics || raw.topic_names || [],
    subject: raw.subject || raw.subject_name || "",
    title: raw.title,
    summary: raw.summary || "",
    problem: raw.problem,
    steps: raw.steps || [],
    takeaway: raw.takeaway || "",
    counterexample: raw.counterexample || "",
    kind: raw.kind || "example",
    gradeMin: raw.gradeMin ?? raw.grade_min ?? 0,
    gradeMax: raw.gradeMax ?? raw.grade_max ?? 12,
    languageNotes: raw.languageNotes || raw.language_notes || "",
    source: raw.source || "library",
    matchScore: raw.matchScore,
  };
}

function matchesTopic(ex, topic) {
  const t = (topic || "").trim().toLowerCase();
  if (!t) return false;
  return (ex.topics || []).some((name) => {
    const n = (name || "").trim().toLowerCase();
    return n && (t === n || t.includes(n) || n.includes(t));
  });
}

function matchesGrade(ex, grade) {
  const g = parseGradeNumber(grade);
  if (g == null) return true;
  const lo = ex.gradeMin ?? 0;
  const hi = ex.gradeMax ?? 12;
  return g >= lo && g <= hi;
}

function scoreLocal(ex, { subject, topic, skillSlug, grade, kind }) {
  let score = 0;
  const sub = (subject || "").toLowerCase();
  if (skillSlug && ex.skillSlug === skillSlug) score += 20;
  if (matchesTopic(ex, topic)) {
    score += 12;
    if ((ex.topics || []).some((n) => (n || "").toLowerCase() === (topic || "").toLowerCase())) {
      score += 6;
    }
  }
  if (sub && ex.subject) {
    const sn = ex.subject.toLowerCase();
    if (sn === sub || sn.includes(sub.slice(0, 8)) || sub.includes(sn.slice(0, 8))) {
      score += 4;
    }
  }
  if (matchesGrade(ex, grade)) score += 3;
  else score -= 8;
  if (kind && ex.kind === kind) score += 2;
  if (!kind && ex.kind === "example") score += 1;
  return score;
}

function catalogPool() {
  if (remoteCatalog?.length) return remoteCatalog.map(normalizeExample);
  return LOCAL_PILOT_EXAMPLES.map((e) => ({ ...e }));
}

/**
 * Load worked examples from the API into the session cache.
 * Safe to call repeatedly; fails soft to local pack.
 */
export async function loadWorkedExamplesLibrary({
  subject = "",
  topic = "",
  skill = "",
  grade = "",
  kind = "",
  force = false,
} = {}) {
  const key = [subject, topic, skill, grade, kind].join("|");
  if (!force && remoteCatalog && remoteKey === key) {
    return {
      examples: remoteCatalog,
      promptBlock: lastPromptBlock,
      source: "cache",
    };
  }
  try {
    const data = await getWorkedExamples({
      subject,
      topic,
      skill,
      grade,
      kind,
      limit: 16,
    });
    const list = (data?.examples || []).map(normalizeExample).filter(Boolean);
    if (list.length) {
      remoteCatalog = list;
      remoteKey = key;
      lastPromptBlock = data?.promptBlock || "";
      return {
        examples: list,
        best: data?.best ? normalizeExample(data.best) : list[0],
        counterexamples: (data?.counterexamples || []).map(normalizeExample),
        promptBlock: lastPromptBlock,
        source: "library",
      };
    }
  } catch (err) {
    console.warn("Worked-example library fetch failed; using local pack", err);
  }
  // Local fallback ranked for this context
  const local = listWorkedExamples({ subject, topic, skillSlug: skill, grade, kind });
  lastPromptBlock = buildLibraryPromptBlock(local.slice(0, 2));
  return {
    examples: local,
    best: local[0] || null,
    counterexamples: listWorkedExamples({
      subject,
      topic,
      skillSlug: skill,
      grade,
      kind: "counterexample",
    }),
    promptBlock: lastPromptBlock,
    source: "local",
  };
}

/**
 * Find best pilot worked example for a topic/skill (sync; uses cache + local).
 * @returns {object | null}
 */
export function findWorkedExample({
  subject = "",
  topic = "",
  skillSlug = null,
  grade = null,
  kind = "example",
} = {}) {
  const pool = catalogPool().filter((ex) => {
    if (kind && ex.kind && ex.kind !== kind && kind !== "any") return false;
    return true;
  });

  let best = null;
  let bestScore = -999;
  for (const ex of pool) {
    const score = scoreLocal(ex, {
      subject,
      topic,
      skillSlug,
      grade,
      kind: kind === "any" ? "" : kind,
    });
    if (score > bestScore) {
      bestScore = score;
      best = ex;
    }
  }
  if (bestScore >= 8) return best;

  // Soft fallbacks
  if (skillSlug) {
    const bySkill = pool.find((e) => e.skillSlug === skillSlug);
    if (bySkill) return bySkill;
  }
  if (/fraction|math foundation|equal part|numerator|half|quarter/i.test(`${topic} ${subject}`)) {
    return pool.find((e) => e.skillSlug?.startsWith("frac.") && e.kind === "example") || null;
  }
  if (/equation|algebra|variable|balance/i.test(`${topic} ${subject}`)) {
    return pool.find((e) => e.skillSlug?.startsWith("alg.") && e.kind === "example") || null;
  }
  return bestScore > 0 ? best : null;
}

export function listWorkedExamples({
  subject = "",
  topic = "",
  skillSlug = null,
  grade = null,
  kind = "",
  limit = 20,
} = {}) {
  const pool = catalogPool();
  const ranked = pool
    .map((ex) => ({
      ex,
      score: scoreLocal(ex, { subject, topic, skillSlug, grade, kind }),
    }))
    .filter(({ ex, score }) => {
      if (kind && ex.kind !== kind) return false;
      if (skillSlug) return ex.skillSlug === skillSlug || score >= 8;
      return score >= 8 || matchesTopic(ex, topic);
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ ex, score }) => ({ ...ex, matchScore: score }));
  return ranked;
}

export function buildLibraryPromptBlock(examples = [], { maxExamples = 2 } = {}) {
  const list = (examples || []).filter(Boolean).slice(0, maxExamples);
  if (!list.length) return lastPromptBlock || "";
  const lines = [
    "CURATED WORKED-EXAMPLE LIBRARY (prefer these over inventing new ones):",
    "Use age-appropriate language. Do not dump every example — pick the best fit.",
  ];
  for (const ex of list) {
    lines.push(`— [${ex.kind || "example"}] ${ex.title} (id=${ex.id})`);
    lines.push(`  Problem: ${ex.problem}`);
    if (ex.steps?.length) {
      lines.push(`  Steps: ${ex.steps.join(" → ")}`);
    }
    if (ex.takeaway) lines.push(`  Takeaway: ${ex.takeaway}`);
    if (ex.counterexample) {
      lines.push(`  Gentle counterexample: ${ex.counterexample}`);
    }
  }
  lines.push(
    "When you use a library example, stay faithful to its structure; you may lightly adapt names/interests for engagement."
  );
  return lines.join("\n");
}

export function getCachedLibraryPromptBlock() {
  return lastPromptBlock || "";
}

/** Clear remote cache (e.g. on topic switch). */
export function clearWorkedExampleCache() {
  remoteCatalog = null;
  remoteKey = "";
  lastPromptBlock = "";
}

export function listLocalWorkedExamples() {
  return LOCAL_PILOT_EXAMPLES.map((e) => ({ ...e }));
}
