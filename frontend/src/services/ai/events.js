/** Broadcast when AI keys, routing prefs, or subscription change. */
export const AI_CONFIG_CHANGED = "kindling:ai-config-changed";

export function emitAiConfigChanged(detail = {}) {
  try {
    window.dispatchEvent(
      new CustomEvent(AI_CONFIG_CHANGED, { detail: { at: Date.now(), ...detail } })
    );
  } catch {
    // SSR / non-browser
  }
}
