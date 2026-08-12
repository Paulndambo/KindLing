/**
 * Kindling client observability (Phase 0.2).
 *
 * - reportError: Gemini / TTS / API / lesson failures (scrubbed, fire-and-forget)
 * - trackMetric: product funnel counters (session start → first message, drop-off)
 *
 * Never send student answers, full tutor text, emails, or tokens.
 */

import { API_BASE_URL, getAccessToken } from "./api/config";

const SOURCE = "kindling-web";
const MAX_MSG = 200;

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const LONG_DIGIT_RE = /\b\d{6,}\b/g;
const BEARER_RE = /(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi;

/** @type {Map<string, number>} */
const errorDedupe = new Map();
const DEDUPE_MS = 15_000;

/** Session funnel state (in-memory for the open lesson). */
let funnel = {
  sessionId: null,
  startedAt: null,
  firstMessageSent: false,
};

function sanitizeText(value, maxLen = MAX_MSG) {
  if (value == null) return "";
  let text = String(value);
  text = text.replace(EMAIL_RE, "[email]");
  text = text.replace(BEARER_RE, "$1[redacted]");
  text = text.replace(LONG_DIGIT_RE, "[digits]");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > maxLen) text = `${text.slice(0, maxLen - 1)}…`;
  return text;
}

function sanitizeExtra(extra) {
  if (!extra || typeof extra !== "object") return {};
  const out = {};
  let i = 0;
  for (const [key, value] of Object.entries(extra)) {
    if (i >= 12) break;
    const k = sanitizeText(key, 40) || `k${i}`;
    if (typeof value === "number" || typeof value === "boolean" || value == null) {
      out[k] = value;
    } else {
      out[k] = sanitizeText(value, 100);
    }
    i += 1;
  }
  return out;
}

function telemetryEnabled() {
  // Always allow posting when API base is configured (default is local Django).
  // Set VITE_TELEMETRY=false to disable.
  if (import.meta.env.VITE_TELEMETRY === "false") return false;
  return Boolean(API_BASE_URL);
}

function authHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postJson(path, body) {
  if (!telemetryEnabled()) {
    if (import.meta.env.DEV) {
      console.info("%c[Kindling Telemetry]", "color:#8a6d3b;font-weight:bold", path, body);
    }
    return { ok: true, mode: "disabled" };
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Kindling-Source": SOURCE,
        ...authHeaders(),
      },
      body: JSON.stringify(body),
      credentials: "omit",
      keepalive: true,
    });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[Kindling Telemetry] post failed", err);
    }
    return { ok: false, error: String(err?.message || err) };
  }
}

function dedupeKey(kind, code, component, message) {
  return `${kind}|${code}|${component}|${message}`;
}

/**
 * Report a client-side failure. Fire-and-forget; never throws to callers.
 *
 * @param {object} opts
 * @param {'gemini'|'tts'|'stt'|'api'|'lesson'|'learning'|'unknown'} [opts.kind]
 * @param {string} [opts.message]
 * @param {string} [opts.code]
 * @param {string} [opts.component]
 * @param {string} [opts.path] - route or API path (not full URL with query secrets)
 * @param {string} [opts.sessionId]
 * @param {Record<string, unknown>} [opts.extra]
 */
export function reportError(opts = {}) {
  try {
    const kind = opts.kind || "unknown";
    const message = sanitizeText(opts.message || opts.error?.message || "error");
    const code = sanitizeText(opts.code || opts.error?.status || opts.error?.name || "", 64);
    const component = sanitizeText(opts.component || "", 80);
    const path = sanitizeText(opts.path || (typeof window !== "undefined" ? window.location?.pathname : ""), 200);
    const sessionId = sanitizeText(opts.sessionId || funnel.sessionId || "", 64);
    const extra = sanitizeExtra(opts.extra);

    const key = dedupeKey(kind, code, component, message);
    const now = Date.now();
    const last = errorDedupe.get(key);
    if (last && now - last < DEDUPE_MS) {
      return Promise.resolve({ ok: true, mode: "deduped" });
    }
    errorDedupe.set(key, now);

    // Bound dedupe map
    if (errorDedupe.size > 100) {
      const oldest = errorDedupe.keys().next().value;
      errorDedupe.delete(oldest);
    }

    const body = {
      kind,
      message,
      code,
      component,
      path,
      sessionId: sessionId || undefined,
      clientTs: new Date().toISOString(),
      extra: Object.keys(extra).length ? extra : undefined,
    };

    if (import.meta.env.DEV) {
      console.warn("%c[Kindling Error]", "color:#c0392b;font-weight:bold", body);
    }

    return postJson("/api/telemetry/errors/", body);
  } catch {
    return Promise.resolve({ ok: false, mode: "client_guard" });
  }
}

/**
 * Track a product metric. Fire-and-forget.
 *
 * @param {string} name - e.g. session.started
 * @param {object} [opts]
 * @param {number} [opts.value]
 * @param {string} [opts.sessionId]
 * @param {Record<string, unknown>} [opts.tags]
 */
export function trackMetric(name, opts = {}) {
  try {
    const safeName = String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (!safeName) return Promise.resolve({ ok: false });

    const body = {
      name: safeName,
      value: typeof opts.value === "number" ? opts.value : 1,
      sessionId: sanitizeText(opts.sessionId || funnel.sessionId || "", 64) || undefined,
      clientTs: new Date().toISOString(),
      tags: sanitizeExtra(opts.tags),
    };

    if (import.meta.env.DEV) {
      console.info("%c[Kindling Metric]", "color:#27ae60;font-weight:bold", body);
    }

    return postJson("/api/telemetry/metrics/", body);
  } catch {
    return Promise.resolve({ ok: false });
  }
}

/**
 * Call when a lesson session begins (learning session id).
 * Resets first-message funnel for drop-off detection.
 */
export function markSessionStarted(sessionId, tags = {}) {
  funnel = {
    sessionId: sessionId || null,
    startedAt: Date.now(),
    firstMessageSent: false,
  };
  return trackMetric("session.started", {
    sessionId,
    tags: { ...tags },
  });
}

/**
 * Call on the student's first real message in a session.
 * value = ms from session start → first message (funnel latency).
 */
export function markSessionFirstMessage(sessionId, tags = {}) {
  if (funnel.firstMessageSent && funnel.sessionId === sessionId) {
    return Promise.resolve({ ok: true, mode: "already_marked" });
  }
  const started = funnel.startedAt || Date.now();
  const ms = Math.max(0, Date.now() - started);
  funnel.firstMessageSent = true;
  if (sessionId) funnel.sessionId = sessionId;
  return trackMetric("session.first_message", {
    sessionId: sessionId || funnel.sessionId,
    value: ms,
    tags,
  });
}

/**
 * Call when leaving a session without a student message (drop-off).
 */
export function markSessionDropOff(sessionId, tags = {}) {
  if (funnel.firstMessageSent) {
    return Promise.resolve({ ok: true, mode: "skipped_has_message" });
  }
  if (!funnel.sessionId && !sessionId) {
    return Promise.resolve({ ok: true, mode: "no_session" });
  }
  return trackMetric("session.drop_off", {
    sessionId: sessionId || funnel.sessionId,
    tags: {
      ...tags,
      waited_ms: funnel.startedAt ? Date.now() - funnel.startedAt : undefined,
    },
  });
}

/** Reset funnel (e.g. tests). */
export function resetTelemetryFunnel() {
  funnel = { sessionId: null, startedAt: null, firstMessageSent: false };
}

export function getTelemetryFunnel() {
  return { ...funnel };
}
