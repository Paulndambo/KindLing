/**
 * Derive a coarse age band from Kindling grade labels.
 * Used for tutor policy (not precise age verification).
 *
 * Bands:
 * - child   ≈ under 13 (primary / upper primary)
 * - teen    ≈ 13–17 (middle / high school)
 * - adult   ≈ 18+ (higher ed / professional)
 * - unknown → treat as child (most protective default)
 */

/** @typedef {'child' | 'teen' | 'adult' | 'unknown'} AgeBand */

/**
 * @param {string | null | undefined} grade
 * @returns {AgeBand}
 */
export function resolveAgeBand(grade) {
  if (!grade || typeof grade !== "string") return "unknown";
  const g = grade.toLowerCase().trim();

  // Higher ed / adult first
  if (
    g.includes("college") ||
    g.includes("university") ||
    g.includes("graduate") ||
    g.includes("master") ||
    g.includes("doctoral") ||
    g.includes("phd") ||
    g.includes("professional") ||
    g.includes("continuing") ||
    g.includes("undergrad")
  ) {
    return "adult";
  }

  // Explicit high school → teen
  if (g.includes("high school") || g.includes("a-level") || g.includes("gcse")) {
    return "teen";
  }

  // Numeric / ordinal grades
  const numMatch = g.match(/\b(1[0-2]|[3-9])(st|nd|rd|th)?\b/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 3 && n <= 6) return "child";
    if (n >= 7 && n <= 12) return "teen";
  }

  // Year labels (UK-ish)
  const yearMatch = g.match(/\byear\s*(\d{1,2})\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 3 && y <= 7) return "child";
    if (y >= 8 && y <= 13) return "teen";
  }

  if (g.includes("middle school") || g.includes("junior high")) return "teen";
  if (
    g.includes("elementary") ||
    g.includes("primary") ||
    g.includes("grade 3") ||
    g.includes("grade 4") ||
    g.includes("grade 5") ||
    g.includes("grade 6")
  ) {
    return "child";
  }

  // Known Kindling option strings
  if (g.includes("3rd") || g.includes("4th") || g.includes("5th") || g.includes("6th")) {
    return "child";
  }
  if (g.includes("7th") || g.includes("8th") || g.includes("9–10") || g.includes("9-10") || g.includes("11–12") || g.includes("11-12")) {
    return "teen";
  }

  return "unknown";
}

/**
 * Human label for UI / logs (never shameful).
 * @param {AgeBand} band
 */
export function ageBandLabel(band) {
  switch (band) {
    case "child":
      return "younger learner";
    case "teen":
      return "teen learner";
    case "adult":
      return "adult learner";
    default:
      return "learner";
  }
}

/**
 * Whether policies should use the strictest child defaults.
 * @param {AgeBand} band
 */
export function useChildSafeDefaults(band) {
  return band === "child" || band === "unknown";
}
