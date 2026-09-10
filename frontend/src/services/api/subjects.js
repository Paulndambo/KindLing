import { apiRequest } from "./client";

/**
 * Normalize a subtopic (lesson unit) from the API.
 */
export function normalizeSubtopic(raw, fallbackName = "") {
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

/**
 * Normalize a topic (unit) — may contain nested subtopics.
 * Backward compat: if no subtopics, treat the topic itself as the sole lesson leaf.
 */
export function normalizeTopic(raw, fallbackName = "") {
  if (!raw && !fallbackName) return null;
  if (typeof raw === "string") {
    const name = raw;
    return {
      id: null,
      name,
      sortOrder: 0,
      familiarity: "new",
      learningGoal: "",
      subtopics: [
        {
          id: null,
          name,
          sortOrder: 0,
          familiarity: "new",
          learningGoal: "",
        },
      ],
    };
  }
  const name = raw?.name || fallbackName || "";
  const subs = Array.isArray(raw?.subtopics)
    ? raw.subtopics.map((s) => normalizeSubtopic(s)).filter(Boolean)
    : [];
  // Legacy flat topic: synthesize one subtopic so lesson path always has leaves
  const subtopics =
    subs.length > 0
      ? subs
      : [
          {
            id: raw?.id ?? null,
            name,
            sortOrder: 0,
            familiarity: raw?.familiarity || "new",
            learningGoal: raw?.learning_goal ?? raw?.learningGoal ?? "",
          },
        ];
  return {
    id: raw?.id ?? null,
    name,
    sortOrder: raw?.sort_order ?? raw?.sortOrder ?? 0,
    familiarity: raw?.familiarity || "new",
    learningGoal: raw?.learning_goal ?? raw?.learningGoal ?? "",
    subtopics,
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

/** Flat list of lesson leaves (subtopics) across a subject. */
export function flattenSubjectLessons(subject) {
  if (!subject?.topics?.length) return [];
  const out = [];
  for (const unit of subject.topics) {
    for (const sub of unit.subtopics || []) {
      out.push({
        ...sub,
        unitId: unit.id,
        unitName: unit.name,
        unitLearningGoal: unit.learningGoal || "",
      });
    }
  }
  return out;
}

/** List subjects for the authenticated student (backend-scoped). */
export async function listSubjects() {
  const data = await apiRequest("/api/subjects/", { method: "GET", auth: true });
  const rows = Array.isArray(data) ? data : data?.results || [];
  return rows.map(normalizeSubject).filter(Boolean);
}

/**
 * Create a subject owned by the current student.
 */
export async function createSubject(payload) {
  const topics = (payload.topics || [])
    .map((t) => {
      if (typeof t === "string") {
        const name = t.trim();
        return name
          ? { name, familiarity: "new", learning_goal: "", subtopics: [] }
          : null;
      }
      const name = String(t?.name || "").trim();
      if (!name) return null;
      const subtopics = (t.subtopics || []).map((s) => {
        if (typeof s === "string") {
          return { name: s.trim(), familiarity: "new", learning_goal: "" };
        }
        return {
          name: String(s?.name || "").trim(),
          familiarity: s?.familiarity || "new",
          learning_goal: String(s?.learningGoal ?? s?.learning_goal ?? "").trim(),
        };
      }).filter((s) => s.name);
      return {
        name,
        familiarity: t.familiarity || "new",
        learning_goal: String(t.learningGoal ?? t.learning_goal ?? "").trim(),
        subtopics,
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
 * Create a topic (unit) under a subject.
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
          subtopics: topicOrName?.subtopics,
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

export async function createSubtopic(topicId, subOrName, sortOrder = 0) {
  const payload =
    typeof subOrName === "string"
      ? {
          name: subOrName.trim(),
          sort_order: sortOrder,
          familiarity: "new",
          learning_goal: "",
        }
      : {
          name: String(subOrName?.name || "").trim(),
          sort_order: subOrName?.sortOrder ?? subOrName?.sort_order ?? sortOrder,
          familiarity: subOrName?.familiarity || "new",
          learning_goal: String(
            subOrName?.learningGoal ?? subOrName?.learning_goal ?? ""
          ).trim(),
        };

  const data = await apiRequest(`/api/subjects/topics/${topicId}/subtopics/`, {
    method: "POST",
    auth: true,
    json: payload,
  });
  return normalizeSubtopic(data, payload.name);
}

export async function deleteSubtopic(subtopicId) {
  await apiRequest(`/api/subjects/subtopics/${subtopicId}/`, {
    method: "DELETE",
    auth: true,
  });
}
