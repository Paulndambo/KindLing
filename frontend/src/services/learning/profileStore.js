import { STORAGE_KEYS, Correctness, Affect } from "./types";

/**
 * Longitudinal student learning profile.
 * Updated after every meaningful exchange so Kindling remembers the learner.
 */

export function createEmptyProfile(studentId = "anonymous") {
  return {
    version: 1,
    studentId,
    updatedAt: new Date().toISOString(),
    totals: {
      sessions: 0,
      exchanges: 0,
      correct: 0,
      partial: 0,
      incorrect: 0,
      hints: 0,
      questionsAsked: 0,
      totalResponseMs: 0,
      responseSamples: 0,
    },
    /** Rolling mastery by subject → topic */
    mastery: {},
    /** Misconception id → { count, lastSeen, label } */
    misconceptions: {},
    /** Observed delivery style weights */
    deliveryPreferences: {
      visual: 0,
      story: 0,
      step_by_step: 0,
      energetic: 0,
    },
    affectHistory: [], // last N affect labels
    engagementHistory: [], // last N scores 0–1
    confidenceHistory: [], // last N scores 0–1
    strengths: [], // topic keys recently mastered
    focusAreas: [], // topic keys needing work
    behavior: {
      hintRate: 0,
      avgResponseMs: null,
      shortAnswerRate: 0,
      voiceInputCount: 0,
      sessionRestarts: 0,
    },
    lastSession: null,
  };
}

export function loadLearningProfile(studentId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.learningProfile);
    if (!raw) return createEmptyProfile(studentId);
    const parsed = JSON.parse(raw);
    if (studentId && parsed.studentId && parsed.studentId !== studentId) {
      // Different student on same browser — keep separate by overwriting id merge
      return { ...createEmptyProfile(studentId), ...parsed, studentId };
    }
    return { ...createEmptyProfile(studentId), ...parsed };
  } catch {
    return createEmptyProfile(studentId);
  }
}

export function saveLearningProfile(profile) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.learningProfile,
      JSON.stringify({ ...profile, updatedAt: new Date().toISOString() })
    );
  } catch (err) {
    console.warn("Failed to persist learning profile:", err);
  }
}

function topicKey(subject, topic) {
  return `${subject || "General"}::${topic || "General"}`;
}

function pushRolling(arr, value, max = 40) {
  const next = [...arr, value];
  return next.length > max ? next.slice(next.length - max) : next;
}

/**
 * Fold one analyzed exchange into the longitudinal profile.
 */
export function applyExchangeToProfile(profile, { subject, topic, signals }) {
  const next = structuredClone(profile);
  const key = topicKey(subject, topic);

  next.totals.exchanges += 1;
  if (signals.correctness === Correctness.CORRECT) next.totals.correct += 1;
  if (signals.correctness === Correctness.PARTIAL) next.totals.partial += 1;
  if (signals.correctness === Correctness.INCORRECT) next.totals.incorrect += 1;
  if (signals.isHintRequest) next.totals.hints += 1;
  if (signals.isQuestion) next.totals.questionsAsked += 1;

  if (signals.responseMs != null) {
    next.totals.totalResponseMs += signals.responseMs;
    next.totals.responseSamples += 1;
    next.behavior.avgResponseMs = Math.round(
      next.totals.totalResponseMs / next.totals.responseSamples
    );
  }

  if (signals.inputModality === "voice") {
    next.behavior.voiceInputCount += 1;
  }

  // Mastery estimate per topic (0–100)
  if (!next.mastery[key]) {
    next.mastery[key] = {
      subject,
      topic,
      score: 40,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      hints: 0,
      lastCorrectness: null,
      updatedAt: null,
    };
  }
  const m = next.mastery[key];
  m.attempts += 1;
  m.lastCorrectness = signals.correctness;
  m.updatedAt = new Date().toISOString();

  if (signals.correctness === Correctness.CORRECT) {
    m.correct += 1;
    m.score = Math.min(98, m.score + 8 + signals.confidence * 4);
  } else if (signals.correctness === Correctness.PARTIAL) {
    m.score = Math.min(95, m.score + 3);
  } else if (signals.correctness === Correctness.INCORRECT) {
    m.incorrect += 1;
    m.score = Math.max(5, m.score - 6 - (1 - signals.confidence) * 3);
  } else if (signals.isHintRequest) {
    m.hints += 1;
    m.score = Math.max(5, m.score - 2);
  }

  // Misconceptions accumulate
  for (const mc of signals.misconceptions || []) {
    if (!next.misconceptions[mc.id]) {
      next.misconceptions[mc.id] = {
        id: mc.id,
        label: mc.label,
        count: 0,
        lastSeen: null,
        subjects: {},
      };
    }
    next.misconceptions[mc.id].count += 1;
    next.misconceptions[mc.id].lastSeen = new Date().toISOString();
    next.misconceptions[mc.id].subjects[subject] =
      (next.misconceptions[mc.id].subjects[subject] || 0) + 1;
  }

  // Delivery preference weights
  for (const pref of signals.deliveryPreferences || []) {
    if (pref in next.deliveryPreferences) {
      next.deliveryPreferences[pref] += 1;
    }
  }

  next.affectHistory = pushRolling(next.affectHistory, signals.affect);
  next.engagementHistory = pushRolling(
    next.engagementHistory,
    signals.engagement
  );
  next.confidenceHistory = pushRolling(
    next.confidenceHistory,
    signals.confidence
  );

  // Behavior rates
  const ex = next.totals.exchanges || 1;
  next.behavior.hintRate = Number((next.totals.hints / ex).toFixed(3));
  const shortAnswers = next.engagementHistory.filter((e) => e < 0.35).length;
  next.behavior.shortAnswerRate = Number(
    (shortAnswers / Math.max(next.engagementHistory.length, 1)).toFixed(3)
  );

  // Strengths / focus from mastery scores
  const ranked = Object.values(next.mastery).sort((a, b) => b.score - a.score);
  next.strengths = ranked
    .filter((x) => x.score >= 70 && x.attempts >= 2)
    .slice(0, 5)
    .map((x) => ({ subject: x.subject, topic: x.topic, score: Math.round(x.score) }));
  next.focusAreas = ranked
    .filter((x) => x.score < 55 && x.attempts >= 1)
    .slice(0, 5)
    .map((x) => ({ subject: x.subject, topic: x.topic, score: Math.round(x.score) }));

  next.updatedAt = new Date().toISOString();
  return next;
}

export function applySessionStart(profile, sessionMeta) {
  const next = structuredClone(profile);
  next.totals.sessions += 1;
  next.lastSession = {
    id: sessionMeta.sessionId,
    startedAt: sessionMeta.startedAt,
    subject: sessionMeta.subject,
    topic: sessionMeta.topic,
  };
  return next;
}

export function applySessionEnd(profile, sessionSummary) {
  const next = structuredClone(profile);
  if (next.lastSession) {
    next.lastSession = { ...next.lastSession, ...sessionSummary, endedAt: new Date().toISOString() };
  }
  return next;
}

/**
 * Compact insights for the tutor system prompt — the product's adaptive brain.
 */
export function buildPersonalizationInsights(profile, { subject, topic } = {}) {
  if (!profile || profile.totals.exchanges < 1) {
    return {
      summary: "New or lightly observed learner — build trust, start gently, probe prior knowledge.",
      directives: [
        "Begin with a quick warm-up to gauge level.",
        "Watch for hesitation and offer a scaffold before frustration builds.",
      ],
      stats: null,
    };
  }

  const key = topicKey(subject, topic);
  const topicMastery = profile.mastery[key];
  const recentAffect = profile.affectHistory.slice(-5);
  const avgEngagement =
    profile.engagementHistory.length > 0
      ? profile.engagementHistory.reduce((a, b) => a + b, 0) /
        profile.engagementHistory.length
      : 0.5;
  const avgConfidence =
    profile.confidenceHistory.length > 0
      ? profile.confidenceHistory.reduce((a, b) => a + b, 0) /
        profile.confidenceHistory.length
      : 0.5;

  const frustrated = recentAffect.filter((a) => a === Affect.FRUSTRATED).length;
  const hesitant = recentAffect.filter((a) => a === Affect.HESITANT).length;

  const topPrefs = Object.entries(profile.deliveryPreferences)
    .sort((a, b) => b[1] - a[1])
    .filter(([, n]) => n > 0)
    .slice(0, 2)
    .map(([k]) => k);

  const topMisconceptions = Object.values(profile.misconceptions)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const directives = [];

  if (topicMastery?.score != null) {
    if (topicMastery.score < 40) {
      directives.push(
        "This topic is a struggle zone — use smaller steps, more scaffolds, and celebrate micro-wins."
      );
    } else if (topicMastery.score > 75) {
      directives.push(
        "Student shows strength here — stretch with a slightly harder variant after a quick check."
      );
    }
  }

  if (frustrated >= 2) {
    directives.push(
      "Recent frustration detected — slow down, normalize struggle, reduce cognitive load."
    );
  } else if (hesitant >= 2) {
    directives.push(
      "Student often hesitates — invite thinking aloud and validate partial reasoning."
    );
  }

  if (profile.behavior.hintRate > 0.35) {
    directives.push(
      "High hint usage — offer lighter nudges first (questions, not answers)."
    );
  }

  if (topPrefs.includes("visual")) {
    directives.push("Lean on visual models, drawings, and concrete representations.");
  }
  if (topPrefs.includes("story")) {
    directives.push("Use story / real-world analogies tied to their interests.");
  }
  if (topPrefs.includes("step_by_step")) {
    directives.push("Prefer clear numbered steps and one micro-question at a time.");
  }

  if (avgEngagement < 0.4) {
    directives.push(
      "Engagement is low — shorten turns, add a curiosity spark, use their passions."
    );
  }

  for (const mc of topMisconceptions) {
    directives.push(`Watch for misconception: ${mc.label} (seen ${mc.count}×).`);
  }

  if (!directives.length) {
    directives.push("Maintain adaptive Socratic pace; reassess after each answer.");
  }

  const accuracy =
    profile.totals.correct + profile.totals.partial + profile.totals.incorrect > 0
      ? Math.round(
          (profile.totals.correct /
            (profile.totals.correct +
              profile.totals.partial +
              profile.totals.incorrect)) *
            100
        )
      : null;

  return {
    summary: [
      `${profile.totals.exchanges} observed exchanges across ${profile.totals.sessions} sessions.`,
      accuracy != null ? `Recent accuracy signal ~${accuracy}%.` : null,
      topicMastery
        ? `Current topic mastery estimate: ${Math.round(topicMastery.score)}/100.`
        : "No mastery data for this topic yet.",
      `Avg confidence ~${Math.round(avgConfidence * 100)}%, engagement ~${Math.round(avgEngagement * 100)}%.`,
    ]
      .filter(Boolean)
      .join(" "),
    directives,
    stats: {
      accuracy,
      topicMastery: topicMastery ? Math.round(topicMastery.score) : null,
      avgEngagement: Number(avgEngagement.toFixed(2)),
      avgConfidence: Number(avgConfidence.toFixed(2)),
      hintRate: profile.behavior.hintRate,
      focusAreas: profile.focusAreas,
      strengths: profile.strengths,
      topMisconceptions: topMisconceptions.map((m) => m.label),
      preferredDelivery: topPrefs,
    },
  };
}
