// Read-only check using the real browser SDK. Never presents checkout or purchases.
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { loadEnv } from "vite";

const config = { ...loadEnv("development", process.cwd(), "VITE_"), ...process.env };
const mode = config.VITE_REVENUECAT_MODE || "test";
const apiKey = mode === "test"
  ? config.VITE_REVENUECAT_TEST_API_KEY || "test_fZjmZvPdUliuCFbHZhXKkkUcSYw"
  : config.VITE_REVENUECAT_WEB_API_KEY;
if (!apiKey) throw new Error("Missing RevenueCat SDK key for this environment.");
const userArgument = process.argv.indexOf("--user-id");
const appUserId = userArgument >= 0 ? process.argv[userArgument + 1] : "kindling-offering-diagnostic";
if (!appUserId) throw new Error("Provide the account ID after --user-id.");
const browser = await chromium.launch({ channel: "chrome", headless: true,
  args: ["--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessChecksWebSockets"] });
try {
  const page = await browser.newPage();
  await page.route("https://kindling-revenuecat-check.invalid/", (route) => route.fulfill({
    contentType: "text/html", body: "<html><body>Read-only RevenueCat diagnostic</body></html>",
  }));
  await page.goto("https://kindling-revenuecat-check.invalid/");
  await page.addScriptTag({ path: fileURLToPath(new URL("../node_modules/@revenuecat/purchases-js/dist/Purchases.umd.js", import.meta.url)) });
  const summary = await page.evaluate(async ({ apiKey, appUserId }) => {
    const purchases = window.Purchases.Purchases.configure({ apiKey, appUserId });
    const offerings = await purchases.getOfferings();
    return {
      current: offerings.current?.identifier ?? null,
      offerings: Object.values(offerings.all).map((offering) => ({
        id: offering.identifier, monthly: offering.monthly?.identifier ?? null,
        packages: offering.availablePackages.map((pkg) => ({
          id: pkg.identifier, product: pkg.product.identifier, price: pkg.product.price.formattedPrice,
          period: pkg.product.normalPeriodDuration,
        })),
      })),
    };
  }, { apiKey, appUserId });
  console.log(JSON.stringify({ mode, keyType: apiKey.split("_")[0], ...summary }, null, 2));
} finally {
  await browser.close();
}
