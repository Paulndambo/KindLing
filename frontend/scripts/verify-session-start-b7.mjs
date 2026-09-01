/**
 * Browser verify Epic B7 session-start energy chip (Playwright).
 * Requires: frontend on :5173, backend on :8000, seeded demo profile.
 */
import { chromium } from "playwright";

const FE = process.env.KINDLE_FE_URL || "http://localhost:5173";
const API = process.env.KINDLE_API_URL || "http://127.0.0.1:8000";

async function main() {
  const demoRes = await fetch(`${API}/api/auth/demo/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!demoRes.ok) {
    throw new Error(`Demo login failed: ${demoRes.status} ${await demoRes.text()}`);
  }
  const demo = await demoRes.json();
  const tokens = demo.tokens || {};
  const user = demo.user || {};

  // Confirm student profile exists
  const me = await fetch(`${API}/api/students/me/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  if (!me.ok) {
    throw new Error(
      `No student profile for demo user (${me.status}). Run: python manage.py seed_kindling`
    );
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];

  try {
    await page.addInitScript(
      ({ tokens, user }) => {
        localStorage.setItem("kindling_auth_tokens", JSON.stringify(tokens));
        localStorage.setItem(
          "kindling_user_session",
          JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name || "Demo Student",
            isLoggedIn: true,
            loggedInAt: new Date().toISOString(),
            tokens,
          })
        );
      },
      { tokens, user }
    );

    await page.goto(FE, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1500);

    // Close onboarding if it appears
    await page.evaluate(() => {
      document.querySelectorAll(".modal-overlay").forEach((el) => {
        el.style.display = "none";
        el.remove();
      });
    });

    // My subjects tab
    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^Subjects$/i })
      .click({ force: true });
    await page.waitForTimeout(1000);

    // Click Start next to Fraction sense (first Math Foundations topic)
    const fracRow = page.locator("text=Fraction sense").first();
    await fracRow.waitFor({ state: "visible", timeout: 15000 });
    // The Start control is near the topic name
    const startNear = page
      .locator("li, div, article, section")
      .filter({ hasText: /Fraction sense/i })
      .getByRole("button", { name: /^Start/i })
      .first();
    if (await startNear.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startNear.click({ force: true });
    } else {
      // Fallback: any Start in Math Foundations card
      await page
        .locator("text=Math Foundations")
        .locator("..")
        .getByRole("button", { name: /^Start/i })
        .first()
        .click({ force: true });
    }

    // Wait for lesson chrome
    await page.waitForTimeout(2000);
    const lessonHint = page.getByText(/Live lesson|Fraction sense|Kindling/i).first();
    await lessonHint.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});

    // Energy region
    let energy = page.getByRole("region", {
      name: /energy check-in before lesson/i,
    });
    if (!(await energy.isVisible({ timeout: 8000 }).catch(() => false))) {
      // Also try class-based selector
      const byClass = page.locator(".affect-checkin.session-start, .affect-checkin").first();
      if (await byClass.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("✓ energy card found via class");
        energy = byClass;
      } else {
        // Dump a bit of DOM for debugging
        const hasLesson = await page.locator(".lesson-main, .lesson-header").count();
        errors.push(
          `Energy card not visible (lesson nodes=${hasLesson}). Page text sample: ${(
            await page.locator("body").innerText()
          ).slice(0, 400)}`
        );
      }
    } else {
      console.log("✓ session-start energy region visible");
    }

    if (!errors.length) {
      const body = await energy.innerText();
      if (!/ready|okay|low|break|energy/i.test(body)) {
        errors.push("Energy card missing expected labels: " + body.slice(0, 200));
      }

      const lowBtn = energy.getByRole("button", { name: /a bit low/i });
      if (await lowBtn.isVisible().catch(() => false)) {
        await lowBtn.click();
      } else {
        await energy.locator("button.opt-low, button:has-text('A bit low')").first().click();
      }
      console.log("✓ chose A bit low");
      await page.waitForTimeout(1200);

      const stillOpen = await page
        .getByRole("region", { name: /energy check-in before lesson/i })
        .isVisible()
        .catch(() => false);
      if (stillOpen) errors.push("Energy card still open after response");
      else console.log("✓ energy card closed after response");

      const gentleCopy = await page
        .getByText(
          /gentle|easier path|warm-up|break|gentler start|keep this gentle|Yes, easier/i
        )
        .count();
      if (gentleCopy < 1) {
        errors.push("Expected gentle/L4 affordance after low energy");
      } else {
        console.log("✓ gentle / break-or-easier affordance present");
      }
    }
  } catch (err) {
    errors.push(err?.message || String(err));
  } finally {
    try {
      await page.screenshot({
        path: "scripts/b7-verify-fail.png",
        fullPage: true,
      });
    } catch {
      /* ignore */
    }
    await browser.close();
  }

  if (errors.length) {
    console.error("\nB7 browser verify FAILED:");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }
  console.log("\nB7 browser verify OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
