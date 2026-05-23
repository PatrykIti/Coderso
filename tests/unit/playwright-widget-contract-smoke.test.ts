import { describe, expect, test } from "bun:test";

import {
  parseArgs,
  extractCliJson,
  renderMarkdown,
  selectCases,
  summarize,
  validateInventory,
  type SmokeInventory,
  type SmokeReport,
} from "../../scripts/playwright-widget-contract-smoke";

function makeInventory(overrides: Partial<SmokeInventory> = {}): SmokeInventory {
  return {
    version: 1,
    expectedWidgetCount: 2,
    excludedScreenOnlyWidgets: [
      "screen-record-header",
      "screen-field-value",
      "screen-field-group",
      "screen-two-column",
    ],
    widgets: [
      {
        widgetType: "hero",
        title: "Hero",
        adminInsertLabel: "Hero",
        adminFixtureSlug: "/ctr-hero",
        publicPath: "/hero",
        publicFixtureStatus: "published",
        requiredModes: ["wizard", "visual", "advanced"],
        cssChecks: ["body-overflow"],
      },
      {
        widgetType: "spacer",
        title: "Spacer",
        adminInsertLabel: "Spacer",
        adminFixtureSlug: "/ctr-spacer",
        publicPath: "/spacer",
        publicFixtureStatus: "published",
        requiredModes: ["wizard", "visual", "advanced"],
      },
    ],
    ...overrides,
  };
}

function makeReport(overrides: Partial<SmokeReport> = {}): SmokeReport {
  return {
    generatedAt: "2026-05-23T00:00:00.000Z",
    command: "bun scripts/playwright-widget-contract-smoke.ts --dry-run",
    dryRun: false,
    inventory: {
      expectedWidgetCount: 2,
      actualWidgetCount: 2,
      excludedScreenOnlyWidgets: [],
      selectedWidgetTypes: ["hero", "spacer"],
    },
    environment: {
      adminUrl: "http://localhost:5173/admin",
      frontUrl: "http://localhost:3000",
      adminReachable: true,
      frontReachable: true,
      playwrightCliAvailable: true,
    },
    admin: {
      skipped: false,
      loginAttempted: true,
      authenticated: true,
      results: [],
    },
    public: {
      skipped: false,
      results: [],
    },
    summary: {
      adminFailures: 0,
      publicFailures: 0,
      fixtureGaps: 0,
      metadataGaps: 0,
    },
    ...overrides,
  };
}

describe("playwright widget contract smoke helpers", () => {
  test("parses debug and target flags without exposing credentials", () => {
    const args = parseArgs([
      "--session",
      "widget-contract-smoke-local",
      "--admin=http://localhost:5173/admin",
      "--front",
      "http://localhost:3000",
      "--widget",
      "hero",
      "--limit=1",
      "--dry-run",
      "--strict",
    ]);

    expect(args).toMatchObject({
      session: "widget-contract-smoke-local",
      adminUrl: "http://localhost:5173/admin",
      frontUrl: "http://localhost:3000",
      widgetType: "hero",
      limit: 1,
      dryRun: true,
      strict: true,
    });
  });

  test("validates the 38-widget inventory contract shape", () => {
    expect(() => validateInventory(makeInventory())).not.toThrow();
    expect(() =>
      validateInventory(
        makeInventory({
          expectedWidgetCount: 3,
        })
      )
    ).toThrow("inventory_widget_count_mismatch");
    expect(() =>
      validateInventory(
        makeInventory({
          expectedWidgetCount: 1,
          widgets: [
            {
              widgetType: "screen-field-value",
              title: "Screen Field Value",
              adminInsertLabel: "Screen Field Value",
              adminFixtureSlug: "/screen-field-value",
              requiredModes: ["wizard"],
            },
          ],
        })
      )
    ).toThrow("inventory_screen_only_included");
  });

  test("selects a single widget or limit for targeted smoke debugging", () => {
    const inventory = makeInventory();

    expect(
      selectCases(inventory, parseArgs(["--widget", "spacer"])).map((item) => item.widgetType)
    ).toEqual(["spacer"]);
    expect(
      selectCases(inventory, parseArgs(["--limit", "1"])).map((item) => item.widgetType)
    ).toEqual(["hero"]);
    expect(() => selectCases(inventory, parseArgs(["--widget", "missing"]))).toThrow(
      "widget_not_found:missing"
    );
  });

  test("extracts JSON from the current playwright-cli markdown envelope", () => {
    const parsed = extractCliJson<{ ok: boolean }>(
      [
        "### Result",
        '"{\\"ok\\":true}"',
        "### Ran Playwright code",
        "```js",
        "await fn(page);",
        "```",
      ].join("\n")
    );

    expect(parsed).toEqual({ ok: true });
  });

  test("summarizes environment failures, fixture gaps, and metadata gaps distinctly", () => {
    const summary = summarize(
      makeReport({
        admin: {
          skipped: false,
          loginAttempted: false,
          authenticated: null,
          error: "admin_unreachable",
          results: [
            {
              widgetType: "hero",
              status: "metadata-gap",
              adminPath: "http://localhost:5173/admin/pages/1",
              pageId: "1",
              duplicateWritablePaths: [],
              modes: [
                {
                  mode: "wizard",
                  status: "passed",
                  rootCount: 1,
                  sectionCount: 1,
                  visibleSectionCount: 1,
                  writablePaths: [],
                  controlsWithoutPath: 2,
                },
              ],
            },
          ],
        },
        public: {
          skipped: false,
          error: "front_unreachable",
          results: [
            {
              widgetType: "spacer",
              status: "fixture-gap",
              publicPath: null,
              error: "public_fixture_missing",
            },
          ],
        },
      })
    );

    expect(summary).toEqual({
      adminFailures: 1,
      publicFailures: 1,
      fixtureGaps: 1,
      metadataGaps: 1,
    });
  });

  test("renders visible section and local screenshot evidence in markdown", () => {
    const markdown = renderMarkdown(
      makeReport({
        admin: {
          skipped: false,
          loginAttempted: true,
          authenticated: true,
          results: [
            {
              widgetType: "hero",
              status: "failed",
              duplicateWritablePaths: [],
              modes: [
                {
                  mode: "wizard",
                  status: "failed",
                  rootCount: 1,
                  sectionCount: 1,
                  visibleSectionCount: 0,
                  writablePaths: [],
                  controlsWithoutPath: 0,
                  error: "mode_root_or_visible_section_missing",
                },
              ],
            },
          ],
        },
        public: {
          skipped: false,
          results: [
            {
              widgetType: "hero",
              status: "passed",
              publicPath: "/hero",
              statusCode: 200,
              bodyOverflow: false,
              viewportWidth: 1365,
              documentWidth: 1365,
              emptyFixture: false,
              screenshotPath: ".tmp/playwright-widget-contract-smoke/screenshots/public-hero.png",
              unmarkedOverflowOwners: [],
            },
          ],
        },
      })
    );

    expect(markdown).toContain("- Admin auth: authenticated");
    expect(markdown).toContain("wizard:failed r1/s1/v0");
    expect(markdown).toContain(
      "screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-hero.png"
    );
  });
});
