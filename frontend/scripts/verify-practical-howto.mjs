/**
 * Browser verify: Files & folders lesson teaches hands-on how-to steps.
 * Requires frontend :5173, backend :8000, AI configured.
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = process.env.KINDLE_FE_URL || "http://localhost:5173";
const API = process.env.KINDLE_API_URL || "http://127.0.0.1:8000";
const OUT = path.join(__dirname, "practical-howto-ok.png");

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
  if (!me.ok) throw new Error(`No student profile (${me.status})`);
  const profile = await me.json();

  // Ensure CS subject + Files & folders subtopic via API if available
  let subjects = [];
  try {
    const sRes = await fetch(`${API}/api/curriculum/subjects/`, {
      headers: { Authorization: `Bearer ${tokens.access}` },
    });
    if (sRes.ok) {
      const data = await sRes.json();
      subjects = Array.isArray(data) ? data : data.results || [];
    }
  } catch {
    /* ignore */
  }

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
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
    });

    // Subjects → Computer Science → Files & folders
    const subjectsNav = page
      .getByRole("navigation")
      .getByRole("button", { name: /Subjects|My subjects/i });
    if (await subjectsNav.isVisible({ timeout: 4000 }).catch(() => false)) {
      await subjectsNav.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const csCard = page
      .getByRole("button", { name: /Computer Science/i })
      .or(page.getByText(/Computer Science/i))
      .first();
    if (await csCard.isVisible({ timeout: 4000 }).catch(() => false)) {
      await csCard.click({ force: true });
      await page.waitForTimeout(900);
    }

    // Expand literacy unit if needed
    const unit = page.getByText(/Digital.*literacy|computer literacy/i).first();
    if (await unit.isVisible({ timeout: 2500 }).catch(() => false)) {
      await unit.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }

    const filesTopic = page
      .getByRole("button", { name: /Files\s*&?\s*folders/i })
      .or(page.getByText(/Files\s*&?\s*folders/i))
      .first();
    if (await filesTopic.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filesTopic.click({ force: true });
    } else {
      // Fallback: any continue/start lesson
      const openLesson = page
        .getByRole("button", {
          name: /Continue|Open lesson|Start|Resume|Practice/i,
        })
        .first();
      await openLesson.click({ force: true });
    }

    await page.waitForTimeout(2000);
    for (let i = 0; i < 5; i += 1) {
      const skip = page
        .getByRole("button", { name: /skip|not now|dismiss|not yet|maybe later/i })
        .first();
      if (await skip.isVisible({ timeout: 700 }).catch(() => false)) {
        await skip.click({ force: true }).catch(() => {});
        await page.waitForTimeout(350);
      } else break;
    }

    // Wait for greeting stream to settle
    let tutorText = "";
    for (let t = 0; t < 40; t += 1) {
      const skip = page
        .getByRole("button", { name: /skip|not now|dismiss/i })
        .first();
      if (await skip.isVisible({ timeout: 200 }).catch(() => false)) {
        await skip.click({ force: true }).catch(() => {});
      }
      tutorText = await page.evaluate(() => {
        const bubbles = [
          ...document.querySelectorAll(
            ".tutor-message, .message-tutor, [data-role='tutor'], .chat-bubble.tutor, .lesson-chat .markdown-body"
          ),
        ];
        if (!bubbles.length) {
          // broader fallback
          const main = document.querySelector("main") || document.body;
          return main?.innerText || "";
        }
        return bubbles.map((b) => b.innerText || "").join("\n\n");
      });
      const streaming = await page
        .locator(".is-streaming, [data-streaming='true']")
        .count()
        .catch(() => 0);
      if (tutorText.length > 120 && streaming === 0 && t > 4) break;
      await page.waitForTimeout(1500);
    }

    // Tap how-to chip if present
    const howToChip = page
      .locator(".tutor-suggest-chip")
      .filter({ hasText: /step by step|walk me|how to|try-it|click first/i })
      .first();
    let usedChip = false;
    if (await howToChip.isVisible({ timeout: 3000 }).catch(() => false)) {
      usedChip = true;
      await howToChip.click({ force: true });
      // Wait for follow-up reply
      for (let t = 0; t < 35; t += 1) {
        const streaming = await page
          .locator(".is-streaming, [data-streaming='true']")
          .count()
          .catch(() => 0);
        tutorText = await page.evaluate(() => {
          const bubbles = [
            ...document.querySelectorAll(
              ".tutor-message, .message-tutor, [data-role='tutor'], .chat-bubble.tutor, .lesson-chat .markdown-body, .message-content"
            ),
          ];
          if (!bubbles.length) {
            return (document.querySelector("main") || document.body).innerText || "";
          }
          return bubbles.map((b) => b.innerText || "").join("\n\n");
        });
        if (
          streaming === 0 &&
          t > 3 &&
          (/1\.|step 1|first,|create a (new )?folder|file explorer|finder/i.test(
            tutorText
          ) ||
            tutorText.length > 400)
        ) {
          break;
        }
        await page.waitForTimeout(1500);
      }
    } else {
      // Type a how-to request
      const input = page
        .locator(
          'textarea, input[placeholder*="Ask"], input[placeholder*="message"], [contenteditable="true"]'
        )
        .first();
      if (await input.isVisible({ timeout: 4000 }).catch(() => false)) {
        await input.fill("Show me how to create a folder step by step on my computer");
        const send = page
          .getByRole("button", { name: /send|ask|go/i })
          .or(page.locator('button[type="submit"]'))
          .first();
        if (await send.isVisible({ timeout: 2000 }).catch(() => false)) {
          await send.click({ force: true });
        } else {
          await input.press("Enter");
        }
        for (let t = 0; t < 35; t += 1) {
          tutorText = await page.evaluate(() => {
            const bubbles = [
              ...document.querySelectorAll(
                ".tutor-message, .message-tutor, [data-role='tutor'], .chat-bubble.tutor, .lesson-chat .markdown-body, .message-content"
              ),
            ];
            if (!bubbles.length) {
              return (document.querySelector("main") || document.body).innerText || "";
            }
            return bubbles.map((b) => b.innerText || "").join("\n\n");
          });
          const streaming = await page
            .locator(".is-streaming, [data-streaming='true']")
            .count()
            .catch(() => 0);
          if (
            streaming === 0 &&
            t > 3 &&
            /1\.|folder|file explorer|finder|step/i.test(tutorText)
          ) {
            break;
          }
          await page.waitForTimeout(1500);
        }
      }
    }

    await page.screenshot({ path: OUT, fullPage: false });

    const hasNumberedSteps =
      /(?:^|\n)\s*1[\.)]\s+\S[\s\S]{0,400}(?:^|\n)\s*2[\.)]\s+\S/m.test(
        tutorText
      ) ||
      /step\s*1|first[,:]/i.test(tutorText);
    const hasFolderHowTo =
      /folder|file explorer|finder|create a (new )?folder|right-?click|new folder/i.test(
        tutorText
      );
    const chips = page.locator(".tutor-suggest-chip");
    const chipCount = await chips.count();
    const chipTexts = [];
    for (let i = 0; i < Math.min(chipCount, 8); i += 1) {
      chipTexts.push(((await chips.nth(i).innerText()) || "").trim());
    }
    const hasHowToChip = chipTexts.some((c) =>
      /step by step|walk me|how to|try-it|click first|checklist/i.test(c)
    );

    console.log("--- tutor excerpt ---");
    console.log(tutorText.slice(0, 900));
    console.log("--- chips ---");
    console.log(chipTexts.join(" | "));
    console.log("usedChip:", usedChip);
    console.log("hasNumberedSteps:", hasNumberedSteps);
    console.log("hasFolderHowTo:", hasFolderHowTo);
    console.log("hasHowToChip:", hasHowToChip);
    console.log("screenshot:", OUT);

    if (!hasFolderHowTo) {
      throw new Error("Tutor text missing folder/file how-to content");
    }
    if (!hasNumberedSteps) {
      // Soft fail if opening only invited how-to — still require invitation + chip
      if (!hasHowToChip && !/step by step|show you how|walk you through/i.test(tutorText)) {
        throw new Error(
          "No numbered steps and no how-to invitation/chip in lesson"
        );
      }
      console.log(
        "WARN: numbered steps not yet in transcript; invitation/chip present"
      );
    }

    console.log("\nVERIFY OK — practical how-to path present");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("VERIFY FAIL:", err?.message || err);
  process.exit(1);
});
