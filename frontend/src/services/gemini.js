import { LEARNING_STYLE_OPTIONS } from "../constants/onboarding";
import { familiarityMeta } from "../constants/familiarity";
import { buildAgeAwarePolicyBlock } from "./safety";
import { buildVisualPromptHint } from "./learning/manipulatives";
import {
  buildLadderTutorBlock,
  buildLadderEnterMessage,
  buildLadderExitMessage,
  normalizeLevel,
  InterventionLevel,
  levelMeta,
} from "./learning/interventionLadder";
import {
  buildLibraryPromptBlock,
  findWorkedExample,
  getCachedLibraryPromptBlock,
} from "./learning/workedExamples";
import {
  buildMultiStepTutorBlock,
  buildMultiStepEnterMessage,
  buildMultiStepExitMessage,
} from "./learning/multiStepEngine";
import {
  createChatSession as gatewayCreateChat,
  generateText,
  getLegacyAiHandle,
  isAiAvailable,
  PLATFORM_CHAT_MODEL,
} from "./ai";

/**
 * Normalize topic intent passed into the tutor prompt.
 * @param {object|null|undefined} topicContext
 */
export function normalizeTopicContext(topicContext = null) {
  if (!topicContext || typeof topicContext !== "object") {
    return {
      familiarity: "new",
      learningGoal: "",
      subjectGoal: "",
      isFirstSession: false,
    };
  }
  const fam = String(topicContext.familiarity || "new").toLowerCase();
  const meta = familiarityMeta(fam);
  return {
    familiarity: meta?.id || "new",
    learningGoal: String(
      topicContext.learningGoal || topicContext.learning_goal || ""
    ).trim(),
    subjectGoal: String(
      topicContext.subjectGoal || topicContext.subject_goal || ""
    ).trim(),
    isFirstSession: Boolean(topicContext.isFirstSession),
  };
}

/**
 * System-prompt block: familiarity + goals + first-session pacing.
 */
export function buildTopicIntentPromptBlock(topicName, topicContext = null) {
  const ctx = normalizeTopicContext(topicContext);
  const meta = familiarityMeta(ctx.familiarity);
  const pacing = meta?.pacing || "gentle_intro";
  const goalLine = ctx.learningGoal
    ? `- Stated learning focus for this topic: "${ctx.learningGoal}"`
    : "- No specific topic goal stated — discover what they want after a solid orientation.";
  const subjectLine = ctx.subjectGoal
    ? `- Subject-level hope: "${ctx.subjectGoal}"`
    : "";

  let pacingRules = "";
  if (pacing === "gentle_intro" || ctx.isFirstSession) {
    pacingRules = `First-session / low-familiarity pacing (mandatory when this is their first live thread on the topic, or familiarity is new/beginner):
- Do NOT open with a hard problem, quiz, or advanced terminology dump.
- Start with a warm, comprehensive orientation: what "${topicName}" is, why it matters, the big idea in plain language, and 1–2 everyday hooks (use their interests when natural).
- Check readiness with a soft question ("Does that match what you expected?" / "Want me to show a tiny everyday example next?") before any practice.
- Only after they show comfort, move to one tiny guided example — still scaffolded.
- Keep early messages friendly and structured; a slightly longer orientation message is OK for the opening turn only.`;
  } else if (pacing === "refresh_then_build") {
    pacingRules = `Basics-level pacing:
- Briefly refresh core ideas, then confirm what they already know before stretching.
- Align practice to their stated goal; avoid restarting from absolute zero unless they ask.`;
  } else if (pacing === "review") {
    pacingRules = `Review / exam-prep pacing:
- Orient quickly around their goal, then offer structured practice and common pitfalls.
- Still warm up — never ambush with the hardest item first.`;
  } else {
    pacingRules = `Comfortable-learner pacing:
- Honor their goal; go deeper, but still open with a short framing of the topic and a check-in on what they want today.`;
  }

  return `Topic intent & pacing for "${topicName}":
- Self-reported familiarity: ${meta?.label || "Brand new"} (${ctx.familiarity}).
${goalLine}
${subjectLine}
${pacingRules}
- Never shame gaps. Treat "new" as an invitation to teach well, not a deficit.
- Stay aligned with their stated goals throughout the lesson; circle back to them.`;
}

/**
 * Hidden kickoff user message for a brand-new topic thread.
 */
export function buildLessonOpeningPrompt({
  topicName,
  studentName,
  student,
  topicContext = null,
}) {
  const ctx = normalizeTopicContext(topicContext);
  const meta = familiarityMeta(ctx.familiarity);
  const name = studentName || student?.name?.trim() || "the student";
  const grade = student?.grade || "their grade";
  const curriculum = student?.curriculum || "their curriculum";
  const goalBit = ctx.learningGoal
    ? `Their stated goal: "${ctx.learningGoal}".`
    : "They have not written a specific goal yet — invite one gently after the intro.";
  const subjectBit = ctx.subjectGoal
    ? `Subject hope: "${ctx.subjectGoal}".`
    : "";

  const needsFullIntro =
    ctx.isFirstSession ||
    meta?.pacing === "gentle_intro" ||
    ctx.familiarity === "new" ||
    ctx.familiarity === "beginner";

  if (needsFullIntro) {
    return (
      `Open the FIRST live lesson on "${topicName}" for ${name} (${grade}, ${curriculum}). ` +
      `Familiarity: ${meta?.label || "Brand new"}. ${goalBit} ${subjectBit} ` +
      `This is a comprehensive orientation, not a steep cold start. ` +
      `In one warm message: (1) greet them by name, (2) introduce what "${topicName}" is in plain, grade-right language, ` +
      `(3) why it matters with a simple real-world hook (use their interests if natural), ` +
      `(4) outline the 2–4 big ideas they will grow into — without dumping jargon, ` +
      `(5) briefly acknowledge their familiarity/goal so they feel heard, ` +
      `(6) end with ONE soft check-in question (understanding or what they want first) — NOT a hard practice problem. ` +
      `Do not quiz them yet. Do not jump to advanced exercises. ` +
      `A slightly longer opening is fine; later turns stay shorter.`
    );
  }

  return (
    `Start the lesson on "${topicName}" for ${name} (${grade}, ${curriculum}). ` +
    `Familiarity: ${meta?.label || "some experience"}. ${goalBit} ${subjectBit} ` +
    `Open warmly: short framing of the topic, confirm their goal, ` +
    `then ONE approachable question that matches their level — not a steep leap. ` +
    `Keep it conversational.`
  );
}

/**
 * Dynamic AI handle — true when platform Gemini or a BYOK route is available.
 * Prefer isAiAvailable() for new code.
 */
export function getAi() {
  return getLegacyAiHandle();
}

/** @deprecated Prefer isAiAvailable() / getAi() — kept for modules that import { ai }. */
export const ai = new Proxy(
  {},
  {
    get(_t, prop) {
      const handle = getLegacyAiHandle();
      if (prop === "then") return undefined; // not a Promise
      if (!handle) return undefined;
      const val = handle[prop];
      return typeof val === "function" ? val.bind(handle) : val;
    },
    has(_t, prop) {
      const handle = getLegacyAiHandle();
      return Boolean(handle && prop in handle);
    },
  }
);

// Boolean checks: `if (!ai)` is unreliable with a Proxy — use this.
export { isAiAvailable };

export const GEMINI_MODEL = PLATFORM_CHAT_MODEL;

/**
 * Build the system prompt for a lesson chat.
 * @param {object} [options]
 * @param {boolean} [options.interventionActive] - ladder help mode active
 * @param {object} [options.interventionContext] - topic/subject/reason/level for help
 * @param {object} [options.multiStepSession] - Epic B6 show-your-work session
 */
export function buildSystemPrompt(
  subjectName,
  topicName,
  tools,
  student,
  learningInsights = null,
  options = {}
) {
  const name = student?.name?.trim() || "the student";
  const grade = student?.grade || "their grade level";
  const country = student?.country || "their country";
  const school = student?.schoolName || "their school";
  const curriculum = student?.curriculum || "their curriculum";
  const target = student?.academicTarget || "standard grade level";
  const styleObj =
    LEARNING_STYLE_OPTIONS.find((s) => s.id === student?.learningStyle) ||
    LEARNING_STYLE_OPTIONS[0];
  const interestsStr = student?.interests?.length
    ? student.interests.join(", ")
    : "their interests";
  const focusSubjects = Array.isArray(student?.focusSubjects)
    ? student.focusSubjects
    : Array.isArray(student?.focus_subjects)
      ? student.focus_subjects
      : [];
  const focusStr = focusSubjects.length
    ? focusSubjects.join(", ")
    : "";
  const goalStr = student?.goal ? String(student.goal).trim() : "";

  const interventionActive = Boolean(options.interventionActive);
  const ctx = options.interventionContext || {};
  const guideTopic = ctx.topic || topicName;
  const guideSubject = ctx.subject || subjectName;
  const ladderLevel = normalizeLevel(
    ctx.level ?? InterventionLevel.FULL_GUIDE
  );
  const topicContext = normalizeTopicContext(
    options.topicContext || learningInsights?.topicContext || null
  );
  const topicIntentBlock = buildTopicIntentPromptBlock(topicName, topicContext);

  // Epic B4 — prefer curated library examples over free generation
  const libraryBlockFromInsights =
    learningInsights?.libraryPromptBlock ||
    options.libraryPromptBlock ||
    getCachedLibraryPromptBlock() ||
    "";
  const fallbackExample =
    ctx.workedExample ||
    findWorkedExample({
      subject: subjectName,
      topic: topicName,
      grade: student?.grade,
      kind: "example",
    });
  const libraryBlock =
    libraryBlockFromInsights ||
    (fallbackExample
      ? buildLibraryPromptBlock([fallbackExample], { maxExamples: 1 })
      : "");

const insightBlock = learningInsights
  ? `
Live learner model (from prior Kindling sessions — use silently to adapt; never mention scores or "tracking"):
- Snapshot: ${learningInsights.summary}
- Adaptive directives:
${(learningInsights.directives || []).map((d) => `  • ${d}`).join("\n")}
${
  learningInsights.stats?.focusAreas?.length
    ? `- Known focus areas: ${learningInsights.stats.focusAreas
        .map((f) => `${f.topic} (${f.subject})`)
        .join("; ")}`
    : ""
}
${
  learningInsights.stats?.strengths?.length
    ? `- Known strengths: ${learningInsights.stats.strengths
        .map((f) => `${f.topic} (${f.subject})`)
        .join("; ")}`
    : ""
}
${
  learningInsights.persistenceScore >= 2
    ? `- Persistence spark is high — celebrate effort, bounce-backs, and sticking with hard ideas (not only accuracy).`
    : ""
}
${
  learningInsights.lastCheckIn?.label
    ? `- Latest check-in: student said “${learningInsights.lastCheckIn.label}” — respond with warmth; never shame.`
    : ""
}
${
  learningInsights.libraryExampleTitle
    ? `- A curated library example is ready for this topic (“${learningInsights.libraryExampleTitle}”) — prefer it when demonstrating.`
    : ""
}
${
  learningInsights.activeMisconceptions?.length
    ? `- Active misconception cues: ${learningInsights.activeMisconceptions
        .map((m) => m.label)
        .join("; ")} — remediate gently with the playbook below.`
    : ""
}
`
    : "";

  const misconceptionBlock =
    learningInsights?.misconceptionPromptBlock ||
    options.misconceptionPromptBlock ||
    "";

  const interventionBlock = interventionActive
    ? buildLadderTutorBlock({
        studentName: name,
        topic: guideTopic,
        subject: guideSubject,
        level: ladderLevel,
        reasonText: ctx.reasonText,
        workedExample: ctx.workedExample || fallbackExample,
        easierSkill: ctx.easierSkill,
        interestsStr,
      })
    : "";

  const multiStepSession = options.multiStepSession || null;
  const multiStepActive = Boolean(
    multiStepSession && multiStepSession.status === "active"
  );
  const multiStepBlock = multiStepActive
    ? buildMultiStepTutorBlock(multiStepSession)
    : "";

const philosophyBlock = multiStepActive
    ? `Your teaching philosophy (show-your-work mode):
- One intermediate step at a time. Celebrate each solid micro-step.
- Partial credit mindset: unfinished paths still earn praise for correct pieces.
- Do not spoil later steps. Keep messages short.
${tools.encourage ? `- Be extra enthusiastic for ${name}!` : ""}
${tools.visuals ? "- Use a quick visual when a step is about equal pieces." : ""}`
    : interventionActive
    ? ladderLevel === InterventionLevel.MICRO_HINT
      ? `Your teaching philosophy (micro-hint mode):
- One small nudge only — stay mostly Socratic.
- Never dump a full solution at this level.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- A tiny visual cue is OK if it is still just a hint." : ""}`
      : ladderLevel === InterventionLevel.WORKED_EXAMPLE
        ? `Your teaching philosophy (worked-example mode):
- One modeled example, then one twin try for ${name}.
- Clear steps, then check understanding — not a full course guide.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- Use a simple visual model in the example when natural." : ""}`
        : ladderLevel === InterventionLevel.BREAK_OR_EASIER
          ? `Your teaching philosophy (easier-path mode):
- Normalize reset. Offer break or simpler related skill.
- One easy win before returning to the hard idea.
${tools.encourage ? `- Be extra warm and encouraging for ${name}!` : ""}
${tools.visuals ? "- Prefer concrete, low-load visuals." : ""}`
          : `Your teaching philosophy (step-by-step guide mode):
- Lead with clear explanation, then a demonstration, then a tiny check-in.
- One step at a time — never dump a full lecture.
- Examples first when concepts are abstract; invite ${name} to try a parallel example after you model one.
- If they still struggle, slow down further and try a different representation.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- Lean hard on visual or hands-on models." : ""}`
    : `Your teaching philosophy:
- Ask one question at a time. Never overwhelm.
- Celebrate correct reasoning, not just correct answers.
- Keep routine messages short and conversational (2-4 sentences). The very first orientation on a brand-new topic may be a bit longer so ${name} is not dropped onto a steep slope.
- Continuously adapt: if they struggle, scaffold; if they soar, deepen — within this conversation.
- Match difficulty to stated familiarity and goals. Never assume prior mastery of "${topicName}" unless they show it.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- Actively suggest visual or hands-on ways to think about problems." : ""}

IMPORTANT: Never give away the answer directly during practice. Guide ${name} to discover it themselves. Orientation and worked teaching moments may explain ideas clearly before practice begins.`;

  const safetyBlock = buildAgeAwarePolicyBlock(student?.grade, name);
  const visualHint =
    tools?.visuals !== false ? buildVisualPromptHint(topicName) : "";

  return `You are Kindling, a warm, patient, and brilliant private tutor for children. 
You are currently teaching ${name} (who is in ${grade}) about "${topicName}" in ${subjectName}.

Extensive Student Profile & Academic Alignment:
- Student's name: "${name}" (address them by name).
- Grade Level: ${grade}.
- Location & School: Attending "${school}" in ${country}.
- Curriculum Framework: ${curriculum}.
- Academic Target: ${target}.
- Preferred Learning Style: ${styleObj.label} (${styleObj.desc}).
- Passions & Hobbies: ${interestsStr}.
${focusStr ? `- Subjects they especially want help with: ${focusStr}.` : ""}
${goalStr ? `- Primary learning goal: ${goalStr}.` : ""}

${topicIntentBlock}

Regional & Curriculum Adaptation Instructions:
- Align your terminology, spelling (e.g., US vs UK English), and educational standards with ${country}'s ${curriculum} system.
- Calibrate question depth and rigor to match ${name}'s ${target} level AND their self-reported familiarity with this topic.
- Frame problem scenarios using their interests (${interestsStr}) as engaging real-world analogies.
${focusStr ? `- When choosing examples or check-ins, prefer connecting to their focus subjects (${focusStr}) when natural.` : ""}
${insightBlock}${multiStepActive ? "" : interventionBlock}
${philosophyBlock}
${multiStepBlock ? `\n${multiStepBlock}\n` : ""}
${libraryBlock ? `\n${libraryBlock}\n` : ""}
${misconceptionBlock ? `\n${misconceptionBlock}\n` : ""}
${safetyBlock}

Formatting (the app renders Markdown, math, code, and diagrams cleanly — use structure when it helps learning):
- Write clear prose for conversation. Prefer short paragraphs.
- Use **bold** for key terms and *italics* sparingly for emphasis.
- Use numbered or bulleted lists for steps, options, or checklists.
- Use fenced code blocks with a language tag for real code or input/output (e.g. \`\`\`python).
- For math, use LaTeX: inline $x^2$ or display $$\\frac{a}{b}$$.
- For diagrams, use a \`\`\`text fenced block with clean ASCII art (boxes, arrows, trees). Keep diagrams simple and readable.
- Use Markdown tables when comparing ideas side-by-side.
- Use > blockquotes for hints, tips, or "remember" callouts.
- Do NOT dump raw HTML. Do NOT wrap the entire message in a single code fence.
- Keep formatting purposeful — never decorative spam. Still keep messages age-appropriate and not overwhelming.

Math grading tag (machine-only — student never sees this; never mention it):
- When ${name} gives a final numeric/fraction answer and you evaluate it (correct, incorrect, or partial), append ONE hidden tag at the very end of your message:
  ⟦check expected="CANONICAL" alts="alt1|alt2" result="correct|incorrect|partial"⟧
- Use the simplest equivalent form for expected (e.g. 3/4 not 6/8). Put other acceptable forms in alts separated by |.
- result is your teaching judgment. The app also verifies mathematically and may prefer the checker for mastery.
- Only emit the tag when there is a clear graded answer. Skip for open exploration or pure hints.
- Never put the tag in the middle of a sentence. Never explain the tag.

${visualHint ? `${visualHint}\n` : ""}Respond as Kindling — never break character, never mention being an AI, and never mention internal learner scores or tracking.`;
}

/** Hidden directive sent when Kindling enters intervention (not shown as student text). */
export function buildInterventionEnterMessage({
  studentName,
  topic,
  subject,
  reasonText,
  level,
  workedExample,
  easierSkill,
}) {
  return buildLadderEnterMessage({
    studentName,
    topic,
    subject,
    reasonText,
    level: level ?? InterventionLevel.FULL_GUIDE,
    workedExample,
    easierSkill,
  });
}

/** Hidden directive when student leaves intervention mode. */
export function buildInterventionExitMessage({ studentName, topic, level }) {
  return buildLadderExitMessage({
    studentName,
    topic,
    level: level ?? InterventionLevel.FULL_GUIDE,
  });
}

/** Epic B6 enter/exit helpers re-exported for chat session. */
export function buildShowYourWorkEnterMessage(opts) {
  return buildMultiStepEnterMessage(opts);
}

export function buildShowYourWorkExitMessage(opts) {
  return buildMultiStepExitMessage(opts);
}

export { levelMeta, InterventionLevel };

/**
 * Provider-agnostic chat session (Gemini / OpenAI / Anthropic / …).
 * Returns { sendMessageStream({ message }) } or null.
 */
export function createChatSession(systemInstruction, history = []) {
  return gatewayCreateChat(systemInstruction, history);
}

/** Resume an existing topic thread — no first-meeting intro. */
export function buildWelcomeBackMessage({
  studentName,
  topic,
  subject,
  isSameDay = false,
  priorSummary = null,
  highlights = [],
}) {
  const name = studentName || "the student";
  const memory =
    priorSummary ||
    (highlights?.length
      ? highlights.slice(0, 3).join("; ")
      : "ongoing practice on this topic");

  if (isSameDay) {
    return `[INTERNAL — continuing same-day conversation. Student does not see this line]
You are already mid-lesson with ${name} on "${topic}" (${subject}).
Do NOT introduce yourself. Do NOT restart the lesson from scratch.
Pick up naturally in 1–2 short sentences and ask one clear next question.
Memory cue: ${memory}`;
  }

  return `[INTERNAL — student is returning to an existing conversation. Student does not see this line]
${name} is back for "${topic}" in ${subject}. You have talked before.
Do NOT introduce yourself as if meeting for the first time.
Welcome them back warmly in 1–2 sentences, nod to what you were working on, and ask one natural next question to continue.
Prior thread summary: ${memory}`;
}

/**
 * Summarize an ended conversation for the Learning Journal.
 * Returns { title, summary, highlights[], nextStep }.
 */
export async function summarizeConversation({
  studentName,
  subject,
  topic,
  transcript,
}) {
  if (!isAiAvailable() || !transcript?.trim()) {
    return null;
  }

  const prompt = `You are summarizing a tutoring conversation for a student learning journal (and their family).
Student: ${studentName || "Student"}
Subject: ${subject}
Topic: ${topic}

Transcript:
${transcript}

Respond with ONLY valid JSON (no markdown fences) in this shape:
{
  "title": "short friendly title max 8 words",
  "summary": "2-4 warm sentences of what you worked on and progress — second person (you)",
  "highlights": ["bullet 1", "bullet 2", "bullet 3"],
  "nextStep": "one concrete suggestion for next time"
}
Keep language age-appropriate, encouraging, and specific. No scores or internal jargon.`;

  try {
    const text = await generateText(prompt, { task: "summary" });
    const cleaned = String(text || "")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return {
      title: String(parsed.title || "").slice(0, 80) || null,
      summary: String(parsed.summary || "").trim() || null,
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.map((h) => String(h).slice(0, 160)).filter(Boolean).slice(0, 5)
        : [],
      nextStep: String(parsed.nextStep || "").trim() || null,
    };
  } catch (err) {
    console.warn("Conversation summary failed:", err);
    return null;
  }
}
