import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validateRevenueCatBuild(env, profiles) {
  const platform = env.EAS_BUILD_PLATFORM;
  const profile = env.EAS_BUILD_PROFILE;
  if (!['android', 'ios'].includes(platform)) throw new Error('EAS_BUILD_PLATFORM must be android or ios.');
  const development = profiles.build[profile]?.developmentClient === true;
  const mode = env.EXPO_PUBLIC_REVENUECAT_MODE || (development ? 'test' : 'live');
  if (!['test', 'live'].includes(mode)) throw new Error('EXPO_PUBLIC_REVENUECAT_MODE must be test or live.');
  if (mode === 'test') {
    if (!development) throw new Error('RevenueCat Test Store cannot be used in this release APK/IPA. Use --profile development with the test_ key, or configure a platform SDK key for live mode.');
    const key = env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
    if (!key?.startsWith('test_')) throw new Error('Development Test Store builds require EXPO_PUBLIC_REVENUECAT_TEST_API_KEY (test_).');
  } else {
    const name = platform === 'android' ? 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY' : 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY';
    const prefix = platform === 'android' ? 'goog_' : 'appl_';
    if (!env[name]?.startsWith(prefix)) {
      throw new Error(`Missing or invalid ${name}. Add the ${prefix} public SDK key to the EAS ${profile} environment, then rebuild. A test_ key cannot replace it in a release build.`);
    }
  }
  return { platform, profile, mode };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const profiles = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
    const result = validateRevenueCatBuild(process.env, profiles);
    console.log(`RevenueCat build configuration verified: ${result.platform}, ${result.profile}, ${result.mode}.`);
  } catch (error) {
    console.error(`RevenueCat build configuration failed: ${error.message}`);
    process.exitCode = 1;
  }
}
