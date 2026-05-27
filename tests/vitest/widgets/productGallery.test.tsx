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
  buildProductGalleryQueryInput,
  createProductGalleryWidget,
  normalizeProductGalleryData,
  productGalleryDefaults,
  type ProductGalleryData,
} from "../../../core/widgets/core/productGallery";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";

const StubEditor: ComponentType<WidgetEditorProps<ProductGalleryData>> = () => null;

test("product gallery renders empty state without forcing a blank description", () => {
  const html = renderToString(
    <ProductGalleryBlock
      variant="cards"
      data={normalizeProductGalleryData({
        ...productGalleryDefaults,
        emptyState: {
          title: "Nothing here",
          description: "",
        },
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Nothing here");
  expect(html).not.toContain("Adjust query filters or publish products.");
  expect(html).toContain('data-product-gallery-count="0"');
});

test("product gallery renders media, links, header, badges, and view-all link", () => {
  const html = renderToString(
    <ProductGalleryBlock
      variant="cards"
      data={normalizeProductGalleryData({
        ...productGalleryDefaults,
        header: {
          title: "Featured homes",
          description: "Current highlighted catalog entries.",
        },
        link: {
          basePath: "/catalog",
          ctaLabel: "View details",
          ctaStyle: "button",
        },
        pagination: {
          mode: "view-all",
          viewAllHref: "/catalog",
          viewAllLabel: "Browse full catalog",
        },
        fields: {
          showExcerpt: true,
          showPrice: true,
          showStock: true,
          showStatus: true,
          showMediaHint: false,
        },
        resolved: {
          items: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: "Compact modern plan.",
              status: "draft",
              pricing: {
                amount: 19900,
                currency: "USD",
                compareAtAmount: 24900,
              },
              stock: {
                state: "in_stock",
                quantity: 3,
                inStock: true,
              },
              primaryMediaId: "media-1",
              mediaIds: ["media-1"],
              collectionIds: ["collection-1"],
              media: {
                url: "/media/starter-home.jpg",
                alt: "Starter Home hero",
                width: 1200,
                height: 900,
              },
            },
          ],
          total: 3,
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Featured homes");
  expect(html).toContain("Current highlighted catalog entries.");
  expect(html).toContain('src="/media/starter-home.jpg"');
  expect(html).toContain('alt="Starter Home hero"');
  expect(html).toContain('href="/catalog/starter-home"');
  expect(html).toContain("$199.00");
  expect(html).toContain("$249.00");
  expect(html).toContain("View details");
  expect(html).toContain("Status: <!-- -->Draft");
  expect(html).toContain("Stock: <!-- -->In stock");
  expect(html).toContain('href="/catalog"');
  expect(html).toContain("Browse full catalog");
});

test("product gallery uses block-local accessible title ids", () => {
  const data = normalizeProductGalleryData({
    ...productGalleryDefaults,
    resolved: {
      items: [
        {
          id: "product-1",
          title: "Starter Home",
          slug: "starter-home",
          excerpt: null,
          status: "published",
          pricing: { amount: 19900, currency: "USD", compareAtAmount: null },
          stock: { state: "in_stock", quantity: 3, inStock: true },
          primaryMediaId: null,
          mediaIds: [],
          collectionIds: [],
        },
      ],
      total: 1,
      resolvedAt: "2026-05-19T12:00:00.000Z",
    },
  });

  const first = renderToString(
    <ProductGalleryBlock blockId="gallery-alpha" variant="cards" data={data} />
  );
  const second = renderToString(
    <ProductGalleryBlock blockId="gallery-beta" variant="cards" data={data} />
  );

  expect(first).toContain('aria-labelledby="gallery-alpha-title-product-1"');
  expect(second).toContain('aria-labelledby="gallery-beta-title-product-1"');
});

test("product gallery compact variant and compare-at guard are truthful", () => {
  const cards = renderToString(
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
              excerpt: null,
              status: "published",
              pricing: {
                amount: 19900,
                currency: "USD",
                compareAtAmount: 18900,
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
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      })}
    />
  );
  const compact = renderToString(
    <ProductGalleryBlock
      variant="compact"
      data={normalizeProductGalleryData({
        ...productGalleryDefaults,
        style: {
          columns: "3",
          cardStyle: "minimal",
          cardBackground: "var(--color-bg)",
          cardBorderColor: "var(--color-border)",
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
                amount: 19900,
                currency: "USD",
                compareAtAmount: 18900,
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
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      })}
    />
  );

  expect(cards).toContain("gap-4");
  expect(compact).toContain("gap-3");
  expect(compact).not.toContain("line-through");
  expect(compact).not.toContain("border-color");
});

test("product gallery query input adds bounded price filters and keeps shared source defaults", () => {
  const query = buildProductGalleryQueryInput({
    source: {
      limit: 999,
      sortField: "pricing.amount",
      sortDir: "asc",
      minPriceMinor: 49900,
      maxPriceMinor: 19900,
    },
  });

  expect(query.pagination.limit).toBe(48);
  expect(query.sort).toEqual([{ field: "pricing.amount", dir: "asc" }]);
  expect(query.filters).toEqual([
    { field: "pricing.amount", op: "gte", value: 19900 },
    { field: "pricing.amount", op: "lte", value: 49900 },
  ]);
});

test("product gallery editor preview never exposes raw media IDs", () => {
  const data = normalizeProductGalleryData({
    ...productGalleryDefaults,
    fields: {
      ...productGalleryDefaults.fields,
      showMediaHint: true,
    },
    resolved: {
      items: [
        {
          id: "product-1",
          title: "Starter Home",
          slug: "starter-home",
          excerpt: null,
          status: "published",
          pricing: { amount: 19900, currency: "USD", compareAtAmount: null },
          stock: { state: "in_stock", quantity: 3, inStock: true },
          primaryMediaId: "media-1",
          mediaIds: ["media-1"],
          collectionIds: [],
        },
      ],
      total: 1,
      resolvedAt: "2026-05-19T12:00:00.000Z",
    },
  });

  const publicHtml = renderToString(<ProductGalleryBlock variant="cards" data={data} />);
  const editorHtml = renderToString(
    <ProductGalleryBlock
      variant="cards"
      data={data}
      renderContext={{ mode: "editor-preview", previewState: { status: "loading" } }}
    />
  );

  expect(publicHtml).not.toContain("Preview media id");
  expect(editorHtml).not.toContain("Preview media id");
  expect(editorHtml).not.toContain("media-1");
  expect(editorHtml).toContain("Refreshing Product Gallery preview...");
});

test("product gallery validator accepts new header, link, pagination, and media fields", () => {
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
      variant: "compact",
      data: {
        ...productGalleryDefaults,
        link: {
          basePath: "/catalog",
          ctaLabel: "Open",
          ctaStyle: "text",
          target: "new-tab",
        },
        header: {
          title: "Featured homes",
        },
        pagination: {
          mode: "view-all",
          viewAllHref: "/catalog",
        },
        curation: {
          mode: "manual",
          productIds: ["product-1"],
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
                amount: 19900,
                currency: "USD",
                compareAtAmount: null,
              },
              stock: {
                state: "in_stock",
                quantity: 3,
                inStock: true,
              },
              primaryMediaId: "media-1",
              mediaIds: ["media-1"],
              collectionIds: [],
              media: {
                url: "/media/starter-home.jpg",
                alt: "Starter Home",
                width: 1200,
                height: 900,
              },
            },
          ],
          total: 1,
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      },
    })
  ).not.toThrow();
});

test("product gallery widget declares preview-state support at the widget owner", () => {
  const widget = createProductGalleryWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  expect(widget.editorCapabilities?.supportsPreviewState).toBe(true);
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
  expect(wizard).toContain("Price filters");
  expect(wizard).toContain('data-widget-editor-section="product-gallery.wizard.product-source"');
  expect(wizard).toContain('data-widget-editor-section="product-gallery.wizard.price-filters"');
  expect(wizard).not.toContain("Columns preview");

  const visual = renderToString(
    <ProductGalleryVisualEditor
      value={productGalleryDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(visual).toContain("Section header");
  expect(visual).toContain("Variant and structure");
  expect(visual).toContain("Card content");
  expect(visual).toContain("Product links");
  expect(visual).toContain("Curated products");
  expect(visual).toContain("More products link");
  expect(visual).toContain("Empty state");
  expect(visual).toContain("Presentation");
  expect(visual).toContain("Columns preview");
  expect(visual).toContain("Surfaces");
  expect(visual).toContain('data-widget-editor-section="product-gallery.visual.variant-structure"');
  expect(visual).toContain('data-widget-editor-section="product-gallery.visual.section-header"');
  expect(visual).toContain('data-widget-editor-section="product-gallery.visual.card-content"');
  expect(visual).toContain('data-widget-editor-section="product-gallery.visual.product-links"');
  expect(visual).toContain('data-widget-editor-section="product-gallery.visual.curated-products"');
  expect(visual).toContain(
    'data-widget-editor-section="product-gallery.visual.more-products-link"'
  );
  expect(visual).toContain('data-widget-editor-section="product-gallery.visual.empty-state"');
  expect(visual).toContain('data-widget-editor-section="product-gallery.visual.surfaces"');
  expect(visual).toContain('data-widget-editor-section="product-gallery.visual.presentation"');

  const advanced = renderToString(
    <ProductGalleryAdvancedEditor
      value={productGalleryDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(advanced).toContain("Product behavior");
  expect(advanced).toContain("Preview status");
  expect(advanced).toContain("Source summary");
  expect(advanced).toContain("Surface summary");
  expect(advanced).toContain("Contract summary");
  expect(advanced).toContain("Advanced mode is read-only.");
  expect(advanced).toContain(
    'data-widget-editor-section="product-gallery.advanced.product-behavior"'
  );
  expect(advanced).toContain(
    'data-widget-editor-section="product-gallery.advanced.source-summary"'
  );
  expect(advanced).toContain(
    'data-widget-editor-section="product-gallery.advanced.preview-status"'
  );
  expect(advanced).toContain(
    'data-widget-editor-section="product-gallery.advanced.surface-summary"'
  );
  expect(advanced).toContain(
    'data-widget-editor-section="product-gallery.advanced.contract-summary"'
  );
  expect(advanced).not.toContain("Query preview");
  expect(advanced).not.toContain("<pre");
});
