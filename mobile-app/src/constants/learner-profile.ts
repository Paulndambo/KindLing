export const GRADE_OPTIONS = [
  '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade',
  'High School (9–10)', 'High School (11–12)',
  'College / University (Year 1)', 'College / University (Year 2)',
  'College / University (Year 3)', 'College / University (Year 4+)',
  "Graduate / Master's", 'Professional / Continuing Ed',
];

export const COUNTRIES = [
  ['United States', '🇺🇸'], ['United Kingdom', '🇬🇧'], ['Canada', '🇨🇦'],
  ['Australia', '🇦🇺'], ['India', '🇮🇳'], ['Singapore', '🇸🇬'],
  ['South Africa', '🇿🇦'], ['Nigeria', '🇳🇬'], ['Kenya', '🇰🇪'],
  ['Germany', '🇩🇪'], ['France', '🇫🇷'], ['International / Other', '🌐'],
] as const;

const K12_CURRICULA = [
  'US Common Core & State Standards', 'UK National Curriculum (GCSE / A-Levels)',
  'International Baccalaureate (IB)', 'Cambridge Assessment International (IGCSE)',
  'CBSE / ICSE (India)', 'Australian Curriculum (ACARA)',
  'Canadian Provincial Curriculum', 'French National Curriculum', 'Custom / Other Curriculum',
];

const HIGHER_ED_CURRICULA = [
  "US Undergraduate (Bachelor's)", 'US Graduate / Professional',
  'UK Undergraduate (BA / BSc)', 'UK Postgraduate (MSc / MA / PhD)',
  'European Bologna Process (BA / MA)', 'IB / A-Level to University Bridge',
  'STEM / Engineering Professional Track', 'Business / Economics / Management',
  'Computer Science / Software Engineering', 'Pre-med / Pre-law / Health Sciences',
  'Certificate / Trade / Bootcamp', 'Custom / Other Programme',
];

export const LEARNING_STYLES = [
  { id: 'visual', label: 'Visual & diagrams', detail: 'Pictures, charts, and spatial models' },
  { id: 'story', label: 'Stories & real life', detail: 'Scenarios and storytelling' },
  { id: 'logic', label: 'Step-by-step logic', detail: 'Clear rules and structured breakdowns' },
  { id: 'energetic', label: 'Fun & energetic', detail: 'Interactive challenges and encouragement' },
];

export const K12_INTERESTS = [
  '🚀 Space & Astronomy', '🦖 Dinosaurs & History', '⚽ Sports & Gaming',
  '🎨 Art & Drawing', '🎵 Music & Rhythms', '🤖 Robots & Tech',
  '🍃 Nature & Animals', '📚 Reading & Stories', '🧪 Science Experiments',
];

export const HIGHER_ED_INTERESTS = [
  '💻 Software & AI', '📊 Data & Analytics', '🧬 Biology & Medicine',
  '⚙️ Engineering & Design', '📈 Business & Startups', '⚖️ Law & Policy',
  '🎨 Design & Creative Media', '🌍 Climate & Sustainability',
  '🧠 Psychology & Neuroscience', '💰 Finance & Economics', '🔬 Research & Lab Work',
  '🎮 Games & Interactive Media', '📱 Product & UX', '🏛️ History & Politics', '🎵 Music & Performance',
];

export const K12_GOALS = [
  'Catch up on trickier topics', 'Get ahead with extra challenge',
  'Homework helper & daily practice', 'Prepare for upcoming tests',
];

export const HIGHER_ED_GOALS = [
  'Ace midterms & finals', 'Build stronger foundations', 'Project / assignment support',
  'Internship or career prep', 'Research paper / thesis help', 'Professional exam prep',
];

export function isHigherEducation(grade: string) {
  return /college|university|graduate|master|doctoral|phd|professional \/ continuing|undergrad/i.test(grade);
}

export function profileOptions(grade: string) {
  const higherEd = isHigherEducation(grade);
  return {
    curricula: higherEd ? HIGHER_ED_CURRICULA : K12_CURRICULA,
    interests: higherEd ? HIGHER_ED_INTERESTS : K12_INTERESTS,
    goals: higherEd ? HIGHER_ED_GOALS : K12_GOALS,
  };
}

export const CURRICULUM_HINTS: Record<string, string> = {
  'United States': 'US Common Core & State Standards',
  'United Kingdom': 'UK National Curriculum (GCSE / A-Levels)',
  Canada: 'Canadian Provincial Curriculum',
  Australia: 'Australian Curriculum (ACARA)',
  India: 'CBSE / ICSE (India)',
  Singapore: 'Cambridge Assessment International (IGCSE)',
  France: 'French National Curriculum',
  Germany: 'Custom / Other Curriculum',
  'South Africa': 'Custom / Other Curriculum',
  Nigeria: 'Custom / Other Curriculum',
  Kenya: 'Custom / Other Curriculum',
  'International / Other': 'Custom / Other Curriculum',
};
