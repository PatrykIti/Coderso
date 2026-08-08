import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  executeTask547Segments,
  materializeTask547BrowserDispatchPlan,
  projectTask547AdminAuthEnvironment,
  task547AuthRefreshScenarioIds,
  task547PhysicalSegmentIds,
} from "../../../scripts/runtime-smoke/adapters/task-547/browser-segments";
import { task547ScenarioDescriptors } from "../../../scripts/runtime-smoke/adapters/task-547/descriptors";
import { buildExactTask547ScreenshotManifest } from "../../../scripts/runtime-smoke/adapters/task-547/output-manifest";
import type { Task547InstallOutput } from "../../../scripts/runtime-smoke/adapters/task-547/worker-operations";
import { MAX_BROWSER_SEGMENT_SOURCE_BYTES } from "../../../scripts/runtime-smoke/browser/contracts";

const ids = Array.from(
  { length: 7 },
  (_value, index) => `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
);

function fixture(): Task547InstallOutput {
  return {
    schemaVersion: 1,
    sourceRunId: ids[0]!,
    actorId: ids[1]!,
    publicFormId: ids[2]!,
    internalFormId: ids[3]!,
    homePageId: ids[4]!,
    projectsPageId: ids[5]!,
    contactPageId: ids[6]!,
    apiKeySecret: "task547-private-browser-plan-secret",
    markers: {
      publicContact: "wf547-public-contact-cccccccccccc",
      internalSession: "wf547-internal-session-cccccccccccc",
      internalApiKey: "wf547-internal-api-cccccccccccc",
      formDesign: "wf547-form-design-cccccccccccc",
      pageEditor: "wf547-page-editor-cccccccccccc",
    },
    installedDigest: "c".repeat(64),
    lifecycle: {
      stagedThenPublished: ["page", "entry", "detail_page", "menu"],
      directPublished: ["form"],
      statusless: ["listing_template"],
      enabledOnlyOnAction: true,
    },
    statements: 1,
    rows: 1,
  };
}

async function plan(root: string, profile: "fast" | "certification") {
  return materializeTask547BrowserDispatchPlan({
    root,
    descriptors: task547ScenarioDescriptors(profile),
    manifest: buildExactTask547ScreenshotManifest({
      command: "run",
      suite: "task-547",
      profile,
      session: `wf547-${profile}`,
    }),
    fixture: fixture(),
  });
}

test("TASK-547 materializes exactly 18 isolated bounded physical segments in one session plan", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-task547-browser-"));
  try {
    const materialized = await plan(root, "fast");
    expect(materialized.logical.logicalBrowserActions).toBe(18);
    expect(materialized.logical.physicalDispatches).toBe(18);
    expect(materialized.segments).toHaveLength(18);
    expect(task547PhysicalSegmentIds(materialized)).toEqual(
      Array.from({ length: 18 }, (_value, index) => `segment-${String(index + 1).padStart(4, "0")}`)
    );
    expect(
      materialized.segments.every(
        ({ actions }) =>
          actions.length === 1 &&
          Buffer.byteLength(actions[0]!.source) <= MAX_BROWSER_SEGMENT_SOURCE_BYTES
      )
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TASK-547 fast and certification materialize the same logical and physical scenario plan", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-task547-browser-parity-"));
  try {
    const [fast, certification] = await Promise.all([
      plan(root, "fast"),
      plan(root, "certification"),
    ]);
    expect(fast.logical).toEqual(certification.logical);
    expect(task547PhysicalSegmentIds(fast)).toEqual(task547PhysicalSegmentIds(certification));
    expect(fast.segments.map(({ segment }) => segment.scenarioId)).toEqual(
      certification.segments.map(({ segment }) => segment.scenarioId)
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TASK-547 browser auth maps repository credentials to the shared minimal aliases", () => {
  expect(
    projectTask547AdminAuthEnvironment({
      ADMIN_EMAIL: "admin@example.test",
      ADMIN_PASSWORD: "private-password",
      DATABASE_URL: "must-not-pass",
    })
  ).toEqual({
    CODERSO_PLAYWRIGHT_EMAIL: "admin@example.test",
    CODERSO_PLAYWRIGHT_PASSWORD: "private-password",
  });
  expect(() => projectTask547AdminAuthEnvironment({ ADMIN_EMAIL: "admin@example.test" })).toThrow(
    "credentials are incomplete"
  );
});

test("TASK-547 refreshes bounded admin auth at each long browser group boundary", () => {
  expect(task547AuthRefreshScenarioIds()).toEqual([
    "form-design-author-light",
    "page-editor-switcher-author-light",
  ]);
});

test("TASK-547 API-key and anonymous form probes omit the authenticated browser session", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-task547-browser-auth-boundary-"));
  try {
    const materialized = await plan(root, "fast");
    const source = materialized.segments.find(
      ({ segment }) => segment.scenarioId === "contact-form"
    )?.actions[0]?.source;
    expect(source).toContain(
      'const internalDirectEndpoint = "http://127.0.0.1:3000/admin/api/forms/"'
    );
    expect(source?.match(/credentials: "omit"/gu)).toHaveLength(1);
    expect(source?.match(/headers: \{ Cookie: "" \}/gu)).toHaveLength(2);
    expect(source).toContain('Authorization: "Bearer " + secret');
    expect(source?.match(/getAttribute\("placeholder"\)/gu)).toHaveLength(3);
    expect(source).toContain("await consentInput.isChecked()");
    expect(source).toContain("box.right <= cfg.viewport.width");
    expect(source).not.toContain("box.right <= innerWidth");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TASK-547 observations are derived from browser geometry, computed style, and persisted API state", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-task547-browser-integrity-"));
  try {
    const materialized = await plan(root, "fast");
    const source = materialized.segments[0]?.actions[0]?.source ?? "";
    expect(() => Function(`"use strict"; return (${source});`)).not.toThrow();

    for (const forbidden of [
      "Math.max(300",
      "minimumGap: 12",
      "surfaceCount: 2",
      "configuredFailureStatus: 400",
      "afterSubmit: true",
      "gapPx: 0",
      "contrastRatio: 4.5",
      "ownKey: false",
      "dirtyValuePreserved: true",
      "backgroundOverwriteCount: 0",
      "maximumColumns: 1",
      'message: "TASK 547 CAPTCHA policy probe"',
      'const shellHrefs = ["/", "/oferta"',
      'const controls = ["Wszystkie", "Nowoczesna stodoła"',
      'record("portfolio-reference-order", cfg.references.cards)',
      "for (const card of cfg.references.cards)",
    ]) {
      expect(source).not.toContain(forbidden);
    }

    for (const measurement of [
      'node.closest("section")',
      "positiveGaps.length",
      "resetControl.click()",
      'getAttribute("name")',
      `filterForm.locator('input[type="radio"][value="' + key + '"]').check()`,
      'getByRole("button", { name: "Pokaż projekty", exact: true })',
      "url.searchParams.get(canonicalParamName) === key",
      "page.waitForFunction(({ expected, titles })",
      'url.searchParams.set(paramName, "eco")',
      "selectedUsesCanonicalName",
      'getByRole("link", { name: "Wszystkie", exact: true })',
      'url.pathname === "/projekty" && url.search === ""',
      'portfolioCards.locator("a, button")',
      "getBoundingClientRect()",
      'new DOMParser().parseFromString(html, "text/html")',
      "new URLSearchParams(location.search)",
      'new URL("/projekty", location.origin)',
      "getComputedStyle(paint).backgroundColor",
      "const tabletHeroArt = await measureHeroArt({ width: 744, height: 1133 })",
      "desktopHeroArt.nonZero + tabletHeroArt.nonZero + mobileHeroArt.nonZero",
      'fetchText("http://127.0.0.1:3000" + route)',
      'new DOMParser().parseFromString(html, "text/html")',
      "statistics.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING",
      "node.compareDocumentPosition(assumptionsGrid) & Node.DOCUMENT_POSITION_FOLLOWING",
      '[data-grid-column="column:gallery-tall"], [data-grid-column="column:gallery-default"], [data-grid-column="column:gallery-warm"]',
      "page.locator('[data-feature-grid-variant=\"cards-4\"]').first()",
      "galleryCards.evaluateAll",
      "configuredFailure.status",
      "measurePlacement(dialogNote)",
      "measureContrast(dialogNote)",
      "document.getAnimations()",
      "Promise.allSettled(animations.map((animation) => animation.finished))",
      "persistedForm.data?.settings?.theme?.submit",
      'api("http://127.0.0.1:5173/admin/api/auth/csrf", { method: "GET" })',
      'headers: { "X-CSRF-Token": csrf }',
      "restored.data?.settings?.theme?.submit?.supportingText === cfg.references.note",
      'new BroadcastChannel("coderso.admin.cache")',
      'getByRole("link", { name: "Forms", exact: true }).first().click()',
      'getByRole("link", { name: "Edit form: Zacznij projekt", exact: true }).click()',
      "updatedSwitcher?.responsive?.tablet?.props",
      "block.first().click({ position: { x: 8, y: 8 } })",
      "persistedFormBlock?.props?.textareaRows",
      'button[aria-pressed="true"]',
      "contentCardLinkMetrics",
      "publicProjectCards",
      "publishPageDraft",
      "data-page-editor-canvas-context",
      'response.request().method() === "PATCH" && response.url().endsWith(formEndpoint)',
      'response.request().method() === "PUT" && response.url().endsWith(formEndpoint + "/fields")',
      'response.request().method() === "PUT" && response.url().endsWith(formEndpoint + "/actions")',
      "await button.click(); await Promise.all(responsePromises)",
      'response.request().method() === "PATCH"',
      "publicMetrics.map((value) => value.maximumColumns)",
      'sid === "page-editor-switcher-tablet-reset" && page.url().includes("/admin/pages/" + cfg.fixture.homePageId)',
      'navigateToPageEditor("Projekty domów — FormaDom Studio", cfg.fixture.projectsPageId)',
      'navigateToPageEditor("Kontakt — FormaDom Studio", cfg.fixture.contactPageId)',
      '!page.url().includes("/admin/pages/" + cfg.fixture.contactPageId)',
      ':scope > li > a[data-site-nav-link="true"]',
      'input[type="radio"]',
      "portfolioCards.evaluateAll",
      'card.querySelector("h3 a")',
      '[data-section-id="home-hero"] > [data-page-section-content="true"] > [data-block-id]',
      '[data-listing-block-id="projects-collection"] [data-content-list-item]',
      '[data-section-id="contact-form-section"] > [data-page-section-content="true"] > [data-block-id]',
      "columns: await gridColumns(contactSectionBlocks)",
      'details[data-site-nav-disclosure="true"]',
      "disclosure.evaluate((node) => node.open)",
      '[data-section-id] > [data-page-section-content="true"]',
    ]) {
      expect(source).toContain(measurement);
    }
    expect(source).not.toContain("?category=");
    expect(source).not.toContain("new URL(page.url())");
    expect(source).not.toContain("TASK547_LOCAL_DIAGNOSTICS");
    expect(source).not.toContain('node.closest("[data-block-id]")');
    expect(source).not.toContain('[data-block-id="project-gallery"]');
    expect(source).not.toContain('[data-block-id="project-statistics"]');
    expect(source).not.toContain("previousBlock");
    expect(source).not.toContain("nextBlock");
    expect(source).not.toContain('page.locator("main *")');
    expect(source).not.toContain('await setInput(control, "Wybór stylu domu");');
    expect(source.match(/await restoreSupportingText\(\)/gu)).toHaveLength(1);
    expect(source).not.toContain('await goto("http://127.0.0.1:5173/admin/advanced/forms")');
    expect(source).not.toContain("[data-content-list-cta], [data-entry-teaser-cta]");
    expect(source).not.toContain('locator("xpath=ancestor::a[1]")');
    expect(source).not.toContain("'[data-content-list-cta]'");
    expect(source).not.toContain("header button[aria-expanded]");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TASK-547 checkpoints browser state before validating its observation", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-task547-browser-checkpoint-"));
  try {
    const descriptors = task547ScenarioDescriptors("fast");
    const manifest = buildExactTask547ScreenshotManifest({
      command: "run",
      suite: "task-547",
      profile: "fast",
      session: "wf547-checkpoint",
    });
    const installed = fixture();
    const materialized = await materializeTask547BrowserDispatchPlan({
      root,
      descriptors,
      manifest,
      fixture: installed,
    });
    let checkpointCalls = 0;
    let checkpointInput: unknown = null;
    await expect(
      executeTask547Segments({
        plan: materialized,
        transport: {
          runSegment: async () => [{ status: "success", output: { submissionIds: [] } }],
        } as never,
        workers: {
          dispatch: async (_descriptor: unknown, input: unknown) => {
            checkpointCalls += 1;
            checkpointInput = input;
            return { scenarioId: descriptors[0]!.id, statements: 1, rows: 0 };
          },
          recordDatabaseBatch: () => undefined,
        } as never,
        checkpointDescriptor: {} as never,
        descriptors,
        manifest,
        installedDigest: installed.installedDigest,
        refreshAdminAuth: async () => undefined,
      })
    ).rejects.toThrow("scenario observation has unknown or missing fields");
    expect(checkpointCalls).toBe(1);
    expect(checkpointInput).toEqual({
      scenarioId: descriptors[0]!.id,
      submissionIds: [],
      resourceSlots: [],
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
