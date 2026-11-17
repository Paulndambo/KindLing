import { createRevenueCatClient } from "./revenuecat-client";

const testMode = (import.meta.env.VITE_REVENUECAT_MODE || (import.meta.env.DEV ? "test" : "live")) === "test";

export const revenueCat = createRevenueCatClient({
  testMode,
  onDiagnostics: (summary) => {
    if (testMode) console.info("[Kindling subscriptions]", summary);
  },
  apiKey: testMode
    ? import.meta.env.VITE_REVENUECAT_TEST_API_KEY || "test_fZjmZvPdUliuCFbHZhXKkkUcSYw"
    : import.meta.env.VITE_REVENUECAT_WEB_API_KEY,
  loadSdk: () => import("@revenuecat/purchases-js"),
  browserAvailable: () => typeof window !== "undefined" && typeof document !== "undefined",
});
