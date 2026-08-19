// TASK-467 browser actions: run-code sources that drive the real admin Widget
// Library drawer. Each scenario is an isolated Playwright page context; the
// section widget editors mount through the TASK-467 WidgetEditorOutlet, so the
// receipts assert the visible lazy contract (fallback, error boundary, retry,
// computed styles, geometry, dark mode, mobile viewport, data round-trip).
import { SmokeError } from "../../contracts";
import type { Task467ScenarioId } from "./contracts";

export interface Task467BrowserConfig {
  readonly scenarioId: Task467ScenarioId;
  readonly adminUrl: string;
  readonly widgetType: string;
  readonly chunkGlob: string;
  readonly fallbackColor: string;
  readonly fallbackColorRgb: string;
  readonly controlId: string;
  readonly browserRunStartedAtEpochMs: number;
}

const ZERO_RECEIPT_FIELDS = `
  modeRootCount: 0, modeRootBoxWidth: 0, modeRootBoxHeight: 0,
  sectionCount: 0, visibleSectionCount: 0, writableControlCount: 0, controlCount: 0,
  loadingVisible: false, loadingBoxWidth: 0, loadingBoxHeight: 0, loadingRole: null,
  errorVisible: false, retryButtonVisible: false, retryButtonName: null,
  previewColorBefore: null, previewColorAfter: null, colorInputValue: null,
  lightModeRootBackground: null, darkModeRootBackground: null, darkVisibleSectionCount: 0,
  mobileRootBoxWidth: 0, mobileRootBoxHeight: 0, mobileOverflow: false, mobileVisibleSectionCount: 0,
  previewColorAfterRoundTrip: null, consoleErrorDelta: 0, screenshotBase64: ""
`;

function safeLiteral(value: string): string {
  return JSON.stringify(value)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

const SHARED_HARNESS = `
  const adminUrl = ${"__ADMIN_URL__"};
  const widgetType = ${"__WIDGET_TYPE__"};
  const chunkGlob = ${"__CHUNK_GLOB__"};
  const fallbackColor = ${"__FALLBACK_COLOR__"};
  const fallbackColorRgb = ${"__FALLBACK_COLOR_RGB__"};
  const controlId = ${"__CONTROL_ID__"};
  const browserRunStartedAtEpochMs = __RUN_START_EPOCH__;
  async function paceAuthRateLimitWindow() {
    // The admin SPA fires two /auth-bucket requests per boot (/auth/me and
    // /auth/install/status) against the per-user auth bucket (10 per rolling
    // 60s window). Warmup plus scenarios 1-4 consume exactly 10, so the 6th
    // boot must cross into the next window to avoid a 429 that bounces the
    // SPA to /admin/login. Bounded and computed, never a fixed sleep: the
    // delay is only as long as needed to reach a fresh bucket window.
    const remaining = browserRunStartedAtEpochMs + 70000 - Date.now();
    if (remaining > 0) await page.waitForTimeout(remaining);
  }
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error && error.message ? error.message : String(error));
  });
  async function settle() {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  }
  async function boxOf(locator) {
    const count = await locator.count();
    if (count === 0) return { w: 0, h: 0 };
    const box = await locator.first().boundingBox().catch(() => null);
    return { w: box && box.width > 0 ? Math.round(box.width) : 0, h: box && box.height > 0 ? Math.round(box.height) : 0 };
  }
  async function visibleSections(locator) {
    const count = await locator.count();
    if (count === 0) return 0;
    return await locator.first().locator("[data-widget-editor-section]").evaluateAll((nodes) =>
      nodes.filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length
    ).catch(() => 0);
  }
  async function writableControls(locator) {
    const count = await locator.count();
    if (count === 0) return { writable: 0, total: 0 };
    return await locator.first().locator("[data-widget-control]").evaluateAll((nodes) => {
      const all = nodes.length;
      const writable = nodes.filter((node) =>
        node.getAttribute("data-widget-control-ownership") === "writable" &&
        node.getAttribute("data-widget-control-readonly") !== "true"
      ).length;
      return { writable, total: all };
    }).catch(() => ({ writable: 0, total: 0 }));
  }
  async function editorRoot(mode) {
    return page.locator('[data-widget-editor="' + widgetType + '"][data-widget-editor-mode="' + mode + '"]');
  }
  async function openSectionDrawer() {
    await page.goto(adminUrl + "/advanced/widgets", { waitUntil: "domcontentloaded", timeout: 120000 });
    await settle();
    const rowButton = page.getByRole("button", { name: "Section", exact: true }).first();
    await rowButton.waitFor({ state: "visible", timeout: 30000 });
    await rowButton.click();
    await settle();
    await page.locator('[data-widget-editor="' + widgetType + '"]').first().waitFor({ state: "visible", timeout: 60000 });
  }
  async function completeWizard() {
    const finish = page.getByRole("button", { name: /finish setup and open visual/i }).first();
    await finish.waitFor({ state: "visible", timeout: 30000 });
    await finish.click();
    await settle();
  }
  async function colorInput() {
    return page.locator(
      '[data-widget-editor="' + widgetType + '"][data-widget-editor-mode="visual"] ' +
      '[data-widget-control="' + controlId + '"] input[type="color"]'
    ).first();
  }
  async function surfacePreview() {
    return page.locator('[data-section-surface-preview="true"]').first();
  }
  async function backgroundOf(locator) {
    if (await locator.count() === 0) return null;
    return await locator.evaluate((node) => window.getComputedStyle(node).backgroundColor).catch(() => null);
  }
  async function shot() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const buffer = await page.screenshot({ fullPage: true }).catch(() => null);
      if (buffer !== null && buffer.length > 0) return buffer.toString("base64");
      await page.waitForTimeout(400);
    }
    return "";
  }
`;

const SCENARIO_BODIES: Readonly<Record<Task467ScenarioId, string>> = Object.freeze({
  "wizard-lazy-fallback": `
    const delay = (ms) => page.waitForTimeout(ms);
    let delayed = false;
    await page.route(chunkGlob, async (route) => {
      if (!delayed) {
        delayed = true;
        await delay(900);
      }
      await route.continue().catch(() => undefined);
    });
    const started = Date.now();
    await openSectionDrawer();
    const loading = page.locator('[data-widget-editor-loading="wizard"]');
    const loadingVisible = (await loading.count()) > 0 && await loading.first().isVisible().catch(() => false);
    const loadingBox = await boxOf(loading);
    const loadingRole = (await loading.count()) > 0 ? await loading.first().getAttribute("role") : null;
    const root = await editorRoot("wizard");
    const rootBox = await boxOf(root);
    await root.first().locator("[data-widget-editor-section]").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    const sectionCount = (await root.count()) > 0 ? await root.first().locator("[data-widget-editor-section]").count() : 0;
    const visibleSectionCount = await visibleSections(root);
    const controls = await writableControls(root);
    const elapsed = Date.now() - started;
    return {
      ok: loadingVisible && loadingBox.w > 0 && loadingBox.h > 0 && (await root.count()) === 1 && rootBox.w > 0 && rootBox.h > 0 && visibleSectionCount > 0 && elapsed >= 800,
      loadingVisible, loadingBoxWidth: loadingBox.w, loadingBoxHeight: loadingBox.h, loadingRole,
      modeRootCount: await root.count(), modeRootBoxWidth: rootBox.w, modeRootBoxHeight: rootBox.h,
      sectionCount, visibleSectionCount, writableControlCount: controls.writable, controlCount: controls.total,
      consoleErrorDelta: consoleErrors.length,
      screenshotBase64: await shot(),
    };
  `,
  "visual-computed-style": `
    await openSectionDrawer();
    await completeWizard();
    const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
    await visualTab.waitFor({ state: "visible", timeout: 30000 });
    await visualTab.click().catch(() => undefined);
    await settle();
    const root = await editorRoot("visual");
    await root.first().waitFor({ state: "visible", timeout: 30000 });
    const before = await backgroundOf(await surfacePreview());
    const input = await colorInput();
    await input.waitFor({ state: "visible", timeout: 30000 });
    await input.fill(fallbackColor);
    await settle();
    const preview = await surfacePreview();
    const after = await backgroundOf(preview);
    const colorInputValue = await input.inputValue().catch(() => null);
    const rootBox = await boxOf(root);
    const sectionCount = await root.first().locator("[data-widget-editor-section]").count();
    const visibleSectionCount = await visibleSections(root);
    const controls = await writableControls(root);
    return {
      ok: after === fallbackColorRgb && colorInputValue === fallbackColor && (await root.count()) === 1 && rootBox.w > 0,
      consoleErrorPreview: consoleErrors.slice(0, 4).join(" | ").slice(0, 400),
      previewColorBefore: before, previewColorAfter: after, colorInputValue,
      modeRootCount: await root.count(), modeRootBoxWidth: rootBox.w, modeRootBoxHeight: rootBox.h,
      sectionCount, visibleSectionCount, writableControlCount: controls.writable, controlCount: controls.total,
      consoleErrorDelta: consoleErrors.length,
      screenshotBase64: await shot(),
    };
  `,
  "advanced-mount": `
    await openSectionDrawer();
    await completeWizard();
    const advancedTab = page.getByRole("tab", { name: /^advanced$/i }).first();
    await advancedTab.waitFor({ state: "visible", timeout: 30000 });
    await advancedTab.click();
    await settle();
    const root = await editorRoot("advanced");
    await root.first().waitFor({ state: "visible", timeout: 30000 });
    const rootBox = await boxOf(root);
    const visibleSectionCount = await visibleSections(root);
    const controls = await writableControls(root);
    return {
      ok: (await root.count()) === 1 && rootBox.w > 0 && rootBox.h > 0 && visibleSectionCount > 0 && controls.total > 0,
      modeRootCount: await root.count(), modeRootBoxWidth: rootBox.w, modeRootBoxHeight: rootBox.h,
      sectionCount: await root.first().locator("[data-widget-editor-section]").count(),
      visibleSectionCount, writableControlCount: controls.writable, controlCount: controls.total,
      consoleErrorDelta: consoleErrors.length,
      screenshotBase64: await shot(),
    };
  `,
  "dark-mode": `
    await openSectionDrawer();
    await completeWizard();
    const root = await editorRoot("visual");
    await root.first().waitFor({ state: "visible", timeout: 30000 });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await settle();
    await root.first().locator("[data-widget-editor-section]").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    const lightBackground = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor).catch(() => null);
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await settle();
    const darkBackground = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor).catch(() => null);
    const darkVisibleSectionCount = await visibleSections(root);
    const rootBox = await boxOf(root);
    return {
      ok: lightBackground !== null && darkBackground !== null && lightBackground !== darkBackground && darkVisibleSectionCount > 0 && rootBox.w > 0,
      lightModeRootBackground: lightBackground, darkModeRootBackground: darkBackground, darkVisibleSectionCount,
      modeRootCount: await root.count(), modeRootBoxWidth: rootBox.w, modeRootBoxHeight: rootBox.h,
      sectionCount: await root.first().locator("[data-widget-editor-section]").count(),
      visibleSectionCount: darkVisibleSectionCount,
      writableControlCount: 0, controlCount: 0,
      consoleErrorDelta: consoleErrors.length,
      screenshotBase64: await shot(),
    };
  `,
  "cross-device-mobile": `
    await paceAuthRateLimitWindow();
    await page.setViewportSize({ width: 390, height: 844 });
    await openSectionDrawer();
    await completeWizard();
    const root = await editorRoot("visual");
    await root.first().waitFor({ state: "visible", timeout: 30000 });
    await root.first().locator("[data-widget-editor-section]").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    const rootBox = await boxOf(root);
    const visibleSectionCount = await visibleSections(root);
    const overflow = await root.first().evaluate((node) => {
      const rootNode = node;
      const doc = rootNode.ownerDocument;
      const scrollWidth = doc.documentElement.scrollWidth;
      const clientWidth = doc.documentElement.clientWidth;
      return scrollWidth > clientWidth + 2;
    }).catch(() => true);
    return {
      ok: rootBox.w > 0 && rootBox.h > 0 && visibleSectionCount > 0 && overflow === false,
      mobileRootBoxWidth: rootBox.w, mobileRootBoxHeight: rootBox.h, mobileOverflow: overflow, mobileVisibleSectionCount: visibleSectionCount,
      modeRootCount: await root.count(), modeRootBoxWidth: rootBox.w, modeRootBoxHeight: rootBox.h,
      sectionCount: await root.first().locator("[data-widget-editor-section]").count(),
      visibleSectionCount,
      writableControlCount: 0, controlCount: 0,
      consoleErrorDelta: consoleErrors.length,
      screenshotBase64: await shot(),
    };
  `,
  "lazy-failure-retry": `
    await paceAuthRateLimitWindow();
    let aborted = false;
    await page.route(chunkGlob, async (route) => {
      if (!aborted) {
        aborted = true;
        await route.abort("failed").catch(() => undefined);
        return;
      }
      await route.continue().catch(() => undefined);
    });
    await page.goto(adminUrl + "/advanced/widgets", { waitUntil: "domcontentloaded", timeout: 120000 });
    await settle();
    const rowButton = page.getByRole("button", { name: "Section", exact: true }).first();
    await rowButton.waitFor({ state: "visible", timeout: 30000 });
    await rowButton.click();
    await settle();
    const errorState = page.locator('[data-widget-editor-error="wizard"]');
    await errorState.first().waitFor({ state: "visible", timeout: 30000 });
    const errorVisible = await errorState.first().isVisible().catch(() => false);
    const retryButton = page.locator('[data-widget-editor-retry="wizard"]').first();
    const retryButtonVisible = (await retryButton.count()) > 0 && await retryButton.isVisible().catch(() => false);
    const retryButtonName = (await retryButton.count()) > 0 ? (await retryButton.innerText().catch(() => null)) || null : null;
    await retryButton.click();
    // The abort phase intentionally logs import failures, so the console-error
    // gate must assert only the recovery path: zero errors after the retry.
    consoleErrors.length = 0;
    await settle();
    const root = await editorRoot("wizard");
    await root.first().waitFor({ state: "visible", timeout: 60000 });
    await completeWizard();
    const visualRoot = await editorRoot("visual");
    await visualRoot.first().waitFor({ state: "visible", timeout: 30000 });
    await visualRoot.first().locator("[data-widget-editor-section]").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    const rootBox = await boxOf(visualRoot);
    const visibleSectionCount = await visibleSections(visualRoot);
    return {
      ok: errorVisible && retryButtonVisible && retryButtonName !== null && (await visualRoot.count()) === 1 && rootBox.w > 0 && visibleSectionCount > 0 && consoleErrors.length === 0,
      errorVisible, retryButtonVisible, retryButtonName,
      modeRootCount: await visualRoot.count(), modeRootBoxWidth: rootBox.w, modeRootBoxHeight: rootBox.h,
      sectionCount: await visualRoot.first().locator("[data-widget-editor-section]").count(),
      visibleSectionCount,
      writableControlCount: 0, controlCount: 0,
      consoleErrorDelta: consoleErrors.length,
      screenshotBase64: await shot(),
    };
  `,
  "mode-round-trip-preserves-data": `
    await paceAuthRateLimitWindow();
    await openSectionDrawer();
    await completeWizard();
    const root = await editorRoot("visual");
    await root.first().waitFor({ state: "visible", timeout: 30000 });
    const input = await colorInput();
    await input.waitFor({ state: "visible", timeout: 30000 });
    await input.fill(fallbackColor);
    await settle();
    const afterFirst = await backgroundOf(await surfacePreview());
    const advancedTab = page.getByRole("tab", { name: /^advanced$/i }).first();
    await advancedTab.click();
    await settle();
    await (await editorRoot("advanced")).first().waitFor({ state: "visible", timeout: 30000 });
    const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
    await visualTab.click();
    await settle();
    await root.first().waitFor({ state: "visible", timeout: 30000 });
    const afterRoundTrip = await backgroundOf(await surfacePreview());
    const rootBox = await boxOf(root);
    const visibleSectionCount = await visibleSections(root);
    const controls = await writableControls(root);
    return {
      ok: afterFirst === fallbackColorRgb && afterRoundTrip === fallbackColorRgb && (await root.count()) === 1 && rootBox.w > 0,
      previewColorAfter: afterFirst, previewColorAfterRoundTrip: afterRoundTrip, colorInputValue: await input.inputValue().catch(() => null),
      modeRootCount: await root.count(), modeRootBoxWidth: rootBox.w, modeRootBoxHeight: rootBox.h,
      sectionCount: await root.first().locator("[data-widget-editor-section]").count(),
      visibleSectionCount, writableControlCount: controls.writable, controlCount: controls.total,
      consoleErrorDelta: consoleErrors.length,
      screenshotBase64: await shot(),
    };
  `,
});

export function materializeTask467BrowserAction(config: Task467BrowserConfig): string {
  if (!(config.scenarioId in SCENARIO_BODIES)) {
    throw new SmokeError("smoke_output_invalid", "TASK-467 scenario action is absent");
  }
  const harness = SHARED_HARNESS.replaceAll("__ADMIN_URL__", safeLiteral(config.adminUrl))
    .replaceAll("__WIDGET_TYPE__", safeLiteral(config.widgetType))
    .replaceAll("__CHUNK_GLOB__", safeLiteral(config.chunkGlob))
    .replaceAll("__FALLBACK_COLOR__", safeLiteral(config.fallbackColor))
    .replaceAll("__FALLBACK_COLOR_RGB__", safeLiteral(config.fallbackColorRgb))
    .replaceAll("__CONTROL_ID__", safeLiteral(config.controlId))
    .replaceAll("__RUN_START_EPOCH__", String(config.browserRunStartedAtEpochMs));
  const body = SCENARIO_BODIES[config.scenarioId];
  return `async (page) => {
${harness}
  try {
${body}
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    return { ok: false, error: message,${ZERO_RECEIPT_FIELDS} };
  }
}`;
}
