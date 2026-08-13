/**
 * Topic / subject familiarity levels — drive first-session pacing.
 * Values match backend curriculum.Topic.Familiarity.
 */

export const FAMILIARITY_LEVELS = [
  {
    id: "new",
    label: "Brand new",
    short: "New",
    hint: "Never studied this before",
    pacing: "gentle_intro",
  },
  {
    id: "beginner",
    label: "I've heard of it",
    short: "Beginner",
    hint: "Know the name, not the details",
    pacing: "gentle_intro",
  },
  {
    id: "some",
    label: "I know the basics",
    short: "Basics",
    hint: "Ready to build on foundations",
    pacing: "refresh_then_build",
  },
  {
    id: "comfortable",
    label: "Fairly comfortable",
    short: "Comfortable",
    hint: "Want depth, challenge, or polish",
    pacing: "goal_focused",
  },
  {
    id: "reviewing",
    label: "Reviewing / exam prep",
    short: "Review",
    hint: "Refresh and practice for a test",
    pacing: "review",
  },
];

export const DEFAULT_FAMILIARITY = "new";

export function familiarityMeta(id) {
  return (
    FAMILIARITY_LEVELS.find((f) => f.id === id) ||
    FAMILIARITY_LEVELS.find((f) => f.id === DEFAULT_FAMILIARITY)
  );
}

/** Human labels for chips / prompts */
export function familiarityLabel(id) {
  return familiarityMeta(id)?.label || "Brand new";
}
