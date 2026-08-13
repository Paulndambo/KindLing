/**
 * Kindling AI Gateway
 *
 * Single façade for chat, completion, vision, and Gemini-native helpers.
 * Resolves credentials + model per call so the UI can hot-switch providers.
 */

import {
  anthropicComplete,
  anthropicVision,
  createAnthropicChat,
} from "./providers/anthropic";
import {
  createGeminiChat,
  createGeminiClient,
  extractTextFromGeminiResponse,
  geminiGenerateContent,
} from "./providers/gemini";
import {
  createOpenAiCompatibleChat,
  openAiCompatibleComplete,
  openAiCompatibleVision,
} from "./providers/openaiCompatible";
import { getProvider } from "./registry";
import { getRuntimeSnapshot, isAiAvailable, resolveRoute } from "./resolve";

export { isAiAvailable, resolveRoute, getRuntimeSnapshot };

/**
 * Create a streaming chat session for the live lesson.
 * @param {string} systemInstruction
 * @param {{ role: string, text: string }[]} [history]
 * @param {{ task?: string }} [options]
 */
export function createChatSession(systemInstruction, history = [], options = {}) {
  const route = resolveRoute(options.task || "chat");
  if (!route) return null;

  const { provider, model, apiKey, baseUrl } = route;

  if (provider === "gemini") {
    const client = createGeminiClient({ apiKey });
    return createGeminiChat(client, model, systemInstruction, history);
  }

  if (provider === "anthropic") {
    return createAnthropicChat({
      apiKey,
      baseUrl: baseUrl || getProvider("anthropic")?.defaultBaseUrl,
      model,
      systemInstruction,
      history,
    });
  }

  // OpenAI-compatible family
  const def = getProvider(provider);
  const extraHeaders =
    provider === "openrouter"
      ? {
          "HTTP-Referer":
            typeof window !== "undefined" ? window.location.origin : "https://kindling.app",
          "X-Title": "Kindling",
        }
      : {};

  return createOpenAiCompatibleChat({
    apiKey,
    baseUrl: baseUrl || def?.defaultBaseUrl,
    model,
    systemInstruction,
    history,
    extraHeaders,
  });
}

/**
 * One-shot text generation (summaries, helpers).
 * @param {string} prompt
 * @param {{ system?: string, task?: string }} [options]
 */
export async function generateText(prompt, options = {}) {
  const route = resolveRoute(options.task || "summary");
  if (!route) throw new Error("No AI route available. Add a key in Settings.");

  const { provider, model, apiKey, baseUrl } = route;
  const system = options.system || "";

  if (provider === "gemini") {
    const client = createGeminiClient({ apiKey });
    const contents = system
      ? `${system}\n\n${prompt}`
      : prompt;
    const response = await geminiGenerateContent(client, model, contents);
    return extractTextFromGeminiResponse(response);
  }

  if (provider === "anthropic") {
    return anthropicComplete({
      apiKey,
      baseUrl: baseUrl || getProvider("anthropic")?.defaultBaseUrl,
      model,
      systemInstruction: system,
      userContent: prompt,
    });
  }

  const def = getProvider(provider);
  const extraHeaders =
    provider === "openrouter"
      ? {
          "HTTP-Referer":
            typeof window !== "undefined" ? window.location.origin : "https://kindling.app",
          "X-Title": "Kindling",
        }
      : {};

  return openAiCompatibleComplete({
    apiKey,
    baseUrl: baseUrl || def?.defaultBaseUrl,
    model,
    systemInstruction: system,
    userContent: prompt,
    extraHeaders,
  });
}

/**
 * Multimodal homework / vision analysis.
 */
export async function generateVision({ prompt, mimeType, base64 }) {
  const route = resolveRoute("vision");
  if (!route) throw new Error("No vision-capable AI route. Add a key in Settings.");

  const { provider, model, apiKey, baseUrl } = route;

  if (provider === "gemini") {
    const client = createGeminiClient({ apiKey });
    const response = await geminiGenerateContent(client, model, [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: base64,
            },
          },
        ],
      },
    ]);
    return extractTextFromGeminiResponse(response);
  }

  if (provider === "anthropic") {
    return anthropicVision({
      apiKey,
      baseUrl: baseUrl || getProvider("anthropic")?.defaultBaseUrl,
      model,
      prompt,
      mimeType,
      base64,
    });
  }

  if (provider === "groq") {
    throw new Error("Groq does not support vision here. Switch chat/vision to Gemini or OpenAI.");
  }

  const def = getProvider(provider);
  const extraHeaders =
    provider === "openrouter"
      ? {
          "HTTP-Referer":
            typeof window !== "undefined" ? window.location.origin : "https://kindling.app",
          "X-Title": "Kindling",
        }
      : {};

  return openAiCompatibleVision({
    apiKey,
    baseUrl: baseUrl || def?.defaultBaseUrl,
    model,
    prompt,
    mimeType,
    base64,
    extraHeaders,
  });
}

/**
 * Gemini client for TTS (Gemini-only capability).
 * Returns null if no Gemini route is available.
 */
export function getGeminiClientForTts() {
  const route = resolveRoute("tts");
  if (!route || route.provider !== "gemini") return null;
  return createGeminiClient({ apiKey: route.apiKey });
}

/**
 * Low-level Gemini client for any Gemini-backed route (or null).
 */
export function getActiveGeminiClient() {
  const route = resolveRoute("chat");
  if (route?.provider === "gemini") {
    return createGeminiClient({ apiKey: route.apiKey });
  }
  // Platform gemini for TTS/helpers even if chat is another provider
  const tts = resolveRoute("tts");
  if (tts?.provider === "gemini") {
    return createGeminiClient({ apiKey: tts.apiKey });
  }
  return null;
}

/**
 * Probe the active route with a tiny completion.
 * @returns {Promise<{ ok: boolean, provider?: string, model?: string, source?: string, latencyMs?: number, error?: string }>}
 */
export async function testActiveConnection() {
  const route = resolveRoute("chat");
  if (!route) {
    return { ok: false, error: "No credentials configured." };
  }
  const started = performance.now();
  try {
    const text = await generateText(
      'Reply with exactly the word "kindling" and nothing else.',
      { task: "summary" }
    );
    const latencyMs = Math.round(performance.now() - started);
    const ok = /kindling/i.test(String(text || ""));
    return {
      ok,
      provider: route.provider,
      model: route.model,
      source: route.source,
      latencyMs,
      error: ok ? undefined : `Unexpected response: ${String(text).slice(0, 80)}`,
    };
  } catch (err) {
    return {
      ok: false,
      provider: route.provider,
      model: route.model,
      source: route.source,
      latencyMs: Math.round(performance.now() - started),
      error: err?.message || String(err),
    };
  }
}

/**
 * Backward-compatible "ai" proxy used by legacy modules.
 * Prefer createChatSession / generateText / getGeminiClientForTts.
 */
export const ai = {
  get available() {
    return isAiAvailable();
  },
  chats: {
    create({ model, config, history }) {
      const client = getActiveGeminiClient();
      if (!client) throw new Error("No Gemini client for legacy chats.create");
      return client.chats.create({ model, config, history });
    },
  },
  models: {
    generateContent(args) {
      const client = getActiveGeminiClient() || getGeminiClientForTts();
      if (!client) throw new Error("No Gemini client for generateContent");
      return client.models.generateContent(args);
    },
  },
};

// Proxy that behaves like null when no AI, for `if (!ai)` checks
export function getLegacyAiHandle() {
  return isAiAvailable() ? ai : null;
}
