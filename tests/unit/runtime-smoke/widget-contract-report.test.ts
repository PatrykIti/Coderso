import { expect, test } from "bun:test";
import {
  createAdminFixtureGapMode,
  createFailedAdminMode,
  finalizeAdminResult,
  findDuplicateWritablePaths,
  hasStrictFailure,
  renderMarkdown,
  summarize,
} from "../../../scripts/playwright-widget-contract-smoke";
import { makeInventory, makeMode, makeReport } from "./widget-contract-test-support";

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
              createAdminFixtureGapMode("advanced", "block_select_missing"),
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
    fixtureGaps: 2,
    metadataGaps: 1,
  });
});

test("finalizes missing section and duplicate writable path contract failures", () => {
  const [item] = makeInventory().widgets;
  const missingSection = finalizeAdminResult(item, {
    widgetType: "hero",
    modes: [
      makeMode({
        status: "failed",
        sectionCount: 0,
        visibleSectionCount: 0,
        error: "mode_root_or_visible_section_missing",
      }),
    ],
  });

  expect(missingSection.status).toBe("failed");
  expect(missingSection.modes[0]?.error).toBe("mode_root_or_visible_section_missing");

  const duplicateModes = [
    makeMode({ mode: "wizard", writablePaths: ["content.title"] }),
    makeMode({ mode: "visual", writablePaths: ["content.title"] }),
  ];
  expect(findDuplicateWritablePaths(duplicateModes)).toEqual(["content.title"]);
  expect(
    findDuplicateWritablePaths([
      makeMode({ mode: "visual", writablePaths: ["content.item", "content.item"] }),
    ])
  ).toEqual([]);
  expect(
    findDuplicateWritablePaths(duplicateModes, [
      {
        path: "content.title",
        reason: "temporary migration overlap",
        expiresWithTask: "TASK-336-17",
      },
    ])
  ).toEqual([]);
});

test("records per-mode probe errors without losing required mode coverage", () => {
  const failed = createFailedAdminMode("advanced", "widget_block_type_missing");

  expect(failed).toMatchObject({
    mode: "advanced",
    status: "failed",
    rootCount: 0,
    visibleSectionCount: 0,
    error: "widget_block_type_missing",
  });
});

test("strict mode treats fixture and metadata gaps as failures", () => {
  const report = makeReport({
    summary: {
      adminFailures: 0,
      publicFailures: 0,
      fixtureGaps: 1,
      metadataGaps: 1,
    },
  });

  expect(hasStrictFailure(report)).toBe(true);
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
  expect(markdown).toContain("- **Playwright session:** widget-contract-smoke");
  expect(markdown).toContain("wizard:failed r1/s1/v0");
  expect(markdown).toContain(
    "screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-hero.png"
  );
});
