import { apiRequest } from "../api/client";
import { API_BASE_URL, getAccessToken } from "../api/config";

const ENDPOINT = "/api/platform/ai/gemini/";

export const PLATFORM_AI_CAP_EVENT = "kindling:platform-ai-cap";
const LEGACY_CAP_STORAGE_KEY = "kindling.platformAiCap.v1";
const PLATFORM_AI_CAP_STORAGE_PREFIX = "kindling.platformAiCap.v2:";

const memoryCapByUser = new Map();

function currentUtcDay() {
  return new Date().toISOString().slice(0, 10);
}

function decodeJwtUserId(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    const id = payload?.user_id ?? payload?.sub ?? payload?.id;
    return id != null ? `uid_${id}` : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a stable per-user scope key so one user's daily cap never blocks
 * another user signing into the same browser.
 */
export function resolveCurrentUserCapKey() {
  const token = getAccessToken();
  const fromJwt = decodeJwtUserId(token);
  if (fromJwt) return fromJwt;

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("kindling_user_session");
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.isLoggedIn) {
          if (session.id != null) return `uid_${session.id}`;
          if (session.email) return `email_${String(session.email).toLowerCase()}`;
        }
      }
    } catch {
      /* ignore storage errors */
    }
  }

  if (token) {
    return `tok_${token.slice(-16)}`;
  }
  return null;
}

function purgeLegacyGlobalCap() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LEGACY_CAP_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getPlatformAiCap(explicitUserKey = null) {
  purgeLegacyGlobalCap();
  const userKey = explicitUserKey || resolveCurrentUserCapKey();
  if (!userKey) return null;

  const today = currentUtcDay();
  const cached = memoryCapByUser.get(userKey);
  if (cached && cached.utcDay === today && cached.userKey === userKey) {
    return cached;
  }

  if (typeof window !== "undefined") {
    const storageKey = `${PLATFORM_AI_CAP_STORAGE_PREFIX}${userKey}`;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.utcDay === today &&
          parsed.userKey === userKey &&
          parsed.code === "daily_ai_cap_reached"
        ) {
          memoryCapByUser.set(userKey, parsed);
          return parsed;
        }
        window.sessionStorage.removeItem(storageKey);
      }
    } catch {
      /* ignore storage errors */
    }
  }
  memoryCapByUser.delete(userKey);
  return null;
}

export function recordPlatformAiCap({
  detail,
  code = "daily_ai_cap_reached",
  usage = null,
  userKey: explicitUserKey = null,
} = {}) {
  purgeLegacyGlobalCap();
  const userKey = explicitUserKey || resolveCurrentUserCapKey();
  const cap = {
    code,
    userKey,
    detail:
      detail ||
      `Today's platform AI allowance is used up. It resets at ${usage?.resetsAt || "midnight UTC"}.`,
    usage: usage || null,
    utcDay: currentUtcDay(),
    recordedAt: Date.now(),
  };
  if (userKey) {
    memoryCapByUser.set(userKey, cap);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          `${PLATFORM_AI_CAP_STORAGE_PREFIX}${userKey}`,
          JSON.stringify(cap)
        );
      } catch {
        /* ignore storage errors */
      }
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PLATFORM_AI_CAP_EVENT, { detail: cap }));
  }
  return cap;
}

export function clearPlatformAiCap(explicitUserKey = null) {
  purgeLegacyGlobalCap();
  const userKey = explicitUserKey || resolveCurrentUserCapKey();
  if (userKey) {
    memoryCapByUser.delete(userKey);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(`${PLATFORM_AI_CAP_STORAGE_PREFIX}${userKey}`);
      } catch {
        /* ignore storage errors */
      }
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PLATFORM_AI_CAP_EVENT, { detail: null }));
  }
}

function enrichPlatformError(err, fallbackStatus = null, fallbackData = null) {
  const data = fallbackData ?? err?.data ?? null;
  const message =
    data?.detail ||
    err?.message ||
    `Platform AI request failed${fallbackStatus ? ` (${fallbackStatus})` : ""}`;
  const enriched = err instanceof Error ? err : new Error(message);
  if (data?.detail && enriched.message !== data.detail) {
    enriched.message = data.detail;
  }
  enriched.status = fallbackStatus ?? err?.status ?? null;
  enriched.code = data?.code || err?.code || null;
  enriched.usage = data?.usage || err?.usage || null;
  enriched.data = data;

  if (
    enriched.code === "daily_ai_cap_reached" ||
    /platform ai allowance is used up/i.test(enriched.message)
  ) {
    enriched.code = "daily_ai_cap_reached";
    recordPlatformAiCap({
      detail: enriched.message,
      code: "daily_ai_cap_reached",
      usage: enriched.usage,
    });
  }
  return enriched;
}

async function generate({ model, contents, config, stream = false }) {
  if (!stream) {
    try {
      const result = await apiRequest(ENDPOINT, {
        method: "POST",
        json: { model, contents, config },
      });
      if (getPlatformAiCap()) clearPlatformAiCap();
      return result;
    } catch (err) {
      throw enrichPlatformError(err);
    }
  }
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
    method: "POST",
    headers: {
      // DRF negotiates the request before our view can return its streaming
      // HttpResponse. Ask for JSON during negotiation; the successful response
      // still uses text/event-stream and is consumed as an SSE stream below.
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ model, contents, config, stream: true }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw enrichPlatformError(
      new Error(data?.detail || `Platform AI request failed (${response.status})`),
      response.status,
      data
    );
  }
  if (getPlatformAiCap()) clearPlatformAiCap();

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
