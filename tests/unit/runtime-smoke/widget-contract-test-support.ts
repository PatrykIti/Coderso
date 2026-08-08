import type {
  AdminModeResult,
  SmokeInventory,
  SmokeReport,
} from "../../../scripts/playwright-widget-contract-smoke";

export function makeInventory(overrides: Partial<SmokeInventory> = {}): SmokeInventory {
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

export function makeReport(overrides: Partial<SmokeReport> = {}): SmokeReport {
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
      resolvedPlaywrightSession: "widget-contract-smoke",
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

export function makeMode(overrides: Partial<AdminModeResult> = {}): AdminModeResult {
  return {
    mode: "wizard",
    status: "passed",
    rootCount: 1,
    sectionCount: 1,
    visibleSectionCount: 1,
    writablePaths: [],
    controlsWithoutPath: 0,
    ...overrides,
  };
}

export const logoCloudCase: SmokeInventory["widgets"][number] = {
  widgetType: "logo-cloud",
  title: "Logo Cloud",
  adminInsertLabel: "Logo Cloud",
  adminFixtureSlug: "/ctr-logo-cloud",
  publicPath: "/logo-cloud",
  publicFixtureStatus: "published",
  requiredModes: ["wizard", "visual", "advanced"],
};

export const galleryMosaicCase: SmokeInventory["widgets"][number] = {
  widgetType: "gallery-mosaic",
  title: "Gallery Mosaic",
  adminInsertLabel: "Gallery Mosaic",
  adminFixtureSlug: "/ctr-gallery-mosaic",
  publicPath: "/gallery-mosaic",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

export const teamCase: SmokeInventory["widgets"][number] = {
  widgetType: "team",
  title: "Team",
  adminInsertLabel: "Team",
  adminFixtureSlug: "/ctr-team",
  publicPath: "/team",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

export const richTextSectionCase: SmokeInventory["widgets"][number] = {
  widgetType: "rich-text-section",
  title: "Rich Text Section",
  adminInsertLabel: "Rich Text Section",
  adminFixtureSlug: "/ctr-rich-text-section",
  publicPath: "/rich-text-section",
  publicFixtureStatus: "published",
  requiredModes: ["wizard", "visual", "advanced"],
};

export const contentListCase: SmokeInventory["widgets"][number] = {
  widgetType: "content-list",
  title: "Content List",
  adminInsertLabel: "Content List",
  adminFixtureSlug: "/ctr-content-list-2305",
  publicPath: "/test-content-list-0516",
  publicFixtureStatus: "published",
  requiredModes: ["wizard", "visual", "advanced"],
};

export const postsFeedCase: SmokeInventory["widgets"][number] = {
  widgetType: "posts-feed",
  title: "Posts Feed",
  adminInsertLabel: "Posts Feed",
  adminFixtureSlug: "/posts-feed-test-page",
  publicPath: "/posts-feed-test-page",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

export const productGalleryCase: SmokeInventory["widgets"][number] = {
  widgetType: "product-gallery",
  title: "Product Gallery",
  adminInsertLabel: "Product Gallery",
  adminFixtureSlug: "/audit-31-05-product-gallery",
  publicPath: "/audit-31-05-product-gallery",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

export const productCompareCase: SmokeInventory["widgets"][number] = {
  widgetType: "product-compare",
  title: "Product Compare",
  adminInsertLabel: "Product Compare",
  adminFixtureSlug: "/audit-31-05-product-compare",
  publicPath: "/audit-31-05-product-compare",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

export const productTableCase: SmokeInventory["widgets"][number] = {
  widgetType: "product-table",
  title: "Product Table",
  adminInsertLabel: "Product Table",
  adminFixtureSlug: "/audit-31-05-product-table",
  publicPath: "/audit-31-05-product-table",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

export const entryTeaserCase: SmokeInventory["widgets"][number] = {
  widgetType: "entry-teaser",
  title: "Entry Teaser",
  adminInsertLabel: "Entry Teaser",
  adminFixtureSlug: "/audit-31-05-entry-teaser",
  publicPath: "/audit-31-05-entry-teaser",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};
