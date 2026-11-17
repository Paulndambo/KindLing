/**
 * Epic C6 — Offline-first MCQ bank for low-stakes end-of-topic checks.
 *
 * Built for rural / low-connectivity tutoring: every item carries its own
 * tutor explanation so revision feedback works without a live model call.
 *
 * CS pilot questions live in csAssessmentBank.js and are merged below so a
 * quick check can target the active subtopic / skill.
 */

import { CS_ASSESSMENT_QUESTIONS } from "./csAssessmentBank";
import { TOPIC_SKILL_MAP, PILOT_SKILLS } from "./skillGraph";

/** @typedef {{ id: string, text: string }} AssessmentOption */
/**
 * @typedef {object} AssessmentQuestion
 * @property {string} id
 * @property {string} skillSlug
 * @property {string} subject
 * @property {string[]} topics
 * @property {string} prompt
 * @property {AssessmentOption[]} options
 * @property {number} correctIndex 0-based
 * @property {string} explanationCorrect warm reinforce + concept
 * @property {string} explanationIncorrect warm correction + concept revision
 * @property {string} [concept] short concept label
 * @property {'easy'|'medium'|'hard'} [difficulty]
 * @property {boolean} [transfer] Epic L4 — structurally new surface (same skill, new packaging)
 */

/** @type {AssessmentQuestion[]} */
const LEGACY_ASSESSMENT_QUESTIONS = [
  // —— Parts of a whole ——
  {
    id: "aq.frac.parts.1",
    skillSlug: "frac.parts_of_whole",
    subject: "Math Foundations",
    topics: ["Equal parts", "Parts of a whole", "Fraction sense"],
    concept: "Equal parts of a whole",
    difficulty: "easy",
    prompt: "A chapati is cut into 4 equal pieces. What fraction is one piece?",
    options: [
      { id: "a", text: "1/2" },
      { id: "b", text: "1/4" },
      { id: "c", text: "1/3" },
      { id: "d", text: "4/1" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — one equal piece out of four is 1/4. The bottom number (denominator) names how many equal parts make the whole; the top (numerator) counts how many of those parts you have.",
    explanationIncorrect:
      "Not quite. When a whole is split into 4 equal pieces, each piece is 1/4. Remember: denominator = equal parts in the whole, numerator = parts you are counting. Here that is 1 out of 4 → 1/4.",
  },
  {
    id: "aq.frac.parts.2",
    skillSlug: "frac.parts_of_whole",
    subject: "Math Foundations",
    topics: ["Equal parts", "Parts of a whole", "Fraction sense"],
    concept: "Naming unit fractions",
    difficulty: "medium",
    transfer: true,
    prompt: "Which picture idea shows 1/3 of a whole?",
    options: [
      { id: "a", text: "A stick broken into 2 equal parts, take 1" },
      { id: "b", text: "A stick broken into 3 equal parts, take 1" },
      { id: "c", text: "A stick broken into 3 unequal parts, take 1" },
      { id: "d", text: "A stick broken into 5 equal parts, take 3" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Exactly. 1/3 means the whole is in 3 equal parts and we take one. Equal size matters — unequal pieces are not fair fraction parts.",
    explanationIncorrect:
      "For 1/3 the whole must be divided into 3 equal parts, then we take one. Unequal pieces do not count as proper fraction parts. So: 3 equal parts, take 1.",
  },
  // —— Numerator & denominator ——
  {
    id: "aq.frac.numden.1",
    skillSlug: "frac.numerator_denominator",
    subject: "Math Foundations",
    topics: ["Numerator & denominator", "Fraction sense", "Reading fractions"],
    concept: "Numerator and denominator",
    difficulty: "easy",
    prompt: "In the fraction 3/5, what does the 5 tell you?",
    options: [
      { id: "a", text: "How many parts we have" },
      { id: "b", text: "How many equal parts make the whole" },
      { id: "c", text: "That the answer is bigger than 1" },
      { id: "d", text: "To multiply by 5" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Right. The denominator (bottom) is 5 — the whole is split into 5 equal parts. The numerator 3 says we have three of those parts.",
    explanationIncorrect:
      "Look at the bottom number. In 3/5, the 5 is the denominator: it names how many equal parts make the whole. The 3 on top is how many parts we have.",
  },
  {
    id: "aq.frac.numden.2",
    skillSlug: "frac.numerator_denominator",
    subject: "Math Foundations",
    topics: ["Numerator & denominator", "Fraction sense"],
    concept: "Reading fractions",
    difficulty: "easy",
    prompt: "Which fraction means “two out of eight equal parts”?",
    options: [
      { id: "a", text: "8/2" },
      { id: "b", text: "2/8" },
      { id: "c", text: "2/6" },
      { id: "d", text: "8/8" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — 2/8. Top = parts we have (2), bottom = equal parts in the whole (8).",
    explanationIncorrect:
      "“Two out of eight” puts 2 on top and 8 on the bottom → 2/8. Swapping them (8/2) would mean something different.",
  },
  // —— Number line ——
  {
    id: "aq.frac.nline.1",
    skillSlug: "frac.number_line",
    subject: "Math Foundations",
    topics: ["Fractions on a number line", "Number line", "Fraction sense"],
    concept: "Fractions on a number line",
    difficulty: "medium",
    prompt: "On a number line from 0 to 1 divided into 4 equal jumps, where is 3/4?",
    options: [
      { id: "a", text: "After 1 jump from 0" },
      { id: "b", text: "After 2 jumps from 0" },
      { id: "c", text: "After 3 jumps from 0" },
      { id: "d", text: "At 1 (four jumps)" },
    ],
    correctIndex: 2,
    explanationCorrect:
      "Yes. Four equal jumps fill 0→1; each jump is 1/4. Three jumps land on 3/4 — still before 1.",
    explanationIncorrect:
      "Think of the line 0 to 1 cut into 4 equal jumps. Each jump is 1/4. So 3/4 is three jumps from 0 — one jump short of 1.",
  },
  {
    id: "aq.frac.nline.2",
    skillSlug: "frac.number_line",
    subject: "Math Foundations",
    topics: ["Fractions on a number line", "Number line"],
    concept: "Unit fractions on a line",
    difficulty: "easy",
    prompt: "Which mark is halfway between 0 and 1 on a number line?",
    options: [
      { id: "a", text: "1/4" },
      { id: "b", text: "1/3" },
      { id: "c", text: "1/2" },
      { id: "d", text: "2/3" },
    ],
    correctIndex: 2,
    explanationCorrect:
      "Correct — halfway is 1/2. Two equal halves make the whole from 0 to 1.",
    explanationIncorrect:
      "Halfway means the distance is split into 2 equal parts. That point is 1/2, not 1/3 or 1/4.",
  },
  // —— Equivalent fractions ——
  {
    id: "aq.frac.eq.1",
    skillSlug: "frac.equivalent",
    subject: "Math Foundations",
    topics: ["Equivalent fractions", "Equivalence", "Fraction sense"],
    concept: "Equivalent fractions",
    difficulty: "medium",
    prompt: "Which fraction is equivalent to 1/2?",
    options: [
      { id: "a", text: "1/3" },
      { id: "b", text: "2/4" },
      { id: "c", text: "2/3" },
      { id: "d", text: "3/5" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — 2/4 = 1/2. Multiply top and bottom by the same number (here ×2) and the amount stays the same, just in smaller pieces.",
    explanationIncorrect:
      "Equivalent fractions name the same amount. Multiply 1/2 top and bottom by 2 → 2/4. Same size of the whole, different piece size.",
  },
  {
    id: "aq.frac.eq.2",
    skillSlug: "frac.equivalent",
    subject: "Math Foundations",
    topics: ["Equivalent fractions", "Equivalence"],
    concept: "Scaling numerator and denominator",
    difficulty: "medium",
    prompt: "What do you do to both parts of 2/3 to get an equivalent fraction?",
    options: [
      { id: "a", text: "Add the same number to top and bottom" },
      { id: "b", text: "Multiply (or divide) top and bottom by the same non-zero number" },
      { id: "c", text: "Only change the top number" },
      { id: "d", text: "Swap top and bottom" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Exactly. Same multiplier (or divisor) on numerator and denominator keeps the value. Adding the same number does not.",
    explanationIncorrect:
      "To keep the value, multiply or divide both numerator and denominator by the same non-zero number. Adding the same amount to both changes the value.",
  },
  // —— Compare ——
  {
    id: "aq.frac.cmp.1",
    skillSlug: "frac.compare",
    subject: "Math Foundations",
    topics: ["Comparing fractions", "Compare", "Fraction sense"],
    concept: "Comparing like denominators",
    difficulty: "easy",
    prompt: "Which is larger: 2/5 or 4/5?",
    options: [
      { id: "a", text: "2/5" },
      { id: "b", text: "4/5" },
      { id: "c", text: "They are equal" },
      { id: "d", text: "Cannot tell" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — same-size fifths, so more pieces wins: 4/5 > 2/5.",
    explanationIncorrect:
      "Same denominator means same piece size. More pieces on top means a larger fraction, so 4/5 is larger than 2/5.",
  },
  {
    id: "aq.frac.cmp.2",
    skillSlug: "frac.compare",
    subject: "Math Foundations",
    topics: ["Comparing fractions", "Compare"],
    concept: "Unit fraction comparison",
    difficulty: "medium",
    prompt: "Which is larger: 1/3 or 1/6?",
    options: [
      { id: "a", text: "1/3" },
      { id: "b", text: "1/6" },
      { id: "c", text: "They are equal" },
      { id: "d", text: "1/6 because 6 is bigger" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Right. Unit fractions get smaller as the denominator grows — sixths are tinier pieces than thirds, so 1/3 > 1/6.",
    explanationIncorrect:
      "For unit fractions (1 on top), a larger bottom means smaller pieces. Thirds are bigger pieces than sixths, so 1/3 is larger than 1/6.",
  },
  // —— Add like ——
  {
    id: "aq.frac.add_like.1",
    skillSlug: "frac.add_like",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Like denominators", "Fraction sense"],
    concept: "Adding like denominators",
    difficulty: "easy",
    prompt: "What is 1/8 + 3/8?",
    options: [
      { id: "a", text: "4/16" },
      { id: "b", text: "4/8" },
      { id: "c", text: "3/8" },
      { id: "d", text: "1/3" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — same bottoms stay the same; add the tops: 1+3=4, so 4/8. (You can simplify later to 1/2.)",
    explanationIncorrect:
      "Same denominator: keep the 8, add numerators 1+3=4 → 4/8. Do not add the bottoms (that would make 4/16, which is wrong here).",
  },
  {
    id: "aq.frac.add_like.2",
    skillSlug: "frac.add_like",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Like denominators"],
    concept: "Adding like fractions",
    difficulty: "easy",
    prompt: "What is 2/7 + 2/7?",
    options: [
      { id: "a", text: "4/14" },
      { id: "b", text: "4/7" },
      { id: "c", text: "2/14" },
      { id: "d", text: "4/4" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Correct — 2+2=4 sevenths → 4/7. Same-size pieces stack by counting how many you have.",
    explanationIncorrect:
      "Keep the denominator 7. Add only the tops: 2+2=4, so 4/7. Adding denominators is a common mix-up — skip that here.",
  },
  // —— Add unlike ——
  {
    id: "aq.frac.add_unlike.1",
    skillSlug: "frac.add_unlike",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Unlike denominators", "Different bottoms"],
    concept: "Common denominator",
    difficulty: "medium",
    prompt: "What is 1/3 + 1/6?",
    options: [
      { id: "a", text: "2/9" },
      { id: "b", text: "1/2" },
      { id: "c", text: "1/9" },
      { id: "d", text: "2/6" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — rewrite 1/3 as 2/6, then 2/6+1/6=3/6=1/2. Different bottoms need a common denominator first.",
    explanationIncorrect:
      "Different bottoms: find a common denominator. 1/3 = 2/6, then 2/6 + 1/6 = 3/6 = 1/2. Never add tops and bottoms separately as 2/9.",
  },
  {
    id: "aq.frac.add_unlike.2",
    skillSlug: "frac.add_unlike",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Unlike denominators"],
    concept: "Adding unlike fractions",
    difficulty: "medium",
    prompt: "What is 1/4 + 1/2?",
    options: [
      { id: "a", text: "2/6" },
      { id: "b", text: "1/6" },
      { id: "c", text: "3/4" },
      { id: "d", text: "2/4" },
    ],
    correctIndex: 2,
    explanationCorrect:
      "Nice — 1/2 = 2/4, so 1/4 + 2/4 = 3/4. Same-size fourths make the add easy.",
    explanationIncorrect:
      "Change 1/2 into fourths: 1/2 = 2/4. Then 1/4 + 2/4 = 3/4. Common denominator first, then add tops.",
  },
  // —— Simple equations ——
  {
    id: "aq.alg.one_step.1",
    skillSlug: "alg.one_step_equation",
    subject: "Math Foundations",
    topics: ["Simple equations", "One-step equations", "Early algebra"],
    concept: "Undo addition",
    difficulty: "easy",
    prompt: "Solve: x + 5 = 12. What is x?",
    options: [
      { id: "a", text: "17" },
      { id: "b", text: "7" },
      { id: "c", text: "5" },
      { id: "d", text: "12" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — undo +5 by subtracting 5 from both sides: x = 12 − 5 = 7. Check: 7+5=12.",
    explanationIncorrect:
      "To isolate x, undo the +5: subtract 5 from both sides. 12 − 5 = 7. Check by plugging back: 7 + 5 = 12.",
  },
  {
    id: "aq.alg.one_step.2",
    skillSlug: "alg.one_step_equation",
    subject: "Math Foundations",
    topics: ["Simple equations", "One-step equations", "Early algebra"],
    concept: "Undo multiplication",
    difficulty: "medium",
    prompt: "Solve: 3x = 15. What is x?",
    options: [
      { id: "a", text: "45" },
      { id: "b", text: "12" },
      { id: "c", text: "5" },
      { id: "d", text: "18" },
    ],
    correctIndex: 2,
    explanationCorrect:
      "Correct — divide both sides by 3: x = 15 ÷ 3 = 5. Check: 3×5=15.",
    explanationIncorrect:
      "3x means 3 times x. Undo by dividing both sides by 3: 15 ÷ 3 = 5. Check: 3 × 5 = 15.",
  },
  // —— Additional pilot-depth items (varied difficulty and transfer) ——
  {
    id: "aq.frac.parts.3",
    skillSlug: "frac.parts_of_whole",
    subject: "Math Foundations",
    topics: ["Equal parts", "Parts of a whole", "Fraction sense"],
    concept: "Fraction of a whole remaining",
    difficulty: "medium",
    transfer: true,
    prompt: "A ribbon is divided into 8 equal pieces. If 3 pieces are used, what fraction is left?",
    options: [
      { id: "a", text: "3/8" },
      { id: "b", text: "5/8" },
      { id: "c", text: "5/3" },
      { id: "d", text: "8/5" },
    ],
    correctIndex: 1,
    explanationCorrect: "There are 8 equal pieces in the whole and 8 − 3 = 5 remain, so 5/8 is left.",
    explanationIncorrect: "The denominator still counts all 8 equal pieces. Subtract the 3 used pieces from 8: 5 pieces remain, so 5/8 is left.",
  },
  {
    id: "aq.frac.numden.3",
    skillSlug: "frac.numerator_denominator",
    subject: "Math Foundations",
    topics: ["Numerator & denominator", "Fraction sense", "Reading fractions"],
    concept: "Interpreting both parts of a fraction",
    difficulty: "medium",
    prompt: "In 5/8, which statement describes the 5?",
    options: [
      { id: "a", text: "The whole is split into 5 equal parts" },
      { id: "b", text: "We are counting 5 of the 8 equal parts" },
      { id: "c", text: "The whole has a value of 8" },
      { id: "d", text: "We multiply the whole by 5 and 8" },
    ],
    correctIndex: 1,
    explanationCorrect: "Right — the numerator 5 counts the selected parts. The denominator 8 says the whole is divided into 8 equal parts.",
    explanationIncorrect: "The top number is the numerator: it counts how many equal parts are selected. In 5/8, that is 5 selected parts out of 8 total equal parts.",
  },
  {
    id: "aq.frac.nline.3",
    skillSlug: "frac.number_line",
    subject: "Math Foundations",
    topics: ["Fractions on a number line", "Number line"],
    concept: "Fractions beyond one whole on a number line",
    difficulty: "hard",
    transfer: true,
    prompt: "A number line is marked in fourths. Starting at 0, where does 5/4 land?",
    options: [
      { id: "a", text: "At 1/4, before 1" },
      { id: "b", text: "At 1, after four jumps" },
      { id: "c", text: "One fourth past 1" },
      { id: "d", text: "Halfway between 0 and 1" },
    ],
    correctIndex: 2,
    explanationCorrect: "Four fourth-size jumps reach 1, and one more reaches 5/4, which is one fourth past 1.",
    explanationIncorrect: "Each jump is 1/4. Four jumps reach 1; the fifth jump lands one fourth past 1, at 5/4.",
  },
  {
    id: "aq.frac.eq.3",
    skillSlug: "frac.equivalent",
    subject: "Math Foundations",
    topics: ["Equivalent fractions", "Equivalence", "Fraction sense"],
    concept: "Simplifying equivalent fractions",
    difficulty: "hard",
    prompt: "Which fraction is equivalent to 12/18 in simplest form?",
    options: [
      { id: "a", text: "2/3" },
      { id: "b", text: "3/2" },
      { id: "c", text: "6/9" },
      { id: "d", text: "4/9" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — divide both 12 and 18 by 6 to get 2/3. The value stays the same when both parts are divided by the same nonzero number.",
    explanationIncorrect: "Find a common factor of 12 and 18. Dividing both by 6 gives 2/3, an equivalent fraction in simplest form.",
  },
  {
    id: "aq.frac.cmp.3",
    skillSlug: "frac.compare",
    subject: "Math Foundations",
    topics: ["Comparing fractions", "Compare", "Fraction sense"],
    concept: "Comparing unlike fractions",
    difficulty: "hard",
    prompt: "Which fraction is larger: 5/8 or 2/3?",
    options: [
      { id: "a", text: "5/8" },
      { id: "b", text: "2/3" },
      { id: "c", text: "They are equal" },
      { id: "d", text: "There is not enough information" },
    ],
    correctIndex: 1,
    explanationCorrect: "Use twenty-fourths: 2/3 = 16/24 and 5/8 = 15/24, so 2/3 is larger.",
    explanationIncorrect: "Use a shared denominator: 5/8 = 15/24 and 2/3 = 16/24. Since 16/24 is larger, 2/3 is larger.",
  },
  {
    id: "aq.frac.add_like.3",
    skillSlug: "frac.add_like",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Like denominators", "Fraction sense"],
    concept: "Adding like fractions in a context",
    difficulty: "medium",
    transfer: true,
    prompt: "Mina walks 3/10 km, then 5/10 km. How far does she walk in total, before simplifying?",
    options: [
      { id: "a", text: "8/20 km" },
      { id: "b", text: "8/10 km" },
      { id: "c", text: "15/10 km" },
      { id: "d", text: "2/10 km" },
    ],
    correctIndex: 1,
    explanationCorrect: "Both distances are in tenths, so add the counts: 3/10 + 5/10 = 8/10 km.",
    explanationIncorrect: "The denominators match, so the pieces are the same size. Add the numerators: 3 + 5 = 8, giving 8/10 km.",
  },
  {
    id: "aq.frac.add_unlike.3",
    skillSlug: "frac.add_unlike",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Unlike denominators", "Different bottoms"],
    concept: "Adding unlike fractions with a common denominator",
    difficulty: "hard",
    prompt: "What is 2/5 + 1/3?",
    options: [
      { id: "a", text: "3/8" },
      { id: "b", text: "11/15" },
      { id: "c", text: "3/15" },
      { id: "d", text: "7/15" },
    ],
    correctIndex: 1,
    explanationCorrect: "Rewrite 2/5 as 6/15 and 1/3 as 5/15. Then 6/15 + 5/15 = 11/15.",
    explanationIncorrect: "Use fifteenths: 2/5 = 6/15 and 1/3 = 5/15. Add the numerators to get 11/15.",
  },
  {
    id: "aq.alg.one_step.3",
    skillSlug: "alg.one_step_equation",
    subject: "Math Foundations",
    topics: ["Simple equations", "One-step equations", "Early algebra"],
    concept: "Undo division in an equation",
    difficulty: "medium",
    transfer: true,
    prompt: "A number n is divided by 4 and the result is 6. Which equation and value match the story?",
    options: [
      { id: "a", text: "n ÷ 4 = 6, so n = 24" },
      { id: "b", text: "n ÷ 4 = 6, so n = 2" },
      { id: "c", text: "n − 4 = 6, so n = 10" },
      { id: "d", text: "4n = 6, so n = 24" },
    ],
    correctIndex: 0,
    explanationCorrect: "The story is n ÷ 4 = 6. Multiply both sides by 4 to undo division, so n = 24. Check: 24 ÷ 4 = 6.",
    explanationIncorrect: "“Divided by 4 gives 6” means n ÷ 4 = 6. Undo division by multiplying both sides by 4, so n = 24.",
  },
  // —— Parallel Form B items for the optional C6 pre/post pilot ——
  {
    id: "aq.frac.parts.4",
    skillSlug: "frac.parts_of_whole",
    subject: "Math Foundations",
    topics: ["Equal parts", "Parts of a whole", "Fraction sense"],
    concept: "Fraction of a whole remaining",
    difficulty: "medium",
    prompt: "A tray has 10 equal slices. If 4 slices are eaten, what fraction remains?",
    options: [
      { id: "a", text: "4/10" },
      { id: "b", text: "6/10" },
      { id: "c", text: "6/4" },
      { id: "d", text: "10/6" },
    ],
    correctIndex: 1,
    explanationCorrect: "Ten slices make the whole; 10 − 4 = 6 remain, so 6/10 is left.",
    explanationIncorrect: "The whole still has 10 equal slices. Subtract the 4 eaten: 6 remain, so the fraction left is 6/10.",
  },
  {
    id: "aq.frac.numden.4",
    skillSlug: "frac.numerator_denominator",
    subject: "Math Foundations",
    topics: ["Numerator & denominator", "Fraction sense", "Reading fractions"],
    concept: "Interpreting a denominator",
    difficulty: "medium",
    prompt: "In 7/9, what does the 9 tell you?",
    options: [
      { id: "a", text: "There are 7 selected parts" },
      { id: "b", text: "The whole is divided into 9 equal parts" },
      { id: "c", text: "The fraction is greater than 9" },
      { id: "d", text: "We multiply 7 by 9" },
    ],
    correctIndex: 1,
    explanationCorrect: "Correct — the denominator 9 names the number of equal parts in the whole; 7 counts the selected parts.",
    explanationIncorrect: "The bottom number is the denominator. It tells how many equal parts make the whole, so here there are 9.",
  },
  {
    id: "aq.frac.nline.4",
    skillSlug: "frac.number_line",
    subject: "Math Foundations",
    topics: ["Fractions on a number line", "Number line"],
    concept: "Locating a fraction on a number line",
    difficulty: "medium",
    prompt: "The distance from 0 to 1 is split into 6 equal jumps. Which point is 4 jumps from 0?",
    options: [
      { id: "a", text: "1/6" },
      { id: "b", text: "2/6" },
      { id: "c", text: "4/6" },
      { id: "d", text: "6/4" },
    ],
    correctIndex: 2,
    explanationCorrect: "Yes — each jump is 1/6, so four jumps from 0 land at 4/6.",
    explanationIncorrect: "The denominator 6 names the six equal jumps from 0 to 1. Four jumps from 0 land at 4/6.",
  },
  {
    id: "aq.frac.eq.4",
    skillSlug: "frac.equivalent",
    subject: "Math Foundations",
    topics: ["Equivalent fractions", "Equivalence", "Fraction sense"],
    concept: "Generating an equivalent fraction",
    difficulty: "medium",
    prompt: "Which fraction is equivalent to 3/5?",
    options: [
      { id: "a", text: "6/10" },
      { id: "b", text: "4/6" },
      { id: "c", text: "3/10" },
      { id: "d", text: "5/3" },
    ],
    correctIndex: 0,
    explanationCorrect: "Exactly — multiplying both numerator and denominator by 2 gives 6/10 without changing the amount.",
    explanationIncorrect: "Multiply the top and bottom of 3/5 by the same number, 2: 3/5 = 6/10.",
  },
  {
    id: "aq.frac.cmp.4",
    skillSlug: "frac.compare",
    subject: "Math Foundations",
    topics: ["Comparing fractions", "Compare", "Fraction sense"],
    concept: "Comparing fractions with a common denominator",
    difficulty: "medium",
    prompt: "Which is larger: 3/8 or 5/8?",
    options: [
      { id: "a", text: "3/8" },
      { id: "b", text: "5/8" },
      { id: "c", text: "They are equal" },
      { id: "d", text: "Cannot compare them" },
    ],
    correctIndex: 1,
    explanationCorrect: "Right — eighths are the same size, so 5 pieces are more than 3 pieces.",
    explanationIncorrect: "With the same denominator, the pieces are the same size. Compare the numerators: 5/8 is larger than 3/8.",
  },
  {
    id: "aq.frac.add_like.4",
    skillSlug: "frac.add_like",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Like denominators", "Fraction sense"],
    concept: "Adding like fractions",
    difficulty: "medium",
    prompt: "What is 4/9 + 2/9?",
    options: [
      { id: "a", text: "6/18" },
      { id: "b", text: "6/9" },
      { id: "c", text: "8/9" },
      { id: "d", text: "2/9" },
    ],
    correctIndex: 1,
    explanationCorrect: "Yes — count the same-sized ninths: 4 + 2 = 6, so the sum is 6/9.",
    explanationIncorrect: "The denominator stays 9 because the piece size is unchanged. Add the numerators: 4 + 2 = 6, giving 6/9.",
  },
  {
    id: "aq.frac.add_unlike.4",
    skillSlug: "frac.add_unlike",
    subject: "Math Foundations",
    topics: ["Adding fractions", "Unlike denominators", "Different bottoms"],
    concept: "Adding unlike fractions",
    difficulty: "hard",
    prompt: "What is 1/2 + 2/5?",
    options: [
      { id: "a", text: "3/7" },
      { id: "b", text: "9/10" },
      { id: "c", text: "3/10" },
      { id: "d", text: "7/10" },
    ],
    correctIndex: 1,
    explanationCorrect: "Use tenths: 1/2 = 5/10 and 2/5 = 4/10, so the total is 9/10.",
    explanationIncorrect: "Rename both fractions in tenths: 1/2 = 5/10 and 2/5 = 4/10. Then add to get 9/10.",
  },
  {
    id: "aq.alg.one_step.4",
    skillSlug: "alg.one_step_equation",
    subject: "Math Foundations",
    topics: ["Simple equations", "One-step equations", "Early algebra"],
    concept: "Undo subtraction in an equation",
    difficulty: "medium",
    prompt: "Solve: y − 8 = 6. What is y?",
    options: [
      { id: "a", text: "−2" },
      { id: "b", text: "14" },
      { id: "c", text: "48" },
      { id: "d", text: "8" },
    ],
    correctIndex: 1,
    explanationCorrect: "Correct — add 8 to both sides to undo subtracting 8: y = 6 + 8 = 14.",
    explanationIncorrect: "Undo subtracting 8 by adding 8 to both sides: y = 6 + 8 = 14. Check: 14 − 8 = 6.",
  },
  // —— Science pilot items (C6.6; paired with C7 science scaffolds) ——
  {
    id: "aq.sci.matter.1",
    subject: "Science",
    topics: ["Matter", "States of matter", "Particle model", "Changes of state"],
    concept: "Particle model and changes of state",
    difficulty: "medium",
    prompt: "When ice melts into liquid water, what happens to its particles?",
    options: [
      { id: "a", text: "They disappear and new particles form" },
      { id: "b", text: "They stay the same particles but can move past one another" },
      { id: "c", text: "They stop moving completely" },
      { id: "d", text: "They turn into air particles" },
    ],
    correctIndex: 1,
    explanationCorrect: "Yes — the particles remain water particles. As the solid melts, they gain freedom to move past one another.",
    explanationIncorrect: "A change of state does not make the water particles disappear. They remain the same particles, but their movement and arrangement change.",
  },
  {
    id: "aq.sci.reaction.1",
    subject: "Science",
    topics: ["Chemical reactions", "Chemical change", "Reactants and products", "Conservation of mass"],
    concept: "Atoms are rearranged in a chemical reaction",
    difficulty: "hard",
    prompt: "In a chemical reaction, what happens to the atoms in the reactants?",
    options: [
      { id: "a", text: "They are rearranged to make products" },
      { id: "b", text: "They vanish when a new substance appears" },
      { id: "c", text: "They all become energy and are gone" },
      { id: "d", text: "They keep exactly the same partners" },
    ],
    correctIndex: 0,
    explanationCorrect: "Right — atoms are conserved and rearranged into new combinations, forming the products.",
    explanationIncorrect: "A chemical reaction rearranges atoms; it does not make them vanish. The atoms in the reactants are accounted for in the products.",
  },
  {
    id: "aq.sci.forces.1",
    subject: "Science",
    topics: ["Forces", "Force and motion", "Forces and motion", "Motion", "Balanced and unbalanced forces"],
    concept: "Balanced forces and steady motion",
    difficulty: "hard",
    transfer: true,
    prompt: "A toy car is already rolling along a straight path. If the forces on it are balanced, what can happen next?",
    options: [
      { id: "a", text: "It must stop immediately" },
      { id: "b", text: "It can keep moving at a steady speed in the same direction" },
      { id: "c", text: "It must speed up" },
      { id: "d", text: "It must turn around" },
    ],
    correctIndex: 1,
    explanationCorrect: "Exactly — balanced forces mean no change in motion. A moving car can keep a steady speed and direction.",
    explanationIncorrect: "Balanced forces do not mean an object has to be still. They mean its motion does not change, so the rolling car can continue steadily.",
  },
  {
    id: "aq.sci.energy.1",
    subject: "Science",
    topics: ["Energy", "Energy transfer", "Heat transfer"],
    concept: "Direction of thermal energy transfer",
    difficulty: "easy",
    transfer: true,
    prompt: "A warm mug touches a cooler hand. Which way does thermal energy initially transfer?",
    options: [
      { id: "a", text: "From the hand to the mug" },
      { id: "b", text: "From the warmer mug to the cooler hand" },
      { id: "c", text: "In neither direction" },
      { id: "d", text: "Only from the air into the mug" },
    ],
    correctIndex: 1,
    explanationCorrect: "Yes — thermal energy transfers from the warmer mug toward the cooler hand.",
    explanationIncorrect: "Thermal energy initially moves from warmer to cooler, so it transfers from the mug to the hand.",
  },
  {
    id: "aq.sci.ecosystem.1",
    subject: "Science",
    topics: ["Ecosystems", "Ecosystem relationships", "Food chains", "Food webs"],
    concept: "Reading energy direction in a food chain",
    difficulty: "medium",
    prompt: "In grass → rabbit → fox, what does the arrow from rabbit to fox show?",
    options: [
      { id: "a", text: "The fox gives energy to the rabbit" },
      { id: "b", text: "Energy moves from the rabbit to the fox" },
      { id: "c", text: "The rabbit changes into a fox" },
      { id: "d", text: "The fox and rabbit eat grass equally" },
    ],
    correctIndex: 1,
    explanationCorrect: "Right — the arrow points in the direction energy moves: from the food (rabbit) to the consumer (fox).",
    explanationIncorrect: "In a food chain, an arrow points from the organism being eaten toward the organism that receives the energy.",
  },
  {
    id: "aq.sci.cells.1",
    subject: "Science",
    topics: ["Cells", "Cell structure", "Organelles", "Plant and animal cells"],
    concept: "Cell membrane function",
    difficulty: "easy",
    prompt: "What is one important job of a cell membrane?",
    options: [
      { id: "a", text: "To control what enters and leaves the cell" },
      { id: "b", text: "To make sunlight for every cell" },
      { id: "c", text: "To turn the cell into a tissue" },
      { id: "d", text: "To store all the organism's bones" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — the membrane forms a boundary and helps control what enters and leaves the cell.",
    explanationIncorrect: "The cell membrane is a boundary around the cell. One of its key jobs is regulating what moves in and out.",
  },
  {
    id: "aq.sci.investigation.1",
    subject: "Science",
    topics: ["Scientific investigation", "Fair tests", "Variables", "Experiments"],
    concept: "Variables in a fair test",
    difficulty: "medium",
    prompt: "To test whether light affects plant growth, what should a fair test do?",
    options: [
      { id: "a", text: "Change light and also use different soil and water amounts" },
      { id: "b", text: "Change the light while keeping other important conditions the same" },
      { id: "c", text: "Measure a different plant each day without recording which one" },
      { id: "d", text: "Decide the result before observing the plants" },
    ],
    correctIndex: 1,
    explanationCorrect: "Yes — change the independent variable (light) and keep other important conditions controlled so the comparison is fair.",
    explanationIncorrect: "A fair test changes the factor being investigated (light) while keeping other important factors, such as soil and water, the same.",
  },
  {
    id: "aq.sci.earth.1",
    subject: "Science",
    topics: ["Water cycle", "Earth systems", "Weather and climate"],
    concept: "Evaporation in the water cycle",
    difficulty: "easy",
    prompt: "Which process changes liquid water at Earth's surface into water vapor?",
    options: [
      { id: "a", text: "Condensation" },
      { id: "b", text: "Evaporation" },
      { id: "c", text: "Freezing" },
      { id: "d", text: "Collection" },
    ],
    correctIndex: 1,
    explanationCorrect: "Right — evaporation changes liquid water into water vapor, which can move into the air.",
    explanationIncorrect: "Evaporation is the process that changes liquid water into water vapor. Condensation changes vapor back into liquid droplets.",
  },
  // Additional explained items deepen the eight C7 science pilot checks (C6.8).
  {
    id: "aq.sci.matter.2",
    subject: "Science",
    topics: ["Matter", "States of matter", "Particle model"],
    concept: "Particle spacing in a gas",
    difficulty: "medium",
    prompt: "Why can a gas be compressed more easily than a liquid?",
    options: [
      { id: "a", text: "Gas particles are much farther apart, leaving space between them" },
      { id: "b", text: "Gas particles have no mass" },
      { id: "c", text: "Liquid particles cannot move" },
      { id: "d", text: "Gas particles disappear when pressed" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — gas particles are widely spaced, so they can be pushed closer together.",
    explanationIncorrect: "Gas particles still have mass and keep moving. They are easier to compress because there is much more empty space between them.",
  },
  {
    id: "aq.sci.matter.3",
    subject: "Science",
    topics: ["Matter", "Changes of state", "Particle model"],
    concept: "Condensation and particle energy",
    difficulty: "medium",
    prompt: "Water vapor cools and forms liquid droplets. What is this change called?",
    options: [
      { id: "a", text: "Melting" },
      { id: "b", text: "Condensation" },
      { id: "c", text: "Freezing" },
      { id: "d", text: "Sublimation" },
    ],
    correctIndex: 1,
    explanationCorrect: "Yes — condensation changes a gas into a liquid as particles lose energy and move closer together.",
    explanationIncorrect: "When water vapor cools into liquid droplets, the change is condensation. Freezing changes a liquid into a solid.",
  },
  {
    id: "aq.sci.reaction.2",
    subject: "Science",
    topics: ["Chemical reactions", "Reactants and products", "Conservation of mass"],
    concept: "Reactants and products",
    difficulty: "medium",
    prompt: "In the word equation magnesium + oxygen → magnesium oxide, which are the products?",
    options: [
      { id: "a", text: "Magnesium and oxygen" },
      { id: "b", text: "Magnesium oxide" },
      { id: "c", text: "Only oxygen" },
      { id: "d", text: "There are no products" },
    ],
    correctIndex: 1,
    explanationCorrect: "Right — the substance formed on the right side of the arrow, magnesium oxide, is the product.",
    explanationIncorrect: "Reactants are written before the arrow and products after it. Here magnesium oxide is formed, so it is the product.",
  },
  {
    id: "aq.sci.reaction.3",
    subject: "Science",
    topics: ["Chemical reactions", "Chemical change", "Conservation of mass"],
    concept: "Mass in a closed reaction system",
    difficulty: "hard",
    transfer: true,
    prompt: "A reaction happens in a sealed flask. What should happen to the total mass of the flask and its contents?",
    options: [
      { id: "a", text: "It stays the same because matter is conserved" },
      { id: "b", text: "It always doubles" },
      { id: "c", text: "It becomes zero when products form" },
      { id: "d", text: "It decreases because atoms are used up" },
    ],
    correctIndex: 0,
    explanationCorrect: "Exactly — in a closed system, atoms are rearranged but not lost, so total mass stays constant.",
    explanationIncorrect: "The sealed flask keeps all substances in the system. Since atoms are conserved in the reaction, the total mass remains the same.",
  },
  {
    id: "aq.sci.forces.2",
    subject: "Science",
    topics: ["Forces", "Force and motion", "Balanced and unbalanced forces"],
    concept: "Resultant force",
    difficulty: "medium",
    prompt: "A box is pulled right with 10 N and left with 6 N. What is the resultant force?",
    options: [
      { id: "a", text: "4 N to the right" },
      { id: "b", text: "16 N to the left" },
      { id: "c", text: "0 N" },
      { id: "d", text: "4 N to the left" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — opposite forces subtract: 10 N − 6 N = 4 N toward the larger force, to the right.",
    explanationIncorrect: "For opposite directions, subtract the smaller force from the larger one. The 10 N pull wins, leaving 4 N to the right.",
  },
  {
    id: "aq.sci.forces.3",
    subject: "Science",
    topics: ["Forces", "Force and motion", "Motion", "Balanced and unbalanced forces"],
    concept: "Unbalanced force changes motion",
    difficulty: "medium",
    transfer: true,
    prompt: "A stationary ball receives an unbalanced push to the left. What is the most likely immediate change?",
    options: [
      { id: "a", text: "It begins accelerating to the left" },
      { id: "b", text: "It stays stationary because forces never change motion" },
      { id: "c", text: "It accelerates to the right" },
      { id: "d", text: "Its mass disappears" },
    ],
    correctIndex: 0,
    explanationCorrect: "Yes — an unbalanced resultant force causes a change in motion in the direction of that force.",
    explanationIncorrect: "An unbalanced force changes an object's motion. Since the resultant push is left, the ball starts accelerating left.",
  },
  {
    id: "aq.sci.energy.2",
    subject: "Science",
    topics: ["Energy", "Energy stores", "Energy transfer"],
    concept: "Energy transfer in a falling object",
    difficulty: "medium",
    prompt: "As a ball falls from a height, which energy store decreases while its kinetic energy store increases?",
    options: [
      { id: "a", text: "Gravitational potential energy" },
      { id: "b", text: "Chemical energy in the ball" },
      { id: "c", text: "Nuclear energy" },
      { id: "d", text: "Elastic energy in the air" },
    ],
    correctIndex: 0,
    explanationCorrect: "Right — as the ball loses height, its gravitational potential energy is transferred mainly into kinetic energy.",
    explanationIncorrect: "A falling ball loses height, so its gravitational potential energy store decreases while it speeds up and gains kinetic energy.",
  },
  {
    id: "aq.sci.energy.3",
    subject: "Science",
    topics: ["Energy", "Energy transfer", "Heat transfer"],
    concept: "Conduction through a solid",
    difficulty: "medium",
    prompt: "A metal spoon warms while one end sits in hot soup. How is energy mainly transferred along the spoon?",
    options: [
      { id: "a", text: "By conduction through the metal" },
      { id: "b", text: "By evaporation of the spoon" },
      { id: "c", text: "By sound waves only" },
      { id: "d", text: "By the spoon creating energy" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — thermal energy travels through the solid metal by conduction.",
    explanationIncorrect: "The spoon remains a solid, and energy passes through its material by conduction. The spoon does not create energy.",
  },
  {
    id: "aq.sci.ecosystem.2",
    subject: "Science",
    topics: ["Ecosystems", "Ecosystem relationships", "Food chains", "Food webs"],
    concept: "Producer role in a food chain",
    difficulty: "easy",
    prompt: "In the chain grass → grasshopper → frog, which organism is the producer?",
    options: [
      { id: "a", text: "Grass" },
      { id: "b", text: "Grasshopper" },
      { id: "c", text: "Frog" },
      { id: "d", text: "All three are consumers" },
    ],
    correctIndex: 0,
    explanationCorrect: "Yes — grass makes its own food using light energy, so it is the producer.",
    explanationIncorrect: "The producer is the organism that makes its own food. In this chain, grass is the producer; the animals are consumers.",
  },
  {
    id: "aq.sci.ecosystem.3",
    subject: "Science",
    topics: ["Ecosystems", "Ecosystem relationships", "Food webs", "Population impacts"],
    concept: "Effects of a population change",
    difficulty: "hard",
    transfer: true,
    prompt: "In grass → rabbit → fox, what could happen to the fox population if rabbit numbers fall sharply?",
    options: [
      { id: "a", text: "Fox numbers may fall because less food is available" },
      { id: "b", text: "Fox numbers must double" },
      { id: "c", text: "The foxes become producers" },
      { id: "d", text: "The food chain can no longer have energy" },
    ],
    correctIndex: 0,
    explanationCorrect: "Right — with fewer rabbits as prey, foxes may have less food, which can reduce their population.",
    explanationIncorrect: "A drop in prey can affect predators because less food is available. The exact population change may also depend on other food sources and conditions.",
  },
  {
    id: "aq.sci.cells.2",
    subject: "Science",
    topics: ["Cells", "Cell structure", "Organelles", "Plant and animal cells"],
    concept: "Nucleus function",
    difficulty: "easy",
    prompt: "Which cell structure contains genetic material and helps control cell activities?",
    options: [
      { id: "a", text: "Nucleus" },
      { id: "b", text: "Cell wall" },
      { id: "c", text: "Vacuole" },
      { id: "d", text: "Cell membrane" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — the nucleus contains genetic material and helps coordinate the cell's activities.",
    explanationIncorrect: "The nucleus contains genetic material and helps control cell activities. The membrane controls movement into and out of the cell.",
  },
  {
    id: "aq.sci.cells.3",
    subject: "Science",
    topics: ["Cells", "Cell structure", "Organelles", "Plant and animal cells"],
    concept: "Plant cell wall function",
    difficulty: "medium",
    prompt: "What does the cell wall do in a plant cell?",
    options: [
      { id: "a", text: "Provides support and helps the cell keep its shape" },
      { id: "b", text: "Controls every thought of the plant" },
      { id: "c", text: "Absorbs all light for the whole plant" },
      { id: "d", text: "Replaces the cell membrane" },
    ],
    correctIndex: 0,
    explanationCorrect: "Yes — the rigid cell wall supports the plant cell and helps it keep its shape.",
    explanationIncorrect: "The plant cell wall is a supportive outer layer. It does not replace the cell membrane, which is just inside it.",
  },
  {
    id: "aq.sci.investigation.2",
    subject: "Science",
    topics: ["Scientific investigation", "Fair tests", "Variables", "Experiments"],
    concept: "Independent variable",
    difficulty: "medium",
    prompt: "A student changes the amount of light given to plants and measures their height. What is the independent variable?",
    options: [
      { id: "a", text: "Amount of light" },
      { id: "b", text: "Plant height" },
      { id: "c", text: "The ruler" },
      { id: "d", text: "The final graph title" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — the independent variable is the factor the student deliberately changes: the amount of light.",
    explanationIncorrect: "The measured outcome, plant height, is the dependent variable. The independent variable is the amount of light that is changed.",
  },
  {
    id: "aq.sci.investigation.3",
    subject: "Science",
    topics: ["Scientific investigation", "Fair tests", "Variables", "Data and graphs"],
    concept: "Repeated measurements",
    difficulty: "medium",
    prompt: "Why can repeating measurements improve an investigation?",
    options: [
      { id: "a", text: "It can reveal unusual results and make an average more reliable" },
      { id: "b", text: "It guarantees the hypothesis is correct" },
      { id: "c", text: "It removes the need to record data" },
      { id: "d", text: "It changes the result to match expectations" },
    ],
    correctIndex: 0,
    explanationCorrect: "Exactly — repeats help identify anomalous readings and allow a more reliable average to be calculated.",
    explanationIncorrect: "Repeating does not prove a hypothesis. It helps check consistency, spot unusual readings, and calculate a more reliable average.",
  },
  {
    id: "aq.sci.earth.2",
    subject: "Science",
    topics: ["Water cycle", "Earth systems", "Weather and climate"],
    concept: "Condensation in the water cycle",
    difficulty: "easy",
    prompt: "Cloud droplets form when water vapor cools in the air. Which process forms the droplets?",
    options: [
      { id: "a", text: "Condensation" },
      { id: "b", text: "Evaporation" },
      { id: "c", text: "Melting" },
      { id: "d", text: "Runoff" },
    ],
    correctIndex: 0,
    explanationCorrect: "Right — cooling water vapor condenses into tiny liquid droplets that can form clouds.",
    explanationIncorrect: "Cloud droplets form by condensation: water vapor cools and changes into liquid droplets. Evaporation is liquid changing to vapor.",
  },
  {
    id: "aq.sci.earth.3",
    subject: "Science",
    topics: ["Water cycle", "Earth systems", "Weather and climate"],
    concept: "Runoff and the water cycle",
    difficulty: "medium",
    prompt: "After heavy rain, water flows over land into a stream. Which water-cycle process is this?",
    options: [
      { id: "a", text: "Runoff" },
      { id: "b", text: "Condensation" },
      { id: "c", text: "Freezing" },
      { id: "d", text: "Transpiration" },
    ],
    correctIndex: 0,
    explanationCorrect: "Yes — runoff is water flowing over the land surface toward streams, rivers, lakes, or oceans.",
    explanationIncorrect: "Water flowing across the land surface after rain is runoff. Condensation happens when vapor forms liquid droplets.",
  },
  {
    id: "aq.sci.matter.4",
    subject: "Science",
    topics: ["Matter", "States of matter", "Particle model", "Changes of state"],
    concept: "Heating and particle motion",
    difficulty: "medium",
    prompt: "What usually happens to particles in a solid as it is heated, before it melts?",
    options: [
      { id: "a", text: "They vibrate more as they gain energy" },
      { id: "b", text: "They stop moving" },
      { id: "c", text: "They become smaller particles" },
      { id: "d", text: "They leave the material immediately" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — heating transfers energy to the particles, so they vibrate more strongly in their fixed positions.",
    explanationIncorrect: "Particles in a solid vibrate in place. Heating gives them more energy, increasing their vibration until conditions can lead to melting.",
  },
  {
    id: "aq.sci.reaction.4",
    subject: "Science",
    topics: ["Chemical reactions", "Reactants and products", "Conservation of mass"],
    concept: "Evidence of a chemical reaction",
    difficulty: "medium",
    prompt: "Which observation can be evidence that a chemical reaction has occurred?",
    options: [
      { id: "a", text: "A new substance forms, sometimes with a color change or gas bubbles" },
      { id: "b", text: "A solid is cut into smaller pieces" },
      { id: "c", text: "A liquid is poured into a different-shaped container" },
      { id: "d", text: "An object moves to a new place" },
    ],
    correctIndex: 0,
    explanationCorrect: "Yes — formation of a new substance is the key idea; color change or gas production can be clues.",
    explanationIncorrect: "Cutting, pouring, or moving can change shape or position without forming a new substance. New-substance formation is evidence of chemical change.",
  },
  {
    id: "aq.sci.forces.4",
    subject: "Science",
    topics: ["Forces", "Force and motion", "Motion", "Balanced and unbalanced forces"],
    concept: "Friction opposes motion",
    difficulty: "medium",
    prompt: "A sliding book slows down across a desk. Which force mainly opposes its motion?",
    options: [
      { id: "a", text: "Friction between the book and desk" },
      { id: "b", text: "Gravity pulling it upward" },
      { id: "c", text: "A forward force from the desk" },
      { id: "d", text: "Magnetism from every surface" },
    ],
    correctIndex: 0,
    explanationCorrect: "Right — friction acts between touching surfaces and opposes their relative motion.",
    explanationIncorrect: "The contact force of friction acts against the sliding motion. Gravity pulls downward, not upward along the desk.",
  },
  {
    id: "aq.sci.energy.4",
    subject: "Science",
    topics: ["Energy", "Energy transfer", "Heat transfer"],
    concept: "Radiation transfers energy",
    difficulty: "medium",
    prompt: "How can energy from the Sun travel through the vacuum of space to Earth?",
    options: [
      { id: "a", text: "By radiation, which does not need particles in between" },
      { id: "b", text: "By conduction through empty space" },
      { id: "c", text: "By convection in a solid vacuum" },
      { id: "d", text: "It cannot travel through space" },
    ],
    correctIndex: 0,
    explanationCorrect: "Exactly — radiation can transfer energy through a vacuum, unlike conduction and convection which need matter.",
    explanationIncorrect: "Conduction and convection require particles in a material. Radiation can travel through empty space, carrying energy from the Sun.",
  },
  {
    id: "aq.sci.ecosystem.4",
    subject: "Science",
    topics: ["Ecosystems", "Ecosystem relationships", "Food chains", "Food webs"],
    concept: "Decomposers recycle nutrients",
    difficulty: "medium",
    prompt: "What role do decomposers such as fungi play in an ecosystem?",
    options: [
      { id: "a", text: "They break down dead material and return nutrients to the environment" },
      { id: "b", text: "They make sunlight" },
      { id: "c", text: "They stop all energy transfers" },
      { id: "d", text: "They turn consumers into producers" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — decomposers break down dead organisms and waste, recycling nutrients into the ecosystem.",
    explanationIncorrect: "Decomposers such as fungi break down dead material. This returns nutrients that can be used again by other organisms.",
  },
  {
    id: "aq.sci.cells.4",
    subject: "Science",
    topics: ["Cells", "Cell structure", "Organelles", "Plant and animal cells"],
    concept: "Mitochondria and respiration",
    difficulty: "medium",
    prompt: "Which organelle is a major site of aerobic respiration in many cells?",
    options: [
      { id: "a", text: "Mitochondrion" },
      { id: "b", text: "Cell wall" },
      { id: "c", text: "Chloroplast in every animal cell" },
      { id: "d", text: "Cell membrane only" },
    ],
    correctIndex: 0,
    explanationCorrect: "Yes — mitochondria are major sites of aerobic respiration, which releases usable energy for cell processes.",
    explanationIncorrect: "Mitochondria are major sites of aerobic respiration. Cell walls support plant cells, and animal cells do not have chloroplasts.",
  },
  {
    id: "aq.sci.investigation.4",
    subject: "Science",
    topics: ["Scientific investigation", "Fair tests", "Variables", "Data and graphs"],
    concept: "Dependent variable",
    difficulty: "medium",
    prompt: "A student changes light levels and measures plant height. What is the dependent variable?",
    options: [
      { id: "a", text: "Plant height, because it is measured" },
      { id: "b", text: "Light level, because it is changed" },
      { id: "c", text: "The student's name" },
      { id: "d", text: "The pot color, even if it is not measured" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — the dependent variable is the outcome measured, which here is plant height.",
    explanationIncorrect: "The changed factor, light level, is independent. Plant height is the measured outcome, so it is dependent.",
  },
  {
    id: "aq.sci.earth.4",
    subject: "Science",
    topics: ["Water cycle", "Earth systems", "Weather and climate"],
    concept: "Precipitation in the water cycle",
    difficulty: "easy",
    prompt: "Water falling from clouds as rain, snow, or hail is called what?",
    options: [
      { id: "a", text: "Precipitation" },
      { id: "b", text: "Evaporation" },
      { id: "c", text: "Condensation" },
      { id: "d", text: "Infiltration" },
    ],
    correctIndex: 0,
    explanationCorrect: "Right — precipitation is water that falls from clouds to Earth's surface in forms such as rain, snow, or hail.",
    explanationIncorrect: "Water falling from clouds is precipitation. Evaporation moves liquid water into the air; condensation forms cloud droplets.",
  },
  {
    id: "aq.sci.matter.5",
    subject: "Science",
    topics: ["Matter", "States of matter", "Particle model", "Changes of state"],
    concept: "Applying the particle model to compression",
    difficulty: "hard",
    transfer: true,
    prompt: "A capped syringe contains air. When its plunger is pushed, the air volume shrinks. Which particle-model explanation fits?",
    options: [
      { id: "a", text: "Air particles are pushed closer together; the particles themselves do not shrink" },
      { id: "b", text: "Air particles melt into liquid" },
      { id: "c", text: "The particles vanish as the volume decreases" },
      { id: "d", text: "The particles become heavier when pressed" },
    ],
    correctIndex: 0,
    explanationCorrect: "Exactly — gas particles have spaces between them, so compression reduces the spacing rather than shrinking or removing particles.",
    explanationIncorrect: "The particle model keeps the particles themselves the same. Pushing the plunger reduces the empty space between gas particles.",
  },
  {
    id: "aq.sci.reaction.5",
    subject: "Science",
    topics: ["Chemical reactions", "Chemical change", "Reactants and products", "Conservation of mass"],
    concept: "Applying conservation of mass to rusting",
    difficulty: "hard",
    transfer: true,
    prompt: "An iron nail rusts while exposed to air. Why can the rusty nail weigh more than the original nail?",
    options: [
      { id: "a", text: "Oxygen atoms from the air have joined the iron in the rust" },
      { id: "b", text: "The reaction created new atoms from nothing" },
      { id: "c", text: "Iron atoms multiplied" },
      { id: "d", text: "Mass is not conserved in chemical reactions" },
    ],
    correctIndex: 0,
    explanationCorrect: "Right — oxygen from the surroundings becomes part of the rust, so the nail gains mass even though mass is conserved across the whole system.",
    explanationIncorrect: "The nail's mass can increase because oxygen from the air joins the iron. Include the surrounding oxygen and mass is conserved.",
  },
  {
    id: "aq.sci.forces.5",
    subject: "Science",
    topics: ["Forces", "Force and motion", "Motion", "Balanced and unbalanced forces"],
    concept: "Applying balanced forces to a moving object",
    difficulty: "hard",
    transfer: true,
    prompt: "A cyclist travels straight at a steady speed. What does this suggest about the forward force and resistive forces?",
    options: [
      { id: "a", text: "They are balanced overall" },
      { id: "b", text: "There are no forces acting at all" },
      { id: "c", text: "The resistive forces must be zero" },
      { id: "d", text: "The forward force must be getting larger every second" },
    ],
    correctIndex: 0,
    explanationCorrect: "Yes — steady straight-line motion means no change in velocity, so the resultant force is zero and the forces are balanced.",
    explanationIncorrect: "A moving cyclist can still have forces acting. At steady speed in a straight line, the forward and resistive forces balance overall.",
  },
  {
    id: "aq.sci.energy.5",
    subject: "Science",
    topics: ["Energy", "Energy stores", "Energy transfer", "Heat transfer"],
    concept: "Applying energy transfer to insulation",
    difficulty: "medium",
    transfer: true,
    prompt: "Why does a thick insulating jacket help someone stay warm on a cold day?",
    options: [
      { id: "a", text: "It slows thermal energy transfer from the body to the surroundings" },
      { id: "b", text: "It creates new energy inside the body" },
      { id: "c", text: "It makes the surroundings warmer than the body" },
      { id: "d", text: "It stops the body's particles from moving" },
    ],
    correctIndex: 0,
    explanationCorrect: "Correct — insulation slows energy transfer, helping the body retain thermal energy.",
    explanationIncorrect: "A jacket does not create energy. Its insulating layers reduce the rate at which thermal energy transfers from the warmer body to cooler surroundings.",
  },
  {
    id: "aq.sci.ecosystem.5",
    subject: "Science",
    topics: ["Ecosystems", "Ecosystem relationships", "Food chains", "Food webs", "Population impacts"],
    concept: "Applying food-web relationships to a population change",
    difficulty: "hard",
    transfer: true,
    prompt: "In a food web, insects are eaten by frogs and birds. If insect numbers fall, what is a reasonable prediction?",
    options: [
      { id: "a", text: "Frogs and birds may face less food, though other food sources can affect the outcome" },
      { id: "b", text: "All predators must immediately disappear" },
      { id: "c", text: "The insects become producers" },
      { id: "d", text: "Energy starts flowing from predators to plants" },
    ],
    correctIndex: 0,
    explanationCorrect: "Good reasoning — fewer insects may reduce food for their consumers, while other prey and ecosystem factors can change the effect.",
    explanationIncorrect: "A food-web change can affect organisms that depend on the insects, but it does not determine every population by itself; alternative foods matter too.",
  },
  {
    id: "aq.sci.cells.5",
    subject: "Science",
    topics: ["Cells", "Cell structure", "Organelles", "Plant and animal cells"],
    concept: "Applying cell structure to a specialized cell",
    difficulty: "medium",
    transfer: true,
    prompt: "A cell that absorbs water from soil has a long extension that increases its surface area. Which plant cell is it likely to be?",
    options: [
      { id: "a", text: "A root hair cell" },
      { id: "b", text: "A red blood cell" },
      { id: "c", text: "A guard cell with no wall" },
      { id: "d", text: "A nerve cell in an animal" },
    ],
    correctIndex: 0,
    explanationCorrect: "Yes — the long extension of a root hair cell provides a large surface area for absorbing water and mineral ions.",
    explanationIncorrect: "Root hair cells are adapted for absorption from soil. Their long extension increases the surface area in contact with the soil.",
  },
  {
    id: "aq.sci.investigation.5",
    subject: "Science",
    topics: ["Scientific investigation", "Fair tests", "Variables", "Experiments"],
    concept: "Planning a fair comparison",
    difficulty: "hard",
    transfer: true,
    prompt: "To compare how two fertilizers affect plant growth, which approach makes the test fairest?",
    options: [
      { id: "a", text: "Use similar plants and keep light, water, soil, and time the same; change only fertilizer" },
      { id: "b", text: "Use different plants, pots, soil, and watering for each fertilizer" },
      { id: "c", text: "Give one group more light and decide based on appearance" },
      { id: "d", text: "Measure only the tallest plant and do not record the method" },
    ],
    correctIndex: 0,
    explanationCorrect: "Exactly — compare similar plants, change the fertilizer, and control other important conditions so the result is interpretable.",
    explanationIncorrect: "A fair comparison changes the factor being tested (fertilizer) while keeping other important conditions consistent and recording measurements.",
  },
  {
    id: "aq.sci.earth.5",
    subject: "Science",
    topics: ["Water cycle", "Earth systems", "Weather and climate"],
    concept: "Applying the water cycle to surface changes",
    difficulty: "medium",
    transfer: true,
    prompt: "A town replaces a grassy field with concrete. After heavy rain, why might nearby streams rise faster?",
    options: [
      { id: "a", text: "Less water soaks into the ground, so more runs over the surface" },
      { id: "b", text: "Concrete makes rain fall upward" },
      { id: "c", text: "Evaporation stops everywhere" },
      { id: "d", text: "Clouds release extra water because concrete is solid" },
    ],
    correctIndex: 0,
    explanationCorrect: "Right — impermeable surfaces reduce infiltration, increasing surface runoff into streams after rain.",
    explanationIncorrect: "Concrete limits water soaking into the ground. More rainwater can flow over the surface as runoff and reach streams quickly.",
  },
  // —— Generic literacy fallbacks for non-pilot topics ——
  {
    id: "aq.gen.study.1",
    skillSlug: "gen.recall",
    subject: "General",
    topics: ["*"],
    concept: "Careful reading",
    difficulty: "easy",
    prompt: "When you are unsure on a check question, what is the best first move?",
    options: [
      { id: "a", text: "Guess as fast as possible" },
      { id: "b", text: "Re-read the question and name what it is asking" },
      { id: "c", text: "Skip every hard question forever" },
      { id: "d", text: "Change your answer randomly at the end" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Good habit. Slow down, re-read, and say in your own words what the question wants — then choose.",
    explanationIncorrect:
      "Rushing guesses hides what you know. Best first move: re-read and name what the question is asking, then pick carefully.",
  },
  {
    id: "aq.gen.study.2",
    skillSlug: "gen.recall",
    subject: "General",
    topics: ["*"],
    concept: "Learning from mistakes",
    difficulty: "easy",
    prompt: "Why does Kindling explain after every check answer?",
    options: [
      { id: "a", text: "To shame wrong answers" },
      { id: "b", text: "To help you revise the idea, right or wrong" },
      { id: "c", text: "To fill time" },
      { id: "d", text: "Only correct answers matter" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Exactly — checks are for revision. Whether you were right or wrong, the short tutor note locks the idea in.",
    explanationIncorrect:
      "These checks are low-stakes revision, not a scolding. Every answer gets a short tutor explanation so the concept sticks.",
  },
];

/** @type {AssessmentQuestion[]} */
export const ASSESSMENT_QUESTIONS = [
  ...CS_ASSESSMENT_QUESTIONS,
  ...LEGACY_ASSESSMENT_QUESTIONS,
];

/**
 * Skills linked to a lesson leaf (subtopic) name via the pilot graph.
 * Primary skills first (the concept being taught), then supporting skills.
 * @param {string} topic
 * @returns {string[]}
 */
export function skillSlugsForLessonTopic(topic = "") {
  const top = String(topic || "").trim();
  if (!top) return [];
  const links = TOPIC_SKILL_MAP[top];
  if (Array.isArray(links) && links.length) {
    const primary = links
      .filter((l) => l.isPrimary !== false)
      .map((l) => l.slug)
      .filter(Boolean);
    const support = links
      .filter((l) => l.isPrimary === false)
      .map((l) => l.slug)
      .filter(Boolean);
    // Prefer primaries; keep light support only after
    return [...primary, ...support];
  }
  // Fuzzy: skill name / shortLabel match
  const t = top.toLowerCase();
  return (PILOT_SKILLS || [])
    .filter((s) => {
      const name = String(s.name || "").toLowerCase();
      const short = String(s.shortLabel || "").toLowerCase();
      return (
        name === t ||
        short === t ||
        name.includes(t) ||
        t.includes(name) ||
        (short && (short.includes(t) || t.includes(short)))
      );
    })
    .map((s) => s.slug);
}

function normalizeAssessmentText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compatibleAssessmentSubject(questionSubject, subject) {
  const q = normalizeAssessmentText(questionSubject);
  const s = normalizeAssessmentText(subject);
  if (!q || !s || q === "general") return false;
  if (q === s) return true;
  if (q === "science" && /\b(science|biology|physics|chemistry)\b/.test(s)) return true;
  if (q === "math foundations" && /\b(math|mathematics)\b/.test(s)) return true;
  if (q === "computer science" && /\b(computer science|computing|ict)\b/.test(s)) return true;
  return false;
}

function tutorCoveredConcept(question, coveredText) {
  const concept = normalizeAssessmentText(question?.concept);
  if (!concept || typeof coveredText !== "string") return false;
  const prose = String(coveredText)
    .replace(/```visual\s*\r?\ntype\s*:\s*(?:study-plan|studyplan|lesson-plan|roadmap)[\s\S]*?```/gi, " ")
    .replace(/⟦suggests:[\s\S]*?⟧/g, " ");
  const terms = concept.split(" ").filter((word) => word.length > 2 && !["and", "the", "for", "with", "from"].includes(word));
  if (!terms.length) return false;
  return prose.split(/\n\s*\n/).some((paragraph) => {
    const normalized = normalizeAssessmentText(paragraph);
    return terms.every((term) => normalized.includes(term));
  });
}

/** Only return exact-topic items whose concept appears in tutor teaching text. */
export function filterQuestionsForCoveredLesson(
  questions = [],
  { subject = "", topic = "", coveredText = "", limit = 10 } = {}
) {
  const expectedTopic = normalizeAssessmentText(topic);
  if (!expectedTopic || typeof coveredText !== "string" || !coveredText.trim()) return [];
  return (Array.isArray(questions) ? questions : [])
    .filter((question) => {
      const topicTags = Array.isArray(question?.topics) ? question.topics : [];
      const exactTopic = topicTags.some(
        (tag) => normalizeAssessmentText(tag) === expectedTopic
      );
      return (
        exactTopic &&
        compatibleAssessmentSubject(question?.subject, subject) &&
        tutorCoveredConcept(question, coveredText)
      );
    })
    .slice(0, Math.max(0, Number(limit) || 0));
}

/**
 * Match questions to the active lesson subject + subtopic (and skills).
 * Prefers current-concept items so quick check gauges understanding of
 * what is being taught right now — not a random bank.
 *
 * @param {string} [subject]
 * @param {string} [topic] active subtopic / lesson leaf
 * @param {{
 *   skillSlug?: string,
 *   skillSlugs?: string[],
 *   unit?: string,
 *   limit?: number,
 *   minScore?: number,
 * }} [opts]
 * @returns {AssessmentQuestion[]}
 */
export function questionsForTopic(subject = "", topic = "", opts = {}) {
  const sub = String(subject || "").toLowerCase();
  const top = String(topic || "").toLowerCase();
  const unit = String(opts.unit || "").toLowerCase();
  const fromGraph = skillSlugsForLessonTopic(topic);
  const skillSlugs = [
    ...new Set(
      [
        ...(Array.isArray(opts.skillSlugs) ? opts.skillSlugs : []),
        opts.skillSlug || "",
        ...fromGraph,
      ]
        .map((s) => String(s || "").toLowerCase())
        .filter(Boolean)
    ),
  ];
  const limit = Math.max(1, Number(opts.limit) || 5);
  const minScore = opts.minScore != null ? Number(opts.minScore) : 6;
  const transferOnly = Boolean(opts.transferOnly);
  const excludeTransfer = Boolean(opts.excludeTransfer);
  const preferTransfer = Boolean(opts.preferTransfer);
  const form = String(opts.form || "").toUpperCase();
  const coveredText = opts.coveredText;
  const enforceCoveredLesson = typeof coveredText === "string";

  const belongsToForm = (question) => {
    if (!form) return true;
    if (!["Math Foundations", "Science"].includes(question.subject) || !["A", "B"].includes(form)) {
      return false;
    }
    const suffix = Number(String(question.id || "").match(/\.(\d+)$/)?.[1]);
    // Math uses .1/.3 vs .2/.4; science uses .1/.2 vs .3/.4.
    // Other checks continue to use the full bank.
    if (question.subject === "Math Foundations") {
      return form === "A" ? [1, 3].includes(suffix) : [2, 4].includes(suffix);
    }
    return form === "A" ? [1, 2].includes(suffix) : [3, 4].includes(suffix);
  };

  const scored = ASSESSMENT_QUESTIONS.map((q) => {
    if (!belongsToForm(q)) return { q, score: -999 };
    if (
      enforceCoveredLesson &&
      !filterQuestionsForCoveredLesson([q], { subject, topic, coveredText, limit: 1 }).length
    ) return { q, score: -999 };
    if (transferOnly && !q.transfer) return { q, score: -999 };
    if (excludeTransfer && q.transfer) return { q, score: -999 };
    let score = 0;
    const qSkill = String(q.skillSlug || "").toLowerCase();
    if (qSkill && skillSlugs.includes(qSkill)) {
      // Strong preference for skills tied to this lesson
      const idx = skillSlugs.indexOf(qSkill);
      score += idx === 0 ? 20 : idx === 1 ? 16 : 12;
    }
    // Epic L4 — boost transfer items when requested for independence twins
    if (preferTransfer && q.transfer) score += 5;
    const qSub = (q.subject || "").toLowerCase();
    if (sub && qSub) {
      if (qSub === sub) score += 4;
      else if (qSub.includes(sub) || sub.includes(qSub)) score += 2;
      // CS lesson should not drift into math bank
      if (sub.includes("computer") && qSub.includes("math")) score -= 8;
      if (sub.includes("math") && qSub.includes("computer")) score -= 8;
    }
    const topics = Array.isArray(q.topics) ? q.topics : [];
    let topicHit = false;
    for (const t of topics) {
      const tl = String(t).toLowerCase();
      if (tl === "*") {
        score += 0.25;
        continue;
      }
      if (top && (top === tl || top.includes(tl) || tl.includes(top))) {
        score += top === tl ? 14 : 8;
        topicHit = true;
      }
      if (unit && (unit === tl || unit.includes(tl) || tl.includes(unit))) {
        score += 3;
      }
    }
    if (topicHit && qSkill && skillSlugs.includes(qSkill)) score += 2;
    return { q, score };
  })
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score || a.q.id.localeCompare(b.q.id));

  let picked = scored.map((r) => r.q);

  // If threshold was strict, relax once for near-matches (still topic-relevant)
  if (picked.length < Math.min(3, limit) && !transferOnly) {
    const relaxed = ASSESSMENT_QUESTIONS.map((q) => {
      if (!belongsToForm(q)) return { q, score: -999 };
      if (
        enforceCoveredLesson &&
        !filterQuestionsForCoveredLesson([q], { subject, topic, coveredText, limit: 1 }).length
      ) return { q, score: -999 };
      if (excludeTransfer && q.transfer) return { q, score: -999 };
      // re-score lightly already done — take score >= 3 from full map
      const qSkill = String(q.skillSlug || "").toLowerCase();
      let score = 0;
      if (qSkill && skillSlugs.includes(qSkill)) score += 10;
      const topics = Array.isArray(q.topics) ? q.topics : [];
      for (const t of topics) {
        const tl = String(t).toLowerCase();
        if (tl !== "*" && top && (top.includes(tl) || tl.includes(top))) {
          score += 6;
        }
      }
      const qSub = (q.subject || "").toLowerCase();
      if (sub && qSub && (qSub.includes(sub) || sub.includes(qSub))) score += 2;
      if (sub.includes("computer") && qSub.includes("math")) score -= 8;
      return { q, score };
    })
      .filter((r) => r.score >= 4)
      .sort((a, b) => b.score - a.score);
    const seen = new Set(picked.map((q) => q.id));
    for (const row of relaxed) {
      if (seen.has(row.q.id)) continue;
      picked.push(row.q);
      seen.add(row.q.id);
      if (picked.length >= limit) break;
    }
  }

  // Prefer questions on the primary lesson skill(s), then fill with support
  if (skillSlugs.length && picked.length) {
    const primarySet = new Set(skillSlugs.slice(0, 2));
    const primaryQs = picked.filter((q) =>
      primarySet.has(String(q.skillSlug || "").toLowerCase())
    );
    const otherQs = picked.filter(
      (q) => !primarySet.has(String(q.skillSlug || "").toLowerCase())
    );
    // At least ~70% primary when available
    const primaryTarget = Math.max(
      1,
      Math.min(primaryQs.length, Math.ceil(limit * 0.7))
    );
    picked = [
      ...primaryQs.slice(0, primaryTarget),
      ...otherQs,
      ...primaryQs.slice(primaryTarget),
    ];
  }

  // Cap length
  if (picked.length > limit) {
    picked = picked.slice(0, limit);
  }

  // Last resort: generic study items (never preferred over on-topic CS)
  if (!picked.length && !form && !enforceCoveredLesson) {
    picked = ASSESSMENT_QUESTIONS.filter((q) =>
      (q.topics || []).includes("*")
    );
  }

  const seed = hashStr(`${sub}|${top}|${unit}|${skillSlugs.join(",")}`);
  const rotated = rotate(picked, seed % Math.max(1, picked.length));
  return rotated.slice(0, limit);
}

export function getAssessmentQuestion(id) {
  return ASSESSMENT_QUESTIONS.find((q) => q.id === id) || null;
}

function hashStr(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function rotate(arr, n) {
  if (!arr.length) return [];
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}
