export {
  createChatSession,
  generateText,
  generateVision,
  getGeminiClientForTts,
  getActiveGeminiClient,
  getLegacyAiHandle,
  testActiveConnection,
  isAiAvailable,
  resolveRoute,
  getRuntimeSnapshot,
  ai,
} from "./gateway";

export {
  PROVIDERS,
  PROVIDER_MAP,
  getProvider,
  modelsForProvider,
  defaultModelFor,
  PLATFORM_PROVIDER,
  PLATFORM_CHAT_MODEL,
  PLATFORM_TTS_MODEL,
  DEFAULT_ROUTING,
} from "./registry";

export {
  loadVault,
  getKeyEntry,
  hasKey,
  listKeyStatuses,
  setKey,
  removeKey,
  clearAllKeys,
  buildFingerprintMap,
  fingerprintKey,
  maskKey,
  getPlatformGeminiKey,
  hasPlatformGemini,
} from "./keyVault";

export {
  loadLocalPreferences,
  saveLocalPreferences,
  normalizePreferences,
  fromApiPreferences,
  toApiPreferences,
} from "./preferences";

export { AI_CONFIG_CHANGED, emitAiConfigChanged } from "./events";
