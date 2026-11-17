import { API_BASE_URL, getStoredTokens, setStoredTokens, SESSION_EXPIRED_EVENT } from "./config";
import { reportError } from "../telemetry";
import { createSessionRecovery } from "./session-recovery";

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path) {
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

const sessionRecovery = createSessionRecovery({
  getTokens: getStoredTokens,
  setTokens: setStoredTokens,
  onExpired: () => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)),
  refreshTokens: async (refresh) => {
    const response = await fetch(buildUrl("/api/auth/refresh/"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.access) {
      throw new ApiError(response.status === 401 || response.status === 403
        ? "Your session has expired. Please sign in again."
        : "Could not refresh your session. Please try again.",
      { status: response.ok ? 502 : response.status });
    }
    return { access: data.access, ...(data.refresh ? { refresh: data.refresh } : {}) };
  },
});

/**
 * Authenticated JSON fetch against the Kindling backend.
 * @param {string} path - e.g. "/api/auth/login/"
 * @param {RequestInit & { auth?: boolean, json?: unknown }} options
 */
export async function apiRequest(path, options = {}) {
  const {
    auth = true,
    json,
    headers: extraHeaders = {},
    ...rest
  } = options;

  const headers = {
    Accept: "application/json",
    ...extraHeaders,
  };

  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const requestSession = auth ? getStoredTokens() : null;
  const send = (token) => fetch(buildUrl(path), {
    ...rest,
    headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  // Avoid recursive telemetry posts if the telemetry endpoint itself fails
  const isTelemetryPath =
    typeof path === "string" && path.includes("/api/telemetry/");

  let res;
  try {
    res = await send(requestSession?.access);
    if (res.status === 401 && auth && requestSession?.access) {
      const renewedAccess = await sessionRecovery.recover(requestSession);
      if (renewedAccess) {
        const retrySession = getStoredTokens();
        res = await send(renewedAccess);
        if (res.status === 401) sessionRecovery.expire(retrySession);
      }
    }
  } catch (networkErr) {
    if (!isTelemetryPath) {
      reportError({
        kind: "api",
        message: networkErr?.message || "Network request failed",
        code: networkErr instanceof ApiError ? String(networkErr.status) : "NETWORK",
        component: "apiRequest",
        path: typeof path === "string" ? path.split("?")[0] : "",
      });
    }
    throw networkErr;
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message =
      (data && (data.detail || data.error || data.message)) ||
      (typeof data === "string" && data) ||
      `Request failed (${res.status})`;
    const err = new ApiError(
      typeof message === "string" ? message : JSON.stringify(message),
      { status: res.status, data }
    );
    if (!isTelemetryPath && res.status >= 400) {
      reportError({
        kind: "api",
        message: err.message,
        code: String(res.status),
        component: "apiRequest",
        path: typeof path === "string" ? path.split("?")[0] : "",
        extra: { status: res.status },
      });
    }
    throw err;
  }

  return data;
}
