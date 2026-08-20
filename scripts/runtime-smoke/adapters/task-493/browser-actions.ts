import { SmokeError } from "../../contracts";
import type { PlainJsonObject } from "../../workers/contracts";

/**
 * TASK-493 browser-action contract: scenario descriptors, viewport/theme
 * variants, the materialized Playwright sources, and the strict receipt
 * validator. Modeled on the task-554 suite: one shared Playwright page, one
 * isolated run-code action per fixture, per-scenario console/page-error
 * witnesses, and visible-effect assertions (never mere control presence).
 */

export const TASK493_SCENARIO_IDS = Object.freeze([
  "sitemap-xml-served",
  "robots-txt-sitemap-directive",
  "seo-overview-real-data",
  "sitemap-submit-status",
  "indexed-pages-sync",
  "search-performance-read",
  "seo-manager-fifth-card",
] as const);

export type Task493ScenarioId = (typeof TASK493_SCENARIO_IDS)[number];
/**
 * Viewer scenarios exercise the read surfaces (content:read), manager
 * scenarios exercise the write surfaces (settings:write). Both authenticate
 * as the environment-seeded admin; the split keeps the storage-state load
 * pattern identical to task-554 and leaves RBAC differentiation possible.
 */
export type Task493ActorKind = "viewer" | "manager";
export type Task493VariantId =
  "light-1440x900" | "dark-1440x900" | "light-390x844" | "dark-390x844";

export interface Task493Variant {
  readonly id: Task493VariantId;
  readonly colorScheme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: 1440 | 390; readonly height: 900 | 844 }>;
}

export interface Task493ScenarioDescriptor {
  readonly id: Task493ScenarioId;
  readonly actor: Task493ActorKind;
  /** HTTP method the scenario's primary request uses. */
  readonly requestMethod: "GET" | "POST";
  /** The primary status the real flow must return when GSC is unconfigured. */
  readonly unconfiguredStatus: 200 | 409;
  /** true when the scenario is a GSC write that must degrade gracefully. */
  readonly gscWrite: boolean;
  readonly metadata: PlainJsonObject;
  readonly canonicalVariant: "light-1440x900";
}

export interface Task493FixtureSpec {
  readonly scenarioId: Task493ScenarioId;
  readonly variantId: Task493VariantId;
}

export interface Task493BrowserFixture {
  readonly scenarioId: Task493ScenarioId;
  readonly variantId: Task493VariantId;
  readonly url: string;
}

export interface Task493BrowserReceipt {
  readonly scenarioId: string;
  readonly fixtureUrl: string;
  readonly variantId: string;
  readonly responseStatus: number;
  readonly requestMethod: string;
  readonly contentType: string;
  readonly bodyPrefix: string;
  readonly urlCount: number;
  readonly bodyIncludes: boolean;
  readonly outcome: "read" | "configured" | "unconfigured";
  readonly cardVisible: boolean;
  readonly cardValue: string;
  readonly cardLabel: string;
  readonly cardMatchesOverview: boolean;
  readonly statusRowRendered: boolean;
  readonly colorScheme: string;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
}

export const TASK493_VARIANTS = Object.freeze([
  Object.freeze({
    id: "light-1440x900",
    colorScheme: "light",
    viewport: Object.freeze({ width: 1440, height: 900 }),
  }),
  Object.freeze({
    id: "dark-1440x900",
    colorScheme: "dark",
    viewport: Object.freeze({ width: 1440, height: 900 }),
  }),
  Object.freeze({
    id: "light-390x844",
    colorScheme: "light",
    viewport: Object.freeze({ width: 390, height: 844 }),
  }),
  Object.freeze({
    id: "dark-390x844",
    colorScheme: "dark",
    viewport: Object.freeze({ width: 390, height: 844 }),
  }),
] as const satisfies readonly Task493Variant[]);

export const TASK493_SCENARIOS = Object.freeze([
  Object.freeze({
    id: "sitemap-xml-served",
    actor: "viewer",
    requestMethod: "GET",
    unconfiguredStatus: 200,
    gscWrite: false,
    metadata: Object.freeze({ kind: "public-sitemap" }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "robots-txt-sitemap-directive",
    actor: "viewer",
    requestMethod: "GET",
    unconfiguredStatus: 200,
    gscWrite: false,
    metadata: Object.freeze({ kind: "public-robots" }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "seo-overview-real-data",
    actor: "viewer",
    requestMethod: "GET",
    unconfiguredStatus: 200,
    gscWrite: false,
    metadata: Object.freeze({ kind: "overview-read" }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "sitemap-submit-status",
    actor: "manager",
    requestMethod: "POST",
    unconfiguredStatus: 409,
    gscWrite: true,
    metadata: Object.freeze({ kind: "sitemap-submit" }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "indexed-pages-sync",
    actor: "manager",
    requestMethod: "POST",
    unconfiguredStatus: 409,
    gscWrite: true,
    metadata: Object.freeze({ kind: "search-performance-sync" }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "search-performance-read",
    actor: "viewer",
    requestMethod: "GET",
    unconfiguredStatus: 200,
    gscWrite: false,
    metadata: Object.freeze({ kind: "search-performance-read" }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "seo-manager-fifth-card",
    actor: "viewer",
    requestMethod: "GET",
    unconfiguredStatus: 200,
    gscWrite: false,
    metadata: Object.freeze({ kind: "admin-fifth-card" }),
    canonicalVariant: "light-1440x900",
  }),
] as const satisfies readonly Task493ScenarioDescriptor[]);

const byScenario = new Map(TASK493_SCENARIOS.map((descriptor) => [descriptor.id, descriptor]));

export function task493ScenarioDescriptor(id: string): Task493ScenarioDescriptor {
  const descriptor = byScenario.get(id as Task493ScenarioId);
  if (descriptor === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 scenario is not registered");
  }
  return descriptor;
}

export function task493VariantsFor(
  profile: "fast" | "certification",
  scenarioId: Task493ScenarioId
): readonly Task493Variant[] {
  if (profile === "certification") return TASK493_VARIANTS;
  if (profile !== "fast") {
    throw new SmokeError("smoke_argument_invalid", "TASK-493 profile is unsupported");
  }
  const ordinal = TASK493_SCENARIO_IDS.indexOf(scenarioId);
  if (ordinal < 0)
    throw new SmokeError("smoke_output_invalid", "TASK-493 scenario is not registered");
  return Object.freeze([TASK493_VARIANTS[ordinal % TASK493_VARIANTS.length]!]);
}

export function buildTask493FixtureSpecs(
  profile: "fast" | "certification"
): readonly Task493FixtureSpec[] {
  return Object.freeze(
    TASK493_SCENARIOS.flatMap((descriptor) =>
      task493VariantsFor(profile, descriptor.id).map((variant) =>
        Object.freeze({
          scenarioId: descriptor.id,
          variantId: variant.id,
        })
      )
    )
  );
}

const RUN_MARKER = /^[a-f0-9]{12,32}$/u;

/**
 * The synthetic fixture URL that the SEO read models expose. The marker
 * prefix guarantees the fixture rows are never part of the real published
 * sitemap (noindex/unpublished exclusion proof) and gives the DB cleanup a
 * uniquely owned delete scope.
 */
export function task493FixtureUrl(runMarker: string, spec: Task493FixtureSpec): string {
  if (!RUN_MARKER.test(runMarker)) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 run marker is invalid");
  }
  const url = `http://127.0.0.1:3000/task493-${runMarker}-${spec.scenarioId}-${spec.variantId}.xml`;
  if (!/^http:\/\/127\.0\.0\.1:3000\/task493-/u.test(url)) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 fixture URL drifted");
  }
  return url;
}

/** Own-origin sitemap path used by the GSC submit POST (must stay relative). */
export function task493FixtureSitemapPath(runMarker: string, spec: Task493FixtureSpec): string {
  if (!RUN_MARKER.test(runMarker)) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 run marker is invalid");
  }
  const path = `/task493-${runMarker}-${spec.scenarioId}-${spec.variantId}.xml`;
  if (!path.startsWith("/") || path.includes("..")) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 fixture sitemap path drifted");
  }
  return path;
}

function encoded(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

export interface Task493BrowserActionConfig {
  readonly scenarioId: Task493ScenarioId;
  readonly fixtureUrl: string;
  readonly variant: Task493Variant;
  readonly fixtureSitemapPath: string;
  readonly minIndexedPages: number;
  readonly minImpressions: number;
  readonly screenshotPath: string | null;
}

/**
 * Materialize one Playwright run-code source that proves a REAL SEO flow with
 * visible-effect assertions. Public scenarios assert the served document
 * (XML urlset, robots directive); admin scenarios assert authenticated API
 * paths and the rendered fifth "Indexed pages" StatCard value with computed
 * style proof. Console/page errors are witnessed; expected 409 (GSC
 * unconfigured) and shared auth 429 resource errors are tolerated only where
 * they are the documented outcome.
 */
/**
 * Materialize one Playwright run-code source that proves a REAL SEO flow with
 * visible-effect assertions. Public scenarios assert the served document
 * (XML urlset, robots directive); admin scenarios assert authenticated API
 * paths and the rendered fifth "Indexed pages" StatCard value with computed
 * style proof. Console/page errors are witnessed; expected 409 (GSC
 * unconfigured) and shared auth 429 resource errors are tolerated only where
 * they are the documented outcome. Every page.evaluate callback is fully
 * self-contained: the browser context cannot see Node-side closures, so all
 * fetch/CSRF logic is inlined inside the evaluated function.
 */
export function materializeTask493BrowserAction(config: Task493BrowserActionConfig): string {
  const descriptor = task493ScenarioDescriptor(config.scenarioId);
  if (
    config.fixtureUrl.length === 0 ||
    !/^http:\/\/127\.0\.0\.1:3000\/task493-/u.test(config.fixtureUrl) ||
    !config.fixtureSitemapPath.startsWith("/") ||
    config.fixtureSitemapPath.includes("..") ||
    config.minIndexedPages <= 0 ||
    config.minImpressions <= 0 ||
    (config.screenshotPath !== null &&
      (!config.screenshotPath.endsWith(".png") || config.screenshotPath.includes("..")))
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 browser action materialization drifted");
  }
  const cfg = encoded({
    scenarioId: config.scenarioId,
    fixtureUrl: config.fixtureUrl,
    variant: config.variant,
    fixtureSitemapPath: config.fixtureSitemapPath,
    minIndexedPages: config.minIndexedPages,
    minImpressions: config.minImpressions,
    screenshotPath: config.screenshotPath,
    gscWrite: descriptor.gscWrite,
    requestMethod: descriptor.requestMethod,
  });
  return `async (page) => {
    const cfg = ${cfg};
    const consoleErrors = [];
    const pageErrors = [];
    const onConsole = (message) => {
      if (message.type() !== "error") return;
      const text = message.text().slice(0, 512);
      // The GSC-unconfigured write returns the documented 409; the browser
      // logs it as a resource error, which is the expected outcome for the
      // submit/sync scenarios. Shared admin auth rate-limit 429 resource
      // errors are tolerated across the suite; the status assertions still
      // fail closed on any other console error.
      if (/Failed to load resource: the server responded with a status of 409/.test(text) && cfg.gscWrite) return;
      if (/Failed to load resource: the server responded with a status of 429/.test(text)) return;
      consoleErrors.push(text);
    };
    const onPageError = (error) => pageErrors.push(String(error?.message ?? "pageerror").slice(0, 512));
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    const assertVisibleCard = (value) => {
      if (
        value === null ||
        typeof value !== "object" ||
        value.label !== "Indexed pages" ||
        value.value === "" ||
        !value.visible ||
        value.fontSize === "" ||
        value.fontSize === "0px" ||
        Number.parseFloat(value.fontSize) <= 0 ||
        value.fontWeight === "" ||
        Number.parseInt(value.fontWeight, 10) < 400
      ) {
        throw new Error("task493_visible_indexed_card");
      }
      return value;
    };
    const readStatCard = () => page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("*"));
      const labelNode = nodes.find((node) => {
        const directText = Array.from(node.childNodes)
          .filter((child) => child.nodeType === 3)
          .map((child) => (child.textContent ?? "").trim())
          .filter(Boolean);
        return directText.length === 1 && directText[0] === "Indexed pages";
      });
      if (labelNode === undefined) return null;
      let card = labelNode.parentElement;
      while (card !== null && (card.querySelector === undefined || card.querySelector(".font-display") === null)) card = card.parentElement;
      if (card === null) return null;
      const valueNode = card.querySelector(".font-display");
      if (valueNode === null) return null;
      const styles = getComputedStyle(valueNode);
      return {
        label: "Indexed pages",
        value: (valueNode.textContent ?? "").trim(),
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        visible: valueNode.getClientRects().length > 0,
      };
    });
    try {
      await page.emulateMedia({ colorScheme: cfg.variant.colorScheme });
      await page.setViewportSize(cfg.variant.viewport);
      const receipt = {
        scenarioId: cfg.scenarioId,
        fixtureUrl: cfg.fixtureUrl,
        variantId: cfg.variant.id,
        responseStatus: 0,
        requestMethod: cfg.requestMethod,
        contentType: "",
        bodyPrefix: "",
        urlCount: 0,
        bodyIncludes: false,
        outcome: "read",
        cardVisible: false,
        cardValue: "",
        cardLabel: "",
        cardMatchesOverview: false,
        statusRowRendered: false,
        colorScheme: "light",
        consoleErrors,
        pageErrors,
      };
      if (cfg.scenarioId === "sitemap-xml-served") {
        const response = await page.goto("http://127.0.0.1:3000/sitemap.xml", { waitUntil: "domcontentloaded", timeout: 60000 });
        if (response === null) throw new Error("task493_sitemap_no_response");
        const documentProof = await page.evaluate(() => {
          const root = document.documentElement;
          // Chromium renders application/xml inside its XML viewer: the
          // document root is an <html> wrapper and the real <urlset> element
          // is a child. Resolve the urlset element directly and serialize it
          // so the proof reflects the served sitemap document.
          const urlset = root !== null ? root.querySelector("urlset") : null;
          const source =
            urlset !== null
              ? new XMLSerializer().serializeToString(urlset)
              : root !== null && typeof root.outerHTML === "string"
                ? root.outerHTML
                : "";
          return {
            tag: urlset !== null ? urlset.tagName : root !== null ? root.tagName : "",
            prefix: source.slice(0, 160),
            urlCount: root !== null && root.querySelectorAll !== undefined ? root.querySelectorAll("url").length : 0,
            includes: source.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"') && source.includes("<url>") && !source.includes("<loc>http://127.0.0.1:3000/task493-"),
          };
        });
        receipt.responseStatus = response.status();
        receipt.contentType = response.headers()["content-type"] ?? "";
        receipt.bodyPrefix = documentProof.prefix;
        receipt.urlCount = documentProof.urlCount;
        receipt.bodyIncludes = documentProof.tag === "urlset" && documentProof.includes;
        if (receipt.responseStatus !== 200 || receipt.urlCount < 1 || !receipt.bodyIncludes) throw new Error("task493_sitemap_document");
      } else if (cfg.scenarioId === "robots-txt-sitemap-directive") {
        const response = await page.goto("http://127.0.0.1:3000/robots.txt", { waitUntil: "domcontentloaded", timeout: 60000 });
        if (response === null) throw new Error("task493_robots_no_response");
        const bodyText = await page.evaluate(() => (document.body ? document.body.innerText : ""));
        receipt.responseStatus = response.status();
        receipt.contentType = response.headers()["content-type"] ?? "";
        receipt.bodyPrefix = bodyText.slice(0, 160);
        receipt.bodyIncludes =
          bodyText.includes("User-agent: *") &&
          bodyText.includes("Allow: /") &&
          bodyText.includes("Sitemap: http://127.0.0.1:3000/sitemap.xml");
        if (receipt.responseStatus !== 200 || !receipt.bodyIncludes) throw new Error("task493_robots_directive");
      } else {
        await page.goto("http://127.0.0.1:5173/admin/seo", { waitUntil: "domcontentloaded", timeout: 60000 });
        const statRow = page.getByText("Indexed pages", { exact: true });
        await statRow.waitFor({ state: "visible", timeout: 90000 });
        if ((await statRow.count()) !== 1) throw new Error("task493_indexed_card_missing");
        if (cfg.scenarioId === "seo-overview-real-data") {
          const overview = await page.evaluate(async () => {
            const response = await fetch("/admin/api/seo/overview", { credentials: "include" });
            const full = await response.text();
            return { status: response.status, contentType: response.headers.get("content-type") ?? "", full: full.slice(0, 16384) };
          });
          receipt.responseStatus = overview.status;
          receipt.contentType = overview.contentType;
          receipt.bodyPrefix = overview.full.slice(0, 160);
          let parsed = null;
          try { parsed = JSON.parse(overview.full); } catch { parsed = null; }
          receipt.urlCount = parsed !== null && Number.isSafeInteger(parsed.indexedPages) ? parsed.indexedPages : 0;
          receipt.bodyIncludes = parsed !== null && typeof parsed.sitemap === "object" && parsed.sitemap !== null;
          if (receipt.responseStatus !== 200 || receipt.urlCount < cfg.minIndexedPages || !receipt.bodyIncludes) throw new Error("task493_overview_real_data");
        } else if (cfg.scenarioId === "sitemap-submit-status") {
          const submitted = await page.evaluate(async ({ path, body }) => {
            const csrfResponse = await fetch("/admin/api/auth/csrf", { credentials: "include" });
            const csrf = await csrfResponse.json();
            if (!csrfResponse.ok || csrf === null || typeof csrf !== "object" || typeof csrf.token !== "string" || csrf.token.length === 0) throw new Error("task493_csrf_token_unavailable");
            const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.token }, credentials: "include", body: JSON.stringify(body ?? {}) });
            const full = await response.text();
            return { status: response.status, contentType: response.headers.get("content-type") ?? "", full: full.slice(0, 16384) };
          }, { path: "/admin/api/seo/sitemap/submit", body: { sitemapPath: cfg.fixtureSitemapPath } });
          receipt.responseStatus = submitted.status;
          receipt.contentType = submitted.contentType;
          receipt.bodyPrefix = submitted.full.slice(0, 160);
          if (submitted.status === 409) {
            receipt.outcome = "unconfigured";
            receipt.bodyIncludes = submitted.full.includes("gsc_not_configured");
          } else if (submitted.status >= 200 && submitted.status < 300) {
            receipt.outcome = "configured";
            receipt.bodyIncludes = submitted.full.includes("submitted") || submitted.full.includes("sitemapUrl");
          } else {
            throw new Error("task493_sitemap_submit_unexpected_status");
          }
          if (!receipt.bodyIncludes) throw new Error("task493_sitemap_submit_body");
          const statusRows = await page.evaluate(async (path) => {
            const response = await fetch(path, { credentials: "include" });
            const full = await response.text();
            return { status: response.status, full: full.slice(0, 16384) };
          }, "/admin/api/seo/sitemap");
          receipt.statusRowRendered = statusRows.status === 200 && statusRows.full.includes(cfg.fixtureSitemapPath);
          if (!receipt.statusRowRendered) throw new Error("task493_sitemap_status_row");
        } else if (cfg.scenarioId === "indexed-pages-sync") {
          const synced = await page.evaluate(async ({ startDate, endDate }) => {
            const csrfResponse = await fetch("/admin/api/auth/csrf", { credentials: "include" });
            const csrf = await csrfResponse.json();
            if (!csrfResponse.ok || csrf === null || typeof csrf !== "object" || typeof csrf.token !== "string" || csrf.token.length === 0) throw new Error("task493_csrf_token_unavailable");
            const response = await fetch("/admin/api/seo/search-performance/sync", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.token }, credentials: "include", body: JSON.stringify({ startDate, endDate }) });
            const full = await response.text();
            return { status: response.status, contentType: response.headers.get("content-type") ?? "", full: full.slice(0, 16384) };
          }, { startDate: "2026-08-01", endDate: "2026-08-19" });
          receipt.responseStatus = synced.status;
          receipt.contentType = synced.contentType;
          receipt.bodyPrefix = synced.full.slice(0, 160);
          if (synced.status === 409) {
            receipt.outcome = "unconfigured";
            receipt.bodyIncludes = synced.full.includes("gsc_not_configured");
          } else if (synced.status >= 200 && synced.status < 300) {
            receipt.outcome = "configured";
            receipt.bodyIncludes = synced.full.includes("metrics") || synced.full.includes("inspected");
          } else {
            throw new Error("task493_sync_unexpected_status");
          }
          if (!receipt.bodyIncludes) throw new Error("task493_sync_body");
        } else if (cfg.scenarioId === "search-performance-read") {
          const performance = await page.evaluate(async (path) => {
            const response = await fetch(path, { credentials: "include" });
            const full = await response.text();
            return { status: response.status, contentType: response.headers.get("content-type") ?? "", full: full.slice(0, 16384) };
          }, "/admin/api/seo/search-performance?limit=5");
          receipt.responseStatus = performance.status;
          receipt.contentType = performance.contentType;
          receipt.bodyPrefix = performance.full.slice(0, 160);
          let parsed = null;
          try { parsed = JSON.parse(performance.full); } catch { parsed = null; }
          receipt.urlCount = parsed !== null && parsed.totals !== null && typeof parsed.totals === "object" && Number.isSafeInteger(parsed.totals.totalImpressions) ? parsed.totals.totalImpressions : 0;
          receipt.bodyIncludes = parsed !== null && Array.isArray(parsed.topQueries);
          if (receipt.responseStatus !== 200 || receipt.urlCount < cfg.minImpressions || !receipt.bodyIncludes) throw new Error("task493_search_performance_read");
        } else if (cfg.scenarioId === "seo-manager-fifth-card") {
          // The SeoManagerPage reads the overview through the browser-side
          // read-through cache ("seo:overview", 5 min TTL). Clear it and
          // reload so the visible card is a fresh value from /seo/overview,
          // then wait until the rendered value settles (the card starts at
          // 0 before the fetch resolves) before comparing it to the API.
          await page.evaluate(() => {
            try { localStorage.removeItem("seo:overview"); } catch { /* storage unavailable */ }
          });
          await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
          await statRow.waitFor({ state: "visible", timeout: 90000 });
          const overview = await page.evaluate(async () => {
            const response = await fetch("/admin/api/seo/overview", { credentials: "include" });
            const full = await response.text();
            return { status: response.status, contentType: response.headers.get("content-type") ?? "", full: full.slice(0, 16384) };
          });
          if (overview.status !== 200) throw new Error("task493_overview_for_card");
          let parsed = null;
          try { parsed = JSON.parse(overview.full); } catch { parsed = null; }
          const indexedPages = parsed !== null && Number.isSafeInteger(parsed.indexedPages) ? parsed.indexedPages : -1;
          if (indexedPages < cfg.minIndexedPages) throw new Error("task493_overview_indexed_pages");
          const deadline = Date.now() + 60000;
          while (Date.now() < deadline) {
            const state = await page.evaluate((expected) => {
              const nodes = Array.from(document.querySelectorAll("*"));
              const labelNode = nodes.find((node) => {
                const directText = Array.from(node.childNodes)
                  .filter((child) => child.nodeType === 3)
                  .map((child) => (child.textContent ?? "").trim())
                  .filter(Boolean);
                return directText.length === 1 && directText[0] === "Indexed pages";
              });
              if (labelNode === undefined) return { found: false, label: "missing", value: "n/a" };
              let card = labelNode.parentElement;
              while (card !== null && (card.querySelector === undefined || card.querySelector(".font-display") === null)) card = card.parentElement;
              const valueNode = card !== null ? card.querySelector(".font-display") : null;
              if (valueNode === null) return { found: true, label: "no-value-node", value: "n/a" };
              return { found: true, label: "found", value: (valueNode.textContent ?? "").trim(), visible: valueNode.getClientRects().length > 0 };
            }, indexedPages);
            if (state.found && state.value === String(indexedPages)) break;
            await page.waitForTimeout(500);
          }
          {
            const state = await page.evaluate((expected) => {
              const nodes = Array.from(document.querySelectorAll("*"));
              const labelNode = nodes.find((node) => {
                const directText = Array.from(node.childNodes)
                  .filter((child) => child.nodeType === 3)
                  .map((child) => (child.textContent ?? "").trim())
                  .filter(Boolean);
                return directText.length === 1 && directText[0] === "Indexed pages";
              });
              if (labelNode === undefined) return { found: false, label: "missing", value: "n/a" };
              let card = labelNode.parentElement;
              while (card !== null && (card.querySelector === undefined || card.querySelector(".font-display") === null)) card = card.parentElement;
              const valueNode = card !== null ? card.querySelector(".font-display") : null;
              if (valueNode === null) return { found: true, label: "no-value-node", value: "n/a" };
              return { found: true, label: "found", value: (valueNode.textContent ?? "").trim(), visible: valueNode.getClientRects().length > 0 };
            }, indexedPages);
            if (!state.found || state.value !== String(indexedPages)) {
              throw new Error("task493_fifth_card_state_mismatch");
            }
          }
          const card = assertVisibleCard(await readStatCard());
          receipt.responseStatus = overview.status;
          receipt.contentType = overview.contentType;
          receipt.bodyPrefix = overview.full.slice(0, 160);
          receipt.urlCount = indexedPages;
          receipt.bodyIncludes = true;
          receipt.cardVisible = card.visible;
          receipt.cardValue = card.value;
          receipt.cardLabel = card.label;
          receipt.cardMatchesOverview = card.value === String(indexedPages);
          if (!receipt.cardVisible || !receipt.cardMatchesOverview) throw new Error("task493_fifth_card_value");
        }
      }
      receipt.colorScheme = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      return receipt;
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
  }`;
}

/**
 * Strict receipt validator: exact key set, per-scenario response/body
 * contracts, visible card proof, and zero console/page errors. The GSC write
 * scenarios accept either the documented 409 (unconfigured) or the seeded 2xx
 * success path, but never a 5xx with credentials.
 */
export function assertTask493BrowserReceipt(
  value: unknown,
  descriptor: Task493ScenarioDescriptor,
  fixture: Task493BrowserFixture,
  variant: Task493Variant,
  expectations: Readonly<{ readonly minIndexedPages: number; readonly minImpressions: number }>
): asserts value is Task493BrowserReceipt {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !==
      "bodyIncludes,bodyPrefix,cardLabel,cardMatchesOverview,cardValue,cardVisible,colorScheme,consoleErrors,contentType,fixtureUrl,outcome,pageErrors,requestMethod,responseStatus,scenarioId,statusRowRendered,urlCount,variantId" ||
    (value as Task493BrowserReceipt).scenarioId !== descriptor.id ||
    (value as Task493BrowserReceipt).fixtureUrl !== fixture.url ||
    (value as Task493BrowserReceipt).variantId !== variant.id ||
    (value as Task493BrowserReceipt).requestMethod !== descriptor.requestMethod ||
    (value as Task493BrowserReceipt).colorScheme !== variant.colorScheme ||
    !Array.isArray((value as Task493BrowserReceipt).consoleErrors) ||
    !Array.isArray((value as Task493BrowserReceipt).pageErrors) ||
    (value as Task493BrowserReceipt).consoleErrors.length !== 0 ||
    (value as Task493BrowserReceipt).pageErrors.length !== 0
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 browser receipt is invalid");
  }
  const receipt = value as Task493BrowserReceipt;
  const expectsUnconfigured = receipt.outcome === "unconfigured";
  if (
    (receipt.outcome !== "read" &&
      receipt.outcome !== "configured" &&
      receipt.outcome !== "unconfigured") ||
    (!descriptor.gscWrite && receipt.outcome !== "read") ||
    (descriptor.gscWrite && receipt.outcome === "read")
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 browser receipt outcome is invalid");
  }
  const unconfiguredStatus = descriptor.unconfiguredStatus;
  if (receipt.responseStatus >= 500) {
    throw new SmokeError(
      "smoke_output_invalid",
      "TASK-493 response never degrades to a server error"
    );
  }
  if (
    receipt.responseStatus !== unconfiguredStatus &&
    !(receipt.responseStatus >= 200 && receipt.responseStatus < 300)
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 browser response status is invalid");
  }
  if (expectsUnconfigured && receipt.responseStatus !== 409) {
    throw new SmokeError(
      "smoke_output_invalid",
      "TASK-493 unconfigured response status is invalid"
    );
  }
  if (receipt.bodyPrefix.length === 0 || !receipt.bodyIncludes) {
    throw new SmokeError("smoke_output_invalid", "TASK-493 browser body proof is invalid");
  }
  switch (descriptor.id) {
    case "sitemap-xml-served":
      if (
        receipt.contentType.includes("application/xml") !== true ||
        !receipt.bodyPrefix.startsWith("<urlset") ||
        receipt.urlCount < 1
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-493 sitemap document is invalid");
      }
      break;
    case "robots-txt-sitemap-directive":
      if (receipt.contentType.includes("text/plain") !== true) {
        throw new SmokeError("smoke_output_invalid", "TASK-493 robots content type is invalid");
      }
      break;
    case "seo-overview-real-data":
      if (receipt.urlCount < expectations.minIndexedPages) {
        throw new SmokeError(
          "smoke_output_invalid",
          "TASK-493 overview indexed pages are insufficient"
        );
      }
      break;
    case "sitemap-submit-status":
      if (!receipt.statusRowRendered) {
        throw new SmokeError("smoke_output_invalid", "TASK-493 sitemap status row is absent");
      }
      break;
    case "indexed-pages-sync":
      break;
    case "search-performance-read":
      if (receipt.urlCount < expectations.minImpressions) {
        throw new SmokeError(
          "smoke_output_invalid",
          "TASK-493 search performance impressions are insufficient"
        );
      }
      break;
    case "seo-manager-fifth-card":
      if (
        !receipt.cardVisible ||
        receipt.cardLabel !== "Indexed pages" ||
        !receipt.cardMatchesOverview ||
        receipt.cardValue === "" ||
        receipt.urlCount < expectations.minIndexedPages
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-493 indexed pages card is invalid");
      }
      break;
  }
}
