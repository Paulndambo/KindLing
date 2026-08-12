/**
 * Lightweight client-side distress / crisis language detection.
 *
 * This is a floor, not a clinical tool. Prefer high precision for "high"
 * severity so normal academic frustration ("I hate fractions") does not trip it.
 *
 * Never log the full student message to third parties — only category + code.
 */

/** @typedef {'none' | 'low' | 'high'} DistressSeverity */
/** @typedef {'none' | 'self_harm' | 'suicide' | 'abuse' | 'acute_distress' | 'violence_intent'} DistressCategory */

/**
 * @typedef {object} DistressHit
 * @property {DistressSeverity} severity
 * @property {DistressCategory} category
 * @property {string} code - stable machine code for telemetry
 * @property {string} reason - short internal reason (not shown raw to student)
 */

const HIGH_PATTERNS = [
  {
    category: "suicide",
    code: "SUICIDE_IDEATION",
    re: /\b(kill\s+my\s*self|kys\b|want\s+to\s+die|wanna\s+die|end\s+my\s+life|suicid(e|al)|better\s+off\s+dead|don'?t\s+want\s+to\s+(be\s+)?alive|wish\s+i\s+(was|were)\s+dead)\b/i,
  },
  {
    category: "self_harm",
    code: "SELF_HARM",
    re: /\b(self[-\s]?harm|cut\s+myself|cutting\s+myself|hurt\s+myself|harming\s+myself)\b/i,
  },
  {
    category: "abuse",
    code: "ABUSE_DISCLOSURE",
    re: /\b((someone|he|she|they|dad|mom|mum|uncle|teacher)\s+(is\s+)?(hurting|abusing|molest|touching)\s+me|i\s+(am|'m)\s+being\s+(abused|hurt|molested)|raped\s+me)\b/i,
  },
  {
    category: "acute_distress",
    code: "ACUTE_CRISIS",
    re: /\b(no\s+one\s+(would\s+)?(care|miss)\s+if\s+i|can'?t\s+go\s+on\s+(anymore|any\s+more)|going\s+to\s+end\s+it)\b/i,
  },
  {
    category: "violence_intent",
    code: "VIOLENCE_INTENT",
    re: /\b(i\s+(want|gonna|going)\s+to\s+(kill|shoot|stab)\s+(him|her|them|someone|everybody|everyone))\b/i,
  },
];

/** Soft emotional signals — do not block tutoring; may gently check in later. */
const LOW_PATTERNS = [
  {
    category: "acute_distress",
    code: "EMOTIONAL_LOW",
    re: /\b(i\s+(feel\s+)?(so\s+)?(hopeless|worthless)|nobody\s+likes\s+me|everyone\s+hates\s+me)\b/i,
  },
];

/**
 * @param {string} text
 * @returns {DistressHit}
 */
export function detectDistress(text) {
  const raw = String(text || "").trim();
  if (!raw || raw.length < 4) {
    return { severity: "none", category: "none", code: "", reason: "" };
  }

  // Academic venting false-positive guards
  if (
    /\b(dying\s+at\s+(this|math|science|homework)|kill(ing)?\s+(this\s+)?(test|exam|problem|homework)|dead\s+(tired|serious))\b/i.test(
      raw
    )
  ) {
    // only skip if no stronger crisis language also present
    const hasHigh = HIGH_PATTERNS.some((p) => p.re.test(raw));
    if (!hasHigh) {
      return { severity: "none", category: "none", code: "", reason: "" };
    }
  }

  for (const p of HIGH_PATTERNS) {
    if (p.re.test(raw)) {
      return {
        severity: "high",
        category: p.category,
        code: p.code,
        reason: `matched:${p.code}`,
      };
    }
  }

  for (const p of LOW_PATTERNS) {
    if (p.re.test(raw)) {
      return {
        severity: "low",
        category: p.category,
        code: p.code,
        reason: `matched:${p.code}`,
      };
    }
  }

  return { severity: "none", category: "none", code: "", reason: "" };
}

/**
 * Student-facing copy for high-severity escalation (warm, non-shaming).
 * @param {DistressHit} hit
 */
export function escalationCopy(hit) {
  const base = {
    title: "You're not alone",
    body:
      "It sounds like you're going through something really hard. Kindling is a learning tutor and isn't the right place for this — but caring people want to help.",
    primaryAction: "I understand — pause tutoring",
    secondaryAction: "I'm OK — go back to the lesson",
  };

  if (hit?.category === "abuse") {
    return {
      ...base,
      title: "You deserve to be safe",
      body:
        "If someone is hurting you, please tell a trusted adult as soon as you can — a parent, caregiver, teacher, or school counselor. You did the right thing by speaking up.",
    };
  }

  if (hit?.category === "suicide" || hit?.category === "self_harm") {
    return {
      ...base,
      title: "Please reach out for real help",
      body:
        "If you're thinking about hurting yourself, stop and talk to a trusted adult now. In many countries you can also contact a crisis line. Kindling will pause the lesson so you can get support.",
    };
  }

  return base;
}

/** Region-agnostic resource hints (not medical advice). */
export const SAFETY_RESOURCES = [
  {
    id: "trusted_adult",
    label: "A trusted adult",
    detail: "Parent, caregiver, teacher, or school counselor",
  },
  {
    id: "iasp",
    label: "Local crisis resources",
    detail: "Find support near you: https://www.iasp.info/suicidalthoughts/",
    href: "https://www.iasp.info/suicidalthoughts/",
  },
  {
    id: "emergency",
    label: "Emergency services",
    detail: "If you are in immediate danger, call your local emergency number",
  },
];
