import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/services/purchases.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load({ dev = true, platform = 'android', environment = 'standalone', env = {},
  nativeModules = { RNPurchases: {}, RNPaywalls: {}, RNCustomerCenter: {} } } = {}) {
  const events = [];
  const imports = [];
  let configured = false;
  let identity = null;
  const sdk = {
    async isConfigured() { return configured; },
    setLogLevel() {},
    configure(options) { configured = true; identity = options.appUserID; events.push(['configure', options]); },
    async getAppUserID() { return identity; },
    async logIn(id) { identity = id; events.push(['login', id]); },
    async isAnonymous() { return identity === null; },
    async logOut() { identity = null; events.push(['logout']); },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, __DEV__: dev, process: { env },
    require(name) {
      imports.push(name);
      if (name === 'expo-constants') return { __esModule: true, default: { executionEnvironment: environment }, ExecutionEnvironment: { StoreClient: 'storeClient' } };
      if (name === 'react-native') return { Platform: { OS: platform }, NativeModules: nativeModules };
      if (name === 'react-native-purchases') return {
        __esModule: true, default: sdk, LOG_LEVEL: { DEBUG: 'debug', ERROR: 'error' },
        PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1', NETWORK_ERROR: '10', PAYMENT_PENDING_ERROR: '20' },
      };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { service: exports, sdk, events, imports };
}

test('configures once with a stable account ID and switches accounts before work', async () => {
  const { service, sdk, events } = load();
  assert.equal(await service.withPurchases('42', (p) => p.getAppUserID()), '42');
  assert.equal(await service.withPurchases('42', (p) => p.getAppUserID()), '42');
  assert.equal(events.filter(([kind]) => kind === 'configure').length, 1);
  assert.equal(events[0][1].apiKey, 'test_fZjmZvPdUliuCFbHZhXKkkUcSYw');
  assert.equal(await service.withPurchases('43', (p) => p.getAppUserID()), '43');
  await service.resetPurchaseIdentity();
  await service.resetPurchaseIdentity();
  assert.equal(await sdk.isAnonymous(), true);
  assert.equal(events.filter(([kind]) => kind === 'logout').length, 1);
});

test('identity changes wait for an in-flight purchase and recover after rejection', async () => {
  const { service, sdk } = load();
  let release;
  let started;
  const gate = new Promise((resolve) => { release = resolve; });
  const entered = new Promise((resolve) => { started = resolve; });
  const first = service.withPurchases('first', async () => {
    started();
    await gate;
    assert.equal(await sdk.getAppUserID(), 'first');
    throw new Error('Store unavailable');
  });
  const rejection = assert.rejects(first, /Store unavailable/);
  await entered;
  const second = service.withPurchases('second', (p) => p.getAppUserID());
  assert.equal(await sdk.getAppUserID(), 'first');
  release();
  await rejection;
  assert.equal(await second, 'second');
});

test('live builds require platform SDK keys and never fall back to the test key', async () => {
  const missing = load({ dev: false });
  await assert.rejects(missing.service.withPurchases('42', async () => true), /not configured/);
  const wrong = load({ dev: false, env: { EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'test_wrong' } });
  await assert.rejects(wrong.service.withPurchases('42', async () => true), /platform-specific/);
  const live = load({ dev: false, env: { EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_public' } });
  await live.service.withPurchases('42', async () => true);
  assert.equal(live.events[0][1].apiKey, 'goog_public');
});

test('release bundles reject an explicit Test Store override before SDK configuration', async () => {
  const { service, events } = load({ dev: false, env: { EXPO_PUBLIC_REVENUECAT_MODE: 'test' } });
  await assert.rejects(service.withPurchases('42', async () => true), /requires a development build/);
  assert.equal(events.length, 0);
});

test('Expo Go and web cannot configure checkout', async () => {
  for (const options of [{ platform: 'web' }, { environment: 'storeClient' }]) {
    const { service, events } = load(options);
    assert.equal(service.purchasesSupported, false);
    await assert.rejects(service.withPurchases('42', async () => true), /development build/);
    await service.resetPurchaseIdentity();
    assert.equal(events.length, 0);
  }
});

test('missing native modules block all SDK imports even if Expo Go metadata is absent', async () => {
  for (const nativeModules of [{}, { RNPurchases: {} }, { RNPurchases: {}, RNPaywalls: {} },
    { RNPaywalls: {}, RNCustomerCenter: {} }]) {
    const { service, imports } = load({ environment: undefined, nativeModules });
    assert.equal(service.purchasesSupported, false);
    await assert.rejects(service.withPurchases('42', async () => true), /development build/);
    await service.resetPurchaseIdentity();
    assert.match(await service.purchaseErrorMessage(new Error('Use a development build')), /development build/);
    assert.equal(imports.includes('react-native-purchases'), false);
  }
});

test('premium requires the active premium entitlement, including when auto-renew is off', () => {
  const { service } = load();
  assert.equal(service.hasPremium(null), false);
  assert.equal(service.hasPremium({ entitlements: { active: {} } }), false);
  assert.equal(service.hasPremium({ entitlements: { active: { premium: { isActive: true, willRenew: false } } } }), true);
  assert.equal(service.hasPremium({ entitlements: { active: { premium: { isActive: false } } } }), false);
});

test('Monthly package accepts replacement product IDs without environment overrides', () => {
  const { service } = load();
  for (const identifier of ['monthly', 'monthly_25', 'premium_monthly_usd25', 'monthly:base-plan']) {
    const item = { product: { identifier } };
    assert.equal(service.monthlyPackage({ monthly: item }), item);
  }
  assert.throws(() => service.monthlyPackage(null), /No subscription plans/);
  assert.throws(() => service.monthlyPackage({ monthly: null }), /monthly plan is unavailable/);
});

test('resolves monthly_2599 from available packages without the monthly shortcut', () => {
  const { service } = load();
  for (const identifier of ['monthly_2599', 'monthly_2599:base-plan']) {
    const item = { identifier: 'custom-monthly', product: { identifier } };
    assert.equal(service.monthlyPackage({ monthly: null, availablePackages: [item] }), item);
  }
  const standard = { identifier: '$rc_monthly', product: { identifier: 'replacement' } };
  assert.equal(service.monthlyPackage({ availablePackages: [standard] }), standard);
  assert.throws(() => service.monthlyPackage({ availablePackages: [{ identifier: 'annual', product: { identifier: 'annual' } }] }), /monthly plan is unavailable/);
});

test('cancellation is quiet while pending payments and network failures explain retry state', async () => {
  const { service } = load();
  assert.equal(await service.purchaseErrorMessage({ code: '1' }), '');
  assert.match(await service.purchaseErrorMessage({ code: '20' }), /pending approval/);
  assert.match(await service.purchaseErrorMessage({ code: '10' }), /connection/);
  assert.match(await service.purchaseErrorMessage(null), /try again/);
});
