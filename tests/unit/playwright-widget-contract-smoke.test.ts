import { describe, expect, test } from "bun:test";

import {
  buildCommerceFixtureContentRoutes,
  buildCommerceFixtureProductPatch,
  buildContentListFixturePageData,
  buildEntryTeaserFixtureContentRoutes,
  buildEntryTeaserFixturePageData,
  buildPostsFeedFixtureContentRoutes,
  buildPostsFeedFixturePageData,
  buildProductCompareFixturePageData,
  buildProductGalleryFixturePageData,
  buildProductTableFixturePageData,
  classifyPublicStatus,
  createAdminFixtureGapMode,
  createFailedAdminMode,
  ensureCommerceWidgetFixtures,
  ensureContentListWidgetFixtures,
  ensureEntryTeaserWidgetFixtures,
  ensureMediaWidgetFixtures,
  ensurePostsFeedWidgetFixtures,
  extractCliJson,
  finalizeAdminResult,
  findDuplicateWritablePaths,
  hasStrictFailure,
  isAdminFixtureUnopenableError,
  parseArgs,
  renderMarkdown,
  resolveCommerceFixtureCollectionIds,
  resolveLogoCloudMediaProofPublicPath,
  resolvePlaywrightCliSessionName,
  selectedCasesNeedCommerceFixtures,
  selectedCasesNeedContentFixtures,
  selectedCasesNeedEntryTeaserFixtures,
  selectedCasesNeedMediaFixtures,
  selectedCasesNeedPostsFixtures,
  selectedCasesNeedProductCompareFixture,
  selectedCasesNeedProductGalleryFixture,
  selectedCasesNeedProductTableFixture,
  selectCases,
  shouldCountOverflowOwner,
  summarize,
  validateInventory,
  type AdminModeResult,
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

function makeMode(overrides: Partial<AdminModeResult> = {}): AdminModeResult {
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

const logoCloudCase: SmokeInventory["widgets"][number] = {
  widgetType: "logo-cloud",
  title: "Logo Cloud",
  adminInsertLabel: "Logo Cloud",
  adminFixtureSlug: "/ctr-logo-cloud",
  publicPath: "/logo-cloud",
  publicFixtureStatus: "published",
  requiredModes: ["wizard", "visual", "advanced"],
};

const galleryMosaicCase: SmokeInventory["widgets"][number] = {
  widgetType: "gallery-mosaic",
  title: "Gallery Mosaic",
  adminInsertLabel: "Gallery Mosaic",
  adminFixtureSlug: "/ctr-gallery-mosaic",
  publicPath: "/gallery-mosaic",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

const teamCase: SmokeInventory["widgets"][number] = {
  widgetType: "team",
  title: "Team",
  adminInsertLabel: "Team",
  adminFixtureSlug: "/ctr-team",
  publicPath: "/team",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

const richTextSectionCase: SmokeInventory["widgets"][number] = {
  widgetType: "rich-text-section",
  title: "Rich Text Section",
  adminInsertLabel: "Rich Text Section",
  adminFixtureSlug: "/ctr-rich-text-section",
  publicPath: "/rich-text-section",
  publicFixtureStatus: "published",
  requiredModes: ["wizard", "visual", "advanced"],
};

const contentListCase: SmokeInventory["widgets"][number] = {
  widgetType: "content-list",
  title: "Content List",
  adminInsertLabel: "Content List",
  adminFixtureSlug: "/ctr-content-list-2305",
  publicPath: "/test-content-list-0516",
  publicFixtureStatus: "published",
  requiredModes: ["wizard", "visual", "advanced"],
};

const postsFeedCase: SmokeInventory["widgets"][number] = {
  widgetType: "posts-feed",
  title: "Posts Feed",
  adminInsertLabel: "Posts Feed",
  adminFixtureSlug: "/posts-feed-test-page",
  publicPath: "/posts-feed-test-page",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

const productGalleryCase: SmokeInventory["widgets"][number] = {
  widgetType: "product-gallery",
  title: "Product Gallery",
  adminInsertLabel: "Product Gallery",
  adminFixtureSlug: "/audit-31-05-product-gallery",
  publicPath: "/audit-31-05-product-gallery",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

const productCompareCase: SmokeInventory["widgets"][number] = {
  widgetType: "product-compare",
  title: "Product Compare",
  adminInsertLabel: "Product Compare",
  adminFixtureSlug: "/audit-31-05-product-compare",
  publicPath: "/audit-31-05-product-compare",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

const productTableCase: SmokeInventory["widgets"][number] = {
  widgetType: "product-table",
  title: "Product Table",
  adminInsertLabel: "Product Table",
  adminFixtureSlug: "/audit-31-05-product-table",
  publicPath: "/audit-31-05-product-table",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

const entryTeaserCase: SmokeInventory["widgets"][number] = {
  widgetType: "entry-teaser",
  title: "Entry Teaser",
  adminInsertLabel: "Entry Teaser",
  adminFixtureSlug: "/audit-31-05-entry-teaser",
  publicPath: "/audit-31-05-entry-teaser",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

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

  test("detects when selected widget cases require commerce fixture bootstrap", () => {
    expect(selectedCasesNeedCommerceFixtures(makeInventory().widgets)).toBe(false);
    expect(selectedCasesNeedCommerceFixtures([productGalleryCase])).toBe(true);
    expect(selectedCasesNeedCommerceFixtures([productCompareCase])).toBe(true);
    expect(selectedCasesNeedCommerceFixtures([productTableCase])).toBe(true);
    expect(selectedCasesNeedProductGalleryFixture([productGalleryCase])).toBe(true);
    expect(selectedCasesNeedProductCompareFixture([productCompareCase])).toBe(true);
    expect(selectedCasesNeedProductCompareFixture([productGalleryCase])).toBe(false);
    expect(selectedCasesNeedProductTableFixture([productTableCase])).toBe(true);
    expect(selectedCasesNeedProductTableFixture([productCompareCase])).toBe(false);
  });

  test("detects when selected widget cases require media fixture bootstrap", () => {
    expect(selectedCasesNeedMediaFixtures(makeInventory().widgets)).toBe(false);
    expect(selectedCasesNeedMediaFixtures([productGalleryCase])).toBe(true);
    expect(selectedCasesNeedMediaFixtures([productCompareCase])).toBe(true);
    expect(selectedCasesNeedMediaFixtures([productTableCase])).toBe(true);
    expect(selectedCasesNeedMediaFixtures([logoCloudCase])).toBe(true);
    expect(selectedCasesNeedMediaFixtures([galleryMosaicCase])).toBe(true);
    expect(selectedCasesNeedMediaFixtures([teamCase])).toBe(true);
    expect(selectedCasesNeedMediaFixtures([richTextSectionCase])).toBe(true);
  });

  test("detects when selected widget cases require content list fixture bootstrap", () => {
    expect(selectedCasesNeedContentFixtures(makeInventory().widgets)).toBe(false);
    expect(selectedCasesNeedContentFixtures([contentListCase])).toBe(true);
  });

  test("detects when selected widget cases require Posts Feed fixture bootstrap", () => {
    expect(selectedCasesNeedPostsFixtures(makeInventory().widgets)).toBe(false);
    expect(selectedCasesNeedPostsFixtures([postsFeedCase])).toBe(true);
  });

  test("detects when selected widget cases require Entry Teaser fixture bootstrap", () => {
    expect(selectedCasesNeedEntryTeaserFixtures(makeInventory().widgets)).toBe(false);
    expect(selectedCasesNeedEntryTeaserFixtures([entryTeaserCase])).toBe(true);
  });

  test("uses the public fixture route for Logo Cloud media proof before admin slug fallback", () => {
    expect(resolveLogoCloudMediaProofPublicPath(logoCloudCase)).toBe("/logo-cloud");
    expect(
      resolveLogoCloudMediaProofPublicPath({
        ...logoCloudCase,
        publicPath: null,
      })
    ).toBe("/ctr-logo-cloud");
  });

  test("builds populated Content List fixture page data without dropping page metadata", () => {
    const next = buildContentListFixturePageData({
      seo: { title: "Keep SEO" },
      settings: { template: "default" },
      blocks: [
        { id: "hero-1", type: "hero", variant: "default", data: { headline: "Keep hero" } },
        {
          id: "content-list-existing",
          type: "content-list",
          variant: "compact",
          data: { title: "Old fixture" },
        },
      ],
    });
    const blocks = next.blocks as Array<Record<string, unknown>>;
    const contentListBlock = blocks.find((block) => block.type === "content-list");
    const data = contentListBlock?.data as Record<string, unknown> | undefined;
    const source = data?.source as Record<string, unknown> | undefined;
    const resolved = data?.resolved as Record<string, unknown> | undefined;
    const items = resolved?.items as Array<Record<string, unknown>> | undefined;
    const pagination = data?.pagination as Record<string, unknown> | undefined;

    expect(next.seo).toEqual({ title: "Keep SEO" });
    expect(next.settings).toEqual({ template: "default" });
    expect(blocks[0]?.type).toBe("hero");
    expect(contentListBlock).toMatchObject({
      id: "content-list-existing",
      type: "content-list",
      variant: "cards",
    });
    expect(source).toMatchObject({
      mode: "legacy",
      contentTypeId: "fixture-content-type",
      statusScope: "published",
      limit: 2,
    });
    expect(pagination).toMatchObject({
      mode: "load-more",
      pageSize: 2,
      viewAllHref: "/fixture-content-list",
    });
    expect(items).toHaveLength(2);
    expect(items?.[0]).toMatchObject({
      href: "/fixture-content-list/launch-brief",
      imageAlt: "Fixture Content List launch brief image",
      tags: ["launch", "featured"],
    });
    expect(resolved?.runtime).toMatchObject({
      page: 1,
      pageSize: 2,
      totalPages: 2,
      nextPageHref: "?cl.content-list-existing.page=2",
    });
  });

  test("builds populated Posts Feed fixture page data without dropping page metadata", () => {
    const next = buildPostsFeedFixturePageData({
      seo: { title: "Keep SEO" },
      settings: { template: "default" },
      blocks: [
        { id: "hero-1", type: "hero", variant: "default", data: { headline: "Keep hero" } },
        {
          id: "posts-feed-existing",
          type: "posts-feed",
          variant: "list",
          data: { title: "Old fixture" },
        },
      ],
    });
    const blocks = next.blocks as Array<Record<string, unknown>>;
    const postsFeedBlock = blocks.find((block) => block.type === "posts-feed");
    const data = postsFeedBlock?.data as Record<string, unknown> | undefined;
    const source = data?.source as Record<string, unknown> | undefined;
    const fields = data?.fields as Record<string, unknown> | undefined;
    const pagination = data?.pagination as Record<string, unknown> | undefined;
    const resolved = data?.resolved as Record<string, unknown> | undefined;
    const runtime = resolved?.runtime as Record<string, unknown> | undefined;
    const items = resolved?.items as Array<Record<string, unknown>> | undefined;

    expect(next.seo).toEqual({ title: "Keep SEO" });
    expect(next.settings).toEqual({ template: "default" });
    expect(blocks[0]?.type).toBe("hero");
    expect(postsFeedBlock).toMatchObject({
      id: "posts-feed-existing",
      type: "posts-feed",
      variant: "cards",
    });
    expect(source).toMatchObject({
      mode: "latest",
      featuredFirst: true,
      limit: 3,
    });
    expect(fields).toMatchObject({
      showImage: true,
      showExcerpt: true,
      showAuthor: true,
      showDate: true,
      showCta: true,
    });
    expect(pagination).toMatchObject({
      mode: "load-more",
      pageSize: 2,
      viewAllHref: "/fixture-posts",
    });
    expect(items).toHaveLength(3);
    expect(items?.[0]).toMatchObject({
      href: "/fixture-posts/fixture-posts-launch-brief",
      imageAlt: "Fixture Posts Feed launch brief image",
      tags: ["featured", "launch"],
    });
    expect(runtime).toMatchObject({
      page: 1,
      pageSize: 2,
      totalPages: 2,
      nextPageHref: "?cl.posts-feed-existing.page=2",
    });
  });

  test("builds Posts Feed fixture content route first without dropping existing routes", () => {
    const routes = buildPostsFeedFixtureContentRoutes([
      {
        type: "products",
        listPath: "/shop",
        detailPath: "/shop/:slug",
        enabled: true,
      },
      {
        type: "posts",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
      },
      {
        type: "posts",
        listPath: "/fixture-posts",
        detailPath: "/fixture-posts/:slug",
        enabled: false,
      },
    ]);

    expect(routes).toEqual([
      {
        type: "posts",
        listPath: "/fixture-posts",
        detailPath: "/fixture-posts/:slug",
        enabled: true,
      },
      {
        type: "products",
        listPath: "/shop",
        detailPath: "/shop/:slug",
        enabled: true,
      },
      {
        type: "posts",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
      },
    ]);
  });

  test("builds commerce fixture product route first without dropping existing routes", () => {
    const routes = buildCommerceFixtureContentRoutes([
      {
        type: "products",
        listPath: "/shop",
        detailPath: "/shop/:slug",
        enabled: true,
      },
      {
        type: "posts",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
      },
      {
        type: "products",
        listPath: "/fixture-products",
        detailPath: "/fixture-products/:slug",
        enabled: false,
      },
    ]);

    expect(routes).toEqual([
      {
        type: "products",
        listPath: "/fixture-products",
        detailPath: "/fixture-products/:slug",
        enabled: true,
      },
      {
        type: "products",
        listPath: "/shop",
        detailPath: "/shop/:slug",
        enabled: true,
      },
      {
        type: "posts",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
      },
    ]);
  });

  test("builds Product Gallery fixture page data with image/link/view-all-ready settings", () => {
    const next = buildProductGalleryFixturePageData({
      seo: { title: "Keep SEO" },
      blocks: [
        { id: "hero-1", type: "hero", variant: "default", data: { headline: "Keep hero" } },
        {
          id: "product-gallery-existing",
          type: "product-gallery",
          variant: "compact",
          data: { link: { ctaStyle: "none" } },
        },
      ],
    });
    const blocks = next.blocks as Array<Record<string, unknown>>;
    const galleryBlock = blocks.find((block) => block.id === "product-gallery-existing");
    const data = galleryBlock?.data as Record<string, unknown> | undefined;
    const source = data?.source as Record<string, unknown> | undefined;
    const link = data?.link as Record<string, unknown> | undefined;
    const pagination = data?.pagination as Record<string, unknown> | undefined;
    const curation = data?.curation as Record<string, unknown> | undefined;

    expect(next.seo).toEqual({ title: "Keep SEO" });
    expect(blocks[0]?.type).toBe("hero");
    expect(galleryBlock).toMatchObject({
      id: "product-gallery-existing",
      type: "product-gallery",
      variant: "cards",
    });
    expect(source).toMatchObject({
      limit: 2,
      status: ["published"],
      sortField: "title",
      sortDir: "asc",
    });
    expect(link).toMatchObject({
      basePath: "/fixture-products",
      ctaLabel: "View fixture product",
      ctaStyle: "button",
    });
    expect(pagination).toMatchObject({
      mode: "view-all",
      viewAllHref: "/audit-31-05-product-gallery",
      viewAllLabel: "View all fixture products",
    });
    expect(curation).toEqual({
      mode: "query",
      productIds: [],
    });
  });

  test("builds Product Compare fixture page data with image/title-link/CTA-ready settings", () => {
    const next = buildProductCompareFixturePageData({
      seo: { title: "Keep SEO" },
      blocks: [
        { id: "hero-1", type: "hero", variant: "default", data: { headline: "Keep hero" } },
        {
          id: "product-compare-existing",
          type: "product-compare",
          variant: "cards",
          data: { header: { ctaMode: "none" } },
        },
      ],
    });
    const blocks = next.blocks as Array<Record<string, unknown>>;
    const compareBlock = blocks.find((block) => block.id === "product-compare-existing");
    const data = compareBlock?.data as Record<string, unknown> | undefined;
    const source = data?.source as Record<string, unknown> | undefined;
    const header = data?.header as Record<string, unknown> | undefined;
    const rows = data?.rows as Array<Record<string, unknown>> | undefined;

    expect(next.seo).toEqual({ title: "Keep SEO" });
    expect(blocks[0]?.type).toBe("hero");
    expect(compareBlock).toMatchObject({
      id: "product-compare-existing",
      type: "product-compare",
      variant: "matrix",
    });
    expect(source).toMatchObject({
      limit: 3,
      status: ["published"],
      sortField: "title",
      sortDir: "asc",
    });
    expect(header).toEqual({
      showImages: true,
      linkTitles: true,
      ctaMode: "view_product",
      ctaLabel: "Inspect fixture product",
    });
    expect(rows?.map((row) => [row.key, row.visible])).toEqual([
      ["price", true],
      ["compareAt", true],
      ["stock", true],
      ["quantity", true],
      ["slug", true],
      ["excerpt", true],
    ]);
  });

  test("builds Product Table fixture page data with image/link/action-ready settings", () => {
    const next = buildProductTableFixturePageData({
      seo: { title: "Keep SEO" },
      blocks: [
        { id: "hero-1", type: "hero", variant: "default", data: { headline: "Keep hero" } },
        {
          id: "product-table-existing",
          type: "product-table",
          variant: "compact",
          data: { links: { showAction: false } },
        },
      ],
    });
    const blocks = next.blocks as Array<Record<string, unknown>>;
    const tableBlock = blocks.find((block) => block.id === "product-table-existing");
    const data = tableBlock?.data as Record<string, unknown> | undefined;
    const source = data?.source as Record<string, unknown> | undefined;
    const fields = data?.fields as Record<string, unknown> | undefined;
    const links = data?.links as Record<string, unknown> | undefined;

    expect(next.seo).toEqual({ title: "Keep SEO" });
    expect(blocks[0]?.type).toBe("hero");
    expect(tableBlock).toMatchObject({
      id: "product-table-existing",
      type: "product-table",
      variant: "default",
    });
    expect(source).toMatchObject({
      limit: 3,
      status: ["published"],
      sortField: "title",
      sortDir: "asc",
    });
    expect(fields).toMatchObject({
      showImage: true,
      showTitle: true,
      showExcerpt: true,
      showSlug: true,
      showPrice: true,
      showCompareAt: true,
      showStatus: true,
      showStock: true,
      showCollections: true,
    });
    expect(links).toEqual({
      linkedColumn: "title",
      showAction: true,
      actionLabel: "Inspect fixture product",
      openInNewTab: false,
    });
  });

  test("builds populated Entry Teaser fixture page data without dropping page metadata", () => {
    const next = buildEntryTeaserFixturePageData(
      {
        seo: { title: "Keep SEO" },
        settings: { template: "default" },
        blocks: [
          { id: "hero-1", type: "hero", variant: "default", data: { headline: "Keep hero" } },
          {
            id: "entry-teaser-existing",
            type: "entry-teaser",
            variant: "minimal",
            data: { title: { text: "Old fixture" } },
          },
        ],
      },
      {
        contentTypeId: "type-entry-teaser",
        listingQueryId: "listing-query-entry-teaser",
        listingFallbackQueryId: "listing-query-entry-teaser-fallback",
        listingTemplateId: "listing-template-entry-teaser",
        manualEntryId: "entry-manual",
        featuredEntryId: "entry-featured",
        fallbackEntryId: "entry-fallback",
      }
    );
    const blocks = next.blocks as Array<Record<string, unknown>>;
    const entryTeaserBlocks = blocks.filter((block) => block.type === "entry-teaser");
    const primaryBlock = entryTeaserBlocks.find((block) => block.id === "entry-teaser-existing");
    const listingBlock = entryTeaserBlocks.find(
      (block) => block.id === "entry-teaser-listing-fixture"
    );
    const fallbackBlock = entryTeaserBlocks.find(
      (block) => block.id === "entry-teaser-fallback-fixture"
    );
    const primaryData = primaryBlock?.data as Record<string, unknown> | undefined;
    const primarySource = primaryData?.source as Record<string, unknown> | undefined;
    const primaryResolved = primaryData?.resolved as Record<string, unknown> | undefined;
    const primaryItem = primaryResolved?.item as Record<string, unknown> | undefined;
    const listingData = listingBlock?.data as Record<string, unknown> | undefined;
    const listingSource = listingData?.source as Record<string, unknown> | undefined;
    const fallbackData = fallbackBlock?.data as Record<string, unknown> | undefined;
    const fallbackSource = fallbackData?.source as Record<string, unknown> | undefined;
    const fallbackConfig = fallbackData?.fallback as Record<string, unknown> | undefined;

    expect(next.seo).toEqual({ title: "Keep SEO" });
    expect(next.settings).toEqual({ template: "default" });
    expect(blocks[0]?.type).toBe("hero");
    expect(entryTeaserBlocks).toHaveLength(3);
    expect(primaryBlock).toMatchObject({
      id: "entry-teaser-existing",
      type: "entry-teaser",
      variant: "horizontal",
    });
    expect(primaryData?.sourceMode).toBe("manual");
    expect(primarySource).toMatchObject({
      mode: "legacy",
      contentTypeId: "type-entry-teaser",
      entryId: "entry-manual",
    });
    expect(primaryItem).toMatchObject({
      id: "entry-manual",
      href: "/fixture-entry-teaser/fixture-entry-teaser-manual-brief",
      imageAlt: "Fixture Entry Teaser manual brief image",
      tags: ["manual", "launch"],
    });
    expect(listingData?.sourceMode).toBe("featured");
    expect(listingSource).toMatchObject({
      mode: "listing",
      listingQueryId: "listing-query-entry-teaser",
      listingTemplateId: "listing-template-entry-teaser",
    });
    expect(fallbackData?.sourceMode).toBe("featured");
    expect(fallbackSource).toMatchObject({
      mode: "listing",
      listingQueryId: "listing-query-entry-teaser-fallback",
    });
    expect(fallbackConfig).toMatchObject({
      fallbackToLatest: true,
    });
  });

  test("builds Entry Teaser fixture content route first without dropping existing routes", () => {
    const routes = buildEntryTeaserFixtureContentRoutes([
      {
        type: "products",
        listPath: "/shop",
        detailPath: "/shop/:slug",
        enabled: true,
      },
      {
        type: "fixture-entry-teaser",
        listPath: "/old-entry-teaser",
        detailPath: "/old-entry-teaser/:slug",
        enabled: true,
      },
    ]);

    expect(routes).toEqual([
      {
        type: "fixture-entry-teaser",
        listPath: "/fixture-entry-teaser",
        detailPath: "/fixture-entry-teaser/:slug",
        enabled: true,
      },
      {
        type: "products",
        listPath: "/shop",
        detailPath: "/shop/:slug",
        enabled: true,
      },
    ]);
  });

  test("patches and publishes Content List page fixtures through authenticated admin APIs", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
        return Response.json([
          {
            id: "page-1",
            title: "Content List fixture",
            slug: "/ctr-content-list-2305",
            status: "draft",
            updatedAt: "2026-05-31T00:00:00.000Z",
            author: null,
          },
        ]);
      }
      if (url === "http://admin.test/admin/api/pages/page-1" && (init?.method ?? "GET") === "GET") {
        return Response.json({
          id: "page-1",
          title: "Content List fixture",
          slug: "/ctr-content-list-2305",
          status: "draft",
          currentData: { seo: { title: "Keep SEO" }, blocks: [] },
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (url === "http://admin.test/admin/api/pages/page-1" && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
        const contentListBlock = blocks?.find((block) => block.type === "content-list");
        const data = contentListBlock?.data as Record<string, unknown> | undefined;
        const resolved = data?.resolved as Record<string, unknown> | undefined;
        const items = resolved?.items as unknown[] | undefined;

        expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
        expect(items).toHaveLength(2);
        return Response.json({
          id: "page-1",
          title: "Content List fixture",
          slug: "/ctr-content-list-2305",
          status: "draft",
          currentData: payload.data,
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (url === "http://admin.test/admin/api/pages/page-1/publish" && init?.method === "POST") {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        expect(Array.isArray(payload.data?.blocks)).toBe(true);
        return Response.json({ ok: true });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureContentListWidgetFixtures("http://admin.test/admin", "session-token", [
        contentListCase,
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`)).toEqual([
      "GET http://admin.test/admin/api/pages",
      "GET http://admin.test/admin/api/pages/page-1",
      "GET http://admin.test/admin/api/auth/csrf",
      "PATCH http://admin.test/admin/api/pages/page-1",
      "POST http://admin.test/admin/api/pages/page-1/publish",
    ]);
    const patchHeaders = requests[3]?.init?.headers as Headers;
    const publishHeaders = requests[4]?.init?.headers as Headers;
    expect(patchHeaders.get("cookie")).toBe("session=session-token");
    expect(patchHeaders.get("X-CSRF-Token")).toBe("csrf-token");
    expect(publishHeaders.get("X-CSRF-Token")).toBe("csrf-token");
  });

  test("seeds Posts Feed posts and publishes page fixtures through authenticated admin APIs", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (url === "http://admin.test/admin/api/posts" && (init?.method ?? "GET") === "GET") {
        return Response.json({
          items: [
            {
              id: "post-existing",
              title: "Old title",
              slug: "fixture-posts-launch-brief",
              status: "draft",
              tags: [],
              data: {},
            },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/settings" && (init?.method ?? "GET") === "GET") {
        return Response.json({
          "site.contentRoutes": [
            {
              type: "products",
              listPath: "/shop",
              detailPath: "/shop/:slug",
              enabled: true,
            },
            {
              type: "posts",
              listPath: "/blog",
              detailPath: "/blog/:slug",
              enabled: true,
            },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
        return Response.json([
          {
            id: "page-posts",
            title: "Posts Feed fixture",
            slug: "/posts-feed-test-page",
            status: "draft",
            updatedAt: "2026-05-31T00:00:00.000Z",
            author: null,
          },
        ]);
      }
      if (
        url === "http://admin.test/admin/api/pages/page-posts" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          id: "page-posts",
          title: "Posts Feed fixture",
          slug: "/posts-feed-test-page",
          status: "draft",
          currentData: { seo: { title: "Keep SEO" }, blocks: [] },
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (url === "http://admin.test/admin/api/settings" && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body)) as {
          "site.contentRoutes"?: Array<Record<string, unknown>>;
        };
        expect(payload["site.contentRoutes"]?.[0]).toEqual({
          type: "posts",
          listPath: "/fixture-posts",
          detailPath: "/fixture-posts/:slug",
          enabled: true,
        });
        expect(payload["site.contentRoutes"]?.[1]).toEqual({
          type: "products",
          listPath: "/shop",
          detailPath: "/shop/:slug",
          enabled: true,
        });
        expect(payload["site.contentRoutes"]?.[2]).toEqual({
          type: "posts",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
        });
        return Response.json(payload);
      }
      if (url === "http://admin.test/admin/api/posts" && init?.method === "POST") {
        const payload = JSON.parse(String(init.body)) as {
          title?: string;
          slug?: string;
          data?: Record<string, unknown>;
        };
        expect(payload.title).toMatch(/^Fixture Posts Feed/);
        expect(payload.slug).toMatch(/^fixture-posts-/);
        expect(typeof payload.data?.featuredImage).toBe("string");
        return Response.json({
          id: `created-${payload.slug}`,
          title: payload.title,
          slug: payload.slug,
          status: "draft",
          tags: [],
          data: payload.data,
        });
      }
      if (url === "http://admin.test/admin/api/posts/post-existing" && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body)) as {
          title?: string;
          slug?: string;
          data?: Record<string, unknown>;
        };
        expect(payload).toMatchObject({
          title: "Fixture Posts Feed Launch Brief",
        });
        expect(payload.slug).toBeUndefined();
        expect(typeof payload.data?.featuredImage).toBe("string");
        return Response.json({
          id: "post-existing",
          title: payload.title,
          slug: payload.slug,
          status: "draft",
          tags: [],
          data: payload.data,
        });
      }
      if (url.includes("/api/posts/") && url.endsWith("/metadata") && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body)) as { tags?: string[]; status?: string };
        expect(payload.status).toBe("published");
        expect(payload.tags?.length).toBeGreaterThanOrEqual(2);
        return Response.json({ ok: true });
      }
      if (url.includes("/api/posts/") && url.endsWith("/publish") && init?.method === "POST") {
        return Response.json({ ok: true });
      }
      if (url === "http://admin.test/admin/api/pages/page-posts" && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
        const postsFeedBlock = blocks?.find((block) => block.type === "posts-feed");
        const data = postsFeedBlock?.data as Record<string, unknown> | undefined;
        const resolved = data?.resolved as Record<string, unknown> | undefined;
        const items = resolved?.items as unknown[] | undefined;

        expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
        expect(items).toHaveLength(3);
        return Response.json({
          id: "page-posts",
          title: "Posts Feed fixture",
          slug: "/posts-feed-test-page",
          status: "draft",
          currentData: payload.data,
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (
        url === "http://admin.test/admin/api/pages/page-posts/publish" &&
        init?.method === "POST"
      ) {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        expect(Array.isArray(payload.data?.blocks)).toBe(true);
        return Response.json({ ok: true });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensurePostsFeedWidgetFixtures("http://admin.test/admin", "session-token", [
        postsFeedCase,
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const labels = requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`);
    expect(labels).toContain("GET http://admin.test/admin/api/posts");
    expect(labels).toContain("GET http://admin.test/admin/api/settings");
    expect(labels).toContain("PATCH http://admin.test/admin/api/settings");
    expect(labels).toContain("PATCH http://admin.test/admin/api/posts/post-existing");
    expect(labels).toContain("POST http://admin.test/admin/api/posts");
    expect(labels).toContain("PATCH http://admin.test/admin/api/pages/page-posts");
    expect(labels).toContain("POST http://admin.test/admin/api/pages/page-posts/publish");
    expect(labels.filter((label) => label.endsWith("/metadata"))).toHaveLength(3);
    expect(
      labels.filter((label) => label.endsWith("/publish") && label.includes("/posts/"))
    ).toHaveLength(3);

    const writeHeaders = requests
      .filter((request) => (request.init?.method ?? "GET") !== "GET")
      .map((request) => request.init?.headers)
      .filter((headers): headers is Headers => headers instanceof Headers);
    expect(writeHeaders.every((headers) => headers.get("cookie") === "session=session-token")).toBe(
      true
    );
    expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(
      true
    );
  });

  test("seeds Entry Teaser content, listings, route, and page through authenticated admin APIs", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (
        url === "http://admin.test/admin/api/content-types" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json([
          {
            id: "type-entry-teaser",
            name: "Old name",
            slug: "fixture-entry-teaser",
            schema: { type: "object", additionalProperties: false, properties: {} },
            status: "draft",
          },
        ]);
      }
      if (
        url === "http://admin.test/admin/api/content/fixture-entry-teaser/entries" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json([
          {
            id: "entry-manual",
            title: "Old manual",
            slug: "fixture-entry-teaser-manual-brief",
            status: "draft",
            tags: [],
            data: {},
          },
        ]);
      }
      if (url === "http://admin.test/admin/api/settings" && (init?.method ?? "GET") === "GET") {
        return Response.json({
          "site.contentRoutes": [
            {
              type: "products",
              listPath: "/shop",
              detailPath: "/shop/:slug",
              enabled: true,
            },
          ],
        });
      }
      if (
        url === "http://admin.test/admin/api/listings/queries" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          items: [
            {
              id: "listing-query-entry-teaser",
              name: "Fixture Entry Teaser Listing Query",
              description: null,
              query: {
                source: "entries",
                sourceConfig: { contentTypeId: "type-entry-teaser", includeDrafts: true },
                filters: [],
                sort: [{ field: "id", dir: "asc" }],
                pagination: { limit: 1, offset: 0 },
                fields: ["id"],
              },
            },
          ],
        });
      }
      if (
        url === "http://admin.test/admin/api/listings/templates" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({ items: [] });
      }
      if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
        return Response.json([
          {
            id: "page-entry-teaser",
            title: "Entry Teaser fixture",
            slug: "/audit-31-05-entry-teaser",
            status: "draft",
            updatedAt: "2026-05-31T00:00:00.000Z",
            author: null,
          },
        ]);
      }
      if (
        url === "http://admin.test/admin/api/pages/page-entry-teaser" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          id: "page-entry-teaser",
          title: "Entry Teaser fixture",
          slug: "/audit-31-05-entry-teaser",
          status: "draft",
          currentData: { seo: { title: "Keep SEO" }, blocks: [] },
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (
        url === "http://admin.test/admin/api/content-types/type-entry-teaser" &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as {
          name?: string;
          slug?: string;
          schema?: Record<string, unknown>;
          status?: string;
        };
        expect(payload).toMatchObject({
          name: "Fixture Entry Teasers",
          status: "published",
        });
        expect(payload.slug).toBeUndefined();
        expect(payload.schema?.additionalProperties).toBe(false);
        return Response.json({
          id: "type-entry-teaser",
          name: payload.name,
          slug: "fixture-entry-teaser",
          schema: payload.schema,
          status: payload.status,
        });
      }
      if (
        url === "http://admin.test/admin/api/content/fixture-entry-teaser/entries/entry-manual" &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as {
          title?: string;
          slug?: string;
          data?: Record<string, unknown>;
        };
        expect(payload.title).toBe("Fixture Entry Teaser Manual Brief");
        expect(payload.slug).toBeUndefined();
        expect(typeof payload.data?.featuredImage).toBe("string");
        return Response.json({ id: "entry-manual", ...payload });
      }
      if (
        url === "http://admin.test/admin/api/content/fixture-entry-teaser/entries" &&
        init?.method === "POST"
      ) {
        const payload = JSON.parse(String(init.body)) as {
          title?: string;
          slug?: string;
          data?: Record<string, unknown>;
        };
        expect(payload.slug).toMatch(/^fixture-entry-teaser-/);
        expect(typeof payload.data?.excerpt).toBe("string");
        return Response.json({
          id: `created-${payload.slug}`,
          title: payload.title,
          slug: payload.slug,
          status: "draft",
          tags: [],
          data: payload.data,
        });
      }
      if (
        url.includes("/api/content/fixture-entry-teaser/entries/") &&
        url.endsWith("/metadata") &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as { tags?: string[]; status?: string };
        expect(payload.status).toBe("published");
        expect(payload.tags?.length).toBeGreaterThanOrEqual(2);
        return Response.json({ ok: true });
      }
      if (
        url.includes("/api/content/fixture-entry-teaser/entries/") &&
        url.endsWith("/publish") &&
        init?.method === "POST"
      ) {
        return Response.json({ ok: true });
      }
      if (url === "http://admin.test/admin/api/settings" && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body)) as {
          "site.contentRoutes"?: Array<Record<string, unknown>>;
        };
        expect(payload["site.contentRoutes"]?.[0]).toEqual({
          type: "fixture-entry-teaser",
          listPath: "/fixture-entry-teaser",
          detailPath: "/fixture-entry-teaser/:slug",
          enabled: true,
        });
        return Response.json(payload);
      }
      if (
        url === "http://admin.test/admin/api/listings/queries/listing-query-entry-teaser" &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as { query?: Record<string, unknown> };
        expect(payload.query?.fields).toContain("data.featuredImage");
        expect(payload.query?.fields).toContain("data.excerpt");
        return Response.json({ id: "listing-query-entry-teaser", ...payload });
      }
      if (url === "http://admin.test/admin/api/listings/queries" && init?.method === "POST") {
        const payload = JSON.parse(String(init.body)) as {
          name?: string;
          query?: Record<string, unknown>;
        };
        expect(payload.name).toMatch(/^Fixture Entry Teaser/);
        return Response.json({
          id: payload.name?.includes("Fallback")
            ? "listing-query-entry-teaser-fallback"
            : "listing-query-created",
          ...payload,
        });
      }
      if (url === "http://admin.test/admin/api/listings/templates" && init?.method === "POST") {
        const payload = JSON.parse(String(init.body)) as {
          name?: string;
          slug?: string;
          config?: Record<string, unknown>;
        };
        expect(payload.slug).toBe("fixture-entry-teaser-cards");
        expect(Array.isArray(payload.config?.itemActions)).toBe(true);
        return Response.json({ id: "listing-template-entry-teaser", ...payload });
      }
      if (
        url === "http://admin.test/admin/api/pages/page-entry-teaser" &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
        const entryTeaserBlocks = blocks?.filter((block) => block.type === "entry-teaser");
        expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
        expect(entryTeaserBlocks).toHaveLength(3);
        return Response.json({
          id: "page-entry-teaser",
          title: "Entry Teaser fixture",
          slug: "/audit-31-05-entry-teaser",
          status: "draft",
          currentData: payload.data,
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (
        url === "http://admin.test/admin/api/pages/page-entry-teaser/publish" &&
        init?.method === "POST"
      ) {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        expect(Array.isArray(payload.data?.blocks)).toBe(true);
        return Response.json({ ok: true });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureEntryTeaserWidgetFixtures("http://admin.test/admin", "session-token", [
        entryTeaserCase,
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const labels = requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`);
    expect(labels).toContain("GET http://admin.test/admin/api/content-types");
    expect(labels).toContain("PATCH http://admin.test/admin/api/content-types/type-entry-teaser");
    expect(labels).toContain(
      "GET http://admin.test/admin/api/content/fixture-entry-teaser/entries"
    );
    expect(labels).toContain("PATCH http://admin.test/admin/api/settings");
    expect(labels).toContain(
      "PATCH http://admin.test/admin/api/listings/queries/listing-query-entry-teaser"
    );
    expect(labels).toContain("POST http://admin.test/admin/api/listings/queries");
    expect(labels).toContain("POST http://admin.test/admin/api/listings/templates");
    expect(labels).toContain("PATCH http://admin.test/admin/api/pages/page-entry-teaser");
    expect(labels).toContain("POST http://admin.test/admin/api/pages/page-entry-teaser/publish");
    expect(labels.filter((label) => label.endsWith("/metadata"))).toHaveLength(3);
    expect(
      labels.filter((label) => label.endsWith("/publish") && label.includes("/entries/"))
    ).toHaveLength(3);

    const writeHeaders = requests
      .filter((request) => (request.init?.method ?? "GET") !== "GET")
      .map((request) => request.init?.headers)
      .filter((headers): headers is Headers => headers instanceof Headers);
    expect(writeHeaders.every((headers) => headers.get("cookie") === "session=session-token")).toBe(
      true
    );
    expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(
      true
    );
  });

  test("seeds Logo Cloud media fixtures through authenticated admin upload", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json([]);
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
        expect(init.body).toBeInstanceOf(FormData);
        const formData = init.body as FormData;
        const file = formData.get("file") as File;
        expect(file).toBeInstanceOf(File);
        expect(file.name).toBe("widget-fixture-logo-cloud-acme.svg");
        expect(file.type).toBe("image/svg+xml");
        expect(formData.get("alt")).toBe("Widget fixture Acme logo mark");
        expect(formData.get("title")).toBe("Widget fixture Acme logo");
        expect(formData.get("caption")).toBe("Deterministic Logo Cloud MediaPicker image fixture.");
        return Response.json({
          id: "media-1",
          originalName: "widget-fixture-logo-cloud-acme.svg",
          mimeType: "image/svg+xml",
          type: "image",
          title: "Widget fixture Acme logo",
          alt: "Widget fixture Acme logo mark",
          caption: "Deterministic Logo Cloud MediaPicker image fixture.",
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [logoCloudCase]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(requests.map((request) => request.url)).toEqual([
      "http://admin.test/admin/api/media",
      "http://admin.test/admin/api/auth/csrf",
      "http://admin.test/admin/api/media",
    ]);
    const uploadHeaders = requests[2]?.init?.headers as Headers;
    expect(uploadHeaders.get("cookie")).toBe("session=session-token");
    expect(uploadHeaders.get("X-CSRF-Token")).toBe("csrf-token");
    expect(uploadHeaders.get("Content-Type")).toBeNull();
  });

  test("seeds Gallery Mosaic image and video media fixtures through authenticated admin upload", async () => {
    const originalFetch = globalThis.fetch;
    const uploadedFiles: Array<{ name: string; type: string; title: FormDataEntryValue | null }> =
      [];
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json([]);
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
        expect(init.body).toBeInstanceOf(FormData);
        const formData = init.body as FormData;
        const file = formData.get("file") as File;
        uploadedFiles.push({
          name: file.name,
          type: file.type,
          title: formData.get("title"),
        });
        return Response.json({
          id: `media-${uploadedFiles.length}`,
          originalName: file.name,
          mimeType: file.type,
          type: file.type.startsWith("image/") ? "image" : "file",
          title: formData.get("title"),
          alt: formData.get("alt"),
          caption: formData.get("caption"),
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [
        galleryMosaicCase,
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(uploadedFiles).toEqual([
      {
        name: "widget-fixture-gallery-mosaic-image.svg",
        type: "image/svg+xml",
        title: "Widget fixture Gallery Mosaic image",
      },
      {
        name: "widget-fixture-gallery-mosaic-video.mp4",
        type: "video/mp4",
        title: "Widget fixture Gallery Mosaic video",
      },
    ]);
    expect(requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`)).toEqual([
      "GET http://admin.test/admin/api/media",
      "GET http://admin.test/admin/api/auth/csrf",
      "POST http://admin.test/admin/api/media",
      "POST http://admin.test/admin/api/media",
    ]);
  });

  test("continues Gallery Mosaic media bootstrap when optional video upload is rejected by storage policy", async () => {
    const originalFetch = globalThis.fetch;
    const uploadedNames: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json([]);
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
        const formData = init.body as FormData;
        const file = formData.get("file") as File;
        uploadedNames.push(file.name);
        if (file.type === "video/mp4") {
          return new Response("mime rejected", { status: 400 });
        }
        return Response.json({
          id: "gallery-image",
          originalName: file.name,
          mimeType: file.type,
          type: "image",
          title: formData.get("title"),
          alt: formData.get("alt"),
          caption: formData.get("caption"),
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [
        galleryMosaicCase,
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(uploadedNames).toEqual([
      "widget-fixture-gallery-mosaic-image.svg",
      "widget-fixture-gallery-mosaic-video.mp4",
    ]);
  });

  test("seeds Team photo media fixture through authenticated admin upload", async () => {
    const originalFetch = globalThis.fetch;
    const uploadedFiles: Array<{ name: string; type: string; title: FormDataEntryValue | null }> =
      [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json([]);
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
        expect(init.body).toBeInstanceOf(FormData);
        const formData = init.body as FormData;
        const file = formData.get("file") as File;
        uploadedFiles.push({
          name: file.name,
          type: file.type,
          title: formData.get("title"),
        });
        return Response.json({
          id: "team-photo",
          originalName: file.name,
          mimeType: file.type,
          type: "image",
          title: formData.get("title"),
          alt: formData.get("alt"),
          caption: formData.get("caption"),
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [teamCase]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(uploadedFiles).toEqual([
      {
        name: "widget-fixture-team-photo.svg",
        type: "image/svg+xml",
        title: "Widget fixture Team photo",
      },
    ]);
  });

  test("seeds Rich Text Section image and document media fixtures through authenticated admin upload", async () => {
    const originalFetch = globalThis.fetch;
    const uploadedFiles: Array<{ name: string; type: string; title: FormDataEntryValue | null }> =
      [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json([]);
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
        expect(init.body).toBeInstanceOf(FormData);
        const formData = init.body as FormData;
        const file = formData.get("file") as File;
        uploadedFiles.push({
          name: file.name,
          type: file.type,
          title: formData.get("title"),
        });
        return Response.json({
          id: `rich-text-media-${uploadedFiles.length}`,
          originalName: file.name,
          mimeType: file.type,
          type: file.type.startsWith("image/") ? "image" : "file",
          title: formData.get("title"),
          alt: formData.get("alt"),
          caption: formData.get("caption"),
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [
        richTextSectionCase,
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(uploadedFiles).toEqual([
      {
        name: "widget-fixture-rich-text-section-image.svg",
        type: "image/svg+xml",
        title: "Widget fixture Rich Text Section image",
      },
      {
        name: "widget-fixture-rich-text-section-document.pdf",
        type: "application/pdf",
        title: "Widget fixture Rich Text Section document",
      },
    ]);
  });

  test("patches existing Logo Cloud fixture metadata through admin JSON with CSRF", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json([
          {
            id: "media-1",
            originalName: "widget-fixture-logo-cloud-acme.svg",
            mimeType: "image/svg+xml",
            type: "image",
            title: "Old title",
            alt: null,
            caption: null,
          },
        ]);
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (url === "http://admin.test/admin/api/media/media-1" && init?.method === "PATCH") {
        expect(init.body).toBe(
          JSON.stringify({
            alt: "Widget fixture Acme logo mark",
            title: "Widget fixture Acme logo",
            caption: "Deterministic Logo Cloud MediaPicker image fixture.",
          })
        );
        return Response.json({
          id: "media-1",
          originalName: "widget-fixture-logo-cloud-acme.svg",
          mimeType: "image/svg+xml",
          type: "image",
          title: "Widget fixture Acme logo",
          alt: "Widget fixture Acme logo mark",
          caption: "Deterministic Logo Cloud MediaPicker image fixture.",
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [logoCloudCase]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(requests.map((request) => request.url)).toEqual([
      "http://admin.test/admin/api/media",
      "http://admin.test/admin/api/auth/csrf",
      "http://admin.test/admin/api/media/media-1",
    ]);
    const patchHeaders = requests[2]?.init?.headers as Headers;
    expect(patchHeaders.get("cookie")).toBe("session=session-token");
    expect(patchHeaders.get("X-CSRF-Token")).toBe("csrf-token");
    expect(patchHeaders.get("Content-Type")).toBe("application/json");
  });

  test("does not reuse same-name media fixtures with unsupported type or MIME", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json([
          {
            id: "media-file",
            originalName: "widget-fixture-logo-cloud-acme.svg",
            mimeType: "application/pdf",
            type: "file",
            title: "Widget fixture Acme logo",
            alt: "Widget fixture Acme logo mark",
            caption: "Deterministic Logo Cloud MediaPicker image fixture.",
          },
        ]);
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
        return Response.json({
          id: "media-image",
          originalName: "widget-fixture-logo-cloud-acme.svg",
          mimeType: "image/svg+xml",
          type: "image",
          title: "Widget fixture Acme logo",
          alt: "Widget fixture Acme logo mark",
          caption: "Deterministic Logo Cloud MediaPicker image fixture.",
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [logoCloudCase]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`)).toEqual([
      "GET http://admin.test/admin/api/media",
      "GET http://admin.test/admin/api/auth/csrf",
      "POST http://admin.test/admin/api/media",
    ]);
  });

  test("builds a commerce fixture patch only for fields that drifted", () => {
    expect(
      buildCommerceFixtureProductPatch(
        {
          id: "product-1",
          slug: "fixture-starter-home",
          title: "Fixture Starter Home",
          status: "published",
          excerpt: "Compact starter plan.",
          description: "Fixture description.",
          pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
          stock: { state: "in_stock", quantity: 3 },
          collectionIds: ["collection-1"],
          mediaIds: ["media-product-gallery"],
        },
        {
          slug: "fixture-starter-home",
          title: "Fixture Starter Home",
          status: "published",
          excerpt: "Compact starter plan.",
          description: "Fixture description.",
          pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
          stock: { state: "in_stock", quantity: 3 },
          collectionSlugs: ["fixture-homes"],
          mediaOriginalName: "widget-fixture-product-gallery-home.svg",
        },
        ["media-product-gallery"]
      )
    ).toBeNull();

    expect(
      buildCommerceFixtureProductPatch(
        {
          id: "product-1",
          slug: "fixture-starter-home",
          title: "Old title",
          status: "draft",
          excerpt: null,
          description: null,
          pricing: { amount: 0, currency: "USD", compareAtAmount: null },
          stock: { state: "backorder", quantity: 1 },
          collectionIds: [],
          mediaIds: [],
        },
        {
          slug: "fixture-starter-home",
          title: "Fixture Starter Home",
          status: "published",
          excerpt: "Compact starter plan.",
          description: "Fixture description.",
          pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
          stock: { state: "in_stock", quantity: 3 },
          collectionSlugs: ["fixture-homes"],
          mediaOriginalName: "widget-fixture-product-gallery-home.svg",
        },
        ["media-product-gallery"]
      )
    ).toEqual({
      title: "Fixture Starter Home",
      status: "published",
      excerpt: "Compact starter plan.",
      description: "Fixture description.",
      pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
      stock: { state: "in_stock", quantity: 3 },
      mediaIds: ["media-product-gallery"],
    });
  });

  test("seeds Product Gallery commerce media and publishes page fixture through admin APIs", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (
        url === "http://admin.test/admin/api/commerce/collections" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          items: [
            { id: "collection-homes", slug: "fixture-homes", name: "Fixture Homes" },
            { id: "collection-lofts", slug: "fixture-lofts", name: "Fixture Lofts" },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json({
          items: [
            {
              id: "media-product-gallery",
              originalName: "widget-fixture-product-gallery-home.svg",
              mimeType: "image/svg+xml",
              type: "image",
              title: "Widget fixture Product Gallery home image",
              alt: "Widget fixture Product Gallery home exterior",
              caption: "Deterministic Product Gallery image fixture.",
            },
          ],
        });
      }
      if (
        url === "http://admin.test/admin/api/commerce/products" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          items: [
            {
              id: "product-starter",
              slug: "fixture-starter-home",
              title: "Fixture Starter Home",
              status: "published",
              excerpt: "Compact starter plan for deterministic widget smoke coverage.",
              description: "Deterministic fixture product for Product Gallery, Compare, and Table.",
              pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
              stock: { state: "in_stock", quantity: 3 },
              collectionIds: ["collection-homes"],
              mediaIds: [],
            },
            {
              id: "product-urban",
              slug: "fixture-urban-loft",
              title: "Fixture Urban Loft",
              status: "published",
              excerpt: "City-forward loft listing for deterministic comparison coverage.",
              description: "Second deterministic fixture product with a different stock state.",
              pricing: { amount: 29900, currency: "USD", compareAtAmount: 34900 },
              stock: { state: "backorder", quantity: 8 },
              collectionIds: ["collection-lofts"],
              mediaIds: [],
            },
            {
              id: "product-garden",
              slug: "fixture-garden-suite",
              title: "Fixture Garden Suite",
              status: "published",
              excerpt: "Garden-facing suite used to keep product table fixtures populated.",
              description:
                "Third deterministic fixture product to satisfy multi-row public widget proof.",
              pricing: { amount: 15900, currency: "USD", compareAtAmount: 17900 },
              stock: { state: "in_stock", quantity: 1 },
              collectionIds: ["collection-homes", "collection-lofts"],
              mediaIds: [],
            },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (
        url.startsWith("http://admin.test/admin/api/commerce/products/product-") &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as {
          mediaIds?: string[];
          stock?: Record<string, unknown>;
        };
        if (url.endsWith("/product-garden")) {
          expect(payload).toEqual({
            stock: { state: "out_of_stock", quantity: 0 },
            mediaIds: ["media-product-gallery"],
          });
        } else {
          expect(payload).toEqual({ mediaIds: ["media-product-gallery"] });
        }
        return Response.json({ id: url.split("/").pop(), ...payload });
      }
      if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
        return Response.json([
          {
            id: "page-product-gallery",
            title: "Product Gallery fixture",
            slug: "/audit-31-05-product-gallery",
            status: "draft",
            updatedAt: "2026-05-31T00:00:00.000Z",
            author: null,
          },
        ]);
      }
      if (
        url === "http://admin.test/admin/api/pages/page-product-gallery" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          id: "page-product-gallery",
          title: "Product Gallery fixture",
          slug: "/audit-31-05-product-gallery",
          status: "draft",
          currentData: {
            seo: { title: "Keep SEO" },
            blocks: [{ id: "gallery-1", type: "product-gallery", variant: "compact", data: {} }],
          },
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (
        url === "http://admin.test/admin/api/pages/page-product-gallery" &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
        const gallery = blocks?.find((block) => block.type === "product-gallery");
        const data = gallery?.data as Record<string, unknown> | undefined;
        expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
        expect(data?.link).toMatchObject({ basePath: "/fixture-products" });
        expect(data?.pagination).toMatchObject({
          mode: "view-all",
          viewAllHref: "/audit-31-05-product-gallery",
        });
        return Response.json({
          id: "page-product-gallery",
          title: "Product Gallery fixture",
          slug: "/audit-31-05-product-gallery",
          status: "draft",
          currentData: payload.data,
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (
        url === "http://admin.test/admin/api/pages/page-product-gallery/publish" &&
        init?.method === "POST"
      ) {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        expect(Array.isArray(payload.data?.blocks)).toBe(true);
        return Response.json({ ok: true });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureCommerceWidgetFixtures("http://admin.test/admin", "session-token", [
        productGalleryCase,
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const labels = requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`);
    expect(labels).toContain("GET http://admin.test/admin/api/media");
    expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-starter");
    expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-urban");
    expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-garden");
    expect(labels).toContain("PATCH http://admin.test/admin/api/pages/page-product-gallery");
    expect(labels).toContain("POST http://admin.test/admin/api/pages/page-product-gallery/publish");

    const writeHeaders = requests
      .filter((request) => (request.init?.method ?? "GET") !== "GET")
      .map((request) => request.init?.headers)
      .filter((headers): headers is Headers => headers instanceof Headers);
    expect(writeHeaders.every((headers) => headers.get("cookie") === "session=session-token")).toBe(
      true
    );
    expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(
      true
    );
  });

  test("seeds Product Compare commerce route media and publishes page fixture", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (
        url === "http://admin.test/admin/api/commerce/collections" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          items: [
            { id: "collection-homes", slug: "fixture-homes", name: "Fixture Homes" },
            { id: "collection-lofts", slug: "fixture-lofts", name: "Fixture Lofts" },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json({
          items: [
            {
              id: "media-product-gallery",
              originalName: "widget-fixture-product-gallery-home.svg",
              mimeType: "image/svg+xml",
              type: "image",
              title: "Widget fixture Product Gallery home image",
              alt: "Widget fixture Product Gallery home exterior",
              caption: "Deterministic Product Gallery image fixture.",
            },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/settings" && (init?.method ?? "GET") === "GET") {
        return Response.json({
          "site.contentRoutes": [
            {
              type: "products",
              listPath: "/shop",
              detailPath: "/shop/:slug",
              enabled: true,
            },
            {
              type: "posts",
              listPath: "/blog",
              detailPath: "/blog/:slug",
              enabled: true,
            },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/settings" && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body)) as {
          "site.contentRoutes"?: Array<Record<string, unknown>>;
        };
        expect(payload["site.contentRoutes"]?.[0]).toEqual({
          type: "products",
          listPath: "/fixture-products",
          detailPath: "/fixture-products/:slug",
          enabled: true,
        });
        expect(payload["site.contentRoutes"]?.[1]).toEqual({
          type: "products",
          listPath: "/shop",
          detailPath: "/shop/:slug",
          enabled: true,
        });
        return Response.json(payload);
      }
      if (
        url === "http://admin.test/admin/api/commerce/products" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          items: [
            {
              id: "product-starter",
              slug: "fixture-starter-home",
              title: "Fixture Starter Home",
              status: "published",
              excerpt: "Compact starter plan for deterministic widget smoke coverage.",
              description: "Deterministic fixture product for Product Gallery, Compare, and Table.",
              pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
              stock: { state: "in_stock", quantity: 3 },
              collectionIds: ["collection-homes"],
              mediaIds: [],
            },
            {
              id: "product-urban",
              slug: "fixture-urban-loft",
              title: "Fixture Urban Loft",
              status: "published",
              excerpt: "City-forward loft listing for deterministic comparison coverage.",
              description: "Second deterministic fixture product with a different stock state.",
              pricing: { amount: 29900, currency: "USD", compareAtAmount: 34900 },
              stock: { state: "backorder", quantity: 8 },
              collectionIds: ["collection-lofts"],
              mediaIds: [],
            },
            {
              id: "product-garden",
              slug: "fixture-garden-suite",
              title: "Fixture Garden Suite",
              status: "published",
              excerpt: "Garden-facing suite used to keep product table fixtures populated.",
              description:
                "Third deterministic fixture product to satisfy multi-row public widget proof.",
              pricing: { amount: 15900, currency: "USD", compareAtAmount: 17900 },
              stock: { state: "in_stock", quantity: 1 },
              collectionIds: ["collection-homes", "collection-lofts"],
              mediaIds: [],
            },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (
        url.startsWith("http://admin.test/admin/api/commerce/products/product-") &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as {
          mediaIds?: string[];
          stock?: Record<string, unknown>;
        };
        if (url.endsWith("/product-garden")) {
          expect(payload).toEqual({
            stock: { state: "out_of_stock", quantity: 0 },
            mediaIds: ["media-product-gallery"],
          });
        } else {
          expect(payload).toEqual({ mediaIds: ["media-product-gallery"] });
        }
        return Response.json({ id: url.split("/").pop(), ...payload });
      }
      if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
        return Response.json([
          {
            id: "page-product-compare",
            title: "Product Compare fixture",
            slug: "/audit-31-05-product-compare",
            status: "draft",
            updatedAt: "2026-05-31T00:00:00.000Z",
            author: null,
          },
        ]);
      }
      if (
        url === "http://admin.test/admin/api/pages/page-product-compare" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          id: "page-product-compare",
          title: "Product Compare fixture",
          slug: "/audit-31-05-product-compare",
          status: "draft",
          currentData: {
            seo: { title: "Keep SEO" },
            blocks: [{ id: "compare-1", type: "product-compare", variant: "cards", data: {} }],
          },
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (
        url === "http://admin.test/admin/api/pages/page-product-compare" &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
        const compare = blocks?.find((block) => block.type === "product-compare");
        const data = compare?.data as Record<string, unknown> | undefined;
        expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
        expect(compare).toMatchObject({ id: "compare-1", variant: "matrix" });
        expect(data?.header).toEqual({
          showImages: true,
          linkTitles: true,
          ctaMode: "view_product",
          ctaLabel: "Inspect fixture product",
        });
        return Response.json({
          id: "page-product-compare",
          title: "Product Compare fixture",
          slug: "/audit-31-05-product-compare",
          status: "draft",
          currentData: payload.data,
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (
        url === "http://admin.test/admin/api/pages/page-product-compare/publish" &&
        init?.method === "POST"
      ) {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        expect(Array.isArray(payload.data?.blocks)).toBe(true);
        return Response.json({ ok: true });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureCommerceWidgetFixtures("http://admin.test/admin", "session-token", [
        productCompareCase,
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const labels = requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`);
    expect(labels).toContain("GET http://admin.test/admin/api/settings");
    expect(labels).toContain("PATCH http://admin.test/admin/api/settings");
    expect(labels).toContain("GET http://admin.test/admin/api/media");
    expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-starter");
    expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-urban");
    expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-garden");
    expect(labels).toContain("PATCH http://admin.test/admin/api/pages/page-product-compare");
    expect(labels).toContain("POST http://admin.test/admin/api/pages/page-product-compare/publish");

    const writeHeaders = requests
      .filter((request) => (request.init?.method ?? "GET") !== "GET")
      .map((request) => request.init?.headers)
      .filter((headers): headers is Headers => headers instanceof Headers);
    expect(writeHeaders.every((headers) => headers.get("cookie") === "session=session-token")).toBe(
      true
    );
    expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(
      true
    );
  });

  test("seeds Product Table commerce route media and publishes page fixture", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (
        url === "http://admin.test/admin/api/commerce/collections" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          items: [
            { id: "collection-homes", slug: "fixture-homes", name: "Fixture Homes" },
            { id: "collection-lofts", slug: "fixture-lofts", name: "Fixture Lofts" },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
        return Response.json({
          items: [
            {
              id: "media-product-gallery",
              originalName: "widget-fixture-product-gallery-home.svg",
              mimeType: "image/svg+xml",
              type: "image",
              title: "Widget fixture Product Gallery home image",
              alt: "Widget fixture Product Gallery home exterior",
              caption: "Deterministic Product Gallery image fixture.",
            },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/settings" && (init?.method ?? "GET") === "GET") {
        return Response.json({
          "site.contentRoutes": [
            {
              type: "products",
              listPath: "/shop",
              detailPath: "/shop/:slug",
              enabled: true,
            },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/settings" && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body)) as {
          "site.contentRoutes"?: Array<Record<string, unknown>>;
        };
        expect(payload["site.contentRoutes"]?.[0]).toEqual({
          type: "products",
          listPath: "/fixture-products",
          detailPath: "/fixture-products/:slug",
          enabled: true,
        });
        return Response.json(payload);
      }
      if (
        url === "http://admin.test/admin/api/commerce/products" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          items: [
            {
              id: "product-starter",
              slug: "fixture-starter-home",
              title: "Fixture Starter Home",
              status: "published",
              excerpt: "Compact starter plan for deterministic widget smoke coverage.",
              description: "Deterministic fixture product for Product Gallery, Compare, and Table.",
              pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
              stock: { state: "in_stock", quantity: 3 },
              collectionIds: ["collection-homes"],
              mediaIds: [],
            },
            {
              id: "product-urban",
              slug: "fixture-urban-loft",
              title: "Fixture Urban Loft",
              status: "published",
              excerpt: "City-forward loft listing for deterministic comparison coverage.",
              description: "Second deterministic fixture product with a different stock state.",
              pricing: { amount: 29900, currency: "USD", compareAtAmount: 34900 },
              stock: { state: "backorder", quantity: 8 },
              collectionIds: ["collection-lofts"],
              mediaIds: [],
            },
            {
              id: "product-garden",
              slug: "fixture-garden-suite",
              title: "Fixture Garden Suite",
              status: "published",
              excerpt: "Garden-facing suite used to keep product table fixtures populated.",
              description:
                "Third deterministic fixture product to satisfy multi-row public widget proof.",
              pricing: { amount: 15900, currency: "USD", compareAtAmount: 17900 },
              stock: { state: "in_stock", quantity: 1 },
              collectionIds: ["collection-homes", "collection-lofts"],
              mediaIds: [],
            },
          ],
        });
      }
      if (url === "http://admin.test/admin/api/auth/csrf") {
        return Response.json({ token: "csrf-token" });
      }
      if (
        url.startsWith("http://admin.test/admin/api/commerce/products/product-") &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as {
          mediaIds?: string[];
          stock?: Record<string, unknown>;
        };
        if (url.endsWith("/product-garden")) {
          expect(payload).toEqual({
            stock: { state: "out_of_stock", quantity: 0 },
            mediaIds: ["media-product-gallery"],
          });
        } else {
          expect(payload).toEqual({ mediaIds: ["media-product-gallery"] });
        }
        return Response.json({ id: url.split("/").pop(), ...payload });
      }
      if (url === "http://admin.test/admin/api/pages" && (init?.method ?? "GET") === "GET") {
        return Response.json([
          {
            id: "page-product-table",
            title: "Product Table fixture",
            slug: "/audit-31-05-product-table",
            status: "draft",
            updatedAt: "2026-05-31T00:00:00.000Z",
            author: null,
          },
        ]);
      }
      if (
        url === "http://admin.test/admin/api/pages/page-product-table" &&
        (init?.method ?? "GET") === "GET"
      ) {
        return Response.json({
          id: "page-product-table",
          title: "Product Table fixture",
          slug: "/audit-31-05-product-table",
          status: "draft",
          currentData: {
            seo: { title: "Keep SEO" },
            blocks: [{ id: "table-1", type: "product-table", variant: "compact", data: {} }],
          },
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (
        url === "http://admin.test/admin/api/pages/page-product-table" &&
        init?.method === "PATCH"
      ) {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        const blocks = payload.data?.blocks as Array<Record<string, unknown>> | undefined;
        const table = blocks?.find((block) => block.type === "product-table");
        const data = table?.data as Record<string, unknown> | undefined;
        expect(payload.data?.seo).toEqual({ title: "Keep SEO" });
        expect(table).toMatchObject({ id: "table-1", variant: "default" });
        expect(data?.fields).toMatchObject({ showImage: true, showTitle: true });
        expect(data?.links).toEqual({
          linkedColumn: "title",
          showAction: true,
          actionLabel: "Inspect fixture product",
          openInNewTab: false,
        });
        return Response.json({
          id: "page-product-table",
          title: "Product Table fixture",
          slug: "/audit-31-05-product-table",
          status: "draft",
          currentData: payload.data,
          updatedAt: "2026-05-31T00:00:00.000Z",
        });
      }
      if (
        url === "http://admin.test/admin/api/pages/page-product-table/publish" &&
        init?.method === "POST"
      ) {
        const payload = JSON.parse(String(init.body)) as { data?: Record<string, unknown> };
        expect(Array.isArray(payload.data?.blocks)).toBe(true);
        return Response.json({ ok: true });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      await ensureCommerceWidgetFixtures("http://admin.test/admin", "session-token", [
        productTableCase,
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const labels = requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`);
    expect(labels).toContain("GET http://admin.test/admin/api/settings");
    expect(labels).toContain("PATCH http://admin.test/admin/api/settings");
    expect(labels).toContain("GET http://admin.test/admin/api/media");
    expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-starter");
    expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-urban");
    expect(labels).toContain("PATCH http://admin.test/admin/api/commerce/products/product-garden");
    expect(labels).toContain("PATCH http://admin.test/admin/api/pages/page-product-table");
    expect(labels).toContain("POST http://admin.test/admin/api/pages/page-product-table/publish");

    const writeHeaders = requests
      .filter((request) => (request.init?.method ?? "GET") !== "GET")
      .map((request) => request.init?.headers)
      .filter((headers): headers is Headers => headers instanceof Headers);
    expect(writeHeaders.every((headers) => headers.get("cookie") === "session=session-token")).toBe(
      true
    );
    expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(
      true
    );
  });

  test("maps fixture collection slugs to deterministic ids", () => {
    const collectionBySlug = new Map([
      ["fixture-homes", { id: "collection-1", slug: "fixture-homes", name: "Fixture Homes" }],
      ["fixture-lofts", { id: "collection-2", slug: "fixture-lofts", name: "Fixture Lofts" }],
    ]);

    expect(
      resolveCommerceFixtureCollectionIds(collectionBySlug, {
        slug: "fixture-garden-suite",
        title: "Fixture Garden Suite",
        excerpt: "Fixture",
        description: "Fixture description.",
        status: "published",
        pricing: { amount: 15900, currency: "USD", compareAtAmount: 17900 },
        stock: { state: "in_stock", quantity: 1 },
        collectionSlugs: ["fixture-homes", "missing", "fixture-lofts"],
      })
    ).toEqual(["collection-1", "collection-2"]);
  });

  test("normalizes long playwright-cli session names for stable browser reuse", () => {
    const longSession =
      "widget-contract-smoke-task-336-19-compare-timeline-advanced-readonly-2026-05-25";
    const resolved = resolvePlaywrightCliSessionName(longSession);
    const specialChars = resolvePlaywrightCliSessionName("widget smoke/task 336");

    expect(resolved.length).toBeLessThanOrEqual(64);
    expect(resolved).toMatch(/^widget-contract-smoke-task-336-19-compare-timeline-/);
    expect(resolved).toMatch(/-[a-f0-9]{8}$/);
    expect(resolvePlaywrightCliSessionName("ct-adv-ro")).toBe("ct-adv-ro");
    expect(specialChars).toBe("widget-smoke-task-336");
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

  test("classifies unopenable admin fixtures separately from editor contract failures", () => {
    const [item] = makeInventory().widgets;
    const fixtureGap = createAdminFixtureGapMode("advanced", "block_select_missing");
    const finalized = finalizeAdminResult(item, {
      widgetType: item.widgetType,
      modes: [makeMode({ mode: "wizard" }), makeMode({ mode: "visual" }), fixtureGap],
    });

    expect(isAdminFixtureUnopenableError("block_select_missing")).toBe(true);
    expect(isAdminFixtureUnopenableError("mode_root_or_visible_section_missing")).toBe(false);
    expect(fixtureGap).toMatchObject({
      status: "fixture-gap",
      error: "admin_fixture_unopenable:block_select_missing",
    });
    expect(finalized.status).toBe("fixture-gap");
  });

  test("classifies frontend fixture gaps and overflow failures distinctly", () => {
    expect(
      classifyPublicStatus({
        cssChecks: ["empty-fixture"],
        statusCode: 200,
        emptyFixture: true,
        bodyOverflow: false,
        unmarkedOverflowOwnerCount: 0,
      })
    ).toEqual({ status: "fixture-gap", error: "public_fixture_empty" });

    expect(
      classifyPublicStatus({
        cssChecks: ["card-overflow"],
        statusCode: 200,
        emptyFixture: false,
        bodyOverflow: false,
        unmarkedOverflowOwnerCount: 1,
      })
    ).toEqual({ status: "failed", error: "card_overflow_unmarked" });

    expect(
      classifyPublicStatus({
        cssChecks: ["body-overflow"],
        statusCode: 200,
        emptyFixture: false,
        bodyOverflow: true,
        unmarkedOverflowOwnerCount: 1,
      })
    ).toEqual({ status: "failed", error: "body_overflow_unmarked" });
  });

  test("ignores approved intentional and visually-hidden overflow owners", () => {
    const visibleOverflow = {
      scrollWidth: 420,
      clientWidth: 320,
      width: 320,
      height: 80,
      display: "block",
      visibility: "visible",
    };

    expect(shouldCountOverflowOwner(visibleOverflow)).toBe(true);
    expect(
      shouldCountOverflowOwner({
        ...visibleOverflow,
        hasIntentionalOverflowAncestor: true,
      })
    ).toBe(true);
    expect(
      shouldCountOverflowOwner({
        ...visibleOverflow,
        hasApprovedIntentionalOverflowAncestor: true,
      })
    ).toBe(false);
    expect(shouldCountOverflowOwner({ ...visibleOverflow, className: "sr-only" })).toBe(false);
    expect(shouldCountOverflowOwner({ ...visibleOverflow, ariaHidden: "true" })).toBe(false);
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
});
