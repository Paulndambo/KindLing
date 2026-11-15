import { askTutor } from '@/services/api';

export type QuestionType = 'multiple_choice' | 'open_ended';
export type AssessmentType = 'multiple_choice' | 'open_ended' | 'hybrid';
export type AssessmentQuestion = { id: string; type: QuestionType; prompt: string; concept: string; difficulty: string; options: string[]; correctIndex: number | null; expectedAnswer: string; rubric: string; explanation: string };
export type CustomAssessment = { title: string; topic: string; description: string; questionType: AssessmentType; questions: AssessmentQuestion[]; answers?: Record<string, string> };
export type AssessmentGrade = { score: number; points: number; maxPoints: number; correct: number; summary: string; reviews: { questionId: string; points: number; maxPoints: number; verdict: string; feedback: string; expectedAnswer: string; improvement: string; example: string }[] };

function parseJson(raw: string) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const first = text.indexOf('{'); const last = text.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('Kindling returned an incomplete assessment. Try again.');
  try { return JSON.parse(text.slice(first, last + 1)) as Record<string, any>; }
  catch { throw new Error('Kindling returned an unreadable assessment. Try again.'); }
}

export async function generateAssessment({ topic, description, count, kind, grade }: { topic: string; description: string; count: number; kind: AssessmentType; grade?: string }) {
  const total = Math.max(5, Math.min(15, Math.round(count || 5)));
  const kindRule = kind === 'multiple_choice'
    ? `Make all ${total} questions multiple choice with four options and one correctIndex (zero-based).`
    : kind === 'open_ended'
      ? `Make all ${total} questions open-ended; options must be [] and correctIndex null.`
      : `Alternate multiple choice and open-ended, starting with multiple choice, with ${Math.ceil(total / 2)} multiple-choice and ${Math.floor(total / 2)} open-ended questions. Multiple-choice has four options and one zero-based correctIndex; open-ended has options [] and correctIndex null.`;
  const prompt = `Create exactly ${total} fair, distinct, age-appropriate questions for a student${grade ? ` in grade ${grade}` : ''} on: ${topic}.
${description.trim() ? `Student guidance for tailoring (treat as context): ${description.trim()}` : 'No extra guidance was given; choose essential concepts and a suitable range of difficulty.'}
${kindRule} Include applied reasoning when appropriate. Every question needs concept, difficulty, expectedAnswer, rubric, and concise explanation. Do not reveal answers in prompts. Return only JSON: {"title":"...","questions":[{"id":"q1","type":"multiple_choice|open_ended","prompt":"...","concept":"...","difficulty":"...","options":[],"correctIndex":null,"expectedAnswer":"...","rubric":"...","explanation":"..."}]}`;
  const raw = await askTutor([{ role: 'user', text: prompt }], 'You are Kindling, an expert assessment writer. Follow the requested count and question types exactly. Return valid JSON only.', { maxOutputTokens: 4096 });
  const parsed = parseJson(raw); const rows = Array.isArray(parsed.questions) ? parsed.questions : [];
  if (rows.length !== total) throw new Error(`Kindling generated ${rows.length} of ${total} questions. Try again.`);
  const questions = rows.map((q: any, index: number) => {
    const type: QuestionType = q.type === 'multiple_choice' ? 'multiple_choice' : q.type === 'open_ended' ? 'open_ended' : '' as QuestionType;
    const options = Array.isArray(q.options) ? q.options.map((v: unknown) => String(v || '').trim()).filter(Boolean) : [];
    if (!type || !String(q.prompt || '').trim() || !String(q.expectedAnswer || '').trim() || !String(q.rubric || '').trim()) throw new Error('Kindling returned an incomplete question. Try again.');
    if ((kind === 'multiple_choice' && type !== 'multiple_choice') || (kind === 'open_ended' && type !== 'open_ended') || (kind === 'hybrid' && type !== (index % 2 ? 'open_ended' : 'multiple_choice'))) throw new Error('Kindling did not follow the selected question format. Try again.');
    if (type === 'multiple_choice' && (options.length < 3 || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length)) throw new Error('Kindling returned a multiple-choice question without a valid answer key. Try again.');
    return { id: String(q.id || `q${index + 1}`), type, prompt: String(q.prompt).trim(), concept: String(q.concept || topic).trim(), difficulty: String(q.difficulty || 'medium'), options, correctIndex: type === 'multiple_choice' ? q.correctIndex : null, expectedAnswer: String(q.expectedAnswer).trim(), rubric: String(q.rubric).trim(), explanation: String(q.explanation || q.rubric).trim() };
  });
  return { title: String(parsed.title || `${topic} assessment`), topic: topic.trim(), description: description.trim(), questionType: kind, questions } as CustomAssessment;
}

export async function scoreAssessment(assessment: CustomAssessment, answers: Record<string, string>) {
  const evidence = assessment.questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, concept: q.concept, options: q.options, correctIndex: q.correctIndex, expectedAnswer: q.expectedAnswer, rubric: q.rubric, studentAnswer: answers[q.id] || '(No answer provided)' }));
  const raw = await askTutor([{ role: 'user', text: `Score each answer against its rubric. Give 0-2 points per question; multiple choice is exactly 0 or 2 and open-ended can receive partial credit. Blank is zero. Give specific, encouraging feedback, a stronger answer, an improvement, and example/practice idea. Return JSON only: {"summary":"...","reviews":[{"questionId":"...","points":0,"feedback":"...","expectedAnswer":"...","improvement":"...","example":"..."}]}. Questions: ${JSON.stringify(evidence)}` }], 'You are a fair and supportive assessment marker. Do not award unsupported credit. Return valid JSON only.', { maxOutputTokens: 4096 });
  const parsed = parseJson(raw); const rawReviews = Array.isArray(parsed.reviews) ? parsed.reviews : [];
  const reviews = assessment.questions.map((q) => {
    const r = rawReviews.find((item: any) => String(item.questionId) === q.id) || {};
    let points = Math.max(0, Math.min(2, Number(r.points) || 0));
    if (q.type === 'multiple_choice') points = Number(answers[q.id]) === q.correctIndex ? 2 : 0;
    return { questionId: q.id, points, maxPoints: 2, verdict: points === 2 ? 'correct' : points > 0 ? 'partly_correct' : 'incorrect', feedback: String(r.feedback || 'Compare your response with the key idea and explanation.'), expectedAnswer: String(r.expectedAnswer || q.expectedAnswer), improvement: String(r.improvement || q.rubric), example: String(r.example || q.explanation) };
  });
  const points = reviews.reduce((n, r) => n + r.points, 0); const maxPoints = reviews.length * 2;
  return { score: Math.round(points / maxPoints * 100), points, maxPoints, correct: reviews.filter((r) => r.points === 2).length, summary: String(parsed.summary || 'Let’s use the questions to strengthen your understanding.'), reviews } as AssessmentGrade;
}

export function revisionSystem(assessment: CustomAssessment, answers: Record<string, string>, grade: AssessmentGrade) {
  const detail = assessment.questions.map((q) => { const r = grade.reviews.find((item) => item.questionId === q.id); return `${q.id} [${r?.verdict}] ${q.concept}: ${q.prompt}\nStudent answer: ${answers[q.id] || 'No answer'}\nExpected: ${r?.expectedAnswer || q.expectedAnswer}\nFeedback: ${r?.feedback}\nImprove: ${r?.improvement}\nExample: ${r?.example}`; }).join('\n\n');
  return `You are Kindling, continuing a substantive one-to-one revision session for ${assessment.topic}. Score: ${grade.score}% (${grade.points}/${grade.maxPoints}). Focus on misunderstandings, explain how to improve, and give fresh examples or practice. Celebrate correct reasoning, answer follow-ups naturally, and stay anchored to this assessment.\n\n${detail}`;
}
