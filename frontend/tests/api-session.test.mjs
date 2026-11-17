import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let vite, api, config;
const savedGlobals = Object.fromEntries(["window", "localStorage", "fetch"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
before(async () => {
  const values = new Map();
  globalThis.window = new EventTarget();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  } });
  vite = await createServer({ configFile: false, envFile: false, logLevel: "silent",
    server: { middlewareMode: true, watch: null },
    define: { "import.meta.env.VITE_API_URL": JSON.stringify("https://kindling-test.invalid"),
      "import.meta.env.VITE_TELEMETRY": JSON.stringify("false"), "import.meta.env.DEV": "false" },
  });
  api = await vite.ssrLoadModule("/src/services/api/client.js");
  config = await vite.ssrLoadModule("/src/services/api/config.js");
});
after(async () => {
  await vite?.close();
  for (const [name, descriptor] of Object.entries(savedGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
});
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

test("real API client retries concurrent protected requests with one refreshed access token", async () => {
  config.setStoredTokens({ access: "expired", refresh: "valid-refresh" });
  let refreshes = 0, retried = 0, changed = 0;
  const unsubscribe = config.subscribeAuthTokens(() => { changed++; });
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/api/auth/refresh/")) {
      refreshes++;
      assert.deepEqual(JSON.parse(options.body), { refresh: "valid-refresh" });
      assert.equal(options.headers.Authorization, undefined);
      return json({ access: "renewed" });
    }
    if (options.headers.Authorization === "Bearer expired") return json({ detail: "Token expired" }, 401);
    assert.equal(options.headers.Authorization, "Bearer renewed");
    retried++;
    return json({ ok: true });
  };
  const responses = await Promise.all(["me", "profile", "subjects"].map((path) => api.apiRequest(`/api/${path}/`)));
  assert.equal(responses.every((response) => response.ok), true);
  assert.equal(refreshes, 1);
  assert.equal(retried, 3);
  assert.equal(changed, 1);
  unsubscribe();
});

test("an invalid refresh clears tokens and notifies the auth UI", async () => {
  config.setStoredTokens({ access: "expired", refresh: "invalid-refresh" });
  let expired = 0;
  const listener = () => { expired++; };
  window.addEventListener(config.SESSION_EXPIRED_EVENT, listener);
  globalThis.fetch = async () => json({ detail: "Token expired" }, 401);
  await assert.rejects(api.apiRequest("/api/auth/me/"), { status: 401 });
  assert.equal(config.getStoredTokens(), null);
  assert.equal(expired, 1);
  window.removeEventListener(config.SESSION_EXPIRED_EVENT, listener);
});

test("network failure while refreshing retains the saved session", async () => {
  const tokens = { access: "expired", refresh: "valid-refresh" };
  config.setStoredTokens(tokens);
  globalThis.fetch = async (url) => {
    if (url.endsWith("/api/auth/refresh/")) throw new TypeError("Offline");
    return json({ detail: "Expired" }, 401);
  };
  await assert.rejects(api.apiRequest("/api/auth/me/"), /Offline/);
  assert.deepEqual(config.getStoredTokens(), tokens);
});

test("bad login credentials do not refresh or sign out an existing session", async () => {
  const tokens = { access: "current", refresh: "current-refresh" };
  config.setStoredTokens(tokens);
  const paths = [];
  globalThis.fetch = async (url) => { paths.push(url); return json({ detail: "Bad login" }, 401); };
  await assert.rejects(api.apiRequest("/api/auth/login/", { auth: false, method: "POST", json: { email: "test@example.com", password: "fake" } }), { status: 401 });
  assert.equal(paths.length, 1);
  assert.deepEqual(config.getStoredTokens(), tokens);
});

test("a second 401 after refresh expires the session without a retry loop", async () => {
  config.setStoredTokens({ access: "expired", refresh: "valid-refresh" });
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    return url.endsWith("/api/auth/refresh/") ? json({ access: "also-rejected" }) : json({ detail: "Rejected" }, 401);
  };
  await assert.rejects(api.apiRequest("/api/auth/me/"), { status: 401 });
  assert.equal(calls, 3);
  assert.equal(config.getStoredTokens(), null);
});
