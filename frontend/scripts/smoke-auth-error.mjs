import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const page = await browser.newPage();
page.setDefaultTimeout(15000);

try {
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle2" });

  const loginClicked = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button, a")];
    const btn = buttons.find((b) => /log\s*in/i.test(b.textContent || ""));
    if (btn) {
      btn.click();
      return (btn.textContent || "").trim();
    }
    return null;
  });
  console.log("loginClicked", loginClicked);

  await page.waitForSelector(".modal-card", { timeout: 8000 });
  await page.type('input[type="email"]', "nobody@example.com");
  await page.type('input[type="password"]', "wrong-password-xyz");

  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("/api/auth/login/") && res.request().method() === "POST",
      { timeout: 10000 }
    ).catch(() => null),
    page.evaluate(() => {
      const form = document.querySelector(".modal-card form");
      if (form) form.requestSubmit();
    }),
  ]);

  await page.waitForFunction(
    () => {
      const el = document.querySelector(".auth-error, [role='alert']");
      return el && el.textContent && el.textContent.trim().length > 0;
    },
    { timeout: 10000 }
  );

  const errText = await page.$eval(
    ".auth-error, [role='alert']",
    (el) => el.textContent.trim()
  );
  console.log("ERROR_TEXT=", errText);

  const stillOpen = (await page.$(".modal-card")) !== null;
  console.log("MODAL_OPEN=", stillOpen);

  if (!/invalid email or password/i.test(errText)) {
    console.error("UNEXPECTED_ERROR_MESSAGE");
    process.exitCode = 1;
  } else {
    console.log("PASS");
  }
} finally {
  await browser.close();
}
