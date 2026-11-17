import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateRevenueCatBuild } from '../scripts/validate-revenuecat-build.mjs';

const profiles = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
function config(profile, platform = 'android', overrides = {}) {
  return { ...profiles.build[profile].env, EAS_BUILD_PLATFORM: platform, EAS_BUILD_PROFILE: profile, ...overrides };
}

test('development builds explicitly select the supplied Test Store key', () => {
  const result = validateRevenueCatBuild(config('development'), profiles);
  assert.equal(result.mode, 'test');
  assert.equal(profiles.build.development.environment, 'development');
});

test('preview builds fail early without the Android platform key', () => {
  assert.throws(() => validateRevenueCatBuild(config('preview'), profiles), /EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY/);
  assert.throws(() => validateRevenueCatBuild(config('preview', 'android', { EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'test_wrong' }), profiles), /goog_/);
});

test('preview and production accept the matching platform public SDK keys', () => {
  for (const profile of ['preview', 'production']) {
    assert.equal(profiles.build[profile].environment, profile);
    assert.equal(validateRevenueCatBuild(config(profile, 'android', { EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_public' }), profiles).mode, 'live');
    assert.equal(validateRevenueCatBuild(config(profile, 'ios', { EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_public' }), profiles).mode, 'live');
  }
});

test('a Test Store override cannot make a release build pass validation', () => {
  assert.throws(() => validateRevenueCatBuild(config('preview', 'android', {
    EXPO_PUBLIC_REVENUECAT_MODE: 'test', EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: 'test_public',
  }), profiles), /cannot be used in this release/);
});

test('secret, web, and opposite-platform keys are rejected', () => {
  for (const key of ['sk_secret', 'rcb_web', 'appl_ios']) {
    assert.throws(() => validateRevenueCatBuild(config('preview', 'android', { EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: key }), profiles), /goog_/);
  }
});
