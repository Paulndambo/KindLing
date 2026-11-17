/**
 * Kindling API base URL.
 * Defaults to local Django runserver when unset.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export const TOKEN_STORAGE_KEY = "kindling_auth_tokens";
export const AUTH_TOKENS_CHANGED = "kindling:auth-tokens-changed";
export const SESSION_EXPIRED_EVENT = "kindling:session-expired";

export function subscribeAuthTokens(callback) {
  const onStorage = (event) => { if (event.key === TOKEN_STORAGE_KEY || event.key === null) callback(); };
  window.addEventListener(AUTH_TOKENS_CHANGED, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUTH_TOKENS_CHANGED, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getStoredTokens() {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens) {
  try {
    if (!tokens) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } else {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    }
    window.dispatchEvent(new Event(AUTH_TOKENS_CHANGED));
  } catch (err) {
    console.warn("Failed to persist auth tokens:", err);
  }
}

export function getAccessToken() {
  return getStoredTokens()?.access || null;
}
