import { useCallback, useEffect, useState } from "react";
import {
  flushEventQueue,
  getQueuedEventCount,
  probeApiHealth,
  subscribeLearningQueue,
} from "../services/connectivity";

/**
 * Browser + API connectivity for lesson resilience UI.
 *
 * - online: navigator.onLine
 * - apiStatus: 'unknown' | 'ok' | 'down'
 * - learningQueued: count of learning events waiting to sync
 * - checkApi / syncLearning: manual recovery actions
 */
export function useConnectivity({ pollMs = 45000, enabled = true } = {}) {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [apiStatus, setApiStatus] = useState("unknown");
  const [apiLatencyMs, setApiLatencyMs] = useState(null);
  const [learningQueued, setLearningQueued] = useState(() =>
    getQueuedEventCount()
  );
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshQueue = useCallback(() => {
    setLearningQueued(getQueuedEventCount());
  }, []);

  const checkApi = useCallback(async () => {
    if (!enabled) return { ok: false, status: "unknown" };
    setIsChecking(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOnline(false);
        setApiStatus("down");
        setApiLatencyMs(null);
        setLastCheckedAt(new Date().toISOString());
        return { ok: false, status: "down", reason: "offline" };
      }
      const result = await probeApiHealth();
      setApiStatus(result.status);
      setApiLatencyMs(result.latencyMs);
      setLastCheckedAt(new Date().toISOString());
      if (result.ok) {
        // Opportunistic drain when API is healthy
        const flush = await flushEventQueue();
        if (flush?.flushed) refreshQueue();
      }
      return result;
    } finally {
      setIsChecking(false);
    }
  }, [enabled, refreshQueue]);

  const syncLearning = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await flushEventQueue();
      refreshQueue();
      if (result?.ok) {
        await checkApi();
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [checkApi, refreshQueue]);

  useEffect(() => {
    if (!enabled) return undefined;

    const onOnline = () => {
      setOnline(true);
      // Reconnect path: re-probe + drain queue
      void (async () => {
        await checkApi();
        await flushEventQueue();
        refreshQueue();
      })();
    };
    const onOffline = () => {
      setOnline(false);
      setApiStatus("down");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const unsub = subscribeLearningQueue(() => refreshQueue());

    // Initial probe (deferred so lesson paint isn't blocked)
    const boot = window.setTimeout(() => {
      void checkApi();
      refreshQueue();
    }, 400);

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkApi();
        refreshQueue();
      }
    }, pollMs);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void checkApi();
        refreshQueue();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // Best-effort drain when leaving the page (keepalive fetch in flush)
    const onPageHide = () => {
      if (getQueuedEventCount() > 0) {
        void flushEventQueue();
      }
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
      window.clearTimeout(boot);
      window.clearInterval(poll);
      unsub?.();
    };
  }, [enabled, pollMs, checkApi, refreshQueue]);

  const showBanner =
    !online ||
    apiStatus === "down" ||
    learningQueued > 0;

  return {
    online,
    apiStatus,
    apiLatencyMs,
    learningQueued,
    lastCheckedAt,
    isChecking,
    isSyncing,
    showBanner,
    checkApi,
    syncLearning,
    refreshQueue,
  };
}
