/**
 * Epic L1 — LearnerState contract
 *
 * Single structured snapshot of what Kindling believes about the learner
 * right now. Built from the longitudinal profile + live session signals.
 * Downstream: learner pulse UI, pedagogical policy (L2), ADI (L3).
 *
 * Slices (review §3–4):
 *   knowledge | misconceptions | behaviour | engagement |
 *   confidence | assistance | objective | interaction
 */

import { Affect } from "./types";
import { buildLocalSkillPath, STATE_LABELS } from "./skillGraph";
import { computeAdiFromContext, serializeAdi } from "./adi";

export const LEARNER_STATE_VERSION = 1;

/** @typedef {'independent'|'light_support'|'guided'|'high_support'|'unknown'} AssistanceLabel */
/** @typedef {'calibrated'|'overconfident'|'underconfident'|'unknown'} CalibrationLabel */
/** @typedef {'engaged'|'steady'|'low'|'frustrated'|'disengaged'|'unknown'} EngagementLabel */

/**
 * Empty / unknown state — safe for new learners.
 * @param {object} [opts]
 */
export function emptyLearnerState({
  studentId = "anonymous",
  subject = "",
  topic = "",
  unit = "",
} = {}) {
  return {
    version: LEARNER_STATE_VERSION,
    studentId,
    subject: subject || "",
    topic: topic || "",
    unit: unit || "",
    updatedAt: new Date().toISOString(),
    knowledge: {
      topicScore: null,
      topicAttempts: 0,
      topicCorrect: 0,
      topicIncorrect: 0,
      skills: [],
      primarySkills: [],
      strengths: [],
      focusAreas: [],
      recommendedNext: null,
    },
    misconceptions: [],
    behaviour: {
      hintRate: 0,
      shortAnswerRate: 0,
      rapidGuessRate: 0,
      offTopicRate: 0,
      avgResponseMs: null,
      persistenceScore: 0,
      flags: [],
    },
    engagement: {
      level: null,
      label: /** @type {EngagementLabel} */ ("unknown"),
      recent: [],
    },
    confidence: {
      level: null,
      label: "unknown",
      /** rolling mean of confidence signals 0–1 */
      mean: null,
      /** accuracy 0–1 when enough graded turns */
      competence: null,
      calibration: /** @type {CalibrationLabel} */ ("unknown"),
      /** |confidence − competence| when both known */
      calibrationError: null,
    },
    assistance: {
      level: 0,
      label: /** @type {AssistanceLabel} */ ("unknown"),
      hintRate: 0,
      interventionActive: false,
      interventionLevel: 0,
      scaffoldingBias: 0,
      /** Epic L3 — Assistance Dependency Index (null until enough samples) */
      adi: null,
      adiBand: "unknown",
      independencePct: null,
      preferLighterHelp: false,
    },
    objective: {
      lessonGoal: "",
      weekFocus: "",
      unitName: unit || "",
      lessonName: topic || "",
      familiarity: "",
      effectiveGoal: "",
    },
    interaction: {
      deliveryPrefs: [],
      prefersVisual: false,
      prefersStory: false,
      prefersStepByStep: false,
      prefersEnergetic: false,
      lowTypingTolerance: false,
      voiceInputCount: 0,
    },
    /** One-line human summary for tools / logs */
    summary: "New or lightly observed learner.",
    /** Compact rows for Learner pulse UI */
    pulse: {
      correctnessTone: "muted",
      correctnessText: "Observing…",
      affectLabel: "—",
      confidencePct: null,
      engagementPct: null,
      thinkTimeLabel: null,
      knowledgeLabel: null,
      assistanceLabel: null,
      calibrationLabel: null,
      misconceptionLabels: [],
      misconceptionTip: null,
      persistenceNote: null,
      /** Epic L3 non-shaming independence line */
      independenceNote: null,
    },
  };
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function mean(arr) {
  const nums = (arr || []).map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function topicKey(subject, topic) {
  return `${subject || "General"}::${topic || "General"}`;
}

/**
 * Map affect enum → short label.
 */
export function affectDisplayLabel(affect) {
  const map = {
    [Affect.CONFIDENT]: "Confident",
    [Affect.HESITANT]: "Hesitant",
    [Affect.FRUSTRATED]: "Frustrated",
    [Affect.CURIOUS]: "Curious",
    [Affect.DISENGAGED]: "Low engagement",
    [Affect.NEUTRAL]: "Steady",
    confident: "Confident",
    hesitant: "Hesitant",
    frustrated: "Frustrated",
    curious: "Curious",
    disengaged: "Low engagement",
    neutral: "Steady",
  };
  return map[affect] || "—";
}

/**
 * Correctness → pulse chip.
 */
export function correctnessPulse(correctness) {
  switch (String(correctness || "").toLowerCase()) {
    case "correct":
      return { text: "On track", tone: "good" };
    case "partial":
      return { text: "Partial understanding", tone: "mid" };
    case "incorrect":
      return { text: "Needs scaffold", tone: "focus" };
    case "exploring":
      return { text: "Exploring / asking", tone: "mid" };
    default:
      return { text: "Observing…", tone: "muted" };
  }
}

/**
 * Engagement 0–1 → label.
 * @returns {EngagementLabel}
 */
export function engagementLabelFromLevel(level) {
  if (level == null || !Number.isFinite(Number(level))) return "unknown";
  const v = Number(level);
  if (v >= 0.72) return "engaged";
  if (v >= 0.45) return "steady";
  if (v >= 0.25) return "low";
  return "disengaged";
}

/**
 * Confidence×competence calibration (L1.3 thin).
 * @returns {{ calibration: CalibrationLabel, error: number|null }}
 */
export function calibrateConfidenceCompetence(confidenceMean, competence) {
  const c = clamp01(confidenceMean);
  const k = clamp01(competence);
  if (c == null || k == null) {
    return { calibration: "unknown", error: null };
  }
  const err = Math.abs(c - k);
  // Need meaningful gap and enough separation from random noise
  if (err < 0.18) return { calibration: "calibrated", error: err };
  if (c > k + 0.18) return { calibration: "overconfident", error: err };
  if (k > c + 0.18) return { calibration: "underconfident", error: err };
  return { calibration: "calibrated", error: err };
}

/**
 * @returns {AssistanceLabel}
 */
export function assistanceLabelFromLevel(level, { interventionActive } = {}) {
  if (interventionActive && level >= 0.55) return "high_support";
  if (level == null || !Number.isFinite(Number(level))) return "unknown";
  const v = Number(level);
  if (v < 0.18) return "independent";
  if (v < 0.4) return "light_support";
  if (v < 0.7) return "guided";
  return "high_support";
}

function buildBehaviourFlags(behavior = {}, lastSignals = null) {
  const flags = [];
  if ((behavior.rapidGuessRate || 0) > 0.25 || lastSignals?.rapidGuess) {
    flags.push("rapid_guessing");
  }
  if ((behavior.shortAnswerRate || 0) > 0.4 || lastSignals?.shortAnswer) {
    flags.push("short_answers");
  }
  if ((behavior.offTopicRate || 0) > 0.2 || lastSignals?.offTopic) {
    flags.push("off_topic");
  }
  if ((behavior.hintRate || 0) > 0.35) {
    flags.push("hint_dependent");
  }
  if ((behavior.persistenceScore || 0) >= 3) {
    flags.push("persistent");
  }
  return flags;
}

function competenceFromMastery(masteryRow, totals) {
  if (masteryRow && masteryRow.attempts >= 2) {
    const att = Math.max(1, Number(masteryRow.attempts) || 1);
    const correct = Number(masteryRow.correct) || 0;
    const partial = Number(masteryRow.partial) || 0;
    return clamp01((correct + partial * 0.5) / att);
  }
  const graded =
    (totals?.correct || 0) +
    (totals?.incorrect || 0) +
    (totals?.partial || 0);
  if (graded >= 3) {
    return clamp01(
      ((totals.correct || 0) + (totals.partial || 0) * 0.5) / graded
    );
  }
  return null;
}

/**
 * Build LearnerState from profile + live session context.
 *
 * @param {object} opts
 * @param {object|null} [opts.profile]
 * @param {string} [opts.studentId]
 * @param {string} [opts.subject]
 * @param {string} [opts.topic]
 * @param {string} [opts.unit]
 * @param {object|null} [opts.lastSignals] latest turn signals
 * @param {object|null} [opts.sessionSummary]
 * @param {object|null} [opts.intervention] { status, level, context }
 * @param {object|null} [opts.struggleSnapshot]
 * @param {object[]} [opts.activeMisconceptions]
 * @param {object|null} [opts.lessonGoals] resolveLessonGoals() result
 * @param {number} [opts.scaffoldingBias]
 * @param {object|null} [opts.sessionSnapshot] tracker snapshot for L3 ADI
 * @param {object|null} [opts.adi] precomputed ADI result (optional)
 */
export function buildLearnerState({
  profile = null,
  studentId = "",
  subject = "",
  topic = "",
  unit = "",
  lastSignals = null,
  sessionSummary = null,
  intervention = null,
  struggleSnapshot = null,
  activeMisconceptions = null,
  lessonGoals = null,
  scaffoldingBias = 0,
  sessionSnapshot = null,
  adi = null,
} = {}) {
  const sid =
    studentId ||
    profile?.studentId ||
    "anonymous";
  const state = emptyLearnerState({
    studentId: sid,
    subject,
    topic,
    unit,
  });

  const exchanges = profile?.totals?.exchanges || 0;
  const key = topicKey(subject, topic);
  const masteryRow = profile?.mastery?.[key] || null;

  // ── Knowledge ──
  if (masteryRow) {
    state.knowledge.topicScore =
      masteryRow.score != null ? Math.round(Number(masteryRow.score)) : null;
    state.knowledge.topicAttempts = masteryRow.attempts || 0;
    state.knowledge.topicCorrect = masteryRow.correct || 0;
    state.knowledge.topicIncorrect = masteryRow.incorrect || 0;
  }
  state.knowledge.strengths = (profile?.strengths || []).slice(0, 5);
  state.knowledge.focusAreas = (profile?.focusAreas || []).slice(0, 5);

  const skillPath = buildLocalSkillPath(profile, subject, topic);
  if (skillPath?.hasGraph && Array.isArray(skillPath.skills)) {
    state.knowledge.skills = skillPath.skills.map((s) => ({
      slug: s.slug,
      name: s.name || s.shortLabel || s.slug,
      shortLabel: s.shortLabel || s.name || s.slug,
      score: s.score != null ? Math.round(Number(s.score)) : null,
      state: s.state || null,
      stateLabel: s.stateLabel || STATE_LABELS[s.state] || "",
      isPrimary: Boolean(s.isPrimary),
    }));
    state.knowledge.primarySkills = state.knowledge.skills.filter(
      (s) => s.isPrimary
    );
    if (skillPath.recommendedNext) {
      state.knowledge.recommendedNext = {
        slug: skillPath.recommendedNext.slug || skillPath.recommendedNext.skillSlug,
        name:
          skillPath.recommendedNext.shortLabel ||
          skillPath.recommendedNext.name ||
          "",
      };
    }
  }

  // ── Misconceptions ──
  const liveMc =
    (Array.isArray(activeMisconceptions) && activeMisconceptions.length
      ? activeMisconceptions
      : null) ||
    lastSignals?.misconceptions ||
    [];
  const profileMc = Object.values(profile?.misconceptions || {})
    .filter((m) => m && m.isActive !== false)
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  const mcMap = new Map();
  for (const m of [...liveMc, ...profileMc]) {
    const id = m.id || m.slug;
    if (!id || mcMap.has(id)) continue;
    const count = Number(m.count) || 1;
    // Thin confidence: more sightings → higher (cap 0.95)
    const confidence = Math.min(0.95, 0.35 + count * 0.12);
    mcMap.set(id, {
      id,
      label: m.label || id,
      count,
      confidence: Math.round(confidence * 100) / 100,
      isActive: m.isActive !== false,
      skillSlug: m.skillSlug || null,
      playbook: m.playbook || null,
      checkQuestion:
        m.playbook?.check_question || m.playbook?.checkQuestion || null,
    });
  }
  state.misconceptions = [...mcMap.values()].slice(0, 6);

  // ── Behaviour ──
  const behavior = profile?.behavior || {};
  state.behaviour = {
    hintRate: Number(behavior.hintRate) || 0,
    shortAnswerRate: Number(behavior.shortAnswerRate) || 0,
    rapidGuessRate: Number(behavior.rapidGuessRate) || 0,
    offTopicRate: Number(behavior.offTopicRate) || 0,
    avgResponseMs:
      behavior.avgResponseMs != null
        ? Number(behavior.avgResponseMs)
        : lastSignals?.responseMs ?? null,
    persistenceScore:
      Number(
        struggleSnapshot?.persistenceScore ?? behavior.persistenceScore
      ) || 0,
    flags: buildBehaviourFlags(behavior, lastSignals),
  };

  // ── Engagement ──
  const engLive = clamp01(lastSignals?.engagement);
  const engMean = mean(profile?.engagementHistory);
  const engLevel = engLive != null ? engLive : engMean;
  state.engagement = {
    level: engLevel,
    label: engagementLabelFromLevel(engLevel),
    recent: (profile?.engagementHistory || []).slice(-8),
  };

  // ── Confidence + calibration (L1.3) ──
  const confLive = clamp01(lastSignals?.confidence);
  const confMean = mean(profile?.confidenceHistory);
  const confLevel = confLive != null ? confLive : confMean;
  const competence = competenceFromMastery(masteryRow, profile?.totals);
  const { calibration, error: calErr } = calibrateConfidenceCompetence(
    confMean != null ? confMean : confLevel,
    competence
  );
  let confLabel = "unknown";
  if (confLevel != null) {
    if (confLevel >= 0.7) confLabel = "high";
    else if (confLevel >= 0.4) confLabel = "moderate";
    else confLabel = "low";
  }
  state.confidence = {
    level: confLevel,
    label: confLabel,
    mean: confMean,
    competence,
    calibration,
    calibrationError: calErr,
  };

  // ── Assistance ──
  const hintRate = Number(behavior.hintRate) || 0;
  const interventionActive = intervention?.status === "active";
  const interventionLevel = Number(
    intervention?.level || intervention?.context?.level || 0
  );
  const bias = Number(
    scaffoldingBias ||
      struggleSnapshot?.scaffoldingBias ||
      sessionSummary?.scaffoldingBias ||
      0
  );
  // 0 = independent … 1 = heavy help
  const lightlyObserved = !exchanges && !lastSignals;
  let assistLevel = lightlyObserved
    ? 0
    : Math.min(
        1,
        hintRate * 0.55 +
          bias * 0.35 +
          (interventionActive ? 0.25 + interventionLevel * 0.12 : 0)
      );
  // Epic L3 — ADI from session turns (+ profile fallback)
  const adiResult =
    adi && typeof adi === "object"
      ? adi
      : computeAdiFromContext({
          sessionSnapshot: sessionSnapshot || sessionSummary?.snapshot || null,
          intervention,
          profile,
          topicScore: state.knowledge.topicScore,
          priorAdi: profile?.behavior?.adi ?? null,
        });

  state.assistance = {
    level: Math.round(assistLevel * 100) / 100,
    // Unknown until we have real session evidence (not "independent" by default)
    label: lightlyObserved
      ? "unknown"
      : assistanceLabelFromLevel(assistLevel, { interventionActive }),
    hintRate,
    interventionActive,
    interventionLevel,
    scaffoldingBias: bias,
    adi: adiResult?.reliable ? adiResult.value : adiResult?.value ?? null,
    adiBand: adiResult?.band || "unknown",
    independencePct: adiResult?.independencePct ?? null,
    preferLighterHelp: Boolean(adiResult?.preferLighterHelp),
    adiDetail: serializeAdi(adiResult),
  };

  // ── Objective ──
  const goals = lessonGoals || {};
  state.objective = {
    lessonGoal: String(goals.learningGoal || goals.effectiveGoal || "").trim(),
    weekFocus: String(goals.weekFocus || "").trim(),
    unitName: unit || String(goals.unitName || "").trim(),
    lessonName: topic || "",
    familiarity: String(
      goals.familiarity || goals.familiarityLabel || ""
    ).trim(),
    effectiveGoal: String(goals.effectiveGoal || goals.learningGoal || "").trim(),
  };

  // ── Interaction prefs ──
  const prefs = profile?.deliveryPreferences || {};
  const prefEntries = Object.entries(prefs)
    .map(([id, weight]) => ({ id, weight: Number(weight) || 0 }))
    .filter((p) => p.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  const topPref = prefEntries[0]?.id || "";
  state.interaction = {
    deliveryPrefs: prefEntries.slice(0, 4),
    prefersVisual: topPref === "visual" || (prefs.visual || 0) >= 2,
    prefersStory: topPref === "story" || (prefs.story || 0) >= 2,
    prefersStepByStep:
      topPref === "step_by_step" || (prefs.step_by_step || 0) >= 2,
    prefersEnergetic: topPref === "energetic" || (prefs.energetic || 0) >= 2,
    lowTypingTolerance: (behavior.shortAnswerRate || 0) > 0.4,
    voiceInputCount: Number(behavior.voiceInputCount) || 0,
  };

  // ── Summary ──
  state.summary = buildLearnerStateSummary(state, { exchanges });

  // ── Pulse UI projection ──
  const corr = correctnessPulse(lastSignals?.correctness);
  const confPct =
    state.confidence.level != null
      ? Math.round(state.confidence.level * 100)
      : null;
  const engPct =
    state.engagement.level != null
      ? Math.round(state.engagement.level * 100)
      : null;
  let thinkTimeLabel = null;
  const ms =
    lastSignals?.responseMs != null
      ? lastSignals.responseMs
      : state.behaviour.avgResponseMs;
  if (ms != null && Number.isFinite(Number(ms))) {
    thinkTimeLabel =
      Number(ms) < 1000 ? "<1s" : `${Math.round(Number(ms) / 1000)}s`;
  }

  let knowledgeLabel = null;
  if (state.knowledge.topicScore != null) {
    knowledgeLabel = `Topic mastery ~${state.knowledge.topicScore}%`;
  } else if (state.knowledge.primarySkills[0]?.score != null) {
    const p = state.knowledge.primarySkills[0];
    knowledgeLabel = `${p.shortLabel || p.name}: ~${p.score}%`;
  }

  let calibrationLabel = null;
  if (state.confidence.calibration === "overconfident") {
    calibrationLabel = "May feel ahead of evidence — invite show-your-work";
  } else if (state.confidence.calibration === "underconfident") {
    calibrationLabel = "Stronger than they feel — affirm solid reasoning";
  } else if (state.confidence.calibration === "calibrated") {
    calibrationLabel = "Confidence roughly matches performance";
  }

  const assistLabels = {
    independent: "Working independently",
    light_support: "Light support",
    guided: "Guided practice",
    high_support: "High support right now",
    unknown: null,
  };

  state.pulse = {
    correctnessTone: corr.tone,
    correctnessText: corr.text,
    affectLabel: affectDisplayLabel(lastSignals?.affect),
    confidencePct: confPct,
    engagementPct: engPct,
    thinkTimeLabel,
    knowledgeLabel,
    assistanceLabel: assistLabels[state.assistance.label] || null,
    calibrationLabel,
    misconceptionLabels: state.misconceptions.map((m) => m.label).slice(0, 3),
    misconceptionTip: state.misconceptions[0]?.checkQuestion || null,
    persistenceNote:
      state.behaviour.persistenceScore >= 2
        ? "Persistence spark: effort and bounce-backs count — not only correct answers."
        : null,
    independenceNote: adiResult?.reliable ? adiResult.copy || null : null,
  };

  // Expose full ADI on state for policy / tools
  state.adi = adiResult || null;

  state.updatedAt = new Date().toISOString();
  return state;
}

/**
 * Human one-liner for logs / optional tutor context.
 */
export function buildLearnerStateSummary(state, { exchanges = 0 } = {}) {
  if (!state) return "Unknown learner state.";
  const noLive =
    !state.pulse?.correctnessText ||
    state.pulse.correctnessText === "Observing…";
  if (exchanges < 1 && noLive && !(state.knowledge?.topicAttempts > 0)) {
    return "New or lightly observed learner — build trust, start gently.";
  }
  const bits = [];
  if (state.knowledge.topicScore != null) {
    bits.push(`topic ~${state.knowledge.topicScore}%`);
  }
  if (state.engagement.label && state.engagement.label !== "unknown") {
    bits.push(`engagement ${state.engagement.label}`);
  }
  if (state.confidence.label && state.confidence.label !== "unknown") {
    bits.push(`confidence ${state.confidence.label}`);
  }
  if (
    state.confidence.calibration &&
    state.confidence.calibration !== "unknown" &&
    state.confidence.calibration !== "calibrated"
  ) {
    bits.push(state.confidence.calibration);
  }
  if (state.assistance.label && state.assistance.label !== "unknown") {
    bits.push(state.assistance.label.replace(/_/g, " "));
  }
  if (state.misconceptions.length) {
    bits.push(`mc: ${state.misconceptions[0].label}`);
  }
  if (state.behaviour.flags?.includes("rapid_guessing")) {
    bits.push("rapid guessing");
  }
  if (state.adi?.reliable && state.adi.band && state.adi.band !== "unknown") {
    if (state.adi.band === "gaining_independence") bits.push("gaining independence");
    else if (state.adi.preferLighterHelp) bits.push("prefer lighter help");
  }
  if (!bits.length) {
    return exchanges > 0
      ? "Observed learner — still forming a clear picture."
      : "New or lightly observed learner.";
  }
  return bits.join(" · ");
}

/**
 * Directives derived purely from LearnerState (for L2 / prompt injection later).
 * Keep short; policy layer will own the full action enum.
 */
export function learnerStateDirectives(state) {
  if (!state) return [];
  const dirs = [];
  if (state.confidence.calibration === "overconfident") {
    dirs.push(
      "Confidence may outpace mastery — ask them to show steps before stretching difficulty."
    );
  }
  if (state.confidence.calibration === "underconfident") {
    dirs.push(
      "Competence may exceed confidence — affirm solid reasoning and offer a fair stretch."
    );
  }
  if (state.assistance.label === "high_support") {
    dirs.push(
      "High assistance right now — plan a lighter check soon so independence can grow."
    );
  }
  if (state.interaction.lowTypingTolerance) {
    dirs.push(
      "Student often types little — prefer short choices, chips, and one clear ask."
    );
  }
  if (state.behaviour.flags?.includes("rapid_guessing")) {
    dirs.push(
      "Rapid guessing pattern — slow the pace and ask for a reason before the next try."
    );
  }
  if (state.adi?.preferLighterHelp) {
    dirs.push(
      "Independence is rising — prefer the lightest helpful scaffold; avoid jumping to full guides."
    );
  }
  return dirs.slice(0, 4);
}

/**
 * JSON-safe plain object (strip undefined).
 */
export function serializeLearnerState(state) {
  if (!state) return null;
  return JSON.parse(JSON.stringify(state));
}
