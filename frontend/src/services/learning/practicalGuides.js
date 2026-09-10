/**
 * Practical how-to guides — hands-on, replicable procedures for skill topics.
 *
 * Conceptual Socratic tutoring is not enough for literacy skills like
 * "Files & folders": students need explicit step-by-step instructions they
 * can do on their own device. This module supplies curated guides and
 * prompt blocks so Kindling teaches *doing*, not only *knowing*.
 */

/** Topics / skill patterns that require hands-on how-to teaching. */
const PRACTICAL_TOPIC_PATTERNS = [
  /files?\s*&?\s*folders?/i,
  /file\s*management/i,
  /paths?\b/i,
  /operat(e|ing)\s+(a\s+)?computer/i,
  /using\s+(a\s+)?(pc|computer|laptop)/i,
  /desktop\s+environment/i,
  /install(ing)?\s+(software|apps?)/i,
  /internet\s+literacy/i,
  /brows(er|ing)/i,
  /digital\s+safety/i,
  /password/i,
  /email/i,
  /keyboard|mouse|touchpad/i,
  /copy|paste|rename|download|upload|backup/i,
  /save\s+(a\s+)?file/i,
  /create\s+(a\s+)?(folder|file|document)/i,
];

/**
 * @typedef {object} PracticalGuide
 * @property {string} id
 * @property {string} skillSlug
 * @property {string[]} topics
 * @property {string} subject
 * @property {string} title
 * @property {string} skillGoal — what the student can *do* after
 * @property {string} conceptBrief — one-line "what/why"
 * @property {string[]} platforms — e.g. Windows, macOS, Chromebook, generic
 * @property {string[]} steps — ordered how-to steps (device-agnostic preferred)
 * @property {string[]} [platformNotes] — short OS-specific tips
 * @property {string[]} tryIt — checklist for the student to do themselves
 * @property {string[]} commonMistakes
 * @property {string[]} [relatedHowTos] — other guide ids to chain
 */

/** Embedded pilot pack — CS literacy hands-on procedures. */
export const LOCAL_PRACTICAL_GUIDES = [
  {
    id: "pg.cs.files.create_folder",
    skillSlug: "cs.l0.files_folders",
    topics: [
      "Files & folders",
      "Files and folders",
      "Files",
      "Folders",
      "File management",
    ],
    subject: "Computer Science",
    title: "Create a folder and put a file in it",
    skillGoal:
      "Create a named folder, save or move a file into it, and find it again.",
    conceptBrief:
      "A file is one saved item (document, photo, song). A folder is a labeled box that groups related files so you can find them later.",
    platforms: ["Windows", "macOS", "Chromebook", "phone/tablet Files app"],
    steps: [
      "Open your file browser: File Explorer (Windows), Finder (Mac), or Files (Chromebook/phone).",
      "Go to a place you own and use often — Desktop, Documents, or Downloads.",
      "Create a new folder: right-click empty space → New → Folder (Windows), or File → New Folder (Mac). On touch devices, use New folder / +.",
      "Type a clear name (e.g. School-Work or Kindling-Practice) and press Enter.",
      "Open the new folder (double-click or tap).",
      "Put something in it: either Save a document and choose this folder, or drag a file from Downloads into this folder.",
      "Confirm: leave the folder, come back, and open the file — you should still find it in the same place.",
    ],
    platformNotes: [
      "Windows: File Explorer → This PC → Documents is a safe practice spot.",
      "Mac: Finder → Documents or Desktop.",
      "Chromebook: Files app → My files.",
      "Phone: Files or My Files app — same idea: folder = group of files.",
    ],
    tryIt: [
      "Create a folder named Practice-Today.",
      "Put one file inside it (any small file is fine).",
      "Close everything, reopen the folder, and open that file.",
    ],
    commonMistakes: [
      "Saving to Downloads every time and never organizing — files get lost in the pile.",
      "Naming folders vaguely (New folder, asdf) so you cannot remember what is inside.",
      "Thinking delete is the same as move — delete removes; move relocates.",
    ],
    relatedHowTos: [
      "pg.cs.files.rename_copy",
      "pg.cs.files.paths",
    ],
  },
  {
    id: "pg.cs.files.rename_copy",
    skillSlug: "cs.l0.files_folders",
    topics: ["Files & folders", "Files and folders", "Files"],
    subject: "Computer Science",
    title: "Rename, copy, and move a file",
    skillGoal:
      "Rename a file clearly, make a copy without losing the original, and move a file into a folder.",
    conceptBrief:
      "Rename changes the label. Copy makes a second file. Move relocates the same file. Delete removes it (often to Trash/Recycle Bin first).",
    platforms: ["Windows", "macOS", "Chromebook"],
    steps: [
      "Open your file browser and find the file.",
      "Rename: click once to select, then press F2 (Windows) or Return (Mac), or right-click → Rename. Type a clear name + keep the extension (.pdf, .jpg) unless you know what you are doing.",
      "Copy: right-click → Copy, go to the destination folder, right-click → Paste (or Ctrl+C / Ctrl+V, Cmd on Mac).",
      "Move: drag the file into a folder, or Cut then Paste (Ctrl+X then Ctrl+V).",
      "Check: the original location and the destination match what you intended (copy = two files; move = one file in the new place).",
    ],
    tryIt: [
      "Rename a practice file to My-Notes.",
      "Copy it into your Practice-Today folder.",
      "Move a different file into the same folder.",
    ],
    commonMistakes: [
      "Deleting the extension when renaming so the computer no longer knows the file type.",
      "Using Cut when you meant Copy — then panicking when the original seems gone (check the destination).",
    ],
    relatedHowTos: ["pg.cs.files.create_folder"],
  },
  {
    id: "pg.cs.files.paths",
    skillSlug: "cs.l0.files_folders",
    topics: ["Files & folders", "Files and folders", "Paths"],
    subject: "Computer Science",
    title: "Read a simple file path",
    skillGoal:
      "Describe where a file lives using folder → folder → file language.",
    conceptBrief:
      "A path is the address of a file: which drive/area, which folders, then the file name — like Home → Documents → School → essay.docx.",
    platforms: ["any"],
    steps: [
      "Open the folder that contains your file.",
      "Look at the address bar or breadcrumb trail at the top (it often shows clickable folder names).",
      "Read left to right: big place first (Documents), then each folder, then the file name at the end.",
      "Say the path out loud in plain words: \"Documents, then Practice-Today, then My-Notes.txt\".",
      "Click one level up (Up arrow or parent folder) and navigate back down using the path — prove you can find it again.",
    ],
    tryIt: [
      "Write or say the path of one file you created today in plain language.",
      "Navigate away and find it again using only that path.",
    ],
    commonMistakes: [
      "Confusing the file name with the full path — the name is only the last part.",
      "Assuming two files with the same name in different folders are the same file.",
    ],
    relatedHowTos: ["pg.cs.files.create_folder"],
  },
  {
    id: "pg.cs.operate.open_app",
    skillSlug: "cs.l0.operate_computer",
    topics: [
      "Operating a computer",
      "Using a PC",
      "Using a computer",
      "Desktop environments",
    ],
    subject: "Computer Science",
    title: "Open an app, use a window, and close it safely",
    skillGoal:
      "Find and open an application, resize/switch windows, and quit without losing work.",
    conceptBrief:
      "Apps are programs you open to do a job. Windows are the frames those apps live in. Closing vs minimizing are different: minimize hides; close exits.",
    platforms: ["Windows", "macOS", "Chromebook"],
    steps: [
      "Find the app: Start menu / search (Windows), Spotlight or Dock (Mac), Launcher (Chromebook).",
      "Type part of the app name and open it with Enter or a click.",
      "Notice the window controls: minimize (hide to taskbar/dock), maximize/full screen, close.",
      "If you edited something, use File → Save (or Ctrl+S / Cmd+S) before closing.",
      "Close with the X (Windows/Chrome) or red button (Mac), or File → Exit/Quit.",
    ],
    tryIt: [
      "Open a simple app (Notepad, TextEdit, or a browser).",
      "Type a short line, save it into your Practice-Today folder, then close and reopen it.",
    ],
    commonMistakes: [
      "Closing without saving — work disappears.",
      "Opening many copies of the same app and getting lost — use the taskbar/dock to switch.",
    ],
    relatedHowTos: ["pg.cs.files.create_folder"],
  },
  {
    id: "pg.cs.internet.search",
    skillSlug: "cs.l0.internet_literacy",
    topics: ["Internet literacy", "Internet", "Browser", "Search"],
    subject: "Computer Science",
    title: "Open a browser and run a careful search",
    skillGoal:
      "Open a browser, type a clear search, open one result, and judge if it looks trustworthy enough to read.",
    conceptBrief:
      "A browser is the app for visiting websites. Search engines find pages; you still choose which links to trust.",
    platforms: ["any device with a browser"],
    steps: [
      "Open your browser (Chrome, Edge, Safari, Firefox, etc.).",
      "Click the address/search bar at the top.",
      "Type a clear search in plain words (who/what + what you need), then press Enter.",
      "Before clicking, skim the title and site name — prefer known schools, libraries, or official sites for facts.",
      "Open one result. Check the page title and URL still match what you wanted.",
      "If it looks wrong or pushy (urgent downloads, odd pop-ups), close the tab and try another result.",
    ],
    tryIt: [
      "Search for a simple fact you already know and confirm one trustworthy-looking page agrees.",
      "Bookmark or note the site name — not every link is equal.",
    ],
    commonMistakes: [
      "Clicking the first ad or flashy button without reading.",
      "Typing the whole question into a random toolbar instead of the browser address bar.",
    ],
    relatedHowTos: ["pg.cs.safety.password"],
  },
  {
    id: "pg.cs.safety.password",
    skillSlug: "cs.l0.digital_safety",
    topics: ["Digital safety", "Passwords", "Safety"],
    subject: "Computer Science",
    title: "Build a stronger password habit",
    skillGoal:
      "Create a longer unique passphrase pattern and know never to share it or reuse it everywhere.",
    conceptBrief:
      "A good password is long, unique to that account, and secret. Passphrases (several words) are easier to remember and harder to guess than short codes.",
    platforms: ["any"],
    steps: [
      "Think of 3–4 unrelated words you can remember (not your name, school, or birthday).",
      "Join them with a number or symbol you pick (example pattern only: river-lamp-92-kite).",
      "Use a different password for school/email than for games when you can.",
      "If the site offers \"show password\" while typing, use it once to check for typos — then hide it.",
      "Never send your password in chat, email, or to someone claiming to be support.",
      "If a site offers extra login protection (a code on your phone), turn it on when a trusted adult agrees.",
    ],
    tryIt: [
      "Practice making one passphrase pattern on paper (do not use a real password you already have).",
      "Say out loud who you would never tell a password to — including \"helpful\" strangers online.",
    ],
    commonMistakes: [
      "password123 or your name + birth year — too easy to guess.",
      "Reusing one password on every site — one leak unlocks many accounts.",
    ],
    relatedHowTos: ["pg.cs.internet.search"],
  },
];

/**
 * True when this lesson should prioritize hands-on how-to teaching.
 * @param {string} [topic]
 * @param {string} [subject]
 */
export function isPracticalSkillTopic(topic = "", subject = "") {
  const t = String(topic || "").trim();
  const s = String(subject || "").trim();
  if (!t && !s) return false;
  if (LOCAL_PRACTICAL_GUIDES.some((g) => topicMatchesGuide(t, g))) return true;
  if (PRACTICAL_TOPIC_PATTERNS.some((re) => re.test(t))) return true;
  // CS literacy unit often practical even when topic name is soft-matched
  if (
    /computer\s*science/i.test(s) &&
    /literacy|hardware|software|files|folders|internet|safety|operat/i.test(t)
  ) {
    return true;
  }
  return false;
}

function topicMatchesGuide(topic, guide) {
  const t = String(topic || "").trim().toLowerCase();
  if (!t) return false;
  return (guide.topics || []).some((name) => {
    const n = String(name).toLowerCase();
    return t === n || t.includes(n) || n.includes(t);
  });
}

/**
 * @param {object} opts
 * @param {string} [opts.topic]
 * @param {string} [opts.subject]
 * @param {string} [opts.skillSlug]
 * @param {string} [opts.guideId]
 * @returns {PracticalGuide|null}
 */
export function findPracticalGuide({
  topic = "",
  subject = "",
  skillSlug = "",
  guideId = "",
} = {}) {
  if (guideId) {
    const byId = LOCAL_PRACTICAL_GUIDES.find((g) => g.id === guideId);
    if (byId) return byId;
  }
  const slug = String(skillSlug || "").trim();
  if (slug) {
    const bySlug = LOCAL_PRACTICAL_GUIDES.find((g) => g.skillSlug === slug);
    if (bySlug) return bySlug;
  }
  const t = String(topic || "").trim();
  const s = String(subject || "").trim();
  const scored = LOCAL_PRACTICAL_GUIDES.map((g) => {
    let score = 0;
    if (topicMatchesGuide(t, g)) score += 3;
    if (s && g.subject && s.toLowerCase() === g.subject.toLowerCase()) {
      score += 1;
    }
    return { g, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.g || null;
}

/**
 * All guides relevant to a topic (primary + related chain starters).
 */
export function listPracticalGuides({ topic = "", subject = "", skillSlug = "" } = {}) {
  const primary = findPracticalGuide({ topic, subject, skillSlug });
  if (!primary) {
    return LOCAL_PRACTICAL_GUIDES.filter(
      (g) =>
        topicMatchesGuide(topic, g) ||
        (skillSlug && g.skillSlug === skillSlug)
    );
  }
  const out = [primary];
  const seen = new Set([primary.id]);
  for (const id of primary.relatedHowTos || []) {
    const g = LOCAL_PRACTICAL_GUIDES.find((x) => x.id === id);
    if (g && !seen.has(g.id)) {
      seen.add(g.id);
      out.push(g);
    }
  }
  // Other same-skill guides
  for (const g of LOCAL_PRACTICAL_GUIDES) {
    if (g.skillSlug === primary.skillSlug && !seen.has(g.id)) {
      seen.add(g.id);
      out.push(g);
    }
  }
  return out;
}

/**
 * Format one guide for the system prompt.
 * @param {PracticalGuide} guide
 */
export function formatPracticalGuideForPrompt(guide) {
  if (!guide) return "";
  const steps = (guide.steps || [])
    .map((s, i) => `  ${i + 1}. ${s}`)
    .join("\n");
  const tryIt = (guide.tryIt || []).map((s) => `  - ${s}`).join("\n");
  const mistakes = (guide.commonMistakes || [])
    .map((s) => `  - ${s}`)
    .join("\n");
  const notes = (guide.platformNotes || []).map((s) => `  - ${s}`).join("\n");
  return [
    `### ${guide.title}`,
    `Skill goal (student can DO this): ${guide.skillGoal}`,
    `Concept in one line: ${guide.conceptBrief}`,
    `Platforms: ${(guide.platforms || []).join(", ") || "any"}`,
    "How-to steps (teach these so the student can replicate on their device):",
    steps,
    notes ? `Platform tips:\n${notes}` : "",
    tryIt ? `Try-it checklist (have them do this):\n${tryIt}` : "",
    mistakes ? `Common mistakes to warn about:\n${mistakes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Mandatory prompt block for practical / procedural topics.
 * @param {object} opts
 * @param {string} [opts.topic]
 * @param {string} [opts.subject]
 * @param {string} [opts.studentName]
 * @param {boolean} [opts.isFirstSession]
 */
export function buildPracticalHowToPromptBlock({
  topic = "",
  subject = "",
  studentName = "the student",
  isFirstSession = false,
} = {}) {
  const name = studentName || "the student";
  const practical = isPracticalSkillTopic(topic, subject);
  const guides = practical
    ? listPracticalGuides({ topic, subject }).slice(0, 3)
    : [];

  if (!practical && !guides.length) return "";

  const library =
    guides.length > 0
      ? guides.map((g) => formatPracticalGuideForPrompt(g)).join("\n\n")
      : "";

  const firstSessionLine = isFirstSession
    ? `- On the opening arc for a new practical topic: after a short orientation, **promptly offer a hands-on how-to** (do not stay in pure theory for many turns).`
    : `- If ${name} has only heard theory so far this session, **switch into a hands-on how-to** before more quizzes.`;

  return `## Practical how-to teaching (MANDATORY for this skill topic)

This lesson is a **practical skill**, not pure theory. ${name} must leave able to **do** something on a real device — not only define terms.

Teaching contract:
${firstSessionLine}
- Pattern for each skill: **(1) what it is in one breath → (2) numbered how-to steps they can follow → (3) try-it on their device → (4) confirm what they did**.
- Use **numbered lists** for procedures. One major procedure at a time; you may send 4–7 short steps in a single how-to message when walking through a task (this is allowed and expected for hands-on skills).
- Prefer device-agnostic language, then add a one-line tip for Windows / Mac / Chromebook / phone when useful.
- After steps, give a **try-it checklist** and ask them to do it (or narrate what they see) — not only answer a definition question.
- Socratic "don't give answers" applies to **reasoning puzzles and graded practice**, NOT to withholding how-to steps. For procedures, **show the steps clearly**, then let them practice.
- Never only lecture definitions for files, folders, apps, browsers, or safety habits — always pair with a replicable how-to.
- When they ask "how do I…?", answer with steps immediately.

${
  library
    ? `CURATED HOW-TO GUIDES (prefer these procedures; adapt wording to ${name}'s age and OS, do not invent conflicting steps):\n\n${library}`
    : `No curated guide matched exactly — still invent a clear, safe, age-right step-by-step how-to for "${topic}" that ${name} can replicate.`
}`;
}

/**
 * Extra directives for personalization insights.
 */
export function practicalHowToDirectives({ topic = "", subject = "" } = {}) {
  if (!isPracticalSkillTopic(topic, subject)) return [];
  const guide = findPracticalGuide({ topic, subject });
  const title = guide?.title || topic || "this skill";
  return [
    `Practical skill topic — teach hands-on how-to for “${title}”, not theory-only.`,
    "After a short concept hook, walk through numbered steps the student can do on their device, then a try-it check.",
  ];
}

/**
 * Fallback / preferred suggestion chips for practical lessons.
 */
export function practicalHowToSuggestionPool(topic = "") {
  const short =
    String(topic || "this").trim().length > 24
      ? `${String(topic).trim().slice(0, 23)}…`
      : String(topic || "this").trim() || "this";
  return [
    "Show me how step by step",
    "Walk me through doing it",
    "What should I click first?",
    `Help me practice ${short} on my device`,
    "Give me a try-it checklist",
    "I did the steps — check me",
    "Show the Windows way",
    "Show the Mac / Chromebook way",
    "What is a common mistake?",
  ];
}

/**
 * Opening-kickoff addendum for practical topics (appended to hidden open prompt).
 */
export function buildPracticalOpeningAddendum({
  topicName = "",
  studentName = "the student",
} = {}) {
  const name = studentName || "the student";
  const guide = findPracticalGuide({ topic: topicName });
  const skillBit = guide
    ? `Primary hands-on skill to teach soon: "${guide.title}" — goal: ${guide.skillGoal}`
    : `Identify one concrete hands-on skill inside "${topicName}" they can do on a real device.`;

  return (
    `PRACTICAL SKILL OPENING RULES: After the warm orientation, do NOT stay in abstract theory. ` +
    `In the same opening message or the immediate next turn, offer to walk ${name} through a real how-to ` +
    `(numbered steps they can do on their computer/phone). ` +
    `${skillBit} ` +
    `Include a soft invitation chip-worthy offer like "Want me to show you step by step how to create a folder?" ` +
    `when relevant. Theory without a do-along path is a failure for this topic.`
  );
}
