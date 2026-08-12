/**
 * Topic conversation shelves — durable chat history per student × subject × topic.
 *
 * Primary store: Kindling backend (when authenticated).
 * Local cache: localStorage (offline / demo fallback; write-through when online).
 *
 * - One "active" conversation can be resumed across visits
 * - Ended conversations keep a summary + full message log (Learning Journal)
 * - Day boundaries are derived at display time from message timestamps
 */

import { STORAGE_KEYS } from "./types";

/**
 * Lazy API access — avoids circular init issues so this module always exports
 * its full public surface (including appendMessageAsync) even if API modules fail.
 */
async function loadConversationApi() {
  const [{ getAccessToken }, api] = await Promise.all([
    import("../api/config"),
    import("../api/conversations"),
  ]);
  return { getAccessToken, ...api };
}

function backendAvailableSync() {
  try {
    // Sync peek for early decisions; may be false until tokens hydrate
    const raw = localStorage.getItem("kindling_auth_tokens");
    if (!raw) return false;
    const tokens = JSON.parse(raw);
    return Boolean(tokens?.access);
  } catch {
    return false;
  }
}

function cacheShelf(studentId, shelf) {
  if (!shelf) return shelf;
  return saveTopicShelf(studentId, {
    ...shelf,
    studentId: shelf.studentId || studentId,
  });
}

const STORE_VERSION = 1;
const MAX_CONVERSATIONS_PER_TOPIC = 40;
const MAX_MESSAGES_PER_CONVERSATION = 400;

export function topicKey(subject, topic) {
  return `${subject || "General"}::${topic || "General"}`;
}

export function newConversationId() {
  return `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newMessageId() {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function storageRootKey(studentId) {
  return `${STORAGE_KEYS.topicConversations}:${studentId || "anonymous"}`;
}

function emptyShelf(studentId, subject, topic) {
  return {
    version: STORE_VERSION,
    studentId: studentId || "anonymous",
    subject: subject || "General",
    topic: topic || "General",
    activeConversationId: null,
    conversations: [],
    updatedAt: new Date().toISOString(),
  };
}

function loadAllShelves(studentId) {
  try {
    const raw = localStorage.getItem(storageRootKey(studentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAllShelves(studentId, shelves) {
  try {
    localStorage.setItem(storageRootKey(studentId), JSON.stringify(shelves));
  } catch (err) {
    console.warn("Conversation shelf save failed:", err);
  }
}

export function loadTopicShelf(studentId, subject, topic) {
  const shelves = loadAllShelves(studentId);
  const key = topicKey(subject, topic);
  const shelf = shelves[key];
  if (!shelf) return emptyShelf(studentId, subject, topic);
  return {
    ...emptyShelf(studentId, subject, topic),
    ...shelf,
    conversations: Array.isArray(shelf.conversations) ? shelf.conversations : [],
  };
}

export function saveTopicShelf(studentId, shelf) {
  const shelves = loadAllShelves(studentId);
  const key = topicKey(shelf.subject, shelf.topic);
  shelves[key] = {
    ...shelf,
    version: STORE_VERSION,
    updatedAt: new Date().toISOString(),
  };
  saveAllShelves(studentId, shelves);
  return shelves[key];
}

export function createConversation({ subject, topic }) {
  const now = new Date().toISOString();
  return {
    id: newConversationId(),
    status: "active", // active | archived
    subject: subject || "General",
    topic: topic || "General",
    createdAt: now,
    updatedAt: now,
    endedAt: null,
    title: null,
    summary: null,
    highlights: [],
    nextStep: null,
    messageCount: 0,
    messages: [],
    /** Gemini API history { role: 'user'|'model', text } */
    apiHistory: [],
  };
}

export function getActiveConversation(shelf) {
  if (!shelf?.activeConversationId) return null;
  return (
    shelf.conversations.find(
      (c) => c.id === shelf.activeConversationId && c.status === "active"
    ) || null
  );
}

export function listArchivedConversations(shelf) {
  return (shelf?.conversations || [])
    .filter((c) => c.status === "archived")
    .sort((a, b) => (b.endedAt || b.updatedAt || "").localeCompare(a.endedAt || a.updatedAt || ""));
}

/**
 * Append a UI message (+ optional API history pair) and persist.
 */
export function appendMessage(studentId, subject, topic, conversationId, message, apiPair = null) {
  const shelf = loadTopicShelf(studentId, subject, topic);
  const idx = shelf.conversations.findIndex((c) => c.id === conversationId);
  if (idx < 0) return null;

  const conv = { ...shelf.conversations[idx] };
  const msg = {
    id: message.id || newMessageId(),
    role: message.role,
    text: message.text || "",
    at: message.at || new Date().toISOString(),
    kind: message.kind || null,
  };

  conv.messages = [...(conv.messages || []), msg].slice(-MAX_MESSAGES_PER_CONVERSATION);
  conv.messageCount = conv.messages.filter((m) => m.role === "tutor" || m.role === "child").length;
  conv.updatedAt = msg.at;

  if (apiPair?.user != null || apiPair?.model != null) {
    const nextApi = [...(conv.apiHistory || [])];
    if (apiPair.user != null) nextApi.push({ role: "user", text: String(apiPair.user) });
    if (apiPair.model != null) nextApi.push({ role: "model", text: String(apiPair.model) });
    conv.apiHistory = nextApi.slice(-80); // last 40 exchanges
  }

  shelf.conversations = [...shelf.conversations];
  shelf.conversations[idx] = conv;
  if (conv.status === "active") shelf.activeConversationId = conv.id;
  saveTopicShelf(studentId, shelf);
  return conv;
}

/**
 * Replace messages snapshot (e.g. after bulk load) — rarely used.
 */
export function replaceConversation(studentId, subject, topic, conversation) {
  const shelf = loadTopicShelf(studentId, subject, topic);
  const idx = shelf.conversations.findIndex((c) => c.id === conversation.id);
  const conv = {
    ...conversation,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    shelf.conversations = [...shelf.conversations];
    shelf.conversations[idx] = conv;
  } else {
    shelf.conversations = [conv, ...shelf.conversations].slice(0, MAX_CONVERSATIONS_PER_TOPIC);
  }
  if (conv.status === "active") {
    shelf.activeConversationId = conv.id;
  }
  saveTopicShelf(studentId, shelf);
  return conv;
}

/**
 * Ensure an active conversation exists; create if needed.
 */
export function ensureActiveConversation(studentId, subject, topic) {
  const shelf = loadTopicShelf(studentId, subject, topic);
  let active = getActiveConversation(shelf);
  if (active) {
    return { shelf, conversation: active, created: false };
  }
  const conversation = createConversation({ subject, topic });
  shelf.conversations = [conversation, ...shelf.conversations].slice(
    0,
    MAX_CONVERSATIONS_PER_TOPIC
  );
  shelf.activeConversationId = conversation.id;
  saveTopicShelf(studentId, shelf);
  return { shelf, conversation, created: true };
}

/**
 * Archive conversation with optional summary payload.
 */
export function archiveConversation(
  studentId,
  subject,
  topic,
  conversationId,
  { title, summary, highlights, nextStep } = {}
) {
  const shelf = loadTopicShelf(studentId, subject, topic);
  const idx = shelf.conversations.findIndex((c) => c.id === conversationId);
  if (idx < 0) return { shelf, conversation: null };

  const now = new Date().toISOString();
  const conv = {
    ...shelf.conversations[idx],
    status: "archived",
    endedAt: now,
    updatedAt: now,
    title: title || shelf.conversations[idx].title || defaultTitle(topic, now),
    summary: summary || shelf.conversations[idx].summary || null,
    highlights: highlights || shelf.conversations[idx].highlights || [],
    nextStep: nextStep || shelf.conversations[idx].nextStep || null,
  };

  shelf.conversations = [...shelf.conversations];
  shelf.conversations[idx] = conv;
  if (shelf.activeConversationId === conversationId) {
    shelf.activeConversationId = null;
  }
  saveTopicShelf(studentId, shelf);
  return { shelf, conversation: conv };
}

function defaultTitle(topic, iso) {
  const d = new Date(iso);
  try {
    return `${topic} · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  } catch {
    return `${topic} session`;
  }
}

/**
 * Format a friendly day boundary label.
 * e.g. "Interaction for 31 July starts here"
 */
export function formatDayBoundaryLabel(iso, now = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Earlier interaction";

  const startOf = (date) => {
    const x = new Date(date);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };

  const day = startOf(d);
  const today = startOf(now);
  const yesterday = today - 86400000;

  let datePart;
  if (day === today) {
    datePart = "today";
  } else if (day === yesterday) {
    datePart = "yesterday";
  } else {
    datePart = d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  if (datePart === "today") {
    return "Interaction for today starts here";
  }
  if (datePart === "yesterday") {
    return "Interaction for yesterday starts here";
  }
  return `Interaction for ${datePart} starts here`;
}

export function dayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Insert day_boundary markers for the chat UI (does not mutate storage).
 */
export function withDayBoundaries(messages = []) {
  const out = [];
  let lastKey = null;
  for (const msg of messages) {
    if (!msg || msg.role === "day_boundary") continue;
    const key = dayKey(msg.at || msg.createdAt);
    if (key !== lastKey) {
      out.push({
        id: `day_${key}_${out.length}`,
        role: "day_boundary",
        text: formatDayBoundaryLabel(msg.at || msg.createdAt),
        at: msg.at || msg.createdAt,
      });
      lastKey = key;
    }
    out.push(msg);
  }
  return out;
}

/**
 * Build a short local summary if the model is unavailable.
 */
export function buildFallbackSummary({ topic, messages = [] }) {
  const studentTurns = messages.filter((m) => m.role === "child");
  const tutorTurns = messages.filter((m) => m.role === "tutor");
  const n = studentTurns.length + tutorTurns.length;
  const preview = studentTurns
    .slice(-2)
    .map((m) => m.text)
    .filter(Boolean)
    .join(" · ");

  return {
    title: defaultTitle(topic, new Date().toISOString()),
    summary:
      n === 0
        ? `You opened ${topic} but didn't exchange messages yet.`
        : `You worked on ${topic} with Kindling (${studentTurns.length} of your replies, ${tutorTurns.length} tutor replies).${
            preview ? ` You explored ideas like: “${preview.slice(0, 140)}${preview.length > 140 ? "…" : ""}”.` : ""
          }`,
    highlights: [
      studentTurns.length > 0 ? "You practiced explaining your thinking" : "Session started",
      tutorTurns.length > 0 ? "Kindling guided with questions and support" : "Ready for next time",
    ].filter(Boolean),
    nextStep: `Continue ${topic} with one small practice question when you return.`,
  };
}

/**
 * Plain transcript for summarization prompts.
 */
export function buildTranscript(messages = [], maxChars = 12000) {
  const lines = [];
  for (const m of messages) {
    if (m.role === "tutor") lines.push(`Kindling: ${m.text}`);
    else if (m.role === "child") lines.push(`Student: ${m.text}`);
  }
  let text = lines.join("\n");
  if (text.length > maxChars) {
    text = `…\n${text.slice(-maxChars)}`;
  }
  return text;
}

/* ── Async / backend-first API ─────────────────────────────────────── */

/**
 * Load topic shelf from backend when authed; cache locally. Falls back to localStorage.
 */
export async function loadTopicShelfAsync(studentId, subject, topic) {
  if (backendAvailableSync()) {
    try {
      const { fetchConversationShelf } = await loadConversationApi();
      const shelf = await fetchConversationShelf(subject, topic, studentId);
      return cacheShelf(studentId, {
        ...emptyShelf(studentId, subject, topic),
        ...shelf,
        conversations: Array.isArray(shelf.conversations)
          ? shelf.conversations
          : [],
      });
    } catch (err) {
      console.warn(
        "Conversation shelf: backend load failed, using local cache",
        err
      );
    }
  }
  return loadTopicShelf(studentId, subject, topic);
}

/**
 * Ensure active conversation — backend when available.
 */
export async function ensureActiveConversationAsync(studentId, subject, topic) {
  if (backendAvailableSync()) {
    try {
      const { ensureConversation } = await loadConversationApi();
      const result = await ensureConversation(subject, topic, studentId);
      if (result?.shelf) {
        cacheShelf(studentId, {
          ...emptyShelf(studentId, subject, topic),
          ...result.shelf,
          conversations: result.shelf.conversations || [],
        });
      }
      const conversation = result?.conversation;
      if (conversation) {
        replaceConversation(studentId, subject, topic, {
          ...conversation,
          status: conversation.status || "active",
        });
        const shelf = loadTopicShelf(studentId, subject, topic);
        shelf.activeConversationId = conversation.id;
        saveTopicShelf(studentId, shelf);
        return {
          shelf: loadTopicShelf(studentId, subject, topic),
          conversation,
          created: Boolean(result.created),
        };
      }
    } catch (err) {
      console.warn(
        "Conversation ensure: backend failed, using local store",
        err
      );
    }
  }
  return ensureActiveConversation(studentId, subject, topic);
}

/**
 * Append message: write local cache immediately, then persist to backend.
 */
export async function appendMessageAsync(
  studentId,
  subject,
  topic,
  conversationId,
  message,
  apiPair = null
) {
  const conv = appendMessage(
    studentId,
    subject,
    topic,
    conversationId,
    message,
    apiPair
  );

  if (backendAvailableSync() && conversationId) {
    try {
      const { putConversation, appendConversationMessage } =
        await loadConversationApi();
      const shelf = loadTopicShelf(studentId, subject, topic);
      const local = shelf.conversations.find((c) => c.id === conversationId);
      if (local) {
        await putConversation(
          conversationId,
          {
            id: local.id,
            subject,
            topic,
            status: local.status || "active",
            createdAt: local.createdAt,
            title: local.title || "",
            summary: local.summary || "",
            highlights: local.highlights || [],
            nextStep: local.nextStep || "",
            apiHistory: local.apiHistory || [],
            messageCount: local.messageCount || 0,
          },
          studentId
        ).catch(() => null);
      }
      await appendConversationMessage(
        conversationId,
        {
          id: message.id || conv?.messages?.[conv.messages.length - 1]?.id,
          role: message.role,
          text: message.text || "",
          kind: message.kind || "",
          at: message.at,
        },
        apiPair
      );
    } catch (err) {
      console.warn(
        "Conversation message: backend append failed (cached locally)",
        err
      );
    }
  }
  return conv;
}

/**
 * Save resume snapshot (intervention / tools / personalization) for a conversation.
 */
export async function saveResumeSnapshotAsync(
  studentId,
  subject,
  topic,
  conversationId,
  snapshot
) {
  if (!conversationId) return null;

  // Local shelf: attach resumeSnapshot on the conversation
  try {
    const shelf = loadTopicShelf(studentId, subject, topic);
    const idx = (shelf.conversations || []).findIndex((c) => c.id === conversationId);
    if (idx >= 0) {
      const conv = {
        ...shelf.conversations[idx],
        resumeSnapshot: {
          ...(shelf.conversations[idx].resumeSnapshot || {}),
          ...snapshot,
          savedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
      const conversations = [...shelf.conversations];
      conversations[idx] = conv;
      saveTopicShelf(studentId, { ...shelf, conversations });
    }
  } catch {
    /* ignore local failures */
  }

  if (backendAvailableSync()) {
    try {
      const { putResumeSnapshot } = await loadConversationApi();
      await putResumeSnapshot(conversationId, {
        ...snapshot,
        subject,
        topic,
      });
    } catch (err) {
      console.warn("Resume snapshot save failed (cached locally)", err);
    }
  }
  return snapshot;
}

/**
 * List continuable conversations from local shelves (offline / demo fallback).
 */
export function listLocalContinuable(studentId, { limit = 20 } = {}) {
  try {
    const rootKey = `${STORAGE_KEYS.topicConversations}:${studentId || "anonymous"}`;
    const raw = localStorage.getItem(rootKey);
    if (!raw) return [];
    const shelves = JSON.parse(raw) || {};
    const items = [];
    for (const shelf of Object.values(shelves)) {
      for (const conv of shelf.conversations || []) {
        if (conv.status !== "active") continue;
        const msgs = (conv.messages || []).filter(
          (m) => m.role === "tutor" || m.role === "child"
        );
        if (!msgs.length && !(conv.apiHistory || []).length) continue;
        const last = msgs[msgs.length - 1];
        items.push({
          id: conv.id,
          status: "active",
          subject: conv.subject || shelf.subject,
          topic: conv.topic || shelf.topic,
          messageCount: msgs.length || conv.messageCount || 0,
          updatedAt: conv.updatedAt || shelf.updatedAt,
          previewText: (last?.text || "").slice(0, 180),
          resumeSnapshot: conv.resumeSnapshot || {},
          canContinue: true,
        });
      }
    }
    items.sort(
      (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    );
    return items.slice(0, limit);
  } catch {
    return [];
  }
}

export async function listContinuableAsync(studentId, { limit = 20 } = {}) {
  if (backendAvailableSync()) {
    try {
      const { fetchContinueList } = await loadConversationApi();
      const data = await fetchContinueList(limit);
      if (Array.isArray(data?.items)) return data.items;
    } catch (err) {
      console.warn("Continue list API failed, using local shelves", err);
    }
  }
  return listLocalContinuable(studentId, { limit });
}

export async function searchTranscriptsAsync(
  studentId,
  { q, subject, topic } = {}
) {
  if (backendAvailableSync()) {
    try {
      const { searchTranscripts } = await loadConversationApi();
      return await searchTranscripts({ q, subject, topic });
    } catch (err) {
      console.warn("Transcript search API failed, local fallback", err);
    }
  }
  // Local fallback: scan shelves
  const qLower = String(q || "")
    .trim()
    .toLowerCase();
  if (qLower.length < 2) return { results: [], query: q, count: 0 };
  const results = [];
  try {
    const rootKey = `${STORAGE_KEYS.topicConversations}:${studentId || "anonymous"}`;
    const raw = localStorage.getItem(rootKey);
    const shelves = raw ? JSON.parse(raw) : {};
    for (const shelf of Object.values(shelves || {})) {
      if (subject && shelf.subject !== subject) continue;
      if (topic && shelf.topic !== topic) continue;
      for (const conv of shelf.conversations || []) {
        for (const m of conv.messages || []) {
          if (m.role === "system") continue;
          if (!(m.text || "").toLowerCase().includes(qLower)) continue;
          const text = m.text || "";
          const idx = text.toLowerCase().indexOf(qLower);
          let snippet = text;
          if (idx >= 0) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(text.length, idx + qLower.length + 80);
            snippet =
              (start > 0 ? "…" : "") +
              text.slice(start, end) +
              (end < text.length ? "…" : "");
          }
          results.push({
            messageId: m.id,
            role: m.role,
            snippet,
            at: m.at,
            conversationId: conv.id,
            subject: conv.subject || shelf.subject,
            topic: conv.topic || shelf.topic,
            conversationStatus: conv.status,
          });
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { results: results.slice(0, 40), query: q, count: results.length };
}

export async function archiveConversationAsync(
  studentId,
  subject,
  topic,
  conversationId,
  summaryPayload = {}
) {
  const result = archiveConversation(
    studentId,
    subject,
    topic,
    conversationId,
    summaryPayload
  );

  if (backendAvailableSync() && conversationId) {
    try {
      const { putConversation, archiveConversationRemote } =
        await loadConversationApi();
      const conv = result.conversation;
      if (conv) {
        await putConversation(
          conversationId,
          {
            id: conv.id,
            subject,
            topic,
            status: "archived",
            createdAt: conv.createdAt,
            endedAt: conv.endedAt,
            title: conv.title || "",
            summary: conv.summary || "",
            highlights: conv.highlights || [],
            nextStep: conv.nextStep || "",
            apiHistory: conv.apiHistory || [],
            messages: conv.messages || [],
            messageCount: conv.messageCount || 0,
          },
          studentId
        ).catch(() => null);
      }
      const remote = await archiveConversationRemote(conversationId, {
        ...summaryPayload,
        endedAt: result.conversation?.endedAt,
      });
      if (remote) {
        replaceConversation(studentId, subject, topic, {
          ...remote,
          status: "archived",
        });
        const shelf = loadTopicShelf(studentId, subject, topic);
        if (shelf.activeConversationId === conversationId) {
          shelf.activeConversationId = null;
          saveTopicShelf(studentId, shelf);
        }
        return {
          shelf: loadTopicShelf(studentId, subject, topic),
          conversation: remote,
        };
      }
    } catch (err) {
      console.warn(
        "Conversation archive: backend failed (cached locally)",
        err
      );
    }
  }
  return result;
}

/**
 * Persist full shelf (e.g. after starting a new conversation).
 */
export async function saveTopicShelfAsync(studentId, shelf) {
  const saved = saveTopicShelf(studentId, shelf);
  if (backendAvailableSync()) {
    try {
      const { putConversationShelf } = await loadConversationApi();
      const remote = await putConversationShelf({
        ...saved,
        studentId,
      });
      if (remote) {
        return cacheShelf(studentId, {
          ...emptyShelf(studentId, shelf.subject, shelf.topic),
          ...remote,
          conversations: remote.conversations || [],
        });
      }
    } catch (err) {
      console.warn(
        "Conversation shelf: backend save failed (cached locally)",
        err
      );
    }
  }
  return saved;
}
