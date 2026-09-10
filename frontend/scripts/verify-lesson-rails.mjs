/**
 * Confirm lesson left path rail width matches right tools rail.
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

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

const open = page
  .getByRole("button", { name: /Start a lesson|Continue|Open|Practice/i })
  .first();
if (await open.isVisible({ timeout: 5000 }).catch(() => false)) {
  await open.click({ force: true });
  await page.waitForTimeout(2500);
}

// Dismiss check-ins
for (let i = 0; i < 3; i += 1) {
  const skip = page
    .getByRole("button", { name: /skip|not now|dismiss|not yet/i })
    .first();
  if (await skip.isVisible({ timeout: 500 }).catch(() => false)) {
    await skip.click({ force: true }).catch(() => {});
  } else break;
}

const shell = page.locator(".lesson-shell").first();
await shell.waitFor({ state: "visible", timeout: 15000 });

const dims = await page.evaluate(() => {
  const side = document.querySelector(".lesson-side");
  const tools = document.querySelector(".lesson-tools");
  const shellEl = document.querySelector(".lesson-shell");
  if (!side || !tools || !shellEl) return null;
  const sr = side.getBoundingClientRect();
  const tr = tools.getBoundingClientRect();
  const cols = getComputedStyle(shellEl).gridTemplateColumns;
  return {
    left: Math.round(sr.width),
    right: Math.round(tr.width),
    cols,
  };
});

await page.screenshot({
  path: path.join(__dirname, "lesson-rails-ok.png"),
  fullPage: false,
});

await browser.close();

if (!dims) {
  console.error("Lesson shell not found");
  process.exit(1);
}

console.log(`left=${dims.left} right=${dims.right}`);
console.log(`grid=${dims.cols}`);

const delta = Math.abs(dims.left - dims.right);
if (delta > 2) {
  console.error(`MISMATCH: rails differ by ${delta}px`);
  process.exit(1);
}
if (dims.left < 290) {
  console.error(`LEFT TOO NARROW: ${dims.left}px (expected ~300–320)`);
  process.exit(1);
}
console.log("MATCH: left path rail width equals right tools rail");
