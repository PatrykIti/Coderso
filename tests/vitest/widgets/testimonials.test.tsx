import React from "react";
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

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
import {
  parseTestimonialsImport,
  serializeTestimonialsExport,
  TestimonialsImportError,
} from "../../../core/widgets/core/testimonialsImportExport";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";

const StubEditor: ComponentType<WidgetEditorProps<TestimonialsData>> = () => null;

test("testimonials renders defaults with the expanded section markers", () => {
  const html = renderToString(<TestimonialsBlock data={testimonialsDefaults} variant="grid" />);

  expect(html).toContain(testimonialsDefaults.header?.title ?? "");
  expect(html).toContain('data-testimonials-variant="grid"');
  expect(html).toContain('data-testimonials-count="3"');
  expect(html).toContain('data-testimonials-background-tone="plain"');
  expect(html).toContain('data-testimonials-rating-display="hide-empty"');
  expect(html).not.toContain('data-testimonials-cta="true"');
});

test("testimonials normalization keeps deterministic ids, clamps ratings, and raises the item cap to 24", () => {
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
  expect(normalizeTestimonialsCount(99)).toBe(24);
  expect(normalizeTestimonialsCount(0)).toBe(2);

  const normalized = normalizeTestimonialsData({ testimonials: [] });
  expect(normalized.testimonials).toHaveLength(3);
  expect(normalized.style?.spacing).toBe("md");
  expect(normalized.style?.textColor).toBeUndefined();
  expect(normalized.style?.accentColor).toBeUndefined();
  expect(normalized.layout?.spotlightItemId).toBe("testimonial-1");
});

test("testimonials validator accepts the expanded product model", () => {
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
            quoteHtml: "<p><strong>Excellent</strong> experience.</p>",
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
            rating: 0,
            sourceLabel: "North Labs",
          },
        ],
        cta: {
          enabled: true,
          label: "Read more stories",
          href: "/case-studies",
          target: "new-tab",
          style: "primary",
        },
        layout: {
          spotlightItemId: "t-2",
        },
        behavior: {
          sliderNavigation: "dots",
          ratingDisplay: "label-empty",
        },
        pagination: {
          mode: "load-more",
          pageSize: 3,
          loadMoreLabel: "More proof",
        },
        style: {
          sectionBackground: "#ffffff",
          sectionGradient: "soft",
          backgroundTone: "soft",
          backgroundImage: "/media/testimonials-bg.jpg",
          cardSurface: "#ffffff",
          cardBorder: "#cbd5e1",
          textColor: "#0f172a",
          accentColor: "#1d4ed8",
          spacing: "lg",
          headerAlign: "left",
          titleSize: "lg",
          cardRadius: "xl",
          cardBorderWidth: "md",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("testimonials spotlight keeps the selected item first and stale spotlight ids fall back to the first row", () => {
  const spotlightHtml = renderToString(
    <TestimonialsBlock
      variant="spotlight"
      data={{
        ...testimonialsDefaults,
        testimonials: [
          { id: "t-1", quote: "A", author: "Alice", rating: 5 },
          { id: "t-2", quote: "B", author: "Bob", rating: 5 },
          { id: "t-3", quote: "C", author: "Cara", rating: 5 },
        ],
        layout: { spotlightItemId: "t-2" },
      }}
    />
  );

  expect(spotlightHtml.indexOf("Bob")).toBeLessThan(spotlightHtml.indexOf("Alice"));
  expect(spotlightHtml).toContain('data-testimonial-highlighted="true"');

  const normalized = normalizeTestimonialsData({
    ...testimonialsDefaults,
    testimonials: [
      { id: "t-1", quote: "A", author: "Alice" },
      { id: "t-2", quote: "B", author: "Bob" },
    ],
    layout: { spotlightItemId: "missing" },
  });

  expect(normalized.layout?.spotlightItemId).toBe("t-1");
});

test("testimonials slider-static renders dot navigation and label-empty zero-rating semantics", () => {
  const html = renderToString(
    <TestimonialsBlock
      variant="slider-static"
      data={{
        ...testimonialsDefaults,
        testimonials: [
          { id: "t-1", quote: "Excellent experience.", author: "Alice", rating: 0 },
          { id: "t-2", quote: "Great speed.", author: "Bob", rating: 4 },
          { id: "t-3", quote: "Clear workflow.", author: "Cara", rating: 5 },
        ],
        behavior: {
          sliderNavigation: "dots",
          ratingDisplay: "label-empty",
        },
      }}
    />
  );

  expect(html).toContain('data-testimonials-slider-navigation="dots"');
  expect(html).toContain('data-testimonials-nav-dot="1"');
  expect(html).toContain('data-testimonials-nav-dot="2"');
  expect(html).toContain('data-testimonials-nav-dot="3"');
  expect(html).toContain('data-overflow-intentional="true"');
  expect(html).toContain('data-overflow-affordance="horizontal-scroll"');
  expect(html).toContain("Scroll horizontally to view more testimonials.");
  expect(html).toContain("No rating");
  expect(html).not.toContain("Rating 0 out of 5");
});

test("testimonials rating-display branches and disabled slider navigation stay truthful", () => {
  const hiddenHtml = renderToString(
    <TestimonialsBlock
      variant="slider-static"
      data={{
        ...testimonialsDefaults,
        testimonials: [
          { id: "t-1", quote: "Hidden rating", author: "Alice", rating: 0 },
          { id: "t-2", quote: "Visible rating", author: "Bob", rating: 5 },
        ],
        behavior: {
          sliderNavigation: "none",
          ratingDisplay: "hide-empty",
        },
      }}
    />
  );

  expect(hiddenHtml).toContain('data-testimonials-slider-navigation="none"');
  expect(hiddenHtml).not.toContain('data-testimonials-nav-dot="1"');
  expect(hiddenHtml).not.toContain("No rating");
  expect(hiddenHtml).not.toContain("Rating 0 out of 5");

  const starsHtml = renderToString(
    <TestimonialsBlock
      variant="slider-static"
      data={{
        ...testimonialsDefaults,
        testimonials: [
          { id: "t-1", quote: "Empty stars", author: "Alice", rating: 0 },
          { id: "t-2", quote: "Filled stars", author: "Bob", rating: 4 },
        ],
        behavior: {
          sliderNavigation: "none",
          ratingDisplay: "stars",
        },
      }}
    />
  );

  expect(starsHtml).toContain('data-testimonials-slider-navigation="none"');
  expect(starsHtml).not.toContain('data-testimonials-nav-dot="1"');
  expect(starsHtml).toContain("Rating 0 out of 5");
  expect(starsHtml).not.toContain("No rating");
});

test("testimonials rich quote and CTA render safely while unsafe hrefs fail closed", () => {
  const richHtml = renderToString(
    <TestimonialsBlock
      variant="grid"
      data={{
        ...testimonialsDefaults,
        testimonials: [
          {
            id: "t-1",
            quote: "Legacy fallback quote",
            quoteHtml:
              '<p><strong>Trusted</strong> by teams <a href="javascript:alert(1)">now</a></p><script>alert(1)</script>',
            author: "Alice",
            rating: 5,
          },
          testimonialsDefaults.testimonials[1]!,
          testimonialsDefaults.testimonials[2]!,
        ],
        cta: {
          enabled: true,
          label: "Read more stories",
          href: "/case-studies",
          target: "new-tab",
          style: "secondary",
        },
      }}
    />
  );

  expect(richHtml).toContain('data-testimonial-quote-mode="html"');
  expect(richHtml).toContain("<strong>Trusted</strong>");
  expect(richHtml).not.toContain("<script");
  expect(richHtml).toContain('href="#"');
  expect(richHtml).toContain('data-testimonials-cta="true"');
  expect(richHtml).toContain('href="/case-studies"');
  expect(richHtml).toContain('target="_blank"');

  const unsafeCtaHtml = renderToString(
    <TestimonialsBlock
      variant="grid"
      data={{
        ...testimonialsDefaults,
        cta: {
          enabled: true,
          label: "Unsafe",
          href: "javascript:alert(1)",
          target: "same-tab",
          style: "primary",
        },
      }}
    />
  );

  expect(unsafeCtaHtml).not.toContain('data-testimonials-cta="true"');
});

test("testimonials load-more rendering exposes SSR details and rejects unsafe avatar urls", () => {
  const html = renderToString(
    <TestimonialsBlock
      variant="grid"
      data={{
        ...testimonialsDefaults,
        testimonials: Array.from({ length: 7 }, (_, index) => ({
          id: `t-${index + 1}`,
          quote: `Quote ${index + 1}`,
          author: `Author ${index + 1}`,
          avatar:
            index === 0 ? "javascript:alert(1)" : index === 1 ? "/media/author-2.jpg" : undefined,
          rating: 5,
        })),
        pagination: {
          mode: "load-more",
          pageSize: 3,
          loadMoreLabel: "Load more testimonials",
        },
      }}
    />
  );

  expect(html).toContain('data-testimonials-pagination="load-more"');
  expect(html).toContain('data-testimonials-load-more="true"');
  expect(html).toContain("Load more testimonials");
  expect(html).not.toContain('src="javascript:alert(1)"');
  expect(html).toContain('src="/media/author-2.jpg"');
  expect(html).toContain('loading="lazy"');
});

test("testimonials import/export parses valid JSON and CSV rows and rejects unknown fields", () => {
  const jsonResult = parseTestimonialsImport(
    JSON.stringify([
      {
        quoteHtml: "<p><strong>Great</strong> support</p>",
        author: "Alex",
        rating: 4,
        sourceLabel: "Acme",
      },
      { quote: "Fast setup", author: "Riley", avatar: "/media/avatar.jpg" },
    ])
  );
  expect(jsonResult.format).toBe("json");
  expect(jsonResult.items).toHaveLength(2);
  expect(jsonResult.items[0]?.quote).toBe("Great support");
  expect(jsonResult.items[0]?.quoteHtml).toBe("<p><strong>Great</strong> support</p>");
  expect(jsonResult.items[0]?.sourceLabel).toBe("Acme");

  const csvResult = parseTestimonialsImport(
    [
      "id,quote,quoteHtml,author,role,avatar,rating,sourceLabel",
      't-1,"Great support",,Alex,Founder,/media/avatar.jpg,4,Acme',
      't-2,"Fast setup",,Riley,Marketing Lead,,5,North Labs',
    ].join("\n")
  );
  expect(csvResult.format).toBe("csv");
  expect(csvResult.items[0]?.id).toBe("t-1");
  expect(csvResult.items[1]?.author).toBe("Riley");

  const objectResult = parseTestimonialsImport(
    JSON.stringify({
      testimonials: [
        { quote: "Object import row", author: "Mina" },
        { quote: "Second object row", author: "Noah" },
      ],
    })
  );
  expect(objectResult.format).toBe("json");
  expect(objectResult.items[0]?.quote).toBe("Object import row");

  const truncatedResult = parseTestimonialsImport(
    JSON.stringify(
      Array.from({ length: 26 }, (_, index) => ({
        id: `row-${index + 1}`,
        quote: `Quote ${index + 1}`,
        author: `Author ${index + 1}`,
      }))
    )
  );
  expect(truncatedResult.items).toHaveLength(24);
  expect(truncatedResult.items[23]?.id).toBe("row-24");

  expect(() =>
    parseTestimonialsImport(JSON.stringify([{ quote: "Only one", author: "Alex" }]))
  ).toThrow(TestimonialsImportError);
  expect(() =>
    parseTestimonialsImport(
      JSON.stringify([
        { quoteHtml: "<p><em>Missing plain quote still works</em></p>", author: "Alex" },
        { quote: "", quoteHtml: "", author: "Riley" },
      ])
    )
  ).toThrow(TestimonialsImportError);
  expect(() =>
    parseTestimonialsImport(
      [
        "id,quote,quoteHtml,author,role,avatar,rating,sourceLabel,unexpected",
        't-1,"A",,Alex,Founder,,5,Acme,oops',
        't-2,"B",,Riley,Lead,,4,North,oops',
      ].join("\n")
    )
  ).toThrow(TestimonialsImportError);
  expect(() =>
    parseTestimonialsImport(
      JSON.stringify([{ quote: "Bad row", author: "Alex", unknownField: true }])
    )
  ).toThrow(TestimonialsImportError);
});

test("testimonials export serializes normalized JSON and formula-safe CSV", () => {
  const items = [
    {
      id: "row-1",
      quote: "=SUM(A1:A2)",
      author: "Alex",
      rating: 5,
      sourceLabel: 'Line "1"',
    },
  ];

  const json = serializeTestimonialsExport(items, "json");
  const csv = serializeTestimonialsExport(items, "csv");

  expect(json).toContain('"id": "row-1"');
  expect(json).toContain('"quote": "=SUM(A1:A2)"');
  expect(csv).toContain('"\'=SUM(A1:A2)"');
  expect(csv).toContain('"Line ""1"""');
  expect(csv.split("\n")).toHaveLength(2);
});

test("testimonials runtime markers keep style and shared accessibility baselines visible", () => {
  const html = renderToString(
    <TestimonialsBlock
      variant="slider-static"
      data={{
        ...testimonialsDefaults,
        testimonials: [
          { id: "t-1", quote: "A", author: "Alice", avatar: "/media/alice.jpg", rating: 5 },
          { id: "t-2", quote: "B", author: "Bob", rating: 4 },
          { id: "t-3", quote: "C", author: "Cara", rating: 3 },
        ],
        behavior: {
          sliderNavigation: "dots",
          ratingDisplay: "stars",
        },
        style: {
          ...testimonialsDefaults.style,
          sectionBackground: "#0f172a",
          sectionGradient: "warm",
          backgroundTone: "contrast",
          backgroundImage: "/media/testimonials-bg.jpg",
          cardSurface: "#111827",
          cardBorder: "#334155",
          textColor: "#e2e8f0",
          headerAlign: "right",
          titleSize: "lg",
          cardRadius: "xl",
          cardBorderWidth: "md",
        },
      }}
    />
  );

  expect(html).toContain('data-testimonials-header-align="right"');
  expect(html).toContain('data-testimonials-title-size="lg"');
  expect(html).toContain('data-testimonials-card-radius="xl"');
  expect(html).toContain('data-testimonials-card-border-width="md"');
  expect(html).toContain('data-testimonials-background-tone="contrast"');
  expect(html).toContain('data-testimonials-background-gradient="warm"');
  expect(html).toContain('data-testimonials-has-background-image="true"');
  expect(html).toContain("background-color:#0f172a");
  expect(html).toContain("background-image:linear-gradient");
  expect(html).toContain("border-color:#334155");
  expect(html).toContain("color:#e2e8f0");
  expect(html).toContain("snap-x snap-mandatory");
  expect(html).toContain('aria-labelledby="');
  expect(html).toContain('loading="lazy"');
});

test("testimonials avatar alt text includes available role and source context", () => {
  const html = renderToString(
    <TestimonialsBlock
      variant="grid"
      data={{
        ...testimonialsDefaults,
        testimonials: [
          {
            id: "t-1",
            quote: "A",
            author: "Alice",
            role: "Founder",
            sourceLabel: "North Labs",
            avatar: "/media/alice.jpg",
            rating: 5,
          },
        ],
      }}
    />
  );

  expect(html).toContain('alt="Photo of Alice, Founder, North Labs"');
  expect(html).toContain('loading="lazy"');
});

test("testimonials editors still render their expanded section labels in SSR smoke mode", () => {
  const wizardHtml = renderToString(
    <TestimonialsWizardEditor
      value={testimonialsDefaults}
      onChange={() => undefined}
      variant="grid"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Section copy");
  expect(wizardHtml).toContain("Testimonials count");
  expect(wizardHtml).toContain("Use Visual to write the section eyebrow");
  expect(wizardHtml).toContain("Visual owns testimonial style, count");
  expect(wizardHtml).toContain('data-widget-control-readonly="true"');

  const visualHtml = renderToString(
    <TestimonialsVisualEditor
      value={testimonialsDefaults}
      onChange={() => undefined}
      variant="grid"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Section surface and typography");
  expect(visualHtml).toContain("CTA and conversion follow-up");
  expect(visualHtml).toContain("Pagination and load more");

  const advancedHtml = renderToString(
    <TestimonialsAdvancedEditor
      value={testimonialsDefaults}
      onChange={() => undefined}
      variant="grid"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Runtime summary");
  expect(advancedHtml).toContain("Content health");
  expect(advancedHtml).not.toContain("Import and export");
  expect(advancedHtml).not.toContain("Raw payload snapshot");
});
