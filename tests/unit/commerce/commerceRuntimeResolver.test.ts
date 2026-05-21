import { expect, test } from "bun:test";

import {
  buildCommerceComparePayload,
  buildCommerceProductHrefMap,
  buildCommerceWishlistPayload,
  resolveCommerceRuntimeProducts,
  toCommerceRuntimeCard,
} from "../../../core/services/commerce/commerceRuntimeResolver";
import type { CommerceProduct } from "../../../core/services/commerce/commerceTypes";

const baseProduct: CommerceProduct = {
  id: "product-1",
  title: "Oak Residence",
  slug: "oak-residence",
  status: "published",
  excerpt: "Modern home",
  description: "Detailed description",
  pricing: { amount: 450000, currency: "USD", compareAtAmount: 470000 },
  stock: { state: "in_stock", quantity: 3 },
  collectionIds: ["c-modern"],
  mediaIds: ["m-1", "m-2"],
  variants: [],
  metadata: {},
  data: {},
  createdAt: "2026-02-01T10:00:00.000Z",
  updatedAt: "2026-02-10T10:00:00.000Z",
  publishedAt: "2026-02-10T10:00:00.000Z",
};

test("toCommerceRuntimeCard maps runtime friendly shape", () => {
  const card = toCommerceRuntimeCard(baseProduct);
  expect(card.id).toBe("product-1");
  expect(card.primaryMediaId).toBe("m-1");
  expect(card.stock.inStock).toBe(true);
});

test("compare/wishlist payload builders normalize runtime payloads", async () => {
  const compare = await buildCommerceComparePayload([baseProduct], {
    getContentRoutes: async () => [
      {
        type: "products",
        enabled: true,
        listPath: "/products",
        detailPath: "/products/:slug",
      },
    ],
    readMedia: async () => ({
      id: "m-1",
      key: "2026/05/m-1.jpg",
      url: "/media/m-1.jpg",
      originalName: "m-1.jpg",
      type: "image",
      mimeType: "image/jpeg",
      size: 100,
      width: 1200,
      height: 800,
      alt: "Oak Residence hero",
      title: "Oak Residence hero",
      caption: null,
      createdBy: null,
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
      updatedAt: new Date("2026-02-01T10:00:00.000Z"),
    }),
    now: () => "2026-05-19T12:00:00.000Z",
  });
  const wishlist = buildCommerceWishlistPayload([baseProduct]);

  expect(compare.rows).toHaveLength(1);
  expect(compare.generatedAt).toBe("2026-05-19T12:00:00.000Z");
  expect(compare.rows[0]?.priceAmount).toBe(450000);
  expect(compare.rows[0]?.excerpt).toBe("Modern home");
  expect(compare.rows[0]?.productHref).toBe("/products/oak-residence");
  expect(compare.rows[0]?.imageUrl).toBe("/media/m-1.jpg");
  expect(compare.rows[0]?.imageAlt).toBe("Oak Residence hero");
  expect(wishlist.total).toBe(1);
  expect(wishlist.items[0]?.primaryMediaId).toBe("m-1");
});

test("buildCommerceProductHrefMap resolves safe relative product hrefs", async () => {
  const hrefMap = await buildCommerceProductHrefMap([baseProduct], {
    getContentRoutes: async () => [
      {
        type: "products",
        enabled: true,
        listPath: "/products",
        detailPath: "/products/:slug",
      },
    ],
  });

  expect(hrefMap.get("product-1")).toBe("/products/oak-residence");
});

test("compare payload omits product links when no enabled products detail route exists", async () => {
  const compare = await buildCommerceComparePayload([baseProduct], {
    getContentRoutes: async () => [],
    readMedia: async () => ({
      id: "m-1",
      key: "2026/05/m-1.jpg",
      url: "/media/m-1.jpg",
      originalName: "m-1.jpg",
      type: "image",
      mimeType: "image/jpeg",
      size: 100,
      width: 1200,
      height: 800,
      alt: "Oak Residence hero",
      title: "Oak Residence hero",
      caption: null,
      createdBy: null,
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
      updatedAt: new Date("2026-02-01T10:00:00.000Z"),
    }),
    now: () => "2026-05-19T12:00:00.000Z",
  });

  expect(compare.rows[0]?.productHref).toBeNull();
});

test("resolveCommerceRuntimeProducts enforces published status outside preview", async () => {
  const seenQueries: Array<Record<string, unknown>> = [];
  await resolveCommerceRuntimeProducts(
    {
      preview: false,
      query: {},
    },
    {
      executeQuery: async (query) => {
        seenQueries.push(query as Record<string, unknown>);
        return {
          total: 1,
          limit: 24,
          offset: 0,
          query: {
            filters: [],
            sort: [{ field: "updatedAt", dir: "desc" }],
            pagination: { limit: 24, offset: 0 },
            status: ["published"],
          },
          rows: [baseProduct],
        };
      },
    }
  );

  expect(seenQueries).toHaveLength(1);
  expect(seenQueries[0]?.status).toEqual(["published"]);
});
