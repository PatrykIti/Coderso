import { resolve } from "node:path";
import { SmokeError } from "../../contracts";
import type { PlainJsonValue } from "../../workers/contracts";
import { buildBatchRunCodeSource, decodePlaywrightBatchOutput } from "../../browser/action-frames";
import type { BrowserFrameExpectation } from "../../browser/contracts";
import { PlaywrightCliDispatcher } from "../../browser/playwright-cli-dispatcher";
import type { SmokeVisibleAssertionKind } from "../types";
import { Task105L05PageObserver, type Task105L05PageDriver } from "./browser-segments";
import { buildExactTask105L05ScreenshotManifest } from "./output-manifest";
import { createSha256, TASK105_L05_SCENARIOS, type Task105L05ScenarioId } from "./descriptors";
import type { Task105L05FixturePage } from "./fixture";

const TASK105_L05_ADMIN_ORIGIN = "http://127.0.0.1:5173";
export const TASK105_L05_PUBLIC_ORIGIN = "http://127.0.0.1:3000";
const TASK105_L05_DRIVER_MANIFEST_SHA256 = createSha256("task-105-l05-browser-driver-v2");
export const TASK105_L05_DRIVER_SEGMENTS = Object.freeze(["a", "b"] as const);
export const TASK105_L05_TAB_A = 1;
export const TASK105_L05_TAB_B = 2;
const TASK105_L05_DISPATCH_OUTPUT_BYTES = 128 * 1024;
const TASK105_L05_SEAL_POLL_LIMIT = 120;
const REVIEWED_SITE_BUILDER_PROMPT =
  "Create a complete website for my business. Guide me through the reviewed site-builder intake.";
/** Safe scalar proof from a real, already-passing visible browser assertion. */
export interface Task105L05VisibleEvidence {
  readonly scenarioId: Task105L05ScenarioId;
  readonly theme: "light" | "dark";
  readonly surface: "admin" | "public";
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly facts: readonly Readonly<{
    readonly kind: SmokeVisibleAssertionKind;
    readonly target:
      | "menu-navigation"
      | "quick-actions"
      | "dashboard-draft"
      | "reviewed-guide"
      | "public-navigation";
    readonly property:
      "font-size" | "wide-layout" | "stale-draft" | "reviewed-prompt" | "fixture-link";
    readonly expected: string;
    readonly actual: string;
    readonly pass: true;
  }>[];
}
type Task105L05VisibleFactInput = Omit<
  Task105L05VisibleEvidence["facts"][number],
  "actual" | "pass"
>;
export function snapshotVisibleEvidence(
  items: readonly Task105L05VisibleEvidence[]
): readonly Task105L05VisibleEvidence[] {
  if (
    items.length !== TASK105_L05_SCENARIOS.length ||
    TASK105_L05_SCENARIOS.some(
      (scenarioId) => !items.some((item) => item.scenarioId === scenarioId)
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 visible evidence is incomplete");
  }
  return Object.freeze(
    [...items].sort((left, right) => left.scenarioId.localeCompare(right.scenarioId))
  );
}

export function requireWorkerFlag(
  value: PlainJsonValue,
  key:
    | "applied"
    | "prepared"
    | "claimed"
    | "restored"
    | "recovered"
    | "absent"
    | "installed"
    | "disposed"
    | "inert"
): void {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).length !== 1 ||
    (value as Record<string, unknown>)[key] !== true
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 worker bounded output is invalid");
  }
}

const source = (body: string): string => `async (page) => { ${body} }`;
const drainSource = source(`
  return await page.evaluate(() => {
    const scope = window;
    const facts = Array.isArray(scope.__L05_FACTS) ? scope.__L05_FACTS.splice(0, scope.__L05_FACTS.length) : [];
    const counts = scope.__L05_COUNTS ?? { consoleErrors: 0, pageErrors: 0 };
    scope.__L05_COUNTS = { consoleErrors: 0, pageErrors: 0 };
    return { facts, counts, instrumented: Array.isArray(scope.__L05_FACTS) };
  });
`);
function instrumentSource(adminBase: string, activation: string): string {
  const marker = `__task105l05_observer:${activation}:`;
  const config = JSON.stringify({
    adminPrefix: `${adminBase}/api/`,
    adminOrigin: TASK105_L05_ADMIN_ORIGIN,
    publicOrigin: TASK105_L05_PUBLIC_ORIGIN,
    marker,
  });
  return source(`
    const marker = ${JSON.stringify(marker)};
    await page.evaluate((marker) => { const name = String(window.name); if (name.startsWith(marker)) throw new Error("task105_l05_observer_duplicate_install"); window.name = marker + name; }, marker);
    try { await page.addInitScript((config) => {
      const scope = window; if (!String(scope.name).startsWith(config.marker)) return;
      if (Object.hasOwn(scope, "__L05_OBSERVER_STATE")) throw new Error("task105_l05_observer_duplicate_document");
      const restore = (target, key, descriptor) => descriptor === null ? delete target[key] : Object.defineProperty(target, key, descriptor);
      const replace = (target, key, wrapped) => { const descriptor = Object.getOwnPropertyDescriptor(target, key) ?? null; const original = target[key]; if (typeof original !== "function" || (descriptor !== null && !("value" in descriptor))) throw new Error("task105_l05_observer_unwrappable"); Object.defineProperty(target, key, descriptor === null ? { configurable: true, enumerable: true, writable: true, value: wrapped } : { ...descriptor, value: wrapped }); return { descriptor, original }; };
      let active = true; const facts = []; const counts = { consoleErrors: 0, pageErrors: 0 }; const seen = new Set(); const solutionKitIds = new Set(["automotive-workshop", "medical-clinic", "beauty-salon", "local-service-business", "services-directory", "small-ecommerce"]); const requests = new WeakMap(); const xhrListeners = new Set();
      try { scope.localStorage.removeItem("customScreens:list"); scope.localStorage.removeItem("solutionKits:list"); } catch {}
      const forbidden = ["apply", "rollback", "chat", "plan", "dry-run", "execute"];
      const classify = (url, method) => { const pathname = url.pathname; for (const fragment of forbidden) if (pathname.includes(fragment)) return "forbidden:" + fragment; const isAdmin = url.origin === config.adminOrigin && pathname.startsWith(config.adminPrefix); const isPublicHome = url.origin === config.publicOrigin && pathname === "/api/public/home"; const isPublicPopups = url.origin === config.publicOrigin && pathname === "/api/popups"; const tail = isAdmin ? pathname.slice(config.adminPrefix.length) : isPublicHome ? "public/home" : isPublicPopups ? "public/popups" : null; if (tail === null) return "unknown"; const path = tail.split("?")[0].replace(/\\/$/u, ""); const get = method === "GET";
        if (path === "auth/me") return get ? "auth-me" : "unknown"; if (path === "auth/install/status") return get ? "auth-install-status" : "unknown"; if (path === "auth/csrf") return get ? "auth-csrf" : "unknown"; if (path === "settings") { if (get && !seen.has("settings-list")) { seen.add("settings-list"); return "settings-list"; } return get ? "settings-read" : method === "PATCH" ? "settings-write" : "unknown"; } if (path === "custom-screens") { if (get && !seen.has("custom-screens-list")) { seen.add("custom-screens-list"); return "custom-screens-list"; } return "unknown"; } if (path === "solution-kits") { if (get && !seen.has("solution-kits-list")) { seen.add("solution-kits-list"); return "solution-kits-list"; } return get ? "solution-kits-read" : "unknown"; }
        if (path === "solution-kits/runs") return get ? "solution-kits-runs-read" : "unknown"; if (path.startsWith("solution-kits/")) return get && solutionKitIds.has(path.slice("solution-kits/".length)) ? "solution-kit-detail" : "unknown"; if (path === "menus" || path.startsWith("menus/")) return get ? "menus-read" : method === "POST" || method === "PATCH" || method === "PUT" ? "menus-write" : "unknown"; if (path === "pages" || path.startsWith("pages/")) return get ? "pages-read" : "unknown"; if (path === "page-templates") return get ? "page-templates-read" : "unknown"; if (path === "dashboard/widget-data") return method === "POST" ? "dashboard-layout-write" : get ? "dashboard-widget-data-read" : "unknown"; if (path === "content-types") return get ? "content-types-read" : "unknown"; if (path === "dashboard" || path === "dashboard/layout" || path.startsWith("dashboard/")) return get ? "dashboard-layout-read" : method === "PUT" ? "dashboard-layout-write" : "unknown"; if (path === "assistant/status") return get ? "assistant-status" : "unknown"; return path === "public/home" && get ? "public-home-data" : path === "public/popups" && get ? "public-popups-read" : "unknown"; };
      const record = (url, method, status) => { if (active) facts.push({ endpointId: classify(url, method), method, status }); };
      const fetch = replace(scope, "fetch", async function (input, init) { const response = await fetch.original.call(scope, input, init); try { const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input && input.url) || ""; if (url.includes("/api/")) { const resolved = new URL(url, scope.location.origin); record(resolved, String((init && init.method) || (input && input.method) || "GET").toUpperCase(), response.status); } } catch {} return response; });
      const prototype = scope.XMLHttpRequest.prototype; const open = replace(prototype, "open", function (method, url) { requests.set(this, { method: String(method || "GET").toUpperCase(), url: String(url || "") }); return open.original.apply(this, arguments); });
      const send = replace(prototype, "send", function () { const request = requests.get(this); if (active && request) { const listener = { xhr: this, onLoad: null }; listener.onLoad = () => { try { if (request.url.includes("/api/")) { const resolved = new URL(request.url, scope.location.origin); record(resolved, request.method, this.status); } } catch {} finally { requests.delete(this); xhrListeners.delete(listener); } }; xhrListeners.add(listener); this.addEventListener("load", listener.onLoad, { once: true }); } return send.original.apply(this, arguments); });
      const consoleError = replace(scope.console, "error", function (...args) { if (active) counts.consoleErrors += 1; return consoleError.original.apply(scope.console, args); });
      const onError = () => { if (active) counts.pageErrors += 1; }; const onRejection = () => { if (active) counts.pageErrors += 1; }; scope.addEventListener("error", onError); scope.addEventListener("unhandledrejection", onRejection);
      scope.__L05_FACTS = facts; scope.__L05_COUNTS = counts;
      Object.defineProperty(scope, "__L05_OBSERVER_STATE", { configurable: true, value: { marker: config.marker, previousName: String(scope.name).slice(config.marker.length), restore: () => { active = false; restore(scope, "fetch", fetch.descriptor); restore(prototype, "open", open.descriptor); restore(prototype, "send", send.descriptor); restore(scope.console, "error", consoleError.descriptor); scope.removeEventListener("error", onError); scope.removeEventListener("unhandledrejection", onRejection); for (const listener of xhrListeners) listener.xhr.removeEventListener("load", listener.onLoad); xhrListeners.clear(); } } });
    }, ${config}); await page.goto("about:blank"); return { installed: true }; } catch (error) { await page.evaluate((marker) => { const scope = window; const state = scope.__L05_OBSERVER_STATE; if (state?.marker === marker) { state.restore(); delete scope.__L05_FACTS; delete scope.__L05_COUNTS; delete scope.__L05_OBSERVER_STATE; } const name = String(scope.name); if (name.startsWith(marker)) scope.name = name.slice(marker.length); }, marker).catch(() => undefined); throw error; }
  `);
}
function disposeObserverSource(activation: string): string {
  const marker = `__task105l05_observer:${activation}:`;
  return source(
    `return await page.evaluate((marker) => { const scope = window; const state = scope.__L05_OBSERVER_STATE; if (!state || state.marker !== marker || !String(scope.name).startsWith(marker)) throw new Error("task105_l05_observer_dispose_invalid"); state.restore(); delete scope.__L05_FACTS; delete scope.__L05_COUNTS; delete scope.__L05_OBSERVER_STATE; scope.name = state.previousName; return { disposed: true }; }, ${JSON.stringify(marker)});`
  );
}
function proveObserverInertSource(activation: string): string {
  const marker = `__task105l05_observer:${activation}:`;
  return source(
    `await page.goto("about:blank"); return await page.evaluate((marker) => { const scope = window; return { inert: !String(scope.name).startsWith(marker) && !Object.hasOwn(scope, "__L05_OBSERVER_STATE") && !Object.hasOwn(scope, "__L05_FACTS") && !Object.hasOwn(scope, "__L05_COUNTS") }; }, ${JSON.stringify(marker)});`
  );
}
interface Task105L05DrainPayload {
  readonly facts: ReadonlyArray<{ endpointId: unknown; method: unknown; status: unknown }>;
  readonly counts: { readonly consoleErrors: unknown; readonly pageErrors: unknown };
  readonly instrumented?: unknown;
}
export class Task105L05CliDriverCoordinator {
  readonly #dispatcher: PlaywrightCliDispatcher;
  readonly #session: string;
  #lastActiveTabIndex = 0;
  #sequence = 0;
  constructor(dispatcher: PlaywrightCliDispatcher, session: string) {
    this.#dispatcher = dispatcher;
    this.#session = session;
  }
  markActive(index: number): void {
    this.#lastActiveTabIndex = index;
  }
  async #select(index: number): Promise<void> {
    if (this.#lastActiveTabIndex !== index) {
      await this.#dispatcher.dispatchNative({ operation: "tab-select", index });
      this.#lastActiveTabIndex = index;
    }
  }
  async run(
    tabIndex: number,
    segmentId: "a" | "b",
    actionId: string,
    body: string
  ): Promise<PlainJsonValue> {
    await this.#select(tabIndex);
    this.#sequence += 1;
    const expectation: BrowserFrameExpectation = {
      runId: `task105l05_${this.#sequence}`,
      manifestSha256: TASK105_L05_DRIVER_MANIFEST_SHA256,
      scenarioId: "task105l05_driver",
      segmentId,
      actionIds: [actionId],
    };
    const stdout = await this.#dispatcher.dispatch({
      session: this.#session,
      segmentId,
      source: buildBatchRunCodeSource({ expectation, actions: [{ actionId, source: body }] }),
      maximumOutputBytes: TASK105_L05_DISPATCH_OUTPUT_BYTES,
    });
    const frame = decodePlaywrightBatchOutput(stdout, expectation)[0];
    if (frame === undefined || frame.status !== "success") {
      throw new SmokeError(
        "smoke_process_failed",
        `TASK-105 L05 browser action ${actionId} failed (${frame?.failureCode ?? "no frame"})`
      );
    }
    return frame.output as PlainJsonValue;
  }
}
export interface Task105L05ObserverDispatcher {
  run(
    tabIndex: number,
    segmentId: "a" | "b",
    actionId: string,
    body: string
  ): Promise<PlainJsonValue>;
}
export interface Task105L05InjectedObserver {
  install(
    input: Readonly<{ tabIndex: number; segmentId: "a" | "b"; adminBase: string }>
  ): Promise<void>;
  dispose(): Promise<void>;
  isDisposed(): boolean;
}
interface Task105L05ObserverRegistration {
  readonly tabIndex: number;
  readonly segmentId: "a" | "b";
  readonly activation: string;
  stage: "installed" | "restored" | "inert";
}
class Task105L05InjectedObserverController implements Task105L05InjectedObserver {
  readonly #dispatcher: Task105L05ObserverDispatcher;
  readonly #session: string;
  readonly #registrations: Task105L05ObserverRegistration[] = [];
  #generation = 0;
  #disposed = false;
  constructor(dispatcher: Task105L05ObserverDispatcher, descriptor: Readonly<{ session: string }>) {
    this.#dispatcher = dispatcher;
    this.#session = descriptor.session;
  }
  async install(
    input: Readonly<{ tabIndex: number; segmentId: "a" | "b"; adminBase: string }>
  ): Promise<void> {
    if (this.#disposed || this.#registrations.some(({ tabIndex }) => tabIndex === input.tabIndex))
      throw new SmokeError("smoke_output_invalid", "TASK-105 L05 observer install is invalid");
    const activation = `${this.#session}_${++this.#generation}`;
    requireWorkerFlag(
      await this.#dispatcher.run(
        input.tabIndex,
        input.segmentId,
        "install_observer",
        instrumentSource(input.adminBase, activation)
      ),
      "installed"
    );
    this.#registrations.push({ ...input, activation, stage: "installed" });
  }
  async dispose(): Promise<void> {
    if (this.#disposed)
      throw new SmokeError("smoke_output_invalid", "TASK-105 L05 observer dispose is invalid");
    for (const entry of [...this.#registrations].reverse()) {
      if (entry.stage === "installed") {
        requireWorkerFlag(
          await this.#dispatcher.run(
            entry.tabIndex,
            entry.segmentId,
            "dispose_observer",
            disposeObserverSource(entry.activation)
          ),
          "disposed"
        );
        entry.stage = "restored";
      }
      if (entry.stage === "restored") {
        requireWorkerFlag(
          await this.#dispatcher.run(
            entry.tabIndex,
            entry.segmentId,
            "prove_observer_inert",
            proveObserverInertSource(entry.activation)
          ),
          "inert"
        );
        entry.stage = "inert";
      }
    }
    this.#disposed = true;
  }
  isDisposed(): boolean {
    return this.#disposed && this.#registrations.every(({ stage }) => stage === "inert");
  }
}
/** Private observer lifecycle controls the otherwise-unremovable CLI init registration. */
export function createTask105L05InjectedObserver(
  dispatcher: Task105L05ObserverDispatcher,
  descriptor: Readonly<{ session: string }>
): Task105L05InjectedObserver {
  return new Task105L05InjectedObserverController(dispatcher, descriptor);
}
function menuLabel(session: string): string {
  return `TASK-105 L05 navigation ${session}`;
}
function quickActionLabel(session: string, suffix: "A" | "B"): string {
  return `TASK-105 L05 Quick Action ${suffix} ${session}`;
}
function inspectResult(value: PlainJsonValue, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new SmokeError("smoke_output_invalid", `TASK-105 L05 ${label} result is invalid`);
  }
  return value as Record<string, unknown>;
}
export class Task105L05CliPageDriver implements Task105L05PageDriver {
  readonly #coordinator: Task105L05CliDriverCoordinator;
  readonly #tabIndex: number;
  readonly #segmentId: "a" | "b";
  readonly #session: string;
  readonly #adminBase: string;
  readonly #candidateRoot: string;
  readonly #profile: "fast" | "certification";
  readonly #observer: Task105L05PageObserver;
  readonly #prepareSiteShellMutation: () => Promise<void>;
  readonly #visibleEvidence: Task105L05VisibleEvidence[];
  #menuId: string | null = null;
  #dashboardDocumentLoaded = false;
  constructor(input: {
    readonly coordinator: Task105L05CliDriverCoordinator;
    readonly tabIndex: number;
    readonly segmentId: "a" | "b";
    readonly session: string;
    readonly adminBase: string;
    readonly candidateRoot: string;
    readonly profile: "fast" | "certification";
    readonly observer: Task105L05PageObserver;
    readonly visibleEvidence: Task105L05VisibleEvidence[];
    /** Durable receipt intent must precede the browser-owned Site Shell PATCH. */
    readonly prepareSiteShellMutation: () => Promise<void>;
  }) {
    this.#coordinator = input.coordinator;
    this.#tabIndex = input.tabIndex;
    this.#segmentId = input.segmentId;
    this.#session = input.session;
    this.#adminBase = input.adminBase;
    this.#candidateRoot = input.candidateRoot;
    this.#profile = input.profile;
    this.#observer = input.observer;
    this.#visibleEvidence = input.visibleEvidence;
    this.#prepareSiteShellMutation = input.prepareSiteShellMutation;
  }
  async #run(actionId: string, body: string): Promise<PlainJsonValue> {
    await this.#drain();
    const output = await this.#coordinator.run(
      this.#tabIndex,
      this.#segmentId,
      actionId,
      source(body)
    );
    await this.#drain();
    return output;
  }
  async #setAdminColorMode(mode: "light" | "dark"): Promise<void> {
    const result = inspectResult(
      await this.#run(
        "set_admin_color_mode",
        `
      const toggle = page.getByRole("button", { name: "Toggle dark mode", exact: true });
      const isDark = (await toggle.getAttribute("aria-pressed")) === "true";
      if (isDark !== ${mode === "dark"}) await toggle.click({ timeout: 15000 });
      await page.waitForFunction((expected) => document.documentElement.classList.contains("dark") === expected, ${mode === "dark"}, { timeout: 15000 });
      const actual = await page.evaluate(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
      return { actual };
    `
      ),
      "admin color mode"
    );
    if (result.actual !== mode)
      throw new SmokeError("smoke_output_invalid", "TASK-105 L05 admin color mode is invalid");
  }
  async #recordVisible(
    input: Readonly<{
      scenarioId: Task105L05ScenarioId;
      surface: "admin" | "public";
      fact: Task105L05VisibleFactInput;
      actionId: string;
      body: string;
    }>
  ): Promise<void> {
    const result = inspectResult(
      await this.#run(
        input.actionId,
        `await page.setViewportSize({ width: 1440, height: 900 }); ${input.body}
      const presentation = await page.evaluate(() => ({ theme: document.documentElement.classList.contains("dark") ? "dark" : "light", width: window.innerWidth, height: window.innerHeight }));
      return { actual, ...presentation };
    `
      ),
      "visible assertion"
    );
    const theme = result.theme;
    const width = result.width;
    const height = result.height;
    if (
      (theme !== "light" && theme !== "dark") ||
      typeof width !== "number" ||
      !Number.isSafeInteger(width) ||
      width <= 0 ||
      width > 8192 ||
      typeof height !== "number" ||
      !Number.isSafeInteger(height) ||
      height <= 0 ||
      height > 8192 ||
      result.actual !== input.fact.expected ||
      this.#visibleEvidence.some(({ scenarioId }) => scenarioId === input.scenarioId)
    )
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 visible assertion receipt is invalid"
      );
    this.#visibleEvidence.push(
      Object.freeze({
        scenarioId: input.scenarioId,
        theme,
        surface: input.surface,
        viewport: Object.freeze({ width, height }),
        facts: Object.freeze([
          Object.freeze({ ...input.fact, actual: input.fact.expected, pass: true }),
        ]),
      })
    );
  }
  async #drain(): Promise<void> {
    const payload = (await this.#coordinator.run(
      this.#tabIndex,
      this.#segmentId,
      "drain_facts",
      drainSource
    )) as unknown as Task105L05DrainPayload;
    if (payload.instrumented !== true) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 observer instrumentation is absent"
      );
    }
    for (const fact of payload.facts ?? []) {
      this.#observer.observeResponse({
        endpointId: String(fact.endpointId),
        method: String(fact.method),
        status: Number(fact.status),
      });
    }
    const consoleErrors = Number(payload.counts?.consoleErrors ?? 0);
    const pageErrors = Number(payload.counts?.pageErrors ?? 0);
    if (
      !Number.isSafeInteger(consoleErrors) ||
      consoleErrors < 0 ||
      !Number.isSafeInteger(pageErrors) ||
      pageErrors < 0
    ) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 observer error counts are invalid"
      );
    }
    for (let index = 0; index < consoleErrors; index += 1) this.#observer.observeConsoleError();
    for (let index = 0; index < pageErrors; index += 1) this.#observer.observePageError();
  }
  async navigateAndSealInitial(document: "menus" | "dashboard"): Promise<void> {
    const suffix = document === "menus" ? "/menus" : "/";
    await this.#run(
      "goto_initial_document",
      `await page.goto(${JSON.stringify(`${TASK105_L05_ADMIN_ORIGIN}${this.#adminBase}${suffix}`)}, { waitUntil: "load", timeout: 60000 }); return null;`
    );
    await this.#seal();
  }
  async #waitForBootstrapActivity(): Promise<void> {
    await this.#run(
      "wait_for_bootstrap_activity",
      `
        await page.waitForFunction(() => {
          const scope = window;
          const facts = Array.isArray(scope.__L05_FACTS) ? scope.__L05_FACTS : [];
          const counts = scope.__L05_COUNTS ?? { consoleErrors: 0, pageErrors: 0 };
          return facts.length >= 5 || counts.consoleErrors > 0 || counts.pageErrors > 0;
        }, undefined, { timeout: 1000 }).catch(() => undefined);
        return null;
      `
    );
  }
  async #seal(): Promise<void> {
    for (let poll = 0; poll < TASK105_L05_SEAL_POLL_LIMIT; poll += 1) {
      await this.#waitForBootstrapActivity();
      await this.#drain();
      if (this.#observer.isSealed()) return;
    }
    throw new SmokeError(
      "smoke_output_invalid",
      `TASK-105 L05 bootstrap facts did not seal within poll budget (polls=${TASK105_L05_SEAL_POLL_LIMIT})`
    );
  }
  async createMenuForFixture(
    fixturePage: Task105L05FixturePage
  ): Promise<{ readonly menuId: string }> {
    const label = menuLabel(this.#session);
    const output = await this.#run(
      "create_menu_for_fixture",
      `
        await page.getByRole("button", { name: "New", exact: true }).click({ timeout: 15000 });
        const dialog = page.getByRole("dialog", { name: "Create Menu" });
        await dialog.getByPlaceholder("Main Menu").fill(${JSON.stringify(label)});
        await dialog.getByRole("button", { name: "Create Menu", exact: true }).click();
        const editorLink = page.getByRole("link", { name: ${JSON.stringify(`Open menu editor for ${label}`)}, exact: true });
        await editorLink.waitFor({ state: "visible", timeout: 15000 });
        await editorLink.click();
        const editorFrame = page.locator('[data-editor-frame="true"]');
        await editorFrame.waitFor({ state: "visible", timeout: 15000 });
        await editorFrame.getByRole("button", { name: "Pages", exact: true }).click({ timeout: 15000 });
        const pageSelect = editorFrame
          .locator("aside")
          .last()
          .getByText("Choose an existing page to link.", { exact: true })
          .locator("..")
          .getByRole("combobox");
        await pageSelect.click({ timeout: 15000 });
        await page.getByRole("option", { name: ${JSON.stringify(fixturePage.title)}, exact: true }).click({ timeout: 15000 });
        const navigationLabel = page.getByPlaceholder("Menu label", { exact: true });
        await navigationLabel.fill(${JSON.stringify(label)});
        await page.getByRole("button", { name: "Save changes", exact: true }).click({ timeout: 15000 });
        await page.getByRole("button", { name: "Publish", exact: true }).click({ timeout: 15000 });
        const menuId = await page.evaluate(() => {
          const path = location.pathname.split("/");
          const index = path.indexOf("menus");
          return index >= 0 ? path[index + 1] ?? "" : "";
        });
        return { menuId: typeof menuId === "string" ? menuId : "" };
      `
    );
    const result = inspectResult(output, "create menu");
    if (typeof result.menuId !== "string" || result.menuId.length === 0) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 menu creation did not yield an opaque id"
      );
    }
    this.#menuId = result.menuId;
    return Object.freeze({ menuId: result.menuId });
  }
  async configureSiteShellNavigation(menuId: string): Promise<void> {
    if (this.#menuId !== menuId) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 Site Shell menu identity is unbound"
      );
    }
    await this.#prepareSiteShellMutation();
    const label = menuLabel(this.#session);
    await this.#run(
      "configure_site_shell_navigation",
      `
        await page.locator('aside.hidden.md\\\\:flex').getByRole("link", { name: "Menus", exact: true }).click({ timeout: 15000 });
        await page.getByRole("button", { name: "Site shell", exact: true }).click({ timeout: 15000 });
        const field = page.locator('[data-site-shell-field="navigation-menu"]');
        await field.getByRole("combobox").click({ timeout: 15000 });
        await page.getByRole("option", { name: ${JSON.stringify(label)}, exact: true }).click({ timeout: 15000 });
        await page.locator('[data-site-shell-dialog="true"]').getByRole("button", { name: "Save changes", exact: true }).click();
        return null;
      `
    );
  }
  async applyMenuDesignFontSizeTwenty(): Promise<void> {
    if (this.#menuId === null)
      throw new SmokeError("smoke_output_invalid", "TASK-105 L05 design menu is absent");
    await this.#setAdminColorMode("light");
    await this.#recordVisible({
      scenarioId: "menu-design-appearance-visible-effect",
      surface: "admin",
      fact: {
        kind: "computed-style",
        target: "menu-navigation",
        property: "font-size",
        expected: "20px",
      },
      actionId: "apply_menu_design_font_size_twenty",
      body: `
        await page.locator('aside.hidden.md\\\\:flex').getByRole("link", { name: "Menus", exact: true }).click({ timeout: 15000 });
        await page.getByText(${JSON.stringify(menuLabel(this.#session))}, { exact: true }).click({ timeout: 15000 });
        await page.locator('[data-menu-design-button="true"]').click({ timeout: 15000 });
        const canvas = page.locator('[data-menu-document-canvas="true"]');
        // The design editor hydrates its canvas blocks asynchronously (r30 probe:
        // zero blocks at body start, present seconds later), so the nav block is
        // awaited explicitly before clicking. The wrapper must also be matched
        // with a pure :has() selector — a canvas-rooted filter(has:
        // canvas.locator(...)) resolves to zero under the pinned playwright-cli
        // even though the containment holds in the live DOM (r27 outline,
        // synthetic repro, 2026-09-01).
        const navBlock = canvas.locator('div[data-menu-block-id]:has(nav[data-menu-nav-preview="true"])').first();
        await navBlock.waitFor({ state: "visible", timeout: 30000 });
        await navBlock.click({ timeout: 15000 });
        const slider = page.locator('[data-menu-block-panel="nav-items"] input[type="range"][data-page-editor-slider="Font size"]');
        await slider.focus();
        await slider.press("Home");
        for (let index = 0; index < 10; index += 1) await slider.press("ArrowRight");
        const value = await slider.inputValue();
        const visibleFontSize = await canvas.locator('nav[data-menu-nav-preview="true"] .site-nav-link').first().evaluate((node) => getComputedStyle(node).fontSize);
        const actual = visibleFontSize;
        if (value !== "20" || actual !== "20px") throw new Error("task105_l05_menu_design_visible_effect_missing");
        await page.getByRole("button", { name: "Save", exact: true }).click({ timeout: 15000 });
        await page.getByRole("button", { name: "Publish", exact: true }).click({ timeout: 15000 });
      `,
    });
  }
  async createConfigureSaveQuickActions(): Promise<void> {
    const label = quickActionLabel(this.#session, "A");
    await this.#run(
      "create_configure_save_quick_actions",
      `
        await page.getByRole("link", { name: "Dashboard", exact: true }).click({ timeout: 15000 });
        // Pure :has() form — filter({ has: ... }) resolves to zero under the
        // pinned playwright-cli (see the nav-block note in the design action).
        await page.locator('[aria-busy]:has([data-widget-id])').first().waitFor({ state: "visible", timeout: 15000 });
        await page.getByRole("button", { name: "Customize", exact: true }).click();
        await page.getByRole("button", { name: /Quick Actions.*Common admin shortcuts/ }).click({ timeout: 15000 });
        // Adding a catalog widget also SELECTS it, which auto-opens its config
        // sheet; the sheet carries a second data-widget-type host (its
        // editMode=false preview) at the end of the DOM, so the grid host is
        // scoped through the dashboard grid container instead of .last().
        const host = page.locator('[aria-busy]').first().locator('[data-widget-type="quick-actions"]');
        await page.getByRole("button", { name: "Add action", exact: true }).click({ timeout: 15000 });
        await page.getByLabel("Action label").last().fill(${JSON.stringify(label)});
        await page.getByRole("button", { name: "Done", exact: true }).click();
        await host.getByRole("button", { name: "Wider", exact: true }).click({ timeout: 15000 });
        await page.getByRole("button", { name: "Save", exact: true }).click({ timeout: 15000 });
        return null;
      `
    );
    this.#dashboardDocumentLoaded = true;
  }
  async reloadDashboardAndSealNextBootstrap(): Promise<void> {
    if (!this.#dashboardDocumentLoaded) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 controlled dashboard reload is out of order"
      );
    }
    await this.#drain();
    this.#observer.beginNextBootstrapEpoch();
    await this.#coordinator.run(
      this.#tabIndex,
      this.#segmentId,
      "reload_dashboard_document",
      source(`await page.reload({ waitUntil: "load", timeout: 60000 }); return null;`)
    );
    await this.#seal();
  }
  async assertPersistedQuickActions(): Promise<void> {
    await this.#setAdminColorMode("dark");
    await this.#recordVisible({
      scenarioId: "dashboard-edit-configure-save",
      surface: "admin",
      fact: {
        kind: "geometry",
        target: "quick-actions",
        property: "wide-layout",
        expected: "true",
      },
      actionId: "assert_persisted_quick_actions",
      body: `
        const host = page.locator('[aria-busy]').first().locator('[data-widget-type="quick-actions"]');
        await host.waitFor({ state: "visible", timeout: 15000 });
        const text = await host.textContent();
        const parentClass = await host.locator("..").getAttribute("class");
        const actual = text?.includes(${JSON.stringify(quickActionLabel(this.#session, "A"))}) === true && parentClass?.includes("lg:col-span-") === true ? "true" : "false";
        if (actual !== "true") {
          throw new Error("task105_l05_dashboard_persistence_missing");
        }
      `,
    });
  }
  async openSolutionKitGuide(): Promise<void> {
    await this.#recordVisible({
      scenarioId: "solution-kit-select-reviewed-handoff",
      surface: "admin",
      fact: {
        kind: "dom-state",
        target: "reviewed-guide",
        property: "reviewed-prompt",
        expected: "true",
      },
      actionId: "open_solution_kit_guide",
      body: `
        // The sidebar link carries a "Beta" badge INSIDE the anchor, so its
        // accessible name is "Solution Kits Beta"; anchor on the label (r44).
        await page.getByRole("link", { name: /^Solution Kits/ }).click({ timeout: 15000 });
        await page.getByRole("button", { name: "Select kit", exact: true }).first().click({ timeout: 15000 });
        await page.getByText("Selected kit details", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
        await page.getByRole("button", { name: "Open LLM Guide", exact: true }).click({ timeout: 15000 });
        const dialog = page.getByRole("dialog", { name: "Assistant conversation" });
        await dialog.waitFor({ state: "visible", timeout: 15000 });
        // Mode- and placeholder-agnostic prefill proof: without an LLM backend
        // resolveAssistantCurrentMode degrades the panel to docs-only (r49
        // probe: placeholder "Ask where something is in docs"), but the
        // composer textarea is controlled by the same message state the
        // reviewed handoff prefills, so its VALUE must carry the prompt.
        const prompt = await dialog.locator("textarea").first().inputValue({ timeout: 15000 });
        const actual = prompt === ${JSON.stringify(REVIEWED_SITE_BUILDER_PROMPT)} ? "true" : "false";
        if (actual !== "true") throw new Error("task105_l05_reviewed_prompt_missing");
      `,
    });
  }
  async prepareDirtyDashboardDraft(): Promise<void> {
    const label = quickActionLabel(this.#session, "A");
    await this.#run(
      "prepare_dirty_dashboard_draft",
      `
        await page.getByRole("link", { name: "Dashboard", exact: true }).click({ timeout: 15000 });
        await page.getByRole("button", { name: "Customize", exact: true }).click({ timeout: 15000 });
        // Grid-scoped host: the config sheet's editMode=false preview also
        // carries data-widget-type at the end of the DOM, so .last() would
        // target a host with no edit toolbar.
        const host = page.locator('[aria-busy]').first().locator('[data-widget-type="quick-actions"]');
        await host.getByRole("button", { name: "Configure", exact: true }).click({ timeout: 15000 });
        await page.getByLabel("Action label").last().fill(${JSON.stringify(`${label} draft`)});
        await page.getByRole("button", { name: "Done", exact: true }).click();
        return null;
      `
    );
  }
  async persistRemoteDashboardMutation(): Promise<void> {
    const label = quickActionLabel(this.#session, "B");
    await this.#run(
      "persist_remote_dashboard_mutation",
      `
        await page.getByRole("button", { name: "Customize", exact: true }).click({ timeout: 15000 });
        // Grid-scoped host (see the dirty-draft note): the config sheet's
        // editMode=false preview also carries data-widget-type at the end of
        // the DOM, so .last() would target a host with no edit toolbar.
        const host = page.locator('[aria-busy]').first().locator('[data-widget-type="quick-actions"]');
        await host.getByRole("button", { name: "Configure", exact: true }).click({ timeout: 15000 });
        await page.getByLabel("Action label").last().fill(${JSON.stringify(label)});
        await page.getByRole("button", { name: "Done", exact: true }).click();
        await host.getByRole("button", { name: "Taller", exact: true }).click();
        await page.getByRole("button", { name: "Save", exact: true }).click({ timeout: 15000 });
        return null;
      `
    );
  }
  async assertStaleDirtyDraft(): Promise<void> {
    await this.#recordVisible({
      scenarioId: "dashboard-dirty-remote-stale",
      surface: "admin",
      fact: {
        kind: "dom-state",
        target: "dashboard-draft",
        property: "stale-draft",
        expected: "true",
      },
      actionId: "assert_stale_dirty_draft",
      body: `
        await page.getByText("Saved layout changed elsewhere", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
        const save = page.getByRole("button", { name: "Save", exact: true });
        const disabled = await save.isDisabled();
        const draft = page.locator('[aria-busy]').first().locator('[data-widget-type="quick-actions"]');
        const visible = await draft.textContent();
        const actual = disabled === true && visible?.includes(${JSON.stringify(`${quickActionLabel(this.#session, "A")} draft`)}) === true ? "true" : "false";
        if (actual !== "true") {
          throw new Error("task105_l05_stale_draft_proof_missing");
        }
      `,
    });
  }
  async assertPublicMenuParity(fixturePage: Task105L05FixturePage): Promise<void> {
    await this.#recordVisible({
      scenarioId: "menu-structure-save-publish-parity",
      surface: "public",
      fact: {
        kind: "dom-state",
        target: "public-navigation",
        property: "fixture-link",
        expected: "true",
      },
      actionId: "assert_public_menu_parity",
      body: `
        await page.goto(${JSON.stringify(TASK105_L05_PUBLIC_ORIGIN)}, { waitUntil: "load", timeout: 60000 });
        const link = page.getByRole("link", { name: ${JSON.stringify(menuLabel(this.#session))}, exact: true });
        await link.waitFor({ state: "visible", timeout: 15000 });
        const href = await link.getAttribute("href");
        const actual = href === ${JSON.stringify(fixturePage.relativePath)} ? "true" : "false";
        if (actual !== "true") throw new Error("task105_l05_public_menu_parity_missing");
      `,
    });
  }
  async screenshot(scenarioId: import("./descriptors").Task105L05ScenarioId): Promise<void> {
    const manifest = buildExactTask105L05ScreenshotManifest({
      command: "run",
      suite: "task-105-l05",
      profile: this.#profile,
      session: this.#session,
    });
    const entry = manifest.entries.find((item) => item.scenarioId === scenarioId);
    if (entry === undefined)
      throw new SmokeError("smoke_output_invalid", "TASK-105 L05 screenshot descriptor is absent");
    const path = resolve(this.#candidateRoot, entry.path.split("/").pop() ?? "");
    await this.#run(
      "screenshot",
      `await page.setViewportSize({ width: 1440, height: 900 }); await page.screenshot({ path: ${JSON.stringify(path)}, fullPage: false, animations: "disabled" }); return null;`
    );
  }
}
export async function instrumentTask105L05Page(
  observer: Task105L05InjectedObserver,
  tabIndex: number,
  segmentId: "a" | "b",
  adminBase: string
): Promise<void> {
  await observer.install({ tabIndex, segmentId, adminBase });
}
