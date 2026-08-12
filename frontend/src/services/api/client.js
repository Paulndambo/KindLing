import { API_BASE_URL, getAccessToken, setStoredTokens } from "./config";
import { reportError } from "../telemetry";

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

  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // Avoid recursive telemetry posts if the telemetry endpoint itself fails
  const isTelemetryPath =
    typeof path === "string" && path.includes("/api/telemetry/");

  let res;
  try {
    res = await fetch(buildUrl(path), {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (networkErr) {
    if (!isTelemetryPath) {
      reportError({
        kind: "api",
        message: networkErr?.message || "Network request failed",
        code: "NETWORK",
        component: "apiRequest",
        path: typeof path === "string" ? path.split("?")[0] : "",
      });
    }
    throw networkErr;
  }

  // Clear tokens on unauthorized so the UI can re-auth
  if (res.status === 401 && auth) {
    setStoredTokens(null);
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
