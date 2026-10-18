/**
 * Plan catalog (mirrors backend kindling_platform.plans).
 * Used for offline UI; live API is preferred when available.
 * Commercial thesis: MONEY.md — algorithm rent + token envelope / BYOK.
 */

export const PLAN_IDS = {
  SPARK: "spark",
  EMBER: "ember",
  FORGE: "forge",
};

export const PLAN_CATALOG = [
  {
    id: PLAN_IDS.SPARK,
    name: "Spark",
    tagline: "30-day trial of Kindling's adaptive tutor",
    priceMonthly: 0,
    priceYearly: 0,
    highlight: false,
    trialDays: 30,
    features: [
      "Full teaching system for 30 days",
      "Live adaptive lessons (daily platform-AI request and usage cap)",
      "Student dashboard & mastery pulse",
      "Then choose Forge or Ember to continue",
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
    id: PLAN_IDS.FORGE,
    name: "Forge",
    tagline: "Rent the algorithm — bring your own AI keys",
    priceMonthly: 30,
    priceYearly: 300,
    highlight: false,
    features: [
      "Kindling teaching system (algorithm rent)",
      "You pay AI tokens via your own keys (BYOK)",
      "Multi-provider routing (Gemini, OpenAI, Anthropic, Groq, OpenRouter)",
      "Per-task model routing · homework photo · digests",
    ],
    entitlements: {
      platformAi: false,
      byok: true,
      multiProvider: true,
      advancedRouting: true,
      familyDigest: true,
      prioritySupport: false,
      dailyLessonSoftCap: null,
      dailyPlatformAiRequests: 0,
      dailyPlatformAiTokens: 0,
    },
  },
  {
    id: PLAN_IDS.EMBER,
    name: "Ember",
    tagline: "Nightly tutoring with platform AI included",
    priceMonthly: 99,
    priceYearly: 990,
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
