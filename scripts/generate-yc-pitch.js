/**
 * Kindling — YC partner pitch deck (10 slides)
 * Run: node scripts/generate-yc-pitch.js
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

const PINE = "1F3A34";
const TEAL = "3E8A8F";
const CREAM = "F6F2E9";
const WHITE = "FFFFFF";
const INK = "26302C";
const MUTED = "5C6B63";
const CARD = "FFFFFF";
const GOLD = "C99436";
const PALE = "E4ECE8";
const TEAL_PALE = "E1EFEE";

const out = path.join(__dirname, "..", "Kindling_YC_Pitch.pptx");

function shadow() {
  return { type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.1 };
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Kindling";
  pres.title = "Kindling — YC Pitch";
  pres.subject = "Y Combinator partner deck";

  // —— 1 Title ——
  {
    const s = pres.addSlide();
    s.background = { color: PINE };
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: TEAL },
    });
    s.addText("KINDLING", {
      x: 0.7, y: 1.55, w: 8.5, h: 0.45,
      fontFace: "Calibri", fontSize: 14, bold: true, color: TEAL,
      charSpacing: 4, margin: 0,
    });
    s.addText("The AI private tutor that notices\nwhen a learner is stuck—and knows\nhow to teach.", {
      x: 0.7, y: 2.05, w: 8.6, h: 1.7,
      fontFace: "Georgia", fontSize: 28, color: WHITE, margin: 0, bold: false,
    });
    s.addText("Pre-seed  ·  Working product  ·  Adaptive tutoring across subjects", {
      x: 0.7, y: 4.0, w: 8.5, h: 0.35,
      fontFace: "Calibri", fontSize: 14, color: "A8C5C0", margin: 0,
    });
    s.addText("Founders  ·  founders@kindling.app  ·  YC application", {
      x: 0.7, y: 5.05, w: 8.5, h: 0.3,
      fontFace: "Calibri", fontSize: 12, color: "7A9A94", margin: 0,
    });
  }

  // —— 2 Problem ——
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    s.addText("THE PROBLEM", {
      x: 0.55, y: 0.35, w: 9, h: 0.3,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Great tutoring works.\nAlmost nobody gets it daily.", {
      x: 0.55, y: 0.7, w: 9, h: 1.1,
      fontFace: "Georgia", fontSize: 28, color: PINE, margin: 0,
    });

    const cards = [
      { t: "Human tutors", d: "$60–100/hr, scarce, hard to schedule every night." },
      { t: "Schools", d: "Cannot put a personal tutor on every child every day." },
      { t: "Chatbots & solvers", d: "Speed to answers—not understanding or rescue." },
      { t: "Parents", d: "See grades late; miss the moment of struggle." },
    ];
    cards.forEach((c, i) => {
      const x = 0.55 + (i % 2) * 4.55;
      const y = 2.05 + Math.floor(i / 2) * 1.35;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w: 4.3, h: 1.2, fill: { color: WHITE }, rectRadius: 0.1, shadow: shadow(),
      });
      s.addText(c.t, {
        x: x + 0.25, y: y + 0.22, w: 3.8, h: 0.35,
        fontFace: "Calibri", fontSize: 16, bold: true, color: PINE, margin: 0,
      });
      s.addText(c.d, {
        x: x + 0.25, y: y + 0.58, w: 3.8, h: 0.45,
        fontFace: "Calibri", fontSize: 13, color: MUTED, margin: 0,
      });
    });
  }

  // —— 3 Insight + Solution ——
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    s.addText("THE INSIGHT", {
      x: 0.55, y: 0.35, w: 9, h: 0.28,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Tutoring quality is judgment under uncertainty—not more fluent AI text.", {
      x: 0.55, y: 0.7, w: 9, h: 0.7,
      fontFace: "Georgia", fontSize: 22, color: PINE, margin: 0,
    });

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y: 1.6, w: 9, h: 3.5, fill: { color: PINE }, rectRadius: 0.12,
    });
    s.addText("KINDLING", {
      x: 0.9, y: 1.9, w: 8, h: 0.3,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("A living private tutor", {
      x: 0.9, y: 2.25, w: 8, h: 0.45,
      fontFace: "Georgia", fontSize: 26, color: WHITE, margin: 0,
    });

    const points = [
      "Teaches Socratically by default—any subject the learner brings",
      "Models the learner every turn (correctness, affect, struggle)",
      "Intervenes on purpose: graduated ladder, always exit-able",
      "Mastery, examples, misconceptions, show-your-work—built as systems",
      "Parents get clarity; students get encouragement—not the same UI",
    ];
    s.addText(points.map((p, i) => ({
      text: p,
      options: { bullet: false, breakLine: i < points.length - 1 },
    })), {
      x: 0.9, y: 2.85, w: 8.2, h: 2.0,
      fontFace: "Calibri", fontSize: 15, color: "D7E3DD", margin: 0, paraSpaceAfter: 8,
    });
  }

  // —— 4 Product ——
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    s.addText("PRODUCT — WHAT IS REAL TODAY", {
      x: 0.55, y: 0.3, w: 9, h: 0.28,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Working product. Not slideware.", {
      x: 0.55, y: 0.6, w: 9, h: 0.45,
      fontFace: "Georgia", fontSize: 26, color: PINE, margin: 0,
    });

    const rows = [
      ["Live lesson", "Streaming tutor, path, tools, voice; math, code, lists, diagrams"],
      ["Any subject", "Student-created subjects & topics—math, science, coding, languages…"],
      ["Intelligence", "Signals → learner profile → personalization directives"],
      ["Intervention", "Struggle detectors + ladder L1–L4 + exit anytime"],
      ["Trust & family", "Safety floor, resume, digests, familiarity-aware first session"],
    ];
    rows.forEach((r, i) => {
      const y = 1.25 + i * 0.72;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 0.55, y, w: 9, h: 0.62, fill: { color: WHITE }, rectRadius: 0.08, shadow: shadow(),
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.55, y, w: 0.12, h: 0.62, fill: { color: i % 2 === 0 ? TEAL : GOLD },
      });
      s.addText(r[0], {
        x: 0.9, y: y + 0.12, w: 2.3, h: 0.4,
        fontFace: "Calibri", fontSize: 14, bold: true, color: PINE, margin: 0, valign: "middle",
      });
      s.addText(r[1], {
        x: 3.3, y: y + 0.12, w: 6, h: 0.4,
        fontFace: "Calibri", fontSize: 14, color: MUTED, margin: 0, valign: "middle",
      });
    });
  }

  // —— 5 System ——
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    s.addText("HOW IT WORKS", {
      x: 0.55, y: 0.35, w: 9, h: 0.28,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Own the learning system. Rent the model.", {
      x: 0.55, y: 0.7, w: 9, h: 0.5,
      fontFace: "Georgia", fontSize: 26, color: PINE, margin: 0,
    });

    const steps = [
      { n: "01", t: "Turn", d: "Student answers, pauses, uploads work" },
      { n: "02", t: "Signals", d: "Correctness, affect, struggle, misconceptions" },
      { n: "03", t: "Model", d: "Profile + skill mastery over time" },
      { n: "04", t: "Policy", d: "Ladder, examples, digests, next move" },
    ];
    steps.forEach((st, i) => {
      const x = 0.5 + i * 2.35;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: 1.6, w: 2.2, h: 2.5, fill: { color: WHITE }, rectRadius: 0.1, shadow: shadow(),
      });
      s.addText(st.n, {
        x: x + 0.15, y: 1.85, w: 1.9, h: 0.4,
        fontFace: "Calibri", fontSize: 18, bold: true, color: TEAL, margin: 0,
      });
      s.addText(st.t, {
        x: x + 0.15, y: 2.4, w: 1.9, h: 0.45,
        fontFace: "Georgia", fontSize: 20, color: PINE, margin: 0,
      });
      s.addText(st.d, {
        x: x + 0.15, y: 3.0, w: 1.9, h: 0.8,
        fontFace: "Calibri", fontSize: 13, color: MUTED, margin: 0,
      });
    });

    s.addText("Moat path: session data × intervention policies × curriculum graphs × parent trust — not the base LLM.", {
      x: 0.55, y: 4.45, w: 9, h: 0.55,
      fontFace: "Calibri", fontSize: 14, italic: true, color: PINE, margin: 0,
    });
  }

  // —— 6 Why now ——
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    s.addText("WHY NOW", {
      x: 0.55, y: 0.35, w: 9, h: 0.28,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("The window is open for a pedagogy company.", {
      x: 0.55, y: 0.7, w: 9, h: 0.55,
      fontFace: "Georgia", fontSize: 26, color: PINE, margin: 0,
    });

    const why = [
      { t: "LLM capability", d: "Warm multi-turn tutoring UX is finally good enough to ship." },
      { t: "Budgets exist", d: "Parents already pay for tutors, apps, and test prep." },
      { t: "Structural gaps", d: "Teacher shortage and learning loss are not a fad." },
      { t: "Category risk", d: "If free answers win the habit, serious learning loses. Own trust + teaching policy now." },
    ];
    why.forEach((w, i) => {
      const y = 1.5 + i * 0.9;
      s.addShape(pres.shapes.OVAL, {
        x: 0.6, y: y + 0.1, w: 0.45, h: 0.45, fill: { color: TEAL_PALE },
      });
      s.addText(String(i + 1), {
        x: 0.6, y: y + 0.15, w: 0.45, h: 0.35,
        fontFace: "Calibri", fontSize: 14, bold: true, color: TEAL, align: "center", margin: 0,
      });
      s.addText(w.t, {
        x: 1.3, y: y, w: 7.8, h: 0.35,
        fontFace: "Calibri", fontSize: 18, bold: true, color: PINE, margin: 0,
      });
      s.addText(w.d, {
        x: 1.3, y: y + 0.35, w: 7.8, h: 0.4,
        fontFace: "Calibri", fontSize: 14, color: MUTED, margin: 0,
      });
    });
  }

  // —— 7 Market ——
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    s.addText("MARKET & WEDGE", {
      x: 0.55, y: 0.35, w: 9, h: 0.28,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Start narrow. Expand from mastery.", {
      x: 0.55, y: 0.7, w: 9, h: 0.5,
      fontFace: "Georgia", fontSize: 26, color: PINE, margin: 0,
    });

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y: 1.45, w: 4.35, h: 3.5, fill: { color: PINE }, rectRadius: 0.12,
    });
    s.addText("BEACHHEAD", {
      x: 0.85, y: 1.75, w: 3.8, h: 0.3,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Parents of ages ~8–16\nNightly 1-on-1 help\nacross school subjects", {
      x: 0.85, y: 2.25, w: 3.8, h: 1.5,
      fontFace: "Georgia", fontSize: 20, color: WHITE, margin: 0,
    });
    s.addText("Wedge = how we teach when stuck—not a single-subject silo", {
      x: 0.85, y: 4.1, w: 3.8, h: 0.55,
      fontFace: "Calibri", fontSize: 13, color: "A8C5C0", margin: 0,
    });

    const expand = [
      { t: "Next", d: "Exam prep across subjects" },
      { t: "Then", d: "Exam packs & more subjects" },
      { t: "Scale", d: "Per-seat bulk for schools (still 1 login = 1 learner)" },
    ];
    expand.forEach((e, i) => {
      const y = 1.45 + i * 1.15;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 5.15, y, w: 4.3, h: 1.0, fill: { color: WHITE }, rectRadius: 0.1, shadow: shadow(),
      });
      s.addText(e.t, {
        x: 5.4, y: y + 0.18, w: 3.8, h: 0.28,
        fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, margin: 0,
      });
      s.addText(e.d, {
        x: 5.4, y: y + 0.48, w: 3.8, h: 0.35,
        fontFace: "Calibri", fontSize: 16, bold: true, color: PINE, margin: 0,
      });
    });
  }

  // —— 8 Business ——
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    s.addText("BUSINESS MODEL & GTM", {
      x: 0.55, y: 0.3, w: 9, h: 0.28,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Consumer first. Institutions when trust is earned.", {
      x: 0.55, y: 0.65, w: 9, h: 0.45,
      fontFace: "Georgia", fontSize: 24, color: PINE, margin: 0,
    });

    const cols = [
      { h: "Revenue", items: ["Family subscription (core)", "Exam packs (seasonal)", "School / center licenses later"] },
      { h: "GTM", items: ["Paid beta, one geography", "Student digests to parent email + referrals", "Creators → micro-schools buying seats"] },
      { h: "North stars", items: ["Sessions / learner / week", "Intervention → success", "D30 + parent NPS + GM"] },
    ];
    cols.forEach((c, i) => {
      const x = 0.55 + i * 3.1;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: 1.4, w: 2.95, h: 3.5, fill: { color: WHITE }, rectRadius: 0.1, shadow: shadow(),
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.4, w: 2.95, h: 0.55, fill: { color: i === 1 ? TEAL : PINE },
      });
      s.addText(c.h, {
        x: x + 0.2, y: 1.5, w: 2.55, h: 0.35,
        fontFace: "Calibri", fontSize: 16, bold: true, color: WHITE, margin: 0,
      });
      s.addText(c.items.map((it, j) => ({
        text: it,
        options: { bullet: true, breakLine: j < c.items.length - 1 },
      })), {
        x: x + 0.2, y: 2.2, w: 2.55, h: 2.3,
        fontFace: "Calibri", fontSize: 14, color: INK, margin: 0, paraSpaceAfter: 10,
      });
    });
  }

  // —— 9 Competition ——
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    s.addText("COMPETITION", {
      x: 0.55, y: 0.3, w: 9, h: 0.28,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Not ChatGPT for homework.", {
      x: 0.55, y: 0.6, w: 9, h: 0.45,
      fontFace: "Georgia", fontSize: 26, color: PINE, margin: 0,
    });

    const table = [
      [
        { text: "Approach", options: { bold: true, color: WHITE, fill: { color: PINE } } },
        { text: "Gap vs Kindling", options: { bold: true, color: WHITE, fill: { color: PINE } } },
      ],
      ["Generic LLMs", "No durable learner model or child product system"],
      ["Homework solvers", "Answer speed ≠ mastery"],
      ["Adaptive banks", "Weak rescue + affect; often subject-siloed"],
      ["Tutor marketplaces", "Cost, scheduling, quality variance"],
      ["AI tutor apps", "Often wrappers; thin intervention stack"],
    ];
    s.addTable(table, {
      x: 0.55, y: 1.25, w: 9, h: 3.2,
      colW: [2.8, 6.2],
      border: [
        { pt: 0.5, color: "D0D8D4" },
        { pt: 0.5, color: "D0D8D4" },
        { pt: 0.5, color: "D0D8D4" },
        { pt: 0.5, color: "D0D8D4" },
      ],
      fontFace: "Calibri",
      fontSize: 13,
      color: INK,
      align: "left",
      valign: "middle",
      fill: { color: WHITE },
    });

    s.addText("Wedge: intervention + mastery + family loop + safety as infrastructure—across every subject they study.", {
      x: 0.55, y: 4.7, w: 9, h: 0.45,
      fontFace: "Calibri", fontSize: 13, italic: true, color: PINE, margin: 0,
    });
  }

  // —— 10 Ask ——
  {
    const s = pres.addSlide();
    s.background = { color: PINE };
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: TEAL },
    });
    s.addText("STATUS · TEAM · ASK", {
      x: 0.7, y: 0.35, w: 8.5, h: 0.3,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Ship the loop. Earn trust. Scale.", {
      x: 0.7, y: 0.7, w: 8.5, h: 0.5,
      fontFace: "Georgia", fontSize: 26, color: WHITE, margin: 0,
    });

    // status cards
    const stats = [
      { l: "Product", v: "Working tutor + API" },
      { l: "GTM", v: "Update before send" },
      { l: "Revenue", v: "Pre-revenue*" },
    ];
    stats.forEach((st, i) => {
      const x = 0.7 + i * 2.95;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: 1.4, w: 2.8, h: 1.15, fill: { color: "2C5048" }, rectRadius: 0.1,
      });
      s.addText(st.l, {
        x: x + 0.2, y: 1.55, w: 2.4, h: 0.3,
        fontFace: "Calibri", fontSize: 12, color: "A8C5C0", margin: 0,
      });
      s.addText(st.v, {
        x: x + 0.2, y: 1.9, w: 2.4, h: 0.4,
        fontFace: "Calibri", fontSize: 15, bold: true, color: WHITE, margin: 0,
      });
    });

    s.addText("Raising  ·  pre-seed  ·  12–18 months runway", {
      x: 0.7, y: 2.85, w: 8.5, h: 0.35,
      fontFace: "Calibri", fontSize: 16, bold: true, color: GOLD, margin: 0,
    });
    s.addText("Use of funds: paid beta → PMF metrics  ·  learning science + eval  ·  safety for institutions  ·  parent acquisition", {
      x: 0.7, y: 3.25, w: 8.5, h: 0.55,
      fontFace: "Calibri", fontSize: 14, color: "D7E3DD", margin: 0,
    });

    s.addText("We're not building a better answer engine.\nWe're building the tutor that stays—especially when learning is hard.", {
      x: 0.7, y: 4.05, w: 8.5, h: 0.8,
      fontFace: "Georgia", fontSize: 16, color: WHITE, margin: 0,
    });
    s.addText("founders@kindling.app  ·  Demo on request  ·  *Replace status before investor send", {
      x: 0.7, y: 5.1, w: 8.5, h: 0.28,
      fontFace: "Calibri", fontSize: 11, color: "7A9A94", margin: 0,
    });
  }

  await pres.writeFile({ fileName: out });
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});