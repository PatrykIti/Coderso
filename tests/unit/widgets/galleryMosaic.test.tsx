import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  GalleryMosaicAdvancedEditor,
  GalleryMosaicVisualEditor,
  GalleryMosaicWizardEditor,
} from "../../../core/admin/ui/widgets/editors/GalleryMosaicEditors";
import {
  createGalleryMosaicWidget,
  galleryMosaicDefaults,
  galleryMosaicItemMax,
  GalleryMosaicBlock,
  normalizeGalleryMosaicData,
  normalizeGalleryMosaicItemCount,
  normalizeGalleryMosaicItems,
  type GalleryMosaicData,
} from "../../../core/widgets/core/galleryMosaic";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<GalleryMosaicData>> = () => null;

test("gallery mosaic renders defaults", () => {
  const html = renderToString(
    <GalleryMosaicBlock data={galleryMosaicDefaults} variant="mosaic" />
  );

  expect(html).toContain(galleryMosaicDefaults.header?.title ?? "");
  expect(html).toContain('data-gallery-mosaic-variant="mosaic"');
  expect(html).toContain('data-gallery-mosaic-count="5"');
});

test("gallery mosaic normalization keeps deterministic ids and item bounds", () => {
  const items = normalizeGalleryMosaicItems(
    [
      { id: "same", caption: "One", image: "https://cdn.example.com/one.jpg" },
      { id: "same", caption: "", image: "https://cdn.example.com/two.jpg" },
    ],
    2
  );

  expect(items).toHaveLength(2);
  expect(items[0]?.id).toBe("same");
  expect(items[1]?.id).toBe("gallery-2");
  expect(items[1]?.caption).toBeTruthy();
  expect(normalizeGalleryMosaicItemCount(999)).toBe(galleryMosaicItemMax);
  expect(normalizeGalleryMosaicItemCount(0)).toBe(1);

  const normalized = normalizeGalleryMosaicData({ items: [] });
  expect(normalized.items).toHaveLength(5);
  expect(normalized.style?.ratio).toBe("4:3");
});

test("gallery mosaic validator accepts expanded model", () => {
  clearWidgets();
  const widget = createGalleryMosaicWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "gallery-1",
      type: "gallery-mosaic",
      variant: "feature-left",
      data: {
        header: {
          title: "Product gallery",
          description: "Visual timeline of product capabilities.",
        },
        items: [
          {
            id: "item-1",
            image: "https://cdn.example.com/one.jpg",
            caption: "Main frame",
            href: "#",
          },
          {
            id: "item-2",
            video: "https://cdn.example.com/two.mp4",
            caption: "Video frame",
            href: "#",
          },
          {
            id: "item-3",
            image: "https://cdn.example.com/three.jpg",
            caption: "Third frame",
            href: "#",
          },
        ],
        style: {
          ratio: "16:9",
          gap: "lg",
          radius: "xl",
          overlay: "rgba(15, 23, 42, 0.5)",
          captionPosition: "hover",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("gallery mosaic validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createGalleryMosaicWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "gallery-2",
      type: "gallery-mosaic",
      variant: "unknown",
      data: galleryMosaicDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("gallery mosaic wizard renders onboarding fields", () => {
  const html = renderToString(
    <GalleryMosaicWizardEditor
      value={galleryMosaicDefaults}
      onChange={() => undefined}
      variant="mosaic"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Gallery layout");
  expect(html).toContain("Section title");
  expect(html).toContain("Initial media count");
});

test("gallery mosaic visual renders section-based IA", () => {
  const html = renderToString(
    <GalleryMosaicVisualEditor
      value={galleryMosaicDefaults}
      onChange={() => undefined}
      variant="mosaic"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and media structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Media items and links");
  expect(html).toContain("Overlay and caption controls");
  expect(html).toContain("Layout style");
});

test("gallery mosaic advanced keeps technical-only scope", () => {
  const html = renderToString(
    <GalleryMosaicAdvancedEditor
      value={galleryMosaicDefaults}
      onChange={() => undefined}
      variant="uniform-grid"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Technical ratio and layout tokens");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Media items and links");
});
