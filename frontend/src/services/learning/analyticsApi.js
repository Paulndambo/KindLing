import { STORAGE_KEYS } from "./types";

/**
 * Learning analytics transport.
 *
 * Until the real Kindling backend exists, events are:
 * 1. Queued in localStorage (survive refresh)
 * 2. POSTed to VITE_LEARNING_API_URL when set
 * 3. Otherwise POSTed to a public dummy sink (httpbin) in dev-friendly mode,
 *    or accepted as a local mock so the product never blocks on network
 *
 * Payload shape is backend-ready: { schemaVersion, source, events[] }.
 */

const SCHEMA_VERSION = 1;
const SOURCE = "kindling-web";

/** Default dummy endpoint — swap via VITE_LEARNING_API_URL when backend is ready. */
const DEFAULT_DUMMY_URL = "https://httpbin.org/post";

function getEndpoint() {
  const configured = import.meta.env.VITE_LEARNING_API_URL;
  if (configured === "mock" || configured === "local") return null;
  if (configured) return configured;
  // Default to Kindling API when VITE_API_URL is set
  const apiBase = import.meta.env.VITE_API_URL;
  if (apiBase) {
    return `${String(apiBase).replace(/\/$/, "")}/api/learning/events/`;
  }
  // Opt-in dummy remote sink so you can inspect payloads in Network tab
  if (import.meta.env.VITE_LEARNING_USE_HTTPBIN === "true") {
    return DEFAULT_DUMMY_URL;
  }
  return null; // pure local mock by default (no flaky external deps)
}

function getAuthHeaders() {
  try {
    const raw = localStorage.getItem("kindling_auth_tokens");
    if (!raw) return {};
    const tokens = JSON.parse(raw);
    if (tokens?.access) {
      return { Authorization: `Bearer ${tokens.access}` };
    }
  } catch {
    /* ignore */
  }
  return {};
}


function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.eventQueue);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEYS.eventQueue, JSON.stringify(queue.slice(-200)));
  } catch (err) {
    console.warn("Learning event queue save failed:", err);
  }
}

function makeEnvelope(events) {
  return {
    schemaVersion: SCHEMA_VERSION,
    source: SOURCE,
    sentAt: new Date().toISOString(),
    events,
  };
}

/**
 * Submit one or more learning events. Always non-blocking for the UI.
 * Returns a result summary for debugging / future UI badges.
 */
export async function submitLearningEvents(events) {
  const list = Array.isArray(events) ? events : [events];
  if (!list.length) return { ok: true, delivered: 0, mode: "empty" };

  const envelope = makeEnvelope(list);
  const endpoint = getEndpoint();

  // Always mirror to console in development for inspectability
  if (import.meta.env.DEV) {
    console.info(
      "%c[Kindling Learning]",
      "color:#3E8A8F;font-weight:bold",
      envelope.events.map((e) => e.type).join(", "),
      envelope
    );
  }

  // Local mock path — treat as success, keep offline queue drained
  if (!endpoint) {
    // Store last payload for debugging / future admin panel
    try {
      localStorage.setItem(
        "kindling_learning_last_payload",
        JSON.stringify(envelope)
      );
    } catch {
      /* ignore */
    }
    return { ok: true, delivered: list.length, mode: "local-mock" };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kindling-Schema": String(SCHEMA_VERSION),
        "X-Kindling-Source": SOURCE,
        ...getAuthHeaders(),
      },
      body: JSON.stringify(envelope),
      // Don't send cookies to dummy third parties
      credentials: "omit",
      keepalive: true,
    });

    if (!res.ok) {
      throw new Error(`Learning API ${res.status}`);
    }

    // Drain any previously failed queue on success
    await flushEventQueue();

    return { ok: true, delivered: list.length, mode: "remote", status: res.status };
  } catch (err) {
    console.warn("Learning API submit failed — queueing events:", err);
    const queue = loadQueue();
    queue.push(...list);
    saveQueue(queue);
    return {
      ok: false,
      delivered: 0,
      mode: "queued",
      error: String(err?.message || err),
      queued: list.length,
    };
  }
}

/** Flush offline queue (e.g. on session end or app focus). */
export async function flushEventQueue() {
  const queue = loadQueue();
  if (!queue.length) return { ok: true, flushed: 0 };

  const endpoint = getEndpoint();
  if (!endpoint) {
    saveQueue([]);
    return { ok: true, flushed: queue.length, mode: "local-mock" };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kindling-Schema": String(SCHEMA_VERSION),
        "X-Kindling-Source": SOURCE,
        ...getAuthHeaders(),
      },
      body: JSON.stringify(makeEnvelope(queue)),
      credentials: "omit",
      keepalive: true,
    });
    if (!res.ok) throw new Error(`Learning API ${res.status}`);
    saveQueue([]);
    return { ok: true, flushed: queue.length };
  } catch (err) {
    console.warn("Learning queue flush failed:", err);
    return { ok: false, flushed: 0, error: String(err?.message || err) };
  }
}

/**
 * Build a canonical event object.
 */
export function createLearningEvent(type, payload = {}, context = {}) {
  return {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: new Date().toISOString(),
    context: {
      app: "kindling",
      client: "web",
      ...context,
    },
    payload,
  };
}
