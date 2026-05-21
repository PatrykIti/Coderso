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
  createSectionWidget,
  normalizeSectionData,
  resolveSectionVariant,
  sectionDefaults,
  SectionBlock,
  type SectionData,
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

test("section normalization keeps deterministic style and layout bounds", () => {
  const normalized = normalizeSectionData({
    layout: {
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
    },
  });

  expect(normalized.layout).toMatchObject({
    minHeight: "none",
    regionFlow: "stack",
    regionColumns: "1",
    headingGap: "md",
  });
  expect(normalized.layout?.regionGap).toBeUndefined();
  expect(normalized.style?.gradientAngle).toBe(360);
  expect(normalized.style?.overlayOpacity).toBe(100);
  expect(normalized.style?.borderWidth).toBe("2");
  expect(normalized.style?.radius).toBe("xl");
  expect(resolveSectionVariant("unknown")).toBe("default");
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
        heading: {
          label: "Landing",
          title: "Conversion section",
          description: "Reusable region container",
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
          overlayColor: "#000000",
          overlayOpacity: 16,
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
  expect(wizardHtml).toContain("Section layout");
  expect(wizardHtml).toContain("Section title");
  expect(wizardHtml).toContain("Section setup");
  expect(wizardHtml).toContain('data-widget-control="section.wizard.variant"');

  const visualHtml = renderToString(
    <SectionVisualEditor
      value={sectionDefaults}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and structure");
  expect(visualHtml).toContain("Semantics and anchor");
  expect(visualHtml).toContain("Width and spacing");
  expect(visualHtml).toContain("Surface and borders");
  expect(visualHtml).toContain('data-widget-editor-section="section.semantics-anchor"');
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
  expect(advancedHtml).toContain("Raw payload snapshot");
});
