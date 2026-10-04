if(typeof import.meta!=='undefined'){try{import.meta.env=import.meta.env||{VITE_API_URL:'http://127.0.0.1:8000'}}catch(e){}}

// scripts/smoke-practical-howto.mjs
import assert from "node:assert/strict";

// src/services/learning/practicalGuides.js
var PRACTICAL_TOPIC_PATTERNS = [
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
  /create\s+(a\s+)?(folder|file|document)/i
];
var LOCAL_PRACTICAL_GUIDES = [
  {
    id: "pg.cs.files.create_folder",
    skillSlug: "cs.l0.files_folders",
    topics: [
      "Files & folders",
      "Files and folders",
      "Files",
      "Folders",
      "File management"
    ],
    subject: "Computer Science",
    title: "Create a folder and put a file in it",
    skillGoal: "Create a named folder, save or move a file into it, and find it again.",
    conceptBrief: "A file is one saved item (document, photo, song). A folder is a labeled box that groups related files so you can find them later.",
    platforms: ["Windows", "macOS", "Chromebook", "phone/tablet Files app"],
    steps: [
      "Open your file browser: File Explorer (Windows), Finder (Mac), or Files (Chromebook/phone).",
      "Go to a place you own and use often \u2014 Desktop, Documents, or Downloads.",
      "Create a new folder: right-click empty space \u2192 New \u2192 Folder (Windows), or File \u2192 New Folder (Mac). On touch devices, use New folder / +.",
      "Type a clear name (e.g. School-Work or Kindling-Practice) and press Enter.",
      "Open the new folder (double-click or tap).",
      "Put something in it: either Save a document and choose this folder, or drag a file from Downloads into this folder.",
      "Confirm: leave the folder, come back, and open the file \u2014 you should still find it in the same place."
    ],
    platformNotes: [
      "Windows: File Explorer \u2192 This PC \u2192 Documents is a safe practice spot.",
      "Mac: Finder \u2192 Documents or Desktop.",
      "Chromebook: Files app \u2192 My files.",
      "Phone: Files or My Files app \u2014 same idea: folder = group of files."
    ],
    tryIt: [
      "Create a folder named Practice-Today.",
      "Put one file inside it (any small file is fine).",
      "Close everything, reopen the folder, and open that file."
    ],
    commonMistakes: [
      "Saving to Downloads every time and never organizing \u2014 files get lost in the pile.",
      "Naming folders vaguely (New folder, asdf) so you cannot remember what is inside.",
      "Thinking delete is the same as move \u2014 delete removes; move relocates."
    ],
    relatedHowTos: [
      "pg.cs.files.rename_copy",
      "pg.cs.files.paths"
    ]
  },
  {
    id: "pg.cs.files.rename_copy",
    skillSlug: "cs.l0.files_folders",
    topics: ["Files & folders", "Files and folders", "Files"],
    subject: "Computer Science",
    title: "Rename, copy, and move a file",
    skillGoal: "Rename a file clearly, make a copy without losing the original, and move a file into a folder.",
    conceptBrief: "Rename changes the label. Copy makes a second file. Move relocates the same file. Delete removes it (often to Trash/Recycle Bin first).",
    platforms: ["Windows", "macOS", "Chromebook"],
    steps: [
      "Open your file browser and find the file.",
      "Rename: click once to select, then press F2 (Windows) or Return (Mac), or right-click \u2192 Rename. Type a clear name + keep the extension (.pdf, .jpg) unless you know what you are doing.",
      "Copy: right-click \u2192 Copy, go to the destination folder, right-click \u2192 Paste (or Ctrl+C / Ctrl+V, Cmd on Mac).",
      "Move: drag the file into a folder, or Cut then Paste (Ctrl+X then Ctrl+V).",
      "Check: the original location and the destination match what you intended (copy = two files; move = one file in the new place)."
    ],
    tryIt: [
      "Rename a practice file to My-Notes.",
      "Copy it into your Practice-Today folder.",
      "Move a different file into the same folder."
    ],
    commonMistakes: [
      "Deleting the extension when renaming so the computer no longer knows the file type.",
      "Using Cut when you meant Copy \u2014 then panicking when the original seems gone (check the destination)."
    ],
    relatedHowTos: ["pg.cs.files.create_folder"]
  },
  {
    id: "pg.cs.files.paths",
    skillSlug: "cs.l0.files_folders",
    topics: ["Files & folders", "Files and folders", "Paths"],
    subject: "Computer Science",
    title: "Read a simple file path",
    skillGoal: "Describe where a file lives using folder \u2192 folder \u2192 file language.",
    conceptBrief: "A path is the address of a file: which drive/area, which folders, then the file name \u2014 like Home \u2192 Documents \u2192 School \u2192 essay.docx.",
    platforms: ["any"],
    steps: [
      "Open the folder that contains your file.",
      "Look at the address bar or breadcrumb trail at the top (it often shows clickable folder names).",
      "Read left to right: big place first (Documents), then each folder, then the file name at the end.",
      'Say the path out loud in plain words: "Documents, then Practice-Today, then My-Notes.txt".',
      "Click one level up (Up arrow or parent folder) and navigate back down using the path \u2014 prove you can find it again."
    ],
    tryIt: [
      "Write or say the path of one file you created today in plain language.",
      "Navigate away and find it again using only that path."
    ],
    commonMistakes: [
      "Confusing the file name with the full path \u2014 the name is only the last part.",
      "Assuming two files with the same name in different folders are the same file."
    ],
    relatedHowTos: ["pg.cs.files.create_folder"]
  },
  {
    id: "pg.cs.operate.open_app",
    skillSlug: "cs.l0.operate_computer",
    topics: [
      "Operating a computer",
      "Using a PC",
      "Using a computer",
      "Desktop environments"
    ],
    subject: "Computer Science",
    title: "Open an app, use a window, and close it safely",
    skillGoal: "Find and open an application, resize/switch windows, and quit without losing work.",
    conceptBrief: "Apps are programs you open to do a job. Windows are the frames those apps live in. Closing vs minimizing are different: minimize hides; close exits.",
    platforms: ["Windows", "macOS", "Chromebook"],
    steps: [
      "Find the app: Start menu / search (Windows), Spotlight or Dock (Mac), Launcher (Chromebook).",
      "Type part of the app name and open it with Enter or a click.",
      "Notice the window controls: minimize (hide to taskbar/dock), maximize/full screen, close.",
      "If you edited something, use File \u2192 Save (or Ctrl+S / Cmd+S) before closing.",
      "Close with the X (Windows/Chrome) or red button (Mac), or File \u2192 Exit/Quit."
    ],
    tryIt: [
      "Open a simple app (Notepad, TextEdit, or a browser).",
      "Type a short line, save it into your Practice-Today folder, then close and reopen it."
    ],
    commonMistakes: [
      "Closing without saving \u2014 work disappears.",
      "Opening many copies of the same app and getting lost \u2014 use the taskbar/dock to switch."
    ],
    relatedHowTos: ["pg.cs.files.create_folder"]
  },
  {
    id: "pg.cs.internet.search",
    skillSlug: "cs.l0.internet_literacy",
    topics: ["Internet literacy", "Internet", "Browser", "Search"],
    subject: "Computer Science",
    title: "Open a browser and run a careful search",
    skillGoal: "Open a browser, type a clear search, open one result, and judge if it looks trustworthy enough to read.",
    conceptBrief: "A browser is the app for visiting websites. Search engines find pages; you still choose which links to trust.",
    platforms: ["any device with a browser"],
    steps: [
      "Open your browser (Chrome, Edge, Safari, Firefox, etc.).",
      "Click the address/search bar at the top.",
      "Type a clear search in plain words (who/what + what you need), then press Enter.",
      "Before clicking, skim the title and site name \u2014 prefer known schools, libraries, or official sites for facts.",
      "Open one result. Check the page title and URL still match what you wanted.",
      "If it looks wrong or pushy (urgent downloads, odd pop-ups), close the tab and try another result."
    ],
    tryIt: [
      "Search for a simple fact you already know and confirm one trustworthy-looking page agrees.",
      "Bookmark or note the site name \u2014 not every link is equal."
    ],
    commonMistakes: [
      "Clicking the first ad or flashy button without reading.",
      "Typing the whole question into a random toolbar instead of the browser address bar."
    ],
    relatedHowTos: ["pg.cs.safety.password"]
  },
  {
    id: "pg.cs.safety.password",
    skillSlug: "cs.l0.digital_safety",
    topics: ["Digital safety", "Passwords", "Safety"],
    subject: "Computer Science",
    title: "Build a stronger password habit",
    skillGoal: "Create a longer unique passphrase pattern and know never to share it or reuse it everywhere.",
    conceptBrief: "A good password is long, unique to that account, and secret. Passphrases (several words) are easier to remember and harder to guess than short codes.",
    platforms: ["any"],
    steps: [
      "Think of 3\u20134 unrelated words you can remember (not your name, school, or birthday).",
      "Join them with a number or symbol you pick (example pattern only: river-lamp-92-kite).",
      "Use a different password for school/email than for games when you can.",
      'If the site offers "show password" while typing, use it once to check for typos \u2014 then hide it.',
      "Never send your password in chat, email, or to someone claiming to be support.",
      "If a site offers extra login protection (a code on your phone), turn it on when a trusted adult agrees."
    ],
    tryIt: [
      "Practice making one passphrase pattern on paper (do not use a real password you already have).",
      'Say out loud who you would never tell a password to \u2014 including "helpful" strangers online.'
    ],
    commonMistakes: [
      "password123 or your name + birth year \u2014 too easy to guess.",
      "Reusing one password on every site \u2014 one leak unlocks many accounts."
    ],
    relatedHowTos: ["pg.cs.internet.search"]
  }
];
function isPracticalSkillTopic(topic = "", subject = "") {
  const t = String(topic || "").trim();
  const s = String(subject || "").trim();
  if (!t && !s) return false;
  if (LOCAL_PRACTICAL_GUIDES.some((g) => topicMatchesGuide(t, g))) return true;
  if (PRACTICAL_TOPIC_PATTERNS.some((re) => re.test(t))) return true;
  if (/computer\s*science/i.test(s) && /literacy|hardware|software|files|folders|internet|safety|operat/i.test(t)) {
    return true;
  }
  return false;
}
function topicMatchesGuide(topic, guide2) {
  const t = String(topic || "").trim().toLowerCase();
  if (!t) return false;
  return (guide2.topics || []).some((name) => {
    const n = String(name).toLowerCase();
    return t === n || t.includes(n) || n.includes(t);
  });
}
function findPracticalGuide({
  topic = "",
  subject = "",
  skillSlug = "",
  guideId = ""
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
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored[0]?.g || null;
}
function listPracticalGuides({ topic = "", subject = "", skillSlug = "" } = {}) {
  const primary = findPracticalGuide({ topic, subject, skillSlug });
  if (!primary) {
    return LOCAL_PRACTICAL_GUIDES.filter(
      (g) => topicMatchesGuide(topic, g) || skillSlug && g.skillSlug === skillSlug
    );
  }
  const out = [primary];
  const seen = /* @__PURE__ */ new Set([primary.id]);
  for (const id of primary.relatedHowTos || []) {
    const g = LOCAL_PRACTICAL_GUIDES.find((x) => x.id === id);
    if (g && !seen.has(g.id)) {
      seen.add(g.id);
      out.push(g);
    }
  }
  for (const g of LOCAL_PRACTICAL_GUIDES) {
    if (g.skillSlug === primary.skillSlug && !seen.has(g.id)) {
      seen.add(g.id);
      out.push(g);
    }
  }
  return out;
}
function formatPracticalGuideForPrompt(guide2) {
  if (!guide2) return "";
  const steps = (guide2.steps || []).map((s, i) => `  ${i + 1}. ${s}`).join("\n");
  const tryIt = (guide2.tryIt || []).map((s) => `  - ${s}`).join("\n");
  const mistakes = (guide2.commonMistakes || []).map((s) => `  - ${s}`).join("\n");
  const notes = (guide2.platformNotes || []).map((s) => `  - ${s}`).join("\n");
  return [
    `### ${guide2.title}`,
    `Skill goal (student can DO this): ${guide2.skillGoal}`,
    `Concept in one line: ${guide2.conceptBrief}`,
    `Platforms: ${(guide2.platforms || []).join(", ") || "any"}`,
    "How-to steps (teach these so the student can replicate on their device):",
    steps,
    notes ? `Platform tips:
${notes}` : "",
    tryIt ? `Try-it checklist (have them do this):
${tryIt}` : "",
    mistakes ? `Common mistakes to warn about:
${mistakes}` : ""
  ].filter(Boolean).join("\n");
}
function buildPracticalHowToPromptBlock({
  topic = "",
  subject = "",
  studentName = "the student",
  isFirstSession = false
} = {}) {
  const name = studentName || "the student";
  const practical = isPracticalSkillTopic(topic, subject);
  const guides2 = practical ? listPracticalGuides({ topic, subject }).slice(0, 3) : [];
  if (!practical && !guides2.length) return "";
  const library = guides2.length > 0 ? guides2.map((g) => formatPracticalGuideForPrompt(g)).join("\n\n") : "";
  const firstSessionLine = isFirstSession ? `- On the opening arc for a new practical topic: after a short orientation, **promptly offer a hands-on how-to** (do not stay in pure theory for many turns).` : `- If ${name} has only heard theory so far this session, **switch into a hands-on how-to** before more quizzes.`;
  return `## Practical how-to teaching (MANDATORY for this skill topic)

This lesson is a **practical skill**, not pure theory. ${name} must leave able to **do** something on a real device \u2014 not only define terms.

Teaching contract:
${firstSessionLine}
- Pattern for each skill: **(1) what it is in one breath \u2192 (2) numbered how-to steps they can follow \u2192 (3) try-it on their device \u2192 (4) confirm what they did**.
- Use **numbered lists** for procedures. One major procedure at a time; you may send 4\u20137 short steps in a single how-to message when walking through a task (this is allowed and expected for hands-on skills).
- Prefer device-agnostic language, then add a one-line tip for Windows / Mac / Chromebook / phone when useful.
- After steps, give a **try-it checklist** and ask them to do it (or narrate what they see) \u2014 not only answer a definition question.
- Socratic "don't give answers" applies to **reasoning puzzles and graded practice**, NOT to withholding how-to steps. For procedures, **show the steps clearly**, then let them practice.
- Never only lecture definitions for files, folders, apps, browsers, or safety habits \u2014 always pair with a replicable how-to.
- When they ask "how do I\u2026?", answer with steps immediately.

${library ? `CURATED HOW-TO GUIDES (prefer these procedures; adapt wording to ${name}'s age and OS, do not invent conflicting steps):

${library}` : `No curated guide matched exactly \u2014 still invent a clear, safe, age-right step-by-step how-to for "${topic}" that ${name} can replicate.`}`;
}
function practicalHowToDirectives({ topic = "", subject = "" } = {}) {
  if (!isPracticalSkillTopic(topic, subject)) return [];
  const guide2 = findPracticalGuide({ topic, subject });
  const title = guide2?.title || topic || "this skill";
  return [
    `Practical skill topic \u2014 teach hands-on how-to for \u201C${title}\u201D, not theory-only.`,
    "After a short concept hook, walk through numbered steps the student can do on their device, then a try-it check."
  ];
}
function practicalHowToSuggestionPool(topic = "") {
  const short = String(topic || "this").trim().length > 24 ? `${String(topic).trim().slice(0, 23)}\u2026` : String(topic || "this").trim() || "this";
  return [
    "Show me how step by step",
    "Walk me through doing it",
    "What should I click first?",
    `Help me practice ${short} on my device`,
    "Give me a try-it checklist",
    "I did the steps \u2014 check me",
    "Show the Windows way",
    "Show the Mac / Chromebook way",
    "What is a common mistake?"
  ];
}
function buildPracticalOpeningAddendum({
  topicName = "",
  studentName = "the student"
} = {}) {
  const name = studentName || "the student";
  const guide2 = findPracticalGuide({ topic: topicName });
  const skillBit = guide2 ? `Primary hands-on skill to teach soon: "${guide2.title}" \u2014 goal: ${guide2.skillGoal}` : `Identify one concrete hands-on skill inside "${topicName}" they can do on a real device.`;
  return `PRACTICAL SKILL OPENING RULES: After the warm orientation, do NOT stay in abstract theory. In the same opening message or the immediate next turn, offer to walk ${name} through a real how-to (numbered steps they can do on their computer/phone). ${skillBit} Include a soft invitation chip-worthy offer like "Want me to show you step by step how to create a folder?" when relevant. Theory without a do-along path is a failure for this topic.`;
}

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

// src/services/learning/workedExamples.js
var LOCAL_PILOT_EXAMPLES = [
  {
    id: "we.frac.parts_pizza",
    skillSlug: "frac.parts_of_whole",
    topics: ["Fraction sense", "Parts of a whole", "Equal parts"],
    subject: "Math Foundations",
    title: "Pizza halves",
    summary: "A pizza cut into 2 equal parts \u2014 each is 1/2.",
    problem: "A pizza is cut into 2 equal slices. What fraction is one slice?",
    steps: [
      "The whole pizza is 1 whole.",
      "It is split into 2 equal parts, so each part is the same size.",
      "One of those equal parts is written 1/2 (one out of two)."
    ],
    takeaway: "Equal parts of a whole \u2192 unit fraction 1/n.",
    counterexample: "Cutting into 2 parts that are not equal is not halves.",
    kind: "example",
    gradeMin: 2,
    gradeMax: 5,
    source: "local"
  },
  {
    id: "we.frac.parts_chocolate",
    skillSlug: "frac.parts_of_whole",
    topics: ["Fraction sense"],
    subject: "Math Foundations",
    title: "Chocolate bar fourths",
    summary: "Four equal squares make fourths.",
    problem: "A chocolate bar is broken into 4 equal squares. What fraction is one square?",
    steps: [
      "The whole bar is 1 whole.",
      "There are 4 equal squares.",
      "One square is 1 out of 4 equal parts \u2192 1/4."
    ],
    takeaway: "The bottom number counts how many equal pieces make the whole.",
    counterexample: "If the pieces are different sizes, we cannot name them as equal-part fractions yet.",
    kind: "example",
    gradeMin: 2,
    gradeMax: 5,
    source: "local"
  },
  {
    id: "we.frac.num_den_bar",
    skillSlug: "frac.numerator_denominator",
    topics: ["Fraction sense", "Numerator and denominator", "Reading fractions"],
    subject: "Math Foundations",
    title: "Reading 3/4 on a bar",
    summary: "Numerator counts shaded parts; denominator counts equal parts.",
    problem: "A bar is split into 4 equal pieces and 3 are shaded. What fraction is shaded?",
    steps: [
      "Count the equal pieces in the whole bar \u2192 4. That is the denominator.",
      "Count the shaded pieces \u2192 3. That is the numerator.",
      "Write shaded-over-whole: 3/4."
    ],
    takeaway: "Numerator = how many; denominator = how many equal parts make the whole.",
    counterexample: "Do not swap top and bottom \u2014 4/3 would mean something different.",
    kind: "example",
    gradeMin: 2,
    gradeMax: 5,
    source: "local"
  },
  {
    id: "we.frac.num_den_swap_counter",
    skillSlug: "frac.numerator_denominator",
    topics: ["Fraction sense"],
    subject: "Math Foundations",
    title: "Not upside-down!",
    summary: "Counterexample: swapping num/den changes the amount.",
    problem: "Is 2/5 the same as 5/2?",
    steps: [
      "2/5 means 2 equal fifths of a whole \u2014 less than 1 whole.",
      "5/2 means 5 halves \u2014 more than 2 wholes.",
      "They are not the same amount."
    ],
    takeaway: "Top and bottom have different jobs \u2014 do not flip them casually.",
    counterexample: "",
    kind: "counterexample",
    gradeMin: 3,
    gradeMax: 6,
    source: "local"
  },
  {
    id: "we.frac.number_line_three_fourths",
    skillSlug: "frac.number_line",
    topics: ["Fractions on a number line", "Fraction sense"],
    subject: "Math Foundations",
    title: "3/4 on the number line",
    summary: "Split 0\u20131 into fourths; count three jumps.",
    problem: "Where is 3/4 on a number line from 0 to 1?",
    steps: [
      "Draw a line from 0 to 1.",
      "Split the space into 4 equal jumps (fourths).",
      "Start at 0 and take 3 jumps \u2192 that point is 3/4."
    ],
    takeaway: "The denominator is how many equal jumps fill 0 to 1; the numerator is how many jumps you take.",
    counterexample: "Marking 3 tick marks without equal spacing is not a fair number line.",
    kind: "example",
    gradeMin: 3,
    gradeMax: 5,
    source: "local"
  },
  {
    id: "we.frac.equiv_double",
    skillSlug: "frac.equivalent",
    topics: ["Equivalent fractions", "Fraction sense"],
    subject: "Math Foundations",
    title: "Same amount, different pieces",
    summary: "1/2 = 2/4 by splitting each half in two.",
    problem: "Show that 1/2 is the same amount as 2/4.",
    steps: [
      "Start with 1/2 of a bar.",
      "Split each half into 2 equal mini-pieces \u2192 the whole now has 4 equal pieces.",
      "The shaded half is now 2 of those 4 pieces \u2192 2/4.",
      "Same shaded amount, different writing: 1/2 = 2/4."
    ],
    takeaway: "Multiply (or divide) top and bottom by the same number to make equivalents.",
    counterexample: "Adding the same number to top and bottom does not keep the value.",
    kind: "example",
    gradeMin: 3,
    gradeMax: 6,
    source: "local"
  },
  {
    id: "we.frac.equiv_add_counter",
    skillSlug: "frac.equivalent",
    topics: ["Equivalent fractions"],
    subject: "Math Foundations",
    title: "Adding to both sides is not equivalence",
    summary: "Counterexample: 1/2 is not 2/3.",
    problem: "Someone says 1/2 = 2/3 because they added 1 to top and bottom. Is that right?",
    steps: [
      "1/2 of a bar is half shaded.",
      "2/3 of a bar is more than half shaded.",
      "They are different amounts \u2014 adding to top and bottom is not a safe move."
    ],
    takeaway: "Only multiply or divide top and bottom by the same nonzero number.",
    counterexample: "",
    kind: "counterexample",
    gradeMin: 3,
    gradeMax: 6,
    source: "local"
  },
  {
    id: "we.frac.compare_same_den",
    skillSlug: "frac.compare",
    topics: ["Comparing fractions", "Fraction sense"],
    subject: "Math Foundations",
    title: "Same-size pieces",
    summary: "With the same denominator, larger numerator is larger.",
    problem: "Which is larger, 2/5 or 4/5?",
    steps: [
      "Both fractions have denominator 5 \u2192 pieces are the same size.",
      "2/5 means 2 pieces; 4/5 means 4 pieces.",
      "More same-size pieces \u2192 4/5 is larger."
    ],
    takeaway: "Same denominator \u2192 compare numerators.",
    counterexample: "With different denominators, bigger top is not always bigger overall.",
    kind: "example",
    gradeMin: 3,
    gradeMax: 6,
    source: "local"
  },
  {
    id: "we.frac.compare_bigger_bottom_counter",
    skillSlug: "frac.compare",
    topics: ["Comparing fractions"],
    subject: "Math Foundations",
    title: "Bigger bottom is not bigger amount",
    summary: "Counterexample: 1/2 vs 1/8.",
    problem: "Is 1/8 bigger than 1/2 because 8 is bigger than 2?",
    steps: [
      "1/2 is one of two equal parts \u2014 half the whole.",
      "1/8 is one of eight equal parts \u2014 a much smaller bite.",
      "So 1/2 is larger, even though 8 > 2."
    ],
    takeaway: "For unit fractions, a larger denominator means smaller pieces.",
    counterexample: "",
    kind: "counterexample",
    gradeMin: 3,
    gradeMax: 6,
    source: "local"
  },
  {
    id: "we.frac.add_like_pizza",
    skillSlug: "frac.add_like",
    topics: ["Adding fractions"],
    subject: "Math Foundations",
    title: "Adding same-size slices",
    summary: "Keep the denominator; add the tops.",
    problem: "What is 1/6 + 4/6?",
    steps: [
      "Both pieces are sixths \u2014 same size.",
      "Add the numerators: 1 + 4 = 5.",
      "Keep the denominator 6 \u2192 5/6."
    ],
    takeaway: "Like denominators: add tops, keep the bottom.",
    counterexample: "Do not add denominators (1/6 + 4/6 is not 5/12).",
    kind: "example",
    gradeMin: 3,
    gradeMax: 6,
    source: "local"
  },
  {
    id: "we.frac.add_unlike_thirds_sixths",
    skillSlug: "frac.add_unlike",
    topics: ["Adding fractions"],
    subject: "Math Foundations",
    title: "Common pieces first",
    summary: "Rewrite with a common denominator, then add.",
    problem: "What is 1/3 + 1/6?",
    steps: [
      "Thirds and sixths are different sizes \u2014 make them match.",
      "1/3 = 2/6 (split each third in half).",
      "2/6 + 1/6 = 3/6, which is also 1/2."
    ],
    takeaway: "Unlike denominators: find equal-size pieces first, then add.",
    counterexample: "Adding tops and bottoms separately (1/3 + 1/6 \u2260 2/9).",
    kind: "example",
    gradeMin: 4,
    gradeMax: 7,
    source: "local"
  },
  {
    id: "we.alg.variable_bag",
    skillSlug: "alg.variable_as_unknown",
    topics: ["Variables & unknowns", "Simple equations"],
    subject: "Math Foundations",
    title: "A mystery bag",
    summary: "A letter stands for an unknown amount.",
    problem: "A bag has some marbles. Call that number m. You add 3 marbles and now have 10. What does that mean?",
    steps: [
      "m stands for how many were in the bag at the start.",
      "Adding 3 means m + 3.",
      "Together that equals 10: m + 3 = 10."
    ],
    takeaway: "A letter is a stand-in for a number we do not know yet.",
    counterexample: "m is not a label for 'marbles word' \u2014 it is a number amount.",
    kind: "example",
    gradeMin: 5,
    gradeMax: 8,
    source: "local"
  },
  {
    id: "we.alg.balance_scale",
    skillSlug: "alg.balance_idea",
    topics: ["Variables & unknowns", "Simple equations"],
    subject: "Math Foundations",
    title: "Keep the scale even",
    summary: "Whatever you do to one side, do to the other.",
    problem: "A balance has a box and 2 cubes on the left, and 8 cubes on the right. It is balanced. What stays true if we remove 2 cubes from both sides?",
    steps: [
      "Balanced means both sides have the same total weight.",
      "Remove 2 cubes from the left and 2 from the right.",
      "It is still balanced \u2014 now the box alone matches 6 cubes."
    ],
    takeaway: "Equality stays true when both sides get the same change.",
    counterexample: "Removing cubes from only one side tips the balance.",
    kind: "example",
    gradeMin: 5,
    gradeMax: 8,
    source: "local"
  },
  {
    id: "we.alg.balance_one_step",
    skillSlug: "alg.one_step_equation",
    topics: ["Simple equations", "One-step equations"],
    subject: "Math Foundations",
    title: "Balance scale +3",
    summary: "Undo addition with subtraction on both sides.",
    problem: "Solve x + 3 = 10.",
    steps: [
      "Think of a balance: left side x + 3, right side 10.",
      "Subtract 3 from both sides to keep balance.",
      "x + 3 \u2212 3 = 10 \u2212 3 \u2192 x = 7.",
      "Check: 7 + 3 = 10 \u2713"
    ],
    takeaway: "Do the same undo-step on both sides.",
    counterexample: "Only changing one side tips the balance.",
    kind: "example",
    gradeMin: 5,
    gradeMax: 8,
    source: "local"
  },
  {
    id: "we.alg.one_step_multiply",
    skillSlug: "alg.one_step_equation",
    topics: ["Simple equations"],
    subject: "Math Foundations",
    title: "Undo multiply with divide",
    summary: "3x = 12 \u2192 divide both sides by 3.",
    problem: "Solve 3x = 12.",
    steps: [
      "3x means 3 groups of x.",
      "Divide both sides by 3 to undo the multiply.",
      "x = 12 \xF7 3 = 4.",
      "Check: 3 \xD7 4 = 12 \u2713"
    ],
    takeaway: "Multiplication and division undo each other on both sides.",
    counterexample: "Subtracting 3 from both sides does not undo 'times 3'.",
    kind: "example",
    gradeMin: 5,
    gradeMax: 8,
    source: "local"
  }
];
var remoteCatalog = null;
var lastPromptBlock = "";
function parseGradeNumber(grade) {
  if (grade == null || grade === "") return null;
  if (typeof grade === "number" && Number.isFinite(grade)) {
    return Math.max(0, Math.min(12, Math.round(grade)));
  }
  const s = String(grade).trim().toLowerCase();
  if (s === "k" || s === "kindergarten") return 0;
  const m = s.match(/(\d{1,2})/);
  if (!m) return null;
  return Math.max(0, Math.min(12, parseInt(m[1], 10)));
}
function normalizeExample(raw) {
  if (!raw) return null;
  return {
    id: raw.id || raw.slug,
    skillSlug: raw.skillSlug || raw.skill_slug || null,
    skillName: raw.skillName || null,
    topics: raw.topics || raw.topic_names || [],
    subject: raw.subject || raw.subject_name || "",
    title: raw.title,
    summary: raw.summary || "",
    problem: raw.problem,
    steps: raw.steps || [],
    takeaway: raw.takeaway || "",
    counterexample: raw.counterexample || "",
    kind: raw.kind || "example",
    gradeMin: raw.gradeMin ?? raw.grade_min ?? 0,
    gradeMax: raw.gradeMax ?? raw.grade_max ?? 12,
    languageNotes: raw.languageNotes || raw.language_notes || "",
    source: raw.source || "library",
    matchScore: raw.matchScore
  };
}
function matchesTopic(ex, topic) {
  const t = (topic || "").trim().toLowerCase();
  if (!t) return false;
  return (ex.topics || []).some((name) => {
    const n = (name || "").trim().toLowerCase();
    return n && (t === n || t.includes(n) || n.includes(t));
  });
}
function matchesGrade(ex, grade) {
  const g = parseGradeNumber(grade);
  if (g == null) return true;
  const lo = ex.gradeMin ?? 0;
  const hi = ex.gradeMax ?? 12;
  return g >= lo && g <= hi;
}
function scoreLocal(ex, { subject, topic, skillSlug, grade, kind }) {
  let score = 0;
  const sub = (subject || "").toLowerCase();
  if (skillSlug && ex.skillSlug === skillSlug) score += 20;
  if (matchesTopic(ex, topic)) {
    score += 12;
    if ((ex.topics || []).some((n) => (n || "").toLowerCase() === (topic || "").toLowerCase())) {
      score += 6;
    }
  }
  if (sub && ex.subject) {
    const sn = ex.subject.toLowerCase();
    if (sn === sub || sn.includes(sub.slice(0, 8)) || sub.includes(sn.slice(0, 8))) {
      score += 4;
    }
  }
  if (matchesGrade(ex, grade)) score += 3;
  else score -= 8;
  if (kind && ex.kind === kind) score += 2;
  if (!kind && ex.kind === "example") score += 1;
  return score;
}
function catalogPool() {
  if (remoteCatalog?.length) return remoteCatalog.map(normalizeExample);
  return LOCAL_PILOT_EXAMPLES.map((e) => ({ ...e }));
}
function findWorkedExample({
  subject = "",
  topic = "",
  skillSlug = null,
  grade = null,
  kind = "example"
} = {}) {
  const pool = catalogPool().filter((ex) => {
    if (kind && ex.kind && ex.kind !== kind && kind !== "any") return false;
    return true;
  });
  let best = null;
  let bestScore = -999;
  for (const ex of pool) {
    const score = scoreLocal(ex, {
      subject,
      topic,
      skillSlug,
      grade,
      kind: kind === "any" ? "" : kind
    });
    if (score > bestScore) {
      bestScore = score;
      best = ex;
    }
  }
  if (bestScore >= 8) return best;
  if (skillSlug) {
    const bySkill = pool.find((e) => e.skillSlug === skillSlug);
    if (bySkill) return bySkill;
  }
  if (/fraction|math foundation|equal part|numerator|half|quarter/i.test(`${topic} ${subject}`)) {
    return pool.find((e) => e.skillSlug?.startsWith("frac.") && e.kind === "example") || null;
  }
  if (/equation|algebra|variable|balance/i.test(`${topic} ${subject}`)) {
    return pool.find((e) => e.skillSlug?.startsWith("alg.") && e.kind === "example") || null;
  }
  return bestScore > 0 ? best : null;
}
function buildLibraryPromptBlock(examples = [], { maxExamples = 2 } = {}) {
  const list = (examples || []).filter(Boolean).slice(0, maxExamples);
  if (!list.length) return lastPromptBlock || "";
  const lines = [
    "CURATED WORKED-EXAMPLE LIBRARY (prefer these over inventing new ones):",
    "Use age-appropriate language. Do not dump every example \u2014 pick the best fit."
  ];
  for (const ex of list) {
    lines.push(`\u2014 [${ex.kind || "example"}] ${ex.title} (id=${ex.id})`);
    lines.push(`  Problem: ${ex.problem}`);
    if (ex.steps?.length) {
      lines.push(`  Steps: ${ex.steps.join(" \u2192 ")}`);
    }
    if (ex.takeaway) lines.push(`  Takeaway: ${ex.takeaway}`);
    if (ex.counterexample) {
      lines.push(`  Gentle counterexample: ${ex.counterexample}`);
    }
  }
  lines.push(
    "When you use a library example, stay faithful to its structure; you may lightly adapt names/interests for engagement."
  );
  return lines.join("\n");
}
function getCachedLibraryPromptBlock() {
  return lastPromptBlock || "";
}

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
function buildLadderTutorBlock({
  studentName,
  topic,
  subject,
  level,
  reasonText,
  workedExample = null,
  easierSkill = null,
  interestsStr = "their interests"
} = {}) {
  const name = studentName || "the student";
  const rank = normalizeLevel(level);
  const meta = levelMeta(rank);
  const why = reasonText || "this part feels tricky";
  if (rank === InterventionLevel.MICRO_HINT) {
    return `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
INTERVENTION LADDER \u2014 LEVEL 1: MICRO-HINT
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${name} needs a light scaffold on "${topic}" (${subject}). Context: ${why}.

Your job at this level:
1. Give ONE small hint or leading question \u2014 not the full answer.
2. Stay mostly Socratic. Do not dump steps or a full worked solution.
3. Keep the message short (2\u20134 sentences). Celebrate effort.
4. If they still struggle after this, the app may offer a stronger level \u2014 do not escalate yourself into a full lecture.
5. Never mention "intervention ladder", levels, or scores by those names.
`;
  }
  if (rank === InterventionLevel.WORKED_EXAMPLE) {
    const libraryBlock = workedExample ? `
Prefer this curated worked example (adapt language to age; do not read tags aloud):
Title: ${workedExample.title}
Problem: ${workedExample.problem}
Steps:
${(workedExample.steps || []).map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
Takeaway: ${workedExample.takeaway || ""}
${workedExample.counterexample ? `Common mix-up to gently contrast: ${workedExample.counterexample}` : ""}
` : `
No library example matched \u2014 invent one short, concrete worked example tied to ${name}'s interests (${interestsStr}) when natural.
`;
    return `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
INTERVENTION LADDER \u2014 LEVEL 2: WORKED EXAMPLE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${name} needs a modeled example on "${topic}" (${subject}). Context: ${why}.

Your job at this level:
1. Warmly acknowledge the sticky part without shame.
2. Present ONE clear worked example (problem \u2192 steps \u2192 answer), then invite ${name} to try a parallel \u201Ctwin\u201D problem.
3. Do not open a full multi-step course guide yet \u2014 one example + one try.
4. Check understanding with one simple question after the example.
5. Never mention ladder levels or internal tracking by those names.
${libraryBlock}
`;
  }
  if (rank === InterventionLevel.BREAK_OR_EASIER) {
    const skillLine = easierSkill ? `Suggested easier related skill: \u201C${easierSkill.name}\u201D${easierSkill.topic ? ` (often practiced under \u201C${easierSkill.topic}\u201D)` : ""}. Reason: ${easierSkill.reason || "prerequisite / foundation"}.` : `No graph suggestion available \u2014 offer a simpler warm-up on the same topic or a 30-second reset breath/stretch, then one easy win.`;
    return `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
INTERVENTION LADDER \u2014 LEVEL 4: BREAK / EASIER PATH
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${name} needs a softer path on "${topic}" (${subject}). Context: ${why}.

Your job at this level:
1. Normalize that brains need resets \u2014 this is strength, not failure.
2. Offer a brief break idea (stretch, water, 3 slow breaths) OR an easier related skill warm-up.
3. ${skillLine}
4. If they choose the easier skill, start with a tiny confidence-building question on that skill \u2014 do not pile on the hard topic yet.
5. Keep tone warm and unhurried. No shame language.
6. Never mention ladder levels or scores by those names.
`;
  }
  return `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
INTERVENTION LADDER \u2014 LEVEL 3: STEP-BY-STEP GUIDE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${name} is struggling with "${topic}" in ${subject}. Context: ${why}. You entered guided teaching mode.

Your job in this mode:
1. Warmly acknowledge that this part is tricky \u2014 normalize struggle without shame.
2. Teach with a clear, patient step-by-step guide: explain concepts, then show worked examples / demonstrations.
3. Break ideas into small steps. After each step, check understanding with a simple question before moving on.
4. Use concrete examples (and visual / hands-on ideas when helpful). Tie examples to ${name}'s interests (${interestsStr}) when natural.
5. You MAY fully explain and demonstrate \u2014 this is not pure Socratic discovery mode right now.
6. Stay in guide mode until the student exits (UI action) or clearly wants to return to practice.
7. Keep language warm and age-appropriate. Still celebrate micro-wins.
8. Do not mention "intervention mode", ladder levels, scores, or internal tracking by those names.
${workedExample ? `Optional library example to prefer when relevant: ${workedExample.title} \u2014 ${workedExample.problem}` : ""}
`;
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
  const mc = params.misconceptionLabel || "the sticky pattern";
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
      return params.practicalHowTo ? `Hands-on full guide for \xAB${skill}\xBB: short concept \u2192 numbered device how-to (complete short procedure OK) \u2192 try-it checklist \u2192 confirm what they did. Do not withhold steps.` : `Walk step-by-step: explain \u2192 everyday example \u2192 tiny check. One step per message. Never dump the whole solution. For practical computer skills, use numbered how-to steps they can do on a device.`;
    case PedagogicalAction.EASIER_PATH:
      return params.prereqLabel ? `Warmly shift to foundation skill \xAB${params.prereqLabel}\xBB with a quick visual win, then bridge back later.` : `Offer a softer path or simpler related idea. Normalize the reset. One easy win before returning.`;
    case PedagogicalAction.OFFER_BREAK:
      return `Normalize needing a pause. Offer a short break or easier warm-up. No pressure to push through.`;
    case PedagogicalAction.REMEDIATE_MISCONCEPTION:
      return `Gently rework misconception \xAB${mc}\xBB. Use the playbook check question if available. Do not shame. Confirm with one targeted check.`;
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
      return params.practicalHowTo ? `Practical how-to for \xAB${skill}\xBB: one-line concept, then numbered steps the student can do on their device, then a try-it check. Show the procedure clearly \u2014 do not turn "how do I\u2026?" into a riddle.` : `Give a clear mini-explanation with one everyday example, then one check question. Still do not dump a full solution dump. If the skill is hands-on, prefer numbered how-to steps + try-it.`;
    case PedagogicalAction.CONTINUE_SOCRATIC:
    default:
      return params.practicalHowTo ? `Practical skill default: after any brief check-in, prioritize a hands-on how-to for \xAB${skill}\xBB (numbered steps + try-it). Guide discovery on reasoning checks, but never withhold procedures.` : `Continue adaptive Socratic tutoring: one question at a time, guide before giving, real-world hook when teaching. For hands-on skills, switch to numbered how-to + try-it.`;
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
  const adi = state.adi || context.adi || null;
  const reviewMode = Boolean(context.reviewMode);
  const challengeMode = Boolean(context.challengeMode);
  const multiStepActive = Boolean(context.multiStepActive);
  const assessmentActive = Boolean(context.assessmentActive);
  const dueReview = context.dueReview || null;
  const profile = context.profile || null;
  const consecutiveIncorrect = context.consecutiveIncorrect ?? struggle.consecutiveIncorrect ?? 0;
  const affect = last?.affect || context.affect || context.lastCheckIn?.affect || null;
  const lowEnergy = Boolean(
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
  if (reviewMode) {
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
  if (context.independenceActive) {
    return finalize(PedagogicalAction.INDEPENDENT_PRACTICE, {
      reasons: ["independence_twin_active"],
      params: {
        ...params,
        noScaffold: true,
        transfer: Boolean(context.independenceTransfer)
      },
      confidence: 0.95,
      gap: gapOf("independent_success", "solo_twin")
    });
  }
  if (context.independenceOffer) {
    return finalize(PedagogicalAction.INDEPENDENT_PRACTICE, {
      reasons: ["independence_twin_offered"],
      params: {
        ...params,
        noScaffold: true,
        transfer: Boolean(context.independenceOffer?.transfer)
      },
      confidence: 0.88,
      gap: gapOf("independent_attempt", "post_scaffold")
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
  if (lowEnergy) {
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
    const preferLight = Boolean(adi?.preferLighterHelp);
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
  if (adi?.preferLighterHelp && (last?.correctness === "correct" || (state.knowledge?.topicScore || 0) >= 60)) {
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
  if (dueReview && !last && context.sessionPhase === "open") {
    reasons.push("due_review_available");
    return finalize(PedagogicalAction.REVIEW, {
      reasons,
      params: {
        ...params,
        skillLabel: dueReview.skillLabel || dueReview.skillSlug,
        skillSlug: dueReview.skillSlug
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
    const practicalQ = isPracticalSkillTopic(params.topic, params.subject);
    const guideQ = practicalQ ? findPracticalGuide({ topic: params.topic, subject: params.subject }) : null;
    return finalize(PedagogicalAction.EXPLAIN, {
      reasons: practicalQ ? [...reasons, "practical_how_to_question"] : reasons,
      params: {
        ...params,
        practicalHowTo: practicalQ,
        skillLabel: guideQ?.title || params.topic,
        guideId: guideQ?.id || null
      },
      confidence: practicalQ ? 0.72 : 0.62,
      gap: gapOf(
        practicalQ ? "can_do_procedure" : "concept_clarity",
        "curious_question"
      )
    });
  }
  const practicalSkill = isPracticalSkillTopic(params.topic, params.subject) || Boolean(context.preferPracticalHowTo);
  const guide2 = practicalSkill ? findPracticalGuide({ topic: params.topic, subject: params.subject }) : null;
  const sessionPhase = context.sessionPhase || "";
  const howToRequest = Boolean(context.preferPracticalHowTo) && (last?.isQuestion || /how\s+(do|to|can)|show\s+me|step\s*by\s*step|walk\s+me/i.test(
    String(last?.studentText || last?.text || "")
  ));
  const earlyPractical = practicalSkill && (context.isFirstSession || sessionPhase === "open" || sessionPhase === "orient" || !last || howToRequest);
  if (earlyPractical) {
    reasons.push("practical_skill_howto");
    return finalize(PedagogicalAction.EXPLAIN, {
      reasons,
      params: {
        ...params,
        practicalHowTo: true,
        skillLabel: guide2?.title || params.topic,
        guideId: guide2?.id || null
      },
      confidence: 0.7,
      gap: gapOf("can_do_procedure", "theory_without_practice"),
      alternatives: [
        PedagogicalAction.FULL_GUIDE,
        PedagogicalAction.CONTINUE_SOCRATIC,
        PedagogicalAction.WORKED_EXAMPLE
      ]
    });
  }
  reasons.push("default_socratic");
  const defaultParams = practicalSkill ? {
    ...params,
    practicalHowTo: true,
    skillLabel: guide2?.title || params.topic,
    guideId: guide2?.id || null
  } : params;
  return finalize(PedagogicalAction.CONTINUE_SOCRATIC, {
    reasons: practicalSkill ? [...reasons, "practical_topic_keep_howto_ready"] : reasons,
    params: defaultParams,
    confidence: 0.55,
    gap: gapOf(
      practicalSkill ? "can_do_procedure" : "steady_learning",
      "routine_turn"
    ),
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
  const stuck = consecutiveIncorrect >= 3 || consecutiveIncorrect >= 2 && last?.correctness === "incorrect" || last?.affect === "frustrated" && consecutiveIncorrect >= 2;
  if (!stuck) return null;
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
  const weak = primaries.find((s) => (s.score ?? 50) < 40);
  if (weak || consecutiveIncorrect >= 3) {
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

// src/constants/onboarding.js
var K12_GRADE_OPTIONS = [
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "High School (9\u201310)",
  "High School (11\u201312)"
];
var HIGHER_ED_GRADE_OPTIONS = [
  "College / University (Year 1)",
  "College / University (Year 2)",
  "College / University (Year 3)",
  "College / University (Year 4+)",
  "Graduate / Master's",
  "Professional / Continuing Ed"
];
var GRADE_OPTIONS = [
  ...K12_GRADE_OPTIONS,
  ...HIGHER_ED_GRADE_OPTIONS
];
var LEARNING_STYLE_OPTIONS = [
  {
    id: "visual",
    label: "Visual & Diagrams",
    desc: "Learns best with pictures, charts, and spatial models."
  },
  {
    id: "story",
    label: "Story & Real-World",
    desc: "Understands concepts through real-world scenarios and storytelling."
  },
  {
    id: "logic",
    label: "Step-by-Step Logic",
    desc: "Prefers clear rules, structured breakdowns, and logical order."
  },
  {
    id: "energetic",
    label: "Fun & Energetic",
    desc: "Thrives with high energy, frequent praise, and interactive challenges."
  }
];

// src/constants/familiarity.js
var FAMILIARITY_LEVELS = [
  {
    id: "new",
    label: "Brand new",
    short: "New",
    hint: "Never studied this before",
    pacing: "gentle_intro"
  },
  {
    id: "beginner",
    label: "I've heard of it",
    short: "Beginner",
    hint: "Know the name, not the details",
    pacing: "gentle_intro"
  },
  {
    id: "some",
    label: "I know the basics",
    short: "Basics",
    hint: "Ready to build on foundations",
    pacing: "refresh_then_build"
  },
  {
    id: "comfortable",
    label: "Fairly comfortable",
    short: "Comfortable",
    hint: "Want depth, challenge, or polish",
    pacing: "goal_focused"
  },
  {
    id: "reviewing",
    label: "Reviewing / exam prep",
    short: "Review",
    hint: "Refresh and practice for a test",
    pacing: "review"
  }
];
var DEFAULT_FAMILIARITY = "new";
function familiarityMeta(id) {
  return FAMILIARITY_LEVELS.find((f) => f.id === id) || FAMILIARITY_LEVELS.find((f) => f.id === DEFAULT_FAMILIARITY);
}

// src/services/safety/ageBand.js
function resolveAgeBand(grade) {
  if (!grade || typeof grade !== "string") return "unknown";
  const g = grade.toLowerCase().trim();
  if (g.includes("college") || g.includes("university") || g.includes("graduate") || g.includes("master") || g.includes("doctoral") || g.includes("phd") || g.includes("professional") || g.includes("continuing") || g.includes("undergrad")) {
    return "adult";
  }
  if (g.includes("high school") || g.includes("a-level") || g.includes("gcse")) {
    return "teen";
  }
  const numMatch = g.match(/\b(1[0-2]|[3-9])(st|nd|rd|th)?\b/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 3 && n <= 6) return "child";
    if (n >= 7 && n <= 12) return "teen";
  }
  const yearMatch = g.match(/\byear\s*(\d{1,2})\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 3 && y <= 7) return "child";
    if (y >= 8 && y <= 13) return "teen";
  }
  if (g.includes("middle school") || g.includes("junior high")) return "teen";
  if (g.includes("elementary") || g.includes("primary") || g.includes("grade 3") || g.includes("grade 4") || g.includes("grade 5") || g.includes("grade 6")) {
    return "child";
  }
  if (g.includes("3rd") || g.includes("4th") || g.includes("5th") || g.includes("6th")) {
    return "child";
  }
  if (g.includes("7th") || g.includes("8th") || g.includes("9\u201310") || g.includes("9-10") || g.includes("11\u201312") || g.includes("11-12")) {
    return "teen";
  }
  return "unknown";
}
function ageBandLabel(band) {
  switch (band) {
    case "child":
      return "younger learner";
    case "teen":
      return "teen learner";
    case "adult":
      return "adult learner";
    default:
      return "learner";
  }
}
function useChildSafeDefaults(band) {
  return band === "child" || band === "unknown";
}

// src/services/safety/policy.js
function buildUniversalSafetyRules() {
  return `
CHILD SAFETY & CONTENT POLICY (non-negotiable \u2014 always follow):
1. You are an educational tutor only. Stay on learning topics appropriate for school-age students.
2. Never produce sexual content, romance with the student, pornographic material, or erotic roleplay.
3. Never provide instructions for weapons, explosives, self-harm, suicide, or illegal activities.
4. Never bully, shame, or mock the student. Normalize struggle; be warm and patient.
5. If the student discloses abuse, self-harm, or suicidal thoughts: STOP normal tutoring. Respond briefly with care, urge them to talk to a trusted adult (parent, caregiver, teacher, counselor) right away, and do not dig for graphic details. Do not claim to be a therapist or crisis counselor.
6. If they ask for adult/violent/illegal content off-lesson: refuse clearly, redirect to the lesson, and stay kind.
7. Do not collect passwords, home addresses, or ask them to meet in real life.
8. Do not pretend to be a real human friend outside of tutoring \u2014 stay in tutor character without claiming consciousness or a private life with them.
9. Prefer short, age-appropriate language. Avoid graphic descriptions of injury, death, or violence even in history/science unless strictly educational and non-sensational.
`.trim();
}
function buildAgeAwarePolicyBlock(grade, studentName = "the student") {
  const band = resolveAgeBand(grade);
  const label = ageBandLabel(band);
  const name = studentName || "the student";
  const strictChild = useChildSafeDefaults(band);
  let ageSpecific = "";
  if (band === "child" || band === "unknown") {
    ageSpecific = `
Age band: ${label} (treat as a child \u2014 strictest safe mode).
- Use simple vocabulary and short sentences; explain big words.
- Avoid mature themes, dating, alcohol, drugs, or graphic media references.
- Examples should be gentle (animals, school, games, nature) \u2014 never scary or violent.
- If ${name} seems upset, comfort briefly then offer to pause or get a grown-up.
`.trim();
  } else if (band === "teen") {
    ageSpecific = `
Age band: ${label}.
- Language can be a bit more mature but still school-appropriate.
- No sexual content, substance use how-to, or detailed violence.
- Respect growing independence; still escalate distress to trusted adults, not peer-only advice.
`.trim();
  } else {
    ageSpecific = `
Age band: ${label}.
- Adult learner: professional, clear tone is fine.
- Still refuse illegal/harmful content and avoid graphic self-harm discussion; encourage professional help if crisis language appears.
`.trim();
  }
  const unknownNote = strictChild && band === "unknown" ? `
Grade was missing/unclear \u2014 defaulting to child-safe tone for ${name}.` : "";
  return `${buildUniversalSafetyRules()}

${ageSpecific}${unknownNote}`;
}

// src/services/learning/manipulatives.js
var MANIPULATIVE_TYPES = {
  FRACTION_BAR: "fraction-bar",
  NUMBER_LINE: "number-line"
};
var TOPIC_MANIPULATIVES = {
  "Fraction sense": [MANIPULATIVE_TYPES.FRACTION_BAR],
  "Fractions on a number line": [
    MANIPULATIVE_TYPES.NUMBER_LINE,
    MANIPULATIVE_TYPES.FRACTION_BAR
  ],
  "Equivalent fractions": [MANIPULATIVE_TYPES.FRACTION_BAR],
  "Comparing fractions": [
    MANIPULATIVE_TYPES.FRACTION_BAR,
    MANIPULATIVE_TYPES.NUMBER_LINE
  ],
  "Adding fractions": [MANIPULATIVE_TYPES.FRACTION_BAR]
};
function manipulativesForTopic(topicName) {
  if (!topicName) return [MANIPULATIVE_TYPES.FRACTION_BAR];
  const exact = TOPIC_MANIPULATIVES[topicName];
  if (exact) return exact;
  const t = topicName.toLowerCase();
  if (t.includes("number line")) {
    return [MANIPULATIVE_TYPES.NUMBER_LINE, MANIPULATIVE_TYPES.FRACTION_BAR];
  }
  if (t.includes("fraction") || t.includes("math foundation")) {
    return [MANIPULATIVE_TYPES.FRACTION_BAR];
  }
  return [];
}
function buildVisualPromptHint(topicName) {
  const tools = manipulativesForTopic(topicName);
  if (!tools.length) return "";
  const names = tools.map(
    (t) => t === MANIPULATIVE_TYPES.NUMBER_LINE ? "number-line" : "fraction-bar"
  ).join(" or ");
  return `
Interactive visuals (student has manipulatives open in the lesson UI):
- When a concrete model helps, ask them to try the on-screen ${names}.
- To set the model yourself, append a hidden tag at the end of your message (never mention the tag):
  \u27E6visual type="fraction-bar" num="3" den="4"\u27E7
  or \u27E6visual type="number-line" num="1" den="2"\u27E7
- Prefer small denominators (\u226412). Celebrate when their model matches the idea.
`.trim();
}

// src/services/learning/multiStepEngine.js
var StepStatus = {
  PENDING: "pending",
  CURRENT: "current",
  CORRECT: "correct",
  PARTIAL: "partial",
  INCORRECT: "incorrect",
  SKIPPED: "skipped"
};
function scorePartialCredit(session) {
  if (!session?.steps?.length) {
    return { ratio: 0, correct: 0, total: 0, percent: 0 };
  }
  const total = session.steps.length;
  let correct = 0;
  let partial = 0;
  for (const s of session.steps) {
    if (s.status === StepStatus.CORRECT) correct += 1;
    else if (s.status === StepStatus.PARTIAL) partial += 0.5;
  }
  const score = correct + partial;
  const ratio = score / total;
  return {
    ratio: Number(ratio.toFixed(3)),
    correct,
    partial,
    total,
    percent: Math.round(ratio * 100),
    completed: session.status === "completed"
  };
}
function buildMultiStepTutorBlock(session) {
  if (!session?.problem) return "";
  const p = session.problem;
  const cur = session.steps[session.currentIndex];
  const credit = scorePartialCredit(session);
  const stepLines = session.steps.map((s) => {
    const mark = s.status === StepStatus.CORRECT ? "\u2713" : s.status === StepStatus.CURRENT ? "\u2192" : s.status === StepStatus.PARTIAL ? "~" : s.status === StepStatus.SKIPPED ? "\xB7" : "\u25CB";
    return `  ${mark} ${s.index}. ${s.label} (expected machine: ${s.expected}) [${s.status}]`;
  }).join("\n");
  return `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
MULTI-STEP \u201CSHOW YOUR WORK\u201D MODE \u2014 ACTIVE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Problem: ${p.promptPlain || p.title}
Skill: ${p.skillSlug || "pilot"}
Partial credit so far: ${credit.percent}% (${credit.correct}/${credit.total} steps solid)

Current step ${cur ? cur.index : "\u2014"}: ${cur?.label || ""}
Student-facing prompt for this step: ${cur?.prompt || "Continue the work."}

Step checklist (machine-only expectations \u2014 do not dump all answers):
${stepLines}

Your job in this mode:
1. Keep the student on ONE step at a time. Celebrate each correct micro-step.
2. If wrong, give a Socratic nudge or the step hint spirit \u2014 do not spoil later steps.
3. Partial credit pedagogy: praise correct reasoning even when the final answer is unfinished.
4. When checking a step with a clear numeric/fraction answer, append a hidden tag at the end:
   \u27E6step n="${cur?.index || 1}" expected="${cur?.expected || ""}" result="correct|incorrect|partial"\u27E7
5. When all steps are done, celebrate the full path and optionally confirm the final answer ${p.finalExpected || ""}.
6. Never mention internal scores, tags, or "multi-step mode" by those names \u2014 speak as a patient tutor asking them to show their work.
7. Stay in this mode until the student exits or finishes.
`;
}

// src/services/learning/goalsSurface.js
function buildWeekFocusPromptLines(goalsOrStudent) {
  const weekFocus = String(
    goalsOrStudent?.weekFocus ?? goalsOrStudent?.week_focus ?? ""
  ).trim();
  const profileGoal = String(goalsOrStudent?.profileGoal ?? goalsOrStudent?.goal ?? "").trim();
  const lines = [];
  if (weekFocus) {
    lines.push(
      `Student's weekly focus line: "${weekFocus}". Weave this into orientation and check-ins when natural; do not force it every turn.`
    );
  }
  if (profileGoal) {
    lines.push(
      `Longer-term hope from their profile: "${profileGoal}". Keep it as soft background motivation.`
    );
  }
  return lines;
}

// src/services/learning/tutorSuggestions.js
var SUGGEST_MAX = 5;
function buildFallbackSuggestions({
  topic = "",
  subject = "",
  country = "",
  interests = [],
  tutorText = ""
} = {}) {
  const t = String(topic || "this").trim() || "this";
  const shortTopic = t.length > 28 ? `${t.slice(0, 27)}\u2026` : t;
  const ke = /kenya|ke\b/i.test(String(country || "")) || /\b(nairobi|mombasa|kiswahili|shilling)\b/i.test(tutorText || "");
  const interest = Array.isArray(interests) ? interests.map((x) => String(x || "").trim()).filter(Boolean)[0] : "";
  const practicalTopic = /files?|folders?|operat|browser|internet|password|safety|install|desktop|download|upload|rename|copy|paste|keyboard|mouse/i.test(
    t
  ) || /computer\s*science/i.test(String(subject || "")) && /literacy|hardware|software|files|internet|safety|operat/i.test(t);
  const practicalPool = practicalTopic ? [
    "Show me how step by step",
    "Walk me through doing it",
    "What should I click first?",
    "Give me a try-it checklist",
    "I did the steps \u2014 check me"
  ] : [];
  const pool = [
    ...practicalPool,
    "Can you show another everyday example?",
    ke ? "Give an example from home or the market" : "Give a real-life example I know",
    "Let me try a similar one",
    "Why does that work?",
    "Explain that more simply",
    `What should I practice next on ${shortTopic}?`,
    "I think I get it \u2014 check me",
    "Can we go one step slower?",
    interest ? `Connect this to ${interest}` : subject ? `How does this help in ${String(subject).slice(0, 24)}?` : "How will I use this later?",
    "Show me a common mistake to avoid"
  ];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const s of pool) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= SUGGEST_MAX) break;
  }
  return out;
}
function buildSuggestPromptBlock({
  studentName = "the student",
  topic = "",
  subject = ""
} = {}) {
  const name = studentName || "the student";
  const practicalTopic = /files?|folders?|operat|browser|internet|password|safety|install|desktop|download|upload|rename|copy|paste/i.test(
    String(topic || "")
  ) || /computer\s*science/i.test(String(subject || "")) && /literacy|hardware|software|files|internet|safety|operat/i.test(
    String(topic || "")
  );
  const practicalChipLine = practicalTopic ? `- For this practical skill topic, **always include at least one hands-on chip** such as "Show me how step by step", "Walk me through doing it", "Give me a try-it checklist", or "I did the steps \u2014 check me".` : `- When the skill is hands-on (how to do something), prefer chips like "Show me how step by step" over pure theory.`;
  return `Follow-up chips (mandatory on almost every reply \u2014 reduces typing for ${name}):
- After your learner-facing message, append ONE hidden machine block with 3 to 5 short clickable continuations ${name} might tap next.
- Format exactly (pipe-separated, no numbering):
  \u27E6suggests: suggestion one | suggestion two | suggestion three | suggestion four\u27E7
- Each suggestion: 3\u201312 words, first-person or short request from the student's side (e.g. "Let me try a similar one", "Why does that work?", "Show another everyday example", "Show me how step by step").
- Vary the set: mix practice, clarify, real-world, confidence ("I think I get it \u2014 check me"), gentle pace control ("Go one step slower"), and hands-on how-to when relevant.
${practicalChipLine}
- Never put the \u27E6suggests\u2026\u27E7 block in the middle of a sentence. Never explain the block to the student.
- Skip the block only for pure safety pauses or when you must stop tutoring.`;
}
function buildRealWorldExamplePromptBlock({
  studentName = "the student",
  country = "",
  interestsStr = ""
} = {}) {
  const name = studentName || "the student";
  const place = String(country || "").trim();
  const interests = String(interestsStr || "").trim();
  const localHint = /kenya/i.test(place) ? "Prefer East African / Kenyan everyday hooks when natural (matatu fare, market produce, chapati shares, football scores, phone airtime, shillings, school canteen, shamba, rainfall) \u2014 keep it warm and accurate, never stereotyped." : place ? `Prefer everyday scenes familiar in ${place} when natural.` : "Prefer everyday scenes a school-age learner would recognize.";
  return `Real-world / relatable examples (mandatory on teaching replies):
- In every explanation or substantial response, include at least one concrete real-world or everyday example woven into or right after the idea \u2014 not a dry definition alone.
- Ground examples in ${name}'s world: interests (${interests || "their hobbies when known"}), home, school, play, or community.
- ${localHint}
- Keep the example short (1\u20133 sentences) and clearly tied to the concept you just taught.
- If you are only asking a tiny check question, still attach a quick hook ("like splitting mangoes\u2026") so the idea stays concrete.
- You are a supportive tutor first: clarity + relatability beat jargon.`;
}

// src/services/ai/providers/gemini.js
import { GoogleGenAI } from "@google/genai";
function createGeminiClient(creds) {
  if (!creds?.apiKey) return null;
  return new GoogleGenAI({ apiKey: creds.apiKey });
}

// src/services/ai/registry.js
var PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Default Kindling tutor. Strong multimodal + native TTS.",
    docsUrl: "https://aistudio.google.com/apikey",
    keyHint: "AIza\u2026 or Google AI Studio key",
    defaultModel: "gemini-3.1-flash-lite",
    capabilities: ["chat", "vision", "tts"],
    color: "#4285F4",
    models: [
      {
        id: "gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash Lite",
        vision: true,
        recommended: true,
        note: "Kindling default"
      },
      {
        id: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash",
        vision: true
      },
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        vision: true
      },
      {
        id: "gemini-2.5-flash-preview-tts",
        label: "Gemini 2.5 Flash TTS",
        tts: true,
        note: "Speech only"
      }
    ]
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models via the OpenAI Chat Completions API.",
    docsUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-\u2026",
    defaultBaseUrl: "https://api.openai.com/v1",
    allowsCustomBaseUrl: true,
    defaultModel: "gpt-4o-mini",
    capabilities: ["chat", "vision"],
    color: "#10A37F",
    models: [
      {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
        vision: true,
        recommended: true
      },
      { id: "gpt-4o", label: "GPT-4o", vision: true },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini", vision: true },
      { id: "gpt-4.1", label: "GPT-4.1", vision: true },
      { id: "o4-mini", label: "o4-mini", vision: false }
    ]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models for careful, long-context tutoring.",
    docsUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-\u2026",
    defaultBaseUrl: "https://api.anthropic.com",
    defaultModel: "claude-3-5-haiku-latest",
    capabilities: ["chat", "vision"],
    color: "#D4A27F",
    models: [
      {
        id: "claude-3-5-haiku-latest",
        label: "Claude 3.5 Haiku",
        vision: true,
        recommended: true
      },
      {
        id: "claude-sonnet-4-20250514",
        label: "Claude Sonnet 4",
        vision: true
      },
      {
        id: "claude-3-5-sonnet-latest",
        label: "Claude 3.5 Sonnet",
        vision: true
      }
    ]
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-low-latency OpenAI-compatible inference.",
    docsUrl: "https://console.groq.com/keys",
    keyHint: "gsk_\u2026",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    capabilities: ["chat"],
    color: "#F55036",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        label: "Llama 3.3 70B",
        recommended: true
      },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" }
    ]
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "One key, many models (OpenAI-compatible).",
    docsUrl: "https://openrouter.ai/keys",
    keyHint: "sk-or-\u2026",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    allowsCustomBaseUrl: false,
    defaultModel: "google/gemini-2.0-flash-001",
    capabilities: ["chat", "vision"],
    color: "#8B5CF6",
    models: [
      {
        id: "google/gemini-2.0-flash-001",
        label: "Gemini 2.0 Flash (via OR)",
        vision: true,
        recommended: true
      },
      {
        id: "openai/gpt-4o-mini",
        label: "GPT-4o mini (via OR)",
        vision: true
      },
      {
        id: "anthropic/claude-3.5-haiku",
        label: "Claude 3.5 Haiku (via OR)",
        vision: true
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct",
        label: "Llama 3.3 70B (via OR)"
      }
    ]
  }
];
var PROVIDER_MAP = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]));
function getProvider(id) {
  return PROVIDER_MAP[id] || null;
}
function modelsForProvider(providerId, { capability } = {}) {
  const provider = getProvider(providerId);
  if (!provider) return [];
  let models = provider.models || [];
  if (capability === "vision") {
    models = models.filter((m) => m.vision);
  } else if (capability === "tts") {
    models = models.filter((m) => m.tts);
  } else if (capability === "chat") {
    models = models.filter((m) => !m.tts);
  }
  return models;
}
function defaultModelFor(providerId, capability = "chat") {
  const models = modelsForProvider(providerId, { capability });
  const rec = models.find((m) => m.recommended);
  if (rec) return rec.id;
  if (models[0]) return models[0].id;
  return getProvider(providerId)?.defaultModel || "";
}
var PLATFORM_PROVIDER = "gemini";
var PLATFORM_CHAT_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.1-flash-lite";
var PLATFORM_TTS_MODEL = "gemini-2.5-flash-preview-tts";
var DEFAULT_ROUTING = {
  routingMode: "auto",
  primaryProvider: PLATFORM_PROVIDER,
  primaryModel: PLATFORM_CHAT_MODEL,
  fallbackProvider: "",
  fallbackModel: "",
  taskRoutes: {}
};

// src/services/ai/keyVault.js
var STORAGE_KEY = "kindling_ai_key_vault_v1";
var OBFUSCATION_PREFIX = "k1:";
function b64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}
function unseal(sealed) {
  if (!sealed) return "";
  if (!String(sealed).startsWith(OBFUSCATION_PREFIX)) {
    return String(sealed);
  }
  try {
    const raw = b64ToBytes(String(sealed).slice(OBFUSCATION_PREFIX.length));
    const key = 90;
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      out[i] = raw[i] ^ key ^ i & 255;
    }
    return new TextDecoder().decode(out);
  } catch {
    return "";
  }
}
function emptyVault() {
  return { version: 1, entries: {} };
}
function loadVault() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyVault();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyVault();
    return {
      version: 1,
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {}
    };
  } catch {
    return emptyVault();
  }
}
function getKeyEntry(providerId) {
  const vault = loadVault();
  const entry = vault.entries[providerId];
  if (!entry?.sealedKey) return null;
  const apiKey = unseal(entry.sealedKey);
  if (!apiKey) return null;
  return {
    providerId,
    apiKey,
    baseUrl: entry.baseUrl || void 0,
    label: entry.label || "",
    fingerprint: entry.fingerprint || "",
    updatedAt: entry.updatedAt || ""
  };
}
function getPlatformGeminiKey() {
  return ""; // Platform Gemini is server-side; the bundle must contain no key.
}
function hasPlatformGemini() {
  return true;
}

// src/services/ai/preferences.js
var STORAGE_KEY2 = "kindling_ai_routing_v1";
function loadLocalPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY2);
    if (!raw) return { ...DEFAULT_ROUTING };
    const parsed = JSON.parse(raw);
    return normalizePreferences(parsed);
  } catch {
    return { ...DEFAULT_ROUTING };
  }
}
function normalizePreferences(input = {}) {
  const mode = ["auto", "platform", "byok"].includes(input.routingMode) ? input.routingMode : input.routing_mode && ["auto", "platform", "byok"].includes(input.routing_mode) ? input.routing_mode : DEFAULT_ROUTING.routingMode;
  const primaryProvider = input.primaryProvider || input.primary_provider || DEFAULT_ROUTING.primaryProvider;
  const primaryModel = input.primaryModel || input.primary_model || getProvider(primaryProvider)?.defaultModel || PLATFORM_CHAT_MODEL;
  return {
    routingMode: mode,
    primaryProvider: String(primaryProvider).toLowerCase(),
    primaryModel: String(primaryModel),
    fallbackProvider: String(
      input.fallbackProvider || input.fallback_provider || ""
    ).toLowerCase(),
    fallbackModel: String(input.fallbackModel || input.fallback_model || ""),
    taskRoutes: normalizeTaskRoutes(input.taskRoutes || input.task_routes || {})
  };
}
function normalizeTaskRoutes(routes) {
  if (!routes || typeof routes !== "object") return {};
  const out = {};
  for (const key of ["chat", "vision", "tts", "summary"]) {
    const r = routes[key];
    if (!r || typeof r !== "object") continue;
    const entry = {};
    if (r.provider) entry.provider = String(r.provider).toLowerCase();
    if (r.model) entry.model = String(r.model);
    if (entry.provider || entry.model) out[key] = entry;
  }
  return out;
}

// src/services/ai/resolve.js
function resolveRoute(task = "chat") {
  const prefs = loadLocalPreferences();
  const mode = prefs.routingMode || "auto";
  const taskRoute = prefs.taskRoutes?.[task] || {};
  let provider = taskRoute.provider || prefs.primaryProvider || PLATFORM_PROVIDER;
  let model = taskRoute.model || prefs.primaryModel || defaultModelFor(provider, task === "tts" ? "tts" : task === "vision" ? "vision" : "chat");
  if (task === "tts") {
    provider = "gemini";
    model = taskRoute.model || PLATFORM_TTS_MODEL;
  }
  const tryByok = (pid, mid) => {
    const entry = getKeyEntry(pid);
    if (!entry?.apiKey) return null;
    const def = getProvider(pid);
    return {
      provider: pid,
      model: mid || defaultModelFor(pid, task === "tts" ? "tts" : "chat"),
      source: (
        /** @type {const} */
        "byok"
      ),
      apiKey: entry.apiKey,
      baseUrl: entry.baseUrl || def?.defaultBaseUrl,
      routingMode: mode,
      reason: "user_key"
    };
  };
  const tryPlatform = () => {
    if (!hasPlatformGemini()) return null;
    if (provider !== "gemini" && mode === "platform") {
      return {
        provider: PLATFORM_PROVIDER,
        model: task === "tts" ? PLATFORM_TTS_MODEL : PLATFORM_CHAT_MODEL,
        source: (
          /** @type {const} */
          "platform"
        ),
        apiKey: getPlatformGeminiKey(),
        routingMode: mode,
        reason: "platform_forced_gemini"
      };
    }
    if (provider === "gemini" || mode === "platform" || mode === "auto") {
      return {
        provider: PLATFORM_PROVIDER,
        model: provider === "gemini" ? model || PLATFORM_CHAT_MODEL : task === "tts" ? PLATFORM_TTS_MODEL : PLATFORM_CHAT_MODEL,
        source: (
          /** @type {const} */
          "platform"
        ),
        apiKey: getPlatformGeminiKey(),
        routingMode: mode,
        reason: "platform_env"
      };
    }
    return null;
  };
  if (mode === "platform") {
    return tryPlatform();
  }
  if (mode === "byok") {
    const byok2 = tryByok(provider, model);
    if (byok2) return byok2;
    for (const alt of ["gemini", "openai", "anthropic", "groq", "openrouter"]) {
      if (alt === provider) continue;
      const hit = tryByok(alt, defaultModelFor(alt, "chat"));
      if (hit) {
        return { ...hit, reason: "byok_fallback_provider" };
      }
    }
    return null;
  }
  const byok = tryByok(provider, model);
  if (byok) return byok;
  const platform = tryPlatform();
  if (platform) return platform;
  for (const alt of ["gemini", "openai", "anthropic", "groq", "openrouter"]) {
    const hit = tryByok(alt, defaultModelFor(alt, "chat"));
    if (hit) return { ...hit, reason: "auto_any_byok" };
  }
  return null;
}
function isAiAvailable(task = "chat") {
  return Boolean(resolveRoute(task));
}

// src/services/ai/gateway.js
function getGeminiClientForTts() {
  const route = resolveRoute("tts");
  if (!route || route.provider !== "gemini") return null;
  return createGeminiClient({ apiKey: route.apiKey });
}
function getActiveGeminiClient() {
  const route = resolveRoute("chat");
  if (route?.provider === "gemini") {
    return createGeminiClient({ apiKey: route.apiKey });
  }
  const tts = resolveRoute("tts");
  if (tts?.provider === "gemini") {
    return createGeminiClient({ apiKey: tts.apiKey });
  }
  return null;
}
var ai = {
  get available() {
    return isAiAvailable();
  },
  chats: {
    create({ model, config, history }) {
      const client = getActiveGeminiClient();
      if (!client) throw new Error("No Gemini client for legacy chats.create");
      return client.chats.create({ model, config, history });
    }
  },
  models: {
    generateContent(args) {
      const client = getActiveGeminiClient() || getGeminiClientForTts();
      if (!client) throw new Error("No Gemini client for generateContent");
      return client.models.generateContent(args);
    }
  }
};
function getLegacyAiHandle() {
  return isAiAvailable() ? ai : null;
}

// src/services/gemini.js
function normalizeTopicContext(topicContext = null) {
  if (!topicContext || typeof topicContext !== "object") {
    return {
      familiarity: "new",
      learningGoal: "",
      subjectGoal: "",
      weekFocus: "",
      profileGoal: "",
      isFirstSession: false
    };
  }
  const fam = String(topicContext.familiarity || "new").toLowerCase();
  const meta = familiarityMeta(fam);
  return {
    familiarity: meta?.id || "new",
    learningGoal: String(
      topicContext.learningGoal || topicContext.learning_goal || ""
    ).trim(),
    subjectGoal: String(
      topicContext.subjectGoal || topicContext.subject_goal || ""
    ).trim(),
    weekFocus: String(
      topicContext.weekFocus || topicContext.week_focus || ""
    ).trim(),
    profileGoal: String(
      topicContext.profileGoal || topicContext.profile_goal || ""
    ).trim(),
    isFirstSession: Boolean(topicContext.isFirstSession)
  };
}
function buildTopicIntentPromptBlock(topicName, topicContext = null) {
  const ctx = normalizeTopicContext(topicContext);
  const meta = familiarityMeta(ctx.familiarity);
  const pacing = meta?.pacing || "gentle_intro";
  const goalLine = ctx.learningGoal ? `- Stated learning focus for this topic: "${ctx.learningGoal}"` : "- No specific topic goal stated \u2014 discover what they want after a solid orientation.";
  const subjectLine = ctx.subjectGoal ? `- Subject-level hope: "${ctx.subjectGoal}"` : "";
  const weekLines = buildWeekFocusPromptLines(ctx);
  const weekBlock = weekLines.length ? weekLines.map((l) => `- ${l}`).join("\n") : "";
  let pacingRules = "";
  if (pacing === "gentle_intro" || ctx.isFirstSession) {
    pacingRules = `First-session / low-familiarity pacing (mandatory when this is their first live thread on the topic, or familiarity is new/beginner):
- Do NOT open with a hard problem, quiz, or advanced terminology dump.
- Start with a warm, comprehensive orientation: what "${topicName}" is, why it matters, the big idea in plain language, and 1\u20132 everyday hooks (use their interests when natural).
- Check readiness with a soft question ("Does that match what you expected?" / "Want me to show a tiny everyday example next?") before any practice.
- Only after they show comfort, move to one tiny guided example \u2014 still scaffolded.
- Keep early messages friendly and structured; a slightly longer orientation message is OK for the opening turn only.
- If they have a stated goal or week focus, name it once warmly in the open so they feel heard.`;
  } else if (pacing === "refresh_then_build") {
    pacingRules = `Basics-level pacing:
- Briefly refresh core ideas, then confirm what they already know before stretching.
- Align practice to their stated goal; avoid restarting from absolute zero unless they ask.`;
  } else if (pacing === "review") {
    pacingRules = `Review / exam-prep pacing:
- Orient quickly around their goal, then offer structured practice and common pitfalls.
- Still warm up \u2014 never ambush with the hardest item first.`;
  } else {
    pacingRules = `Comfortable-learner pacing:
- Honor their goal; go deeper, but still open with a short framing of the topic and a check-in on what they want today.`;
  }
  return `Topic intent & pacing for "${topicName}":
- Self-reported familiarity: ${meta?.label || "Brand new"} (${ctx.familiarity}).
${goalLine}
${subjectLine}
${weekBlock}
${pacingRules}
- Never shame gaps. Treat "new" as an invitation to teach well, not a deficit.
- Stay aligned with their stated goals throughout the lesson; circle back to them.`;
}
function buildLessonOpeningPrompt({
  topicName,
  subjectName = "",
  studentName,
  student,
  topicContext = null
}) {
  const ctx = normalizeTopicContext(topicContext);
  const meta = familiarityMeta(ctx.familiarity);
  const name = studentName || student?.name?.trim() || "the student";
  const grade = student?.grade || "their grade";
  const curriculum = student?.curriculum || "their curriculum";
  const goalBit = ctx.learningGoal ? `Their stated goal: "${ctx.learningGoal}".` : "They have not written a specific goal yet \u2014 invite one gently after the intro.";
  const subjectBit = ctx.subjectGoal ? `Subject hope: "${ctx.subjectGoal}".` : "";
  const weekBit = ctx.weekFocus ? `This week they're working on: "${ctx.weekFocus}".` : "";
  const needsFullIntro = ctx.isFirstSession || meta?.pacing === "gentle_intro" || ctx.familiarity === "new" || ctx.familiarity === "beginner";
  const practical = isPracticalSkillTopic(topicName, subjectName);
  const practicalAddendum = practical ? ` ${buildPracticalOpeningAddendum({ topicName, studentName: name })}` : "";
  if (needsFullIntro) {
    return `Open the FIRST live lesson on "${topicName}" for ${name} (${grade}, ${curriculum}). Familiarity: ${meta?.label || "Brand new"}. ${goalBit} ${subjectBit} ${weekBit} This is a comprehensive orientation, not a steep cold start. In one warm message: (1) greet them by name, (2) introduce what "${topicName}" is in plain, grade-right language, (3) why it matters with a simple real-world hook (use their interests if natural; everyday life at home/school/community), (4) outline the 2\u20134 big ideas they will grow into \u2014 without dumping jargon, (5) briefly acknowledge their familiarity/goal/week focus so they feel heard, ` + (practical ? `(6) offer a hands-on next step \u2014 invite them to learn by doing (e.g. create a folder, open an app) with a clear "I can show you step by step" path, (7) end with ONE soft check-in that prefers doing over quizzing \u2014 NOT a hard definition quiz. ` : `(6) end with ONE soft check-in question (understanding or what they want first) \u2014 NOT a hard practice problem. `) + `Do not quiz them yet. Do not jump to advanced exercises. A slightly longer opening is fine; later turns stay shorter. Finish with the hidden \u27E6suggests: \u2026\u27E7 block (3\u20135 short tap-to-continue chips` + (practical ? `; include at least one how-to chip like "Show me how step by step").` : `).`) + practicalAddendum;
  }
  return `Start the lesson on "${topicName}" for ${name} (${grade}, ${curriculum}). Familiarity: ${meta?.label || "some experience"}. ${goalBit} ${subjectBit} ${weekBit} Open warmly: short framing of the topic with one everyday example, confirm their goal, ` + (practical ? `then offer a hands-on how-to or a try-it on their device \u2014 not only a theory question. ` : `then ONE approachable question that matches their level \u2014 not a steep leap. `) + `Keep it conversational. Finish with \u27E6suggests: \u2026\u27E7 (3\u20135 chips` + (practical ? `; include a step-by-step how-to option).` : `).`) + practicalAddendum;
}
var ai2 = new Proxy(
  {},
  {
    get(_t, prop) {
      const handle = getLegacyAiHandle();
      if (prop === "then") return void 0;
      if (!handle) return void 0;
      const val = handle[prop];
      return typeof val === "function" ? val.bind(handle) : val;
    },
    has(_t, prop) {
      const handle = getLegacyAiHandle();
      return Boolean(handle && prop in handle);
    }
  }
);
function buildSystemPrompt(subjectName, topicName, tools, student, learningInsights = null, options = {}) {
  const name = student?.name?.trim() || "the student";
  const grade = student?.grade || "their grade level";
  const country = student?.country || "their country";
  const school = student?.schoolName || "their school";
  const curriculum = student?.curriculum || "their curriculum";
  const target = student?.academicTarget || "standard grade level";
  const styleObj = LEARNING_STYLE_OPTIONS.find((s) => s.id === student?.learningStyle) || LEARNING_STYLE_OPTIONS[0];
  const interestsStr = student?.interests?.length ? student.interests.join(", ") : "their interests";
  const focusSubjects = Array.isArray(student?.focusSubjects) ? student.focusSubjects : Array.isArray(student?.focus_subjects) ? student.focus_subjects : [];
  const focusStr = focusSubjects.length ? focusSubjects.join(", ") : "";
  const goalStr = student?.goal ? String(student.goal).trim() : "";
  const weekFocusStr = String(
    student?.weekFocus || student?.week_focus || ""
  ).trim();
  const interventionActive = Boolean(options.interventionActive);
  const ctx = options.interventionContext || {};
  const guideTopic = ctx.topic || topicName;
  const guideSubject = ctx.subject || subjectName;
  const ladderLevel = normalizeLevel(
    ctx.level ?? InterventionLevel.FULL_GUIDE
  );
  const topicContext = normalizeTopicContext(
    options.topicContext || learningInsights?.topicContext || null
  );
  const topicIntentBlock = buildTopicIntentPromptBlock(topicName, topicContext);
  const libraryBlockFromInsights = learningInsights?.libraryPromptBlock || options.libraryPromptBlock || getCachedLibraryPromptBlock() || "";
  const fallbackExample = ctx.workedExample || findWorkedExample({
    subject: subjectName,
    topic: topicName,
    grade: student?.grade,
    kind: "example"
  });
  const libraryBlock = libraryBlockFromInsights || (fallbackExample ? buildLibraryPromptBlock([fallbackExample], { maxExamples: 1 }) : "");
  const pedagogyBlock = learningInsights?.pedagogyPromptBlock || options.pedagogyPromptBlock || "";
  const insightBlock = learningInsights ? `
Live learner model (from prior Kindling sessions \u2014 use silently to adapt; never mention scores or "tracking"):
- Snapshot: ${learningInsights.summary}
- Adaptive directives:
${(learningInsights.directives || []).map((d) => `  \u2022 ${d}`).join("\n")}
${learningInsights.stats?.focusAreas?.length ? `- Known focus areas: ${learningInsights.stats.focusAreas.map((f) => `${f.topic} (${f.subject})`).join("; ")}` : ""}
${learningInsights.stats?.strengths?.length ? `- Known strengths: ${learningInsights.stats.strengths.map((f) => `${f.topic} (${f.subject})`).join("; ")}` : ""}
${learningInsights.persistenceScore >= 2 ? `- Persistence spark is high \u2014 celebrate effort, bounce-backs, and sticking with hard ideas (not only accuracy).` : ""}
${learningInsights.lastCheckIn?.label ? `- Latest check-in: student said \u201C${learningInsights.lastCheckIn.label}\u201D \u2014 respond with warmth; never shame.` : ""}
${learningInsights.libraryExampleTitle ? `- A curated library example is ready for this topic (\u201C${learningInsights.libraryExampleTitle}\u201D) \u2014 prefer it when demonstrating.` : ""}
${learningInsights.activeMisconceptions?.length ? `- Active misconception cues: ${learningInsights.activeMisconceptions.map((m) => m.label).join("; ")} \u2014 remediate gently with the playbook below.` : ""}
${learningInsights.pedagogyDecision?.action ? `- Active policy action: ${learningInsights.pedagogyDecision.action} (id ${learningInsights.pedagogyDecision.id || "\u2014"}) \u2014 execute that move; do not invent a different major strategy.` : ""}
` : "";
  const misconceptionBlock = learningInsights?.misconceptionPromptBlock || options.misconceptionPromptBlock || "";
  const interventionBlock = interventionActive ? buildLadderTutorBlock({
    studentName: name,
    topic: guideTopic,
    subject: guideSubject,
    level: ladderLevel,
    reasonText: ctx.reasonText,
    workedExample: ctx.workedExample || fallbackExample,
    easierSkill: ctx.easierSkill,
    interestsStr
  }) : "";
  const multiStepSession = options.multiStepSession || null;
  const multiStepActive = Boolean(
    multiStepSession && multiStepSession.status === "active"
  );
  const multiStepBlock = multiStepActive ? buildMultiStepTutorBlock(multiStepSession) : "";
  const realWorldBlock = buildRealWorldExamplePromptBlock({
    studentName: name,
    country,
    interestsStr
  });
  const suggestBlock2 = buildSuggestPromptBlock({
    studentName: name,
    topic: topicName,
    subject: subjectName
  });
  const practicalTopic = isPracticalSkillTopic(topicName, subjectName);
  const practicalHowToBlock = learningInsights?.practicalHowToPromptBlock || options.practicalHowToPromptBlock || buildPracticalHowToPromptBlock({
    topic: topicName,
    subject: subjectName,
    studentName: name,
    isFirstSession: Boolean(topicContext?.isFirstSession)
  });
  const philosophyBlock = multiStepActive ? `Your teaching philosophy (show-your-work mode):
- One intermediate step at a time. Celebrate each solid micro-step.
- Partial credit mindset: unfinished paths still earn praise for correct pieces.
- Do not spoil later steps. Keep messages short.
- Still attach a tiny real-world hook when naming a step (e.g. equal shares of chapati / juice).
${tools.encourage ? `- Be extra enthusiastic for ${name}!` : ""}
${tools.visuals ? "- Use a quick visual when a step is about equal pieces." : ""}` : interventionActive ? ladderLevel === InterventionLevel.MICRO_HINT ? `Your teaching philosophy (micro-hint mode):
- One small nudge only \u2014 stay mostly Socratic.
- Never dump a full solution at this level.
- If you name the idea, add a one-line everyday hook.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- A tiny visual cue is OK if it is still just a hint." : ""}` : ladderLevel === InterventionLevel.WORKED_EXAMPLE ? `Your teaching philosophy (worked-example mode):
- One modeled example grounded in everyday life, then one twin try for ${name}.
- Clear steps, then check understanding \u2014 not a full course guide.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- Use a simple visual model in the example when natural." : ""}` : ladderLevel === InterventionLevel.BREAK_OR_EASIER ? `Your teaching philosophy (easier-path mode):
- Normalize reset. Offer break or simpler related skill.
- One easy win with a friendly real-world hook before returning to the hard idea.
${tools.encourage ? `- Be extra warm and encouraging for ${name}!` : ""}
${tools.visuals ? "- Prefer concrete, low-load visuals." : ""}` : `Your teaching philosophy (step-by-step guide mode):
- Lead with clear explanation, a relatable real-world example, then a demonstration, then a tiny check-in.
- For practical computer skills, demonstration means **numbered how-to steps on a real device**, then a try-it.
- One major procedure at a time \u2014 never dump a full lecture, but a complete short how-to (create a folder, rename a file) is welcome.
- Examples first when concepts are abstract; invite ${name} to try a parallel example after you model one.
- If they still struggle, slow down further and try a different representation.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- Lean hard on visual or hands-on models." : ""}` : practicalTopic ? `Your teaching philosophy (practical skill / how-to mode):
- You are an excellent *and* supportive private tutor: patient, clear, and never shaming.
- This topic is about **doing**, not only knowing. ${name} should be able to replicate skills on their own device.
- Teach with the arc: short concept \u2192 **numbered how-to steps** \u2192 try-it checklist \u2192 confirm what they did.
- When showing a procedure, use a clear numbered list (4\u20137 steps is fine in one how-to message). Do not withhold steps to be "Socratic."
- After a how-to, have ${name} try it (or describe their screen) before more theory or quizzes.
- Ask one check-in at a time after the procedure. Celebrate successful attempts, not only perfect answers.
- Keep non-how-to messages short; how-to walkthroughs may be slightly longer and structured.
- Match difficulty to stated familiarity and goals. Never assume prior mastery of "${topicName}" unless they show it.
- Reduce typing load: end with the hidden suggests block (include "Show me how step by step" style chips).
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- Use simple visuals or ASCII of folders/windows when it helps the how-to." : ""}

IMPORTANT: For graded reasoning practice, still guide discovery. For **how-to / procedural skills** (files, folders, apps, browser, safety habits), give clear replicable steps \u2014 theory-only tutoring is a failure mode.` : `Your teaching philosophy:
- You are an excellent *and* supportive private tutor: patient, clear, and never shaming.
- Ask one question at a time. Never overwhelm.
- Celebrate correct reasoning, not just correct answers.
- Keep routine messages short and conversational (2-5 sentences + one everyday example). The very first orientation on a brand-new topic may be a bit longer so ${name} is not dropped onto a steep slope.
- Continuously adapt: if they struggle, scaffold; if they soar, deepen \u2014 within this conversation.
- Match difficulty to stated familiarity and goals. Never assume prior mastery of "${topicName}" unless they show it.
- Reduce typing load: end with the hidden suggests block so ${name} can tap a next step.
- When a skill is practical (how to do something on a device or in the real world), switch into numbered how-to steps + try-it \u2014 do not stay in pure theory.
${tools.encourage ? `- Be extra enthusiastic and encouraging for ${name}!` : ""}
${tools.visuals ? "- Actively suggest visual or hands-on ways to think about problems." : ""}

IMPORTANT: Never give away the answer directly during **reasoning practice**. Guide ${name} to discover it themselves. Orientation, worked teaching moments, and **hands-on how-to procedures** may explain and demonstrate clearly \u2014 always with a real-world hook. Procedural "how do I\u2026?" questions deserve step-by-step guides, not riddles.`;
  const safetyBlock = buildAgeAwarePolicyBlock(student?.grade, name);
  const visualHint = tools?.visuals !== false ? buildVisualPromptHint(topicName) : "";
  return `You are Kindling, a warm, patient, and brilliant private tutor for children. 
You are currently teaching ${name} (who is in ${grade}) about "${topicName}" in ${subjectName}.
Your job is to be an excellent tutor *and* a supportive one: clear explanations, everyday examples, and easy next steps.

Extensive Student Profile & Academic Alignment:
- Student's name: "${name}" (address them by name).
- Grade Level: ${grade}.
- Location & School: Attending "${school}" in ${country}.
- Curriculum Framework: ${curriculum}.
- Academic Target: ${target}.
- Preferred Learning Style: ${styleObj.label} (${styleObj.desc}).
- Passions & Hobbies: ${interestsStr}.
${focusStr ? `- Subjects they especially want help with: ${focusStr}.` : ""}
${goalStr ? `- Primary learning goal: ${goalStr}.` : ""}
${weekFocusStr ? `- This week I'm working on: "${weekFocusStr}".` : ""}

${topicIntentBlock}

Regional & Curriculum Adaptation Instructions:
- Align your terminology, spelling (e.g., US vs UK English), and educational standards with ${country}'s ${curriculum} system.
- Calibrate question depth and rigor to match ${name}'s ${target} level AND their self-reported familiarity with this topic.
- Frame problem scenarios using their interests (${interestsStr}) as engaging real-world analogies.
${focusStr ? `- When choosing examples or check-ins, prefer connecting to their focus subjects (${focusStr}) when natural.` : ""}
${insightBlock}${multiStepActive ? "" : interventionBlock}
${philosophyBlock}

${pedagogyBlock ? `
${pedagogyBlock}
` : ""}
${practicalHowToBlock ? `
${practicalHowToBlock}
` : ""}
${realWorldBlock}

${suggestBlock2}
${multiStepBlock ? `
${multiStepBlock}
` : ""}
${libraryBlock ? `
${libraryBlock}
` : ""}
${misconceptionBlock ? `
${misconceptionBlock}
` : ""}
${safetyBlock}

Formatting (the app renders Markdown, math, code, and diagrams cleanly \u2014 use structure when it helps learning):
- Write clear prose for conversation. Prefer short paragraphs.
- Use **bold** for key terms and *italics* sparingly for emphasis.
- Use numbered or bulleted lists for steps, options, or checklists.
- Use fenced code blocks with a language tag for real code or input/output (e.g. \`\`\`python).
- For math, use LaTeX: inline $x^2$ or display $$\\frac{a}{b}$$.
- For diagrams, use a \`\`\`text fenced block with clean ASCII art (boxes, arrows, trees). Keep diagrams simple and readable.
- Use Markdown tables when comparing ideas side-by-side.
- Use > blockquotes for hints, tips, or "remember" callouts.
- Do NOT dump raw HTML. Do NOT wrap the entire message in a single code fence.
- Keep formatting purposeful \u2014 never decorative spam. Still keep messages age-appropriate and not overwhelming.

Math grading tag (machine-only \u2014 student never sees this; never mention it):
- When ${name} gives a final numeric/fraction answer and you evaluate it (correct, incorrect, or partial), append ONE hidden tag at the very end of your message:
  \u27E6check expected="CANONICAL" alts="alt1|alt2" result="correct|incorrect|partial"\u27E7
- Use the simplest equivalent form for expected (e.g. 3/4 not 6/8). Put other acceptable forms in alts separated by |.
- result is your teaching judgment. The app also verifies mathematically and may prefer the checker for mastery.
- Only emit the tag when there is a clear graded answer. Skip for open exploration or pure hints.
- Never put the tag in the middle of a sentence. Never explain the tag.

Suggestion chips tag (machine-only \u2014 student never sees the raw tag; the app turns it into buttons):
- After the learner-facing text (and after any \u27E6check\u2026\u27E7 tag), append:
  \u27E6suggests: short chip one | short chip two | short chip three | optional four | optional five\u27E7
- Provide 3\u20135 chips every teaching turn. Never explain this tag.

${visualHint ? `${visualHint}
` : ""}Respond as Kindling \u2014 never break character, never mention being an AI, and never mention internal learner scores or tracking.`;
}

// scripts/smoke-practical-howto.mjs
var passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  \u2713 ${name}`);
}
console.log("Practical how-to smoke\n");
ok(
  "detects Files & folders as practical",
  isPracticalSkillTopic("Files & folders", "Computer Science")
);
ok(
  "fraction topic is not auto-practical",
  !isPracticalSkillTopic("Fraction sense", "Math Foundations")
);
var guide = findPracticalGuide({
  topic: "Files & folders",
  subject: "Computer Science"
});
ok("finds create-folder guide", guide?.id === "pg.cs.files.create_folder");
ok("guide has 5+ steps", (guide?.steps || []).length >= 5);
ok("guide has try-it checklist", (guide?.tryIt || []).length >= 2);
var guides = listPracticalGuides({ topic: "Files & folders" });
ok("lists multiple related guides", guides.length >= 2);
var block = buildPracticalHowToPromptBlock({
  topic: "Files & folders",
  subject: "Computer Science",
  studentName: "Amina",
  isFirstSession: true
});
ok("prompt block is mandatory", /MANDATORY/i.test(block));
ok("prompt block includes curated steps", /Create a new folder/i.test(block));
ok(
  "prompt says do not withhold how-to",
  /do not withhold|Show the steps|numbered/i.test(block)
);
var dirs = practicalHowToDirectives({
  topic: "Files & folders",
  subject: "Computer Science"
});
ok("directives mention hands-on", dirs.some((d) => /hands-on|how-to/i.test(d)));
var openDec = decidePedagogy(null, {
  subject: "Computer Science",
  topic: "Files & folders",
  sessionPhase: "open",
  preferPracticalHowTo: true
});
ok("open session chooses EXPLAIN", openDec.action === PedagogicalAction.EXPLAIN);
ok("open session sets practicalHowTo", openDec.params?.practicalHowTo === true);
ok(
  "execution brief is procedural",
  /how-to|steps|device|try-it/i.test(openDec.executionBrief || "")
);
var midDec = decidePedagogy(null, {
  subject: "Computer Science",
  topic: "Files & folders",
  sessionPhase: "active",
  preferPracticalHowTo: true,
  lastSignals: { correctness: "correct" }
});
ok(
  "mid success stays Socratic with how-to flag",
  midDec.action === PedagogicalAction.CONTINUE_SOCRATIC && midDec.params?.practicalHowTo === true
);
var howToQ = decidePedagogy(null, {
  subject: "Computer Science",
  topic: "Files & folders",
  sessionPhase: "active",
  preferPracticalHowTo: true,
  lastSignals: {
    correctness: "exploring",
    isQuestion: true,
    studentText: "How do I create a folder?"
  }
});
ok(
  "how-do-I question \u2192 EXPLAIN how-to",
  howToQ.action === PedagogicalAction.EXPLAIN && howToQ.params?.practicalHowTo
);
var brief = executionBriefForAction(PedagogicalAction.FULL_GUIDE, {
  practicalHowTo: true,
  topic: "Files & folders"
});
ok("FULL_GUIDE practical brief", /device how-to|try-it/i.test(brief));
var chips = buildFallbackSuggestions({
  topic: "Files & folders",
  subject: "Computer Science"
});
ok(
  "fallback chips include step-by-step",
  chips.some((c) => /step by step|walk me|try-it/i.test(c))
);
ok(
  "suggestion pool has how-to",
  practicalHowToSuggestionPool("Files").some((c) => /step by step/i.test(c))
);
var suggestBlock = buildSuggestPromptBlock({
  studentName: "Amina",
  topic: "Files & folders",
  subject: "Computer Science"
});
ok("suggest prompt requires hands-on chip", /hands-on chip/i.test(suggestBlock));
var opening = buildLessonOpeningPrompt({
  topicName: "Files & folders",
  subjectName: "Computer Science",
  studentName: "Amina",
  topicContext: { familiarity: "new", isFirstSession: true }
});
ok(
  "opening requires hands-on path",
  /hands-on|step by step|how-to/i.test(opening)
);
ok(
  "opening addendum present",
  buildPracticalOpeningAddendum({ topicName: "Files & folders" }).includes(
    "PRACTICAL"
  )
);
var sys = buildSystemPrompt(
  "Computer Science",
  "Files & folders",
  { encourage: true, visuals: true },
  {
    name: "Amina",
    grade: "Grade 6",
    country: "Kenya",
    curriculum: "CBC",
    learningStyle: "visual"
  },
  null,
  { topicContext: { familiarity: "new", isFirstSession: true } }
);
ok("system prompt has practical how-to section", /Practical how-to teaching/i.test(sys));
ok("system prompt embeds create-folder guide", /Create a folder/i.test(sys));
ok(
  "system philosophy is practical mode",
  /practical skill|how-to mode|numbered how-to/i.test(sys)
);
ok(
  "Socratic carve-out for procedures",
  /Procedural|how-to \/ procedural|withhold how-to/i.test(sys)
);
console.log(`
${passed} checks passed.`);
