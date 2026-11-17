/**
 * Plan catalog (mirrors backend kindling_platform.plans).
 * Used for offline UI; live API is preferred when available.
 * Commercial thesis: MONEY.md — algorithm rent + token envelope / BYOK.
 */

export const PLAN_IDS = {
  SPARK: "spark",
  PREMIUM: "premium",
};

export const PLAN_CATALOG = [
  {
    id: PLAN_IDS.SPARK,
    name: "Spark",
    tagline: "Free access to Kindling's adaptive tutor",
    priceMonthly: 0,
    priceYearly: 0,
    highlight: false,
    features: [
      "Kindling's adaptive teaching system, free",
      "Live adaptive lessons (daily platform-AI request and usage cap)",
      "Student dashboard & mastery pulse",
      "Bring your own AI keys for additional providers",
    ],
    entitlements: {
      platformAi: true,
      byok: true,
      multiProvider: false,
      advancedRouting: false,
      familyDigest: false,
      prioritySupport: false,
      dailyLessonSoftCap: 4,
      dailyPlatformAiRequests: 250,
      dailyPlatformAiTokens: 1000000,
    },
  },
  {
    id: PLAN_IDS.PREMIUM,
    name: "Premium",
    tagline: "More AI and advanced learning tools",
    priceMonthly: 25,
    priceYearly: 250,
    highlight: true,
    features: [
      "Everything in the teaching system",
      "Platform AI included (daily request and usage cap)",
      "Homework photo help · guardian digests",
      "BYOK optional · priority support",
    ],
    entitlements: {
      platformAi: true,
      byok: true,
      multiProvider: true,
      advancedRouting: true,
      familyDigest: true,
      prioritySupport: true,
      dailyLessonSoftCap: null,
      dailyPlatformAiRequests: 500,
      dailyPlatformAiTokens: 2000000,
    },
  },
];

export function getPlan(planId) {
  return (
    PLAN_CATALOG.find((p) => p.id === planId) ||
    PLAN_CATALOG.find((p) => p.id === PLAN_IDS.SPARK)
  );
}

export const ROUTING_MODES = [
  {
    id: "auto",
    label: "Auto",
    desc: "Use your keys when present; otherwise Kindling platform AI",
  },
  {
    id: "platform",
    label: "Platform",
    desc: "Always use Kindling’s configured Gemini key",
  },
  {
    id: "byok",
    label: "My keys (BYOK)",
    desc: "Always use the provider keys you supply",
  },
];
