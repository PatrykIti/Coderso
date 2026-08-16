import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { createAdminAuthStorageState } from "../../browser/admin-auth";
import {
  compileBrowserDispatchPlan,
  splitMaterializedSegment,
} from "../../browser/segment-compiler";
import { materializedSourceBytes } from "../../browser/action-frames";
import type {
  BrowserDispatchPlan,
  BrowserPlanAction,
  BrowserRunCodeDispatch,
  BrowserFrameExpectation,
  MaterializedBrowserAction,
  MaterializedBrowserSegment,
} from "../../browser/contracts";
import { BrowserTransport } from "../../browser/transport";
import { PlaywrightCliDispatcher } from "../../browser/playwright-cli-dispatcher";
import type { WorkerPool } from "../../workers/pool";
import type { WorkerOperationDescriptor } from "../../workers/contracts";
import { validateTask491ScenarioObservation, type Task491ScenarioObservation } from "./assertions";
import { buildTask491BrowserInput, projectTask491AdminAuthEnvironment } from "./browser-input";
import type { Task491ScreenshotManifest } from "./output-manifest";
import type { Task491CheckpointOutput, Task491InstallOutput } from "./worker-operations";
import type { Task491ScenarioDescriptor } from "./descriptors";
import { TASK_491_DESCRIPTOR_SHA256 } from "./descriptors";

export interface Task491MaterializedBrowserPlan {
  readonly logical: BrowserDispatchPlan;
  readonly segments: readonly MaterializedBrowserSegment[];
  readonly manifestSha256: string;
}

export interface Task491BrowserRuntime {
  readonly dispatcher: PlaywrightCliDispatcher;
  readonly transport: BrowserTransport;
}

function task491BrowserActionSource(input: ReturnType<typeof buildTask491BrowserInput>): string {
  const literal = JSON.stringify(input)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
  return `async (page) => {
    const cfg = ${literal};
    const startedAt = Date.now();
    const observedValues = {};
    const observedLabels = {};
    const consoleErrors = [];
    const pageErrors = [];
    const failureCodes = [];
    let screenshotCaptured = false;
    const onConsole = (message) => {
      if (message.type() !== "error") return;
      const text = message.text().slice(0, 512);
      // The admin auth rate-limit bucket and the SPA's unauthenticated boot
      // check of /api/auth/me on the login page produce expected browser
      // resource errors; the scenario assertions still fail closed on the
      // API responses and visible-effect checks below.
      if (/Failed to load resource: the server responded with a status of 429/.test(text)) return;
      if (/Failed to load resource: the server responded with a status of 401/.test(text)) {
        const loc = message.location?.().url ?? "";
        if (loc === "" || loc.endsWith("/api/auth/me")) return;
      }
      // The admin assistant launcher renders a settings-provided avatar; the
      // sandbox cannot resolve the placeholder cdn.example.com host. That
      // asset is not part of the integrations contract, so its expected load
      // failure is treated as fixture noise like the auth bootstrap above.
      if (/Failed to load resource: net::ERR_NAME_NOT_RESOLVED/.test(text)) {
        const loc = message.location?.().url ?? "";
        if (loc.includes("cdn.example.com")) return;
      }
      // The public-ga-tag scenario deliberately aborts the gtag.js loader
      // (page.route) so the sandbox never reaches Google; the abort surfaces as
      // a resource error that is expected harness noise, like the auth-bootstrap
      // cases above.
      if (/Failed to load resource: net::ERR_FAILED/.test(text)) {
        const loc = message.location?.().url ?? "";
        if (loc.includes("googletagmanager.com")) return;
      }
      consoleErrors.push("console-error");
    };
    const onPageError = () => pageErrors.push("page-error");
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    // The admin SPA declares no favicon, so Chromium probes /favicon.ico on
    // every boot and the dev server 404s it; fulfill it in-browser so the
    // console stays clean and the suite does not depend on dev-server state.
    page.route("**/favicon.ico", (route) => {
      route.fulfill({ status: 204, contentType: "image/x-icon", body: "" }).catch(() => undefined);
    }).catch(() => undefined);
    const check = (condition, code) => { if (!condition) failureCodes.push(code); return condition; };
    const record = (id, value, label) => {
      observedValues[id] = value;
      observedLabels[id] = typeof label === "string" ? label : String(label);
    };
    const captureScreenshot = async () => {
      await page.screenshot({ path: cfg.absoluteScreenshotPath, fullPage: false, animations: "disabled" });
      screenshotCaptured = true;
    };
    const visible = async (locator) => locator.count().then((count) => count > 0 && locator.first().isVisible()).catch(() => false);
    const rect = async (locator) => { const box = await locator.first().boundingBox().catch(() => null); return box ? { width: Math.round(box.width), height: Math.round(box.height), x: Math.round(box.x), y: Math.round(box.y) } : null; };
    const goto = async (url) => {
      // The descriptor declares the variant viewport and the screenshot
      // manifest pins its dimensions, so size the page before navigating
      // (Playwright's default is 1280x720).
      await page.setViewportSize(cfg.viewport).catch(() => undefined);
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      return response ? response.status() : 0;
    };
    const bodyLuminance = async () => page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const parse = (value) => {
        if (!context || !value || value === "transparent" || value === "rgba(0, 0, 0, 0)") return null;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
        if (alpha === 0) return null;
        return { red, green, blue };
      };
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
      };
      let node = document.body;
      let color = null;
      while (node && color === null) {
        color = parse(getComputedStyle(node).backgroundColor);
        node = node.parentElement;
      }
      if (color === null) return -1;
      const luminance = 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue);
      return Math.round(luminance * 10000) / 10000;
    });
    const cardState = async (name) => {
      const card = page.locator('[data-slot="card"]').filter({ hasText: name }).first();
      if (!(await visible(card))) return null;
      const badges = await card.locator('[data-slot="badge"]').allTextContents();
      const button = await card.locator("button").first().innerText().catch(() => "");
      return { status: (badges[0] || "").trim(), health: (badges[1] || "").trim(), button: button.trim() };
    };
    // The Integrations page renders its heading before the async
    // listIntegrations() fetch resolves, so a card read right after the
    // heading wait can race the list render. Wait for the card to be visible
    // first; a timeout surfaces as task491-action-timeout instead of a
    // material "missing" assertion.
    const waitForCard = async (name) => {
      await page.locator('[data-slot="card"]').filter({ hasText: name }).first().waitFor({ state: "visible", timeout: 15000 });
    };
    const cardButton = (name) => page.locator('[data-slot="card"]').filter({ hasText: name }).first().locator("button").first();
    const openCardDrawer = async (name) => {
      await cardButton(name).click();
      await page.locator('[data-slot="sheet-content"]').waitFor({ state: "visible", timeout: 15000 });
    };
    const closeDrawer = async () => {
      await page.keyboard.press("Escape");
      await page.locator('[data-slot="sheet-content"]').waitFor({ state: "hidden", timeout: 10000 });
    };
    // The drawer renders the health label as a bare text node next to a dot
    // span (IntegrationDrawer.tsx), so a span-only scan never sees it. Scan
    // text nodes so "Not checked"/"Healthy"/"Issue" resolve regardless of the
    // wrapping element. The walker must live inside the evaluate callback:
    // Playwright serializes only the callback, so any Node-scope reference
    // would throw ReferenceError in the browser context.
    const drawerHealthLabels = () => page.locator('[data-slot="sheet-content"]').evaluate((sheet) => {
      const labels = [];
      const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        const text = (current.textContent || "").trim();
        if (text === "Not checked" || text === "Healthy" || text === "Issue") {
          labels.push(text);
        }
        current = walker.nextNode();
      }
      return labels;
    });
    const drawerHealthLabel = async () => (await drawerHealthLabels())[0] || null;
    const waitForDrawerHealth = async (label) => page.waitForFunction((expected) => {
      const sheet = document.querySelector('[data-slot="sheet-content"]');
      if (!sheet) return false;
      const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        if ((current.textContent || "").trim() === expected) return true;
        current = walker.nextNode();
      }
      return false;
    }, label, { timeout: 30000 });
    const sheetText = async () => page.locator('[data-slot="sheet-content"]').innerText();
    const drawerWidth = async () => { const box = await rect(page.locator('[data-slot="sheet-content"]')); return box ? box.width : 0; };
    const waitIntegrationsHeading = async () => page.getByRole("heading", { name: "Integrations", exact: true }).waitFor({ state: "visible", timeout: 60000 });
    try {
      if (cfg.scenarioId === "admin-login") {
        await page.context().clearCookies();
        await goto(cfg.adminBase + "/login");
        await page.locator("#email").waitFor({ state: "visible", timeout: 90000 });
        await page.locator("#password").waitFor({ state: "visible", timeout: 10000 });
        await page.locator("#email").fill(cfg.email);
        await page.locator("#password").fill(cfg.password);
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await page.locator("[data-app-scroll]").waitFor({ state: "visible", timeout: 30000 });
        await goto(cfg.physicalUrl);
        await waitIntegrationsHeading();
        const emailCount = await page.locator("#email").count();
        const headingVisible = await visible(page.getByRole("heading", { name: "Integrations", exact: true }));
        const shellVisible = await visible(page.locator("[data-app-scroll]"));
        const luminance = await bodyLuminance();
        record("login-form-absent", emailCount, String(emailCount));
        record("integrations-heading", headingVisible, String(headingVisible));
        record("app-shell-scroll", shellVisible, String(shellVisible));
        record("theme-light-background", luminance, luminance.toFixed(4));
        await captureScreenshot();
      } else if (cfg.scenarioId === "connect-ga-drawer") {
        await goto(cfg.physicalUrl);
        await waitIntegrationsHeading();
        await waitForCard("Google Analytics");
        const before = await cardState("Google Analytics");
        record("ga-card-before", before ? before.status : null, before ? before.status : "missing");
        await openCardDrawer("Google Analytics");
        record("drawer-opened", await drawerWidth(), String(await drawerWidth()));
        const fieldVisible = await visible(page.locator('[data-slot="sheet-content"]').getByText("Measurement ID", { exact: true }));
        record("measurement-field-label", fieldVisible, String(fieldVisible));
        const input = page.locator('[data-slot="sheet-content"] input[type="text"]').first();
        await input.waitFor({ state: "visible", timeout: 10000 });
        await input.fill(cfg.fixture.measurementId);
        const responsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/admin/api/settings/integrations/" + cfg.fixture.gaId), { timeout: 20000 });
        await page.getByRole("button", { name: "Save Changes", exact: true }).click();
        const response = await responsePromise;
        record("patch-status", response.status(), String(response.status()));
        check(response.status() === 200, "task491-ga-patch-not-ok");
        await page.locator('[data-slot="sheet-content"]').waitFor({ state: "hidden", timeout: 15000 });
        const after = await cardState("Google Analytics");
        record("ga-card-after", after ? after.status : null, after ? after.status : "missing");
        record("ga-health-after", after ? after.health : null, after ? after.health : "missing");
        await captureScreenshot();
      } else if (cfg.scenarioId === "health-states") {
        await goto(cfg.physicalUrl);
        await waitIntegrationsHeading();
        await waitForCard("Google Analytics");
        await waitForCard("Sentry");
        const gaBefore = await cardState("Google Analytics");
        const sentryBefore = await cardState("Sentry");
        record("ga-card-health-before", gaBefore ? gaBefore.health : null, gaBefore ? gaBefore.health : "missing");
        record("sentry-card-health-before", sentryBefore ? sentryBefore.health : null, sentryBefore ? sentryBefore.health : "missing");
        check(gaBefore !== null && gaBefore.health === "Not checked", "task491-ga-card-health-state");
        check(sentryBefore !== null && sentryBefore.health === "Not checked", "task491-sentry-card-health-state");
        await openCardDrawer("Google Analytics");
        record("ga-drawer-health-before", await drawerHealthLabel(), (await drawerHealthLabel()) || "missing");
        await page.getByRole("button", { name: "Test connection", exact: true }).click();
        await waitForDrawerHealth("Healthy");
        record("ga-drawer-health-after", await drawerHealthLabel(), (await drawerHealthLabel()) || "missing");
        const gaSheet = await sheetText();
        record("ga-drawer-last-checked", gaSheet.includes("Last checked:"), String(gaSheet.includes("Last checked:")));
        await captureScreenshot();
        await closeDrawer();
        await openCardDrawer("Sentry");
        record("sentry-drawer-health-before", await drawerHealthLabel(), (await drawerHealthLabel()) || "missing");
        await page.getByRole("button", { name: "Test connection", exact: true }).click();
        await waitForDrawerHealth("Issue");
        record("sentry-drawer-health-after", await drawerHealthLabel(), (await drawerHealthLabel()) || "missing");
        const sentrySheet = await sheetText();
        const dsnInvalid = sentrySheet.includes("dsn_invalid");
        record("sentry-drawer-last-error", dsnInvalid ? "dsn_invalid" : null, dsnInvalid ? "dsn_invalid" : "missing");
        check(dsnInvalid, "task491-sentry-dsn-error-absent");
        await closeDrawer();
        record("drawer-closed", await page.locator('[data-slot="sheet-content"]:visible').count(), String(await page.locator('[data-slot="sheet-content"]:visible').count()));
      } else if (cfg.scenarioId === "public-ga-tag") {
        await page.route("**/*googletagmanager.com/**", (route) => route.abort());
        await goto(cfg.physicalUrl);
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
        await page.waitForFunction(() => Array.isArray(window.dataLayer), { timeout: 15000 });
        const headState = await page.evaluate(() => {
          const head = document.head;
          const scriptCount = head.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length;
          const inlineConfig = [...head.querySelectorAll("script:not([src])")].filter((node) => (node.textContent || "").includes("gtag('config','G-WF491SMOKE')")).length;
          const dataLayerConfig = Array.isArray(window.dataLayer) && window.dataLayer.some((entry) => entry !== null && typeof entry === "object" && entry[0] === "config" && entry[1] === "G-WF491SMOKE");
          const h1 = [...document.querySelectorAll("h1")].some((node) => {
            const box = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
          });
          return { scriptCount, inlineConfig, dataLayerConfig, h1 };
        });
        record("head-gtag-script", headState.scriptCount, String(headState.scriptCount));
        record("inline-config-script", headState.inlineConfig, String(headState.inlineConfig));
        record("data-layer-config", headState.dataLayerConfig, String(headState.dataLayerConfig));
        record("public-page-rendered", headState.h1, String(headState.h1));
        check(headState.scriptCount === 1, "task491-public-head-script");
        check(headState.inlineConfig === 1, "task491-public-inline-config");
        check(headState.dataLayerConfig === true, "task491-public-datalayer");
        await captureScreenshot();
      } else if (cfg.scenarioId === "dark-parity") {
        await page.addInitScript(() => {
          try { localStorage.setItem("coderso-admin-color-mode", "dark"); } catch {}
          // The init script also runs on intermediate documents (about:blank /
          // redirects) where the root element may not exist yet; guard it so
          // those navigations never raise a pageerror.
          if (document.documentElement) {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
          }
        });
        await goto(cfg.physicalUrl);
        await waitIntegrationsHeading();
        await waitForCard("Google Analytics");
        const darkClass = await page.evaluate(() => document.documentElement.classList.contains("dark"));
        const luminance = await bodyLuminance();
        record("html-dark-class", darkClass, String(darkClass));
        record("theme-dark-background", luminance, luminance.toFixed(4));
        check(darkClass === true, "task491-dark-class-absent");
        check(luminance >= 0 && luminance <= 0.15, "task491-dark-bg-not-dark");
        const ga = await cardState("Google Analytics");
        record("ga-card-dark-status", ga ? ga.status : null, ga ? ga.status : "missing");
        record("ga-card-dark-health", ga ? ga.health : null, ga ? ga.health : "missing");
        await openCardDrawer("Google Analytics");
        record("drawer-dark-opens", await drawerWidth(), String(await drawerWidth()));
        await captureScreenshot();
      } else {
        failureCodes.push("task491-unregistered-scenario");
      }
    } catch (error) {
      const message = typeof error?.message === "string" ? error.message : "";
      if (/Timeout|exceeded/u.test(message)) {
        failureCodes.push("task491-action-timeout");
      } else {
        failureCodes.push("task491-action-failed");
      }
    }
    if (!screenshotCaptured) {
      try { await captureScreenshot(); } catch {}
    }
    const assertions = cfg.assertions.map(({ id, kind, target, property }) => ({
      id,
      kind,
      target,
      property,
      observed: Object.prototype.hasOwnProperty.call(observedValues, id) ? observedValues[id] : null,
      observedLabel: Object.prototype.hasOwnProperty.call(observedLabels, id) ? observedLabels[id] : "missing",
    }));
    return {
      schemaVersion: 1,
      scenarioId: cfg.scenarioId,
      descriptorSha256: cfg.descriptorSha256,
      installedDigest: cfg.installedDigest,
      canonicalUrl: cfg.canonicalUrl,
      assertions,
      consoleErrors,
      pageErrors,
      failureCodes,
      screenshotPath: cfg.screenshotPath,
      elapsedMs: Date.now() - startedAt,
    };
  }`;
}

function logicalActions(
  descriptors: readonly Task491ScenarioDescriptor[]
): readonly BrowserPlanAction[] {
  return Object.freeze(
    descriptors.map((descriptor) =>
      Object.freeze({
        id: `task-491/${descriptor.id}`,
        scenarioId: descriptor.id,
        lane: "run-code" as const,
        captureOutputs: Object.freeze(["screenshot"]),
        isolated: true,
      })
    )
  );
}

export async function materializeTask491BrowserDispatchPlan(input: {
  readonly root: string;
  readonly descriptors: readonly Task491ScenarioDescriptor[];
  readonly manifest: Task491ScreenshotManifest;
  readonly fixture: Task491InstallOutput;
  readonly environment: NodeJS.ProcessEnv;
}): Promise<Task491MaterializedBrowserPlan> {
  const logical = compileBrowserDispatchPlan(logicalActions(input.descriptors));
  if (
    logical.dispatches.length !== 5 ||
    logical.dispatches.some(({ kind }) => kind !== "run-code")
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-491 logical browser plan drifted");
  }
  await mkdir(dirname(resolve(input.root, input.manifest.paths[0]!)), {
    recursive: true,
    mode: 0o755,
  });
  const credentials = projectTask491AdminAuthEnvironment(input.environment);
  const segments: MaterializedBrowserSegment[] = [];
  for (const [index, dispatch] of logical.dispatches.entries()) {
    const runCode = dispatch as BrowserRunCodeDispatch;
    const descriptor = input.descriptors[index];
    const screenshot = input.manifest.entries[index];
    if (descriptor === undefined || screenshot === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-491 browser materialization is partial");
    }
    const actions: readonly MaterializedBrowserAction[] = Object.freeze([
      Object.freeze({
        actionId: runCode.actionIds[0]!,
        source: task491BrowserActionSource(
          buildTask491BrowserInput({
            descriptor,
            evidenceScreenshotPath: screenshot.evidencePath,
            absoluteScreenshotPath: resolve(input.root, screenshot.path),
            fixture: input.fixture,
            email: credentials.CODERSO_PLAYWRIGHT_EMAIL,
            password: credentials.CODERSO_PLAYWRIGHT_PASSWORD,
          })
        ),
      }),
    ]);
    const partitions = splitMaterializedSegment(runCode, materializedSourceBytes(runCode, actions));
    for (const partition of partitions) {
      const selected = partition.actionIds.map((actionId) => {
        const action = actions.find((candidate) => candidate.actionId === actionId);
        if (action === undefined) {
          throw new SmokeError("smoke_output_invalid", "TASK-491 browser action is absent");
        }
        return action;
      });
      segments.push(Object.freeze({ segment: partition, actions: Object.freeze(selected) }));
    }
  }
  const manifestSha256 = createHash("sha256")
    .update(TASK_491_DESCRIPTOR_SHA256)
    .update("\0")
    .update(JSON.stringify(input.manifest))
    .update("\0")
    .update(segments.map(({ segment }) => segment.segmentId).join("\0"))
    .digest("hex");
  return Object.freeze({ logical, segments: Object.freeze(segments), manifestSha256 });
}

export function task491PhysicalSegmentIds(plan: Task491MaterializedBrowserPlan): readonly string[] {
  const ids = plan.segments.map(({ segment }) => segment.segmentId);
  if (ids.length !== 5 || new Set(ids).size !== ids.length) {
    throw new SmokeError("smoke_output_invalid", "TASK-491 physical browser plan drifted");
  }
  return Object.freeze(ids);
}

export async function createTask491BrowserRuntime(input: {
  readonly context: RuntimeSmokeContext;
  readonly workspace: string;
  readonly authStatePath: string;
  readonly plan: Task491MaterializedBrowserPlan;
  readonly authTimeoutMs: number;
  readonly dispatchTimeoutMs: number;
  readonly environment?: NodeJS.ProcessEnv;
  readonly onResourceRegistered?: (resource: BrowserTransport) => void;
}): Promise<Task491BrowserRuntime> {
  if (
    !Number.isSafeInteger(input.authTimeoutMs) ||
    input.authTimeoutMs <= 0 ||
    input.authTimeoutMs > 60_000
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-491 auth timeout is invalid");
  }
  if (
    !Number.isSafeInteger(input.dispatchTimeoutMs) ||
    input.dispatchTimeoutMs <= 0 ||
    input.dispatchTimeoutMs > 5 * 60_000
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-491 dispatch timeout is invalid");
  }
  const environment = input.environment ?? process.env;
  const dispatcher = new PlaywrightCliDispatcher({
    context: input.context,
    session: input.context.input.session,
    workspace: input.workspace,
    segments: task491PhysicalSegmentIds(input.plan),
    runCodeTimeoutMs: input.dispatchTimeoutMs,
    runtimeEnvironment: environment,
  });
  const transport = new BrowserTransport(input.context.input.session, dispatcher);
  input.context.lifecycle.register(transport);
  input.onResourceRegistered?.(transport);
  const auth = await createAdminAuthStorageState({
    adminUrl: "http://127.0.0.1:5173/admin",
    workspace: input.workspace,
    storageStatePath: input.authStatePath,
    environment: projectTask491AdminAuthEnvironment(environment),
    fetch: (request, init) =>
      globalThis.fetch(request, {
        ...init,
        signal: AbortSignal.timeout(input.authTimeoutMs),
      }),
  });
  if (!auth.authenticated) {
    throw new SmokeError("smoke_process_failed", "TASK-491 admin authentication failed");
  }
  await dispatcher.loadStorageState(input.authStatePath);
  return Object.freeze({ dispatcher, transport });
}

export async function executeTask491Segments(input: {
  readonly plan: Task491MaterializedBrowserPlan;
  readonly transport: BrowserTransport;
  readonly workers: WorkerPool;
  readonly checkpointDescriptor: WorkerOperationDescriptor;
  readonly descriptors: readonly Task491ScenarioDescriptor[];
  readonly manifest: Task491ScreenshotManifest;
  readonly installedDigest: string;
}): Promise<readonly Task491ScenarioObservation[]> {
  const observations: Task491ScenarioObservation[] = [];
  for (const [index, materialized] of input.plan.segments.entries()) {
    const expectation: BrowserFrameExpectation = Object.freeze({
      runId: input.plan.manifestSha256.slice(0, 32),
      manifestSha256: input.plan.manifestSha256,
      scenarioId: materialized.segment.scenarioId,
      segmentId: materialized.segment.segmentId,
      actionIds: materialized.segment.actionIds,
    });
    const frames = await input.transport.runSegment(materialized, expectation);
    if (frames.length !== 1 || frames[0]?.status !== "success") {
      throw new SmokeError("smoke_output_invalid", "TASK-491 browser scenario failed");
    }
    const scenarioId = materialized.segment.scenarioId;
    const checkpoint = (await input.workers.dispatch(
      input.checkpointDescriptor,
      Object.freeze({ scenarioId })
    )) as Task491CheckpointOutput;
    if (checkpoint.scenarioId !== scenarioId) {
      throw new SmokeError("smoke_output_invalid", "TASK-491 worker checkpoint drifted");
    }
    input.workers.recordDatabaseBatch(checkpoint.statements, checkpoint.rows);
    const observation = validateTask491ScenarioObservation({
      value: frames[0].output,
      descriptor: input.descriptors[index]!,
      manifest: input.manifest,
      installedDigest: input.installedDigest,
    });
    observations.push(observation);
  }
  if (
    observations.length !== 5 ||
    observations.some(
      (observation, index) =>
        observation.scenarioId !== input.plan.segments[index]?.segment.scenarioId
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-491 browser observation order drifted");
  }
  return Object.freeze(observations);
}
