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
  exportGalleryMosaicConfig,
  galleryMosaicDefaults,
  galleryMosaicItemMax,
  GalleryMosaicBlock,
  countGalleryMosaicEligibleLightboxItems,
  describeGalleryMosaicCountReduction,
  getGalleryMosaicLightboxRuntimeScript,
  importGalleryMosaicConfig,
  normalizeGalleryMosaicData,
  normalizeGalleryMosaicItemCount,
  normalizeGalleryMosaicItems,
  summarizeGalleryMosaicCountReduction,
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
  expect(html).toContain('aria-labelledby="gallery-mosaic-gallery-1-title"');
  expect(html).toContain('id="gallery-mosaic-gallery-1-title"');
});

test("gallery mosaic canonicalizes inherited overlays and rejects hidden whitespace", () => {
  for (const [raw, expected] of [
    [" CURRENTCOLOR ", "currentColor"],
    [" INHERIT ", "inherit"],
  ] as const) {
    const normalized = normalizeGalleryMosaicData({
      ...galleryMosaicDefaults,
      style: { ...galleryMosaicDefaults.style, overlay: raw },
    });
    expect(normalized.style?.overlay).toBe(expected);
    expect(renderToString(<GalleryMosaicBlock data={normalized} variant="mosaic" />)).toContain(
      `background:${expected}`
    );
  }

  const rejected = normalizeGalleryMosaicData({
    ...galleryMosaicDefaults,
    style: { ...galleryMosaicDefaults.style, overlay: "\u00a0inherit" },
  });
  expect(rejected.style?.overlay).toBeUndefined();
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
        interaction: {
          mode: "lightbox",
          zoom: "fill",
        },
        style: {
          ratio: "16:9",
          gap: "lg",
          radius: "xl",
          overlay: "rgba(15, 23, 42, 0.5)",
          captionPosition: "hover",
          layoutDensity: "dense",
          motionPreset: "slide-up",
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

test("gallery mosaic lightbox stays opt-in, normalizes interaction defaults, and preserves link precedence", () => {
  const normalized = normalizeGalleryMosaicData({
    items: [
      {
        id: "gallery-1",
        image: "https://cdn.example.com/one.jpg",
        caption: "Lead frame",
      },
    ],
  });

  const fallback = normalizeGalleryMosaicData({
    items: [
      {
        id: "gallery-1",
        image: "https://cdn.example.com/one.jpg",
      },
    ],
    interaction: {
      mode: "modal" as never,
      zoom: "explode" as never,
    },
  });

  const html = renderToString(
    <GalleryMosaicBlock
      data={{
        ...galleryMosaicDefaults,
        items: [
          {
            id: "gallery-1",
            image: "https://cdn.example.com/one.jpg",
            caption: "Lead frame",
          },
          {
            id: "gallery-2",
            image: "https://cdn.example.com/two.jpg",
            caption: "Linked frame",
            href: "/details",
          },
        ],
        interaction: {
          mode: "lightbox",
          zoom: "fill",
        },
      }}
      variant="mosaic"
      blockId="gallery-mosaic-runtime"
    />
  );

  expect(normalized.interaction).toEqual({
    mode: "none",
    zoom: "fit",
  });
  expect(fallback.interaction).toEqual({
    mode: "none",
    zoom: "fit",
  });
  expect(html).toContain('data-gallery-mosaic-interaction="lightbox"');
  expect(html).toContain('data-gallery-mosaic-zoom="fill"');
  expect(html).toContain('data-gallery-lightbox-root="1"');
  expect(html).toContain(
    'data-gallery-lightbox-trigger="gallery-mosaic-gallery-mosaic-runtime-lightbox-gallery-1"'
  );
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).toContain('data-gallery-item-interaction="link"');
  expect(html).toContain('href="/details"');
  expect(html).toContain("data-gallery-lightbox-dialog");
  expect(html).toContain("galleryLightboxBound");
  expect(getGalleryMosaicLightboxRuntimeScript()).toContain("data-gallery-lightbox-root='1'");
});

test("gallery mosaic lightbox eligibility count matches renderer trigger semantics", () => {
  expect(
    countGalleryMosaicEligibleLightboxItems(
      [
        { id: "image", image: "https://cdn.example.com/one.jpg" },
        { id: "video", video: "https://cdn.example.com/two.mp4" },
        {
          id: "linked-image",
          image: "https://cdn.example.com/linked.jpg",
          href: "/details",
        },
        { id: "placeholder", caption: "Placeholder" },
      ],
      "lightbox"
    )
  ).toBe(2);
  expect(
    countGalleryMosaicEligibleLightboxItems(
      [
        {
          id: "linked-image",
          image: "https://cdn.example.com/linked.jpg",
          href: "/details",
        },
        { id: "placeholder", caption: "Placeholder" },
      ],
      "lightbox"
    )
  ).toBe(0);
  expect(
    countGalleryMosaicEligibleLightboxItems(
      [{ id: "image", image: "https://cdn.example.com/one.jpg" }],
      "none"
    )
  ).toBe(0);
});

test("gallery mosaic section naming falls back when no visible heading exists", () => {
  const html = renderToString(
    <GalleryMosaicBlock
      data={{
        ...galleryMosaicDefaults,
        header: {
          title: "",
          description: "",
        },
      }}
      variant="mosaic"
    />
  );

  expect(html).toContain('aria-label="Gallery"');
  expect(html).not.toContain("aria-labelledby=");
});

test("gallery mosaic count-reduction summary names removed authored tiles", () => {
  const items = normalizeGalleryMosaicItems(
    [
      { id: "gallery-1", caption: "Lead", image: "/lead.jpg" },
      { id: "gallery-2", caption: "Motion draft", video: "/motion.mp4" },
      { id: "gallery-3", caption: "Linked detail", href: "/detail" },
    ],
    3
  );

  const summary = summarizeGalleryMosaicCountReduction(items, 1);

  expect(summary).toEqual({
    nextCount: 1,
    removedCount: 2,
    authoredRemovedCount: 2,
    labels: ["Motion draft", "Linked detail"],
    extraLabelCount: 0,
    hasAuthoredData: true,
  });
  expect(describeGalleryMosaicCountReduction(summary!)).toContain(
    "Increasing the count again creates new placeholder tiles; removed content is not restored."
  );
});

test("gallery mosaic density and motion presets stay bounded and render deterministic markers", () => {
  const normalized = normalizeGalleryMosaicData({
    ...galleryMosaicDefaults,
    style: {
      ...galleryMosaicDefaults.style,
      layoutDensity: "invalid" as never,
      motionPreset: "bounce" as never,
    },
  });

  const html = renderToString(
    <GalleryMosaicBlock
      data={{
        ...galleryMosaicDefaults,
        style: {
          ...galleryMosaicDefaults.style,
          layoutDensity: "dense",
          motionPreset: "slide-up",
        },
      }}
      variant="mosaic"
    />
  );

  expect(normalized.style).toEqual(
    expect.objectContaining({
      layoutDensity: "auto",
      motionPreset: "none",
    })
  );
  expect(html).toContain('data-gallery-mosaic-layout-density="dense"');
  expect(html).toContain('data-gallery-mosaic-motion="slide-up"');
  expect(html).toContain('data-gallery-item-motion="slide-up"');
  expect(html).toContain("sm:grid-cols-3");
  expect(html).toContain("lg:grid-cols-5");
  expect(html).toContain("motion-safe:slide-in-from-bottom-2");
  expect(html).toContain("motion-reduce:transition-none");
});

test("gallery mosaic import and export stay schema-owned and machine-readable", () => {
  const exported = exportGalleryMosaicConfig({
    ...galleryMosaicDefaults,
    items: [
      {
        id: "gallery-1",
        image: "https://cdn.example.com/one.jpg",
        caption: "Lead frame",
      },
    ],
    style: {
      ...galleryMosaicDefaults.style,
      layoutDensity: "compact",
      motionPreset: "fade",
    },
  });

  const imported = importGalleryMosaicConfig(exported);
  const invalidJson = importGalleryMosaicConfig("{not-json");
  const unknownField = importGalleryMosaicConfig(
    JSON.stringify({
      items: [
        {
          id: "gallery-1",
          image: "https://cdn.example.com/one.jpg",
          privateToken: "secret",
        },
      ],
    })
  );
  const invalidValue = importGalleryMosaicConfig(
    JSON.stringify({
      items: [
        {
          id: "gallery-1",
          image: "https://cdn.example.com/one.jpg",
        },
      ],
      style: {
        motionPreset: "bounce",
      },
    })
  );

  expect(exported).toContain('"layoutDensity": "compact"');
  expect(exported).toContain('"motionPreset": "fade"');
  expect(imported).toEqual({
    ok: true,
    data: expect.objectContaining({
      items: [expect.objectContaining({ id: "gallery-1", caption: "Lead frame" })],
      style: expect.objectContaining({
        layoutDensity: "compact",
        motionPreset: "fade",
      }),
    }),
  });
  expect(invalidJson).toEqual({
    ok: false,
    code: "gallery_mosaic_import_invalid_json",
  });
  expect(unknownField).toEqual({
    ok: false,
    code: "gallery_mosaic_import_unknown_field",
    path: "items[0].privateToken",
  });
  expect(invalidValue).toEqual({
    ok: false,
    code: "gallery_mosaic_import_invalid_value",
    path: "style.motionPreset",
  });
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

  const denseHtml = renderToString(
    <GalleryMosaicBlock
      data={{
        ...galleryMosaicDefaults,
        items: [
          {
            id: "lead-item",
            image: "https://cdn.example.com/one.jpg",
            caption: "Lead frame",
          },
          {
            id: "support-item",
            image: "https://cdn.example.com/two.jpg",
            caption: "Support frame",
          },
        ],
        style: {
          ...galleryMosaicDefaults.style,
          layoutDensity: "dense",
        },
      }}
      variant="feature-left"
    />
  );

  expect(denseHtml).toContain("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4");
  expect(denseHtml).not.toContain("grid grid-cols-1 grid grid-cols-1");
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

test("gallery mosaic hover captions stay keyboard reachable for linked and static tiles", () => {
  const html = renderToString(
    <GalleryMosaicBlock
      data={{
        ...galleryMosaicDefaults,
        items: [
          {
            id: "gallery-1",
            image: "https://cdn.example.com/one.jpg",
            caption: "Linked frame",
            href: "/details",
          },
          {
            id: "gallery-2",
            image: "https://cdn.example.com/two.jpg",
            caption: "Static frame",
          },
        ],
        style: {
          ...galleryMosaicDefaults.style,
          captionPosition: "hover",
        },
      }}
      variant="mosaic"
    />
  );

  expect(html).toContain('class="group block"');
  expect(html).toContain('tabindex="0"');
  expect(html).toContain('aria-label="Static frame"');
});

test("gallery mosaic wizard renders starter seed controls", () => {
  const html = renderToString(
    <GalleryMosaicWizardEditor
      value={galleryMosaicDefaults}
      onChange={() => undefined}
      variant="mosaic"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Mosaic");
  expect(html).toContain("Uniform Grid");
  expect(html).toContain("Feature Left");
  expect(html).toContain("Section title");
  expect(html).toContain("Initial media count");
  expect(html).toContain("Configured media");
  expect(html).toContain('data-widget-control="gallery-mosaic.wizard.items.count"');
  expect(html).toContain('data-widget-editor-section="gallery-mosaic.wizard.starter-media"');
  expect(html).not.toContain("Media library");
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
  expect(html).toContain("Interaction");
  expect(html).toContain("Overlay and caption controls");
  expect(html).toContain("Layout style");
  expect(html).toContain("Density and motion");
  expect(html).toContain(
    'data-widget-editor-section="gallery-mosaic.visual.variant-media-structure"'
  );
  expect(html).toContain('data-widget-editor-section="gallery-mosaic.visual.header-copy"');
  expect(html).toContain('data-widget-editor-section="gallery-mosaic.visual.media-items-links"');
  expect(html).toContain('data-widget-editor-section="gallery-mosaic.visual.interaction"');
  expect(html).toContain(
    'data-widget-editor-section="gallery-mosaic.visual.overlay-caption-controls"'
  );
  expect(html).toContain('data-widget-editor-section="gallery-mosaic.visual.layout-style"');
  expect(html).toContain('data-widget-editor-section="gallery-mosaic.visual.density-motion"');
});

test("gallery mosaic advanced keeps read-only diagnostics scope", () => {
  const html = renderToString(
    <GalleryMosaicAdvancedEditor
      value={galleryMosaicDefaults}
      onChange={() => undefined}
      variant="uniform-grid"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Runtime summary");
  expect(html).toContain("Style summary");
  expect(html).toContain("Accessibility diagnostics");
  expect(html).toContain("Contract summary");
  expect(html).toContain("Advanced mode is read-only.");
  expect(html).toContain('data-widget-editor-section="gallery-mosaic.advanced.runtime-summary"');
  expect(html).toContain('data-widget-editor-section="gallery-mosaic.advanced.style-summary"');
  expect(html).toContain(
    'data-widget-editor-section="gallery-mosaic.advanced.accessibility-diagnostics"'
  );
  expect(html).toContain('data-widget-editor-section="gallery-mosaic.advanced.contract-summary"');
  expect(html).not.toContain("Raw payload snapshot");
  expect(html).not.toContain("Media items and links");
  expect(html).not.toContain("Normalize now");
  expect(html).not.toContain("Reset to defaults");
});
