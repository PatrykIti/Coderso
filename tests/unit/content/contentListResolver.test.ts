import { expect, test } from "bun:test";

import {
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
