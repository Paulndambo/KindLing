import { GoogleGenAI } from "@google/genai";
import { LEARNING_STYLE_OPTIONS } from "../constants/onboarding";
import { buildAgeAwarePolicyBlock } from "./safety";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

export const GEMINI_MODEL = "gemini-3.1-flash-lite";

/**
 * Build the system prompt for a lesson chat.
 * @param {object} [options]
 * @param {boolean} [options.interventionActive] - step-by-step guide mode
 * @param {object} [options.interventionContext] - topic/subject/reason for the guide
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

  const interventionActive = Boolean(options.interventionActive);
  const ctx = options.interventionContext || {};
  const guideTopic = ctx.topic || topicName;
  const guideSubject = ctx.subject || subjectName;

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
`
    : "";

  const interventionBlock = interventionActive
    ? `
═══════════════════════════════════════
INTERVENTION MODE — ACTIVE (step-by-step guide)
═══════════════════════════════════════
${name} is struggling with "${guideTopic}" in ${guideSubject}. You noticed and entered a guided teaching mode.

Your job in this mode:
1. Warmly acknowledge that this part is tricky — normalize struggle without shame.
2. Teach with a clear, patient step-by-step guide: explain concepts, then show worked examples / demonstrations.
3. Break ideas into small steps. After each step, check understanding with a simple question before moving on.
4. Use concrete examples (and visual / hands-on ideas when helpful). Tie examples to ${name}'s interests (${interestsStr}) when natural.
5. You MAY fully explain and demonstrate — this is not pure Socratic discovery mode right now.
6. Stay in guide mode until the student exits (UI action) or clearly wants to return to practice. Go as deep / as long as they need.
7. Keep language warm and age-appropriate. Still celebrate micro-wins.
8. Do not mention "intervention mode", scores, or internal tracking by those names — speak as a caring tutor who "noticed this was hard" and is walking them through it.
`
    : "";

const philosophyBlock = interventionActive
    ? `Your teaching philosophy (intervention / guide mode):
- Lead with clear explanation, then a demonstration, then a tiny check-in.
- One step at a time — never dump a full lecture.
- Examples first when concepts are abstract; invite ${name} to try a parallel example after you model one.
- If they still struggle, slow down further and try a different representation.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- Lean hard on visual or hands-on models." : ""}`
    : `Your teaching philosophy:
- Ask one question at a time. Never overwhelm.
- Celebrate correct reasoning, not just correct answers.
- Keep messages short and conversational (2-4 sentences max).
- Continuously adapt: if they struggle, scaffold; if they soar, deepen — within this conversation.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- Actively suggest visual or hands-on ways to think about problems." : ""}

IMPORTANT: Never give away the answer directly. Guide ${name} to discover it themselves.`;

  const safetyBlock = buildAgeAwarePolicyBlock(student?.grade, name);

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

Regional & Curriculum Adaptation Instructions:
- Align your terminology, spelling (e.g., US vs UK English), and educational standards with ${country}'s ${curriculum} system.
- Calibrate question depth and rigor to match ${name}'s ${target} level.
- Frame problem scenarios using their interests (${interestsStr}) as engaging real-world analogies.
${insightBlock}${interventionBlock}
${philosophyBlock}

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

Respond as Kindling — never break character, never mention being an AI, and never mention internal learner scores or tracking.`;
}

/** Hidden directive sent when Kindling enters intervention (not shown as student text). */
export function buildInterventionEnterMessage({ studentName, topic, subject, reasonText }) {
  const name = studentName || "the student";
  return `[INTERNAL MODE CHANGE — student does not see this line]
Enter INTERVENTION / STEP-BY-STEP GUIDE mode for "${topic}" (${subject}).
Context: you noticed ${reasonText || "they are struggling with this"}.
Respond to ${name} now: warmly tell them you noticed this part is tricky, and that you'll walk them through it step by step with clear explanations and examples. Start with step 1 of the guide. Keep it friendly and unhurried.`;
}

/** Hidden directive when student leaves intervention mode. */
export function buildInterventionExitMessage({ studentName, topic }) {
  const name = studentName || "the student";
  return `[INTERNAL MODE CHANGE — student does not see this line]
Exit INTERVENTION mode. Return to normal Socratic tutoring for "${topic}".
Respond briefly to ${name}: acknowledge you're going back to practice together, celebrate any progress, and ask one light check question — do NOT give answers away.`;
}

export function createChatSession(systemInstruction, history = []) {
  if (!ai) return null;
  const safeHistory = (history || [])
    .filter((h) => h?.text?.trim() && (h.role === "user" || h.role === "model"))
    .map((h) => ({
      role: h.role,
      parts: [{ text: h.text }],
    }));

  return ai.chats.create({
    model: GEMINI_MODEL,
    config: { systemInstruction },
    history: safeHistory,
  });
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
  if (!ai || !transcript?.trim()) {
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
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    const text =
      typeof response?.text === "string"
        ? response.text
        : response?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
          "";
    const cleaned = String(text)
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
