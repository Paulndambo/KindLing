// Run against `npm run dev -- --host 127.0.0.1 --port 5176`.
// This mounts the real hook and subscription UI with a simulated SDK; no payments occur.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = "http://127.0.0.1:5176";
const browser = await chromium.launch({ channel: "chrome", headless: true,
  args: ["--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessChecksWebSockets"] });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
const failures = [];
page.on("pageerror", (error) => failures.push(error.message));
page.on("console", (message) => { if (message.type() === "error") failures.push(message.text()); });
page.on("requestfailed", (request) => failures.push(`${request.url()}: ${request.failure()?.errorText}`));

try {
  const hookSource = await (await fetch(`${base}/src/hooks/useRevenueCat.js`)).text();
  const reactUrl = hookSource.match(/from "([^"]+\/react\.js[^"\n]*)"/)[1];
  const mainSource = await (await fetch(`${base}/src/main.jsx`)).text();
  const reactDomUrl = mainSource.match(/from "([^"]+\/react-dom_client\.js[^"\n]*)"/)[1];
  await page.route("**/*revenuecat_purchases-js.js*", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `
      let instance;
      const free = () => ({ entitlements: { active: {} }, managementURL: null });
      const premium = () => ({ entitlements: { active: { premium: { isActive: true, willRenew: false, expirationDate: '2027-01-01' } } }, managementURL: null });
      window.rcTestCalls = [];
      export const ErrorCode = { UserCancelledError: 1, NetworkError: 10, PaymentPendingError: 20 };
      export const LogLevel = { Debug: 'debug', Error: 'error' };
      export class Purchases {
        static isConfigured() { return !!instance; }
        static getSharedInstance() { return instance; }
        static setLogLevel() {}
        static generateRevenueCatAnonymousAppUserId() { return '$RCAnonymousID:test'; }
        static configure({ appUserId }) { instance = new Purchases(); instance.id = appUserId; instance.info = free(); return instance; }
        getAppUserId() { return this.id; }
        async changeUser(id) { this.id = id; this.info = free(); return this.info; }
        async getCustomerInfo() { return this.info; }
        async getOfferings() { return { current: { identifier: 'default', monthly: { identifier: '$rc_monthly', product: { identifier: 'monthly', price: { formattedPrice: '$12.00' } } } } }; }
        async presentPaywall() { window.rcTestCalls.push(['paywall', this.id]); return this.complete(); }
        async purchase() { window.rcTestCalls.push(['purchase', this.id]); return this.complete(); }
        async complete() {
          if (window.rcTestOutcome === 'cancel') throw { errorCode: 1 };
          if (window.rcTestOutcome === 'network') throw { errorCode: 10 };
          this.info = premium(); return { customerInfo: this.info };
        }
      }
    `,
  }));
  await page.route(`${base}/revenuecat-smoke`, (route) => route.fulfill({
    contentType: "text/html",
    body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="root"></div>
    <script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script><script type="module">
      import React from '${reactUrl}';
      import ReactDOM from '${reactDomUrl}';
      import { useRevenueCat } from '/src/hooks/useRevenueCat.js';
      import Subscription from '/src/components/settings/RevenueCatSubscription.jsx';
      import '/src/index.css'; import '/src/styles/platform.css'; import '/src/styles/professional.css';
      function Harness() {
        const [session, setSession] = React.useState({ id: 42, email: 'test@example.com' });
        window.setTestSession = setSession;
        const purchases = useRevenueCat({ userSession: session, isLoggedIn: !!session, bootstrapping: false });
        return React.createElement(Subscription, { purchases, onOpenLogin: () => {} });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Harness));
    </script></body></html>`,
  }));
  await page.goto(`${base}/revenuecat-smoke`);
  await page.getByText("$12.00", { exact: true }).waitFor();
  await page.getByRole("button", { name: "View Premium paywall" }).click();
  await page.getByText("Your Premium entitlement is active.").waitFor();
  assert.deepEqual(await page.evaluate(() => window.rcTestCalls), [["paywall", "42"]]);

  await page.evaluate(() => window.setTestSession({ id: 43, email: "second@example.com" }));
  await page.getByRole("button", { name: "Subscribe monthly" }).waitFor();
  await page.evaluate(() => { window.rcTestOutcome = "cancel"; });
  await page.getByRole("button", { name: "Subscribe monthly" }).click();
  await page.getByRole("button", { name: "View Premium paywall" }).waitFor({ state: "visible" });
  await page.waitForFunction(() => window.rcTestCalls.length === 2);
  assert.equal(await page.getByRole("alert").count(), 0);

  await page.evaluate(() => { window.rcTestOutcome = "network"; });
  await page.getByRole("button", { name: "Subscribe monthly" }).click();
  await page.getByRole("alert").filter({ hasText: "Check your connection" }).waitFor();
  await page.evaluate(() => { window.rcTestOutcome = "success"; });
  await page.getByRole("button", { name: "Subscribe monthly" }).click();
  await page.getByText("Your Premium entitlement is active.").waitFor();

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  }
  await page.evaluate(() => window.setTestSession(null));
  await page.getByRole("button", { name: "Sign in to subscribe" }).waitFor();
  assert.equal(await page.getByText("Your Premium entitlement is active.").count(), 0);
  assert.deepEqual(failures, []);
  console.log("PASS: paywall, direct checkout, cancellation, errors, account switching, sign-out, and responsive layout (simulated SDK).");
} catch (error) {
  console.error({ pageErrors: failures, body: await page.locator("body").innerText() });
  throw error;
} finally {
  await browser.close();
}
