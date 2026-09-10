/**
 * Browser verify Epic C6 Quick check assessment (Playwright).
 * Requires: frontend :5173, backend :8000, seeded demo.
 *
 * Flow: open lesson → start Quick check from tools → answer one item →
 * see tutor explanation → next → exit.
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = process.env.KINDLE_FE_URL || "http://localhost:5173";
const API = process.env.KINDLE_API_URL || "http://127.0.0.1:8000";

async function main() {
  const demoRes = await fetch(`${API}/api/auth/demo/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!demoRes.ok) {
    throw new Error(`Demo login failed: ${demoRes.status}`);
  }
  const demo = await demoRes.json();
  const tokens = demo.tokens || {};
  const user = demo.user || {};

  const me = await fetch(`${API}/api/students/me/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  if (!me.ok) {
    throw new Error(`No student profile (${me.status}). seed_kindling?`);
  }
  const profile = await me.json();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
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
          localStorage.setItem(
            "kindling_student_profile",
            JSON.stringify(profile)
          );
        }
      },
      { tokens, user, profile }
    );

    await page.goto(FE, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
    });

    // Open Subjects → start a Math Foundations lesson
    const subjectsNav = page
      .getByRole("navigation")
      .getByRole("button", { name: /Subjects|My subjects/i });
    if (await subjectsNav.isVisible({ timeout: 4000 }).catch(() => false)) {
      await subjectsNav.click({ force: true });
      await page.waitForTimeout(1200);
    }

    // Prefer a continue / open lesson control
    const openLesson = page
      .getByRole("button", {
        name: /Continue|Open lesson|Start|Resume|Practice/i,
      })
      .first();
    if (await openLesson.isVisible({ timeout: 5000 }).catch(() => false)) {
      await openLesson.click({ force: true });
    } else {
      // Fallback: dashboard then any lesson CTA
      await page
        .getByRole("navigation")
        .getByRole("button", { name: /^Dashboard$/i })
        .click({ force: true })
        .catch(() => {});
      await page.waitForTimeout(1000);
      const cta = page
        .getByRole("button", { name: /Continue|Start|lesson|Practice|Review/i })
        .first();
      await cta.click({ force: true });
    }
    await page.waitForTimeout(2800);

    // Dismiss energy / affect check-in if present
    for (let i = 0; i < 3; i += 1) {
      const skip = page
        .getByRole("button", { name: /skip|not now|dismiss|not yet/i })
        .first();
      if (await skip.isVisible({ timeout: 900 }).catch(() => false)) {
        await skip.click({ force: true }).catch(() => {});
        await page.waitForTimeout(400);
      } else break;
    }

    // Lesson shell should be up
    const lesson = page.locator("#lesson, section#lesson, .lesson-shell").first();
    const inLesson = await lesson.isVisible({ timeout: 10000 }).catch(() => false);
    if (!inLesson) {
      // Try clicking a subject card
      const card = page.locator(".subject-card, [class*='subject']").first();
      if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
        await card.click({ force: true });
        await page.waitForTimeout(1500);
      }
    }

    // On mobile tools tab if needed
    const toolsTab = page.getByRole("button", { name: /tools|settings/i }).last();
    if (await toolsTab.isVisible({ timeout: 800 }).catch(() => false)) {
      // Prefer desktop tools panel
    }

    // Start Quick check from tools (works offline — no AI required)
    let quickBtn = page.getByRole("button", { name: /Quick check/i }).first();
    if (!(await quickBtn.isVisible({ timeout: 4000 }).catch(() => false))) {
      // Open tools panel on mobile
      const tab = page.locator(".lesson-mobile-tabs button").nth(2);
      if (await tab.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tab.click({ force: true });
        await page.waitForTimeout(500);
      }
      quickBtn = page.getByRole("button", { name: /Quick check/i }).first();
    }

    if (!(await quickBtn.isVisible({ timeout: 6000 }).catch(() => false))) {
      await page.screenshot({
        path: path.join(__dirname, "c6-verify-fail.png"),
        fullPage: true,
      });
      throw new Error("Quick check button not found in lesson tools");
    }
    console.log("  ✓ Quick check control visible");

    await quickBtn.click({ force: true });
    await page.waitForTimeout(900);

    const panel = page.getByRole("region", { name: /Quick check assessment/i });
    await panel.waitFor({ state: "visible", timeout: 8000 });
    console.log("  ✓ Assessment panel open");

    const banner = page.getByRole("status", { name: /Quick check/i });
    const hasBanner = await banner.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasBanner) console.log("  ✓ Assessment mode banner");

    // Answer first question (pick option A)
    const optionA = panel.getByRole("button", { name: /^A\b|^A /i }).first();
    const anyOpt = panel.locator("button.assessment-option").first();
    if (await optionA.isVisible({ timeout: 2000 }).catch(() => false)) {
      await optionA.click({ force: true });
    } else {
      await anyOpt.click({ force: true });
    }
    await page.waitForTimeout(600);

    // Explanation should appear (You got it / Let's revise)
    const explain = panel.locator(".assessment-explain");
    await explain.waitFor({ state: "visible", timeout: 5000 });
    const explainText = await explain.innerText();
    if (!/(got it|revise|Solid answer|Yes|Not)/i.test(explainText)) {
      throw new Error("Tutor explanation missing after answer");
    }
    console.log("  ✓ Tutor explanation after answer");

    // Next question
    const next = panel.getByRole("button", {
      name: /Next question|See results/i,
    });
    await next.click({ force: true });
    await page.waitForTimeout(500);
    console.log("  ✓ Advanced after explanation");

    // Exit check
    const exit = panel.getByRole("button", { name: /Exit check|Close check/i });
    if (await exit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exit.click({ force: true });
      await page.waitForTimeout(400);
      console.log("  ✓ Exited quick check");
    }

    await page.screenshot({
      path: path.join(__dirname, "c6-verify-ok.png"),
      fullPage: true,
    });
    console.log("\nEpic C6 browser verify passed.");
  } catch (err) {
    await page
      .screenshot({
        path: path.join(__dirname, "c6-verify-fail.png"),
        fullPage: true,
      })
      .catch(() => {});
    console.error("Saved scripts/c6-verify-fail.png");
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
