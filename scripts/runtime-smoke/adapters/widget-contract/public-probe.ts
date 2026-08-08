import { SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import {
  APPROVED_INTENTIONAL_OVERFLOW_SELECTORS,
  isRecord,
  type PublicWidgetResult,
  type WidgetSmokeCase,
} from "./contracts";
import { runWidgetBrowserProbe } from "./browser-session";
import { resolvePlaywrightCliSessionName, resolveWidgetProbeSession } from "./environment";

const DEFAULT_FRONT_URL = "http://localhost:3000";
const GALLERY_PUBLIC_PATH = "/gallery-mosaic-test-0516";

export interface WidgetPublicProbeProof {
  readonly statusCode: 200;
  readonly galleryRootCount: number;
  readonly rootVisible: true;
  readonly consoleErrorCount: 0;
  readonly pageErrorCount: 0;
}

export function buildPublicProbeCode(
  frontUrl: string,
  cases: WidgetSmokeCase[],
  screenshotDir: string
) {
  return `async (page) => {
  const frontUrl = ${JSON.stringify(frontUrl.replace(/\/$/, ""))};
  const cases = ${JSON.stringify(cases)};
  const screenshotDir = ${JSON.stringify(screenshotDir)};
  const approvedIntentionalOverflowSelectors = ${JSON.stringify(APPROVED_INTENTIONAL_OVERFLOW_SELECTORS)};
  let consoleErrorCount = 0;
  let pageErrorCount = 0;
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrorCount += 1;
  });
  page.on("pageerror", () => {
    pageErrorCount += 1;
  });
  const results = [];
  async function settle() {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  }
  function shouldCaptureScreenshot(item) {
    const checks = Array.isArray(item.cssChecks) ? item.cssChecks : [];
    return Boolean(item.priority) || checks.includes("card-overflow") || checks.includes("empty-fixture");
  }
  function safeScreenshotName(widgetType) {
    return String(widgetType).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  }
  for (const item of cases) {
    const consoleErrorsBefore = consoleErrorCount;
    const pageErrorsBefore = pageErrorCount;
    if (!item.publicPath) {
      results.push({ widgetType: item.widgetType, status: "fixture-gap", publicPath: item.publicPath || null, error: "public_fixture_missing" });
      continue;
    }
    const url = frontUrl + item.publicPath;
    let response = null;
    try {
      response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const overflow = await page.evaluate(({ widgetType, approvedIntentionalOverflowSelectors }) => {
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        function hasApprovedIntentionalOverflowAncestor(element) {
          const intentional = element.closest('[data-overflow-intentional="true"]');
          if (!intentional) return false;
          const selectors = approvedIntentionalOverflowSelectors[String(widgetType)] || [];
          return selectors.some((selector) => {
            try {
              return intentional.matches(selector) || Boolean(intentional.querySelector(selector));
            } catch {
              return false;
            }
          });
        }
        const unmarkedOverflowOwners = Array.from(document.body.querySelectorAll("*"))
          .filter((element) => {
            if (!(element instanceof HTMLElement)) return false;
            if (hasApprovedIntentionalOverflowAncestor(element)) return false;
            if (element.closest('[aria-hidden="true"], [hidden]')) return false;
            if (element.getAttribute("aria-hidden") === "true" || element.hidden) return false;
            const className = typeof element.className === "string" ? element.className : "";
            if (/\\bsr-only\\b/.test(className)) return false;
            const style = window.getComputedStyle(element);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const rect = element.getBoundingClientRect();
            if (rect.width <= 1 || rect.height <= 1) return false;
            if (style.clip === "rect(0px, 0px, 0px, 0px)" || style.clipPath === "inset(50%)") return false;
            return element.scrollWidth > element.clientWidth + 1 && element.clientWidth > 0;
          })
          .slice(0, 12)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: element.className ? String(element.className).slice(0, 180) : "",
            text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 120),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          }));
        return {
          bodyOverflow: documentWidth > viewportWidth + 1,
          viewportWidth,
          documentWidth,
          unmarkedOverflowOwners,
        };
      }, { widgetType: item.widgetType, approvedIntentionalOverflowSelectors });
      const emptyFixture = await page.evaluate((checks) => {
        if (!Array.isArray(checks) || !checks.includes("empty-fixture")) return false;
        const text = (document.body.innerText || "").replace(/\\s+/g, " ").trim();
        const emptyTextPatterns = [
          /empty stack/i,
          /no items found/i,
          /no products found/i,
          /no products to compare/i,
          /brak produkt/i,
          /nothing to show/i,
          /no entries/i
        ];
        return emptyTextPatterns.some((pattern) => pattern.test(text));
      }, item.cssChecks || []);
      let screenshotPath = undefined;
      if (shouldCaptureScreenshot(item)) {
        screenshotPath = screenshotDir + "/public-" + safeScreenshotName(item.widgetType) + ".png";
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      }
      const statusCode = response ? response.status() : null;
      const checks = Array.isArray(item.cssChecks) ? item.cssChecks : [];
      const hasHttpFailure = !statusCode || statusCode < 200 || statusCode >= 400;
      const hasBodyOverflowFailure = checks.includes("body-overflow") && overflow.bodyOverflow && overflow.unmarkedOverflowOwners.length > 0;
      const hasCardOverflowFailure = checks.includes("card-overflow") && overflow.unmarkedOverflowOwners.length > 0;
      const itemConsoleErrorCount = consoleErrorCount - consoleErrorsBefore;
      const itemPageErrorCount = pageErrorCount - pageErrorsBefore;
      const hasBrowserError = itemConsoleErrorCount > 0 || itemPageErrorCount > 0;
      const status = emptyFixture
        ? "fixture-gap"
        : !hasHttpFailure && !hasBodyOverflowFailure && !hasCardOverflowFailure && !hasBrowserError
          ? "passed"
          : "failed";
      const error = emptyFixture
        ? "public_fixture_empty"
        : hasHttpFailure
          ? "public_http_failed"
          : hasBodyOverflowFailure
            ? "body_overflow_unmarked"
            : hasCardOverflowFailure
              ? "card_overflow_unmarked"
              : hasBrowserError
                ? "public_browser_error"
              : undefined;
      results.push({ widgetType: item.widgetType, publicPath: item.publicPath, statusCode, status, emptyFixture, screenshotPath, ...overflow, consoleErrorCount: itemConsoleErrorCount, pageErrorCount: itemPageErrorCount, error });
    } catch (error) {
      results.push({ widgetType: item.widgetType, publicPath: item.publicPath, status: "failed", statusCode: response ? response.status() : null, consoleErrorCount: consoleErrorCount - consoleErrorsBefore, pageErrorCount: pageErrorCount - pageErrorsBefore, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return JSON.stringify({ results });
}`;
}

function validatePublicResults(value: unknown): PublicWidgetResult[] {
  if (
    !isRecord(value) ||
    !Array.isArray(value.results) ||
    value.results.some(
      (result) =>
        !isRecord(result) ||
        typeof result.widgetType !== "string" ||
        !new Set(["passed", "failed", "fixture-gap", "metadata-gap", "skipped"]).has(
          String(result.status)
        )
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "widget public probe output is invalid");
  }
  return value.results as PublicWidgetResult[];
}

export async function runPublicProbe(input: {
  readonly context: RuntimeSmokeContext;
  readonly workspace: string;
  readonly screenshotDirectory: string;
  readonly baseSession: string;
  readonly frontUrl: string;
  readonly cases: WidgetSmokeCase[];
}): Promise<{ readonly results: PublicWidgetResult[]; readonly elapsedMs: number }> {
  const result = await runWidgetBrowserProbe({
    context: input.context,
    session: resolvePlaywrightCliSessionName(input.baseSession),
    workspace: input.workspace,
    segmentId: "public-contract",
    source: buildPublicProbeCode(input.frontUrl, input.cases, input.screenshotDirectory),
  });
  return Object.freeze({
    results: validatePublicResults(result.output),
    elapsedMs: result.elapsedMs,
  });
}

export function buildWidgetPublicProbeSource(frontUrl = DEFAULT_FRONT_URL): string {
  const galleryUrl = `${frontUrl.replace(/\/$/u, "")}${GALLERY_PUBLIC_PATH}`;
  return `async (page) => {
    let consoleErrorCount = 0;
    let pageErrorCount = 0;
    const onConsole = (message) => {
      if (message.type() === "error") consoleErrorCount += 1;
    };
    const onPageError = () => {
      pageErrorCount += 1;
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    try {
      const response = await page.goto(${JSON.stringify(galleryUrl)}, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      const roots = page.locator('[data-widget-type="gallery-mosaic"] [data-gallery-mosaic-count]');
      const galleryRootCount = await roots.count();
      const rootVisible = galleryRootCount > 0 && await roots.first().isVisible();
      return {
        statusCode: response ? response.status() : null,
        galleryRootCount,
        rootVisible,
        consoleErrorCount,
        pageErrorCount,
      };
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
  }`;
}

export function validateWidgetPublicProbe(value: unknown): WidgetPublicProbeProof {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !==
      "consoleErrorCount,galleryRootCount,pageErrorCount,rootVisible,statusCode" ||
    value.statusCode !== 200 ||
    !Number.isSafeInteger(value.galleryRootCount) ||
    (value.galleryRootCount as number) <= 0 ||
    (value.galleryRootCount as number) > 16 ||
    value.rootVisible !== true ||
    value.consoleErrorCount !== 0 ||
    value.pageErrorCount !== 0
  ) {
    throw new SmokeError("smoke_output_invalid", "widget public error probe failed");
  }
  return Object.freeze(value) as unknown as WidgetPublicProbeProof;
}

export async function runFocusedPublicProbe(input: {
  readonly context: RuntimeSmokeContext;
  readonly workspace: string;
  readonly baseSession: string;
  readonly frontUrl?: string;
}): Promise<{ readonly proof: WidgetPublicProbeProof; readonly elapsedMs: number }> {
  const result = await runWidgetBrowserProbe({
    context: input.context,
    session: resolveWidgetProbeSession(input.baseSession),
    workspace: input.workspace,
    segmentId: "gallery-public-error-probe",
    source: buildWidgetPublicProbeSource(input.frontUrl),
  });
  return Object.freeze({
    proof: validateWidgetPublicProbe(result.output),
    elapsedMs: result.elapsedMs,
  });
}
