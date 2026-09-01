/**
 * Browser verify Epic B8 end-of-session reflection.
 * Requires: frontend :5173, backend :8000, seeded demo profile.
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
  if (!demoRes.ok) throw new Error(`Demo login failed: ${demoRes.status}`);
  const demo = await demoRes.json();
  const tokens = demo.tokens || {};
  const user = demo.user || {};

  const me = await fetch(`${API}/api/students/me/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  if (!me.ok) {
    throw new Error("No student profile — run seed_kindling");
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
            name: user.name || "Demo",
            isLoggedIn: true,
            loggedInAt: new Date().toISOString(),
            tokens,
          })
        );
      },
      { tokens, user }
    );

    await page.goto(FE, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
    });

    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^Subjects$/i })
      .click({ force: true });
    await page.waitForTimeout(800);

    // Prefer Fraction sense Start; fallback any Start under Math Foundations
    const fracStart = page
      .locator("li, div, article, section")
      .filter({ hasText: /^Fraction sense/i })
      .getByRole("button", { name: /^Start/i })
      .first();
    if (await fracStart.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fracStart.click({ force: true });
    } else {
      await page
        .getByRole("button", { name: /^Start/i })
        .first()
        .click({ force: true });
    }
    await page.waitForTimeout(3000);

    // Dismiss B7 energy if present so we can send a turn
    const energy = page.getByRole("region", {
      name: /energy check-in before lesson/i,
    });
    if (await energy.isVisible({ timeout: 6000 }).catch(() => false)) {
      await energy
        .getByRole("button", { name: /feeling ready|doing okay/i })
        .first()
        .click();
      await page.waitForTimeout(800);
    }

    // Chat composer is a text input (not textarea)
    const chatInput = page
      .locator(
        'input[placeholder*="Answer"], input[placeholder*="Kindling"], .lesson-input input[type="text"]'
      )
      .first();
    await chatInput.waitFor({ state: "visible", timeout: 25000 });

    // One student turn so wrap-up has substance (turnCount / messages)
    await chatInput.click();
    await chatInput.fill("I think 1/2 is the same as 2/4");
    await page.keyboard.press("Enter");
    // Wait for tutor reply or at least student bubble
    await page.waitForTimeout(6000);

    // Open tools if needed on mobile - desktop has tools sidebar
    const wrapBtn = page.getByRole("button", { name: /wrap up/i }).first();
    if (!(await wrapBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      // Try Tools tab
      const toolsTab = page.getByRole("button", { name: /^Tools$/i });
      if (await toolsTab.isVisible().catch(() => false)) {
        await toolsTab.click();
        await page.waitForTimeout(400);
      }
    }
    await page.getByRole("button", { name: /wrap up/i }).first().click({ force: true });
    console.log("✓ clicked Wrap up");

    const reflect = page.getByRole("region", {
      name: /session wrap-up reflection/i,
    });
    await reflect.waitFor({ state: "visible", timeout: 15000 });
    console.log("✓ reflection card visible");

    await reflect.getByRole("button", { name: /still a bit fuzzy/i }).click();
    await reflect.getByRole("button", { name: /practice this again/i }).click();
    await reflect.getByRole("button", { name: /save & finish/i }).click();
    console.log("✓ submitted reflection");

    await page.waitForTimeout(3000);

    const stillOpen = await reflect.isVisible().catch(() => false);
    if (stillOpen) errors.push("Reflection card still open after save");
    else console.log("✓ reflection card closed");

    // Ended state or journal save
    const ended = await page
      .getByText(/Saved to Learning Journal|Session complete|Learning Journal/i)
      .count();
    if (ended < 1) {
      // may still be summarizing
      await page.waitForTimeout(5000);
    }
    const ended2 = await page
      .getByText(/Saved to Learning Journal|Session complete|Next time/i)
      .count();
    if (ended2 < 1) errors.push("Expected ended/journal affordance after wrap-up");
    else console.log("✓ post-wrap-up ended surface present");
  } catch (err) {
    errors.push(err?.message || String(err));
    try {
      await page.screenshot({ path: "scripts/b8-verify-fail.png", fullPage: true });
      console.error("Saved scripts/b8-verify-fail.png");
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close();
  }

  if (errors.length) {
    console.error("\nB8 browser verify FAILED:");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }
  console.log("\nB8 browser verify OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
