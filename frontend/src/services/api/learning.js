import { apiRequest } from "./client";

/**
 * Parent dashboard aggregates from the Kindling learning API.
 * Shape: hasData, weekStats, masteryMap, recentActivity, strengths,
 * focusAreas, confidenceHistory, weekPlan, insights, profile, totals
 */
export async function getDashboard() {
  return apiRequest("/api/learning/dashboard/", {
    method: "GET",
    auth: true,
  });
}

export async function getLearningProfile({ subject, topic } = {}) {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (topic) params.set("topic", topic);
  const qs = params.toString();
  return apiRequest(`/api/learning/profile/${qs ? `?${qs}` : ""}`, {
    method: "GET",
    auth: true,
  });
}

/** Pilot skill catalog (nodes + prereqs). */
export async function getSkillCatalog() {
  return apiRequest("/api/learning/skills/", {
    method: "GET",
    auth: false,
  });
}

/** Skills + readiness for a lesson topic. */
export async function getSkillPath({ subject, topic, studentId } = {}) {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (topic) params.set("topic", topic);
  if (studentId) params.set("studentId", studentId);
  const qs = params.toString();
  return apiRequest(`/api/learning/skills/path/${qs ? `?${qs}` : ""}`, {
    method: "GET",
    auth: true,
  });
}
