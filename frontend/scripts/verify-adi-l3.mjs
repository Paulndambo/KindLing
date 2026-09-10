/**
 * Browser verify: Learner pulse shows Independence (L3 ADI) line.
 * Run: node scripts/verify-adi-l3.mjs
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
const studentName = profile?.name || user.name || "Demo";
const nameId = studentName.toLowerCase().replace(/\s+/g, "_");

const learningProfile = {
  version: 1,
  studentId: nameId,
  updatedAt: new Date().toISOString(),
  totals: {
    sessions: 4,
    exchanges: 16,
    correct: 8,
    partial: 3,
    incorrect: 5,
    hints: 6,
    questionsAsked: 2,
    totalResponseMs: 80000,
    responseSamples: 12,
  },
  mastery: {
    "Computer Science::Understanding technology": {
      subject: "Computer Science",
      topic: "Understanding technology",
      score: 68,
      attempts: 10,
      correct: 6,
      incorrect: 3,
      partial: 1,
    },
  },
  misconceptions: {},
  deliveryPreferences: { visual: 2, step_by_step: 3 },
  affectHistory: ["curious"],
  engagementHistory: [0.6, 0.65, 0.7],
  confidenceHistory: [0.55, 0.6, 0.58],
  strengths: [],
  focusAreas: [{ topic: "Tech basics" }],
  behavior: {
    hintRate: 0.2,
    shortAnswerRate: 0.1,
    rapidGuessRate: 0.05,
    offTopicRate: 0,
    avgResponseMs: 4000,
    persistenceScore: 2,
    adi: 0.24,
    adiBand: "gaining_independence",
    adiTrend: "falling",
    independencePct: 76,
  },
  skills: {},
  lastSession: null,
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
await page.waitForTimeout(1200);
await page.evaluate(() => {
  document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
});

const open = page
  .getByRole("button", { name: /Start a lesson|Continue|Open|Practice/i })
  .first();
if (await open.isVisible({ timeout: 6000 }).catch(() => false)) {
  await open.click({ force: true });
  await page.waitForTimeout(2800);
}

for (let i = 0; i < 4; i += 1) {
  const skip = page
    .getByRole("button", { name: /skip|not now|dismiss|not yet/i })
    .first();
  if (await skip.isVisible({ timeout: 600 }).catch(() => false)) {
    await skip.click({ force: true }).catch(() => {});
  } else break;
}

await page.locator(".lesson-shell").first().waitFor({ state: "visible", timeout: 20000 });
const pulse = page.locator(".learner-pulse").first();
await pulse.waitFor({ state: "visible", timeout: 8000 });

const text = (await pulse.innerText()).replace(/\s+/g, " ").trim();
console.log("Pulse:", text.slice(0, 500));

const hasIndependence =
  /Independence|Growing independence|Building independence|lighter support|lighter hint|healthy help/i.test(
    text
  );

await page.screenshot({
  path: path.join(__dirname, "adi-l3-ok.png"),
  fullPage: false,
});

await browser.close();

if (!hasIndependence) {
  console.error("FAIL: independence / ADI line not found in learner pulse");
  process.exit(1);
}
console.log("OK L3 ADI pulse", { hasIndependence, shot: "scripts/adi-l3-ok.png" });
