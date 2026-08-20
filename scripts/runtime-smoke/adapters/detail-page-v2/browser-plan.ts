// TASK-580-03-L07 detail-page-v2 smoke browser plan.
// Five independently checkpointed scenarios. Every scenario source runs
// through the SHARED PlaywrightCliDispatcher (no task-local Playwright
// lifecycle) and returns strict JSON evidence with visible-effect assertions
// (computed style / geometry / DOM state), never mere control presence.
import { PlaywrightCliDispatcher } from "../../browser/playwright-cli-dispatcher";
import { SmokeError } from "../../contracts";
import type { PlainJsonValue } from "../../workers/contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import type { DetailPageV2FixturePlan } from "./fixtures";

const MAXIMUM_PROBE_OUTPUT_BYTES = 1024 * 1024;

export interface DetailPageV2BrowserProbeInput {
  readonly context: RuntimeSmokeContext;
  readonly session: string;
  readonly workspace: string;
  readonly segmentId: string;
  readonly source: string;
  readonly storageStatePath?: string;
  readonly dispatcher?: PlaywrightCliDispatcher;
  readonly storageStateLoaded?: boolean;
}

export interface DetailPageV2BrowserProbeResult {
  readonly output: PlainJsonValue;
  readonly elapsedMs: number;
}

function framedProbeSource(source: string): string {
  return `async (page) => {
    const output = await (${source})(page);
    return (typeof output === "string" ? output : JSON.stringify(output)) + "\\n";
  }`;
}

function decodeProbeOutput(bytes: Uint8Array): PlainJsonValue {
  let outer: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.endsWith("\n") || text.slice(0, -1).includes("\n")) throw new Error("shape");
    outer = JSON.parse(text.slice(0, -1)) as unknown;
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 browser output is malformed", {
      cause: error,
    });
  }
  if (typeof outer !== "string" || !outer.endsWith("\n") || outer.includes("\0")) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 browser output frame is invalid");
  }
  try {
    return JSON.parse(outer.slice(0, -1)) as PlainJsonValue;
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 browser result is not JSON", {
      cause: error,
    });
  }
}

export async function runDetailPageV2BrowserProbe(
  input: DetailPageV2BrowserProbeInput
): Promise<DetailPageV2BrowserProbeResult> {
  const ownsDispatcher = input.dispatcher === undefined;
  const dispatcher =
    input.dispatcher ??
    new PlaywrightCliDispatcher({
      context: input.context,
      session: input.session,
      workspace: input.workspace,
      segments: [input.segmentId],
    });
  if (ownsDispatcher) {
    input.context.lifecycle.register(dispatcher);
  }
  const started = performance.now();
  try {
    if (input.storageStatePath !== undefined && !input.storageStateLoaded) {
      await dispatcher.loadStorageState(input.storageStatePath);
    }
    const bytes = await dispatcher.dispatch({
      session: input.session,
      segmentId: input.segmentId,
      source: framedProbeSource(input.source),
      maximumOutputBytes: MAXIMUM_PROBE_OUTPUT_BYTES,
    });
    return Object.freeze({
      output: decodeProbeOutput(bytes),
      elapsedMs: Math.ceil(performance.now() - started),
    });
  } finally {
    if (ownsDispatcher) {
      await input.context.timing.measure("cleanup", `detail-page-v2-${input.segmentId}`, () =>
        dispatcher.close()
      );
    }
  }
}

export interface DetailPageV2ProbeEvidence {
  readonly scenario: string;
  readonly pass: boolean;
  readonly message: string;
  readonly screenshotPath: string | null;
  readonly consoleErrors: readonly string[];
}

export function assertStrictEvidence(value: unknown, scenario: string): DetailPageV2ProbeEvidence {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new SmokeError("smoke_output_invalid", `${scenario} browser evidence is invalid`);
  }
  const record = value as Record<string, unknown>;
  for (const key of ["scenario", "pass", "message", "screenshotPath", "consoleErrors"]) {
    if (!(key in record)) {
      throw new SmokeError("smoke_output_invalid", `${scenario} browser evidence is incomplete`);
    }
  }
  if (
    record.scenario !== scenario ||
    typeof record.pass !== "boolean" ||
    typeof record.message !== "string" ||
    (record.screenshotPath !== null && typeof record.screenshotPath !== "string") ||
    !Array.isArray(record.consoleErrors) ||
    record.consoleErrors.some((entry) => typeof entry !== "string")
  ) {
    throw new SmokeError("smoke_output_invalid", `${scenario} browser evidence is invalid`);
  }
  return Object.freeze({
    scenario: record.scenario as string,
    pass: record.pass as boolean,
    message: record.message as string,
    screenshotPath: record.screenshotPath as string | null,
    consoleErrors: record.consoleErrors as readonly string[],
  });
}

const PUBLIC_PROBE_SHARED = `
  let consoleErrors = [];
  let failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    failedRequests.push({ url: request.url(), error: failure && failure.errorText });
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(String(error && error.message ? error.message : error));
  });
  async function settle() {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  }
  async function visibleInfo(locator) {
    const box = await locator.boundingBox().catch(() => null);
    const style = await locator
      .evaluate((el) => {
        const s = window.getComputedStyle(el);
        return { display: s.display, visibility: s.visibility, color: s.color, fontSize: s.fontSize };
      })
      .catch(() => null);
    const text = (await locator.textContent().catch(() => null) ?? "").trim().replace(/\\s+/g, " ");
    return { visible: Boolean(box && box.width > 0 && box.height > 0), box, style, text };
  }
`;

export function buildPublicConvertedProbeSource(input: {
  readonly frontUrl: string;
  readonly detailUrl: string;
  readonly expectedTitle: string;
  readonly screenshotPath: string;
}): string {
  return `async (page) => {
  ${PUBLIC_PROBE_SHARED}
  let statusCode = 0;
  try {
    const response = await page.goto(${JSON.stringify(input.detailUrl)}, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    statusCode = response ? response.status() : 0;
    await settle();
    const heading = page.locator('[data-block-id="project-hero-heading"]');
    await heading.waitFor({ state: "visible", timeout: 10000 });
    const headingInfo = await visibleInfo(heading);
    const card = page.locator('[data-block-id="project-statistics-card-0"]');
    await card.waitFor({ state: "visible", timeout: 10000 });
    const cardInfo = await visibleInfo(card);
    await page.screenshot({ path: ${JSON.stringify(input.screenshotPath)}, fullPage: false });
    const pass =
      statusCode === 200 &&
      headingInfo.visible &&
      headingInfo.style !== null &&
      headingInfo.style.display !== "none" &&
      headingInfo.text === ${JSON.stringify(input.expectedTitle)} &&
      cardInfo.visible &&
      cardInfo.text.includes("Rooms") &&
      cardInfo.text.includes("4") &&
      consoleErrors.length === 0;
    return {
      scenario: "public-detail-converted",
      pass,
      message: pass
        ? "public detail renders bound hero title and feature-card stats"
        : JSON.stringify({ statusCode, headingInfo, cardInfo, consoleErrors }),
      screenshotPath: ${JSON.stringify(input.screenshotPath)},
      consoleErrors,
    };
  } catch (error) {
    return {
      scenario: "public-detail-converted",
      pass: false,
      message: error instanceof Error ? error.message : String(error),
      screenshotPath: ${JSON.stringify(input.screenshotPath)},
      consoleErrors,
    };
  }
}`;
}

export function buildPreviewTokenProbeSource(input: {
  readonly previewUrl: string;
  readonly marker: string;
  readonly screenshotPath: string;
}): string {
  return `async (page) => {
  ${PUBLIC_PROBE_SHARED}
  let statusCode = 0;
  try {
    const response = await page.goto(${JSON.stringify(input.previewUrl)}, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    statusCode = response ? response.status() : 0;
    await settle();
    const markerLocator = page.locator('text=${JSON.stringify(input.marker)}');
    await markerLocator.waitFor({ state: "visible", timeout: 10000 });
    const markerInfo = await visibleInfo(markerLocator.first());
    await page.screenshot({ path: ${JSON.stringify(input.screenshotPath)}, fullPage: false });
    const pass =
      statusCode === 200 &&
      markerInfo.visible &&
      markerInfo.text.includes(${JSON.stringify(input.marker)}) &&
      consoleErrors.length === 0;
    return {
      scenario: "preview-token",
      pass,
      message: pass
        ? "preview token renders the CURRENT draft v2 document"
        : JSON.stringify({ statusCode, markerInfo, consoleErrors }),
      screenshotPath: ${JSON.stringify(input.screenshotPath)},
      consoleErrors,
    };
  } catch (error) {
    return {
      scenario: "preview-token",
      pass: false,
      message: error instanceof Error ? error.message : String(error),
      screenshotPath: ${JSON.stringify(input.screenshotPath)},
      consoleErrors,
    };
  }
}`;
}

export function buildEditorRoundtripProbeSource(input: {
  readonly adminUrl: string;
  readonly editorUrl: string;
  readonly frontUrl: string;
  readonly detailUrl: string;
  readonly detailPageId: string;
  readonly runId: string;
  readonly lightScreenshotPath: string;
  readonly darkScreenshotPath: string;
  readonly publicScreenshotPath: string;
}): string {
  return `async (page) => {
  ${PUBLIC_PROBE_SHARED}
  let statusCode = 0;
  let stage = "editor-load";
  try {
    const editorResponse = await page.goto(${JSON.stringify(input.editorUrl)}, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    statusCode = editorResponse ? editorResponse.status() : 0;
    stage = "editor-canvas";
    await settle();
    const addSection = page.locator('[data-detail-template-add-section="content"]');
    await addSection.waitFor({ state: "visible", timeout: 20000 });
    stage = "add-section";
    const lightBodyBackground = await page
      .evaluate(() => window.getComputedStyle(document.body).backgroundColor)
      .catch(() => "");
    await addSection.click();
    const addedSection = page.locator(
      '[data-detail-template-section="l07-preview-' + ${JSON.stringify(input.runId)} + '"]'
    );
    await addedSection.waitFor({ state: "visible", timeout: 10000 });
    stage = "new-section";
    const sectionInfo = await visibleInfo(addedSection);
    const addBlockSelect = addedSection.locator('[data-detail-template-add-block]');
    await addBlockSelect.waitFor({ state: "visible", timeout: 10000 });
    stage = "block-select";
    await addBlockSelect.selectOption("heading");
    await page.screenshot({ path: ${JSON.stringify(input.lightScreenshotPath)}, fullPage: false });
    // Save the draft.
    stage = "save-draft";
    await page.getByRole("button", { name: "Save draft" }).click();
    await page
      .getByRole("button", { name: "Save draft" })
      .waitFor({ state: "visible", timeout: 15000 });
    await settle();
    // Dark mode: persist + reload, assert the editor canvas still renders and
    // the body background actually changes (visible effect, not just class).
    await page.evaluate(() => {
      window.localStorage.setItem("coderso-admin-color-mode", "dark");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    stage = "dark-reload";
    await settle();
    const darkClass = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    const darkAddSection = page.locator('[data-detail-template-add-section="content"]');
    await darkAddSection.waitFor({ state: "visible", timeout: 20000 });
    stage = "dark-canvas";
    const darkBodyBackground = await page
      .evaluate(() => window.getComputedStyle(document.body).backgroundColor)
      .catch(() => "");
    const darkSection = page.locator('[data-detail-template-section-type="content"]');
    await darkSection.first().waitFor({ state: "visible", timeout: 10000 });
    await page.screenshot({ path: ${JSON.stringify(input.darkScreenshotPath)}, fullPage: false });
    // Publish, then assert front parity. The editor can swallow a click while
    // an autosave mutation is in flight, so poll the record status and retry
    // the click (bounded) instead of trusting one click.
    let publishedStatus = "draft";
    for (let attempt = 0; attempt < 3 && publishedStatus !== "published"; attempt += 1) {
      await page.getByRole("button", { name: "Publish" }).first().click();
      await page.waitForTimeout(2500);
      publishedStatus = await page
        .evaluate(
          async (id) => {
            const res = await fetch("/admin/api/detail-pages/" + id);
            if (!res.ok) return "draft";
            const payload = await res.json();
            return typeof payload?.status === "string" ? payload.status : "draft";
          },
          ${JSON.stringify(input.detailPageId)}
        )
        .catch(() => "draft");
    }
    stage = "public-route";
    const publicResponse = await page.goto(${JSON.stringify(input.detailUrl)}, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    statusCode = publicResponse ? publicResponse.status() : statusCode;
    await settle();
    stage = "public-marker";
    const publicMarker = page
      .locator('text=L07-PREVIEW-ONLY-' + ${JSON.stringify(input.runId)})
      .first();
    await publicMarker.waitFor({ state: "visible", timeout: 15000 });
    const publicMarkerInfo = await visibleInfo(publicMarker);
    await page.screenshot({ path: ${JSON.stringify(input.publicScreenshotPath)}, fullPage: false });
    const benignPlaceholderHosts = [/cdn\\.example\\.com/];
    const benignFailureCount = failedRequests.filter(
      (entry) =>
        benignPlaceholderHosts.some((pattern) => pattern.test(entry.url)) &&
        (entry.error === "net::ERR_NAME_NOT_RESOLVED" || entry.error === undefined)
    ).length;
    const nonBenignFailureCount = failedRequests.length - benignFailureCount;
    const unexpectedConsoleErrors = consoleErrors.filter((message) => {
      if (!message.startsWith("Failed to load resource")) return true;
      // A console "Failed to load resource" message does not carry the URL, so
      // only exonerate it when EVERY failed request is a known benign
      // placeholder resource. Any non-benign failure keeps the gate strict.
      return nonBenignFailureCount > 0;
    });
    const pass =
      editorResponse !== null &&
      sectionInfo.visible &&
      darkClass &&
      darkBodyBackground !== lightBodyBackground &&
      darkBodyBackground.length > 0 &&
      publishedStatus === "published" &&
      publicMarkerInfo.visible &&
      publicMarkerInfo.text.includes("L07-PREVIEW-ONLY-" + ${JSON.stringify(input.runId)}) &&
      unexpectedConsoleErrors.length === 0;
    return {
      scenario: "editor-roundtrip",
      pass,
      message: pass
        ? "editor add-section+block, save, dark mode, publish, and front parity hold"
        : JSON.stringify({
            statusCode,
            publishedStatus,
            sectionInfo,
            darkClass,
            lightBodyBackground,
            darkBodyBackground,
            publicMarkerInfo,
            consoleErrors,
            failedRequests,
            unexpectedConsoleErrors,
          }),
      screenshotPath: ${JSON.stringify(input.publicScreenshotPath)},
      consoleErrors,
    };
  } catch (error) {
    const bodySnippet = await page
      .evaluate(() => (document.body.innerText || "").replace(/\\s+/g, " ").slice(0, 220))
      .catch(() => "");
    const detail =
      error instanceof Error
        ? \`\${error.message} :: \${(error.stack ?? "").split("\\n").slice(1, 3).join(" | ")}\`
        : String(error);
    return {
      scenario: "editor-roundtrip",
      pass: false,
      message: \`stage=\${stage} body=\${bodySnippet} :: \${detail}\`,
      screenshotPath: ${JSON.stringify(input.publicScreenshotPath)},
      consoleErrors,
    };
  }
}`;
}

export function buildLegacyPlaceholderProbeSource(input: {
  readonly frontUrl: string;
  readonly detailUrl: string;
  readonly marker: string;
  readonly screenshotPath: string;
}): string {
  return `async (page) => {
  ${PUBLIC_PROBE_SHARED}
  let statusCode = 0;
  try {
    const response = await page.goto(${JSON.stringify(input.detailUrl)}, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    statusCode = response ? response.status() : 0;
    await settle();
    const placeholder = page.locator('[data-legacy-widget="booking-calendar"]');
    await placeholder.waitFor({ state: "visible", timeout: 10000 });
    const placeholderInfo = await visibleInfo(placeholder.first());
    const bodyText = await page
      .evaluate(() => (document.body.innerText || "").replace(/\\s+/g, " "))
      .catch(() => "");
    const rawDataAbsent = !bodyText.includes(${JSON.stringify(input.marker)}) &&
      !bodyText.includes("demo-cal-7");
    await page.screenshot({ path: ${JSON.stringify(input.screenshotPath)}, fullPage: false });
    const pass =
      statusCode === 200 &&
      placeholderInfo.visible &&
      placeholderInfo.style !== null &&
      placeholderInfo.style.display !== "none" &&
      rawDataAbsent &&
      consoleErrors.length === 0;
    return {
      scenario: "legacy-placeholder",
      pass,
      message: pass
        ? "legacy placeholder renders read-only and raw widget data is absent"
        : JSON.stringify({ statusCode, placeholderInfo, rawDataAbsent, consoleErrors }),
      screenshotPath: ${JSON.stringify(input.screenshotPath)},
      consoleErrors,
    };
  } catch (error) {
    return {
      scenario: "legacy-placeholder",
      pass: false,
      message: error instanceof Error ? error.message : String(error),
      screenshotPath: ${JSON.stringify(input.screenshotPath)},
      consoleErrors,
    };
  }
}`;
}

export function buildAssistantGeneratedProbeSource(input: {
  readonly frontUrl: string;
  readonly detailUrl: string;
  readonly expectedTitle: string;
  readonly screenshotPath: string;
}): string {
  return `async (page) => {
  ${PUBLIC_PROBE_SHARED}
  let statusCode = 0;
  try {
    const response = await page.goto(${JSON.stringify(input.detailUrl)}, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    statusCode = response ? response.status() : 0;
    await settle();
    const heading = page.locator(
      '[data-block-id="house-projects-catalog-detail-hero-heading"]'
    );
    await heading.waitFor({ state: "visible", timeout: 10000 });
    const headingInfo = await visibleInfo(heading);
    await page.screenshot({ path: ${JSON.stringify(input.screenshotPath)}, fullPage: false });
    const pass =
      statusCode === 200 &&
      headingInfo.visible &&
      headingInfo.style !== null &&
      headingInfo.style.display !== "none" &&
      headingInfo.text === ${JSON.stringify(input.expectedTitle)} &&
      consoleErrors.length === 0;
    return {
      scenario: "assistant-generated",
      pass,
      message: pass
        ? "catalog-family blueprint detail page renders the bound entry title in the hero"
        : JSON.stringify({ statusCode, headingInfo, consoleErrors }),
      screenshotPath: ${JSON.stringify(input.screenshotPath)},
      consoleErrors,
    };
  } catch (error) {
    return {
      scenario: "assistant-generated",
      pass: false,
      message: error instanceof Error ? error.message : String(error),
      screenshotPath: ${JSON.stringify(input.screenshotPath)},
      consoleErrors,
    };
  }
}`;
}

export function buildDetailPageV2PlanFilter(plan: {
  actions: readonly { type: string }[];
}): { type: string }[] {
  const allowed = new Set([
    "content-type.upsert",
    "detail-page.upsert",
    "setting.content-route.upsert",
  ]);
  return plan.actions.filter((action) => allowed.has(action.type)).map((action) => action);
}
