/**
 * OpenAI-compatible Chat Completions adapter.
 * Used for OpenAI, Groq, OpenRouter, and custom base URLs.
 */

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.baseUrl
 * @param {string} opts.model
 * @param {string} opts.systemInstruction
 * @param {{ role: string, text: string }[]} [opts.history]
 * @param {Record<string, string>} [opts.extraHeaders]
 */
export function createOpenAiCompatibleChat({
  apiKey,
  baseUrl,
  model,
  systemInstruction,
  history = [],
  extraHeaders = {},
}) {
  if (!apiKey) return null;

  const root = String(baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  /** @type {{ role: string, content: string }[]} */
  const messages = [];
  if (systemInstruction?.trim()) {
    messages.push({ role: "system", content: systemInstruction });
  }
  for (const h of history || []) {
    if (!h?.text?.trim()) continue;
    if (h.role === "model" || h.role === "assistant") {
      messages.push({ role: "assistant", content: h.text });
    } else if (h.role === "user") {
      messages.push({ role: "user", content: h.text });
    }
  }

  return {
    provider: "openai-compatible",
    model,
    async *sendMessageStream({ message }) {
      messages.push({ role: "user", content: message });

      const res = await fetch(`${root}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(
          `OpenAI-compatible error ${res.status}: ${errBody.slice(0, 280) || res.statusText}`
        );
      }

      let full = "";
      for await (const event of parseSse(res.body)) {
        if (event === "[DONE]") break;
        let data;
        try {
          data = JSON.parse(event);
        } catch {
          continue;
        }
        const delta = data?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) {
          full += delta;
          yield { text: delta };
        }
      }

      if (full) {
        messages.push({ role: "assistant", content: full });
      }
    },
  };
}

/**
 * Non-streaming completion (summaries, etc.).
 */
export async function openAiCompatibleComplete({
  apiKey,
  baseUrl,
  model,
  systemInstruction,
  userContent,
  extraHeaders = {},
}) {
  const root = String(baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const messages = [];
  if (systemInstruction?.trim()) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: userContent });

  const res = await fetch(`${root}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `OpenAI-compatible error ${res.status}: ${errBody.slice(0, 280) || res.statusText}`
    );
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

/**
 * Multimodal vision via Chat Completions content parts.
 */
export async function openAiCompatibleVision({
  apiKey,
  baseUrl,
  model,
  prompt,
  mimeType,
  base64,
  extraHeaders = {},
}) {
  const root = String(baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64}`;

  const res = await fetch(`${root}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Vision error ${res.status}: ${errBody.slice(0, 280) || res.statusText}`
    );
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

/**
 * @param {ReadableStream<Uint8Array> | null} body
 */
async function* parseSse(body) {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (trimmed.startsWith("data:")) {
        const payload = trimmed.slice(5).trim();
        if (payload) yield payload;
      }
    }
  }
  if (buffer.trim().startsWith("data:")) {
    yield buffer.trim().slice(5).trim();
  }
}
