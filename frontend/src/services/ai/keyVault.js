/**
 * Client-side API key vault.
 *
 * Keys never leave the browser for Kindling's backend. Stored in localStorage
 * with light obfuscation (not a substitute for OS secret storage — protects
 * casual shoulder-surfing of raw JSON dumps).
 */

import { emitAiConfigChanged } from "./events";
import { PROVIDERS } from "./registry";

const STORAGE_KEY = "kindling_ai_key_vault_v1";
const OBFUSCATION_PREFIX = "k1:";

function bytesToB64(bytes) {
  let s = "";
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

function b64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

/** XOR + base64 — deters casual inspection, not determined attackers. */
function seal(plain) {
  if (!plain) return "";
  const key = 0x5a;
  const bytes = new TextEncoder().encode(String(plain));
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    out[i] = bytes[i] ^ key ^ (i & 0xff);
  }
  return OBFUSCATION_PREFIX + bytesToB64(out);
}

function unseal(sealed) {
  if (!sealed) return "";
  if (!String(sealed).startsWith(OBFUSCATION_PREFIX)) {
    // Legacy plain storage
    return String(sealed);
  }
  try {
    const raw = b64ToBytes(String(sealed).slice(OBFUSCATION_PREFIX.length));
    const key = 0x5a;
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      out[i] = raw[i] ^ key ^ (i & 0xff);
    }
    return new TextDecoder().decode(out);
  } catch {
    return "";
  }
}

/**
 * Stable non-secret fingerprint for UI + server sync.
 * @param {string} apiKey
 */
export async function fingerprintKey(apiKey) {
  const text = String(apiKey || "").trim();
  if (!text) return "";
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex.slice(0, 12);
  } catch {
    // Fallback if subtle crypto unavailable
    let h = 0;
    for (let i = 0; i < text.length; i += 1) {
      h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    }
    return `x${(h >>> 0).toString(16).padStart(8, "0")}`;
  }
}

export function maskKey(apiKey) {
  const k = String(apiKey || "");
  if (k.length <= 8) return k ? "••••••••" : "";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

function emptyVault() {
  return { version: 1, entries: {} };
}

export function loadVault() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyVault();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyVault();
    return {
      version: 1,
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
    };
  } catch {
    return emptyVault();
  }
}

function persistVault(vault) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
  emitAiConfigChanged({ kind: "keys" });
}

/**
 * @returns {{ providerId: string, apiKey: string, baseUrl?: string, label?: string, fingerprint?: string, updatedAt?: string } | null}
 */
export function getKeyEntry(providerId) {
  const vault = loadVault();
  const entry = vault.entries[providerId];
  if (!entry?.sealedKey) return null;
  const apiKey = unseal(entry.sealedKey);
  if (!apiKey) return null;
  return {
    providerId,
    apiKey,
    baseUrl: entry.baseUrl || undefined,
    label: entry.label || "",
    fingerprint: entry.fingerprint || "",
    updatedAt: entry.updatedAt || "",
  };
}

export function hasKey(providerId) {
  return Boolean(getKeyEntry(providerId)?.apiKey);
}

export function listKeyStatuses() {
  const vault = loadVault();
  return PROVIDERS.map((p) => {
    const entry = vault.entries[p.id];
    const apiKey = entry?.sealedKey ? unseal(entry.sealedKey) : "";
    return {
      providerId: p.id,
      name: p.name,
      hasKey: Boolean(apiKey),
      mask: apiKey ? maskKey(apiKey) : "",
      label: entry?.label || "",
      baseUrl: entry?.baseUrl || p.defaultBaseUrl || "",
      fingerprint: entry?.fingerprint || "",
      updatedAt: entry?.updatedAt || "",
    };
  });
}

/**
 * @param {string} providerId
 * @param {{ apiKey: string, baseUrl?: string, label?: string }} payload
 */
export async function setKey(providerId, { apiKey, baseUrl, label } = {}) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) {
    removeKey(providerId);
    return null;
  }
  const vault = loadVault();
  const fingerprint = await fingerprintKey(trimmed);
  vault.entries[providerId] = {
    sealedKey: seal(trimmed),
    baseUrl: baseUrl ? String(baseUrl).trim() : "",
    label: label ? String(label).trim().slice(0, 80) : "",
    fingerprint,
    updatedAt: new Date().toISOString(),
  };
  persistVault(vault);
  return getKeyEntry(providerId);
}

export function removeKey(providerId) {
  const vault = loadVault();
  if (vault.entries[providerId]) {
    delete vault.entries[providerId];
    persistVault(vault);
  }
}

export function clearAllKeys() {
  persistVault(emptyVault());
}

/** Map safe for backend sync (no secrets). */
export function buildFingerprintMap() {
  const statuses = listKeyStatuses();
  const map = {};
  for (const s of statuses) {
    if (!s.hasKey) continue;
    map[s.providerId] = {
      fingerprint: s.fingerprint,
      label: s.label,
      updatedAt: s.updatedAt,
      hasKey: true,
    };
  }
  return map;
}

export function getPlatformGeminiKey() {
  return String(import.meta.env.VITE_GEMINI_API_KEY || "").trim();
}

export function hasPlatformGemini() {
  return Boolean(getPlatformGeminiKey());
}
