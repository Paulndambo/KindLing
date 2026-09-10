/**
 * Epic C6 — Offline-first MCQ bank for low-stakes end-of-topic checks.
 *
 * Built for rural / low-connectivity tutoring: every item carries its own
 * tutor explanation so revision feedback works without a live model call.
 *
 * CS pilot questions live in csAssessmentBank.js and are merged below so a
 * quick check can target the active subtopic / skill.
 */

import { CS_ASSESSMENT_QUESTIONS } from "./csAssessmentBank";
import { TOPIC_SKILL_MAP, PILOT_SKILLS } from "./skillGraph";

/** @typedef {{ id: string, text: string }} AssessmentOption */
/**
 * @typedef {object} AssessmentQuestion
 * @property {string} id
 * @property {string} skillSlug
 * @property {string} subject
 * @property {string[]} topics
 * @property {string} prompt
 * @property {AssessmentOption[]} options
 * @property {number} correctIndex 0-based
 * @property {string} explanationCorrect warm reinforce + concept
 * @property {string} explanationIncorrect warm correction + concept revision
 * @property {string} [concept] short concept label
 * @property {'easy'|'medium'|'hard'} [difficulty]
 * @property {boolean} [transfer] Epic L4 — structurally new surface (same skill, new packaging)
 */

/** @type {AssessmentQuestion[]} */
const LEGACY_ASSESSMENT_QUESTIONS = [
  // —— Parts of a whole ——
  {
    id: "aq.frac.parts.1",
    skillSlug: "frac.parts_of_whole",
    subject: "Math Foundations",
    topics: ["Equal parts", "Parts of a whole", "Fraction sense"],
    concept: "Equal parts of a whole",
    difficulty: "easy",
    prompt: "A chapati is cut into 4 equal pieces. What fraction is one piece?",
    options: [
      { id: "a", text: "1/2" },
      { id: "b", text: "1/4" },
      { id: "c", text: "1/3" },
      { id: "d", text: "4/1" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — one equal piece out of four is 1/4. The bottom number (denominator) names how many equal parts make the whole; the top (numerator) counts how many of those parts you have.",
    explanationIncorrect:
      "Not quite. When a whole is split into 4 equal pieces, each piece is 1/4. Remember: denominator = equal parts in the whole, numerator = parts you are counting. Here that is 1 out of 4 → 1/4.",
  },
  {
    id: "aq.frac.parts.2",
    skillSlug: "frac.parts_of_whole",
    subject: "Math Foundations",
    topics: ["Equal parts", "Parts of a whole", "Fraction sense"],
    concept: "Naming unit fractions",
    difficulty: "medium",
    transfer: true,
    prompt: "Which picture idea shows 1/3 of a whole?",
    options: [
      { id: "a", text: "A stick broken into 2 equal parts, take 1" },
      { id: "b", text: "A stick broken into 3 equal parts, take 1" },
      { id: "c", text: "A stick broken into 3 unequal parts, take 1" },
      { id: "d", text: "A stick broken into 5 equal parts, take 3" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Exactly. 1/3 means the whole is in 3 equal parts and we take one. Equal size matters — unequal pieces are not fair fraction parts.",
    explanationIncorrect:
      "For 1/3 the whole must be divided into 3 equal parts, then we take one. Unequal pieces do not count as proper fraction parts. So: 3 equal parts, take 1.",
  },
  // —— Numerator & denominator ——
  {
    id: "aq.frac.numden.1",
    skillSlug: "frac.numerator_denominator",
    subject: "Math Foundations",
    topics: ["Numerator & denominator", "Fraction sense", "Reading fractions"],
    concept: "Numerator and denominator",
    difficulty: "easy",
    prompt: "In the fraction 3/5, what does the 5 tell you?",
    options: [
      { id: "a", text: "How many parts we have" },
      { id: "b", text: "How many equal parts make the whole" },
      { id: "c", text: "That the answer is bigger than 1" },
      { id: "d", text: "To multiply by 5" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Right. The denominator (bottom) is 5 — the whole is split into 5 equal parts. The numerator 3 says we have three of those parts.",
    explanationIncorrect:
      "Look at the bottom number. In 3/5, the 5 is the denominator: it names how many equal parts make the whole. The 3 on top is how many parts we have.",
  },
  {
    id: "aq.frac.numden.2",
    skillSlug: "frac.numerator_denominator",
    subject: "Math Foundations",
    topics: ["Numerator & denominator", "Fraction sense"],
    concept: "Reading fractions",
    difficulty: "easy",
    prompt: "Which fraction means “two out of eight equal parts”?",
    options: [
      { id: "a", text: "8/2" },
      { id: "b", text: "2/8" },
      { id: "c", text: "2/6" },
      { id: "d", text: "8/8" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — 2/8. Top = parts we have (2), bottom = equal parts in the whole (8).",
    explanationIncorrect:
      "“Two out of eight” puts 2 on top and 8 on the bottom → 2/8. Swapping them (8/2) would mean something different.",
  },
  // —— Number line ——
  {
    id: "aq.frac.nline.1",
    skillSlug: "frac.number_line",
    subject: "Math Foundations",
    topics: ["Fractions on a number line", "Number line", "Fraction sense"],
    concept: "Fractions on a number line",
    difficulty: "medium",
    prompt: "On a number line from 0 to 1 divided into 4 equal jumps, where is 3/4?",
    options: [
      { id: "a", text: "After 1 jump from 0" },
      { id: "b", text: "After 2 jumps from 0" },
      { id: "c", text: "After 3 jumps from 0" },
      { id: "d", text: "At 1 (four jumps)" },
    ],
    correctIndex: 2,
    explanationCorrect:
      "Yes. Four equal jumps fill 0→1; each jump is 1/4. Three jumps land on 3/4 — still before 1.",
    explanationIncorrect:
      "Think of the line 0 to 1 cut into 4 equal jumps. Each jump is 1/4. So 3/4 is three jumps from 0 — one jump short of 1.",
  },
  {
    id: "aq.frac.nline.2",
    skillSlug: "frac.number_line",
    subject: "Math Foundations",
    topics: ["Fractions on a number line", "Number line"],
    concept: "Unit fractions on a line",
    difficulty: "easy",
    prompt: "Which mark is halfway between 0 and 1 on a number line?",
    options: [
      { id: "a", text: "1/4" },
      { id: "b", text: "1/3" },
      { id: "c", text: "1/2" },
      { id: "d", text: "2/3" },
    ],
    correctIndex: 2,
    explanationCorrect:
      "Correct — halfway is 1/2. Two equal halves make the whole from 0 to 1.",
    explanationIncorrect:
      "Halfway means the distance is split into 2 equal parts. That point is 1/2, not 1/3 or 1/4.",
  },
  // —— Equivalent fractions ——
  {
    id: "aq.frac.eq.1",
    skillSlug: "frac.equivalent",
    subject: "Math Foundations",
    topics: ["Equivalent fractions", "Equivalence", "Fraction sense"],
    concept: "Equivalent fractions",
    difficulty: "medium",
    prompt: "Which fraction is equivalent to 1/2?",
    options: [
      { id: "a", text: "1/3" },
      { id: "b", text: "2/4" },
      { id: "c", text: "2/3" },
      { id: "d", text: "3/5" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — 2/4 = 1/2. Multiply top and bottom by the same number (here ×2) and the amount stays the same, just in smaller pieces.",
    explanationIncorrect:
      "Equivalent fractions name the same amount. Multiply 1/2 top and bottom by 2 → 2/4. Same size of the whole, different piece size.",
  },
  {
    id: "aq.frac.eq.2",
    skillSlug: "frac.equivalent",
    subject: "Math Foundations",
    topics: ["Equivalent fractions", "Equivalence"],
    concept: "Scaling numerator and denominator",
    difficulty: "medium",
    prompt: "What do you do to both parts of 2/3 to get an equivalent fraction?",
    options: [
      { id: "a", text: "Add the same number to top and bottom" },
      { id: "b", text: "Multiply (or divide) top and bottom by the same non-zero number" },
      { id: "c", text: "Only change the top number" },
      { id: "d", text: "Swap top and bottom" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Exactly. Same multiplier (or divisor) on numerator and denominator keeps the value. Adding the same number does not.",
    explanationIncorrect:
      "To keep the value, multiply or divide both numerator and denominator by the same non-zero number. Adding the same amount to both changes the value.",
  },
  // —— Compare ——
  {
    id: "aq.frac.cmp.1",
    skillSlug: "frac.compare",
    subject: "Math Foundations",
    topics: ["Comparing fractions", "Compare", "Fraction sense"],
    concept: "Comparing like denominators",
    difficulty: "easy",
    prompt: "Which is larger: 2/5 or 4/5?",
    options: [
      { id: "a", text: "2/5" },
      { id: "b", text: "4/5" },
      { id: "c", text: "They are equal" },
      { id: "d", text: "Cannot tell" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — same-size fifths, so more pieces wins: 4/5 > 2/5.",
    explanationIncorrect:
      "Same denominator means same piece size. More pieces on top means a larger fraction, so 4/5 is larger than 2/5.",
  },
  {
    id: "aq.frac.cmp.2",
    skillSlug: "frac.compare",
    subject: "Math Foundations",
    topics: ["Comparing fractions", "Compare"],
    concept: "Unit fraction comparison",
    difficulty: "medium",
    prompt: "Which is larger: 1/3 or 1/6?",
    options: [
      { id: "a", text: "1/3" },
      { id: "b", text: "1/6" },
      { id: "c", text: "They are equal" },
      { id: "d", text: "1/6 because 6 is bigger" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Right. Unit fractions get smaller as the denominator grows — sixths are tinier pieces than thirds, so 1/3 > 1/6.",
    explanationIncorrect:
      "For unit fractions (1 on top), a larger bottom means smaller pieces. Thirds are bigger pieces than sixths, so 1/3 is larger than 1/6.",
  },
  // —— Add like ——
  {
    id: "aq.frac.add_like.1",
    skillSlug: "frac.add_like",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Like denominators", "Fraction sense"],
    concept: "Adding like denominators",
    difficulty: "easy",
    prompt: "What is 1/8 + 3/8?",
    options: [
      { id: "a", text: "4/16" },
      { id: "b", text: "4/8" },
      { id: "c", text: "3/8" },
      { id: "d", text: "1/3" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — same bottoms stay the same; add the tops: 1+3=4, so 4/8. (You can simplify later to 1/2.)",
    explanationIncorrect:
      "Same denominator: keep the 8, add numerators 1+3=4 → 4/8. Do not add the bottoms (that would make 4/16, which is wrong here).",
  },
  {
    id: "aq.frac.add_like.2",
    skillSlug: "frac.add_like",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Like denominators"],
    concept: "Adding like fractions",
    difficulty: "easy",
    prompt: "What is 2/7 + 2/7?",
    options: [
      { id: "a", text: "4/14" },
      { id: "b", text: "4/7" },
      { id: "c", text: "2/14" },
      { id: "d", text: "4/4" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Correct — 2+2=4 sevenths → 4/7. Same-size pieces stack by counting how many you have.",
    explanationIncorrect:
      "Keep the denominator 7. Add only the tops: 2+2=4, so 4/7. Adding denominators is a common mix-up — skip that here.",
  },
  // —— Add unlike ——
  {
    id: "aq.frac.add_unlike.1",
    skillSlug: "frac.add_unlike",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Unlike denominators", "Different bottoms"],
    concept: "Common denominator",
    difficulty: "medium",
    prompt: "What is 1/3 + 1/6?",
    options: [
      { id: "a", text: "2/9" },
      { id: "b", text: "1/2" },
      { id: "c", text: "1/9" },
      { id: "d", text: "2/6" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — rewrite 1/3 as 2/6, then 2/6+1/6=3/6=1/2. Different bottoms need a common denominator first.",
    explanationIncorrect:
      "Different bottoms: find a common denominator. 1/3 = 2/6, then 2/6 + 1/6 = 3/6 = 1/2. Never add tops and bottoms separately as 2/9.",
  },
  {
    id: "aq.frac.add_unlike.2",
    skillSlug: "frac.add_unlike",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Unlike denominators"],
    concept: "Adding unlike fractions",
    difficulty: "medium",
    prompt: "What is 1/4 + 1/2?",
    options: [
      { id: "a", text: "2/6" },
      { id: "b", text: "1/6" },
      { id: "c", text: "3/4" },
      { id: "d", text: "2/4" },
    ],
    correctIndex: 2,
    explanationCorrect:
      "Nice — 1/2 = 2/4, so 1/4 + 2/4 = 3/4. Same-size fourths make the add easy.",
    explanationIncorrect:
      "Change 1/2 into fourths: 1/2 = 2/4. Then 1/4 + 2/4 = 3/4. Common denominator first, then add tops.",
  },
  // —— Simple equations ——
  {
    id: "aq.alg.one_step.1",
    skillSlug: "alg.one_step_equation",
    subject: "Math Foundations",
    topics: ["Simple equations", "One-step equations", "Early algebra"],
    concept: "Undo addition",
    difficulty: "easy",
    prompt: "Solve: x + 5 = 12. What is x?",
    options: [
      { id: "a", text: "17" },
      { id: "b", text: "7" },
      { id: "c", text: "5" },
      { id: "d", text: "12" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — undo +5 by subtracting 5 from both sides: x = 12 − 5 = 7. Check: 7+5=12.",
    explanationIncorrect:
      "To isolate x, undo the +5: subtract 5 from both sides. 12 − 5 = 7. Check by plugging back: 7 + 5 = 12.",
  },
  {
    id: "aq.alg.one_step.2",
    skillSlug: "alg.one_step_equation",
    subject: "Math Foundations",
    topics: ["Simple equations", "One-step equations", "Early algebra"],
    concept: "Undo multiplication",
    difficulty: "medium",
    prompt: "Solve: 3x = 15. What is x?",
    options: [
      { id: "a", text: "45" },
      { id: "b", text: "12" },
      { id: "c", text: "5" },
      { id: "d", text: "18" },
    ],
    correctIndex: 2,
    explanationCorrect:
      "Correct — divide both sides by 3: x = 15 ÷ 3 = 5. Check: 3×5=15.",
    explanationIncorrect:
      "3x means 3 times x. Undo by dividing both sides by 3: 15 ÷ 3 = 5. Check: 3 × 5 = 15.",
  },
  // —— Generic literacy / science-ish fallbacks for non-pilot topics ——
  {
    id: "aq.gen.study.1",
    skillSlug: "gen.recall",
    subject: "General",
    topics: ["*"],
    concept: "Careful reading",
    difficulty: "easy",
    prompt: "When you are unsure on a check question, what is the best first move?",
    options: [
      { id: "a", text: "Guess as fast as possible" },
      { id: "b", text: "Re-read the question and name what it is asking" },
      { id: "c", text: "Skip every hard question forever" },
      { id: "d", text: "Change your answer randomly at the end" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Good habit. Slow down, re-read, and say in your own words what the question wants — then choose.",
    explanationIncorrect:
      "Rushing guesses hides what you know. Best first move: re-read and name what the question is asking, then pick carefully.",
  },
  {
    id: "aq.gen.study.2",
    skillSlug: "gen.recall",
    subject: "General",
    topics: ["*"],
    concept: "Learning from mistakes",
    difficulty: "easy",
    prompt: "Why does Kindling explain after every check answer?",
    options: [
      { id: "a", text: "To shame wrong answers" },
      { id: "b", text: "To help you revise the idea, right or wrong" },
      { id: "c", text: "To fill time" },
      { id: "d", text: "Only correct answers matter" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Exactly — checks are for revision. Whether you were right or wrong, the short tutor note locks the idea in.",
    explanationIncorrect:
      "These checks are low-stakes revision, not a scolding. Every answer gets a short tutor explanation so the concept sticks.",
  },
];

/** @type {AssessmentQuestion[]} */
export const ASSESSMENT_QUESTIONS = [
  ...CS_ASSESSMENT_QUESTIONS,
  ...LEGACY_ASSESSMENT_QUESTIONS,
];

/**
 * Skills linked to a lesson leaf (subtopic) name via the pilot graph.
 * Primary skills first (the concept being taught), then supporting skills.
 * @param {string} topic
 * @returns {string[]}
 */
export function skillSlugsForLessonTopic(topic = "") {
  const top = String(topic || "").trim();
  if (!top) return [];
  const links = TOPIC_SKILL_MAP[top];
  if (Array.isArray(links) && links.length) {
    const primary = links
      .filter((l) => l.isPrimary !== false)
      .map((l) => l.slug)
      .filter(Boolean);
    const support = links
      .filter((l) => l.isPrimary === false)
      .map((l) => l.slug)
      .filter(Boolean);
    // Prefer primaries; keep light support only after
    return [...primary, ...support];
  }
  // Fuzzy: skill name / shortLabel match
  const t = top.toLowerCase();
  return (PILOT_SKILLS || [])
    .filter((s) => {
      const name = String(s.name || "").toLowerCase();
      const short = String(s.shortLabel || "").toLowerCase();
      return (
        name === t ||
        short === t ||
        name.includes(t) ||
        t.includes(name) ||
        (short && (short.includes(t) || t.includes(short)))
      );
    })
    .map((s) => s.slug);
}

/**
 * Match questions to the active lesson subject + subtopic (and skills).
 * Prefers current-concept items so quick check gauges understanding of
 * what is being taught right now — not a random bank.
 *
 * @param {string} [subject]
 * @param {string} [topic] active subtopic / lesson leaf
 * @param {{
 *   skillSlug?: string,
 *   skillSlugs?: string[],
 *   unit?: string,
 *   limit?: number,
 *   minScore?: number,
 * }} [opts]
 * @returns {AssessmentQuestion[]}
 */
export function questionsForTopic(subject = "", topic = "", opts = {}) {
  const sub = String(subject || "").toLowerCase();
  const top = String(topic || "").toLowerCase();
  const unit = String(opts.unit || "").toLowerCase();
  const fromGraph = skillSlugsForLessonTopic(topic);
  const skillSlugs = [
    ...new Set(
      [
        ...(Array.isArray(opts.skillSlugs) ? opts.skillSlugs : []),
        opts.skillSlug || "",
        ...fromGraph,
      ]
        .map((s) => String(s || "").toLowerCase())
        .filter(Boolean)
    ),
  ];
  const limit = Math.max(1, Number(opts.limit) || 5);
  const minScore = opts.minScore != null ? Number(opts.minScore) : 6;
  const transferOnly = Boolean(opts.transferOnly);
  const excludeTransfer = Boolean(opts.excludeTransfer);
  const preferTransfer = Boolean(opts.preferTransfer);

  const scored = ASSESSMENT_QUESTIONS.map((q) => {
    if (transferOnly && !q.transfer) return { q, score: -999 };
    if (excludeTransfer && q.transfer) return { q, score: -999 };
    let score = 0;
    const qSkill = String(q.skillSlug || "").toLowerCase();
    if (qSkill && skillSlugs.includes(qSkill)) {
      // Strong preference for skills tied to this lesson
      const idx = skillSlugs.indexOf(qSkill);
      score += idx === 0 ? 20 : idx === 1 ? 16 : 12;
    }
    // Epic L4 — boost transfer items when requested for independence twins
    if (preferTransfer && q.transfer) score += 5;
    const qSub = (q.subject || "").toLowerCase();
    if (sub && qSub) {
      if (qSub === sub) score += 4;
      else if (qSub.includes(sub) || sub.includes(qSub)) score += 2;
      // CS lesson should not drift into math bank
      if (sub.includes("computer") && qSub.includes("math")) score -= 8;
      if (sub.includes("math") && qSub.includes("computer")) score -= 8;
    }
    const topics = Array.isArray(q.topics) ? q.topics : [];
    let topicHit = false;
    for (const t of topics) {
      const tl = String(t).toLowerCase();
      if (tl === "*") {
        score += 0.25;
        continue;
      }
      if (top && (top === tl || top.includes(tl) || tl.includes(top))) {
        score += top === tl ? 14 : 8;
        topicHit = true;
      }
      if (unit && (unit === tl || unit.includes(tl) || tl.includes(unit))) {
        score += 3;
      }
    }
    if (topicHit && qSkill && skillSlugs.includes(qSkill)) score += 2;
    return { q, score };
  })
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score || a.q.id.localeCompare(b.q.id));

  let picked = scored.map((r) => r.q);

  // If threshold was strict, relax once for near-matches (still topic-relevant)
  if (picked.length < Math.min(3, limit) && !transferOnly) {
    const relaxed = ASSESSMENT_QUESTIONS.map((q) => {
      if (excludeTransfer && q.transfer) return { q, score: -999 };
      // re-score lightly already done — take score >= 3 from full map
      const qSkill = String(q.skillSlug || "").toLowerCase();
      let score = 0;
      if (qSkill && skillSlugs.includes(qSkill)) score += 10;
      const topics = Array.isArray(q.topics) ? q.topics : [];
      for (const t of topics) {
        const tl = String(t).toLowerCase();
        if (tl !== "*" && top && (top.includes(tl) || tl.includes(top))) {
          score += 6;
        }
      }
      const qSub = (q.subject || "").toLowerCase();
      if (sub && qSub && (qSub.includes(sub) || sub.includes(qSub))) score += 2;
      if (sub.includes("computer") && qSub.includes("math")) score -= 8;
      return { q, score };
    })
      .filter((r) => r.score >= 4)
      .sort((a, b) => b.score - a.score);
    const seen = new Set(picked.map((q) => q.id));
    for (const row of relaxed) {
      if (seen.has(row.q.id)) continue;
      picked.push(row.q);
      seen.add(row.q.id);
      if (picked.length >= limit) break;
    }
  }

  // Prefer questions on the primary lesson skill(s), then fill with support
  if (skillSlugs.length && picked.length) {
    const primarySet = new Set(skillSlugs.slice(0, 2));
    const primaryQs = picked.filter((q) =>
      primarySet.has(String(q.skillSlug || "").toLowerCase())
    );
    const otherQs = picked.filter(
      (q) => !primarySet.has(String(q.skillSlug || "").toLowerCase())
    );
    // At least ~70% primary when available
    const primaryTarget = Math.max(
      1,
      Math.min(primaryQs.length, Math.ceil(limit * 0.7))
    );
    picked = [
      ...primaryQs.slice(0, primaryTarget),
      ...otherQs,
      ...primaryQs.slice(primaryTarget),
    ];
  }

  // Cap length
  if (picked.length > limit) {
    picked = picked.slice(0, limit);
  }

  // Last resort: generic study items (never preferred over on-topic CS)
  if (!picked.length) {
    picked = ASSESSMENT_QUESTIONS.filter((q) =>
      (q.topics || []).includes("*")
    );
  }

  const seed = hashStr(`${sub}|${top}|${unit}|${skillSlugs.join(",")}`);
  const rotated = rotate(picked, seed % Math.max(1, picked.length));
  return rotated.slice(0, limit);
}

export function getAssessmentQuestion(id) {
  return ASSESSMENT_QUESTIONS.find((q) => q.id === id) || null;
}

function hashStr(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function rotate(arr, n) {
  if (!arr.length) return [];
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}
