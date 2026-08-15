import { describe, expect, test } from "vitest";

import type { CommerceVariant } from "../../../core/admin/services/commerceClient";
import {
  addVariant,
  createEmptyVariant,
  parseIntegerOrNull,
  removeVariantAt,
  removeVariantAttribute,
  renameVariantAttributeKey,
  serializeDraftVariants,
  setDefaultVariantAt,
  setVariantAttribute,
  toCommerceProductInput,
  updateVariantAt,
  type CommerceProductDraft,
} from "../../../core/admin/ui/commerce/commerceEditorModel";

const makeVariant = (overrides: Partial<CommerceVariant> = {}): CommerceVariant => ({
  sku: null,
  title: "Base",
  pricing: { amount: 1000, currency: "usd", compareAtAmount: null },
  stock: { state: "in_stock", quantity: 5 },
  attributes: {},
  isDefault: false,
  ...overrides,
});

describe("createEmptyVariant", () => {
  test("defaults with currency fallback to USD", () => {
    const variant = createEmptyVariant("");
    expect(variant).toEqual({
      sku: null,
      title: "",
      pricing: { amount: 0, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: null },
      attributes: {},
      isDefault: false,
    });
  });

  test("uses the provided currency", () => {
    expect(createEmptyVariant("PLN").pricing.currency).toBe("PLN");
  });
});

describe("addVariant / updateVariantAt / removeVariantAt", () => {
  test("addVariant appends an empty variant without mutating the source", () => {
    const source = [makeVariant()];
    const next = addVariant(source, "USD");
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual(createEmptyVariant("USD"));
    expect(source).toHaveLength(1);
  });

  test("updateVariantAt patches only the target index immutably", () => {
    const source = [makeVariant({ title: "A" }), makeVariant({ title: "B" })];
    const next = updateVariantAt(source, 1, { title: "B2" });
    expect(next[1].title).toBe("B2");
    expect(next[0].title).toBe("A");
    expect(source[1].title).toBe("B");
    expect(next).not.toBe(source);
  });

  test("removeVariantAt drops only the target index immutably", () => {
    const source = [makeVariant({ title: "A" }), makeVariant({ title: "B" })];
    const next = removeVariantAt(source, 0);
    expect(next.map((variant) => variant.title)).toEqual(["B"]);
    expect(source).toHaveLength(2);
  });
});

describe("setDefaultVariantAt", () => {
  test("setting one default clears every other variant", () => {
    const source = [
      makeVariant({ isDefault: true }),
      makeVariant({ isDefault: false }),
      makeVariant({ isDefault: false }),
    ];
    const next = setDefaultVariantAt(source, 1);
    expect(next.map((variant) => variant.isDefault)).toEqual([false, true, false]);
    // immutability
    expect(source[0].isDefault).toBe(true);
  });
});

describe("attribute helpers", () => {
  test("setVariantAttribute adds and overwrites a key", () => {
    const source = [makeVariant({ attributes: { size: "S" } })];
    const added = setVariantAttribute(source, 0, "color", "oak");
    expect(added[0].attributes).toEqual({ size: "S", color: "oak" });
    const overwritten = setVariantAttribute(source, 0, "size", "L");
    expect(overwritten[0].attributes).toEqual({ size: "L" });
    expect(source[0].attributes).toEqual({ size: "S" });
  });

  test("removeVariantAttribute deletes only the named key", () => {
    const source = [makeVariant({ attributes: { size: "S", color: "oak" } })];
    const next = removeVariantAttribute(source, 0, "size");
    expect(next[0].attributes).toEqual({ color: "oak" });
    expect(source[0].attributes).toEqual({ size: "S", color: "oak" });
  });

  test("renameVariantAttributeKey moves a value to a new key immutably", () => {
    const source = [makeVariant({ attributes: { size: "S", color: "oak" } })];
    const next = renameVariantAttributeKey(source, 0, "size", "measure");
    expect(next[0].attributes).toEqual({ measure: "S", color: "oak" });
    expect(source[0].attributes).toEqual({ size: "S", color: "oak" });
  });

  test("renameVariantAttributeKey is a no-op for missing or identical keys", () => {
    const source = [makeVariant({ attributes: { size: "S" } })];
    expect(renameVariantAttributeKey(source, 0, "missing", "next")).toBe(source);
    expect(renameVariantAttributeKey(source, 0, "size", "size")).toBe(source);
  });
});

describe("serializeDraftVariants", () => {
  test("trims title/sku and uppercases currency", () => {
    const variants = [
      makeVariant({
        id: "variant-1",
        title: "  Large  ",
        sku: "  OAK-L  ",
        pricing: { amount: 1000, currency: "pln", compareAtAmount: null },
      }),
    ];
    const serialized = serializeDraftVariants(variants);
    expect(serialized).toEqual([
      expect.objectContaining({
        id: "variant-1",
        title: "Large",
        sku: "OAK-L",
        pricing: { amount: 1000, currency: "PLN", compareAtAmount: null },
      }),
    ]);
  });

  test("drops blank-title rows (server requires non-empty title)", () => {
    const variants = [
      makeVariant({ title: "Kept", sku: null }),
      makeVariant({ title: "   ", sku: "orphan" }),
      makeVariant({ title: "", sku: null }),
    ];
    const serialized = serializeDraftVariants(variants);
    expect(serialized).toHaveLength(1);
    expect(serialized[0].title).toBe("Kept");
  });

  test("drops blank attribute keys and values and trims survivors", () => {
    const variants = [
      makeVariant({
        attributes: { " size ": " L ", "": "blank-key", blank: "   ", valid: "oak" },
      }),
    ];
    const serialized = serializeDraftVariants(variants);
    expect(serialized[0].attributes).toEqual({ size: "L", valid: "oak" });
  });

  test("normalizes blank sku to null and keeps isDefault boolean", () => {
    const variants = [makeVariant({ sku: "   ", isDefault: 1 as unknown as boolean })];
    const serialized = serializeDraftVariants(variants);
    expect(serialized[0].sku).toBeNull();
    expect(serialized[0].isDefault).toBe(true);
  });

  test("omits the id property when the variant has none", () => {
    const serialized = serializeDraftVariants([makeVariant()]);
    expect("id" in serialized[0]).toBe(false);
  });
});

describe("toCommerceProductInput variant wiring", () => {
  const draft = (variants: CommerceVariant[]): CommerceProductDraft => ({
    title: "  Oak Desk  ",
    slug: "  oak-desk  ",
    status: "draft",
    excerpt: "  ",
    description: "",
    pricingAmount: "450000",
    pricingCurrency: " usd ",
    pricingCompareAtAmount: "",
    stockState: "in_stock",
    stockQuantity: "10",
    mediaIdsText: "media-1, media-1, media-2",
    collectionIds: [],
    variants,
    metadata: {},
    data: {},
  });

  test("serializes variants through serializeDraftVariants", () => {
    const input = toCommerceProductInput(
      draft([
        makeVariant({
          title: " Large ",
          sku: "OAK-L",
          pricing: { amount: 1000, currency: "usd", compareAtAmount: null },
        }),
        makeVariant({ title: "   " }),
      ])
    );
    expect(input.variants).toHaveLength(1);
    expect(input.variants?.[0]).toEqual(expect.objectContaining({ title: "Large", sku: "OAK-L" }));
  });
});

describe("parseIntegerOrNull", () => {
  test("returns null for empty/blank/invalid input", () => {
    expect(parseIntegerOrNull("")).toBeNull();
    expect(parseIntegerOrNull(null)).toBeNull();
    expect(parseIntegerOrNull(undefined)).toBeNull();
    expect(parseIntegerOrNull("   ")).toBeNull();
    expect(parseIntegerOrNull("abc")).toBeNull();
    expect(parseIntegerOrNull("12.7")).toBe(12);
  });

  test("floors numeric strings and rejects negatives", () => {
    expect(parseIntegerOrNull("450000")).toBe(450000);
    expect(parseIntegerOrNull("450.9")).toBe(450);
    expect(parseIntegerOrNull("-5")).toBeNull();
    expect(parseIntegerOrNull(7)).toBe(7);
  });
});
