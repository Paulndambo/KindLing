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

/**
 * Epic B6 — multi-step show-your-work problems.
 */
export async function getMultiStepProblems(opts = {}) {
  const params = new URLSearchParams();
  if (opts.subject) params.set("subject", opts.subject);
  if (opts.topic) params.set("topic", opts.topic);
  if (opts.skill) params.set("skill", opts.skill);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiRequest(`/api/learning/multistep/${qs ? `?${qs}` : ""}`, {
    method: "GET",
    auth: false,
  });
}

/**
 * Epic B5 — misconception catalog.
 * @param {{ topic?: string, skill?: string, domain?: string, limit?: number }} opts
 */
export async function getMisconceptionCatalog(opts = {}) {
  const params = new URLSearchParams();
  if (opts.topic) params.set("topic", opts.topic);
  if (opts.skill) params.set("skill", opts.skill);
  if (opts.domain) params.set("domain", opts.domain);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiRequest(`/api/learning/misconceptions/${qs ? `?${qs}` : ""}`, {
    method: "GET",
    auth: false,
  });
}

/**
 * Epic B5 — server-side detect.
 */
export async function detectMisconceptionsApi({
  studentText,
  tutorText = "",
  topic = "",
  subject = "",
  skill = "",
} = {}) {
  return apiRequest("/api/learning/misconceptions/", {
    method: "POST",
    auth: false,
    json: { studentText, tutorText, topic, subject, skill },
  });
}

/**
 * Epic B4 — curated worked-example library.
 * @param {{ subject?: string, topic?: string, skill?: string, grade?: string, kind?: string, limit?: number }} opts
 */
export async function getWorkedExamples(opts = {}) {
  const params = new URLSearchParams();
  if (opts.subject) params.set("subject", opts.subject);
  if (opts.topic) params.set("topic", opts.topic);
  if (opts.skill) params.set("skill", opts.skill);
  if (opts.grade) params.set("grade", String(opts.grade));
  if (opts.kind) params.set("kind", opts.kind);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiRequest(`/api/learning/worked-examples/${qs ? `?${qs}` : ""}`, {
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
