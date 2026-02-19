import { expect, test } from "bun:test";

import {
  commerceCollectionCreateSchema,
  commerceProductCreateSchema,
  commerceProductUpdateSchema,
  commerceQuerySchema,
} from "../../../core/server/validation/commerceSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

test("commerceProductCreateSchema accepts valid payload", () => {
  expect(() =>
    validate(commerceProductCreateSchema, {
      title: "Starter Product",
      slug: "starter-product",
      status: "draft",
      pricing: {
        amount: 12900,
        currency: "USD",
        compareAtAmount: 14900,
      },
      stock: {
        state: "in_stock",
        quantity: 12,
      },
      collectionIds: ["8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8"],
      mediaIds: ["908d55fc-cd23-4f7f-b09f-8164b9cb0f5f"],
      variants: [
        {
          title: "Default",
          pricing: { amount: 12900, currency: "USD" },
          stock: { state: "in_stock", quantity: 12 },
          attributes: { size: "M" },
          isDefault: true,
        },
      ],
      metadata: { featured: true },
      data: { badge: "new" },
    })
  ).not.toThrow();
});

test("commerceProductCreateSchema rejects invalid currency", () => {
  expect(() =>
    validate(commerceProductCreateSchema, {
      title: "Starter Product",
      pricing: {
        amount: 12900,
        currency: "usd",
      },
      stock: {
        state: "in_stock",
      },
    })
  ).toThrow("Invalid payload");
});

test("commerceProductUpdateSchema requires at least one property", () => {
  expect(() => validate(commerceProductUpdateSchema, {})).toThrow("Invalid payload");
});

test("commerceQuerySchema rejects unsupported sort field", () => {
  expect(() =>
    validate(commerceQuerySchema, {
      filters: [],
      sort: [{ field: "unknownField", dir: "asc" }],
      pagination: { limit: 20, offset: 0 },
    })
  ).toThrow("Invalid payload");
});

test("commerceCollectionCreateSchema requires name", () => {
  expect(() =>
    validate(commerceCollectionCreateSchema, {
      slug: "summer-collection",
    })
  ).toThrow("Invalid payload");
});
