/**
 * Gemini adapter — chat streams, one-shot text, vision, TTS client access.
 */

import { GoogleGenAI } from "@google/genai";
import { removeKey } from "../keyVault";
import { createPlatformGeminiClient } from "../platformGemini";

export function isGeminiKeyAuthError(err) {
  const msg = String(err?.message || err || "");
  const status = Number(err?.status || err?.code || 0);
  return (
    status === 401 ||
    status === 403 ||
    /API_KEY_INVALID|ACCESS_TOKEN_TYPE_UNSUPPORTED|API key not valid|UNAUTHENTICATED/i.test(
      msg
    )
  );
}

/**
 * @param {{ apiKey: string, platformProxy?: boolean }} creds
 */
export function createGeminiClient(creds) {
  if (creds?.platformProxy) return createPlatformGeminiClient();
  if (!creds?.apiKey) return null;
  return new GoogleGenAI({ apiKey: creds.apiKey });
}

/**
 * @param {import('@google/genai').GoogleGenAI} client
 * @param {string} model
 * @param {string} systemInstruction
 * @param {{ role: string, text: string }[]} history
 * @param {{ allowPlatformFallback?: boolean }} [options]
 */
export function createGeminiChat(
  client,
  model,
  systemInstruction,
  history = [],
  options = {}
) {
  if (!client) return null;

  const safeHistory = (history || [])
    .filter((h) => h?.text?.trim() && (h.role === "user" || h.role === "model"))
    .map((h) => ({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: h.text }],
    }));

  let activeChat = client.chats.create({
    model,
    config: { systemInstruction },
    history: safeHistory,
  });
  let usedPlatformFallback = false;

  return {
    provider: "gemini",
    model,
    async *sendMessageStream({ message }) {
      try {
        const response = await activeChat.sendMessageStream({ message });
        for await (const chunk of response) {
          const text = typeof chunk?.text === "string" ? chunk.text : "";
          if (text) yield { text };
        }
      } catch (err) {
        if (
          options.allowPlatformFallback &&
          !usedPlatformFallback &&
          isGeminiKeyAuthError(err)
        ) {
          usedPlatformFallback = true;
          removeKey("gemini");
          const fallbackClient = createPlatformGeminiClient();
          activeChat = fallbackClient.chats.create({
            model,
            config: { systemInstruction },
            history: safeHistory,
          });
          const retryResponse = await activeChat.sendMessageStream({ message });
          for await (const chunk of retryResponse) {
            const text = typeof chunk?.text === "string" ? chunk.text : "";
            if (text) yield { text };
          }
          return;
        }
        throw err;
      }
    },
  };
}

/**
 * @param {import('@google/genai').GoogleGenAI} client
 * @param {string} model
 * @param {string | object} contents
 * @param {object} [config]
 * @param {{ allowPlatformFallback?: boolean }} [options]
 */
export async function geminiGenerateContent(
  client,
  model,
  contents,
  config,
  options = {}
) {
  if (!client) throw new Error("Gemini client unavailable");
  try {
    return await client.models.generateContent({
      model,
      contents,
      ...(config ? { config } : {}),
    });
  } catch (err) {
    if (options.allowPlatformFallback && isGeminiKeyAuthError(err)) {
      removeKey("gemini");
      const fallbackClient = createPlatformGeminiClient();
      return fallbackClient.models.generateContent({
        model,
        contents,
        ...(config ? { config } : {}),
      });
    }
    throw err;
  }
}

export function extractTextFromGeminiResponse(response) {
  if (typeof response?.text === "string") return response.text;
  return (
    response?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("") || ""
  );
}
