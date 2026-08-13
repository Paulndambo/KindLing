/**
 * Credential + route resolution.
 *
 * Modes:
 *  - platform: Kindling env Gemini only
 *  - byok: user vault only
 *  - auto: prefer user key for selected provider, else platform Gemini
 */

import {
  getKeyEntry,
  getPlatformGeminiKey,
  hasPlatformGemini,
} from "./keyVault";
import { loadLocalPreferences } from "./preferences";
import {
  PLATFORM_CHAT_MODEL,
  PLATFORM_PROVIDER,
  PLATFORM_TTS_MODEL,
  defaultModelFor,
  getProvider,
} from "./registry";

/**
 * @typedef {object} ResolvedRoute
 * @property {string} provider
 * @property {string} model
 * @property {'platform' | 'byok'} source
 * @property {string} apiKey
 * @property {string} [baseUrl]
 * @property {string} routingMode
 * @property {string} [reason]
 */

/**
 * @param {'chat' | 'vision' | 'tts' | 'summary'} [task]
 * @returns {ResolvedRoute | null}
 */
export function resolveRoute(task = "chat") {
  const prefs = loadLocalPreferences();
  const mode = prefs.routingMode || "auto";

  const taskRoute = prefs.taskRoutes?.[task] || {};
  let provider =
    taskRoute.provider ||
    prefs.primaryProvider ||
    PLATFORM_PROVIDER;
  let model =
    taskRoute.model ||
    prefs.primaryModel ||
    defaultModelFor(provider, task === "tts" ? "tts" : task === "vision" ? "vision" : "chat");

  // TTS is Gemini-native for now — force gemini when possible
  if (task === "tts") {
    provider = "gemini";
    model = taskRoute.model || PLATFORM_TTS_MODEL;
  }

  const tryByok = (pid, mid) => {
    const entry = getKeyEntry(pid);
    if (!entry?.apiKey) return null;
    const def = getProvider(pid);
    return {
      provider: pid,
      model: mid || defaultModelFor(pid, task === "tts" ? "tts" : "chat"),
      source: /** @type {const} */ ("byok"),
      apiKey: entry.apiKey,
      baseUrl: entry.baseUrl || def?.defaultBaseUrl,
      routingMode: mode,
      reason: "user_key",
    };
  };

  const tryPlatform = () => {
    if (!hasPlatformGemini()) return null;
    // Platform only serves Gemini
    if (provider !== "gemini" && mode === "platform") {
      return {
        provider: PLATFORM_PROVIDER,
        model: task === "tts" ? PLATFORM_TTS_MODEL : PLATFORM_CHAT_MODEL,
        source: /** @type {const} */ ("platform"),
        apiKey: getPlatformGeminiKey(),
        routingMode: mode,
        reason: "platform_forced_gemini",
      };
    }
    if (provider === "gemini" || mode === "platform" || mode === "auto") {
      return {
        provider: PLATFORM_PROVIDER,
        model:
          provider === "gemini"
            ? model || PLATFORM_CHAT_MODEL
            : task === "tts"
              ? PLATFORM_TTS_MODEL
              : PLATFORM_CHAT_MODEL,
        source: /** @type {const} */ ("platform"),
        apiKey: getPlatformGeminiKey(),
        routingMode: mode,
        reason: "platform_env",
      };
    }
    return null;
  };

  if (mode === "platform") {
    return tryPlatform();
  }

  if (mode === "byok") {
    const byok = tryByok(provider, model);
    if (byok) return byok;
    // Soft fallback: another provider with a key
    for (const alt of ["gemini", "openai", "anthropic", "groq", "openrouter"]) {
      if (alt === provider) continue;
      const hit = tryByok(alt, defaultModelFor(alt, "chat"));
      if (hit) {
        return { ...hit, reason: "byok_fallback_provider" };
      }
    }
    return null;
  }

  // auto
  const byok = tryByok(provider, model);
  if (byok) return byok;

  // If preferred provider has no key, platform Gemini
  const platform = tryPlatform();
  if (platform) return platform;

  // Last resort: any BYOK key
  for (const alt of ["gemini", "openai", "anthropic", "groq", "openrouter"]) {
    const hit = tryByok(alt, defaultModelFor(alt, "chat"));
    if (hit) return { ...hit, reason: "auto_any_byok" };
  }

  return null;
}

export function isAiAvailable(task = "chat") {
  return Boolean(resolveRoute(task));
}

/**
 * Human-readable runtime snapshot for UI badges.
 */
export function getRuntimeSnapshot() {
  const prefs = loadLocalPreferences();
  const chat = resolveRoute("chat");
  const vision = resolveRoute("vision");
  const tts = resolveRoute("tts");

  return {
    routingMode: prefs.routingMode,
    primaryProvider: prefs.primaryProvider,
    primaryModel: prefs.primaryModel,
    available: Boolean(chat),
    chat,
    vision,
    tts,
    hasPlatform: hasPlatformGemini(),
  };
}
