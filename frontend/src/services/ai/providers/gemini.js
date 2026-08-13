/**
 * Gemini adapter — chat streams, one-shot text, vision, TTS client access.
 */

import { GoogleGenAI } from "@google/genai";

/**
 * @param {{ apiKey: string }} creds
 */
export function createGeminiClient(creds) {
  if (!creds?.apiKey) return null;
  return new GoogleGenAI({ apiKey: creds.apiKey });
}

/**
 * @param {import('@google/genai').GoogleGenAI} client
 * @param {string} model
 * @param {string} systemInstruction
 * @param {{ role: string, text: string }[]} history
 */
export function createGeminiChat(client, model, systemInstruction, history = []) {
  if (!client) return null;

  const safeHistory = (history || [])
    .filter((h) => h?.text?.trim() && (h.role === "user" || h.role === "model"))
    .map((h) => ({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: h.text }],
    }));

  const chat = client.chats.create({
    model,
    config: { systemInstruction },
    history: safeHistory,
  });

  return {
    provider: "gemini",
    model,
    async *sendMessageStream({ message }) {
      const response = await chat.sendMessageStream({ message });
      for await (const chunk of response) {
        const text = typeof chunk?.text === "string" ? chunk.text : "";
        if (text) yield { text };
      }
    },
  };
}

/**
 * @param {import('@google/genai').GoogleGenAI} client
 * @param {string} model
 * @param {string | object} contents
 * @param {object} [config]
 */
export async function geminiGenerateContent(client, model, contents, config) {
  if (!client) throw new Error("Gemini client unavailable");
  return client.models.generateContent({
    model,
    contents,
    ...(config ? { config } : {}),
  });
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
