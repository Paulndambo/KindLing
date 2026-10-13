/**
 * Epic L2 — Pedagogical policy engine (v1)
 *
 * Pure rules: decidePedagogy(learnerState, context) → PedagogicalDecision
 * LLM is the *execution* layer — the prompt must carry out this decision only.
 *
 * Priority (highest first): mode locks → safety/affect → struggle/help →
 * misconception/prereq → calibration/ADI → practice defaults.
 */

import { InterventionLevel, normalizeLevel, levelMeta } from "./interventionLadder";
import { StruggleSignal, SIGNAL_RELIABILITY_THRESHOLD } from "./types";
import { suggestEasierRelatedSkill, buildLocalSkillPath } from "./skillGraph";
import {
  findPracticalGuide,
  isPracticalSkillTopic,
} from "./practicalGuides";

export const PEDAGOGY_POLICY_VERSION = 1;

/**
 * Closed action catalog (G06–G07).
 * Keep ids stable for events / C8 decision-compliance scoring.
 */
export const PedagogicalAction = {
  CONTINUE_SOCRATIC: "CONTINUE_SOCRATIC",
  EXPLAIN: "EXPLAIN",
  MICRO_HINT: "MICRO_HINT",
  WORKED_EXAMPLE: "WORKED_EXAMPLE",
  FULL_GUIDE: "FULL_GUIDE",
  EASIER_PATH: "EASIER_PATH",
  ASSESS: "ASSESS",
  REVIEW: "REVIEW",
  REMEDIATE_MISCONCEPTION: "REMEDIATE_MISCONCEPTION",
  REMEDIATE_PREREQUISITE: "REMEDIATE_PREREQUISITE",
  CHALLENGE: "CHALLENGE",
  SLOW_DOWN: "SLOW_DOWN",
  AFFECT_SUPPORT: "AFFECT_SUPPORT",
  CHECK_UNDERSTANDING: "CHECK_UNDERSTANDING",
  CHANGE_REPRESENTATION: "CHANGE_REPRESENTATION",
  CELEBRATE_PERSISTENCE: "CELEBRATE_PERSISTENCE",
  INDEPENDENT_PRACTICE: "INDEPENDENT_PRACTICE",
  OFFER_BREAK: "OFFER_BREAK",
};

export const PEDAGOGICAL_ACTIONS = Object.values(PedagogicalAction);

/** Human labels for tools / logs (never shame). */
export const ACTION_META = {
  [PedagogicalAction.CONTINUE_SOCRATIC]: {
    label: "Socratic practice",
    short: "Guide with questions",
  },
  [PedagogicalAction.EXPLAIN]: {
    label: "Clear explanation",
    short: "Explain the idea",
  },
  [PedagogicalAction.MICRO_HINT]: {
    label: "Micro-hint",
    short: "One small clue",
  },
  [PedagogicalAction.WORKED_EXAMPLE]: {
    label: "Worked example",
    short: "Show one example",
  },
  [PedagogicalAction.FULL_GUIDE]: {
    label: "Step-by-step guide",
    short: "Walk through together",
  },
  [PedagogicalAction.EASIER_PATH]: {
    label: "Easier path",
    short: "Simpler related skill",
  },
  [PedagogicalAction.ASSESS]: {
    label: "Quick check",
    short: "Low-stakes check",
  },
  [PedagogicalAction.REVIEW]: {
    label: "Spaced review",
    short: "Retrieve prior skill",
  },
  [PedagogicalAction.REMEDIATE_MISCONCEPTION]: {
    label: "Rework a pattern",
    short: "Gentle misconception fix",
  },
  [PedagogicalAction.REMEDIATE_PREREQUISITE]: {
    label: "Strengthen a foundation",
    short: "Walk back a prereq",
  },
  [PedagogicalAction.CHALLENGE]: {
    label: "Fair stretch",
    short: "Richer variant",
  },
  [PedagogicalAction.SLOW_DOWN]: {
    label: "Slow the pace",
    short: "Reason before next try",
  },
  [PedagogicalAction.AFFECT_SUPPORT]: {
    label: "Warm support",
    short: "Normalize & encourage",
  },
  [PedagogicalAction.CHECK_UNDERSTANDING]: {
    label: "Show-your-work check",
    short: "Ask for reasoning",
  },
  [PedagogicalAction.CHANGE_REPRESENTATION]: {
    label: "Different representation",
    short: "New model or story",
  },
  [PedagogicalAction.CELEBRATE_PERSISTENCE]: {
    label: "Celebrate effort",
    short: "Name the bounce-back",
  },
  [PedagogicalAction.INDEPENDENT_PRACTICE]: {
    label: "Independent try",
    short: "Light or no scaffold",
  },
  [PedagogicalAction.OFFER_BREAK]: {
    label: "Offer a break",
    short: "Reset kindly",
  },
};

/** Map ladder rank → pedagogical action */
export function actionFromLadderLevel(level) {
  const rank = normalizeLevel(level);
  if (rank >= InterventionLevel.BREAK_OR_EASIER) {
    return PedagogicalAction.EASIER_PATH;
  }
  if (rank >= InterventionLevel.FULL_GUIDE) return PedagogicalAction.FULL_GUIDE;
  if (rank >= InterventionLevel.WORKED_EXAMPLE) {
    return PedagogicalAction.WORKED_EXAMPLE;
  }
  if (rank >= InterventionLevel.MICRO_HINT) return PedagogicalAction.MICRO_HINT;
  return PedagogicalAction.CONTINUE_SOCRATIC;
}

function newDecisionId() {
  return `pd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Execution instructions the LLM must follow (G08).
 */
export function executionBriefForAction(action, params = {}) {
  const a = action || PedagogicalAction.CONTINUE_SOCRATIC;
  const skill = params.skillLabel || params.prereqLabel || params.topic || "this idea";
  const mc = params.misconceptionLabel || "the sticky pattern";

  switch (a) {
    case PedagogicalAction.REVIEW:
      return `Run a short retrieval practice on «${skill}». One prompt, wait for their try, give brief feedback. Do not teach a brand-new concept.`;
    case PedagogicalAction.CHALLENGE:
      return `Offer one fair stretch problem on «${skill}» — slightly richer than last success. Stay Socratic; celebrate solid reasoning.`;
    case PedagogicalAction.ASSESS:
      return `Invite a low-stakes quick check (or one clear MC-style question in chat if no panel). Score understanding, not speed. No shame.`;
    case PedagogicalAction.MICRO_HINT:
      return `Give exactly one small clue. Stay mostly Socratic. Do not give a full solution or multi-step guide.`;
    case PedagogicalAction.WORKED_EXAMPLE:
      return `Show one short worked example (everyday hook), then invite a twin try. Do not open a full multi-step course guide.`;
    case PedagogicalAction.FULL_GUIDE:
      return params.practicalHowTo
        ? `Hands-on full guide for «${skill}»: short concept → numbered device how-to (complete short procedure OK) → try-it checklist → confirm what they did. Do not withhold steps.`
        : `Walk step-by-step: explain → everyday example → tiny check. One step per message. Never dump the whole solution. For practical computer skills, use numbered how-to steps they can do on a device.`;
    case PedagogicalAction.EASIER_PATH:
      return params.prereqLabel
        ? `Warmly shift to foundation skill «${params.prereqLabel}» with a quick visual win, then bridge back later.`
        : `Offer a softer path or simpler related idea. Normalize the reset. One easy win before returning.`;
    case PedagogicalAction.OFFER_BREAK:
      return `Normalize needing a pause. Offer a short break or easier warm-up. No pressure to push through.`;
    case PedagogicalAction.REMEDIATE_MISCONCEPTION:
      return `Gently rework misconception «${mc}». Use the playbook check question if available. Do not shame. Confirm with one targeted check.`;
    case PedagogicalAction.REMEDIATE_PREREQUISITE:
      return `The current skill needs foundation «${skill}». Warmly walk back: quick prereq practice with a concrete model, then return. Do not plow ahead on the hard skill.`;
    case PedagogicalAction.SLOW_DOWN:
      return `Pace is too fast (guessing). Slow down. Ask them to show one reason or step before the next answer. Short choices OK.`;
    case PedagogicalAction.AFFECT_SUPPORT:
      return `Lead with warmth. Normalize struggle. One tiny next step only. Do not pile on difficulty or long lectures.`;
    case PedagogicalAction.CHECK_UNDERSTANDING:
      return `Confidence may outpace evidence. Ask them to show steps / explain why before stretching difficulty.`;
    case PedagogicalAction.CHANGE_REPRESENTATION:
      return `Try a different representation (story, visual model, or real-world object). Same idea, new packaging.`;
    case PedagogicalAction.CELEBRATE_PERSISTENCE:
      return `Briefly name their effort or bounce-back, then one clear next question. Keep celebration short and sincere.`;
    case PedagogicalAction.INDEPENDENT_PRACTICE:
      return `Independence is rising. Prefer no-hint or micro-hint only. Let them own the try; affirm solid reasoning.`;
    case PedagogicalAction.EXPLAIN:
      return params.practicalHowTo
        ? `Practical how-to for «${skill}»: one-line concept, then numbered steps the student can do on their device, then a try-it check. Show the procedure clearly — do not turn "how do I…?" into a riddle.`
        : `Give a clear mini-explanation with one everyday example, then one check question. Still do not dump a full solution dump. If the skill is hands-on, prefer numbered how-to steps + try-it.`;
    case PedagogicalAction.CONTINUE_SOCRATIC:
    default:
      return params.practicalHowTo
        ? `Practical skill default: after any brief check-in, prioritize a hands-on how-to for «${skill}» (numbered steps + try-it). Guide discovery on reasoning checks, but never withhold procedures.`
        : `Continue adaptive Socratic tutoring: one question at a time, guide before giving, real-world hook when teaching. For hands-on skills, switch to numbered how-to + try-it.`;
  }
}

/**
 * @typedef {object} PedagogicalDecision
 * @property {string} id
 * @property {string} action
 * @property {number} confidence 0–1
 * @property {string[]} reasons
 * @property {object} params
 * @property {string} executionBrief
 * @property {string[]} alternatives ranked other actions
 * @property {object|null} gap desired vs observed
 * @property {number} policyVersion
 */

/**
 * Pure decision function (L2.1).
 *
 * @param {object|null} learnerState — L1 snapshot
 * @param {object} [context]
 */
export function decidePedagogy(learnerState = null, context = {}) {
  const state = learnerState || {};
  const reasons = [];
  const params = {
    subject: context.subject || state.subject || "",
    topic: context.topic || state.topic || "",
  };

  const rawLast = context.lastSignals || null;
  const correctnessReliable =
    (rawLast?.signalEvidence?.correctness?.confidence ??
      rawLast?.correctnessConfidence ??
      0) >= SIGNAL_RELIABILITY_THRESHOLD;
  const affectReliable =
    (rawLast?.signalEvidence?.affect?.confidence ?? 0) >=
    SIGNAL_RELIABILITY_THRESHOLD;
  const last = rawLast
    ? {
        ...rawLast,
        correctness: correctnessReliable
          ? rawLast.correctness
          : "unknown",
        rapidGuess:
          rawLast.rapidGuess &&
          correctnessReliable &&
          rawLast.correctness === "incorrect" &&
          (context.consecutiveRapidGuesses || 0) >= 2,
        affect: affectReliable ? rawLast.affect : null,
      }
    : null;
  const intervention = context.intervention || null;
  const struggle = context.struggleSnapshot || state.behaviour || {};
  const adi = state.adi || context.adi || null;
  const reviewMode = Boolean(context.reviewMode);
  const challengeMode = Boolean(context.challengeMode);
  const multiStepActive = Boolean(context.multiStepActive);
  const assessmentActive = Boolean(context.assessmentActive);
  const dueReview = context.dueReview || null;
  const profile = context.profile || null;
  const consecutiveIncorrect =
    context.consecutiveIncorrect ??
    struggle.consecutiveIncorrect ??
    0;
  const affect =
    context.lastCheckIn?.affect ||
    (affectReliable ? rawLast?.affect : null) ||
    context.affect ||
    null;
  // Only explicit energy signals — bare "frustrated" alone must not skip prereq/help rules
  const lowEnergy = Boolean(
    context.lowEnergy ||
      context.lastCheckIn?.lowEnergy ||
      affect === "disengaged"
  );
  const persistenceScore =
    context.persistenceScore ??
    state.behaviour?.persistenceScore ??
    0;

  // ── Mode locks (highest) ──
  if (assessmentActive) {
    return finalize(PedagogicalAction.ASSESS, {
      reasons: ["assessment_session_active"],
      params,
      confidence: 0.95,
      gap: gapOf("complete_check", "in_assessment"),
    });
  }
  if (multiStepActive) {
    return finalize(PedagogicalAction.CHECK_UNDERSTANDING, {
      reasons: ["multistep_active"],
      params: { ...params, skillLabel: context.multiStepTitle || params.topic },
      confidence: 0.9,
      gap: gapOf("finish_steps", "mid_multistep"),
    });
  }
  if (reviewMode) {
    return finalize(PedagogicalAction.REVIEW, {
      reasons: ["review_spark_mode"],
      params: {
        ...params,
        skillLabel: context.reviewSkillLabel || context.reviewSkill || params.topic,
        skillSlug: context.reviewSkill || null,
      },
      confidence: 0.95,
      gap: gapOf("retrieval_success", "review_session"),
    });
  }
  if (challengeMode) {
    return finalize(PedagogicalAction.CHALLENGE, {
      reasons: ["spark_challenge_mode"],
      params: {
        ...params,
        skillLabel:
          context.challengeSkillLabel ||
          context.challengeSkill ||
          params.topic,
      },
      confidence: 0.92,
      gap: gapOf("solid_stretch", "challenge_session"),
    });
  }

  // Epic L4 — pending independence twin offer / active twin
  if (context.independenceActive) {
    return finalize(PedagogicalAction.INDEPENDENT_PRACTICE, {
      reasons: ["independence_twin_active"],
      params: {
        ...params,
        noScaffold: true,
        transfer: Boolean(context.independenceTransfer),
      },
      confidence: 0.95,
      gap: gapOf("independent_success", "solo_twin"),
    });
  }
  if (context.independenceOffer) {
    return finalize(PedagogicalAction.INDEPENDENT_PRACTICE, {
      reasons: ["independence_twin_offered"],
      params: {
        ...params,
        noScaffold: true,
        transfer: Boolean(context.independenceOffer?.transfer),
      },
      confidence: 0.88,
      gap: gapOf("independent_attempt", "post_scaffold"),
    });
  }

  // Active intervention → execute ladder action
  if (intervention?.status === "active") {
    const level = normalizeLevel(
      intervention.level || intervention.context?.level || 0
    );
    const action = actionFromLadderLevel(level);
    const easier =
      intervention.context?.easierSkill ||
      (action === PedagogicalAction.EASIER_PATH
        ? suggestEasierRelatedSkill(profile, params.subject, params.topic)
        : null);
    if (easier) {
      params.prereqLabel = easier.shortLabel || easier.name;
      params.prereqSlug = easier.slug;
      params.skillLabel = params.prereqLabel;
    }
    reasons.push("intervention_active", `ladder_l${level}`);
    return finalize(action, {
      reasons,
      params: {
        ...params,
        ladderLevel: level,
        ladderId: levelMeta(level).id,
      },
      confidence: 0.9,
      gap: gapOf("ungrounded_success", "scaffolded_path"),
    });
  }

  // ── Affect / energy (after prereq will also handle frustrated+stuck) ──
  if (lowEnergy) {
    if (
      (affect === "frustrated" || context.lastCheckIn?.optionId) &&
      (consecutiveIncorrect >= 2 || (struggle.consecutiveIncorrect || 0) >= 2)
    ) {
      reasons.push("low_energy_plus_struggle");
      return finalize(PedagogicalAction.OFFER_BREAK, {
        reasons,
        params,
        confidence: 0.78,
        gap: gapOf("calm_engagement", "frustrated_stuck"),
      });
    }
    reasons.push("affect_support_needed");
    return finalize(PedagogicalAction.AFFECT_SUPPORT, {
      reasons,
      params,
      confidence: 0.75,
      gap: gapOf("steady_engagement", affect || "low_energy"),
    });
  }

  // Frustrated + multi-miss without explicit low-energy → still offer warm support
  // only when NOT a prereq-walkback candidate (checked next)
  const frustratedStuck =
    affect === "frustrated" &&
    (consecutiveIncorrect >= 2 || last?.correctness === "incorrect");

  // ── Rapid guessing ──
  const rapid =
    last?.rapidGuess ||
    (struggle.consecutiveRapidGuesses || 0) >= 2;
  if (rapid && last?.correctness === "incorrect") {
    reasons.push("rapid_guessing");
    return finalize(PedagogicalAction.SLOW_DOWN, {
      reasons,
      params,
      confidence: 0.82,
      gap: gapOf("reasoned_attempt", "rapid_guess"),
    });
  }

  // ── L2.3 Severe stuck + weak prereq → REMEDIATE_PREREQUISITE ──
  const prereqTarget = findWeakPrerequisite({
    profile,
    subject: params.subject,
    topic: params.topic,
    learnerState: state,
    consecutiveIncorrect,
    last,
  });
  if (prereqTarget) {
    reasons.push("severe_stuck_weak_prereq", prereqTarget.slug);
    return finalize(PedagogicalAction.REMEDIATE_PREREQUISITE, {
      reasons,
      params: {
        ...params,
        prereqSlug: prereqTarget.slug,
        prereqLabel: prereqTarget.shortLabel || prereqTarget.name,
        skillLabel: prereqTarget.shortLabel || prereqTarget.name,
        skillSlug: prereqTarget.slug,
        prereqTopic: prereqTarget.topic || null,
      },
      confidence: 0.84,
      gap: gapOf("prereq_ready", "blocked_or_fragile_foundation"),
      alternatives: [
        PedagogicalAction.EASIER_PATH,
        PedagogicalAction.FULL_GUIDE,
        PedagogicalAction.WORKED_EXAMPLE,
      ],
    });
  }

  if (frustratedStuck && consecutiveIncorrect >= 2) {
    reasons.push("frustrated_stuck_no_prereq");
    return finalize(PedagogicalAction.AFFECT_SUPPORT, {
      reasons,
      params,
      confidence: 0.76,
      gap: gapOf("calm_engagement", "frustrated"),
      alternatives: [PedagogicalAction.FULL_GUIDE, PedagogicalAction.OFFER_BREAK],
    });
  }

  // ── Active misconceptions ──
  const mcs =
    state.misconceptions?.filter((m) => m.isActive !== false) ||
    context.activeMisconceptions ||
    last?.misconceptions ||
    [];
  const supportedMisconception = mcs.find(
    (item) => Number(item?.confidence || 0) >= SIGNAL_RELIABILITY_THRESHOLD
  );
  if (
    supportedMisconception &&
    (last?.correctness === "incorrect" || last?.correctness === "partial")
  ) {
    const top = supportedMisconception;
    reasons.push("active_misconception", top.id || top.label);
    return finalize(PedagogicalAction.REMEDIATE_MISCONCEPTION, {
      reasons,
      params: {
        ...params,
        misconceptionId: top.id,
        misconceptionLabel: top.label,
        checkQuestion: top.checkQuestion || top.playbook?.check_question,
        skillSlug: top.skillSlug || null,
      },
      confidence: Math.min(0.88, 0.55 + (top.confidence || 0.4) * 0.4),
      gap: gapOf("concept_aligned", "misconception_active"),
    });
  }

  // ── Struggle streaks → help ladder actions (offer path) ──
  if (consecutiveIncorrect >= 3 || last?.correctness === "incorrect" && consecutiveIncorrect >= 2) {
    const preferLight = Boolean(adi?.preferLighterHelp);
    if (affect === "frustrated" && consecutiveIncorrect >= 3) {
      reasons.push("frustrated_streak");
      return finalize(
        preferLight
          ? PedagogicalAction.WORKED_EXAMPLE
          : PedagogicalAction.FULL_GUIDE,
        {
          reasons,
          params,
          confidence: 0.8,
          gap: gapOf("supported_success", "multi_incorrect"),
        }
      );
    }
    reasons.push("incorrect_streak");
    return finalize(
      preferLight
        ? PedagogicalAction.MICRO_HINT
        : PedagogicalAction.WORKED_EXAMPLE,
      {
        reasons,
        params,
        confidence: 0.77,
        gap: gapOf("scaffolded_progress", "incorrect_streak"),
      }
    );
  }

  // ── Calibration (L1.3 → L2 policy) ──
  const cal = state.confidence?.calibration || "unknown";
  if (
    cal === "overconfident" &&
    last?.correctness &&
    last.correctness !== "unknown" &&
    last.correctness !== "correct"
  ) {
    reasons.push("overconfident_calibration");
    return finalize(PedagogicalAction.CHECK_UNDERSTANDING, {
      reasons,
      params,
      confidence: 0.74,
      gap: gapOf("calibrated_confidence", "overconfident"),
    });
  }
  if (
    cal === "underconfident" &&
    (state.confidence?.competence || 0) >= 0.55 &&
    (last?.correctness === "correct" || last?.correctness === "partial")
  ) {
    reasons.push("underconfident_but_capable");
    return finalize(PedagogicalAction.CHALLENGE, {
      reasons,
      params: {
        ...params,
        skillLabel: state.knowledge?.primarySkills?.[0]?.shortLabel || params.topic,
      },
      confidence: 0.72,
      gap: gapOf("confident_competence", "underconfident"),
    });
  }

  // ── ADI independence ──
  if (
    adi?.preferLighterHelp &&
    (last?.correctness === "correct" ||
      (state.knowledge?.topicScore || 0) >= 60)
  ) {
    reasons.push("adi_prefer_lighter");
    return finalize(PedagogicalAction.INDEPENDENT_PRACTICE, {
      reasons,
      params,
      confidence: 0.7,
      gap: gapOf("independent_success", "fading_support"),
    });
  }

  // ── Persistence celebration (soft, non-blocking) ──
  if (
    persistenceScore >= 2 &&
    (last?.correctness === "correct" || last?.correctness === "partial") &&
    context.justPersisted
  ) {
    reasons.push("persistence_moment");
    return finalize(PedagogicalAction.CELEBRATE_PERSISTENCE, {
      reasons,
      params,
      confidence: 0.68,
      gap: gapOf("motivated_continue", "effort_shown"),
    });
  }

  // ── Short answers / low typing → lighter interaction ──
  if (
    state.interaction?.lowTypingTolerance ||
    state.behaviour?.flags?.includes("short_answers")
  ) {
    if (last?.correctness === "incorrect") {
      reasons.push("short_answers_struggle");
      return finalize(PedagogicalAction.CHANGE_REPRESENTATION, {
        reasons,
        params,
        confidence: 0.65,
        gap: gapOf("accessible_response", "low_typing"),
      });
    }
  }

  // ── Due review (soft, only if idle/opening) ──
  if (dueReview && !last && context.sessionPhase === "open") {
    reasons.push("due_review_available");
    return finalize(PedagogicalAction.REVIEW, {
      reasons,
      params: {
        ...params,
        skillLabel: dueReview.skillLabel || dueReview.skillSlug,
        skillSlug: dueReview.skillSlug,
      },
      confidence: 0.6,
      gap: gapOf("spaced_retrieval", "due_item"),
      alternatives: [
        PedagogicalAction.CONTINUE_SOCRATIC,
        PedagogicalAction.ASSESS,
      ],
    });
  }

  // ── Exploring / questions → explain lightly ──
  if (last?.correctness === "exploring" || last?.isQuestion) {
    reasons.push("student_exploring");
    const practicalQ = isPracticalSkillTopic(params.topic, params.subject);
    const guideQ = practicalQ
      ? findPracticalGuide({ topic: params.topic, subject: params.subject })
      : null;
    return finalize(PedagogicalAction.EXPLAIN, {
      reasons: practicalQ
        ? [...reasons, "practical_how_to_question"]
        : reasons,
      params: {
        ...params,
        practicalHowTo: practicalQ,
        skillLabel: guideQ?.title || params.topic,
        guideId: guideQ?.id || null,
      },
      confidence: practicalQ ? 0.72 : 0.62,
      gap: gapOf(
        practicalQ ? "can_do_procedure" : "concept_clarity",
        "curious_question"
      ),
    });
  }

  // ── Practical skill topics → how-to early (before pure theory loops) ──
  const practicalSkill =
    isPracticalSkillTopic(params.topic, params.subject) ||
    Boolean(context.preferPracticalHowTo);
  const guide = practicalSkill
    ? findPracticalGuide({ topic: params.topic, subject: params.subject })
    : null;
  const sessionPhase = context.sessionPhase || "";
  const howToRequest =
    Boolean(context.preferPracticalHowTo) &&
    (last?.isQuestion ||
      /how\s+(do|to|can)|show\s+me|step\s*by\s*step|walk\s+me/i.test(
        String(last?.studentText || last?.text || "")
      ));
  const earlyPractical =
    practicalSkill &&
    (context.isFirstSession ||
      sessionPhase === "open" ||
      sessionPhase === "orient" ||
      !last ||
      howToRequest);
  if (earlyPractical) {
    reasons.push("practical_skill_howto");
    return finalize(PedagogicalAction.EXPLAIN, {
      reasons,
      params: {
        ...params,
        practicalHowTo: true,
        skillLabel: guide?.title || params.topic,
        guideId: guide?.id || null,
      },
      confidence: 0.7,
      gap: gapOf("can_do_procedure", "theory_without_practice"),
      alternatives: [
        PedagogicalAction.FULL_GUIDE,
        PedagogicalAction.CONTINUE_SOCRATIC,
        PedagogicalAction.WORKED_EXAMPLE,
      ],
    });
  }

  // ── Default Socratic (still mark practical topics so briefs keep how-to ready) ──
  reasons.push("default_socratic");
  const defaultParams = practicalSkill
    ? {
        ...params,
        practicalHowTo: true,
        skillLabel: guide?.title || params.topic,
        guideId: guide?.id || null,
      }
    : params;
  return finalize(PedagogicalAction.CONTINUE_SOCRATIC, {
    reasons: practicalSkill
      ? [...reasons, "practical_topic_keep_howto_ready"]
      : reasons,
    params: defaultParams,
    confidence: 0.55,
    gap: gapOf(
      practicalSkill ? "can_do_procedure" : "steady_learning",
      "routine_turn"
    ),
    alternatives: rankAlternatives(state, context),
  });
}

/**
 * L2.3 — weak required prereq when severely stuck.
 */
export function findWeakPrerequisite({
  profile = null,
  subject = "",
  topic = "",
  learnerState = null,
  consecutiveIncorrect = 0,
  last = null,
} = {}) {
  const stuck =
    consecutiveIncorrect >= 3 ||
    (consecutiveIncorrect >= 2 && last?.correctness === "incorrect") ||
    (last?.affect === "frustrated" && consecutiveIncorrect >= 2);
  if (!stuck) return null;

  const path =
    learnerState?.knowledge?.skills?.length
      ? {
          skills: learnerState.knowledge.skills,
          hasGraph: true,
        }
      : buildLocalSkillPath(profile, subject, topic);
  if (!path?.hasGraph) {
    // Still try easier skill helper
    return suggestEasierRelatedSkill(profile, subject, topic);
  }

  // Blocking prereqs on primary skills
  for (const s of path.skills || []) {
    if (!s.isPrimary && s.score != null && s.score > 45) continue;
    const blockers = s.blockingPrereqs || [];
    if (blockers.length) {
      const b = blockers[0];
      return {
        slug: b.slug,
        name: b.name,
        shortLabel: b.shortLabel || b.name,
        score: b.score,
        topic: b.topic || null,
        reason: "blocking_prereq",
      };
    }
  }

  // Fragile primary with known weaker prereq via helper
  const primaries = (path.skills || []).filter((s) => s.isPrimary);
  const weak = primaries.find((s) => (s.score ?? 50) < 40);
  if (weak || consecutiveIncorrect >= 3) {
    return suggestEasierRelatedSkill(profile, subject, topic);
  }
  return null;
}

function gapOf(desired, observed) {
  return { desired, observed };
}

function finalize(
  action,
  {
    reasons = [],
    params = {},
    confidence = 0.5,
    gap = null,
    alternatives = [],
  } = {}
) {
  const meta = ACTION_META[action] || ACTION_META[PedagogicalAction.CONTINUE_SOCRATIC];
  return {
    id: newDecisionId(),
    action,
    label: meta.label,
    shortLabel: meta.short,
    confidence: Math.round(confidence * 1000) / 1000,
    reasons: reasons.filter(Boolean),
    params,
    executionBrief: executionBriefForAction(action, params),
    alternatives: (alternatives || []).filter((a) => a && a !== action).slice(0, 4),
    gap,
    policyVersion: PEDAGOGY_POLICY_VERSION,
    decidedAt: new Date().toISOString(),
  };
}

function rankAlternatives(state, context) {
  const alts = [];
  if (state.adi?.preferLighterHelp) alts.push(PedagogicalAction.INDEPENDENT_PRACTICE);
  if (state.misconceptions?.length) alts.push(PedagogicalAction.REMEDIATE_MISCONCEPTION);
  if (context.dueReview) alts.push(PedagogicalAction.REVIEW);
  alts.push(PedagogicalAction.MICRO_HINT, PedagogicalAction.ASSESS);
  return alts;
}

/**
 * Mandatory prompt block — LLM executes this decision only (G08).
 */
export function buildPedagogyPromptBlock(decision) {
  if (!decision?.action) return "";
  const meta = ACTION_META[decision.action] || {};
  const alts =
    decision.alternatives?.length > 0
      ? decision.alternatives.join(", ")
      : "none";
  const gap = decision.gap
    ? `Desired: ${decision.gap.desired} · Observed: ${decision.gap.observed}`
    : "";
  return `
## Pedagogical decision (Kindling policy engine — EXECUTE ONLY THIS MOVE)
- Decision id: ${decision.id}
- Action: **${decision.action}** (${meta.label || decision.label || ""})
- Confidence: ${decision.confidence ?? "—"}
- Why (internal — never read aloud as scores): ${(decision.reasons || []).join(", ") || "policy"}
${gap ? `- Control gap: ${gap}` : ""}
- **Your job this turn:** ${decision.executionBrief}
- Do **not** freestyle a different major move (no unsolicited full solutions, topic jumps, or unrelated quizzes).
- You may still be warm, use real-world hooks, and attach 3–5 suggestion chips.
- Allowed micro-flex only if safety requires it; otherwise stay on **${decision.action}**.
- Other candidates considered (do not switch unless student clearly needs safety): ${alts}
`.trim();
}

/**
 * Short directives list derived from decision (merges into insights.directives).
 */
export function pedagogyDirectives(decision) {
  if (!decision?.action) return [];
  const dirs = [
    `Pedagogical move this turn: ${decision.action} — ${decision.executionBrief}`,
  ];
  if (decision.action === PedagogicalAction.REMEDIATE_PREREQUISITE) {
    dirs.push(
      `Foundation focus: «${decision.params?.prereqLabel || "prerequisite"}» before returning to the hard skill.`
    );
  }
  if (decision.action === PedagogicalAction.INDEPENDENT_PRACTICE) {
    dirs.push("Prefer micro-hint or none — independence is the goal.");
  }
  return dirs.slice(0, 3);
}

/**
 * Compact event payload for pedagogy.decision
 */
export function serializePedagogyDecision(decision, extras = {}) {
  if (!decision) return null;
  return {
    decisionId: decision.id,
    action: decision.action,
    label: decision.label,
    confidence: decision.confidence,
    reasons: decision.reasons || [],
    params: decision.params || {},
    executionBrief: decision.executionBrief,
    alternatives: decision.alternatives || [],
    gap: decision.gap || null,
    policyVersion: decision.policyVersion || PEDAGOGY_POLICY_VERSION,
    decidedAt: decision.decidedAt,
    ...extras,
  };
}

/**
 * L2.4 — ranked next-best actions for dashboard / home (thin).
 * Returns [{ action, score, label, reason, cta, href? }]
 */
export function rankNextBestActions({
  learnerState = null,
  dueReviews = [],
  recommendedSkill = null,
  focusAreas = [],
  canAssess = true,
  subject = "",
  topic = "",
} = {}) {
  const state = learnerState || {};
  const items = [];

  const due = Array.isArray(dueReviews) ? dueReviews : [];
  if (due.length) {
    const d = due[0];
    items.push({
      action: PedagogicalAction.REVIEW,
      score: 0.92,
      label: "Review today",
      reason: `Spaced practice on ${d.skillLabel || d.skillSlug || "a due skill"}`,
      cta: "Start review spark",
      skillSlug: d.skillSlug || null,
      kind: "review",
    });
  }

  if (state.adi?.preferLighterHelp && (state.knowledge?.topicScore || 0) >= 55) {
    items.push({
      action: PedagogicalAction.INDEPENDENT_PRACTICE,
      score: 0.78,
      label: "Independent practice",
      reason: "Independence is rising — try with lighter help",
      cta: "Continue lesson",
      kind: "lesson",
    });
  }

  if (state.confidence?.calibration === "underconfident") {
    items.push({
      action: PedagogicalAction.CHALLENGE,
      score: 0.74,
      label: "Fair stretch",
      reason: "Stronger than it feels — a gentle challenge fits",
      cta: "Try a spark challenge",
      kind: "challenge",
    });
  }

  if (state.misconceptions?.length) {
    items.push({
      action: PedagogicalAction.REMEDIATE_MISCONCEPTION,
      score: 0.8,
      label: "Rework a sticky idea",
      reason: state.misconceptions[0].label || "Pattern to gently fix",
      cta: "Open lesson",
      kind: "lesson",
    });
  }

  if (recommendedSkill) {
    items.push({
      action: PedagogicalAction.CONTINUE_SOCRATIC,
      score: 0.7,
      label: recommendedSkill.shortLabel || recommendedSkill.name || "Next skill",
      reason: "Recommended next skill on your path",
      cta: "Practice skill",
      skillSlug: recommendedSkill.slug,
      kind: "skill",
    });
  }

  if (canAssess && (state.knowledge?.topicAttempts || 0) >= 2) {
    items.push({
      action: PedagogicalAction.ASSESS,
      score: 0.55,
      label: "Quick check",
      reason: "Low-stakes check on this lesson’s idea",
      cta: "Start quick check",
      kind: "assess",
    });
  }

  const focus = [
    ...(Array.isArray(focusAreas) ? focusAreas : []),
    ...(Array.isArray(state.knowledge?.focusAreas)
      ? state.knowledge.focusAreas
      : []),
  ].find((item) => {
    if (!item || typeof item !== "object" || !item.topic || !item.subject) {
      return false;
    }
    return (
      String(item.subject).trim().toLocaleLowerCase() ===
        String(subject || "").trim().toLocaleLowerCase() &&
      String(item.topic).trim().toLocaleLowerCase() ===
        String(topic || "").trim().toLocaleLowerCase()
    );
  });
  if (focus) {
    const label = focus.topic;
    if (label) {
      items.push({
        action: PedagogicalAction.CONTINUE_SOCRATIC,
        score: 0.5,
        label: `Practice: ${label}`,
        reason: "Gentle focus area",
        cta: "Open lesson",
        kind: "focus",
        topic: focus.topic,
        subject: focus.subject,
      });
    }
  }

  // Always have a default continue
  if (!items.length) {
    items.push({
      action: PedagogicalAction.CONTINUE_SOCRATIC,
      score: 0.4,
      label: topic || subject || "Continue learning",
      reason: "Keep the spark going with a short lesson",
      cta: "Start a lesson",
      kind: "default",
    });
  }

  items.sort((a, b) => b.score - a.score);
  // Dedupe by action+label
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const k = `${it.action}:${it.label}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out.slice(0, 5);
}

/**
 * Map struggle reason / intervention decision into pedagogy action (bridge B2).
 */
export function pedagogyActionFromStruggleReason(reason, level = 0) {
  if (reason === StruggleSignal.RAPID_GUESSING) return PedagogicalAction.SLOW_DOWN;
  if (reason === StruggleSignal.FRUSTRATION) return PedagogicalAction.AFFECT_SUPPORT;
  if (reason === StruggleSignal.TOPIC_THRASHING) return PedagogicalAction.EASIER_PATH;
  if (reason === "escalate") return actionFromLadderLevel(level);
  return actionFromLadderLevel(level || InterventionLevel.MICRO_HINT);
}
