import { Sparkles, Rocket, Flame, Bot, Compass } from "lucide-react";

export const AVATAR_OPTIONS = [
  { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "rocket", label: "Rocket", Icon: Rocket },
  { id: "flame", label: "Flame", Icon: Flame },
  { id: "bot", label: "Robot", Icon: Bot },
  { id: "compass", label: "Explorer", Icon: Compass },
];

/** K-12 through high school */
export const K12_GRADE_OPTIONS = [
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "High School (9–10)",
  "High School (11–12)",
];

/** University / college levels */
export const HIGHER_ED_GRADE_OPTIONS = [
  "College / University (Year 1)",
  "College / University (Year 2)",
  "College / University (Year 3)",
  "College / University (Year 4+)",
  "Graduate / Master's",
  "Professional / Continuing Ed",
];

export const GRADE_OPTIONS = [
  ...K12_GRADE_OPTIONS,
  ...HIGHER_ED_GRADE_OPTIONS,
];

/**
 * True when the selected grade is college / university level.
 * Matches known higher-ed labels and common free-text variants.
 */
export function isHigherEducation(grade) {
  if (!grade || typeof grade !== "string") return false;
  const g = grade.toLowerCase();
  return (
    g.includes("college") ||
    g.includes("university") ||
    g.includes("graduate") ||
    g.includes("master") ||
    g.includes("doctoral") ||
    g.includes("phd") ||
    g.includes("professional / continuing") ||
    g.includes("undergrad")
  );
}

export const COUNTRY_OPTIONS = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "INT", name: "International / Other", flag: "🌐" },
];

export const K12_SCHOOL_TYPE_OPTIONS = [
  "Public / State School",
  "Private / Independent",
  "Charter School",
  "Homeschool / Independent Study",
  "International School",
];

export const HIGHER_ED_SCHOOL_TYPE_OPTIONS = [
  "Public University",
  "Private University / College",
  "Community / Technical College",
  "Online / Distance University",
  "Trade / Vocational School",
  "Self-directed / Independent Study",
];

export const SCHOOL_TYPE_OPTIONS = K12_SCHOOL_TYPE_OPTIONS;

export const K12_CURRICULUM_OPTIONS = [
  {
    id: "us_common_core",
    label: "US Common Core & State Standards",
    desc: "Standard US K-12 framework.",
  },
  {
    id: "uk_national",
    label: "UK National Curriculum (GCSE / A-Levels)",
    desc: "Key Stages 1-4, GCSEs & A-Levels.",
  },
  {
    id: "ib",
    label: "International Baccalaureate (IB)",
    desc: "PYP, MYP & IB Diploma Programme.",
  },
  {
    id: "cambridge",
    label: "Cambridge Assessment International (IGCSE)",
    desc: "Global Cambridge secondary pathway.",
  },
  {
    id: "cbse_icse",
    label: "CBSE / ICSE (India)",
    desc: "Indian central & ICSE council boards.",
  },
  {
    id: "australian",
    label: "Australian Curriculum (ACARA)",
    desc: "F-10 Australian national curriculum.",
  },
  {
    id: "canadian",
    label: "Canadian Provincial Curriculum",
    desc: "Ontario, BC, and provincial frameworks.",
  },
  {
    id: "french",
    label: "French National Curriculum",
    desc: "Éducation Nationale (Collège / Lycée).",
  },
  {
    id: "custom",
    label: "Custom / Other Curriculum",
    desc: "Tailored or alternative study pathway.",
  },
];

export const HIGHER_ED_CURRICULUM_OPTIONS = [
  {
    id: "us_undergrad",
    label: "US Undergraduate (Bachelor's)",
    desc: "General education + major requirements (BA / BS).",
  },
  {
    id: "us_grad",
    label: "US Graduate / Professional",
    desc: "Master's, doctoral, or professional school coursework.",
  },
  {
    id: "uk_undergrad",
    label: "UK Undergraduate (BA / BSc)",
    desc: "UK university degree pathway.",
  },
  {
    id: "uk_postgrad",
    label: "UK Postgraduate (MSc / MA / PhD)",
    desc: "Taught master's, research degrees, and doctorates.",
  },
  {
    id: "eu_bologna",
    label: "European Bologna Process (BA / MA)",
    desc: "ECTS-based bachelor's and master's programmes.",
  },
  {
    id: "ib_dp_bridge",
    label: "IB / A-Level to University Bridge",
    desc: "Transition from advanced secondary into higher ed.",
  },
  {
    id: "stem_professional",
    label: "STEM / Engineering Professional Track",
    desc: "Calculus-based STEM, lab sciences, and engineering majors.",
  },
  {
    id: "business_professional",
    label: "Business / Economics / Management",
    desc: "Business school, accounting, finance, and management.",
  },
  {
    id: "cs_software",
    label: "Computer Science / Software Engineering",
    desc: "CS, software, data, and AI-related degree tracks.",
  },
  {
    id: "pre_professional",
    label: "Pre-med / Pre-law / Health Sciences",
    desc: "Pre-professional prerequisites and exam prep.",
  },
  {
    id: "trade_cert",
    label: "Certificate / Trade / Bootcamp",
    desc: "Career certificates, coding bootcamps, vocational quals.",
  },
  {
    id: "custom_he",
    label: "Custom / Other Programme",
    desc: "Self-designed or non-standard higher education path.",
  },
];

/** Default export kept for K-12; use getCurriculumOptions(grade) for adaptive lists. */
export const CURRICULUM_OPTIONS = K12_CURRICULUM_OPTIONS;

export const K12_TARGET_LEVEL_OPTIONS = [
  {
    id: "standard",
    label: "Standard Grade Level",
    desc: "Paced for standard grade mastery.",
  },
  {
    id: "honors",
    label: "Honors / Advanced Placement",
    desc: "Deeper rigor and accelerated pacing.",
  },
  {
    id: "gifted",
    label: "Gifted & Talented",
    desc: "High challenge, fast conceptual leaps.",
  },
  {
    id: "adapted",
    label: "Adapted Pacing / Support",
    desc: "Step-by-step guidance with extra practice.",
  },
];

export const HIGHER_ED_TARGET_LEVEL_OPTIONS = [
  {
    id: "pass",
    label: "Course pass / solid understanding",
    desc: "Clear concepts well enough to pass and apply them.",
  },
  {
    id: "honors_gpa",
    label: "High GPA / honors track",
    desc: "Aim for top marks and deeper mastery.",
  },
  {
    id: "research",
    label: "Research / thesis ready",
    desc: "Rigorous, independent, publication-level thinking.",
  },
  {
    id: "career",
    label: "Career / interview ready",
    desc: "Job, internship, or professional exam focus.",
  },
  {
    id: "support_he",
    label: "Extra support / catch-up",
    desc: "Slower pacing with clearer foundations first.",
  },
];

export const TARGET_LEVEL_OPTIONS = K12_TARGET_LEVEL_OPTIONS;

export const LEARNING_STYLE_OPTIONS = [
  {
    id: "visual",
    label: "Visual & Diagrams",
    desc: "Learns best with pictures, charts, and spatial models.",
  },
  {
    id: "story",
    label: "Story & Real-World",
    desc: "Understands concepts through real-world scenarios and storytelling.",
  },
  {
    id: "logic",
    label: "Step-by-Step Logic",
    desc: "Prefers clear rules, structured breakdowns, and logical order.",
  },
  {
    id: "energetic",
    label: "Fun & Energetic",
    desc: "Thrives with high energy, frequent praise, and interactive challenges.",
  },
];

export const K12_INTEREST_OPTIONS = [
  "🚀 Space & Astronomy",
  "🦖 Dinosaurs & History",
  "⚽ Sports & Gaming",
  "🎨 Art & Drawing",
  "🎵 Music & Rhythms",
  "🤖 Robots & Tech",
  "🍃 Nature & Animals",
  "📚 Reading & Stories",
  "🧪 Science Experiments",
];

export const HIGHER_ED_INTEREST_OPTIONS = [
  "💻 Software & AI",
  "📊 Data & Analytics",
  "🧬 Biology & Medicine",
  "⚙️ Engineering & Design",
  "📈 Business & Startups",
  "⚖️ Law & Policy",
  "🎨 Design & Creative Media",
  "🌍 Climate & Sustainability",
  "🧠 Psychology & Neuroscience",
  "💰 Finance & Economics",
  "🔬 Research & Lab Work",
  "🎮 Games & Interactive Media",
  "📱 Product & UX",
  "🏛️ History & Politics",
  "🎵 Music & Performance",
];

export const INTEREST_OPTIONS = K12_INTEREST_OPTIONS;

export const K12_GOAL_OPTIONS = [
  "Catch up on trickier topics",
  "Get ahead with extra challenge",
  "Homework helper & daily practice",
  "Prepare for upcoming tests",
];

export const HIGHER_ED_GOAL_OPTIONS = [
  "Ace midterms & finals",
  "Build stronger foundations",
  "Project / assignment support",
  "Internship or career prep",
  "Research paper / thesis help",
  "Professional exam prep",
];

export const GOAL_OPTIONS = K12_GOAL_OPTIONS;

/** Subjects learners often want help with (any domain — not math-only). */
export const FOCUS_SUBJECT_OPTIONS = [
  "Math",
  "Science",
  "English / Language Arts",
  "Writing & essays",
  "History / Social studies",
  "Coding / Computer science",
  "Languages",
  "Test prep",
  "Homework help (mixed)",
  "Something else",
];

export const MAX_INTERESTS = 6;
export const MAX_FOCUS_SUBJECTS = 5;

/** Soft curriculum suggestion from country (never locks the choice). */
export const COUNTRY_CURRICULUM_HINTS = {
  "United States": "US Common Core & State Standards",
  "United Kingdom": "UK National Curriculum (GCSE / A-Levels)",
  Canada: "Canadian Provincial Curriculum",
  Australia: "Australian Curriculum (ACARA)",
  India: "CBSE / ICSE (India)",
  Singapore: "Cambridge Assessment International (IGCSE)",
  France: "French National Curriculum",
  Germany: "Custom / Other Curriculum",
  "South Africa": "Custom / Other Curriculum",
  Nigeria: "Custom / Other Curriculum",
  Kenya: "Custom / Other Curriculum",
  "International / Other": "Custom / Other Curriculum",
};

export const ONBOARDING_STEPS = [
  { id: 1, label: "You", short: "About you" },
  { id: 2, label: "Place", short: "Where you learn" },
  { id: 3, label: "Goals", short: "Goals & subjects" },
  { id: 4, label: "Style", short: "How you learn" },
  { id: 5, label: "Ready", short: "Review" },
];

export function getSchoolTypeOptions(grade) {
  return isHigherEducation(grade)
    ? HIGHER_ED_SCHOOL_TYPE_OPTIONS
    : K12_SCHOOL_TYPE_OPTIONS;
}

export function getCurriculumOptions(grade) {
  return isHigherEducation(grade)
    ? HIGHER_ED_CURRICULUM_OPTIONS
    : K12_CURRICULUM_OPTIONS;
}

export function getTargetLevelOptions(grade) {
  return isHigherEducation(grade)
    ? HIGHER_ED_TARGET_LEVEL_OPTIONS
    : K12_TARGET_LEVEL_OPTIONS;
}

export function getInterestOptions(grade) {
  return isHigherEducation(grade)
    ? HIGHER_ED_INTEREST_OPTIONS
    : K12_INTEREST_OPTIONS;
}

export function getGoalOptions(grade) {
  return isHigherEducation(grade)
    ? HIGHER_ED_GOAL_OPTIONS
    : K12_GOAL_OPTIONS;
}

export function getInstitutionLabel(grade) {
  return isHigherEducation(grade) ? "university / college" : "school";
}

/** Blank profile used before onboarding — no hardcoded demo student. */
export const EMPTY_STUDENT_PROFILE = {
  name: "",
  grade: "",
  avatar: "sparkles",
  country: "",
  countryFlag: "",
  schoolName: "",
  schoolType: "",
  curriculum: "",
  academicTarget: "",
  learningStyle: "visual",
  interests: [],
  focusSubjects: [],
  goal: "",
  weekFocus: "",
  isOnboarded: false,
};

/** @deprecated Use EMPTY_STUDENT_PROFILE */
export const DEFAULT_STUDENT_PROFILE = EMPTY_STUDENT_PROFILE;

export const STORAGE_KEYS = {
  userSession: "kindling_user_session",
  studentProfile: "kindling_student_profile",
};
