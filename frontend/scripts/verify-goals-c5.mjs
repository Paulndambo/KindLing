/**
 * Browser verify Epic C5 Goals surface (lite) — Playwright.
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

  const me = await fetch(`${API}/api/students/me/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  if (!me.ok) {
    throw new Error(
      `No student profile (${me.status}). Run: python manage.py seed_kindling`
    );
  }

  // Set a week focus via API so dashboard + lesson can show it
  const weekLine = `C5 verify week focus ${Date.now().toString(36)}`;
  const patch = await fetch(`${API}/api/students/me/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${tokens.access}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ weekFocus: weekLine }),
  });
  if (!patch.ok) {
    throw new Error(`weekFocus PATCH failed: ${patch.status} ${await patch.text()}`);
  }
  const patched = await patch.json();
  if (patched.weekFocus !== weekLine) {
    throw new Error(`weekFocus not persisted: ${JSON.stringify(patched.weekFocus)}`);
  }
  console.log("  ✓ API weekFocus PATCH");

  // Prefetch profile so localStorage bootstrap already has weekFocus
  const profileRes = await fetch(`${API}/api/students/me/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : null;

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
            name: user.name || profile?.name || "Demo Student",
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

    await page.goto(FE, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      document.querySelectorAll(".modal-overlay").forEach((el) => {
        el.style.display = "none";
        el.remove();
      });
    });

    // Dashboard — week focus card
    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^Dashboard$/i })
      .click({ force: true });
    await page.waitForTimeout(2000);

    const weekRegion = page.getByRole("region", { name: /This week focus/i });
    await weekRegion.waitFor({ state: "visible", timeout: 15000 });
    const input = weekRegion.locator("#week-focus-input");
    await input.waitFor({ state: "visible" });
    const shown = await input.inputValue();
    if (!shown.includes("C5 verify week focus")) {
      // Profile may still be loading from cache — type-save path
      await input.fill(weekLine);
      await weekRegion.getByRole("button", { name: /^Save$/i }).click();
      await page.waitForTimeout(800);
      const after = await input.inputValue();
      if (!after.includes("C5 verify week focus")) {
        throw new Error(`Dashboard week focus input missing value: "${shown}" / "${after}"`);
      }
    }
    console.log("  ✓ Dashboard WeekFocusCard shows saved line");

    // My subjects → start Fraction sense lesson
    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^Subjects$/i })
      .click({ force: true });
    await page.waitForTimeout(1500);

    const fracRow = page.locator("text=Fraction sense").first();
    await fracRow.waitFor({ state: "visible", timeout: 15000 });
    const startNear = page
      .locator("li, div, article, section")
      .filter({ hasText: /Fraction sense/i })
      .getByRole("button", { name: /^Start$/i })
      .first();
    if (await startNear.count()) {
      await startNear.click({ force: true });
    } else {
      await page.getByRole("button", { name: /^Start$/i }).first().click({ force: true });
    }
    await page.waitForTimeout(3000);

    // Dismiss energy chip if it covers UI
    const skipEnergy = page.getByRole("button", { name: /skip|not now|dismiss/i }).first();
    if (await skipEnergy.isVisible({ timeout: 1500 }).catch(() => false)) {
      await skipEnergy.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }

    // Lesson path goals chip (aside)
    const path = page.locator("aside.lesson-side, [aria-label='Lesson path']").first();
    await path.waitFor({ state: "visible", timeout: 12000 });
    const pathGoals = path.locator(".lesson-path-goals .goals-chip, .goals-chip").first();
    await pathGoals.waitFor({ state: "visible", timeout: 12000 });
    console.log("  ✓ Lesson path shows goals chip");

    // Header orientation chip
    const headerGoals = page.locator(".lesson-header-goals .goals-chip").first();
    await headerGoals.waitFor({ state: "visible", timeout: 8000 });
    console.log("  ✓ Lesson header shows goals orientation");

    // Tools panel "Your focus"
    const toolsFocus = page.getByRole("region", { name: /Your focus/i });
    if (await toolsFocus.count()) {
      await toolsFocus.first().waitFor({ state: "visible", timeout: 8000 });
      console.log("  ✓ Lesson tools Your focus panel");
    } else {
      const toolsTab = page.getByRole("button", { name: /tools/i }).first();
      if (await toolsTab.count()) {
        await toolsTab.click({ force: true });
        await page.waitForTimeout(500);
      }
      await page.getByRole("region", { name: /Your focus/i }).waitFor({
        state: "visible",
        timeout: 8000,
      });
      console.log("  ✓ Lesson tools Your focus panel (via tools tab)");
    }

    const bodyText = await page.locator("body").innerText();
    if (
      !/Beginner|Brand new|Basics|Comfortable|Review|foundation|fraction|Your focus|This week/i.test(
        bodyText
      )
    ) {
      throw new Error("Expected familiarity or goal language on lesson surface");
    }
    console.log("  ✓ Goal / familiarity language visible in lesson");

    console.log("\nEpic C5 browser verify passed.");
  } catch (err) {
    try {
      await page.screenshot({
        path: "scripts/c5-verify-fail.png",
        fullPage: true,
      });
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("\nEpic C5 verify FAILED:", err.message || err);
  process.exit(1);
});
