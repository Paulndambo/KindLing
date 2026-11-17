import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Date });
  return exports;
}
const age = load('../src/services/learner-age.ts');
const options = load('../src/constants/learner-profile.ts');

test('mobile programme options are distinct and preserve custom selections', () => {
  const tracks = Array.from(options.profileOptions('Masters').curricula);
  assert.deepEqual(tracks, ['Undergraduate', 'Masters', 'PhD', 'Diploma', 'Certificate', 'Professional training', 'Independent study', 'Other']);
  assert.equal(options.normalizeProgrammeTrack('UK Undergraduate (BA / BSc)'), 'Undergraduate');
  assert.equal(options.normalizeProgrammeTrack('Custom course'), 'Custom course');
  assert.equal(options.profileOptions('5th Grade').goals.includes('Learn something new'), true);
});

test('mobile age is recalculated at birthdays and rejects invalid or future dates', () => {
  assert.equal(age.ageFromDateOfBirth('2014-11-18', new Date(2026, 10, 17)), 11);
  assert.equal(age.ageFromDateOfBirth('2014-11-18', new Date(2026, 10, 18)), 12);
  assert.equal(age.ageFromDateOfBirth('2012-02-29', new Date(2025, 1, 28)), 12);
  assert.equal(age.ageFromDateOfBirth('2012-02-29', new Date(2025, 2, 1)), 13);
  for (const value of ['2020-02-30', '2099-01-01', '1800-01-01', '']) assert.equal(age.ageFromDateOfBirth(value), null);
  assert.match(age.ageGuidance('2018-01-01'), /school, play/);
  assert.equal(age.ageGuidance('2018-01-01').includes('2018-01-01'), false);
});
