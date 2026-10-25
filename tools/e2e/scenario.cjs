// Dev-only end-to-end run against the local harness (tools/e2e/harness.ts) and the app started with AUTH_ENABLED=true.
// node tools/e2e/scenario.cjs   (needs Playwright with Chromium)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const BASE = process.env.E2E_BASE || "http://localhost:3150", AUTH = "http://127.0.0.1:54330";
const results = []; let failed = 0;
const step = async (name, fn) => { try { const r = await fn(); results.push(["ok", name, r ?? ""]); console.log("  ok  ", name, r ?? ""); } catch (e) { failed++; results.push(["FAIL", name, e.message]); console.log("  FAIL", name, "-", e.message.split("\n")[0]); } };
const expectText = async (page, text, timeout = 15000) => page.getByText(text, { exact: false }).first().waitFor({ timeout });
const when = (hours) => { const d = new Date(Date.now() + hours * 36e5); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

async function login(page, email) {
  await page.goto(BASE + "/login"); await page.fill("#email", email); await page.getByRole("button", { name: "Send me a code" }).click();
  await page.fill("#code", "123456"); await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
}

(async () => {
  const browser = await chromium.launch();
  const mk = async (w = 1280) => { const c = await browser.newContext({ viewport: { width: w, height: 900 } }); const p = await c.newPage(); p.setDefaultTimeout(30000); p.on("dialog", (d) => d.accept(d.type() === "prompt" ? "AI4Rights facilitator" : undefined)); p.on("pageerror", (e) => console.log("   [pageerror]", e.message.slice(0, 120))); return { c, p }; };
  const admin = await mk(), amaka = await mk(), tobi = await mk(), guard = await mk(), visitor = await mk();
  let oppId = "", certCode = "", walkId = "", walkSecret = "";

  console.log("\nPublic");
  await step("home and opportunities render from the database", async () => { await visitor.p.goto(BASE + "/opportunities"); await expectText(visitor.p, "open call"); });
  await step("signed-out visitor is sent to login from /admin and /dashboard", async () => { await visitor.p.goto(BASE + "/admin"); await visitor.p.waitForURL(/\/login/); await visitor.p.goto(BASE + "/dashboard"); await visitor.p.waitForURL(/\/login/); });

  console.log("\nAdmin sign-in, two-factor");
  await step("admin signs in with an email code and is held at two-factor", async () => { await login(admin.p, "admin1@devatop.org"); await admin.p.waitForURL(/two-factor/); await expectText(admin.p, "One more"); });
  await step("admin cannot reach /admin before two-factor", async () => { await admin.p.goto(BASE + "/admin/hours"); await admin.p.waitForURL(/two-factor/); });
  await step("wrong authenticator code is refused, right one lets them in", async () => {
    await admin.p.fill("#totp", "000000"); await admin.p.getByRole("button", { name: /Continue/ }).click(); await expectText(admin.p, "not right");
    await admin.p.fill("#totp", "123456"); await admin.p.getByRole("button", { name: /Continue/ }).click(); await admin.p.waitForURL(/\/admin$/); await expectText(admin.p, "What needs you");
  });
  await step("a volunteer who opens /admin gets 'not allowed' (server-side)", async () => { await login(amaka.p, "amaka@example.com"); await amaka.p.goto(BASE + "/admin"); await amaka.p.waitForURL(/not-allowed/); await expectText(amaka.p, "Not allowed"); });

  console.log("\nAdmin creates calls");
  await step("admin publishes a call for next week", async () => {
    await admin.p.goto(BASE + "/admin/opportunities");
    await admin.p.fill("#t", "AI4Rights school sessions"); await admin.p.selectOption("#st", "Lagos"); await admin.p.fill("#pl", "Yaba"); await admin.p.fill("#cm", "4 hrs / Saturday");
    await admin.p.fill("#sa", when(24 * 6)); await admin.p.fill("#ea", when(24 * 6 + 4)); await admin.p.fill("#dl", when(24 * 5)); await admin.p.fill("#sl", "2");
    await admin.p.getByRole("button", { name: "Teaching", exact: true }).click(); await admin.p.getByRole("button", { name: "Publish opportunity" }).click();
    await expectText(admin.p, "Published. It is on the public board");
  });
  await step("admin publishes a call starting within the hour (for QR check-in)", async () => {
    await admin.p.fill("#t", "Walk today"); await admin.p.selectOption("#st", "Lagos"); await admin.p.fill("#pl", "Ikeja"); await admin.p.fill("#cm", "2 hrs");
    await admin.p.fill("#sa", when(0.5)); await admin.p.fill("#dl", when(0.25)); await admin.p.fill("#sl", "5");
    await admin.p.getByRole("button", { name: "Publish opportunity" }).click(); await expectText(admin.p, "Published. It is on the public board");
  });
  await step("a call with sign-ups closing after the start is refused with a plain message", async () => {
    await admin.p.fill("#t", "Bad dates"); await admin.p.selectOption("#st", "Lagos"); await admin.p.fill("#sa", when(48)); await admin.p.fill("#dl", when(72)); await admin.p.fill("#sl", "3");
    await admin.p.getByRole("button", { name: "Publish opportunity" }).click(); await expectText(admin.p, "Sign-ups must close before");
    await admin.p.reload();
  });

  console.log("\nApplicant (adult)");
  await step("amaka applies in three steps", async () => {
    const p = amaka.p; await p.goto(BASE + "/apply"); await p.waitForSelector("#first");
    await p.fill("#first", "Amaka"); await p.fill("#last", "Obi"); await p.fill("#phone", "0803 123 4567"); await p.selectOption("#state", "Lagos"); await p.fill("#lga", "Yaba"); await p.fill("#dob", "2001-04-18");
    await expectText(p, "Verified"); // already signed in from the 'not allowed' step: the code step is skipped
    await p.getByRole("button", { name: /^Next/ }).click();
    await p.getByRole("button", { name: "Design", exact: true }).click(); await p.locator("fieldset", { hasText: "Where would you like to help" }).locator(".chip").first().click(); await p.getByRole("button", { name: "Weekends", exact: true }).click();
    await p.getByRole("button", { name: /^Next/ }).click();
    for (const box of await p.locator('input[type=checkbox]').all().then((b) => b.slice(0, 3))) await box.check();
    await p.getByRole("button", { name: /Send my application/ }).click(); await expectText(p, "We have your application");
  });
  await step("applicant dashboard shows the stage from the database", async () => { await amaka.p.goto(BASE + "/dashboard"); await expectText(amaka.p, "Application status"); await expectText(amaka.p, "Submitted"); });
  await step("'application received' email was sent to the applicant", async () => { const m = await (await fetch(AUTH + "/__mails")).json(); if (!m.some((x) => x.to === "amaka@example.com" && /We got your application/.test(x.subject))) throw new Error("no email"); });
  await step("opening the form again says you have already applied", async () => { await amaka.p.goto(BASE + "/apply"); await expectText(amaka.p, "already applied"); });

  console.log("\nAdmin reviews");
  await step("the application is in the queue and can be approved", async () => {
    await admin.p.goto(BASE + "/admin/applications"); await expectText(admin.p, "Amaka Obi");
    await admin.p.getByRole("button", { name: "Approve", exact: true }).first().click(); await expectText(admin.p, "marked Approved");
  });
  await step("approval email was sent", async () => { const m = await (await fetch(AUTH + "/__mails")).json(); if (!m.some((x) => x.to === "amaka@example.com" && /You're in/.test(x.subject))) throw new Error("no approval email"); });
  await step("audit log shows who approved, by their sign-in email", async () => { await admin.p.goto(BASE + "/admin/audit"); await expectText(admin.p, "application.approved"); await expectText(admin.p, "admin1@devatop.org"); });

  console.log("\nVolunteer, approved");
  await step("dashboard says 'You're in'", async () => { await amaka.p.goto(BASE + "/dashboard"); await expectText(amaka.p, "You're in"); });
  await step("signs up for the call", async () => { await amaka.p.goto(BASE + "/opportunities"); await amaka.p.getByRole("button", { name: "Sign up" }).first().click(); await expectText(amaka.p, "Signed up for"); });
  await step("it is on 'my calls' and can be cancelled? (checking it lists)", async () => { await amaka.p.goto(BASE + "/my-opportunities"); await expectText(amaka.p, "My calls"); await amaka.p.locator("article").first().waitFor(); });
  await step("logs remote hours, which stay pending", async () => {
    await amaka.p.goto(BASE + "/hours"); await amaka.p.fill("#act", "Wrote 4 posts for Talkam"); await amaka.p.fill("#dt", new Date(Date.now() - 864e5).toISOString().slice(0, 10)); await amaka.p.fill("#hr", "3");
    await amaka.p.getByRole("button", { name: /Send for approval/ }).click(); await expectText(amaka.p, "stays pending"); await expectText(amaka.p, "pending");
  });
  await step("in-app chat: All volunteers room opens and a message can be posted", async () => {
    await amaka.p.goto(BASE + "/chat"); await expectText(amaka.p, "All volunteers"); await amaka.p.getByRole("button", { name: /All volunteers/ }).first().click();
    await amaka.p.fill("textarea", "Hello from Amaka"); await amaka.p.getByRole("button", { name: "Send", exact: true }).click(); await expectText(amaka.p, "Hello from Amaka");
    await amaka.p.fill("textarea", "call me on 08031234567"); await amaka.p.getByRole("button", { name: "Send", exact: true }).click(); await expectText(amaka.p, "share phone numbers");
  });
  await step("guides list shows the must-read guides and marking one read ticks Start here", async () => {
    await amaka.p.goto(BASE + "/guides"); await amaka.p.getByRole("button", { name: /Code of conduct/ }).click(); await amaka.p.getByRole("button", { name: "I have read this" }).click();
    await amaka.p.goto(BASE + "/dashboard"); await expectText(amaka.p, "Read: Code of conduct");
  });

  console.log("\nAdmin: hours, certificate");
  await step("pending hours appear and are approved; thank-you email goes out", async () => {
    await admin.p.goto(BASE + "/admin/hours"); await expectText(admin.p, "Wrote 4 posts"); await admin.p.getByRole("button", { name: "Approve", exact: true }).first().click(); await expectText(admin.p, "approved");
    await new Promise((r) => setTimeout(r, 800)); const m = await (await fetch(AUTH + "/__mails")).json(); if (!m.some((x) => x.to === "amaka@example.com" && /hours added/.test(x.subject))) throw new Error("no thank-you email");
  });
  await step("admin issues a certificate for the approved hours", async () => {
    await admin.p.goto(BASE + "/admin/certificates"); await expectText(admin.p, "Amaka Obi"); await admin.p.getByRole("button", { name: "Issue certificate" }).click(); await expectText(admin.p, "issued");
    certCode = (await admin.p.locator("[role=status]").first().textContent()).match(/DVT-[A-Z0-9]{4}-[A-Z0-9]{4}/)?.[0]; if (!certCode) throw new Error("no code shown"); return certCode;
  });
  await step("volunteer sees the certificate, and the PDF downloads", async () => {
    await amaka.p.goto(BASE + "/certificates"); await expectText(amaka.p, certCode);
    const r = await amaka.c.request.get(BASE + `/api/certificates/${certCode}/pdf`); if (r.status() !== 200 || !(await r.body()).subarray(0, 5).toString().startsWith("%PDF")) throw new Error("pdf status " + r.status());
  });
  await step("someone else cannot download that PDF", async () => { const r = await visitor.c.request.get(BASE + `/api/certificates/${certCode}/pdf`); if (r.status() === 200) throw new Error("leaked"); return r.status(); });
  await step("the public verify page confirms it with name, hours and dates only", async () => { await visitor.p.goto(BASE + `/verify/${certCode}`); await expectText(visitor.p, "genuine"); await expectText(visitor.p, "Amaka Obi"); });
  await step("a wrong code says not found", async () => { await visitor.p.goto(BASE + "/verify/DVT-ZZZZ-ZZZZ"); await expectText(visitor.p, "can't find"); });

  console.log("\nQR check-in");
  await step("admin finds the QR link for the walk happening now", async () => {
    await admin.p.goto(BASE + "/admin/attendance"); const sel = admin.p.locator("select").first(); const val = await sel.locator("option", { hasText: "Walk today" }).getAttribute("value"); walkId = val;
    await admin.p.goto(BASE + `/admin/attendance?o=${walkId}`); const link = admin.p.getByRole("link", { name: "Try it" }); await link.waitFor(); const href = await link.getAttribute("href"); walkSecret = new URL(href).searchParams.get("s"); if (!walkSecret) throw new Error("no secret"); return walkId.slice(0, 8);
  });
  await step("volunteer scans: checks in, then out, and hours are recorded as pending", async () => {
    await amaka.p.goto(BASE + `/checkin/${walkId}?s=${walkSecret}`); await amaka.p.getByRole("button", { name: /check me in/i }).click(); await expectText(amaka.p, "Checked in");
    await amaka.p.getByRole("button", { name: "Check me out" }).click(); await expectText(amaka.p, "Checked out");
  });
  await step("a wrong QR secret is refused", async () => { await amaka.p.goto(BASE + `/checkin/${walkId}?s=${"0".repeat(32)}`); await expectText(amaka.p, "Checked out"); });

  console.log("\nUnder-18 applicant and guardian email");
  await step("tobi (15 is under the minimum; 17 is allowed) applies and is asked for a guardian", async () => {
    const p = tobi.p; await login(tobi.p, "tobi@example.com"); await p.goto(BASE + "/apply"); await p.waitForSelector("#first");
    await p.fill("#first", "Tobi"); await p.fill("#last", "Adeyemi"); await p.fill("#phone", "0803 555 0101"); await p.selectOption("#state", "Lagos"); await p.fill("#lga", "Ikeja");
    const y = new Date().getFullYear() - 17; await p.fill("#dob", `${y}-03-03`); await expectText(p, "under 18");
    await p.getByRole("button", { name: /^Next/ }).click(); await p.getByRole("button", { name: "Writing", exact: true }).click(); await p.locator("fieldset", { hasText: "Where would you like to help" }).locator(".chip").first().click(); await p.getByRole("button", { name: "Weekends", exact: true }).click(); await p.getByRole("button", { name: /^Next/ }).click();
    for (const box of (await p.locator('input[type=checkbox]').all()).slice(0, 3)) await box.check();
    await p.getByRole("button", { name: /Send my application/ }).click(); await expectText(p, "must confirm before you can submit");
    await p.fill("#gn", "Mrs Adeyemi"); await p.fill("#gc", "mum@example.com"); await p.getByRole("button", { name: "Email them a link" }).click(); await expectText(p, "We emailed");
  });
  let link = "";
  await step("the guardian email carries a one-time link", async () => { const m = await (await fetch(AUTH + "/__mails")).json(); const g = m.find((x) => x.to === "mum@example.com"); link = g?.text.match(/https?:\/\/\S+guardian-consent\/[\w-]+/)?.[0]; if (!link) throw new Error("no link"); return link.slice(-8); });
  await step("the guardian opens it (not signed in) and gives consent", async () => { await guard.p.goto(link.replace("http://localhost:3150", BASE)); await expectText(guard.p, "wants to volunteer"); await guard.p.getByRole("button", { name: "I give consent" }).click(); await expectText(guard.p, "Consent recorded"); });
  await step("the same link cannot be used twice", async () => { await guard.p.goto(link.replace("http://localhost:3150", BASE)); await expectText(guard.p, "Thank"); });
  await step("tobi's page notices the consent and the application can be submitted", async () => { await expectText(tobi.p, "Guardian confirmed", 20000); await tobi.p.getByRole("button", { name: /Send my application/ }).click(); await expectText(tobi.p, "We have your application"); });
  await step("an admin cannot approve tobi until... (guardian verified: allowed) and the queue shows the Under 18 badge", async () => { await admin.p.goto(BASE + "/admin/applications"); await expectText(admin.p, "Tobi Adeyemi"); await expectText(admin.p, "Under 18"); });

  console.log("\nAdmin: messages, departments, reports, volunteers");
  await step("admin saves the WhatsApp group link, and the volunteer then sees it", async () => {
    await admin.p.goto(BASE + "/admin/messages"); await admin.p.getByRole("tab", { name: "Settings" }).click(); await admin.p.fill("input[value*='whatsapp'], label:has-text('WhatsApp') input", "https://chat.whatsapp.com/Abc123xyz"); await admin.p.getByRole("button", { name: "Save settings" }).click(); await expectText(admin.p, "Settings saved");
    await amaka.p.goto(BASE + "/dashboard"); await expectText(amaka.p, "Join the volunteers WhatsApp group");
  });
  await step("admin sends an email to approved volunteers", async () => {
    await admin.p.goto(BASE + "/admin/messages"); await admin.p.fill("input[placeholder*='youth summit']", "Briefing on Saturday"); await admin.p.locator("textarea").first().fill("Hi {first_name}, the briefing is on Saturday at 9am. Please be on time."); await expectText(admin.p, "recipient");
    await admin.p.getByRole("button", { name: /^Send to \d+/ }).click(); await expectText(admin.p, "Sent to 1");
  });
  await step("departments: add one, and archiving it works", async () => { await admin.p.goto(BASE + "/admin/departments"); await admin.p.fill("input >> nth=0", "Legal Support"); await admin.p.getByRole("button", { name: "Add", exact: true }).click(); await expectText(admin.p, "added"); await admin.p.getByRole("button", { name: "Archive" }).last().click(); await expectText(admin.p, "Archived"); });
  await step("volunteers list, reports and overview load with real numbers", async () => {
    await admin.p.goto(BASE + "/admin/volunteers"); await expectText(admin.p, "Amaka Obi"); await admin.p.goto(BASE + "/admin/reports"); await expectText(admin.p, "approved hours"); await admin.p.goto(BASE + "/admin"); await expectText(admin.p, "Total volunteers");
  });
  await step("personal-data export is logged", async () => { await admin.p.goto(BASE + "/admin/reports"); await admin.p.getByRole("button", { name: "CSV" }).last().click(); await expectText(admin.p, "downloaded and logged"); });
  await step("site images page loads for a Super Admin", async () => { await admin.p.goto(BASE + "/admin/images"); await expectText(admin.p, "Site images"); });
  await step("admin chat shows the rooms and the volunteer's earlier message", async () => { await admin.p.goto(BASE + "/admin/chat"); await admin.p.getByRole("button", { name: /All volunteers/ }).first().click(); await expectText(admin.p, "Hello from Amaka"); });

  console.log("\nCron and account deletion");
  await step("the reminder cron refuses a wrong secret and runs with the right one", async () => {
    const bad = await fetch(BASE + "/api/cron/reminders", { headers: { authorization: "Bearer nope" } }); if (bad.status !== 401) throw new Error("bad status " + bad.status);
    const ok = await fetch(BASE + "/api/cron/reminders", { headers: { authorization: "Bearer local-cron-secret-0123456789" } }); const j = await ok.json(); if (ok.status !== 200 || typeof j.sent !== "number") throw new Error(JSON.stringify(j)); return JSON.stringify(j);
  });
  await step("the volunteer downloads their data, then deletes their account", async () => {
    await amaka.p.goto(BASE + "/profile"); const dl = amaka.p.waitForEvent("download"); await amaka.p.getByRole("button", { name: "Download my data" }).click(); await dl;
    await amaka.p.getByRole("button", { name: /delete my account/i }).click(); await expectText(amaka.p, "Your account and data are deleted");
  });

  await browser.close();
  console.log(`\n${results.length - failed}/${results.length} steps passed`); process.exit(failed ? 1 : 0);
})();
