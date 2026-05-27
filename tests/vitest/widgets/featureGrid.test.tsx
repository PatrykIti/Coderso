import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
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
  const html = renderToString(<FeatureGridBlock data={featureGridDefaults} variant="cards-3" />);

  expect(html).toContain(featureGridDefaults.header?.title ?? "");
  expect(html).toContain('data-feature-grid-variant="cards-3"');
  expect(html).toContain('data-feature-grid-count="3"');
});

test("feature grid renders the author-defined item count instead of clamping to variant baseline", () => {
  const html = renderToString(
    <FeatureGridBlock
      variant="cards-3"
      data={{
        ...featureGridDefaults,
        items: [
          ...(featureGridDefaults.items ?? []),
          {
            id: "item-4",
            title: "Fourth feature",
            description: "Author-defined fourth card.",
          },
          {
            id: "item-5",
            title: "Fifth feature",
            description: "Author-defined fifth card.",
          },
        ],
      }}
    />
  );

  expect(html).toContain('data-feature-grid-count="5"');
  expect(html).toContain("Fourth feature");
  expect(html).toContain("Fifth feature");
});

test("feature grid cards-4 uses laptop-width four-column layout and explicit default resolvers", () => {
  const html = renderToString(
    <FeatureGridBlock
      data={{
        ...featureGridDefaults,
        style: {
          ...featureGridDefaults.style,
          columns: "4",
        },
      }}
      variant="cards-4"
    />
  );

  expect(html).toContain("lg:grid-cols-4");

  const normalized = normalizeFeatureGridData({
    ...featureGridDefaults,
    style: {
      ...featureGridDefaults.style,
      gap: "md",
      borderWidth: "1",
      radius: "lg",
    },
  });
  expect(normalized.style?.gap).toBe("md");
  expect(normalized.style?.borderWidth).toBe("1");
  expect(normalized.style?.radius).toBe("lg");
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
            imageAlt: "Feature media alt",
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

test("feature grid cleared card surface omits background style", () => {
  const normalized = normalizeFeatureGridData({
    ...featureGridDefaults,
    style: {},
  });
  const html = renderToString(<FeatureGridBlock data={normalized} variant="cards-3" />);

  expect(normalized.style?.surfaceColor).toBeUndefined();
  expect(html).toContain('data-feature-grid-variant="cards-3"');
  expect(html).not.toContain("background-color:");
});

test("feature grid strips unsafe CTA hrefs from normalized items", () => {
  const normalized = normalizeFeatureGridData({
    ...featureGridDefaults,
    items: [
      {
        id: "feature-1",
        title: "Safe",
        ctaLabel: "Read more",
        ctaHref: "/safe",
      },
      {
        id: "feature-2",
        title: "Unsafe",
        ctaLabel: "Break out",
        ctaHref: "javascript:alert(1)",
      },
      {
        id: "feature-3",
        title: "Protocol relative",
        ctaLabel: "Docs",
        ctaHref: "//evil.example",
      },
    ],
  });

  expect(normalized.items?.[0]?.ctaHref).toBe("/safe");
  expect(normalized.items?.[1]?.ctaHref).toBe("javascript:alert(1)");
  expect(normalized.items?.[2]?.ctaHref).toBe("//evil.example");

  const html = renderToString(<FeatureGridBlock data={normalized} variant="cards-3" />);
  expect(html).toContain('href="/safe"');
  expect(html).not.toContain("javascript:alert");
  expect(html).not.toContain("//evil.example");
});

test("feature grid skips unsafe image URLs and hides decorative emoji output", () => {
  const html = renderToString(
    <FeatureGridBlock
      variant="cards-3"
      data={{
        ...featureGridDefaults,
        items: [
          {
            id: "feature-1",
            title: "Unsafe image fallback",
            image: "javascript:alert(1)",
            icon: "🛡️",
          },
          {
            id: "feature-2",
            title: "Safe image",
            image: "https://cdn.example.com/feature.jpg",
            imageAlt: "Readable alt",
          },
          {
            id: "feature-3",
            title: "Icon only",
            icon: "🚀",
          },
        ],
      }}
    />
  );

  expect(html).not.toContain("javascript:alert");
  expect(html).toContain('src="https://cdn.example.com/feature.jpg"');
  expect(html).toContain('alt="Readable alt"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain("🛡️");
});

test("feature grid renders expanded card and section style controls", () => {
  const html = renderToString(
    <FeatureGridBlock
      variant="cards-3"
      data={{
        ...featureGridDefaults,
        items: [
          {
            ...featureGridDefaults.items[0],
            image: "https://cdn.example.com/feature.jpg",
          },
          ...(featureGridDefaults.items.slice(1) ?? []),
        ],
        style: {
          ...featureGridDefaults.style,
          cardLayout: "horizontal",
          textAlign: "center",
          cardPadding: "spacious",
          mediaSize: "lg",
          maxWidth: "7xl",
          headerSize: "lg",
          cardTitleSize: "lg",
          hoverEffect: "lift",
          sectionBackground: "#f8fafc",
        },
      }}
    />
  );

  expect(html).toContain("max-w-7xl");
  expect(html).toContain("sm:flex-row");
  expect(html).toContain("text-center");
  expect(html).toContain("p-6");
  expect(html).toContain("w-full sm:h-40 sm:w-40");
  expect(html).toContain("text-3xl");
  expect(html).toContain("text-xl");
  expect(html).toContain("hover:-translate-y-1");
  expect(html).toContain("background-color:#f8fafc");
});

test("feature grid renders CTA target and sanitizes rich descriptions", () => {
  const html = renderToString(
    <FeatureGridBlock
      variant="cards-3"
      data={{
        ...featureGridDefaults,
        items: [
          {
            id: "feature-1",
            title: "Rich card",
            description: "<p><strong>Rich</strong><script>alert(1)</script> copy</p>",
            descriptionMode: "rich",
            ctaEnabled: true,
            ctaLabel: "Open",
            ctaHref: "https://example.com",
            ctaTarget: "new-tab",
          },
        ],
      }}
    />
  );

  expect(html).toContain("<strong>Rich</strong>");
  expect(html).not.toContain("<script>");
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
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
  expect(html).toContain("Cards count");
  expect(html).toContain("Wizard is one-time starter setup.");
  expect(html).toContain("Use Visual for card count, descriptions, media, CTA links");
  expect(html).toContain('data-widget-control-readonly="true"');
  expect(html).toContain('data-widget-control-ownership="action"');
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
  expect(html).toContain('data-widget-control="feature-grid-variant-preview-cards-3"');
  expect(html).toContain('data-widget-control="feature-grid-variant-preview-cards-4"');
  expect(html).toContain('data-widget-control="feature-grid-variant-preview-highlight-first"');
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

  expect(html).toContain("Layout summary");
  expect(html).toContain("Content summary");
  expect(html).toContain("Presentation summary");
  expect(html).toContain("Authoring boundaries");
  expect(html).not.toContain("Raw payload snapshot");
  expect(html).not.toContain("Normalize full payload");
  expect(html).not.toContain("<pre");
  expect(html).not.toContain('data-widget-control-ownership="writable"');
  expect(html).not.toContain("Feature cards and actions");
});
