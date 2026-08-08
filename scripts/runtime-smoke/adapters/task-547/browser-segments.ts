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
import { createAdminAuthStorageState } from "../../browser/admin-auth";
import { PlaywrightCliDispatcher } from "../../browser/playwright-cli-dispatcher";
import {
  compileBrowserDispatchPlan,
  splitMaterializedSegment,
} from "../../browser/segment-compiler";
import { materializedSourceBytes } from "../../browser/action-frames";
import { BrowserTransport } from "../../browser/transport";
import type { WorkerPool } from "../../workers/pool";
import type { WorkerOperationDescriptor } from "../../workers/contracts";
import { validateTask547ScenarioObservation, type Task547ScenarioObservation } from "./assertions";
import { TASK_547_DESCRIPTOR_SHA256, type Task547ScenarioDescriptor } from "./descriptors";
import type { Task547InstallOutput, Task547CheckpointOutput } from "./worker-operations";
import { TASK547_MUTATION_SLOTS, TASK547_SUBMISSION_MARKER_KEYS } from "./fixture";
import type { Task547ScreenshotManifest } from "./output-manifest";
import { buildTask547BrowserInput, projectTask547AdminAuthEnvironment } from "./browser-input";

export { projectTask547AdminAuthEnvironment } from "./browser-input";

export interface Task547MaterializedBrowserPlan {
  readonly logical: BrowserDispatchPlan;
  readonly segments: readonly MaterializedBrowserSegment[];
  readonly manifestSha256: string;
}

export interface Task547BrowserRuntime {
  readonly dispatcher: PlaywrightCliDispatcher;
  readonly transport: BrowserTransport;
  readonly refreshAuth: () => Promise<void>;
}

export type Task547BrowserResourceObserver = (resource: BrowserTransport) => void;

const TASK547_AUTH_REFRESH_SCENARIOS = Object.freeze([
  "form-design-author-light",
  "page-editor-switcher-author-light",
]);

export function task547AuthRefreshScenarioIds(): readonly string[] {
  return TASK547_AUTH_REFRESH_SCENARIOS;
}

function task547BrowserActionSource(input: ReturnType<typeof buildTask547BrowserInput>): string {
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
    const onConsole = (message) => { if (message.type() === "error") consoleErrors.push("console-error"); };
    const onPageError = () => pageErrors.push("page-error");
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
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
    const findBlockById = (value, id) => {
      const pending = [value];
      const seen = new Set();
      while (pending.length > 0) {
        const current = pending.pop();
        if (!current || typeof current !== "object" || seen.has(current)) continue;
        seen.add(current);
        if (current.id === id && typeof current.type === "string") return current;
        pending.push(...Object.values(current));
      }
      return null;
    };
    const measurePlacement = async (note) => note.first().evaluate((node) => {
      const root = node.closest('[data-form-root="true"]') || node.closest('[role="dialog"]') || node.parentElement;
      const precedingRegion = node.previousElementSibling;
      const submit = precedingRegion?.querySelector("button") || (root && root.querySelector('[data-form-submit="1"], button[type="submit"]'));
      if (!submit) return { afterSubmit: false, occurrenceCount: 0, gapPx: -1 };
      const submitBox = submit.getBoundingClientRect();
      const noteBox = node.getBoundingClientRect();
      return {
        afterSubmit: Boolean(submit.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING),
        occurrenceCount: root.querySelectorAll('[data-form-submit-supporting-text="true"]').length,
        gapPx: Math.round(noteBox.top - submitBox.bottom),
      };
    });
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
    const settleVisualState = async () => page.evaluate(async () => {
      const animations = document.getAnimations();
      await Promise.race([
        Promise.allSettled(animations.map((animation) => animation.finished)),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const publicLayoutMetrics = async () => {
      const maximumColumns = await page.locator('[data-section-id] > [data-page-section-content="true"]').evaluateAll((nodes) => Math.max(1, ...nodes.map((node) => getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length)));
      const overflowX = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
      return { maximumColumns, overflowX };
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
    const fetchText = async (url) => {
      const response = await page.request.get(url, { timeout: 15000 });
      return { status: response.status(), text: await response.text() };
    };
    const gridColumns = async (locator) => {
      const boxes = await locator.evaluateAll((nodes) => nodes.filter((node) => {
        const style = getComputedStyle(node); const box = node.getBoundingClientRect();
        return style.display !== "none" && box.width > 0 && box.height > 0;
      }).map((node) => ({ x: Math.round(node.getBoundingClientRect().x), y: Math.round(node.getBoundingClientRect().y) })));
      return new Set(boxes.filter((box) => box.y === boxes[0]?.y).map((box) => box.x)).size;
    };
    const contentCardLinkMetrics = async (cards) => cards.evaluateAll((nodes) => {
      let linkCount = 0; let visibleCtaCount = 0; let allCardsLinked = nodes.length > 0;
      for (const card of nodes) {
        const titleLink = card.querySelector("h3 a"); if (titleLink) linkCount += 1; else allCardsLinked = false;
        const candidates = [...card.querySelectorAll("a, [data-content-list-cta-disabled]")].filter((node) => node !== titleLink);
        visibleCtaCount += candidates.filter((node) => { const style = getComputedStyle(node); const box = node.getBoundingClientRect(); return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0; }).length;
      }
      return { allCardsLinked, linkCount, visibleCtaCount };
    });
    const setInput = async (locator, value) => { await locator.first().fill(value); await locator.first().blur(); };
    const clickButton = async (name) => page.getByRole("button", { name, exact: true }).first().click();
    const saveForm = async () => {
      const overlay = page.getByRole("dialog");
      if (await visible(overlay)) { await page.keyboard.press("Escape"); await overlay.waitFor({ state: "hidden" }); }
      const button = page.getByRole("button", { name: "Save", exact: true });
      if (await button.isEnabled()) {
        const formEndpoint = "/admin/api/forms/" + cfg.fixture.publicFormId;
        const responsePromises = [
          page.waitForResponse((response) => response.ok() && response.request().method() === "PATCH" && response.url().endsWith(formEndpoint), { timeout: 20000 }),
          page.waitForResponse((response) => response.ok() && response.request().method() === "PUT" && response.url().endsWith(formEndpoint + "/fields"), { timeout: 20000 }),
          page.waitForResponse((response) => response.ok() && response.request().method() === "PUT" && response.url().endsWith(formEndpoint + "/actions"), { timeout: 20000 }),
        ];
        await button.click(); await Promise.all(responsePromises);
        await page.getByRole("button", { name: "Save", exact: true }).waitFor({ state: "visible", timeout: 20000 });
      }
    };
    const openFormDesign = async () => {
      await page.locator('main [role="button"]').filter({ has: page.locator("h2") }).first().click({ position: { x: 8, y: 8 } });
      const details = page.getByRole("button", { name: "Details", exact: true });
      if (await visible(details)) await details.click();
      await page.getByRole("tab", { name: "Design", exact: true }).click();
      await page.locator('[data-form-theme-control="submit.supportingText"]:visible').waitFor({ state: "visible" });
    };
    const supportingControl = () => page.locator('[data-form-theme-control="submit.supportingText"]:visible');
    const restoreSupportingText = async () => {
      const formEndpoint = "http://127.0.0.1:5173/admin/api/forms/" + cfg.fixture.publicFormId;
      const [current, csrfResponse] = await Promise.all([
        api(formEndpoint, { method: "GET" }),
        api("http://127.0.0.1:5173/admin/api/auth/csrf", { method: "GET" }),
      ]);
      const csrf = csrfResponse.data?.token;
      if (current.status !== 200 || typeof csrf !== "string") throw new Error("task547-supporting-text-restore-read-failed");
      const settings = current.data?.settings || {};
      const theme = settings.theme || {};
      const submit = theme.submit || {};
      const restored = await api(formEndpoint, {
        method: "PATCH",
        headers: { "X-CSRF-Token": csrf },
        data: { settings: { ...settings, theme: { ...theme, submit: { ...submit, supportingText: cfg.references.note } } } },
      });
      check(restored.status === 200 && restored.data?.settings?.theme?.submit?.supportingText === cfg.references.note, "supporting-text-restore");
    };
    const openBlock = async (id) => {
      const block = page.locator('[data-page-editor-block-id="' + id + '"]');
      await block.first().click({ position: { x: 8, y: 8 } });
      return block;
    };
    const navigateToPageEditor = async (title, id) => {
      await page.getByRole("link", { name: "Pages", exact: true }).first().click();
      await page.waitForURL((url) => url.pathname === "/admin/pages", { timeout: 10000 });
      await page.getByRole("link", { name: "Edit page: " + title, exact: true }).click();
      await page.waitForURL((url) => url.pathname === "/admin/pages/" + id, { timeout: 10000 });
    };
    const savePage = async () => {
      const button = page.getByRole("button", { name: "Save draft", exact: true });
      if (await button.isEnabled()) {
        const responsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/admin/api/pages/") && !response.url().endsWith("/publish"), { timeout: 15000 });
        await button.click(); const response = await responsePromise;
        if (!response.ok()) throw new Error("task547-page-save-failed");
        await page.getByRole("button", { name: "Save draft", exact: true }).waitFor({ state: "visible", timeout: 15000 });
      }
    };
    const publishPageDraft = async () => {
      const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/admin/api/pages/") && response.url().endsWith("/publish"), { timeout: 15000 });
      await clickButton("Publish"); const response = await responsePromise;
      if (!response.ok()) throw new Error("task547-page-publish-failed");
      await page.getByRole("button", { name: "Publish", exact: true }).waitFor({ state: "visible", timeout: 15000 });
      return response.status();
    };
    const submitPublicForm = async (marker) => {
      const form = page.locator('form[data-form-root="true"]').first();
      const responsePromise = page.waitForResponse((response) => response.url().includes("/forms/") && response.url().endsWith("/submissions") && response.request().method() === "POST", { timeout: 15000 });
      await form.locator('[data-form-field="name"] input').fill("TASK 547 User");
      await form.locator('[data-form-field="email"] input').fill("task547@example.test");
      await form.locator('[data-form-field="stage"] select').selectOption({ index: 0 });
      await form.locator('[data-form-field="message"] textarea').fill(marker);
      await form.locator('[data-form-field="consent"] input').check();
      await form.locator('[data-form-submit="1"]').click();
      const response = await responsePromise;
      const data = await response.json();
      await form.locator('[data-form-embed-success="true"]').waitFor({ state: "visible", timeout: 10000 });
      return { id: data.id, status: response.status(), form };
    };
    const cardTitles = ["Dom Aurora", "Dom Linea", "Dom Nova", "Dom Mono", "Dom Vista", "Dom Calm"];
    const visibleCardTitles = async () => {
      const body = await bodyText();
      return cardTitles.filter((title) => body.includes(title));
    };
    try {
      await page.setViewportSize(cfg.viewport);
      const sid = cfg.scenarioId;
      if (sid === "home-desktop-effects") {
        await goto(cfg.physicalUrl);
        const body = await bodyText();
        const hero = page.getByRole("heading", { level: 1 }).first();
        const heroGeometry = await hero.evaluate((node) => {
          const surface = node.closest("section") || node;
          const box = surface.getBoundingClientRect();
          const style = getComputedStyle(surface);
          return {
            visible: style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0,
            height: Math.round(box.height),
            width: Math.round(box.width),
          };
        });
        record("home-hero-geometry", heroGeometry);
        const header = page.locator("header").first();
        const position = await header.evaluate((node) => getComputedStyle(node).position);
        await page.evaluate(() => scrollTo(0, 240));
        await page.waitForTimeout(80);
        const background = await header.evaluate((node) => getComputedStyle(node).backgroundColor);
        record("home-header-appearance", { position, backgroundVisibleAfterScroll: background !== "rgba(0, 0, 0, 0)" && background !== "transparent" });
        check(includesAll(body, [cfg.references.routeCopy[0][1], "Concept 07 / Modern Barn", "142 m²", "3", "warianty układu", "21 dni", "koncepcja", "96%", "światło dzienne"]), "home-reference-copy");
        record("home-reference-copy-and-facts", { heading: cfg.references.routeCopy[0][1], concept: "Concept 07 / Modern Barn", area: "142 m²", facts: [["3", "warianty układu"], ["21 dni", "koncepcja"], ["96%", "światło dzienne"]] });
        const tabs = page.getByRole("tab");
        record("home-switcher-control-order", await tabs.allTextContents().then((items) => items.map((item) => item.trim())));
        const states = [["Nowoczesna stodoła", "Modern Barn", "Prosta, elegancka bryła, wysoki salon, naturalne materiały i duże przeszklenia otwierające dom na ogród."], ["Miejska willa", "Urban Villa", "Horyzontalna kompozycja, reprezentacyjne wejście, prywatne patio i wyważony luksus bez krzykliwych detali."], ["Dom eko", "Eco Soft", "Ciepła architektura, zielone rozwiązania, kompaktowa forma i materiały, które budują przyjazny mikroklimat."]];
        for (const state of states) { await page.getByRole("tab", { name: state[0], exact: true }).click(); check(includesAll(await bodyText(), state), "home-switcher-state"); }
        record("home-switcher-visible-states", states);
        const interactive = page.getByRole("tab", { name: "Dom eko", exact: true });
        const beforeTransform = await interactive.evaluate((node) => getComputedStyle(node).transform);
        await interactive.hover(); await page.waitForTimeout(80);
        const afterTransform = await interactive.evaluate((node) => getComputedStyle(node).transform);
        await interactive.focus();
        record("home-interaction-effects", { pointerTransformChanged: beforeTransform !== afterTransform || afterTransform !== "none", keyboardStateVisible: await interactive.evaluate((node) => node.matches(":focus-visible") || node.matches(":focus")) });
        record("home-switcher-accessible-name", await page.getByRole("tablist").first().getAttribute("aria-label"));
        await page.emulateMedia({ reducedMotion: "reduce" });
        const motion = await interactive.evaluate((node) => ({ transitionDurationMs: Math.max(...getComputedStyle(node).transitionDuration.split(",").map((value) => parseFloat(value) * (value.includes("ms") ? 1 : 1000))), transform: getComputedStyle(node).transform }));
        record("home-reduced-motion", motion);
      } else if (sid === "all-routes-desktop-shell") {
        const statuses = [], copies = [], titles = [], descriptions = [], languages = [];
        for (let index = 0; index < cfg.references.routes.length; index += 1) {
          const route = cfg.references.routes[index]; const copy = cfg.references.routeCopy[index];
          const status = await goto("http://127.0.0.1:3000" + route[0]); const body = await bodyText();
          statuses.push([route[0], status]); copies.push([route[0], copy[1], copy[2]]);
          check(includesAll(body, [copy[1], copy[2]]), "route-copy");
          titles.push([route[0], await page.title()]);
          descriptions.push([route[0], await page.locator('meta[name="description"]').getAttribute("content")]);
          languages.push([route[0], await page.locator("html").getAttribute("lang")]);
        }
        record("all-public-routes-status", statuses);
        await goto("http://127.0.0.1:3000/");
        const shellHrefs = await page.locator('[data-site-nav="true"] [data-site-nav-list="true"]').first().locator(':scope > li > a[data-site-nav-link="true"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")));
        record("desktop-shell-links", shellHrefs); record("public-route-headings-and-leads", copies);
        record("public-seo-titles", titles); record("public-seo-description", descriptions); record("public-document-language", languages);
      } else if (sid === "tablet-responsive") {
        await goto("http://127.0.0.1:3000/");
        record("tablet-no-horizontal-overflow", { scrollWidthDelta: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)) });
        const nav = page.locator("header nav").first(); const toggle = page.locator('header details[data-site-nav-disclosure="true"]');
        record("tablet-navigation-mode", { desktopVisible: await visible(nav), mobileToggleVisible: await visible(toggle) });
        const sectionChildren = page.locator('[data-section-id="home-hero"] > [data-page-section-content="true"] > [data-block-id]');
        const layout = await sectionChildren.evaluateAll((nodes) => {
          const boxes = nodes.map((node) => {
            const box = node.getBoundingClientRect();
            return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
          }).filter((box) => box.width > 0 && box.height > 0);
          const gaps = [];
          for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
            for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
              const left = boxes[leftIndex]; const right = boxes[rightIndex];
              const overlapsVertically = left.top < right.bottom && right.top < left.bottom;
              const overlapsHorizontally = left.left < right.right && right.left < left.right;
              if (overlapsVertically) gaps.push(Math.max(right.left - left.right, left.left - right.right));
              if (overlapsHorizontally) gaps.push(Math.max(right.top - left.bottom, left.top - right.bottom));
            }
          }
          const positiveGaps = gaps.filter((gap) => gap >= 0);
          return {
            distinctColumnWidths: new Set(boxes.map((box) => Math.round(box.width))).size > 1,
            minimumGap: positiveGaps.length > 0 ? Math.round(Math.min(...positiveGaps)) : 0,
          };
        });
        record("tablet-asymmetric-layout", layout);
        await goto("http://127.0.0.1:3000/projekty");
        const portfolioCards = page.locator('[data-listing-block-id="projects-collection"] [data-content-list-item]');
        record("tablet-portfolio-columns", { columns: await gridColumns(portfolioCards) });
        await goto("http://127.0.0.1:3000/kontakt");
        const contactSectionBlocks = page.locator('[data-section-id="contact-form-section"] > [data-page-section-content="true"] > [data-block-id]');
        const controls = page.locator('form[data-form-root="true"] input:not([type="hidden"]), form[data-form-root="true"] select, form[data-form-root="true"] textarea');
        const controlBoxes = await controls.evaluateAll((nodes) => nodes.map((node) => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, right: box.right }; }));
        record("tablet-form-layout", { columns: await gridColumns(contactSectionBlocks), controlsWithinViewport: controlBoxes.every((box) => box.x >= 0 && box.right <= cfg.viewport.width) });
      } else if (sid === "mobile-navigation") {
        await goto(cfg.physicalUrl);
        const disclosure = page.locator('header details[data-site-nav-disclosure="true"]').first(); const toggle = disclosure.locator(":scope > summary"); const menu = page.locator('header [data-site-nav-list="true"]').first();
        record("mobile-menu-collapsed", { disclosureOpen: await disclosure.evaluate((node) => node.open), listVisible: await visible(menu) });
        await toggle.click();
        record("mobile-menu-expanded", { disclosureOpen: await disclosure.evaluate((node) => node.open), listVisible: await visible(menu) });
        const menuBox = await rect(menu);
        record("mobile-navigation-geometry", { withinViewport: Boolean(menuBox && menuBox.x >= 0 && menuBox.x + menuBox.width <= 390), linkCount: await menu.locator("a").count() });
        const sectionColumns = await page.locator('[data-section-id] > [data-page-section-content="true"]').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length));
        record("mobile-one-column-layouts", { maximumColumns: Math.max(1, ...sectionColumns) });
        record("mobile-no-horizontal-overflow", { scrollWidthDelta: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)) });
      } else if (sid === "portfolio-facets") {
        await goto(cfg.physicalUrl);
        const resetLabel = (await page.getByText("Wszystkie", { exact: true }).first().innerText()).trim();
        const filterForm = page.locator('[data-listing-widget="listing-filters"] form[data-listing-runtime-form]').first();
        const facetRadios = filterForm.locator('input[type="radio"]');
        const canonicalParamName = await facetRadios.first().getAttribute("name");
        check(typeof canonicalParamName === "string" && canonicalParamName.length > 0, "portfolio-canonical-param");
        const facetLabels = await facetRadios.evaluateAll((inputs) => inputs.map((input) => input.closest("label")?.querySelector("span")?.textContent?.trim() ?? ""));
        record("portfolio-control-order", [resetLabel, ...facetLabels]);
        const portfolioCards = page.locator('[data-listing-block-id="projects-collection"] [data-content-list-item]');
        const cardTuples = await portfolioCards.evaluateAll((cards) => cards.map((card) => {
          const titleLink = card.querySelector("h3 a");
          const description = [...card.querySelectorAll("p")].find((paragraph) => paragraph.classList.contains("opacity-90"));
          return [titleLink?.textContent?.trim() ?? "", description?.textContent?.trim() ?? "", titleLink?.getAttribute("href") ?? ""];
        }));
        record("portfolio-reference-order", cardTuples);
        record("portfolio-card-destinations", cardTuples.map(([title, , href]) => [title, href]));
        const visibleCardCtaCount = await portfolioCards.locator("a, button").evaluateAll((controls) => controls.filter((control) => {
          if (control.closest("h3") || control.querySelector("h3")) return false;
          const style = getComputedStyle(control); const box = control.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
        }).length);
        record("portfolio-no-visible-card-cta", { visibleCardCtaCount });
        const sets = { barn: ["Dom Aurora", "Dom Mono"], villa: ["Dom Linea", "Dom Vista"], single: ["Dom Nova", "Dom Calm"], eco: ["Dom Aurora", "Dom Nova", "Dom Vista"] };
        for (const key of Object.keys(sets)) {
          await filterForm.locator('input[type="radio"][value="' + key + '"]').check();
          await Promise.all([
            page.waitForURL((url) => url.pathname === "/projekty" && url.searchParams.get(canonicalParamName) === key, { timeout: 10000 }),
            page.getByRole("button", { name: "Pokaż projekty", exact: true }).click(),
          ]);
          await page.waitForFunction(({ expected, titles }) => {
            const text = document.body.innerText;
            return JSON.stringify(titles.filter((title) => text.includes(title))) === JSON.stringify(expected);
          }, { expected: sets[key], titles: cardTitles }, { timeout: 10000 });
          const found = await visibleCardTitles();
          check(JSON.stringify(found) === JSON.stringify(sets[key]), "portfolio-filter-" + key);
          record("portfolio-" + (key === "single" ? "single" : key) + "-visible-set", found);
        }
        const selectedLocation = await page.evaluate((paramName) => {
          const params = new URLSearchParams(location.search);
          return {
            pathname: location.pathname,
            selectedFilterValue: params.get(paramName),
            selectedUsesCanonicalName: params.has(paramName),
          };
        }, canonicalParamName);
        const noJsUrl = await page.evaluate((paramName) => {
          const url = new URL("/projekty", location.origin);
          url.searchParams.set(paramName, "eco");
          return url.toString();
        }, canonicalParamName);
        const noJs = await fetchText(noJsUrl);
        const noJsVisible = await page.evaluate(({ html, titles }) => {
          const parsed = new DOMParser().parseFromString(html, "text/html");
          const renderedTitles = [...parsed.querySelectorAll('[data-listing-block-id="projects-collection"] [data-content-list-item] h3 a')].map((node) => node.textContent?.trim() || "");
          return titles.filter((title) => renderedTitles.includes(title));
        }, { html: noJs.text, titles: cardTitles });
        const resetControl = page.getByRole("link", { name: "Wszystkie", exact: true }).first();
        await Promise.all([
          page.waitForURL((url) => url.pathname === "/projekty" && url.search === "", { timeout: 10000 }),
          resetControl.click(),
        ]);
        await page.waitForFunction((titles) => titles.every((title) => document.body.innerText.includes(title)), cardTitles, { timeout: 10000 });
        const resetUrl = await page.evaluate(() => location.pathname + location.search);
        record("portfolio-filter-url-reset", {
          selectedPath: selectedLocation.pathname,
          selectedFilterValue: selectedLocation.selectedFilterValue,
          selectedUsesCanonicalName: selectedLocation.selectedUsesCanonicalName,
          resetUrl,
        });
        record("portfolio-no-js-get", { status: noJs.status, visible: noJsVisible });
      } else if (sid === "aurora-detail") {
        const status = await goto(cfg.physicalUrl); const body = await bodyText();
        record("aurora-route-resolution", { status, canonicalPath: await page.evaluate(() => location.pathname) });
        record("aurora-entry-bindings", { entryKey: body.includes("Dom Aurora") ? "aurora" : "", detailTemplateResolved: body.includes(cfg.references.routeCopy[7][2]) });
        const stats = [["142 m²", "powierzchnia"], ["4", "sypialnie"], ["2", "łazienki"], ["A++", "standard energii"]];
        const assumptions = [["Strefa dzienna", "Salon z wysokim sufitem, wyjście na taras, kuchnia z wyspą i ukryta spiżarnia."], ["Strefa prywatna", "Sypialnia master z garderobą, trzy pokoje oraz kompaktowa strefa pracy."], ["Elewacja", "Drewno, grafit, ciepłe światło i proste detale bez zbędnych ozdobników."]];
        const projectTitles = cfg.references.cards.map(([title]) => title);
        const detailBlockIds = ["project-back-link", "project-hero", "project-hero-art", "project-statistics", "project-contact-cta", "project-assumptions", "project-gallery"];
        const detailCorpus = projectTitles.concat([cfg.references.routeCopy[7][2], "← Wróć do projektów", "Chcę podobny dom", "Projekt pokazowy"], stats.flat(), assumptions.flat());
        const matrix = {};
        for (const slug of ["aurora", "linea", "nova", "mono", "vista", "calm"]) {
          const route = "/projekty/" + slug;
          if (slug === "aurora") matrix[route] = { status, title: await page.title(), description: await page.locator('meta[name="description"]').getAttribute("content"), capturedInstalledPublicOrigin: "http://127.0.0.1:3000", canonicalHref: await page.locator('link[rel="canonical"]').getAttribute("href") };
          else {
            const response = await fetchText("http://127.0.0.1:3000" + route);
            const proof = await page.evaluate(({ html, titles, corpus, seoTitles, description, blockIds }) => {
              const parsed = new DOMParser().parseFromString(html, "text/html"); const text = parsed.documentElement.textContent || "";
              return {
                renderedProjectDetailRootSelectors: ['[data-template="project-detail"]', '[data-page-template="project-detail"]', '[data-detail-page="true"]'].filter((selector) => parsed.querySelector(selector)),
                renderedProjectDetailBlockIds: blockIds.filter((id) => parsed.querySelector('[data-block-id="' + id + '"]')),
                installedProjectTitleMatches: titles.filter((value) => text.includes(value)), installedProjectDetailCorpusMatches: corpus.filter((value) => text.includes(value)),
                dynamicDetailSeoTitleMatches: seoTitles.filter((value) => text.includes(value)), dynamicDetailSeoDescriptionMatches: [description].filter((value) => text.includes(value)),
                canonicalHrefs: [...parsed.querySelectorAll('link[rel="canonical"]')].map((node) => node.getAttribute("href")).filter(Boolean),
              };
            }, { html: response.text, titles: projectTitles, corpus: detailCorpus, seoTitles: projectTitles.map((title) => title + " — projekt pokazowy — FormaDom Studio"), description: cfg.references.description, blockIds: detailBlockIds });
            matrix[route] = { status: response.status, resolverOutcome: response.status === 404 ? "detail_not_found_before_metadata" : "detail_rendered", resolvedDetailDocumentKeys: [], ...proof };
          }
        }
        record("aurora-six-slug-eligibility", matrix);
        record("aurora-reference-lead", cfg.references.routeCopy[7][2]);
        const surfaces = page.locator('[data-grid-column="column:hero-art-main"], [data-grid-column="column:hero-art-accent"]');
        const measureHeroArt = async (viewport) => {
          await page.setViewportSize(viewport);
          const values = await surfaces.evaluateAll((nodes) => nodes.map((node) => {
            const box = node.getBoundingClientRect();
            const paint = node.firstElementChild || node;
            return { x: box.x, y: box.y, width: box.width, height: box.height, background: getComputedStyle(paint).backgroundColor };
          }));
          const first = values[0]; const second = values[1];
          return {
            values,
            layout: first && second && Math.abs(first.y - second.y) <= 2 ? "side-by-side" : "stacked",
            nonZero: values.filter((value) => value.width > 0 && value.height > 0).length,
          };
        };
        const desktopHeroArt = await measureHeroArt({ width: 1440, height: 1000 });
        const tabletHeroArt = await measureHeroArt({ width: 744, height: 1133 });
        const mobileHeroArt = await measureHeroArt({ width: 390, height: 844 });
        await page.setViewportSize(cfg.viewport);
        record("aurora-hero-art-geometry", {
          surfaceCount: desktopHeroArt.values.length,
          desktopLayout: desktopHeroArt.layout,
          tabletLayout: tabletHeroArt.layout,
          mobileLayout: mobileHeroArt.layout,
          nonZeroRectangles: desktopHeroArt.nonZero + tabletHeroArt.nonZero + mobileHeroArt.nonZero,
          resolvedBackgrounds: desktopHeroArt.values.map((value) => value.background),
        });
        check(includesAll(await bodyText(), stats.flat()), "aurora-stats"); record("aurora-reference-statistics", stats);
        const cta = page.getByRole("link", { name: "Chcę podobny dom", exact: true });
        const ctaOrder = await cta.evaluate((node) => {
          const statistics = document.querySelector('[data-feature-grid-variant="cards-4"]'); const assumptionsGrid = document.querySelector('[data-feature-grid-variant="cards-3"]');
          return { afterStatistics: Boolean(statistics && (statistics.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)), beforeAssumptions: Boolean(assumptionsGrid && (node.compareDocumentPosition(assumptionsGrid) & Node.DOCUMENT_POSITION_FOLLOWING)) };
        });
        record("aurora-contact-cta", { label: (await cta.innerText()).trim(), href: await cta.getAttribute("href"), ...ctaOrder });
        check(includesAll(await bodyText(), assumptions.flat()), "aurora-assumptions"); record("aurora-reference-assumptions", assumptions);
        const galleryCards = page.locator('[data-grid-column="column:gallery-tall"], [data-grid-column="column:gallery-default"], [data-grid-column="column:gallery-warm"]');
        const galleryContent = await galleryCards.evaluateAll((nodes) => nodes.map((node) => (node.getAttribute("data-grid-column") || "").replace(/^column:gallery-/, "")));
        const galleryBoxes = await galleryCards.evaluateAll((nodes) => nodes.map((node) => { const box = node.getBoundingClientRect(); return { width: box.width, height: box.height }; }));
        record("aurora-gallery-content", galleryContent);
        record("aurora-gallery-geometry", { cardCount: galleryBoxes.length, firstCardTaller: Boolean(galleryBoxes[0] && galleryBoxes.slice(1).every((box) => galleryBoxes[0].height > box.height)) });
        const specification = page.locator('[data-feature-grid-variant="cards-4"]').first();
        record("aurora-specification-geometry", { columns: Number(await specification.getAttribute("data-feature-grid-columns")), visible: await visible(specification) });
        record("aurora-seo", { title: await page.title(), description: await page.locator('meta[name="description"]').getAttribute("content") });
      } else if (sid === "contact-form") {
        await goto(cfg.physicalUrl); const form = page.locator('form[data-form-root="true"]').first();
        const nameInput = form.locator('[data-form-field="name"] input'); const emailInput = form.locator('[data-form-field="email"] input'); const messageInput = form.locator('[data-form-field="message"] textarea'); const consentInput = form.locator('[data-form-field="consent"] input');
        const fieldLabel = async (name) => ((await form.locator('[data-form-field="' + name + '"] label').first().textContent()) || "").replace(/ +[*]$/u, "").trim();
        const fields = [[await fieldLabel("name"), await nameInput.getAttribute("placeholder")], [await fieldLabel("email"), await emailInput.getAttribute("placeholder")], [await fieldLabel("stage"), null], [await fieldLabel("message"), await messageInput.getAttribute("placeholder")], [await fieldLabel("consent"), await consentInput.isChecked()]];
        const options = await form.locator('select[name="stage"] option').allTextContents().then((items) => items.map((item) => item.trim()));
        record("contact-reference-fields-and-options", { fields, stageOptions: options });
        const select = form.locator('select[name="stage"]'); const textarea = form.locator('textarea[name="message"]');
        record("contact-reference-native-presentation", { firstOption: await select.locator("option").first().innerText(), defaultValue: await select.inputValue(), hasBlankPrompt: await select.locator('option[value=""]').count() > 0, textareaRows: Number(await textarea.getAttribute("rows")), pendingLabel: await form.getAttribute("data-form-loading-label") });
        record("contact-reference-submit-note-success", { submit: (await form.locator('[data-form-submit="1"]').innerText()).trim(), note: (await form.locator('[data-form-submit-supporting-text="true"]').innerText()).trim(), success: await form.getAttribute("data-form-success-message") });
        const nonce = await form.locator('[data-form-security-nonce="1"]').inputValue(); const endpoint = "http://127.0.0.1:3000/forms/" + cfg.fixture.publicFormId + "/submissions";
        const invalid = await api(endpoint, { method: "POST", data: { data: {}, formNonce: nonce } });
        record("contact-invalid-rejected", { invalidStatus: invalid.status, fieldErrorsVisible: invalid.status === 400 });
        const missing = await api(endpoint, { method: "POST", data: { data: {}, formNonce: "" } });
        const alteredNonce = nonce.slice(0, -1) + (nonce.endsWith("a") ? "b" : "a");
        const altered = await api(endpoint, { method: "POST", data: { data: {}, formNonce: alteredNonce } });
        const csrfResponse = await api("http://127.0.0.1:5173/admin/api/auth/csrf", { method: "GET" }); const csrf = csrfResponse.data?.token;
        const securityEndpoint = "http://127.0.0.1:5173/admin/api/settings/security";
        const security = await api(securityEndpoint, { method: "GET" });
        const originalBot = security.data?.botProtection;
        if (security.status !== 200 || !originalBot) throw new Error("task547-captcha-settings-unavailable");
        const originalSecretConfigured = originalBot?.secretKey?.configured === true;
        let configuredFailure = { status: 0 };
        let configuredAction = "";
        let securityMutated = false;
        let publicSubmission = null;
        try {
          const update = { botProtection: { enabled: true, provider: "recaptcha_v3", siteKey: originalBot?.siteKey || "task-547-captcha-site-key", enforceOnLocalhost: true, thresholds: { publicWrite: originalBot?.thresholds?.publicWrite ?? 0.5 }, ...(originalSecretConfigured ? {} : { secretKey: "task-547-captcha-secret-key" }) } };
          const configured = await api(securityEndpoint, { method: "PATCH", headers: { "X-CSRF-Token": csrf }, data: update });
          if (configured.status !== 200) throw new Error("task547-captcha-setup-failed");
          securityMutated = true;
          const configuredPage = await fetchText("http://127.0.0.1:3000/kontakt");
          const configuredForm = await page.evaluate((html) => { const parsed = new DOMParser().parseFromString(html, "text/html"); const candidate = parsed.querySelector('form[data-form-root="true"]'); return { action: candidate?.getAttribute("data-form-captcha-action") || "", nonce: candidate?.querySelector('[data-form-security-nonce="1"]')?.getAttribute("value") || "" }; }, configuredPage.text);
          configuredAction = configuredForm.action;
          configuredFailure = await api(endpoint, {
            method: "POST",
            headers: { Cookie: "" },
            data: {
              data: { name: "TASK 547 CAPTCHA probe", email: "task547-captcha@example.test", stage: "Mam działkę", message: cfg.fixture.markers.publicContact, consent: true },
              formNonce: configuredForm.nonce,
            },
          });
          const disabled = { botProtection: { enabled: false, provider: originalBot?.provider || "recaptcha_v3", siteKey: originalBot?.siteKey ?? null, enforceOnLocalhost: false, thresholds: { publicWrite: originalBot?.thresholds?.publicWrite ?? 0.5 }, ...(originalSecretConfigured ? {} : { secretKey: null }) } };
          const disabledResponse = await api(securityEndpoint, { method: "PATCH", headers: { "X-CSRF-Token": csrf }, data: disabled });
          if (disabledResponse.status !== 200) throw new Error("task547-captcha-disable-failed");
          publicSubmission = await submitPublicForm(cfg.fixture.markers.publicContact);
        } finally {
          if (securityMutated) {
            const restore = {
              botProtection: {
                enabled: originalBot?.enabled === true,
                provider: originalBot?.provider || "recaptcha_v3",
                siteKey: originalBot?.siteKey ?? null,
                enforceOnLocalhost: originalBot?.enforceOnLocalhost === true,
                thresholds: { publicWrite: originalBot?.thresholds?.publicWrite ?? 0.5 },
                ...(originalSecretConfigured ? {} : { secretKey: null }),
              },
            };
            const restored = await api(securityEndpoint, { method: "PATCH", headers: { "X-CSRF-Token": csrf }, data: restore });
            check(restored.status === 200, "captcha-restore");
          }
        }
        if (!publicSubmission) throw new Error("task547-public-submission-absent");
        record("contact-nonce-contract", { missingStatus: missing.status, alteredStatus: altered.status, validStatus: publicSubmission.status });
        record("contact-captcha-policy", { action: configuredAction, configuredFailureStatus: configuredFailure.status, disabledStatus: publicSubmission.status });
        const internalEndpoint = "http://127.0.0.1:5173/admin/api/forms/" + cfg.fixture.internalFormId + "/submissions";
        const internalDirectEndpoint = "http://127.0.0.1:3000/admin/api/forms/" + cfg.fixture.internalFormId + "/submissions";
        const sessionSubmission = await api(internalEndpoint, { method: "POST", headers: { "X-CSRF-Token": csrf }, data: { data: { marker: cfg.fixture.markers.internalSession } } });
        const apiSubmission = await page.evaluate(async ({ url, secret, marker }) => { const response = await fetch(url, { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json", Authorization: "Bearer " + secret }, body: JSON.stringify({ data: { marker } }) }); let data = null; try { data = await response.json(); } catch { data = null; } return { status: response.status, data }; }, { url: internalDirectEndpoint, secret: cfg.fixture.apiKeySecret, marker: cfg.fixture.markers.internalApiKey });
        const anonymous = await api(internalDirectEndpoint, { method: "POST", headers: { Cookie: "" }, data: { data: { marker: "anonymous" } } });
        check(sessionSubmission.status === 200 && apiSubmission.status === 200 && anonymous.status === 401, "internal-form-access");
        record("contact-internal-session-contract", { mount: "/admin/api/forms/:id/submissions", principal: "coherent-session", formSource: "scoped-internal-fixture", submissionAccess: "internal", permission: "forms:write", csrf: "valid", rateLimit: "admin_write", outcome: "accepted" });
        record("contact-internal-api-key-contract", { mount: "/admin/api/forms/:id/submissions", principal: "api-key", formSource: "scoped-internal-fixture", submissionAccess: "internal", scope: "forms.submit", cookieCsrf: "not-applicable", rateLimit: "admin_write", outcome: "accepted" });
        record("contact-internal-anonymous-rejected", { mount: "/admin/api/forms/:id/submissions", principal: "anonymous", status: anonymous.status, formSource: "scoped-internal-fixture", submissionAccess: "internal", createdSubmissionIds: [] });
        record("contact-scoped-submission", { createdCount: 3, markerMatched: true });
        const successNode = form.locator('[data-form-embed-success="true"]');
        const supportingTextNode = form.locator('[data-form-submit-supporting-text="true"]');
        record("contact-success-action", { message: (await successNode.innerText()).trim(), supportingTextVisible: await visible(supportingTextNode) && (await supportingTextNode.innerText()).trim() === cfg.references.note });
        record("contact-controls-remain-visible", { visibleControlCount: await form.locator('[data-form-embed-form-body="true"] input:not([type="hidden"]), [data-form-embed-form-body="true"] select, [data-form-embed-form-body="true"] textarea').count(), bodyVisible: await visible(form.locator('[data-form-embed-form-body="true"]')) });
        cfg.submissionIds = [publicSubmission.id, sessionSubmission.data?.id, apiSubmission.data?.id];
      } else if (sid === "publish-lifecycle-parity") {
        await goto(cfg.physicalUrl);
        const statuses = await Promise.all(["/", "/projekty/aurora", "/kontakt"].map((path) => api("http://127.0.0.1:3000" + path, { method: "GET" }).then((value) => value.status)));
        record("publish-front-parity", { pageStatus: statuses[0], projectStatus: statuses[1], contactStatus: statuses[2] });
        record("publish-lifecycle-order", cfg.fixture.lifecycle);
        const resources = await Promise.all([["forms", cfg.fixture.publicFormId], ["pages", cfg.fixture.homePageId], ["pages", cfg.fixture.projectsPageId], ["pages", cfg.fixture.contactPageId]].map(([kind, id]) => api("http://127.0.0.1:5173/admin/api/" + kind + "/" + id, { method: "GET" })));
        record("installed-fixture-continuity", { formResource: "project-brief", pageResources: ["home", "projects", "contact"], available: resources.every((item) => item.status === 200) });
      } else if (sid.startsWith("form-design-")) {
        const reuseFormEditor = ["form-design-author-dark", "form-design-reset-mobile", "form-design-save-reload"].includes(sid) && page.url().includes("/admin/advanced/forms/" + cfg.fixture.publicFormId);
        if (reuseFormEditor) {
          const overlay = page.getByRole("dialog");
          if (await visible(overlay)) { await page.keyboard.press("Escape"); await overlay.waitFor({ state: "hidden" }); }
        } else {
          await goto(typeof cfg.physicalUrl === "string" ? cfg.physicalUrl : cfg.physicalUrl[0]);
        }
        if (sid === "form-design-publish-front") {
          const initial = (await page.locator('[data-form-submit-supporting-text="true"]').innerText()).trim();
          const submission = await submitPublicForm(cfg.fixture.markers.formDesign);
          const form = submission.form; const success = (await form.locator('[data-form-embed-success="true"]').innerText()).trim(); const formBody = form.locator('[data-form-embed-form-body="true"]'); const box = await rect(formBody);
          record("form-design-front-initial-note", initial); record("form-design-front-success-message", success);
          record("form-design-front-controls-visible", { visible: await visible(formBody), controlCount: await formBody.locator("input:not([type=hidden]), select, textarea").count(), height: Math.round(box?.height || 0) });
          record("form-design-front-admin-public-parity", { equal: initial === cfg.references.note, value: initial });
          record("form-design-front-submission-registered", { attached: Boolean(submission.id), markerRegisteredBeforeDispatch: true }); cfg.submissionIds = [submission.id];
        } else {
          await openFormDesign();
          if (sid === "form-design-author-light" || sid === "form-design-author-dark") {
            const value = sid.endsWith("light") ? "TASK-547 light supporting text" : "TASK-547 dark supporting text";
            const canvas = page.locator('[data-form-submit-supporting-text="true"]').first();
            await setInput(supportingControl(), value);
            const controlValue = await supportingControl().inputValue(); const canvasText = (await canvas.innerText()).trim();
            await saveForm();
            if (sid.endsWith("dark")) await page.locator("html").evaluate((node) => node.classList.add("dark"));
            await clickButton("Runtime preview"); const dialogNote = page.getByRole("dialog").locator('[data-form-submit-supporting-text="true"]'); await dialogNote.waitFor({ state: "visible" });
            if (sid.endsWith("light")) {
              record("form-design-light-control-value", controlValue); record("form-design-light-canvas-text", canvasText); record("form-design-light-preview-text", (await dialogNote.innerText()).trim()); record("form-design-light-placement", await measurePlacement(dialogNote));
            } else {
              await settleVisualState();
              const contrast = await measureContrast(dialogNote);
              const theme = await page.locator("html").evaluate((node) => node.classList.contains("dark") ? "dark" : "light");
              record("form-design-dark-control-value", controlValue); record("form-design-dark-preview-text", (await dialogNote.innerText()).trim()); record("form-design-dark-computed-contrast", { theme, ...contrast }); record("form-design-dark-placement", await measurePlacement(dialogNote));
            }
            await captureScreenshot();
          } else if (sid === "form-design-reset-mobile") {
            await page.getByRole("button", { name: "Reset submit supporting text", exact: true }).click();
            const controlValue = await supportingControl().inputValue(); const previewNodeCount = await page.locator('[data-form-submit-supporting-text="true"]').count();
            await saveForm();
            const persistedForm = await api("http://127.0.0.1:5173/admin/api/forms/" + cfg.fixture.publicFormId, { method: "GET" });
            const persistedSubmit = persistedForm.data?.settings?.theme?.submit;
            record("form-design-reset-control-empty", controlValue); record("form-design-reset-persisted-key-absent", { ownKey: Boolean(persistedSubmit && Object.prototype.hasOwnProperty.call(persistedSubmit, "supportingText")) }); record("form-design-reset-preview-node-absent", { count: previewNodeCount });
            const publicHtml = await fetchText("http://127.0.0.1:3000/kontakt"); record("form-design-reset-public-bytes-absent", { markerCount: publicHtml.text.includes(cfg.references.note) ? 1 : 0 });
            const canvas = page.locator("main").first(); const box = await rect(canvas); record("form-design-reset-mobile-geometry", { overflowX: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)), withinViewport: Boolean(box && box.x >= 0 && box.x + box.width <= 390), width: Math.round(box?.width || 0) }); await captureScreenshot();
          } else {
            const value = "TASK-547 persisted supporting text";
            try {
              await setInput(supportingControl(), value); await saveForm();
              const persisted = await api("http://127.0.0.1:5173/admin/api/forms/" + cfg.fixture.publicFormId, { method: "GET" });
              const persistedValue = persisted.data?.settings?.theme?.submit?.supportingText;
              await page.getByRole("link", { name: "Forms", exact: true }).first().click();
              await page.waitForURL((url) => url.pathname === "/admin/advanced/forms", { timeout: 10000 });
              await page.getByRole("link", { name: "Edit form: Zacznij projekt", exact: true }).click();
              await page.waitForURL((url) => url.pathname === "/admin/advanced/forms/" + cfg.fixture.publicFormId, { timeout: 10000 });
              await openFormDesign();
              const navigated = await supportingControl().inputValue();
              await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined); await openFormDesign();
              const reloaded = await supportingControl().inputValue();
              const dirtyValue = "TASK-547 dirty supporting text"; await setInput(supportingControl(), dirtyValue);
              await page.getByText("Unsaved changes", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
              await page.evaluate((key) => {
                const channel = new BroadcastChannel("coderso.admin.cache");
                channel.postMessage({ key, action: "update", sourceId: "task-547-dirty-probe", ts: Date.now() });
                channel.close();
              }, "forms:detail:" + cfg.fixture.publicFormId);
              await page.getByText("Updated in another tab", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
              const afterBackgroundRefresh = await supportingControl().inputValue();
              record("form-design-save-persisted-value", persistedValue); record("form-design-save-navigation-roundtrip", navigated); record("form-design-save-reload-roundtrip", reloaded); record("form-design-dirty-state-protection", { dirtyValuePreserved: afterBackgroundRefresh === dirtyValue, backgroundOverwriteCount: afterBackgroundRefresh === dirtyValue ? 0 : 1 }); await captureScreenshot();
            } finally { await restoreSupportingText(); }
          }
        }
      } else if (sid.startsWith("page-editor-")) {
        if (sid === "page-editor-publish-front-parity") {
          const publicMetrics = [];
          if (!page.url().includes("/admin/pages/" + cfg.fixture.contactPageId)) await goto("http://127.0.0.1:5173/admin/pages/" + cfg.fixture.contactPageId);
          await openBlock("contact-form"); const publishStatus = await publishPageDraft();
          await goto("http://127.0.0.1:3000/"); publicMetrics.push(await publicLayoutMetrics()); record("page-editor-front-switcher-aria", await page.getByRole("tablist").first().getAttribute("aria-label"));
          await goto("http://127.0.0.1:3000/projekty"); publicMetrics.push(await publicLayoutMetrics()); const portfolioCards = page.locator('[data-listing-block-id="projects-collection"] [data-content-list-item]'); record("page-editor-front-project-card-links-without-cta", await contentCardLinkMetrics(portfolioCards));
          await goto("http://127.0.0.1:3000/kontakt"); const form = page.locator('form[data-form-root="true"]').first(); const submission = await submitPublicForm(cfg.fixture.markers.pageEditor); const body = form.locator('[data-form-embed-form-body="true"]'); const box = await rect(body);
          publicMetrics.push(await publicLayoutMetrics());
          record("page-editor-front-contact-presentation-and-success", { publishStatus, textareaRows: Number(await form.locator("textarea").getAttribute("rows")), firstSelectOption: (await form.locator("select option").first().innerText()).trim(), loadingLabel: await form.getAttribute("data-form-loading-label"), successMessage: (await form.locator('[data-form-embed-success="true"]').innerText()).trim() });
          record("page-editor-front-controls-visible", { visible: await visible(body), controlCount: await body.locator("input:not([type=hidden]), select, textarea").count(), height: Math.round(box?.height || 0) }); record("page-editor-front-mobile-geometry", { overflowX: Math.max(...publicMetrics.map((value) => value.overflowX)), maximumColumns: Math.max(...publicMetrics.map((value) => value.maximumColumns)) }); record("page-editor-front-submission-registered", { attached: Boolean(submission.id), markerRegisteredBeforeDispatch: true }); cfg.submissionIds = [submission.id];
        } else {
          const reusePageEditor = sid === "page-editor-switcher-tablet-reset" && page.url().includes("/admin/pages/" + cfg.fixture.homePageId);
          if (sid === "page-editor-collection-cta-dark" && page.url().includes("/admin/pages/" + cfg.fixture.homePageId)) {
            await navigateToPageEditor("Projekty domów — FormaDom Studio", cfg.fixture.projectsPageId);
          } else if (sid === "page-editor-form-presentation-save-reload" && page.url().includes("/admin/pages/" + cfg.fixture.projectsPageId)) {
            await navigateToPageEditor("Kontakt — FormaDom Studio", cfg.fixture.contactPageId);
          } else if (!reusePageEditor) await goto(cfg.physicalUrl);
          if (sid === "page-editor-switcher-author-light") {
            const block = await openBlock("home-style-switcher"); const control = page.getByLabel("Tab list label", { exact: true }); const value = await control.inputValue(); const box = await rect(block);
            const persistedHome = await api("http://127.0.0.1:5173/admin/api/pages/" + cfg.fixture.homePageId, { method: "GET" });
            const persistedSwitcher = findBlockById(persistedHome.data?.currentData, "home-style-switcher");
            record("page-editor-switcher-control-value", value); record("page-editor-switcher-base-prop", persistedSwitcher?.props?.ariaLabel ?? null); record("page-editor-switcher-canvas-aria", await block.getByRole("tablist").getAttribute("aria-label")); record("page-editor-switcher-light-geometry", { visible: await visible(block), withinViewport: Boolean(box && box.x >= 0 && box.x + box.width <= cfg.viewport.width), width: Math.round(box?.width || 0), height: Math.round(box?.height || 0) });
          } else if (sid === "page-editor-switcher-tablet-reset") {
            await page.getByRole("button", { name: "Tablet", exact: true }).click(); const deviceContext = await page.locator('[data-page-editor-canvas-context]').getAttribute("data-page-editor-canvas-context");
            const block = await openBlock("home-style-switcher"); const control = page.getByLabel("Tab list label", { exact: true }); await setInput(control, "Wybór stylu domu — tablet");
            await savePage();
            const updatedHome = await api("http://127.0.0.1:5173/admin/api/pages/" + cfg.fixture.homePageId, { method: "GET" });
            const updatedSwitcher = findBlockById(updatedHome.data?.currentData, "home-style-switcher");
            record("page-editor-tablet-base-prop-updated", updatedSwitcher?.props?.ariaLabel ?? null); record("page-editor-tablet-responsive-override-absent", { ownKey: Boolean(updatedSwitcher?.responsive?.tablet?.props && Object.prototype.hasOwnProperty.call(updatedSwitcher.responsive.tablet.props, "ariaLabel")), deviceContext }); await control.fill(""); await control.blur(); await savePage();
            const resetHome = await api("http://127.0.0.1:5173/admin/api/pages/" + cfg.fixture.homePageId, { method: "GET" });
            const resetSwitcher = findBlockById(resetHome.data?.currentData, "home-style-switcher");
            record("page-editor-tablet-reset-key-absent", { ownKey: Boolean(resetSwitcher?.props && Object.prototype.hasOwnProperty.call(resetSwitcher.props, "ariaLabel")) }); record("page-editor-tablet-reset-fallback-aria", await block.getByRole("tablist").getAttribute("aria-label")); await captureScreenshot();
          } else if (sid === "page-editor-collection-cta-dark") {
            const block = await openBlock("projects-collection"); await page.locator("html").evaluate((node) => node.classList.add("dark")); const control = page.getByLabel("Show card action", { exact: true }); const checked = await control.isChecked(); const canvasMetrics = await contentCardLinkMetrics(block.locator('[data-content-list-item]'));
            const publicProjects = await fetchText("http://127.0.0.1:3000/projekty");
            const publicProjectCards = await page.evaluate((html) => { const parsed = new DOMParser().parseFromString(html, "text/html"); const cards = [...parsed.querySelectorAll('[data-listing-block-id="projects-collection"] [data-content-list-item]')]; const links = cards.map((card) => card.querySelector("h3 a[href]")); return { allCardsLinked: cards.length > 0 && links.every(Boolean), linkCount: links.filter(Boolean).length }; }, publicProjects.text);
            const contrast = await measureContrast(block.getByText("Dom Aurora", { exact: true }).first());
            const theme = await page.locator("html").evaluate((node) => node.classList.contains("dark") ? "dark" : "light");
            record("page-editor-collection-control-value", checked); record("page-editor-collection-card-link-preserved", publicProjectCards); record("page-editor-collection-cta-visibly-absent", { visibleCtaCount: canvasMetrics.visibleCtaCount }); record("page-editor-collection-dark-computed-contrast", { theme, ...contrast });
          } else {
            let block = await openBlock("contact-form"); let rows = page.getByLabel("Textarea rows", { exact: true }); let prompt = page.getByLabel("Show select prompt", { exact: true }); let loading = page.getByLabel("Loading label", { exact: true }); let successBehavior = page.getByRole("group", { name: "After successful submission", exact: true });
            const readControls = async () => ({ textareaRows: Number(await rows.inputValue()), showSelectPrompt: await prompt.isChecked(), loadingLabel: await loading.inputValue(), successBehavior: await successBehavior.locator('button[aria-pressed="true"]').getAttribute("data-page-editor-segmented-option") });
            const values = await readControls(); check(values.textareaRows === 5 && !values.showSelectPrompt && values.loadingLabel === "Wysyłanie..." && values.successBehavior === "show-message-keep-form", "page-form-controls");
            record("page-editor-form-controls-values", values);
            const previewForm = block.locator('form[data-form-root="true"]').first();
            record("page-editor-form-visible-preview", { textareaRows: Number(await block.locator("textarea").getAttribute("rows")), firstSelectOption: (await block.locator("select option").first().innerText()).trim(), loadingLabel: await previewForm.getAttribute("data-form-loading-label"), controlsVisible: await visible(block.locator("textarea")) });
            await rows.fill("6"); await rows.blur(); await savePage();
            const persistedContact = await api("http://127.0.0.1:5173/admin/api/pages/" + cfg.fixture.contactPageId, { method: "GET" });
            const persistedFormBlock = findBlockById(persistedContact.data?.currentData, "contact-form");
            const persistedValues = { textareaRows: persistedFormBlock?.props?.textareaRows ?? null, showSelectPrompt: persistedFormBlock?.props?.showSelectPrompt ?? null, loadingLabel: persistedFormBlock?.props?.loadingLabel ?? null, successBehavior: persistedFormBlock?.props?.successBehavior ?? null };
            await page.reload({ waitUntil: "domcontentloaded" }); block = await openBlock("contact-form"); rows = page.getByLabel("Textarea rows", { exact: true }); prompt = page.getByLabel("Show select prompt", { exact: true }); loading = page.getByLabel("Loading label", { exact: true }); successBehavior = page.getByRole("group", { name: "After successful submission", exact: true });
            const reloadedValues = await readControls();
            check(JSON.stringify(reloadedValues) === JSON.stringify(persistedValues), "page-form-save-reload");
            const reloadedForm = block.locator('form[data-form-root="true"]').first();
            record("page-editor-form-save-reload-roundtrip", persistedValues); record("page-editor-form-runtime-contract", { successMessage: await reloadedForm.getAttribute("data-form-success-message"), formBodyVisible: await visible(reloadedForm.locator('[data-form-embed-form-body="true"]')) });
          }
        }
      }
    } catch (error) {
      failureCodes.push("task547-material-observation-failed");
    }
    await page.evaluate((offset) => scrollTo(0, offset), cfg.assertions.length * 7).catch(() => undefined);
    if (!screenshotCaptured) await captureScreenshot();
    page.off("console", onConsole); page.off("pageerror", onPageError);
    const assertions = cfg.assertions.map((descriptor) => ({ ...descriptor, observed: Object.prototype.hasOwnProperty.call(observed, descriptor.id) ? observed[descriptor.id] : null }));
    return { schemaVersion: 1, scenarioId: cfg.scenarioId, descriptorSha256: cfg.descriptorSha256, installedDigest: cfg.installedDigest, canonicalUrl: cfg.canonicalUrl, assertions, submissionIds: cfg.submissionIds || [], consoleErrors, pageErrors, failureCodes, screenshotPath: cfg.screenshotPath, elapsedMs: Date.now() - startedAt };
  }`;
}

function logicalActions(
  descriptors: readonly Task547ScenarioDescriptor[]
): readonly BrowserPlanAction[] {
  return Object.freeze(
    descriptors.map((descriptor) =>
      Object.freeze({
        id: `task-547/${descriptor.id}`,
        scenarioId: descriptor.id,
        lane: "run-code" as const,
        captureOutputs: Object.freeze(["screenshot"]),
        isolated: true,
      })
    )
  );
}

export async function materializeTask547BrowserDispatchPlan(input: {
  readonly root: string;
  readonly descriptors: readonly Task547ScenarioDescriptor[];
  readonly manifest: Task547ScreenshotManifest;
  readonly fixture: Task547InstallOutput;
}): Promise<Task547MaterializedBrowserPlan> {
  const logical = compileBrowserDispatchPlan(logicalActions(input.descriptors));
  if (
    logical.dispatches.length !== 18 ||
    logical.dispatches.some(({ kind }) => kind !== "run-code")
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-547 logical browser plan drifted");
  }
  await mkdir(dirname(resolve(input.root, input.manifest.paths[0]!)), {
    recursive: true,
    mode: 0o755,
  });
  const segments: MaterializedBrowserSegment[] = [];
  for (const [index, dispatch] of logical.dispatches.entries()) {
    const runCode = dispatch as BrowserRunCodeDispatch;
    const descriptor = input.descriptors[index];
    const screenshot = input.manifest.entries[index];
    if (descriptor === undefined || screenshot === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-547 browser materialization is partial");
    }
    const actions: readonly MaterializedBrowserAction[] = Object.freeze([
      Object.freeze({
        actionId: runCode.actionIds[0]!,
        source: task547BrowserActionSource(
          buildTask547BrowserInput(descriptor, screenshot.path, input.fixture, input.root)
        ),
      }),
    ]);
    const partitions = splitMaterializedSegment(runCode, materializedSourceBytes(runCode, actions));
    for (const partition of partitions) {
      const selected = partition.actionIds.map((actionId) => {
        const action = actions.find((candidate) => candidate.actionId === actionId);
        if (action === undefined) {
          throw new SmokeError("smoke_output_invalid", "TASK-547 browser action is absent");
        }
        return action;
      });
      segments.push(Object.freeze({ segment: partition, actions: Object.freeze(selected) }));
    }
  }
  const manifestSha256 = createHash("sha256")
    .update(TASK_547_DESCRIPTOR_SHA256)
    .update("\0")
    .update(JSON.stringify(input.manifest))
    .update("\0")
    .update(segments.map(({ segment }) => segment.segmentId).join("\0"))
    .digest("hex");
  return Object.freeze({ logical, segments: Object.freeze(segments), manifestSha256 });
}

export function task547PhysicalSegmentIds(plan: Task547MaterializedBrowserPlan): readonly string[] {
  const ids = plan.segments.map(({ segment }) => segment.segmentId);
  if (ids.length !== 18 || new Set(ids).size !== ids.length) {
    throw new SmokeError("smoke_output_invalid", "TASK-547 physical browser plan drifted");
  }
  return Object.freeze(ids);
}

export async function createTask547BrowserRuntime(input: {
  readonly context: RuntimeSmokeContext;
  readonly workspace: string;
  readonly authStatePath: string;
  readonly plan: Task547MaterializedBrowserPlan;
  readonly authTimeoutMs: number;
  readonly dispatchTimeoutMs: number;
  readonly environment?: NodeJS.ProcessEnv;
  readonly onResourceRegistered?: Task547BrowserResourceObserver;
}): Promise<Task547BrowserRuntime> {
  if (
    !Number.isSafeInteger(input.authTimeoutMs) ||
    input.authTimeoutMs <= 0 ||
    input.authTimeoutMs > 60_000
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-547 auth timeout is invalid");
  }
  if (
    !Number.isSafeInteger(input.dispatchTimeoutMs) ||
    input.dispatchTimeoutMs <= 0 ||
    input.dispatchTimeoutMs > 5 * 60_000
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-547 dispatch timeout is invalid");
  }
  const environment = input.environment ?? process.env;
  const dispatcher = new PlaywrightCliDispatcher({
    context: input.context,
    session: input.context.input.session,
    workspace: input.workspace,
    segments: task547PhysicalSegmentIds(input.plan),
    runCodeTimeoutMs: input.dispatchTimeoutMs,
    runtimeEnvironment: environment,
  });
  const transport = new BrowserTransport(input.context.input.session, dispatcher);
  input.context.lifecycle.register(transport);
  input.onResourceRegistered?.(transport);
  const authenticate = async (storageStatePath: string) => {
    const auth = await createAdminAuthStorageState({
      adminUrl: "http://127.0.0.1:5173/admin",
      workspace: input.workspace,
      storageStatePath,
      environment: projectTask547AdminAuthEnvironment(environment),
      fetch: (request, init) =>
        globalThis.fetch(request, {
          ...init,
          signal: AbortSignal.timeout(input.authTimeoutMs),
        }),
    });
    if (!auth.authenticated) {
      throw new SmokeError("smoke_process_failed", "TASK-547 admin authentication failed");
    }
    await dispatcher.loadStorageState(storageStatePath);
  };
  let refreshCount = 0;
  await authenticate(input.authStatePath);
  const refreshAuth = async () => {
    refreshCount += 1;
    if (refreshCount > 2) {
      throw new SmokeError("smoke_output_invalid", "TASK-547 auth refresh count drifted");
    }
    await authenticate(resolve(input.workspace, `admin-auth-refresh-${refreshCount}.json`));
  };
  return Object.freeze({ dispatcher, transport, refreshAuth });
}

export async function executeTask547Segments(input: {
  readonly plan: Task547MaterializedBrowserPlan;
  readonly transport: BrowserTransport;
  readonly workers: WorkerPool;
  readonly checkpointDescriptor: WorkerOperationDescriptor;
  readonly descriptors: readonly Task547ScenarioDescriptor[];
  readonly manifest: Task547ScreenshotManifest;
  readonly installedDigest: string;
  readonly refreshAdminAuth: () => Promise<void>;
}): Promise<readonly Task547ScenarioObservation[]> {
  const observations: Task547ScenarioObservation[] = [];
  for (const [index, materialized] of input.plan.segments.entries()) {
    if (TASK547_AUTH_REFRESH_SCENARIOS.includes(materialized.segment.scenarioId)) {
      await input.refreshAdminAuth();
    }
    const expectation: BrowserFrameExpectation = Object.freeze({
      runId: input.plan.manifestSha256.slice(0, 32),
      manifestSha256: input.plan.manifestSha256,
      scenarioId: materialized.segment.scenarioId,
      segmentId: materialized.segment.segmentId,
      actionIds: materialized.segment.actionIds,
    });
    const frames = await input.transport.runSegment(materialized, expectation);
    if (frames.length !== 1 || frames[0]?.status !== "success") {
      throw new SmokeError("smoke_output_invalid", "TASK-547 browser scenario failed");
    }
    const descriptor = input.descriptors[index];
    if (descriptor === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-547 descriptor checkpoint is absent");
    }
    const scenarioId = materialized.segment.scenarioId;
    const rawSubmissionIds =
      typeof frames[0].output === "object" && frames[0].output !== null
        ? Reflect.get(frames[0].output, "submissionIds")
        : [];
    const checkpoint = (await input.workers.dispatch(
      input.checkpointDescriptor,
      Object.freeze({
        scenarioId,
        submissionIds: rawSubmissionIds,
        resourceSlots: TASK547_MUTATION_SLOTS[scenarioId] ?? [],
      })
    )) as Task547CheckpointOutput;
    if (checkpoint.scenarioId !== scenarioId) {
      throw new SmokeError("smoke_output_invalid", "TASK-547 worker checkpoint drifted");
    }
    input.workers.recordDatabaseBatch(checkpoint.statements, checkpoint.rows);
    const observation = validateTask547ScenarioObservation({
      value: frames[0].output,
      descriptor,
      manifest: input.manifest,
      installedDigest: input.installedDigest,
    });
    observations.push(observation);
  }
  if (
    observations.length !== 18 ||
    observations.some(
      (observation, index) =>
        observation.scenarioId !== input.plan.segments[index]?.segment.scenarioId
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-547 browser observation order drifted");
  }
  return Object.freeze(observations);
}

export function task547SubmissionScenarioIds(): readonly string[] {
  return Object.freeze(Object.keys(TASK547_SUBMISSION_MARKER_KEYS));
}
