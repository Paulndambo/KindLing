/**
 * Topic conversation API — durable resume + Learning Journal on the backend.
 */
import { apiRequest } from "./client";

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** GET full shelf for subject×topic */
export async function fetchConversationShelf(subject, topic, studentId) {
  return apiRequest(
    `/api/learning/conversations/shelf/${qs({
      subject,
      topic,
      studentId,
    })}`,
    { method: "GET" }
  );
}

/** PUT full shelf sync */
export async function putConversationShelf(shelf) {
  return apiRequest("/api/learning/conversations/shelf/", {
    method: "PUT",
    json: {
      subject: shelf.subject,
      topic: shelf.topic,
      studentId: shelf.studentId,
      activeConversationId: shelf.activeConversationId,
      conversations: shelf.conversations || [],
    },
  });
}

/**
 * Ensure active conversation exists.
 * @returns {{ created: boolean, conversation: object, shelf: object }}
 */
export async function ensureConversation(subject, topic, studentId, conversation) {
  return apiRequest("/api/learning/conversations/ensure/", {
    method: "POST",
    json: {
      subject,
      topic,
      studentId,
      conversation: conversation || undefined,
    },
  });
}

export async function fetchConversation(clientId) {
  return apiRequest(`/api/learning/conversations/${encodeURIComponent(clientId)}/`, {
    method: "GET",
  });
}

/** Upsert full conversation document */
export async function putConversation(clientId, conversation, studentId) {
  return apiRequest(`/api/learning/conversations/${encodeURIComponent(clientId)}/`, {
    method: "PUT",
    json: { ...conversation, studentId },
  });
}

export async function appendConversationMessage(clientId, message, apiPair) {
  return apiRequest(
    `/api/learning/conversations/${encodeURIComponent(clientId)}/messages/`,
    {
      method: "POST",
      json: {
        id: message.id,
        role: message.role,
        text: message.text || "",
        kind: message.kind || "",
        at: message.at,
        apiPair: apiPair || undefined,
      },
    }
  );
}

export async function archiveConversationRemote(clientId, summaryPayload = {}) {
  return apiRequest(
    `/api/learning/conversations/${encodeURIComponent(clientId)}/archive/`,
    {
      method: "POST",
      json: {
        title: summaryPayload.title || "",
        summary: summaryPayload.summary || "",
        highlights: summaryPayload.highlights || [],
        nextStep: summaryPayload.nextStep || "",
        endedAt: summaryPayload.endedAt || new Date().toISOString(),
      },
    }
  );
}

/** Active threads ready to continue (cross-subject). */
export async function fetchContinueList(limit = 20) {
  return apiRequest(
    `/api/learning/conversations/continue/${qs({ limit })}`,
    { method: "GET" }
  );
}

/** Keyword search over transcripts. */
export async function searchTranscripts({ q, subject, topic } = {}) {
  return apiRequest(
    `/api/learning/conversations/search/${qs({ q, subject, topic })}`,
    { method: "GET" }
  );
}

/** Persist intervention/tools/personalization for safe resume. */
export async function putResumeSnapshot(clientId, snapshot) {
  return apiRequest(
    `/api/learning/conversations/${encodeURIComponent(clientId)}/resume/`,
    {
      method: "PUT",
      json: {
        intervention: snapshot?.intervention,
        tools: snapshot?.tools,
        personalization: snapshot?.personalization,
        sessionId: snapshot?.sessionId || "",
        subject: snapshot?.subject || "",
        topic: snapshot?.topic || "",
      },
    }
  );
}
