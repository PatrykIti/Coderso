import { createHash } from "node:crypto";

import { SmokeError } from "../../contracts";
import type { SmokeVisibleAssertionResult, SmokeScenarioVariantResult } from "../types";
import type { PlainJsonObject } from "../../workers/contracts";

export const TASK517_SCENARIO_IDS = Object.freeze([
  "anon-public-cached-render",
  "private-anon-uniform-404",
  "password-unlock-cycle",
  "cross-entry-unlock-isolation",
  "no-shared-cache-leak",
  "publish-front-admin-parity",
] as const);

export type Task517ScenarioId = (typeof TASK517_SCENARIO_IDS)[number];

export const TASK517_FIXTURE_KINDS = Object.freeze([
  "public",
  "private",
  "password-a",
  "password-b",
] as const);

export type Task517FixtureKind = (typeof TASK517_FIXTURE_KINDS)[number];

export interface Task517FixtureSpec extends PlainJsonObject {
  readonly fixtureId: string;
  readonly kind: Task517FixtureKind;
  readonly slug: string;
  readonly title: string;
  readonly bodyMarker: string;
  readonly accessPassword: string | null;
}

export interface Task517ScenarioDescriptor {
  readonly id: Task517ScenarioId;
  readonly title: string;
  readonly fixtureKind: Task517FixtureKind;
}

export interface Task517Variant {
  readonly id: string;
  readonly surface: "admin" | "public";
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: number; readonly height: number }>;
}

/** Static fixture identity matrix (marker-independent); the marker-derived
 * slug/title/marker/password are produced by deriveTask517FixtureSpec. */
export function buildTask517FixtureSpecs(): readonly Readonly<{
  readonly fixtureId: string;
  readonly kind: Task517FixtureKind;
}>[] {
  return Object.freeze([
    Object.freeze({ fixtureId: "task-517-fixture-1", kind: "public" as const }),
    Object.freeze({ fixtureId: "task-517-fixture-2", kind: "private" as const }),
    Object.freeze({ fixtureId: "task-517-fixture-3", kind: "password-a" as const }),
    Object.freeze({ fixtureId: "task-517-fixture-4", kind: "password-b" as const }),
  ]);
}

const KIND_SLUG = Object.freeze({
  public: "public",
  private: "private",
  "password-a": "pass-a",
  "password-b": "pass-b",
} as const);

const KIND_LABEL = Object.freeze({
  public: "public",
  private: "private",
  "password-a": "pass-a",
  "password-b": "pass-b",
} as const);

function markerFor(runMarker: string, fixtureId: string): string {
  return createHash("sha256")
    .update(`task-517:${runMarker}:${fixtureId}`)
    .digest("hex")
    .slice(0, 20);
}

export function deriveTask517FixtureSpec(runMarker: string, fixtureId: string): Task517FixtureSpec {
  const fixture = buildTask517FixtureSpecs().find((entry) => entry.fixtureId === fixtureId);
  if (fixture === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 fixture is not registered");
  }
  const kindSlug = KIND_SLUG[fixture.kind];
  const kindLabel = KIND_LABEL[fixture.kind];
  const slug = `task517-${kindSlug}-${runMarker}`;
  const bodyMarker = markerFor(runMarker, fixtureId);
  return Object.freeze({
    fixtureId,
    kind: fixture.kind,
    slug,
    title: `TASK-517 ${kindLabel} ${runMarker}`,
    bodyMarker,
    accessPassword:
      fixture.kind === "password-a" || fixture.kind === "password-b"
        ? `task517-${kindSlug}-${runMarker}`
        : null,
  });
}

export const TASK517_SCENARIOS: readonly Task517ScenarioDescriptor[] = Object.freeze([
  Object.freeze({
    id: "anon-public-cached-render",
    title: "Anonymous public entry renders from the shared HTML cache",
    fixtureKind: "public",
  }),
  Object.freeze({
    id: "private-anon-uniform-404",
    title: "Private entry is a uniform anonymous 404 that admin sessions bypass",
    fixtureKind: "private",
  }),
  Object.freeze({
    id: "password-unlock-cycle",
    title: "Password unlock cycle (wrong then correct) for one entry",
    fixtureKind: "password-a",
  }),
  Object.freeze({
    id: "cross-entry-unlock-isolation",
    title: "Unlock cookie does not cross entries",
    fixtureKind: "password-b",
  }),
  Object.freeze({
    id: "no-shared-cache-leak",
    title: "Gated and private bodies never leak through shared caches",
    fixtureKind: "password-a",
  }),
  Object.freeze({
    id: "publish-front-admin-parity",
    title: "Publish, front listing, search and admin editor parity",
    fixtureKind: "private",
  }),
]);

const DESKTOP = Object.freeze({ width: 1440, height: 900 });

export const TASK517_SCENARIO_VARIANTS: Readonly<
  Record<Task517ScenarioId, readonly Task517Variant[]>
> = Object.freeze({
  "anon-public-cached-render": Object.freeze([
    Object.freeze({
      id: "anon-public-cached-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
  ]),
  "private-anon-uniform-404": Object.freeze([
    Object.freeze({ id: "anon-404-light", surface: "public", theme: "light", viewport: DESKTOP }),
    Object.freeze({
      id: "admin-bypass-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
    Object.freeze({ id: "admin-bypass-dark", surface: "public", theme: "dark", viewport: DESKTOP }),
  ]),
  "password-unlock-cycle": Object.freeze([
    Object.freeze({
      id: "password-unlock-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
  ]),
  "cross-entry-unlock-isolation": Object.freeze([
    Object.freeze({
      id: "cross-entry-isolation-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
  ]),
  "no-shared-cache-leak": Object.freeze([
    Object.freeze({
      id: "cache-proof-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
    Object.freeze({
      id: "private-404-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
  ]),
  "publish-front-admin-parity": Object.freeze([
    Object.freeze({ id: "front-list-light", surface: "public", theme: "light", viewport: DESKTOP }),
    Object.freeze({
      id: "admin-editor-light",
      surface: "admin",
      theme: "light",
      viewport: DESKTOP,
    }),
    Object.freeze({ id: "admin-editor-dark", surface: "admin", theme: "dark", viewport: DESKTOP }),
  ]),
});

export interface Task517BrowserActionConfig extends PlainJsonObject {
  readonly scenarioId: Task517ScenarioId;
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: number; readonly height: number }>;
  readonly frontOrigin: string;
  readonly adminOrigin: string;
  readonly adminPath: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly contentTypeName: string;
  readonly editorLabel: string;
  readonly titles: Readonly<{
    readonly public: string;
    readonly private: string;
    readonly passA: string;
    readonly passB: string;
  }>;
  readonly markers: Readonly<{
    readonly passA: string;
    readonly passB: string;
  }>;
  readonly slugs: Readonly<{
    readonly private: string;
  }>;
  readonly passwords: Readonly<{
    readonly passA: string;
    readonly passB: string;
    readonly wrong: string;
  }>;
  readonly urls: Readonly<{
    readonly public: string;
    readonly private: string;
    readonly passA: string;
    readonly passB: string;
    readonly missing: string;
    readonly list: string;
    readonly search: string;
    readonly editor: string;
  }>;
  readonly screenshotPath: string | null;
}

export interface Task517BrowserReceipt extends PlainJsonObject {
  readonly scenarioId: string;
  readonly theme: string;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly anonPublicStatus: number;
  readonly anonPublicSecondStatus: number;
  readonly anonPublicFirstMs: number;
  readonly anonPublicSecondMs: number;
  readonly anonPublicSecondFaster: boolean;
  readonly anonPublicBodyMatches: boolean;
  readonly anonPublicH1: string;
  readonly anonPublicPreVisible: boolean;
  readonly anonPublicPreHeight: number;
  readonly privateAnonStatus: number;
  readonly missingAnonStatus: number;
  readonly privateAnonBodyEqualMissing: boolean;
  readonly privateAnonBodyIsNotFound: boolean;
  readonly adminAuthedStatus: number;
  readonly adminAuthedH1: string;
  readonly adminAuthedPreVisible: boolean;
  readonly darkAuthedH1: string;
  readonly darkAuthedPreVisible: boolean;
  readonly passAInitialH1: string;
  readonly passAInitialPrompt: boolean;
  readonly passAInitialHasMarker: boolean;
  readonly wrongUnlockStatus: number;
  readonly wrongRetryPrompt: boolean;
  readonly passAUnlockedStatus: number;
  readonly passAUnlockedH1: string;
  readonly passAUnlockedPreVisible: boolean;
  readonly passAUnlockedHasMarker: boolean;
  readonly passAUnlockedReloadH1: string;
  readonly passBInitialH1: string;
  readonly passBInitialPrompt: boolean;
  readonly passBInitialHasMarkerA: boolean;
  readonly passBInitialHasMarkerB: boolean;
  readonly passBUnlockedH1: string;
  readonly passBUnlockedPreVisible: boolean;
  readonly passBUnlockedHasMarkerB: boolean;
  readonly passBUnlockedReloadH1: string;
  readonly passBUnlockedStatus: number;
  readonly ungatedAStatus: number;
  readonly ungatedAIsPrompt: boolean;
  readonly ungatedAHasMarker: boolean;
  readonly ungatedPrivateStatus: number;
  readonly ungatedPrivateIsNotFound: boolean;
  readonly listH1: string;
  readonly listHasPublicLink: boolean;
  readonly listHasPrivateLink: boolean;
  readonly listHasPassALink: boolean;
  readonly listHasPassBLink: boolean;
  readonly listEmptyMarkerAbsent: boolean;
  readonly searchStatus: number;
  readonly searchHasPublic: boolean;
  readonly searchHasPrivate: boolean;
  readonly searchHasPassA: boolean;
  readonly searchHasPassB: boolean;
  readonly editorHeading: string;
  readonly editorTitleValue: string;
  readonly editorTitleVisible: boolean;
  readonly editorSlugValue: string;
  readonly editorSlugVisible: boolean;
  readonly darkEditorTitleValue: string;
  readonly darkEditorTitleVisible: boolean;
  readonly darkEditorSlugValue: string;
  readonly darkEditorSlugVisible: boolean;
}

const RECEIPT_KEYS = Object.freeze([
  "adminAuthedH1",
  "adminAuthedPreVisible",
  "adminAuthedStatus",
  "anonPublicBodyMatches",
  "anonPublicFirstMs",
  "anonPublicH1",
  "anonPublicPreHeight",
  "anonPublicPreVisible",
  "anonPublicSecondFaster",
  "anonPublicSecondMs",
  "anonPublicSecondStatus",
  "anonPublicStatus",
  "consoleErrors",
  "darkAuthedH1",
  "darkAuthedPreVisible",
  "darkEditorSlugValue",
  "darkEditorSlugVisible",
  "darkEditorTitleValue",
  "darkEditorTitleVisible",
  "editorHeading",
  "editorSlugValue",
  "editorSlugVisible",
  "editorTitleValue",
  "editorTitleVisible",
  "listEmptyMarkerAbsent",
  "listH1",
  "listHasPassALink",
  "listHasPassBLink",
  "listHasPrivateLink",
  "listHasPublicLink",
  "missingAnonStatus",
  "pageErrors",
  "passAInitialH1",
  "passAInitialHasMarker",
  "passAInitialPrompt",
  "passAUnlockedH1",
  "passAUnlockedHasMarker",
  "passAUnlockedPreVisible",
  "passAUnlockedReloadH1",
  "passAUnlockedStatus",
  "passBInitialH1",
  "passBInitialHasMarkerA",
  "passBInitialHasMarkerB",
  "passBInitialPrompt",
  "passBUnlockedH1",
  "passBUnlockedHasMarkerB",
  "passBUnlockedPreVisible",
  "passBUnlockedReloadH1",
  "passBUnlockedStatus",
  "privateAnonBodyEqualMissing",
  "privateAnonBodyIsNotFound",
  "privateAnonStatus",
  "scenarioId",
  "searchHasPassA",
  "searchHasPassB",
  "searchHasPrivate",
  "searchHasPublic",
  "searchStatus",
  "theme",
  "ungatedAHasMarker",
  "ungatedAIsPrompt",
  "ungatedAStatus",
  "ungatedPrivateIsNotFound",
  "ungatedPrivateStatus",
  "wrongRetryPrompt",
  "wrongUnlockStatus",
] as const);

const WRONG_PASSWORD = "task517-0000-wrong-password";

function encoded(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

/** Builds the full marker-derived browser config for one scenario. */
export function buildTask517BrowserActionConfig(input: {
  readonly scenarioId: Task517ScenarioId;
  readonly theme: "light" | "dark";
  readonly runMarker: string;
  readonly fixtures: Readonly<{
    readonly public: Task517FixtureSpec;
    readonly private: Task517FixtureSpec;
    readonly passA: Task517FixtureSpec;
    readonly passB: Task517FixtureSpec;
  }>;
  readonly contentTypeSlug: string;
  readonly contentTypeName: string;
  readonly entryIds: Readonly<{
    readonly public: string;
    readonly private: string;
    readonly passA: string;
    readonly passB: string;
  }>;
  readonly adminPath: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly screenshotPath: string | null;
}): Task517BrowserActionConfig {
  const { fixtures, entryIds } = input;
  const frontOrigin = "http://127.0.0.1:3000";
  const adminOrigin = "http://127.0.0.1:5173";
  const detail = (slug: string) => `${frontOrigin}/content/${input.contentTypeSlug}/${slug}`;
  const editorLabel = `Edit ${input.contentTypeName.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()}`;
  const variant = TASK517_SCENARIO_VARIANTS[input.scenarioId].find(
    (entry) => entry.theme === input.theme
  );
  if (variant === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 scenario variant is unregistered");
  }
  return Object.freeze({
    scenarioId: input.scenarioId,
    theme: input.theme,
    viewport: variant.viewport,
    frontOrigin,
    adminOrigin,
    adminPath: input.adminPath,
    adminEmail: input.adminEmail,
    adminPassword: input.adminPassword,
    contentTypeName: input.contentTypeName,
    editorLabel,
    fixtures: Object.freeze({
      public: fixtures.public,
      private: fixtures.private,
      passA: fixtures.passA,
      passB: fixtures.passB,
    }),
    titles: Object.freeze({
      public: fixtures.public.title,
      private: fixtures.private.title,
      passA: fixtures.passA.title,
      passB: fixtures.passB.title,
    }),
    markers: Object.freeze({
      passA: fixtures.passA.bodyMarker,
      passB: fixtures.passB.bodyMarker,
    }),
    slugs: Object.freeze({ private: fixtures.private.slug }),
    passwords: Object.freeze({
      passA: fixtures.passA.accessPassword ?? "",
      passB: fixtures.passB.accessPassword ?? "",
      wrong: WRONG_PASSWORD,
    }),
    urls: Object.freeze({
      public: detail(fixtures.public.slug),
      private: detail(fixtures.private.slug),
      passA: detail(fixtures.passA.slug),
      passB: detail(fixtures.passB.slug),
      missing: detail(`task517-missing-${input.runMarker}`),
      list: `${frontOrigin}/content/${input.contentTypeSlug}`,
      search: `${adminOrigin}${input.adminPath}/api/search/public-preview?q=task+public+${input.runMarker}`,
      editor: `${adminOrigin}${input.adminPath}/advanced/entries/${input.contentTypeSlug}/${entryIds.private}`,
    }),
    screenshotPath: input.screenshotPath,
  });
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

function exactKeys(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.keys(value).sort().join(",");
}

/** Strict receipt validation: exact keys + scenario-level flow invariants. */
export function assertTask517BrowserReceipt(
  value: unknown,
  cfg: Task517BrowserActionConfig
): asserts value is Task517BrowserReceipt {
  if (exactKeys(value) !== RECEIPT_KEYS.join(",")) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 browser receipt keys are invalid");
  }
  const receipt = value as Task517BrowserReceipt;
  const fail = (reason: string): never => {
    throw new SmokeError("smoke_output_invalid", `TASK-517 browser receipt ${reason}`);
  };
  if (receipt.scenarioId !== cfg.scenarioId) fail("scenario drifted");
  if (receipt.theme !== cfg.theme) fail("theme drifted");
  if (!Array.isArray(receipt.consoleErrors) || !Array.isArray(receipt.pageErrors)) {
    fail("error arrays are invalid");
  }
  if (receipt.consoleErrors.length !== 0 || receipt.pageErrors.length !== 0) {
    fail(
      "console errors surfaced " +
        JSON.stringify({
          scenarioId: receipt.scenarioId,
          consoleErrors: receipt.consoleErrors.slice(0, 5),
          pageErrors: receipt.pageErrors.slice(0, 5),
        })
    );
  }
  const scenarioId = receipt.scenarioId;
  if (scenarioId === "anon-public-cached-render") {
    if (
      receipt.anonPublicStatus !== 200 ||
      receipt.anonPublicSecondStatus !== 200 ||
      receipt.anonPublicFirstMs < 0 ||
      receipt.anonPublicSecondMs < 0 ||
      receipt.anonPublicSecondFaster !== true ||
      receipt.anonPublicBodyMatches !== true ||
      receipt.anonPublicH1 !== cfg.titles.public ||
      receipt.anonPublicPreVisible !== true ||
      receipt.anonPublicPreHeight <= 0
    ) {
      fail(
        "anon cached render proof failed " +
          JSON.stringify({
            status: receipt.anonPublicStatus,
            secondStatus: receipt.anonPublicSecondStatus,
            firstMs: receipt.anonPublicFirstMs,
            secondMs: receipt.anonPublicSecondMs,
            secondFaster: receipt.anonPublicSecondFaster,
            bodyMatches: receipt.anonPublicBodyMatches,
            h1: receipt.anonPublicH1,
            expectedH1: cfg.titles.public,
            preVisible: receipt.anonPublicPreVisible,
            preHeight: receipt.anonPublicPreHeight,
          })
      );
    }
    return;
  }
  if (scenarioId === "private-anon-uniform-404") {
    if (
      receipt.privateAnonStatus !== 404 ||
      receipt.missingAnonStatus !== 404 ||
      receipt.privateAnonBodyEqualMissing !== true ||
      receipt.privateAnonBodyIsNotFound !== true ||
      receipt.adminAuthedStatus !== 200 ||
      receipt.adminAuthedH1 !== cfg.titles.private ||
      receipt.adminAuthedPreVisible !== true ||
      receipt.darkAuthedH1 !== cfg.titles.private ||
      receipt.darkAuthedPreVisible !== true
    ) {
      fail("private 404 / admin bypass proof failed");
    }
    return;
  }
  if (scenarioId === "password-unlock-cycle") {
    if (
      receipt.passAInitialH1 !== cfg.titles.passA ||
      receipt.passAInitialPrompt !== true ||
      receipt.passAInitialHasMarker !== false ||
      receipt.wrongUnlockStatus !== 401 ||
      receipt.wrongRetryPrompt !== true ||
      receipt.passAUnlockedStatus !== 302 ||
      receipt.passAUnlockedH1 !== cfg.titles.passA ||
      receipt.passAUnlockedPreVisible !== true ||
      receipt.passAUnlockedHasMarker !== true ||
      receipt.passAUnlockedReloadH1 !== cfg.titles.passA
    ) {
      fail("password unlock cycle proof failed");
    }
    return;
  }
  if (scenarioId === "cross-entry-unlock-isolation") {
    if (
      receipt.passAUnlockedStatus !== 302 ||
      receipt.passAUnlockedH1 !== cfg.titles.passA ||
      receipt.passAUnlockedPreVisible !== true ||
      receipt.passAUnlockedHasMarker !== true ||
      receipt.passBInitialH1 !== cfg.titles.passB ||
      receipt.passBInitialPrompt !== true ||
      receipt.passBInitialHasMarkerA !== false ||
      receipt.passBInitialHasMarkerB !== false ||
      receipt.passBUnlockedStatus !== 302 ||
      receipt.passBUnlockedH1 !== cfg.titles.passB ||
      receipt.passBUnlockedPreVisible !== true ||
      receipt.passBUnlockedHasMarkerB !== true ||
      receipt.passBUnlockedReloadH1 !== cfg.titles.passB
    ) {
      fail("cross-entry unlock isolation proof failed");
    }
    return;
  }
  if (scenarioId === "no-shared-cache-leak") {
    if (
      receipt.passAUnlockedStatus !== 302 ||
      receipt.passAUnlockedH1 !== cfg.titles.passA ||
      receipt.passAUnlockedHasMarker !== true ||
      receipt.ungatedAStatus !== 200 ||
      receipt.ungatedAIsPrompt !== true ||
      receipt.ungatedAHasMarker !== false ||
      receipt.adminAuthedStatus !== 200 ||
      receipt.adminAuthedH1 !== cfg.titles.private ||
      receipt.adminAuthedPreVisible !== true ||
      receipt.ungatedPrivateStatus !== 404 ||
      receipt.ungatedPrivateIsNotFound !== true
    ) {
      fail("shared-cache leak proof failed");
    }
    return;
  }
  if (scenarioId === "publish-front-admin-parity") {
    if (
      receipt.listH1 !== cfg.contentTypeName ||
      receipt.listHasPublicLink !== true ||
      receipt.listHasPrivateLink !== false ||
      receipt.listHasPassALink !== false ||
      receipt.listHasPassBLink !== false ||
      receipt.listEmptyMarkerAbsent !== true ||
      receipt.searchStatus !== 200 ||
      receipt.searchHasPublic !== true ||
      receipt.searchHasPrivate !== false ||
      receipt.searchHasPassA !== false ||
      receipt.searchHasPassB !== false ||
      receipt.editorHeading !== cfg.editorLabel ||
      receipt.editorTitleValue !== cfg.titles.private ||
      receipt.editorTitleVisible !== true ||
      receipt.editorSlugValue !== cfg.slugs.private ||
      receipt.editorSlugVisible !== true ||
      receipt.darkEditorTitleValue !== cfg.titles.private ||
      receipt.darkEditorTitleVisible !== true ||
      receipt.darkEditorSlugValue !== cfg.slugs.private ||
      receipt.darkEditorSlugVisible !== true
    ) {
      fail(
        "publish/front/admin parity proof failed " +
          JSON.stringify({
            listH1: receipt.listH1,
            expectedListH1: cfg.contentTypeName,
            listHasPublicLink: receipt.listHasPublicLink,
            listHasPrivateLink: receipt.listHasPrivateLink,
            listHasPassALink: receipt.listHasPassALink,
            listHasPassBLink: receipt.listHasPassBLink,
            listEmptyMarkerAbsent: receipt.listEmptyMarkerAbsent,
            searchStatus: receipt.searchStatus,
            searchHasPublic: receipt.searchHasPublic,
            searchHasPrivate: receipt.searchHasPrivate,
            searchHasPassA: receipt.searchHasPassA,
            searchHasPassB: receipt.searchHasPassB,
            editorHeading: receipt.editorHeading,
            expectedEditorLabel: cfg.editorLabel,
            editorTitleValue: receipt.editorTitleValue,
            expectedTitle: cfg.titles.private,
            editorTitleVisible: receipt.editorTitleVisible,
            editorSlugValue: receipt.editorSlugValue,
            expectedSlug: cfg.slugs.private,
            editorSlugVisible: receipt.editorSlugVisible,
            darkEditorTitleValue: receipt.darkEditorTitleValue,
            darkEditorTitleVisible: receipt.darkEditorTitleVisible,
            darkEditorSlugValue: receipt.darkEditorSlugValue,
            darkEditorSlugVisible: receipt.darkEditorSlugVisible,
          })
      );
    }
    return;
  }
  fail("scenario is unregistered");
}

function assertion(
  kind: SmokeVisibleAssertionResult["kind"],
  target: string,
  property: string,
  expected: string,
  actual: string,
  pass: boolean
): SmokeVisibleAssertionResult {
  return Object.freeze({ kind, target, property, expected, actual, pass });
}

function variantsFor(
  scenarioId: Task517ScenarioId,
  assertionsByVariant: Readonly<Record<string, readonly SmokeVisibleAssertionResult[]>>
): readonly SmokeScenarioVariantResult[] {
  return Object.freeze(
    TASK517_SCENARIO_VARIANTS[scenarioId].map((variant) =>
      Object.freeze({
        id: variant.id,
        surface: variant.surface,
        theme: variant.theme,
        viewport: variant.viewport,
        assertions: assertionsByVariant[variant.id] ?? [],
        consoleErrors: Object.freeze([]),
      })
    )
  );
}

/** Builds the manifestable per-variant assertions from a validated receipt. */
export function buildTask517ScenarioAssertions(
  scenarioId: Task517ScenarioId,
  receipt: Task517BrowserReceipt
): readonly SmokeScenarioVariantResult[] {
  if (scenarioId === "anon-public-cached-render") {
    return variantsFor(scenarioId, {
      "anon-public-cached-light": Object.freeze([
        assertion(
          "dom-state",
          "request:entry-detail",
          "anonFirstStatus",
          "200",
          String(receipt.anonPublicStatus),
          receipt.anonPublicStatus === 200
        ),
        assertion(
          "dom-state",
          "request:entry-detail",
          "anonSecondStatus",
          "200",
          String(receipt.anonPublicSecondStatus),
          receipt.anonPublicSecondStatus === 200
        ),
        assertion(
          "dom-state",
          "response:entry-detail",
          "secondFaster",
          "true",
          String(receipt.anonPublicSecondFaster),
          receipt.anonPublicSecondFaster === true
        ),
        assertion(
          "dom-state",
          "response:entry-detail",
          "byteIdentical",
          "true",
          String(receipt.anonPublicBodyMatches),
          receipt.anonPublicBodyMatches === true
        ),
        assertion(
          "dom-state",
          "dom:entry-detail",
          "h1",
          receipt.anonPublicH1,
          receipt.anonPublicH1,
          receipt.anonPublicH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:entry-body",
          "preVisible",
          "true",
          String(receipt.anonPublicPreVisible),
          receipt.anonPublicPreVisible === true
        ),
        assertion(
          "geometry",
          "dom:entry-body",
          "preHeight",
          ">0",
          String(receipt.anonPublicPreHeight),
          receipt.anonPublicPreHeight > 0
        ),
      ]),
    });
  }
  if (scenarioId === "private-anon-uniform-404") {
    return variantsFor(scenarioId, {
      "anon-404-light": Object.freeze([
        assertion(
          "dom-state",
          "request:private-entry",
          "anonStatus",
          "404",
          String(receipt.privateAnonStatus),
          receipt.privateAnonStatus === 404
        ),
        assertion(
          "dom-state",
          "request:missing-slug",
          "anonStatus",
          "404",
          String(receipt.missingAnonStatus),
          receipt.missingAnonStatus === 404
        ),
        assertion(
          "dom-state",
          "response:private-vs-missing",
          "bodyByteEqual",
          "true",
          String(receipt.privateAnonBodyEqualMissing),
          receipt.privateAnonBodyEqualMissing === true
        ),
        assertion(
          "dom-state",
          "dom:private-anon",
          "notFoundText",
          "Not Found",
          receipt.privateAnonBodyIsNotFound ? "Not Found" : "",
          receipt.privateAnonBodyIsNotFound === true
        ),
      ]),
      "admin-bypass-light": Object.freeze([
        assertion(
          "dom-state",
          "request:private-entry",
          "adminAuthedStatus",
          "200",
          String(receipt.adminAuthedStatus),
          receipt.adminAuthedStatus === 200
        ),
        assertion(
          "dom-state",
          "dom:private-authed",
          "h1",
          receipt.adminAuthedH1,
          receipt.adminAuthedH1,
          receipt.adminAuthedH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:private-authed",
          "preVisible",
          "true",
          String(receipt.adminAuthedPreVisible),
          receipt.adminAuthedPreVisible === true
        ),
      ]),
      "admin-bypass-dark": Object.freeze([
        assertion(
          "dom-state",
          "dom:private-authed-dark",
          "h1",
          receipt.darkAuthedH1,
          receipt.darkAuthedH1,
          receipt.darkAuthedH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:private-authed-dark",
          "preVisible",
          "true",
          String(receipt.darkAuthedPreVisible),
          receipt.darkAuthedPreVisible === true
        ),
      ]),
    });
  }
  if (scenarioId === "password-unlock-cycle") {
    return variantsFor(scenarioId, {
      "password-unlock-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:prompt",
          "h1",
          receipt.passAInitialH1,
          receipt.passAInitialH1,
          receipt.passAInitialH1.length > 0
        ),
        assertion(
          "dom-state",
          "dom:prompt",
          "passwordProtected",
          "true",
          String(receipt.passAInitialPrompt),
          receipt.passAInitialPrompt === true
        ),
        assertion(
          "dom-state",
          "dom:prompt",
          "bodyExcludesMarker",
          "true",
          String(!receipt.passAInitialHasMarker),
          !receipt.passAInitialHasMarker === true
        ),
        assertion(
          "dom-state",
          "request:wrong-unlock",
          "status",
          "401",
          String(receipt.wrongUnlockStatus),
          receipt.wrongUnlockStatus === 401
        ),
        assertion(
          "dom-state",
          "dom:after-wrong",
          "promptRetained",
          "true",
          String(receipt.wrongRetryPrompt),
          receipt.wrongRetryPrompt === true
        ),
        assertion(
          "dom-state",
          "request:correct-unlock",
          "status",
          "302",
          String(receipt.passAUnlockedStatus),
          receipt.passAUnlockedStatus === 302
        ),
        assertion(
          "dom-state",
          "dom:unlocked",
          "h1",
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:unlocked",
          "preVisible",
          "true",
          String(receipt.passAUnlockedPreVisible),
          receipt.passAUnlockedPreVisible === true
        ),
        assertion(
          "dom-state",
          "dom:unlocked",
          "bodyHasMarker",
          "true",
          String(receipt.passAUnlockedHasMarker),
          receipt.passAUnlockedHasMarker === true
        ),
        assertion(
          "dom-state",
          "dom:unlocked-reload",
          "h1",
          receipt.passAUnlockedReloadH1,
          receipt.passAUnlockedReloadH1,
          receipt.passAUnlockedReloadH1.length > 0
        ),
      ]),
    });
  }
  if (scenarioId === "cross-entry-unlock-isolation") {
    return variantsFor(scenarioId, {
      "cross-entry-isolation-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:entry-a",
          "unlockedH1",
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1.length > 0
        ),
        assertion(
          "dom-state",
          "dom:entry-b",
          "promptH1",
          receipt.passBInitialH1,
          receipt.passBInitialH1,
          receipt.passBInitialH1.length > 0
        ),
        assertion(
          "dom-state",
          "dom:entry-b",
          "promptShown",
          "true",
          String(receipt.passBInitialPrompt),
          receipt.passBInitialPrompt === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b",
          "excludesMarkerA",
          "true",
          String(!receipt.passBInitialHasMarkerA),
          !receipt.passBInitialHasMarkerA === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b",
          "excludesBodyB",
          "true",
          String(!receipt.passBInitialHasMarkerB),
          !receipt.passBInitialHasMarkerB === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b-unlocked",
          "h1",
          receipt.passBUnlockedH1,
          receipt.passBUnlockedH1,
          receipt.passBUnlockedH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:entry-b-unlocked",
          "preVisible",
          "true",
          String(receipt.passBUnlockedPreVisible),
          receipt.passBUnlockedPreVisible === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b-unlocked",
          "bodyHasMarkerB",
          "true",
          String(receipt.passBUnlockedHasMarkerB),
          receipt.passBUnlockedHasMarkerB === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b-reload",
          "h1",
          receipt.passBUnlockedReloadH1,
          receipt.passBUnlockedReloadH1,
          receipt.passBUnlockedReloadH1.length > 0
        ),
      ]),
    });
  }
  if (scenarioId === "no-shared-cache-leak") {
    return variantsFor(scenarioId, {
      "cache-proof-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:entry-a",
          "unlockedH1",
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1.length > 0
        ),
        assertion(
          "dom-state",
          "request:ungated-a",
          "status",
          "200",
          String(receipt.ungatedAStatus),
          receipt.ungatedAStatus === 200
        ),
        assertion(
          "dom-state",
          "response:ungated-a",
          "promptNotBody",
          "true",
          String(receipt.ungatedAIsPrompt),
          receipt.ungatedAIsPrompt === true
        ),
        assertion(
          "dom-state",
          "response:ungated-a",
          "excludesMarker",
          "true",
          String(!receipt.ungatedAHasMarker),
          !receipt.ungatedAHasMarker === true
        ),
      ]),
      "private-404-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:private-authed",
          "h1",
          receipt.adminAuthedH1,
          receipt.adminAuthedH1,
          receipt.adminAuthedH1.length > 0
        ),
        assertion(
          "dom-state",
          "request:ungated-private",
          "status",
          "404",
          String(receipt.ungatedPrivateStatus),
          receipt.ungatedPrivateStatus === 404
        ),
        assertion(
          "dom-state",
          "response:ungated-private",
          "notFound",
          "true",
          String(receipt.ungatedPrivateIsNotFound),
          receipt.ungatedPrivateIsNotFound === true
        ),
      ]),
    });
  }
  if (scenarioId === "publish-front-admin-parity") {
    return variantsFor(scenarioId, {
      "front-list-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:list",
          "h1",
          receipt.listH1,
          receipt.listH1,
          receipt.listH1.length > 0
        ),
        assertion(
          "dom-state",
          "dom:list",
          "publicLinkPresent",
          "true",
          String(receipt.listHasPublicLink),
          receipt.listHasPublicLink === true
        ),
        assertion(
          "dom-state",
          "dom:list",
          "privateLinkAbsent",
          "true",
          String(!receipt.listHasPrivateLink),
          !receipt.listHasPrivateLink === true
        ),
        assertion(
          "dom-state",
          "dom:list",
          "passALinkAbsent",
          "true",
          String(!receipt.listHasPassALink),
          !receipt.listHasPassALink === true
        ),
        assertion(
          "dom-state",
          "dom:list",
          "passBLinkAbsent",
          "true",
          String(!receipt.listHasPassBLink),
          !receipt.listHasPassBLink === true
        ),
        assertion(
          "dom-state",
          "dom:list",
          "emptyMarkerAbsent",
          "true",
          String(receipt.listEmptyMarkerAbsent),
          receipt.listEmptyMarkerAbsent === true
        ),
        assertion(
          "dom-state",
          "request:search",
          "status",
          "200",
          String(receipt.searchStatus),
          receipt.searchStatus === 200
        ),
        assertion(
          "dom-state",
          "response:search",
          "publicPresent",
          "true",
          String(receipt.searchHasPublic),
          receipt.searchHasPublic === true
        ),
        assertion(
          "dom-state",
          "response:search",
          "privateAbsent",
          "true",
          String(!receipt.searchHasPrivate),
          !receipt.searchHasPrivate === true
        ),
        assertion(
          "dom-state",
          "response:search",
          "passAAbsent",
          "true",
          String(!receipt.searchHasPassA),
          !receipt.searchHasPassA === true
        ),
        assertion(
          "dom-state",
          "response:search",
          "passBAbsent",
          "true",
          String(!receipt.searchHasPassB),
          !receipt.searchHasPassB === true
        ),
      ]),
      "admin-editor-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:editor",
          "heading",
          receipt.editorHeading,
          receipt.editorHeading,
          receipt.editorHeading.length > 0
        ),
        assertion(
          "dom-state",
          "dom:editor",
          "titleValue",
          receipt.editorTitleValue,
          receipt.editorTitleValue,
          receipt.editorTitleValue.length > 0
        ),
        assertion(
          "geometry",
          "dom:editor",
          "titleVisible",
          "true",
          String(receipt.editorTitleVisible),
          receipt.editorTitleVisible === true
        ),
        assertion(
          "dom-state",
          "dom:editor",
          "slugValue",
          receipt.editorSlugValue,
          receipt.editorSlugValue,
          receipt.editorSlugValue.length > 0
        ),
        assertion(
          "geometry",
          "dom:editor",
          "slugVisible",
          "true",
          String(receipt.editorSlugVisible),
          receipt.editorSlugVisible === true
        ),
      ]),
      "admin-editor-dark": Object.freeze([
        assertion(
          "dom-state",
          "dom:editor-dark",
          "titleValue",
          receipt.darkEditorTitleValue,
          receipt.darkEditorTitleValue,
          receipt.darkEditorTitleValue.length > 0
        ),
        assertion(
          "geometry",
          "dom:editor-dark",
          "titleVisible",
          "true",
          String(receipt.darkEditorTitleVisible),
          receipt.darkEditorTitleVisible === true
        ),
        assertion(
          "dom-state",
          "dom:editor-dark",
          "slugValue",
          receipt.darkEditorSlugValue,
          receipt.darkEditorSlugValue,
          receipt.darkEditorSlugValue.length > 0
        ),
        assertion(
          "geometry",
          "dom:editor-dark",
          "slugVisible",
          "true",
          String(receipt.darkEditorSlugVisible),
          receipt.darkEditorSlugVisible === true
        ),
      ]),
    });
  }
  throw new SmokeError("smoke_output_invalid", "TASK-517 scenario is not registered");
}
