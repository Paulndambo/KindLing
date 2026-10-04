import packs from "./mathScaffoldPacks.json";

const MATH_SUBJECT = /math|algebra|arithmetic|numeracy/i;

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Select a reusable, data-backed early-math scaffold for a lesson topic. */
export function findMathScaffoldPack({ subject = "", topic = "" } = {}) {
  const normalizedTopic = normalize(topic);
  if (!normalizedTopic) return null;

  const topicMatch = packs.find((pack) =>
    pack.topics.some((candidate) => {
      const normalizedCandidate = normalize(candidate);
      return normalizedTopic === normalizedCandidate ||
        normalizedTopic.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedTopic);
    })
  );
  if (!topicMatch) return null;
  // These topic names are unambiguous enough to support custom subject labels too.
  if (!MATH_SUBJECT.test(subject) && !/(fraction|equation|algebra|ratio|proportion|place value|decimal|multiplication|division)/i.test(topic)) {
    return null;
  }
  return topicMatch;
}

/** Format the selected scaffold as concise tutor guidance. */
export function buildMathScaffoldPromptBlock({ subject, topic } = {}) {
  const pack = findMathScaffoldPack({ subject, topic });
  if (!pack) return "";
  return `DATA-BACKED MATH SCAFFOLD (${pack.id}):
- Core idea: ${pack.concept}
- Representation: ${pack.representation}
- Suggested sequence: ${pack.steps.join(" → ")}
- One understanding check: ${pack.check}
- Fade support: ${pack.fade}
Use only the next helpful step, adapt to the learner's response, and keep reasoning with the learner. This is a flexible scaffold, not a script.`;
}

export function listMathScaffoldPacks() {
  return packs.map((pack) => ({ ...pack, topics: [...pack.topics], steps: [...pack.steps] }));
}
