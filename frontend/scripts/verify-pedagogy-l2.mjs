/**
 * Browser verify L2: dashboard NBA card + lesson pulse "Next move".
 * Run: node scripts/verify-pedagogy-l2.mjs
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
const nameId = (profile?.name || user.name || "demo")
  .toLowerCase()
  .replace(/\s+/g, "_");

const learningProfile = {
  version: 1,
  studentId: nameId,
  updatedAt: new Date().toISOString(),
  totals: {
    sessions: 3,
    exchanges: 12,
    correct: 6,
    partial: 2,
    incorrect: 4,
    hints: 3,
  },
  mastery: {
    "Computer Science::Understanding technology": {
      score: 55,
      attempts: 6,
      correct: 3,
      incorrect: 2,
      partial: 1,
    },
  },
  misconceptions: {},
  deliveryPreferences: { visual: 2 },
  engagementHistory: [0.6, 0.65],
  confidenceHistory: [0.5, 0.55],
  focusAreas: [{ topic: "Tech basics" }],
  behavior: {
    hintRate: 0.25,
    adi: 0.3,
    adiBand: "balanced_support",
    independencePct: 70,
  },
  skills: {},
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.addInitScript(
  ({ tokens, user, profile, learningProfile }) => {
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
    localStorage.setItem(
      "kindling_learning_profile_v1",
      JSON.stringify(learningProfile)
    );
  },
  { tokens, user, profile, learningProfile }
);

await page.goto(FE, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
});

// Open dashboard if needed
const dashNav = page.getByRole("button", { name: /^Dashboard$/i }).first();
if (await dashNav.isVisible({ timeout: 3000 }).catch(() => false)) {
  await dashNav.click({ force: true });
  await page.waitForTimeout(2000);
}

const nba = page.locator(".nba-card").first();
const hasNba = await nba.isVisible({ timeout: 8000 }).catch(() => false);
let nbaText = "";
if (hasNba) {
  nbaText = (await nba.innerText()).replace(/\s+/g, " ").trim();
}
console.log("NBA card:", hasNba, nbaText.slice(0, 200));

await page.screenshot({
  path: path.join(__dirname, "pedagogy-l2-dashboard.png"),
  fullPage: false,
});

// Open a lesson for pulse next-move
const open = page
  .getByRole("button", {
    name: /Start a lesson|Continue|Open|Practice|Go|Start review/i,
  })
  .first();
if (await open.isVisible({ timeout: 4000 }).catch(() => false)) {
  await open.click({ force: true });
  await page.waitForTimeout(2800);
}

for (let i = 0; i < 4; i += 1) {
  const skip = page
    .getByRole("button", { name: /skip|not now|dismiss|not yet/i })
    .first();
  if (await skip.isVisible({ timeout: 500 }).catch(() => false)) {
    await skip.click({ force: true }).catch(() => {});
  } else break;
}

const shell = page.locator(".lesson-shell").first();
const inLesson = await shell.isVisible({ timeout: 12000 }).catch(() => false);
let pulseText = "";
let hasNextMove = false;
if (inLesson) {
  const pulse = page.locator(".learner-pulse").first();
  await pulse.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  pulseText = ((await pulse.innerText().catch(() => "")) || "").replace(
    /\s+/g,
    " "
  );
  hasNextMove = /Next move|Socratic|Micro-hint|Guide|Independent|Review|Explain/i.test(
    pulseText
  );
  console.log("Pulse:", pulseText.slice(0, 350));
}

await page.screenshot({
  path: path.join(__dirname, "pedagogy-l2-lesson.png"),
  fullPage: false,
});

await browser.close();

const ok = hasNba || hasNextMove;
if (!ok) {
  console.error("FAIL L2 verify", { hasNba, hasNextMove, nbaText, pulseText });
  process.exit(1);
}
console.log("OK L2 pedagogy", {
  hasNba,
  hasNextMove,
  shots: ["scripts/pedagogy-l2-dashboard.png", "scripts/pedagogy-l2-lesson.png"],
});
