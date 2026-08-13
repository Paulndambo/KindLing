import { Correctness, Affect, StruggleSignal } from "./types";
import {
  isMathPilotContext,
  parseCheckTags,
  resolveGradedCorrectness,
  stripMathCheckTags,
  verifyMathAnswer,
} from "./mathVerifier";
import { STRUGGLE_THRESHOLDS } from "./struggleThresholds";
import { detectMisconceptions as detectMisconceptionsEngine } from "./misconceptionEngine";

/**
 * Infer learning signals from a student ↔ tutor exchange.
 * Uses linguistic heuristics so we never break tutor character or add latency.
 * A future backend can re-score with ML; this gives Kindling a live pulse now.
 */

const CORRECT_PATTERNS = [
  /\b(correct|exactly|perfect|yes[!.,]|that's right|that is right|you got it|great (job|work|thinking)|well done|nailed it|spot on|absolutely|you('re| are) right)\b/i,
  /\b(nice|awesome|wonderful|excellent|fantastic)\b.{0,40}\b(reason|thinking|work|answer|idea)\b/i,
];

const PARTIAL_PATTERNS = [
  /\b(almost|close|part(ly|ial)|on the right track|good start|one part|half(?:way)?|getting there|not quite all|mostly)\b/i,
  /\b(right about|correct that|yes to)\b/i,
];

const INCORRECT_PATTERNS = [
  /\b(not quite|not exactly|not right|incorrect|mistake|oops|try again|let's rethink|different approach|actually)\b/i,
  /\b(hmm[,.]?\s*(not|let's)|careful|watch out|common mix[- ]?up)\b/i,
];

const HINT_PATTERNS = [
  /\b(hint|clue|help me|i('m| am) stuck|don't (know|get|understand)|idk|what do i do|can you (help|explain|show))\b/i,
];

const QUESTION_PATTERNS = [/\?$/, /^(what|why|how|when|where|which|who|can|could|should|is|are|do|does|did)\b/i];

const HESITANT_PATTERNS = [
  /\b(i think|maybe|not sure|probably|guess|kinda|kind of|sort of|i('m| am) not sure|perhaps|might be)\b/i,
  /\b\?\s*$/,
];

const FRUSTRATED_PATTERNS = [
  /\b(i (hate|can't|cannot)|this is (hard|stupid|impossible|confusing)|i don't get it|ugh|whatever|never mind|forget it|too hard)\b/i,
];

const CONFIDENT_PATTERNS = [
  /\b(i know|definitely|obviously|easy|of course|for sure|100%|clearly)\b/i,
];

const CURIOUS_PATTERNS = [
  /\b(why|how come|what if|curious|wonder|interesting|tell me more)\b/i,
];

const DISENGAGED_PATTERNS = [
  /^(ok|k|idk|sure|fine|yeah|yep|no|nah|idc)\.?$/i,
  /^.{0,2}$/,
];

const VISUAL_PREF_CUES = [
  /\b(picture|draw|diagram|visual|see it|show me|image|slices|pizza|bars?)\b/i,
];

const STORY_PREF_CUES = [
  /\b(story|example|real life|like when|imagine|for instance)\b/i,
];

const STEP_PREF_CUES = [
  /\b(step by step|steps|first .+ then|break it down|one at a time|slowly)\b/i,
];

/** Explicit off-topic / drift language (Epic B1). */
const OFF_TOPIC_PATTERNS = [
  /\b(let'?s (talk|do|play) something else|different topic|change (the )?topic|can we (stop|switch|do something else)|bored of this|i don'?t want to (do|learn) this)\b/i,
  /\b(youtube|tiktok|instagram|minecraft|fortnite|roblox|valorant|video ?games?|play a game)\b/i,
  /\b(what('s| is) your favorite(?! .*fraction|.*number|.*math)|tell me a joke|who (are|is) you|are you (real|a robot|an? ai))\b/i,
  /\b(can we talk about|i want to talk about)\b.+/i,
];

/** Pure math / numeric answers — short is fine, not "thin reasoning". */
const MATHY_ANSWER = /^[\d\s./+\-*=()½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞,:]+$/;

function matchAny(text, patterns) {
  return patterns.some((re) => re.test(text));
}

/**
 * Very short reply that is not a legitimate math token answer.
 */
export function isShortAnswer(
  studentText,
  {
    maxWords = STRUGGLE_THRESHOLDS.SHORT_ANSWER_MAX_WORDS,
    maxChars = STRUGGLE_THRESHOLDS.SHORT_ANSWER_MAX_CHARS,
  } = {}
) {
  const s = (studentText || "").trim();
  if (!s) return true;
  if (MATHY_ANSWER.test(s)) return false;
  if (/^[a-z]$/i.test(s)) return true; // lone letter guesses
  const words = s.split(/\s+/).filter(Boolean);
  return words.length <= maxWords && s.length <= maxChars;
}

/**
 * Fast, thin answer — likely guessing rather than reasoning.
 */
export function isRapidGuess({
  responseMs,
  studentText,
  correctness,
  isHintRequest = false,
  maxMs = STRUGGLE_THRESHOLDS.RAPID_GUESS_MS,
  maxWords = STRUGGLE_THRESHOLDS.RAPID_GUESS_MAX_WORDS,
} = {}) {
  if (isHintRequest) return false;
  if (responseMs == null || responseMs > maxMs) return false;
  const s = (studentText || "").trim();
  if (!s) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > maxWords && s.length > 40) return false;
  // Confident long correct answers can be fast without being guesses
  if (correctness === Correctness.CORRECT && s.length > 12 && !isShortAnswer(s)) {
    return false;
  }
  return true;
}

/**
 * Heuristic off-topic drift relative to the current lesson topic.
 */
export function detectOffTopicDrift({
  studentText,
  topic = "",
  subject = "",
  isHintRequest = false,
} = {}) {
  const s = (studentText || "").trim();
  if (!s || isHintRequest) {
    return { isOffTopic: false, confidence: 0, cues: [] };
  }
  if (MATHY_ANSWER.test(s) || s.length < 8) {
    return { isOffTopic: false, confidence: 0, cues: [] };
  }

  const cues = [];
  if (matchAny(s, OFF_TOPIC_PATTERNS)) {
    cues.push("explicit_pattern");
  }

  // Lexical overlap with topic/subject tokens (very light bag-of-words)
  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "is",
    "it",
    "this",
    "that",
    "i",
    "my",
    "we",
    "you",
    "about",
    "can",
    "do",
    "what",
    "how",
    "why",
  ]);
  const topicTokens = `${topic} ${subject}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !stop.has(t));
  const studentTokens = s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !stop.has(t));

  let overlap = 0;
  if (topicTokens.length && studentTokens.length >= 6) {
    const set = new Set(studentTokens);
    overlap = topicTokens.filter((t) => set.has(t)).length;
    // Long student message with zero topic overlap and no numbers → soft drift
    if (overlap === 0 && !/\d/.test(s) && studentTokens.length >= 8) {
      cues.push("low_topic_overlap");
    }
  }

  const isOffTopic = cues.length > 0;
  const confidence = cues.includes("explicit_pattern")
    ? 0.9
    : cues.includes("low_topic_overlap")
      ? 0.55
      : 0;

  return { isOffTopic, confidence, cues, topicOverlap: overlap };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Infer correctness primarily from how the tutor responds (ground truth in Socratic tutoring).
 */
export function inferCorrectness(studentText, tutorText) {
  const s = studentText || "";
  const t = tutorText || "";

  if (matchAny(s, HINT_PATTERNS) || matchAny(s, QUESTION_PATTERNS) && s.length < 80) {
    // Student seeking help — not a graded attempt
    if (!matchAny(t, CORRECT_PATTERNS) && !matchAny(t, INCORRECT_PATTERNS)) {
      return Correctness.EXPLORING;
    }
  }

  const tutorCorrect = matchAny(t, CORRECT_PATTERNS);
  const tutorPartial = matchAny(t, PARTIAL_PATTERNS);
  const tutorIncorrect = matchAny(t, INCORRECT_PATTERNS);

  if (tutorCorrect && !tutorIncorrect) return Correctness.CORRECT;
  if (tutorPartial) return Correctness.PARTIAL;
  if (tutorIncorrect) return Correctness.INCORRECT;
  if (matchAny(s, QUESTION_PATTERNS)) return Correctness.EXPLORING;
  return Correctness.UNKNOWN;
}

export function inferAffect(studentText) {
  const s = (studentText || "").trim();
  if (!s) return Affect.NEUTRAL;
  if (matchAny(s, FRUSTRATED_PATTERNS)) return Affect.FRUSTRATED;
  if (matchAny(s, DISENGAGED_PATTERNS) && s.length < 12) return Affect.DISENGAGED;
  if (matchAny(s, CURIOUS_PATTERNS)) return Affect.CURIOUS;
  if (matchAny(s, HESITANT_PATTERNS)) return Affect.HESITANT;
  if (matchAny(s, CONFIDENT_PATTERNS)) return Affect.CONFIDENT;
  return Affect.NEUTRAL;
}

/** Epic B5 — catalog-backed detection (playbook attached). */
export function detectMisconceptions(studentText, tutorText, opts = {}) {
  return detectMisconceptionsEngine(studentText, tutorText, opts);
}

export function detectDeliveryPreferences(studentText, tutorText) {
  const blob = `${studentText || ""} ${tutorText || ""}`;
  const prefs = [];
  if (matchAny(blob, VISUAL_PREF_CUES)) prefs.push("visual");
  if (matchAny(blob, STORY_PREF_CUES)) prefs.push("story");
  if (matchAny(blob, STEP_PREF_CUES)) prefs.push("step_by_step");
  return prefs;
}

/**
 * Engagement score 0–1 based on elaboration, questions, and affect.
 */
export function scoreEngagement(studentText, affect, responseMs) {
  const s = (studentText || "").trim();
  let score = 0.5;

  // Longer, thoughtful answers
  if (s.length > 80) score += 0.2;
  else if (s.length > 30) score += 0.1;
  else if (s.length < 8) score -= 0.2;

  if (matchAny(s, QUESTION_PATTERNS)) score += 0.1;
  if (affect === Affect.CURIOUS) score += 0.15;
  if (affect === Affect.FRUSTRATED) score -= 0.1;
  if (affect === Affect.DISENGAGED) score -= 0.25;
  if (affect === Affect.CONFIDENT) score += 0.05;

  // Very fast answers may be guessing; very slow may mean struggle or deep thought
  if (responseMs != null) {
    if (responseMs < 2500 && s.length < 20) score -= 0.1; // snap guess
    if (responseMs > 45000) score += 0.05; // persistence
  }

  return clamp(Number(score.toFixed(2)), 0, 1);
}

/**
 * Full analysis of one student turn + tutor reply.
 * Epic A3: math verifier can override linguistic correctness when confident.
 */
export function analyzeExchange({
  studentText,
  tutorText,
  responseMs = null,
  wasHintRequest = false,
  inputModality = "text", // text | voice
  subject = "",
  topic = "",
  expectedAnswer = null,
  expectedAlts = null,
}) {
  const tutorClean = stripMathCheckTags(tutorText);
  const linguistic = inferCorrectness(studentText, tutorClean);
  const affect = inferAffect(studentText);
  const misconceptions = detectMisconceptions(studentText, tutorClean, {
    subject,
    topic,
  });
  const deliveryPreferences = detectDeliveryPreferences(studentText, tutorClean);
  const engagement = scoreEngagement(studentText, affect, responseMs);
  const isHint =
    wasHintRequest || matchAny(studentText || "", HINT_PATTERNS);

  const wordCount = (studentText || "").trim().split(/\s+/).filter(Boolean).length;

  // Math verification (pilot contexts or when tutor emitted a check tag)
  const tag = parseCheckTags(tutorText);
  const shouldVerify =
    isMathPilotContext(subject, topic) ||
    Boolean(tag.expected || tag.alts?.length || expectedAnswer);

  let verification = null;
  if (shouldVerify && !isHint) {
    verification = verifyMathAnswer(studentText, {
      expected: expectedAnswer || undefined,
      alts: expectedAlts || undefined,
      tutorText,
    });
  }

  const graded = resolveGradedCorrectness({
    linguistic,
    verification,
    preferChecker: true,
  });
  const correctness = graded.correctness;

  // Epic B1 struggle facets (per-turn; session tracker aggregates streaks)
  const shortAnswer = !isHint && isShortAnswer(studentText);
  const rapidGuess = isRapidGuess({
    responseMs,
    studentText,
    correctness,
    isHintRequest: isHint,
  });
  const offTopic = detectOffTopicDrift({
    studentText,
    topic,
    subject,
    isHintRequest: isHint,
  });

  // Prefer math verifier on rapid guesses in pilot contexts (already ran above when applicable)
  const preferSlowDown =
    rapidGuess &&
    (correctness === Correctness.INCORRECT ||
      correctness === Correctness.UNKNOWN ||
      shortAnswer);

  // Confidence proxy: high if confident language or correct+quick; low if hesitant/frustrated
  let confidence = 0.5;
  if (affect === Affect.CONFIDENT) confidence = 0.8;
  if (affect === Affect.HESITANT) confidence = 0.35;
  if (affect === Affect.FRUSTRATED) confidence = 0.25;
  if (correctness === Correctness.CORRECT) confidence = Math.min(1, confidence + 0.15);
  if (correctness === Correctness.INCORRECT) confidence = Math.max(0, confidence - 0.1);
  if (isHint) confidence = Math.max(0.15, confidence - 0.2);
  if (rapidGuess) confidence = Math.max(0.1, confidence - 0.15);
  if (verification?.checked && verification.confidence >= 0.85) {
    confidence = Math.min(1, Math.max(confidence, 0.55));
  }

  const struggleFlags = [];
  if (shortAnswer) struggleFlags.push(StruggleSignal.SHORT_ANSWERS);
  if (rapidGuess) struggleFlags.push(StruggleSignal.RAPID_GUESSING);
  if (offTopic.isOffTopic) struggleFlags.push(StruggleSignal.OFF_TOPIC);

  const tags = buildTags({
    correctness,
    affect,
    isHint,
    deliveryPreferences,
    misconceptions,
    gradeSource: graded.source,
    discrepancy: Boolean(verification?.discrepancy),
    struggleFlags,
  });

  return {
    correctness,
    linguisticCorrectness: linguistic,
    gradeSource: graded.source,
    verification,
    affect,
    engagement,
    confidence: clamp(Number(confidence.toFixed(2)), 0, 1),
    misconceptions,
    deliveryPreferences,
    isHintRequest: isHint,
    isQuestion: matchAny(studentText || "", QUESTION_PATTERNS),
    wordCount,
    charCount: (studentText || "").length,
    responseMs,
    inputModality,
    // Epic B1
    shortAnswer,
    rapidGuess,
    preferSlowDown,
    offTopic: offTopic.isOffTopic,
    offTopicMeta: offTopic,
    struggleFlags,
    tags,
  };
}

function buildTags({
  correctness,
  affect,
  isHint,
  deliveryPreferences,
  misconceptions,
  gradeSource,
  discrepancy,
  struggleFlags = [],
}) {
  const tags = [`correctness:${correctness}`, `affect:${affect}`];
  if (gradeSource) tags.push(`grade_source:${gradeSource}`);
  if (discrepancy) tags.push("math:discrepancy");
  if (isHint) tags.push("behavior:hint");
  deliveryPreferences.forEach((p) => tags.push(`pref:${p}`));
  misconceptions.forEach((m) => tags.push(`misconception:${m.id}`));
  struggleFlags.forEach((s) => tags.push(`struggle:${s}`));
  return tags;
}

export { stripMathCheckTags } from "./mathVerifier";
