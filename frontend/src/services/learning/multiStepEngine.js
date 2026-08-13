/**
 * Epic B6 — multi-step “show your work” session engine.
 * Intermediate checks via A3 math verifier; partial credit = steps correct / total.
 */

import { verifyMathAnswer } from "./mathVerifier";
import { pickMultiStepProblem, getMultiStepProblem } from "./multiStepProblems";

/** Hidden tutor tag: ⟦step n="2" expected="2/6" result="correct"⟧ */
export const STEP_TAG_RE =
  /⟦\s*step\b([^⟧]*)⟧|\[\[\s*step\s*:?\s*([^\]]+)\]\]/gi;

export const StepStatus = {
  PENDING: "pending",
  CURRENT: "current",
  CORRECT: "correct",
  PARTIAL: "partial",
  INCORRECT: "incorrect",
  SKIPPED: "skipped",
};

export function stripStepTags(text) {
  if (!text) return "";
  return String(text)
    .replace(STEP_TAG_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseStepTags(tutorText) {
  const text = String(tutorText || "");
  const tags = [];
  const re = new RegExp(STEP_TAG_RE.source, "gi");
  let m;
  while ((m = re.exec(text)) !== null) {
    const body = (m[1] || m[2] || "").trim();
    const nM = body.match(/n(?:um(?:ber)?)?\s*=\s*["']?(\d+)["']?/i);
    const expM = body.match(/expected\s*=\s*["']?([^"'\s|,;]+)["']?/i);
    const resM = body.match(
      /result\s*=\s*["']?(correct|incorrect|partial|wrong|right)["']?/i
    );
    let result = null;
    if (resM) {
      const r = resM[1].toLowerCase();
      result =
        r === "right" || r === "correct"
          ? "correct"
          : r === "wrong" || r === "incorrect"
            ? "incorrect"
            : r === "partial"
              ? "partial"
              : null;
    }
    tags.push({
      n: nM ? parseInt(nM[1], 10) : null,
      expected: expM ? expM[1].trim() : null,
      result,
      raw: m[0],
    });
  }
  return tags;
}

function normalizeTextAnswer(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^=+/, "")
    .replace(/\.$/, "");
}

function checkTextStep(studentText, step) {
  const s = normalizeTextAnswer(studentText);
  if (!s) {
    return {
      checked: false,
      correctness: null,
      confidence: 0,
      method: "empty",
    };
  }
  const candidates = [step.expected, ...(step.alts || [])].map(normalizeTextAnswer);
  // Loose contains for short phrases
  for (const c of candidates) {
    if (!c) continue;
    if (s === c || s.includes(c) || c.includes(s)) {
      return {
        checked: true,
        correctness: "correct",
        confidence: 0.85,
        method: "text_match",
        studentRaw: studentText,
        expectedRaw: step.expected,
      };
    }
  }
  return {
    checked: true,
    correctness: "incorrect",
    confidence: 0.7,
    method: "text_match",
    studentRaw: studentText,
    expectedRaw: step.expected,
  };
}

/**
 * Check student answer against a single step definition.
 */
export function checkStepAnswer(studentText, step) {
  if (!step) {
    return { checked: false, correctness: null, confidence: 0 };
  }
  if (step.checkMode === "text") {
    return checkTextStep(studentText, step);
  }
  return verifyMathAnswer(studentText, {
    expected: step.expected,
    alts: step.alts || [],
  });
}

export function createMultiStepSession(problem, { startedAt } = {}) {
  if (!problem) return null;
  const steps = (problem.steps || []).map((s, i) => ({
    ...s,
    index: s.index ?? i + 1,
    status: i === 0 ? StepStatus.CURRENT : StepStatus.PENDING,
    studentAnswer: null,
    checkedAt: null,
    attempts: 0,
  }));
  return {
    id: `mses_${Date.now().toString(36)}`,
    problemId: problem.id,
    problem,
    steps,
    currentIndex: 0,
    status: "active", // active | completed | exited
    startedAt: startedAt || new Date().toISOString(),
    completedAt: null,
    finalAnswer: null,
    finalCorrect: null,
  };
}

export function startMultiStepForTopic({ subject, topic, skillSlug, problemId } = {}) {
  const problem =
    (problemId && getMultiStepProblem(problemId)) ||
    pickMultiStepProblem({ subject, topic, skillSlug });
  if (!problem) return null;
  return createMultiStepSession(problem);
}

/**
 * Apply a student attempt to the current step.
 * @returns {{ session, stepResult, advanced, completed, partialCredit }}
 */
export function applyStepAttempt(session, studentText, { tutorText = "" } = {}) {
  if (!session || session.status !== "active") {
    return {
      session,
      stepResult: null,
      advanced: false,
      completed: false,
      partialCredit: scorePartialCredit(session),
    };
  }

  const steps = session.steps.map((s) => ({ ...s }));
  const idx = session.currentIndex;
  const step = steps[idx];
  if (!step) {
    return {
      session,
      stepResult: null,
      advanced: false,
      completed: false,
      partialCredit: scorePartialCredit(session),
    };
  }

  // Prefer structured check; allow tutor step tags to corroborate
  let result = checkStepAnswer(studentText, step);
  const tags = parseStepTags(tutorText);
  const tagForStep = tags.find((t) => t.n === step.index || t.n === idx + 1);
  if (tagForStep?.result && (!result.checked || result.confidence < 0.8)) {
    result = {
      ...result,
      checked: true,
      correctness: tagForStep.result,
      confidence: Math.max(result.confidence || 0, 0.75),
      method: result.method ? `${result.method}+tutor_tag` : "tutor_tag",
      expectedRaw: tagForStep.expected || result.expectedRaw,
    };
  }

  step.attempts = (step.attempts || 0) + 1;
  step.studentAnswer = studentText;
  step.checkedAt = new Date().toISOString();

  let advanced = false;
  let completed = false;
  const next = {
    ...session,
    steps,
  };

  if (result.correctness === "correct" || result.correctness === "partial") {
    step.status =
      result.correctness === "partial" ? StepStatus.PARTIAL : StepStatus.CORRECT;
    // Advance on correct; partial may stay if confidence low
    if (result.correctness === "correct" || (result.correctness === "partial" && step.attempts >= 2)) {
      if (idx + 1 < steps.length) {
        steps[idx + 1] = { ...steps[idx + 1], status: StepStatus.CURRENT };
        next.currentIndex = idx + 1;
        advanced = true;
      } else {
        next.status = "completed";
        next.completedAt = new Date().toISOString();
        next.currentIndex = idx;
        completed = true;
        // Final check if defined
        if (session.problem.finalExpected) {
          const fin = verifyMathAnswer(studentText, {
            expected: session.problem.finalExpected,
            alts: session.problem.finalAlts || [],
          });
          next.finalAnswer = studentText;
          next.finalCorrect = fin.correctness === "correct";
        } else {
          next.finalCorrect = true;
        }
      }
    }
  } else if (result.correctness === "incorrect") {
    step.status = StepStatus.INCORRECT;
    // Stay on step — remains current after incorrect
    step.status = StepStatus.CURRENT;
    step.lastIncorrect = true;
  }

  const partialCredit = scorePartialCredit(next);
  return {
    session: next,
    stepResult: { ...result, stepId: step.id, stepIndex: step.index },
    advanced,
    completed,
    partialCredit,
  };
}

/**
 * Mark current step skipped (optional tutor force-advance).
 */
export function skipCurrentStep(session) {
  if (!session || session.status !== "active") return session;
  const steps = session.steps.map((s) => ({ ...s }));
  const idx = session.currentIndex;
  if (!steps[idx]) return session;
  steps[idx] = {
    ...steps[idx],
    status: StepStatus.SKIPPED,
    checkedAt: new Date().toISOString(),
  };
  const next = { ...session, steps };
  if (idx + 1 < steps.length) {
    steps[idx + 1] = { ...steps[idx + 1], status: StepStatus.CURRENT };
    next.currentIndex = idx + 1;
  } else {
    next.status = "completed";
    next.completedAt = new Date().toISOString();
  }
  return next;
}

export function scorePartialCredit(session) {
  if (!session?.steps?.length) {
    return { ratio: 0, correct: 0, total: 0, percent: 0 };
  }
  const total = session.steps.length;
  let correct = 0;
  let partial = 0;
  for (const s of session.steps) {
    if (s.status === StepStatus.CORRECT) correct += 1;
    else if (s.status === StepStatus.PARTIAL) partial += 0.5;
  }
  const score = correct + partial;
  const ratio = score / total;
  return {
    ratio: Number(ratio.toFixed(3)),
    correct,
    partial,
    total,
    percent: Math.round(ratio * 100),
    completed: session.status === "completed",
  };
}

/**
 * Map multi-step progress to graded correctness for mastery.
 * full correct only when completed with high step ratio.
 */
export function multiStepToCorrectness(partialCredit, { completed = false } = {}) {
  if (!partialCredit || partialCredit.total === 0) return "unknown";
  if (completed && partialCredit.ratio >= 0.99) return "correct";
  if (partialCredit.ratio >= 0.5) return "partial";
  if (partialCredit.correct > 0) return "partial";
  return "incorrect";
}

export function buildMultiStepTutorBlock(session) {
  if (!session?.problem) return "";
  const p = session.problem;
  const cur = session.steps[session.currentIndex];
  const credit = scorePartialCredit(session);
  const stepLines = session.steps
    .map((s) => {
      const mark =
        s.status === StepStatus.CORRECT
          ? "✓"
          : s.status === StepStatus.CURRENT
            ? "→"
            : s.status === StepStatus.PARTIAL
              ? "~"
              : s.status === StepStatus.SKIPPED
                ? "·"
                : "○";
      return `  ${mark} ${s.index}. ${s.label} (expected machine: ${s.expected}) [${s.status}]`;
    })
    .join("\n");

  return `
═══════════════════════════════════════
MULTI-STEP “SHOW YOUR WORK” MODE — ACTIVE
═══════════════════════════════════════
Problem: ${p.promptPlain || p.title}
Skill: ${p.skillSlug || "pilot"}
Partial credit so far: ${credit.percent}% (${credit.correct}/${credit.total} steps solid)

Current step ${cur ? cur.index : "—"}: ${cur?.label || ""}
Student-facing prompt for this step: ${cur?.prompt || "Continue the work."}

Step checklist (machine-only expectations — do not dump all answers):
${stepLines}

Your job in this mode:
1. Keep the student on ONE step at a time. Celebrate each correct micro-step.
2. If wrong, give a Socratic nudge or the step hint spirit — do not spoil later steps.
3. Partial credit pedagogy: praise correct reasoning even when the final answer is unfinished.
4. When checking a step with a clear numeric/fraction answer, append a hidden tag at the end:
   ⟦step n="${cur?.index || 1}" expected="${cur?.expected || ""}" result="correct|incorrect|partial"⟧
5. When all steps are done, celebrate the full path and optionally confirm the final answer ${p.finalExpected || ""}.
6. Never mention internal scores, tags, or "multi-step mode" by those names — speak as a patient tutor asking them to show their work.
7. Stay in this mode until the student exits or finishes.
`;
}

export function buildMultiStepEnterMessage({ studentName, session }) {
  const name = studentName || "the student";
  const p = session?.problem;
  const cur = session?.steps?.[session.currentIndex];
  return `[INTERNAL MODE CHANGE — student does not see this line]
Enter SHOW-YOUR-WORK multi-step mode for "${p?.title || "this problem"}".
Problem: ${p?.promptPlain || p?.prompt || ""}
Start at step 1 only: ${cur?.prompt || "Begin the first step."}
Respond to ${name}: warmly introduce the problem, ask them to show their work one step at a time, and pose step 1. Do not reveal later answers.`;
}

export function buildMultiStepExitMessage({ studentName, session }) {
  const name = studentName || "the student";
  const credit = scorePartialCredit(session);
  return `[INTERNAL MODE CHANGE — student does not see this line]
Exit SHOW-YOUR-WORK mode. Partial credit was about ${credit.percent}%.
Respond briefly to ${name}: celebrate the steps they completed, note that showing work builds power, and offer one light practice question back in normal mode — no spoilers.`;
}

export function multiStepSummary(session) {
  if (!session) return null;
  const credit = scorePartialCredit(session);
  return {
    problemId: session.problemId,
    title: session.problem?.title,
    skillSlug: session.problem?.skillSlug,
    status: session.status,
    currentIndex: session.currentIndex,
    steps: session.steps.map((s) => ({
      id: s.id,
      index: s.index,
      label: s.label,
      status: s.status,
      attempts: s.attempts,
      studentAnswer: s.studentAnswer,
    })),
    partialCredit: credit,
  };
}
