import packs from "./scienceScaffoldPacks.json";

const SCIENCE_SUBJECT = /science|biology|chemistry|physics|earth science/i;

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Select a data-backed science scaffold for a lesson topic. */
export function findScienceScaffoldPack({ subject = "", topic = "" } = {}) {
  const normalizedTopic = normalize(topic);
  if (!normalizedTopic) return null;
  const matched = packs.find((pack) =>
    pack.topics.some((candidate) => {
      const normalizedCandidate = normalize(candidate);
      return normalizedTopic === normalizedCandidate ||
        normalizedTopic.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedTopic);
    })
  );
  if (!matched) return null;
  if (!SCIENCE_SUBJECT.test(subject) && !/(matter|reaction|force|motion|energy|ecosystem|food web|cell|experiment|water cycle|weather|rock cycle)/i.test(topic)) {
    return null;
  }
  return matched;
}

/** Format the selected science scaffold as concise tutor guidance. */
export function buildScienceScaffoldPromptBlock({ subject, topic } = {}) {
  const pack = findScienceScaffoldPack({ subject, topic });
  if (!pack) return "";
  return `DATA-BACKED SCIENCE SCAFFOLD (${pack.id}):
- Core idea: ${pack.concept}
- Representation: ${pack.representation}
- Suggested sequence: ${pack.steps.join(" → ")}
- One understanding check: ${pack.check}
- Fade support: ${pack.fade}
Use only the next helpful step, adapt to the learner's response, and keep reasoning with the learner. This is a flexible scaffold, not a script.`;
}

export function listScienceScaffoldPacks() {
  return packs.map((pack) => ({ ...pack, topics: [...pack.topics], steps: [...pack.steps] }));
}
