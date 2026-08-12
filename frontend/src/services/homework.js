/**
 * Homework photo upload + Gemini vision analysis (Epic A4).
 */

import { API_BASE_URL, getAccessToken } from "./api/config";
import { ai, GEMINI_MODEL } from "./gemini";

export const HOMEWORK_MAX_BYTES = 5 * 1024 * 1024;
export const HOMEWORK_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/**
 * @param {File} file
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateHomeworkFile(file) {
  if (!file) return { ok: false, reason: "No file selected." };
  if (!String(file.type || "").startsWith("image/")) {
    return { ok: false, reason: "Please choose a photo (JPEG, PNG, WebP, or GIF)." };
  }
  if (file.size > HOMEWORK_MAX_BYTES) {
    return { ok: false, reason: "Image is too large (max 5 MB)." };
  }
  if (file.size <= 0) return { ok: false, reason: "Empty file." };
  return { ok: true };
}

/**
 * Read file as data URL for preview + Gemini inline image.
 * @param {File} file
 * @returns {Promise<{ dataUrl: string, base64: string, mimeType: string }>}
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        reject(new Error("Could not read image."));
        return;
      }
      resolve({
        dataUrl,
        mimeType: match[1],
        base64: match[2],
      });
    };
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload homework image to Kindling API (multipart).
 */
export async function uploadHomeworkFile(file, meta = {}) {
  const form = new FormData();
  form.append("image", file);
  if (meta.subject) form.append("subject", meta.subject);
  if (meta.topic) form.append("topic", meta.topic);
  if (meta.conversationId) form.append("conversationId", meta.conversationId);
  if (meta.studentId) form.append("studentId", meta.studentId);

  const headers = { Accept: "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/learning/homework/`, {
    method: "POST",
    headers,
    body: form,
    credentials: "omit",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `Upload failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Attach vision analysis JSON to a stored upload.
 */
export async function attachHomeworkAnalysis(homeworkId, analysis) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${API_BASE_URL}/api/learning/homework/${homeworkId}/analyze/`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ analysis }),
      credentials: "omit",
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `Analyze attach failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Gemini multimodal: extract problem + student work + error hypotheses.
 */
export async function analyzeHomeworkWithGemini({
  base64,
  mimeType,
  subject = "",
  topic = "",
  studentName = "the student",
}) {
  if (!ai) {
    throw new Error("AI is not configured (missing API key).");
  }

  const prompt = `You are helping Kindling, a warm children's tutor, understand a photo of school work.

Student: ${studentName}
Subject: ${subject || "unknown"}
Topic: ${topic || "unknown"}

Look at the image and respond with ONLY valid JSON (no markdown fences) in this shape:
{
  "isHomework": true,
  "problem": "the math/problem statement as written (or best reconstruction)",
  "studentWork": "what the student wrote or showed (steps + final answer if any)",
  "errors": ["short hypothesis of mistake 1", "…"],
  "focusSkill": "optional skill name e.g. equivalent fractions",
  "suggestedApproach": "one short Socratic teaching plan for the tutor (not the answer dump)",
  "confidence": 0.0,
  "notes": "optional safety note; say if image is not school work, blank, or inappropriate"
}

Rules:
- If this is NOT schoolwork / worksheet / notebook math, set isHomework false.
- Do not invent work that is not visible; say "unclear" when needed.
- Prefer teaching plans that guide discovery, not full answers.
- Keep strings concise. errors max 4 items.
- confidence is 0–1 for how sure you are of the OCR/read.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: base64,
            },
          },
        ],
      },
    ],
  });

  const text =
    typeof response?.text === "string"
      ? response.text
      : response?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text)
          .filter(Boolean)
          .join("") || "";

  const cleaned = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // try to extract JSON object
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Could not parse homework analysis.");
    parsed = JSON.parse(m[0]);
  }

  return {
    isHomework: parsed.isHomework !== false,
    problem: String(parsed.problem || "").slice(0, 2000),
    studentWork: String(parsed.studentWork || "").slice(0, 2000),
    errors: Array.isArray(parsed.errors)
      ? parsed.errors.map((e) => String(e).slice(0, 240)).slice(0, 6)
      : [],
    focusSkill: String(parsed.focusSkill || "").slice(0, 160),
    suggestedApproach: String(parsed.suggestedApproach || "").slice(0, 800),
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
    notes: String(parsed.notes || "").slice(0, 400),
  };
}

/**
 * Build tutor API message + student-visible caption from analysis.
 */
export function buildHomeworkTutorPrompt({
  analysis,
  subject,
  topic,
  studentName,
  interventionActive = false,
}) {
  const name = studentName || "the student";
  const errors =
    analysis.errors?.length > 0
      ? analysis.errors.map((e, i) => `${i + 1}. ${e}`).join("\n")
      : "(none clearly identified — probe gently)";

  const mode = interventionActive
    ? "You may use step-by-step guide style (intervention is active)."
    : "Stay Socratic by default: guide discovery; do not dump the full solution unless they are stuck and ask.";

  return `[INTERNAL — homework photo analysis. Student does not see this block.]
${name} uploaded a photo of their work for ${subject || "this subject"} / ${topic || "this topic"}.

Problem (from image):
${analysis.problem || "(unclear)"}

Student work (from image):
${analysis.studentWork || "(unclear)"}

Likely issues:
${errors}

Focus skill: ${analysis.focusSkill || "infer from work"}
Suggested approach: ${analysis.suggestedApproach || "Start with what they did right, then one small question."}

${mode}
Respond now as Kindling: warmly acknowledge the photo, reflect one thing they tried, and help with the first error or next step. Keep it age-appropriate and encouraging.`;
}

export function buildHomeworkStudentCaption(analysis) {
  const bits = ["I uploaded a photo of my work."];
  if (analysis.problem) {
    bits.push(`It looks like: ${analysis.problem.slice(0, 120)}${analysis.problem.length > 120 ? "…" : ""}`);
  }
  return bits.join(" ");
}
