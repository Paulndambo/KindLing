import {
  Ear,
  RefreshCw,
  BookOpen,
  Calculator,
  BookMarked,
  FlaskConical,
  Globe,
  Target,
  Code2,
  BrainCircuit,
  ShieldCheck,
  Camera,
  Volume2,
  Mail,
} from "lucide-react";

export const HERO_PATHS = [
  {
    id: "math",
    label: "Math · Fractions",
    topicTitle: "Comparing & Dividing Fractions",
    nodes: [
      "Counting parts",
      "Equal shares",
      "Comparing fractions",
      "Dividing fractions",
      "Mixed numbers",
    ],
    pulse: {
      mastery: "78% BKT",
      confidence: "Steady · Rising",
      adi: "86% Independent",
      policy: "scaffold_visual_analogy",
    },
    studentTurn: "Wait, why is 1/3 bigger than 1/4 when 4 is a bigger number?",
    tutorTurn:
      "Spot-on question! Imagine sharing one warm pizza: if 3 friends share it vs. 4 friends sharing it, which group gets the bigger slice?",
    chips: [
      "3 friends get bigger slices!",
      "Show me with fraction bars",
      "Let me try comparing 2/3 and 2/5",
    ],
  },
  {
    id: "cs",
    label: "Computer Science",
    topicTitle: "Loops, State & File Systems",
    nodes: [
      "Files & folders",
      "How code runs",
      "Variables & state",
      "Loops & conditions",
      "Functions",
    ],
    pulse: {
      mastery: "84% BKT",
      confidence: "High · Curious",
      adi: "91% Independent",
      policy: "socratic_trace_step",
    },
    studentTurn: "My while loop never stops printing! Did I break Python?",
    tutorTurn:
      "You didn't break Python—you just wrote your first infinite loop! Look at `count = 1` inside the loop: does `count` ever change before the next check?",
    chips: [
      "Oh! I forgot count += 1",
      "Trace it line by line",
      "Give me a twin loop to fix",
    ],
  },
  {
    id: "science",
    label: "Science · Forces",
    topicTitle: "Newton's Laws & Free-Body Diagrams",
    nodes: [
      "Push & pull",
      "Net force",
      "Balanced motion",
      "Acceleration (F=ma)",
      "Action & reaction",
    ],
    pulse: {
      mastery: "72% BKT",
      confidence: "Rebuilding",
      adi: "79% Independent",
      policy: "remediate_misconception",
    },
    studentTurn:
      "If a hockey puck is sliding on ice at constant speed, isn't a forward force keeping it moving?",
    tutorTurn:
      "That's the #1 trap in physics! Once your stick stops touching the puck, what's actually pushing it forward on frictionless ice?",
    chips: [
      "Nothing is pushing it!",
      "Draw the force arrows",
      "Test me with a quick check",
    ],
  },
];

export const CONTRAST_ITEMS = [
  {
    tag: "Generic AI Chatbots",
    tone: "muted",
    title: "Dumps the final answer in 2 seconds",
    verdict: "Homework is finished, but Friday's test is a blank page.",
    points: [
      "Solves the problem for the student instead of diagnosing the gap",
      "No memory of what clicked yesterday or which misconceptions repeat",
      "Zero pacing control—floods struggling learners with walls of text",
    ],
  },
  {
    tag: "Rigid Drill & Worksheet Apps",
    tone: "muted",
    title: "Repeats the same static hint on loop",
    verdict: "Frustrating when one explanation doesn't match how you think.",
    points: [
      "Plays back the exact same canned video or hint after every wrong click",
      "Can't answer \"Wait, why did we flip that second fraction?\"",
      "Traps fast thinkers in repetitive busywork they already mastered",
    ],
  },
  {
    tag: "Kindling Learning Intelligence",
    tone: "featured",
    title: "Stays in the stuck moment until it clicks",
    verdict: "Builds real, transferable mastery—and proves it solo.",
    points: [
      "Socratic by default; steps onto a 4-rung help ladder when you stall",
      "Tracks live LearnerState (L1), Pedagogical Policy (L2), and Independence (L3)",
      "Verifies understanding with a no-scaffold twin problem (L4) before moving on",
    ],
  },
];

export const LADDER_STAGES = [
  {
    id: "socratic",
    rung: "Default Mode",
    badge: "Socratic Discovery",
    title: "Starts by listening and asking the right guiding question",
    desc: "When a student begins a problem, Kindling doesn't lecture or hand over steps. It grounds the concept in their interests and checks how they reason.",
    studentMsg: "I need to solve 3/4 ÷ 1/8, but I always forget which one to flip.",
    tutorMsg:
      "Instead of memorizing a flip rule right away, let's think about what `3/4 ÷ 1/8` is actually asking: **How many eighth-sized pieces fit inside three-fourths?**",
    visualType: "fraction-bars",
    visualCaption: "Interactive Fraction Bars: Comparing 3/4 against 1/8 slices",
    chips: ["Looks like 6 eighth-pieces fit!", "Why does multiplying by 8/1 give the same thing?", "Give me a hint"],
    telemetry: {
      state: "Exploring · High engagement · Think-time 9s",
      misconception: "Procedural rule without conceptual anchor (invert-and-multiply)",
      policy: "L2 Action: socratic_conceptual_anchor",
      adi: "ADI: 92% (High solo agency)",
    },
  },
  {
    id: "rung1",
    rung: "Rung 1 · Micro-Hint",
    badge: "Gentle Nudge",
    title: "Spots hesitation and highlights the exact next move",
    desc: "If the learner pauses or misses a turn, Kindling offers Rung 1: a surgical micro-hint that points attention to the right spot while keeping the student in the driver's seat.",
    studentMsg: "Okay, I see 6 pieces in the bar, but how do I write that with numbers for 2/3 ÷ 1/6?",
    tutorMsg:
      "**Micro-hint:** Ask the same question first—how many `1/6` pieces fit inside **one whole**? Once you have that, how many fit inside `2/3` of a whole?",
    visualType: "hint-callout",
    visualCaption: "Rung 1 Active · Highlighting the unit-fraction bridge",
    chips: ["6 sixths in a whole, so 4 in 2/3!", "Show me a worked example instead", "Step-by-step guide"],
    telemetry: {
      state: "Hesitation detected · 1 partial turn",
      misconception: "Scaling from unit fraction to non-unit dividend",
      policy: "L2 Action: ladder_rung_1_micro_hint",
      adi: "ADI: 85% (Light scaffold active)",
    },
  },
  {
    id: "rung2",
    rung: "Rung 2 · Worked Example",
    badge: "Parallel Example",
    title: "Pulls a curated parallel example so you never spoil your own problem",
    desc: "Need to see the full motion first? Rung 2 brings in a curated twin example from Kindling's library, walking through the why and the how side-by-side.",
    studentMsg: "Can you show me a full example with different numbers first?",
    tutorMsg:
      "Let's walk through a parallel example together: **`4/5 ÷ 2/15`**.\n1. **Common denominator view:** `4/5` is the same as `12/15`.\n2. **Count the groups:** How many `2/15` groups fit in `12/15`? Just `12 ÷ 2 = 6`.\n3. **Reciprocal shortcut:** `4/5 × 15/2 = 60/10 = 6` — flipping the divisor counts those exact same groups in one step!",
    visualType: "worked-card",
    visualCaption: "Curated Worked-Example Library · Grade-calibrated parallel item",
    chips: ["Now let me try 2/3 ÷ 1/6 again!", "Break my problem into steps", "Exit help ladder"],
    telemetry: {
      state: "Studying parallel example · Affect steady",
      misconception: "Bridging common-denominator division to reciprocal multiplication",
      policy: "L2 Action: ladder_rung_2_worked_example",
      adi: "ADI: 74% (Guided example view)",
    },
  },
  {
    id: "rung3",
    rung: "Rung 3 · Full Step Guide",
    badge: "Multi-Step Co-Pilot",
    title: "Breaks complex problems into verifiable intermediate steps",
    desc: "For multi-step math, science, or code, Rung 3 opens Show-Your-Work mode—checking each line as you go and awarding partial credit for sound reasoning.",
    studentMsg: "Let's do 2/3 ÷ 1/6 step by step so I'm 100% sure.",
    tutorMsg:
      "Let's lock in each step on your workbench:\n- **Step 1 (Checked ✓):** Keep the dividend `2/3`.\n- **Step 2 (Checked ✓):** Multiply by the reciprocal of `1/6`, which is `6/1`.\n- **Step 3 (Your turn):** Multiply across `(2 × 6) / (3 × 1)` and simplify!",
    visualType: "multistep-check",
    visualCaption: "Multi-Step Verifier (B6) · 2 of 3 intermediate steps verified",
    chips: ["12 / 3 = 4!", "Check my step", "Exit help anytime"],
    telemetry: {
      state: "Step 2/3 verified · Confidence rebounding",
      misconception: "Resolved — reciprocal set up accurately",
      policy: "L2 Action: ladder_rung_3_step_guide",
      adi: "ADI: 68% → Ready for solo transfer",
    },
  },
  {
    id: "transfer",
    rung: "L4 · Independence Check",
    badge: "Solo Mastery Proof",
    title: "Removes the training wheels with a no-scaffold twin problem",
    desc: "Getting an answer with help isn't the finish line. Kindling's L4 Independence Engine immediately offers a fresh twin problem with zero hints to prove you own the skill.",
    studentMsg: "Got 4! Can I try one completely on my own now?",
    tutorMsg:
      "**Independence Check unlocked!** No hints, no scaffolds—just you:\n\nSolve **`5/6 ÷ 5/12`** on your own and tell me how you know your answer makes sense.",
    visualType: "spark-award",
    visualCaption: "L4 Transfer Passed → +12% BKT Mastery & Skill Spark Awarded",
    chips: ["It's 2, because 5/6 is 10/12!", "Open a real live lesson →"],
    telemetry: {
      state: "Solo transfer passed on 1st attempt!",
      misconception: "Cleared · Added to SM-2 Review Spark schedule",
      policy: "L2 Action: l4_independence_transfer_verify",
      adi: "ADI: 90% (Independent mastery confirmed)",
    },
  },
];

export const FLOW = [
  {
    step: "01",
    Icon: Ear,
    badge: "L1 · Learner State",
    title: "Listens to how you think",
    body: "Kindling reads what you write, say, or sketch—tracking hesitation, think-time, confidence, and specific domain misconceptions, not just right or wrong.",
  },
  {
    step: "02",
    Icon: BrainCircuit,
    badge: "L2 · Pedagogical Policy",
    title: "Chooses the right teaching move",
    body: "Before a single word streams, Kindling's policy engine selects the exact pedagogical move: a Socratic nudge, a visual manipulative, a worked example, or a hands-on checklist.",
  },
  {
    step: "03",
    Icon: RefreshCw,
    badge: "L3 · Graduated Help Ladder",
    title: "Adapts pace & scaffolding live",
    body: "Breezing through? It raises the challenge immediately. Stuck? Step onto the 4-rung help ladder—or exit help anytime with full learner agency.",
  },
  {
    step: "04",
    Icon: BookOpen,
    badge: "L4 · Transfer & Spaced Review",
    title: "Proves solo mastery that sticks",
    body: "Every guided breakthrough closes with a no-scaffold twin check, updates your BKT skill graph, and schedules short Review Sparks so nothing gets rusty.",
  },
];

export const MARKETING_SUBJECTS = [
  {
    Icon: Calculator,
    bg: "var(--teal-pale)",
    tag: "Visual Manipulatives + Verifier",
    title: "Mathematics",
    body: "From fractions and pre-algebra to calculus—with interactive fraction bars, number lines, KaTeX notation, and multi-step show-your-work verification.",
    highlights: ["Interactive Fraction Bars & Number Lines", "Step-by-step algebra verifier", "Curated misconception playbooks"],
  },
  {
    Icon: Code2,
    bg: "#FBEBD9",
    tag: "Seeded Flagship Curriculum",
    title: "Computer Science & Coding",
    body: "From practical digital literacy (files, folders, browser safety) to Python loops, systems, and debugging—with hands-on try-it checklists and line-by-line code review.",
    highlights: ["Digital literacy to Python & systems", "Practical device how-to guides", "Live code blocks & trace tables"],
  },
  {
    Icon: FlaskConical,
    bg: "var(--pine-pale)",
    tag: "Inquiry + Concept Checks",
    title: "Physical & Life Sciences",
    body: "Physics, chemistry, biology, and earth science taught through real-world phenomena, ASCII force/circuit diagrams, and 5-item transfer quick checks.",
    highlights: ["8 scaffolded science domains", "Before/after concept checks", "Everyday phenomenon analogies"],
  },
  {
    Icon: BookMarked,
    bg: "#FBEBD9",
    tag: "Author-First Coaching",
    title: "Reading & Writing",
    body: "Comprehension, argument structure, grammar, and voice—coached so the student stays the author of every sentence instead of AI rewriting their essay.",
    highlights: ["Keep-the-learner-as-author policy", "Paragraph & thesis scaffolding", "Close-reading Socratic prompts"],
  },
  {
    Icon: Globe,
    bg: "#F6E1E1",
    tag: "Voice TTS + STT Practice",
    title: "World Languages",
    body: "Natural conversation practice with read-aloud pronunciation (TTS), speech-to-text input, and patient, in-context grammar correction at any proficiency level.",
    highlights: ["Speak & listen in real time", "Gentle inline correction", "Cultural & everyday scenarios"],
  },
  {
    Icon: Target,
    bg: "var(--teal-pale)",
    tag: "Diagnostic Gap Finder",
    title: "Test Prep & Custom Topics",
    body: "Bring any syllabus, exam unit, or tonight's homework photo. Kindling isolates the exact prerequisite gap instead of making you grind through 50 generic questions.",
    highlights: ["Snap a homework photo for guided help", "Build custom subjects & units", "SM-2 spaced Review Sparks"],
  },
];

export const PLATFORM_PILLARS = [
  {
    Icon: Camera,
    eyebrow: "Homework Photo Window",
    title: "Snap tonight's worksheet. Get guided teaching, not a cheat sheet.",
    body: "Upload a photo or PDF of a tricky homework problem. Kindling extracts the prompt, identifies the underlying skill, and walks you through it step by step.",
  },
  {
    Icon: Volume2,
    eyebrow: "Multimodal Voice & Visuals",
    title: "Talk out loud, listen back, and manipulate concepts visually.",
    body: "Every tutor message supports natural Read-Aloud (TTS), microphone speech input, LaTeX math, copyable code blocks, and interactive fraction & number-line tools.",
  },
  {
    Icon: Mail,
    eyebrow: "Family Digest & Progress Pulse",
    title: "Warm visibility for parents—without surveillance or nagging.",
    body: "Students can opt in to send weekly Family Digests highlighting effort & heart, concepts mastered, and upcoming focus areas—no separate parent login required.",
  },
  {
    Icon: ShieldCheck,
    eyebrow: "Safety Floor & Learner Agency",
    title: "Age-aware guardrails and zero-shame emotional check-ins.",
    body: "Built-in affect check-ins notice frustration early and offer a breather or a gentler angle. Age-band safety policies and instant data export/delete come standard.",
  },
];

export const QUOTES = [
  {
    q: "I finally get fractions. When the number line didn't click, Kindling switched to pizza slices and fraction bars until I could solve the twin problem solo.",
    attr: "Sam, 5th grade",
    tag: "Math · Fractions & Mixed Numbers",
    metric: "Mastery up +34% in 2 weeks",
  },
  {
    q: "It remembers what I already know, so I don't waste time redoing easy stuff—and when my Python loop broke, it helped me find the bug myself instead of rewriting my code.",
    attr: "Jordan, 8th grade",
    tag: "Computer Science · Python Pilot",
    metric: "91% Solo Independence (ADI)",
  },
  {
    q: "9:30 PM physics used to mean tears or ChatGPT copying. Now Avery steps onto the help ladder, learns the why, and I get a Sunday digest showing real effort and growth.",
    attr: "Elena, parent of a 10th grader",
    tag: "High School Physics & Algebra",
    metric: "4 sessions/week · Family Digest",
  },
];

export const OVERVIEW_FAQS = [
  {
    q: "How is Kindling different from ChatGPT or homework solver apps?",
    a: "Generic AI chatbots are built to hand over the finished answer as fast as possible—which finishes the worksheet but leaves the student stuck on test day. Kindling is a Learning Intelligence Platform: it teaches Socratically by default, tracks a live LearnerState (L1) and Assistance Dependency Index (L3), steps onto a 4-rung graduated help ladder when you stall, and verifies solo mastery with a no-scaffold twin problem (L4).",
  },
  {
    q: "Am I locked into pre-made lessons, or can I study my own school subjects?",
    a: "Both! Kindling comes with a deeply scaffolded Computer Science curriculum plus rich math, science, and writing packs—and you can create unlimited custom subjects, units, and topics calibrated to your exact grade, country, school, and learning goals. You can even upload a homework photo for guided help.",
  },
  {
    q: "What happens when a student gets frustrated or genuinely stuck?",
    a: "Kindling detects struggle signals (repeated misses, long hesitation, or frustration cues) and gently offers its 4-rung Help Ladder: (1) a surgical Micro-Hint, (2) a curated Parallel Worked Example, (3) an interactive Multi-Step Guide, or (4) a Prerequisite Reset / breather. The learner is always in control and can escalate or exit help at any time.",
  },
  {
    q: "How do the Spark and Premium plans work?",
    a: "Every seat is for one individual learner. Spark is free and includes the adaptive tutor with a daily platform AI limit. Premium ($25/mo) adds a larger AI allowance, every provider, advanced routing, homework photo help, guardian digests, and priority support.",
  },
  {
    q: "How do parents or guardians follow along?",
    a: "Inside the Student Dashboard, learners and families can see the live Mastery Path, Confidence & Independence charts, Skill Sparks, and session journals. Learners can also configure an optional weekly Family Digest email that celebrates effort, persistence, and what clicked—without requiring a separate parent surveillance login.",
  },
];


