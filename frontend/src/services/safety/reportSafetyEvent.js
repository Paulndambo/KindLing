/**
 * Fire-and-forget safety event reporting (scrubbed — no full student message body).
 */

import { API_BASE_URL, getAccessToken } from "../api/config";

/**
 * @param {object} payload
 * @param {string} payload.category
 * @param {string} payload.code
 * @param {string} payload.severity
 * @param {string} [payload.sessionId]
 * @param {string} [payload.ageBand]
 * @param {string} [payload.component]
 * @param {Record<string, unknown>} [payload.extra]
 */
export async function reportSafetyEvent(payload = {}) {
  if (import.meta.env.VITE_TELEMETRY === "false") {
    if (import.meta.env.DEV) {
      console.warn("[Kindling Safety]", payload);
    }
    return { ok: true, mode: "disabled" };
  }

  const body = {
    category: String(payload.category || "unknown").slice(0, 40),
    code: String(payload.code || "").slice(0, 64),
    severity: String(payload.severity || "high").slice(0, 16),
    sessionId: payload.sessionId
      ? String(payload.sessionId).slice(0, 64)
      : undefined,
    ageBand: payload.ageBand ? String(payload.ageBand).slice(0, 20) : undefined,
    component: payload.component
      ? String(payload.component).slice(0, 80)
      : "lesson",
    // Never send the raw student utterance — only optional non-PII tags
    extra: payload.extra && typeof payload.extra === "object" ? payload.extra : {},
    clientTs: new Date().toISOString(),
  };

  try {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/safety/events/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      credentials: "omit",
      keepalive: true,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[Kindling Safety] report failed", err);
    }
    return { ok: false, error: String(err?.message || err) };
  }
}
