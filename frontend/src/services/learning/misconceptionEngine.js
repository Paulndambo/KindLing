/**
 * Epic B5 — Misconception engine: catalog detect → playbook → remediation.
 */

import { getMisconceptionCatalog, detectMisconceptionsApi } from "../api/learning";

/** Local fallback catalog (mirrors backend seed). */
const LOCAL_CATALOG = [
  {
    id: "adds_denominators",
    label: "Adding denominators",
    domain: "fractions",
    description: "Adds bottoms when adding fractions.",
    skillSlug: "frac.add_like",
    topics: ["Adding fractions", "Fraction sense"],
    studentCues: [
      /\badd(ing|ed)? the denominators\b/i,
      /\badd(ing|ed)? (the )?bottoms?\b/i,
      /\b(so )?(i )?add(ed)? (both|the )?(tops? and bottoms?|numerators? and denominators?)\b/i,
    ],
    patterns: [/\badd(ing|ed)? the denominators\b/i, /\badd(ing|ed)? (the )?bottoms?\b/i],
    playbook: {
      open: "Warmly normalize — lots of people try adding both numbers. We'll check what same-size pieces means.",
      steps: [
        "Show two bars with the same denominator.",
        "Shade parts being added; count shaded for the new numerator.",
        "Keep the piece-size (denominator) when pieces already match.",
      ],
      check_question: "If you have 1/6 + 2/6, what stays the same — the piece size or the count?",
      tutor_directives: [
        "Misconception active: adding denominators — use same-size pieces language; never shame.",
      ],
      success_signal: "Keeps denominator when adding like fractions.",
    },
    relatedExampleSlug: "we.frac.add_like_pizza",
  },
  {
    id: "bigger_bottom_bigger",
    label: "Larger denominator = larger fraction",
    domain: "fractions",
    skillSlug: "frac.compare",
    topics: ["Comparing fractions", "Fraction sense"],
    studentCues: [
      /\bbigger (bottom|denominator).{0,24}(bigger|larger)\b/i,
      /\bmore pieces (is|are|=) (bigger|more|larger)\b/i,
      /\bbigger number on the bottom\b/i,
    ],
    patterns: [
      /\bbigger (bottom|denominator).{0,24}(bigger|larger) fraction\b/i,
    ],
    playbook: {
      open: "Great noticing of the numbers — let's check what more pieces does to each piece's size.",
      steps: [
        "Compare unit fractions with a shared whole.",
        "Show 1/2 vs 1/8: more equal cuts → smaller bites.",
        "Rule: for unit fractions, bigger bottom → smaller piece.",
      ],
      check_question: "Which is a bigger piece of the same pizza: 1/2 or 1/8?",
      tutor_directives: [
        "Misconception active: bigger denominator ≠ bigger unit fraction.",
      ],
    },
    relatedExampleSlug: "we.frac.compare_same_den",
    relatedCounterSlug: "we.frac.compare_bigger_bottom_counter",
  },
  {
    id: "confuses_multiply_divide",
    label: "Multiply/divide confusion",
    domain: "early_algebra",
    skillSlug: "alg.one_step_equation",
    topics: ["Simple equations", "Variables & unknowns"],
    studentCues: [
      /\b(multiply|times).{0,20}(both sides|to get|to undo)\b/i,
      /\bundo .{0,10} by (multiplying|times)\b/i,
    ],
    patterns: [
      /\b(multiply|times).{0,20}(when|instead).{0,15}divid/i,
      /\bundo (multiply|times) by (multiply|times)\b/i,
    ],
    playbook: {
      open: "You're thinking about undoing — perfect. Let's match the undo move.",
      steps: [
        "Name the operation on x.",
        "Apply the inverse on both sides.",
        "Check by substitution.",
      ],
      check_question: "If someone did ×3 to x, what undoes that on both sides?",
      tutor_directives: [
        "Misconception active: multiply/divide inverse mix-up — use balance language.",
      ],
    },
    relatedExampleSlug: "we.alg.one_step_multiply",
  },
  {
    id: "treats_fraction_as_two_numbers",
    label: "Fraction as two separate numbers",
    domain: "fractions",
    skillSlug: "frac.numerator_denominator",
    topics: ["Fraction sense"],
    studentCues: [
      /\btwo (different|separate) numbers\b/i,
      /\bonly (the )?(top|numerator) matters\b/i,
    ],
    patterns: [/\btwo (different|separate) numbers\b/i],
    playbook: {
      open: "A fraction is one idea with two jobs.",
      steps: [
        "Bottom = equal parts in the whole.",
        "Top = how many of those parts we have.",
        "Say it as '3 out of 4 equal parts'.",
      ],
      check_question: "In 2/5, what does the 5 tell us about the pieces?",
      tutor_directives: [
        "Misconception: fraction as two loose numbers — pair num/den as one amount.",
      ],
    },
    relatedExampleSlug: "we.frac.num_den_bar",
  },
  {
    id: "equivalence_by_adding",
    label: "Equivalence by adding to top and bottom",
    domain: "fractions",
    skillSlug: "frac.equivalent",
    topics: ["Equivalent fractions"],
    studentCues: [
      /\badd(ing|ed)? .{0,10}(to )?(both|top and bottom)\b/i,
      /\bplus \d+ (on )?(top and bottom|both)\b/i,
    ],
    patterns: [
      /\badd(ing|ed)? (the )?same (number|amount) to (the )?(top and bottom|numerator and denominator)\b/i,
      /\b1\/2\s*=\s*2\/3\b/,
    ],
    playbook: {
      open: "You're looking for a fair change — the fair move is multiply/divide, not add.",
      steps: [
        "Contrast 1/2 vs 2/3 bars.",
        "Show 1/2 → 2/4 by splitting halves (×2/2).",
        "Rule: × or ÷ top and bottom by the same nonzero number.",
      ],
      check_question: "Does adding 1 to top and bottom of 1/2 keep the same amount?",
      tutor_directives: [
        "Misconception: equivalence-by-adding — prefer split-the-pieces visuals.",
      ],
    },
    relatedExampleSlug: "we.frac.equiv_double",
    relatedCounterSlug: "we.frac.equiv_add_counter",
  },
  {
    id: "unequal_parts_as_fraction",
    label: "Unequal parts called equal fractions",
    domain: "fractions",
    skillSlug: "frac.parts_of_whole",
    topics: ["Fraction sense"],
    studentCues: [
      /\bdoesn'?t (have to|need to) be equal\b/i,
      /\bun(equal|even) (pieces|parts).{0,15}(half|fraction)\b/i,
      /\bclose enough (to )?(half|equal)\b/i,
    ],
    patterns: [/\bdoesn'?t (have to|need to) be equal\b/i],
    playbook: {
      open: "Parts of a whole — the key word is equal parts.",
      steps: [
        "Show fair half vs unfair split.",
        "Only equal parts earn names like 1/2.",
      ],
      check_question: "If two pieces aren't the same size, can we call one 1/2?",
      tutor_directives: [
        "Misconception: unequal parts as fractions — emphasize equal shares first.",
      ],
    },
    relatedExampleSlug: "we.frac.parts_pizza",
  },
  {
    id: "variable_is_label",
    label: "Variable as a word label",
    domain: "early_algebra",
    skillSlug: "alg.variable_as_unknown",
    topics: ["Variables & unknowns", "Simple equations"],
    studentCues: [
      /\b(letter|variable) (is|means) (the )?(name|word|thing)\b/i,
      /\bm (is|=) marbles\b/i,
      /\bx (is|=) apples\b/i,
    ],
    patterns: [/\b(letter|variable) (is|means) (the )?(name|word|thing)\b/i],
    playbook: {
      open: "Letters are shortcuts for amounts we don't know yet.",
      steps: [
        "Replace the letter with 'some number of …'.",
        "Story: bag has m marbles; add 3 → m+3.",
      ],
      check_question: "If m = 7, what is m + 3?",
      tutor_directives: [
        "Misconception: variable-as-label — keep 'unknown number' language.",
      ],
    },
    relatedExampleSlug: "we.alg.variable_bag",
  },
  {
    id: "one_side_balance",
    label: "Changing only one side of an equation",
    domain: "early_algebra",
    skillSlug: "alg.balance_idea",
    topics: ["Simple equations", "Variables & unknowns"],
    studentCues: [
      /\bonly (on )?(the )?(left|right)\b/i,
      /\bjust (fix|change) one side\b/i,
      /\bother side (stays|can stay)\b/i,
    ],
    patterns: [/\bonly (on )?(the )?(left|right) side\b/i],
    playbook: {
      open: "Balance scale thinking — both sides have to stay fair.",
      steps: [
        "Any move must happen on both sides.",
        "Demo tipping by changing only one side.",
      ],
      check_question: "If you subtract 3 on the left, what must you do on the right?",
      tutor_directives: [
        "Misconception: one-side changes — use balance metaphors.",
      ],
    },
    relatedExampleSlug: "we.alg.balance_scale",
  },
];

/** @type {Array<object>|null} */
let remoteCatalog = null;
let remoteKey = "";

function normalizeEntry(raw) {
  if (!raw) return null;
  const studentCues = (raw.studentCues || raw.student_cues || []).map((p) =>
    typeof p === "string" ? new RegExp(p, "i") : p
  );
  const patterns = (raw.patterns || []).map((p) =>
    typeof p === "string" ? new RegExp(p, "i") : p
  );
  return {
    id: raw.id || raw.slug,
    label: raw.label,
    domain: raw.domain,
    description: raw.description || "",
    skillSlug: raw.skillSlug || raw.skill_slug || null,
    topics: raw.topics || raw.topic_names || [],
    studentCues,
    patterns,
    playbook: raw.playbook || {},
    relatedExampleSlug: raw.relatedExampleSlug || raw.related_example_slug || null,
    relatedCounterSlug: raw.relatedCounterSlug || raw.related_counter_slug || null,
    source: raw.source || "catalog",
  };
}

function catalogPool() {
  if (remoteCatalog?.length) return remoteCatalog.map(normalizeEntry);
  return LOCAL_CATALOG.map((e) => ({
    ...e,
    studentCues: e.studentCues || [],
    patterns: e.patterns || [],
  }));
}

export async function loadMisconceptionCatalog({
  topic = "",
  skill = "",
  domain = "",
  force = false,
} = {}) {
  const key = [topic, skill, domain].join("|");
  if (!force && remoteCatalog && remoteKey === key) {
    return { misconceptions: remoteCatalog, source: "cache" };
  }
  try {
    const data = await getMisconceptionCatalog({ topic, skill, domain });
    const list = (data?.misconceptions || []).map(normalizeEntry).filter(Boolean);
    if (list.length) {
      remoteCatalog = list;
      remoteKey = key;
      return { misconceptions: list, source: "catalog" };
    }
  } catch (err) {
    console.warn("Misconception catalog fetch failed; using local pack", err);
  }
  return { misconceptions: LOCAL_CATALOG.map((e) => ({ ...e })), source: "local" };
}

export function clearMisconceptionCache() {
  remoteCatalog = null;
  remoteKey = "";
}

/**
 * Detect misconceptions from student (+ optional tutor) text.
 * @returns {Array<object>} hits with playbook
 */
export function detectMisconceptions(studentText, tutorText = "", opts = {}) {
  const student = studentText || "";
  const blob = `${studentText || ""} ${tutorText || ""}`;
  const topic = (opts.topic || "").toLowerCase();
  let pool = catalogPool();

  if (topic) {
    const topical = pool.filter((e) =>
      (e.topics || []).some((n) => {
        const t = (n || "").toLowerCase();
        return t && (topic === t || topic.includes(t) || t.includes(topic));
      })
    );
    if (topical.length) pool = [...topical, ...pool.filter((e) => !topical.includes(e))];
  }

  const hits = [];
  for (const entry of pool) {
    let matched = false;
    let matchSource = null;
    const cues = entry.studentCues || [];
    const pats = entry.patterns || [];
    if (cues.length && cues.some((re) => re.test?.(student))) {
      matched = true;
      matchSource = "student_cue";
    } else if (student.trim() && pats.some((re) => re.test?.(student))) {
      matched = true;
      matchSource = "pattern_student";
    } else if (student.trim() && pats.some((re) => re.test?.(blob))) {
      matched = true;
      matchSource = "pattern_blob";
    }
    if (!matched) continue;
    const pb = entry.playbook || {};
    hits.push({
      id: entry.id,
      label: entry.label,
      domain: entry.domain,
      skillSlug: entry.skillSlug,
      description: entry.description,
      playbook: pb,
      tutorDirectives: pb.tutor_directives || pb.tutorDirectives || [],
      relatedExampleSlug: entry.relatedExampleSlug,
      relatedCounterSlug: entry.relatedCounterSlug,
      matchSource,
      source: entry.source || "local",
    });
  }
  return hits;
}

/**
 * Optional server-side detect (async). Falls back to local.
 */
export async function detectMisconceptionsRemote({
  studentText,
  tutorText = "",
  topic = "",
  subject = "",
  skill = "",
} = {}) {
  try {
    const data = await detectMisconceptionsApi({
      studentText,
      tutorText,
      topic,
      subject,
      skill,
    });
    if (data?.hits?.length) {
      return data.hits.map((h) => ({
        id: h.id,
        label: h.label,
        domain: h.domain,
        skillSlug: h.skillSlug,
        description: h.description,
        playbook: h.playbook || {},
        tutorDirectives: h.tutorDirectives || h.playbook?.tutor_directives || [],
        relatedExampleSlug: h.relatedExampleSlug,
        relatedCounterSlug: h.relatedCounterSlug,
        matchSource: h.matchSource,
        source: "api",
      }));
    }
  } catch {
    /* local */
  }
  return detectMisconceptions(studentText, tutorText, { topic, subject, skill });
}

/**
 * After a turn: which previously active misconceptions look remediated?
 * Heuristic: had active mc, this turn is correct/partial, and student text
 * does not re-trigger the same cue.
 */
export function detectRemediationSuccess({
  activeMisconceptionIds = [],
  previousHits = [],
  currentHits = [],
  correctness = null,
} = {}) {
  if (correctness !== "correct" && correctness !== "partial") return [];
  const still = new Set((currentHits || []).map((h) => h.id));
  const prevIds = new Set([
    ...(activeMisconceptionIds || []),
    ...(previousHits || []).map((h) => h.id || h),
  ]);
  const remediated = [];
  for (const id of prevIds) {
    if (!id || still.has(id)) continue;
    remediated.push(id);
  }
  return remediated;
}

export function misconceptionDirectives(hits = [], profileMisconceptions = {}) {
  const directives = [];
  const seen = new Set();
  for (const h of hits || []) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    for (const d of h.tutorDirectives || h.playbook?.tutor_directives || []) {
      if (d && !directives.includes(d)) directives.push(d);
    }
    const pb = h.playbook || {};
    if (pb.open) {
      directives.push(`Remediation open for «${h.label}»: ${pb.open}`);
    }
  }
  // Longitudinal active MCs
  for (const mc of Object.values(profileMisconceptions || {})) {
    if (mc.isActive === false) continue;
    if ((mc.count || 0) < 1) continue;
    if (seen.has(mc.id)) continue;
    directives.push(
      `Watch for misconception: ${mc.label} (seen ${mc.count}×).`
    );
    for (const d of mc.tutorDirectives || mc.playbook?.tutor_directives || []) {
      if (d && !directives.includes(d)) directives.push(d);
    }
  }
  return directives.slice(0, 6);
}

export function buildMisconceptionPromptBlock(hits = [], { maxHits = 2 } = {}) {
  if (!hits?.length) return "";
  const lines = [
    "MISCONCEPTION REMEDIATION PLAYBOOK (use silently; never name 'misconception engine'):",
  ];
  for (const h of hits.slice(0, maxHits)) {
    const pb = h.playbook || {};
    lines.push(`— ${h.label} (id=${h.id})`);
    if (pb.open) lines.push(`  Open: ${pb.open}`);
    const steps = pb.steps || [];
    if (steps.length) lines.push(`  Steps: ${steps.join(" | ")}`);
    if (pb.check_question || pb.checkQuestion) {
      lines.push(`  Check: ${pb.check_question || pb.checkQuestion}`);
    }
    for (const d of pb.tutor_directives || h.tutorDirectives || []) {
      lines.push(`  Directive: ${d}`);
    }
    if (h.relatedExampleSlug) {
      lines.push(`  Prefer library example: ${h.relatedExampleSlug}`);
    }
  }
  lines.push(
    "Celebrate when they correct the idea. Do not shame. Keep language age-appropriate."
  );
  return lines.join("\n");
}

export function listLocalMisconceptions() {
  return LOCAL_CATALOG.map((e) => ({ ...e }));
}
