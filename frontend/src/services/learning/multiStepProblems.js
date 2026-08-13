/**
 * Pilot multi-step “show your work” problems (Epic B6).
 * Primary skill: frac.add_unlike (Adding fractions).
 */

export const MULTI_STEP_PROBLEMS = [
  {
    id: "ms.frac.add_unlike_1_3_plus_1_6",
    skillSlug: "frac.add_unlike",
    subject: "Math Foundations",
    topics: ["Adding fractions"],
    title: "Different bottoms, same whole",
    prompt: "What is $\\frac{1}{3} + \\frac{1}{6}$? Show each step.",
    promptPlain: "What is 1/3 + 1/6? Show each step.",
    finalExpected: "1/2",
    finalAlts: ["3/6", "0.5"],
    steps: [
      {
        id: "s1",
        index: 1,
        label: "Common denominator",
        prompt: "What common denominator works for thirds and sixths?",
        expected: "6",
        alts: ["six"],
        hint: "Sixth pieces fit evenly into thirds.",
      },
      {
        id: "s2",
        index: 2,
        label: "Rewrite 1/3",
        prompt: "Rewrite 1/3 using sixths.",
        expected: "2/6",
        alts: ["2 / 6"],
        hint: "1/3 = 2/6 because each third splits into two sixths.",
      },
      {
        id: "s3",
        index: 3,
        label: "Add like pieces",
        prompt: "Add 2/6 + 1/6.",
        expected: "3/6",
        alts: ["3 / 6"],
        hint: "Same-size sixths — add the tops, keep the bottom.",
      },
      {
        id: "s4",
        index: 4,
        label: "Simplify",
        prompt: "Simplify 3/6 to lowest terms.",
        expected: "1/2",
        alts: ["0.5", "3/6"],
        hint: "Divide top and bottom by 3.",
      },
    ],
  },
  {
    id: "ms.frac.add_unlike_1_4_plus_1_2",
    skillSlug: "frac.add_unlike",
    subject: "Math Foundations",
    topics: ["Adding fractions"],
    title: "Halves and fourths",
    prompt: "What is $\\frac{1}{4} + \\frac{1}{2}$? Show each step.",
    promptPlain: "What is 1/4 + 1/2? Show each step.",
    finalExpected: "3/4",
    finalAlts: ["0.75"],
    steps: [
      {
        id: "s1",
        index: 1,
        label: "Common denominator",
        prompt: "What common denominator works for fourths and halves?",
        expected: "4",
        alts: ["four"],
        hint: "Halves can become fourths.",
      },
      {
        id: "s2",
        index: 2,
        label: "Rewrite 1/2",
        prompt: "Rewrite 1/2 as fourths.",
        expected: "2/4",
        alts: ["2 / 4"],
        hint: "1/2 = 2/4.",
      },
      {
        id: "s3",
        index: 3,
        label: "Add",
        prompt: "Add 1/4 + 2/4.",
        expected: "3/4",
        alts: ["0.75"],
        hint: "Same-size fourths — add numerators.",
      },
    ],
  },
  {
    id: "ms.alg.one_step_x_plus_3",
    skillSlug: "alg.one_step_equation",
    subject: "Math Foundations",
    topics: ["Simple equations"],
    title: "Undo +3 on the balance",
    prompt: "Solve $x + 3 = 10$. Show your work step by step.",
    promptPlain: "Solve x + 3 = 10. Show your work step by step.",
    finalExpected: "7",
    finalAlts: ["x=7", "x = 7"],
    steps: [
      {
        id: "s1",
        index: 1,
        label: "Name the operation",
        prompt: "What was done to x on the left side?",
        expected: "+3",
        alts: ["plus 3", "add 3", "added 3", "x+3"],
        hint: "Look right next to x.",
        checkMode: "text",
      },
      {
        id: "s2",
        index: 2,
        label: "Inverse move",
        prompt: "What inverse move undoes that on both sides?",
        expected: "-3",
        alts: ["subtract 3", "minus 3", "take away 3"],
        hint: "Addition and subtraction undo each other.",
        checkMode: "text",
      },
      {
        id: "s3",
        index: 3,
        label: "Solve for x",
        prompt: "After undoing on both sides, what is x?",
        expected: "7",
        alts: ["x=7", "x = 7"],
        hint: "10 − 3 = ?",
      },
      {
        id: "s4",
        index: 4,
        label: "Check",
        prompt: "Plug your x back into x + 3. What do you get?",
        expected: "10",
        alts: ["10"],
        hint: "7 + 3 should match the right side.",
      },
    ],
  },
];

export function problemsForTopic(subject = "", topic = "") {
  const t = (topic || "").toLowerCase();
  const s = (subject || "").toLowerCase();
  return MULTI_STEP_PROBLEMS.filter((p) => {
    const topicOk = (p.topics || []).some((name) => {
      const n = name.toLowerCase();
      return t === n || t.includes(n) || n.includes(t);
    });
    const subOk =
      !s ||
      !p.subject ||
      p.subject.toLowerCase().includes(s.slice(0, 8)) ||
      s.includes(p.subject.toLowerCase().slice(0, 8));
    return topicOk && subOk;
  });
}

export function getMultiStepProblem(id) {
  return MULTI_STEP_PROBLEMS.find((p) => p.id === id) || null;
}

export function pickMultiStepProblem({ subject, topic, skillSlug, preferId } = {}) {
  if (preferId) {
    const hit = getMultiStepProblem(preferId);
    if (hit) return hit;
  }
  const pool = problemsForTopic(subject, topic);
  if (skillSlug) {
    const bySkill = pool.filter((p) => p.skillSlug === skillSlug);
    if (bySkill.length) return bySkill[0];
  }
  return pool[0] || null;
}
