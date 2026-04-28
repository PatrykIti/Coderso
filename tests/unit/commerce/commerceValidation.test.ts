import { expect, test } from "bun:test";

import {
  normalizeCommerceCurrency,
  normalizeCommerceMoney,
  normalizeCommerceProductStatus,
  normalizeCommerceSlug,
  normalizeCommerceStock,
  normalizeCommerceStockState,
} from "../../../core/services/commerce/commerceValidation";

test("normalizeCommerceProductStatus returns fallback for undefined", () => {
  expect(normalizeCommerceProductStatus(undefined)).toBe("draft");
});

test("normalizeCommerceProductStatus rejects invalid value", () => {
  expect(() => normalizeCommerceProductStatus("active")).toThrow(
    "commerce_status_invalid"
  );
});

test("normalizeCommerceStockState accepts valid values", () => {
  expect(normalizeCommerceStockState("backorder")).toBe("backorder");
});

test("normalizeCommerceCurrency uppercases and validates code", () => {
  expect(normalizeCommerceCurrency("eur")).toBe("EUR");
  expect(() => normalizeCommerceCurrency("EURO")).toThrow(
    "commerce_currency_invalid"
  );
});

test("normalizeCommerceMoney normalizes optional compareAtAmount", () => {
  expect(
    normalizeCommerceMoney({ amount: 1000, currency: "usd", compareAtAmount: "1500" })
  ).toEqual({ amount: 1000, currency: "USD", compareAtAmount: 1500 });

  expect(
    normalizeCommerceMoney({ amount: 1000, currency: "USD", compareAtAmount: "" })
  ).toEqual({ amount: 1000, currency: "USD", compareAtAmount: null });
});

test("normalizeCommerceStock validates quantity", () => {
  expect(normalizeCommerceStock({ state: "in_stock", quantity: 10 })).toEqual({
    state: "in_stock",
    quantity: 10,
  });

  expect(() => normalizeCommerceStock({ state: "in_stock", quantity: -1 })).toThrow(
    "commerce_stock_quantity_invalid"
  );
});

test("normalizeCommerceSlug slugifies simple labels", () => {
  expect(normalizeCommerceSlug("  Starter Product  ")).toBe("starter-product");
  expect(() => normalizeCommerceSlug("***")).toThrow("commerce_slug_invalid");
});
