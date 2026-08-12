import { API_BASE_URL, getAccessToken, setStoredTokens } from "./config";

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

  const res = await fetch(buildUrl(path), {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

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
    throw new ApiError(
      typeof message === "string" ? message : JSON.stringify(message),
      { status: res.status, data }
    );
  }

  return data;
}
