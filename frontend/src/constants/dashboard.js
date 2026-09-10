export const WEEK_STATS = {
  this: {
    sessions: { value: "4", cap: "4 computer science" },
    time: { value: "1h 42m", cap: "Avg. 25 min per session" },
    streak: { value: "6 days", cap: "Best this month" },
    focus: { value: "Hardware & software", cap: "What is a computer · components" },
    masteryDelta: "+12%",
    questions: "38",
  },
  last: {
    sessions: { value: "3", cap: "3 computer science" },
    time: { value: "1h 10m", cap: "Avg. 23 min per session" },
    streak: { value: "4 days", cap: "Solid start" },
    focus: { value: "Tech basics", cap: "Digital literacy · everyday computers" },
    masteryDelta: "+8%",
    questions: "27",
  },
};

export const MASTERY_MAP = [
  {
    subject: "Computer Science",
    skill: "What is a computer?",
    level: 62,
    segs: ["on", "on", "on", "now", "", ""],
    status: "In progress",
  },
  {
    subject: "Computer Science",
    skill: "Computer hardware",
    level: 48,
    segs: ["on", "on", "now", "", "", ""],
    status: "Building",
  },
  {
    subject: "Computer Science",
    skill: "Problem solving",
    level: 35,
    segs: ["on", "now", "", "", "", ""],
    status: "Building",
  },
];

export const WEEK_PLAN = [
  {
    day: "Mon",
    title: "Common denominators",
    text: "Still with visual models, then first number-only examples.",
    tag: "Math",
    duration: "20 min",
  },
  {
    day: "Wed",
    title: "Theme in a short story",
    text: "Spot theme through a character's choices — not just the plot.",
    tag: "Reading",
    duration: "25 min",
  },
  {
    day: "Fri",
    title: "Adding like denominators",
    text: "First pass: add fractions that already share a denominator.",
    tag: "Math",
    duration: "20 min",
  },
];

export const RECENT_ACTIVITY = [
  {
    id: "a1",
    when: "Today",
    subject: "Math",
    title: "Comparing fractions",
    detail: "Solved 6 of 7 comparison problems with less hinting.",
    tone: "good",
  },
  {
    id: "a2",
    when: "Yesterday",
    subject: "Reading",
    title: "Inference & theme",
    detail: "Connected a character's choice to the story's theme.",
    tone: "good",
  },
  {
    id: "a3",
    when: "2 days ago",
    subject: "Math",
    title: "Equal shares",
    detail: "Still mixing up halves and thirds under time pressure.",
    tone: "focus",
  },
];

export const STRENGTHS = [
  { label: "Visual reasoning", hint: "Pictures → abstract numbers" },
  { label: "Reading stamina", hint: "Stays with longer passages" },
  { label: "Asking good questions", hint: "Notices when stuck" },
];

export const FOCUS_AREAS = [
  { label: "Unlike denominators", hint: "Needs more guided practice" },
  { label: "Explaining steps aloud", hint: "Can solve, hard to narrate" },
];

export const confidencesByWeek = {
  this: [40, 48, 45, 58, 66, 74, 82],
  last: [32, 38, 42, 40, 50, 55, 60],
};
