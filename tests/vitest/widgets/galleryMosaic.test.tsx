import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
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
  const html = renderToString(<GalleryMosaicBlock data={galleryMosaicDefaults} variant="mosaic" />);

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
            alt: "Accessible first frame",
            caption: "Main frame",
            href: "#",
            objectPosition: "top",
            ratio: "1:1",
          },
          {
            id: "item-2",
            video: "https://cdn.example.com/two.mp4",
            poster: "https://cdn.example.com/two-poster.jpg",
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

test("gallery mosaic per-item media presentation fields normalize and render", () => {
  const html = renderToString(
    <GalleryMosaicBlock
      data={{
        ...galleryMosaicDefaults,
        items: [
          {
            id: "gallery-1",
            image: "https://cdn.example.com/one.jpg",
            alt: "Explicit alt copy",
            objectPosition: "right",
            ratio: "1:1",
            caption: "Main frame",
          },
          {
            id: "gallery-2",
            video: "https://cdn.example.com/two.mp4",
            poster: "https://cdn.example.com/two-poster.jpg",
            caption: "Video frame",
          },
        ],
      }}
      variant="mosaic"
    />
  );

  const normalized = normalizeGalleryMosaicData({
    items: [
      {
        id: "gallery-1",
        image: "https://cdn.example.com/one.jpg",
        alt: "Explicit alt copy",
        objectPosition: "right",
        ratio: "1:1",
      },
      {
        id: "gallery-2",
        video: "https://cdn.example.com/two.mp4",
        poster: "https://cdn.example.com/two-poster.jpg",
        objectPosition: "bottom",
      },
    ],
  });

  expect(normalized.items[0]).toEqual(
    expect.objectContaining({
      alt: "Explicit alt copy",
      objectPosition: "right",
      ratio: "1:1",
    })
  );
  expect(normalized.items[1]).toEqual(
    expect.objectContaining({
      poster: "https://cdn.example.com/two-poster.jpg",
      objectPosition: "bottom",
      ratio: "inherit",
    })
  );
  expect(html).toContain('alt="Explicit alt copy"');
  expect(html).toContain("object-position:right center");
  expect(html).toContain('poster="https://cdn.example.com/two-poster.jpg"');
  expect(html).toContain("aspect-square");
});

test("gallery mosaic cleared overlay omits caption background style", () => {
  const normalized = normalizeGalleryMosaicData({
    ...galleryMosaicDefaults,
    style: {},
  });
  const html = renderToString(<GalleryMosaicBlock data={normalized} variant="mosaic" />);

  expect(normalized.style?.overlay).toBeUndefined();
  expect(html).toContain('data-gallery-mosaic-variant="mosaic"');
  expect(html).not.toContain("background:rgba");
  expect(html).not.toContain("background-color:transparent");
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

test("gallery mosaic feature-left avoids empty support column and redundant featured row span", () => {
  const html = renderToString(
    <GalleryMosaicBlock
      data={{
        ...galleryMosaicDefaults,
        items: [
          {
            id: "only-item",
            image: "https://cdn.example.com/one.jpg",
            caption: "Solo frame",
          },
        ],
      }}
      variant="feature-left"
    />
  );

  expect(html).not.toContain("flex flex-col gap-4");
  expect(html).not.toContain("lg:row-span-2");
});

test("gallery mosaic renders figure semantics and current video controls", () => {
  const html = renderToString(
    <GalleryMosaicBlock
      data={{
        ...galleryMosaicDefaults,
        items: [
          {
            id: "video-item",
            video: "https://cdn.example.com/video.mp4",
            caption: "Video frame",
          },
        ],
      }}
      variant="uniform-grid"
    />
  );

  expect(html).toContain("<figure");
  expect(html).toContain("<figcaption");
  expect(html).toContain('data-gallery-media-type="video"');
  expect(html).toContain("controls");
  expect(html).toContain('title="Video frame"');
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
