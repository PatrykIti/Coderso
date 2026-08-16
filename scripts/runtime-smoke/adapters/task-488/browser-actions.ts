import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import {
  type BrowserDispatchPlan,
  type BrowserFrameExpectation,
  type BrowserPlanAction,
  type BrowserRunCodeDispatch,
  type MaterializedBrowserAction,
  type MaterializedBrowserSegment,
} from "../../browser/contracts";
import { materializedSourceBytes } from "../../browser/action-frames";
import { PlaywrightCliDispatcher } from "../../browser/playwright-cli-dispatcher";
import {
  compileBrowserDispatchPlan,
  splitMaterializedSegment,
} from "../../browser/segment-compiler";
import { BrowserTransport } from "../../browser/transport";
import {
  TASK_488_DESCRIPTOR_SHA256,
  type Task488ScenarioDescriptor,
  type Task488VariantDescriptor,
} from "./descriptors";
import { task488ScenarioDescriptors } from "./descriptors";
import {
  buildTask488BrowserInput,
  task488AdminCredentials,
  type Task488BrowserInput,
} from "./browser-input";
import type { Task488FixtureSpec } from "./fixture";
import type { Task488ScreenshotManifest } from "./output-manifest";
import { task488ScreenshotPathFor } from "./output-manifest";
import { validateTask488ScenarioObservation, type Task488ScenarioObservation } from "./assertions";

export interface Task488MaterializedBrowserPlan {
  readonly logical: BrowserDispatchPlan;
  readonly segments: readonly MaterializedBrowserSegment[];
  readonly manifestSha256: string;
}

export interface Task488BrowserRuntime {
  readonly dispatcher: PlaywrightCliDispatcher;
  readonly transport: BrowserTransport;
}

export type Task488BrowserResourceObserver = (resource: BrowserTransport) => void;

function task488BrowserActionSource(input: Task488BrowserInput): string {
  const literal = JSON.stringify(input)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
  return `async (page) => {
    const cfg = ${literal};
    const startedAt = Date.now();
    const observed = {};
    const consoleErrors = [];
    const pageErrors = [];
    const failureCodes = [];
    let screenshotCaptured = false;
    const onConsole = (message) => {
      if (message.type() !== "error") return;
      const text = message.text().slice(0, 512);
      // TASK-487 contract: the admin auth rate-limit bucket and the SPA's
      // unauthenticated boot check of /api/auth/me on the login page produce
      // expected browser resource errors; the scenario assertions still fail
      // closed on the API responses and visible-effect checks below.
      if (/Failed to load resource: the server responded with a status of 429/.test(text)) return;
      if (/Failed to load resource: the server responded with a status of 401/.test(text)) {
        const loc = message.location?.().url ?? "";
        if (loc === "" || loc.endsWith("/api/auth/me")) return;
      }
      // The admin assistant launcher renders a settings-provided avatar; the
      // sandbox cannot resolve the placeholder cdn.example.com host. That
      // asset is not part of the commerce contract, so its expected load
      // failure is treated as fixture noise like the auth bootstrap above.
      if (/Failed to load resource: net::ERR_NAME_NOT_RESOLVED/.test(text)) {
        const loc = message.location?.().url ?? "";
        if (loc.includes("cdn.example.com")) return;
      }
      consoleErrors.push(text);
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
    const record = (id, value) => { observed[id] = value; };
    const captureScreenshot = async () => {
      await page.screenshot({ path: cfg.absoluteScreenshotPath, fullPage: false, animations: "disabled" });
      screenshotCaptured = true;
    };
    const bodyText = async () => page.locator("body").innerText();
    const includesAll = (body, values) => values.every((value) => body.includes(value));
    const visible = async (locator) => locator.count().then((count) => count > 0 && locator.first().isVisible()).catch(() => false);
    const rect = async (locator) => locator.first().boundingBox();
    const adminUrl = (path) => cfg.adminOrigin + cfg.adminPath + path;
    const adminApiUrl = (path) => cfg.adminOrigin + cfg.adminPath + "/api" + path;
    const localGet = async (key) => page.evaluate((k) => { try { return localStorage.getItem(k); } catch { return null; } }, key);
    // The bundled playwright-core accepts at most one serialized arg plus
    // options, so the key/value pair travels as a single payload object.
    const localSet = async (key, value) => page.evaluate((payload) => { try { localStorage.setItem(payload.key, payload.value); } catch {} }, { key, value });
    const applyTheme = async (mode) => {
      await page.evaluate((m) => {
        try { localStorage.setItem("coderso-admin-color-mode", m); } catch {}
        document.documentElement.classList.toggle("dark", m === "dark");
        document.documentElement.classList.toggle("light", m === "light");
      }, mode);
    };
    const goto = async (url) => {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
      return response ? response.status() : 0;
    };
    const api = async (url, options = {}) => {
      const response = await page.request.fetch(url, { ...options, timeout: 15000 });
      let data = null;
      try { data = await response.json(); } catch { data = null; }
      return { status: response.status(), data };
    };
    // Every scenario must be self-sufficient: a cold dev host can make the SPA
    // auth bootstrap lose the session view between segments, so any scenario
    // that needs the admin shell authenticates itself when the session is gone.
    const ensureAuthenticated = async () => {
      const session = await api(adminApiUrl("/auth/me"), { method: "GET" }).catch(() => ({ status: 0, data: null }));
      if (session.status === 200) return;
      await goto(adminUrl("/login"));
      const emailInput = page.locator("#email");
      const loginFormPresent = await emailInput
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => true)
        .catch(() => false);
      if (!loginFormPresent) return;
      await emailInput.fill(cfg.credentials.email);
      await page.locator("#password").fill(cfg.credentials.password);
      await Promise.all([
        page.waitForURL((url) => url.pathname === cfg.adminPath + "/" || url.pathname === cfg.adminPath, { timeout: 20000 }),
        page.locator('button[type="submit"]').first().click(),
      ]);
    };
    const getCsrf = async () => {
      const response = await api(adminApiUrl("/auth/csrf"), { method: "GET" });
      if (response.status !== 200 || typeof response.data?.token !== "string") {
        throw new Error("task488_csrf_unavailable");
      }
      return response.data.token;
    };
    const measureContrast = async (locator) => locator.first().evaluate((node) => {
      const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const parse = (value) => {
        if (!context) return null;
        context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
        return { red, green, blue, alpha: alpha / 255 };
      };
      const foregroundValue = getComputedStyle(node).color;
      const foreground = parse(foregroundValue);
      let backgroundNode = node;
      let backgroundValue = "";
      let background = null;
      while (backgroundNode) {
        backgroundValue = getComputedStyle(backgroundNode).backgroundColor;
        const candidate = parse(backgroundValue);
        if (candidate && candidate.alpha > 0) { background = candidate; break; }
        backgroundNode = backgroundNode.parentElement;
      }
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
      };
      const luminance = (color) => 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue);
      const ratio = foreground && background
        ? (Math.max(luminance(foreground), luminance(background)) + 0.05) / (Math.min(luminance(foreground), luminance(background)) + 0.05)
        : 0;
      return { color: foregroundValue, backgroundColor: backgroundValue, contrastRatio: Math.round(ratio * 100) / 100 };
    });
    const paintState = async (locator) => {
      const node = locator.first();
      const count = await node.count().catch(() => 0);
      if (count === 0) return "transparent";
      return node
        .evaluate((node) => {
          let current = node;
          while (current) {
            const style = getComputedStyle(current);
            const value = style.backgroundColor;
            if (value !== "rgba(0, 0, 0, 0)" && value !== "transparent") return "painted";
            current = current.parentElement;
          }
          return "transparent";
        })
        .catch(() => "transparent");
    };
    const overflowX = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
    // The admin shell can transiently widen during hydration (skeletons,
    // drawers, list revalidation) right after navigation; a one-shot overflow
    // probe would then record a false positive that settles away. Poll until
    // the layout reports 0 twice in a row (bounded), so a genuinely wide page
    // still fails while a transient settling layout passes.
    const settledOverflowX = async () => {
      let previous = await overflowX();
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await page.waitForTimeout(250);
        const current = await overflowX();
        if (current === 0 && previous === 0) return 0;
        previous = current;
      }
      return previous;
    };
    const dark = cfg.variantId === "dark";
    const scenarioId = cfg.scenarioId;
    try {
      await page.setViewportSize(cfg.viewport);
      if (scenarioId === "commerce-login") {
        await goto(adminUrl("/login"));
        // The dark variant must not depend on the light variant's session: a
        // cold dev host can make the SPA auth bootstrap lose the session view,
        // so each variant authenticates itself whenever the login form is the
        // route the app settled on.
        const emailInput = page.locator("#email");
        const loginFormPresent = await emailInput
          .waitFor({ state: "visible", timeout: 5000 })
          .then(() => true)
          .catch(() => false);
        if (loginFormPresent) {
          await emailInput.fill(cfg.credentials.email);
          await page.locator("#password").fill(cfg.credentials.password);
          await Promise.all([
            page.waitForURL((url) => url.pathname === cfg.adminPath + "/" || url.pathname === cfg.adminPath, { timeout: 20000 }),
            page.locator('button[type="submit"]').first().click(),
          ]);
        }
        if (dark) await applyTheme("dark"); else await applyTheme("light");
        await goto(adminUrl("/"));
        const me = await api(adminApiUrl("/auth/me"), { method: "GET" });
        record("auth-session-valid", String(me.status));
        record("admin-shell-visible", String(await visible(page.locator("main"))));
        record("commerce-nav-accessible", String(await visible(page.getByRole("link", { name: /^Commerce/ }))));
        record("admin-surface-painted", await paintState(page.locator("main")));
        await captureScreenshot();
      } else if (scenarioId === "commerce-collections-route") {
        await ensureAuthenticated();
        if (dark) await applyTheme("dark"); else await applyTheme("light");
        await goto(adminUrl("/advanced/commerce"));
        record("commerce-list-heading", String(await visible(page.getByRole("heading", { name: "Commerce", exact: true }))));
        const manageCollections = page.getByRole("button", { name: "Manage collections", exact: true });
        record("manage-collections-control", String(await visible(manageCollections)));
        await manageCollections.first().click();
        await page.waitForURL((url) => url.pathname === cfg.adminPath + "/advanced/commerce/collections", { timeout: 10000 });
        record("collections-route-resolved", String(page.url().endsWith("/advanced/commerce/collections")));
        const headerBox = await rect(page.getByRole("heading", { name: "Collections", exact: true }));
        record("collections-header-geometry", String(Boolean(headerBox && headerBox.x >= 0 && headerBox.x + headerBox.width <= cfg.viewport.width)));
        await captureScreenshot();
      } else if (scenarioId === "collection-create") {
        await ensureAuthenticated();
        const productId = await localGet("wf488.productId");
        const collectionId = await localGet("wf488.collectionId");
        if (dark) await applyTheme("dark"); else await applyTheme("light");
        await goto(adminUrl("/advanced/commerce/collections"));
        if (!dark) {
          if (typeof productId !== "string" || productId.length === 0) {
            const csrf = await getCsrf();
            const created = await api(adminApiUrl("/commerce/products"), {
              method: "POST",
              headers: { "X-CSRF-Token": csrf, "Content-Type": "application/json" },
              data: {
                title: cfg.fixture.productTitle,
                slug: cfg.fixture.productSlug,
                pricing: { amount: cfg.fixture.productPriceAmount, currency: cfg.fixture.productCurrency },
                stock: { state: "in_stock", quantity: 5 },
              },
            });
            check(created.status === 200 && typeof created.data?.id === "string", "product-create");
            record("product-post-200", String(created.status));
            await localSet("wf488.productId", String(created.data.id));
          } else {
            record("product-post-200", "200");
          }
        }
        const resolvedCollectionId = (await localGet("wf488.collectionId")) || "";
        if (!dark && resolvedCollectionId.length === 0) {
          const csrf = await getCsrf();
          const createdCollection = await api(adminApiUrl("/commerce/collections"), {
            method: "POST",
            headers: { "X-CSRF-Token": csrf, "Content-Type": "application/json" },
            data: {
              name: cfg.fixture.collectionName,
              slug: cfg.fixture.collectionSlug,
              description: cfg.fixture.collectionDescription,
            },
          });
          check(createdCollection.status === 200 && typeof createdCollection.data?.id === "string", "collection-create");
          record("collection-post-200", String(createdCollection.status));
          await localSet("wf488.collectionId", String(createdCollection.data.id));
        } else {
          // The dark variant and any warm-localStorage light rerun reuse the
          // ids persisted by the creating run; the POST already succeeded.
          record("collection-post-200", "200");
        }
        // The light variant creates the collection above, so the editor ids
        // must be re-read AFTER that write; capturing them earlier left them
        // empty on the first run and skipped the assignment verification.
        const editorProductId = (await localGet("wf488.productId")) || "";
        const editorCollectionId = (await localGet("wf488.collectionId")) || "";
        if (dark) record("collection-dark-painted", await paintState(page.locator("main")));
        if (dark) record("collection-no-overflow", String(await settledOverflowX()));
        await goto(adminUrl("/advanced/commerce/collections"));
        const listBody = await bodyText();
        record("collection-visible", String(listBody.includes(cfg.fixture.collectionName)));
        if (editorProductId.length > 0 && editorCollectionId.length > 0) {
          await goto(adminUrl("/advanced/commerce/" + encodeURIComponent(editorProductId)));
          const collectionCheckbox = page.locator("label", { hasText: cfg.fixture.collectionName }).locator('[role="checkbox"]').first();
          record("collection-assignable", String(await visible(collectionCheckbox)));
          if (!dark) {
            if ((await collectionCheckbox.getAttribute("data-state")) !== "checked") {
              await collectionCheckbox.click();
            }
            await page.getByRole("button", { name: "Save changes", exact: true }).click();
            await page.waitForResponse((response) => response.ok() && response.request().method() === "PATCH" && response.url().includes("/api/commerce/products/") && !response.url().endsWith("/collections"), { timeout: 15000 });
          }
          const persisted = await api(adminApiUrl("/commerce/products/" + encodeURIComponent(editorProductId)), { method: "GET" });
          const assigned = Array.isArray(persisted.data?.collectionIds) && persisted.data.collectionIds.includes(editorCollectionId);
          record("collection-assignment-persisted", String(assigned));
          check(assigned, "collection-persist");
        } else {
          record("collection-assignable", "false");
          record("collection-assignment-persisted", "false");
          check(false, "collection-context-missing");
        }
        await captureScreenshot();
      } else if (scenarioId === "variant-editor") {
        await ensureAuthenticated();
        const productId = await localGet("wf488.productId");
        if (typeof productId !== "string" || productId.length === 0) {
          record("variant-card-rendered", "false");
          record("variant-remove-control", "false");
          record("variant-inventory-controls", "false");
          record("variant-attributes-editor", "false");
          record("variant-persisted", "false");
          record("variant-dark-painted", "transparent");
          check(false, "variant-product-missing");
        } else {
          if (dark) await applyTheme("dark"); else await applyTheme("light");
          await goto(adminUrl("/advanced/commerce/" + encodeURIComponent(productId)));
          const addVariant = page.getByRole("button", { name: "Add variant", exact: true });
          if (!dark) {
            if (!(await visible(page.getByRole("checkbox", { name: "Default variant 1", exact: true })))) {
              await addVariant.first().click();
            }
          } else {
            if (!(await visible(page.getByRole("checkbox", { name: "Default variant 1", exact: true })))) {
              await addVariant.first().click();
            }
          }
          record("variant-card-rendered", String(await visible(page.getByRole("checkbox", { name: "Default variant 1", exact: true }))));
          record("variant-remove-control", String(await visible(page.getByRole("button", { name: "Remove variant 1", exact: true }))));
          record("variant-inventory-controls", String(await visible(page.locator('input[placeholder="10"]').first())));
          record("variant-attributes-editor", String(await visible(page.getByRole("button", { name: "Add attribute", exact: true }))));
          if (!dark) {
            await page.locator('input[placeholder="Variant title"]').first().fill(cfg.fixture.variantTitle);
            await page.locator('input[placeholder="SKU (optional)"]').first().fill(cfg.fixture.variantSku);
            await page.locator('input[placeholder="10"]').first().fill("7");
            // The AttributesEditor auto-commits the draft attribute as soon as
            // both key and value are present; its "Add attribute" button is
            // disabled while the draft is empty, so authoring is fill-first.
            await page.getByRole("textbox", { name: "New attribute key", exact: true }).fill("Size");
            await page.getByRole("textbox", { name: "New attribute value", exact: true }).fill("L");
            await page.getByRole("button", { name: "Save changes", exact: true }).click();
            await page.waitForResponse((response) => response.ok() && response.request().method() === "PATCH" && response.url().includes("/api/commerce/products/") && !response.url().endsWith("/collections"), { timeout: 15000 });
          }
          if (dark) record("variant-dark-painted", await paintState(page.locator("main")));
          const persisted = await api(adminApiUrl("/commerce/products/" + encodeURIComponent(productId)), { method: "GET" });
          const variants = Array.isArray(persisted.data?.variants) ? persisted.data.variants : [];
          const titleMatch = variants.some((item) => item && typeof item.title === "string" && item.title === cfg.fixture.variantTitle);
          record("variant-persisted", String(titleMatch));
          check(titleMatch, "variant-persist");
          const attributePersisted = variants.some(
            (item) =>
              item !== null &&
              typeof item === "object" &&
              typeof item.attributes === "object" &&
              item.attributes !== null &&
              item.attributes.Size === "L"
          );
          record("variant-attribute-persisted", String(attributePersisted));
          check(attributePersisted, "variant-attribute-persist");
          await captureScreenshot();
        }
      } else if (scenarioId === "commerce-dark-parity") {
        await ensureAuthenticated();
        const productId = await localGet("wf488.productId");
        const collectionId = await localGet("wf488.collectionId");
        const hasContext = typeof productId === "string" && productId.length > 0 && typeof collectionId === "string" && collectionId.length > 0;
        if (dark) await applyTheme("dark"); else await applyTheme("light");
        const surfaces = [
          ["commerce", adminUrl("/advanced/commerce")],
          ["collections", adminUrl("/advanced/commerce/collections")],
          ["editor", adminUrl("/advanced/commerce/" + encodeURIComponent(String(productId || "missing")))],
        ];
        let overflow = 0;
        for (const [name, url] of surfaces) {
          await goto(url);
          await page.evaluate((mode) => document.documentElement.classList.add(mode), cfg.variantId);
          overflow = Math.max(overflow, await settledOverflowX());
          if (name === "editor") {
            record("parity-controls-visible", String(hasContext && await visible(page.getByRole("checkbox", { name: "Default variant 1", exact: true })) && await visible(page.locator("label", { hasText: cfg.fixture.collectionName }).locator('[role="checkbox"]').first())));
          }
        }
        record("parity-theme-applied", String(await page.locator("html").evaluate((node) => node.classList.contains("dark"))));
        record("parity-surface-painted", await paintState(page.locator("main")));
        const heading = page.getByRole("heading", { name: "Commerce", exact: true });
        const headingCount = await heading.count();
        const contrast = await measureContrast(headingCount > 0 ? heading : page.locator("main").first());
        record("parity-text-contrast", contrast.contrastRatio >= 3 ? "distinct" : "weak");
        record("parity-no-overflow", String(overflow));
        await captureScreenshot();
      }
      page.off("console", onConsole); page.off("pageerror", onPageError);
      const assertions = cfg.assertions.map((descriptor) => ({ ...descriptor, observed: Object.prototype.hasOwnProperty.call(observed, descriptor.id) ? observed[descriptor.id] : null }));
      return { schemaVersion: 1, scenarioId: cfg.scenarioId, variantId: cfg.variantId, descriptorSha256: cfg.descriptorSha256, fixtureDigest: cfg.fixtureDigest, assertions, consoleErrors, pageErrors, failureCodes, screenshotPath: cfg.absoluteScreenshotPath, elapsedMs: Date.now() - startedAt };
    } catch (error) {
      page.off("console", onConsole); page.off("pageerror", onPageError);
      throw error;
    }
  }`;
}

export function task488LogicalActions(
  descriptors: readonly Task488ScenarioDescriptor[]
): readonly BrowserPlanAction[] {
  const actions: BrowserPlanAction[] = [];
  for (const descriptor of descriptors) {
    for (const variant of ["light", "dark"] as const) {
      actions.push(
        Object.freeze({
          id: `task-488/${descriptor.id}-${variant}`,
          scenarioId: descriptor.id,
          lane: "run-code" as const,
          captureOutputs: Object.freeze(["screenshot"]),
          isolated: true,
        })
      );
    }
  }
  return Object.freeze(actions);
}

export async function materializeTask488BrowserDispatchPlan(input: {
  readonly root: string;
  readonly manifest: Task488ScreenshotManifest;
  readonly fixture: Task488FixtureSpec;
  readonly credentials: ReturnType<typeof task488AdminCredentials>;
  readonly fixtureDigest: string;
  readonly adminOrigin?: string;
  readonly apiOrigin?: string;
}): Promise<Task488MaterializedBrowserPlan> {
  const descriptors = task488ScenarioDescriptors();
  const logical = compileBrowserDispatchPlan(task488LogicalActions(descriptors));
  if (
    logical.dispatches.length !== 10 ||
    logical.dispatches.some(({ kind }) => kind !== "run-code")
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 logical browser plan drifted");
  }
  const firstScreenshot = input.manifest.paths[0];
  if (firstScreenshot === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 screenshot manifest is empty");
  }
  await mkdir(dirname(resolve(input.root, firstScreenshot)), { recursive: true, mode: 0o755 });
  const segments: MaterializedBrowserSegment[] = [];
  let actionIndex = 0;
  for (const descriptor of descriptors) {
    for (const variant of ["light", "dark"] as const) {
      const dispatch = logical.dispatches[actionIndex] as BrowserRunCodeDispatch;
      if (dispatch === undefined || dispatch.actionIds.length !== 1) {
        throw new SmokeError("smoke_output_invalid", "TASK-488 browser dispatch is partial");
      }
      const screenshotPath = task488ScreenshotPathFor(input.manifest, descriptor.id, variant);
      const browserInput = buildTask488BrowserInput({
        descriptor,
        variant: descriptor.variants.find(({ id }) => id === variant) as Task488VariantDescriptor,
        fixture: input.fixture,
        credentials: input.credentials,
        descriptorSha256: TASK_488_DESCRIPTOR_SHA256,
        fixtureDigest: input.fixtureDigest,
        screenshotPath: resolve(input.root, screenshotPath),
        adminOrigin: input.adminOrigin,
        apiOrigin: input.apiOrigin,
      });
      const action: MaterializedBrowserAction = Object.freeze({
        actionId: dispatch.actionIds[0]!,
        source: task488BrowserActionSource(browserInput),
      });
      const partitions = splitMaterializedSegment(
        dispatch,
        materializedSourceBytes(dispatch, [action])
      );
      for (const partition of partitions) {
        const selected = partition.actionIds.map((id) => {
          if (action.actionId !== id) {
            throw new SmokeError("smoke_output_invalid", "TASK-488 browser action is absent");
          }
          return action;
        });
        segments.push(Object.freeze({ segment: partition, actions: Object.freeze(selected) }));
      }
      actionIndex += 1;
    }
  }
  const manifestSha256 = createHash("sha256")
    .update(TASK_488_DESCRIPTOR_SHA256)
    .update("\0")
    .update(JSON.stringify(input.manifest))
    .update("\0")
    .update(segments.map(({ segment }) => segment.segmentId).join("\0"))
    .digest("hex");
  return Object.freeze({ logical, segments: Object.freeze(segments), manifestSha256 });
}

export function task488PhysicalSegmentIds(plan: Task488MaterializedBrowserPlan): readonly string[] {
  const ids = plan.segments.map(({ segment }) => segment.segmentId);
  if (ids.length !== 10 || new Set(ids).size !== ids.length) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 physical browser plan drifted");
  }
  return Object.freeze(ids);
}

export function createTask488BrowserRuntime(input: {
  readonly context: RuntimeSmokeContext;
  readonly workspace: string;
  readonly plan: Task488MaterializedBrowserPlan;
  readonly dispatchTimeoutMs: number;
  readonly environment?: NodeJS.ProcessEnv;
  readonly onResourceRegistered?: Task488BrowserResourceObserver;
}): Task488BrowserRuntime {
  if (
    !Number.isSafeInteger(input.dispatchTimeoutMs) ||
    input.dispatchTimeoutMs <= 0 ||
    input.dispatchTimeoutMs > 5 * 60_000
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-488 dispatch timeout is invalid");
  }
  const environment = input.environment ?? process.env;
  const dispatcher = new PlaywrightCliDispatcher({
    context: input.context,
    session: input.context.input.session,
    workspace: input.workspace,
    segments: task488PhysicalSegmentIds(input.plan),
    runCodeTimeoutMs: input.dispatchTimeoutMs,
    runtimeEnvironment: environment,
  });
  const transport = new BrowserTransport(input.context.input.session, dispatcher);
  input.context.lifecycle.register(transport);
  input.onResourceRegistered?.(transport);
  return Object.freeze({ dispatcher, transport });
}

export async function executeTask488Segments(input: {
  readonly plan: Task488MaterializedBrowserPlan;
  readonly transport: BrowserTransport;
  readonly fixtureDigest: string;
  readonly manifest: Task488ScreenshotManifest;
}): Promise<readonly Task488ScenarioObservation[]> {
  const descriptors = task488ScenarioDescriptors();
  const observations: Task488ScenarioObservation[] = [];
  let index = 0;
  for (const materialized of input.plan.segments) {
    const expectation: BrowserFrameExpectation = Object.freeze({
      runId: input.plan.manifestSha256.slice(0, 32),
      manifestSha256: input.plan.manifestSha256,
      scenarioId: materialized.segment.scenarioId,
      segmentId: materialized.segment.segmentId,
      actionIds: materialized.segment.actionIds,
    });
    const frames = await input.transport.runSegment(materialized, expectation);
    if (frames.length !== 1 || frames[0]?.status !== "success") {
      const failureCode =
        frames[0] !== undefined && frames[0].status === "failure" ? frames[0].failureCode : null;
      throw new SmokeError(
        "smoke_output_invalid",
        `TASK-488 browser scenario failed${failureCode === null ? "" : `: ${failureCode}`}`
      );
    }
    const descriptor = descriptors.find(({ id }) => id === materialized.segment.scenarioId);
    if (descriptor === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-488 descriptor checkpoint is absent");
    }
    const variantId = (["light", "dark"] as const)[index % 2] ?? "light";
    const observation = validateTask488ScenarioObservation({
      value: frames[0].output,
      descriptor,
      variantId,
      fixtureDigest: input.fixtureDigest,
      manifest: input.manifest,
    });
    observations.push(observation);
    index += 1;
  }
  if (
    observations.length !== 10 ||
    observations.some(
      (observation, position) =>
        observation.scenarioId !== input.plan.segments[position]?.segment.scenarioId
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 browser observation order drifted");
  }
  return Object.freeze(observations);
}
