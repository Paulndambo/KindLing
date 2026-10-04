import { apiRequest } from "../api/client";
import { API_BASE_URL, getAccessToken } from "../api/config";

const ENDPOINT = "/api/platform/ai/gemini/";

async function generate({ model, contents, config, stream = false }) {
  if (!stream) {
    return apiRequest(ENDPOINT, { method: "POST", json: { model, contents, config } });
  }
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ model, contents, config, stream: true }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Platform AI request failed (${response.status})`);
  }

  return (async function* streamChunks() {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Platform AI returned an empty stream.");
    const decoder = new TextDecoder();
    let pending = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value || new Uint8Array(), { stream: !done });
        const events = pending.split(/\r?\n\r?\n/);
        pending = events.pop() || "";
        for (const event of events) {
          const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim()).join("\n");
          if (!data || data === "[DONE]") continue;
          const chunk = JSON.parse(data);
          const text = chunk?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
          if (text) yield { text, candidates: chunk.candidates };
        }
        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }
  })();
}

export function createPlatformGeminiClient() {
  return {
    models: {
      generateContent: ({ model, contents, config }) => generate({ model, contents, config }),
    },
    chats: {
      create({ model, config = {}, history = [] }) {
        const messages = [...history];
        return {
          async *sendMessageStream({ message }) {
            const contents = [...messages, {
              role: "user",
              parts: Array.isArray(message) ? message : [{ text: String(message ?? "") }],
            }];
            const stream = await generate({ model, contents, config, stream: true });
            let responseText = "";
            for await (const chunk of stream) {
              responseText += chunk.text;
              yield chunk;
            }
            messages.push(contents[contents.length - 1], {
              role: "model", parts: [{ text: responseText }],
            });
          },
          async sendMessage({ message }) {
            let text = "";
            for await (const chunk of this.sendMessageStream({ message })) text += chunk.text;
            return { text };
          },
        };
      },
    },
  };
}
