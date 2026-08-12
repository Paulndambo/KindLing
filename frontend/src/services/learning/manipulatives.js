/**
 * Interactive visual models for pilot math (Epic A6).
 *
 * Tutor can drive state with a hidden tag (stripped before display):
 *   ⟦visual type="fraction-bar" num="3" den="4"⟧
 *   ⟦visual type="number-line" num="1" den="2"⟧
 */

export const VISUAL_TAG_RE =
  /⟦\s*visual\b([^⟧]*)⟧|\[\[\s*visual\s*:?\s*([^\]]+)\]\]/gi;

export const MANIPULATIVE_TYPES = {
  FRACTION_BAR: "fraction-bar",
  NUMBER_LINE: "number-line",
};

/** Topics that unlock each manipulative */
export const TOPIC_MANIPULATIVES = {
  "Fraction sense": [MANIPULATIVE_TYPES.FRACTION_BAR],
  "Fractions on a number line": [
    MANIPULATIVE_TYPES.NUMBER_LINE,
    MANIPULATIVE_TYPES.FRACTION_BAR,
  ],
  "Equivalent fractions": [MANIPULATIVE_TYPES.FRACTION_BAR],
  "Comparing fractions": [
    MANIPULATIVE_TYPES.FRACTION_BAR,
    MANIPULATIVE_TYPES.NUMBER_LINE,
  ],
  "Adding fractions": [MANIPULATIVE_TYPES.FRACTION_BAR],
};

export function stripVisualTags(text) {
  if (!text) return "";
  return String(text)
    .replace(VISUAL_TAG_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parse the last visual directive from tutor text.
 * @returns {{ type: string, num: number, den: number, label?: string } | null}
 */
export function parseVisualDirective(tutorText) {
  const text = String(tutorText || "");
  let last = null;
  const re = new RegExp(VISUAL_TAG_RE.source, "gi");
  let m;
  while ((m = re.exec(text)) !== null) {
    const body = (m[1] || m[2] || "").trim();
    const typeM = body.match(/type\s*=\s*["']?([a-z0-9-]+)["']?/i);
    const numM = body.match(/num(?:erator)?\s*=\s*["']?(-?\d+)["']?/i);
    const denM = body.match(/den(?:ominator)?\s*=\s*["']?(\d+)["']?/i);
    const labelM = body.match(/label\s*=\s*["']([^"']+)["']/i);

    let type = typeM?.[1]?.toLowerCase() || MANIPULATIVE_TYPES.FRACTION_BAR;
    if (type === "fraction" || type === "bar" || type === "bars") {
      type = MANIPULATIVE_TYPES.FRACTION_BAR;
    }
    if (type === "line" || type === "numberline") {
      type = MANIPULATIVE_TYPES.NUMBER_LINE;
    }

    let num = numM ? parseInt(numM[1], 10) : 1;
    let den = denM ? parseInt(denM[1], 10) : 4;
    if (!Number.isFinite(den) || den < 1) den = 4;
    if (den > 24) den = 24;
    if (!Number.isFinite(num) || num < 0) num = 0;
    if (num > den * 2) num = den * 2;

    last = {
      type,
      num,
      den,
      label: labelM?.[1] || null,
      raw: m[0],
    };
  }

  // Light natural-language fallback (no tag)
  if (!last) {
    const nl = text.match(
      /\b(?:show|move|set|try)\b[^.!?]{0,40}\b(\d+)\s*\/\s*(\d+)\b/i
    );
    if (nl && /fraction|bar|line|visual|model/i.test(text)) {
      last = {
        type: /line/i.test(text)
          ? MANIPULATIVE_TYPES.NUMBER_LINE
          : MANIPULATIVE_TYPES.FRACTION_BAR,
        num: parseInt(nl[1], 10),
        den: Math.min(24, Math.max(1, parseInt(nl[2], 10))),
        label: null,
        raw: null,
        fromNaturalLanguage: true,
      };
    }
  }

  return last;
}

/**
 * Which manipulatives are available for this lesson topic.
 */
export function manipulativesForTopic(topicName) {
  if (!topicName) return [MANIPULATIVE_TYPES.FRACTION_BAR];
  const exact = TOPIC_MANIPULATIVES[topicName];
  if (exact) return exact;
  const t = topicName.toLowerCase();
  if (t.includes("number line")) {
    return [MANIPULATIVE_TYPES.NUMBER_LINE, MANIPULATIVE_TYPES.FRACTION_BAR];
  }
  if (t.includes("fraction") || t.includes("math foundation")) {
    return [MANIPULATIVE_TYPES.FRACTION_BAR];
  }
  return [];
}

export function formatFraction(num, den) {
  if (den === 1) return String(num);
  return `${num}/${den}`;
}

export function fractionToPercent(num, den) {
  if (!den) return 0;
  return Math.max(0, Math.min(100, (num / den) * 100));
}

/** Prompt snippet for tutor system instructions when visuals tool is on. */
export function buildVisualPromptHint(topicName) {
  const tools = manipulativesForTopic(topicName);
  if (!tools.length) return "";
  const names = tools
    .map((t) =>
      t === MANIPULATIVE_TYPES.NUMBER_LINE ? "number-line" : "fraction-bar"
    )
    .join(" or ");
  return `
Interactive visuals (student has manipulatives open in the lesson UI):
- When a concrete model helps, ask them to try the on-screen ${names}.
- To set the model yourself, append a hidden tag at the end of your message (never mention the tag):
  ⟦visual type="fraction-bar" num="3" den="4"⟧
  or ⟦visual type="number-line" num="1" den="2"⟧
- Prefer small denominators (≤12). Celebrate when their model matches the idea.
`.trim();
}
