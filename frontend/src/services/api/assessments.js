import { apiRequest } from "./client";

export function listAssessments() {
  return apiRequest("/api/learning/assessments/", { method: "GET", auth: true });
}

export function createAssessment(assessment) {
  return apiRequest("/api/learning/assessments/", { method: "POST", auth: true, json: assessment });
}

export function updateAssessment(id, updates) {
  return apiRequest(`/api/learning/assessments/${encodeURIComponent(id)}/`, { method: "PATCH", auth: true, json: updates });
}
