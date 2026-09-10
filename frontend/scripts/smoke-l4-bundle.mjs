if(typeof import.meta!=='undefined'){try{import.meta.env=import.meta.env||{VITE_API_URL:'http://127.0.0.1:8000'}}catch(e){}}

// scripts/smoke-independence-l4.mjs
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
  PEDAGOGY_DECISION: "pedagogy.decision",
  /** Epic L4 — no-scaffold independence twin after heavy help */
  INDEPENDENCE_OFFERED: "independence.offered",
  INDEPENDENCE_STARTED: "independence.started",
  INDEPENDENCE_ANSWERED: "independence.answered",
  INDEPENDENCE_COMPLETED: "independence.completed",
  INDEPENDENCE_DECLINED: "independence.declined",
  INDEPENDENCE_SKIPPED: "independence.skipped"
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
var PILOT_SKILLS = Array.isArray(cs_pilot_data_default.skills) ? cs_pilot_data_default.skills : [];
var TOPIC_SKILL_MAP = cs_pilot_data_default.topics && typeof cs_pilot_data_default.topics === "object" ? cs_pilot_data_default.topics : {};
var skillBySlug = Object.fromEntries(PILOT_SKILLS.map((s) => [s.slug, s]));

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

// src/services/learning/csAssessmentBank.js
var CS_ASSESSMENT_QUESTIONS = [
  // ── L0 literacy ──
  {
    id: "aq.cs.tech.1",
    skillSlug: "cs.l0.tech_basics",
    subject: "Computer Science",
    topics: ["Understanding technology", "Tech basics"],
    concept: "Technology & data",
    difficulty: "easy",
    prompt: "In everyday computing, what is data?",
    options: [
      { id: "a", text: "Only numbers written by hand" },
      { id: "b", text: "Facts or information a computer can store and process" },
      { id: "c", text: "The physical case of a laptop" },
      { id: "d", text: "A type of power cable" }
    ],
    correctIndex: 1,
    explanationCorrect: "Yes \u2014 data is information (text, numbers, images, sound) represented so a computer can store and work with it.",
    explanationIncorrect: "Data is information a computer can store and process \u2014 not only handwritten numbers, and not the hardware case itself."
  },
  {
    id: "aq.cs.tech.2",
    skillSlug: "cs.l0.tech_basics",
    subject: "Computer Science",
    topics: ["Understanding technology", "Tech basics"],
    concept: "Digital vs analog",
    difficulty: "medium",
    /** Epic L4 — new surface for independence/transfer twin */
    transfer: true,
    prompt: "A market seller tracks prices with marks on paper, then types them into a phone app. What changed when the prices became digital?",
    options: [
      { id: "a", text: "The prices stopped being information" },
      { id: "b", text: "They are now represented in a form a computer can store and process (discrete digital values)" },
      { id: "c", text: "They can only exist as continuous sound waves" },
      { id: "d", text: "They can never be copied again" }
    ],
    correctIndex: 1,
    explanationCorrect: "Right \u2014 moving prices into the app makes them digital: discrete symbols a computer can store, copy, and process. The meaning (price) is the same; the representation changed.",
    explanationIncorrect: "Digital means a computer-friendly discrete representation (often bits). The prices are still information \u2014 they did not become waves-only, and digital data is usually easy to copy."
  },
  {
    id: "aq.cs.computer.1",
    skillSlug: "cs.l0.what_is_computer",
    subject: "Computer Science",
    topics: ["What is a computer?", "Computer model"],
    concept: "Input \u2192 process \u2192 output",
    difficulty: "easy",
    prompt: "Which sequence best describes how a computer works?",
    options: [
      { id: "a", text: "Output \u2192 storage \u2192 ignore input" },
      { id: "b", text: "Input \u2192 processing \u2192 output (with storage as needed)" },
      { id: "c", text: "Only storage, never processing" },
      { id: "d", text: "Hardware without software" }
    ],
    correctIndex: 1,
    explanationCorrect: "Exactly. Computers take input, process it following instructions, produce output, and use storage to keep data and programs.",
    explanationIncorrect: "The core model is input \u2192 processing \u2192 output, with storage holding data and programs. Skipping input or processing is not a working computer."
  },
  {
    id: "aq.cs.computer.2",
    skillSlug: "cs.l0.what_is_computer",
    subject: "Computer Science",
    topics: ["What is a computer?", "Computer model"],
    concept: "Hardware vs software",
    difficulty: "medium",
    transfer: true,
    prompt: "Aisha\u2019s tablet screen cracks, but her drawing app still opens. What failed, and what is still software?",
    options: [
      { id: "a", text: "The app is broken hardware; the screen is software" },
      { id: "b", text: "The screen is hardware that failed; the drawing app is still software" },
      { id: "c", text: "Both the screen and the app are only software" },
      { id: "d", text: "Nothing physical failed because apps are hardware" }
    ],
    correctIndex: 1,
    explanationCorrect: "Yes \u2014 the cracked screen is physical hardware. The drawing app is software (instructions). Hardware can break while software still exists.",
    explanationIncorrect: "Hardware = physical parts (like a screen). Software = programs (like a drawing app). A cracked screen is hardware failure; the app remains software."
  },
  {
    id: "aq.cs.types.1",
    skillSlug: "cs.l0.computer_types",
    subject: "Computer Science",
    topics: ["Types of computers", "Device types"],
    concept: "Device types",
    difficulty: "easy",
    prompt: "Which device is specialized to serve many users or apps over a network?",
    options: [
      { id: "a", text: "A typical kitchen timer" },
      { id: "b", text: "A server" },
      { id: "c", text: "A blank sheet of paper" },
      { id: "d", text: "A pure mechanical clock with no electronics" }
    ],
    correctIndex: 1,
    explanationCorrect: "Servers are computers designed to provide services (files, websites, apps) to many clients on a network.",
    explanationIncorrect: "A server is a computer that provides services to other devices. A kitchen timer or paper is not that role."
  },
  {
    id: "aq.cs.hw.1",
    skillSlug: "cs.l0.hardware",
    subject: "Computer Science",
    topics: ["Computer hardware", "Hardware"],
    concept: "CPU vs storage",
    difficulty: "easy",
    prompt: "What is the CPU mainly responsible for?",
    options: [
      { id: "a", text: "Long-term storage of all your photos forever" },
      { id: "b", text: "Carrying out instructions and calculations" },
      { id: "c", text: "Displaying only the desktop wallpaper" },
      { id: "d", text: "Providing Wi\u2011Fi without any processing" }
    ],
    correctIndex: 1,
    explanationCorrect: "The CPU (processor) executes instructions \u2014 it is the \u201Cbrain\u201D that calculates and controls processing.",
    explanationIncorrect: "Long-term files live on storage drives. The CPU\u2019s job is running instructions and doing the actual processing."
  },
  {
    id: "aq.cs.hw.2",
    skillSlug: "cs.l0.hardware",
    subject: "Computer Science",
    topics: ["Computer hardware", "Hardware"],
    concept: "RAM",
    difficulty: "medium",
    transfer: true,
    prompt: "You close a game and unplug the laptop. The game progress you never saved is gone, but a homework file on the hard drive is still there. What does that tell you about RAM vs storage?",
    options: [
      { id: "a", text: "RAM keeps files forever; storage forgets when power is off" },
      { id: "b", text: "RAM is short-term working memory (lost without power); storage keeps files longer" },
      { id: "c", text: "Both RAM and storage are only the screen" },
      { id: "d", text: "Unplugging never affects any kind of memory" }
    ],
    correctIndex: 1,
    explanationCorrect: "Exactly \u2014 unsaved game state lived in RAM (fast temporary working memory). The homework file on the drive is storage, which keeps data when power is off.",
    explanationIncorrect: "RAM is temporary working memory for running programs. Long-term files need disks/SSD storage, not RAM alone."
  },
  {
    id: "aq.cs.sw.1",
    skillSlug: "cs.l0.software",
    subject: "Computer Science",
    topics: ["Computer software", "Software"],
    concept: "Operating system",
    difficulty: "easy",
    prompt: "What does an operating system (OS) mainly do?",
    options: [
      { id: "a", text: "It is only a single photo editor" },
      { id: "b", text: "It manages hardware and lets apps run safely" },
      { id: "c", text: "It replaces the need for any hardware" },
      { id: "d", text: "It is the mouse cable" }
    ],
    correctIndex: 1,
    explanationCorrect: "The OS sits between hardware and apps \u2014 managing memory, files, devices, and starting programs.",
    explanationIncorrect: "An OS is system software that manages the machine so applications can run. It is not a single app or a cable."
  },
  {
    id: "aq.cs.files.1",
    skillSlug: "cs.l0.files_folders",
    subject: "Computer Science",
    topics: ["Files & folders", "Files"],
    concept: "Files and folders",
    difficulty: "easy",
    prompt: "What is a folder (directory) used for?",
    options: [
      { id: "a", text: "To organize related files in a hierarchy" },
      { id: "b", text: "To permanently delete the operating system" },
      { id: "c", text: "To replace the CPU" },
      { id: "d", text: "To generate electricity" }
    ],
    correctIndex: 0,
    explanationCorrect: "Folders group files so you can find and manage them in a tree of locations (paths).",
    explanationIncorrect: "Folders organize files. They do not replace hardware or power the machine."
  },
  {
    id: "aq.cs.files.2",
    skillSlug: "cs.l0.files_folders",
    subject: "Computer Science",
    topics: ["Files & folders", "Files"],
    concept: "File extensions",
    difficulty: "easy",
    prompt: "What does a file extension like .pdf or .jpg usually tell you?",
    options: [
      { id: "a", text: "The brand of the power supply" },
      { id: "b", text: "A hint about the file\u2019s type/format" },
      { id: "c", text: "That the file cannot be opened on any computer" },
      { id: "d", text: "The temperature of the CPU" }
    ],
    correctIndex: 1,
    explanationCorrect: "Extensions hint at format (document, image, etc.) so the OS and apps know how to open the file.",
    explanationIncorrect: "Extensions such as .pdf or .jpg signal file type/format \u2014 not hardware brand or temperature."
  },
  {
    id: "aq.cs.ops.1",
    skillSlug: "cs.l0.operate_computer",
    subject: "Computer Science",
    topics: ["Operating a computer", "Using a PC"],
    concept: "Using a computer",
    difficulty: "easy",
    prompt: "You install an app so you can use it later. Where does that usually live after install?",
    options: [
      { id: "a", text: "Only in RAM forever, even after shutdown" },
      { id: "b", text: "On storage, so you can launch it again from the OS" },
      { id: "c", text: "Inside the mouse" },
      { id: "d", text: "Only on the internet, never on the device" }
    ],
    correctIndex: 1,
    explanationCorrect: "Installed apps are saved on storage. You open them through the OS when needed; RAM holds them while running.",
    explanationIncorrect: "Installations persist on storage. RAM is temporary while the app runs; the mouse does not store applications."
  },
  {
    id: "aq.cs.netlit.1",
    skillSlug: "cs.l0.internet_literacy",
    subject: "Computer Science",
    topics: ["Internet literacy", "Internet"],
    concept: "Internet vs web",
    difficulty: "easy",
    prompt: "Which statement is most accurate?",
    options: [
      { id: "a", text: "The internet and the web are exactly the same thing" },
      { id: "b", text: "The internet is a network of networks; the web is one service on it" },
      { id: "c", text: "The web is the cables only; the internet is only videos" },
      { id: "d", text: "Neither involves computers" }
    ],
    correctIndex: 1,
    explanationCorrect: "The internet is the global network. The World Wide Web (sites/pages) is a major service that runs on top of it.",
    explanationIncorrect: "They are related but not identical: internet = network infrastructure; web = websites/pages as one use of that network."
  },
  {
    id: "aq.cs.safe.1",
    skillSlug: "cs.l0.digital_safety",
    subject: "Computer Science",
    topics: ["Digital safety", "Safety"],
    concept: "Phishing & passwords",
    difficulty: "easy",
    prompt: "Which is the safest habit?",
    options: [
      { id: "a", text: "Reuse one short password everywhere and share it freely" },
      { id: "b", text: "Use strong unique passwords and treat unexpected \u201Clogin\u201D links carefully" },
      { id: "c", text: "Click every email attachment from unknown senders" },
      { id: "d", text: "Post your banking PIN in a public chat" }
    ],
    correctIndex: 1,
    explanationCorrect: "Strong unique passwords and caution with unexpected links/attachments are core digital safety habits.",
    explanationIncorrect: "Reusing weak passwords and trusting surprise links/attachments are common ways accounts get stolen."
  },
  // ── L1 computational thinking ──
  {
    id: "aq.cs.ps.1",
    skillSlug: "cs.l1.problem_solving",
    subject: "Computer Science",
    topics: ["Problem solving", "Solve problems"],
    concept: "Problem solving",
    difficulty: "easy",
    prompt: "A good first step when solving a computing problem is to:",
    options: [
      { id: "a", text: "Ignore what the output should look like" },
      { id: "b", text: "Clarify the goal, inputs, and constraints" },
      { id: "c", text: "Delete all the data first" },
      { id: "d", text: "Skip breaking the problem into parts" }
    ],
    correctIndex: 1,
    explanationCorrect: "Clear goals, inputs, and constraints stop you from building the wrong solution.",
    explanationIncorrect: "Start by understanding the problem: what goes in, what should come out, and any limits."
  },
  {
    id: "aq.cs.algo.1",
    skillSlug: "cs.l1.algorithms",
    subject: "Computer Science",
    topics: ["Algorithms (thinking)", "Algorithms"],
    concept: "Algorithms",
    difficulty: "easy",
    prompt: "An algorithm is best described as:",
    options: [
      { id: "a", text: "A random guess with no steps" },
      { id: "b", text: "A clear, ordered set of steps to solve a problem" },
      { id: "c", text: "Only a physical computer chip" },
      { id: "d", text: "A password" }
    ],
    correctIndex: 1,
    explanationCorrect: "Algorithms are precise step-by-step procedures \u2014 recipes for solving a problem.",
    explanationIncorrect: "An algorithm is a finite sequence of clear steps, not a chip or a password."
  },
  {
    id: "aq.cs.abs.1",
    skillSlug: "cs.l1.abstraction",
    subject: "Computer Science",
    topics: ["Abstraction & patterns", "Abstraction"],
    concept: "Abstraction",
    difficulty: "medium",
    prompt: "Abstraction in computing means:",
    options: [
      { id: "a", text: "Hiding unnecessary detail so you can focus on what matters" },
      { id: "b", text: "Making every wire visible at all times" },
      { id: "c", text: "Never naming things" },
      { id: "d", text: "Deleting all comments from code" }
    ],
    correctIndex: 0,
    explanationCorrect: "Abstraction lets you use a simple interface while details stay under the hood \u2014 like driving without rebuilding the engine each trip.",
    explanationIncorrect: "Abstraction hides complexity on purpose so people and programs can work at a useful level of detail."
  },
  {
    id: "aq.cs.pat.1",
    skillSlug: "cs.l1.pattern_recognition",
    subject: "Computer Science",
    topics: ["Abstraction & patterns", "Patterns"],
    concept: "Pattern recognition",
    difficulty: "easy",
    prompt: "Why do computer scientists look for patterns?",
    options: [
      { id: "a", text: "To reuse ideas and avoid solving the same issue from scratch" },
      { id: "b", text: "To make problems intentionally harder" },
      { id: "c", text: "Patterns are never useful in computing" },
      { id: "d", text: "Only to decorate folders" }
    ],
    correctIndex: 0,
    explanationCorrect: "Spotting patterns helps you reuse solutions \u2014 loops, templates, known algorithms.",
    explanationIncorrect: "Patterns save work: similar problems often share structure you can reuse."
  },
  {
    id: "aq.cs.logic.1",
    skillSlug: "cs.l1.logical_thinking",
    subject: "Computer Science",
    topics: ["Logical thinking", "Logic"],
    concept: "Logic",
    difficulty: "easy",
    prompt: "If a condition is true, an if-statement runs its block. This is an example of:",
    options: [
      { id: "a", text: "Logical decision-making in a program" },
      { id: "b", text: "Deleting the hard drive" },
      { id: "c", text: "A type of monitor cable" },
      { id: "d", text: "Random noise with no rules" }
    ],
    correctIndex: 0,
    explanationCorrect: "Programs use true/false conditions to choose paths \u2014 core logical thinking.",
    explanationIncorrect: "If/then behavior is controlled logic, not hardware cables or randomness."
  },
  // ── L2 foundations ──
  {
    id: "aq.cs.bin.1",
    skillSlug: "cs.l2.number_systems",
    subject: "Computer Science",
    topics: ["Number systems & data", "Binary & bases", "Number systems"],
    concept: "Binary",
    difficulty: "medium",
    prompt: "Why do computers commonly use binary (0 and 1)?",
    options: [
      { id: "a", text: "Because two stable states are easy to represent in electronics" },
      { id: "b", text: "Because humans can only count to two" },
      { id: "c", text: "Because binary cannot represent text" },
      { id: "d", text: "Because binary ignores electricity entirely" }
    ],
    correctIndex: 0,
    explanationCorrect: "Electronics reliably distinguish two states (on/off). Those map cleanly to bits 0 and 1.",
    explanationIncorrect: "Binary fits hardware: two clear electrical states. Text and other data are encoded into bits too."
  },
  {
    id: "aq.cs.datarep.1",
    skillSlug: "cs.l2.data_representation",
    subject: "Computer Science",
    topics: ["Number systems & data", "Data bits", "Data representation"],
    concept: "Data representation",
    difficulty: "medium",
    prompt: "How can a computer store text such as the letter A?",
    options: [
      { id: "a", text: "As a coded number pattern (bits) agreed by a character encoding" },
      { id: "b", text: "Only as a physical paper letter glued inside the PC" },
      { id: "c", text: "Text cannot be stored digitally" },
      { id: "d", text: "Only as sound waves in RAM forever" }
    ],
    correctIndex: 0,
    explanationCorrect: "Encodings (like Unicode/ASCII ideas) map characters to numeric bit patterns the machine can store.",
    explanationIncorrect: "Digital text is stored as coded bit patterns \u2014 not paper slips inside the computer."
  },
  {
    id: "aq.cs.bool.1",
    skillSlug: "cs.l2.boolean",
    subject: "Computer Science",
    topics: ["Boolean logic & gates", "Boolean", "Boolean algebra"],
    concept: "Boolean AND",
    difficulty: "medium",
    prompt: "When is A AND B true?",
    options: [
      { id: "a", text: "When either A or B is true (or both)" },
      { id: "b", text: "Only when both A and B are true" },
      { id: "c", text: "Only when both are false" },
      { id: "d", text: "AND is never used in computing" }
    ],
    correctIndex: 1,
    explanationCorrect: "AND requires both inputs true. OR is the one that accepts either.",
    explanationIncorrect: "AND = both must be true. OR = at least one true. Mixing them is a common mix-up."
  },
  {
    id: "aq.cs.gates.1",
    skillSlug: "cs.l2.digital_logic",
    subject: "Computer Science",
    topics: ["Boolean logic & gates", "Logic gates", "Digital logic"],
    concept: "Logic gates",
    difficulty: "medium",
    prompt: "Logic gates are building blocks that:",
    options: [
      { id: "a", text: "Implement Boolean operations in hardware" },
      { id: "b", text: "Are only used for garden fences" },
      { id: "c", text: "Replace the need for any software forever" },
      { id: "d", text: "Store movies without electricity" }
    ],
    correctIndex: 0,
    explanationCorrect: "Gates (AND, OR, NOT, \u2026) realize Boolean logic in circuits that build processors.",
    explanationIncorrect: "In computing, gates are electronic Boolean building blocks \u2014 not garden hardware."
  },
  {
    id: "aq.cs.how.1",
    skillSlug: "cs.l2.how_computers_work",
    subject: "Computer Science",
    topics: ["How computers work", "Inside the machine"],
    concept: "Fetch-decode-execute",
    difficulty: "medium",
    prompt: "In a simple CPU cycle, what happens?",
    options: [
      { id: "a", text: "Fetch an instruction, decode it, then execute it" },
      { id: "b", text: "Only cool the fan, never run instructions" },
      { id: "c", text: "Print a page without any program" },
      { id: "d", text: "Skip memory entirely always" }
    ],
    correctIndex: 0,
    explanationCorrect: "The classic cycle: fetch instruction from memory \u2192 decode \u2192 execute, then repeat.",
    explanationIncorrect: "CPUs repeatedly fetch, decode, and execute instructions from memory."
  },
  // ── L3 programming ──
  {
    id: "aq.cs.prog.1",
    skillSlug: "cs.l3.prog_concepts",
    subject: "Computer Science",
    topics: ["Programming concepts", "What is code?"],
    concept: "Programs",
    difficulty: "easy",
    prompt: "A program is:",
    options: [
      { id: "a", text: "A set of instructions a computer can follow" },
      { id: "b", text: "Only the plastic keyboard keys" },
      { id: "c", text: "Electricity with no structure" },
      { id: "d", text: "A single random number with no purpose" }
    ],
    correctIndex: 0,
    explanationCorrect: "Programs are structured instructions \u2014 software that tells hardware what to do.",
    explanationIncorrect: "A program is intentional instructions, not the keyboard plastic itself."
  },
  {
    id: "aq.cs.var.1",
    skillSlug: "cs.l3.variables",
    subject: "Computer Science",
    topics: ["Variables, types & operators", "Variables"],
    concept: "Variables",
    difficulty: "easy",
    prompt: "What is a variable in programming?",
    options: [
      { id: "a", text: "A named place that holds a value which can change" },
      { id: "b", text: "A fixed wall that never stores data" },
      { id: "c", text: "Only a type of monitor" },
      { id: "d", text: "A Wi\u2011Fi password by definition" }
    ],
    correctIndex: 0,
    explanationCorrect: "Variables name memory that holds values you can read and update as the program runs.",
    explanationIncorrect: "Think of a labeled box: the name stays, the contents can change."
  },
  {
    id: "aq.cs.types.1",
    skillSlug: "cs.l3.types",
    subject: "Computer Science",
    topics: ["Variables, types & operators", "Types", "Primitive types"],
    concept: "Types",
    difficulty: "easy",
    prompt: "Why do types (number, text, boolean) matter?",
    options: [
      { id: "a", text: "They describe what kind of value you have and what operations make sense" },
      { id: "b", text: "Types are only for decorating code comments" },
      { id: "c", text: "All values are identical so types never help" },
      { id: "d", text: "Types replace the need for algorithms" }
    ],
    correctIndex: 0,
    explanationCorrect: "Types tell you (and the language) whether a value is text, a number, true/false, etc., so operations stay meaningful.",
    explanationIncorrect: "Types classify values. You would not multiply two names the same way you multiply numbers."
  },
  {
    id: "aq.cs.ops.2",
    skillSlug: "cs.l3.operators",
    subject: "Computer Science",
    topics: ["Variables, types & operators", "Operators"],
    concept: "Operators",
    difficulty: "easy",
    prompt: "Which operator compares whether two values are equal in many languages?",
    options: [
      { id: "a", text: "== or a language\u2019s equality test" },
      { id: "b", text: "A folder path only" },
      { id: "c", text: "The power button" },
      { id: "d", text: "A mouse DPI setting" }
    ],
    correctIndex: 0,
    explanationCorrect: "Equality operators test whether values match \u2014 distinct from assignment in most languages.",
    explanationIncorrect: "Comparison uses equality operators (often ==). Hardware buttons are not program operators."
  },
  {
    id: "aq.cs.cf.1",
    skillSlug: "cs.l3.control_flow",
    subject: "Computer Science",
    topics: ["Control flow & functions", "If & loops", "Control flow"],
    concept: "Loops",
    difficulty: "easy",
    prompt: "What is a loop for?",
    options: [
      { id: "a", text: "Repeating instructions while a condition holds" },
      { id: "b", text: "Turning off the monitor permanently" },
      { id: "c", text: "Naming a single variable once" },
      { id: "d", text: "Avoiding all repetition forever" }
    ],
    correctIndex: 0,
    explanationCorrect: "Loops repeat a block \u2014 for counting, processing lists, or waiting on a condition.",
    explanationIncorrect: "Loops exist to repeat work safely and clearly, not to power off hardware."
  },
  {
    id: "aq.cs.fn.1",
    skillSlug: "cs.l3.functions",
    subject: "Computer Science",
    topics: ["Control flow & functions", "Functions"],
    concept: "Functions",
    difficulty: "easy",
    prompt: "A function is useful because it:",
    options: [
      { id: "a", text: "Packages reusable behavior with inputs and outputs" },
      { id: "b", text: "Deletes the need for any structure" },
      { id: "c", text: "Is only a type of keyboard key" },
      { id: "d", text: "Cannot take parameters in any language" }
    ],
    correctIndex: 0,
    explanationCorrect: "Functions (or methods) group steps you can call again with different inputs.",
    explanationIncorrect: "Functions package reusable logic \u2014 a core way to organize programs."
  },
  {
    id: "aq.cs.ds.1",
    skillSlug: "cs.l3.data_structures_intro",
    subject: "Computer Science",
    topics: ["Lists, maps & structures", "Lists & maps", "Intro data structures"],
    concept: "Lists",
    difficulty: "easy",
    prompt: "A list/array is best when you need to:",
    options: [
      { id: "a", text: "Keep an ordered collection of items" },
      { id: "b", text: "Store only one bit forever with no order" },
      { id: "c", text: "Replace the CPU cooling fan" },
      { id: "d", text: "Avoid storing any values" }
    ],
    correctIndex: 0,
    explanationCorrect: "Lists/arrays hold sequences \u2014 scores, names, steps \u2014 in order.",
    explanationIncorrect: "Use a list when you have many values in sequence, not for hardware repairs."
  },
  {
    id: "aq.cs.debug.1",
    skillSlug: "cs.l3.debugging",
    subject: "Computer Science",
    topics: ["Debugging & modules", "Debug", "Errors & debugging"],
    concept: "Debugging",
    difficulty: "easy",
    prompt: "A healthy debugging habit is:",
    options: [
      { id: "a", text: "Read the error, reproduce it, and change one thing at a time" },
      { id: "b", text: "Ignore messages and rewrite everything randomly" },
      { id: "c", text: "Never test after a fix" },
      { id: "d", text: "Blame the user without checking the code" }
    ],
    correctIndex: 0,
    explanationCorrect: "Good debugging is systematic: understand the failure, isolate causes, fix, re-test.",
    explanationIncorrect: "Random rewrites without reading errors waste time. Slow down and isolate the bug."
  },
  {
    id: "aq.cs.mod.1",
    skillSlug: "cs.l3.modules",
    subject: "Computer Science",
    topics: ["Debugging & modules", "Modules", "Modules & packages"],
    concept: "Modules",
    difficulty: "easy",
    prompt: "Why split code into modules/packages?",
    options: [
      { id: "a", text: "To organize and reuse code cleanly" },
      { id: "b", text: "To make navigation impossible on purpose" },
      { id: "c", text: "Modules only exist in printers" },
      { id: "d", text: "So programs cannot import anything" }
    ],
    correctIndex: 0,
    explanationCorrect: "Modules keep related functions together and let you import them where needed.",
    explanationIncorrect: "Modules are about structure and reuse in software \u2014 not printer hardware."
  },
  // ── L4 algorithms ──
  {
    id: "aq.cs.search.1",
    skillSlug: "cs.l4.searching",
    subject: "Computer Science",
    topics: ["Searching & sorting", "Search", "Searching"],
    concept: "Binary search idea",
    difficulty: "medium",
    prompt: "Binary search works efficiently when the data is:",
    options: [
      { id: "a", text: "Sorted, so you can discard half each step" },
      { id: "b", text: "Completely random with no order ever" },
      { id: "c", text: "Not stored at all" },
      { id: "d", text: "Only sounds, never numbers or text keys" }
    ],
    correctIndex: 0,
    explanationCorrect: "Binary search needs sorted order to jump to the middle and eliminate half the range.",
    explanationIncorrect: "Without sorted order, you generally fall back to checking items one by one (linear search)."
  },
  {
    id: "aq.cs.sort.1",
    skillSlug: "cs.l4.sorting",
    subject: "Computer Science",
    topics: ["Searching & sorting", "Sort", "Sorting"],
    concept: "Sorting",
    difficulty: "easy",
    prompt: "Sorting a list means:",
    options: [
      { id: "a", text: "Arranging items into an order (e.g. smallest to largest)" },
      { id: "b", text: "Deleting the list permanently" },
      { id: "c", text: "Hiding the list from the OS" },
      { id: "d", text: "Converting the CPU into RAM" }
    ],
    correctIndex: 0,
    explanationCorrect: "Sorting puts elements in a defined order \u2014 alphabetical, numeric, by date, and so on.",
    explanationIncorrect: "Sorting reorders; it does not delete data or change hardware roles."
  },
  {
    id: "aq.cs.stack.1",
    skillSlug: "cs.l4.fundamental_ds",
    subject: "Computer Science",
    topics: ["Stacks, queues, trees & graphs", "Stacks & queues", "Fundamental data structures"],
    concept: "Stack vs queue",
    difficulty: "medium",
    prompt: "A stack follows which rule?",
    options: [
      { id: "a", text: "Last in, first out (LIFO)" },
      { id: "b", text: "First in, first out only (like a fair queue)" },
      { id: "c", text: "Never insert or remove items" },
      { id: "d", text: "Only store images permanently on paper" }
    ],
    correctIndex: 0,
    explanationCorrect: "Stacks are LIFO \u2014 like a stack of plates. Queues are FIFO \u2014 like a line at a shop.",
    explanationIncorrect: "Stack = LIFO. Queue = FIFO. Mixing them is a classic mix-up."
  },
  {
    id: "aq.cs.tree.1",
    skillSlug: "cs.l4.trees",
    subject: "Computer Science",
    topics: ["Stacks, queues, trees & graphs", "Trees"],
    concept: "Trees",
    difficulty: "medium",
    prompt: "In a tree structure, the top node is often called the:",
    options: [
      { id: "a", text: "Root" },
      { id: "b", text: "Leaf only, with no children ever allowed above" },
      { id: "c", text: "Modem" },
      { id: "d", text: "Pixel" }
    ],
    correctIndex: 0,
    explanationCorrect: "Trees have a root at the top; leaves are nodes without children further down.",
    explanationIncorrect: "Root is the starting node. Leaves are at the ends of branches."
  },
  {
    id: "aq.cs.graph.1",
    skillSlug: "cs.l4.graphs",
    subject: "Computer Science",
    topics: ["Stacks, queues, trees & graphs", "Graphs"],
    concept: "Graphs",
    difficulty: "medium",
    prompt: "A graph in CS is made of:",
    options: [
      { id: "a", text: "Nodes (vertices) connected by edges" },
      { id: "b", text: "Only one isolated number with no relationships" },
      { id: "c", text: "Printer ink levels exclusively" },
      { id: "d", text: "A single unbroken metal bar" }
    ],
    correctIndex: 0,
    explanationCorrect: "Graphs model relationships: people in a network, cities and roads, web links.",
    explanationIncorrect: "Think dots and connections \u2014 vertices and edges \u2014 not printer supplies."
  },
  {
    id: "aq.cs.bigo.1",
    skillSlug: "cs.l4.algorithm_analysis",
    subject: "Computer Science",
    topics: ["Searching & sorting", "Big-O intro", "Algorithm analysis"],
    concept: "Algorithm analysis",
    difficulty: "medium",
    prompt: "When we compare algorithms, we often care most about:",
    options: [
      { id: "a", text: "How work grows as the input gets larger" },
      { id: "b", text: "The color of the IDE theme only" },
      { id: "c", text: "Whether the file name has a vowel" },
      { id: "d", text: "The brand of the desk chair" }
    ],
    correctIndex: 0,
    explanationCorrect: "Algorithm analysis studies growth of time/space as n increases \u2014 efficiency at scale.",
    explanationIncorrect: "We care how cost scales with input size, not cosmetic editor choices."
  },
  // ── Building real systems ──
  {
    id: "aq.cs.git.1",
    skillSlug: "cs.l7.version_control",
    subject: "Computer Science",
    topics: ["Version control & testing", "Git basics", "Version control"],
    concept: "Version control",
    difficulty: "easy",
    prompt: "Version control (e.g. Git) helps you:",
    options: [
      { id: "a", text: "Track changes and collaborate without losing history" },
      { id: "b", text: "Increase CPU clock speed in hardware" },
      { id: "c", text: "Replace the need for saving files" },
      { id: "d", text: "Block all teamwork permanently" }
    ],
    correctIndex: 0,
    explanationCorrect: "Git records history so you can experiment, undo, and work with others safely.",
    explanationIncorrect: "Version control is about history and collaboration \u2014 not overclocking CPUs."
  },
  {
    id: "aq.cs.test.1",
    skillSlug: "cs.l7.testing",
    subject: "Computer Science",
    topics: ["Version control & testing", "Testing", "Software testing"],
    concept: "Testing",
    difficulty: "easy",
    prompt: "Automated tests are valuable because they:",
    options: [
      { id: "a", text: "Catch regressions when you change code" },
      { id: "b", text: "Remove the need for any requirements" },
      { id: "c", text: "Replace users entirely in all products" },
      { id: "d", text: "Only slow teams down with no benefit" }
    ],
    correctIndex: 0,
    explanationCorrect: "Tests check that behavior still works after edits \u2014 a safety net for change.",
    explanationIncorrect: "Good tests reduce fear of change by spotting breaks early."
  },
  {
    id: "aq.cs.db.1",
    skillSlug: "cs.l8.db_foundations",
    subject: "Computer Science",
    topics: ["Databases intro", "Databases", "Database foundations"],
    concept: "Databases",
    difficulty: "easy",
    prompt: "A database is primarily used to:",
    options: [
      { id: "a", text: "Store and query structured data reliably" },
      { id: "b", text: "Cool the GPU" },
      { id: "c", text: "Draw only desktop wallpapers" },
      { id: "d", text: "Replace keyboards" }
    ],
    correctIndex: 0,
    explanationCorrect: "Databases organize data for safe storage and efficient queries \u2014 users, orders, messages, and more.",
    explanationIncorrect: "Databases are for data, not cooling hardware or replacing input devices."
  },
  {
    id: "aq.cs.net.1",
    skillSlug: "cs.l9.net_foundations",
    subject: "Computer Science",
    topics: ["Networks & the web", "Networks", "Networking foundations"],
    concept: "Networks",
    difficulty: "easy",
    prompt: "On a network, a client typically:",
    options: [
      { id: "a", text: "Requests services from a server" },
      { id: "b", text: "Is never allowed to send messages" },
      { id: "c", text: "Is only a power supply unit" },
      { id: "d", text: "Cannot use IP addresses ever" }
    ],
    correctIndex: 0,
    explanationCorrect: "Client\u2013server: your browser (client) requests pages from a web server.",
    explanationIncorrect: "Clients ask; servers respond. Both are computers (or programs) on a network."
  },
  {
    id: "aq.cs.web.1",
    skillSlug: "cs.l11.web_intro",
    subject: "Computer Science",
    topics: ["Networks & the web", "Web intro", "Web & internet computing intro"],
    concept: "Web",
    difficulty: "easy",
    prompt: "When you open a website, your browser is mainly acting as a:",
    options: [
      { id: "a", text: "Client that requests pages and displays them" },
      { id: "b", text: "Nuclear power plant" },
      { id: "c", text: "Replacement for all databases worldwide" },
      { id: "d", text: "Device that never uses networks" }
    ],
    correctIndex: 0,
    explanationCorrect: "Browsers are web clients: they request resources and render what comes back.",
    explanationIncorrect: "Your browser is a client on the network, not the entire internet\u2019s database."
  },
  {
    id: "aq.cs.os.1",
    skillSlug: "cs.l6.os_intro",
    subject: "Computer Science",
    topics: ["Operating systems intro", "OS intro"],
    concept: "OS role",
    difficulty: "medium",
    prompt: "Which task is typical for an operating system?",
    options: [
      { id: "a", text: "Scheduling processes and managing memory" },
      { id: "b", text: "Growing coffee beans" },
      { id: "c", text: "Being a single spreadsheet cell only" },
      { id: "d", text: "Avoiding all interaction with hardware" }
    ],
    correctIndex: 0,
    explanationCorrect: "OSes manage processes, memory, files, and devices so apps can share the machine fairly.",
    explanationIncorrect: "Process scheduling and memory management are classic OS jobs."
  },
  {
    id: "aq.cs.disc.1",
    skillSlug: "cs.l5.discrete_math_intro",
    subject: "Computer Science",
    topics: ["Discrete math for CS", "Discrete intro", "Discrete math foundations"],
    concept: "Discrete math",
    difficulty: "medium",
    prompt: "Discrete math is especially useful in CS because it deals with:",
    options: [
      { id: "a", text: "Separate countable structures like sets, logic, and graphs" },
      { id: "b", text: "Only continuous fluid dynamics of oceans" },
      { id: "c", text: "Cooking temperatures exclusively" },
      { id: "d", text: "Nothing related to algorithms" }
    ],
    correctIndex: 0,
    explanationCorrect: "CS leans on discrete structures \u2014 logic, sets, graphs, counting \u2014 that match digital systems.",
    explanationIncorrect: "Discrete math studies distinct objects and relationships foundational to algorithms and proofs."
  },
  {
    id: "aq.cs.ai.1",
    skillSlug: "cs.l13.ai_intro",
    subject: "Computer Science",
    topics: ["AI & data science intro", "AI intro"],
    concept: "AI basics",
    difficulty: "easy",
    prompt: "A careful way to think about many modern AI systems is:",
    options: [
      { id: "a", text: "They learn patterns from data and can be wrong" },
      { id: "b", text: "They are always perfect and never need data" },
      { id: "c", text: "They are only mechanical clocks" },
      { id: "d", text: "They cannot process any information" }
    ],
    correctIndex: 0,
    explanationCorrect: "Most ML systems fit patterns from examples. They can fail, so humans stay responsible for use.",
    explanationIncorrect: "AI is not magic perfection \u2014 quality depends on data, design, and careful evaluation."
  }
];

// src/services/learning/assessmentBank.js
var LEGACY_ASSESSMENT_QUESTIONS = [
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
      { id: "d", text: "4/1" }
    ],
    correctIndex: 1,
    explanationCorrect: "Yes \u2014 one equal piece out of four is 1/4. The bottom number (denominator) names how many equal parts make the whole; the top (numerator) counts how many of those parts you have.",
    explanationIncorrect: "Not quite. When a whole is split into 4 equal pieces, each piece is 1/4. Remember: denominator = equal parts in the whole, numerator = parts you are counting. Here that is 1 out of 4 \u2192 1/4."
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
      { id: "d", text: "A stick broken into 5 equal parts, take 3" }
    ],
    correctIndex: 1,
    explanationCorrect: "Exactly. 1/3 means the whole is in 3 equal parts and we take one. Equal size matters \u2014 unequal pieces are not fair fraction parts.",
    explanationIncorrect: "For 1/3 the whole must be divided into 3 equal parts, then we take one. Unequal pieces do not count as proper fraction parts. So: 3 equal parts, take 1."
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
      { id: "d", text: "To multiply by 5" }
    ],
    correctIndex: 1,
    explanationCorrect: "Right. The denominator (bottom) is 5 \u2014 the whole is split into 5 equal parts. The numerator 3 says we have three of those parts.",
    explanationIncorrect: "Look at the bottom number. In 3/5, the 5 is the denominator: it names how many equal parts make the whole. The 3 on top is how many parts we have."
  },
  {
    id: "aq.frac.numden.2",
    skillSlug: "frac.numerator_denominator",
    subject: "Math Foundations",
    topics: ["Numerator & denominator", "Fraction sense"],
    concept: "Reading fractions",
    difficulty: "easy",
    prompt: "Which fraction means \u201Ctwo out of eight equal parts\u201D?",
    options: [
      { id: "a", text: "8/2" },
      { id: "b", text: "2/8" },
      { id: "c", text: "2/6" },
      { id: "d", text: "8/8" }
    ],
    correctIndex: 1,
    explanationCorrect: "Yes \u2014 2/8. Top = parts we have (2), bottom = equal parts in the whole (8).",
    explanationIncorrect: "\u201CTwo out of eight\u201D puts 2 on top and 8 on the bottom \u2192 2/8. Swapping them (8/2) would mean something different."
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
      { id: "d", text: "At 1 (four jumps)" }
    ],
    correctIndex: 2,
    explanationCorrect: "Yes. Four equal jumps fill 0\u21921; each jump is 1/4. Three jumps land on 3/4 \u2014 still before 1.",
    explanationIncorrect: "Think of the line 0 to 1 cut into 4 equal jumps. Each jump is 1/4. So 3/4 is three jumps from 0 \u2014 one jump short of 1."
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
      { id: "d", text: "2/3" }
    ],
    correctIndex: 2,
    explanationCorrect: "Correct \u2014 halfway is 1/2. Two equal halves make the whole from 0 to 1.",
    explanationIncorrect: "Halfway means the distance is split into 2 equal parts. That point is 1/2, not 1/3 or 1/4."
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
      { id: "d", text: "3/5" }
    ],
    correctIndex: 1,
    explanationCorrect: "Yes \u2014 2/4 = 1/2. Multiply top and bottom by the same number (here \xD72) and the amount stays the same, just in smaller pieces.",
    explanationIncorrect: "Equivalent fractions name the same amount. Multiply 1/2 top and bottom by 2 \u2192 2/4. Same size of the whole, different piece size."
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
      { id: "d", text: "Swap top and bottom" }
    ],
    correctIndex: 1,
    explanationCorrect: "Exactly. Same multiplier (or divisor) on numerator and denominator keeps the value. Adding the same number does not.",
    explanationIncorrect: "To keep the value, multiply or divide both numerator and denominator by the same non-zero number. Adding the same amount to both changes the value."
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
      { id: "d", text: "Cannot tell" }
    ],
    correctIndex: 1,
    explanationCorrect: "Yes \u2014 same-size fifths, so more pieces wins: 4/5 > 2/5.",
    explanationIncorrect: "Same denominator means same piece size. More pieces on top means a larger fraction, so 4/5 is larger than 2/5."
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
      { id: "d", text: "1/6 because 6 is bigger" }
    ],
    correctIndex: 0,
    explanationCorrect: "Right. Unit fractions get smaller as the denominator grows \u2014 sixths are tinier pieces than thirds, so 1/3 > 1/6.",
    explanationIncorrect: "For unit fractions (1 on top), a larger bottom means smaller pieces. Thirds are bigger pieces than sixths, so 1/3 is larger than 1/6."
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
      { id: "d", text: "1/3" }
    ],
    correctIndex: 1,
    explanationCorrect: "Yes \u2014 same bottoms stay the same; add the tops: 1+3=4, so 4/8. (You can simplify later to 1/2.)",
    explanationIncorrect: "Same denominator: keep the 8, add numerators 1+3=4 \u2192 4/8. Do not add the bottoms (that would make 4/16, which is wrong here)."
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
      { id: "d", text: "4/4" }
    ],
    correctIndex: 1,
    explanationCorrect: "Correct \u2014 2+2=4 sevenths \u2192 4/7. Same-size pieces stack by counting how many you have.",
    explanationIncorrect: "Keep the denominator 7. Add only the tops: 2+2=4, so 4/7. Adding denominators is a common mix-up \u2014 skip that here."
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
      { id: "d", text: "2/6" }
    ],
    correctIndex: 1,
    explanationCorrect: "Yes \u2014 rewrite 1/3 as 2/6, then 2/6+1/6=3/6=1/2. Different bottoms need a common denominator first.",
    explanationIncorrect: "Different bottoms: find a common denominator. 1/3 = 2/6, then 2/6 + 1/6 = 3/6 = 1/2. Never add tops and bottoms separately as 2/9."
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
      { id: "d", text: "2/4" }
    ],
    correctIndex: 2,
    explanationCorrect: "Nice \u2014 1/2 = 2/4, so 1/4 + 2/4 = 3/4. Same-size fourths make the add easy.",
    explanationIncorrect: "Change 1/2 into fourths: 1/2 = 2/4. Then 1/4 + 2/4 = 3/4. Common denominator first, then add tops."
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
      { id: "d", text: "12" }
    ],
    correctIndex: 1,
    explanationCorrect: "Yes \u2014 undo +5 by subtracting 5 from both sides: x = 12 \u2212 5 = 7. Check: 7+5=12.",
    explanationIncorrect: "To isolate x, undo the +5: subtract 5 from both sides. 12 \u2212 5 = 7. Check by plugging back: 7 + 5 = 12."
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
      { id: "d", text: "18" }
    ],
    correctIndex: 2,
    explanationCorrect: "Correct \u2014 divide both sides by 3: x = 15 \xF7 3 = 5. Check: 3\xD75=15.",
    explanationIncorrect: "3x means 3 times x. Undo by dividing both sides by 3: 15 \xF7 3 = 5. Check: 3 \xD7 5 = 15."
  },
  // —— Generic literacy / science-ish fallbacks for non-pilot topics ——
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
      { id: "d", text: "Change your answer randomly at the end" }
    ],
    correctIndex: 1,
    explanationCorrect: "Good habit. Slow down, re-read, and say in your own words what the question wants \u2014 then choose.",
    explanationIncorrect: "Rushing guesses hides what you know. Best first move: re-read and name what the question is asking, then pick carefully."
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
      { id: "d", text: "Only correct answers matter" }
    ],
    correctIndex: 1,
    explanationCorrect: "Exactly \u2014 checks are for revision. Whether you were right or wrong, the short tutor note locks the idea in.",
    explanationIncorrect: "These checks are low-stakes revision, not a scolding. Every answer gets a short tutor explanation so the concept sticks."
  }
];
var ASSESSMENT_QUESTIONS = [
  ...CS_ASSESSMENT_QUESTIONS,
  ...LEGACY_ASSESSMENT_QUESTIONS
];
function skillSlugsForLessonTopic(topic = "") {
  const top = String(topic || "").trim();
  if (!top) return [];
  const links = TOPIC_SKILL_MAP[top];
  if (Array.isArray(links) && links.length) {
    const primary = links.filter((l) => l.isPrimary !== false).map((l) => l.slug).filter(Boolean);
    const support = links.filter((l) => l.isPrimary === false).map((l) => l.slug).filter(Boolean);
    return [...primary, ...support];
  }
  const t = top.toLowerCase();
  return (PILOT_SKILLS || []).filter((s) => {
    const name = String(s.name || "").toLowerCase();
    const short = String(s.shortLabel || "").toLowerCase();
    return name === t || short === t || name.includes(t) || t.includes(name) || short && (short.includes(t) || t.includes(short));
  }).map((s) => s.slug);
}
function questionsForTopic(subject = "", topic = "", opts = {}) {
  const sub = String(subject || "").toLowerCase();
  const top = String(topic || "").toLowerCase();
  const unit = String(opts.unit || "").toLowerCase();
  const fromGraph = skillSlugsForLessonTopic(topic);
  const skillSlugs = [
    ...new Set(
      [
        ...Array.isArray(opts.skillSlugs) ? opts.skillSlugs : [],
        opts.skillSlug || "",
        ...fromGraph
      ].map((s) => String(s || "").toLowerCase()).filter(Boolean)
    )
  ];
  const limit = Math.max(1, Number(opts.limit) || 5);
  const minScore = opts.minScore != null ? Number(opts.minScore) : 6;
  const transferOnly = Boolean(opts.transferOnly);
  const excludeTransfer = Boolean(opts.excludeTransfer);
  const preferTransfer = Boolean(opts.preferTransfer);
  const scored = ASSESSMENT_QUESTIONS.map((q2) => {
    if (transferOnly && !q2.transfer) return { q: q2, score: -999 };
    if (excludeTransfer && q2.transfer) return { q: q2, score: -999 };
    let score = 0;
    const qSkill = String(q2.skillSlug || "").toLowerCase();
    if (qSkill && skillSlugs.includes(qSkill)) {
      const idx = skillSlugs.indexOf(qSkill);
      score += idx === 0 ? 20 : idx === 1 ? 16 : 12;
    }
    if (preferTransfer && q2.transfer) score += 5;
    const qSub = (q2.subject || "").toLowerCase();
    if (sub && qSub) {
      if (qSub === sub) score += 4;
      else if (qSub.includes(sub) || sub.includes(qSub)) score += 2;
      if (sub.includes("computer") && qSub.includes("math")) score -= 8;
      if (sub.includes("math") && qSub.includes("computer")) score -= 8;
    }
    const topics = Array.isArray(q2.topics) ? q2.topics : [];
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
    return { q: q2, score };
  }).filter((row) => row.score >= minScore).sort((a, b) => b.score - a.score || a.q.id.localeCompare(b.q.id));
  let picked2 = scored.map((r) => r.q);
  if (picked2.length < Math.min(3, limit) && !transferOnly) {
    const relaxed = ASSESSMENT_QUESTIONS.map((q2) => {
      if (excludeTransfer && q2.transfer) return { q: q2, score: -999 };
      const qSkill = String(q2.skillSlug || "").toLowerCase();
      let score = 0;
      if (qSkill && skillSlugs.includes(qSkill)) score += 10;
      const topics = Array.isArray(q2.topics) ? q2.topics : [];
      for (const t of topics) {
        const tl = String(t).toLowerCase();
        if (tl !== "*" && top && (top.includes(tl) || tl.includes(top))) {
          score += 6;
        }
      }
      const qSub = (q2.subject || "").toLowerCase();
      if (sub && qSub && (qSub.includes(sub) || sub.includes(qSub))) score += 2;
      if (sub.includes("computer") && qSub.includes("math")) score -= 8;
      return { q: q2, score };
    }).filter((r) => r.score >= 4).sort((a, b) => b.score - a.score);
    const seen = new Set(picked2.map((q2) => q2.id));
    for (const row of relaxed) {
      if (seen.has(row.q.id)) continue;
      picked2.push(row.q);
      seen.add(row.q.id);
      if (picked2.length >= limit) break;
    }
  }
  if (skillSlugs.length && picked2.length) {
    const primarySet = new Set(skillSlugs.slice(0, 2));
    const primaryQs = picked2.filter(
      (q2) => primarySet.has(String(q2.skillSlug || "").toLowerCase())
    );
    const otherQs = picked2.filter(
      (q2) => !primarySet.has(String(q2.skillSlug || "").toLowerCase())
    );
    const primaryTarget = Math.max(
      1,
      Math.min(primaryQs.length, Math.ceil(limit * 0.7))
    );
    picked2 = [
      ...primaryQs.slice(0, primaryTarget),
      ...otherQs,
      ...primaryQs.slice(primaryTarget)
    ];
  }
  if (picked2.length > limit) {
    picked2 = picked2.slice(0, limit);
  }
  if (!picked2.length) {
    picked2 = ASSESSMENT_QUESTIONS.filter(
      (q2) => (q2.topics || []).includes("*")
    );
  }
  const seed = hashStr(`${sub}|${top}|${unit}|${skillSlugs.join(",")}`);
  const rotated = rotate(picked2, seed % Math.max(1, picked2.length));
  return rotated.slice(0, limit);
}
function hashStr(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i += 1) {
    h = h * 31 + str.charCodeAt(i) >>> 0;
  }
  return h;
}
function rotate(arr, n) {
  if (!arr.length) return [];
  const k = (n % arr.length + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

// src/services/learning/assessmentEngine.js
var AssessmentPhase = {
  OFFERED: "offered",
  ACTIVE: "active",
  EXPLAINING: "explaining",
  COMPLETED: "completed",
  EXITED: "exited"
};
function currentQuestion(session) {
  if (!session?.questions?.length) return null;
  const i = session.currentIndex ?? 0;
  if (i < 0 || i >= session.questions.length) return null;
  return session.questions[i];
}
function applyAssessmentAnswer(session, selectedIndex) {
  if (!session || session.status !== AssessmentPhase.ACTIVE) {
    return { session, advanced: false };
  }
  if (session.phase === AssessmentPhase.EXPLAINING) {
    return { session, advanced: false };
  }
  const q2 = currentQuestion(session);
  if (!q2) return { session, advanced: false };
  const idx = Number(selectedIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= (q2.options?.length || 0)) {
    return { session, advanced: false };
  }
  const correct = idx === q2.correctIndex;
  const explanation = correct ? q2.explanationCorrect || "Solid \u2014 that idea is locked in." : q2.explanationIncorrect || "Not this time \u2014 revisit the idea, then try the next one.";
  const result2 = {
    questionId: q2.id,
    questionIndex: session.currentIndex,
    selectedIndex: idx,
    correctIndex: q2.correctIndex,
    correct,
    correctness: correct ? "correct" : "incorrect",
    explanation,
    concept: q2.concept || "",
    skillSlug: q2.skillSlug || "",
    prompt: q2.prompt,
    selectedText: q2.options[idx]?.text || "",
    correctText: q2.options[q2.correctIndex]?.text || "",
    at: Date.now()
  };
  const answers = [...session.answers || [], result2];
  const next = {
    ...session,
    phase: AssessmentPhase.EXPLAINING,
    answers,
    lastResult: result2
  };
  return { session: next, advanced: false, result: result2 };
}
function advanceAssessment(session) {
  if (!session) return { session: null, completed: false };
  if (session.status === AssessmentPhase.COMPLETED) {
    return { session, completed: true };
  }
  if (session.phase !== AssessmentPhase.EXPLAINING) {
    return { session, completed: false };
  }
  const nextIndex = (session.currentIndex || 0) + 1;
  if (nextIndex >= (session.questions?.length || 0)) {
    const completed2 = {
      ...session,
      status: AssessmentPhase.COMPLETED,
      phase: AssessmentPhase.COMPLETED,
      currentIndex: nextIndex,
      completedAt: Date.now(),
      lastResult: session.lastResult
    };
    return { session: completed2, completed: true };
  }
  return {
    session: {
      ...session,
      phase: AssessmentPhase.ACTIVE,
      currentIndex: nextIndex,
      lastResult: null
    },
    completed: false
  };
}
function scoreAssessment(session) {
  const answers = session?.answers || [];
  const total = session?.questions?.length || answers.length || 0;
  const correct = answers.filter((a) => a.correct).length;
  const incorrect = answers.filter((a) => a && a.correct === false).length;
  const answered = answers.length;
  const percent = total > 0 ? Math.round(correct / total * 100) : 0;
  const skillCounts = {};
  for (const a of answers) {
    const slug = a.skillSlug || "unknown";
    if (!skillCounts[slug]) skillCounts[slug] = { correct: 0, incorrect: 0 };
    if (a.correct) skillCounts[slug].correct += 1;
    else skillCounts[slug].incorrect += 1;
  }
  return {
    correct,
    incorrect,
    answered,
    total,
    percent,
    skillCounts,
    passed: percent >= 60,
    strong: percent >= 80
  };
}

// src/services/learning/independenceCheck.js
var INDEPENDENCE_CHECK_VERSION = 1;
var HEAVY_HELP_MIN_LEVEL = InterventionLevel.WORKED_EXAMPLE;
var IndependencePhase = {
  IDLE: "idle",
  OFFERED: "offered",
  ACTIVE: "active",
  EXPLAINING: "explaining",
  COMPLETED: "completed",
  SKIPPED: "skipped",
  DECLINED: "declined"
};
function shouldOfferIndependenceTwin({
  ladderLevel = 0,
  hadGradedSuccessDuringHelp = false,
  alreadyOfferedThisSession = false,
  alreadyCompletedThisSession = false,
  assessmentActive = false,
  multiStepActive = false,
  interventionActive = false
} = {}) {
  if (alreadyOfferedThisSession || alreadyCompletedThisSession) return false;
  if (assessmentActive || multiStepActive || interventionActive) return false;
  const level = normalizeLevel(ladderLevel);
  if (level < HEAVY_HELP_MIN_LEVEL) return false;
  if (!hadGradedSuccessDuringHelp && level < InterventionLevel.FULL_GUIDE) {
    return false;
  }
  return true;
}
function buildIndependenceOfferCard({
  topic = "",
  skillLabel = "",
  transfer = false,
  ladderLevel = 0
} = {}) {
  const focus = skillLabel || topic || "this idea";
  const level = normalizeLevel(ladderLevel);
  return {
    kind: "independence_twin",
    headline: transfer ? "Try a fresh angle" : "Try one on your own",
    body: transfer ? `You just got help on \xAB${focus}\xBB. Ready for one new-looking question with no hints \u2014 just to see what stuck?` : `You just worked through \xAB${focus}\xBB with support. Want one short twin with no hints \u2014 a confidence check, not a test?`,
    acceptCta: "Yes, one question",
    declineCta: "Not now",
    eyebrow: "Independence spark",
    transfer: Boolean(transfer),
    ladderLevel: level,
    topic: topic || "",
    skillLabel: focus
  };
}
function pickIndependenceTwinQuestion({
  subject = "",
  topic = "",
  unit = "",
  skillSlug = "",
  skillSlugs = [],
  preferTransfer = true,
  excludeIds = []
} = {}) {
  const baseOpts = {
    skillSlug,
    skillSlugs,
    unit,
    limit: 8,
    minScore: 4
  };
  const exclude = new Set((excludeIds || []).map(String));
  let pool = [];
  if (preferTransfer) {
    pool = questionsForTopic(subject, topic, {
      ...baseOpts,
      transferOnly: true
    });
  }
  let transfer = pool.length > 0;
  if (!pool.length) {
    pool = questionsForTopic(subject, topic, {
      ...baseOpts,
      // standard items OK as near-twins
      transferOnly: false
    });
    transfer = false;
  }
  pool = pool.filter((q2) => q2 && !exclude.has(String(q2.id)));
  if (!pool.length) return null;
  const medium = pool.find((q2) => q2.difficulty === "medium");
  const question = medium || pool[0];
  return {
    question: {
      ...question,
      options: (question.options || []).map((o) => ({ ...o }))
    },
    transfer: Boolean(transfer || question.transfer)
  };
}
function createIndependenceSession({
  subject = "",
  topic = "",
  unit = "",
  skillSlug = "",
  skillSlugs = [],
  ladderLevel = 0,
  ladderLevelId = "",
  preferTransfer = true,
  source = "post_ladder",
  excludeIds = []
} = {}) {
  const picked2 = pickIndependenceTwinQuestion({
    subject,
    topic,
    unit,
    skillSlug,
    skillSlugs,
    preferTransfer,
    excludeIds
  });
  if (!picked2?.question) return null;
  const q2 = picked2.question;
  return {
    id: `indep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    version: INDEPENDENCE_CHECK_VERSION,
    kind: "independence_twin",
    status: IndependencePhase.ACTIVE,
    phase: IndependencePhase.ACTIVE,
    noScaffold: true,
    transfer: Boolean(picked2.transfer),
    subject: subject || "",
    topic: topic || "",
    unit: unit || "",
    skillSlug: skillSlug || q2.skillSlug || "",
    skillSlugs: skillSlugs || [],
    ladderLevel: normalizeLevel(ladderLevel),
    ladderLevelId: ladderLevelId || "",
    source: source || "post_ladder",
    // Reuse assessment engine shape (1 question)
    questions: [q2],
    currentIndex: 0,
    answers: [],
    startedAt: Date.now(),
    completedAt: null,
    lastResult: null,
    outcome: null
  };
}
function applyIndependenceAnswer(session, selectedIndex) {
  if (!session || session.status !== IndependencePhase.ACTIVE) {
    return { session, result: null };
  }
  const asAssess = {
    ...session,
    status: AssessmentPhase.ACTIVE,
    phase: AssessmentPhase.ACTIVE
  };
  const { session: next, result: result2 } = applyAssessmentAnswer(asAssess, selectedIndex);
  if (!result2) return { session, result: null };
  const mapped = {
    ...next,
    kind: "independence_twin",
    noScaffold: true,
    transfer: session.transfer,
    ladderLevel: session.ladderLevel,
    ladderLevelId: session.ladderLevelId,
    source: session.source,
    status: IndependencePhase.EXPLAINING,
    phase: IndependencePhase.EXPLAINING
  };
  return { session: mapped, result: result2 };
}
function completeIndependenceAfterExplain(session) {
  if (!session) return { session: null, completed: false, outcome: null };
  const asAssess = {
    ...session,
    status: AssessmentPhase.ACTIVE,
    phase: AssessmentPhase.EXPLAINING
  };
  const { session: next, completed: completed2 } = advanceAssessment(asAssess);
  if (!completed2 || !next) {
    return {
      session: {
        ...next,
        kind: "independence_twin",
        noScaffold: true,
        transfer: session.transfer,
        status: IndependencePhase.ACTIVE,
        phase: IndependencePhase.ACTIVE
      },
      completed: false,
      outcome: null
    };
  }
  const score = scoreAssessment(next);
  const success = Boolean(score.correct >= 1 && score.total >= 1);
  const outcome2 = {
    success,
    correct: score.correct,
    total: score.total,
    transfer: Boolean(session.transfer),
    noScaffold: true,
    ladderLevel: session.ladderLevel,
    skillSlug: session.skillSlug || next.questions?.[0]?.skillSlug || "",
    questionId: next.answers?.[0]?.questionId || next.questions?.[0]?.id || "",
    independence: success ? "demonstrated" : "not_yet"
  };
  const done2 = {
    ...next,
    kind: "independence_twin",
    noScaffold: true,
    transfer: session.transfer,
    ladderLevel: session.ladderLevel,
    ladderLevelId: session.ladderLevelId,
    source: session.source,
    status: IndependencePhase.COMPLETED,
    phase: IndependencePhase.COMPLETED,
    completedAt: Date.now(),
    outcome: outcome2
  };
  return { session: done2, completed: true, outcome: outcome2, score };
}
function independenceRate(outcomes = []) {
  const scored = (outcomes || []).filter((o) => o && !o.skipped);
  if (!scored.length) return null;
  const wins = scored.filter((o) => o.success).length;
  return Math.round(wins / scored.length * 1e3) / 1e3;
}
function preferTransferForLadder(level) {
  const n = normalizeLevel(level);
  return n >= InterventionLevel.FULL_GUIDE;
}

// scripts/smoke-independence-l4.mjs
var passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  \u2713 ${name}`);
}
console.log("Epic L4 smoke \u2014 Independence & transfer\n");
ok("heavy help min is worked example", HEAVY_HELP_MIN_LEVEL === InterventionLevel.WORKED_EXAMPLE);
ok(
  "events registered",
  LearningEventType.INDEPENDENCE_OFFERED === "independence.offered" && LearningEventType.INDEPENDENCE_COMPLETED === "independence.completed"
);
ok(
  "no offer below L2",
  shouldOfferIndependenceTwin({
    ladderLevel: 1,
    hadGradedSuccessDuringHelp: true
  }) === false
);
ok(
  "offer after L2 + success",
  shouldOfferIndependenceTwin({
    ladderLevel: 2,
    hadGradedSuccessDuringHelp: true
  }) === true
);
ok(
  "offer after L3 without success",
  shouldOfferIndependenceTwin({
    ladderLevel: 3,
    hadGradedSuccessDuringHelp: false
  }) === true
);
ok(
  "no double offer",
  shouldOfferIndependenceTwin({
    ladderLevel: 3,
    hadGradedSuccessDuringHelp: true,
    alreadyOfferedThisSession: true
  }) === false
);
ok("prefer transfer for full guide", preferTransferForLadder(3) === true);
ok("prefer twin not transfer for L2", preferTransferForLadder(2) === false);
var card = buildIndependenceOfferCard({
  topic: "Computer hardware",
  transfer: true,
  ladderLevel: 3
});
ok(
  "offer card warm",
  /own|fresh|confidence|stuck|twin|hints/i.test(card.body + " " + card.headline)
);
ok("no shame words", !/fail|test you|wrong/i.test(card.body));
var transferQs = questionsForTopic("Computer Science", "Computer hardware", {
  transferOnly: true,
  limit: 5,
  minScore: 4
});
ok("CS hardware has transfer items", transferQs.length >= 1);
ok(
  "transfer flag on bank items",
  transferQs.every((q2) => q2.transfer === true)
);
var picked = pickIndependenceTwinQuestion({
  subject: "Computer Science",
  topic: "Computer hardware",
  preferTransfer: true
});
ok("pick twin question", Boolean(picked?.question?.prompt));
ok("picked marks transfer when available", picked.transfer === true);
var ses = createIndependenceSession({
  subject: "Computer Science",
  topic: "Computer hardware",
  ladderLevel: 3,
  preferTransfer: true
});
ok("create session", ses && ses.questions.length === 1);
ok("session noScaffold", ses.noScaffold === true);
ok("session active", ses.status === IndependencePhase.ACTIVE);
var q = ses.questions[0];
var { session: mid, result } = applyIndependenceAnswer(ses, q.correctIndex);
ok("answer grades", result && result.correct === true);
ok("explaining phase", mid.phase === IndependencePhase.EXPLAINING);
var { session: done, completed, outcome } = completeIndependenceAfterExplain(mid);
ok("completed", completed === true);
ok("outcome success", outcome?.success === true);
ok("outcome independence demonstrated", outcome?.independence === "demonstrated");
ok("done status", done.status === IndependencePhase.COMPLETED);
var rate = independenceRate([
  { success: true },
  { success: false },
  { success: true, transfer: true },
  { skipped: true }
]);
ok("independence rate 2/3", rate === 0.667 || rate === 2 / 3);
var mathTransfer = questionsForTopic("Math Foundations", "Parts of a whole", {
  transferOnly: true,
  limit: 3,
  minScore: 3
});
ok("math has transfer-flagged item", mathTransfer.some((q2) => q2.transfer));
console.log(`
All ${passed} L4 checks passed.`);
