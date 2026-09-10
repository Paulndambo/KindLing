/**
 * Confirm suggestion chips use the same background as .cta-btn (Start a lesson).
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = process.env.KINDLE_FE_URL || "http://localhost:5173";
const API = process.env.KINDLE_API_URL || "http://127.0.0.1:8000";

const demoRes = await fetch(`${API}/api/auth/demo/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
if (!demoRes.ok) throw new Error(`demo ${demoRes.status}`);
const demo = await demoRes.json();
const tokens = demo.tokens || {};
const user = demo.user || {};
const me = await fetch(`${API}/api/students/me/`, {
  headers: { Authorization: `Bearer ${tokens.access}` },
});
const profile = me.ok ? await me.json() : null;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.addInitScript(
  ({ tokens, user, profile }) => {
    localStorage.setItem("kindling_auth_tokens", JSON.stringify(tokens));
    localStorage.setItem(
      "kindling_user_session",
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name || profile?.name || "Demo",
        isLoggedIn: true,
        loggedInAt: new Date().toISOString(),
        tokens,
      })
    );
    if (profile) {
      localStorage.setItem("kindling_student_profile", JSON.stringify(profile));
    }
  },
  { tokens, user, profile }
);

await page.goto(FE, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
});

const cta = page.locator("button.cta-btn").first();
await cta.waitFor({ state: "visible", timeout: 10000 });
const ctaBg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);

// Open a lesson so tutor-content.css (chip styles) is loaded
const openLesson = page
  .getByRole("button", { name: /Start a lesson|Continue|Open lesson|Practice/i })
  .first();
if (await openLesson.isVisible({ timeout: 4000 }).catch(() => false)) {
  await openLesson.click({ force: true });
  await page.waitForTimeout(2500);
}
await page.evaluate(() => {
  document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
});

// Prefer live chips; otherwise inject after ensuring stylesheet rules exist
let hasLive = (await page.locator(".tutor-suggest-chip").count()) > 0;
if (!hasLive) {
  // Wait briefly for greeting stream + chips
  for (let i = 0; i < 12 && !hasLive; i += 1) {
    const skip = page
      .getByRole("button", { name: /skip|not now|dismiss/i })
      .first();
    if (await skip.isVisible({ timeout: 200 }).catch(() => false)) {
      await skip.click({ force: true }).catch(() => {});
    }
    hasLive = (await page.locator(".tutor-suggest-chip").count()) > 0;
    if (!hasLive) await page.waitForTimeout(1000);
  }
}

if (!hasLive) {
  await page.evaluate(() => {
    const wrap = document.createElement("div");
    wrap.className = "tutor-suggest-wrap";
    wrap.style.cssText = "position:fixed;bottom:24px;left:24px;z-index:99999;";
    wrap.innerHTML =
      '<p class="tutor-suggest-label">Try a quick reply</p>' +
      '<div class="tutor-suggest-chips">' +
      '<button type="button" class="tutor-suggest-chip">Sample chip</button>' +
      '<button type="button" class="tutor-suggest-chip">Another tip</button>' +
      "</div>";
    document.body.appendChild(wrap);
  });
  await page.waitForTimeout(200);
}

const chip = page.locator(".tutor-suggest-chip").first();
const chipBg = await chip.evaluate((el) => getComputedStyle(el).backgroundColor);
const chipColor = await chip.evaluate((el) => getComputedStyle(el).color);

console.log(`ctaBg=${ctaBg}`);
console.log(`chipBg=${chipBg}`);
console.log(`chipColor=${chipColor}`);

await page.screenshot({
  path: path.join(__dirname, "suggest-cta-color-ok.png"),
});

await browser.close();

if (ctaBg !== chipBg) {
  console.error("MISMATCH: chip background does not match Start a lesson");
  process.exit(1);
}
console.log("MATCH: suggestion chips use Start a lesson gold");
