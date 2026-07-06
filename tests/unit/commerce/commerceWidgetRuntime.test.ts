import { expect, test } from "bun:test";

import {
  hydrateProductCompareRuntimeData,
  hydrateProductGalleryRuntimeData,
  hydrateProductTableRuntimeData,
} from "../../../core/services/commerce/commerceWidgetRuntime";
import type { resolveCommerceRuntimeProducts } from "../../../core/services/commerce/commerceRuntimeResolver";
import { getMediaById as getMediaByIdFn } from "../../../core/services/media/mediaService";
import { productCompareDefaults } from "../../../core/widgets/core/productCompare";
import { productGalleryDefaults } from "../../../core/widgets/core/productGallery";
import { productTableDefaults } from "../../../core/widgets/core/productTable";

type RuntimeProductsResult = Awaited<ReturnType<typeof resolveCommerceRuntimeProducts>>;
type RuntimeProductsInput = Parameters<typeof resolveCommerceRuntimeProducts>[0];

const sampleRows = [
  {
    id: "product-1",
    title: "Starter Home",
    slug: "starter-home",
    status: "published" as const,
    excerpt: "Compact modern home.",
    description: null,
    pricing: {
      amount: 120000,
      currency: "USD",
      compareAtAmount: 130000,
    },
    stock: {
      state: "in_stock" as const,
      quantity: 3,
    },
    collectionIds: ["collection-1"],
    mediaIds: ["media-1"],
    variants: [],
    metadata: {},
    data: {},
    createdAt: "2026-02-19T12:00:00.000Z",
    updatedAt: "2026-02-19T12:00:00.000Z",
    publishedAt: "2026-02-19T12:00:00.000Z",
  },
];

test("hydrateProductGalleryRuntimeData resolves cards and total", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const resolved = await hydrateProductGalleryRuntimeData(
    {
      ...productGalleryDefaults,
      source: {
        ...productGalleryDefaults.source,
        limit: 4,
        search: "starter",
      },
    },
    {
      preview: false,
    },
    {
      resolveRuntimeProducts: async (input: RuntimeProductsInput = {}) => {
        calls.push((input.query ?? {}) as Record<string, unknown>);
        return {
          total: 1,
          limit: 4,
          offset: 0,
          query: {
            filters: [],
            sort: [],
            pagination: { limit: 4, offset: 0 },
          },
          rows: sampleRows,
          cards: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: "Compact modern home.",
              status: "published" as const,
              pricing: {
                amount: 120000,
                currency: "USD",
                compareAtAmount: 130000,
              },
              stock: {
                state: "in_stock",
                quantity: 3,
                inStock: true,
              },
              primaryMediaId: "media-1",
              mediaIds: ["media-1"],
              collectionIds: ["collection-1"],
            },
          ],
        } as unknown as RuntimeProductsResult;
      },
      buildProductHrefMap: async (rows) =>
        new Map(rows.map((row) => [row.id, `/products/${row.slug}`] as const)),
      getMediaById: async (id: string) => ({
        id,
        key: "media-1.jpg",
        url: "/media/starter-home.jpg",
        originalName: "starter-home.jpg",
        type: "image",
        mimeType: "image/jpeg",
        size: 120,
        width: 1200,
        height: 900,
        alt: "Starter Home hero",
        title: "Starter Home hero",
        caption: null,
        folderId: null,
        tags: [],
        focalX: null,
        focalY: null,
        description: null,
        credit: null,
        createdAt: new Date("2026-02-19T12:00:00.000Z"),
        updatedAt: new Date("2026-02-19T12:00:00.000Z"),
        createdBy: null,
      }),
    }
  );

  expect(calls).toHaveLength(1);
  expect((calls[0].pagination as { limit: number }).limit).toBe(4);
  expect(resolved.resolved?.items?.[0]?.title).toBe("Starter Home");
  expect(resolved.resolved?.items?.[0]?.media).toEqual({
    url: "/media/starter-home.jpg",
    alt: "Starter Home hero",
    width: 1200,
    height: 900,
  });
  expect(resolved.resolved?.total).toBe(1);
});

test("hydrateProductTableRuntimeData resolves public runtime state and SSR pagination metadata", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const tableRows = [
    sampleRows[0],
    {
      ...sampleRows[0],
      id: "product-2",
      title: "Urban Loft",
      slug: "urban-loft",
      mediaIds: [],
      collectionIds: ["collection-1"],
      updatedAt: "2026-02-20T12:00:00.000Z",
    },
  ];
  const resolved = await hydrateProductTableRuntimeData(
    {
      ...productTableDefaults,
      source: {
        ...productTableDefaults.source,
        status: ["draft", "published"],
        collectionIds: ["collection-1", "collection-2"],
      },
      controls: {
        showSearchInput: true,
        showCollectionFilter: true,
        showStatusFilter: true,
        sorting: "interactive",
        pagination: "paged",
        pageSize: 2,
      },
    },
    {
      preview: false,
      runtimeSearchParams: new URLSearchParams(
        "foo=bar&pt.catalog-1.q=starter&pt.catalog-1.collection=collection-1&pt.catalog-1.status=draft&pt.catalog-1.sort=title&pt.catalog-1.dir=asc&pt.catalog-1.page=2"
      ),
      blockId: "catalog-1",
    },
    {
      resolveRuntimeProducts: async (input: RuntimeProductsInput = {}) => {
        calls.push((input.query ?? {}) as Record<string, unknown>);
        return {
          total: 5,
          limit: 2,
          offset: 2,
          query: {
            filters: [],
            sort: [{ field: "title", dir: "asc" }],
            pagination: { limit: 2, offset: 2 },
          },
          rows: tableRows,
          cards: tableRows.map((row) => ({
            id: row.id,
            title: row.title,
            slug: row.slug,
            excerpt: row.excerpt,
            status: row.status,
            pricing: row.pricing,
            stock: {
              state: row.stock.state,
              quantity: row.stock.quantity,
              inStock: row.stock.state === "in_stock",
            },
            primaryMediaId: row.mediaIds[0] ?? null,
            mediaIds: row.mediaIds,
            collectionIds: row.collectionIds,
          })),
        } as unknown as RuntimeProductsResult;
      },
      buildProductHrefMap: async (rows) =>
        new Map(rows.map((row) => [row.id, `/products/${row.slug}`] as const)),
      getMediaById: (async () => null) as unknown as typeof getMediaByIdFn,
      listCollections: async () => [
        {
          id: "collection-1",
          name: "Summer",
          slug: "summer",
          description: null,
          createdAt: "2026-02-19T12:00:00.000Z",
          updatedAt: "2026-02-19T12:00:00.000Z",
        },
        {
          id: "collection-2",
          name: "Urban",
          slug: "urban",
          description: null,
          createdAt: "2026-02-19T12:00:00.000Z",
          updatedAt: "2026-02-19T12:00:00.000Z",
        },
      ],
    }
  );

  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    search: "starter",
    collectionIds: ["collection-1"],
    sort: [{ field: "title", dir: "asc" }],
    pagination: { limit: 2, offset: 2 },
  });
  expect("status" in calls[0]).toBe(false);
  expect(resolved.resolved?.runtime).toMatchObject({
    searchQuery: "starter",
    status: [],
    collectionIds: ["collection-1"],
    availableStatuses: ["published"],
    availableCollections: [
      { id: "collection-1", label: "Summer", slug: "summer" },
      { id: "collection-2", label: "Urban", slug: "urban" },
    ],
    sortField: "title",
    sortDir: "asc",
    page: 2,
    pageSize: 2,
    totalPages: 3,
    clearHref: "?foo=bar",
    retainedParams: [{ name: "foo", value: "bar" }],
    rejectedTokens: ["status"],
  });
  expect(resolved.resolved?.runtime?.previousPageHref).toBe(
    "?foo=bar&pt.catalog-1.q=starter&pt.catalog-1.collection=collection-1&pt.catalog-1.sort=title&pt.catalog-1.dir=asc"
  );
  expect(resolved.resolved?.runtime?.nextPageHref).toBe(
    "?foo=bar&pt.catalog-1.q=starter&pt.catalog-1.collection=collection-1&pt.catalog-1.sort=title&pt.catalog-1.dir=asc&pt.catalog-1.page=3"
  );
});

test("hydrateProductTableRuntimeData fails closed when public source statuses exclude published rows", async () => {
  let calls = 0;
  const resolved = await hydrateProductTableRuntimeData(
    {
      ...productTableDefaults,
      source: {
        ...productTableDefaults.source,
        status: ["draft"],
      },
      controls: {
        showSearchInput: false,
        showCollectionFilter: false,
        showStatusFilter: true,
        sorting: "none",
        pagination: "paged",
        pageSize: 2,
      },
    },
    {
      preview: false,
      blockId: "catalog-1",
    },
    {
      resolveRuntimeProducts: async () => {
        calls += 1;
        throw new Error("unexpected_runtime_query");
      },
      listCollections: async () => [],
    }
  );

  expect(calls).toBe(0);
  expect(resolved.resolved?.items).toEqual([]);
  expect(resolved.resolved?.total).toBe(0);
  expect(resolved.resolved?.runtime).toMatchObject({
    availableStatuses: [],
    availableCollections: [],
    page: 1,
    pageSize: 2,
    totalPages: 1,
    clearHref: "?",
    rejectedTokens: [],
  });
});

test("hydrateProductGalleryRuntimeData preserves manual curation order and caps rendered items by limit", async () => {
  const resolved = await hydrateProductGalleryRuntimeData(
    {
      ...productGalleryDefaults,
      source: {
        ...productGalleryDefaults.source,
        limit: 1,
      },
      curation: {
        mode: "manual",
        productIds: ["product-2", "product-1"],
      },
    },
    {
      preview: true,
    },
    {
      listProducts: async () => [
        ...sampleRows,
        {
          ...sampleRows[0],
          id: "product-2",
          title: "City Loft",
          slug: "city-loft",
          mediaIds: [],
          description: null,
        },
      ],
      getMediaById: (async () => null) as unknown as typeof getMediaByIdFn,
    }
  );

  expect(resolved.resolved?.items?.map((item) => item.id)).toEqual(["product-2"]);
  expect(resolved.resolved?.total).toBe(2);
});

test("hydrateProductGalleryRuntimeData returns stable error code for invalid query", async () => {
  const resolved = await hydrateProductGalleryRuntimeData(
    productGalleryDefaults,
    {
      preview: false,
    },
    {
      resolveRuntimeProducts: async () => {
        throw new Error("commerce_query_invalid_filters");
      },
    }
  );

  expect(resolved.resolved?.items).toEqual([]);
  expect(resolved.resolved?.error).toBe("commerce_query_invalid_filters");
});

test("hydrateProductTableRuntimeData attaches safe product hrefs and public media to resolved rows", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const resolved = await hydrateProductTableRuntimeData(
    {
      ...productTableDefaults,
      source: {
        ...productTableDefaults.source,
        limit: 2,
        search: "starter",
      },
    },
    {
      preview: false,
    },
    {
      resolveRuntimeProducts: async (input: RuntimeProductsInput = {}) => {
        calls.push((input.query ?? {}) as Record<string, unknown>);
        return {
          total: 1,
          limit: 2,
          offset: 0,
          query: {
            filters: [],
            sort: [],
            pagination: { limit: 2, offset: 0 },
          },
          rows: sampleRows,
          cards: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: "Compact modern home.",
              status: "published" as const,
              pricing: {
                amount: 120000,
                currency: "USD",
                compareAtAmount: 130000,
              },
              stock: {
                state: "in_stock",
                quantity: 3,
                inStock: true,
              },
              primaryMediaId: "media-1",
              mediaIds: ["media-1"],
              collectionIds: ["collection-1"],
            },
          ],
        } as unknown as RuntimeProductsResult;
      },
      buildProductHrefMap: async (rows) =>
        new Map(rows.map((row) => [row.id, `/products/${row.slug}`] as const)),
      getMediaById: async (id: string) => ({
        id,
        key: "media-1.jpg",
        url: "/media/starter-home.jpg",
        originalName: "starter-home.jpg",
        type: "image",
        mimeType: "image/jpeg",
        size: 120,
        width: 1200,
        height: 900,
        alt: null,
        title: "Starter Home hero",
        caption: null,
        folderId: null,
        tags: [],
        focalX: null,
        focalY: null,
        description: null,
        credit: null,
        createdAt: new Date("2026-02-19T12:00:00.000Z"),
        updatedAt: new Date("2026-02-19T12:00:00.000Z"),
        createdBy: null,
      }),
    }
  );

  expect(calls).toHaveLength(1);
  expect((calls[0].pagination as { limit: number }).limit).toBe(2);
  expect(resolved.resolved?.items?.[0]?.productHref).toBe("/products/starter-home");
  expect(resolved.resolved?.items?.[0]?.media).toEqual({
    url: "/media/starter-home.jpg",
    alt: "Starter Home hero",
    width: 1200,
    height: 900,
  });
  expect(resolved.resolved?.items?.[0]?.title).toBe("Starter Home");
  expect(resolved.resolved?.total).toBe(1);
});

test("hydrateProductCompareRuntimeData maps compare payload rows", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const resolved = await hydrateProductCompareRuntimeData(
    {
      ...productCompareDefaults,
      source: {
        ...productCompareDefaults.source,
        limit: 1,
        productIds: ["product-3", "product-1", "product-3"],
      },
    },
    {
      preview: true,
    },
    {
      resolveRuntimeProducts: async (input: RuntimeProductsInput = {}) => {
        calls.push((input.query ?? {}) as Record<string, unknown>);
        return {
          total: 1,
          limit: 3,
          offset: 0,
          query: {
            filters: [],
            sort: [],
            pagination: { limit: 3, offset: 0 },
          },
          rows: sampleRows,
          cards: [],
        } as unknown as RuntimeProductsResult;
      },
      buildComparePayload: async (rows) => ({
        generatedAt: "2026-05-19T12:00:00.000Z",
        rows: rows.map((row) => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          excerpt: row.excerpt ?? null,
          productHref: `/products/${row.slug}`,
          imageUrl: null,
          imageAlt: row.title,
          priceAmount: row.pricing.amount,
          currency: row.pricing.currency,
          compareAtAmount: row.pricing.compareAtAmount,
          stockState: row.stock.state,
          stockQuantity: row.stock.quantity,
        })),
      }),
    }
  );

  expect(calls[0]?.productIds).toEqual(["product-3", "product-1"]);
  expect((calls[0]?.pagination as { limit: number }).limit).toBe(2);
  expect(resolved.resolved?.rows?.[0]?.priceAmount).toBe(120000);
  expect(resolved.resolved?.rows?.[0]?.stockState).toBe("in_stock");
  expect(resolved.resolved?.rows?.[0]?.productHref).toBe("/products/starter-home");
  expect(resolved.resolved?.total).toBe(1);
});

test("hydrateProductTableRuntimeData returns stable error code for invalid query", async () => {
  const resolved = await hydrateProductTableRuntimeData(
    productTableDefaults,
    {
      preview: false,
    },
    {
      resolveRuntimeProducts: async () => {
        throw new Error("commerce_query_invalid_filters");
      },
    }
  );

  expect(resolved.resolved?.items).toEqual([]);
  expect(resolved.resolved?.error).toBe("commerce_query_invalid_filters");
});

test("commerce widget runtime uses cache between widgets for identical query", async () => {
  let calls = 0;
  const cache = new Map();

  const deps = {
    resolveRuntimeProducts: async () => {
      calls += 1;
      return {
        total: 1,
        limit: 8,
        offset: 0,
        query: {
          filters: [],
          sort: [],
          pagination: { limit: 8, offset: 0 },
        },
        rows: sampleRows,
        cards: [
          {
            id: "product-1",
            title: "Starter Home",
            slug: "starter-home",
            excerpt: "Compact modern home.",
            status: "published" as const,
            pricing: {
              amount: 120000,
              currency: "USD",
              compareAtAmount: 130000,
            },
            stock: {
              state: "in_stock" as const,
              quantity: 3,
              inStock: true,
            },
            primaryMediaId: "media-1",
            mediaIds: ["media-1"],
            collectionIds: ["collection-1"],
          },
        ],
      } as unknown as RuntimeProductsResult;
    },
    getMediaById: (async () => null) as unknown as typeof getMediaByIdFn,
  };

  await hydrateProductGalleryRuntimeData(productGalleryDefaults, { preview: false, cache }, deps);
  await hydrateProductTableRuntimeData(
    {
      ...productTableDefaults,
      source: {
        ...productTableDefaults.source,
        limit: productGalleryDefaults.source?.limit,
        sortField: productGalleryDefaults.source?.sortField,
        sortDir: productGalleryDefaults.source?.sortDir,
      },
    },
    { preview: false, cache },
    deps
  );

  expect(calls).toBe(1);
});
