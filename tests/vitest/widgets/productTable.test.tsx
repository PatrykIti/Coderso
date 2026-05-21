import React from "react";
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import {
  ProductTableAdvancedEditor,
  ProductTableVisualEditor,
  ProductTableWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ProductTableEditors";
import {
  ProductTableBlock,
  createProductTableWidget,
  normalizeProductTableData,
  normalizeProductTableFields,
  normalizeProductTableLabels,
  productTableDefaults,
  resolveVisibleProductTableColumns,
  type ProductTableData,
} from "../../../core/widgets/core/productTable";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";

const StubEditor: ComponentType<WidgetEditorProps<ProductTableData>> = () => null;

test("product table renders empty state", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("No products available");
  expect(html).toContain('data-widget="product-table"');
});

test("product table renders rows with shared column labels and visibility", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        fields: {
          showTitle: false,
          showSlug: true,
          showPrice: false,
          showStatus: false,
          showStock: true,
          showStockQuantity: true,
          showCompareAt: true,
          showCollectionCount: true,
        },
        labels: {
          title: "Catalog item",
          slug: "Handle",
          price: "Current price",
          compareAt: "Was price",
          status: "Availability",
          stock: "Inventory",
          collections: "Collections total",
        },
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
                compareAtAmount: 130000,
              },
              stock: {
                state: "in_stock",
                quantity: 3,
                inStock: true,
              },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: ["collection-1", "collection-2"],
            },
          ],
          total: 1,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Handle");
  expect(html).toContain("Was price");
  expect(html).toContain("Inventory");
  expect(html).toContain("Collections total");
  expect(html).toContain("starter-home");
  expect(html).toContain("$1,300.00");
  expect(html).toContain("In stock (3)");
  expect(html).not.toContain("Catalog item");
  expect(html).not.toContain("Current price");
  expect(html).not.toContain("Starter Home");
  expect(html).not.toContain("$1,200.00");
  expect(html).not.toContain("Availability");
});

test("product table renders status badges and bounded row-state treatment", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        fields: {
          showTitle: true,
          showSlug: false,
          showPrice: true,
          showStatus: true,
          showStock: false,
          showCompareAt: false,
          showCollectionCount: false,
        },
        resolved: {
          items: [
            {
              id: "product-published",
              title: "Published Home",
              slug: "published-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 5, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
            },
            {
              id: "product-draft",
              title: "Draft Home",
              slug: "draft-home",
              excerpt: null,
              status: "draft",
              pricing: { amount: 130000, currency: "USD", compareAtAmount: null },
              stock: { state: "backorder", quantity: 2, inStock: false },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
            },
            {
              id: "product-archived",
              title: "Archived Home",
              slug: "archived-home",
              excerpt: null,
              status: "archived",
              pricing: { amount: 140000, currency: "USD", compareAtAmount: null },
              stock: { state: "out_of_stock", quantity: 0, inStock: false },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
            },
          ],
          total: 3,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain('data-product-status="published"');
  expect(html).toContain('data-product-status="draft"');
  expect(html).toContain('data-product-status="archived"');
  expect(html).toContain("Published");
  expect(html).toContain("Draft");
  expect(html).toContain("Archived");
  expect(html).toContain("border-emerald-200");
  expect(html).toContain("border-amber-200");
  expect(html).toContain("border-slate-200");
  expect(html).toContain("bg-amber-50/35");
  expect(html).toContain("bg-slate-100/70");
  expect(html).not.toContain("Draft Home (draft)");
  expect(html).not.toContain("Archived Home (archived)");
});

test("product table keeps title status suffix when the status column is hidden", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        fields: {
          showTitle: true,
          showSlug: false,
          showPrice: true,
          showStatus: false,
          showStock: false,
          showCompareAt: false,
          showCollectionCount: false,
        },
        resolved: {
          items: [
            {
              id: "product-archived",
              title: "Archived Home",
              slug: "archived-home",
              excerpt: null,
              status: "archived",
              pricing: { amount: 140000, currency: "USD", compareAtAmount: null },
              stock: { state: "out_of_stock", quantity: 0, inStock: false },
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

  expect(html).toContain("Archived Home (archived)");
  expect(html).not.toContain("Published</span>");
});

test("product table keeps legacy title and price visibility guardrails", () => {
  const guardedFields = normalizeProductTableFields({
    showTitle: false,
    showSlug: false,
    showPrice: false,
    showCompareAt: false,
    showStatus: true,
    showStock: true,
    showCollectionCount: false,
  });

  expect(guardedFields).toMatchObject({
    showTitle: true,
    showSlug: false,
    showPrice: true,
    showCompareAt: false,
  });
  expect(resolveVisibleProductTableColumns(guardedFields).map((column) => column.key)).toEqual([
    "title",
    "price",
    "status",
    "stock",
  ]);
});

test("product table normalizes source, labels, and guarded fields", () => {
  const normalized = normalizeProductTableData({
    source: {
      limit: 999,
      search: "  homes  ",
    },
    fields: {
      showTitle: false,
      showSlug: false,
      showPrice: false,
      showCompareAt: false,
    },
    labels: {
      title: " ",
      slug: " ",
      compareAt: "  MSRP  ",
      stock: " ",
      collections: " ",
    },
  });

  expect(normalized.source?.limit).toBe(48);
  expect(normalized.source?.search).toBe("homes");
  expect(normalized.fields).toMatchObject({
    showTitle: true,
    showSlug: false,
    showPrice: true,
    showCompareAt: false,
  });
  expect(normalized.labels).toMatchObject({
    title: "Product",
    slug: "Slug",
    compareAt: "MSRP",
    stock: "Stock",
    collections: "Collections",
  });
  expect(normalizeProductTableLabels({ price: " " }).price).toBe("Price");
});

test("product table validator accepts resolved payload with title and price visibility flags", () => {
  clearWidgets();
  registerWidget(
    createProductTableWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "product-table-1",
      type: "product-table",
      variant: "default",
      data: {
        ...productTableDefaults,
        fields: {
          showTitle: false,
          showSlug: true,
          showPrice: false,
          showStatus: true,
          showStock: true,
          showStockQuantity: true,
          showCompareAt: true,
          showCollectionCount: false,
        },
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

test("product table cleared surfaces omit empty, table, and header backgrounds", () => {
  const emptyHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        style: {},
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  const tableHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        style: {},
        fields: {
          showTitle: true,
          showSlug: true,
          showPrice: true,
          showStatus: true,
          showStock: true,
          showCompareAt: true,
          showCollectionCount: true,
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

  expect(emptyHtml).not.toContain("bg-[var(--color-bg)]/70");
  expect(emptyHtml).not.toContain("background-color:transparent");
  expect(tableHtml).not.toContain("bg-[var(--color-bg)]");
  expect(tableHtml).not.toContain("background-color:transparent");
});

test("product table renderer surfaces preview warnings and widget preview support", () => {
  const loadingHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData(productTableDefaults)}
      renderContext={{
        mode: "editor-preview",
        previewState: { status: "loading" },
      }}
    />
  );
  const errorHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData(productTableDefaults)}
      renderContext={{
        mode: "editor-preview",
        previewState: { status: "error", message: "Preview timed out" },
      }}
    />
  );
  const widget = createProductTableWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  expect(loadingHtml).toContain("Refreshing Product Table preview");
  expect(errorHtml).toContain("Product Table preview warning:");
  expect(errorHtml).toContain("Preview timed out");
  expect(widget.editorCapabilities?.supportsPreviewState).toBe(true);
});

test("product table editors render expected panels and registry-backed controls", () => {
  const wizard = renderToString(
    <ProductTableWizardEditor
      value={productTableDefaults}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );
  expect(wizard).toContain("Table source");

  const visual = renderToString(
    <ProductTableVisualEditor
      value={productTableDefaults}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );
  expect(visual).toContain("Columns");
  expect(visual).toContain("Show product");
  expect(visual).toContain("Show price");
  expect(visual).toContain("Show compare-at price");
  expect(visual).toContain("Show stock quantity");
  expect(visual).toContain("Stock presentation");
  expect(visual).toContain("Slug");
  expect(visual).toContain("Compare at");
  expect(visual).toContain("Collections");
  expect(visual).toContain("Column labels");

  const advanced = renderToString(
    <ProductTableAdvancedEditor
      value={productTableDefaults}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );
  expect(advanced).toContain("Runtime payload");
  expect(advanced).toContain("Query preview");
});
