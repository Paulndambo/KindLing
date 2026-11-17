import assert from "node:assert/strict";
import test from "node:test";
import { createRevenueCatClient, hasPremium, managementUrl, monthlyPackage, offeringDiagnostics } from "../src/services/revenuecat-client.js";

const free = { entitlements: { active: {} }, managementURL: null };
const premium = { entitlements: { active: { premium: { isActive: true, willRenew: false } } } };
const monthly = { identifier: "$rc_monthly", product: { identifier: "monthly", price: { formattedPrice: "$12.00" } } };

function setup(options = {}) {
  const calls = [];
  let id;
  let info = free;
  let configured = false;
  const instance = {
    getAppUserId: () => id,
    async changeUser(next) { calls.push(["changeUser", next]); id = next; info = free; return info; },
    async getCustomerInfo() { return info; },
    async getOfferings() { return { current: { identifier: "default", monthly } }; },
    async presentPaywall(params) { calls.push(["paywall", params, id]); info = premium; return { customerInfo: info }; },
    async purchase(params) { calls.push(["purchase", params, id]); info = premium; return { customerInfo: info }; },
  };
  const client = createRevenueCatClient({
    apiKey: "test_key", testMode: true, browserAvailable: () => true,
    loadSdk: async () => {
      calls.push(["load"]);
      return {
        LogLevel: { Debug: "debug", Error: "error" },
        ErrorCode: { UserCancelledError: 1, NetworkError: 10, PaymentPendingError: 20 },
        Purchases: {
          setLogLevel() {}, isConfigured: () => configured, getSharedInstance: () => instance,
          configure(config) { calls.push(["configure", config]); configured = true; id = config.appUserId; return instance; },
          generateRevenueCatAnonymousAppUserId: () => "$RCAnonymousID:signedout",
        },
      };
    },
    ...options,
  });
  return { client, instance, calls };
}

test("signed-out visitors never initialize the SDK; stable IDs configure once", async () => {
  const { client, calls } = setup();
  await client.setUser(null);
  assert.equal(calls.length, 0);
  await client.setUser("42");
  await client.snapshot("42");
  await client.refresh("42");
  assert.equal(calls.filter(([type]) => type === "configure").length, 1);
  assert.equal(calls.find(([type]) => type === "configure")[1].appUserId, "42");
});

test("paywall uses current offering and email, and returns active premium", async () => {
  const { client, calls } = setup();
  await client.setUser("42");
  assert.equal(hasPremium(await client.checkout("42", { customerEmail: "student@example.com" })), true);
  const call = calls.find(([type]) => type === "paywall");
  assert.equal(call[1].offering.identifier, "default");
  assert.equal(call[1].customerEmail, "student@example.com");
  let closed = false;
  call[1].onBack(() => { closed = true; });
  assert.equal(closed, true);
  await client.checkout("42");
  assert.equal(calls.filter(([type]) => type === "paywall").length, 1);
});

test("direct checkout uses modern Package.product and purchase({ rcPackage })", async () => {
  const { client, calls } = setup();
  await client.setUser("42");
  await client.checkout("42", { paywall: false });
  assert.equal(calls.find(([type]) => type === "purchase")[1].rcPackage, monthly);
});

test("checkout supports a replacement Test Store product with a $25 monthly price", async () => {
  const { client, instance, calls } = setup();
  const replacement = { ...monthly, product: { identifier: "monthly_25", price: { formattedPrice: "$25.00" } } };
  instance.getOfferings = async () => ({ current: { monthly: replacement } });
  await client.setUser("42");
  await client.checkout("42", { paywall: false });
  assert.equal(calls.find(([type]) => type === "purchase")[1].rcPackage.product.identifier, "monthly_25");
  assert.equal(calls.find(([type]) => type === "purchase")[1].rcPackage.product.price.formattedPrice, "$25.00");
});

test("account changes invalidate queued requests and never purchase for a stale account", async () => {
  const { client, instance, calls } = setup();
  await client.setUser("first");
  await client.refresh("first");
  let release;
  let started;
  const gate = new Promise((resolve) => { release = resolve; });
  const entered = new Promise((resolve) => { started = resolve; });
  instance.getOfferings = async () => { started(); await gate; return { current: { monthly } }; };
  const checkout = client.checkout("first");
  const rejected = assert.rejects(checkout, /Sign in/);
  await entered;
  await client.setUser("second");
  release();
  await rejected;
  assert.equal(calls.some(([type]) => type === "purchase" || type === "paywall"), false);
  await client.refresh("second");
  assert.equal(instance.getAppUserId(), "second");
  await client.setUser(null);
  assert.equal(instance.getAppUserId(), "$RCAnonymousID:signedout");
});

test("an offering failure preserves retrievable customer entitlement", async () => {
  const { client, instance } = setup();
  await client.setUser("42");
  instance.getCustomerInfo = async () => premium;
  instance.getOfferings = async () => { throw new Error("Offers offline"); };
  const snapshot = await client.snapshot("42");
  assert.equal(hasPremium(snapshot.customerInfo), true);
  assert.match(snapshot.offeringError.message, /offline/);
});

test("missing or wrong live SDK keys fail without importing checkout", async () => {
  for (const apiKey of [undefined, "test_key", "appl_mobile", "sk_secret"]) {
    const { client, calls } = setup({ apiKey, testMode: false });
    await client.setUser("42");
    await assert.rejects(client.refresh("42"), /Billing public SDK key/);
    assert.equal(calls.length, 0);
  }
  const { client } = setup({ apiKey: "rcb_live_key", testMode: false });
  await client.setUser("42");
  assert.equal(await client.refresh("42"), free);
});

test("SDK load failure can be retried", async () => {
  let attempts = 0;
  const { client } = setup({ loadSdk: async () => { attempts++; throw new Error("Network offline"); } });
  await client.setUser("42");
  await assert.rejects(client.refresh("42"), /offline/);
  await assert.rejects(client.refresh("42"), /offline/);
  assert.equal(attempts, 2);
});

test("cancellation is quiet; pending and network failures have clear messages", async () => {
  const { client } = setup();
  await client.setUser("42");
  await client.refresh("42");
  assert.equal(await client.errorMessage({ errorCode: 1 }), "");
  assert.match(await client.errorMessage({ errorCode: 20 }), /pending/);
  assert.match(await client.errorMessage({ errorCode: 10 }), /connection/);
});

test("validate entitlement, monthly mapping, and management URL", () => {
  assert.equal(hasPremium(null), false);
  assert.equal(hasPremium(free), false);
  assert.equal(hasPremium(premium), true);
  assert.equal(monthlyPackage({ monthly }), monthly);
  assert.throws(() => monthlyPackage(null), /No subscription plans/);
  assert.throws(() => monthlyPackage({ monthly: null, availablePackages: [{ identifier: "$rc_annual" }] }), /monthly plan is unavailable/);
  const replacement = { product: { identifier: "premium_monthly_usd25" } };
  assert.equal(monthlyPackage({ monthly: replacement }), replacement);
  assert.equal(managementUrl({ managementURL: "javascript:alert(1)" }), null);
  assert.equal(managementUrl({ managementURL: "https://billing.example.com/portal" }), "https://billing.example.com/portal");
});

test("resolves monthly_2599 from available packages when the monthly shortcut is absent", () => {
  const item = { identifier: "custom-monthly", product: { identifier: "monthly_2599" } };
  assert.equal(monthlyPackage({ monthly: null, availablePackages: [item] }), item);
  assert.equal(monthlyPackage({ availablePackages: [{ ...monthly, identifier: "$rc_monthly" }] }).product.identifier, "monthly");
  assert.throws(() => monthlyPackage({ availablePackages: [{ identifier: "annual", product: { identifier: "annual" } }] }), /monthly plan is unavailable/);
});

test("offering diagnostics identify the actual offering and product without customer data", () => {
  const offering = { identifier: "default", monthly, availablePackages: [monthly] };
  const summary = offeringDiagnostics({ current: offering, all: { default: offering } });
  assert.equal(summary.version, "kindling-offerings-v2");
  assert.equal(summary.current, "default");
  assert.equal(summary.offerings[0].packages[0].product, "monthly");
  assert.equal(summary.offerings[0].packages[0].price, "$12.00");
});
