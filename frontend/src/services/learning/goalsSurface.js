/**
 * Epic C5 lite — Goals surface helpers.
 * Surfaces topic/subject learning_goal + familiarity + optional week focus.
 * Not a planner (no exam timelines / guardian contracts).
 */

import { familiarityMeta, familiarityLabel } from "../../constants/familiarity";

export const WEEK_FOCUS_MAX = 240;
export const LEARNING_GOAL_PREVIEW_MAX = 120;

/**
 * Normalize a topic/subject/student goal bundle for UI + tutor.
 *
 * @param {object} opts
 * @param {string} [opts.topicName]
 * @param {string} [opts.subjectName]
 * @param {{ familiarity?: string, learningGoal?: string, learning_goal?: string } | null} [opts.topic]
 * @param {{ learningGoal?: string, learning_goal?: string } | null} [opts.subject]
 * @param {{ goal?: string, weekFocus?: string, week_focus?: string } | null} [opts.student]
 * @param {boolean} [opts.isFirstSession]
 */
export function resolveLessonGoals({
  topicName = "",
  subjectName = "",
  topic = null,
  subject = null,
  student = null,
  isFirstSession = false,
} = {}) {
  const familiarityRaw = String(
    topic?.familiarity || topic?.Familiarity || "new"
  )
    .trim()
    .toLowerCase();
  const fam = familiarityMeta(familiarityRaw);
  const topicGoal = String(
    topic?.learningGoal ?? topic?.learning_goal ?? ""
  ).trim();
  const subjectGoal = String(
    subject?.learningGoal ?? subject?.learning_goal ?? ""
  ).trim();
  const profileGoal = String(student?.goal || "").trim();
  const weekFocus = String(
    student?.weekFocus ?? student?.week_focus ?? ""
  ).trim();

  /** Prefer topic goal, then subject, then profile long-term goal */
  const effectiveGoal = topicGoal || subjectGoal || "";
  const goalSource = topicGoal
    ? "topic"
    : subjectGoal
      ? "subject"
      : profileGoal
        ? "profile"
        : "none";

  return {
    topicName: topicName || "",
    subjectName: subjectName || "",
    familiarity: fam?.id || "new",
    familiarityLabel: fam?.label || familiarityLabel(familiarityRaw),
    familiarityShort: fam?.short || "New",
    topicGoal,
    subjectGoal,
    /** Longer-term onboarding goal (dashboard / soft context) */
    profileGoal,
    /** Topic or subject learning focus (lesson-level) */
    effectiveGoal,
    weekFocus,
    goalSource,
    isFirstSession: Boolean(isFirstSession),
    hasAnyGoal: Boolean(effectiveGoal || weekFocus || profileGoal),
    hasLessonGoal: Boolean(effectiveGoal),
  };
}

/**
 * TopicContext shape consumed by gemini.normalizeTopicContext / prompts.
 */
export function goalsToTopicContext(goals) {
  if (!goals) {
    return {
      familiarity: "new",
      learningGoal: "",
      subjectGoal: "",
      weekFocus: "",
      profileGoal: "",
      isFirstSession: false,
    };
  }
  return {
    familiarity: goals.familiarity || "new",
    learningGoal: goals.topicGoal || goals.effectiveGoal || "",
    subjectGoal: goals.subjectGoal || "",
    weekFocus: goals.weekFocus || "",
    profileGoal: goals.profileGoal || "",
    isFirstSession: Boolean(goals.isFirstSession),
  };
}

/**
 * Truncate goal text for chips.
 */
export function truncateGoal(text, max = LEARNING_GOAL_PREVIEW_MAX) {
  const s = String(text || "").trim();
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/**
 * One-line orientation copy for lesson header / path chip.
 */
export function formatGoalsOrientationLine(goals) {
  if (!goals) return "";
  const bits = [];
  if (goals.familiarityShort) {
    bits.push(goals.familiarityShort);
  }
  if (goals.effectiveGoal) {
    bits.push(truncateGoal(goals.effectiveGoal, 80));
  } else if (goals.weekFocus) {
    bits.push(`This week: ${truncateGoal(goals.weekFocus, 70)}`);
  }
  return bits.join(" · ");
}

/**
 * Extra tutor directive lines for week focus / profile goal
 * (topic intent block already covers topic/subject goal + familiarity).
 */
export function buildWeekFocusPromptLines(goalsOrStudent) {
  const weekFocus = String(
    goalsOrStudent?.weekFocus ??
      goalsOrStudent?.week_focus ??
      ""
  ).trim();
  const profileGoal = String(goalsOrStudent?.profileGoal ?? goalsOrStudent?.goal ?? "").trim();
  const lines = [];
  if (weekFocus) {
    lines.push(
      `Student's weekly focus line: "${weekFocus}". Weave this into orientation and check-ins when natural; do not force it every turn.`
    );
  }
  if (profileGoal) {
    lines.push(
      `Longer-term hope from their profile: "${profileGoal}". Keep it as soft background motivation.`
    );
  }
  return lines;
}

/**
 * B8 reflection body may lightly echo the lesson goal.
 */
export function goalEchoForReflection(goals, topic = "this topic") {
  const g = goals?.effectiveGoal || goals?.topicGoal || "";
  const week = goals?.weekFocus || "";
  if (g) {
    return `You set out to “${truncateGoal(g, 90)}” on ${topic}. What landed?`;
  }
  if (week) {
    return `This week’s focus was “${truncateGoal(week, 90)}”. What landed in ${topic}?`;
  }
  return null;
}

/**
 * Sanitize week focus before PATCH.
 */
export function sanitizeWeekFocus(value) {
  return String(value ?? "")
    .trim()
    .slice(0, WEEK_FOCUS_MAX);
}
