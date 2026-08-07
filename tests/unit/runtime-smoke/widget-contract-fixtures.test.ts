import { expect, test } from "bun:test";
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
  ensureContentListWidgetFixtures,
  ensurePostsFeedWidgetFixtures,
  resolveCommerceFixtureCollectionIds,
} from "../../../scripts/playwright-widget-contract-smoke";
import { contentListCase, postsFeedCase } from "./widget-contract-test-support";

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
    if (url === "http://admin.test/admin/api/pages/page-posts/publish" && init?.method === "POST") {
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
  expect(writeHeaders.every((headers) => headers.get("X-CSRF-Token") === "csrf-token")).toBe(true);
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
