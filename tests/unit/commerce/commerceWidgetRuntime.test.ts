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
