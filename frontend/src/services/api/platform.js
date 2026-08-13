import { apiRequest } from "./client";

export function fetchPlanCatalog() {
  return apiRequest("/api/platform/plans/", { auth: false });
}

export function fetchSubscription() {
  return apiRequest("/api/platform/subscription/");
}

/**
 * Activate / change plan (pilot checkout — no Stripe yet).
 * @param {{ plan: string, billing_cycle?: 'monthly'|'yearly' }} body
 */
export function selectSubscriptionPlan(body) {
  return apiRequest("/api/platform/subscription/", {
    method: "POST",
    json: body,
  });
}

/**
 * @param {{ cancel_at_period_end?: boolean }} body
 */
export function patchSubscription(body) {
  return apiRequest("/api/platform/subscription/", {
    method: "PATCH",
    json: body,
  });
}

export function fetchAiRouting() {
  return apiRequest("/api/platform/ai-routing/");
}

/**
 * @param {object} body snake_case fields from toApiPreferences
 */
export function patchAiRouting(body) {
  return apiRequest("/api/platform/ai-routing/", {
    method: "PATCH",
    json: body,
  });
}
