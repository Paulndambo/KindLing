/**
 * Kindling — YC partner pitch deck (10 slides)
 * Run: node scripts/generate-yc-pitch.js
 *
 * Brand: pine / teal / cream / gold
 * Story: stuck moment → insight → living tutor → proof → moat → wedge → ask
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

const PINE = "1F3A34";
const TEAL = "3E8A8F";
const CREAM = "F6F2E9";
const WHITE = "FFFFFF";
const INK = "26302C";
const MUTED = "5C6B63";
const GOLD = "C99436";
const TEAL_PALE = "E1EFEE";
const PINE_SOFT = "2C5048";
const MINT = "A8C5C0";
const FOG = "7A9A94";
const LINE = "D0D8D4";

const out = path.join(__dirname, "..", "Kindling_YC_Pitch.pptx");

const shadow = () => ({
  type: "outer",
  color: "000000",
  blur: 10,
  offset: 3,
  angle: 135,
  opacity: 0.1,
});

const label = (s, text, y = 0.32) => {
  s.addText(text, {
    x: 0.55,
    y,
    w: 9,
    h: 0.28,
    fontFace: "Calibri",
    fontSize: 11,
    bold: true,
    color: TEAL,
    charSpacing: 2.5,
    margin: 0,
  });
};

const headline = (s, text, y = 0.62, opts = {}) => {
  s.addText(text, {
    x: 0.55,
    y,
    w: opts.w || 9,
    h: opts.h || 0.85,
    fontFace: "Georgia",
    fontSize: opts.size || 28,
    color: PINE,
    margin: 0,
    bold: false,
  });
};

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Kindling";
  pres.title = "Kindling — YC Pitch";
  pres.subject = "Y Combinator partner deck";

  // ═══════════════════════════════════════════════════════════
  // 1 — TITLE
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: PINE };

    // Left accent bar
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 0.16, h: 5.625, fill: { color: TEAL },
    });
    // Soft right panel for depth
    s.addShape(pres.shapes.RECTANGLE, {
      x: 7.6, y: 0, w: 2.4, h: 5.625, fill: { color: "1A322C" },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 7.6, y: 0, w: 0.04, h: 5.625, fill: { color: TEAL },
    });

    s.addText("KINDLING", {
      x: 0.7, y: 1.25, w: 6.5, h: 0.35,
      fontFace: "Calibri", fontSize: 13, bold: true, color: TEAL,
      charSpacing: 5, margin: 0,
    });

    s.addText("The tutor that stays\nwhen learning gets hard.", {
      x: 0.7, y: 1.75, w: 6.6, h: 1.55,
      fontFace: "Georgia", fontSize: 34, color: WHITE, margin: 0,
    });

    s.addText(
      "An AI private tutor that notices struggle, teaches through it,\nand builds real understanding—across every subject a learner studies.",
      {
        x: 0.7, y: 3.5, w: 6.5, h: 0.7,
        fontFace: "Calibri", fontSize: 14, color: MINT, margin: 0,
      }
    );

    s.addText("Pre-seed  ·  Working product  ·  Multi-subject adaptive tutoring", {
      x: 0.7, y: 4.45, w: 6.5, h: 0.3,
      fontFace: "Calibri", fontSize: 13, color: FOG, margin: 0,
    });

    // Right rail callouts
    const rail = [
      { n: "01", t: "Spots struggle" },
      { n: "02", t: "Teaches through it" },
      { n: "03", t: "Builds mastery" },
    ];
    rail.forEach((r, i) => {
      const y = 1.55 + i * 1.05;
      s.addText(r.n, {
        x: 7.9, y, w: 1.9, h: 0.28,
        fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, margin: 0,
      });
      s.addText(r.t, {
        x: 7.9, y: y + 0.28, w: 1.9, h: 0.5,
        fontFace: "Georgia", fontSize: 15, color: WHITE, margin: 0,
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 2 — PROBLEM
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    label(s, "THE PROBLEM");
    headline(s, "Great tutoring works.\nAlmost nobody gets it nightly.", 0.62, { h: 1.05, size: 28 });

    // Scene card — the emotional hook
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y: 1.85, w: 9, h: 1.2,
      fill: { color: PINE }, rectRadius: 0.1,
    });
    s.addText("9:40 PM. Homework open. The child is stuck.", {
      x: 0.85, y: 2.05, w: 8.4, h: 0.35,
      fontFace: "Georgia", fontSize: 18, color: WHITE, margin: 0,
    });
    s.addText(
      "A human tutor is $60–100/hr and not on call. ChatGPT hands over the answer. Parents see the grade weeks later. The teaching moment dies.",
      {
        x: 0.85, y: 2.5, w: 8.4, h: 0.4,
        fontFace: "Calibri", fontSize: 14, color: MINT, margin: 0,
      }
    );

    const cards = [
      { t: "Human tutors", d: "Scarce, expensive, impossible every night." },
      { t: "Schools", d: "Can't put a tutor on every child, every day." },
      { t: "Answer engines", d: "Speed to solutions—not understanding." },
      { t: "Parents", d: "See outcomes late; miss the stuck moment." },
    ];
    cards.forEach((c, i) => {
      const x = 0.55 + (i % 4) * 2.3;
      const y = 3.35;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w: 2.15, h: 1.7,
        fill: { color: WHITE }, rectRadius: 0.1, shadow: shadow(),
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 2.15, h: 0.08, fill: { color: i === 2 ? GOLD : TEAL },
      });
      s.addText(c.t, {
        x: x + 0.15, y: y + 0.28, w: 1.85, h: 0.4,
        fontFace: "Calibri", fontSize: 14, bold: true, color: PINE, margin: 0,
      });
      s.addText(c.d, {
        x: x + 0.15, y: y + 0.75, w: 1.85, h: 0.75,
        fontFace: "Calibri", fontSize: 13, color: MUTED, margin: 0,
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 3 — INSIGHT + SOLUTION
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    label(s, "THE INSIGHT");
    headline(
      s,
      "Tutoring quality is judgment under uncertainty—not more fluent AI text.",
      0.62,
      { h: 0.85, size: 24 }
    );

    // Two columns: others vs Kindling
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y: 1.7, w: 4.3, h: 3.4,
      fill: { color: WHITE }, rectRadius: 0.12, shadow: shadow(),
    });
    s.addText("WHAT MOST AI DOES", {
      x: 0.8, y: 1.95, w: 3.8, h: 0.3,
      fontFace: "Calibri", fontSize: 12, bold: true, color: MUTED, charSpacing: 1.5, margin: 0,
    });
    s.addText("Answer first.\nMove on.", {
      x: 0.8, y: 2.4, w: 3.8, h: 0.85,
      fontFace: "Georgia", fontSize: 26, color: PINE, margin: 0,
    });
    const leftPts = [
      "Fluent explanations without a learner model",
      "No durable memory of struggle patterns",
      "Help that can't exit or graduate",
      "Parents left outside the loop",
    ];
    s.addText(
      leftPts.map((p, i) => ({
        text: p,
        options: { bullet: true, breakLine: i < leftPts.length - 1 },
      })),
      {
        x: 0.8, y: 3.4, w: 3.8, h: 1.4,
        fontFace: "Calibri", fontSize: 13, color: MUTED, margin: 0, paraSpaceAfter: 6,
      }
    );

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 5.15, y: 1.7, w: 4.3, h: 3.4,
      fill: { color: PINE }, rectRadius: 0.12,
    });
    s.addText("WHAT KINDLING DOES", {
      x: 5.4, y: 1.95, w: 3.8, h: 0.3,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 1.5, margin: 0,
    });
    s.addText("Notice. Teach.\nThen get out of the way.", {
      x: 5.4, y: 2.4, w: 3.8, h: 0.85,
      fontFace: "Georgia", fontSize: 24, color: WHITE, margin: 0,
    });
    const rightPts = [
      "Socratic by default—any subject they bring",
      "Models correctness, affect & struggle each turn",
      "Graduated ladder L1–L4, exit anytime",
      "Mastery + family clarity as product systems",
    ];
    s.addText(
      rightPts.map((p, i) => ({
        text: p,
        options: { bullet: true, breakLine: i < rightPts.length - 1 },
      })),
      {
        x: 5.4, y: 3.4, w: 3.8, h: 1.4,
        fontFace: "Calibri", fontSize: 13, color: MINT, margin: 0, paraSpaceAfter: 6,
      }
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 4 — PRODUCT / LADDER (the hero proof slide)
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    label(s, "PRODUCT — WORKING TODAY");
    headline(s, "When a learner is stuck, Kindling has a plan.", 0.62, {
      h: 0.55,
      size: 26,
    });

    s.addText("Not a prompt trick—an intervention system with exit, levels, and evidence.", {
      x: 0.55, y: 1.2, w: 9, h: 0.35,
      fontFace: "Calibri", fontSize: 14, color: MUTED, margin: 0,
    });

    const ladder = [
      { l: "L1", t: "Micro-hint", d: "Nudge without spoiling" },
      { l: "L2", t: "Example", d: "Show the pattern once" },
      { l: "L3", t: "Full guide", d: "Step-by-step teaching" },
      { l: "L4", t: "Break / easier", d: "Protect confidence" },
    ];
    ladder.forEach((r, i) => {
      const x = 0.55 + i * 2.35;
      const isLast = i === 3;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: 1.7, w: 2.2, h: 1.7,
        fill: { color: isLast ? PINE : WHITE },
        rectRadius: 0.1,
        shadow: shadow(),
      });
      s.addText(r.l, {
        x: x + 0.18, y: 1.88, w: 1.85, h: 0.28,
        fontFace: "Calibri", fontSize: 12, bold: true,
        color: TEAL, margin: 0,
      });
      s.addText(r.t, {
        x: x + 0.18, y: 2.25, w: 1.85, h: 0.4,
        fontFace: "Georgia", fontSize: 18,
        color: isLast ? WHITE : PINE, margin: 0,
      });
      s.addText(r.d, {
        x: x + 0.18, y: 2.75, w: 1.85, h: 0.4,
        fontFace: "Calibri", fontSize: 13,
        color: isLast ? MINT : MUTED, margin: 0,
      });
    });

    // Bottom proof strip
    const proofs = [
      { t: "Live lessons", d: "Stream + voice + rich math/code" },
      { t: "Any subject", d: "Student-created paths" },
      { t: "Learner model", d: "Signals → directives" },
      { t: "Trust layer", d: "Safety, resume, digests" },
    ];
    proofs.forEach((p, i) => {
      const x = 0.55 + i * 2.35;
      s.addText(p.t, {
        x, y: 3.7, w: 2.2, h: 0.3,
        fontFace: "Calibri", fontSize: 14, bold: true, color: PINE, margin: 0,
      });
      s.addText(p.d, {
        x, y: 4.05, w: 2.2, h: 0.35,
        fontFace: "Calibri", fontSize: 13, color: MUTED, margin: 0,
      });
    });

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y: 4.6, w: 9, h: 0.65,
      fill: { color: TEAL_PALE }, rectRadius: 0.08,
    });
    s.addText("Demo punchline: other bots give the answer. Kindling teaches through the stuck moment.", {
      x: 0.75, y: 4.75, w: 8.6, h: 0.35,
      fontFace: "Calibri", fontSize: 14, italic: true, color: PINE, margin: 0,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 5 — HOW IT WORKS / MOAT
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    label(s, "HOW IT WORKS");
    headline(s, "Own the learning system. Rent the model.", 0.62, {
      h: 0.55,
      size: 26,
    });

    const steps = [
      { n: "01", t: "Turn", d: "Answer, pause, upload work, speak" },
      { n: "02", t: "Signals", d: "Correctness, affect, struggle, misconceptions" },
      { n: "03", t: "Model", d: "Living profile + skill mastery over time" },
      { n: "04", t: "Policy", d: "Ladder, examples, digests, next move" },
    ];
    steps.forEach((st, i) => {
      const x = 0.55 + i * 2.35;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: 1.4, w: 2.2, h: 2.7,
        fill: { color: WHITE }, rectRadius: 0.1, shadow: shadow(),
      });
      s.addShape(pres.shapes.OVAL, {
        x: x + 0.75, y: 1.7, w: 0.7, h: 0.7,
        fill: { color: TEAL_PALE },
      });
      s.addText(st.n, {
        x: x + 0.75, y: 1.85, w: 0.7, h: 0.4,
        fontFace: "Calibri", fontSize: 14, bold: true, color: TEAL,
        align: "center", margin: 0,
      });
      s.addText(st.t, {
        x: x + 0.15, y: 2.65, w: 1.9, h: 0.4,
        fontFace: "Georgia", fontSize: 20, color: PINE,
        align: "center", margin: 0,
      });
      s.addText(st.d, {
        x: x + 0.15, y: 3.2, w: 1.9, h: 0.65,
        fontFace: "Calibri", fontSize: 13, color: MUTED,
        align: "center", margin: 0,
      });
    });

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y: 4.35, w: 9, h: 0.85,
      fill: { color: PINE }, rectRadius: 0.1,
    });
    s.addText("MOAT PATH", {
      x: 0.85, y: 4.48, w: 2, h: 0.22,
      fontFace: "Calibri", fontSize: 11, bold: true, color: TEAL, charSpacing: 1.5, margin: 0,
    });
    s.addText(
      "Session data  ×  intervention policies  ×  curriculum graphs  ×  parent trust  —  not the base LLM.",
      {
        x: 0.85, y: 4.78, w: 8.4, h: 0.3,
        fontFace: "Calibri", fontSize: 15, color: WHITE, margin: 0,
      }
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 6 — WHY NOW
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    label(s, "WHY NOW");
    headline(s, "The window is open for a pedagogy company.", 0.62, {
      h: 0.55,
      size: 26,
    });

    const why = [
      {
        t: "LLM capability crossed the bar",
        d: "Warm multi-turn tutoring UX is finally good enough to ship as a product—not a demo.",
      },
      {
        t: "Budgets already exist",
        d: "Parents already pay for tutors, apps, and test prep. We redirect spend to outcomes.",
      },
      {
        t: "Structural gaps are permanent",
        d: "Teacher shortage and learning loss are not a fad. Nightly 1-on-1 help is chronically scarce.",
      },
      {
        t: "Category risk is real",
        d: "If free answers win the homework habit, serious learning loses. Own trust + teaching policy now.",
      },
    ];
    why.forEach((w, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.55 + col * 4.7;
      const y = 1.45 + row * 1.75;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w: 4.45, h: 1.55,
        fill: { color: WHITE }, rectRadius: 0.1, shadow: shadow(),
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 0.12, h: 1.55, fill: { color: i === 3 ? GOLD : TEAL },
      });
      s.addText(String(i + 1).padStart(2, "0"), {
        x: x + 0.35, y: y + 0.25, w: 0.6, h: 0.3,
        fontFace: "Calibri", fontSize: 13, bold: true, color: TEAL, margin: 0,
      });
      s.addText(w.t, {
        x: x + 0.35, y: y + 0.55, w: 3.85, h: 0.35,
        fontFace: "Calibri", fontSize: 16, bold: true, color: PINE, margin: 0,
      });
      s.addText(w.d, {
        x: x + 0.35, y: y + 0.95, w: 3.85, h: 0.4,
        fontFace: "Calibri", fontSize: 13, color: MUTED, margin: 0,
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 7 — MARKET & WEDGE
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    label(s, "MARKET & WEDGE");
    headline(s, "Start where the pain is nightly.\nExpand from how we teach when stuck.", 0.62, {
      h: 1.0,
      size: 26,
    });

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y: 1.85, w: 4.35, h: 3.2,
      fill: { color: PINE }, rectRadius: 0.12,
    });
    s.addText("BEACHHEAD", {
      x: 0.85, y: 2.15, w: 3.8, h: 0.28,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2, margin: 0,
    });
    s.addText("Learners ~8–16\nwho need 1-on-1 help\nacross school subjects—\ntonight.", {
      x: 0.85, y: 2.55, w: 3.8, h: 1.55,
      fontFace: "Georgia", fontSize: 20, color: WHITE, margin: 0,
    });
    s.addText("Wedge = intervention quality, not a single-subject silo.", {
      x: 0.85, y: 4.3, w: 3.8, h: 0.45,
      fontFace: "Calibri", fontSize: 13, color: MINT, margin: 0,
    });

    const expand = [
      { t: "NEXT", d: "Exam prep across subjects" },
      { t: "THEN", d: "Seasonal packs & deeper domains" },
      { t: "SCALE", d: "Per-seat bulk for schools & centers\n(still 1 login = 1 learner)" },
    ];
    expand.forEach((e, i) => {
      const y = 1.85 + i * 1.1;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 5.15, y, w: 4.3, h: 0.95,
        fill: { color: WHITE }, rectRadius: 0.1, shadow: shadow(),
      });
      s.addText(e.t, {
        x: 5.4, y: y + 0.15, w: 3.8, h: 0.25,
        fontFace: "Calibri", fontSize: 11, bold: true, color: TEAL, charSpacing: 1.5, margin: 0,
      });
      s.addText(e.d, {
        x: 5.4, y: y + 0.42, w: 3.8, h: 0.4,
        fontFace: "Calibri", fontSize: 15, bold: true, color: PINE, margin: 0,
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 8 — BUSINESS & GTM
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    label(s, "BUSINESS MODEL & GTM");
    headline(s, "Consumer seats first.\nInstitutions when trust is earned.", 0.62, {
      h: 0.95,
      size: 26,
    });

    const cols = [
      {
        h: "Revenue",
        accent: PINE,
        items: [
          "Family subscription per learner",
          "Exam packs (seasonal upsell)",
          "School / center seat licenses later",
        ],
      },
      {
        h: "GTM",
        accent: TEAL,
        items: [
          "Paid beta in one geography",
          "Digest emails → parent loop + referrals",
          "Creators & micro-schools buying seats",
        ],
      },
      {
        h: "North stars",
        accent: PINE,
        items: [
          "Sessions / learner / week",
          "Intervention → success rate",
          "D30 · parent NPS · GM after AI",
        ],
      },
    ];
    cols.forEach((c, i) => {
      const x = 0.55 + i * 3.1;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: 1.85, w: 2.95, h: 2.95,
        fill: { color: WHITE }, rectRadius: 0.1, shadow: shadow(),
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.85, w: 2.95, h: 0.55, fill: { color: c.accent },
      });
      s.addText(c.h, {
        x: x + 0.2, y: 1.95, w: 2.55, h: 0.35,
        fontFace: "Calibri", fontSize: 16, bold: true, color: WHITE, margin: 0,
      });
      s.addText(
        c.items.map((it, j) => ({
          text: it,
          options: { bullet: true, breakLine: j < c.items.length - 1 },
        })),
        {
          x: x + 0.2, y: 2.65, w: 2.55, h: 1.9,
          fontFace: "Calibri", fontSize: 14, color: INK, margin: 0, paraSpaceAfter: 14,
        }
      );
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 9 — COMPETITION
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: CREAM };
    label(s, "COMPETITION");
    headline(s, "Not ChatGPT for homework.", 0.62, { h: 0.5, size: 28 });

    const rows = [
      { a: "Generic LLMs", g: "No durable learner model or child product system" },
      { a: "Homework solvers", g: "Answer speed ≠ mastery" },
      { a: "Adaptive banks", g: "Weak rescue + affect; often subject-siloed" },
      { a: "Tutor marketplaces", g: "Cost, scheduling, quality variance" },
      { a: "AI tutor apps", g: "Often wrappers; thin intervention stack" },
    ];

    // Header
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.55, y: 1.3, w: 9, h: 0.5, fill: { color: PINE },
    });
    s.addText("Approach", {
      x: 0.75, y: 1.4, w: 2.6, h: 0.3,
      fontFace: "Calibri", fontSize: 13, bold: true, color: WHITE, margin: 0,
    });
    s.addText("Gap vs Kindling", {
      x: 3.5, y: 1.4, w: 5.8, h: 0.3,
      fontFace: "Calibri", fontSize: 13, bold: true, color: WHITE, margin: 0,
    });

    rows.forEach((r, i) => {
      const y = 1.8 + i * 0.52;
      const bg = i % 2 === 0 ? WHITE : TEAL_PALE;
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.55, y, w: 9, h: 0.52, fill: { color: bg },
      });
      s.addText(r.a, {
        x: 0.75, y: y + 0.12, w: 2.6, h: 0.3,
        fontFace: "Calibri", fontSize: 14, bold: true, color: PINE, margin: 0,
      });
      s.addText(r.g, {
        x: 3.5, y: y + 0.12, w: 5.8, h: 0.3,
        fontFace: "Calibri", fontSize: 14, color: INK, margin: 0,
      });
    });

    s.addText(
      "Our wedge: intervention + mastery + family loop + safety as infrastructure—across every subject they study.",
      {
        x: 0.55, y: 4.55, w: 9, h: 0.45,
        fontFace: "Calibri", fontSize: 14, italic: true, color: PINE, margin: 0,
      }
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 10 — ASK / CLOSE
  // ═══════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: PINE };
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 0.16, h: 5.625, fill: { color: TEAL },
    });

    s.addText("THE ASK", {
      x: 0.7, y: 0.35, w: 8.5, h: 0.28,
      fontFace: "Calibri", fontSize: 12, bold: true, color: TEAL, charSpacing: 2.5, margin: 0,
    });
    s.addText("Ship the loop. Earn trust. Scale.", {
      x: 0.7, y: 0.7, w: 8.5, h: 0.5,
      fontFace: "Georgia", fontSize: 28, color: WHITE, margin: 0,
    });

    const stats = [
      { l: "Product", v: "Working full-stack tutor" },
      { l: "Stage", v: "Pre-seed · private demo" },
      { l: "Model", v: "Per-learner seats" },
    ];
    stats.forEach((st, i) => {
      const x = 0.7 + i * 2.95;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: 1.4, w: 2.8, h: 1.1,
        fill: { color: PINE_SOFT }, rectRadius: 0.1,
      });
      s.addText(st.l, {
        x: x + 0.2, y: 1.55, w: 2.4, h: 0.28,
        fontFace: "Calibri", fontSize: 12, color: MINT, margin: 0,
      });
      s.addText(st.v, {
        x: x + 0.2, y: 1.9, w: 2.4, h: 0.4,
        fontFace: "Calibri", fontSize: 15, bold: true, color: WHITE, margin: 0,
      });
    });

    s.addText("Raising pre-seed  ·  12–18 months runway", {
      x: 0.7, y: 2.8, w: 8.5, h: 0.35,
      fontFace: "Calibri", fontSize: 17, bold: true, color: GOLD, margin: 0,
    });
    s.addText(
      "Use of funds: paid beta → PMF metrics  ·  learning science + eval harness  ·  safety depth  ·  parent acquisition",
      {
        x: 0.7, y: 3.2, w: 8.5, h: 0.45,
        fontFace: "Calibri", fontSize: 14, color: MINT, margin: 0,
      }
    );

    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.7, y: 3.85, w: 1.2, h: 0.04, fill: { color: TEAL },
    });

    s.addText(
      "We're not building a better answer engine.\nWe're building the tutor that stays—especially when learning is hard.",
      {
        x: 0.7, y: 4.1, w: 8.5, h: 0.75,
        fontFace: "Georgia", fontSize: 17, color: WHITE, margin: 0,
      }
    );
    s.addText("founders@kindling.app  ·  Demo on request", {
      x: 0.7, y: 5.1, w: 8.5, h: 0.28,
      fontFace: "Calibri", fontSize: 12, color: FOG, margin: 0,
    });
  }

  await pres.writeFile({ fileName: out });
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
