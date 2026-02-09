import type { ComponentType } from "react";
import { expect, test } from "bun:test";
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
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubSectionEditor: ComponentType<WidgetEditorProps<SectionData>> = () => null;
const StubHeroEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;

test("section renders defaults", () => {
  const html = renderToString(<SectionBlock data={sectionDefaults} variant="default" />);

  expect(html).toContain('data-section-variant="default"');
  expect(html).toContain('data-section-regions="1"');
  expect(html).toContain("Empty region.");
});

test("section normalization keeps deterministic style bounds", () => {
  const normalized = normalizeSectionData({
    style: {
      gradientAngle: 500,
      overlayOpacity: 120,
      borderWidth: "2",
      radius: "xl",
    },
  });

  expect(normalized.style?.gradientAngle).toBe(360);
  expect(normalized.style?.overlayOpacity).toBe(100);
  expect(normalized.style?.borderWidth).toBe("2");
  expect(normalized.style?.radius).toBe("xl");
  expect(resolveSectionVariant("unknown")).toBe("default");
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
  expect(wizardHtml).toContain("Regions are repeatable slots");

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
  expect(visualHtml).toContain("Surface and borders");

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
