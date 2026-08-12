import { apiRequest } from "./client";

/**
 * Normalize a subject from the API into the shape the SPA uses.
 * Topics stay as { id, name } objects.
 */
export function normalizeSubject(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name || "",
    icon: raw.icon || "book",
    color: raw.color || "#E8F4F8",
    sortOrder: raw.sort_order ?? 0,
    topics: Array.isArray(raw.topics)
      ? raw.topics.map((t) => ({
          id: t.id,
          name: t.name || "",
          sortOrder: t.sort_order ?? 0,
        }))
      : [],
  };
}

/** List subjects for the authenticated student (backend-scoped). */
export async function listSubjects() {
  const data = await apiRequest("/api/subjects/", { method: "GET", auth: true });
  const rows = Array.isArray(data) ? data : data?.results || [];
  return rows.map(normalizeSubject).filter(Boolean);
}

/**
 * Create a subject owned by the current student.
 * @param {{ name: string, icon?: string, color?: string, topics?: string[] | {name:string}[] }} payload
 */
export async function createSubject(payload) {
  const topicNames = (payload.topics || [])
    .map((t) => (typeof t === "string" ? t : t?.name))
    .filter((n) => typeof n === "string" && n.trim())
    .map((n) => n.trim());

  const data = await apiRequest("/api/subjects/", {
    method: "POST",
    auth: true,
    json: {
      name: payload.name,
      icon: payload.icon || "book",
      color: payload.color || "#E8F4F8",
      sort_order: payload.sortOrder ?? payload.sort_order ?? 0,
      topics: topicNames,
    },
  });
  return normalizeSubject(data);
}

export async function deleteSubject(subjectId) {
  await apiRequest(`/api/subjects/${subjectId}/`, {
    method: "DELETE",
    auth: true,
  });
}

export async function createTopic(subjectId, name, sortOrder = 0) {
  const data = await apiRequest(`/api/subjects/${subjectId}/topics/`, {
    method: "POST",
    auth: true,
    json: { name, sort_order: sortOrder },
  });
  return {
    id: data.id,
    name: data.name || name,
    sortOrder: data.sort_order ?? sortOrder,
  };
}

export async function deleteTopic(topicId) {
  await apiRequest(`/api/subjects/topics/${topicId}/`, {
    method: "DELETE",
    auth: true,
  });
}
