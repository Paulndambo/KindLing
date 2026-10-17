/**
 * Supportive-tutor follow-up chips: parse model-emitted suggestions and
 * offline fallbacks so every reply can offer 3–5 one-tap continuations.
 *
 * Machine block (hidden from learners / TTS):
 *   ⟦suggests: Try another example | Let me try one | Why does that work?⟧
 * Also accepts multiline:
 *   ⟦suggests
 *   - Try another example
 *   - Let me try one
 *   ⟧
 */

export const SUGGEST_MIN = 3;
export const SUGGEST_MAX = 5;

/** Full block including delimiters */
export const SUGGEST_BLOCK_RE =
  /⟦\s*suggests?\b([^⟧]*)⟧|\[\[\s*suggests?\s*:?\s*([^\]]*)\]\]/gi;

/**
 * Strip suggestion machine tags from tutor text (display / TTS / signals).
 */
export function stripSuggestTags(text) {
  if (!text) return "";
  return String(text)
    .replace(SUGGEST_BLOCK_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parse suggestion strings from a raw tag body.
 * @param {string} body
 * @returns {string[]}
 */
export function parseSuggestBody(body) {
  const raw = String(body || "").trim();
  if (!raw) return [];

  // Drop leading ":" from "suggests: ..."
  let s = raw.replace(/^[:\s]+/, "").trim();

  // Prefer pipe-separated (primary format)
  let parts;
  if (s.includes("|")) {
    parts = s.split("|");
  } else if (/\n/.test(s)) {
    parts = s.split(/\n+/);
  } else if (s.includes(";")) {
    parts = s.split(";");
  } else {
    // Single item or bullet list on one line with " - "
    parts = s.split(/\s+-\s+/);
  }

  return parts
    .map((p) =>
      String(p || "")
        .replace(/^[\s]*[-•*\d.)\]]+\s*/, "")
        .replace(/^["'“”]+|["'“”]+$/g, "")
        .trim()
    )
    .filter((p) => p.length >= 2 && p.length <= 120)
    .filter((p) => !/^(suggests?|items?)$/i.test(p));
}

/**
 * @returns {{ cleanText: string, suggestions: string[] }}
 */
export function extractTutorSuggestions(text) {
  const source = String(text || "");
  const found = [];
  const re = new RegExp(SUGGEST_BLOCK_RE.source, "gi");
  let m;
  while ((m = re.exec(source)) !== null) {
    const body = m[1] || m[2] || "";
    found.push(...parseSuggestBody(body));
  }
  // Dedupe case-insensitively, preserve order
  const seen = new Set();
  const suggestions = [];
  for (const s of found) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(s);
    if (suggestions.length >= SUGGEST_MAX) break;
  }
  return {
    cleanText: stripSuggestTags(source),
    suggestions,
  };
}

/**
 * Default supportive chips when the model omits or under-fills suggests.
 * Tuned for low-typing, confidence-building tutoring (rural / low-bandwidth friendly).
 *
 * @param {object} [opts]
 * @param {string} [opts.topic]
 * @param {string} [opts.subject]
 * @param {string} [opts.country]
 * @param {string[]} [opts.interests]
 * @param {string} [opts.tutorText] last reply (for light tailoring)
 */
export function buildFallbackSuggestions({
  topic = "",
  subject = "",
  country = "",
  interests = [],
  tutorText = "",
} = {}) {
  const t = String(topic || "this").trim() || "this";
  const shortTopic = t.length > 28 ? `${t.slice(0, 27)}…` : t;
  const ke =
    /kenya|ke\b/i.test(String(country || "")) ||
    /\b(nairobi|mombasa|kiswahili|shilling)\b/i.test(tutorText || "");
  const interest = Array.isArray(interests)
    ? interests.map((x) => String(x || "").trim()).filter(Boolean)[0]
    : "";

  // Lazy import avoided — practical chips via dynamic pattern match (keep deps light)
  const practicalTopic =
    /files?|folders?|operat|browser|internet|password|safety|install|desktop|download|upload|rename|copy|paste|keyboard|mouse/i.test(
      t
    ) ||
    (/computer\s*science/i.test(String(subject || "")) &&
      /literacy|hardware|software|files|internet|safety|operat/i.test(t));

  const practicalPool = practicalTopic
    ? [
        "Show me how step by step",
        "Walk me through doing it",
        "What should I click first?",
        "Give me a try-it checklist",
        "I did the steps — check me",
      ]
    : [];

  const pool = [
    ...practicalPool,
    "Can you show another everyday example?",
    ke
      ? "Give an example from home or the market"
      : "Give a real-life example I know",
    "Let me try a similar one",
    "Why does that work?",
    "Explain that more simply",
    `What should I practice next on ${shortTopic}?`,
    "I think I get it — check me",
    "Can we go one step slower?",
    interest
      ? `Connect this to ${interest}`
      : subject
        ? `How does this help in ${String(subject).slice(0, 24)}?`
        : "How will I use this later?",
    "Show me a common mistake to avoid",
  ];

  // Prefer variety: first 5 unique
  const out = [];
  const seen = new Set();
  for (const s of pool) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= SUGGEST_MAX) break;
  }
  return out;
}

/**
 * Merge model suggestions with fallbacks to land in [min, max].
 */
export function resolveTutorSuggestions(
  text,
  {
    topic = "",
    subject = "",
    country = "",
    interests = [],
    min = SUGGEST_MIN,
    max = SUGGEST_MAX,
  } = {}
) {
  const { cleanText, suggestions: parsed } = extractTutorSuggestions(text);
  const fallbacks = buildFallbackSuggestions({
    topic,
    subject,
    country,
    interests,
    tutorText: cleanText,
  });

  const seen = new Set();
  const merged = [];
  for (const s of [...parsed, ...fallbacks]) {
    const key = String(s || "")
      .toLowerCase()
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(String(s).trim());
    if (merged.length >= max) break;
  }

  // Ensure at least min
  while (merged.length < min && fallbacks[merged.length]) {
    const s = fallbacks[merged.length];
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    } else break;
  }

  return {
    cleanText,
    suggestions: merged.slice(0, max),
  };
}

/**
 * Prompt lines for the system instruction (supportive, low-typing tutor).
 */
export function buildSuggestPromptBlock({
  studentName = "the student",
  topic = "",
  subject = "",
} = {}) {
  const name = studentName || "the student";
  const practicalTopic =
    /files?|folders?|operat|browser|internet|password|safety|install|desktop|download|upload|rename|copy|paste/i.test(
      String(topic || "")
    ) ||
    (/computer\s*science/i.test(String(subject || "")) &&
      /literacy|hardware|software|files|internet|safety|operat/i.test(
        String(topic || "")
      ));
  const practicalChipLine = practicalTopic
    ? `- For this practical skill topic, **always include at least one hands-on chip** such as "Show me how step by step", "Walk me through doing it", "Give me a try-it checklist", or "I did the steps — check me".`
    : `- When the skill is hands-on (how to do something), prefer chips like "Show me how step by step" over pure theory.`;

  return `Follow-up chips (mandatory on almost every reply — reduces typing for ${name}):
- After your learner-facing message, append ONE hidden machine block with 3 to 5 short clickable continuations ${name} might tap next.
- Format exactly (pipe-separated, no numbering):
  ⟦suggests: suggestion one | suggestion two | suggestion three | suggestion four⟧
- Each suggestion: 3–12 words, first-person or short request from the student's side (e.g. "Let me try a similar one", "Show me another visual diagram", "Why does that work?", "Show another everyday example", "Show me how step by step").
- Vary the set: mix practice, visual exploration ("Show a visual comparison"), clarify, real-world, confidence ("I think I get it — check me"), gentle pace control ("Go one step slower"), and hands-on how-to when relevant.
${practicalChipLine}
- Never put the ⟦suggests…⟧ block in the middle of a sentence. Never explain the block to the student.
- Skip the block only for pure safety pauses or when you must stop tutoring.`;
}

/**
 * Real-world / relatable example requirement for every teaching turn.
 */
export function buildRealWorldExamplePromptBlock({
  studentName = "the student",
  country = "",
  interestsStr = "",
} = {}) {
  const name = studentName || "the student";
  const place = String(country || "").trim();
  const interests = String(interestsStr || "").trim();
  const localHint = /kenya/i.test(place)
    ? "Prefer East African / Kenyan everyday hooks when natural (matatu fare, market produce, chapati shares, football scores, phone airtime, shillings, school canteen, shamba, rainfall) — keep it warm and accurate, never stereotyped."
    : place
      ? `Prefer everyday scenes familiar in ${place} when natural.`
      : "Prefer everyday scenes a school-age learner would recognize.";

  return `Real-world / relatable examples (mandatory on teaching replies):
- In every explanation or substantial response, weave in at least one vivid, concrete real-world or everyday example — never leave the student with a dry definition alone.
- Ground examples in ${name}'s world: interests (${interests || "their hobbies when known"}), home, school, play, or community.
- ${localHint}
- Walk through the example clearly (3–5 natural sentences) so the student can see *how* and *why* the everyday scenario maps to the concept or rule you just taught.
- Even when transitioning into a check question, anchor it in a tangible scenario ("like splitting mangoes at the market…") so the idea stays concrete and alive.
- You are a dedicated private tutor first: deep clarity + natural relatability beat textbook jargon.`;
}
