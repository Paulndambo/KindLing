globalThis.__env={VITE_API_URL:'http://127.0.0.1:8000'};if(typeof import.meta!=='undefined'){try{import.meta.env=import.meta.env||globalThis.__env}catch(e){}}

// scripts/smoke-adi-l3.mjs
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
  LEARNING_ADI: "learning.adi"
};
var StruggleSignal = {
  IDLE: "idle",
  SHORT_ANSWERS: "short_answers",
  TOPIC_THRASHING: "topic_thrashing",
  RAPID_GUESSING: "rapid_guessing",
  OFF_TOPIC: "off_topic",
  INCORRECT_STREAK: "incorrect_streak",
  FRUSTRATION: "frustration",
  REPEATED_HINTS: "repeated_hints"
};
var Affect = {
  CONFIDENT: "confident",
  NEUTRAL: "neutral",
  HESITANT: "hesitant",
  FRUSTRATED: "frustrated",
  DISENGAGED: "disengaged",
  CURIOUS: "curious"
};

// src/services/learning/struggleThresholds.js
var INCORRECT_STREAK_THRESHOLD = 2;
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
function buildLocalSkillPath(profile2, subject, topic) {
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
  const skillsMap = profile2?.skills || {};
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
function selectInterventionLevel({
  reason = null,
  consecutiveIncorrect = 0,
  consecutiveHints = 0,
  affect = null,
  scaffoldingBias = 0,
  topicThrashing = false,
  shouldAutoEnter = false,
  /** Highest rank already entered this session (0 = none). */
  highestLevelUsed = 0,
  /** If already active, escalate one step from this rank. */
  escalateFrom = 0,
  /** Force a specific level (manual tools pick). */
  forcedLevel = null,
  /**
   * Epic L3 — ADI result from computeAdi / computeAdiFromContext.
   * When independence is rising, prefer lighter rungs (never increases help).
   */
  adi = null,
  /** Skip ADI fade (manual tools / explicit escalate already handled). */
  skipAdiPreference = false
} = {}) {
  if (forcedLevel != null) {
    return normalizeLevel(forcedLevel);
  }
  if (escalateFrom > 0) {
    return Math.min(
      InterventionLevel.BREAK_OR_EASIER,
      normalizeLevel(escalateFrom) + 1
    );
  }
  let level = InterventionLevel.MICRO_HINT;
  const frustrated = affect === "frustrated";
  const heavyStreak = consecutiveIncorrect >= INCORRECT_STREAK_THRESHOLD + 1;
  const streakHit = consecutiveIncorrect >= INCORRECT_STREAK_THRESHOLD;
  if (reason === StruggleSignal.TOPIC_THRASHING || topicThrashing || frustrated && heavyStreak && scaffoldingBias >= 0.5) {
    level = InterventionLevel.BREAK_OR_EASIER;
  } else if (reason === StruggleSignal.FRUSTRATION || heavyStreak || shouldAutoEnter || streakHit && frustrated) {
    level = InterventionLevel.FULL_GUIDE;
  } else if (reason === StruggleSignal.INCORRECT_STREAK || reason === StruggleSignal.RAPID_GUESSING || reason === StruggleSignal.REPEATED_HINTS || consecutiveHints >= 2 || streakHit) {
    level = InterventionLevel.WORKED_EXAMPLE;
  } else if (reason === StruggleSignal.IDLE || reason === StruggleSignal.SHORT_ANSWERS || reason === StruggleSignal.OFF_TOPIC) {
    level = InterventionLevel.MICRO_HINT;
  } else if (scaffoldingBias >= 0.55) {
    level = InterventionLevel.WORKED_EXAMPLE;
  }
  const used = normalizeLevel(highestLevelUsed);
  if (used >= level && used < InterventionLevel.BREAK_OR_EASIER) {
    level = used + 1;
  } else if (used >= InterventionLevel.BREAK_OR_EASIER) {
    level = InterventionLevel.BREAK_OR_EASIER;
  }
  if (!skipAdiPreference && adi) {
    if (adi.reliable && adi.preferLighterHelp) {
      if (shouldAutoEnter) {
        level = Math.min(level, InterventionLevel.FULL_GUIDE);
      } else {
        const cap = adi.ladderCap != null ? normalizeLevel(adi.ladderCap) : InterventionLevel.WORKED_EXAMPLE;
        if (level > cap) {
          level = Math.max(
            InterventionLevel.MICRO_HINT,
            Math.min(level - 1, cap)
          );
        }
      }
    }
  }
  return level;
}

// src/services/learning/adi.js
var ADI_VERSION = 1;
var ADI_WINDOW = 12;
var ADI_MIN_SAMPLES = 3;
function assistanceWeightForTurn(turn = {}) {
  const level = normalizeLevel(turn.interventionLevel || 0);
  const active = turn.interventionActive === true || turn.interventionStatus === "active" && level > 0 || level > 0 && turn.duringIntervention === true;
  let w = 0;
  if (turn.isHintRequest) w += 0.32;
  if (active && level > 0) {
    w += level / InterventionLevel.BREAK_OR_EASIER * 0.72;
  }
  const bias = Number(turn.scaffoldingBias);
  if (Number.isFinite(bias) && bias > 0) {
    w += Math.min(0.18, bias * 0.22);
  }
  const c = String(turn.correctness || "").toLowerCase();
  if (c === "incorrect" && w < 0.15) {
    w = Math.max(w, 0.12);
  }
  if (c === "exploring" || c === "unknown" || !c) {
    w *= 0.5;
  }
  return Math.max(0, Math.min(1, Math.round(w * 1e3) / 1e3));
}
function adiBand(adi) {
  if (adi == null || !Number.isFinite(Number(adi))) return "unknown";
  const v = Number(adi);
  if (v < 0.28) return "gaining_independence";
  if (v < 0.55) return "balanced_support";
  return "scaffold_heavy";
}
function adiIndependenceCopy({
  adi = null,
  topicScore = null,
  trend = "unknown",
  forDigest = false
} = {}) {
  if (adi == null || !Number.isFinite(Number(adi))) return null;
  const band = adiBand(adi);
  const score = topicScore != null ? Number(topicScore) : null;
  const strongMastery = score != null && score >= 65;
  const name = forDigest ? "They" : "You're";
  const nameLower = forDigest ? "they" : "you";
  if (band === "gaining_independence") {
    if (trend === "falling") {
      return forDigest ? "Growing independence \u2014 solving more with lighter support." : "Growing independence \u2014 more solid answers with lighter support.";
    }
    return forDigest ? "Building independent practice on recent graded work." : "Building independence \u2014 keep trusting your own reasoning.";
  }
  if (band === "balanced_support") {
    if (strongMastery) {
      return forDigest ? "Using help wisely while mastery holds \u2014 a good moment for lighter practice." : "Solid progress with balanced support \u2014 try the next one with a lighter hint.";
    }
    return forDigest ? "Mixing independent tries with healthy help-seeking." : "Mixing your own tries with healthy help \u2014 that balance grows learning.";
  }
  if (strongMastery) {
    return forDigest ? `${name} know this material \u2014 encourage a no-hint try next time.` : `${name} know more than the scaffolds suggest \u2014 try one with a lighter hint.`;
  }
  if (trend === "rising") {
    return forDigest ? "Leaning on guides right now \u2014 normal when ideas are new; celebrate persistence." : "Guides are helping a lot right now \u2014 that's okay while ideas are new.";
  }
  return forDigest ? `Using scaffolds while building foundations \u2014 keep effort high; independence follows.` : `Using helpful scaffolds while building foundations \u2014 ${nameLower}r effort still counts.`;
}
function adiTrendFromWeights(weights = []) {
  const w = (weights || []).filter((x) => Number.isFinite(Number(x)));
  if (w.length < 4) return "unknown";
  const mid = Math.floor(w.length / 2);
  const older = w.slice(0, mid);
  const newer = w.slice(mid);
  const mean2 = (arr) => arr.reduce((a, b) => a + Number(b), 0) / arr.length;
  const d = mean2(newer) - mean2(older);
  if (d <= -0.08) return "falling";
  if (d >= 0.08) return "rising";
  return "stable";
}
function computeAdi(turns = [], opts = {}) {
  const window2 = opts.window ?? ADI_WINDOW;
  const minSamples = opts.minSamples ?? ADI_MIN_SAMPLES;
  const list = Array.isArray(turns) ? turns : [];
  const graded = list.filter((t) => {
    const c = String(t?.correctness || "").toLowerCase();
    return c === "correct" || c === "partial" || c === "incorrect";
  });
  const pool = graded.length ? graded : list;
  const windowed = pool.slice(-window2);
  const weights = windowed.map((t) => assistanceWeightForTurn(t));
  const sampleCount = weights.length;
  if (sampleCount < minSamples) {
    return emptyAdiResult({
      sampleCount,
      topicScore: opts.topicScore,
      reason: "insufficient_samples"
    });
  }
  const raw = weights.reduce((a, b) => a + b, 0) / Math.max(1, weights.length);
  let value = raw;
  if (opts.priorAdi != null && Number.isFinite(Number(opts.priorAdi))) {
    value = Number(opts.priorAdi) * 0.35 + raw * 0.65;
  }
  value = Math.round(Math.max(0, Math.min(1, value)) * 1e3) / 1e3;
  const independence = Math.round((1 - value) * 1e3) / 1e3;
  const trend = adiTrendFromWeights(weights);
  const band = adiBand(value);
  const topicScore = opts.topicScore != null && Number.isFinite(Number(opts.topicScore)) ? Number(opts.topicScore) : null;
  const solidIndependent = windowed.filter((t) => {
    const c = String(t.correctness || "").toLowerCase();
    const w = assistanceWeightForTurn(t);
    return (c === "correct" || c === "partial") && w < 0.22;
  }).length;
  const helpedSuccess = windowed.filter((t) => {
    const c = String(t.correctness || "").toLowerCase();
    const w = assistanceWeightForTurn(t);
    return (c === "correct" || c === "partial") && w >= 0.35;
  }).length;
  const preferLighterHelp = shouldPreferLighterHelp({
    adi: value,
    topicScore,
    trend
  });
  return {
    version: ADI_VERSION,
    value,
    /** 0–100 for UI */
    pct: Math.round(value * 100),
    independence,
    independencePct: Math.round(independence * 100),
    band,
    trend,
    sampleCount,
    window: windowed.length,
    solidIndependentCount: solidIndependent,
    helpedSuccessCount: helpedSuccess,
    topicScore,
    preferLighterHelp,
    /** Soft cap for ladder auto-pick (0 = no cap) */
    ladderCap: preferLighterHelp ? InterventionLevel.WORKED_EXAMPLE : InterventionLevel.BREAK_OR_EASIER,
    copy: adiIndependenceCopy({
      adi: value,
      topicScore,
      trend,
      forDigest: false
    }),
    digestCopy: adiIndependenceCopy({
      adi: value,
      topicScore,
      trend,
      forDigest: true
    }),
    reliable: true,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function shouldPreferLighterHelp({
  adi = null,
  topicScore = null,
  trend = "unknown"
} = {}) {
  if (adi == null || !Number.isFinite(Number(adi))) return false;
  const v = Number(adi);
  const score = topicScore != null ? Number(topicScore) : null;
  if (v < 0.32 && trend !== "rising") return true;
  if (v < 0.45 && score != null && score >= 60) return true;
  if (trend === "falling" && v < 0.5) return true;
  if (score != null && score >= 70 && v >= 0.4) return true;
  return false;
}
function applyAdiLadderPreference(level, adiResult = null, { manual = false, escalate = false, autoEnter = false } = {}) {
  const rank = normalizeLevel(level);
  if (!adiResult?.reliable || manual || escalate) return rank;
  if (!adiResult.preferLighterHelp) return rank;
  if (autoEnter) {
    return Math.min(rank, InterventionLevel.FULL_GUIDE);
  }
  const cap = adiResult.ladderCap != null ? normalizeLevel(adiResult.ladderCap) : InterventionLevel.WORKED_EXAMPLE;
  if (rank > cap) {
    return Math.max(InterventionLevel.MICRO_HINT, Math.min(rank - 1, cap));
  }
  return rank;
}
function emptyAdiResult({ sampleCount = 0, topicScore = null, reason = "" } = {}) {
  return {
    version: ADI_VERSION,
    value: null,
    pct: null,
    independence: null,
    independencePct: null,
    band: (
      /** @type {AdiBand} */
      "unknown"
    ),
    trend: "unknown",
    sampleCount,
    window: 0,
    solidIndependentCount: 0,
    helpedSuccessCount: 0,
    topicScore: topicScore != null ? Number(topicScore) : null,
    preferLighterHelp: false,
    ladderCap: InterventionLevel.BREAK_OR_EASIER,
    copy: null,
    digestCopy: null,
    reliable: false,
    reason,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function turnsFromSessionSnapshot(sessionSnapshot, intervention = null) {
  const turns = sessionSnapshot?.turns || [];
  const liveLevel = intervention?.level || intervention?.context?.level || sessionSnapshot?.intervention?.level || 0;
  const liveActive = (intervention?.status || sessionSnapshot?.intervention?.status) === "active";
  return turns.map((t) => {
    const sig = t.signals || {};
    const turnLevel = sig.interventionLevel ?? t.interventionLevel ?? (liveActive ? liveLevel : 0);
    const turnActive = sig.interventionActive ?? t.interventionActive ?? (liveActive && turnLevel > 0);
    return {
      correctness: sig.correctness,
      isHintRequest: Boolean(sig.isHintRequest),
      interventionLevel: turnLevel,
      interventionActive: turnActive,
      scaffoldingBias: sig.scaffoldingBias ?? sessionSnapshot?.scaffoldingBias ?? 0
    };
  });
}
function syntheticTurnsFromProfile(profile2 = null, n = 6) {
  if (!profile2) return [];
  const behavior = profile2.behavior || {};
  const totals = profile2.totals || {};
  const graded = (totals.correct || 0) + (totals.incorrect || 0) + (totals.partial || 0);
  if (graded < 1 && !(behavior.hintRate > 0)) return [];
  const hintRate = Number(behavior.hintRate) || 0;
  const baseAssist = Math.min(0.85, hintRate * 0.9 + 0.05);
  const samples = Math.min(n, Math.max(ADI_MIN_SAMPLES, Math.min(graded, n)));
  const out = [];
  const correct = totals.correct || 0;
  const incorrect = totals.incorrect || 0;
  const partial = totals.partial || 0;
  const mix = [];
  for (let i = 0; i < correct; i++) mix.push("correct");
  for (let i = 0; i < partial; i++) mix.push("partial");
  for (let i = 0; i < incorrect; i++) mix.push("incorrect");
  const slice = mix.slice(-samples);
  while (slice.length < samples) slice.push("partial");
  for (let i = 0; i < samples; i++) {
    const helped = i / samples < hintRate || baseAssist > 0.4;
    out.push({
      correctness: slice[i],
      isHintRequest: helped && hintRate > 0.25,
      interventionActive: helped && baseAssist > 0.35,
      interventionLevel: helped ? baseAssist > 0.55 ? InterventionLevel.FULL_GUIDE : InterventionLevel.WORKED_EXAMPLE : InterventionLevel.NONE,
      scaffoldingBias: baseAssist,
      synthetic: true
    });
  }
  return out;
}
function computeAdiFromContext({
  sessionSnapshot = null,
  intervention = null,
  profile: profile2 = null,
  topicScore = null,
  priorAdi = null
} = {}) {
  let turns = turnsFromSessionSnapshot(sessionSnapshot, intervention);
  const graded = turns.filter(
    (t) => ["correct", "partial", "incorrect"].includes(
      String(t.correctness || "").toLowerCase()
    )
  );
  if (graded.length < ADI_MIN_SAMPLES) {
    turns = [...syntheticTurnsFromProfile(profile2), ...turns];
  }
  const prior = priorAdi != null ? priorAdi : profile2?.behavior?.adi != null ? Number(profile2.behavior.adi) : null;
  const computed = computeAdi(turns, {
    topicScore,
    priorAdi: prior
  });
  if (!computed.reliable && prior != null && Number.isFinite(Number(prior))) {
    const value = Math.round(Math.max(0, Math.min(1, Number(prior))) * 1e3) / 1e3;
    const trend = profile2?.behavior?.adiTrend || "unknown";
    const band = profile2?.behavior?.adiBand && profile2.behavior.adiBand !== "unknown" ? profile2.behavior.adiBand : adiBand(value);
    const preferLighterHelp = shouldPreferLighterHelp({
      adi: value,
      topicScore,
      trend
    });
    return {
      version: ADI_VERSION,
      value,
      pct: Math.round(value * 100),
      independence: Math.round((1 - value) * 1e3) / 1e3,
      independencePct: profile2?.behavior?.independencePct != null ? Number(profile2.behavior.independencePct) : Math.round((1 - value) * 100),
      band,
      trend,
      sampleCount: computed.sampleCount || 0,
      window: 0,
      solidIndependentCount: 0,
      helpedSuccessCount: 0,
      topicScore: topicScore != null ? Number(topicScore) : null,
      preferLighterHelp,
      ladderCap: preferLighterHelp ? InterventionLevel.WORKED_EXAMPLE : InterventionLevel.BREAK_OR_EASIER,
      copy: adiIndependenceCopy({
        adi: value,
        topicScore,
        trend,
        forDigest: false
      }),
      digestCopy: adiIndependenceCopy({
        adi: value,
        topicScore,
        trend,
        forDigest: true
      }),
      reliable: true,
      fromStored: true,
      updatedAt: profile2?.behavior?.adiUpdatedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  return computed;
}
function serializeAdi(adiResult) {
  if (!adiResult) return null;
  return {
    version: adiResult.version || ADI_VERSION,
    value: adiResult.value,
    independence: adiResult.independence,
    band: adiResult.band,
    trend: adiResult.trend,
    sampleCount: adiResult.sampleCount,
    preferLighterHelp: Boolean(adiResult.preferLighterHelp),
    reliable: Boolean(adiResult.reliable),
    topicScore: adiResult.topicScore,
    copy: adiResult.copy || null,
    updatedAt: adiResult.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function adiDirectives(adiResult) {
  if (!adiResult?.reliable) return [];
  const dirs2 = [];
  if (adiResult.preferLighterHelp) {
    dirs2.push(
      "Independence is rising \u2014 prefer the lightest helpful scaffold; avoid jumping to full guides."
    );
  }
  if (adiResult.band === "scaffold_heavy" && (adiResult.topicScore || 0) >= 70) {
    dirs2.push(
      "Mastery looks solid while help is still heavy \u2014 invite a no-hint or micro-hint try soon."
    );
  }
  if (adiResult.trend === "falling" && adiResult.band === "gaining_independence") {
    dirs2.push(
      "Celebrate independent success briefly; stretch slightly without adding scaffold."
    );
  }
  return dirs2.slice(0, 2);
}

// src/services/learning/learnerState.js
var LEARNER_STATE_VERSION = 1;
function emptyLearnerState({
  studentId = "anonymous",
  subject = "",
  topic = "",
  unit = ""
} = {}) {
  return {
    version: LEARNER_STATE_VERSION,
    studentId,
    subject: subject || "",
    topic: topic || "",
    unit: unit || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    knowledge: {
      topicScore: null,
      topicAttempts: 0,
      topicCorrect: 0,
      topicIncorrect: 0,
      skills: [],
      primarySkills: [],
      strengths: [],
      focusAreas: [],
      recommendedNext: null
    },
    misconceptions: [],
    behaviour: {
      hintRate: 0,
      shortAnswerRate: 0,
      rapidGuessRate: 0,
      offTopicRate: 0,
      avgResponseMs: null,
      persistenceScore: 0,
      flags: []
    },
    engagement: {
      level: null,
      label: (
        /** @type {EngagementLabel} */
        "unknown"
      ),
      recent: []
    },
    confidence: {
      level: null,
      label: "unknown",
      /** rolling mean of confidence signals 0–1 */
      mean: null,
      /** accuracy 0–1 when enough graded turns */
      competence: null,
      calibration: (
        /** @type {CalibrationLabel} */
        "unknown"
      ),
      /** |confidence − competence| when both known */
      calibrationError: null
    },
    assistance: {
      level: 0,
      label: (
        /** @type {AssistanceLabel} */
        "unknown"
      ),
      hintRate: 0,
      interventionActive: false,
      interventionLevel: 0,
      scaffoldingBias: 0,
      /** Epic L3 — Assistance Dependency Index (null until enough samples) */
      adi: null,
      adiBand: "unknown",
      independencePct: null,
      preferLighterHelp: false
    },
    objective: {
      lessonGoal: "",
      weekFocus: "",
      unitName: unit || "",
      lessonName: topic || "",
      familiarity: "",
      effectiveGoal: ""
    },
    interaction: {
      deliveryPrefs: [],
      prefersVisual: false,
      prefersStory: false,
      prefersStepByStep: false,
      prefersEnergetic: false,
      lowTypingTolerance: false,
      voiceInputCount: 0
    },
    /** One-line human summary for tools / logs */
    summary: "New or lightly observed learner.",
    /** Compact rows for Learner pulse UI */
    pulse: {
      correctnessTone: "muted",
      correctnessText: "Observing\u2026",
      affectLabel: "\u2014",
      confidencePct: null,
      engagementPct: null,
      thinkTimeLabel: null,
      knowledgeLabel: null,
      assistanceLabel: null,
      calibrationLabel: null,
      misconceptionLabels: [],
      misconceptionTip: null,
      persistenceNote: null,
      /** Epic L3 non-shaming independence line */
      independenceNote: null
    }
  };
}
function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}
function mean(arr) {
  const nums = (arr || []).map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function topicKey(subject, topic) {
  return `${subject || "General"}::${topic || "General"}`;
}
function affectDisplayLabel(affect) {
  const map = {
    [Affect.CONFIDENT]: "Confident",
    [Affect.HESITANT]: "Hesitant",
    [Affect.FRUSTRATED]: "Frustrated",
    [Affect.CURIOUS]: "Curious",
    [Affect.DISENGAGED]: "Low engagement",
    [Affect.NEUTRAL]: "Steady",
    confident: "Confident",
    hesitant: "Hesitant",
    frustrated: "Frustrated",
    curious: "Curious",
    disengaged: "Low engagement",
    neutral: "Steady"
  };
  return map[affect] || "\u2014";
}
function correctnessPulse(correctness) {
  switch (String(correctness || "").toLowerCase()) {
    case "correct":
      return { text: "On track", tone: "good" };
    case "partial":
      return { text: "Partial understanding", tone: "mid" };
    case "incorrect":
      return { text: "Needs scaffold", tone: "focus" };
    case "exploring":
      return { text: "Exploring / asking", tone: "mid" };
    default:
      return { text: "Observing\u2026", tone: "muted" };
  }
}
function engagementLabelFromLevel(level) {
  if (level == null || !Number.isFinite(Number(level))) return "unknown";
  const v = Number(level);
  if (v >= 0.72) return "engaged";
  if (v >= 0.45) return "steady";
  if (v >= 0.25) return "low";
  return "disengaged";
}
function calibrateConfidenceCompetence(confidenceMean, competence) {
  const c = clamp01(confidenceMean);
  const k = clamp01(competence);
  if (c == null || k == null) {
    return { calibration: "unknown", error: null };
  }
  const err = Math.abs(c - k);
  if (err < 0.18) return { calibration: "calibrated", error: err };
  if (c > k + 0.18) return { calibration: "overconfident", error: err };
  if (k > c + 0.18) return { calibration: "underconfident", error: err };
  return { calibration: "calibrated", error: err };
}
function assistanceLabelFromLevel(level, { interventionActive } = {}) {
  if (interventionActive && level >= 0.55) return "high_support";
  if (level == null || !Number.isFinite(Number(level))) return "unknown";
  const v = Number(level);
  if (v < 0.18) return "independent";
  if (v < 0.4) return "light_support";
  if (v < 0.7) return "guided";
  return "high_support";
}
function buildBehaviourFlags(behavior = {}, lastSignals = null) {
  const flags = [];
  if ((behavior.rapidGuessRate || 0) > 0.25 || lastSignals?.rapidGuess) {
    flags.push("rapid_guessing");
  }
  if ((behavior.shortAnswerRate || 0) > 0.4 || lastSignals?.shortAnswer) {
    flags.push("short_answers");
  }
  if ((behavior.offTopicRate || 0) > 0.2 || lastSignals?.offTopic) {
    flags.push("off_topic");
  }
  if ((behavior.hintRate || 0) > 0.35) {
    flags.push("hint_dependent");
  }
  if ((behavior.persistenceScore || 0) >= 3) {
    flags.push("persistent");
  }
  return flags;
}
function competenceFromMastery(masteryRow, totals) {
  if (masteryRow && masteryRow.attempts >= 2) {
    const att = Math.max(1, Number(masteryRow.attempts) || 1);
    const correct = Number(masteryRow.correct) || 0;
    const partial = Number(masteryRow.partial) || 0;
    return clamp01((correct + partial * 0.5) / att);
  }
  const graded = (totals?.correct || 0) + (totals?.incorrect || 0) + (totals?.partial || 0);
  if (graded >= 3) {
    return clamp01(
      ((totals.correct || 0) + (totals.partial || 0) * 0.5) / graded
    );
  }
  return null;
}
function buildLearnerState({
  profile: profile2 = null,
  studentId = "",
  subject = "",
  topic = "",
  unit = "",
  lastSignals = null,
  sessionSummary = null,
  intervention = null,
  struggleSnapshot = null,
  activeMisconceptions = null,
  lessonGoals = null,
  scaffoldingBias = 0,
  sessionSnapshot = null,
  adi = null
} = {}) {
  const sid = studentId || profile2?.studentId || "anonymous";
  const state2 = emptyLearnerState({
    studentId: sid,
    subject,
    topic,
    unit
  });
  const exchanges = profile2?.totals?.exchanges || 0;
  const key = topicKey(subject, topic);
  const masteryRow = profile2?.mastery?.[key] || null;
  if (masteryRow) {
    state2.knowledge.topicScore = masteryRow.score != null ? Math.round(Number(masteryRow.score)) : null;
    state2.knowledge.topicAttempts = masteryRow.attempts || 0;
    state2.knowledge.topicCorrect = masteryRow.correct || 0;
    state2.knowledge.topicIncorrect = masteryRow.incorrect || 0;
  }
  state2.knowledge.strengths = (profile2?.strengths || []).slice(0, 5);
  state2.knowledge.focusAreas = (profile2?.focusAreas || []).slice(0, 5);
  const skillPath = buildLocalSkillPath(profile2, subject, topic);
  if (skillPath?.hasGraph && Array.isArray(skillPath.skills)) {
    state2.knowledge.skills = skillPath.skills.map((s) => ({
      slug: s.slug,
      name: s.name || s.shortLabel || s.slug,
      shortLabel: s.shortLabel || s.name || s.slug,
      score: s.score != null ? Math.round(Number(s.score)) : null,
      state: s.state || null,
      stateLabel: s.stateLabel || STATE_LABELS[s.state] || "",
      isPrimary: Boolean(s.isPrimary)
    }));
    state2.knowledge.primarySkills = state2.knowledge.skills.filter(
      (s) => s.isPrimary
    );
    if (skillPath.recommendedNext) {
      state2.knowledge.recommendedNext = {
        slug: skillPath.recommendedNext.slug || skillPath.recommendedNext.skillSlug,
        name: skillPath.recommendedNext.shortLabel || skillPath.recommendedNext.name || ""
      };
    }
  }
  const liveMc = (Array.isArray(activeMisconceptions) && activeMisconceptions.length ? activeMisconceptions : null) || lastSignals?.misconceptions || [];
  const profileMc = Object.values(profile2?.misconceptions || {}).filter((m) => m && m.isActive !== false).sort((a, b) => (b.count || 0) - (a.count || 0));
  const mcMap = /* @__PURE__ */ new Map();
  for (const m of [...liveMc, ...profileMc]) {
    const id = m.id || m.slug;
    if (!id || mcMap.has(id)) continue;
    const count = Number(m.count) || 1;
    const confidence = Math.min(0.95, 0.35 + count * 0.12);
    mcMap.set(id, {
      id,
      label: m.label || id,
      count,
      confidence: Math.round(confidence * 100) / 100,
      isActive: m.isActive !== false,
      skillSlug: m.skillSlug || null,
      playbook: m.playbook || null,
      checkQuestion: m.playbook?.check_question || m.playbook?.checkQuestion || null
    });
  }
  state2.misconceptions = [...mcMap.values()].slice(0, 6);
  const behavior = profile2?.behavior || {};
  state2.behaviour = {
    hintRate: Number(behavior.hintRate) || 0,
    shortAnswerRate: Number(behavior.shortAnswerRate) || 0,
    rapidGuessRate: Number(behavior.rapidGuessRate) || 0,
    offTopicRate: Number(behavior.offTopicRate) || 0,
    avgResponseMs: behavior.avgResponseMs != null ? Number(behavior.avgResponseMs) : lastSignals?.responseMs ?? null,
    persistenceScore: Number(
      struggleSnapshot?.persistenceScore ?? behavior.persistenceScore
    ) || 0,
    flags: buildBehaviourFlags(behavior, lastSignals)
  };
  const engLive = clamp01(lastSignals?.engagement);
  const engMean = mean(profile2?.engagementHistory);
  const engLevel = engLive != null ? engLive : engMean;
  state2.engagement = {
    level: engLevel,
    label: engagementLabelFromLevel(engLevel),
    recent: (profile2?.engagementHistory || []).slice(-8)
  };
  const confLive = clamp01(lastSignals?.confidence);
  const confMean = mean(profile2?.confidenceHistory);
  const confLevel = confLive != null ? confLive : confMean;
  const competence = competenceFromMastery(masteryRow, profile2?.totals);
  const { calibration, error: calErr } = calibrateConfidenceCompetence(
    confMean != null ? confMean : confLevel,
    competence
  );
  let confLabel = "unknown";
  if (confLevel != null) {
    if (confLevel >= 0.7) confLabel = "high";
    else if (confLevel >= 0.4) confLabel = "moderate";
    else confLabel = "low";
  }
  state2.confidence = {
    level: confLevel,
    label: confLabel,
    mean: confMean,
    competence,
    calibration,
    calibrationError: calErr
  };
  const hintRate = Number(behavior.hintRate) || 0;
  const interventionActive = intervention?.status === "active";
  const interventionLevel = Number(
    intervention?.level || intervention?.context?.level || 0
  );
  const bias = Number(
    scaffoldingBias || struggleSnapshot?.scaffoldingBias || sessionSummary?.scaffoldingBias || 0
  );
  const lightlyObserved = !exchanges && !lastSignals;
  let assistLevel = lightlyObserved ? 0 : Math.min(
    1,
    hintRate * 0.55 + bias * 0.35 + (interventionActive ? 0.25 + interventionLevel * 0.12 : 0)
  );
  const adiResult = adi && typeof adi === "object" ? adi : computeAdiFromContext({
    sessionSnapshot: sessionSnapshot || sessionSummary?.snapshot || null,
    intervention,
    profile: profile2,
    topicScore: state2.knowledge.topicScore,
    priorAdi: profile2?.behavior?.adi ?? null
  });
  state2.assistance = {
    level: Math.round(assistLevel * 100) / 100,
    // Unknown until we have real session evidence (not "independent" by default)
    label: lightlyObserved ? "unknown" : assistanceLabelFromLevel(assistLevel, { interventionActive }),
    hintRate,
    interventionActive,
    interventionLevel,
    scaffoldingBias: bias,
    adi: adiResult?.reliable ? adiResult.value : adiResult?.value ?? null,
    adiBand: adiResult?.band || "unknown",
    independencePct: adiResult?.independencePct ?? null,
    preferLighterHelp: Boolean(adiResult?.preferLighterHelp),
    adiDetail: serializeAdi(adiResult)
  };
  const goals = lessonGoals || {};
  state2.objective = {
    lessonGoal: String(goals.learningGoal || goals.effectiveGoal || "").trim(),
    weekFocus: String(goals.weekFocus || "").trim(),
    unitName: unit || String(goals.unitName || "").trim(),
    lessonName: topic || "",
    familiarity: String(
      goals.familiarity || goals.familiarityLabel || ""
    ).trim(),
    effectiveGoal: String(goals.effectiveGoal || goals.learningGoal || "").trim()
  };
  const prefs = profile2?.deliveryPreferences || {};
  const prefEntries = Object.entries(prefs).map(([id, weight]) => ({ id, weight: Number(weight) || 0 })).filter((p) => p.weight > 0).sort((a, b) => b.weight - a.weight);
  const topPref = prefEntries[0]?.id || "";
  state2.interaction = {
    deliveryPrefs: prefEntries.slice(0, 4),
    prefersVisual: topPref === "visual" || (prefs.visual || 0) >= 2,
    prefersStory: topPref === "story" || (prefs.story || 0) >= 2,
    prefersStepByStep: topPref === "step_by_step" || (prefs.step_by_step || 0) >= 2,
    prefersEnergetic: topPref === "energetic" || (prefs.energetic || 0) >= 2,
    lowTypingTolerance: (behavior.shortAnswerRate || 0) > 0.4,
    voiceInputCount: Number(behavior.voiceInputCount) || 0
  };
  state2.summary = buildLearnerStateSummary(state2, { exchanges });
  const corr = correctnessPulse(lastSignals?.correctness);
  const confPct = state2.confidence.level != null ? Math.round(state2.confidence.level * 100) : null;
  const engPct = state2.engagement.level != null ? Math.round(state2.engagement.level * 100) : null;
  let thinkTimeLabel = null;
  const ms = lastSignals?.responseMs != null ? lastSignals.responseMs : state2.behaviour.avgResponseMs;
  if (ms != null && Number.isFinite(Number(ms))) {
    thinkTimeLabel = Number(ms) < 1e3 ? "<1s" : `${Math.round(Number(ms) / 1e3)}s`;
  }
  let knowledgeLabel = null;
  if (state2.knowledge.topicScore != null) {
    knowledgeLabel = `Topic mastery ~${state2.knowledge.topicScore}%`;
  } else if (state2.knowledge.primarySkills[0]?.score != null) {
    const p = state2.knowledge.primarySkills[0];
    knowledgeLabel = `${p.shortLabel || p.name}: ~${p.score}%`;
  }
  let calibrationLabel = null;
  if (state2.confidence.calibration === "overconfident") {
    calibrationLabel = "May feel ahead of evidence \u2014 invite show-your-work";
  } else if (state2.confidence.calibration === "underconfident") {
    calibrationLabel = "Stronger than they feel \u2014 affirm solid reasoning";
  } else if (state2.confidence.calibration === "calibrated") {
    calibrationLabel = "Confidence roughly matches performance";
  }
  const assistLabels = {
    independent: "Working independently",
    light_support: "Light support",
    guided: "Guided practice",
    high_support: "High support right now",
    unknown: null
  };
  state2.pulse = {
    correctnessTone: corr.tone,
    correctnessText: corr.text,
    affectLabel: affectDisplayLabel(lastSignals?.affect),
    confidencePct: confPct,
    engagementPct: engPct,
    thinkTimeLabel,
    knowledgeLabel,
    assistanceLabel: assistLabels[state2.assistance.label] || null,
    calibrationLabel,
    misconceptionLabels: state2.misconceptions.map((m) => m.label).slice(0, 3),
    misconceptionTip: state2.misconceptions[0]?.checkQuestion || null,
    persistenceNote: state2.behaviour.persistenceScore >= 2 ? "Persistence spark: effort and bounce-backs count \u2014 not only correct answers." : null,
    independenceNote: adiResult?.reliable ? adiResult.copy || null : null
  };
  state2.adi = adiResult || null;
  state2.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return state2;
}
function buildLearnerStateSummary(state2, { exchanges = 0 } = {}) {
  if (!state2) return "Unknown learner state.";
  const noLive = !state2.pulse?.correctnessText || state2.pulse.correctnessText === "Observing\u2026";
  if (exchanges < 1 && noLive && !(state2.knowledge?.topicAttempts > 0)) {
    return "New or lightly observed learner \u2014 build trust, start gently.";
  }
  const bits = [];
  if (state2.knowledge.topicScore != null) {
    bits.push(`topic ~${state2.knowledge.topicScore}%`);
  }
  if (state2.engagement.label && state2.engagement.label !== "unknown") {
    bits.push(`engagement ${state2.engagement.label}`);
  }
  if (state2.confidence.label && state2.confidence.label !== "unknown") {
    bits.push(`confidence ${state2.confidence.label}`);
  }
  if (state2.confidence.calibration && state2.confidence.calibration !== "unknown" && state2.confidence.calibration !== "calibrated") {
    bits.push(state2.confidence.calibration);
  }
  if (state2.assistance.label && state2.assistance.label !== "unknown") {
    bits.push(state2.assistance.label.replace(/_/g, " "));
  }
  if (state2.misconceptions.length) {
    bits.push(`mc: ${state2.misconceptions[0].label}`);
  }
  if (state2.behaviour.flags?.includes("rapid_guessing")) {
    bits.push("rapid guessing");
  }
  if (state2.adi?.reliable && state2.adi.band && state2.adi.band !== "unknown") {
    if (state2.adi.band === "gaining_independence") bits.push("gaining independence");
    else if (state2.adi.preferLighterHelp) bits.push("prefer lighter help");
  }
  if (!bits.length) {
    return exchanges > 0 ? "Observed learner \u2014 still forming a clear picture." : "New or lightly observed learner.";
  }
  return bits.join(" \xB7 ");
}

// scripts/smoke-adi-l3.mjs
var passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  \u2713 ${name}`);
}
console.log("Epic L3 smoke \u2014 Assistance Dependency Index\n");
ok("version 1", ADI_VERSION === 1);
ok("min samples 3", ADI_MIN_SAMPLES === 3);
ok("event type learning.adi", LearningEventType.LEARNING_ADI === "learning.adi");
var solo = assistanceWeightForTurn({
  correctness: "correct",
  interventionLevel: 0
});
var guided = assistanceWeightForTurn({
  correctness: "correct",
  interventionActive: true,
  interventionLevel: 3
});
ok("solo weight low", solo < 0.15);
ok("guided weight higher", guided > solo && guided > 0.4);
var heavyTurns = Array.from({ length: 6 }, () => ({
  correctness: "correct",
  interventionActive: true,
  interventionLevel: 3
}));
var heavy = computeAdi(heavyTurns, { topicScore: 40 });
ok("heavy reliable", heavy.reliable);
ok("heavy band scaffold", heavy.band === "scaffold_heavy" || heavy.value >= 0.45);
ok("heavy has non-shame copy", heavy.copy && !/shame|bad|weak|fail/i.test(heavy.copy));
var lightTurns = Array.from({ length: 6 }, () => ({
  correctness: "correct",
  interventionLevel: 0
}));
var light = computeAdi(lightTurns, { topicScore: 72 });
ok("light independence band", light.band === "gaining_independence");
ok("light prefer lighter", light.preferLighterHelp === true);
ok("independence pct high", light.independencePct >= 70);
var faded = applyAdiLadderPreference(InterventionLevel.FULL_GUIDE, light);
ok("ladder fades full guide", faded <= InterventionLevel.WORKED_EXAMPLE);
ok(
  "manual no fade",
  applyAdiLadderPreference(InterventionLevel.FULL_GUIDE, light, {
    manual: true
  }) === InterventionLevel.FULL_GUIDE
);
var levelWithAdi = selectInterventionLevel({
  reason: "incorrect_streak",
  consecutiveIncorrect: 3,
  adi: light
});
var levelNoAdi = selectInterventionLevel({
  reason: "incorrect_streak",
  consecutiveIncorrect: 3
});
ok(
  "selectInterventionLevel respects ADI fade",
  levelWithAdi <= levelNoAdi
);
ok(
  "high mastery + mid ADI prefers lighter",
  shouldPreferLighterHelp({ adi: 0.48, topicScore: 75 }) === true
);
var copy = adiIndependenceCopy({
  adi: 0.6,
  topicScore: 80,
  forDigest: true
});
ok("high ADI + high score encourages independence", /no-hint|lighter/i.test(copy || ""));
var profile = {
  studentId: "t",
  totals: { exchanges: 10, correct: 5, incorrect: 3, partial: 2 },
  behavior: { hintRate: 0.5, adi: 0.4 },
  mastery: {
    "Math::Fractions": { score: 70, attempts: 8, correct: 5, incorrect: 2, partial: 1 }
  }
};
var synth = syntheticTurnsFromProfile(profile);
ok("synthetic turns from profile", synth.length >= ADI_MIN_SAMPLES);
var fromCtx = computeAdiFromContext({
  sessionSnapshot: {
    turns: heavyTurns.map((t, i) => ({
      index: i,
      signals: {
        correctness: t.correctness,
        interventionActive: t.interventionActive,
        interventionLevel: t.interventionLevel
      }
    })),
    scaffoldingBias: 0.4
  },
  intervention: { status: "active", level: 3 },
  profile,
  topicScore: 70
});
ok("context ADI reliable", fromCtx.reliable);
var state = buildLearnerState({
  profile,
  subject: "Math",
  topic: "Fractions",
  adi: light
});
ok("learnerState has adi", state.adi?.reliable);
ok("assistance.adi set", state.assistance.adi != null || state.assistance.adiBand);
ok("pulse independence note", state.pulse.independenceNote);
var ser = serializeAdi(light);
ok("serialize has value", ser.value != null && ser.band);
var dirs = adiDirectives(light);
ok("adi directives when prefer lighter", dirs.length >= 1);
var thin = computeAdi([{ correctness: "correct" }]);
ok("thin not reliable", thin.reliable === false);
console.log(`
All ${passed} L3 ADI checks passed.`);
