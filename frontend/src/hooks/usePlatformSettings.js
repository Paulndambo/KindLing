import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAiRouting,
  fetchPlanCatalog,
  fetchSubscription,
  patchAiRouting,
  patchSubscription,
  selectSubscriptionPlan,
} from "../services/api";
import {
  AI_CONFIG_CHANGED,
  buildFingerprintMap,
  fromApiPreferences,
  getRuntimeSnapshot,
  listKeyStatuses,
  loadLocalPreferences,
  removeKey,
  saveLocalPreferences,
  setKey,
  testActiveConnection,
  toApiPreferences,
} from "../services/ai";
import { getPlan, PLAN_CATALOG, PLAN_IDS } from "../constants/subscription";

const LOCAL_SUB_KEY = "kindling_subscription_local_v1";

function loadLocalSubscription() {
  try {
    const raw = localStorage.getItem(LOCAL_SUB_KEY);
    if (!raw) {
      return {
        plan: PLAN_IDS.SPARK,
        status: "active",
        billing_cycle: "monthly",
        cancel_at_period_end: false,
        source: "local",
      };
    }
    return { ...JSON.parse(raw), source: "local" };
  } catch {
    return {
      plan: PLAN_IDS.SPARK,
      status: "active",
      billing_cycle: "monthly",
      cancel_at_period_end: false,
      source: "local",
    };
  }
}

function saveLocalSubscription(sub) {
  localStorage.setItem(LOCAL_SUB_KEY, JSON.stringify(sub));
}

/**
 * Subscription + AI routing for the Settings screen.
 */
export function usePlatformSettings({ isLoggedIn } = {}) {
  const [plans, setPlans] = useState(PLAN_CATALOG);
  const [subscription, setSubscription] = useState(() => loadLocalSubscription());
  const [preferences, setPreferences] = useState(() => loadLocalPreferences());
  const [keyStatuses, setKeyStatuses] = useState(() => listKeyStatuses());
  const [runtime, setRuntime] = useState(() => getRuntimeSnapshot());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const refreshLocalAi = useCallback(() => {
    setPreferences(loadLocalPreferences());
    setKeyStatuses(listKeyStatuses());
    setRuntime(getRuntimeSnapshot());
  }, []);

  useEffect(() => {
    const bump = () => refreshLocalAi();
    window.addEventListener(AI_CONFIG_CHANGED, bump);
    return () => window.removeEventListener(AI_CONFIG_CHANGED, bump);
  }, [refreshLocalAi]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const catalog = await fetchPlanCatalog().catch(() => null);
      if (catalog?.plans?.length) setPlans(catalog.plans);

      if (isLoggedIn) {
        const [sub, routing] = await Promise.all([
          fetchSubscription().catch(() => null),
          fetchAiRouting().catch(() => null),
        ]);
        if (sub) {
          setSubscription({ ...sub, source: "api" });
          saveLocalSubscription({
            plan: sub.plan,
            status: sub.status,
            billing_cycle: sub.billing_cycle,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: sub.current_period_end,
          });
        } else {
          setSubscription(loadLocalSubscription());
        }
        if (routing) {
          const local = fromApiPreferences(routing);
          // Prefer local routing when user has already configured BYOK this device
          const existing = loadLocalPreferences();
          const merged =
            existing.routingMode !== "auto" ||
            existing.primaryProvider !== "gemini"
              ? existing
              : local;
          saveLocalPreferences(merged);
          setPreferences(merged);
        }
      } else {
        setSubscription(loadLocalSubscription());
      }
      refreshLocalAi();
    } catch (err) {
      setError(err?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, refreshLocalAi]);

  useEffect(() => {
    let cancelled = false;
    // Defer so the effect body does not setState synchronously (React 19 lint).
    const timer = window.setTimeout(() => {
      if (!cancelled) void load();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [load]);

  const activePlan = useMemo(() => {
    const fromApi = subscription?.planDetail;
    if (fromApi) return fromApi;
    return getPlan(subscription?.plan || PLAN_IDS.SPARK);
  }, [subscription]);

  const entitlements = useMemo(() => {
    return (
      subscription?.entitlements ||
      activePlan?.entitlements ||
      getPlan(PLAN_IDS.SPARK).entitlements
    );
  }, [subscription, activePlan]);

  const selectPlan = useCallback(
    async (planId, billingCycle = "monthly") => {
      setSaving(true);
      setError("");
      try {
        if (isLoggedIn) {
          const sub = await selectSubscriptionPlan({
            plan: planId,
            billing_cycle: billingCycle,
          });
          setSubscription({ ...sub, source: "api" });
          saveLocalSubscription({
            plan: sub.plan,
            status: sub.status,
            billing_cycle: sub.billing_cycle,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: sub.current_period_end,
          });
        } else {
          const local = {
            plan: planId,
            status: "active",
            billing_cycle: billingCycle,
            cancel_at_period_end: false,
            current_period_end: new Date(
              Date.now() + (billingCycle === "yearly" ? 365 : 30) * 86400000
            ).toISOString(),
          };
          saveLocalSubscription(local);
          setSubscription({ ...local, source: "local", planDetail: getPlan(planId) });
        }
      } catch (err) {
        setError(err?.message || "Could not update plan");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [isLoggedIn]
  );

  const setCancelAtPeriodEnd = useCallback(
    async (cancel) => {
      setSaving(true);
      setError("");
      try {
        if (isLoggedIn) {
          const sub = await patchSubscription({ cancel_at_period_end: cancel });
          setSubscription({ ...sub, source: "api" });
        } else {
          const local = {
            ...loadLocalSubscription(),
            cancel_at_period_end: cancel,
          };
          saveLocalSubscription(local);
          setSubscription({ ...local, planDetail: getPlan(local.plan) });
        }
      } catch (err) {
        setError(err?.message || "Could not update subscription");
      } finally {
        setSaving(false);
      }
    },
    [isLoggedIn]
  );

  const updatePreferences = useCallback(
    async (partial) => {
      const next = saveLocalPreferences(partial);
      setPreferences(next);
      setRuntime(getRuntimeSnapshot());
      if (isLoggedIn) {
        try {
          await patchAiRouting(
            toApiPreferences(next, buildFingerprintMap())
          );
        } catch (err) {
          console.warn("AI routing sync failed", err);
        }
      }
      return next;
    },
    [isLoggedIn]
  );

  const saveProviderKey = useCallback(
    async (providerId, { apiKey, baseUrl, label }) => {
      await setKey(providerId, { apiKey, baseUrl, label });
      refreshLocalAi();
      if (isLoggedIn) {
        try {
          await patchAiRouting(
            toApiPreferences(loadLocalPreferences(), buildFingerprintMap())
          );
        } catch (err) {
          console.warn("Key fingerprint sync failed", err);
        }
      }
    },
    [isLoggedIn, refreshLocalAi]
  );

  const deleteProviderKey = useCallback(
    async (providerId) => {
      removeKey(providerId);
      refreshLocalAi();
      if (isLoggedIn) {
        try {
          await patchAiRouting(
            toApiPreferences(loadLocalPreferences(), buildFingerprintMap())
          );
        } catch (err) {
          console.warn("Key fingerprint sync failed", err);
        }
      }
    },
    [isLoggedIn, refreshLocalAi]
  );

  const runConnectionTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testActiveConnection();
      setTestResult(result);
      return result;
    } finally {
      setTesting(false);
    }
  }, []);

  return {
    plans,
    subscription,
    activePlan,
    entitlements,
    preferences,
    keyStatuses,
    runtime,
    loading,
    saving,
    error,
    setError,
    testResult,
    testing,
    reload: load,
    selectPlan,
    setCancelAtPeriodEnd,
    updatePreferences,
    saveProviderKey,
    deleteProviderKey,
    runConnectionTest,
    refreshLocalAi,
  };
}
