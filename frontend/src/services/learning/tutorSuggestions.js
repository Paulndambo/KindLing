/**
 * Focused-tutor follow-up chips: parse model-emitted suggestions and
 * strictly topic-anchored navigation fallbacks.
 *
 * Key principles:
 * 1. Suggestions must NEVER deviate from the current lesson topic. Every chip
 *    must help the student navigate or move forward on the topic they are studying.
 * 2. Suggestion count is dynamic (0 to 5) based on necessity and availability:
 *    - 0 suggestions (`⟦suggests: none⟧` or omitted on direct assessment/practice
 *      questions where the student should type their own answer).
 *    - 1, 2, 3, etc. suggestions when specific continuations or confirmation
 *      choices make sense — never padded artificially to 5.
 *
 * Machine block (hidden from learners / TTS):
 *   ⟦suggests: Let's move to the next step | Let me try a practice problem⟧
 *   ⟦suggests: none⟧
 */

export const SUGGEST_MIN = 0;
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
 * True when a suggest tag body explicitly requests zero suggestions
 * (e.g. `⟦suggests: none⟧`, `⟦suggests: 0⟧`, `⟦suggests: ⟧`).
 * @param {string} body
 * @returns {boolean}
 */
export function isExplicitNoneBody(body) {
  const s = String(body || "")
    .replace(/^[:\s]+/, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
  return (
    !s ||
    /^(none|null|nil|empty|0|no\s+suggestions?|omit|-|—|\[\])$/i.test(s)
  );
}

/**
 * Filter out any suggestion that could pull the student off-topic into a
 * hobby tangent, unrelated subject, or generic chit-chat.
 * @param {string} suggestion
 * @returns {boolean} true when the suggestion is safe and topic-focused
 */
export function isOnTopicSuggestion(suggestion) {
  const s = String(suggestion || "").trim();
  if (!s || s.length < 2 || s.length > 120) return false;
  // Reject hobby-tangent or topic-switching prompts that derail the current lesson
  if (
    /\b(connect\s+this\s+to\s+(?!the\s+lesson|this\s+topic)|relate\s+this\s+to\s+my\s+hobb|talk\s+about\s+something\s+else|change\s+the\s+topic|different\s+subject|switch\s+subjects?|tell\s+me\s+a\s+joke|tell\s+me\s+a\s+story|let'?s\s+chat\s+about)\b/i.test(
      s
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Parse suggestion strings from a raw tag body.
 * @param {string} body
 * @returns {string[]}
 */
export function parseSuggestBody(body) {
  const raw = String(body || "").trim();
  if (!raw || isExplicitNoneBody(raw)) return [];

  // Drop leading ":" from "suggests: ..."
  const s = raw.replace(/^[:\s]+/, "").trim();
  if (isExplicitNoneBody(s)) return [];

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
    .filter((p) => !/^(suggests?|items?|none|null|empty|0)$/i.test(p))
    .filter(isOnTopicSuggestion);
}

/**
 * @returns {{ cleanText: string, suggestions: string[], hasExplicitTag: boolean, explicitNone: boolean }}
 */
export function extractTutorSuggestions(text) {
  const source = String(text || "");
  const found = [];
  const re = new RegExp(SUGGEST_BLOCK_RE.source, "gi");
  let m;
  let hasExplicitTag = false;
  let sawNoneTag = false;
  while ((m = re.exec(source)) !== null) {
    hasExplicitTag = true;
    const body = m[1] || m[2] || "";
    if (isExplicitNoneBody(body)) {
      sawNoneTag = true;
      continue;
    }
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
    hasExplicitTag,
    explicitNone: hasExplicitTag && suggestions.length === 0 && sawNoneTag,
  };
}

/**
 * Detect when the tutor's message is presenting an active Quick Assessment or
 * a direct solo problem where clickable chips would spoil or distract from
 * the student working out and typing their own answer.
 */
function shouldOmitFallbackSuggestions(cleanText = "") {
  const t = String(cleanText || "").trim();
  if (!t) return true;
  if (
    /\b(quick\s+assessment|assessment\s+questions?|question\s+1\s*(?:of\s*\d+|[:.)])|type\s+your\s+answers?\s+below|solve\s+(?:these|this)\s+on\s+your\s+own)\b/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Strictly topic-anchored fallback chips when the model omits tags on a normal
 * teaching turn. Every chip helps the student navigate or move forward on the
 * current topic toward completion (never off-topic or hobby tangents).
 *
 * @param {object} [opts]
 * @param {string} [opts.topic]
 * @param {string} [opts.subject]
 * @param {string} [opts.nextTopic]
 * @param {string} [opts.tutorText] last reply (for stage-aware navigation)
 */
export function buildFallbackSuggestions({
  topic = "",
  subject = "",
  nextTopic = "",
  tutorText = "",
} = {}) {
  const t = String(topic || "this topic").trim() || "this topic";
  const shortTopic = t.length > 32 ? `${t.slice(0, 31)}…` : t;
  const cleanNext = String(nextTopic || "").trim();
  const shortNext =
    cleanNext.length > 32 ? `${cleanNext.slice(0, 31)}…` : cleanNext;

  // 1. If the tutor is asking for confirmation to run the wind-down Quick Assessment
  if (
    /\b(quick\s+(?:assessment|check|quiz)|ready\s+for\s+a\s+quick|before\s+we\s+wrap\s+up|test\s+what\s+we'?ve\s+covered|lock\s+this\s+in)\b/i.test(
      tutorText || ""
    )
  ) {
    return [
      `Yes, start the quick assessment on ${shortTopic}`,
      `Let's review one more example of ${shortTopic} first`,
    ];
  }

  // 2. If the tutor has just completed the assessment / topic wind-down and pointed to next steps
  if (
    /\b(training\s+on\s+.*complete|completed\s+(?:our|the|your)\s+training|potential\s+next\s+steps|ready\s+for\s+the\s+next\s+topic|you'?ve\s+mastered)\b/i.test(
      tutorText || ""
    )
  ) {
    const postPool = [];
    if (shortNext) {
      postPool.push(`Next topic: ${shortNext}`);
    }
    postPool.push(
      `Give me one bonus practice problem on ${shortTopic}`,
      `Summarize the key takeaways of ${shortTopic}`
    );
    return postPool.slice(0, 3);
  }

  // 3. Practical computer/device skills — strictly anchored to doing & progressing on `topic`
  const practicalTopic =
    /files?|folders?|operat|browser|internet|password|safety|install|desktop|download|upload|rename|copy|paste|keyboard|mouse/i.test(
      t
    ) ||
    (/computer\s*science/i.test(String(subject || "")) &&
      /literacy|hardware|software|files|internet|safety|operat/i.test(t));

  if (practicalTopic) {
    return [
      `Show me the next step for ${shortTopic}`,
      `I tried that step — check my progress on ${shortTopic}`,
      `I'm ready for the quick assessment on ${shortTopic}`,
    ];
  }

  // 4. Standard concept progression — strictly focused on moving forward through `topic`
  const pool = [
    `Let's move to the next step in ${shortTopic}`,
    `Give me a practice problem on ${shortTopic}`,
    `Walk me through another example of ${shortTopic}`,
    `I'm ready for the quick assessment on ${shortTopic}`,
  ];

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
 * Resolve tutor suggestions without forcing a fixed count:
 * - If the model explicitly emitted `⟦suggests: none⟧`, returns `[]` (0 chips).
 * - If the model emitted 1..5 valid on-topic suggestions, returns ONLY those
 *   (no artificial padding to 3–5) unless a caller explicitly requests `min > 0`.
 * - If the model omitted the tag altogether, returns `[]` during direct
 *   assessment/problem turns or a compact set of 2–3 strictly topic-anchored
 *   progression chips on explanation turns.
 */
export function resolveTutorSuggestions(
  text,
  {
    topic = "",
    subject = "",
    country = "",
    interests = [],
    nextTopic = "",
    min = SUGGEST_MIN,
    max = SUGGEST_MAX,
  } = {}
) {
  const {
    cleanText,
    suggestions: parsed,
    hasExplicitTag,
    explicitNone,
  } = extractTutorSuggestions(text);

  const effectiveMax = Math.max(0, Math.min(SUGGEST_MAX, Number(max) || SUGGEST_MAX));
  const effectiveMin = Math.max(0, Math.min(effectiveMax, Number(min) || 0));

  // Explicit `⟦suggests: none⟧` → 0 suggestions (unless caller forced min > 0)
  if (explicitNone && effectiveMin === 0) {
    return {
      cleanText,
      suggestions: [],
    };
  }

  // Model provided 1..N valid on-topic suggestions → respect the exact count!
  if (parsed.length > 0 && effectiveMin <= parsed.length) {
    return {
      cleanText,
      suggestions: parsed.slice(0, effectiveMax),
    };
  }

  // Model omitted tag during an active Quick Assessment / solo problem → 0 suggestions
  if (!hasExplicitTag && effectiveMin === 0 && shouldOmitFallbackSuggestions(cleanText)) {
    return {
      cleanText,
      suggestions: [],
    };
  }

  const fallbacks = buildFallbackSuggestions({
    topic,
    subject,
    country,
    interests,
    nextTopic,
    tutorText: cleanText,
  });

  // When model omitted tag and effectiveMin === 0, offer a compact 2–3 progression set
  const targetCount =
    parsed.length > 0
      ? Math.max(parsed.length, effectiveMin)
      : effectiveMin > 0
        ? effectiveMin
        : Math.min(3, fallbacks.length);

  const seen = new Set();
  const merged = [];
  for (const s of [...parsed, ...fallbacks]) {
    const key = String(s || "")
      .toLowerCase()
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(String(s).trim());
    if (merged.length >= Math.min(effectiveMax, Math.max(targetCount, parsed.length))) {
      break;
    }
  }

  return {
    cleanText,
    suggestions: merged.slice(0, effectiveMax),
  };
}

/**
 * Prompt instructions for the system prompt: strict topic alignment + dynamic 0–5 count + wind-down navigation.
 */
export function buildSuggestPromptBlock({
  studentName = "the student",
  topic = "",
  subject = "",
  nextTopic = "",
} = {}) {
  const name = studentName || "the student";
  const cleanTopic = String(topic || " the current topic").trim();
  const cleanNext = String(nextTopic || "").trim();
  const practicalTopic =
    /files?|folders?|operat|browser|internet|password|safety|install|desktop|download|upload|rename|copy|paste/i.test(
      cleanTopic
    ) ||
    (/computer\s*science/i.test(String(subject || "")) &&
      /literacy|hardware|software|files|internet|safety|operat/i.test(
        cleanTopic
      ));
  const practicalChipLine = practicalTopic
    ? `- Because "${cleanTopic}" is a hands-on practical topic, when you include chips, favor progression actions like "Show me the next step for ${cleanTopic}", "I completed those steps — what's next?", or "I'm ready for the quick assessment on ${cleanTopic}".`
    : `- Keep every chip phrased from ${name}'s perspective (3–12 words) as a direct step forward in "${cleanTopic}".`;

  return `Follow-up navigation suggestions (strictly on-topic, dynamic count 0 to 5):
- **ZERO DEVIATION RULE (Critical):** Suggestions are easy for ${name} to click. If a suggestion drifts away from "${cleanTopic}", ${name} can easily lose track. Every suggestion you generate MUST be 100% anchored to **"${cleanTopic}"** and geared toward helping ${name} **navigate or move forward** toward completing their training on "${cleanTopic}". NEVER suggest hobby tangents, unrelated subjects, or side topics.
- **DYNAMIC COUNT (0, 1, 2, 3, etc. — NOT a forced 5):** You do NOT have to provide 5 suggestions on every turn. Provide **1, 2, 3, 4, 5, or none (\`⟦suggests: none⟧\`)** based on necessity and what genuinely helps ${name} at this exact stage of "${cleanTopic}":
  • **0 suggestions (\`⟦suggests: none⟧\`)**: Use when you just asked a **Quick Assessment** question or a direct practice problem where ${name} should work out and type their own answer without clickable spoilers or distractions.
  • **1–2 suggestions**: Use when there is a specific, focused decision point — for example, when winding down "${cleanTopic}" and asking ${name} to confirm starting the Quick Assessment (\`⟦suggests: Yes, start the quick assessment on ${cleanTopic} | Let's review one more example first⟧\`), or when advancing directly from one milestone to the next (\`⟦suggests: Let's move to the next step in ${cleanTopic} | Unpack that visual once more⟧\`).
  • **2–3 suggestions**: Use after a concept explanation or worked demonstration so ${name} can move forward to the next milestone, try a guided practice problem on "${cleanTopic}", or ask about the specific step just shown.${cleanNext ? `\n  • **Post-assessment next steps (1–3 suggestions)**: After ${name} completes the Quick Assessment and you point to next steps, include \`Next topic: ${cleanNext}\` alongside any final review option.` : ""}
${practicalChipLine}
- Format at the very end of your message (pipe-separated, never in the middle of a sentence, never explained to the student):
  \`⟦suggests: suggestion one | suggestion two⟧\`  OR  \`⟦suggests: none⟧\``;
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
- Ground examples in ${name}'s world: interests (${interests || "their hobbies when known"}), home, school, play, or community — while keeping the lesson strictly focused on the active topic (use everyday contexts to illuminate the topic, never to drift away from it).
- ${localHint}
- Walk through the example clearly (3–5 natural sentences) so the student can see *how* and *why* the everyday scenario maps to the concept or rule you just taught.
- Even when transitioning into a check question, anchor it in a tangible scenario ("like splitting mangoes at the market…") so the idea stays concrete and alive.
- You are a dedicated private tutor first: deep clarity + natural relatability beat textbook jargon.`;
}

