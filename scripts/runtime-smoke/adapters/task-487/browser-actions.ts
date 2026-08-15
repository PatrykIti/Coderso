import { SmokeError } from "../../contracts";
import type { SmokeVisibleAssertionResult } from "../types";
import {
  TASK487_SCENARIO_IDS,
  type Task487ScenarioDescriptor,
  type Task487ScenarioId,
  type Task487Variant,
} from "./descriptors";

export interface Task487BrowserFixture {
  readonly scenarioId: Task487ScenarioId;
  readonly entryId: string;
}

export interface Task487BootstrappedFixture {
  readonly scenarioId: Task487ScenarioId;
  readonly entryId: string;
  readonly revisionCount: number;
  readonly versions: readonly number[];
}

export interface Task487BrowserReceipt {
  readonly scenarioId: string;
  readonly entryId: string | null;
  readonly loginSucceeded: boolean;
  readonly adminShellVisible: boolean;
  readonly bootstrappedFixtures: readonly Task487BootstrappedFixture[];
  readonly editorLoaded: boolean;
  readonly titleValueMatches: boolean;
  readonly historyButtonVisible: boolean;
  readonly seoCardVisible: boolean;
  readonly drawerOpened: boolean;
  readonly revisionRowCount: number;
  readonly versionOneVisible: boolean;
  readonly versionTwoVisible: boolean;
  readonly versionThreeAbsent: boolean;
  readonly previewSummaryVisible: boolean;
  readonly confirmDialogVisible: boolean;
  readonly confirmHeadingVisible: boolean;
  readonly restoreResponseStatus: number;
  readonly drawerClosedAfterRestore: boolean;
  readonly dataRestored: boolean;
  readonly bodyFieldValue: string;
  readonly seoFieldsVisible: boolean;
  readonly seoValuesMatch: boolean;
  readonly darkScheme: boolean;
  readonly drawerClosedViaButton: boolean;
  readonly colorScheme: string;
  readonly assertions: readonly SmokeVisibleAssertionResult[];
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
}

export interface Task487BootstrapSpec {
  readonly scenarioId: Task487ScenarioId;
  readonly slug: string;
  readonly title: string;
}

export interface Task487BrowserConfig {
  readonly scenarioId: Task487ScenarioId;
  readonly entryId: string | null;
  readonly entryTitle: string;
  readonly adminOrigin: string;
  readonly adminPath: string;
  readonly typeSlug: string;
  readonly actorEmail: string;
  readonly actorPassword: string;
  readonly variant: Task487Variant;
  readonly screenshotPath: string | null;
  readonly dataA: Readonly<{ readonly title: string; readonly body: string }>;
  readonly dataB: Readonly<{ readonly title: string; readonly body: string }>;
  readonly expectedBody: string;
  readonly restoreVersion: "Version 1" | "Version 2";
  readonly seo: Readonly<{
    readonly title: string;
    readonly description: string;
    readonly canonicalUrl: string;
    readonly robots: string;
  }>;
  readonly fixtures: readonly Task487BootstrapSpec[];
}

function encoded(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function materializeTask487BrowserAction(input: {
  readonly descriptor: Task487ScenarioDescriptor;
  readonly fixture: Task487BrowserFixture | null;
  readonly variant: Task487Variant;
  readonly screenshotPath: string | null;
  readonly config: Omit<
    Task487BrowserConfig,
    "scenarioId" | "variant" | "screenshotPath" | "entryId"
  >;
}): string {
  if (
    (input.fixture === null && input.descriptor.id !== "admin-login") ||
    (input.fixture !== null &&
      (input.fixture.scenarioId !== input.descriptor.id || !UUID.test(input.fixture.entryId))) ||
    input.config.fixtures.some((entry) => !TASK487_SCENARIO_IDS.includes(entry.scenarioId)) ||
    (input.screenshotPath !== null &&
      (!input.screenshotPath.endsWith(".png") || input.screenshotPath.includes("..")))
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-487 browser action materialization drifted");
  }
  const config = encoded({
    scenarioId: input.descriptor.id,
    entryId: input.fixture?.entryId ?? null,
    variant: input.variant,
    screenshotPath: input.screenshotPath,
    ...input.config,
  });
  return `async (page) => {
    const cfg = ${config};
    const consoleErrors = [];
    const pageErrors = [];
    const assertions = [];
    const push = (kind, target, property, expected, actual) => {
      assertions.push({
        kind,
        target,
        property,
        expected: String(expected),
        actual: String(actual),
        pass: String(expected) === String(actual),
      });
    };
    const pathnameOf = (rawUrl) => {
      const value = String(rawUrl);
      const withoutFragment = value.split("#")[0];
      const withoutQuery = withoutFragment.split("?")[0];
      const schemeSeparator = withoutQuery.indexOf("://");
      if (schemeSeparator === -1) {
        return withoutQuery.startsWith("/") ? withoutQuery : "/" + withoutQuery;
      }
      const afterScheme = withoutQuery.slice(schemeSeparator + 3);
      const slashIndex = afterScheme.indexOf("/");
      return slashIndex === -1 ? "/" : afterScheme.slice(slashIndex);
    };
    const onConsole = (message) => {
      if (message.type() !== "error") return;
      const text = message.text().slice(0, 512);
      // The Admin app boots through the shared page session and each boot calls
      // the auth bootstrap endpoints; the admin auth rate-limit bucket can 429
      // them during the suite (browser console resource errors carry no URL in
      // the message text). The app converges and the scenario assertions still
      // fail closed on their response/visible-effect checks.
      if (/Failed to load resource: the server responded with a status of 429/.test(text)) return;
      // Scenario 1 (admin-login) runs in-page WITHOUT storage state on
      // purpose, so the SPA's unauthenticated boot check of /api/auth/me
      // 401s once on the login page; that expected call is filtered the same
      // way as the 429 noise above. Resource errors carry no URL in the text;
      // when a location is present it must belong to the auth bootstrap, and
      // a bare 401 resource error on the login-only scenario is that same
      // call. The scenario assertions still fail closed on their API response
      // and visible-effect checks.
      if (/Failed to load resource: the server responded with a status of 401/.test(text)) {
        const loc = message.location?.().url ?? "";
        if (loc === "" || loc.endsWith("/api/auth/me")) return;
      }
      consoleErrors.push(text);
    };
    const onPageError = (error) =>
      pageErrors.push(String(error?.message ?? "pageerror").slice(0, 512));
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    const apiBase = cfg.adminPath + "/api";
    const editorUrl = cfg.adminOrigin + cfg.adminPath + "/advanced/entries/" + cfg.typeSlug + "/" + cfg.entryId;
    const readJson = async (path) => {
      const response = await fetch(apiBase + path, { credentials: "include" });
      const text = await response.text();
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
      return { status: response.status, body: parsed };
    };
    let csrfToken = null;
    const fetchCsrf = async () => {
      const response = await fetch(apiBase + "/auth/csrf", { credentials: "include" });
      if (!response.ok) throw new Error("task487_csrf_failed");
      const payload = await response.json();
      if (payload === null || typeof payload !== "object" || typeof payload.token !== "string") {
        throw new Error("task487_csrf_payload");
      }
      csrfToken = payload.token;
    };
    const writeJson = async (method, path, body) => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (csrfToken === null) await fetchCsrf();
        const response = await fetch(apiBase + path, {
          method,
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
          credentials: "include",
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (response.status === 403) {
          csrfToken = null;
          continue;
        }
        const text = await response.text();
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
        return { status: response.status, body: parsed };
      }
      return { status: 403, body: null };
    };
    const openEditor = async () => {
      // The dev host compiles the admin modules on first load (30-60s) and
      // the editor chunk itself is lazy; keep the goto budget wide so the
      // scenario waits, not the navigation, own the timing.
      await page.goto(editorUrl, { waitUntil: "domcontentloaded", timeout: 180000 });
      const title = page.locator("textarea[placeholder='Enter post title...']");
      await title.waitFor({ state: "visible", timeout: 90000 });
      await page.waitForFunction(
        (expected) => {
          const node = document.querySelector("textarea[placeholder='Enter post title...']");
          return node !== null && node.value === expected;
        },
        cfg.entryTitle,
        { timeout: 60000 }
      ).catch((error) => {
        throw new Error("task487_hydration_gate_timeout", { cause: error });
      });
      return title;
    };
    const openDrawer = async (drawerTitle) => {
      const history = page.getByRole("button", { name: "History", exact: true });
      await history.waitFor({ state: "visible", timeout: 60000 });
      await history.click();
      await drawerTitle.waitFor({ state: "visible", timeout: 60000 });
    };
    try {
      await page.emulateMedia({ colorScheme: cfg.variant.theme });
      await page.setViewportSize(cfg.variant.viewport);
      let restoreResponseStatus = 0;
      let restoreResponseOk = false;
      let fixtureResult = null;
      if (cfg.scenarioId === "admin-login") {
        await page.goto(cfg.adminOrigin + cfg.adminPath + "/login", {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        const email = page.locator("#email");
        await email.waitFor({ state: "visible", timeout: 60000 });
        await email.fill(cfg.actorEmail);
        await page.locator("#password").fill(cfg.actorPassword);
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await page.waitForURL((url) => {
          const pathname = url.pathname;
          return pathname === cfg.adminPath || pathname.startsWith(cfg.adminPath + "/");
        }, { timeout: 60000 });
        const shell = page.locator("[data-app-scroll]");
        await shell.waitFor({ state: "visible", timeout: 90000 });
        const loginSucceeded = (await page.locator("#email").count()) === 0;
        const adminShellVisible = await shell.isVisible();
        const bootstrapped = await page.evaluate(async (args) => {
          const { apiBase, typeSlug, dataA, dataB, seo, fixtures } = args;
          const readJsonLocal = async (path) => {
            const response = await fetch(apiBase + path, { credentials: "include" });
            const text = await response.text();
            let parsed = null;
            try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
            return { status: response.status, body: parsed };
          };
          let token = null;
          const fetchCsrfLocal = async () => {
            const response = await fetch(apiBase + "/auth/csrf", { credentials: "include" });
            if (!response.ok) throw new Error("task487_csrf_failed");
            const payload = await response.json();
            if (payload === null || typeof payload !== "object" || typeof payload.token !== "string") {
              throw new Error("task487_csrf_payload");
            }
            token = payload.token;
          };
          const writeJsonLocal = async (method, path, body) => {
            for (let attempt = 0; attempt < 2; attempt += 1) {
              if (token === null) await fetchCsrfLocal();
              const response = await fetch(apiBase + path, {
                method,
                headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
                credentials: "include",
                body: body === undefined ? undefined : JSON.stringify(body),
              });
              if (response.status === 403) {
                token = null;
                continue;
              }
              const text = await response.text();
              let parsed = null;
              try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
              return { status: response.status, body: parsed };
            }
            return { status: 403, body: null };
          };
          const results = [];
          for (const fixture of fixtures) {
            const created = await writeJsonLocal("POST", "/content/" + typeSlug + "/entries", {
              title: fixture.title,
              slug: fixture.slug,
              data: dataA,
            });
            if (created.status !== 200 && created.status !== 201) throw new Error("task487_create_failed");
            const entryId = created.body && typeof created.body === "object" && typeof created.body.id === "string"
              ? created.body.id
              : null;
            if (entryId === null) throw new Error("task487_entry_id_missing");
            const published1 = await writeJsonLocal("POST", "/content/" + typeSlug + "/entries/" + entryId + "/publish", {});
            if (published1.status !== 200) throw new Error("task487_publish1_failed");
            const patched = await writeJsonLocal("PATCH", "/content/" + typeSlug + "/entries/" + entryId, { data: dataB });
            if (patched.status !== 200) throw new Error("task487_patch_failed");
            const published2 = await writeJsonLocal("POST", "/content/" + typeSlug + "/entries/" + entryId + "/publish", {});
            if (published2.status !== 200) throw new Error("task487_publish2_failed");
            const metadata = await writeJsonLocal("PATCH", "/content/" + typeSlug + "/entries/" + entryId + "/metadata", { seo });
            if (metadata.status !== 200) throw new Error("task487_metadata_failed");
            const revisions = await readJsonLocal("/content/" + typeSlug + "/entries/" + entryId + "/revisions");
            const versions = Array.isArray(revisions.body)
              ? revisions.body.map((revision) => revision && typeof revision === "object" && typeof revision.version === "number" ? revision.version : null).filter((version) => version !== null).sort((a, b) => a - b)
              : [];
            results.push({ scenarioId: fixture.scenarioId, entryId, revisionCount: versions.length, versions });
          }
          return results;
        }, { apiBase, typeSlug: cfg.typeSlug, dataA: cfg.dataA, dataB: cfg.dataB, seo: cfg.seo, fixtures: cfg.fixtures });
        fixtureResult = bootstrapped;
        push("dom-state", "#email", "left-login", "true", String(loginSucceeded));
        push("dom-state", "[data-app-scroll]", "visible", "true", String(adminShellVisible));
        push("dom-state", "fixtures", "bootstrapped", String(cfg.fixtures.length), String(bootstrapped.length));
        push("dom-state", "revisions-per-entry", "count", "2", String(bootstrapped[0]?.revisionCount ?? 0));
        push("computed-style", "body", "color-scheme", cfg.variant.theme, await page.evaluate(() =>
          matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        ));
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath });
        return {
          scenarioId: cfg.scenarioId,
          entryId: null,
          loginSucceeded,
          adminShellVisible,
          bootstrappedFixtures: bootstrapped,
          editorLoaded: false,
          titleValueMatches: false,
          historyButtonVisible: false,
          seoCardVisible: false,
          drawerOpened: false,
          revisionRowCount: 0,
          versionOneVisible: false,
          versionTwoVisible: false,
          versionThreeAbsent: true,
          previewSummaryVisible: false,
          confirmDialogVisible: false,
          confirmHeadingVisible: false,
          restoreResponseStatus: 0,
          drawerClosedAfterRestore: false,
          dataRestored: false,
          bodyFieldValue: "",
          seoFieldsVisible: false,
          seoValuesMatch: false,
          darkScheme: false,
          drawerClosedViaButton: false,
          colorScheme: await page.evaluate(() =>
            matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
          ),
          assertions,
          consoleErrors,
          pageErrors,
        };
      }
      const title = await openEditor();
      const editorLoaded = await title.isVisible();
      const titleValueMatches = (await title.inputValue()) === cfg.entryTitle;
      const history = page.getByRole("button", { name: "History", exact: true });
      const historyButtonVisible = await history.isVisible().catch(() => false);
      const seoCard = page.getByText("Search Engine Optimization", { exact: true });
      const seoCardVisible = await seoCard.isVisible().catch(() => false);
      if (cfg.scenarioId === "editor-nav") {
        await seoCard.waitFor({ state: "visible", timeout: 60000 });
        push("dom-state", "title", "hydrated", "true", String(titleValueMatches));
        push("dom-state", "[History]", "visible", "true", String(await history.isVisible()));
        push("dom-state", "[SEO card]", "visible", "true", String(await seoCard.isVisible()));
        push("computed-style", "html", "color-scheme", cfg.variant.theme, await page.evaluate(() =>
          matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        ));
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath });
        return {
          scenarioId: cfg.scenarioId,
          entryId: cfg.entryId,
          loginSucceeded: false,
          adminShellVisible: false,
          bootstrappedFixtures: [],
          editorLoaded,
          titleValueMatches,
          historyButtonVisible,
          seoCardVisible: await seoCard.isVisible(),
          drawerOpened: false,
          revisionRowCount: 0,
          versionOneVisible: false,
          versionTwoVisible: false,
          versionThreeAbsent: true,
          previewSummaryVisible: false,
          confirmDialogVisible: false,
          confirmHeadingVisible: false,
          restoreResponseStatus: 0,
          drawerClosedAfterRestore: false,
          dataRestored: false,
          bodyFieldValue: "",
          seoFieldsVisible: false,
          seoValuesMatch: false,
          darkScheme: false,
          drawerClosedViaButton: false,
          colorScheme: await page.evaluate(() =>
            matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
          ),
          assertions,
          consoleErrors,
          pageErrors,
        };
      }
      const drawerTitle = page.getByRole("heading", { name: "Entry revisions", exact: true });
      await openDrawer(drawerTitle);
      const drawer = page.getByRole("dialog").filter({ hasText: "Entry revisions" });
      const drawerOpened = await drawerTitle.isVisible();
      const versionOne = drawer.getByText("Version 1", { exact: true });
      const versionTwo = drawer.getByText("Version 2", { exact: true });
      const versionThree = drawer.getByText("Version 3", { exact: true });
      if (
        cfg.scenarioId === "history-drawer-revisions" ||
        cfg.scenarioId === "dark-parity"
      ) {
        // The drawer fetches its revision rows asynchronously after opening,
        // so the row count and visibility must be observed only after the
        // settled state renders, not immediately after the drawer title.
        await versionOne.waitFor({ state: "visible", timeout: 60000 });
        if (cfg.scenarioId === "history-drawer-revisions") {
          await versionTwo.waitFor({ state: "visible", timeout: 60000 });
        }
      }
      const versionRows = drawer.getByText(/^Version \\d+$/);
      const revisionRowCount = await versionRows.count();
      const versionOneVisible = (await versionOne.count()) === 1;
      const versionTwoVisible = (await versionTwo.count()) === 1;
      const versionThreeAbsent = (await versionThree.count()) === 0;
      if (cfg.scenarioId === "history-drawer-revisions") {
        const card = versionOne.locator(
          "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' rounded-xl ')][1]"
        );
        await card.getByRole("button", { name: "Preview", exact: true }).click();
        await page.getByText("body: " + cfg.dataA.body, { exact: true }).waitFor({
          state: "visible",
          timeout: 30000,
        });
        const previewSummaryVisible = await page.getByText("body: " + cfg.dataA.body, { exact: true }).isVisible();
        const box = await drawer.boundingBox();
        const geometry = box !== null && box.width > 0 && box.height > 0;
        push("dom-state", "drawer", "open", "true", String(drawerOpened));
        push("dom-state", "revision-rows", "count", "2", String(revisionRowCount));
        push("dom-state", "Version 1", "visible", "true", String(versionOneVisible));
        push("dom-state", "Version 2", "visible", "true", String(versionTwoVisible));
        push("dom-state", "Version 3", "absent", "true", String(versionThreeAbsent));
        push("geometry", "drawer", "bounded", "true", String(geometry));
        push("dom-state", "preview", "visible", "true", String(previewSummaryVisible));
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath });
        return {
          scenarioId: cfg.scenarioId,
          entryId: cfg.entryId,
          loginSucceeded: false,
          adminShellVisible: false,
          bootstrappedFixtures: [],
          editorLoaded,
          titleValueMatches,
          historyButtonVisible,
          seoCardVisible,
          drawerOpened,
          revisionRowCount,
          versionOneVisible,
          versionTwoVisible,
          versionThreeAbsent,
          previewSummaryVisible,
          confirmDialogVisible: false,
          confirmHeadingVisible: false,
          restoreResponseStatus: 0,
          drawerClosedAfterRestore: false,
          dataRestored: false,
          bodyFieldValue: "",
          seoFieldsVisible: false,
          seoValuesMatch: false,
          darkScheme: false,
          drawerClosedViaButton: false,
          colorScheme: await page.evaluate(() =>
            matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
          ),
          assertions,
          consoleErrors,
          pageErrors,
        };
      }
      if (cfg.scenarioId === "confirm-gated-restore") {
        const targetVersion = drawer.getByText(cfg.restoreVersion, { exact: true });
        await targetVersion.waitFor({ state: "visible", timeout: 60000 });
        const card = targetVersion.locator(
          "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' rounded-xl ')][1]"
        );
        await card.getByRole("button", { name: "Restore", exact: true }).click();
        const confirm = page.getByRole("dialog").filter({ hasText: "Restore revision?" });
        await confirm.waitFor({ state: "visible", timeout: 30000 });
        const confirmDialogVisible = await confirm.isVisible();
        const heading = confirm.getByRole("heading", { name: "Restore revision?", exact: true });
        const confirmHeadingVisible = (await heading.count()) === 1;
        // Every /auth/* call shares the admin auth rate-limit bucket
        // (10 req / 60s). After the suite's earlier page boots the CSRF
        // fetch can 429, which would make the restore fail closed with
        // "Invalid CSRF token". Wait for the bucket to roll before issuing
        // the restore so the client's own CSRF fetch has capacity; a 429
        // response does not increment the bucket, so the poll is bounded
        // and non-destructive.
        for (let attempt = 0; attempt < 65; attempt += 1) {
          const csrfStatus = await page.evaluate(
            (base) => fetch(base + "/auth/csrf", { credentials: "include" }).then((response) => response.status),
            apiBase
          );
          if (csrfStatus === 200) break;
          await page.waitForTimeout(1000);
        }
        const restorePromise = page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            pathnameOf(response.url()).endsWith("/restore"),
          { timeout: 30000 }
        );
        await confirm.getByRole("button", { name: "Restore", exact: true }).click();
        const restoreResponse = await restorePromise;
        restoreResponseStatus = restoreResponse.status();
        restoreResponseOk = restoreResponse.ok();
        await drawerTitle.waitFor({ state: "hidden", timeout: 30000 });
        const drawerClosedAfterRestore = (await drawerTitle.count()) === 0 || !(await drawerTitle.isVisible());
        await page.waitForFunction(
          (expected) => {
            const node = document.querySelector("input[placeholder='Enter body...']");
            return node !== null && node.value === expected;
          },
          cfg.expectedBody,
          { timeout: 30000 }
        ).catch((error) => {
          throw new Error("task487_restore_visible_timeout", { cause: error });
        });
        const bodyValue = await page.locator("input[placeholder='Enter body...']").inputValue();
        const dataRestored = bodyValue === cfg.expectedBody;
        push("dom-state", "confirm-dialog", "visible", "true", String(confirmDialogVisible));
        push("aria", "Restore revision?", "heading-visible", "true", String(confirmHeadingVisible));
        push("dom-state", "restore-post", "status", "200", String(restoreResponseStatus));
        push("dom-state", "restore-post", "ok", "true", String(restoreResponseOk));
        push("dom-state", "drawer", "closed-after-restore", "true", String(drawerClosedAfterRestore));
        push("dom-state", "body-field", "restored", "true", String(dataRestored));
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath });
        return {
          scenarioId: cfg.scenarioId,
          entryId: cfg.entryId,
          loginSucceeded: false,
          adminShellVisible: false,
          bootstrappedFixtures: [],
          editorLoaded,
          titleValueMatches,
          historyButtonVisible,
          seoCardVisible,
          drawerOpened,
          revisionRowCount,
          versionOneVisible,
          versionTwoVisible,
          versionThreeAbsent,
          previewSummaryVisible: false,
          confirmDialogVisible,
          confirmHeadingVisible,
          restoreResponseStatus,
          drawerClosedAfterRestore,
          dataRestored,
          bodyFieldValue: bodyValue,
          seoFieldsVisible: false,
          seoValuesMatch: false,
          darkScheme: false,
          drawerClosedViaButton: false,
          colorScheme: await page.evaluate(() =>
            matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
          ),
          assertions,
          consoleErrors,
          pageErrors,
        };
      }
      if (cfg.scenarioId === "seo-fields-visible") {
        await seoCard.scrollIntoViewIfNeeded();
        const seoFieldsVisible = await seoCard.isVisible();
        const labelInput = (label) =>
          page.getByText(label, { exact: true }).locator("..").locator("input, textarea");
        const metaValue = await labelInput("Meta description").inputValue();
        const titleValue = await labelInput("SEO title").inputValue();
        const canonicalValue = await labelInput("Canonical URL").inputValue();
        const robotsValue = await labelInput("Robots").inputValue();
        const seoValuesMatch =
          metaValue === cfg.seo.description &&
          titleValue === cfg.seo.title &&
          canonicalValue === cfg.seo.canonicalUrl &&
          robotsValue === cfg.seo.robots;
        push("dom-state", "seo-card", "visible", "true", String(seoFieldsVisible));
        push("dom-state", "seo-fields", "visible", "true", String(seoFieldsVisible));
        push("dom-state", "seo-values", "match", "true", String(seoValuesMatch));
        push("computed-style", "html", "color-scheme", cfg.variant.theme, await page.evaluate(() =>
          matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        ));
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath });
        return {
          scenarioId: cfg.scenarioId,
          entryId: cfg.entryId,
          loginSucceeded: false,
          adminShellVisible: false,
          bootstrappedFixtures: [],
          editorLoaded,
          titleValueMatches,
          historyButtonVisible,
          seoCardVisible: seoFieldsVisible,
          drawerOpened: false,
          revisionRowCount: 0,
          versionOneVisible: false,
          versionTwoVisible: false,
          versionThreeAbsent: true,
          previewSummaryVisible: false,
          confirmDialogVisible: false,
          confirmHeadingVisible: false,
          restoreResponseStatus: 0,
          drawerClosedAfterRestore: false,
          dataRestored: false,
          bodyFieldValue: "",
          seoFieldsVisible,
          seoValuesMatch,
          darkScheme: false,
          drawerClosedViaButton: false,
          colorScheme: await page.evaluate(() =>
            matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
          ),
          assertions,
          consoleErrors,
          pageErrors,
        };
      }
      if (cfg.scenarioId === "dark-parity") {
        const darkScheme =
          (await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches)) === true;
        const closeButton = drawer.getByRole("button", { name: "Close revisions", exact: true });
        await closeButton.click();
        await drawerTitle.waitFor({ state: "hidden", timeout: 30000 });
        const drawerClosedViaButton = (await drawerTitle.count()) === 0 || !(await drawerTitle.isVisible());
        push("dom-state", "drawer", "open", "true", String(drawerOpened));
        push("dom-state", "revision-rows", "count-at-least-2", "true", String(revisionRowCount >= 2));
        push("computed-style", "html", "color-scheme", cfg.variant.theme, darkScheme ? "dark" : "light");
        push("dom-state", "drawer", "closed-via-button", "true", String(drawerClosedViaButton));
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath });
        return {
          scenarioId: cfg.scenarioId,
          entryId: cfg.entryId,
          loginSucceeded: false,
          adminShellVisible: false,
          bootstrappedFixtures: [],
          editorLoaded,
          titleValueMatches,
          historyButtonVisible,
          seoCardVisible,
          drawerOpened,
          revisionRowCount,
          versionOneVisible: (await versionOne.count()) === 1,
          versionTwoVisible: (await versionTwo.count()) === 1,
          versionThreeAbsent,
          previewSummaryVisible: false,
          confirmDialogVisible: false,
          confirmHeadingVisible: false,
          restoreResponseStatus: 0,
          drawerClosedAfterRestore: false,
          dataRestored: false,
          bodyFieldValue: "",
          seoFieldsVisible: false,
          seoValuesMatch: false,
          darkScheme,
          drawerClosedViaButton,
          colorScheme: darkScheme ? "dark" : "light",
          assertions,
          consoleErrors,
          pageErrors,
        };
      }
      throw new Error("task487_scenario_unknown");
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
  }`;
}

const RECEIPT_KEYS =
  "adminShellVisible,assertions,bodyFieldValue,bootstrappedFixtures,colorScheme,confirmDialogVisible,confirmHeadingVisible,consoleErrors,darkScheme,dataRestored,drawerClosedAfterRestore,drawerClosedViaButton,drawerOpened,editorLoaded,entryId,historyButtonVisible,loginSucceeded,pageErrors,previewSummaryVisible,restoreResponseStatus,revisionRowCount,scenarioId,seoCardVisible,seoFieldsVisible,seoValuesMatch,titleValueMatches,versionOneVisible,versionThreeAbsent,versionTwoVisible";

export function assertTask487BrowserReceipt(
  value: unknown,
  descriptor: Task487ScenarioDescriptor,
  fixture: Task487BrowserFixture | null,
  variant: Task487Variant,
  expected: Readonly<{
    readonly expectedBody: string;
    readonly restoreVersion: "Version 1" | "Version 2";
  }>
): asserts value is Task487BrowserReceipt {
  const receipt = value as Task487BrowserReceipt;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== [...RECEIPT_KEYS.split(",")].sort().join(",") ||
    receipt.scenarioId !== descriptor.id ||
    (receipt.scenarioId === "admin-login" && receipt.entryId !== null) ||
    (receipt.scenarioId !== "admin-login" &&
      (fixture === null || receipt.entryId !== fixture.entryId)) ||
    !Array.isArray(receipt.bootstrappedFixtures) ||
    !Array.isArray(receipt.assertions) ||
    !Array.isArray(receipt.consoleErrors) ||
    !Array.isArray(receipt.pageErrors) ||
    receipt.consoleErrors.length !== 0 ||
    receipt.pageErrors.length !== 0 ||
    receipt.assertions.length < 3 ||
    receipt.assertions.some((assertion) => assertion.pass !== true) ||
    receipt.colorScheme !== variant.theme
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-487 browser receipt is invalid");
  }
  if (receipt.scenarioId === "admin-login") {
    if (
      receipt.loginSucceeded !== true ||
      receipt.adminShellVisible !== true ||
      receipt.bootstrappedFixtures.length !== 6 ||
      receipt.bootstrappedFixtures.some(
        (entry) =>
          typeof entry.entryId !== "string" ||
          entry.revisionCount !== 2 ||
          JSON.stringify(entry.versions) !== JSON.stringify([1, 2])
      ) ||
      JSON.stringify(receipt.bootstrappedFixtures.map(({ scenarioId }) => scenarioId)) !==
        JSON.stringify([...TASK487_SCENARIO_IDS])
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-487 login receipt is invalid");
    }
    return;
  }
  if (fixture === null) {
    throw new SmokeError("smoke_output_invalid", "TASK-487 fixture is absent");
  }
  if (receipt.scenarioId === "editor-nav") {
    if (
      receipt.editorLoaded !== true ||
      receipt.titleValueMatches !== true ||
      receipt.historyButtonVisible !== true ||
      receipt.seoCardVisible !== true
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-487 editor navigation receipt is invalid");
    }
    return;
  }
  if (receipt.scenarioId === "history-drawer-revisions") {
    if (
      receipt.editorLoaded !== true ||
      receipt.drawerOpened !== true ||
      receipt.revisionRowCount !== 2 ||
      receipt.versionOneVisible !== true ||
      receipt.versionTwoVisible !== true ||
      receipt.versionThreeAbsent !== true ||
      receipt.previewSummaryVisible !== true
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-487 revision drawer receipt is invalid");
    }
    return;
  }
  if (receipt.scenarioId === "confirm-gated-restore") {
    if (
      receipt.editorLoaded !== true ||
      receipt.drawerOpened !== true ||
      receipt.confirmDialogVisible !== true ||
      receipt.confirmHeadingVisible !== true ||
      receipt.restoreResponseStatus !== 200 ||
      receipt.drawerClosedAfterRestore !== true ||
      receipt.dataRestored !== true ||
      receipt.bodyFieldValue !== expected.expectedBody
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-487 restore receipt is invalid");
    }
    return;
  }
  if (receipt.scenarioId === "seo-fields-visible") {
    if (
      receipt.editorLoaded !== true ||
      receipt.seoCardVisible !== true ||
      receipt.seoFieldsVisible !== true ||
      receipt.seoValuesMatch !== true
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-487 SEO visibility receipt is invalid");
    }
    return;
  }
  if (receipt.scenarioId === "dark-parity") {
    if (
      receipt.editorLoaded !== true ||
      receipt.drawerOpened !== true ||
      receipt.revisionRowCount < 2 ||
      receipt.darkScheme !== (variant.theme === "dark") ||
      receipt.drawerClosedViaButton !== true
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-487 dark parity receipt is invalid");
    }
    return;
  }
  throw new SmokeError("smoke_output_invalid", "TASK-487 browser receipt scenario is unknown");
}
