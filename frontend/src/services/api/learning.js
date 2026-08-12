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

/** List parent digests for the current student (Epic A5). */
export async function listDigests() {
  return apiRequest("/api/learning/digests/", {
    method: "GET",
    auth: true,
  });
}

/**
 * Generate this week's digest (and optionally deliver).
 * @param {{ deliver?: boolean, dryRun?: boolean, forcePreview?: boolean }} opts
 */
export async function generateDigest(opts = {}) {
  const {
    deliver = true,
    dryRun = true,
    forcePreview = true,
  } = opts;
  return apiRequest("/api/learning/digests/generate/", {
    method: "POST",
    auth: true,
    json: { deliver, dryRun, forcePreview },
  });
}

/** Single digest by id. */
export async function getDigest(id) {
  return apiRequest(`/api/learning/digests/${id}/`, {
    method: "GET",
    auth: true,
  });
}
