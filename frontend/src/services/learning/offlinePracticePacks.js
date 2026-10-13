import { ASSESSMENT_QUESTIONS } from "./assessmentBank";

const PACK_SUBJECTS = [
  {
    id: "math-foundations",
    subject: "Math Foundations",
    matches: (name) => /math|numeracy|arithmetic/i.test(name),
  },
  {
    id: "science-foundations",
    subject: "Science",
    matches: (name) => /science|biology|chemistry|physics/i.test(name),
  },
  {
    id: "computer-science-foundations",
    subject: "Computer Science",
    matches: (name) => /computer|computing|programming|digital/i.test(name),
  },
];

const difficultyRank = { easy: 0, medium: 1, hard: 2 };

/**
 * Return a small, bundled practice set for subjects with authored offline items.
 * The content and explanations ship with the lesson, so no AI or API request is
 * needed once the lesson has loaded.
 */
export function offlinePracticePackFor(subjectName = "", topicName = "") {
  const pack = PACK_SUBJECTS.find((candidate) => candidate.matches(subjectName));
  if (!pack) return null;

  const topic = String(topicName || "").trim().toLowerCase();
  const questions = ASSESSMENT_QUESTIONS
    .filter((question) => question.subject === pack.subject)
    .map((question) => {
      const topicMatch = (question.topics || []).some((candidate) => {
        const label = String(candidate || "").toLowerCase();
        return label !== "*" && topic && (label === topic || label.includes(topic) || topic.includes(label));
      });
      return { question, topicMatch };
    })
    .sort((a, b) => {
      if (a.topicMatch !== b.topicMatch) return a.topicMatch ? -1 : 1;
      const difficulty = (difficultyRank[a.question.difficulty] ?? 1) - (difficultyRank[b.question.difficulty] ?? 1);
      return difficulty || a.question.id.localeCompare(b.question.id);
    });

  if (questions.length < 3) return null;

  const selected = [];
  const usedSkills = new Set();
  for (const { question } of questions) {
    const skill = question.skillSlug || question.concept || question.id;
    if (usedSkills.has(skill)) continue;
    selected.push(question);
    usedSkills.add(skill);
    if (selected.length === 5) break;
  }
  if (selected.length < 5) {
    for (const { question } of questions) {
      if (selected.some((item) => item.id === question.id)) continue;
      selected.push(question);
      if (selected.length === 5) break;
    }
  }

  return {
    id: pack.id,
    title: `${pack.subject} practice pack`,
    subject: pack.subject,
    topic: topicName || pack.subject,
    questions: selected,
    questionCount: selected.length,
  };
}
