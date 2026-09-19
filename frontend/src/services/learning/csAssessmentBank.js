/**
 * Computer Science quick-check MCQs keyed to pilot skills / subtopics.
 * Used so assessment tracks the lesson the student is actually in.
 */

/** @type {import('./assessmentBank.js').AssessmentQuestion[]} */
export const CS_ASSESSMENT_QUESTIONS = [
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
      { id: "d", text: "A type of power cable" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — data is information (text, numbers, images, sound) represented so a computer can store and work with it.",
    explanationIncorrect:
      "Data is information a computer can store and process — not only handwritten numbers, and not the hardware case itself.",
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
      { id: "d", text: "They can never be copied again" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Right — moving prices into the app makes them digital: discrete symbols a computer can store, copy, and process. The meaning (price) is the same; the representation changed.",
    explanationIncorrect:
      "Digital means a computer-friendly discrete representation (often bits). The prices are still information — they did not become waves-only, and digital data is usually easy to copy.",
  },
  {
    id: "aq.cs.computer.1",
    skillSlug: "cs.l0.what_is_computer",
    subject: "Computer Science",
    topics: ["What is a computer?", "Computer model"],
    concept: "Input → process → output",
    difficulty: "easy",
    prompt: "Which sequence best describes how a computer works?",
    options: [
      { id: "a", text: "Output → storage → ignore input" },
      { id: "b", text: "Input → processing → output (with storage as needed)" },
      { id: "c", text: "Only storage, never processing" },
      { id: "d", text: "Hardware without software" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Exactly. Computers take input, process it following instructions, produce output, and use storage to keep data and programs.",
    explanationIncorrect:
      "The core model is input → processing → output, with storage holding data and programs. Skipping input or processing is not a working computer.",
  },
  {
    id: "aq.cs.computer.2",
    skillSlug: "cs.l0.what_is_computer",
    subject: "Computer Science",
    topics: ["What is a computer?", "Computer model"],
    concept: "Hardware vs software",
    difficulty: "medium",
    transfer: true,
    prompt: "Aisha’s tablet screen cracks, but her drawing app still opens. What failed, and what is still software?",
    options: [
      { id: "a", text: "The app is broken hardware; the screen is software" },
      { id: "b", text: "The screen is hardware that failed; the drawing app is still software" },
      { id: "c", text: "Both the screen and the app are only software" },
      { id: "d", text: "Nothing physical failed because apps are hardware" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Yes — the cracked screen is physical hardware. The drawing app is software (instructions). Hardware can break while software still exists.",
    explanationIncorrect:
      "Hardware = physical parts (like a screen). Software = programs (like a drawing app). A cracked screen is hardware failure; the app remains software.",
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
      { id: "d", text: "A pure mechanical clock with no electronics" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Servers are computers designed to provide services (files, websites, apps) to many clients on a network.",
    explanationIncorrect:
      "A server is a computer that provides services to other devices. A kitchen timer or paper is not that role.",
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
      { id: "d", text: "Providing Wi‑Fi without any processing" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "The CPU (processor) executes instructions — it is the “brain” that calculates and controls processing.",
    explanationIncorrect:
      "Long-term files live on storage drives. The CPU’s job is running instructions and doing the actual processing.",
  },
  {
    id: "aq.cs.hw.2",
    skillSlug: "cs.l0.hardware",
    subject: "Computer Science",
    topics: ["Computer hardware", "Hardware"],
    concept: "RAM",
    difficulty: "medium",
    transfer: true,
    prompt:
      "You close a game and unplug the laptop. The game progress you never saved is gone, but a homework file on the hard drive is still there. What does that tell you about RAM vs storage?",
    options: [
      { id: "a", text: "RAM keeps files forever; storage forgets when power is off" },
      { id: "b", text: "RAM is short-term working memory (lost without power); storage keeps files longer" },
      { id: "c", text: "Both RAM and storage are only the screen" },
      { id: "d", text: "Unplugging never affects any kind of memory" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Exactly — unsaved game state lived in RAM (fast temporary working memory). The homework file on the drive is storage, which keeps data when power is off.",
    explanationIncorrect:
      "RAM is temporary working memory for running programs. Long-term files need disks/SSD storage, not RAM alone.",
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
      { id: "d", text: "It is the mouse cable" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "The OS sits between hardware and apps — managing memory, files, devices, and starting programs.",
    explanationIncorrect:
      "An OS is system software that manages the machine so applications can run. It is not a single app or a cable.",
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
      { id: "d", text: "To generate electricity" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Folders group files so you can find and manage them in a tree of locations (paths).",
    explanationIncorrect:
      "Folders organize files. They do not replace hardware or power the machine.",
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
      { id: "b", text: "A hint about the file’s type/format" },
      { id: "c", text: "That the file cannot be opened on any computer" },
      { id: "d", text: "The temperature of the CPU" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Extensions hint at format (document, image, etc.) so the OS and apps know how to open the file.",
    explanationIncorrect:
      "Extensions such as .pdf or .jpg signal file type/format — not hardware brand or temperature.",
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
      { id: "d", text: "Only on the internet, never on the device" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Installed apps are saved on storage. You open them through the OS when needed; RAM holds them while running.",
    explanationIncorrect:
      "Installations persist on storage. RAM is temporary while the app runs; the mouse does not store applications.",
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
      { id: "d", text: "Neither involves computers" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "The internet is the global network. The World Wide Web (sites/pages) is a major service that runs on top of it.",
    explanationIncorrect:
      "They are related but not identical: internet = network infrastructure; web = websites/pages as one use of that network.",
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
      { id: "b", text: "Use strong unique passwords and treat unexpected “login” links carefully" },
      { id: "c", text: "Click every email attachment from unknown senders" },
      { id: "d", text: "Post your banking PIN in a public chat" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Strong unique passwords and caution with unexpected links/attachments are core digital safety habits.",
    explanationIncorrect:
      "Reusing weak passwords and trusting surprise links/attachments are common ways accounts get stolen.",
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
      { id: "d", text: "Skip breaking the problem into parts" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Clear goals, inputs, and constraints stop you from building the wrong solution.",
    explanationIncorrect:
      "Start by understanding the problem: what goes in, what should come out, and any limits.",
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
      { id: "d", text: "A password" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "Algorithms are precise step-by-step procedures — recipes for solving a problem.",
    explanationIncorrect:
      "An algorithm is a finite sequence of clear steps, not a chip or a password.",
  },
  {
    id: "aq.cs.abs.1",
    skillSlug: "cs.l1.abstraction",
    subject: "Computer Science",
    topics: ["Abstraction", "Abstraction & patterns"],
    concept: "Abstraction",
    difficulty: "medium",
    prompt: "Abstraction in computing means:",
    options: [
      { id: "a", text: "Hiding unnecessary detail so you can focus on what matters" },
      { id: "b", text: "Making every wire visible at all times" },
      { id: "c", text: "Never naming things" },
      { id: "d", text: "Deleting all comments from code" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Abstraction lets you use a simple interface while details stay under the hood — like driving without rebuilding the engine each trip.",
    explanationIncorrect:
      "Abstraction hides complexity on purpose so people and programs can work at a useful level of detail.",
  },
  {
    id: "aq.cs.pat.1",
    skillSlug: "cs.l1.pattern_recognition",
    subject: "Computer Science",
    topics: ["Pattern recognition", "Abstraction & patterns", "Patterns"],
    concept: "Pattern recognition",
    difficulty: "easy",
    prompt: "Why do computer scientists look for patterns?",
    options: [
      { id: "a", text: "To reuse ideas and avoid solving the same issue from scratch" },
      { id: "b", text: "To make problems intentionally harder" },
      { id: "c", text: "Patterns are never useful in computing" },
      { id: "d", text: "Only to decorate folders" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Spotting patterns helps you reuse solutions — loops, templates, known algorithms.",
    explanationIncorrect:
      "Patterns save work: similar problems often share structure you can reuse.",
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
      { id: "d", text: "Random noise with no rules" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Programs use true/false conditions to choose paths — core logical thinking.",
    explanationIncorrect:
      "If/then behavior is controlled logic, not hardware cables or randomness.",
  },
  // ── L2 foundations ──
  {
    id: "aq.cs.bin.1",
    skillSlug: "cs.l2.number_systems",
    subject: "Computer Science",
    topics: ["Number systems", "Number systems & data", "Binary & bases"],
    concept: "Binary",
    difficulty: "medium",
    prompt: "Why do computers commonly use binary (0 and 1)?",
    options: [
      { id: "a", text: "Because two stable states are easy to represent in electronics" },
      { id: "b", text: "Because humans can only count to two" },
      { id: "c", text: "Because binary cannot represent text" },
      { id: "d", text: "Because binary ignores electricity entirely" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Electronics reliably distinguish two states (on/off). Those map cleanly to bits 0 and 1.",
    explanationIncorrect:
      "Binary fits hardware: two clear electrical states. Text and other data are encoded into bits too.",
  },
  {
    id: "aq.cs.datarep.1",
    skillSlug: "cs.l2.data_representation",
    subject: "Computer Science",
    topics: ["Data representation", "Number systems & data", "Data bits"],
    concept: "Data representation",
    difficulty: "medium",
    prompt: "How can a computer store text such as the letter A?",
    options: [
      { id: "a", text: "As a coded number pattern (bits) agreed by a character encoding" },
      { id: "b", text: "Only as a physical paper letter glued inside the PC" },
      { id: "c", text: "Text cannot be stored digitally" },
      { id: "d", text: "Only as sound waves in RAM forever" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Encodings (like Unicode/ASCII ideas) map characters to numeric bit patterns the machine can store.",
    explanationIncorrect:
      "Digital text is stored as coded bit patterns — not paper slips inside the computer.",
  },
  {
    id: "aq.cs.bool.1",
    skillSlug: "cs.l2.boolean",
    subject: "Computer Science",
    topics: ["Boolean algebra", "Boolean logic & gates", "Boolean"],
    concept: "Boolean AND",
    difficulty: "medium",
    prompt: "When is A AND B true?",
    options: [
      { id: "a", text: "When either A or B is true (or both)" },
      { id: "b", text: "Only when both A and B are true" },
      { id: "c", text: "Only when both are false" },
      { id: "d", text: "AND is never used in computing" },
    ],
    correctIndex: 1,
    explanationCorrect:
      "AND requires both inputs true. OR is the one that accepts either.",
    explanationIncorrect:
      "AND = both must be true. OR = at least one true. Mixing them is a common mix-up.",
  },
  {
    id: "aq.cs.gates.1",
    skillSlug: "cs.l2.digital_logic",
    subject: "Computer Science",
    topics: ["Digital logic", "Boolean logic & gates", "Logic gates"],
    concept: "Logic gates",
    difficulty: "medium",
    prompt: "Logic gates are building blocks that:",
    options: [
      { id: "a", text: "Implement Boolean operations in hardware" },
      { id: "b", text: "Are only used for garden fences" },
      { id: "c", text: "Replace the need for any software forever" },
      { id: "d", text: "Store movies without electricity" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Gates (AND, OR, NOT, …) realize Boolean logic in circuits that build processors.",
    explanationIncorrect:
      "In computing, gates are electronic Boolean building blocks — not garden hardware.",
  },
  {
    id: "aq.cs.how.1",
    skillSlug: "cs.l2.how_computers_work",
    subject: "Computer Science",
    topics: ["How a computer actually works", "How computers work", "Inside the machine"],
    concept: "Fetch-decode-execute",
    difficulty: "medium",
    prompt: "In a simple CPU cycle, what happens?",
    options: [
      { id: "a", text: "Fetch an instruction, decode it, then execute it" },
      { id: "b", text: "Only cool the fan, never run instructions" },
      { id: "c", text: "Print a page without any program" },
      { id: "d", text: "Skip memory entirely always" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "The classic cycle: fetch instruction from memory → decode → execute, then repeat.",
    explanationIncorrect:
      "CPUs repeatedly fetch, decode, and execute instructions from memory.",
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
      { id: "d", text: "A single random number with no purpose" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Programs are structured instructions — software that tells hardware what to do.",
    explanationIncorrect:
      "A program is intentional instructions, not the keyboard plastic itself.",
  },
  {
    id: "aq.cs.var.1",
    skillSlug: "cs.l3.variables",
    subject: "Computer Science",
    topics: ["Variables", "Variables, types & operators"],
    concept: "Variables",
    difficulty: "easy",
    prompt: "What is a variable in programming?",
    options: [
      { id: "a", text: "A named place that holds a value which can change" },
      { id: "b", text: "A fixed wall that never stores data" },
      { id: "c", text: "Only a type of monitor" },
      { id: "d", text: "A Wi‑Fi password by definition" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Variables name memory that holds values you can read and update as the program runs.",
    explanationIncorrect:
      "Think of a labeled box: the name stays, the contents can change.",
  },
  {
    id: "aq.cs.types.1",
    skillSlug: "cs.l3.types",
    subject: "Computer Science",
    topics: ["Primitive types", "Variables, types & operators", "Types"],
    concept: "Types",
    difficulty: "easy",
    prompt: "Why do types (number, text, boolean) matter?",
    options: [
      { id: "a", text: "They describe what kind of value you have and what operations make sense" },
      { id: "b", text: "Types are only for decorating code comments" },
      { id: "c", text: "All values are identical so types never help" },
      { id: "d", text: "Types replace the need for algorithms" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Types tell you (and the language) whether a value is text, a number, true/false, etc., so operations stay meaningful.",
    explanationIncorrect:
      "Types classify values. You would not multiply two names the same way you multiply numbers.",
  },
  {
    id: "aq.cs.ops.2",
    skillSlug: "cs.l3.operators",
    subject: "Computer Science",
    topics: ["Operators", "Variables, types & operators"],
    concept: "Operators",
    difficulty: "easy",
    prompt: "Which operator compares whether two values are equal in many languages?",
    options: [
      { id: "a", text: "== or a language’s equality test" },
      { id: "b", text: "A folder path only" },
      { id: "c", text: "The power button" },
      { id: "d", text: "A mouse DPI setting" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Equality operators test whether values match — distinct from assignment in most languages.",
    explanationIncorrect:
      "Comparison uses equality operators (often ==). Hardware buttons are not program operators.",
  },
  {
    id: "aq.cs.cf.1",
    skillSlug: "cs.l3.control_flow",
    subject: "Computer Science",
    topics: ["Control flow", "Control flow & functions", "If & loops"],
    concept: "Loops",
    difficulty: "easy",
    prompt: "What is a loop for?",
    options: [
      { id: "a", text: "Repeating instructions while a condition holds" },
      { id: "b", text: "Turning off the monitor permanently" },
      { id: "c", text: "Naming a single variable once" },
      { id: "d", text: "Avoiding all repetition forever" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Loops repeat a block — for counting, processing lists, or waiting on a condition.",
    explanationIncorrect:
      "Loops exist to repeat work safely and clearly, not to power off hardware.",
  },
  {
    id: "aq.cs.fn.1",
    skillSlug: "cs.l3.functions",
    subject: "Computer Science",
    topics: ["Functions", "Control flow & functions"],
    concept: "Functions",
    difficulty: "easy",
    prompt: "A function is useful because it:",
    options: [
      { id: "a", text: "Packages reusable behavior with inputs and outputs" },
      { id: "b", text: "Deletes the need for any structure" },
      { id: "c", text: "Is only a type of keyboard key" },
      { id: "d", text: "Cannot take parameters in any language" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Functions (or methods) group steps you can call again with different inputs.",
    explanationIncorrect:
      "Functions package reusable logic — a core way to organize programs.",
  },
  {
    id: "aq.cs.ds.1",
    skillSlug: "cs.l3.data_structures_intro",
    subject: "Computer Science",
    topics: ["Data structures (intro)", "Lists, maps & structures", "Lists & maps", "Intro data structures"],
    concept: "Lists",
    difficulty: "easy",
    prompt: "A list/array is best when you need to:",
    options: [
      { id: "a", text: "Keep an ordered collection of items" },
      { id: "b", text: "Store only one bit forever with no order" },
      { id: "c", text: "Replace the CPU cooling fan" },
      { id: "d", text: "Avoid storing any values" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Lists/arrays hold sequences — scores, names, steps — in order.",
    explanationIncorrect:
      "Use a list when you have many values in sequence, not for hardware repairs.",
  },
  {
    id: "aq.cs.debug.1",
    skillSlug: "cs.l3.debugging",
    subject: "Computer Science",
    topics: ["Errors & debugging", "Debugging & modules", "Debug"],
    concept: "Debugging",
    difficulty: "easy",
    prompt: "A healthy debugging habit is:",
    options: [
      { id: "a", text: "Read the error, reproduce it, and change one thing at a time" },
      { id: "b", text: "Ignore messages and rewrite everything randomly" },
      { id: "c", text: "Never test after a fix" },
      { id: "d", text: "Blame the user without checking the code" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Good debugging is systematic: understand the failure, isolate causes, fix, re-test.",
    explanationIncorrect:
      "Random rewrites without reading errors waste time. Slow down and isolate the bug.",
  },
  {
    id: "aq.cs.mod.1",
    skillSlug: "cs.l3.modules",
    subject: "Computer Science",
    topics: ["Modules & packages", "Debugging & modules", "Modules"],
    concept: "Modules",
    difficulty: "easy",
    prompt: "Why split code into modules/packages?",
    options: [
      { id: "a", text: "To organize and reuse code cleanly" },
      { id: "b", text: "To make navigation impossible on purpose" },
      { id: "c", text: "Modules only exist in printers" },
      { id: "d", text: "So programs cannot import anything" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Modules keep related functions together and let you import them where needed.",
    explanationIncorrect:
      "Modules are about structure and reuse in software — not printer hardware.",
  },
  // ── L4 algorithms ──
  {
    id: "aq.cs.search.1",
    skillSlug: "cs.l4.searching",
    subject: "Computer Science",
    topics: ["Searching", "Searching & sorting", "Search"],
    concept: "Binary search idea",
    difficulty: "medium",
    prompt: "Binary search works efficiently when the data is:",
    options: [
      { id: "a", text: "Sorted, so you can discard half each step" },
      { id: "b", text: "Completely random with no order ever" },
      { id: "c", text: "Not stored at all" },
      { id: "d", text: "Only sounds, never numbers or text keys" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Binary search needs sorted order to jump to the middle and eliminate half the range.",
    explanationIncorrect:
      "Without sorted order, you generally fall back to checking items one by one (linear search).",
  },
  {
    id: "aq.cs.sort.1",
    skillSlug: "cs.l4.sorting",
    subject: "Computer Science",
    topics: ["Sorting", "Searching & sorting", "Sort"],
    concept: "Sorting",
    difficulty: "easy",
    prompt: "Sorting a list means:",
    options: [
      { id: "a", text: "Arranging items into an order (e.g. smallest to largest)" },
      { id: "b", text: "Deleting the list permanently" },
      { id: "c", text: "Hiding the list from the OS" },
      { id: "d", text: "Converting the CPU into RAM" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Sorting puts elements in a defined order — alphabetical, numeric, by date, and so on.",
    explanationIncorrect:
      "Sorting reorders; it does not delete data or change hardware roles.",
  },
  {
    id: "aq.cs.stack.1",
    skillSlug: "cs.l4.fundamental_ds",
    subject: "Computer Science",
    topics: ["Fundamental data structures", "Stacks, queues, trees & graphs", "Stacks & queues"],
    concept: "Stack vs queue",
    difficulty: "medium",
    prompt: "A stack follows which rule?",
    options: [
      { id: "a", text: "Last in, first out (LIFO)" },
      { id: "b", text: "First in, first out only (like a fair queue)" },
      { id: "c", text: "Never insert or remove items" },
      { id: "d", text: "Only store images permanently on paper" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Stacks are LIFO — like a stack of plates. Queues are FIFO — like a line at a shop.",
    explanationIncorrect:
      "Stack = LIFO. Queue = FIFO. Mixing them is a classic mix-up.",
  },
  {
    id: "aq.cs.tree.1",
    skillSlug: "cs.l4.trees",
    subject: "Computer Science",
    topics: ["Trees", "Stacks, queues, trees & graphs"],
    concept: "Trees",
    difficulty: "medium",
    prompt: "In a tree structure, the top node is often called the:",
    options: [
      { id: "a", text: "Root" },
      { id: "b", text: "Leaf only, with no children ever allowed above" },
      { id: "c", text: "Modem" },
      { id: "d", text: "Pixel" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Trees have a root at the top; leaves are nodes without children further down.",
    explanationIncorrect:
      "Root is the starting node. Leaves are at the ends of branches.",
  },
  {
    id: "aq.cs.graph.1",
    skillSlug: "cs.l4.graphs",
    subject: "Computer Science",
    topics: ["Graphs", "Stacks, queues, trees & graphs"],
    concept: "Graphs",
    difficulty: "medium",
    prompt: "A graph in CS is made of:",
    options: [
      { id: "a", text: "Nodes (vertices) connected by edges" },
      { id: "b", text: "Only one isolated number with no relationships" },
      { id: "c", text: "Printer ink levels exclusively" },
      { id: "d", text: "A single unbroken metal bar" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Graphs model relationships: people in a network, cities and roads, web links.",
    explanationIncorrect:
      "Think dots and connections — vertices and edges — not printer supplies.",
  },
  {
    id: "aq.cs.bigo.1",
    skillSlug: "cs.l4.algorithm_analysis",
    subject: "Computer Science",
    topics: ["Algorithm analysis", "Searching & sorting", "Big-O intro"],
    concept: "Algorithm analysis",
    difficulty: "medium",
    prompt: "When we compare algorithms, we often care most about:",
    options: [
      { id: "a", text: "How work grows as the input gets larger" },
      { id: "b", text: "The color of the IDE theme only" },
      { id: "c", text: "Whether the file name has a vowel" },
      { id: "d", text: "The brand of the desk chair" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Algorithm analysis studies growth of time/space as n increases — efficiency at scale.",
    explanationIncorrect:
      "We care how cost scales with input size, not cosmetic editor choices.",
  },
  // ── L5+ legacy / adjacent (topic aliases kept) ──
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
      { id: "d", text: "Block all teamwork permanently" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Git records history so you can experiment, undo, and work with others safely.",
    explanationIncorrect:
      "Version control is about history and collaboration — not overclocking CPUs.",
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
      { id: "d", text: "Only slow teams down with no benefit" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Tests check that behavior still works after edits — a safety net for change.",
    explanationIncorrect:
      "Good tests reduce fear of change by spotting breaks early.",
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
      { id: "d", text: "Replace keyboards" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Databases organize data for safe storage and efficient queries — users, orders, messages, and more.",
    explanationIncorrect:
      "Databases are for data, not cooling hardware or replacing input devices.",
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
      { id: "d", text: "Cannot use IP addresses ever" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Client–server: your browser (client) requests pages from a web server.",
    explanationIncorrect:
      "Clients ask; servers respond. Both are computers (or programs) on a network.",
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
      { id: "d", text: "Device that never uses networks" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Browsers are web clients: they request resources and render what comes back.",
    explanationIncorrect:
      "Your browser is a client on the network, not the entire internet’s database.",
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
      { id: "d", text: "Avoiding all interaction with hardware" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "OSes manage processes, memory, files, and devices so apps can share the machine fairly.",
    explanationIncorrect:
      "Process scheduling and memory management are classic OS jobs.",
  },
  {
    id: "aq.cs.disc.1",
    skillSlug: "cs.l5.discrete_math",
    subject: "Computer Science",
    topics: ["Discrete mathematics", "Discrete math for CS", "Discrete intro", "Discrete math foundations"],
    concept: "Discrete math",
    difficulty: "medium",
    prompt: "Discrete math is especially useful in CS because it deals with:",
    options: [
      { id: "a", text: "Separate countable structures like sets, logic, and graphs" },
      { id: "b", text: "Only continuous fluid dynamics of oceans" },
      { id: "c", text: "Cooking temperatures exclusively" },
      { id: "d", text: "Nothing related to algorithms" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "CS leans on discrete structures — logic, sets, graphs, counting — that match digital systems.",
    explanationIncorrect:
      "Discrete math studies distinct objects and relationships foundational to algorithms and proofs.",
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
      { id: "d", text: "They cannot process any information" },
    ],
    correctIndex: 0,
    explanationCorrect:
      "Most ML systems fit patterns from examples. They can fail, so humans stay responsible for use.",
    explanationIncorrect:
      "AI is not magic perfection — quality depends on data, design, and careful evaluation.",
  },
];
