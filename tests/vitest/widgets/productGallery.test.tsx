import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  ProductGalleryAdvancedEditor,
  ProductGalleryVisualEditor,
  ProductGalleryWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ProductGalleryEditors";
import {
  ProductGalleryBlock,
  createProductGalleryWidget,
  normalizeProductGalleryData,
  productGalleryDefaults,
  type ProductGalleryData,
} from "../../../core/widgets/core/productGallery";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";

const StubEditor: ComponentType<WidgetEditorProps<ProductGalleryData>> = () => null;

test("product gallery renders empty state", () => {
  const html = renderToString(
    <ProductGalleryBlock
      variant="cards"
      data={normalizeProductGalleryData({
        ...productGalleryDefaults,
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("No products found");
  expect(html).toContain('data-widget="product-gallery"');
  expect(html).toContain('data-product-gallery-count="0"');
});

test("product gallery renders resolved cards", () => {
  const html = renderToString(
    <ProductGalleryBlock
      variant="cards"
      data={normalizeProductGalleryData({
        ...productGalleryDefaults,
        resolved: {
          items: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: "Compact modern plan.",
              status: "published",
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
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
            },
          ],
          total: 1,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Starter Home");
  expect(html).toContain("$120,000.00");
  expect(html).toContain("In stock");
  expect(html).toContain('data-product-gallery-count="1"');
});

test("product gallery cleared card and empty surfaces omit backgrounds", () => {
  const emptyHtml = renderToString(
    <ProductGalleryBlock
      variant="cards"
      data={normalizeProductGalleryData({
        ...productGalleryDefaults,
        style: {
          columns: "3",
          cardStyle: "outlined",
        },
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );
  expect(emptyHtml).not.toContain("bg-[var(--color-bg)]/70");

  const cardHtml = renderToString(
    <ProductGalleryBlock
      variant="cards"
      data={normalizeProductGalleryData({
        ...productGalleryDefaults,
        style: {
          columns: "3",
          cardStyle: "outlined",
        },
        resolved: {
          items: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 3, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
            },
          ],
          total: 1,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );
  expect(cardHtml).not.toContain("bg-[var(--color-bg)]");
});

test("product gallery normalizes source defaults", () => {
  const normalized = normalizeProductGalleryData({
    source: {
      limit: 999,
      sortField: "pricing.amount",
      sortDir: "asc",
      status: ["published"],
    },
  });

  expect(normalized.source?.limit).toBe(48);
  expect(normalized.source?.sortField).toBe("pricing.amount");
  expect(normalized.source?.sortDir).toBe("asc");
  expect(normalized.source?.status).toEqual(["published"]);
});

test("product gallery validator accepts resolved payload", () => {
  clearWidgets();
  registerWidget(
    createProductGalleryWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "product-gallery-1",
      type: "product-gallery",
      variant: "cards",
      data: {
        ...productGalleryDefaults,
        resolved: {
          items: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: null,
              status: "published",
              pricing: {
                amount: 120000,
                currency: "USD",
                compareAtAmount: null,
              },
              stock: {
                state: "in_stock",
                quantity: 3,
                inStock: true,
              },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
            },
          ],
          total: 1,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      },
    })
  ).not.toThrow();
});

test("product gallery editors render expected panels", () => {
  const wizard = renderToString(
    <ProductGalleryWizardEditor
      value={productGalleryDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(wizard).toContain("Product source");
  expect(wizard).toContain("Layout");

  const visual = renderToString(
    <ProductGalleryVisualEditor
      value={productGalleryDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(visual).toContain("Card content");
  expect(visual).toContain("Empty state");

  const advanced = renderToString(
    <ProductGalleryAdvancedEditor
      value={productGalleryDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(advanced).toContain("Runtime payload");
  expect(advanced).toContain("Query preview");
});
