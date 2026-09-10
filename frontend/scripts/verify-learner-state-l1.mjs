/**
 * Browser verify: Learner pulse binds to L1 structured slices.
 * Run: node scripts/verify-learner-state-l1.mjs
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
const studentId =
  profile?.id != null
    ? `id_${profile.id}`
    : studentName.toLowerCase().replace(/\s+/g, "_");

/** Rich enough profile that L1 pulse shows knowledge / calibration / assistance */
const learningProfile = {
  version: 1,
  studentId,
  updatedAt: new Date().toISOString(),
  totals: {
    sessions: 3,
    exchanges: 14,
    correct: 5,
    partial: 3,
    incorrect: 6,
    hints: 4,
    questionsAsked: 2,
    totalResponseMs: 60000,
    responseSamples: 10,
  },
  mastery: {
    "Computer Science::Computer hardware": {
      subject: "Computer Science",
      topic: "Computer hardware",
      score: 55,
      attempts: 8,
      correct: 3,
      incorrect: 4,
      partial: 1,
    },
    "Math Foundations::Adding fractions": {
      subject: "Math Foundations",
      topic: "Adding fractions",
      score: 48,
      attempts: 6,
      correct: 2,
      incorrect: 3,
      partial: 1,
    },
  },
  misconceptions: {
    "mc.demo": {
      id: "mc.demo",
      label: "Mixes up RAM and storage",
      count: 3,
      isActive: true,
      playbook: { check_question: "What keeps data when the power is off?" },
    },
  },
  deliveryPreferences: { visual: 3, step_by_step: 2, story: 0, energetic: 0 },
  affectHistory: ["hesitant", "curious"],
  engagementHistory: [0.55, 0.6, 0.5],
  confidenceHistory: [0.85, 0.88, 0.9],
  strengths: [],
  focusAreas: [{ topic: "Hardware basics" }],
  behavior: {
    hintRate: 0.4,
    shortAnswerRate: 0.2,
    rapidGuessRate: 0.1,
    offTopicRate: 0,
    avgResponseMs: 3500,
    persistenceScore: 2,
    voiceInputCount: 0,
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

const shell = page.locator(".lesson-shell").first();
await shell.waitFor({ state: "visible", timeout: 20000 });

// Tools panel may need mobile toggle on small screens; desktop shows .lesson-tools
const tools = page.locator(".lesson-tools").first();
await tools.waitFor({ state: "visible", timeout: 10000 });

const pulse = page.locator(".learner-pulse").first();
await pulse.waitFor({ state: "visible", timeout: 8000 });

const text = (await pulse.innerText()).replace(/\s+/g, " ").trim();
console.log("Pulse text:", text.slice(0, 400));

const checks = {
  hasHeading: /Learner pulse/i.test(text),
  // Either empty state OR L1 body with knowledge / support / calibration / focus
  hasBody:
    /Topic mastery|Support|Knowledge|Focus areas|Observing|Kindling learns|confidence|engagement|On track|Needs scaffold|Partial|Working independently|Light support|Guided|High support|calibration|show-your-work|Stronger than|roughly matches|Pattern to gently|Persistence/i.test(
      text
    ),
};

// Prefer structured L1 fields when profile seeded
const structured =
  /Topic mastery|Support|Knowledge|Focus areas|Light support|Guided|High support|Working independently|show-your-work|Stronger than|roughly matches/i.test(
    text
  );

await page.screenshot({
  path: path.join(__dirname, "learner-state-l1-ok.png"),
  fullPage: false,
});

// Send a student turn so lastSignals populate pulse chips
const input = page.locator("textarea, input[type='text']").filter({ hasNot: page.locator("[disabled]") }).first();
if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
  await input.fill("I think the answer is 1/2 + 1/3 = 2/5 because I add tops and bottoms.");
  const send = page.getByRole("button", { name: /send|ask|go/i }).first();
  if (await send.isVisible().catch(() => false)) {
    await send.click({ force: true });
  } else {
    await input.press("Enter");
  }
  await page.waitForTimeout(6000);
}

const textAfter = (await pulse.innerText()).replace(/\s+/g, " ").trim();
console.log("Pulse after turn:", textAfter.slice(0, 500));

const afterLive =
  /On track|Needs scaffold|Partial|Exploring|Confident|Hesitant|Frustrated|Curious|Steady|Think time|%|Support|Knowledge|Pattern to gently|Mixes up|RAM/i.test(
    textAfter
  );

await page.screenshot({
  path: path.join(__dirname, "learner-state-l1-after-turn.png"),
  fullPage: false,
});

await browser.close();

const ok = checks.hasHeading && checks.hasBody && (structured || afterLive);
if (!ok) {
  console.error("FAIL L1 pulse verify", { checks, structured, afterLive });
  process.exit(1);
}
console.log("OK L1 learner pulse", {
  checks,
  structured,
  afterLive,
  shot: "scripts/learner-state-l1-ok.png",
});
