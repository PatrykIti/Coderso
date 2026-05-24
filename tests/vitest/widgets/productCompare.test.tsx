import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  ProductCompareAdvancedEditor,
  ProductCompareVisualEditor,
  ProductCompareWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ProductCompareEditors";
import {
  buildProductCompareQueryInput,
  ProductCompareBlock,
  createProductCompareWidget,
  normalizeProductCompareData,
  productCompareDefaults,
  type ProductCompareData,
} from "../../../core/widgets/core/productCompare";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";

const StubEditor: ComponentType<WidgetEditorProps<ProductCompareData>> = () => null;

const resolvedRows: NonNullable<ProductCompareData["resolved"]>["rows"] = [
  {
    id: "product-1",
    title: "Starter Home",
    slug: "starter-home",
    excerpt: "Compact modern home.",
    productHref: "/products/starter-home",
    imageUrl: "/media/starter-home.jpg",
    imageAlt: "Starter Home hero",
    priceAmount: 120000,
    currency: "USD",
    compareAtAmount: 130000,
    stockState: "in_stock",
    stockQuantity: 3,
  },
  {
    id: "product-2",
    title: "Urban Loft",
    slug: "urban-loft",
    excerpt: null,
    productHref: "/products/urban-loft",
    imageUrl: null,
    imageAlt: "Urban Loft",
    priceAmount: 98000,
    currency: "USD",
    compareAtAmount: null,
    stockState: "backorder",
    stockQuantity: 145,
  },
];

test("product compare renders empty state", () => {
  const html = renderToString(
    <ProductCompareBlock
      variant="matrix"
      data={normalizeProductCompareData({
        ...productCompareDefaults,
        resolved: {
          rows: [],
          total: 0,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("No products to compare");
  expect(html).toContain('data-widget="product-compare"');
});

test("product compare renders accessible matrix rows, section copy, and safe links", () => {
  const html = renderToString(
    <ProductCompareBlock
      blockId="product-compare-1"
      variant="matrix"
      data={normalizeProductCompareData({
        ...productCompareDefaults,
        section: {
          title: "Compare our homes",
          description: "Quick side-by-side overview.",
          caption: "Home comparison table",
          hideCaption: false,
        },
        header: {
          showImages: true,
          linkTitles: true,
          ctaMode: "view_product",
          ctaLabel: "View product",
        },
        layout: {
          featuredProductId: "product-2",
          stickyHeader: true,
        },
        rows: [
          { key: "price", visible: true },
          { key: "compareAt", visible: true },
          { key: "stock", visible: true },
          { key: "quantity", visible: true },
          { key: "slug", visible: true },
          { key: "excerpt", visible: true },
        ],
        format: {
          moneyLocale: "de-DE",
          quantityDisplay: "compact",
          quantityCompactLimit: 99,
        },
        resolved: {
          rows: resolvedRows,
          total: 2,
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Compare our homes");
  expect(html).toContain("Home comparison table");
  expect(html).toContain("<caption");
  expect(html).toContain('scope="col"');
  expect(html).toContain('tabindex="0"');
  expect(html).toContain('data-overflow-intentional="true"');
  expect(html).toContain('data-overflow-affordance="horizontal-scroll"');
  expect(html).toContain("Scroll horizontally to compare all products.");
  expect(html).toContain('href="/products/starter-home"');
  expect(html).toContain('src="/media/starter-home.jpg"');
  expect(html).toContain("Featured");
  expect(html).toContain("99+");
  expect(html).toContain("Compact modern home.");
  expect(html).toContain("sticky left-0 top-0 z-20");
});

test("product compare renders cards variant with CTA and excerpt", () => {
  const html = renderToString(
    <ProductCompareBlock
      variant="cards"
      data={normalizeProductCompareData({
        ...productCompareDefaults,
        header: {
          showImages: true,
          linkTitles: true,
          ctaMode: "view_product",
          ctaLabel: "Learn more",
        },
        rows: [
          { key: "price", visible: true },
          { key: "excerpt", visible: true },
        ],
        resolved: {
          rows: resolvedRows,
          total: 2,
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Learn more");
  expect(html).toContain("Compact modern home.");
  expect(html).toContain("Urban Loft");
});

test("product compare drops external product hrefs from resolved payload", () => {
  const html = renderToString(
    <ProductCompareBlock
      variant="matrix"
      data={normalizeProductCompareData({
        ...productCompareDefaults,
        header: {
          showImages: false,
          linkTitles: true,
          ctaMode: "view_product",
          ctaLabel: "View product",
        },
        resolved: {
          rows: [
            {
              ...resolvedRows[0],
              productHref: "https://evil.example/product",
            },
          ],
          total: 1,
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).not.toContain('href="https://evil.example/product"');
  expect(html).toContain("Starter Home");
});

test("product compare normalizes invalid source and row configuration", () => {
  const normalized = normalizeProductCompareData({
    source: {
      limit: 20,
      productIds: ["product-2", " ", "product-1", "product-2"],
      search: " suite ",
      status: ["published", "invalid" as never],
    },
    rows: [
      { key: "price", visible: false },
      { key: "price", visible: true },
      { key: "excerpt", visible: true },
      { key: "invalid" as never, visible: true },
    ],
    format: {
      moneyLocale: "invalid" as never,
      quantityDisplay: "invalid" as never,
      quantityCompactLimit: 5000,
    },
  });

  expect(normalized.source?.limit).toBe(12);
  expect(normalized.source?.productIds).toEqual(["product-2", "product-1"]);
  expect(normalized.source?.status).toEqual(["published"]);
  expect(normalized.rows?.find((row) => row.key === "price")?.visible).toBe(false);
  expect(normalized.rows?.find((row) => row.key === "excerpt")?.visible).toBe(true);
  expect(normalized.format?.moneyLocale).toBe("en-US");
  expect(normalized.format?.quantityDisplay).toBe("exact");
  expect(normalized.format?.quantityCompactLimit).toBe(999);
});

test("product compare query input strips conflicting filters for exact selected sets", () => {
  const query = buildProductCompareQueryInput({
    ...productCompareDefaults,
    source: {
      ...productCompareDefaults.source,
      limit: 8,
      search: "starter",
      collectionIds: ["collection-1"],
      status: ["published"],
      productIds: ["product-3", "product-1", "product-3"],
    },
  });

  expect(query.pagination).toEqual({ limit: 2, offset: 0 });
  expect(query).toMatchObject({
    productIds: ["product-3", "product-1"],
  });
  expect("search" in query).toBe(false);
  expect("collectionIds" in query).toBe(false);
  expect("status" in query).toBe(false);
});

test("product compare validator accepts cards variant and decorated resolved rows", () => {
  clearWidgets();
  registerWidget(
    createProductCompareWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "product-compare-1",
      type: "product-compare",
      variant: "cards",
      data: {
        ...productCompareDefaults,
        source: {
          ...productCompareDefaults.source,
          productIds: ["product-1", "product-2"],
        },
        section: {
          title: "Compare our homes",
          caption: "Home comparison table",
        },
        header: {
          showImages: true,
          linkTitles: true,
          ctaMode: "view_product",
        },
        resolved: {
          rows: resolvedRows,
          total: 2,
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      },
    })
  ).not.toThrow();
});

test("product compare editors render expected panels", () => {
  const wizard = renderToString(
    <ProductCompareWizardEditor
      value={productCompareDefaults}
      onChange={() => undefined}
      variant="matrix"
      onVariantChange={() => undefined}
    />
  );
  expect(wizard).toContain("Comparison source");
  expect(wizard).toContain("Specific product curation is available in Visual");
  expect(wizard).toContain("Limit guidance");

  const visual = renderToString(
    <ProductCompareVisualEditor
      value={productCompareDefaults}
      onChange={() => undefined}
      variant="matrix"
      onVariantChange={() => undefined}
    />
  );
  expect(visual).toContain("Section copy");
  expect(visual).toContain("Attribute rows");
  expect(visual).toContain("Product columns");

  const advanced = renderToString(
    <ProductCompareAdvancedEditor
      value={productCompareDefaults}
      onChange={() => undefined}
      variant="matrix"
      onVariantChange={() => undefined}
    />
  );
  expect(advanced).toContain("Runtime payload");
  expect(advanced).toContain("Query preview");
});
