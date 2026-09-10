if(typeof import.meta!=='undefined'){try{import.meta.env=import.meta.env||{VITE_API_URL:'http://127.0.0.1:8000'}}catch(e){}}

// scripts/smoke-pedagogy-l2.mjs
import assert from "node:assert/strict";

// src/services/learning/types.js
var LearningEventType = {
  SESSION_START: "session.start",
  SESSION_END: "session.end",
  /** Epic B8 — end-of-session reflection (phase: prompted | response | skipped) */
  SESSION_REFLECT: "session.reflect",
  /** Epic C1 — spaced review */
  REVIEW_STARTED: "review.started",
  REVIEW_COMPLETED: "review.completed",
  /** Epic G1 — light spark challenge (optional, no badge inventory) */
  CHALLENGE_STARTED: "challenge.started",
  CHALLENGE_COMPLETED: "challenge.completed",
  TURN_EXCHANGE: "turn.exchange",
  HINT_REQUESTED: "behavior.hint_requested",
  TOOL_TOGGLED: "behavior.tool_toggled",
  TOPIC_SWITCHED: "session.topic_switched",
  VOICE_USED: "behavior.voice_input",
  PROFILE_SNAPSHOT: "profile.snapshot",
  INTERVENTION_OFFERED: "intervention.offered",
  INTERVENTION_ENTERED: "intervention.entered",
  INTERVENTION_EXITED: "intervention.exited",
  INTERVENTION_DECLINED: "intervention.declined",
  /** Interactive manipulative use (Epic A6) */
  MANIPULATIVE_USED: "behavior.manipulative_used",
  /** Epic B1 — richer struggle signals (payload.signal = subtype) */
  STRUGGLE_SIGNAL: "struggle.signal",
  /** Epic B3 — affective check-in prompted / answered */
  AFFECT_CHECKIN: "affect.checkin",
  /** Epic B3 — persistence moment celebrated (optional metric) */
  PERSISTENCE_NOTED: "affect.persistence",
  /** Epic B5 */
  MISCONCEPTION_DETECTED: "misconception.detected",
  MISCONCEPTION_REMEDIATED: "misconception.remediated",
  /** Epic B6 */
  MULTISTEP_STARTED: "multistep.started",
  MULTISTEP_STEP: "multistep.step",
  MULTISTEP_COMPLETED: "multistep.completed",
  MULTISTEP_EXITED: "multistep.exited",
  /** Epic C6 — low-stakes assessment / quick check */
  ASSESSMENT_STARTED: "assessment.started",
  ASSESSMENT_ANSWERED: "assessment.answered",
  ASSESSMENT_COMPLETED: "assessment.completed",
  ASSESSMENT_EXITED: "assessment.exited",
  /** Epic L3 — Assistance Dependency Index snapshot */
  LEARNING_ADI: "learning.adi",
  /** Epic L2 — pedagogical policy decision (LLM executes this move) */
  PEDAGOGY_DECISION: "pedagogy.decision"
};

// src/services/learning/struggleThresholds.js
var STRUGGLE_THRESHOLDS = {
  /** Soft "still here?" nudge after waiting for an answer */
  IDLE_NUDGE_MS: 45e3,
  /** Offer step-by-step help if still idle after the soft nudge window */
  IDLE_OFFER_MS: 9e4,
  /** Extra wait after student says "I'm still thinking" */
  IDLE_THINKING_GRACE_MS: 6e4,
  /** Consecutive very short replies before scaffolding bias / offer */
  SHORT_ANSWER_STREAK: 3,
  SHORT_ANSWER_MAX_WORDS: 3,
  SHORT_ANSWER_MAX_CHARS: 18,
  /** Fast + thin answers treated as rapid guessing */
  RAPID_GUESS_MS: 2800,
  RAPID_GUESS_MAX_WORDS: 5,
  RAPID_GUESS_STREAK: 2,
  /** Topic switches inside a rolling window → thrashing */
  TOPIC_THRASH_SWITCHES: 3,
  TOPIC_THRASH_WINDOW_MS: 8 * 6e4,
  /** Consecutive off-topic turns before gentle redirect / offer */
  OFF_TOPIC_STREAK: 2,
  /** Scaffolding bias caps (0–1) */
  SCAFFOLD_SHORT_STEP: 0.12,
  SCAFFOLD_RAPID_STEP: 0.15,
  SCAFFOLD_MAX: 0.85
};

// src/services/api/config.js
var API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

// src/services/learning/cs_pilot_data.json
var cs_pilot_data_default = {
  PILOT_SUBJECT: "Computer Science",
  skills: [
    {
      slug: "cs.l0.tech_basics",
      name: "Understanding technology",
      shortLabel: "Tech basics",
      domain: "cs_literacy",
      description: "What technology, information, and data are; digital vs analog; computers in everyday life.",
      pInit: 0.35,
      pTransit: 0.16,
      pSlip: 0.08,
      pGuess: 0.22,
      prereqs: []
    },
    {
      slug: "cs.l0.what_is_computer",
      name: "What is a computer?",
      shortLabel: "Computer model",
      domain: "cs_literacy",
      description: "Input \u2192 processing \u2192 output with storage; hardware, software, and users.",
      pInit: 0.3,
      pTransit: 0.15,
      pSlip: 0.08,
      pGuess: 0.2,
      prereqs: [
        {
          slug: "cs.l0.tech_basics",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l0.computer_types",
      name: "Types of computers",
      shortLabel: "Device types",
      domain: "cs_literacy",
      description: "Desktops, laptops, phones, servers, embedded and IoT devices.",
      pInit: 0.28,
      pTransit: 0.14,
      pSlip: 0.08,
      pGuess: 0.2,
      prereqs: [
        {
          slug: "cs.l0.what_is_computer",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l0.hardware",
      name: "Computer hardware",
      shortLabel: "Hardware",
      domain: "cs_literacy",
      description: "CPU, RAM, storage, motherboard, GPU, I/O devices and how they interact.",
      pInit: 0.22,
      pTransit: 0.13,
      pSlip: 0.09,
      pGuess: 0.18,
      prereqs: [
        {
          slug: "cs.l0.what_is_computer",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l0.software",
      name: "Computer software",
      shortLabel: "Software",
      domain: "cs_literacy",
      description: "OS, apps, drivers, firmware; system vs application software; programs and processes.",
      pInit: 0.22,
      pTransit: 0.13,
      pSlip: 0.09,
      pGuess: 0.18,
      prereqs: [
        {
          slug: "cs.l0.what_is_computer",
          strength: "required"
        },
        {
          slug: "cs.l0.hardware",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l0.files_folders",
      name: "Files & folders",
      shortLabel: "Files",
      domain: "cs_literacy",
      description: "Files, paths, extensions, copy/move/rename, compression and backups.",
      pInit: 0.25,
      pTransit: 0.14,
      pSlip: 0.08,
      pGuess: 0.2,
      prereqs: [
        {
          slug: "cs.l0.software",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l0.operate_computer",
      name: "Operating a computer",
      shortLabel: "Using a PC",
      domain: "cs_literacy",
      description: "Desktop environments, apps, settings, install/update/uninstall, basic troubleshooting.",
      pInit: 0.24,
      pTransit: 0.14,
      pSlip: 0.08,
      pGuess: 0.2,
      prereqs: [
        {
          slug: "cs.l0.software",
          strength: "required"
        },
        {
          slug: "cs.l0.files_folders",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l0.internet_literacy",
      name: "Internet literacy",
      shortLabel: "Internet",
      domain: "cs_literacy",
      description: "Internet vs web, browsers, search, accounts, and everyday online services.",
      pInit: 0.26,
      pTransit: 0.14,
      pSlip: 0.08,
      pGuess: 0.2,
      prereqs: [
        {
          slug: "cs.l0.operate_computer",
          strength: "recommended"
        },
        {
          slug: "cs.l0.tech_basics",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l0.digital_safety",
      name: "Digital safety",
      shortLabel: "Safety",
      domain: "cs_literacy",
      description: "Passwords, phishing, privacy, safe sharing, and basic cyber hygiene.",
      pInit: 0.24,
      pTransit: 0.13,
      pSlip: 0.08,
      pGuess: 0.18,
      prereqs: [
        {
          slug: "cs.l0.internet_literacy",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l1.problem_solving",
      name: "Problem solving",
      shortLabel: "Solve problems",
      domain: "comp_thinking",
      description: "Break problems into steps; define inputs, outputs, and success criteria.",
      pInit: 0.2,
      pTransit: 0.12,
      pSlip: 0.1,
      pGuess: 0.18,
      prereqs: [
        {
          slug: "cs.l0.tech_basics",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l1.algorithms",
      name: "Algorithms (thinking)",
      shortLabel: "Algorithms",
      domain: "comp_thinking",
      description: "Sequences of steps that solve a problem; clear, finite, unambiguous.",
      pInit: 0.18,
      pTransit: 0.12,
      pSlip: 0.1,
      pGuess: 0.16,
      prereqs: [
        {
          slug: "cs.l1.problem_solving",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l1.abstraction",
      name: "Abstraction",
      shortLabel: "Abstraction",
      domain: "comp_thinking",
      description: "Hide detail; focus on what matters for the current problem.",
      pInit: 0.16,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.16,
      prereqs: [
        {
          slug: "cs.l1.problem_solving",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l1.pattern_recognition",
      name: "Pattern recognition",
      shortLabel: "Patterns",
      domain: "comp_thinking",
      description: "Spot repeated structure to reuse solutions.",
      pInit: 0.18,
      pTransit: 0.12,
      pSlip: 0.1,
      pGuess: 0.16,
      prereqs: [
        {
          slug: "cs.l1.problem_solving",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l1.logical_thinking",
      name: "Logical thinking",
      shortLabel: "Logic",
      domain: "comp_thinking",
      description: "If/then reasoning, true/false conditions, and careful conclusions.",
      pInit: 0.18,
      pTransit: 0.12,
      pSlip: 0.1,
      pGuess: 0.16,
      prereqs: [
        {
          slug: "cs.l1.problem_solving",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l1.representation",
      name: "Computational representation",
      shortLabel: "Represent",
      domain: "comp_thinking",
      description: "Represent real things as data structures and processes computers can use.",
      pInit: 0.15,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.15,
      prereqs: [
        {
          slug: "cs.l1.abstraction",
          strength: "required"
        },
        {
          slug: "cs.l1.algorithms",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l2.history",
      name: "History of computing",
      shortLabel: "History",
      domain: "cs_foundations",
      description: "How computing evolved and why modern machines look the way they do.",
      pInit: 0.22,
      pTransit: 0.12,
      pSlip: 0.08,
      pGuess: 0.18,
      prereqs: [
        {
          slug: "cs.l0.what_is_computer",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l2.number_systems",
      name: "Number systems",
      shortLabel: "Binary & bases",
      domain: "cs_foundations",
      description: "Binary, decimal, hex; why computers use binary.",
      pInit: 0.14,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l1.logical_thinking",
          strength: "required"
        },
        {
          slug: "cs.l0.hardware",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l2.data_representation",
      name: "Data representation",
      shortLabel: "Data bits",
      domain: "cs_foundations",
      description: "Bits/bytes; text, images, and sound as encoded data.",
      pInit: 0.14,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l2.number_systems",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l2.boolean",
      name: "Boolean algebra",
      shortLabel: "Boolean",
      domain: "cs_foundations",
      description: "AND, OR, NOT and simple truth tables.",
      pInit: 0.14,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l1.logical_thinking",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l2.digital_logic",
      name: "Digital logic",
      shortLabel: "Logic gates",
      domain: "cs_foundations",
      description: "Gates and how they build simple circuits.",
      pInit: 0.12,
      pTransit: 0.1,
      pSlip: 0.11,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l2.boolean",
          strength: "required"
        },
        {
          slug: "cs.l2.number_systems",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l2.how_computers_work",
      name: "How a computer actually works",
      shortLabel: "Inside the machine",
      domain: "cs_foundations",
      description: "Fetch-decode-execute; memory hierarchy at a conceptual level.",
      pInit: 0.12,
      pTransit: 0.1,
      pSlip: 0.11,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l0.hardware",
          strength: "required"
        },
        {
          slug: "cs.l2.digital_logic",
          strength: "recommended"
        },
        {
          slug: "cs.l2.data_representation",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l3.prog_concepts",
      name: "Programming concepts",
      shortLabel: "What is code?",
      domain: "programming",
      description: "Programs as instructions; source, run, and the idea of a language.",
      pInit: 0.16,
      pTransit: 0.12,
      pSlip: 0.1,
      pGuess: 0.16,
      prereqs: [
        {
          slug: "cs.l1.algorithms",
          strength: "required"
        },
        {
          slug: "cs.l0.software",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l3.variables",
      name: "Variables",
      shortLabel: "Variables",
      domain: "programming",
      description: "Names that hold values; assignment and state over time.",
      pInit: 0.15,
      pTransit: 0.12,
      pSlip: 0.1,
      pGuess: 0.16,
      prereqs: [
        {
          slug: "cs.l3.prog_concepts",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l3.types",
      name: "Primitive types",
      shortLabel: "Types",
      domain: "programming",
      description: "Numbers, text, booleans; why types matter.",
      pInit: 0.15,
      pTransit: 0.12,
      pSlip: 0.1,
      pGuess: 0.16,
      prereqs: [
        {
          slug: "cs.l3.variables",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l3.operators",
      name: "Operators",
      shortLabel: "Operators",
      domain: "programming",
      description: "Arithmetic, comparison, and logical operators.",
      pInit: 0.15,
      pTransit: 0.12,
      pSlip: 0.1,
      pGuess: 0.16,
      prereqs: [
        {
          slug: "cs.l3.types",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l3.control_flow",
      name: "Control flow",
      shortLabel: "If & loops",
      domain: "programming",
      description: "Branching and repetition; tracing simple programs.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.11,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.operators",
          strength: "required"
        },
        {
          slug: "cs.l1.logical_thinking",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l3.functions",
      name: "Functions",
      shortLabel: "Functions",
      domain: "programming",
      description: "Reusable blocks with inputs and outputs.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.11,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.control_flow",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l3.data_structures_intro",
      name: "Intro data structures",
      shortLabel: "Lists & maps",
      domain: "programming",
      description: "Lists/arrays and key-value maps at a beginner level.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.11,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.variables",
          strength: "required"
        },
        {
          slug: "cs.l3.functions",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l3.debugging",
      name: "Errors & debugging",
      shortLabel: "Debug",
      domain: "programming",
      description: "Read error messages; isolate bugs; fix and re-test.",
      pInit: 0.14,
      pTransit: 0.12,
      pSlip: 0.1,
      pGuess: 0.16,
      prereqs: [
        {
          slug: "cs.l3.control_flow",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l3.files_io",
      name: "Program files & I/O",
      shortLabel: "File I/O",
      domain: "programming",
      description: "Reading and writing simple files from a program.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.functions",
          strength: "required"
        },
        {
          slug: "cs.l0.files_folders",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l3.modules",
      name: "Modules & packages",
      shortLabel: "Modules",
      domain: "programming",
      description: "Organizing code; importing libraries.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.functions",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l4.algorithm_analysis",
      name: "Algorithm analysis",
      shortLabel: "Big-O intro",
      domain: "algorithms",
      description: "Compare algorithms by growth; time/space at an intuitive level.",
      pInit: 0.1,
      pTransit: 0.1,
      pSlip: 0.12,
      pGuess: 0.12,
      prereqs: [
        {
          slug: "cs.l3.control_flow",
          strength: "required"
        },
        {
          slug: "cs.l1.algorithms",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l4.searching",
      name: "Searching",
      shortLabel: "Search",
      domain: "algorithms",
      description: "Linear and binary search; when each applies.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.11,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.data_structures_intro",
          strength: "required"
        },
        {
          slug: "cs.l4.algorithm_analysis",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l4.sorting",
      name: "Sorting",
      shortLabel: "Sort",
      domain: "algorithms",
      description: "Simple sorts and why sorting unlocks faster search.",
      pInit: 0.11,
      pTransit: 0.1,
      pSlip: 0.11,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l4.searching",
          strength: "recommended"
        },
        {
          slug: "cs.l3.data_structures_intro",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l4.fundamental_ds",
      name: "Fundamental data structures",
      shortLabel: "Stacks & queues",
      domain: "algorithms",
      description: "Stacks, queues, and when to use each.",
      pInit: 0.11,
      pTransit: 0.1,
      pSlip: 0.11,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.data_structures_intro",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l4.trees",
      name: "Trees",
      shortLabel: "Trees",
      domain: "algorithms",
      description: "Tree structure, roots/leaves, basic traversal ideas.",
      pInit: 0.1,
      pTransit: 0.1,
      pSlip: 0.12,
      pGuess: 0.12,
      prereqs: [
        {
          slug: "cs.l4.fundamental_ds",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l4.graphs",
      name: "Graphs",
      shortLabel: "Graphs",
      domain: "algorithms",
      description: "Nodes and edges; real-world graph examples.",
      pInit: 0.1,
      pTransit: 0.1,
      pSlip: 0.12,
      pGuess: 0.12,
      prereqs: [
        {
          slug: "cs.l4.fundamental_ds",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l5.discrete_math_intro",
      name: "Discrete math foundations",
      shortLabel: "Discrete intro",
      domain: "math_for_cs",
      description: "Sets, logic links, and discrete ideas that support algorithms.",
      pInit: 0.1,
      pTransit: 0.1,
      pSlip: 0.12,
      pGuess: 0.12,
      prereqs: [
        {
          slug: "cs.l2.boolean",
          strength: "required"
        },
        {
          slug: "cs.l1.logical_thinking",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l6.os_intro",
      name: "Operating systems intro",
      shortLabel: "OS intro",
      domain: "systems",
      description: "What an OS does: processes, memory, and files at a systems level.",
      pInit: 0.1,
      pTransit: 0.1,
      pSlip: 0.12,
      pGuess: 0.12,
      prereqs: [
        {
          slug: "cs.l2.how_computers_work",
          strength: "required"
        },
        {
          slug: "cs.l0.software",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l7.version_control",
      name: "Version control",
      shortLabel: "Git basics",
      domain: "software_eng",
      description: "Why version control; commit, branch, and collaborate safely.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.prog_concepts",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l7.testing",
      name: "Software testing",
      shortLabel: "Testing",
      domain: "software_eng",
      description: "Why tests matter; simple unit-test thinking.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.functions",
          strength: "required"
        },
        {
          slug: "cs.l3.debugging",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l8.db_foundations",
      name: "Database foundations",
      shortLabel: "Databases",
      domain: "data_systems",
      description: "What databases store and why apps use them.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l3.data_structures_intro",
          strength: "required"
        }
      ]
    },
    {
      slug: "cs.l9.net_foundations",
      name: "Networking foundations",
      shortLabel: "Networks",
      domain: "networks",
      description: "How devices talk; clients, servers, and packets at a conceptual level.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l0.internet_literacy",
          strength: "required"
        },
        {
          slug: "cs.l2.data_representation",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l11.web_intro",
      name: "Web & internet computing intro",
      shortLabel: "Web intro",
      domain: "web_cloud",
      description: "Browsers, HTTP ideas, front/back of the web.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l9.net_foundations",
          strength: "required"
        },
        {
          slug: "cs.l3.prog_concepts",
          strength: "recommended"
        }
      ]
    },
    {
      slug: "cs.l13.ai_intro",
      name: "AI & data science intro",
      shortLabel: "AI intro",
      domain: "ai_ds",
      description: "What AI/ML try to do; data, models, and careful claims.",
      pInit: 0.12,
      pTransit: 0.11,
      pSlip: 0.1,
      pGuess: 0.14,
      prereqs: [
        {
          slug: "cs.l1.representation",
          strength: "required"
        },
        {
          slug: "cs.l3.prog_concepts",
          strength: "recommended"
        }
      ]
    }
  ],
  topics: {
    "Understanding technology": [
      {
        slug: "cs.l0.tech_basics",
        weight: 1,
        isPrimary: true
      }
    ],
    "What is a computer?": [
      {
        slug: "cs.l0.what_is_computer",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l0.tech_basics",
        weight: 0.4,
        isPrimary: false
      }
    ],
    "Types of computers": [
      {
        slug: "cs.l0.computer_types",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l0.what_is_computer",
        weight: 0.5,
        isPrimary: false
      }
    ],
    "Computer hardware": [
      {
        slug: "cs.l0.hardware",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l0.what_is_computer",
        weight: 0.45,
        isPrimary: false
      }
    ],
    "Computer software": [
      {
        slug: "cs.l0.software",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l0.hardware",
        weight: 0.4,
        isPrimary: false
      }
    ],
    "Files & folders": [
      {
        slug: "cs.l0.files_folders",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l0.software",
        weight: 0.4,
        isPrimary: false
      }
    ],
    "Operating a computer": [
      {
        slug: "cs.l0.operate_computer",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l0.files_folders",
        weight: 0.45,
        isPrimary: false
      }
    ],
    "Internet literacy": [
      {
        slug: "cs.l0.internet_literacy",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l0.operate_computer",
        weight: 0.35,
        isPrimary: false
      }
    ],
    "Digital safety": [
      {
        slug: "cs.l0.digital_safety",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l0.internet_literacy",
        weight: 0.55,
        isPrimary: false
      }
    ],
    "Problem solving": [
      {
        slug: "cs.l1.problem_solving",
        weight: 1,
        isPrimary: true
      }
    ],
    "Algorithms (thinking)": [
      {
        slug: "cs.l1.algorithms",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l1.problem_solving",
        weight: 0.5,
        isPrimary: false
      }
    ],
    "Abstraction & patterns": [
      {
        slug: "cs.l1.abstraction",
        weight: 0.85,
        isPrimary: true
      },
      {
        slug: "cs.l1.pattern_recognition",
        weight: 0.85,
        isPrimary: true
      }
    ],
    "Logical thinking": [
      {
        slug: "cs.l1.logical_thinking",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l1.problem_solving",
        weight: 0.4,
        isPrimary: false
      }
    ],
    "Number systems & data": [
      {
        slug: "cs.l2.number_systems",
        weight: 0.9,
        isPrimary: true
      },
      {
        slug: "cs.l2.data_representation",
        weight: 0.9,
        isPrimary: true
      }
    ],
    "Boolean logic & gates": [
      {
        slug: "cs.l2.boolean",
        weight: 0.9,
        isPrimary: true
      },
      {
        slug: "cs.l2.digital_logic",
        weight: 0.85,
        isPrimary: true
      }
    ],
    "How computers work": [
      {
        slug: "cs.l2.how_computers_work",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l0.hardware",
        weight: 0.4,
        isPrimary: false
      }
    ],
    "Programming concepts": [
      {
        slug: "cs.l3.prog_concepts",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l1.algorithms",
        weight: 0.45,
        isPrimary: false
      }
    ],
    "Variables, types & operators": [
      {
        slug: "cs.l3.variables",
        weight: 0.85,
        isPrimary: true
      },
      {
        slug: "cs.l3.types",
        weight: 0.85,
        isPrimary: true
      },
      {
        slug: "cs.l3.operators",
        weight: 0.8,
        isPrimary: true
      }
    ],
    "Control flow & functions": [
      {
        slug: "cs.l3.control_flow",
        weight: 0.9,
        isPrimary: true
      },
      {
        slug: "cs.l3.functions",
        weight: 0.9,
        isPrimary: true
      }
    ],
    "Debugging & modules": [
      {
        slug: "cs.l3.debugging",
        weight: 0.85,
        isPrimary: true
      },
      {
        slug: "cs.l3.modules",
        weight: 0.75,
        isPrimary: true
      },
      {
        slug: "cs.l3.files_io",
        weight: 0.6,
        isPrimary: false
      }
    ],
    "Lists, maps & structures": [
      {
        slug: "cs.l3.data_structures_intro",
        weight: 1,
        isPrimary: true
      }
    ],
    "Searching & sorting": [
      {
        slug: "cs.l4.searching",
        weight: 0.9,
        isPrimary: true
      },
      {
        slug: "cs.l4.sorting",
        weight: 0.9,
        isPrimary: true
      },
      {
        slug: "cs.l4.algorithm_analysis",
        weight: 0.55,
        isPrimary: false
      }
    ],
    "Stacks, queues, trees & graphs": [
      {
        slug: "cs.l4.fundamental_ds",
        weight: 0.85,
        isPrimary: true
      },
      {
        slug: "cs.l4.trees",
        weight: 0.75,
        isPrimary: true
      },
      {
        slug: "cs.l4.graphs",
        weight: 0.75,
        isPrimary: true
      }
    ],
    "Version control & testing": [
      {
        slug: "cs.l7.version_control",
        weight: 0.9,
        isPrimary: true
      },
      {
        slug: "cs.l7.testing",
        weight: 0.9,
        isPrimary: true
      }
    ],
    "Databases intro": [
      {
        slug: "cs.l8.db_foundations",
        weight: 1,
        isPrimary: true
      }
    ],
    "Networks & the web": [
      {
        slug: "cs.l9.net_foundations",
        weight: 0.9,
        isPrimary: true
      },
      {
        slug: "cs.l11.web_intro",
        weight: 0.85,
        isPrimary: true
      }
    ],
    "AI & data science intro": [
      {
        slug: "cs.l13.ai_intro",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l1.representation",
        weight: 0.4,
        isPrimary: false
      }
    ],
    "Operating systems intro": [
      {
        slug: "cs.l6.os_intro",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l2.how_computers_work",
        weight: 0.45,
        isPrimary: false
      }
    ],
    "Discrete math for CS": [
      {
        slug: "cs.l5.discrete_math_intro",
        weight: 1,
        isPrimary: true
      },
      {
        slug: "cs.l2.boolean",
        weight: 0.45,
        isPrimary: false
      }
    ]
  }
};

// src/services/learning/skillGraph.js
var PILOT_SUBJECT = cs_pilot_data_default.PILOT_SUBJECT || "Computer Science";
var STATE = {
  LOCKED: "locked",
  READY: "ready",
  LEARNING: "learning",
  MASTERED: "mastered",
  RUSTY: "rusty"
};
var STATE_LABELS = {
  locked: "Growing roots",
  ready: "Ready to spark",
  learning: "Catching fire",
  mastered: "Glowing",
  rusty: "Needs a warm-up"
};
var PILOT_SKILLS = Array.isArray(cs_pilot_data_default.skills) ? cs_pilot_data_default.skills : [];
var TOPIC_SKILL_MAP = cs_pilot_data_default.topics && typeof cs_pilot_data_default.topics === "object" ? cs_pilot_data_default.topics : {};
var READY_PREREQ_P = 0.55;
var MASTERED_P = 0.85;
var MASTERED_STREAK = 2;
var skillBySlug = Object.fromEntries(PILOT_SKILLS.map((s) => [s.slug, s]));
function emptySkillState(slug) {
  const meta = skillBySlug[slug] || { pInit: 0.2, shortLabel: slug, name: slug };
  return {
    slug,
    name: meta.name,
    shortLabel: meta.shortLabel || meta.name,
    domain: meta.domain,
    pKnow: meta.pInit ?? 0.2,
    score: Math.round((meta.pInit ?? 0.2) * 100),
    attempts: 0,
    correct: 0,
    incorrect: 0,
    partial: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    state: STATE.READY,
    stateLabel: STATE_LABELS[STATE.READY],
    lastEvidenceAt: null,
    lastCorrectness: null
  };
}
function prereqReady(skillsMap, slug) {
  const meta = skillBySlug[slug];
  if (!meta) return { ready: true, blocking: [] };
  const blocking = [];
  for (const p of meta.prereqs || []) {
    if (p.strength !== "required") continue;
    const sm = skillsMap[p.slug] || emptySkillState(p.slug);
    if ((sm.pKnow ?? 0) < READY_PREREQ_P) {
      blocking.push({
        slug: p.slug,
        name: skillBySlug[p.slug]?.name || p.slug,
        pKnow: sm.pKnow,
        score: Math.round((sm.pKnow || 0) * 100)
      });
    }
  }
  return { ready: blocking.length === 0, blocking };
}
function deriveState(sm, locked) {
  if (locked) return STATE.LOCKED;
  if (sm.pKnow >= MASTERED_P && sm.consecutiveCorrect >= MASTERED_STREAK && sm.attempts >= 2) {
    return STATE.MASTERED;
  }
  if (sm.attempts === 0) return STATE.READY;
  return STATE.LEARNING;
}
function buildLocalSkillPath(profile, subject, topic) {
  const links = TOPIC_SKILL_MAP[topic];
  if (!links?.length) {
    return {
      subject,
      topic,
      skills: [],
      hasGraph: false,
      topicState: STATE.READY,
      topicStateLabel: STATE_LABELS[STATE.READY],
      recommendedNext: null
    };
  }
  const skillsMap = profile?.skills || {};
  const skills = links.map((link) => {
    const meta = skillBySlug[link.slug];
    const sm = { ...emptySkillState(link.slug), ...skillsMap[link.slug] || {} };
    const { ready, blocking } = prereqReady(skillsMap, link.slug);
    sm.state = deriveState(sm, !ready);
    sm.stateLabel = STATE_LABELS[sm.state];
    return {
      ...sm,
      description: meta?.description,
      weight: link.weight,
      isPrimary: link.isPrimary,
      ready,
      blockingPrereqs: blocking
    };
  });
  const states = skills.map((s) => s.state);
  let topicState = STATE.READY;
  if (states.every((s) => s === STATE.MASTERED)) topicState = STATE.MASTERED;
  else if (states.some((s) => s === STATE.LOCKED)) topicState = STATE.LOCKED;
  else if (states.some((s) => s === STATE.LEARNING)) topicState = STATE.LEARNING;
  return {
    subject,
    topic,
    skills,
    hasGraph: true,
    topicState,
    topicStateLabel: STATE_LABELS[topicState],
    recommendedNext: recommendLocalNext(skillsMap, topic)
  };
}
function recommendLocalNext(skillsMap, topic) {
  const links = TOPIC_SKILL_MAP[topic] || [];
  const domains = new Set(
    links.map((l) => skillBySlug[l.slug]?.domain).filter(Boolean)
  );
  const candidates = [];
  for (const meta of PILOT_SKILLS) {
    const { ready } = prereqReady(skillsMap, meta.slug);
    if (!ready) continue;
    const sm = skillsMap[meta.slug] || emptySkillState(meta.slug);
    if (sm.state === STATE.MASTERED) continue;
    const domainBonus = domains.size && domains.has(meta.domain) ? 1 : 0;
    candidates.push({ domainBonus, p: sm.pKnow || 0, meta, sm });
  }
  candidates.sort((a, b) => b.domainBonus - a.domainBonus || a.p - b.p);
  if (!candidates.length) return null;
  const c = candidates[0];
  return {
    slug: c.meta.slug,
    name: c.meta.name,
    shortLabel: c.meta.shortLabel,
    score: c.sm.score,
    state: c.sm.state,
    stateLabel: STATE_LABELS[c.sm.state]
  };
}
function topicForSkillSlug(slug) {
  for (const [topic, links] of Object.entries(TOPIC_SKILL_MAP)) {
    if ((links || []).some((l) => l.slug === slug)) return topic;
  }
  return null;
}
function suggestEasierRelatedSkill(profile, subject, topic) {
  const path = buildLocalSkillPath(profile, subject, topic);
  const skillsMap = profile?.skills || {};
  for (const s of path.skills || []) {
    const blockers = s.blockingPrereqs || [];
    if (blockers.length) {
      const b = blockers[0];
      return {
        slug: b.slug,
        name: b.name,
        shortLabel: skillBySlug[b.slug]?.shortLabel || b.name,
        topic: topicForSkillSlug(b.slug),
        subject: subject || PILOT_SUBJECT,
        reason: "prerequisite",
        score: b.score
      };
    }
  }
  const primaries = (path.skills || []).filter((s) => s.isPrimary).slice().sort((a, b) => (a.pKnow || 0) - (b.pKnow || 0));
  if (primaries.length && (primaries[0].pKnow || 0) < 0.55) {
    const s = primaries[0];
    const meta = skillBySlug[s.slug];
    for (const p of meta?.prereqs || []) {
      const sm = skillsMap[p.slug] || emptySkillState(p.slug);
      if ((sm.pKnow || 0) < READY_PREREQ_P + 0.15) {
        return {
          slug: p.slug,
          name: skillBySlug[p.slug]?.name || p.slug,
          shortLabel: skillBySlug[p.slug]?.shortLabel,
          topic: topicForSkillSlug(p.slug),
          subject: subject || PILOT_SUBJECT,
          reason: "foundation",
          score: Math.round((sm.pKnow || 0) * 100)
        };
      }
    }
    return {
      slug: s.slug,
      name: s.name,
      shortLabel: s.shortLabel,
      topic: topic || path.topic,
      subject: subject || PILOT_SUBJECT,
      reason: "strengthen_current",
      score: s.score
    };
  }
  const next = recommendLocalNext(skillsMap, topic);
  if (next && next.slug) {
    const meta = skillBySlug[next.slug];
    return {
      slug: next.slug,
      name: next.name,
      shortLabel: next.shortLabel,
      topic: topicForSkillSlug(next.slug) || topic,
      subject: subject || PILOT_SUBJECT,
      reason: "ready_next",
      score: next.score,
      domain: meta?.domain
    };
  }
  return null;
}

// src/services/learning/interventionLadder.js
var InterventionLevel = {
  NONE: 0,
  MICRO_HINT: 1,
  WORKED_EXAMPLE: 2,
  FULL_GUIDE: 3,
  BREAK_OR_EASIER: 4
};
var INTERVENTION_LEVEL_META = {
  [InterventionLevel.MICRO_HINT]: {
    id: "micro_hint",
    rank: InterventionLevel.MICRO_HINT,
    label: "Micro-hint",
    shortLabel: "Hint",
    eyebrow: "A gentle nudge",
    acceptCta: "Yes, a small hint",
    activeTitle: "Micro-hint",
    exitLabel: "Back to practice",
    chipText: (topic) => `Micro-hint \xB7 ${topic}`,
    description: "One small clue \u2014 still Socratic. Kindling won\u2019t give the full answer away."
  },
  [InterventionLevel.WORKED_EXAMPLE]: {
    id: "worked_example",
    rank: InterventionLevel.WORKED_EXAMPLE,
    label: "Worked example",
    shortLabel: "Example",
    eyebrow: "See one worked out",
    acceptCta: "Show me an example",
    activeTitle: "Worked example",
    exitLabel: "Back to practice",
    chipText: (topic) => `Worked example \xB7 ${topic}`,
    description: "Watch a similar problem solved step by step, then try a twin yourself."
  },
  [InterventionLevel.FULL_GUIDE]: {
    id: "full_guide",
    rank: InterventionLevel.FULL_GUIDE,
    label: "Step-by-step guide",
    shortLabel: "Guide",
    eyebrow: "Walk through together",
    acceptCta: "Yes, guide me",
    activeTitle: "Step-by-step guide",
    exitLabel: "Exit guide",
    chipText: (topic) => `Guide mode \xB7 ${topic}`,
    description: "Clear explanations and examples, one small step at a time. Leave anytime."
  },
  [InterventionLevel.BREAK_OR_EASIER]: {
    id: "break_or_easier",
    rank: InterventionLevel.BREAK_OR_EASIER,
    label: "Break or easier path",
    shortLabel: "Easier path",
    eyebrow: "A softer path",
    acceptCta: "Yes, easier path",
    activeTitle: "Easier path",
    exitLabel: "Back to practice",
    chipText: (topic) => `Easier path \xB7 ${topic}`,
    description: "Pause the hard bit, reset with a break, or warm up on a related easier skill."
  }
};
var LADDER_LEVELS = [
  InterventionLevel.MICRO_HINT,
  InterventionLevel.WORKED_EXAMPLE,
  InterventionLevel.FULL_GUIDE,
  InterventionLevel.BREAK_OR_EASIER
];
function levelMeta(level) {
  const rank = normalizeLevel(level);
  return INTERVENTION_LEVEL_META[rank] || INTERVENTION_LEVEL_META[InterventionLevel.FULL_GUIDE];
}
function normalizeLevel(level) {
  if (level == null || level === "" || level === "none") return InterventionLevel.NONE;
  if (typeof level === "number" && Number.isFinite(level)) {
    return Math.max(0, Math.min(4, Math.round(level)));
  }
  const id = String(level).toLowerCase();
  const byId = Object.values(INTERVENTION_LEVEL_META).find((m) => m.id === id);
  if (byId) return byId.rank;
  if (id === "guide" || id === "intervention" || id === "step_by_step") {
    return InterventionLevel.FULL_GUIDE;
  }
  return InterventionLevel.FULL_GUIDE;
}

// src/services/learning/pedagogicalPolicy.js
var PEDAGOGY_POLICY_VERSION = 1;
var PedagogicalAction = {
  CONTINUE_SOCRATIC: "CONTINUE_SOCRATIC",
  EXPLAIN: "EXPLAIN",
  MICRO_HINT: "MICRO_HINT",
  WORKED_EXAMPLE: "WORKED_EXAMPLE",
  FULL_GUIDE: "FULL_GUIDE",
  EASIER_PATH: "EASIER_PATH",
  ASSESS: "ASSESS",
  REVIEW: "REVIEW",
  REMEDIATE_MISCONCEPTION: "REMEDIATE_MISCONCEPTION",
  REMEDIATE_PREREQUISITE: "REMEDIATE_PREREQUISITE",
  CHALLENGE: "CHALLENGE",
  SLOW_DOWN: "SLOW_DOWN",
  AFFECT_SUPPORT: "AFFECT_SUPPORT",
  CHECK_UNDERSTANDING: "CHECK_UNDERSTANDING",
  CHANGE_REPRESENTATION: "CHANGE_REPRESENTATION",
  CELEBRATE_PERSISTENCE: "CELEBRATE_PERSISTENCE",
  INDEPENDENT_PRACTICE: "INDEPENDENT_PRACTICE",
  OFFER_BREAK: "OFFER_BREAK"
};
var PEDAGOGICAL_ACTIONS = Object.values(PedagogicalAction);
var ACTION_META = {
  [PedagogicalAction.CONTINUE_SOCRATIC]: {
    label: "Socratic practice",
    short: "Guide with questions"
  },
  [PedagogicalAction.EXPLAIN]: {
    label: "Clear explanation",
    short: "Explain the idea"
  },
  [PedagogicalAction.MICRO_HINT]: {
    label: "Micro-hint",
    short: "One small clue"
  },
  [PedagogicalAction.WORKED_EXAMPLE]: {
    label: "Worked example",
    short: "Show one example"
  },
  [PedagogicalAction.FULL_GUIDE]: {
    label: "Step-by-step guide",
    short: "Walk through together"
  },
  [PedagogicalAction.EASIER_PATH]: {
    label: "Easier path",
    short: "Simpler related skill"
  },
  [PedagogicalAction.ASSESS]: {
    label: "Quick check",
    short: "Low-stakes check"
  },
  [PedagogicalAction.REVIEW]: {
    label: "Spaced review",
    short: "Retrieve prior skill"
  },
  [PedagogicalAction.REMEDIATE_MISCONCEPTION]: {
    label: "Rework a pattern",
    short: "Gentle misconception fix"
  },
  [PedagogicalAction.REMEDIATE_PREREQUISITE]: {
    label: "Strengthen a foundation",
    short: "Walk back a prereq"
  },
  [PedagogicalAction.CHALLENGE]: {
    label: "Fair stretch",
    short: "Richer variant"
  },
  [PedagogicalAction.SLOW_DOWN]: {
    label: "Slow the pace",
    short: "Reason before next try"
  },
  [PedagogicalAction.AFFECT_SUPPORT]: {
    label: "Warm support",
    short: "Normalize & encourage"
  },
  [PedagogicalAction.CHECK_UNDERSTANDING]: {
    label: "Show-your-work check",
    short: "Ask for reasoning"
  },
  [PedagogicalAction.CHANGE_REPRESENTATION]: {
    label: "Different representation",
    short: "New model or story"
  },
  [PedagogicalAction.CELEBRATE_PERSISTENCE]: {
    label: "Celebrate effort",
    short: "Name the bounce-back"
  },
  [PedagogicalAction.INDEPENDENT_PRACTICE]: {
    label: "Independent try",
    short: "Light or no scaffold"
  },
  [PedagogicalAction.OFFER_BREAK]: {
    label: "Offer a break",
    short: "Reset kindly"
  }
};
function actionFromLadderLevel(level) {
  const rank = normalizeLevel(level);
  if (rank >= InterventionLevel.BREAK_OR_EASIER) {
    return PedagogicalAction.EASIER_PATH;
  }
  if (rank >= InterventionLevel.FULL_GUIDE) return PedagogicalAction.FULL_GUIDE;
  if (rank >= InterventionLevel.WORKED_EXAMPLE) {
    return PedagogicalAction.WORKED_EXAMPLE;
  }
  if (rank >= InterventionLevel.MICRO_HINT) return PedagogicalAction.MICRO_HINT;
  return PedagogicalAction.CONTINUE_SOCRATIC;
}
function newDecisionId() {
  return `pd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function executionBriefForAction(action, params = {}) {
  const a = action || PedagogicalAction.CONTINUE_SOCRATIC;
  const skill = params.skillLabel || params.prereqLabel || params.topic || "this idea";
  const mc2 = params.misconceptionLabel || "the sticky pattern";
  switch (a) {
    case PedagogicalAction.REVIEW:
      return `Run a short retrieval practice on \xAB${skill}\xBB. One prompt, wait for their try, give brief feedback. Do not teach a brand-new concept.`;
    case PedagogicalAction.CHALLENGE:
      return `Offer one fair stretch problem on \xAB${skill}\xBB \u2014 slightly richer than last success. Stay Socratic; celebrate solid reasoning.`;
    case PedagogicalAction.ASSESS:
      return `Invite a low-stakes quick check (or one clear MC-style question in chat if no panel). Score understanding, not speed. No shame.`;
    case PedagogicalAction.MICRO_HINT:
      return `Give exactly one small clue. Stay mostly Socratic. Do not give a full solution or multi-step guide.`;
    case PedagogicalAction.WORKED_EXAMPLE:
      return `Show one short worked example (everyday hook), then invite a twin try. Do not open a full multi-step course guide.`;
    case PedagogicalAction.FULL_GUIDE:
      return `Walk step-by-step: explain \u2192 everyday example \u2192 tiny check. One step per message. Never dump the whole solution.`;
    case PedagogicalAction.EASIER_PATH:
      return params.prereqLabel ? `Warmly shift to foundation skill \xAB${params.prereqLabel}\xBB with a quick visual win, then bridge back later.` : `Offer a softer path or simpler related idea. Normalize the reset. One easy win before returning.`;
    case PedagogicalAction.OFFER_BREAK:
      return `Normalize needing a pause. Offer a short break or easier warm-up. No pressure to push through.`;
    case PedagogicalAction.REMEDIATE_MISCONCEPTION:
      return `Gently rework misconception \xAB${mc2}\xBB. Use the playbook check question if available. Do not shame. Confirm with one targeted check.`;
    case PedagogicalAction.REMEDIATE_PREREQUISITE:
      return `The current skill needs foundation \xAB${skill}\xBB. Warmly walk back: quick prereq practice with a concrete model, then return. Do not plow ahead on the hard skill.`;
    case PedagogicalAction.SLOW_DOWN:
      return `Pace is too fast (guessing). Slow down. Ask them to show one reason or step before the next answer. Short choices OK.`;
    case PedagogicalAction.AFFECT_SUPPORT:
      return `Lead with warmth. Normalize struggle. One tiny next step only. Do not pile on difficulty or long lectures.`;
    case PedagogicalAction.CHECK_UNDERSTANDING:
      return `Confidence may outpace evidence. Ask them to show steps / explain why before stretching difficulty.`;
    case PedagogicalAction.CHANGE_REPRESENTATION:
      return `Try a different representation (story, visual model, or real-world object). Same idea, new packaging.`;
    case PedagogicalAction.CELEBRATE_PERSISTENCE:
      return `Briefly name their effort or bounce-back, then one clear next question. Keep celebration short and sincere.`;
    case PedagogicalAction.INDEPENDENT_PRACTICE:
      return `Independence is rising. Prefer no-hint or micro-hint only. Let them own the try; affirm solid reasoning.`;
    case PedagogicalAction.EXPLAIN:
      return `Give a clear mini-explanation with one everyday example, then one check question. Still do not dump a full solution dump.`;
    case PedagogicalAction.CONTINUE_SOCRATIC:
    default:
      return `Continue adaptive Socratic tutoring: one question at a time, guide before giving, real-world hook when teaching.`;
  }
}
function decidePedagogy(learnerState = null, context = {}) {
  const state = learnerState || {};
  const reasons = [];
  const params = {
    subject: context.subject || state.subject || "",
    topic: context.topic || state.topic || ""
  };
  const last = context.lastSignals || null;
  const intervention = context.intervention || null;
  const struggle = context.struggleSnapshot || state.behaviour || {};
  const adi2 = state.adi || context.adi || null;
  const reviewMode2 = Boolean(context.reviewMode);
  const challengeMode = Boolean(context.challengeMode);
  const multiStepActive = Boolean(context.multiStepActive);
  const assessmentActive = Boolean(context.assessmentActive);
  const dueReview2 = context.dueReview || null;
  const profile = context.profile || null;
  const consecutiveIncorrect = context.consecutiveIncorrect ?? struggle.consecutiveIncorrect ?? 0;
  const affect = last?.affect || context.affect || context.lastCheckIn?.affect || null;
  const lowEnergy2 = Boolean(
    context.lowEnergy || context.lastCheckIn?.lowEnergy || affect === "disengaged"
  );
  const persistenceScore = context.persistenceScore ?? state.behaviour?.persistenceScore ?? 0;
  if (assessmentActive) {
    return finalize(PedagogicalAction.ASSESS, {
      reasons: ["assessment_session_active"],
      params,
      confidence: 0.95,
      gap: gapOf("complete_check", "in_assessment")
    });
  }
  if (multiStepActive) {
    return finalize(PedagogicalAction.CHECK_UNDERSTANDING, {
      reasons: ["multistep_active"],
      params: { ...params, skillLabel: context.multiStepTitle || params.topic },
      confidence: 0.9,
      gap: gapOf("finish_steps", "mid_multistep")
    });
  }
  if (reviewMode2) {
    return finalize(PedagogicalAction.REVIEW, {
      reasons: ["review_spark_mode"],
      params: {
        ...params,
        skillLabel: context.reviewSkillLabel || context.reviewSkill || params.topic,
        skillSlug: context.reviewSkill || null
      },
      confidence: 0.95,
      gap: gapOf("retrieval_success", "review_session")
    });
  }
  if (challengeMode) {
    return finalize(PedagogicalAction.CHALLENGE, {
      reasons: ["spark_challenge_mode"],
      params: {
        ...params,
        skillLabel: context.challengeSkillLabel || context.challengeSkill || params.topic
      },
      confidence: 0.92,
      gap: gapOf("solid_stretch", "challenge_session")
    });
  }
  if (intervention?.status === "active") {
    const level = normalizeLevel(
      intervention.level || intervention.context?.level || 0
    );
    const action = actionFromLadderLevel(level);
    const easier = intervention.context?.easierSkill || (action === PedagogicalAction.EASIER_PATH ? suggestEasierRelatedSkill(profile, params.subject, params.topic) : null);
    if (easier) {
      params.prereqLabel = easier.shortLabel || easier.name;
      params.prereqSlug = easier.slug;
      params.skillLabel = params.prereqLabel;
    }
    reasons.push("intervention_active", `ladder_l${level}`);
    return finalize(action, {
      reasons,
      params: {
        ...params,
        ladderLevel: level,
        ladderId: levelMeta(level).id
      },
      confidence: 0.9,
      gap: gapOf("ungrounded_success", "scaffolded_path")
    });
  }
  if (lowEnergy2) {
    if ((affect === "frustrated" || context.lastCheckIn?.optionId) && (consecutiveIncorrect >= 2 || (struggle.consecutiveIncorrect || 0) >= 2)) {
      reasons.push("low_energy_plus_struggle");
      return finalize(PedagogicalAction.OFFER_BREAK, {
        reasons,
        params,
        confidence: 0.78,
        gap: gapOf("calm_engagement", "frustrated_stuck")
      });
    }
    reasons.push("affect_support_needed");
    return finalize(PedagogicalAction.AFFECT_SUPPORT, {
      reasons,
      params,
      confidence: 0.75,
      gap: gapOf("steady_engagement", affect || "low_energy")
    });
  }
  const frustratedStuck = affect === "frustrated" && (consecutiveIncorrect >= 2 || last?.correctness === "incorrect");
  const rapid = last?.rapidGuess || state.behaviour?.flags?.includes("rapid_guessing") || (struggle.consecutiveRapidGuesses || 0) >= 1;
  if (rapid && last?.correctness === "incorrect") {
    reasons.push("rapid_guessing");
    return finalize(PedagogicalAction.SLOW_DOWN, {
      reasons,
      params,
      confidence: 0.82,
      gap: gapOf("reasoned_attempt", "rapid_guess")
    });
  }
  const prereqTarget = findWeakPrerequisite({
    profile,
    subject: params.subject,
    topic: params.topic,
    learnerState: state,
    consecutiveIncorrect,
    last
  });
  if (prereqTarget) {
    reasons.push("severe_stuck_weak_prereq", prereqTarget.slug);
    return finalize(PedagogicalAction.REMEDIATE_PREREQUISITE, {
      reasons,
      params: {
        ...params,
        prereqSlug: prereqTarget.slug,
        prereqLabel: prereqTarget.shortLabel || prereqTarget.name,
        skillLabel: prereqTarget.shortLabel || prereqTarget.name,
        skillSlug: prereqTarget.slug,
        prereqTopic: prereqTarget.topic || null
      },
      confidence: 0.84,
      gap: gapOf("prereq_ready", "blocked_or_fragile_foundation"),
      alternatives: [
        PedagogicalAction.EASIER_PATH,
        PedagogicalAction.FULL_GUIDE,
        PedagogicalAction.WORKED_EXAMPLE
      ]
    });
  }
  if (frustratedStuck && consecutiveIncorrect >= 2) {
    reasons.push("frustrated_stuck_no_prereq");
    return finalize(PedagogicalAction.AFFECT_SUPPORT, {
      reasons,
      params,
      confidence: 0.76,
      gap: gapOf("calm_engagement", "frustrated"),
      alternatives: [PedagogicalAction.FULL_GUIDE, PedagogicalAction.OFFER_BREAK]
    });
  }
  const mcs = state.misconceptions?.filter((m) => m.isActive !== false) || context.activeMisconceptions || last?.misconceptions || [];
  if (mcs.length && (last?.correctness === "incorrect" || last?.correctness === "partial")) {
    const top = mcs[0];
    reasons.push("active_misconception", top.id || top.label);
    return finalize(PedagogicalAction.REMEDIATE_MISCONCEPTION, {
      reasons,
      params: {
        ...params,
        misconceptionId: top.id,
        misconceptionLabel: top.label,
        checkQuestion: top.checkQuestion || top.playbook?.check_question,
        skillSlug: top.skillSlug || null
      },
      confidence: Math.min(0.88, 0.55 + (top.confidence || 0.4) * 0.4),
      gap: gapOf("concept_aligned", "misconception_active")
    });
  }
  if (consecutiveIncorrect >= 3 || last?.correctness === "incorrect" && consecutiveIncorrect >= 2) {
    const preferLight = Boolean(adi2?.preferLighterHelp);
    if (affect === "frustrated" && consecutiveIncorrect >= 3) {
      reasons.push("frustrated_streak");
      return finalize(
        preferLight ? PedagogicalAction.WORKED_EXAMPLE : PedagogicalAction.FULL_GUIDE,
        {
          reasons,
          params,
          confidence: 0.8,
          gap: gapOf("supported_success", "multi_incorrect")
        }
      );
    }
    reasons.push("incorrect_streak");
    return finalize(
      preferLight ? PedagogicalAction.MICRO_HINT : PedagogicalAction.WORKED_EXAMPLE,
      {
        reasons,
        params,
        confidence: 0.77,
        gap: gapOf("scaffolded_progress", "incorrect_streak")
      }
    );
  }
  const cal = state.confidence?.calibration || "unknown";
  if (cal === "overconfident" && last?.correctness !== "correct") {
    reasons.push("overconfident_calibration");
    return finalize(PedagogicalAction.CHECK_UNDERSTANDING, {
      reasons,
      params,
      confidence: 0.74,
      gap: gapOf("calibrated_confidence", "overconfident")
    });
  }
  if (cal === "underconfident" && (state.confidence?.competence || 0) >= 0.55 && (last?.correctness === "correct" || last?.correctness === "partial")) {
    reasons.push("underconfident_but_capable");
    return finalize(PedagogicalAction.CHALLENGE, {
      reasons,
      params: {
        ...params,
        skillLabel: state.knowledge?.primarySkills?.[0]?.shortLabel || params.topic
      },
      confidence: 0.72,
      gap: gapOf("confident_competence", "underconfident")
    });
  }
  if (adi2?.preferLighterHelp && (last?.correctness === "correct" || (state.knowledge?.topicScore || 0) >= 60)) {
    reasons.push("adi_prefer_lighter");
    return finalize(PedagogicalAction.INDEPENDENT_PRACTICE, {
      reasons,
      params,
      confidence: 0.7,
      gap: gapOf("independent_success", "fading_support")
    });
  }
  if (persistenceScore >= 2 && (last?.correctness === "correct" || last?.correctness === "partial") && context.justPersisted) {
    reasons.push("persistence_moment");
    return finalize(PedagogicalAction.CELEBRATE_PERSISTENCE, {
      reasons,
      params,
      confidence: 0.68,
      gap: gapOf("motivated_continue", "effort_shown")
    });
  }
  if (state.interaction?.lowTypingTolerance || state.behaviour?.flags?.includes("short_answers")) {
    if (last?.correctness === "incorrect") {
      reasons.push("short_answers_struggle");
      return finalize(PedagogicalAction.CHANGE_REPRESENTATION, {
        reasons,
        params,
        confidence: 0.65,
        gap: gapOf("accessible_response", "low_typing")
      });
    }
  }
  if (dueReview2 && !last && context.sessionPhase === "open") {
    reasons.push("due_review_available");
    return finalize(PedagogicalAction.REVIEW, {
      reasons,
      params: {
        ...params,
        skillLabel: dueReview2.skillLabel || dueReview2.skillSlug,
        skillSlug: dueReview2.skillSlug
      },
      confidence: 0.6,
      gap: gapOf("spaced_retrieval", "due_item"),
      alternatives: [
        PedagogicalAction.CONTINUE_SOCRATIC,
        PedagogicalAction.ASSESS
      ]
    });
  }
  if (last?.correctness === "exploring" || last?.isQuestion) {
    reasons.push("student_exploring");
    return finalize(PedagogicalAction.EXPLAIN, {
      reasons,
      params,
      confidence: 0.62,
      gap: gapOf("concept_clarity", "curious_question")
    });
  }
  reasons.push("default_socratic");
  return finalize(PedagogicalAction.CONTINUE_SOCRATIC, {
    reasons,
    params,
    confidence: 0.55,
    gap: gapOf("steady_learning", "routine_turn"),
    alternatives: rankAlternatives(state, context)
  });
}
function findWeakPrerequisite({
  profile = null,
  subject = "",
  topic = "",
  learnerState = null,
  consecutiveIncorrect = 0,
  last = null
} = {}) {
  const stuck2 = consecutiveIncorrect >= 3 || consecutiveIncorrect >= 2 && last?.correctness === "incorrect" || last?.affect === "frustrated" && consecutiveIncorrect >= 2;
  if (!stuck2) return null;
  const path = learnerState?.knowledge?.skills?.length ? {
    skills: learnerState.knowledge.skills,
    hasGraph: true
  } : buildLocalSkillPath(profile, subject, topic);
  if (!path?.hasGraph) {
    return suggestEasierRelatedSkill(profile, subject, topic);
  }
  for (const s of path.skills || []) {
    if (!s.isPrimary && s.score != null && s.score > 45) continue;
    const blockers = s.blockingPrereqs || [];
    if (blockers.length) {
      const b = blockers[0];
      return {
        slug: b.slug,
        name: b.name,
        shortLabel: b.shortLabel || b.name,
        score: b.score,
        topic: b.topic || null,
        reason: "blocking_prereq"
      };
    }
  }
  const primaries = (path.skills || []).filter((s) => s.isPrimary);
  const weak2 = primaries.find((s) => (s.score ?? 50) < 40);
  if (weak2 || consecutiveIncorrect >= 3) {
    return suggestEasierRelatedSkill(profile, subject, topic);
  }
  return null;
}
function gapOf(desired, observed) {
  return { desired, observed };
}
function finalize(action, {
  reasons = [],
  params = {},
  confidence = 0.5,
  gap = null,
  alternatives = []
} = {}) {
  const meta = ACTION_META[action] || ACTION_META[PedagogicalAction.CONTINUE_SOCRATIC];
  return {
    id: newDecisionId(),
    action,
    label: meta.label,
    shortLabel: meta.short,
    confidence: Math.round(confidence * 1e3) / 1e3,
    reasons: reasons.filter(Boolean),
    params,
    executionBrief: executionBriefForAction(action, params),
    alternatives: (alternatives || []).filter((a) => a && a !== action).slice(0, 4),
    gap,
    policyVersion: PEDAGOGY_POLICY_VERSION,
    decidedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function rankAlternatives(state, context) {
  const alts = [];
  if (state.adi?.preferLighterHelp) alts.push(PedagogicalAction.INDEPENDENT_PRACTICE);
  if (state.misconceptions?.length) alts.push(PedagogicalAction.REMEDIATE_MISCONCEPTION);
  if (context.dueReview) alts.push(PedagogicalAction.REVIEW);
  alts.push(PedagogicalAction.MICRO_HINT, PedagogicalAction.ASSESS);
  return alts;
}
function buildPedagogyPromptBlock(decision) {
  if (!decision?.action) return "";
  const meta = ACTION_META[decision.action] || {};
  const alts = decision.alternatives?.length > 0 ? decision.alternatives.join(", ") : "none";
  const gap = decision.gap ? `Desired: ${decision.gap.desired} \xB7 Observed: ${decision.gap.observed}` : "";
  return `
## Pedagogical decision (Kindling policy engine \u2014 EXECUTE ONLY THIS MOVE)
- Decision id: ${decision.id}
- Action: **${decision.action}** (${meta.label || decision.label || ""})
- Confidence: ${decision.confidence ?? "\u2014"}
- Why (internal \u2014 never read aloud as scores): ${(decision.reasons || []).join(", ") || "policy"}
${gap ? `- Control gap: ${gap}` : ""}
- **Your job this turn:** ${decision.executionBrief}
- Do **not** freestyle a different major move (no unsolicited full solutions, topic jumps, or unrelated quizzes).
- You may still be warm, use real-world hooks, and attach 3\u20135 suggestion chips.
- Allowed micro-flex only if safety requires it; otherwise stay on **${decision.action}**.
- Other candidates considered (do not switch unless student clearly needs safety): ${alts}
`.trim();
}
function pedagogyDirectives(decision) {
  if (!decision?.action) return [];
  const dirs2 = [
    `Pedagogical move this turn: ${decision.action} \u2014 ${decision.executionBrief}`
  ];
  if (decision.action === PedagogicalAction.REMEDIATE_PREREQUISITE) {
    dirs2.push(
      `Foundation focus: \xAB${decision.params?.prereqLabel || "prerequisite"}\xBB before returning to the hard skill.`
    );
  }
  if (decision.action === PedagogicalAction.INDEPENDENT_PRACTICE) {
    dirs2.push("Prefer micro-hint or none \u2014 independence is the goal.");
  }
  return dirs2.slice(0, 3);
}
function serializePedagogyDecision(decision, extras = {}) {
  if (!decision) return null;
  return {
    decisionId: decision.id,
    action: decision.action,
    label: decision.label,
    confidence: decision.confidence,
    reasons: decision.reasons || [],
    params: decision.params || {},
    executionBrief: decision.executionBrief,
    alternatives: decision.alternatives || [],
    gap: decision.gap || null,
    policyVersion: decision.policyVersion || PEDAGOGY_POLICY_VERSION,
    decidedAt: decision.decidedAt,
    ...extras
  };
}
function rankNextBestActions({
  learnerState = null,
  dueReviews = [],
  recommendedSkill = null,
  focusAreas = [],
  canAssess = true,
  subject = "",
  topic = ""
} = {}) {
  const state = learnerState || {};
  const items = [];
  const due = Array.isArray(dueReviews) ? dueReviews : [];
  if (due.length) {
    const d = due[0];
    items.push({
      action: PedagogicalAction.REVIEW,
      score: 0.92,
      label: "Review today",
      reason: `Spaced practice on ${d.skillLabel || d.skillSlug || "a due skill"}`,
      cta: "Start review spark",
      skillSlug: d.skillSlug || null,
      kind: "review"
    });
  }
  if (state.adi?.preferLighterHelp && (state.knowledge?.topicScore || 0) >= 55) {
    items.push({
      action: PedagogicalAction.INDEPENDENT_PRACTICE,
      score: 0.78,
      label: "Independent practice",
      reason: "Independence is rising \u2014 try with lighter help",
      cta: "Continue lesson",
      kind: "lesson"
    });
  }
  if (state.confidence?.calibration === "underconfident") {
    items.push({
      action: PedagogicalAction.CHALLENGE,
      score: 0.74,
      label: "Fair stretch",
      reason: "Stronger than it feels \u2014 a gentle challenge fits",
      cta: "Try a spark challenge",
      kind: "challenge"
    });
  }
  if (state.misconceptions?.length) {
    items.push({
      action: PedagogicalAction.REMEDIATE_MISCONCEPTION,
      score: 0.8,
      label: "Rework a sticky idea",
      reason: state.misconceptions[0].label || "Pattern to gently fix",
      cta: "Open lesson",
      kind: "lesson"
    });
  }
  if (recommendedSkill) {
    items.push({
      action: PedagogicalAction.CONTINUE_SOCRATIC,
      score: 0.7,
      label: recommendedSkill.shortLabel || recommendedSkill.name || "Next skill",
      reason: "Recommended next skill on your path",
      cta: "Practice skill",
      skillSlug: recommendedSkill.slug,
      kind: "skill"
    });
  }
  if (canAssess && (state.knowledge?.topicAttempts || 0) >= 2) {
    items.push({
      action: PedagogicalAction.ASSESS,
      score: 0.55,
      label: "Quick check",
      reason: "Low-stakes check on this lesson\u2019s idea",
      cta: "Start quick check",
      kind: "assess"
    });
  }
  const focus = focusAreas[0] || state.knowledge?.focusAreas?.[0];
  if (focus) {
    const label = typeof focus === "string" ? focus : focus.topic || focus.label;
    if (label) {
      items.push({
        action: PedagogicalAction.CONTINUE_SOCRATIC,
        score: 0.5,
        label: `Practice: ${label}`,
        reason: "Gentle focus area",
        cta: "Open lesson",
        kind: "focus"
      });
    }
  }
  if (!items.length) {
    items.push({
      action: PedagogicalAction.CONTINUE_SOCRATIC,
      score: 0.4,
      label: topic || subject || "Continue learning",
      reason: "Keep the spark going with a short lesson",
      cta: "Start a lesson",
      kind: "default"
    });
  }
  items.sort((a, b) => b.score - a.score);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const it of items) {
    const k = `${it.action}:${it.label}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out.slice(0, 5);
}

// scripts/smoke-pedagogy-l2.mjs
var passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  \u2713 ${name}`);
}
console.log("Epic L2 smoke \u2014 Pedagogical policy\n");
ok("policy version 1", PEDAGOGY_POLICY_VERSION === 1);
ok("action catalog size", PEDAGOGICAL_ACTIONS.length >= 15);
ok(
  "event type pedagogy.decision",
  LearningEventType.PEDAGOGY_DECISION === "pedagogy.decision"
);
var stuck = decidePedagogy(
  {
    behaviour: { flags: ["rapid_guessing"] },
    confidence: { calibration: "unknown" }
  },
  {
    lastSignals: { correctness: "incorrect", rapidGuess: true, affect: "neutral" },
    consecutiveIncorrect: 1
  }
);
ok("stuck guessing \u2192 SLOW_DOWN", stuck.action === PedagogicalAction.SLOW_DOWN);
var lowEnergy = decidePedagogy(
  {},
  {
    lowEnergy: true,
    lastCheckIn: { optionId: "tired", lowEnergy: true },
    consecutiveIncorrect: 2,
    lastSignals: { affect: "frustrated", correctness: "incorrect" }
  }
);
ok(
  "low energy + struggle \u2192 OFFER_BREAK or AFFECT",
  [PedagogicalAction.OFFER_BREAK, PedagogicalAction.AFFECT_SUPPORT].includes(
    lowEnergy.action
  )
);
var dueReview = decidePedagogy(
  {},
  {
    dueReview: { skillSlug: "frac.add", skillLabel: "Add fractions" },
    sessionPhase: "open"
  }
);
ok("due review at open \u2192 REVIEW", dueReview.action === PedagogicalAction.REVIEW);
var reviewMode = decidePedagogy(
  {},
  { reviewMode: true, reviewSkillLabel: "Variables" }
);
ok("review mode lock", reviewMode.action === PedagogicalAction.REVIEW);
var over = decidePedagogy(
  { confidence: { calibration: "overconfident", competence: 0.3 } },
  { lastSignals: { correctness: "partial" } }
);
ok("overconfident \u2192 CHECK_UNDERSTANDING", over.action === PedagogicalAction.CHECK_UNDERSTANDING);
var under = decidePedagogy(
  { confidence: { calibration: "underconfident", competence: 0.75 } },
  { lastSignals: { correctness: "correct" } }
);
ok("underconfident capable \u2192 CHALLENGE", under.action === PedagogicalAction.CHALLENGE);
var prereq = decidePedagogy(
  {
    knowledge: {
      skills: [
        {
          isPrimary: true,
          score: 25,
          blockingPrereqs: [
            { slug: "cs.l0.hardware", name: "Hardware basics", score: 20 }
          ]
        }
      ]
    }
  },
  {
    consecutiveIncorrect: 3,
    lastSignals: { correctness: "incorrect", affect: "frustrated" },
    subject: "Computer Science",
    topic: "Computer hardware"
  }
);
ok(
  "severe stuck + weak prereq \u2192 REMEDIATE_PREREQUISITE",
  prereq.action === PedagogicalAction.REMEDIATE_PREREQUISITE
);
ok("prereq label set", /Hardware/i.test(prereq.params?.prereqLabel || ""));
var mc = decidePedagogy(
  {
    misconceptions: [
      { id: "mc.x", label: "RAM is storage", isActive: true, confidence: 0.7 }
    ]
  },
  { lastSignals: { correctness: "incorrect" } }
);
ok("misconception \u2192 REMEDIATE_MISCONCEPTION", mc.action === PedagogicalAction.REMEDIATE_MISCONCEPTION);
var iv = decidePedagogy(
  {},
  { intervention: { status: "active", level: 3 } }
);
ok("active guide \u2192 FULL_GUIDE", iv.action === PedagogicalAction.FULL_GUIDE);
var adi = decidePedagogy(
  {
    adi: { preferLighterHelp: true, reliable: true },
    knowledge: { topicScore: 72 }
  },
  { lastSignals: { correctness: "correct" } }
);
ok("ADI light \u2192 INDEPENDENT_PRACTICE", adi.action === PedagogicalAction.INDEPENDENT_PRACTICE);
ok(
  "ladder map L1 micro",
  actionFromLadderLevel(1) === PedagogicalAction.MICRO_HINT
);
var block = buildPedagogyPromptBlock(stuck);
ok("prompt has EXECUTE ONLY", /EXECUTE ONLY/i.test(block));
ok("prompt has decision id", block.includes(stuck.id));
ok("prompt has action", block.includes("SLOW_DOWN"));
var dirs = pedagogyDirectives(stuck);
ok("directives non-empty", dirs.length >= 1);
var ser = serializePedagogyDecision(stuck);
ok("serialize action", ser.action === "SLOW_DOWN" && ser.decisionId);
var nba = rankNextBestActions({
  dueReviews: [{ skillSlug: "a", skillLabel: "Loops" }],
  recommendedSkill: { slug: "b", shortLabel: "Vars" }
});
ok("NBA ranks review first", nba[0].action === PedagogicalAction.REVIEW);
var fakeSystem = [
  "You are Kindling\u2026",
  "Live learner model\u2026",
  block,
  "Your teaching philosophy\u2026"
].join("\n");
ok("system assembly includes pedagogy block", /Pedagogical decision/i.test(fakeSystem));
ok("system assembly includes EXECUTE", /EXECUTE ONLY/i.test(fakeSystem));
ok("system assembly includes decision id", fakeSystem.includes(stuck.id));
ok(
  "insights carry decision + block block fields",
  ser.action && block.includes(ser.decisionId || stuck.id)
);
var weak = findWeakPrerequisite({
  consecutiveIncorrect: 3,
  last: { correctness: "incorrect" },
  learnerState: {
    knowledge: {
      skills: [
        {
          isPrimary: true,
          score: 20,
          blockingPrereqs: [{ slug: "p1", name: "Foundations", score: 15 }]
        }
      ]
    }
  }
});
ok("findWeakPrerequisite returns blocker", weak?.slug === "p1");
console.log(`
All ${passed} L2 pedagogy checks passed.`);
