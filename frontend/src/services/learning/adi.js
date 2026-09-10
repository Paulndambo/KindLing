/**
 * Epic L3 — Assistance Dependency Index (ADI)
 *
 * Measures how much scaffold the learner needed on recent graded work.
 * Higher ADI = more help-dependent; lower = growing independence.
 *
 * Product rules:
 *  - Never shame; copy frames independence and healthy help-seeking.
 *  - Prefer lighter ladder rungs as ADI falls and mastery rises (L3.2).
 *  - Metric is for tutors/policy — students see warm independence language only.
 */

import { InterventionLevel, normalizeLevel } from "./interventionLadder";

export const ADI_VERSION = 1;
/** Rolling window of graded turns used for live ADI */
export const ADI_WINDOW = 12;
/** Minimum graded samples before ADI is considered reliable */
export const ADI_MIN_SAMPLES = 3;

/** @typedef {'unknown'|'gaining_independence'|'balanced_support'|'scaffold_heavy'} AdiBand */

/**
 * Assistance weight for a single turn (0–1).
 * @param {object} turn
 * @param {string} [turn.correctness]
 * @param {boolean} [turn.isHintRequest]
 * @param {boolean} [turn.interventionActive]
 * @param {number} [turn.interventionLevel] 0–4
 * @param {number} [turn.scaffoldingBias] 0–1
 */
export function assistanceWeightForTurn(turn = {}) {
  const level = normalizeLevel(turn.interventionLevel || 0);
  const active =
    turn.interventionActive === true ||
    (turn.interventionStatus === "active" && level > 0) ||
    level > 0 && turn.duringIntervention === true;

  let w = 0;
  if (turn.isHintRequest) w += 0.32;
  if (active && level > 0) {
    // L1 micro ≈ 0.18 … L4 easier ≈ 0.72
    w += (level / InterventionLevel.BREAK_OR_EASIER) * 0.72;
  }
  // Live session bias toward heavier help (soft)
  const bias = Number(turn.scaffoldingBias);
  if (Number.isFinite(bias) && bias > 0) {
    w += Math.min(0.18, bias * 0.22);
  }

  // Correct-with-heavy-help still counts as dependency (that's the point)
  // Incorrect without help is mild dependency signal (still struggling alone)
  const c = String(turn.correctness || "").toLowerCase();
  if (c === "incorrect" && w < 0.15) {
    w = Math.max(w, 0.12);
  }
  if (c === "exploring" || c === "unknown" || !c) {
    // Don't dominate ADI with ungraded chat
    w *= 0.5;
  }

  return Math.max(0, Math.min(1, Math.round(w * 1000) / 1000));
}

/**
 * @param {number|null} adi
 * @returns {AdiBand}
 */
export function adiBand(adi) {
  if (adi == null || !Number.isFinite(Number(adi))) return "unknown";
  const v = Number(adi);
  if (v < 0.28) return "gaining_independence";
  if (v < 0.55) return "balanced_support";
  return "scaffold_heavy";
}

/**
 * Non-shaming learner-facing / pulse copy.
 * High ADI + high mastery → encourage independence (not scold help use).
 *
 * @param {object} opts
 * @param {number|null} opts.adi
 * @param {number|null} [opts.topicScore] 0–100
 * @param {string} [opts.trend] rising|falling|stable|unknown
 * @param {boolean} [opts.forDigest]
 */
export function adiIndependenceCopy({
  adi = null,
  topicScore = null,
  trend = "unknown",
  forDigest = false,
} = {}) {
  if (adi == null || !Number.isFinite(Number(adi))) return null;
  const band = adiBand(adi);
  const score = topicScore != null ? Number(topicScore) : null;
  const strongMastery = score != null && score >= 65;
  const name = forDigest ? "They" : "You're";
  const nameLower = forDigest ? "they" : "you";

  if (band === "gaining_independence") {
    if (trend === "falling") {
      return forDigest
        ? "Growing independence — solving more with lighter support."
        : "Growing independence — more solid answers with lighter support.";
    }
    return forDigest
      ? "Building independent practice on recent graded work."
      : "Building independence — keep trusting your own reasoning.";
  }

  if (band === "balanced_support") {
    if (strongMastery) {
      return forDigest
        ? "Using help wisely while mastery holds — a good moment for lighter practice."
        : "Solid progress with balanced support — try the next one with a lighter hint.";
    }
    return forDigest
      ? "Mixing independent tries with healthy help-seeking."
      : "Mixing your own tries with healthy help — that balance grows learning.";
  }

  // scaffold_heavy
  if (strongMastery) {
    return forDigest
      ? `${name} know this material — encourage a no-hint try next time.`
      : `${name} know more than the scaffolds suggest — try one with a lighter hint.`;
  }
  if (trend === "rising") {
    return forDigest
      ? "Leaning on guides right now — normal when ideas are new; celebrate persistence."
      : "Guides are helping a lot right now — that's okay while ideas are new.";
  }
  return forDigest
    ? `Using scaffolds while building foundations — keep effort high; independence follows.`
    : `Using helpful scaffolds while building foundations — ${nameLower}r effort still counts.`;
}

/**
 * Trend from older half vs newer half of weights.
 * @param {number[]} weights
 * @returns {'rising'|'falling'|'stable'|'unknown'}
 */
export function adiTrendFromWeights(weights = []) {
  const w = (weights || []).filter((x) => Number.isFinite(Number(x)));
  if (w.length < 4) return "unknown";
  const mid = Math.floor(w.length / 2);
  const older = w.slice(0, mid);
  const newer = w.slice(mid);
  const mean = (arr) => arr.reduce((a, b) => a + Number(b), 0) / arr.length;
  const d = mean(newer) - mean(older);
  if (d <= -0.08) return "falling"; // independence improving
  if (d >= 0.08) return "rising"; // more dependent
  return "stable";
}

/**
 * Core ADI computation from turn-like samples.
 *
 * @param {object[]} turns — newest last preferred
 * @param {object} [opts]
 * @param {number} [opts.window]
 * @param {number} [opts.minSamples]
 * @param {number|null} [opts.topicScore]
 * @param {number|null} [opts.priorAdi] previous ADI for EMA blend
 */
export function computeAdi(turns = [], opts = {}) {
  const window = opts.window ?? ADI_WINDOW;
  const minSamples = opts.minSamples ?? ADI_MIN_SAMPLES;
  const list = Array.isArray(turns) ? turns : [];

  // Prefer graded turns; fall back to any turn with assistance signal
  const graded = list.filter((t) => {
    const c = String(t?.correctness || "").toLowerCase();
    return c === "correct" || c === "partial" || c === "incorrect";
  });
  const pool = graded.length ? graded : list;
  const windowed = pool.slice(-window);

  const weights = windowed.map((t) => assistanceWeightForTurn(t));
  const sampleCount = weights.length;

  if (sampleCount < minSamples) {
    return emptyAdiResult({
      sampleCount,
      topicScore: opts.topicScore,
      reason: "insufficient_samples",
    });
  }

  const raw =
    weights.reduce((a, b) => a + b, 0) / Math.max(1, weights.length);

  // EMA with prior when available (smooth session noise)
  let value = raw;
  if (opts.priorAdi != null && Number.isFinite(Number(opts.priorAdi))) {
    value = Number(opts.priorAdi) * 0.35 + raw * 0.65;
  }
  value = Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

  const independence = Math.round((1 - value) * 1000) / 1000;
  const trend = adiTrendFromWeights(weights);
  const band = adiBand(value);
  const topicScore =
    opts.topicScore != null && Number.isFinite(Number(opts.topicScore))
      ? Number(opts.topicScore)
      : null;

  const solidIndependent = windowed.filter((t) => {
    const c = String(t.correctness || "").toLowerCase();
    const w = assistanceWeightForTurn(t);
    return (c === "correct" || c === "partial") && w < 0.22;
  }).length;

  const helpedSuccess = windowed.filter((t) => {
    const c = String(t.correctness || "").toLowerCase();
    const w = assistanceWeightForTurn(t);
    return (c === "correct" || c === "partial") && w >= 0.35;
  }).length;

  const preferLighterHelp = shouldPreferLighterHelp({
    adi: value,
    topicScore,
    trend,
  });

  return {
    version: ADI_VERSION,
    value,
    /** 0–100 for UI */
    pct: Math.round(value * 100),
    independence,
    independencePct: Math.round(independence * 100),
    band,
    trend,
    sampleCount,
    window: windowed.length,
    solidIndependentCount: solidIndependent,
    helpedSuccessCount: helpedSuccess,
    topicScore,
    preferLighterHelp,
    /** Soft cap for ladder auto-pick (0 = no cap) */
    ladderCap: preferLighterHelp
      ? InterventionLevel.WORKED_EXAMPLE
      : InterventionLevel.BREAK_OR_EASIER,
    copy: adiIndependenceCopy({
      adi: value,
      topicScore,
      trend,
      forDigest: false,
    }),
    digestCopy: adiIndependenceCopy({
      adi: value,
      topicScore,
      trend,
      forDigest: true,
    }),
    reliable: true,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * @param {object} opts
 * @param {number} opts.adi
 * @param {number|null} [opts.topicScore]
 * @param {string} [opts.trend]
 */
export function shouldPreferLighterHelp({
  adi = null,
  topicScore = null,
  trend = "unknown",
} = {}) {
  if (adi == null || !Number.isFinite(Number(adi))) return false;
  const v = Number(adi);
  const score = topicScore != null ? Number(topicScore) : null;
  // Independence growing OR already low ADI with decent mastery
  if (v < 0.32 && trend !== "rising") return true;
  if (v < 0.45 && score != null && score >= 60) return true;
  if (trend === "falling" && v < 0.5) return true;
  // High mastery still heavy on scaffolds → nudge lighter
  if (score != null && score >= 70 && v >= 0.4) return true;
  return false;
}

/**
 * Apply ADI preference to a chosen ladder level (L3.2).
 * Never increases help; may step down one rung when independence is rising.
 *
 * @param {number} level
 * @param {object|null} adiResult
 * @param {object} [opts]
 * @param {boolean} [opts.manual] user picked level — do not fade
 * @param {boolean} [opts.escalate] explicit escalate offer — keep rank
 * @param {boolean} [opts.autoEnter] severe auto path — allow full level
 */
export function applyAdiLadderPreference(
  level,
  adiResult = null,
  { manual = false, escalate = false, autoEnter = false } = {}
) {
  const rank = normalizeLevel(level);
  if (!adiResult?.reliable || manual || escalate) return rank;
  if (!adiResult.preferLighterHelp) return rank;
  // Severe auto-enter: allow up to full guide, still avoid break/easier unless forced
  if (autoEnter) {
    return Math.min(rank, InterventionLevel.FULL_GUIDE);
  }
  const cap =
    adiResult.ladderCap != null
      ? normalizeLevel(adiResult.ladderCap)
      : InterventionLevel.WORKED_EXAMPLE;
  // Soft fade: at most one step down from selected when over cap
  if (rank > cap) {
    return Math.max(InterventionLevel.MICRO_HINT, Math.min(rank - 1, cap));
  }
  return rank;
}

function emptyAdiResult({ sampleCount = 0, topicScore = null, reason = "" } = {}) {
  return {
    version: ADI_VERSION,
    value: null,
    pct: null,
    independence: null,
    independencePct: null,
    band: /** @type {AdiBand} */ ("unknown"),
    trend: "unknown",
    sampleCount,
    window: 0,
    solidIndependentCount: 0,
    helpedSuccessCount: 0,
    topicScore: topicScore != null ? Number(topicScore) : null,
    preferLighterHelp: false,
    ladderCap: InterventionLevel.BREAK_OR_EASIER,
    copy: null,
    digestCopy: null,
    reliable: false,
    reason,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Build turn samples from session tracker turns + optional live intervention.
 */
export function turnsFromSessionSnapshot(sessionSnapshot, intervention = null) {
  const turns = sessionSnapshot?.turns || [];
  const liveLevel =
    intervention?.level ||
    intervention?.context?.level ||
    sessionSnapshot?.intervention?.level ||
    0;
  const liveActive =
    (intervention?.status || sessionSnapshot?.intervention?.status) ===
    "active";

  return turns.map((t) => {
    const sig = t.signals || {};
    // Prefer per-turn snapshot if we stored it; else use session live for recent turns
    const turnLevel =
      sig.interventionLevel ??
      t.interventionLevel ??
      (liveActive ? liveLevel : 0);
    const turnActive =
      sig.interventionActive ??
      t.interventionActive ??
      (liveActive && turnLevel > 0);
    return {
      correctness: sig.correctness,
      isHintRequest: Boolean(sig.isHintRequest),
      interventionLevel: turnLevel,
      interventionActive: turnActive,
      scaffoldingBias:
        sig.scaffoldingBias ?? sessionSnapshot?.scaffoldingBias ?? 0,
    };
  });
}

/**
 * Merge session turns with longitudinal profile behavior proxy when session is thin.
 * Profile alone cannot reconstruct per-turn levels — use rates as synthetic samples.
 */
export function syntheticTurnsFromProfile(profile = null, n = 6) {
  if (!profile) return [];
  const behavior = profile.behavior || {};
  const totals = profile.totals || {};
  const graded =
    (totals.correct || 0) + (totals.incorrect || 0) + (totals.partial || 0);
  if (graded < 1 && !(behavior.hintRate > 0)) return [];

  const hintRate = Number(behavior.hintRate) || 0;
  // Approximate average intervention weight from hint rate + persistence
  const baseAssist = Math.min(0.85, hintRate * 0.9 + 0.05);
  const samples = Math.min(n, Math.max(ADI_MIN_SAMPLES, Math.min(graded, n)));
  const out = [];
  const correct = totals.correct || 0;
  const incorrect = totals.incorrect || 0;
  const partial = totals.partial || 0;
  const mix = [];
  for (let i = 0; i < correct; i++) mix.push("correct");
  for (let i = 0; i < partial; i++) mix.push("partial");
  for (let i = 0; i < incorrect; i++) mix.push("incorrect");
  const slice = mix.slice(-samples);
  while (slice.length < samples) slice.push("partial");

  for (let i = 0; i < samples; i++) {
    const helped = i / samples < hintRate || baseAssist > 0.4;
    out.push({
      correctness: slice[i],
      isHintRequest: helped && hintRate > 0.25,
      interventionActive: helped && baseAssist > 0.35,
      interventionLevel: helped
        ? baseAssist > 0.55
          ? InterventionLevel.FULL_GUIDE
          : InterventionLevel.WORKED_EXAMPLE
        : InterventionLevel.NONE,
      scaffoldingBias: baseAssist,
      synthetic: true,
    });
  }
  return out;
}

/**
 * Full ADI from session + profile context.
 */
export function computeAdiFromContext({
  sessionSnapshot = null,
  intervention = null,
  profile = null,
  topicScore = null,
  priorAdi = null,
} = {}) {
  let turns = turnsFromSessionSnapshot(sessionSnapshot, intervention);
  const graded = turns.filter((t) =>
    ["correct", "partial", "incorrect"].includes(
      String(t.correctness || "").toLowerCase()
    )
  );
  if (graded.length < ADI_MIN_SAMPLES) {
    turns = [...syntheticTurnsFromProfile(profile), ...turns];
  }
  const prior =
    priorAdi != null
      ? priorAdi
      : profile?.behavior?.adi != null
        ? Number(profile.behavior.adi)
        : null;
  const computed = computeAdi(turns, {
    topicScore,
    priorAdi: prior,
  });
  // Fall back to last stored longitudinal ADI for pulse / ladder when window is thin
  if (!computed.reliable && prior != null && Number.isFinite(Number(prior))) {
    const value = Math.round(Math.max(0, Math.min(1, Number(prior))) * 1000) / 1000;
    const trend = profile?.behavior?.adiTrend || "unknown";
    const band =
      profile?.behavior?.adiBand && profile.behavior.adiBand !== "unknown"
        ? profile.behavior.adiBand
        : adiBand(value);
    const preferLighterHelp = shouldPreferLighterHelp({
      adi: value,
      topicScore,
      trend,
    });
    return {
      version: ADI_VERSION,
      value,
      pct: Math.round(value * 100),
      independence: Math.round((1 - value) * 1000) / 1000,
      independencePct:
        profile?.behavior?.independencePct != null
          ? Number(profile.behavior.independencePct)
          : Math.round((1 - value) * 100),
      band,
      trend,
      sampleCount: computed.sampleCount || 0,
      window: 0,
      solidIndependentCount: 0,
      helpedSuccessCount: 0,
      topicScore: topicScore != null ? Number(topicScore) : null,
      preferLighterHelp,
      ladderCap: preferLighterHelp
        ? InterventionLevel.WORKED_EXAMPLE
        : InterventionLevel.BREAK_OR_EASIER,
      copy: adiIndependenceCopy({
        adi: value,
        topicScore,
        trend,
        forDigest: false,
      }),
      digestCopy: adiIndependenceCopy({
        adi: value,
        topicScore,
        trend,
        forDigest: true,
      }),
      reliable: true,
      fromStored: true,
      updatedAt:
        profile?.behavior?.adiUpdatedAt || new Date().toISOString(),
    };
  }
  return computed;
}

/**
 * Compact payload for learning.adi events and profile.behavior.adi.
 */
export function serializeAdi(adiResult) {
  if (!adiResult) return null;
  return {
    version: adiResult.version || ADI_VERSION,
    value: adiResult.value,
    independence: adiResult.independence,
    band: adiResult.band,
    trend: adiResult.trend,
    sampleCount: adiResult.sampleCount,
    preferLighterHelp: Boolean(adiResult.preferLighterHelp),
    reliable: Boolean(adiResult.reliable),
    topicScore: adiResult.topicScore,
    copy: adiResult.copy || null,
    updatedAt: adiResult.updatedAt || new Date().toISOString(),
  };
}

/**
 * Tutor directives derived from ADI (for L2 later / prompt soft hints).
 */
export function adiDirectives(adiResult) {
  if (!adiResult?.reliable) return [];
  const dirs = [];
  if (adiResult.preferLighterHelp) {
    dirs.push(
      "Independence is rising — prefer the lightest helpful scaffold; avoid jumping to full guides."
    );
  }
  if (adiResult.band === "scaffold_heavy" && (adiResult.topicScore || 0) >= 70) {
    dirs.push(
      "Mastery looks solid while help is still heavy — invite a no-hint or micro-hint try soon."
    );
  }
  if (adiResult.trend === "falling" && adiResult.band === "gaining_independence") {
    dirs.push(
      "Celebrate independent success briefly; stretch slightly without adding scaffold."
    );
  }
  return dirs.slice(0, 2);
}
