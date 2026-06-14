import { expect, test } from "bun:test";

import {
  mapListingRowsToContentListItems,
  mapEntriesToContentListItems,
  resolveContentListRuntimeData,
  resolveContentListRuntimeNavigationMeta,
} from "../../../core/services/content/contentListResolver";
import {
  buildListingRuntimeParamName,
  listingRuntimeTokens,
} from "../../../core/services/search/filterContract";

const createEntry = (data: Record<string, unknown>) => ({
  id: "entry-1",
  typeId: "post-type",
  title: "Entry title",
  slug: "entry-title",
  status: "published" as const,
  data,
  tags: [],
  taxonomy: undefined,
  scheduledAt: null,
  publishedAt: new Date("2026-02-21T10:00:00.000Z"),
  createdAt: new Date("2026-02-21T08:00:00.000Z"),
  updatedAt: new Date("2026-02-21T10:00:00.000Z"),
  author: null,
  seo: null,
});

test("mapEntriesToContentListItems resolves excerpt from post block document", async () => {
  const [item] = await mapEntriesToContentListItems(
    [
      createEntry({
        document: {
          version: 1,
          blocks: [
            {
              id: "block-1",
              type: "paragraph",
              attrs: {},
              content: "<p>Excerpt from block document runtime text.</p>",
            },
          ],
          meta: {},
        },
      }),
    ],
    { detailPathPattern: "/blog/:slug", showImage: false }
  );

  expect(item?.excerpt).toContain("Excerpt from block document runtime text.");
  expect(item?.href).toBe("/blog/entry-title");
});

test("mapEntriesToContentListItems keeps explicit excerpt priority", async () => {
  const [item] = await mapEntriesToContentListItems(
    [
      createEntry({
        excerpt: "Explicit excerpt wins.",
        document: {
          version: 1,
          blocks: [
            {
              id: "block-1",
              type: "paragraph",
              attrs: {},
              content: "<p>Document fallback should not override explicit excerpt.</p>",
            },
          ],
          meta: {},
        },
      }),
    ],
    { detailPathPattern: "/blog/:slug", showImage: false }
  );

  expect(item?.excerpt).toBe("Explicit excerpt wins.");
});

test("mapEntriesToContentListItems still resolves media ids after helper extraction", async () => {
  const [item] = await mapEntriesToContentListItems(
    [
      createEntry({
        featuredImage: "media-1",
      }),
    ],
    { detailPathPattern: "/blog/:slug", showImage: true },
    {
      getMediaById: async (id) => ({
        id,
        url: "/media/card.jpg",
        alt: "Card alt",
        title: "Card title",
      }),
    }
  );

  expect(item?.imageSrc).toBe("/media/card.jpg");
  expect(item?.imageAlt).toBe("Card alt");
});

test("mapListingRowsToContentListItems resolves curated cover image urls from listing bindings", async () => {
  const [item] = await mapListingRowsToContentListItems(
    [
      {
        id: "entry-1",
        title: "Portfolio entry",
        slug: "portfolio-entry",
        data: {
          summary: "Entry summary",
          coverImageUrl:
            "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1400&q=80",
          coverImageAlt: "Apartment interior with built-in storage",
        },
      },
    ],
    {
      detailPathPattern: "/portfolio/:slug",
      showImage: true,
      template: {
        id: "template-1",
        name: "Portfolio Grid",
        slug: "portfolio-grid",
        description: null,
        layout: "grid",
        config: {
          fields: [
            {
              key: "image",
              source: "data.coverImageUrl",
              label: "Image",
              fallback: null,
              format: "text",
              conditions: [],
            },
          ],
          itemActions: [],
          emptyState: {
            title: "No entries",
            description: null,
            ctaLabel: null,
            ctaHref: null,
          },
          style: {
            columns: 3,
            gap: "md",
            cardVariant: "default",
          },
        },
        createdAt: new Date("2026-02-21T10:00:00.000Z"),
        updatedAt: new Date("2026-02-21T10:00:00.000Z"),
      },
    }
  );

  expect(item?.imageSrc).toBe(
    "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1400&q=80"
  );
  expect(item?.imageAlt).toBe("Apartment interior with built-in storage");
});

test("mapListingRowsToContentListItems falls back to curated cover image urls without a template image field", async () => {
  const [item] = await mapListingRowsToContentListItems(
    [
      {
        id: "entry-1",
        title: "Portfolio entry",
        slug: "portfolio-entry",
        data: {
          summary: "Entry summary",
          coverImageUrl:
            "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1400&q=80",
          coverImageAlt: "Apartment interior with built-in storage",
        },
      },
    ],
    {
      detailPathPattern: "/portfolio/:slug",
      showImage: true,
      template: null,
    }
  );

  expect(item?.imageSrc).toBe(
    "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1400&q=80"
  );
  expect(item?.imageAlt).toBe("Apartment interior with built-in storage");
});

test("mapListingRowsToContentListItems ignores untrusted cover image urls", async () => {
  const [item] = await mapListingRowsToContentListItems(
    [
      {
        id: "entry-1",
        title: "Portfolio entry",
        slug: "portfolio-entry",
        data: {
          summary: "Entry summary",
          coverImageUrl: "https://example.com/untrusted.jpg",
          coverImageAlt: "Untrusted external image",
        },
      },
    ],
    {
      detailPathPattern: "/portfolio/:slug",
      showImage: true,
      template: null,
    }
  );

  expect(item?.imageSrc).toBeUndefined();
  expect(item?.imageAlt).toBeUndefined();
});

test("resolveContentListRuntimeNavigationMeta preserves query state for shared listing pages", () => {
  const pageKey = buildListingRuntimeParamName("query-1", listingRuntimeTokens.page);
  const meta = resolveContentListRuntimeNavigationMeta({
    page: 2,
    pageSize: 6,
    total: 15,
    runtimeSearchParams: new URLSearchParams("filter=active"),
    pageKey,
  });

  expect(meta.page).toBe(2);
  expect(meta.pageSize).toBe(6);
  expect(meta.totalPages).toBe(3);
  expect(meta.previousPageHref).toBe("?filter=active");
  expect(meta.nextPageHref).toBe(`?filter=active&${pageKey}=3`);
});

test("resolveContentListRuntimeData omits undefined listing runtime keys", async () => {
  const result = await resolveContentListRuntimeData(
    {
      source: {
        mode: "listing",
        listingQueryId: "query-1",
        listingTemplateId: "template-1",
      },
      fields: {
        showImage: false,
      },
    },
    {
      preview: false,
      contentRoutes: [],
    },
    {
      getListingQueryById: async () => ({
        id: "query-1",
        name: "Query",
        description: null,
        query: {
          source: "entries",
          sourceConfig: {
            contentTypeId: "type-1",
            includeDrafts: false,
          },
          filters: [],
          sort: [{ field: "title", dir: "asc" }],
          pagination: { limit: 6, offset: 0 },
          fields: ["id", "title", "slug"],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getListingTemplateById: async () => ({
        id: "template-1",
        name: "Template",
        slug: "template",
        description: null,
        layout: "grid",
        config: {
          fields: [],
          itemActions: [],
          emptyState: {
            title: "No items",
            description: null,
            ctaLabel: null,
            ctaHref: null,
          },
          style: {
            columns: 3,
            gap: "md",
            cardVariant: "default",
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      executeListing: async () => ({
        source: "entries",
        total: 0,
        limit: 6,
        offset: 0,
        rows: [],
      }),
      getContentTypeById: async () => ({
        id: "type-1",
        slug: "house-projects",
        name: "House Projects",
        status: "published",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getContentTypeBySlug: async () => ({
        id: "type-1",
        slug: "house-projects",
        name: "House Projects",
        status: "published",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    }
  );

  const runtime = ("runtime" in result ? result.runtime : undefined) as
    | {
        rejectedTokens?: string[];
        searchQuery?: string;
        page?: number;
        pageSize?: number;
        totalPages?: number;
        previousPageHref?: string;
        nextPageHref?: string;
      }
    | undefined;
  expect(runtime?.rejectedTokens).toEqual([]);
  expect(Object.prototype.hasOwnProperty.call(runtime ?? {}, "searchQuery")).toBe(false);
  expect(runtime?.page).toBe(1);
  expect(runtime?.pageSize).toBe(6);
  expect(runtime?.totalPages).toBe(1);
  expect(Object.prototype.hasOwnProperty.call(runtime ?? {}, "previousPageHref")).toBe(false);
  expect(Object.prototype.hasOwnProperty.call(runtime ?? {}, "nextPageHref")).toBe(false);
  expect(Object.prototype.hasOwnProperty.call(result, "rawRows")).toBe(false);
});

test("resolveContentListRuntimeData grows legacy load-more cumulatively across page hops", async () => {
  const dataset = [
    {
      ...createEntry({}),
      id: "entry-1",
      slug: "entry-1",
      title: "Entry 1",
      publishedAt: new Date("2026-02-23T10:00:00.000Z"),
      updatedAt: new Date("2026-02-23T10:00:00.000Z"),
    },
    {
      ...createEntry({}),
      id: "entry-2",
      slug: "entry-2",
      title: "Entry 2",
      publishedAt: new Date("2026-02-22T10:00:00.000Z"),
      updatedAt: new Date("2026-02-22T10:00:00.000Z"),
    },
    {
      ...createEntry({}),
      id: "entry-3",
      slug: "entry-3",
      title: "Entry 3",
      publishedAt: new Date("2026-02-21T10:00:00.000Z"),
      updatedAt: new Date("2026-02-21T10:00:00.000Z"),
    },
  ];

  const result = await resolveContentListRuntimeData(
    {
      source: {
        contentTypeId: "type-1",
        statusScope: "published",
        limit: 3,
        sort: "published-desc",
      },
      pagination: {
        mode: "load-more",
        pageSize: 1,
      },
    },
    {
      preview: true,
      contentRoutes: [
        {
          type: "articles",
          listPath: "/articles",
          detailPath: "/articles/:slug",
          enabled: true,
        },
      ],
      runtimeSearchParams: new URLSearchParams("cl.content-list-1.page=2"),
      blockId: "content-list-1",
    },
    {
      getContentTypeById: async () => ({
        id: "type-1",
        slug: "articles",
        name: "Articles",
        status: "published",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      listEntriesByTypeId: async () => dataset,
    }
  );

  expect(result.items.map((item) => item.id)).toEqual(["entry-1", "entry-2"]);
  expect(result.runtime).toEqual(
    expect.objectContaining({
      page: 2,
      pageSize: 1,
      totalPages: 3,
      nextPageHref: "?cl.content-list-1.page=3",
    })
  );
});

test("resolveContentListRuntimeData ignores stale page params for legacy view-all", async () => {
  const dataset = [
    {
      ...createEntry({}),
      id: "entry-1",
      slug: "entry-1",
      title: "Entry 1",
      publishedAt: new Date("2026-02-23T10:00:00.000Z"),
      updatedAt: new Date("2026-02-23T10:00:00.000Z"),
    },
    {
      ...createEntry({}),
      id: "entry-2",
      slug: "entry-2",
      title: "Entry 2",
      publishedAt: new Date("2026-02-22T10:00:00.000Z"),
      updatedAt: new Date("2026-02-22T10:00:00.000Z"),
    },
    {
      ...createEntry({}),
      id: "entry-3",
      slug: "entry-3",
      title: "Entry 3",
      publishedAt: new Date("2026-02-21T10:00:00.000Z"),
      updatedAt: new Date("2026-02-21T10:00:00.000Z"),
    },
  ];

  const result = await resolveContentListRuntimeData(
    {
      source: {
        contentTypeId: "type-1",
        statusScope: "published",
        limit: 3,
        sort: "published-desc",
      },
      pagination: {
        mode: "view-all",
        pageSize: 1,
      },
    },
    {
      preview: true,
      contentRoutes: [
        {
          type: "articles",
          listPath: "/articles",
          detailPath: "/articles/:slug",
          enabled: true,
        },
      ],
      runtimeSearchParams: new URLSearchParams("cl.content-list-1.page=4"),
      blockId: "content-list-1",
    },
    {
      getContentTypeById: async () => ({
        id: "type-1",
        slug: "articles",
        name: "Articles",
        status: "published",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      listEntriesByTypeId: async () => dataset,
    }
  );

  expect(result.items.map((item) => item.id)).toEqual(["entry-1"]);
  expect(result.runtime).toEqual(
    expect.objectContaining({
      page: 1,
      pageSize: 1,
      totalPages: 3,
      nextPageHref: "?cl.content-list-1.page=2",
    })
  );
});

test("navigation meta exposes the page param key and search for the numbered pager (TASK-459-03)", () => {
  const pageKey = buildListingRuntimeParamName("query-1", listingRuntimeTokens.page);
  const meta = resolveContentListRuntimeNavigationMeta({
    page: 2,
    pageSize: 6,
    total: 15,
    runtimeSearchParams: new URLSearchParams(`filter=active&${pageKey}=2`),
    pageKey,
  });

  expect(meta.pageParamKey).toBe(pageKey);
  expect(meta.search).toBe(`filter=active&${pageKey}=2`);
  // Page 1 drops the param: the previous href is the canonical filtered URL.
  expect(meta.previousPageHref).toBe("?filter=active");
  expect(meta.nextPageHref).toBe(`?filter=active&${pageKey}=3`);
});

test("dangling-route guard suppresses card links when no enabled route exists (TASK-459-03 frozen policy)", async () => {
  const dataset = [
    {
      ...createEntry({}),
      id: "entry-1",
      slug: "entry-1",
      title: "Entry 1",
    },
  ];
  const deps = {
    getContentTypeById: async () => ({
      id: "type-1",
      slug: "articles",
      name: "Articles",
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    listEntriesByTypeId: async () => dataset,
  };
  const config = {
    source: {
      contentTypeId: "type-1",
      statusScope: "published" as const,
      limit: 3,
      sort: "published-desc" as const,
    },
  };

  // No enabled route: the old `/articles/:slug` fallback produced 404 links;
  // now hrefs are suppressed and the resolver reports the guard state.
  const unrouted = await resolveContentListRuntimeData(
    config,
    { preview: false, contentRoutes: [] },
    deps
  );
  expect(unrouted.cardLinkMode).toBe("missing-route");
  expect(unrouted.items[0]?.href).toBeUndefined();

  // A disabled route counts as missing.
  const disabled = await resolveContentListRuntimeData(
    config,
    {
      preview: false,
      contentRoutes: [
        { type: "articles", listPath: "/articles", detailPath: "/articles/:slug", enabled: false },
      ],
    },
    deps
  );
  expect(disabled.cardLinkMode).toBe("missing-route");
  expect(disabled.items[0]?.href).toBeUndefined();

  // An enabled route keeps today's linked cards.
  const routed = await resolveContentListRuntimeData(
    config,
    {
      preview: false,
      contentRoutes: [
        { type: "articles", listPath: "/articles", detailPath: "/articles/:slug", enabled: true },
      ],
    },
    deps
  );
  expect(routed.cardLinkMode).toBe("ready");
  expect(routed.items[0]?.href).toBe("/articles/entry-1");
});

test("listing resolution passes the template style and emptyState through for render consumption (TASK-459-03)", async () => {
  const executeListingInputs: unknown[] = [];
  const result = await resolveContentListRuntimeData(
    {
      source: {
        mode: "listing",
        listingQueryId: "query-1",
        listingTemplateId: "template-1",
      },
    },
    {
      preview: false,
      contentRoutes: [],
      runtimeSearchParams: new URLSearchParams("rooms=3&page=2"),
      runtimeAliases: { rooms: "data.rooms.in", page: listingRuntimeTokens.page },
    },
    {
      getListingQueryById: async () => ({
        id: "query-1",
        name: "Query",
        description: null,
        query: {
          source: "entries",
          sourceConfig: { contentTypeId: "type-1", includeDrafts: false },
          filters: [],
          sort: [{ field: "title", dir: "asc" }],
          pagination: { limit: 6, offset: 0 },
          fields: ["id", "title", "slug"],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getListingTemplateById: async () => ({
        id: "template-1",
        name: "Template",
        slug: "template",
        description: null,
        layout: "grid",
        config: {
          fields: [],
          itemActions: [],
          emptyState: {
            title: "No homes match",
            description: "Loosen the filters.",
            ctaLabel: null,
            ctaHref: null,
          },
          style: { columns: 4, gap: "xl", cardVariant: "compact" },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      executeListing: async (input) => {
        executeListingInputs.push(input);
        return {
          source: "entries",
          total: 0,
          limit: 6,
          offset: 6,
          rows: [],
        };
      },
      getContentTypeById: async () => ({
        id: "type-1",
        slug: "homes",
        name: "Homes",
        status: "published",
        schema: { type: "object", additionalProperties: false, properties: {} },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getContentTypeBySlug: async () => null,
    }
  );

  expect(result.templateStyle).toEqual({ columns: 4, gap: "xl", cardVariant: "compact" });
  expect(result.templateEmptyState).toEqual({
    title: "No homes match",
    description: "Loosen the filters.",
    ctaLabel: null,
    ctaHref: null,
  });
  // Entries source without an enabled route reports the guard state too.
  expect(result.cardLinkMode).toBe("missing-route");
  // The numbered pager fields ride the runtime meta.
  expect(result.runtime?.pageParamKey).toBe("page");
  expect(result.runtime?.search).toBe("rooms=3&page=2");
  expect(executeListingInputs[0]).toMatchObject({
    filters: [{ field: "data.rooms", op: "in", value: [3] }],
    pagination: { limit: 6, offset: 6 },
  });
});
