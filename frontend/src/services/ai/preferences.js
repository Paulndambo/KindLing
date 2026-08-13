/**
 * AI routing preferences — local first, optionally mirrored to the API.
 */

import { emitAiConfigChanged } from "./events";
import {
  DEFAULT_ROUTING,
  PLATFORM_CHAT_MODEL,
  PLATFORM_PROVIDER,
  getProvider,
} from "./registry";

const STORAGE_KEY = "kindling_ai_routing_v1";

export function loadLocalPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ROUTING };
    const parsed = JSON.parse(raw);
    return normalizePreferences(parsed);
  } catch {
    return { ...DEFAULT_ROUTING };
  }
}

export function saveLocalPreferences(partial) {
  const next = normalizePreferences({
    ...loadLocalPreferences(),
    ...partial,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitAiConfigChanged({ kind: "preferences" });
  return next;
}

export function normalizePreferences(input = {}) {
  const mode = ["auto", "platform", "byok"].includes(input.routingMode)
    ? input.routingMode
    : input.routing_mode && ["auto", "platform", "byok"].includes(input.routing_mode)
      ? input.routing_mode
      : DEFAULT_ROUTING.routingMode;

  const primaryProvider =
    input.primaryProvider ||
    input.primary_provider ||
    DEFAULT_ROUTING.primaryProvider;
  const primaryModel =
    input.primaryModel ||
    input.primary_model ||
    getProvider(primaryProvider)?.defaultModel ||
    PLATFORM_CHAT_MODEL;

  return {
    routingMode: mode,
    primaryProvider: String(primaryProvider).toLowerCase(),
    primaryModel: String(primaryModel),
    fallbackProvider: String(
      input.fallbackProvider || input.fallback_provider || ""
    ).toLowerCase(),
    fallbackModel: String(input.fallbackModel || input.fallback_model || ""),
    taskRoutes: normalizeTaskRoutes(input.taskRoutes || input.task_routes || {}),
  };
}

function normalizeTaskRoutes(routes) {
  if (!routes || typeof routes !== "object") return {};
  const out = {};
  for (const key of ["chat", "vision", "tts", "summary"]) {
    const r = routes[key];
    if (!r || typeof r !== "object") continue;
    const entry = {};
    if (r.provider) entry.provider = String(r.provider).toLowerCase();
    if (r.model) entry.model = String(r.model);
    if (entry.provider || entry.model) out[key] = entry;
  }
  return out;
}

/** Convert API snake_case payload → local shape. */
export function fromApiPreferences(data) {
  if (!data) return loadLocalPreferences();
  return normalizePreferences({
    routingMode: data.routing_mode,
    primaryProvider: data.primary_provider,
    primaryModel: data.primary_model,
    fallbackProvider: data.fallback_provider,
    fallbackModel: data.fallback_model,
    taskRoutes: data.task_routes,
  });
}

/** Local shape → API body. */
export function toApiPreferences(prefs, keyFingerprints = null) {
  const p = normalizePreferences(prefs);
  const body = {
    routing_mode: p.routingMode,
    primary_provider: p.primaryProvider,
    primary_model: p.primaryModel,
    fallback_provider: p.fallbackProvider || "",
    fallback_model: p.fallbackModel || "",
    task_routes: p.taskRoutes || {},
  };
  if (keyFingerprints) {
    body.key_fingerprints = keyFingerprints;
  }
  return body;
}

export { PLATFORM_PROVIDER, PLATFORM_CHAT_MODEL, DEFAULT_ROUTING };
