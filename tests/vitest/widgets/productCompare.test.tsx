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

test("product compare renders matrix rows", () => {
  const html = renderToString(
    <ProductCompareBlock
      variant="matrix"
      data={normalizeProductCompareData({
        ...productCompareDefaults,
        resolved: {
          rows: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
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
              priceAmount: 98000,
              currency: "USD",
              compareAtAmount: null,
              stockState: "backorder",
              stockQuantity: 1,
            },
          ],
          total: 2,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Attribute");
  expect(html).toContain("Starter Home");
  expect(html).toContain("Urban Loft");
  expect(html).toContain("$120,000.00");
  expect(html).toContain("Backorder");
});

test("product compare normalizes invalid source", () => {
  const normalized = normalizeProductCompareData({
    source: {
      limit: -1,
      status: ["published", "invalid" as never],
    },
  });

  expect(normalized.source?.limit).toBe(1);
  expect(normalized.source?.status).toEqual(["published"]);
});

test("product compare validator accepts resolved rows", () => {
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
      variant: "matrix",
      data: {
        ...productCompareDefaults,
        resolved: {
          rows: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              priceAmount: 120000,
              currency: "USD",
              compareAtAmount: null,
              stockState: "in_stock",
              stockQuantity: 3,
            },
          ],
          total: 1,
          resolvedAt: "2026-02-19T12:00:00.000Z",
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

  const visual = renderToString(
    <ProductCompareVisualEditor
      value={productCompareDefaults}
      onChange={() => undefined}
      variant="matrix"
      onVariantChange={() => undefined}
    />
  );
  expect(visual).toContain("Attribute rows");
  expect(visual).toContain("Labels");

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
