// Calendar dates are parsed locally: UTC conversion must not shift a birthday.
export function ageFromDateOfBirth(value, today = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date > today) return null;
  const age = today.getFullYear() - year - (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0);
  return age >= 0 && age <= 120 ? age : null;
}

export function ageGuidance(dateOfBirth) {
  const age = ageFromDateOfBirth(dateOfBirth);
  if (age === null) return 'Age is not provided. Use study level and learner feedback, with child-safe examples when age is unclear.';
  const tone = age < 13
    ? 'Use short, concrete explanations with familiar school, play, nature, and everyday examples. Explain new words gently.'
    : age < 18
      ? 'Use a respectful teen-appropriate tone and relatable school, hobbies, technology, and everyday examples; avoid talking down.'
      : 'Use an approachable adult tone and practical examples relevant to the learner’s interests and goals; avoid patronizing language.';
  return `Learner age: ${age} years. ${tone} Age guides tone and relatability, not assumed ability: preserve academic depth for their study level and demonstrated understanding. Do not mention or request their birth date.`;
}

export function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
