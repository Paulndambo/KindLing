/**
 * Kindling API base URL.
 * Defaults to local Django runserver when unset.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export const TOKEN_STORAGE_KEY = "kindling_auth_tokens";

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
  } catch (err) {
    console.warn("Failed to persist auth tokens:", err);
  }
}

export function getAccessToken() {
  return getStoredTokens()?.access || null;
}
