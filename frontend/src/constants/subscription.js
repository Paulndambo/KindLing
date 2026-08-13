/**
 * Plan catalog (mirrors backend kindling_platform.plans).
 * Used for offline UI; live API is preferred when available.
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
    tagline: "Start learning with Kindling's tutor",
    priceMonthly: 0,
    priceYearly: 0,
    highlight: false,
    features: [
      "Live adaptive lessons",
      "Student dashboard & mastery pulse",
      "Platform AI (Gemini) when configured",
      "Optional personal API keys (BYOK)",
    ],
    entitlements: {
      platformAi: true,
      byok: true,
      multiProvider: false,
      advancedRouting: false,
      familyDigest: false,
      prioritySupport: false,
      dailyLessonSoftCap: 20,
    },
  },
  {
    id: PLAN_IDS.EMBER,
    name: "Ember",
    tagline: "Family plan for daily tutoring",
    priceMonthly: 19,
    priceYearly: 190,
    highlight: true,
    features: [
      "Everything in Spark",
      "Generous daily lessons on platform AI",
      "Weekly family digests",
      "Homework photo help",
      "Priority session continuity",
    ],
    entitlements: {
      platformAi: true,
      byok: true,
      multiProvider: true,
      advancedRouting: false,
      familyDigest: true,
      prioritySupport: false,
      dailyLessonSoftCap: null,
    },
  },
  {
    id: PLAN_IDS.FORGE,
    name: "Forge",
    tagline: "Builder mode — bring your own AI keys",
    priceMonthly: 9,
    priceYearly: 90,
    highlight: false,
    features: [
      "Everything in Ember",
      "Full multi-provider BYOK (Gemini, OpenAI, Anthropic, Groq, OpenRouter)",
      "Per-task model routing (chat / vision / TTS)",
      "Hot-switch providers without restarting lessons",
      "Designed for power users & pilots",
    ],
    entitlements: {
      platformAi: true,
      byok: true,
      multiProvider: true,
      advancedRouting: true,
      familyDigest: true,
      prioritySupport: true,
      dailyLessonSoftCap: null,
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
