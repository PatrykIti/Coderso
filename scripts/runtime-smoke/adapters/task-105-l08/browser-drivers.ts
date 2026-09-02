import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { SmokeError } from "../../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../../lifecycle";
import { pollUntil } from "../../polling";
import type { PlainJsonValue } from "../../workers/contracts";
import { buildBatchRunCodeSource, decodePlaywrightBatchOutput } from "../../browser/action-frames";
import type { BrowserFrameExpectation } from "../../browser/contracts";
import { PlaywrightCliDispatcher } from "../../browser/playwright-cli-dispatcher";
import {
  TASK_105_L08_SCENARIO_DESCRIPTORS,
  TASK105_L08_SCENARIOS,
  createSha256,
  requireTask105L08Descriptor,
  task105L08FactsFor,
  validateTask105L08BrowserReceipt,
  type Task105L08BrowserReceipt,
  type Task105L08FactContract,
  type Task105L08ScenarioId,
  type Task105L08VisibleFact,
} from "./descriptors";
import {
  TASK_105_L08_ADMIN_ORIGIN,
  TASK_105_L08_PUBLIC_ORIGIN,
  validateTask105L08AdminBase,
} from "./host";
import { TASK_105_L08_SCENARIO_SURFACES } from "./descriptors";
import type { Task105L08FixtureFacts } from "./fixture";

/**
 * TASK-105 L08 real browser drivers (contract: TASK-105-08-08-L07).
 *
 * One supervised Playwright tab drives all five scenarios through the shared
 * CLI dispatcher. Every scenario installs pre-navigation console/page-error
 * counters, proves visible effects with polling waits (never sleeps), and
 * reports only bounded, redacted assertion scalars.
 */

const DRIVER_MANIFEST_SHA256 = createSha256("task-105-l08-browser-driver-v1");
const DISPATCH_OUTPUT_BYTES = 128 * 1024;
const TIMEOUT = 15_000;
// Scenario openers wait on the first browser hit of a fresh dev server, where
// the route module graph cold-compiles (r8/r26/r33/r38-diag: three early s1
// deaths at 3 dispatches, each green on a warm retry). The goto already
// budgets 60s for the same reason; the first element wait matches it at 45s.
const OPEN_TIMEOUT = 45_000;
const VIEWPORT = Object.freeze({ width: 1440, height: 900 });

const source = (body: string): string => `async (page) => { ${body} }`;

// Raw statement body: the coordinator's `source(...)` wraps it into the
// `async (page) => { ... }` action exactly once, like every other action.
const instrumentSource = `
  const marker = ${JSON.stringify("__task105l08_observer:")};
  await page.evaluate((marker) => {
    const scope = window;
    if (String(scope.name).startsWith(marker)) throw new Error("task105_l08_observer_duplicate");
    scope.name = marker + String(scope.name);
  }, marker);
  await page.addInitScript((marker) => {
    const scope = window;
    if (!String(scope.name).startsWith(marker)) return;
    if (Object.hasOwn(scope, "__L08_COUNTS")) throw new Error("task105_l08_observer_reinstalled");
    const counts = { consoleErrors: 0, pageErrors: 0 };
    const original = scope.console.error.bind(scope.console);
    scope.console.error = (...args) => { counts.consoleErrors += 1; return original(...args); };
    scope.addEventListener("error", () => { counts.pageErrors += 1; });
    scope.addEventListener("unhandledrejection", () => { counts.pageErrors += 1; });
    scope.__L08_COUNTS = counts;
  }, marker);
  await page.goto("about:blank");
  return { installed: true };
`;

function inspectResult(value: PlainJsonValue, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new SmokeError("smoke_output_invalid", `TASK-105 L08 ${label} result is invalid`);
  }
  return value as Record<string, unknown>;
}

function requireFlag(value: PlainJsonValue, key: string): void {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    (value as Record<string, unknown>)[key] !== true
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L08 driver flag is invalid");
  }
}

export function task105L08AdminUrl(adminBase: string, path: string): string {
  if (!path.startsWith("/") || path.endsWith("/")) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L08 admin path is invalid");
  }
  return `${TASK_105_L08_ADMIN_ORIGIN}${adminBase}${path}`;
}

export function task105L08PublicUrl(path: string): string {
  if (!path.startsWith("/") || path.endsWith("/") || path.includes("..")) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L08 public path is invalid");
  }
  return `${TASK_105_L08_PUBLIC_ORIGIN}${path}`;
}

/** Private per-session workspace owns the storage state and screenshot candidates. */
export class Task105L08Workspace implements LifecycleResource {
  readonly name = "task-105-l08-workspace";
  readonly path: string;
  readonly storageStatePath: string;
  readonly screenshotCandidateRoot: string;

  private constructor(path: string) {
    this.path = path;
    this.storageStatePath = resolve(path, "admin-storage-state.json");
    this.screenshotCandidateRoot = resolve(path, "screenshot-candidates");
  }

  static async create(root: string, session: string): Promise<Task105L08Workspace> {
    const parent = resolve(root, "_docs/_workflows/_smoke/task-105-l08/workspaces");
    await mkdir(parent, { recursive: true });
    const path = resolve(parent, session);
    try {
      await mkdir(path, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new SmokeError(
          "smoke_process_failed",
          "TASK-105 L08 workspace already exists for this session"
        );
      }
      throw error;
    }
    const workspace = new Task105L08Workspace(path);
    await mkdir(workspace.screenshotCandidateRoot, { mode: 0o700 });
    return workspace;
  }

  async close(): Promise<void> {
    await rm(this.path, { recursive: true, force: true, maxRetries: 2 });
  }

  async proveAbsent(): Promise<boolean> {
    try {
      await rm(this.path, { recursive: true, force: true, maxRetries: 2 });
      return true;
    } catch {
      return false;
    }
  }
}

export class Task105L08DispatchResource implements LifecycleResource {
  readonly name = "task-105-l08-browser-dispatch";
  readonly #dispatcher: Pick<PlaywrightCliDispatcher, "close" | "proveAbsent">;
  #closed = false;

  constructor(dispatcher: Pick<PlaywrightCliDispatcher, "close" | "proveAbsent">) {
    this.#dispatcher = dispatcher;
  }

  async close(): Promise<void> {
    await this.#dispatcher.close();
    this.#closed = true;
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed && (await this.#dispatcher.proveAbsent());
  }
}

class Task105L08Coordinator {
  readonly #dispatcher: PlaywrightCliDispatcher;
  readonly #session: string;
  #sequence = 0;

  constructor(dispatcher: PlaywrightCliDispatcher, session: string) {
    this.#dispatcher = dispatcher;
    this.#session = session;
  }

  async run(actionId: string, body: string): Promise<PlainJsonValue> {
    this.#sequence += 1;
    const expectation: BrowserFrameExpectation = {
      runId: `task105l08_${this.#sequence}`,
      manifestSha256: DRIVER_MANIFEST_SHA256,
      scenarioId: "task105l08_driver",
      segmentId: "a",
      actionIds: [actionId],
    };
    const stdout = await this.#dispatcher.dispatch({
      session: this.#session,
      segmentId: "a",
      source: buildBatchRunCodeSource({
        expectation,
        actions: [{ actionId, source: source(body) }],
      }),
      maximumOutputBytes: DISPATCH_OUTPUT_BYTES,
    });
    const frame = decodePlaywrightBatchOutput(stdout, expectation)[0];
    if (frame === undefined || frame.status !== "success") {
      throw new SmokeError(
        "smoke_process_failed",
        `TASK-105 L08 browser action ${actionId} failed (${frame?.failureCode ?? "no frame"})`
      );
    }
    return frame.output as PlainJsonValue;
  }
}

export interface Task105L08DriverRuntime {
  readonly facts: Task105L08FixtureFacts;
  readonly workspace: Task105L08Workspace;
  readonly receipt: () => Task105L08BrowserReceipt;
  readonly runScenarios: () => Promise<void>;
}

/**
 * Polls the synthetic admin base and the public list route until both respond.
 * The bare public root is intentionally excluded: the core server permanently
 * 404s a loopback Host on `/`, so only the synthetic content route proves the
 * public surface (mirrors the readiness-probe policy in `host.ts`).
 */
export async function proveTask105L08Routes(input: {
  readonly adminBase: string;
  readonly listPath: string;
  readonly fetch?: typeof globalThis.fetch;
}): Promise<void> {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  const probe = async (): Promise<boolean> => {
    const targets = [
      `${TASK_105_L08_ADMIN_ORIGIN}${input.adminBase}/`,
      `${TASK_105_L08_ADMIN_ORIGIN}${input.adminBase}/api/auth/install/status`,
      `${TASK_105_L08_PUBLIC_ORIGIN}${input.listPath}`,
    ];
    const responses = await Promise.all(
      targets.map((target) =>
        fetchImpl(target, { redirect: "manual", signal: AbortSignal.timeout(5_000) })
          .then(async (response) => {
            await response.body?.cancel();
            return response.status === 200;
          })
          .catch(() => false)
      )
    );
    return responses.every((ready) => ready);
  };
  await pollUntil({ timeoutMs: 60_000, intervalMs: 250, check: probe });
}

/** Creates the workspace, wires the supervised dispatcher, and plans the flows. */
export async function wireTask105L08Driver(
  context: RuntimeSmokeContext,
  input: {
    readonly facts: Task105L08FixtureFacts;
    readonly workspace: Task105L08Workspace;
    readonly routesProven: Promise<SmokeError | undefined>;
  }
): Promise<Task105L08DriverRuntime> {
  const session = context.input.session;
  const adminBase = validateTask105L08AdminBase(session, input.facts.adminBase);
  context.lifecycle.assertAccepting();
  if (typeof process.env.DATABASE_URL !== "string" || process.env.DATABASE_URL.length === 0) {
    throw new SmokeError(
      "smoke_adapter_unavailable",
      "TASK-105 L08 runtime requires DATABASE_URL before drivers can open"
    );
  }
  const dispatcher = new PlaywrightCliDispatcher({
    context,
    session,
    workspace: input.workspace.path,
    segments: ["a"],
    runCodeTimeoutMs: 300_000,
  });
  // Registered before any browser work so the shared lifecycle closes the
  // transport before the workspace and fixture resources unwind.
  context.lifecycle.register(new Task105L08DispatchResource(dispatcher));
  const coordinator = new Task105L08Coordinator(dispatcher, session);
  await dispatcher.loadStorageState(input.workspace.storageStatePath);
  requireFlag(await coordinator.run("install_observer", instrumentSource), "installed");

  const observers = new Map<Task105L08ScenarioId, Task105L08VisibleFact[]>();
  let consoleTotal = 0;
  let pageTotal = 0;

  const drain = async (): Promise<void> => {
    const output = inspectResult(
      await coordinator.run(
        "drain_counts",
        `return await page.evaluate(() => {
          const scope = window;
          const counts = scope.__L08_COUNTS ?? null;
          if (counts === null) throw new Error("task105_l08_observer_absent");
          scope.__L08_COUNTS = { consoleErrors: 0, pageErrors: 0 };
          return { consoleErrors: counts.consoleErrors, pageErrors: counts.pageErrors };
        });`
      ),
      "drain counts"
    );
    const consoleErrors = Number(output.consoleErrors);
    const pageErrors = Number(output.pageErrors);
    if (
      !Number.isSafeInteger(consoleErrors) ||
      consoleErrors < 0 ||
      !Number.isSafeInteger(pageErrors) ||
      pageErrors < 0
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-105 L08 error counts are invalid");
    }
    consoleTotal += consoleErrors;
    pageTotal += pageErrors;
  };

  const run = async (actionId: string, body: string): Promise<PlainJsonValue> => {
    await drain();
    const output = await coordinator.run(actionId, body);
    await drain();
    return output;
  };

  const setViewport = async (width: number, height: number): Promise<void> => {
    await coordinator.run(
      "set_viewport",
      `await page.setViewportSize({ width: ${width}, height: ${height} }); return null;`
    );
  };

  const setAdminColorMode = async (mode: "light" | "dark"): Promise<void> => {
    const result = inspectResult(
      await run(
        "set_admin_color_mode",
        `const toggle = page.getByRole("button", { name: "Toggle dark mode", exact: true });
         const isDark = (await toggle.getAttribute("aria-pressed")) === "true";
         if (isDark !== ${mode === "dark"}) await toggle.click({ timeout: ${TIMEOUT} });
         await page.waitForFunction((expected) => document.documentElement.classList.contains("dark") === expected, ${mode === "dark"}, { timeout: ${TIMEOUT} });
         const actual = await page.evaluate(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
         return { actual };`
      ),
      "admin color mode"
    );
    if (result.actual !== mode) {
      throw new SmokeError("smoke_output_invalid", "TASK-105 L08 admin color mode is invalid");
    }
  };

  const begin = async (scenarioId: Task105L08ScenarioId): Promise<void> => {
    if (observers.has(scenarioId)) {
      throw new SmokeError("smoke_output_invalid", "TASK-105 L08 scenario ran twice");
    }
    observers.set(scenarioId, []);
    await setViewport(VIEWPORT.width, VIEWPORT.height);
  };

  const screenshot = async (ordinal: number, path: string): Promise<void> => {
    await setViewport(VIEWPORT.width, VIEWPORT.height);
    await coordinator.run(
      "screenshot",
      `await page.screenshot({ path: ${JSON.stringify(path)}, fullPage: false, animations: "disabled" }); return null;`
    );
    void ordinal;
  };

  /** Records one contracted fact; the driver must already have proven it. */
  const record = async (
    scenarioId: Task105L08ScenarioId,
    actionId: string,
    contract: Task105L08FactContract,
    body: string
  ): Promise<void> => {
    const output = inspectResult(await run(actionId, body), "visible assertion");
    const actual = output.actual;
    if (
      typeof actual !== "string" ||
      !contract.pattern.test(actual) ||
      (contract.expected !== null && actual !== contract.expected)
    ) {
      throw new SmokeError(
        "smoke_output_invalid",
        `TASK-105 L08 visible assertion ${contract.target} failed`
      );
    }
    const facts = observers.get(scenarioId);
    if (facts === undefined || facts.some((fact) => fact.target === contract.target)) {
      throw new SmokeError("smoke_output_invalid", "TASK-105 L08 fact order is invalid");
    }
    facts.push(
      Object.freeze({
        kind: contract.kind,
        target: contract.target,
        property: contract.property,
        expected: actual,
        actual,
        pass: true,
      })
    );
  };

  const runScenarios = async (): Promise<void> => {
    // The proof runs concurrently with driver wiring, so its rejection is
    // captured instead of left orphaned; the gate still blocks scenarios here.
    const routeProofFailure = await input.routesProven;
    if (routeProofFailure !== undefined) throw routeProofFailure;
    const facts = input.facts;
    const admin = (path: string): string => task105L08AdminUrl(adminBase, path);
    const candidate = (ordinal: number, scenarioId: Task105L08ScenarioId): string =>
      resolve(
        input.workspace.screenshotCandidateRoot,
        `${context.input.profile}-${session}-${String(ordinal).padStart(2, "0")}-${scenarioId}.png`
      );

    // ── Scenario 1: page editor deep insert + Layers active state ─────
    const s1 = requireTask105L08Descriptor("page-deep-section-insert-visible-layer").id;
    await begin(s1);
    await coordinator.run(
      "s1_open_editor",
      `// Dirty editors arm beforeunload (AdminDirtyNavigationGuard.tsx:60-65 via
       // PageEditorToolbar.tsx:754); the daemon abandons the in-flight run-code
       // response when a dialog fires, so consume any accidental dialog.
       page.once("dialog", (dialog) => dialog.accept());
       await page.goto(${JSON.stringify(admin(`/pages/${facts.content.insertPage.id}`))}, { waitUntil: "load", timeout: 60000 });
       await page.locator('[data-page-editor-canvas-frame="true"]').waitFor({ state: "visible", timeout: ${OPEN_TIMEOUT} });
       return null;`
    );
    // Color mode is set after the opener because the toggle lives in the admin
    // TopBar, which only exists on a loaded admin page (never on about:blank).
    await setAdminColorMode("dark");
    await run(
      "s1_open_layers_and_select",
      `await page.getByRole("button", { name: "Layers", exact: true }).click({ timeout: ${TIMEOUT} });
       await page.locator('[data-page-editor-layers-panel="true"]').waitFor({ state: "visible", timeout: ${TIMEOUT} });
       await page.locator("[data-page-editor-layer-block-id]").first().click({ timeout: ${TIMEOUT} });
       return null;`
    );
    await run(
      "s1_insert_container_beside",
      `await page.locator('[data-page-editor-layers-panel="true"]').getByRole("button", { name: "Add block beside" }).click({ timeout: ${TIMEOUT} });
       const palette = page.getByRole("dialog", { name: "Command palette" });
       await palette.getByRole("textbox", { name: "Search sections and blocks" }).fill("Container");
       await palette.getByRole("button", { name: /^Container/ }).first().click({ timeout: ${TIMEOUT} });
       await page.waitForFunction(() => document.querySelectorAll("[data-page-editor-block-id]").length >= 2, undefined, { timeout: ${TIMEOUT} });
       return null;`
    );
    await run(
      "s1_insert_nested_block",
      `await page.locator('[data-page-editor-layers-panel="true"]').getByRole("button", { name: /^Add block to / }).last().click({ timeout: ${TIMEOUT} });
       const palette = page.getByRole("dialog", { name: "Command palette" });
       await palette.getByRole("textbox", { name: "Search sections and blocks" }).fill("Text");
       await palette.getByRole("button", { name: /^Text/ }).first().click({ timeout: ${TIMEOUT} });
       await page.waitForFunction(() => {
         return Array.from(document.querySelectorAll("[data-page-editor-block-depth]")).some(
           (node) => node.getAttribute("data-page-editor-block-depth") === "2"
         );
       }, undefined, { timeout: ${TIMEOUT} });
       return null;`
    );
    await record(
      s1,
      "s1_assert_active_layer",
      task105L08FactsFor(s1)[0] as Task105L08FactContract,
      `const actual = await page.evaluate(() => {
         const row = Array.from(document.querySelectorAll("[data-page-editor-layer-block-id]")).at(-1);
         return row !== undefined && typeof row.className === "string" && row.className.includes("bg-primary/10") ? "true" : "false";
       });
       if (actual !== "true") throw new Error("task105_l08_active_layer_missing");
       return { actual };`
    );
    await record(
      s1,
      "s1_assert_bounded_geometry",
      task105L08FactsFor(s1)[1] as Task105L08FactContract,
      `const actual = await page.evaluate(() => {
         const frame = Array.from(document.querySelectorAll("[data-page-editor-block-id]")).at(-1);
         if (frame === undefined) return "false";
         const rect = frame.getBoundingClientRect();
         const bounded = rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0 &&
           rect.right <= window.innerWidth && rect.bottom <= window.innerHeight + 1;
         return frame.getAttribute("data-selected") === "true" && bounded ? "true" : "false";
       });
       if (actual !== "true") throw new Error("task105_l08_bounded_geometry_missing");
       return { actual };`
    );
    // Never navigate away dirty: s1's insert arms the editor's beforeunload
    // guard, and s2 opens a different editor page. Saving s1's draft disarms
    // the guard (L05's scenarios save before navigating away for the same
    // reason); insertPage is scenario-local, so s2's assertions are unaffected.
    await coordinator.run(
      "s1_save_draft",
      `await page.getByRole("button", { name: "Save draft" }).click({ timeout: ${TIMEOUT} });
       await page.getByText("Draft saved.", { timeout: ${TIMEOUT} }).waitFor({ state: "visible" });
       return null;`
    );
    await screenshot(1, candidate(1, s1));
    await drain();

    // ── Scenario 2: device override, reset, publish, front parity ─────
    const s2 = requireTask105L08Descriptor("page-device-override-reset-publish-front-parity").id;
    await begin(s2);
    await coordinator.run(
      "s2_open_editor",
      `// Dirty editors arm beforeunload (AdminDirtyNavigationGuard.tsx:60-65 via
       // PageEditorToolbar.tsx:754); the daemon abandons the in-flight run-code
       // response when a dialog fires, so consume any accidental dialog.
       page.once("dialog", (dialog) => dialog.accept());
       await page.goto(${JSON.stringify(admin(`/pages/${facts.content.parityPage.id}`))}, { waitUntil: "load", timeout: 60000 });
       await page.locator('[data-page-editor-canvas-frame="true"]').waitFor({ state: "visible", timeout: ${OPEN_TIMEOUT} });
       await page.locator("[data-page-editor-block-id]").first().click({ timeout: ${TIMEOUT} });
       await page.getByRole("button", { name: "Typography panel" }).click({ timeout: ${TIMEOUT} });
       await page.getByRole("group", { name: "Font size" }).waitFor({ state: "visible", timeout: ${TIMEOUT} });
       return null;`
    );
    // Color mode is set after the opener because the toggle lives in the admin
    // TopBar, which only exists on a loaded admin page (never on about:blank).
    await setAdminColorMode("light");
    await run(
      "s2_override_then_reset",
      `// Typography paints inline on the heading element (pageStaticBlockRenderers.tsx:664-666), not the data-page-block wrapper (pageRendererV2.tsx:670) — measure the element.
       const heading = page.locator('[data-page-editor-canvas-frame="true"] [data-page-block="heading"] :is(h1,h2,h3,h4,h5,h6)').first();
       await heading.waitFor({ state: "visible", timeout: ${TIMEOUT} });
       const desktop = await heading.evaluate((node) => getComputedStyle(node).fontSize);
       // The fixture h2 bakes text-4xl (36px), which equals token "4xl", so the desktop override uses "sm" (14px) for a visible delta.
       await page.locator('[data-page-editor-segmented-option="sm"]').click({ timeout: ${TIMEOUT} });
       const desktopOverride = await heading.evaluate((node) => getComputedStyle(node).fontSize);
       await page.getByRole("button", { name: "Mobile", exact: true }).click({ timeout: ${TIMEOUT} });
       await page.locator('[data-page-editor-editing-scope="mobile"]').waitFor({ state: "visible", timeout: ${TIMEOUT} });
       await page.getByRole("group", { name: "Font size" }).waitFor({ state: "visible", timeout: ${TIMEOUT} });
       await page.locator('[data-page-editor-segmented-option="2xs"]').click({ timeout: ${TIMEOUT} });
       await page.locator('[data-page-editor-responsive-field="override"]').first().waitFor({ state: "visible", timeout: ${TIMEOUT} });
       const mobileOverride = await heading.evaluate((node) => getComputedStyle(node).fontSize);
       if (mobileOverride === desktopOverride) throw new Error("task105_l08_mobile_override_invisible");
       await page.locator('[aria-label="Reset Font size to inherited"]').click({ timeout: ${TIMEOUT} });
       await page.locator('[data-page-editor-responsive-field="inherited"]').first().waitFor({ state: "visible", timeout: ${TIMEOUT} });
       const mobileReset = await heading.evaluate((node) => getComputedStyle(node).fontSize);
       if (mobileReset !== desktopOverride) throw new Error("task105_l08_mobile_reset_invisible");
       if (desktop === desktopOverride) throw new Error("task105_l08_desktop_override_invisible");
       await page.getByRole("button", { name: "Publish", exact: true }).click({ timeout: ${TIMEOUT} });
       await page.getByText("Page published.", { exact: true }).waitFor({ state: "visible", timeout: ${TIMEOUT} });
       await page.getByRole("button", { name: "Desktop", exact: true }).click({ timeout: ${TIMEOUT} });
       return { desktop, desktopOverride, mobileOverride, mobileReset };`
    );
    await coordinator.run(
      "s2_open_front",
      `// Dirty editors arm beforeunload (AdminDirtyNavigationGuard.tsx:60-65 via
       // PageEditorToolbar.tsx:754); the daemon abandons the in-flight run-code
       // response when a dialog fires, so consume any accidental dialog.
       page.once("dialog", (dialog) => dialog.accept());
       await page.goto(${JSON.stringify(task105L08PublicUrl(facts.content.parityPage.slug))}, { waitUntil: "load", timeout: 60000 });
       await page.locator('main[data-page-v2="true"]').waitFor({ state: "visible", timeout: ${TIMEOUT} });
       return null;`
    );
    await record(
      s2,
      "s2_assert_front_parity",
      task105L08FactsFor(s2)[0] as Task105L08FactContract,
      `// Typography paints inline on the heading element (pageStaticBlockRenderers.tsx:664-666), not the data-page-block wrapper (pageRendererV2.tsx:670) — measure the element.
       const heading = page.locator('main[data-page-v2="true"] [data-page-block="heading"] :is(h1,h2,h3,h4,h5,h6)').first();
       await heading.waitFor({ state: "visible", timeout: ${TIMEOUT} });
       const desktop = await heading.evaluate((node) => getComputedStyle(node).fontSize);
       await page.setViewportSize({ width: 390, height: 844 });
       await page.waitForFunction(() => window.innerWidth === 390, undefined, { timeout: ${TIMEOUT} });
       const mobile = await heading.evaluate((node) => getComputedStyle(node).fontSize);
       if (desktop !== mobile) throw new Error("task105_l08_front_override_survived");
       await page.setViewportSize({ width: ${VIEWPORT.width}, height: ${VIEWPORT.height} });
       await page.waitForFunction(() => window.innerWidth === ${VIEWPORT.width}, undefined, { timeout: ${TIMEOUT} });
       return { actual: mobile };`
    );
    await screenshot(2, candidate(2, s2));
    await drain();

    // ── Scenario 3: block post Inspector edit, publish, front parity ──
    const s3 = requireTask105L08Descriptor("post-block-inspector-save-publish-front-parity").id;
    await begin(s3);
    const blockMarker = `${session} inspector parity`;
    await coordinator.run(
      "s3_open_block_editor",
      `// Dirty editors arm beforeunload (AdminDirtyNavigationGuard.tsx:60-65 via
       // PageEditorToolbar.tsx:754); the daemon abandons the in-flight run-code
       // response when a dialog fires, so consume any accidental dialog.
       page.once("dialog", (dialog) => dialog.accept());
       // ?editor=blocks pins the editor mode query-first (PostEditorPage.tsx:22-30) — the shared dev DB may carry posts.editor.mode residue.
       await page.goto(${JSON.stringify(admin(`/posts/${facts.content.blockPost.id}`) + "?editor=blocks")}, { waitUntil: "load", timeout: 60000 });
       await page.locator('[data-post-editor-canvas="article"]').waitFor({ state: "visible", timeout: ${OPEN_TIMEOUT} });
       if ((await page.locator("[data-post-editor-block-id]").count()) === 0) {
         await page.getByRole("button", { name: "Add section", exact: true }).click({ timeout: ${TIMEOUT} });
       }
       await page.locator("[data-post-editor-block-id]").first().click({ timeout: ${TIMEOUT} });
       const editable = page.locator('[data-post-editor-primary-editable="true"]').first();
       await editable.waitFor({ state: "visible", timeout: ${TIMEOUT} });
       await editable.click({ timeout: ${TIMEOUT} });
       await page.keyboard.press("ControlOrMeta+a");
       await editable.pressSequentially(${JSON.stringify(blockMarker)}, { timeout: ${TIMEOUT} });
       return null;`
    );
    // Color mode is set after the opener because the toggle lives in the admin
    // TopBar, which only exists on a loaded admin page (never on about:blank).
    await setAdminColorMode("light");
    await run(
      "s3_inspector_block_tab",
      `await page.locator('[data-post-editor-details-tab-trigger="block"]').click({ timeout: ${TIMEOUT} });
       await page.locator('[data-post-editor-details-tab="block"]').waitFor({ state: "visible", timeout: ${TIMEOUT} });
       return null;`
    );
    await run(
      "s3_save_and_publish",
      `await page.getByRole("button", { name: "Save draft" }).click({ timeout: ${TIMEOUT} });
       await page.getByRole("button", { name: "Publish post" }).click({ timeout: ${TIMEOUT} });
       await page.getByText("Post published", { exact: false }).first().waitFor({ state: "visible", timeout: ${TIMEOUT} });
       return null;`
    );
    await coordinator.run(
      "s3_open_front_article",
      `// Dirty editors arm beforeunload (AdminDirtyNavigationGuard.tsx:60-65 via
       // PageEditorToolbar.tsx:754); the daemon abandons the in-flight run-code
       // response when a dialog fires, so consume any accidental dialog.
       page.once("dialog", (dialog) => dialog.accept());
       await page.goto(${JSON.stringify(task105L08PublicUrl(`${facts.contentListPath}/${facts.content.blockPost.slug}`))}, { waitUntil: "load", timeout: 60000 });
       await page.locator("main").waitFor({ state: "visible", timeout: ${TIMEOUT} });
       return null;`
    );
    await record(
      s3,
      "s3_assert_front_block_text",
      task105L08FactsFor(s3)[0] as Task105L08FactContract,
      `const actual = await page.evaluate((marker) => {
         const main = document.querySelector("main");
         return main !== null && main.textContent !== null && main.textContent.includes(marker) ? "true" : "false";
       }, ${JSON.stringify(blockMarker)});
       if (actual !== "true") throw new Error("task105_l08_front_block_text_missing");
       return { actual };`
    );
    await screenshot(3, candidate(3, s3));
    await drain();

    // ── Scenario 4: classic post edit and preview focus survival ──────
    const s4 = requireTask105L08Descriptor("post-classic-edit-preview-focus-visible").id;
    await begin(s4);
    const classicMarker = `${session} classic preview`;
    await coordinator.run(
      "s4_open_classic_editor",
      `// Dirty editors arm beforeunload (AdminDirtyNavigationGuard.tsx:60-65 via
       // PageEditorToolbar.tsx:754); the daemon abandons the in-flight run-code
       // response when a dialog fires, so consume any accidental dialog.
       page.once("dialog", (dialog) => dialog.accept());
       await page.goto(${JSON.stringify(admin(`/posts/${facts.content.classicPost.id}?editor=classic`))}, { waitUntil: "load", timeout: 60000 });
       await page.getByText("Classic editor", { exact: true }).waitFor({ state: "visible", timeout: ${OPEN_TIMEOUT} });
       return null;`
    );
    // Color mode is set after the opener because the toggle lives in the admin
    // TopBar, which only exists on a loaded admin page (never on about:blank).
    await setAdminColorMode("dark");
    await run(
      "s4_edit_preview_close",
      `const content = page.getByPlaceholder("Write your post body here.");
       await content.click({ timeout: ${TIMEOUT} });
       await content.fill(${JSON.stringify(classicMarker)});
       await page.getByRole("button", { name: "Runtime preview", exact: true }).click({ timeout: ${TIMEOUT} });
       const dialog = page.getByRole("dialog", { name: "Post Preview" });
       await dialog.waitFor({ state: "visible", timeout: ${TIMEOUT} });
       await page.locator('iframe[title="Post runtime preview"]').waitFor({ state: "attached", timeout: ${TIMEOUT} });
       // previewPost resolves asynchronously; the shell keeps the trigger
       // focusable and flags the round-trip with aria-busy (focus must survive
       // the whole preview cycle) — wait for the round-trip to finish before
       // closing so the dialog closes in the steady state a real user reaches.
       await page.waitForFunction(() => {
         const button = Array.from(document.querySelectorAll("button")).find(
           (el) => el.textContent?.trim() === "Runtime preview"
         );
         return button instanceof HTMLButtonElement && button.getAttribute("aria-busy") !== "true";
       }, undefined, { timeout: ${TIMEOUT} });
       await page.getByRole("button", { name: "Close preview" }).click({ timeout: ${TIMEOUT} });
       await dialog.waitFor({ state: "hidden", timeout: ${TIMEOUT} });
       return null;`
    );
    await record(
      s4,
      "s4_assert_focus_survived",
      task105L08FactsFor(s4)[0] as Task105L08FactContract,
      `const outcome = await page.evaluate((marker) => {
         const content = document.querySelector('textarea[placeholder="Write your post body here."]');
         const active = document.activeElement;
         const focusHeld = active instanceof HTMLElement && active.isConnected && active !== document.body;
         const retained = content !== null && content.value === marker;
         return { actual: focusHeld && retained ? "true" : "false" };
       }, ${JSON.stringify(classicMarker)});
       if (outcome.actual !== "true") throw new Error("task105_l08_preview_focus_missing");
       return outcome;`
    );
    await screenshot(4, candidate(4, s4));
    await drain();

    // ── Scenario 5: rich-text command + slash rerender transition ─────
    const s5 = requireTask105L08Descriptor("post-richtext-command-slash-transition-visible").id;
    await begin(s5);
    await coordinator.run(
      "s5_open_richtext_editor",
      `// Dirty editors arm beforeunload (AdminDirtyNavigationGuard.tsx:60-65 via
       // PageEditorToolbar.tsx:754); the daemon abandons the in-flight run-code
       // response when a dialog fires, so consume any accidental dialog.
       page.once("dialog", (dialog) => dialog.accept());
       // ?editor=blocks pins the editor mode query-first (PostEditorPage.tsx:22-30) — the shared dev DB may carry posts.editor.mode residue.
       await page.goto(${JSON.stringify(admin(`/posts/${facts.content.richtextPost.id}`) + "?editor=blocks")}, { waitUntil: "load", timeout: 60000 });
       await page.locator('[data-post-editor-canvas="article"]').waitFor({ state: "visible", timeout: ${OPEN_TIMEOUT} });
       if ((await page.locator("[data-post-editor-block-id]").count()) === 0) {
         await page.getByRole("button", { name: "Add section", exact: true }).click({ timeout: ${TIMEOUT} });
       }
       await page.locator("[data-post-editor-block-id]").first().click({ timeout: ${TIMEOUT} });
       const editable = page.locator('[data-post-editor-primary-editable="true"]').first();
       await editable.waitFor({ state: "visible", timeout: ${TIMEOUT} });
       await editable.click({ timeout: ${TIMEOUT} });
       await page.keyboard.press("ControlOrMeta+a");
       await editable.pressSequentially("Slash transition", { timeout: ${TIMEOUT} });
       return null;`
    );
    // Color mode is set after the opener because the toggle lives in the admin
    // TopBar, which only exists on a loaded admin page (never on about:blank).
    await setAdminColorMode("light");
    await run(
      "s5_apply_bold",
      `// setAdminColorMode between the opener and this action steals focus from the
       // editable (r28-diag: activeElement was BUTTON at entry, selection empty,
       // and restoreSelectionRange brought back only the collapsed opener caret,
       // so bold hit a collapsed selection) — click back into the editable so the
       // select-all and the bold command target the editor's own text selection.
       const editable = page.locator('[data-post-editor-primary-editable="true"]').first();
       await editable.click({ timeout: ${TIMEOUT} });
       await page.keyboard.press("ControlOrMeta+a");
       await page.getByRole("button", { name: "Bold", exact: true }).click({ timeout: ${TIMEOUT} });
       await page.waitForFunction(() => document.querySelector(".post-editor-richtext")?.querySelector("strong,b") !== null, undefined, { timeout: ${TIMEOUT} });
       return null;`
    );
    await run(
      "s5_slash_transition",
      `const editable = page.locator(".post-editor-richtext").first();
       await editable.click({ timeout: ${TIMEOUT} });
       await page.keyboard.press("End");
       // The slash trigger requires "/" at text start or after whitespace
       // (postRichTextSlashState.ts SLASH_TRIGGER_PATTERN) — the editor text
       // ends with a word character, so the space is what opens the menu.
       await editable.pressSequentially(" /heading", { timeout: ${TIMEOUT} });
       const menuHeader = page.getByText("Slash command", { exact: true });
       await menuHeader.waitFor({ state: "visible", timeout: ${TIMEOUT} });
       const before = await page.locator("[data-post-editor-block-id]").count();
       // The menu anchors below the block, so with the block low in the 900px
       // viewport the Heading option sits below the fold (r32-diag: top 927,
       // hit-test none) and Playwright's actionability auto-scroll does not
       // rescue the click — center it explicitly, exactly what a user
       // scrolling to reach the menu does (r32-diag: top 455, hit-test own,
       // click green on the first try).
       const headingOption = page.getByRole("button", { name: "Heading Section heading (H1-H6) for document structure." });
       await headingOption.evaluate((node) => node.scrollIntoView({ block: "center" }));
       await headingOption.click({ timeout: ${TIMEOUT} });
       await menuHeader.waitFor({ state: "hidden", timeout: ${TIMEOUT} });
       await page.waitForFunction((previous) => document.querySelectorAll("[data-post-editor-block-id]").length > previous, before, { timeout: ${TIMEOUT} });
       return null;`
    );
    await record(
      s5,
      "s5_assert_rendered_state",
      task105L08FactsFor(s5)[0] as Task105L08FactContract,
      `const actual = await page.evaluate(() => {
         const rich = document.querySelector(".post-editor-richtext");
         const bolded = rich !== null && rich.querySelector("strong,b") !== null;
         const menuAbsent = document.body !== null && document.body.textContent !== null && !document.body.textContent.includes("Slash command");
         const inserted = document.querySelectorAll("[data-post-editor-block-id]").length >= 2;
         return bolded && menuAbsent && inserted ? "true" : "false";
       });
       if (actual !== "true") throw new Error("task105_l08_richtext_state_missing");
       return { actual };`
    );
    await screenshot(5, candidate(5, s5));
    await drain();
  };

  const receipt = (): Task105L08BrowserReceipt => {
    const scenarios = TASK105_L08_SCENARIOS.map((scenarioId) => {
      const recorded = observers.get(scenarioId);
      if (recorded === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-105 L08 scenario evidence is missing");
      }
      const descriptor = requireTask105L08Descriptor(scenarioId);
      const contracted = task105L08FactsFor(scenarioId);
      if (
        recorded.length !== contracted.length ||
        contracted.some((contract, index) => {
          const fact = recorded[index];
          return (
            fact === undefined ||
            fact.kind !== contract.kind ||
            fact.target !== contract.target ||
            fact.property !== contract.property
          );
        })
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-105 L08 fact order drifted");
      }
      const theme = descriptor.themes[0];
      if (theme === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-105 L08 descriptor theme is absent");
      }
      return Object.freeze({
        scenarioId,
        theme,
        surface: TASK_105_L08_SCENARIO_SURFACES[scenarioId],
        viewport: VIEWPORT,
        facts: Object.freeze([...recorded]),
      });
    });
    return validateTask105L08BrowserReceipt(
      Object.freeze({
        scenarioIds: Object.freeze([...TASK105_L08_SCENARIOS]),
        consoleErrorCount: consoleTotal,
        pageErrorCount: pageTotal,
        scenarios: Object.freeze(scenarios),
      })
    );
  };

  return Object.freeze({
    facts: input.facts,
    workspace: input.workspace,
    receipt,
    runScenarios,
  });
}

export { TASK_105_L08_SCENARIO_DESCRIPTORS };
