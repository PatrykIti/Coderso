import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  TestimonialsAdvancedEditor,
  TestimonialsVisualEditor,
  TestimonialsWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TestimonialsEditors";
import {
  createTestimonialsWidget,
  normalizeTestimonialsCount,
  normalizeTestimonialsData,
  normalizeTestimonialsItems,
  testimonialsDefaults,
  TestimonialsBlock,
  type TestimonialsData,
} from "../../../core/widgets/core/testimonials";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<TestimonialsData>> = () => null;

test("testimonials renders defaults", () => {
  const html = renderToString(<TestimonialsBlock data={testimonialsDefaults} variant="grid" />);

  expect(html).toContain(testimonialsDefaults.header?.title ?? "");
  expect(html).toContain('data-testimonials-variant="grid"');
  expect(html).toContain('data-testimonials-count="3"');
});

test("testimonials normalization keeps deterministic ids and clamps ratings", () => {
  const items = normalizeTestimonialsItems(
    [
      { id: "same", quote: "", author: "", rating: 9 },
      { id: "same", quote: "Second", author: "Author", rating: -2 },
    ],
    2
  );

  expect(items).toHaveLength(2);
  expect(items[0]?.id).toBe("same");
  expect(items[1]?.id).toBe("testimonial-2");
  expect(items[0]?.rating).toBe(5);
  expect(items[1]?.rating).toBe(0);
  expect(items[0]?.quote).toBeTruthy();
  expect(items[0]?.author).toBeTruthy();
  expect(normalizeTestimonialsCount(99)).toBe(8);
  expect(normalizeTestimonialsCount(0)).toBe(2);

  const normalized = normalizeTestimonialsData({ testimonials: [] });
  expect(normalized.testimonials).toHaveLength(3);
  expect(normalized.style?.spacing).toBe("md");
});

test("testimonials validator accepts expanded model", () => {
  clearWidgets();
  const widget = createTestimonialsWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "testimonials-1",
      type: "testimonials",
      variant: "spotlight",
      data: {
        header: {
          eyebrow: "Proof",
          title: "Teams trust this workflow",
          description: "Social proof block",
        },
        testimonials: [
          {
            id: "t-1",
            quote: "Excellent experience.",
            author: "Alice",
            role: "Founder",
            avatar: "https://cdn.example.com/a.jpg",
            rating: 5,
            sourceLabel: "Acme",
          },
          {
            id: "t-2",
            quote: "Great speed and clarity.",
            author: "Bob",
            role: "Marketing Lead",
            rating: 4,
            sourceLabel: "North Labs",
          },
        ],
        style: {
          cardSurface: "#ffffff",
          cardBorder: "#cbd5e1",
          textColor: "#0f172a",
          accentColor: "#1d4ed8",
          spacing: "lg",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("testimonials cleared card surfaces omit background and border color styles", () => {
  const normalized = normalizeTestimonialsData({
    ...testimonialsDefaults,
    style: {},
  });
  const html = renderToString(<TestimonialsBlock data={normalized} variant="grid" />);

  expect(normalized.style?.cardSurface).toBeUndefined();
  expect(normalized.style?.cardBorder).toBeUndefined();
  expect(html).toContain('data-testimonials-variant="grid"');
  expect(html).not.toContain("background-color:");
  expect(html).not.toContain("border-color:");
});

test("testimonials validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createTestimonialsWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "testimonials-2",
      type: "testimonials",
      variant: "unknown",
      data: testimonialsDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("testimonials wizard renders onboarding fields", () => {
  const html = renderToString(
    <TestimonialsWizardEditor
      value={testimonialsDefaults}
      onChange={() => undefined}
      variant="grid"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Testimonials style");
  expect(html).toContain("Section title");
  expect(html).toContain("Testimonials count");
  expect(html).toContain("Initial testimonials");
});

test("testimonials visual renders section-based IA", () => {
  const html = renderToString(
    <TestimonialsVisualEditor
      value={testimonialsDefaults}
      onChange={() => undefined}
      variant="grid"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Testimonials content and ratings");
  expect(html).toContain("Colors and emphasis");
});

test("testimonials advanced keeps technical-only scope", () => {
  const html = renderToString(
    <TestimonialsAdvancedEditor
      value={testimonialsDefaults}
      onChange={() => undefined}
      variant="spotlight"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Display tokens");
  expect(html).toContain("Normalization and fallback");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Testimonials content and ratings");
});
