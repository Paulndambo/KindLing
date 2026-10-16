import packs from "./writingScaffoldPacks.json";

const WRITING_SUBJECT = /writing|english|language arts|literacy|composition/i;

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Select a data-backed writing scaffold for an explicit writing topic. */
export function findWritingScaffoldPack({ subject = "", topic = "" } = {}) {
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
  if (!WRITING_SUBJECT.test(subject) && !/(essay|paragraph|thesis|writing|revision|draft|narrative|poetry)/i.test(topic)) {
    return null;
  }
  return matched;
}

/** Format the selected writing scaffold as concise tutor guidance. */
export function buildWritingScaffoldPromptBlock({ subject, topic } = {}) {
  const pack = findWritingScaffoldPack({ subject, topic });
  if (!pack) return "";
  return `DATA-BACKED WRITING SCAFFOLD (${pack.id}):
- Core idea: ${pack.concept}
- Representation: ${pack.representation}
- Suggested sequence: ${pack.steps.join(" → ")}
- One understanding check: ${pack.check}
- Fade support: ${pack.fade}
Coach the learner to make and express their own ideas. Do not write a finished assignment for them. Use only the next helpful step, adapt to their response, and fade support as they gain confidence; this scaffold is guidance, not a script.`;
}

export function listWritingScaffoldPacks() {
  return packs.map((pack) => ({ ...pack, topics: [...pack.topics], steps: [...pack.steps] }));
}
