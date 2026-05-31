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
  buildProductTableCsvContent,
  createProductTableWidget,
  formatProductTableMoney,
  normalizeProductTableData,
  normalizeProductTableFields,
  normalizeProductTableLabels,
  productTableEditorContract,
  productTableDefaults,
  resolveVisibleProductTableColumns,
  type ProductTableData,
} from "../../../core/widgets/core/productTable";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";

const StubEditor: ComponentType<WidgetEditorProps<ProductTableData>> = () => null;

test("product table exposes a strict v2 editor contract", () => {
  const widget = createProductTableWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });

  expect(widget.editorContract).toBe(productTableEditorContract);
  expect(validation.valid).toBe(true);
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual([
    "product-table.wizard.table-source",
    "product-table.wizard.preview-summary",
    "product-table.visual.preview-summary",
    "product-table.visual.layout-style",
    "product-table.visual.section-header",
    "product-table.visual.columns",
    "product-table.visual.column-labels",
    "product-table.visual.public-controls",
    "product-table.visual.export-format",
    "product-table.visual.links-actions",
    "product-table.visual.empty-state",
    "product-table.visual.surfaces",
    "product-table.advanced.runtime-status",
    "product-table.advanced.query-summary",
  ]);
  expect(
    widget.editorContract?.sections
      .filter((section) => section.mode === "wizard")
      .flatMap((section) => section.writablePaths)
      .some((path) => path.startsWith("style."))
  ).toBe(false);
  expect(
    widget.editorContract?.sections
      .filter((section) => section.mode === "advanced")
      .every((section) => section.writablePaths.length === 0 && section.role !== "technical")
  ).toBe(true);
});

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

test("product table renders accessible caption, labels, and scoped headers", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        fields: {
          showTitle: true,
          showSlug: true,
          showPrice: true,
          showStatus: true,
          showStock: true,
          showStockQuantity: false,
          showCompareAt: true,
          showCollectionCount: true,
        },
        links: {
          linkedColumn: "title",
          showAction: true,
          actionLabel: "View",
          openInNewTab: false,
        },
        resolved: {
          items: [
            {
              id: "product-accessible",
              title: "Accessible Home",
              slug: "accessible-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 120000, currency: "USD", compareAtAmount: 130000 },
              stock: { state: "in_stock", quantity: 3, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: ["collection-1"],
              productHref: "/products/accessible-home",
            },
          ],
          total: 1,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toMatch(/<section[^>]*aria-label="Product table"/);
  expect(html).toMatch(/<div[^>]*tabindex="0"[^>]*aria-label="Product table"/);
  expect(html).toContain('data-overflow-intentional="true"');
  expect(html).toContain('data-overflow-affordance="horizontal-scroll"');
  expect(html).toContain("Scroll horizontally to view all product columns.");
  expect(html).toMatch(/<table[^>]*aria-labelledby="[^"]+"/);
  expect(html).toMatch(/<caption id="[^"]+" class="sr-only">Product table<\/caption>/);
  expect(html.match(/scope="col"/g)?.length).toBe(8);
});

test("product table renders section header, media and excerpt columns, and safe thumbnail fallbacks", () => {
  const longExcerpt =
    "This introductory product summary is intentionally long enough to verify that the Product Table clamps plain-text excerpts without leaking raw layout overflow into the table cell output for dense catalogs.";
  const clampedExcerpt = `${longExcerpt.slice(0, 157).trimEnd()}...`;
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        header: {
          eyebrow: "Featured catalog",
          title: "Summer release",
          description: "Curated product context above the table.",
        },
        fields: {
          showImage: true,
          showTitle: true,
          showExcerpt: true,
          showSlug: false,
          showPrice: true,
          showStatus: true,
          showStock: false,
          showCompareAt: false,
          showCollectionCount: false,
        },
        labels: {
          image: "Thumbnail",
          excerpt: "Summary",
        },
        resolved: {
          items: [
            {
              id: "product-media",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: longExcerpt,
              status: "published",
              pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 3, inStock: true },
              primaryMediaId: "media-1",
              mediaIds: ["media-1"],
              collectionIds: [],
              productHref: "/products/starter-home",
              media: {
                url: "/media/starter-home.jpg",
                alt: "Starter Home hero",
                width: 1200,
                height: 900,
              },
            },
            {
              id: "product-no-media",
              title: "Loft Home",
              slug: "loft-home",
              excerpt: null,
              status: "draft",
              pricing: { amount: 95000, currency: "USD", compareAtAmount: null },
              stock: { state: "backorder", quantity: 1, inStock: false },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
              productHref: null,
            },
          ],
          total: 2,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Featured catalog");
  expect(html).toContain("Summer release");
  expect(html).toContain("Curated product context above the table.");
  expect(html).toContain("Thumbnail");
  expect(html).toContain("Summary");
  expect(html).toContain(clampedExcerpt);
  expect(html).toContain('aria-label="Summer release"');
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('decoding="async"');
  expect(html).toContain('src="/media/starter-home.jpg"');
  expect(html).toContain('alt="Starter Home hero"');
  expect(html).toContain("No image");
  expect(html).not.toContain('src="undefined"');
  expect(html).not.toContain('src=""');
});

test("product table resolves compact variant presets and bounded layout style overrides", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="compact"
      data={normalizeProductTableData({
        ...productTableDefaults,
        header: {
          title: "Catalog matrix",
        },
        fields: {
          showImage: false,
          showTitle: true,
          showExcerpt: false,
          showSlug: true,
          showPrice: true,
          showStatus: false,
          showStock: false,
          showCompareAt: false,
          showCollectionCount: false,
        },
        links: {
          linkedColumn: "title",
          showAction: true,
          actionLabel: "View",
          openInNewTab: false,
        },
        style: {
          rowTreatment: "striped",
          hoverRows: true,
          stickyHeader: true,
          maxWidth: "wide",
          align: "center",
          typography: "prominent",
        },
        resolved: {
          items: [
            {
              id: "product-compact-1",
              title: "Atlas Home",
              slug: "atlas-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 3, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
              productHref: "/products/atlas-home",
            },
            {
              id: "product-compact-2",
              title: "Beacon Home",
              slug: "beacon-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 130000, currency: "USD", compareAtAmount: null },
              stock: { state: "backorder", quantity: 2, inStock: false },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
              productHref: "/products/beacon-home",
            },
          ],
          total: 2,
          resolvedAt: "2026-05-22T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain('data-product-table-variant="compact"');
  expect(html).toContain('data-product-table-density="compact"');
  expect(html).toContain('data-product-table-row-treatment="striped"');
  expect(html).toContain('data-product-table-typography="prominent"');
  expect(html).toContain('data-product-table-max-width="wide"');
  expect(html).toContain('data-product-table-align="center"');
  expect(html).toContain('data-product-table-hover="true"');
  expect(html).toContain('data-product-table-sticky="true"');
  expect(html).toContain("sticky top-0 z-10");
  expect(html).toContain("bg-slate-50/40");
  expect(html).toContain("mx-auto");
  expect(html).toContain("max-w-7xl");
  expect(html).toContain("text-3xl");
  expect(html).toContain("hover:bg-slate-50/60");
});

test("product table renders public controls, sortable headers, and paged navigation", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      blockId="catalog-1"
      data={normalizeProductTableData({
        ...productTableDefaults,
        controls: {
          showSearchInput: true,
          showCollectionFilter: true,
          showStatusFilter: true,
          sorting: "interactive",
          pagination: "paged",
          pageSize: 2,
        },
        resolved: {
          items: [
            {
              id: "product-3",
              title: "Gamma Home",
              slug: "gamma-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 3, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: ["collection-1"],
              productHref: null,
            },
            {
              id: "product-4",
              title: "Omega Home",
              slug: "omega-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 130000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 2, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: ["collection-1"],
              productHref: null,
            },
          ],
          total: 5,
          resolvedAt: "2026-05-22T12:00:00.000Z",
          runtime: {
            searchQuery: "starter",
            status: [],
            collectionIds: ["collection-1"],
            availableStatuses: ["published"],
            availableCollections: [
              { id: "collection-1", label: "Summer", slug: "summer" },
              { id: "collection-2", label: "Urban", slug: "urban" },
            ],
            sortField: "title",
            sortDir: "asc",
            page: 2,
            pageSize: 2,
            totalPages: 3,
            previousPageHref:
              "?foo=bar&pt.catalog-1.q=starter&pt.catalog-1.collection=collection-1&pt.catalog-1.sort=title&pt.catalog-1.dir=asc",
            nextPageHref:
              "?foo=bar&pt.catalog-1.q=starter&pt.catalog-1.collection=collection-1&pt.catalog-1.sort=title&pt.catalog-1.dir=asc&pt.catalog-1.page=3",
            clearHref: "?foo=bar",
            retainedParams: [{ name: "foo", value: "bar" }],
            rejectedTokens: ["status"],
          },
        },
      })}
    />
  );

  expect(html).toContain('data-product-table-page="2"');
  expect(html).toContain("Showing 3-4 of 5 products");
  expect(html).toContain("Sort: <!-- -->Title ascending");
  expect(html).toContain('href="?foo=bar"');
  expect(html).toContain('name="foo" value="bar"');
  expect(html).toContain('name="pt.catalog-1.q"');
  expect(html).toContain('value="starter"');
  expect(html).toContain('name="pt.catalog-1.collection" checked="" value="collection-1"');
  expect(html).toContain("<!-- -->summer");
  expect(html).toContain("Ignored invalid table parameters.");
  expect(html).toContain('aria-sort="ascending"');
  expect(html).toContain('aria-label="Sort by Product descending"');
  expect(html).toContain("Page <!-- -->2<!-- --> of <!-- -->3");
  expect(html).toContain(
    'href="?foo=bar&amp;pt.catalog-1.q=starter&amp;pt.catalog-1.collection=collection-1&amp;pt.catalog-1.sort=title&amp;pt.catalog-1.dir=asc"'
  );
  expect(html).toContain(
    'href="?foo=bar&amp;pt.catalog-1.q=starter&amp;pt.catalog-1.collection=collection-1&amp;pt.catalog-1.sort=title&amp;pt.catalog-1.dir=asc&amp;pt.catalog-1.page=3"'
  );
});

test("product table renders indicator sorting and load-more pagination without interactive sort links", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      blockId="catalog-2"
      data={normalizeProductTableData({
        ...productTableDefaults,
        controls: {
          showSearchInput: false,
          showCollectionFilter: false,
          showStatusFilter: false,
          sorting: "indicator",
          pagination: "load-more",
          pageSize: 2,
        },
        resolved: {
          items: [
            {
              id: "product-5",
              title: "Atlas Home",
              slug: "atlas-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 140000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 4, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
              productHref: null,
            },
            {
              id: "product-6",
              title: "Harbor Home",
              slug: "harbor-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 150000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 1, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
              productHref: null,
            },
          ],
          total: 4,
          resolvedAt: "2026-05-22T12:00:00.000Z",
          runtime: {
            searchQuery: "",
            status: [],
            collectionIds: [],
            availableStatuses: ["published"],
            availableCollections: [],
            sortField: "title",
            sortDir: "asc",
            page: 1,
            pageSize: 2,
            totalPages: 2,
            nextPageHref:
              "?foo=bar&pt.catalog-2.sort=title&pt.catalog-2.dir=asc&pt.catalog-2.page=2",
            clearHref: "?foo=bar",
            retainedParams: [{ name: "foo", value: "bar" }],
            rejectedTokens: [],
          },
        },
      })}
    />
  );

  expect(html).toContain('data-product-table-page="1"');
  expect(html).toContain("Showing 2 of 4 products");
  expect(html).toContain("Sort: <!-- -->Title ascending");
  expect(html).toContain(
    'href="?foo=bar&amp;pt.catalog-2.sort=title&amp;pt.catalog-2.dir=asc&amp;pt.catalog-2.page=2"'
  );
  expect(html).toContain("Load more");
  expect(html).toContain(">Asc<");
  expect(html).toContain('aria-sort="ascending"');
  expect(html).not.toContain('aria-label="Sort by Product descending"');
  expect(html).not.toContain("Page <!-- -->1<!-- --> of <!-- -->2");
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
              productHref: null,
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

test("product table applies explicit money locale settings and renders SSR csv export action", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        header: {
          title: "Summer release",
        },
        fields: {
          showImage: false,
          showTitle: true,
          showExcerpt: false,
          showSlug: false,
          showPrice: true,
          showStatus: false,
          showStock: false,
          showStockQuantity: false,
          showCompareAt: true,
          showCollectionCount: false,
        },
        format: {
          moneyLocale: "de-DE",
          currencyDisplay: "code",
        },
        export: {
          enabled: true,
          label: "Download rows",
        },
        resolved: {
          items: [
            {
              id: "product-eur",
              title: "European Home",
              slug: "european-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 123400, currency: "EUR", compareAtAmount: 144400 },
              stock: { state: "in_stock", quantity: 2, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: ["collection-1"],
              productHref: null,
            },
          ],
          total: 1,
          resolvedAt: "2026-05-22T12:00:00.000Z",
        },
      })}
    />
  ).replace(/\u00a0/g, " ");

  expect(html).toContain("1.234,00 EUR");
  expect(html).toContain("1.444,00 EUR");
  expect(html).toContain('data-product-table-export="csv"');
  expect(html).toContain('download="summer-release.csv"');
  expect(html).toContain(">Download rows<");
  expect(html).toContain('href="data:text/csv;charset=utf-8,');
});

test("product table hides SSR csv export when disabled or when no rows are resolved", () => {
  const disabledHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        export: {
          enabled: false,
          label: "Download rows",
        },
        resolved: {
          items: [
            {
              id: "product-disabled-export",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 1, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
              productHref: null,
            },
          ],
          total: 1,
          resolvedAt: "2026-05-22T12:00:00.000Z",
        },
      })}
    />
  );

  const emptyHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        export: {
          enabled: true,
          label: "Download rows",
        },
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-05-22T12:00:00.000Z",
        },
      })}
    />
  );

  expect(disabledHtml).not.toContain('data-product-table-export="csv"');
  expect(disabledHtml).not.toContain(">Download rows<");
  expect(emptyHtml).not.toContain('data-product-table-export="csv"');
  expect(emptyHtml).not.toContain(">Download rows<");
});

test("product table csv export filename falls back to section eyebrow when title is absent", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        header: {
          eyebrow: "Featured catalog",
        },
        export: {
          enabled: true,
        },
        resolved: {
          items: [
            {
              id: "product-eyebrow-export",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 1, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
              productHref: null,
            },
          ],
          total: 1,
          resolvedAt: "2026-05-22T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain('download="featured-catalog.csv"');
});

test("product table csv export uses visible columns, locale formatting, and formula-safe escaping", () => {
  const price = formatProductTableMoney(123400, "PLN", {
    moneyLocale: "pl-PL",
    currencyDisplay: "code",
  }).replace(/\u00a0/g, " ");
  const csv = buildProductTableCsvContent(
    normalizeProductTableData({
      ...productTableDefaults,
      fields: {
        showImage: false,
        showTitle: true,
        showExcerpt: true,
        showSlug: false,
        showPrice: true,
        showStatus: false,
        showStock: false,
        showStockQuantity: false,
        showCompareAt: false,
        showCollectionCount: false,
      },
      format: {
        moneyLocale: "pl-PL",
        currencyDisplay: "code",
      },
      resolved: {
        items: [
          {
            id: "product-formula",
            title: "=SUM(A1:A2)",
            slug: "formula-home",
            excerpt: 'Line "1"\nNext line',
            status: "published",
            pricing: { amount: 123400, currency: "PLN", compareAtAmount: null },
            stock: { state: "in_stock", quantity: 1, inStock: true },
            primaryMediaId: null,
            mediaIds: [],
            collectionIds: [],
            productHref: null,
          },
        ],
        total: 1,
        resolvedAt: "2026-05-22T12:00:00.000Z",
      },
    })
  ).replace(/\u00a0/g, " ");

  expect(csv).toContain('"Product","Excerpt","Price"');
  expect(csv).toContain('"\'=SUM(A1:A2)"');
  expect(csv).toContain('"Line ""1""\nNext line"');
  expect(csv).toContain(`"${price}"`);
  expect(csv).not.toContain("/formula-home");
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
              productHref: "/products/starter-home",
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
              productHref: null,
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
              productHref: null,
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
  expect(html).toContain('aria-label="Status: Published"');
  expect(html).toContain('aria-label="Status: Draft"');
  expect(html).toContain('aria-label="Status: Archived"');
  expect(html).toContain("border-emerald-200");
  expect(html).toContain("border-amber-200");
  expect(html).toContain("border-slate-200");
  expect(html).toContain("bg-amber-50/35");
  expect(html).toContain("bg-slate-100/70");
  expect(html).not.toContain("Draft Home (draft)");
  expect(html).not.toContain("Archived Home (archived)");
});

test("product table suppresses invalid negative stock quantities from display", () => {
  const normalized = normalizeProductTableData({
    ...productTableDefaults,
    fields: {
      showTitle: false,
      showSlug: false,
      showPrice: false,
      showStatus: false,
      showStock: true,
      showStockQuantity: true,
      showCompareAt: false,
      showCollectionCount: false,
    },
    resolved: {
      items: [
        {
          id: "product-negative-stock",
          title: "Negative Stock Home",
          slug: "negative-stock-home",
          excerpt: null,
          status: "published",
          pricing: { amount: 140000, currency: "USD", compareAtAmount: null },
          stock: { state: "backorder", quantity: -2, inStock: false },
          primaryMediaId: null,
          mediaIds: [],
          collectionIds: [],
          productHref: null,
        },
      ],
      total: 1,
      resolvedAt: "2026-02-19T12:00:00.000Z",
    },
  });
  const html = renderToString(<ProductTableBlock variant="default" data={normalized} />);

  expect(normalized.resolved?.items?.[0]?.stock.quantity).toBeNull();
  expect(html).toContain("Backorder");
  expect(html).not.toContain("Backorder (-2)");
});

test("product table renders safe linked cells and action column", () => {
  const html = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        links: {
          linkedColumn: "title",
          showAction: true,
          actionLabel: "Learn more",
          openInNewTab: true,
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
              productHref: "/products/starter-home",
            },
          ],
          total: 1,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html.match(/href="\/products\/starter-home"/g)?.length).toBe(2);
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain("Learn more");
  expect(html).toContain("Action");
  expect(html).toContain("focus-visible:ring-primary/40");
  expect(html).toContain("hover:bg-slate-50/60");
});

test("product table falls back to plain text when product href is unsafe or missing", () => {
  const normalized = normalizeProductTableData({
    ...productTableDefaults,
    links: {
      linkedColumn: "slug",
      showAction: true,
      actionLabel: "View",
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
          productHref: "https://evil.example/product",
        },
      ],
      total: 1,
      resolvedAt: "2026-02-19T12:00:00.000Z",
    },
  });
  const html = renderToString(<ProductTableBlock variant="default" data={normalized} />);

  expect(normalized.resolved?.items?.[0]?.productHref).toBeNull();
  expect(html).toContain("/starter-home");
  expect(html).toContain("Action");
  expect(html).not.toContain("https://evil.example/product");
  expect(html).not.toContain('href="https://evil.example/product"');
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
              productHref: null,
            },
          ],
          total: 1,
          resolvedAt: "2026-02-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Archived Home (archived)");
  expect(html).not.toContain("Status: Archived");
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

test("product table normalizes source, header, media, labels, and guarded fields", () => {
  const normalized = normalizeProductTableData({
    source: {
      limit: 999,
      search: "  homes  ",
    },
    header: {
      eyebrow: "  Featured  ",
      title: "  Summer release  ",
      description: "  Catalog context.  ",
    },
    fields: {
      showImage: true,
      showTitle: false,
      showExcerpt: true,
      showSlug: false,
      showPrice: false,
      showStock: false,
      showStockQuantity: true,
      showCompareAt: false,
    },
    labels: {
      image: " ",
      excerpt: "  Summary  ",
      title: " ",
      slug: " ",
      compareAt: "  MSRP  ",
      stock: " ",
      collections: " ",
    },
    style: {
      density: "bad" as never,
      rowTreatment: "striped",
      hoverRows: true,
      stickyHeader: true,
      maxWidth: "content",
      align: "center",
      typography: "prominent",
      tableBackground: " ",
      headerBackground: " var(--color-bg) ",
    },
    resolved: {
      items: [
        {
          id: " product-1 ",
          title: " Starter Home ",
          slug: " starter-home ",
          excerpt: " model home ",
          status: "published",
          pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
          stock: { state: "in_stock", quantity: 3, inStock: true },
          primaryMediaId: " hero ",
          mediaIds: ["hero", " "],
          collectionIds: ["summer", " "],
          productHref: "https://evil.example/product",
          media: {
            url: " /media/starter-home.jpg ",
            alt: " ",
            width: 1200.9,
            height: 0,
          },
        },
      ],
      total: 1,
      resolvedAt: " 2026-02-19T12:00:00.000Z ",
    },
  });

  expect(normalized.source?.limit).toBe(48);
  expect(normalized.source?.search).toBe("homes");
  expect(normalized.header).toMatchObject({
    eyebrow: "Featured",
    title: "Summer release",
    description: "Catalog context.",
  });
  expect(normalized.fields).toMatchObject({
    showImage: true,
    showTitle: true,
    showExcerpt: true,
    showSlug: false,
    showPrice: true,
    showStock: false,
    showStockQuantity: false,
    showCompareAt: false,
  });
  expect(normalized.labels).toMatchObject({
    image: "Image",
    excerpt: "Summary",
    title: "Product",
    slug: "Slug",
    compareAt: "MSRP",
    stock: "Stock",
    collections: "Collections",
  });
  expect(normalized.style).toMatchObject({
    rowTreatment: "striped",
    hoverRows: true,
    stickyHeader: true,
    maxWidth: "content",
    align: "center",
    typography: "prominent",
    headerBackground: "var(--color-bg)",
  });
  expect(normalized.style?.density).toBeUndefined();
  expect(normalized.resolved?.items?.[0]).toMatchObject({
    id: "product-1",
    title: "Starter Home",
    slug: "starter-home",
    excerpt: "model home",
    primaryMediaId: "hero",
    mediaIds: ["hero"],
    collectionIds: ["summer"],
    productHref: null,
    media: {
      url: "/media/starter-home.jpg",
      alt: "Starter Home",
      width: 1200,
      height: null,
    },
  });
  expect(normalizeProductTableLabels({ price: " " }).price).toBe("Price");
});

test("product table normalizes public controls and runtime metadata", () => {
  const normalized = normalizeProductTableData({
    controls: {
      showSearchInput: true,
      showCollectionFilter: true,
      showStatusFilter: true,
      sorting: "interactive",
      pagination: "paged",
      pageSize: 999,
    },
    resolved: {
      items: [],
      total: 0,
      resolvedAt: "2026-05-22T12:00:00.000Z",
      runtime: {
        searchQuery: "  starter  ",
        status: ["published", "published", "draft", "invalid" as never],
        collectionIds: [" collection-1 ", " ", "collection-1", "collection-2"],
        availableStatuses: ["published", "archived", "invalid" as never],
        availableCollections: [
          { id: " collection-1 ", label: " Summer ", slug: " summer " },
          { id: "", label: "Ignored" } as never,
        ],
        sortField: "invalid" as never,
        sortDir: "invalid" as never,
        page: 0,
        pageSize: 0,
        totalPages: 0,
        previousPageHref: "/catalog?page=1",
        nextPageHref: "javascript:alert(1)" as never,
        clearHref: "/catalog",
        retainedParams: [
          { name: " foo ", value: " bar " },
          { name: "", value: "ignored" } as never,
        ],
        rejectedTokens: [" status ", "", null as never],
      },
    },
  });

  expect(normalized.controls).toEqual({
    showSearchInput: true,
    showCollectionFilter: true,
    showStatusFilter: true,
    sorting: "interactive",
    pagination: "paged",
    pageSize: 24,
  });
  expect(normalized.resolved?.runtime).toMatchObject({
    searchQuery: "starter",
    status: ["published", "draft"],
    collectionIds: ["collection-1", "collection-2"],
    availableStatuses: ["published", "archived"],
    availableCollections: [{ id: "collection-1", label: "Summer", slug: "summer" }],
    sortField: "updatedAt",
    sortDir: "desc",
    page: 1,
    pageSize: 24,
    totalPages: 1,
    previousPageHref: "/catalog?page=1",
    nextPageHref: undefined,
    clearHref: "/catalog",
    retainedParams: [{ name: "foo", value: "bar" }],
    rejectedTokens: ["status"],
  });
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
        header: {
          eyebrow: "Featured catalog",
          title: "Summer release",
          description: "Curated product context above the table.",
        },
        fields: {
          showImage: true,
          showTitle: false,
          showExcerpt: true,
          showSlug: true,
          showPrice: false,
          showStatus: true,
          showStock: true,
          showStockQuantity: true,
          showCompareAt: true,
          showCollectionCount: false,
        },
        labels: {
          image: "Thumbnail",
          excerpt: "Summary",
        },
        links: {
          linkedColumn: "title",
          showAction: true,
          actionLabel: "Open",
          openInNewTab: true,
        },
        resolved: {
          items: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: "Compact modern home.",
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
              productHref: null,
              media: {
                url: "/media/starter-home.jpg",
                alt: "Starter Home hero",
                width: 1200,
                height: 900,
              },
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
              productHref: null,
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
  const previewData = normalizeProductTableData({
    ...productTableDefaults,
    resolved: {
      items: [
        {
          id: "product-preview",
          title: "Preview Home",
          slug: "preview-home",
          excerpt: null,
          status: "published",
          pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
          stock: { state: "in_stock", quantity: 3, inStock: true },
          primaryMediaId: null,
          mediaIds: [],
          collectionIds: [],
          productHref: null,
        },
      ],
      total: 1,
      resolvedAt: "2026-02-19T12:00:00.000Z",
    },
  });
  const loadingHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={previewData}
      renderContext={{
        mode: "editor-preview",
        previewState: { status: "loading" },
      }}
    />
  );
  const errorHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={previewData}
      renderContext={{
        mode: "editor-preview",
        previewState: { status: "error", message: "Preview timed out" },
      }}
    />
  );
  const runtimeErrorHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData({
        ...productTableDefaults,
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-02-19T12:00:00.000Z",
          error: "Provider timeout",
        },
      })}
    />
  );
  const emptyPreviewHtml = renderToString(
    <ProductTableBlock
      variant="default"
      data={normalizeProductTableData(productTableDefaults)}
      renderContext={{ mode: "editor-preview" }}
    />
  );
  const widget = createProductTableWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  expect(loadingHtml).toContain("Refreshing Product Table preview");
  expect(loadingHtml).toContain('role="status"');
  expect(loadingHtml).toContain('aria-live="polite"');
  expect(errorHtml).toContain("Product Table preview warning:");
  expect(errorHtml).toContain("Preview timed out");
  expect(errorHtml).toContain('role="alert"');
  expect(runtimeErrorHtml).toContain("Commerce runtime warning:");
  expect(runtimeErrorHtml).toContain("Provider timeout");
  expect(runtimeErrorHtml).toContain('role="alert"');
  expect(emptyPreviewHtml).toContain('role="status"');
  expect(emptyPreviewHtml).toContain('aria-live="polite"');
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
  expect(visual).toContain("Section header");
  expect(visual).toContain("Section eyebrow");
  expect(visual).toContain("Section title");
  expect(visual).toContain("Section description");
  expect(visual).toContain("Columns");
  expect(visual).toContain("Show image");
  expect(visual).toContain("Show product");
  expect(visual).toContain("Show excerpt");
  expect(visual).toContain("Show price");
  expect(visual).toContain("Show compare-at price");
  expect(visual).toContain("Show stock quantity");
  expect(visual).not.toContain("Stock presentation");
  expect(visual).toContain("Links and actions");
  expect(visual).toContain("Linked column");
  expect(visual).toContain("Show action column");
  expect(visual).toContain("Image");
  expect(visual).toContain("Slug");
  expect(visual).toContain("Excerpt");
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
  expect(advanced).toContain("Runtime status");
  expect(advanced).toContain("Query summary");
  expect(advanced).not.toContain('"pagination"');
});
