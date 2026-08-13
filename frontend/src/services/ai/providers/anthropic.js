/**
 * Anthropic Messages API adapter (streaming + vision).
 */

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} [opts.baseUrl]
 * @param {string} opts.model
 * @param {string} opts.systemInstruction
 * @param {{ role: string, text: string }[]} [opts.history]
 */
export function createAnthropicChat({
  apiKey,
  baseUrl = "https://api.anthropic.com",
  model,
  systemInstruction,
  history = [],
}) {
  if (!apiKey) return null;

  const root = String(baseUrl).replace(/\/$/, "");
  /** @type {{ role: string, content: string }[]} */
  const messages = [];
  for (const h of history || []) {
    if (!h?.text?.trim()) continue;
    if (h.role === "model" || h.role === "assistant") {
      messages.push({ role: "assistant", content: h.text });
    } else if (h.role === "user") {
      messages.push({ role: "user", content: h.text });
    }
  }

  return {
    provider: "anthropic",
    model,
    async *sendMessageStream({ message }) {
      messages.push({ role: "user", content: message });

      const res = await fetch(`${root}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemInstruction || undefined,
          messages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(
          `Anthropic error ${res.status}: ${errBody.slice(0, 280) || res.statusText}`
        );
      }

      let full = "";
      for await (const event of parseAnthropicSse(res.body)) {
        if (event.type === "content_block_delta" && event.delta?.text) {
          full += event.delta.text;
          yield { text: event.delta.text };
        }
      }

      if (full) {
        messages.push({ role: "assistant", content: full });
      }
    },
  };
}

export async function anthropicComplete({
  apiKey,
  baseUrl = "https://api.anthropic.com",
  model,
  systemInstruction,
  userContent,
}) {
  const root = String(baseUrl).replace(/\/$/, "");
  const res = await fetch(`${root}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemInstruction || undefined,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Anthropic error ${res.status}: ${errBody.slice(0, 280) || res.statusText}`
    );
  }

  const data = await res.json();
  const parts = data?.content || [];
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function anthropicVision({
  apiKey,
  baseUrl = "https://api.anthropic.com",
  model,
  prompt,
  mimeType,
  base64,
}) {
  const root = String(baseUrl).replace(/\/$/, "");
  const res = await fetch(`${root}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType || "image/jpeg",
                data: base64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Anthropic vision error ${res.status}: ${errBody.slice(0, 280) || res.statusText}`
    );
  }

  const data = await res.json();
  const parts = data?.content || [];
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

async function* parseAnthropicSse(body) {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";
    for (const chunk of chunks) {
      const dataLine = chunk
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        yield JSON.parse(payload);
      } catch {
        // skip
      }
    }
  }
}
