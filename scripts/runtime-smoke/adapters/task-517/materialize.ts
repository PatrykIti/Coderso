import { SmokeError } from "../../contracts";
import type { Task517BrowserActionConfig } from "./config";
import { TASK517_SCENARIO_IDS } from "./scenarios";

function encoded(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}
export function materializeTask517BrowserAction(cfg: Task517BrowserActionConfig): string {
  if (
    !TASK517_SCENARIO_IDS.includes(cfg.scenarioId) ||
    (cfg.theme !== "light" && cfg.theme !== "dark") ||
    (cfg.screenshotPath !== null &&
      (!cfg.screenshotPath.endsWith(".png") || cfg.screenshotPath.includes("..")))
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 browser action materialization drifted");
  }
  const config = encoded(cfg);
  return `async (page) => {
    const cfg = ${config};
    const consoleErrors = [];
    const pageErrors = [];
    const receipt = {
      scenarioId: cfg.scenarioId,
      theme: cfg.theme,
      consoleErrors: [],
      pageErrors: [],
      anonPublicStatus: -1,
      anonPublicSecondStatus: -1,
      anonPublicFirstMs: -1,
      anonPublicSecondMs: -1,
      anonPublicSecondFaster: false,
      anonPublicBodyMatches: false,
      anonPublicH1: "",
      anonPublicPreVisible: false,
      anonPublicPreHeight: 0,
      privateAnonStatus: -1,
      missingAnonStatus: -1,
      privateAnonBodyEqualMissing: false,
      privateAnonBodyIsNotFound: false,
      adminAuthedStatus: -1,
      adminAuthedH1: "",
      adminAuthedPreVisible: false,
      darkAuthedH1: "",
      darkAuthedPreVisible: false,
      passAInitialH1: "",
      passAInitialPrompt: false,
      passAInitialHasMarker: false,
      wrongUnlockStatus: -1,
      wrongRetryPrompt: false,
      passAUnlockedStatus: -1,
      passAUnlockedH1: "",
      passAUnlockedPreVisible: false,
      passAUnlockedHasMarker: false,
      passAUnlockedReloadH1: "",
      passBInitialH1: "",
      passBInitialPrompt: false,
      passBInitialHasMarkerA: false,
      passBInitialHasMarkerB: false,
      passBUnlockedH1: "",
      passBUnlockedPreVisible: false,
      passBUnlockedHasMarkerB: false,
      passBUnlockedReloadH1: "",
      passBUnlockedStatus: -1,
      ungatedAStatus: -1,
      ungatedAIsPrompt: false,
      ungatedAHasMarker: false,
      ungatedPrivateStatus: -1,
      ungatedPrivateIsNotFound: false,
      listH1: "",
      listHasPublicLink: false,
      listHasPrivateLink: false,
      listHasPassALink: false,
      listHasPassBLink: false,
      listEmptyMarkerAbsent: false,
      searchStatus: -1,
      searchHasPublic: false,
      searchHasPrivate: false,
      searchHasPassA: false,
      searchHasPassB: false,
      editorHeading: "",
      editorTitleValue: "",
      editorTitleVisible: false,
      editorSlugValue: "",
      editorSlugVisible: false,
      darkEditorTitleValue: "",
      darkEditorTitleVisible: false,
      darkEditorSlugValue: "",
      darkEditorSlugVisible: false
    };
    const onConsole = (message) => {
      if (message.type() !== "error") return;
      const text = message.text().slice(0, 512);
      if (/Failed to load resource: the server responded with a status of 429/.test(text)) return;
      if (/Failed to load resource: the server responded with a status of 401/.test(text) &&
          (cfg.scenarioId === "password-unlock-cycle" ||
           cfg.scenarioId === "private-anon-uniform-404" ||
           cfg.scenarioId === "no-shared-cache-leak" ||
           cfg.scenarioId === "publish-front-admin-parity")) return;
      // The uniform-404 flows deliberately navigate to URLs the anon session
      // must not see (the root path has no published homepage in the ambient
      // DB, and the private slug is a 404 by contract). Chromium logs a console
      // error for every 404 main-document navigation, so those expected 404s
      // are allowlisted per scenario, mirroring the 429/401 noise filters.
      if (/Failed to load resource: the server responded with a status of 404/.test(text) &&
          (cfg.scenarioId === "anon-public-cached-render" ||
           cfg.scenarioId === "private-anon-uniform-404" ||
           cfg.scenarioId === "no-shared-cache-leak" ||
           cfg.scenarioId === "publish-front-admin-parity")) return;
      consoleErrors.push(text);
    };
    const onPageError = (error) => pageErrors.push(String(error && error.message ? error.message : "pageerror").slice(0, 512));
    const h1Text = () => page.evaluate(() => { const el = document.querySelector("h1"); return el ? el.textContent.trim() : ""; });
    const preState = (marker) => page.evaluate((m) => { const candidates = Array.from(document.querySelectorAll("pre, dd, td, li, p, code")); const el = candidates.find((node) => node.textContent.includes(m)); if (!el) return { visible: false, height: 0 }; const r = el.getBoundingClientRect(); return { visible: r.height > 0 && r.width > 0, height: Math.round(r.height) }; }, marker);
    const bodyHas = (needle) => page.evaluate((n) => document.body.innerText.includes(n), needle);
    const fetchState = (url, credentials) => page.evaluate(async (input) => { const res = await fetch(input.url, input.credentials ? { credentials: input.credentials } : {}); return { status: res.status, text: await res.text() }; }, { url: url, credentials: credentials }, { timeout: 180000 });
    const submitPassword = async (url, password) => {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
      const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/unlock"), { timeout: 60000 });
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      return responsePromise;
    };
    const adminLogin = async () => {
      await page.goto(cfg.adminOrigin + cfg.adminPath + "/login", { waitUntil: "domcontentloaded", timeout: 120000 });
      const login = await page.evaluate(async (input) => { const res = await fetch(input.url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email: input.email, password: input.password }) }); return { status: res.status }; }, { url: cfg.adminOrigin + cfg.adminPath + "/api/auth/login", email: cfg.adminEmail, password: cfg.adminPassword }, { timeout: 30000 });
      if (login.status !== 200) throw new Error("task517_admin_login_failed:" + login.status);
    };
    const titleInputValue = () => page.getByPlaceholder("Enter post title...").first().inputValue().catch(() => "");
    const titleInputVisible = () => page.evaluate(() => { const el = document.querySelector('textarea[placeholder="Enter post title..."]'); if (!el) return false; const r = el.getBoundingClientRect(); return r.height > 0 && r.width > 0; });
    const slugInputValue = () => page.evaluate((s) => { const el = document.querySelector('input[value="' + s + '"]'); return el && el.value ? el.value : ""; }, cfg.slugs.private);
    const slugInputVisible = () => page.evaluate((s) => { const el = document.querySelector('input[value="' + s + '"]'); if (!el) return false; const r = el.getBoundingClientRect(); return r.height > 0 && r.width > 0; }, cfg.slugs.private);
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    try {
      await page.context().clearCookies();
      await page.emulateMedia({ colorScheme: cfg.theme });
      await page.setViewportSize({ width: cfg.viewport.width, height: cfg.viewport.height });
      if (cfg.scenarioId === "anon-public-cached-render") {
        await page.goto(cfg.frontOrigin + "/", { waitUntil: "domcontentloaded", timeout: 180000 });
        const first = await page.evaluate(async (u) => { const t = Date.now(); const res = await fetch(u); return { status: res.status, ms: Date.now() - t, text: await res.text() }; }, cfg.urls.public, { timeout: 180000 });
        const second = await page.evaluate(async (u) => { const t = Date.now(); const res = await fetch(u); return { status: res.status, ms: Date.now() - t, text: await res.text() }; }, cfg.urls.public, { timeout: 60000 });
        receipt.anonPublicStatus = first.status;
        receipt.anonPublicSecondStatus = second.status;
        receipt.anonPublicFirstMs = first.ms;
        receipt.anonPublicSecondMs = second.ms;
        receipt.anonPublicSecondFaster = second.ms < first.ms;
        receipt.anonPublicBodyMatches = first.text === second.text;
        await page.goto(cfg.urls.public, { waitUntil: "domcontentloaded", timeout: 120000 });
        receipt.anonPublicH1 = await h1Text();
        const pre = await preState(cfg.fixtures.public.bodyMarker);
        receipt.anonPublicPreVisible = pre.visible;
        receipt.anonPublicPreHeight = pre.height;
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      } else if (cfg.scenarioId === "private-anon-uniform-404") {
        await page.goto(cfg.frontOrigin + "/", { waitUntil: "domcontentloaded", timeout: 180000 });
        const privateAnon = await fetchState(cfg.urls.private, "omit");
        const missingAnon = await fetchState(cfg.urls.missing, "omit");
        receipt.privateAnonStatus = privateAnon.status;
        receipt.missingAnonStatus = missingAnon.status;
        receipt.privateAnonBodyEqualMissing = privateAnon.text === missingAnon.text;
        await page.goto(cfg.urls.private, { waitUntil: "domcontentloaded", timeout: 120000 });
        receipt.privateAnonBodyIsNotFound = (await page.evaluate(() => document.body.innerText.trim())) === "Not Found";
        await adminLogin();
        const authed = await page.goto(cfg.urls.private, { waitUntil: "domcontentloaded", timeout: 120000 });
        receipt.adminAuthedStatus = authed.status();
        receipt.adminAuthedH1 = await h1Text();
        const preLight = await preState(cfg.fixtures.private.bodyMarker);
        receipt.adminAuthedPreVisible = preLight.visible;
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
        await page.emulateMedia({ colorScheme: "dark" });
        const darkAuthed = await page.goto(cfg.urls.private, { waitUntil: "domcontentloaded", timeout: 120000 });
        receipt.darkAuthedH1 = await h1Text();
        const preDark = await preState(cfg.fixtures.private.bodyMarker);
        receipt.darkAuthedPreVisible = preDark.visible;
        if (darkAuthed.status() !== 200) throw new Error("task517_dark_authed_status:" + darkAuthed.status());
      } else if (cfg.scenarioId === "password-unlock-cycle") {
        await page.goto(cfg.urls.passA, { waitUntil: "domcontentloaded", timeout: 120000 });
        receipt.passAInitialH1 = await h1Text();
        receipt.passAInitialPrompt = await bodyHas("password protected");
        receipt.passAInitialHasMarker = await bodyHas(cfg.markers.passA);
        const wrongResponse = await submitPassword(cfg.urls.passA, cfg.passwords.wrong);
        receipt.wrongUnlockStatus = wrongResponse.status();
        await page.goto(cfg.urls.passA, { waitUntil: "domcontentloaded", timeout: 120000 });
        receipt.wrongRetryPrompt = await bodyHas("password protected");
        const goodResponse = await submitPassword(cfg.urls.passA, cfg.passwords.passA);
        receipt.passAUnlockedStatus = goodResponse.status();
        await page.waitForURL(cfg.urls.passA, { timeout: 30000 });
        await page.waitForLoadState("domcontentloaded");
        receipt.passAUnlockedH1 = await h1Text();
        const pre = await preState(cfg.fixtures.passA.bodyMarker);
        receipt.passAUnlockedPreVisible = pre.visible;
        receipt.passAUnlockedHasMarker = await bodyHas(cfg.markers.passA);
        await page.reload({ waitUntil: "domcontentloaded" });
        receipt.passAUnlockedReloadH1 = await h1Text();
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      } else if (cfg.scenarioId === "cross-entry-unlock-isolation") {
        const goodA = await submitPassword(cfg.urls.passA, cfg.passwords.passA);
        receipt.passAUnlockedStatus = goodA.status();
        await page.waitForURL(cfg.urls.passA, { timeout: 30000 });
        await page.waitForLoadState("domcontentloaded");
        receipt.passAUnlockedH1 = await h1Text();
        receipt.passAUnlockedHasMarker = await bodyHas(cfg.markers.passA);
        const preA = await preState(cfg.fixtures.passA.bodyMarker);
        receipt.passAUnlockedPreVisible = preA.visible;
        await page.goto(cfg.urls.passB, { waitUntil: "domcontentloaded", timeout: 120000 });
        receipt.passBInitialH1 = await h1Text();
        receipt.passBInitialPrompt = await bodyHas("password protected");
        receipt.passBInitialHasMarkerA = await bodyHas(cfg.markers.passA);
        receipt.passBInitialHasMarkerB = await bodyHas(cfg.markers.passB);
        const goodB = await submitPassword(cfg.urls.passB, cfg.passwords.passB);
        receipt.passBUnlockedStatus = goodB.status();
        await page.waitForURL(cfg.urls.passB, { timeout: 30000 });
        await page.waitForLoadState("domcontentloaded");
        receipt.passBUnlockedH1 = await h1Text();
        const preB = await preState(cfg.fixtures.passB.bodyMarker);
        receipt.passBUnlockedPreVisible = preB.visible;
        receipt.passBUnlockedHasMarkerB = await bodyHas(cfg.markers.passB);
        await page.reload({ waitUntil: "domcontentloaded" });
        receipt.passBUnlockedReloadH1 = await h1Text();
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      } else if (cfg.scenarioId === "no-shared-cache-leak") {
        const goodA = await submitPassword(cfg.urls.passA, cfg.passwords.passA);
        receipt.passAUnlockedStatus = goodA.status();
        await page.waitForURL(cfg.urls.passA, { timeout: 30000 });
        await page.waitForLoadState("domcontentloaded");
        receipt.passAUnlockedH1 = await h1Text();
        receipt.passAUnlockedHasMarker = await bodyHas(cfg.markers.passA);
        const ungated = await fetchState(cfg.urls.passA, "omit");
        receipt.ungatedAStatus = ungated.status;
        receipt.ungatedAIsPrompt = ungated.text.includes("password protected");
        receipt.ungatedAHasMarker = ungated.text.includes(cfg.markers.passA);
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
        await adminLogin();
        const authed = await page.goto(cfg.urls.private, { waitUntil: "domcontentloaded", timeout: 120000 });
        receipt.adminAuthedStatus = authed.status();
        receipt.adminAuthedH1 = await h1Text();
        const pre = await preState(cfg.fixtures.private.bodyMarker);
        receipt.adminAuthedPreVisible = pre.visible;
        const ungatedPrivate = await fetchState(cfg.urls.private, "omit");
        receipt.ungatedPrivateStatus = ungatedPrivate.status;
        receipt.ungatedPrivateIsNotFound = ungatedPrivate.text.trim() === "Not Found";
      } else if (cfg.scenarioId === "publish-front-admin-parity") {
        await page.goto(cfg.frontOrigin + "/", { waitUntil: "domcontentloaded", timeout: 180000 });
        await page.goto(cfg.urls.list, { waitUntil: "domcontentloaded", timeout: 120000 });
        receipt.listH1 = await h1Text();
        receipt.listHasPublicLink = await bodyHas(cfg.titles.public);
        receipt.listHasPrivateLink = await bodyHas(cfg.titles.private);
        receipt.listHasPassALink = await bodyHas(cfg.titles.passA);
        receipt.listHasPassBLink = await bodyHas(cfg.titles.passB);
        receipt.listEmptyMarkerAbsent = await page.evaluate(() => document.querySelector('[data-entry-list-empty="1"]') === null);
        await adminLogin();
        const search = await page.evaluate(async (input) => { const res = await fetch(input.url, { credentials: "include" }); const json = await res.json(); const titles = Array.isArray(json && json.items) ? json.items.map((item) => item && item.title) : []; return { status: res.status, titles: titles }; }, { url: cfg.urls.search }, { timeout: 60000 });
        receipt.searchStatus = search.status;
        receipt.searchHasPublic = search.titles.includes(cfg.titles.public);
        receipt.searchHasPrivate = search.titles.includes(cfg.titles.private);
        receipt.searchHasPassA = search.titles.includes(cfg.titles.passA);
        receipt.searchHasPassB = search.titles.includes(cfg.titles.passB);
        await page.goto(cfg.urls.editor, { waitUntil: "domcontentloaded", timeout: 180000 });
        await page.waitForFunction(() => { const el = document.querySelector('textarea[placeholder="Enter post title..."]'); return el !== null && el.value.trim().length > 0; }, { timeout: 120000 }).catch(() => undefined);
        receipt.editorHeading = await h1Text();
        receipt.editorTitleValue = await titleInputValue();
        receipt.editorTitleVisible = await titleInputVisible();
        receipt.editorSlugValue = await slugInputValue();
        receipt.editorSlugVisible = await slugInputVisible();
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
        await page.emulateMedia({ colorScheme: "dark" });
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => { const el = document.querySelector('textarea[placeholder="Enter post title..."]'); return el !== null && el.value.trim().length > 0; }, { timeout: 120000 }).catch(() => undefined);
        receipt.darkEditorTitleValue = await titleInputValue();
        receipt.darkEditorTitleVisible = await titleInputVisible();
        receipt.darkEditorSlugValue = await slugInputValue();
        receipt.darkEditorSlugVisible = await slugInputVisible();
      } else {
        throw new Error("task517_unknown_scenario:" + cfg.scenarioId);
      }
      receipt.consoleErrors = consoleErrors;
      receipt.pageErrors = pageErrors;
      return receipt;
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
  }`;
}
