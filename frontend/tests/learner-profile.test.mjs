import assert from 'node:assert/strict';
import test from 'node:test';
import { ageFromDateOfBirth, ageGuidance } from '../src/utils/learner-age.js';
import { resolveAgeBand } from '../src/services/safety/ageBand.js';
import { getCurriculumOptions, getGoalOptions, normalizeProgrammeTrack } from '../src/constants/onboarding.js';

test('calendar age handles birthdays and leap days without date rollover', () => {
  assert.equal(ageFromDateOfBirth('2014-11-18', new Date(2026, 10, 17)), 11);
  assert.equal(ageFromDateOfBirth('2014-11-18', new Date(2026, 10, 18)), 12);
  assert.equal(ageFromDateOfBirth('2012-02-29', new Date(2025, 1, 28)), 12);
  assert.equal(ageFromDateOfBirth('2012-02-29', new Date(2025, 2, 1)), 13);
  for (const invalid of ['', '2020-02-30', '2020-13-01', '2099-01-01', '1800-01-01']) assert.equal(ageFromDateOfBirth(invalid, new Date(2026, 10, 17)), null);
});

test('birth date overrides grade-based age assumptions', () => {
  const today = new Date();
  const childDate = `${today.getFullYear() - 10}-01-01`;
  assert.equal(resolveAgeBand('College / University (Year 1)', childDate), 'child');
  assert.equal(resolveAgeBand('3rd Grade', '1980-01-01'), 'adult');
  assert.equal(resolveAgeBand('3rd Grade'), 'child');
  assert.match(ageGuidance(childDate), /school, play/);
  assert.equal(ageGuidance(childDate).includes(childDate), false);
  assert.match(ageGuidance(childDate), /not assumed ability/);
});

test('programme tracks are clean and the goals include learning for its own sake', () => {
  const labels = getCurriculumOptions('Masters').map((option) => option.label);
  assert.deepEqual(labels, ['Undergraduate', 'Masters', 'PhD', 'Diploma', 'Certificate', 'Professional training', 'Independent study', 'Other']);
  assert.equal(new Set(labels).size, labels.length);
  for (const grade of ['5th Grade', 'Masters', 'PhD']) assert.equal(getGoalOptions(grade).includes('Learn something new'), true);
  assert.equal(normalizeProgrammeTrack('US Undergraduate (Bachelor\'s)'), 'Undergraduate');
  assert.equal(normalizeProgrammeTrack('UK Undergraduate (BA / BSc)'), 'Undergraduate');
  assert.equal(normalizeProgrammeTrack('My custom programme'), 'My custom programme');
});

test('actual tutor prompt uses birth-date age instead of assuming university students are adults', async () => {
  const { createServer } = await import('vite');
  const vite = await createServer({ configFile: false, envFile: false, logLevel: 'silent', server: { middlewareMode: true, watch: null } });
  try {
    const { buildSystemPrompt } = await vite.ssrLoadModule('/src/services/gemini.js');
    const birthDate = `${new Date().getFullYear() - 10}-01-01`;
    const prompt = buildSystemPrompt('Math', 'Fractions', {}, {
      name: 'Learner', grade: 'College / University (Year 1)', dateOfBirth: birthDate,
    });
    assert.match(prompt, /younger learner/);
    assert.match(prompt, /familiar school, play/);
    assert.equal(prompt.includes(birthDate), false);
    assert.equal(prompt.includes('for adult learners'), false);
  } finally { await vite.close(); }
});
