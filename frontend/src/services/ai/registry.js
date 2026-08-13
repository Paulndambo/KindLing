/**
 * Provider + model registry for Kindling's AI gateway.
 *
 * Adding a provider: register here, implement an adapter in ./providers,
 * and map it in gateway.js.
 */

/** @typedef {'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter'} ProviderId */

/**
 * @typedef {object} ModelDef
 * @property {string} id
 * @property {string} label
 * @property {boolean} [vision]
 * @property {boolean} [tts]
 * @property {boolean} [recommended]
 * @property {string} [note]
 */

/**
 * @typedef {object} ProviderDef
 * @property {ProviderId} id
 * @property {string} name
 * @property {string} description
 * @property {string} docsUrl
 * @property {string} [keyHint]
 * @property {string} [defaultBaseUrl]
 * @property {boolean} [allowsCustomBaseUrl]
 * @property {string} defaultModel
 * @property {ModelDef[]} models
 * @property {('chat'|'vision'|'tts')[]} capabilities
 * @property {string} [color]
 */

/** @type {ProviderDef[]} */
export const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Default Kindling tutor. Strong multimodal + native TTS.",
    docsUrl: "https://aistudio.google.com/apikey",
    keyHint: "AIza… or Google AI Studio key",
    defaultModel: "gemini-3.1-flash-lite",
    capabilities: ["chat", "vision", "tts"],
    color: "#4285F4",
    models: [
      {
        id: "gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash Lite",
        vision: true,
        recommended: true,
        note: "Kindling default",
      },
      {
        id: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash",
        vision: true,
      },
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        vision: true,
      },
      {
        id: "gemini-2.5-flash-preview-tts",
        label: "Gemini 2.5 Flash TTS",
        tts: true,
        note: "Speech only",
      },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models via the OpenAI Chat Completions API.",
    docsUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-…",
    defaultBaseUrl: "https://api.openai.com/v1",
    allowsCustomBaseUrl: true,
    defaultModel: "gpt-4o-mini",
    capabilities: ["chat", "vision"],
    color: "#10A37F",
    models: [
      {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
        vision: true,
        recommended: true,
      },
      { id: "gpt-4o", label: "GPT-4o", vision: true },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini", vision: true },
      { id: "gpt-4.1", label: "GPT-4.1", vision: true },
      { id: "o4-mini", label: "o4-mini", vision: false },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models for careful, long-context tutoring.",
    docsUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-…",
    defaultBaseUrl: "https://api.anthropic.com",
    defaultModel: "claude-3-5-haiku-latest",
    capabilities: ["chat", "vision"],
    color: "#D4A27F",
    models: [
      {
        id: "claude-3-5-haiku-latest",
        label: "Claude 3.5 Haiku",
        vision: true,
        recommended: true,
      },
      {
        id: "claude-sonnet-4-20250514",
        label: "Claude Sonnet 4",
        vision: true,
      },
      {
        id: "claude-3-5-sonnet-latest",
        label: "Claude 3.5 Sonnet",
        vision: true,
      },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-low-latency OpenAI-compatible inference.",
    docsUrl: "https://console.groq.com/keys",
    keyHint: "gsk_…",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    capabilities: ["chat"],
    color: "#F55036",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        label: "Llama 3.3 70B",
        recommended: true,
      },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "One key, many models (OpenAI-compatible).",
    docsUrl: "https://openrouter.ai/keys",
    keyHint: "sk-or-…",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    allowsCustomBaseUrl: false,
    defaultModel: "google/gemini-2.0-flash-001",
    capabilities: ["chat", "vision"],
    color: "#8B5CF6",
    models: [
      {
        id: "google/gemini-2.0-flash-001",
        label: "Gemini 2.0 Flash (via OR)",
        vision: true,
        recommended: true,
      },
      {
        id: "openai/gpt-4o-mini",
        label: "GPT-4o mini (via OR)",
        vision: true,
      },
      {
        id: "anthropic/claude-3.5-haiku",
        label: "Claude 3.5 Haiku (via OR)",
        vision: true,
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct",
        label: "Llama 3.3 70B (via OR)",
      },
    ],
  },
];

export const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]));

export function getProvider(id) {
  return PROVIDER_MAP[id] || null;
}

export function modelsForProvider(providerId, { capability } = {}) {
  const provider = getProvider(providerId);
  if (!provider) return [];
  let models = provider.models || [];
  if (capability === "vision") {
    models = models.filter((m) => m.vision);
  } else if (capability === "tts") {
    models = models.filter((m) => m.tts);
  } else if (capability === "chat") {
    models = models.filter((m) => !m.tts);
  }
  return models;
}

export function defaultModelFor(providerId, capability = "chat") {
  const models = modelsForProvider(providerId, { capability });
  const rec = models.find((m) => m.recommended);
  if (rec) return rec.id;
  if (models[0]) return models[0].id;
  return getProvider(providerId)?.defaultModel || "";
}

/** Platform (env) default — Gemini only today. */
export const PLATFORM_PROVIDER = "gemini";
export const PLATFORM_CHAT_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || "gemini-3.1-flash-lite";
export const PLATFORM_TTS_MODEL = "gemini-2.5-flash-preview-tts";

export const DEFAULT_ROUTING = {
  routingMode: "auto",
  primaryProvider: PLATFORM_PROVIDER,
  primaryModel: PLATFORM_CHAT_MODEL,
  fallbackProvider: "",
  fallbackModel: "",
  taskRoutes: {},
};
