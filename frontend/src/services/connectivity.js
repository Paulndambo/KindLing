/**
 * Connectivity helpers for Kindling resilience (Phase 0.3).
 *
 * - Browser online/offline
 * - Lightweight API health probe (no auth)
 * - Learning-event queue depth (localStorage)
 */

import { API_BASE_URL } from "./api/config";
import {
  flushEventQueue,
  getQueuedEventCount,
  subscribeLearningQueue,
} from "./learning/analyticsApi";

const HEALTH_PATH = "/health/live/";
const PROBE_TIMEOUT_MS = 4000;

/** @typedef {'unknown' | 'ok' | 'down'} ApiHealth */

/**
 * Probe Kindling API liveness. Never throws.
 * @returns {Promise<{ ok: boolean, status: ApiHealth, latencyMs: number | null }>}
 */
export async function probeApiHealth() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, status: "down", latencyMs: null, reason: "offline" };
  }

  const url = `${API_BASE_URL}${HEALTH_PATH}`;
  const started = performance.now?.() ?? Date.now();
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    : null;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      signal: controller?.signal,
    });
    const latencyMs = Math.round(
      (performance.now?.() ?? Date.now()) - started
    );
    if (res.ok) {
      return { ok: true, status: "ok", latencyMs };
    }
    return { ok: false, status: "down", latencyMs, reason: `http_${res.status}` };
  } catch {
    return { ok: false, status: "down", latencyMs: null, reason: "network" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Classify a transport / AI error into a student-safe recovery code.
 * Never includes raw stack traces or student content.
 */
export function classifyFailure(err, { offline } = {}) {
  const raw = String(err?.message || err || "");
  const lower = raw.toLowerCase();

  if (offline || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    return {
      code: "OFFLINE",
      title: "You're offline",
      message:
        "Kindling can't reach the internet right now. Your chat is saved on this device — reconnect and try again.",
      recoverable: true,
    };
  }
  if (
    lower.includes("abort") ||
    lower.includes("timeout") ||
    lower.includes("timed out")
  ) {
    return {
      code: "TIMEOUT",
      title: "That took too long",
      message:
        "Kindling is a bit slow right now. Your message is still here — tap Try again when you're ready.",
      recoverable: true,
    };
  }
  if (
    lower.includes("429") ||
    lower.includes("rate") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted")
  ) {
    return {
      code: "RATE_LIMIT",
      title: "Kindling is busy",
      message:
        "Lots of learners are online. Wait a moment, then try again — your message was kept.",
      recoverable: true,
    };
  }
  if (
    lower.includes("api key") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("permission") ||
    lower.includes("unauthenticated")
  ) {
    return {
      code: "CONFIG",
      title: "Tutor isn't configured",
      message:
        "Kindling can't start the AI tutor. An adult can check the API key setup, then you can try again.",
      recoverable: false,
    };
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return {
      code: "NETWORK",
      title: "Connection hiccup",
      message:
        "We lost the connection for a second. Your message is saved — try again.",
      recoverable: true,
    };
  }
  return {
    code: "AI_UNAVAILABLE",
    title: "Kindling couldn't reply",
    message:
      "Something went wrong on our side — not yours. Your message is saved. Try again when you're ready.",
    recoverable: true,
  };
}

export {
  flushEventQueue,
  getQueuedEventCount,
  subscribeLearningQueue,
};
