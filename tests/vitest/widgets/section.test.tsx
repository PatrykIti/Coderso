import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  SectionAdvancedEditor,
  SectionVisualEditor,
  SectionWizardEditor,
} from "../../../core/admin/ui/widgets/editors/SectionEditors";
import { createHeroWidget, heroDefaults, type HeroData } from "../../../core/widgets/core/hero";
import {
  applySectionRegionLabels,
  createSectionWidget,
  normalizeSectionData,
  resolveSectionRegionLabelValue,
  resolveSectionVariant,
  sectionDefaults,
  SectionBlock,
  syncSectionRegionDataWithSlotMap,
  type SectionData,
  updateSectionRegionLabelData,
} from "../../../core/widgets/core/section";
import {
  createNavigationWidget,
  navigationDefaults,
  type NavigationData,
} from "../../../core/widgets/core/navigation";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubSectionEditor: ComponentType<WidgetEditorProps<SectionData>> = () => null;
const StubHeroEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;
const StubNavigationEditor: ComponentType<WidgetEditorProps<NavigationData>> = () => null;

test("section renders defaults", () => {
  const html = renderToString(<SectionBlock data={sectionDefaults} variant="default" />);

  expect(html).toContain('data-section-variant="default"');
  expect(html).toContain('data-section-container-width="content"');
  expect(html).toContain('data-section-max-width="6xl"');
  expect(html).toContain('data-section-min-height="none"');
  expect(html).toContain('data-section-region-flow="stack"');
  expect(html).toContain('data-section-region-columns="1"');
  expect(html).toContain('data-section-heading-gap="md"');
  expect(html).toContain('data-section-region-gap="match-variant"');
  expect(html).toContain('data-section-shadow="none"');
  expect(html).toContain('data-section-motion="none"');
  expect(html).toContain('data-section-background-media="none"');
  expect(html).toContain('data-section-layer-order="media-under-overlay"');
  expect(html).toContain('data-section-regions="1"');
  expect(html).not.toContain("Empty region.");
  expect(html).toContain("absolute inset-0 overflow-hidden");
  expect(html).not.toContain("relative w-full overflow-hidden");
});

test("section heading uses a safe default level", () => {
  const html = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        heading: {
          title: "Conversion section",
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain("<h2");
  expect(html).not.toContain("<h3");
});

test("section renders bounded heading typography, alignment, and colors", () => {
  const html = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        heading: {
          label: "Overview",
          title: "Pricing section",
          description: "Supporting copy for the section.",
          level: "h4",
          align: "center",
          labelSize: "md",
          titleSize: "3xl",
          descriptionSize: "lg",
          labelColor: "#475569",
          titleColor: "var(--color-primary)",
          descriptionColor: "#334155",
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain("<h4");
  expect(html).toContain("text-center");
  expect(html).toContain("text-base font-semibold uppercase tracking-[0.2em]");
  expect(html).toContain("text-3xl font-semibold");
  expect(html).toContain("text-lg");
  expect(html).toContain('style="color:#475569"');
  expect(html).toContain('style="color:var(--color-primary)"');
  expect(html).toContain('style="color:#334155"');
});

test("section omits unsafe authored color strings from public inline styles", () => {
  const html = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        heading: {
          label: "Unsafe label",
          title: "Unsafe title",
          description: "Unsafe description",
          labelColor: "url(javascript:alert(1))",
          titleColor: "expression(alert(1))",
          descriptionColor: "javascript:alert(1)",
        },
        style: {
          ...(sectionDefaults.style ?? {}),
          backgroundColor: "url(javascript:alert(1))",
          gradientFrom: "#ffffff",
          gradientTo: "javascript:alert(1)",
          borderColor: "expression(alert(1))",
          overlayColor: "url(javascript:alert(1))",
          overlayOpacity: 40,
        },
      }}
      variant="default"
    />
  );

  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("expression(");
  expect(html).not.toContain("url(javascript");
  expect(html).not.toContain("linear-gradient");
  expect(html).toContain("background-color:#000000");
  expect(html).toContain("border-color:var(--color-border)");
});

test("section renders only allowlisted color grammar in public inline styles", () => {
  const html = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        heading: {
          label: "Safe label",
          title: "Safe title",
          description: "Safe description",
          labelColor: "rgba(12, 24, 36, 0.8)",
          titleColor: "hsl(210, 50%, 40%)",
          descriptionColor: "currentColor",
        },
        style: {
          ...(sectionDefaults.style ?? {}),
          backgroundColor: "#112233",
          gradientFrom: "#ffffff",
          gradientTo: "var(--color-primary)",
          gradientAngle: 135,
          borderColor: "transparent",
          overlayColor: "inherit",
          overlayOpacity: 25,
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain("background-color:#112233");
  expect(html).toContain("linear-gradient(135deg, #ffffff, var(--color-primary))");
  expect(html).toContain("border-color:transparent");
  expect(html).toContain("background-color:inherit;opacity:0.25");
  expect(html).toContain("color:rgba(12, 24, 36, 0.8)");
  expect(html).toContain("color:hsl(210, 50%, 40%)");
  expect(html).toContain("color:currentColor");
});

test("section renders empty-region placeholders only in editor preview", () => {
  const publicHtml = renderToString(<SectionBlock data={sectionDefaults} variant="default" />);
  const previewHtml = renderToString(
    <SectionBlock
      data={sectionDefaults}
      variant="default"
      renderContext={{ mode: "editor-preview" }}
    />
  );

  expect(publicHtml).not.toContain("Empty region.");
  expect(previewHtml).toContain("Empty region.");
});

test("section region labels stay editor-only and instance-stable", () => {
  const updated = updateSectionRegionLabelData(
    {
      regions: [
        { id: "1", label: "Primary hero" },
        { id: "3", label: "Legacy orphan" },
      ],
    },
    "region:2",
    " Supporting proof "
  );
  expect(updated).toEqual({
    regions: [
      { id: "1", label: "Primary hero" },
      { id: "3", label: "Legacy orphan" },
      { id: "2", label: "Supporting proof" },
    ],
  });

  const synced = syncSectionRegionDataWithSlotMap(updated, {
    "region:1": [],
    "region:2": [],
  });
  expect(synced).toEqual({
    regions: [
      { id: "1", label: "Primary hero" },
      { id: "2", label: "Supporting proof" },
    ],
  });

  const relabeled = applySectionRegionLabels(
    [
      {
        definitionId: "region",
        slotId: "region:1",
        label: "Region 1",
        kind: "repeatable" as const,
        instanceId: "1",
      },
      {
        definitionId: "region",
        slotId: "region:2",
        label: "Region 2",
        kind: "repeatable" as const,
        instanceId: "2",
      },
    ],
    synced
  );
  expect(relabeled.map((target) => target.label)).toEqual(["Primary hero", "Supporting proof"]);
  expect(resolveSectionRegionLabelValue(synced, "region:2")).toBe("Supporting proof");
  expect(resolveSectionRegionLabelValue(synced, "region:4")).toBe("");

  const cleared = updateSectionRegionLabelData(synced, "region:1", "   ");
  expect(cleared).toEqual({
    regions: [{ id: "2", label: "Supporting proof" }],
  });

  const publicHtml = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        regions: synced.regions,
      }}
      variant="default"
    />
  );
  expect(publicHtml).not.toContain("Primary hero");
  expect(publicHtml).not.toContain("Supporting proof");
});

test("section normalization keeps deterministic style and layout bounds", () => {
  const normalized = normalizeSectionData({
    regions: [
      { id: "region:1", label: " Primary hero " },
      { id: "2", label: " Supporting proof " },
      { id: "main:3", label: "Wrong slot" },
      { id: "2", label: " Proof corrected " },
    ],
    heading: {
      level: "banner" as never,
      align: "middle" as never,
      labelSize: "tiny" as never,
      titleSize: "giant" as never,
      descriptionSize: "body" as never,
      labelColor: "   ",
      titleColor: " var(--color-primary) ",
      descriptionColor: " #334155 ",
    },
    layout: {
      mobilePaddingBlock: "giant" as never,
      mobilePaddingInline: "wide" as never,
      desktopPaddingBlock: "huge" as never,
      desktopPaddingInline: "roomy" as never,
      minHeight: "giant" as never,
      regionFlow: "broken" as never,
      regionColumns: "12" as never,
      headingGap: "huge" as never,
      regionGap: "wild" as never,
    },
    style: {
      gradientAngle: 500,
      overlayOpacity: 120,
      borderWidth: "2",
      radius: "xl",
      shadow: "massive" as never,
      motion: "bounce" as never,
      backgroundMedia: {
        type: "video",
        source: "library",
        assetId: "asset-video",
        src: "javascript:alert(1)",
        posterSource: "external",
        posterAssetId: "poster-asset",
        posterSrc: "/media/section-poster.jpg",
        title: " Ambient demo ",
        description: " Decorative loop ",
        fit: "stretch" as never,
        position: "corner" as never,
        opacity: 180,
        blendMode: "hard-light" as never,
        layerOrder: "content-first" as never,
      },
    },
  });

  expect(normalized.regions).toEqual([
    { id: "1", label: "Primary hero" },
    { id: "2", label: "Proof corrected" },
  ]);
  expect(normalized.heading).toMatchObject({
    level: "h2",
    align: "left",
    labelSize: "xs",
    titleSize: "2xl",
    descriptionSize: "sm",
    labelColor: undefined,
    titleColor: "var(--color-primary)",
    descriptionColor: "#334155",
  });
  expect(normalized.layout).toMatchObject({
    minHeight: "none",
    regionFlow: "stack",
    regionColumns: "1",
    headingGap: "md",
  });
  expect(normalized.layout?.mobilePaddingBlock).toBeUndefined();
  expect(normalized.layout?.mobilePaddingInline).toBeUndefined();
  expect(normalized.layout?.desktopPaddingBlock).toBeUndefined();
  expect(normalized.layout?.desktopPaddingInline).toBeUndefined();
  expect(normalized.layout?.regionGap).toBeUndefined();
  expect(normalized.style?.gradientAngle).toBe(360);
  expect(normalized.style?.overlayOpacity).toBe(100);
  expect(normalized.style?.borderWidth).toBe("2");
  expect(normalized.style?.radius).toBe("xl");
  expect(normalized.style?.shadow).toBeUndefined();
  expect(normalized.style?.motion).toBe("none");
  expect(normalized.style?.backgroundMedia).toMatchObject({
    type: "video",
    source: "library",
    assetId: "asset-video",
    src: "javascript:alert(1)",
    posterSource: "external",
    posterAssetId: undefined,
    posterSrc: "/media/section-poster.jpg",
    title: "Ambient demo",
    description: "Decorative loop",
    fit: "cover",
    position: "center",
    opacity: 100,
    blendMode: "normal",
    layerOrder: "media-under-overlay",
  });
  expect(resolveSectionVariant("unknown")).toBe("default");
});

test("section normalization falls back to declared border and radius defaults for invalid values", () => {
  const invalid = normalizeSectionData({
    style: {
      borderWidth: "9" as never,
      radius: "round" as never,
    },
  });
  const explicit = normalizeSectionData({
    style: {
      borderWidth: "1",
      radius: "2xl",
    },
  });

  expect(invalid.style).toMatchObject({
    borderWidth: "0",
    radius: "none",
  });
  expect(explicit.style).toMatchObject({
    borderWidth: "1",
    radius: "2xl",
  });
});

test("section background media defaults sparse media payloads to the Media Library source", () => {
  const normalized = normalizeSectionData({
    style: {
      backgroundMedia: {
        type: "image",
      },
    },
  });

  expect(normalized.style?.backgroundMedia).toMatchObject({
    type: "image",
    source: "library",
  });
});

test("section grid columns clamp only when grid flow is active", () => {
  const gridNormalized = normalizeSectionData({
    layout: {
      regionFlow: "grid",
      regionColumns: "12" as never,
      regionGap: "xl",
    },
  });
  const rowNormalized = normalizeSectionData({
    layout: {
      regionFlow: "row",
      regionColumns: "6" as never,
    },
  });

  expect(gridNormalized.layout).toMatchObject({
    regionFlow: "grid",
    regionColumns: "8",
    regionGap: "xl",
  });
  expect(rowNormalized.layout).toMatchObject({
    regionFlow: "row",
    regionColumns: "1",
  });
});

test("section validator accepts expanded model", () => {
  clearWidgets();
  const widget = createSectionWidget({
    wizard: StubSectionEditor,
    visual: StubSectionEditor,
    advanced: StubSectionEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "section-1",
      type: "section",
      variant: "contained",
      data: {
        regions: [
          { id: "1", label: "Primary hero" },
          { id: "2", label: "Supporting proof" },
        ],
        heading: {
          label: "Landing",
          title: "Conversion section",
          description: "Reusable region container",
          level: "h3",
          align: "center",
          labelSize: "sm",
          titleSize: "3xl",
          descriptionSize: "lg",
          labelColor: "#475569",
          titleColor: "var(--color-primary)",
          descriptionColor: "#334155",
        },
        semantics: {
          element: "section",
          anchorId: "conversion",
          ariaLabel: "Conversion section",
        },
        layout: {
          containerWidth: "wide",
          maxWidth: "7xl",
          paddingBlock: "lg",
          paddingInline: "lg",
          mobilePaddingBlock: "sm",
          mobilePaddingInline: "none",
          desktopPaddingBlock: "xl",
          desktopPaddingInline: "md",
          minHeight: "hero",
          regionFlow: "grid",
          regionColumns: "4",
          headingGap: "lg",
          regionGap: "xl",
        },
        style: {
          backgroundColor: "#ffffff",
          gradientFrom: "#ffffff",
          gradientTo: "#f8fafc",
          gradientAngle: 135,
          borderColor: "#cbd5e1",
          borderWidth: "1",
          radius: "2xl",
          shadow: "lg",
          motion: "fade",
          overlayColor: "#000000",
          overlayOpacity: 16,
          backgroundMedia: {
            type: "image",
            source: "library",
            assetId: "asset-image",
            src: "/media/section-background.jpg",
            fit: "contain",
            position: "top",
            opacity: 75,
            blendMode: "overlay",
            layerOrder: "overlay-under-media",
          },
        },
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("section validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createSectionWidget({
      wizard: StubSectionEditor,
      visual: StubSectionEditor,
      advanced: StubSectionEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "section-2",
      type: "section",
      variant: "bad",
      data: sectionDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("section validator rejects invalid enum payloads before renderer fallback", () => {
  clearWidgets();
  registerWidget(
    createSectionWidget({
      wizard: StubSectionEditor,
      visual: StubSectionEditor,
      advanced: StubSectionEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "section-invalid-enums",
      type: "section",
      variant: "default",
      data: {
        heading: {
          level: "h8",
        },
        style: {
          borderWidth: "9",
          radius: "circle",
        },
      },
    })
  ).toThrow("widget_schema_invalid");
});

test("section renders region flow, min-height, and explicit gap classes", () => {
  const html = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        heading: {
          title: "Grid section",
        },
        layout: {
          ...(sectionDefaults.layout ?? {}),
          minHeight: "hero",
          regionFlow: "grid",
          regionColumns: "4",
          headingGap: "lg",
          regionGap: "xl",
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain('data-section-min-height="hero"');
  expect(html).toContain('data-section-region-flow="grid"');
  expect(html).toContain('data-section-region-columns="4"');
  expect(html).toContain('data-section-heading-gap="lg"');
  expect(html).toContain('data-section-region-gap="xl"');
  expect(html).toContain("min-h-[70vh]");
  expect(html).toContain("grid grid-cols-1");
  expect(html).toContain("md:grid-cols-2 xl:grid-cols-4");
  expect(html).toContain("gap-6");
  expect(html).toContain("gap-8");
});

test("section renders row flow without forcing grid classes", () => {
  const html = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        layout: {
          ...(sectionDefaults.layout ?? {}),
          regionFlow: "row",
          regionGap: "lg",
        },
      }}
      variant="contained"
    />
  );

  expect(html).toContain('data-section-region-flow="row"');
  expect(html).toContain("md:flex-row md:flex-wrap");
  expect(html).toContain("md:min-w-[16rem] md:flex-1");
  expect(html).not.toContain("md:grid-cols-2 xl:grid-cols-4");
});

test("section restores base padding from md upward when only mobile overrides are set", () => {
  const html = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        layout: {
          ...(sectionDefaults.layout ?? {}),
          paddingBlock: "xl",
          paddingInline: "lg",
          mobilePaddingBlock: "sm",
          mobilePaddingInline: "none",
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain("py-4");
  expect(html).toContain("md:py-10");
  expect(html).toContain("px-0");
  expect(html).toContain("md:px-8");
});

test("section applies desktop padding overrides without widening full bleed wrappers", () => {
  const html = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        layout: {
          ...(sectionDefaults.layout ?? {}),
          containerWidth: "full",
          paddingBlock: "md",
          paddingInline: "lg",
          desktopPaddingBlock: "xl",
          desktopPaddingInline: "none",
        },
      }}
      variant="bleed"
    />
  );

  expect(html).toContain("py-6");
  expect(html).toContain("md:py-10");
  expect(html).not.toContain("px-8");
  expect(html).not.toContain("md:px-0");
});

test("section renders legacy contained shadow fallback and bounded motion classes", () => {
  const legacyContainedHtml = renderToString(
    <SectionBlock data={sectionDefaults} variant="contained" />
  );
  const explicitHtml = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        style: {
          ...(sectionDefaults.style ?? {}),
          shadow: "xl",
          motion: "slide-up",
        },
      }}
      variant="contained"
    />
  );

  expect(legacyContainedHtml).toContain('data-section-shadow="sm"');
  expect(legacyContainedHtml).toContain('data-section-motion="none"');
  expect(legacyContainedHtml).toContain("shadow-sm");
  expect(explicitHtml).toContain('data-section-shadow="xl"');
  expect(explicitHtml).toContain('data-section-motion="slide-up"');
  expect(explicitHtml).toContain("shadow-xl");
  expect(explicitHtml).toContain("motion-safe:slide-in-from-bottom-2");
});

test("section renders decorative background image layers with bounded blend and ordering", () => {
  const html = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        style: {
          ...(sectionDefaults.style ?? {}),
          backgroundMedia: {
            type: "image",
            source: "library",
            assetId: "asset-image",
            src: "/media/section-background.jpg",
            fit: "contain",
            position: "top",
            opacity: 40,
            blendMode: "overlay",
            layerOrder: "overlay-under-media",
          },
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain('data-section-background-media="image"');
  expect(html).toContain('data-section-layer-order="overlay-under-media"');
  expect(html).toContain("background-image:url(/media/section-background.jpg)");
  expect(html).toContain("background-size:contain");
  expect(html).toContain("background-position:top center");
  expect(html).toContain("mix-blend-mode:overlay");
  expect(html).toContain("opacity:0.4");
});

test("section renders muted decorative background videos and fails closed on unsafe URLs", () => {
  const safeHtml = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        style: {
          ...(sectionDefaults.style ?? {}),
          backgroundMedia: {
            type: "video",
            source: "external",
            src: "https://cdn.example.com/section-demo.mp4",
            posterSource: "external",
            posterSrc: "/media/section-poster.jpg",
            opacity: 55,
            blendMode: "screen",
          },
        },
      }}
      variant="contained"
    />
  );

  expect(safeHtml).toContain('data-section-background-media="video"');
  expect(safeHtml).toContain("<video");
  expect(safeHtml).toContain('aria-hidden="true"');
  expect(safeHtml).toContain("playsInline");
  expect(safeHtml).toContain('poster="/media/section-poster.jpg"');
  expect(safeHtml).toContain("mix-blend-mode:screen");
  expect(safeHtml).toContain("opacity:0.55");

  const unsafeHtml = renderToString(
    <SectionBlock
      data={{
        ...sectionDefaults,
        style: {
          ...(sectionDefaults.style ?? {}),
          backgroundMedia: {
            type: "video",
            source: "external",
            src: "javascript:alert(1)",
          },
        },
      }}
      variant="contained"
    />
  );

  expect(unsafeHtml).toContain('data-section-background-media="none"');
  expect(unsafeHtml).not.toContain("<video");
});

test("section renders repeatable region slot content", () => {
  clearWidgets();
  registerWidget(
    createSectionWidget({
      wizard: StubSectionEditor,
      visual: StubSectionEditor,
      advanced: StubSectionEditor,
    })
  );
  registerWidget(
    createHeroWidget({
      wizard: StubHeroEditor,
      visual: StubHeroEditor,
      advanced: StubHeroEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "section-parent",
        type: "section",
        variant: "default",
        data: {
          heading: { title: "Parent section" },
        },
        slots: {
          "region:1": [
            {
              id: "hero-child",
              type: "hero",
              variant: "centered",
              data: {
                ...heroDefaults,
                headline: "Nested child",
              },
            },
          ],
          "region:2": [],
        },
      }}
    />
  );

  expect(html).toContain("Parent section");
  expect(html).toContain("Nested child");
  expect(html).toContain('data-section-region="region:1"');
  expect(html).toContain('data-section-region="region:2"');
});

test("section keeps sticky navigation content outside the old clipping wrapper", () => {
  clearWidgets();
  registerWidget(
    createSectionWidget({
      wizard: StubSectionEditor,
      visual: StubSectionEditor,
      advanced: StubSectionEditor,
    })
  );
  registerWidget(
    createNavigationWidget({
      wizard: StubNavigationEditor,
      visual: StubNavigationEditor,
      advanced: StubNavigationEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "section-navigation",
        type: "section",
        variant: "contained",
        data: {
          ...sectionDefaults,
          heading: { title: "Sticky section" },
          style: {
            ...sectionDefaults.style,
            backgroundColor: "#ffffff",
            borderWidth: "1",
            radius: "xl",
            overlayOpacity: 12,
          },
        },
        slots: {
          "region:1": [
            {
              id: "navigation-child",
              type: "navigation",
              variant: "simple",
              data: {
                ...navigationDefaults,
                behavior: {
                  ...navigationDefaults.behavior,
                  sticky: true,
                },
              },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("sticky top-0 z-40");
  expect(html).toContain("absolute inset-0 overflow-hidden");
  expect(html).not.toContain("relative w-full overflow-hidden");
});

test("section editors render expected sections", () => {
  const wizardHtml = renderToString(
    <SectionWizardEditor
      value={sectionDefaults}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).not.toContain("Quick preset");
  expect(wizardHtml).toContain("Section layout");
  expect(wizardHtml).toContain("Section setup");
  expect(wizardHtml).toContain("Wizard is one-time starter setup");
  expect(wizardHtml).not.toContain('data-widget-control="section.wizard.preset"');
  expect(wizardHtml).toContain('data-widget-control="section.wizard.variant"');
  expect(wizardHtml).toContain('data-widget-control-readonly="true"');
  expect(wizardHtml).not.toContain('tabindex="-1"');

  const visualHtml = renderToString(
    <SectionVisualEditor
      value={sectionDefaults}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and structure");
  expect(visualHtml).toContain("Quick presets");
  expect(visualHtml).toContain("Section link and accessibility");
  expect(visualHtml).toContain("Width and spacing");
  expect(visualHtml).toContain("Surface and borders");
  expect(visualHtml).toContain("Mobile vertical padding");
  expect(visualHtml).toContain("Desktop side padding");
  expect(visualHtml).toContain("Surface preview");
  expect(visualHtml).toContain('data-section-surface-preview="true"');
  expect(visualHtml).toContain('data-widget-editor-section="section.visual.link-accessibility"');
  expect(visualHtml).toContain('data-widget-editor-section="section.width-spacing"');

  const advancedHtml = renderToString(
    <SectionAdvancedEditor
      value={sectionDefaults}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Technical tokens");
  expect(advancedHtml).toContain("Support diagnostics");
  expect(advancedHtml).not.toContain("<pre");
  expect(advancedHtml).not.toContain('tabindex="-1"');
  expect(advancedHtml).toContain("Gradient angle 180 degrees");
  expect(advancedHtml).toContain("overlay 0%");
});
