import { expect, test } from "bun:test";

import {
  buildCommerceExecutionPlan,
  executeCommerceQuery,
} from "../../../core/services/commerce/commerceQueryService";
import type { CommerceProduct } from "../../../core/services/commerce/commerceTypes";

const products: CommerceProduct[] = [
  {
    id: "p-1",
    title: "Oak Residence",
    slug: "oak-residence",
    status: "published",
    excerpt: "Modern family home",
    description: "Large house with two levels",
    pricing: { amount: 450000, currency: "USD", compareAtAmount: 470000 },
    stock: { state: "in_stock", quantity: 3 },
    collectionIds: ["c-modern"],
    mediaIds: ["m-1"],
    variants: [],
    metadata: {},
    data: {},
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-10T10:00:00.000Z",
    publishedAt: "2026-02-10T10:00:00.000Z",
  },
  {
    id: "p-2",
    title: "Pine Loft",
    slug: "pine-loft",
    status: "draft",
    excerpt: "Compact loft",
    description: "Ideal for city center",
    pricing: { amount: 250000, currency: "USD", compareAtAmount: null },
    stock: { state: "out_of_stock", quantity: 0 },
    collectionIds: ["c-city"],
    mediaIds: ["m-2"],
    variants: [],
    metadata: {},
    data: {},
    createdAt: "2026-02-03T10:00:00.000Z",
    updatedAt: "2026-02-11T10:00:00.000Z",
    publishedAt: null,
  },
  {
    id: "p-3",
    title: "Cedar Villa",
    slug: "cedar-villa",
    status: "published",
    excerpt: "Premium villa",
    description: "Pool and garden",
    pricing: { amount: 650000, currency: "USD", compareAtAmount: 700000 },
    stock: { state: "backorder", quantity: 1 },
    collectionIds: ["c-modern", "c-premium"],
    mediaIds: ["m-3"],
    variants: [],
    metadata: {},
    data: {},
    createdAt: "2026-02-02T10:00:00.000Z",
    updatedAt: "2026-02-12T10:00:00.000Z",
    publishedAt: "2026-02-12T10:00:00.000Z",
  },
];

test("buildCommerceExecutionPlan applies defaults", () => {
  const plan = buildCommerceExecutionPlan({});
  expect(plan.filters).toEqual([]);
  expect(plan.sort).toEqual([{ field: "updatedAt", dir: "desc" }]);
  expect(plan.pagination).toEqual({ limit: 24, offset: 0 });
  expect(plan.status).toEqual([]);
  expect(plan.collectionIds).toEqual([]);
  expect(plan.productIds).toEqual([]);
  expect(plan.search).toBeNull();
});

test("executeCommerceQuery rejects unsafe field before data fetch", async () => {
  let called = false;

  await expect(
    executeCommerceQuery(
      {
        filters: [{ field: "__proto__.x", op: "eq", value: "bad" }],
      },
      {
        listProducts: async () => {
          called = true;
          return [];
        },
      }
    )
  ).rejects.toThrow("commerce_query_invalid_field");

  expect(called).toBe(false);
});

test("executeCommerceQuery filters by status, collection, search and sorts deterministically", async () => {
  const result = await executeCommerceQuery(
    {
      status: ["published"],
      collectionIds: ["c-modern"],
      search: "villa",
      filters: [{ field: "pricing.amount", op: "gte", value: 600000 }],
      sort: [{ field: "pricing.amount", dir: "asc" }],
      pagination: { limit: 10, offset: 0 },
    },
    {
      listProducts: async () => products,
    }
  );

  expect(result.total).toBe(1);
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0]?.id).toBe("p-3");
});

test("executeCommerceQuery supports between/date filters and pagination", async () => {
  const result = await executeCommerceQuery(
    {
      filters: [
        {
          field: "updatedAt",
          op: "between",
          value: ["2026-02-10T00:00:00.000Z", "2026-02-12T00:00:00.000Z"],
        },
      ],
      sort: [{ field: "updatedAt", dir: "desc" }],
      pagination: { limit: 1, offset: 1 },
    },
    {
      listProducts: async () => products,
    }
  );

  expect(result.total).toBe(2);
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0]?.id).toBe("p-1");
});

test("executeCommerceQuery filters productIds before pagination and preserves manual order", async () => {
  const result = await executeCommerceQuery(
    {
      productIds: ["p-3", "p-1", "missing", "p-3"],
      sort: [{ field: "title", dir: "asc" }],
      pagination: { limit: 10, offset: 0 },
      status: ["published"],
    },
    {
      listProducts: async () => products,
    }
  );

  expect(result.total).toBe(2);
  expect(result.rows.map((row) => row.id)).toEqual(["p-3", "p-1"]);
  expect(result.query.productIds).toEqual(["p-3", "p-1"]);
});
