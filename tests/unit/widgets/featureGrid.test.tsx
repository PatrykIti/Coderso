import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  FeatureGridAdvancedEditor,
  FeatureGridVisualEditor,
  FeatureGridWizardEditor,
} from "../../../core/admin/ui/widgets/editors/FeatureGridEditors";
import {
  createFeatureGridWidget,
  featureGridDefaults,
  FeatureGridBlock,
  normalizeFeatureGridData,
  normalizeFeatureGridItemCount,
  normalizeFeatureGridItems,
  type FeatureGridData,
} from "../../../core/widgets/core/featureGrid";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<FeatureGridData>> = () => null;

test("feature grid renders defaults", () => {
  const html = renderToString(
    <FeatureGridBlock data={featureGridDefaults} variant="cards-3" />
  );

  expect(html).toContain(featureGridDefaults.header?.title ?? "");
  expect(html).toContain('data-feature-grid-variant="cards-3"');
  expect(html).toContain('data-feature-grid-count="3"');
});

test("feature grid normalization keeps deterministic count and unique ids", () => {
  const items = normalizeFeatureGridItems(
    [
      { id: "same", title: "" },
      { id: "same", title: "Second" },
    ],
    2
  );

  expect(items).toHaveLength(2);
  expect(items[0]?.id).toBe("same");
  expect(items[1]?.id).toBe("item-2");
  expect(items[0]?.title).toBe("Fast setup");
  expect(normalizeFeatureGridItemCount(99)).toBe(8);
  expect(normalizeFeatureGridItemCount(0)).toBe(1);

  const normalized = normalizeFeatureGridData({ items: [] });
  expect(normalized.items).toHaveLength(3);
  expect(normalized.style?.gap).toBe("md");
});

test("feature grid validator accepts expanded fields", () => {
  clearWidgets();
  const widget = createFeatureGridWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "feature-grid-1",
      type: "feature-grid",
      variant: "highlight-first",
      data: {
        header: {
          eyebrow: "Platform",
          title: "Build blocks faster",
          description: "Reusable cards with deterministic rendering.",
        },
        items: [
          {
            id: "feature-1",
            icon: "⚙️",
            title: "Composable",
            description: "Mix content and conversion sections.",
            ctaLabel: "Learn more",
            ctaHref: "/docs",
          },
          {
            id: "feature-2",
            image: "https://cdn.example.com/feature.jpg",
            title: "Media ready",
            description: "Image-first storytelling in cards.",
            ctaLabel: "View gallery",
            ctaHref: "/gallery",
          },
          {
            id: "feature-3",
            title: "Reliable",
          },
          {
            id: "feature-4",
            title: "Scalable",
          },
        ],
        style: {
          columns: "3",
          gap: "lg",
          surfaceColor: "#ffffff",
          borderColor: "#cbd5e1",
          borderWidth: "2",
          radius: "xl",
        },
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("feature grid validator rejects unsupported variant", () => {
  clearWidgets();
  registerWidget(
    createFeatureGridWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "feature-grid-2",
      type: "feature-grid",
      variant: "unknown",
      data: featureGridDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("feature grid wizard renders onboarding fields", () => {
  const html = renderToString(
    <FeatureGridWizardEditor
      value={featureGridDefaults}
      onChange={() => undefined}
      variant="cards-3"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Feature grid style");
  expect(html).toContain("Section title");
  expect(html).toContain("Cards count");
  expect(html).toContain("Basic card labels");
});

test("feature grid visual renders section-based IA", () => {
  const html = renderToString(
    <FeatureGridVisualEditor
      value={featureGridDefaults}
      onChange={() => undefined}
      variant="cards-3"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Feature cards and actions");
  expect(html).toContain("Colors and borders");
});

test("feature grid advanced keeps technical-only scope", () => {
  const html = renderToString(
    <FeatureGridAdvancedEditor
      value={featureGridDefaults}
      onChange={() => undefined}
      variant="cards-4"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Layout tokens");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Feature cards and actions");
});
