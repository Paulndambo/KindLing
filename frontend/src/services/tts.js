import { getGeminiClientForTts, resolveRoute } from "./ai";
import {
  base64ToBytes,
  pcmToWavBlob,
  sampleRateFromMime,
} from "../utils/audio";
import { reportError } from "./telemetry";

/** Warm, natural tutor voice — "Sulafat" is described as Warm by Gemini. */
export const KINDING_VOICE = "Sulafat";

/**
 * Flash TTS via generateContent.
 * Keep each request short so the model does not truncate spoken audio.
 */
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

/**
 * Soft char budget per synthesis request.
 * Gemini TTS often truncates long single requests mid-sentence; ~180 keeps
 * utterances complete while still allowing progressive playback.
 */
export const TTS_CHUNK_MAX_LEN = 180;

/**
 * Style + fidelity instruction. Critical: model must speak every word, not
 * summarize or stop early.
 */
function buildSpeechPrompt(text) {
  return [
    "You are a warm, clear tutor speaking to a student.",
    "Read the transcript aloud exactly as written.",
    "Do not summarize, skip, paraphrase, or stop early.",
    "Do not add commentary before or after the transcript.",
    "",
    "#### TRANSCRIPT",
    text,
  ].join("\n");
}

export function stripMarkdown(text) {
  return String(text || "")
    // machine math check + visual tags (Epic A3/A6) — never speak
    .replace(/⟦\s*check\b[^⟧]*⟧/gi, " ")
    .replace(/\[\[\s*check\s*:?[^\]]*\]\]/gi, " ")
    .replace(/⟦\s*visual\b[^⟧]*⟧/gi, " ")
    .replace(/\[\[\s*visual\s*:?[^\]]*\]\]/gi, " ")
    // fenced / inline code (keep short inline content for speech)
    .replace(/```[\w+-]*\n?([\s\S]*?)```/g, (_, body) => {
      // Skip pure diagrams / long code in speech
      const trimmed = String(body || "").trim();
      if (trimmed.length > 120 || /\n/.test(trimmed)) return " ";
      return ` ${trimmed} `;
    })
    .replace(/`([^`]+)`/g, "$1")
    // display / inline math → rough spoken form
    .replace(/\$\$([\s\S]+?)\$\$/g, " $1 ")
    .replace(/\$([^$\n]+?)\$/g, " $1 ")
    // markdown links keep label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // tables: drop alignment rows, keep cell text
    .replace(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, " ")
    .replace(/\|/g, " ")
    // emphasis / headings / blockquotes
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]+/g, " ")
    // list markers
    .replace(/^\s*[-•*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split text into speech units so the first audio can start quickly while
 * later units synthesize in parallel with playback.
 *
 * Prefers sentence boundaries; never hard-splits mid-word when avoidable.
 */
export function splitIntoSpeechChunks(text, maxLen = TTS_CHUNK_MAX_LEN) {
  const clean = stripMarkdown(text);
  if (!clean) return [];

  // Sentence-ish units (keep trailing punctuation with the sentence)
  const sentences = clean.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g) || [
    clean,
  ];
  const chunks = [];

  const pushHardSplit = (piece) => {
    let rest = piece.trim();
    while (rest.length > maxLen) {
      let cut = rest.lastIndexOf(";", maxLen);
      if (cut < maxLen * 0.4) cut = rest.lastIndexOf(",", maxLen);
      if (cut < maxLen * 0.4) cut = rest.lastIndexOf(" ", maxLen);
      if (cut < maxLen * 0.4) cut = maxLen;
      const part = rest.slice(0, cut).trim();
      if (part) chunks.push(part);
      rest = rest.slice(cut).replace(/^[\s,;]+/, "");
    }
    if (rest) chunks.push(rest);
  };

  let buffer = "";
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    // Emit first short sentence alone for fast time-to-first-audio
    if (!chunks.length && !buffer) {
      if (sentence.length <= maxLen) {
        chunks.push(sentence);
        continue;
      }
      pushHardSplit(sentence);
      continue;
    }

    const merged = buffer ? `${buffer} ${sentence}` : sentence;
    if (merged.length <= maxLen) {
      buffer = merged;
    } else {
      if (buffer) chunks.push(buffer);
      if (sentence.length <= maxLen) {
        buffer = sentence;
      } else {
        buffer = "";
        pushHardSplit(sentence);
      }
    }
  }
  if (buffer) chunks.push(buffer);

  return chunks.filter(Boolean);
}

function extractAudioFromResponse(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const data = part?.inlineData?.data ?? part?.inline_data?.data;
    if (data) {
      const mime =
        part.inlineData?.mimeType ||
        part.inline_data?.mime_type ||
        "audio/L16;rate=24000";
      return { base64: data, mimeType: mime };
    }
  }
  if (response?.data) {
    return {
      base64: response.data,
      mimeType: "audio/L16;rate=24000",
    };
  }
  return null;
}

/**
 * Synthesize a single short utterance into a WAV Blob.
 * @param {string} text
 * @param {{ retries?: number }} [options]
 */
export async function synthesizeSpeech(text, { retries = 1 } = {}) {
  const ai = getGeminiClientForTts();
  if (!ai || !text?.trim()) return null;

  const clean = stripMarkdown(text);
  if (!clean) return null;

  const ttsRoute = resolveRoute("tts");
  const model = ttsRoute?.model || TTS_MODEL;

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildSpeechPrompt(clean),
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: KINDING_VOICE,
              },
            },
          },
        },
      });

      const extracted = extractAudioFromResponse(response);
      if (!extracted?.base64) {
        lastError = new Error("TTS response contained no audio data");
        console.warn(lastError.message, { attempt, len: clean.length });
        continue;
      }

      const pcmBytes = base64ToBytes(extracted.base64);
      if (!pcmBytes.byteLength) {
        lastError = new Error("TTS audio payload was empty");
        continue;
      }

      // Guard against suspiciously tiny audio for longer text (likely truncation)
      const sampleRate = sampleRateFromMime(extracted.mimeType, 24000);
      const approxSeconds = pcmBytes.byteLength / (sampleRate * 2);
      // ~12 chars/sec is a lower bound for natural speech; if far below, retry
      const minExpected = Math.min(1.2, clean.length / 18);
      if (approxSeconds > 0 && approxSeconds < minExpected * 0.35 && clean.length > 40) {
        lastError = new Error(
          `TTS audio too short (${approxSeconds.toFixed(2)}s) for ${clean.length} chars`
        );
        console.warn(lastError.message);
        continue;
      }

      if (
        extracted.mimeType?.includes("wav") ||
        extracted.mimeType?.includes("wave")
      ) {
        return new Blob([pcmBytes], { type: "audio/wav" });
      }

      return pcmToWavBlob(pcmBytes, sampleRate);
    } catch (err) {
      lastError = err;
      console.warn("Gemini TTS synthesis failed:", err);
      // brief backoff before retry
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }

  if (lastError) {
    console.warn("TTS gave up for chunk:", clean.slice(0, 60), lastError);
    reportError({
      kind: "tts",
      message: lastError?.message || "TTS synthesis failed",
      code: lastError?.name || "TTS_FAIL",
      component: "synthesizeSpeech",
      extra: { textLen: clean.length, retries },
    });
  }
  return null;
}

/**
 * Warm the TTS path after the user enables voice (reduces cold-start lag).
 * Fire-and-forget; safe to ignore failures.
 */
export function warmUpTts() {
  if (!getGeminiClientForTts()) return;
  synthesizeSpeech("Hello there.", { retries: 0 }).catch(() => {});
}
