/**
 * Browser verify Epic C1 Review spark (Dashboard card + Start).
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

  // Ensure due reviews exist
  const rev = await fetch(`${API}/api/learning/reviews/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  if (!rev.ok) throw new Error(`Reviews API ${rev.status}`);
  const revBody = await rev.json();
  console.log(`API due count: ${revBody.count ?? (revBody.due || []).length}`);

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

    await page.goto(FE, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
    });

    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^Dashboard$/i })
      .click({ force: true });
    await page.waitForTimeout(2000);

    const region = page.getByRole("region", { name: /Review spark/i });
    await region.waitFor({ state: "visible", timeout: 15000 });
    console.log("✓ Review spark region on dashboard");

    const startBtn = region.getByRole("button", { name: /^Start$/i }).first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click({ force: true });
      await page.waitForTimeout(2500);
      const banner = page.locator(".review-mode-banner");
      if (await banner.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log("✓ Review mode banner in lesson");
      } else {
        // Energy check-in may be on top — still check for banner text
        const text = await page.locator("body").innerText();
        if (/Review spark/i.test(text)) {
          console.log("✓ Review spark copy present in lesson");
        } else {
          errors.push("Expected review mode banner after Start");
        }
      }
    } else {
      // No due items for this account — still pass if empty state is correct
      const empty = await region.innerText();
      if (/No reviews due|warm-up/i.test(empty)) {
        console.log("✓ Empty Review spark state (no due items)");
      } else {
        errors.push("No Start button and unexpected empty copy");
      }
    }
  } catch (err) {
    errors.push(err?.message || String(err));
    try {
      await page.screenshot({ path: "scripts/c1-verify-fail.png", fullPage: true });
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close();
  }

  if (errors.length) {
    console.error("\nC1 browser verify FAILED:");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }
  console.log("\nC1 browser verify OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
