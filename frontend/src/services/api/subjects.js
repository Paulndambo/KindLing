import { apiRequest } from "./client";

/**
 * Normalize a subject from the API into the shape the SPA uses.
 * Topics stay as { id, name, familiarity, learningGoal } objects.
 */
export function normalizeTopic(raw, fallbackName = "") {
  if (!raw && !fallbackName) return null;
  if (typeof raw === "string") {
    return {
      id: null,
      name: raw,
      sortOrder: 0,
      familiarity: "new",
      learningGoal: "",
    };
  }
  return {
    id: raw?.id ?? null,
    name: raw?.name || fallbackName || "",
    sortOrder: raw?.sort_order ?? raw?.sortOrder ?? 0,
    familiarity: raw?.familiarity || "new",
    learningGoal: raw?.learning_goal ?? raw?.learningGoal ?? "",
  };
}

export function normalizeSubject(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name || "",
    icon: raw.icon || "book",
    color: raw.color || "#E8F4F8",
    sortOrder: raw.sort_order ?? 0,
    learningGoal: raw.learning_goal ?? raw.learningGoal ?? "",
    topics: Array.isArray(raw.topics)
      ? raw.topics.map((t) => normalizeTopic(t)).filter(Boolean)
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
 * @param {{
 *   name: string,
 *   icon?: string,
 *   color?: string,
 *   learningGoal?: string,
 *   topics?: string[] | { name: string, familiarity?: string, learningGoal?: string }[]
 * }} payload
 */
export async function createSubject(payload) {
  const topics = (payload.topics || [])
    .map((t) => {
      if (typeof t === "string") {
        const name = t.trim();
        return name
          ? { name, familiarity: "new", learning_goal: "" }
          : null;
      }
      const name = String(t?.name || "").trim();
      if (!name) return null;
      return {
        name,
        familiarity: t.familiarity || "new",
        learning_goal: String(t.learningGoal ?? t.learning_goal ?? "").trim(),
      };
    })
    .filter(Boolean);

  const data = await apiRequest("/api/subjects/", {
    method: "POST",
    auth: true,
    json: {
      name: payload.name,
      icon: payload.icon || "book",
      color: payload.color || "#E8F4F8",
      sort_order: payload.sortOrder ?? payload.sort_order ?? 0,
      learning_goal: String(
        payload.learningGoal ?? payload.learning_goal ?? ""
      ).trim(),
      topics,
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

/**
 * @param {string|number} subjectId
 * @param {string | { name: string, familiarity?: string, learningGoal?: string, sortOrder?: number }} topicOrName
 * @param {number} [sortOrder]
 */
export async function createTopic(subjectId, topicOrName, sortOrder = 0) {
  const payload =
    typeof topicOrName === "string"
      ? {
          name: topicOrName.trim(),
          sort_order: sortOrder,
          familiarity: "new",
          learning_goal: "",
        }
      : {
          name: String(topicOrName?.name || "").trim(),
          sort_order: topicOrName?.sortOrder ?? topicOrName?.sort_order ?? sortOrder,
          familiarity: topicOrName?.familiarity || "new",
          learning_goal: String(
            topicOrName?.learningGoal ?? topicOrName?.learning_goal ?? ""
          ).trim(),
        };

  const data = await apiRequest(`/api/subjects/${subjectId}/topics/`, {
    method: "POST",
    auth: true,
    json: payload,
  });
  return normalizeTopic(data, payload.name);
}

export async function deleteTopic(topicId) {
  await apiRequest(`/api/subjects/topics/${topicId}/`, {
    method: "DELETE",
    auth: true,
  });
}
