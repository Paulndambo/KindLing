import { STORAGE_KEYS } from "./types";
import { API_BASE_URL } from "../api/config";

/**
 * Learning analytics transport.
 *
 * Events are:
 * 1. Queued in localStorage when offline or API fails (survive refresh)
 * 2. POSTed to learning events endpoint when reachable
 * 3. local-mock when VITE_LEARNING_API_URL is "mock"/"local"
 *
 * Payload shape: { schemaVersion, source, events[] }.
 */

const SCHEMA_VERSION = 1;
const SOURCE = "kindling-web";

/** Default dummy endpoint — opt-in via VITE_LEARNING_USE_HTTPBIN */
const DEFAULT_DUMMY_URL = "https://httpbin.org/post";

/** @type {Set<(count: number) => void>} */
const queueListeners = new Set();

function notifyQueueListeners() {
  const count = getQueuedEventCount();
  queueListeners.forEach((fn) => {
    try {
      fn(count);
    } catch {
      /* ignore subscriber errors */
    }
  });
}

/**
 * Subscribe to learning queue depth changes.
 * @param {(count: number) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeLearningQueue(listener) {
  if (typeof listener !== "function") return () => {};
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

export function getQueuedEventCount() {
  return loadQueue().length;
}

function getEndpoint() {
  const configured = import.meta.env.VITE_LEARNING_API_URL;
  if (configured === "mock" || configured === "local") return null;
  if (configured) return configured;
  // Prefer explicit VITE_API_URL, else SPA default API base (local Django)
  const apiBase = import.meta.env.VITE_API_URL || API_BASE_URL;
  if (apiBase) {
    return `${String(apiBase).replace(/\/$/, "")}/api/learning/events/`;
  }
  if (import.meta.env.VITE_LEARNING_USE_HTTPBIN === "true") {
    return DEFAULT_DUMMY_URL;
  }
  return null;
}

/** Whether events are expected to leave the device (vs pure local mock). */
export function isLearningRemoteEnabled() {
  return Boolean(getEndpoint());
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
    localStorage.setItem(
      STORAGE_KEYS.eventQueue,
      JSON.stringify(queue.slice(-200))
    );
  } catch (err) {
    console.warn("Learning event queue save failed:", err);
  }
  notifyQueueListeners();
}

function enqueueEvents(list) {
  if (!list?.length) return;
  const queue = loadQueue();
  // Dedupe by event id when re-queuing
  const seen = new Set(queue.map((e) => e?.id).filter(Boolean));
  for (const evt of list) {
    if (evt?.id && seen.has(evt.id)) continue;
    queue.push(evt);
    if (evt?.id) seen.add(evt.id);
  }
  saveQueue(queue);
}

function makeEnvelope(events) {
  return {
    schemaVersion: SCHEMA_VERSION,
    source: SOURCE,
    sentAt: new Date().toISOString(),
    events,
  };
}

function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Submit one or more learning events. Always non-blocking for the UI.
 * Offline or API failure → durable local queue (survives refresh).
 */
export async function submitLearningEvents(events) {
  const list = Array.isArray(events) ? events : [events];
  if (!list.length) return { ok: true, delivered: 0, mode: "empty" };

  const envelope = makeEnvelope(list);
  const endpoint = getEndpoint();

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

  // Fast path: don't wait on fetch when the browser knows we're offline
  if (isBrowserOffline()) {
    enqueueEvents(list);
    return {
      ok: false,
      delivered: 0,
      mode: "queued",
      error: "offline",
      queued: list.length,
    };
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
      credentials: "omit",
      keepalive: true,
    });

    if (!res.ok) {
      throw new Error(`Learning API ${res.status}`);
    }

    // Drain any previously failed queue on success
    await flushEventQueue();

    return {
      ok: true,
      delivered: list.length,
      mode: "remote",
      status: res.status,
    };
  } catch (err) {
    console.warn("Learning API submit failed — queueing events:", err);
    enqueueEvents(list);
    return {
      ok: false,
      delivered: 0,
      mode: "queued",
      error: String(err?.message || err),
      queued: list.length,
    };
  }
}

/** Flush offline queue (e.g. on session end, reconnect, or app focus). */
export async function flushEventQueue() {
  const queue = loadQueue();
  if (!queue.length) return { ok: true, flushed: 0 };

  const endpoint = getEndpoint();
  if (!endpoint) {
    saveQueue([]);
    return { ok: true, flushed: queue.length, mode: "local-mock" };
  }

  if (isBrowserOffline()) {
    return { ok: false, flushed: 0, error: "offline", queued: queue.length };
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
    notifyQueueListeners();
    return {
      ok: false,
      flushed: 0,
      error: String(err?.message || err),
      queued: queue.length,
    };
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
