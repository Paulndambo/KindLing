import { apiRequest } from "./client";
import { setStoredTokens } from "./config";

/**
 * Normalize backend auth payload into session shape used by the SPA.
 */
function toSession(payload) {
  const user = payload?.user || {};
  const tokens = payload?.tokens || null;
  if (tokens) setStoredTokens(tokens);
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email?.split("@")[0] || "Student",
    isLoggedIn: true,
    loggedInAt: new Date().toISOString(),
    tokens,
  };
}

export async function loginWithPassword(email, password) {
  const data = await apiRequest("/api/auth/login/", {
    method: "POST",
    auth: false,
    json: { email, password },
  });
  return toSession(data);
}

export async function loginWithDemo() {
  const data = await apiRequest("/api/auth/demo/", {
    method: "POST",
    auth: false,
    json: {},
  });
  return toSession(data);
}

export async function registerAccount({ email, password, passwordConfirm, name }) {
  const data = await apiRequest("/api/auth/register/", {
    method: "POST",
    auth: false,
    json: {
      email,
      password,
      password_confirm: passwordConfirm,
      name: name || email.split("@")[0],
    },
  });
  return toSession(data);
}

export async function fetchCurrentUser() {
  return apiRequest("/api/auth/me/", { method: "GET", auth: true });
}

export function logoutLocal() {
  setStoredTokens(null);
}
