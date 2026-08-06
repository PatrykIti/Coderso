import { expect, test } from "bun:test";
import adapter, {
  buildWidgetContractInventoryOverlay,
  buildWidgetPublicProbeSource,
  projectWidgetContractEnvironment,
  resolveWidgetProbeSession,
  validateWidgetContractReport,
  validateWidgetPublicProbe,
} from "../../../scripts/runtime-smoke/adapters/widget-contract";

function canonicalInventory(): unknown {
  return {
    version: 1,
    expectedWidgetCount: 2,
    excludedScreenOnlyWidgets: ["screen-record-header"],
    widgets: [
      {
        widgetType: "hero",
        title: "Hero",
        adminInsertLabel: "Hero",
        adminFixtureSlug: "/hero",
        publicPath: "/hero",
        requiredModes: ["visual"],
        priority: "P1",
      },
      {
        widgetType: "gallery-mosaic",
        title: "Gallery Mosaic",
        adminInsertLabel: "Gallery Mosaic",
        adminFixtureSlug: "/ctr-gallery-mosaic-2305",
        publicPath: "/gallery-mosaic-test-0516",
        publicFixtureStatus: "published",
        requiredModes: ["visual", "advanced"],
        cssChecks: ["body-overflow"],
      },
    ],
  };
}

function canonicalReport(): unknown {
  return {
    generatedAt: "2026-08-06T12:00:00.000Z",
    command: "bun scripts/playwright-widget-contract-smoke.ts --strict",
    dryRun: false,
    inventory: {
      expectedWidgetCount: 1,
      actualWidgetCount: 1,
      excludedScreenOnlyWidgets: ["screen-record-header"],
      selectedWidgetTypes: ["gallery-mosaic"],
    },
    environment: {
      adminUrl: "http://localhost:5173/admin",
      frontUrl: "http://localhost:3000",
      resolvedPlaywrightSession: "wf552-gallery",
      adminReachable: true,
      frontReachable: true,
      playwrightCliAvailable: true,
    },
    admin: {
      skipped: false,
      loginAttempted: true,
      authenticated: true,
      results: [
        {
          widgetType: "gallery-mosaic",
          status: "passed",
          pageId: "fixture-page",
          adminPath: "http://localhost:5173/admin/pages/fixture-page",
          modes: [
            {
              mode: "visual",
              status: "passed",
              rootCount: 1,
              sectionCount: 9,
              visibleSectionCount: 9,
              writablePaths: ["items.href"],
              controlsWithoutPath: 0,
            },
            {
              mode: "advanced",
              status: "passed",
              rootCount: 1,
              sectionCount: 6,
              visibleSectionCount: 6,
              writablePaths: [],
              controlsWithoutPath: 0,
            },
          ],
          duplicateWritablePaths: [],
          mediaProof: {
            status: "passed",
            adminHasImage: true,
            publicHasImage: true,
            publicPath: "/gallery-mosaic-test-0516",
            adminAlt: "fixture",
            publicAlt: "fixture",
            adminSrc: "/media/admin",
            publicSrc: "/media/public",
            publicLightboxOpened: true,
            publicLightboxClosed: true,
          },
        },
      ],
    },
    public: {
      skipped: false,
      results: [
        {
          widgetType: "gallery-mosaic",
          publicPath: "/gallery-mosaic-test-0516",
          statusCode: 200,
          status: "passed",
          emptyFixture: false,
          bodyOverflow: false,
          viewportWidth: 1280,
          documentWidth: 1280,
          screenshotPath:
            ".tmp/playwright-widget-contract-smoke/screenshots/public-gallery-mosaic.png",
          unmarkedOverflowOwners: [],
        },
      ],
    },
    summary: {
      adminFailures: 0,
      publicFailures: 0,
      fixtureGaps: 0,
      metadataGaps: 0,
    },
  };
}

test("widget adapter exposes only the strict focused fast profile", () => {
  expect(adapter.suiteId).toBe("widget-contract");
  expect(adapter.supportedProfiles).toEqual(["fast"]);
});

test("widget inventory overlay contains only gallery-mosaic and forces screenshot priority", () => {
  const input = canonicalInventory();
  const before = structuredClone(input);
  const overlay = buildWidgetContractInventoryOverlay(input);
  expect(overlay).toEqual({
    version: 1,
    expectedWidgetCount: 1,
    excludedScreenOnlyWidgets: ["screen-record-header"],
    widgets: [
      {
        widgetType: "gallery-mosaic",
        title: "Gallery Mosaic",
        adminInsertLabel: "Gallery Mosaic",
        adminFixtureSlug: "/ctr-gallery-mosaic-2305",
        publicPath: "/gallery-mosaic-test-0516",
        publicFixtureStatus: "published",
        requiredModes: ["visual", "advanced"],
        cssChecks: ["body-overflow"],
        priority: "P0",
      },
    ],
  });
  expect(input).toEqual(before);

  const missing = canonicalInventory() as { widgets: unknown[] };
  missing.widgets = missing.widgets.filter(
    (entry) => (entry as { widgetType?: string }).widgetType !== "gallery-mosaic"
  );
  expect(() => buildWidgetContractInventoryOverlay(missing)).toThrow(
    "gallery-mosaic inventory entry is absent"
  );
});

test("widget report requires strict admin, media, public overflow, and screenshot proof", () => {
  expect(validateWidgetContractReport(canonicalReport())).toEqual({
    screenshotPath: ".tmp/playwright-widget-contract-smoke/screenshots/public-gallery-mosaic.png",
    adminPassed: true,
    publicPassed: true,
    mediaPassed: true,
  });

  const missingScreenshot = structuredClone(canonicalReport()) as {
    public: { results: Array<Record<string, unknown>> };
  };
  delete missingScreenshot.public.results[0]?.screenshotPath;
  expect(() => validateWidgetContractReport(missingScreenshot)).toThrow(
    "unknown or missing fields"
  );

  const failedMedia = structuredClone(canonicalReport()) as {
    admin: { results: Array<{ mediaProof: { status: string } }> };
  };
  failedMedia.admin.results[0]!.mediaProof.status = "failed";
  expect(() => validateWidgetContractReport(failedMedia)).toThrow("media proof did not pass");

  const unknownTopLevel = structuredClone(canonicalReport()) as Record<string, unknown>;
  unknownTopLevel.rawLog = "not allowed";
  expect(() => validateWidgetContractReport(unknownTopLevel)).toThrow("unknown or missing fields");
});

test("fresh public probe installs real listeners before navigation and fails closed on errors", () => {
  const source = buildWidgetPublicProbeSource();
  expect(source.indexOf('page.on("console"')).toBeGreaterThan(-1);
  expect(source.indexOf('page.on("pageerror"')).toBeGreaterThan(-1);
  expect(source.indexOf('page.on("console"')).toBeLessThan(source.indexOf("page.goto"));
  expect(source.indexOf('page.on("pageerror"')).toBeLessThan(source.indexOf("page.goto"));
  expect(source).toContain('[data-widget-type="gallery-mosaic"]');
  expect(source).not.toContain("message.text()");

  expect(
    validateWidgetPublicProbe({
      statusCode: 200,
      galleryRootCount: 1,
      rootVisible: true,
      consoleErrorCount: 0,
      pageErrorCount: 0,
    })
  ).toEqual({
    statusCode: 200,
    galleryRootCount: 1,
    rootVisible: true,
    consoleErrorCount: 0,
    pageErrorCount: 0,
  });
  expect(() =>
    validateWidgetPublicProbe({
      statusCode: 200,
      galleryRootCount: 1,
      rootVisible: true,
      consoleErrorCount: 1,
      pageErrorCount: 0,
    })
  ).toThrow("public error probe failed");
});

test("widget environment is least-privilege and long probe sessions remain bounded", () => {
  expect(
    projectWidgetContractEnvironment({
      PATH: "/usr/bin",
      ADMIN_EMAIL: "admin@example.test",
      ADMIN_PASSWORD: "private-value",
      DATABASE_URL: "postgres://must-not-pass",
    })
  ).toEqual({
    PATH: "/usr/bin",
    CODERSO_PLAYWRIGHT_EMAIL: "admin@example.test",
    CODERSO_PLAYWRIGHT_PASSWORD: "private-value",
  });
  expect(() => projectWidgetContractEnvironment({ PATH: "/usr/bin" })).toThrow(
    "credentials are incomplete"
  );

  expect(resolveWidgetProbeSession("wf552-gallery")).toBe("wf552-gallery-widget-public");
  const bounded = resolveWidgetProbeSession(`w${"f".repeat(62)}`);
  expect(bounded.length).toBeLessThanOrEqual(64);
  expect(bounded).toMatch(/^[a-z0-9-]+$/u);
});
