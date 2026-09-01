/**
 * Epic B8 — End-of-session reflection (“what clicked / what’s next?”).
 * Thin wrap-up ritual; never blocks crash/error exits.
 */

/** What felt useful / true about this session. */
export const REFLECTION_CLICKED_OPTIONS = [
  {
    id: "clicked",
    label: "Something clicked",
    emoji: "💡",
    note: "A key idea landed",
  },
  {
    id: "tried",
    label: "I gave it a real try",
    emoji: "💪",
    note: "Effort and stick-with-it",
  },
  {
    id: "fuzzy",
    label: "Still a bit fuzzy",
    emoji: "🌫️",
    note: "Honest about unfinished understanding",
  },
  {
    id: "unsure",
    label: "Not sure yet",
    emoji: "🤔",
    note: "Still figuring it out",
  },
];

/** Sensible next step after wrap-up. */
export const REFLECTION_NEXT_OPTIONS = [
  {
    id: "continue",
    label: "Continue this topic",
    emoji: "➡️",
    kind: "continue_topic",
  },
  {
    id: "practice",
    label: "Practice this again soon",
    emoji: "🔁",
    kind: "review",
  },
  {
    id: "rest",
    label: "Rest for now",
    emoji: "🌿",
    kind: "rest",
  },
];

export function getClickedOption(id) {
  return REFLECTION_CLICKED_OPTIONS.find((o) => o.id === id) || null;
}

export function getNextOption(id) {
  return REFLECTION_NEXT_OPTIONS.find((o) => o.id === id) || null;
}

/**
 * Build card copy for the wrap-up UI.
 * Epic C5 — when a lesson goal / week focus exists, echo it lightly.
 *
 * @param {object} opts
 * @param {string} [opts.topic]
 * @param {string} [opts.subject]
 * @param {number} [opts.now]
 * @param {string} [opts.learningGoal] topic/subject goal text
 * @param {string} [opts.weekFocus]
 * @param {string} [opts.goalEchoBody] prebuilt body override
 */
export function buildSessionReflectionCard({
  topic = "this topic",
  subject = "",
  now = Date.now(),
  learningGoal = "",
  weekFocus = "",
  goalEchoBody = "",
} = {}) {
  const goal = String(learningGoal || "").trim();
  const week = String(weekFocus || "").trim();
  let body =
    goalEchoBody ||
    `Take ~10 seconds — what landed in “${topic}”? No wrong answers.`;
  if (!goalEchoBody && goal) {
    body = `You aimed at “${goal.length > 90 ? `${goal.slice(0, 89)}…` : goal}” on ${topic}. What landed?`;
  } else if (!goalEchoBody && week) {
    body = `This week’s focus: “${week.length > 90 ? `${week.slice(0, 89)}…` : week}”. What landed in ${topic}?`;
  }

  return {
    reason: "session_end",
    headline: "Quick wrap-up",
    body,
    eyebrow: "Before you go",
    topic,
    subject,
    learningGoal: goal,
    weekFocus: week,
    clickedOptions: REFLECTION_CLICKED_OPTIONS,
    nextOptions: REFLECTION_NEXT_OPTIONS,
    openedAt: now,
  };
}

/**
 * One-line note for resume / next open (encouraging, never shame).
 */
export function formatReflectionNote({
  clickedId = null,
  nextId = null,
  freeNote = "",
  topic = "this topic",
} = {}) {
  const free = String(freeNote || "").trim().slice(0, 200);
  if (free) return free;

  const clicked = getClickedOption(clickedId);
  const next = getNextOption(nextId);
  const bits = [];
  if (clicked?.id === "clicked") bits.push(`Something clicked on ${topic}`);
  else if (clicked?.id === "tried") bits.push(`Real effort on ${topic}`);
  else if (clicked?.id === "fuzzy") bits.push(`${topic} still feels fuzzy — that's okay`);
  else if (clicked?.id === "unsure") bits.push(`Still exploring ${topic}`);

  if (next?.id === "practice") bits.push("wants to practice again soon");
  else if (next?.id === "continue") bits.push("ready to continue next time");
  else if (next?.id === "rest") bits.push("choosing rest for now");

  if (!bits.length) return "";
  return bits.join(" · ");
}

/**
 * Tutor directives from last session reflection (next open).
 */
export function reflectionDirectivesFromLast(lastReflection = null) {
  if (!lastReflection || lastReflection.skipped) return [];
  const directives = [];
  const note = lastReflection.note || formatReflectionNote(lastReflection);
  if (note) {
    directives.push(
      `Last session reflection (use silently, warmly): ${note}. Do not quiz them about the reflection card.`
    );
  }
  if (lastReflection.clickedId === "fuzzy" || lastReflection.clickedId === "unsure") {
    directives.push(
      "Open with a gentle recap of one small idea from last time before new challenge."
    );
  }
  if (lastReflection.clickedId === "clicked") {
    directives.push(
      "They felt something click last time — briefly celebrate that and build one step further."
    );
  }
  if (lastReflection.nextId === "practice") {
    directives.push(
      "They wanted more practice — offer a short warm-up on the same skill before stretching."
    );
  }
  if (lastReflection.nextId === "rest") {
    directives.push(
      "They chose rest last time — keep the first turns light and optional depth."
    );
  }
  return directives;
}

/**
 * Thin Review-spark style CTA until full C1 ships.
 * Returns null when nothing sensible to offer.
 *
 * @returns {{ kind: string, label: string, subject?: string, topic?: string, hrefTab?: string } | null}
 */
export function suggestReviewSparkCta({
  profile = null,
  subject = "",
  topic = "",
  nextId = null,
  clickedId = null,
} = {}) {
  // Student explicitly chose rest — no review push
  if (nextId === "rest") return null;

  const topicLabel = topic || "this topic";
  const wantsPractice =
    nextId === "practice" ||
    clickedId === "fuzzy" ||
    clickedId === "unsure";

  // Local mastery / focus heuristic (C1 will replace with scheduled due items)
  let weakLocal = false;
  if (profile && subject && topic) {
    const key = `${subject}::${topic}`.toLowerCase();
    const masteryEntry =
      profile.mastery?.[key] ||
      Object.entries(profile.mastery || {}).find(
        ([k]) =>
          k.toLowerCase().includes(String(topic).toLowerCase()) ||
          k.toLowerCase() === key
      )?.[1];
    const score =
      typeof masteryEntry === "number"
        ? masteryEntry
        : masteryEntry?.score ?? masteryEntry?.p ?? null;
    if (score != null && score < 0.55) weakLocal = true;

    const focusHit = (profile.focusAreas || []).some((f) => {
      const t = typeof f === "string" ? f : f?.topic || "";
      return t && String(t).toLowerCase().includes(String(topic).toLowerCase());
    });
    if (focusHit) weakLocal = true;
  }

  if (!wantsPractice && !weakLocal && nextId !== "continue") {
    return null;
  }

  if (nextId === "continue" && !weakLocal && !wantsPractice) {
    return {
      kind: "continue_topic",
      label: `Continue ${topicLabel}`,
      subject,
      topic,
      hrefTab: "lesson",
    };
  }

  // Prefer "Review spark" language so C1 can attach later
  return {
    kind: "review_spark",
    label: weakLocal || wantsPractice
      ? `Review spark: ${topicLabel}`
      : `Practice ${topicLabel} again`,
    subject,
    topic,
    hrefTab: "lesson",
    due: Boolean(weakLocal || wantsPractice),
  };
}

/**
 * Whether wrap-up reflection should be offered (natural end with substance).
 */
export function shouldOfferSessionReflection({
  turnCount = 0,
  messageCount = 0,
  alreadyReflected = false,
  forced = false,
  isErrorExit = false,
} = {}) {
  if (isErrorExit) return false;
  if (alreadyReflected && !forced) return false;
  // Need some real activity
  return turnCount >= 1 || messageCount >= 2;
}
