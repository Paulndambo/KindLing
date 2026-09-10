/**
 * Verify left path rail: lessons scroll independently; footer does not cover list;
 * goals chip text is light on dark pine.
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
      localStorage.setItem(
        "kindling_student_profile",
        JSON.stringify(profile)
      );
    }
  },
  { tokens, user, profile }
);

await page.goto(FE, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(900);
await page.evaluate(() => {
  document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
});

const open = page
  .getByRole("button", { name: /Start a lesson|Continue|Open|Practice/i })
  .first();
if (await open.isVisible({ timeout: 5000 }).catch(() => false)) {
  await open.click({ force: true });
  await page.waitForTimeout(2200);
}
for (let i = 0; i < 3; i += 1) {
  const skip = page
    .getByRole("button", { name: /skip|not now|dismiss|not yet/i })
    .first();
  if (await skip.isVisible({ timeout: 400 }).catch(() => false)) {
    await skip.click({ force: true }).catch(() => {});
  } else break;
}

await page.locator(".lesson-side").first().waitFor({ state: "visible", timeout: 15000 });

const info = await page.evaluate(() => {
  const side = document.querySelector(".lesson-side");
  const list = document.querySelector(".lesson-subtopic-list");
  const section = document.querySelector(".lesson-subtopic-section");
  const footer = document.querySelector(".lesson-side .session-info-details");
  const week = document.querySelector(".lesson-side .goals-chip-week");
  const rows = [...document.querySelectorAll(".lesson-subtopic-list .topic-node-row")];

  if (!side || !list || !section || !footer) {
    return { ok: false, reason: "missing regions" };
  }

  const sr = side.getBoundingClientRect();
  const lr = list.getBoundingClientRect();
  const fr = footer.getBoundingClientRect();
  const sec = section.getBoundingClientRect();

  const listStyle = getComputedStyle(list);
  const sideStyle = getComputedStyle(side);
  const sectionBg = getComputedStyle(section).backgroundColor;
  const sideBg = getComputedStyle(side).backgroundColor;

  // Last row should sit above footer (not under it)
  const last = rows[rows.length - 1];
  const lastR = last ? last.getBoundingClientRect() : null;
  const lastAboveFooter = !lastR || lastR.bottom <= fr.top + 1 || list.scrollHeight > list.clientHeight;

  // Clickability: center of a mid row should hit the button, not footer
  let clickHit = "n/a";
  if (rows.length >= 2) {
    const mid = rows[Math.min(2, rows.length - 1)];
    const r = mid.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const el = document.elementFromPoint(x, y);
    clickHit = el && (mid === el || mid.contains(el)) ? "lesson-row" : el?.className || el?.tagName;
  }

  let weekColor = null;
  if (week) weekColor = getComputedStyle(week).color;

  function parseRgb(c) {
    const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  }
  const wc = weekColor ? parseRgb(weekColor) : null;
  const weekIsLight = wc ? (wc[0] + wc[1] + wc[2]) / 3 > 160 : null;

  return {
    ok: true,
    sideOverflow: sideStyle.overflow + "/" + sideStyle.overflowY,
    listOverflow: listStyle.overflowY,
    listScrollable: list.scrollHeight > list.clientHeight || rows.length <= 4,
    listHeight: Math.round(lr.height),
    sectionHeight: Math.round(sec.height),
    footerTop: Math.round(fr.top),
    listBottom: Math.round(lr.bottom),
    gapListToFooter: Math.round(fr.top - lr.bottom),
    lastAboveFooter,
    clickHit,
    sectionBg,
    sideBg,
    sectionDiffers: sectionBg !== sideBg,
    weekColor,
    weekIsLight,
    sideH: Math.round(sr.height),
  };
});

await page.screenshot({
  path: path.join(__dirname, "lesson-side-scroll-ok.png"),
});

await browser.close();

console.log(JSON.stringify(info, null, 2));

if (!info.ok) {
  console.error(info.reason);
  process.exit(1);
}
if (!/auto|scroll/.test(info.listOverflow)) {
  console.error("Lessons list is not independently scrollable");
  process.exit(1);
}
if (info.sideOverflow.includes("auto") && info.sideOverflow.includes("scroll")) {
  // whole rail scrolling is discouraged; allow hidden/clip
}
if (info.gapListToFooter < -2) {
  console.error("Footer overlaps lessons list");
  process.exit(1);
}
if (info.clickHit !== "lesson-row" && info.clickHit !== "n/a") {
  console.error("Lesson row not clickable; hit:", info.clickHit);
  process.exit(1);
}
if (!info.sectionDiffers) {
  console.error("Lessons section background does not differ from rail");
  process.exit(1);
}
if (info.weekColor && info.weekIsLight === false) {
  console.error("Week text still too dark:", info.weekColor);
  process.exit(1);
}
console.log("OK: scroll region, clickability, contrast");
