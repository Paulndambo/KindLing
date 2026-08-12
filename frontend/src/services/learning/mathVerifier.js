/**
 * Math correctness verification for pilot graded turns (Epic A3).
 *
 * Does NOT trust tutor language alone. Parses student answers as fractions /
 * decimals / simple numbers and compares to:
 *  1) Hidden tutor check tags: ⟦check expected="3/4" alts="0.75|6/8" result="correct"⟧
 *  2) Explicit expected answers passed by callers
 *
 * Pure JS (no sympy). Server mirrors with fractions.Fraction.
 */

/** Hidden machine tag — stripped before display / TTS */
export const CHECK_TAG_RE =
  /⟦\s*check\b([^⟧]*)⟧|\[\[\s*check\s*:?\s*([^\]]+)\]\]/gi;

/**
 * @typedef {object} MathValue
 * @property {'rational'|'decimal'|'integer'|'percent'|'expression'} kind
 * @property {number} num - numerator (scaled)
 * @property {number} den - denominator
 * @property {string} raw
 * @property {number} [approx] - float approx
 */

/**
 * @typedef {object} VerificationResult
 * @property {boolean} checked - true if we could evaluate
 * @property {'correct'|'partial'|'incorrect'|null} correctness
 * @property {number} confidence - 0–1
 * @property {string} method
 * @property {string|null} studentRaw
 * @property {string|null} expectedRaw
 * @property {string[]} expectedAlts
 * @property {string|null} tutorClaimed - result= from tag if present
 * @property {boolean} discrepancy - true when tutor claim ≠ checker
 * @property {string} [note]
 */

export function stripMathCheckTags(text) {
  if (!text) return "";
  return String(text)
    .replace(CHECK_TAG_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parse check tag attributes from tutor text.
 * @returns {{ expected: string|null, alts: string[], result: string|null, raw: string|null }}
 */
export function parseCheckTags(tutorText) {
  const text = String(tutorText || "");
  let expected = null;
  let alts = [];
  let result = null;
  let raw = null;

  const re = new RegExp(CHECK_TAG_RE.source, "gi");
  let m;
  while ((m = re.exec(text)) !== null) {
    const body = (m[1] || m[2] || "").trim();
    raw = m[0];
    // expected="..." or expected=3/4
    const expM = body.match(/expected\s*=\s*["']?([^"'\s|,;]+)["']?/i);
    if (expM) expected = expM[1].trim();
    // bare form: check: 3/4
    if (!expected) {
      const bare = body.match(/^([0-9./+\-x×*÷^()%\s]+)$/i);
      if (bare) expected = bare[1].trim();
    }
    const altsM = body.match(/alts?\s*=\s*["']?([^"']+)["']?/i);
    if (altsM) {
      alts = altsM[1]
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const resM = body.match(/result\s*=\s*["']?(correct|incorrect|partial|wrong|right)["']?/i);
    if (resM) {
      const r = resM[1].toLowerCase();
      result =
        r === "right" || r === "correct"
          ? "correct"
          : r === "wrong" || r === "incorrect"
            ? "incorrect"
            : r === "partial"
              ? "partial"
              : null;
    }
  }

  return { expected, alts, result, raw };
}

function gcd(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function simplify(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }
  // Scale floats to rationals
  if (!Number.isInteger(num) || !Number.isInteger(den)) {
    const scale = 1e6;
    num = Math.round(num * scale);
    den = Math.round(den * scale);
  }
  const g = gcd(num, den);
  num = num / g;
  den = den / g;
  if (den < 0) {
    num = -num;
    den = -den;
  }
  return { num, den, approx: num / den };
}

/**
 * Parse a single math answer string into a rational/decimal value.
 * @param {string} raw
 * @returns {MathValue|null}
 */
export function parseMathValue(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  // Clean latex-ish and words
  s = s
    .replace(/\$/g, "")
    .replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/gi, "($1)/($2)")
    .replace(/\\dfrac\s*\{([^}]+)\}\s*\{([^}]+)\}/gi, "($1)/($2)")
    .replace(/\\times/gi, "*")
    .replace(/\\div/gi, "/")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  // percent
  const pct = s.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (pct) {
    const v = parseFloat(pct[1]) / 100;
    const r = simplify(v, 1);
    return r ? { kind: "percent", ...r, raw: s } : null;
  }

  // mixed number: 1 3/4 or 1-3/4
  const mixed = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = parseInt(mixed[1], 10);
    const n = parseInt(mixed[2], 10);
    const d = parseInt(mixed[3], 10);
    const sign = whole < 0 ? -1 : 1;
    const r = simplify(sign * (Math.abs(whole) * d + n), d);
    return r ? { kind: "rational", ...r, raw: s } : null;
  }

  // fraction a/b
  const frac = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    const r = simplify(parseInt(frac[1], 10), parseInt(frac[2], 10));
    return r ? { kind: "rational", ...r, raw: s } : null;
  }

  // integer
  if (/^-?\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return { kind: "integer", num: n, den: 1, approx: n, raw: s };
  }

  // decimal
  if (/^-?\d+\.\d+$/.test(s)) {
    const v = parseFloat(s);
    const r = simplify(v, 1);
    return r ? { kind: "decimal", ...r, raw: s } : null;
  }

  // simple a+b, a-b, a*b with integers/fractions (very limited)
  const simpleOp = s.match(
    /^(-?\d+(?:\/\d+)?)\s*([+\-*/])\s*(-?\d+(?:\/\d+)?)$/
  );
  if (simpleOp) {
    const left = parseMathValue(simpleOp[1]);
    const right = parseMathValue(simpleOp[3]);
    const op = simpleOp[2];
    if (left && right) {
      let num;
      let den;
      if (op === "+") {
        num = left.num * right.den + right.num * left.den;
        den = left.den * right.den;
      } else if (op === "-") {
        num = left.num * right.den - right.num * left.den;
        den = left.den * right.den;
      } else if (op === "*") {
        num = left.num * right.num;
        den = left.den * right.den;
      } else if (op === "/") {
        num = left.num * right.den;
        den = left.den * right.num;
      }
      const r = simplify(num, den);
      return r ? { kind: "expression", ...r, raw: s } : null;
    }
  }

  return null;
}

/**
 * Pull candidate answer tokens from free-form student text.
 * Prefers last math-looking token (students often reason then answer).
 */
export function extractStudentAnswers(studentText) {
  const s = String(studentText || "");
  const candidates = [];

  // Explicit "answer is X"
  const answerIs = [
    ...s.matchAll(
      /\b(?:answer|equals?|is|=)\s*(?:is\s+)?(-?\d+\s+\d+\/\d+|-?\d+\/\d+|-?\d+\.\d+|-?\d+%?)\b/gi
    ),
  ];
  for (const m of answerIs) {
    candidates.push(m[1]);
  }

  // All fraction / mixed / decimal / int tokens
  const tokens = s.match(
    /-?\d+\s+\d+\/\d+|-?\d+\/\d+|-?\d+\.\d+|-?\d+%/g
  );
  if (tokens) candidates.push(...tokens);

  // Lone integers only if short message (likely the answer)
  if (s.trim().length < 40) {
    const ints = s.match(/(?:^|[^\d])(-?\d+)(?:[^\d]|$)/g);
    if (ints) {
      for (const raw of ints) {
        const n = raw.match(/-?\d+/);
        if (n) candidates.push(n[0]);
      }
    }
  }

  // Deduplicate preserving order, parseable only
  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    const key = String(c).trim();
    if (!key || seen.has(key)) continue;
    if (!parseMathValue(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function valuesEqual(a, b, tol = 1e-9) {
  if (!a || !b) return false;
  // Exact rational
  if (a.num === b.num && a.den === b.den) return true;
  // Numeric tolerance
  if (
    Number.isFinite(a.approx) &&
    Number.isFinite(b.approx) &&
    Math.abs(a.approx - b.approx) <= tol
  ) {
    return true;
  }
  return false;
}

function valuesClosePartial(a, b) {
  if (!a || !b) return false;
  // Same magnitude ballpark, off by common factor slip
  if (!Number.isFinite(a.approx) || !Number.isFinite(b.approx)) return false;
  if (b.approx === 0) return Math.abs(a.approx) < 1e-6;
  const ratio = a.approx / b.approx;
  // reciprocal slip or off-by-one denominator style near misses
  if (Math.abs(ratio - 1) < 0.12) return true;
  if (Math.abs(ratio - 1 / ratio) < 0.05 && Math.abs(ratio) > 0.5) return true;
  return false;
}

/**
 * Core verification against expected answers.
 * @param {string} studentText
 * @param {object} [opts]
 * @param {string} [opts.expected]
 * @param {string[]} [opts.alts]
 * @param {string} [opts.tutorText]
 * @param {string} [opts.tutorClaimed]
 */
export function verifyMathAnswer(studentText, opts = {}) {
  /** @type {VerificationResult} */
  const empty = {
    checked: false,
    correctness: null,
    confidence: 0,
    method: "none",
    studentRaw: null,
    expectedRaw: null,
    expectedAlts: [],
    tutorClaimed: null,
    discrepancy: false,
  };

  const tag = parseCheckTags(opts.tutorText || "");
  const expectedRaw = opts.expected || tag.expected || null;
  const alts = [
    ...(opts.alts || []),
    ...(tag.alts || []),
  ].filter(Boolean);
  const tutorClaimed = opts.tutorClaimed || tag.result || null;

  if (!expectedRaw && !alts.length) {
    // Nothing to check against
    return { ...empty, tutorClaimed, note: "no_expected" };
  }

  const studentCandidates = extractStudentAnswers(studentText);
  if (!studentCandidates.length) {
    return {
      ...empty,
      tutorClaimed,
      expectedRaw,
      expectedAlts: alts,
      note: "no_student_math",
    };
  }

  const expectedList = [expectedRaw, ...alts].filter(Boolean);
  const expectedVals = expectedList
    .map((e) => ({ raw: e, val: parseMathValue(e) }))
    .filter((x) => x.val);

  if (!expectedVals.length) {
    return {
      ...empty,
      tutorClaimed,
      expectedRaw,
      expectedAlts: alts,
      note: "unparseable_expected",
    };
  }

  // Prefer last student candidate as final answer
  const ordered = [...studentCandidates].reverse();
  let best = null;

  for (const cand of ordered) {
    const sv = parseMathValue(cand);
    if (!sv) continue;
    for (const exp of expectedVals) {
      if (valuesEqual(sv, exp.val)) {
        best = {
          checked: true,
          correctness: "correct",
          confidence: 0.95,
          method: "rational_equiv",
          studentRaw: cand,
          expectedRaw: exp.raw,
          expectedAlts: alts,
          tutorClaimed,
          discrepancy: false,
        };
        break;
      }
    }
    if (best) break;
  }

  if (!best) {
    // Partial near-miss on last candidate
    const last = ordered[0];
    const sv = parseMathValue(last);
    let partial = false;
    if (sv) {
      for (const exp of expectedVals) {
        if (valuesClosePartial(sv, exp.val)) {
          partial = true;
          best = {
            checked: true,
            correctness: "partial",
            confidence: 0.7,
            method: "near_miss",
            studentRaw: last,
            expectedRaw: exp.raw,
            expectedAlts: alts,
            tutorClaimed,
            discrepancy: false,
          };
          break;
        }
      }
    }
    if (!partial) {
      best = {
        checked: true,
        correctness: "incorrect",
        confidence: 0.88,
        method: "mismatch",
        studentRaw: last || studentCandidates[0],
        expectedRaw: expectedVals[0].raw,
        expectedAlts: alts,
        tutorClaimed,
        discrepancy: false,
      };
    }
  }

  if (
    tutorClaimed &&
    best.correctness &&
    tutorClaimed !== best.correctness &&
    !(tutorClaimed === "partial" && best.correctness === "correct")
  ) {
    // Normalize partial/correct soft disagreements
    const soft =
      (tutorClaimed === "correct" && best.correctness === "partial") ||
      (tutorClaimed === "partial" && best.correctness === "incorrect");
    best.discrepancy = !soft || tutorClaimed === "correct" && best.correctness === "incorrect" || tutorClaimed === "incorrect" && best.correctness === "correct";
    if (
      (tutorClaimed === "correct" && best.correctness === "incorrect") ||
      (tutorClaimed === "incorrect" && best.correctness === "correct")
    ) {
      best.discrepancy = true;
      best.note = "tutor_disagreement";
      // Prefer checker
      best.confidence = Math.min(0.99, best.confidence + 0.02);
    }
  }

  return best;
}

/**
 * Resolve final correctness for a graded turn.
 * Prefers math checker when checked; else linguistic.
 */
export function resolveGradedCorrectness({
  linguistic,
  verification,
  preferChecker = true,
}) {
  if (
    preferChecker &&
    verification?.checked &&
    verification.correctness &&
    verification.confidence >= 0.65
  ) {
    return {
      correctness: verification.correctness,
      source: "math_verifier",
      verification,
      linguistic,
    };
  }
  return {
    correctness: linguistic,
    source: "linguistic",
    verification: verification || null,
    linguistic,
  };
}

/** Subjects/topics where math checking is active by default */
export function isMathPilotContext(subject, topic) {
  const blob = `${subject || ""} ${topic || ""}`.toLowerCase();
  return (
    blob.includes("math") ||
    blob.includes("fraction") ||
    blob.includes("algebra") ||
    blob.includes("equation") ||
    blob.includes("number") ||
    blob.includes("arithmetic")
  );
}
