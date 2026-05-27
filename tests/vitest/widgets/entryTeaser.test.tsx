import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  EntryTeaserAdvancedEditor,
  EntryTeaserVisualEditor,
  EntryTeaserWizardEditor,
} from "../../../core/admin/ui/widgets/editors/EntryTeaserEditors";
import {
  EntryTeaserBlock,
  createEntryTeaserWidget,
  entryTeaserDefaults,
  normalizeEntryTeaserData,
  type EntryTeaserData,
} from "../../../core/widgets/core/entryTeaser";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<EntryTeaserData>> = () => null;

test("entry teaser renders source placeholder without content type", () => {
  const html = renderToString(<EntryTeaserBlock data={entryTeaserDefaults} variant="horizontal" />);

  expect(html).toContain("Select content type");
  expect(html).toContain('data-entry-teaser-state="missing-source"');
});

test("entry teaser renders listing placeholder when listing query is missing", () => {
  const html = renderToString(
    <EntryTeaserBlock
      data={normalizeEntryTeaserData({
        ...entryTeaserDefaults,
        source: {
          ...entryTeaserDefaults.source,
          mode: "listing",
          listingQueryId: "",
          listingTemplateId: "",
          contentTypeId: "",
          entryId: "",
        },
      })}
      variant="horizontal"
    />
  );

  expect(html).toContain("Select listing query");
  expect(html).toContain('data-entry-teaser-data-source-mode="listing"');
  expect(html).toContain('data-entry-teaser-state="missing-source"');
});

test("entry teaser renders resolved item and markers", () => {
  const html = renderToString(
    <EntryTeaserBlock
      variant="vertical"
      data={normalizeEntryTeaserData({
        ...entryTeaserDefaults,
        sourceMode: "manual",
        source: {
          contentTypeId: "blog-type-id",
          entryId: "entry-1",
        },
        section: {
          title: "Featured article",
          headingLevel: "h2",
        },
        title: {
          headingLevel: "h4",
        },
        media: {
          mode: "icon",
          aspect: "1:1",
          height: "sm",
          fit: "contain",
        },
        layout: {
          maxWidth: "xl",
        },
        fields: {
          ...entryTeaserDefaults.fields,
          tagLimit: 3,
        },
        cta: {
          label: "Open post",
          hrefMode: "auto",
        },
        resolved: {
          item: {
            id: "entry-1",
            title: "Quarterly update",
            href: "/blog/quarterly-update",
            excerpt: "Highlights from this quarter.",
            imageSrc: "https://cdn.example.com/logo.png",
            tags: ["news", "featured", "release", "ops"],
            status: "published",
            publishedAt: "2026-02-09T12:00:00.000Z",
          },
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-09T12:01:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Featured article");
  expect(html).toContain("Quarterly update");
  expect(html).toContain("Open post");
  expect(html).toContain("max-w-6xl");
  expect(html).toContain('data-entry-teaser-media-mode="icon"');
  expect(html).toContain('width="360"');
  expect(html).toContain('height="360"');
  expect(html).toContain("object-contain");
  expect(html).toContain("<h2");
  expect(html).toContain("Featured article</h2>");
  expect(html).toContain("<h4");
  expect(html).toContain("Quarterly update</h4>");
  expect(html).toContain("release");
  expect(html).not.toContain("ops");
  expect(html).toContain('data-entry-teaser-variant="vertical"');
  expect(html).toContain('data-entry-teaser-source-mode="manual"');
  expect(html).toContain('data-entry-teaser-state="ready"');
});

test("entry teaser preserves none spacing and radius tokens", () => {
  const normalized = normalizeEntryTeaserData({
    ...entryTeaserDefaults,
    sourceMode: "manual",
    source: {
      contentTypeId: "blog-type-id",
      entryId: "entry-1",
    },
    style: {
      ...entryTeaserDefaults.style,
      spacing: "none",
      radius: "none",
    },
    resolved: {
      item: {
        id: "entry-1",
        title: "Quarterly update",
        href: "/blog/quarterly-update",
        excerpt: "Highlights from this quarter.",
        status: "published",
      },
      sourceTypeId: "blog-type-id",
      sourceTypeSlug: "blog",
      resolvedAt: "2026-02-09T12:01:00.000Z",
    },
  });

  expect(normalized.style).toMatchObject({
    spacing: "none",
    radius: "none",
  });
  const html = renderToString(<EntryTeaserBlock data={normalized} variant="vertical" />);
  expect(html).toContain("gap-0");
  expect(html).not.toContain("rounded-lg");
});

test("entry teaser cleared surface omits card background and border color styles", () => {
  const normalized = normalizeEntryTeaserData({
    ...entryTeaserDefaults,
    sourceMode: "manual",
    source: {
      contentTypeId: "blog-type-id",
      entryId: "entry-1",
    },
    style: {},
    resolved: {
      item: {
        id: "entry-1",
        title: "Quarterly update",
        href: "/blog/quarterly-update",
        excerpt: "Highlights from this quarter.",
        status: "published",
      },
      sourceTypeId: "blog-type-id",
      sourceTypeSlug: "blog",
      resolvedAt: "2026-02-09T12:01:00.000Z",
    },
  });
  const html = renderToString(<EntryTeaserBlock data={normalized} variant="vertical" />);

  expect(normalized.style?.surface).toBeUndefined();
  expect(normalized.style?.border).toBeUndefined();
  expect(html).toContain('data-entry-teaser-state="ready"');
  expect(html).not.toContain("background-color:");
  expect(html).not.toContain("border-color:");
});

test("entry teaser custom CTA sanitizes unsafe hrefs", () => {
  const normalized = normalizeEntryTeaserData({
    ...entryTeaserDefaults,
    cta: {
      label: "Read more",
      hrefMode: "custom",
      href: "javascript:alert(1)",
    },
  });

  expect(normalized.cta?.href).toBe("");
});

test("entry teaser CTA uses safe target rel output and outline style", () => {
  const html = renderToString(
    <EntryTeaserBlock
      variant="vertical"
      data={normalizeEntryTeaserData({
        ...entryTeaserDefaults,
        sourceMode: "manual",
        source: {
          contentTypeId: "blog-type-id",
          entryId: "entry-1",
        },
        cta: {
          label: "Read more",
          hrefMode: "custom",
          href: "https://example.com/read-more",
          opensInNewTab: true,
          style: "outline",
        },
        resolved: {
          item: {
            id: "entry-1",
            title: "Quarterly update",
            href: "/blog/quarterly-update",
            status: "published",
          },
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-09T12:01:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain("rounded-md border");
});

test("entry teaser validator accepts extended model and visual ownership", () => {
  clearWidgets();
  const widget = createEntryTeaserWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "entry-teaser-1",
      type: "entry-teaser",
      variant: "minimal",
      data: {
        ...entryTeaserDefaults,
        sourceMode: "featured",
        source: {
          contentTypeId: "blog-type-id",
          entryId: "",
        },
        fallback: {
          title: "Nothing to show",
          description: "Try another source mode",
          fallbackToLatest: true,
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("entry teaser validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createEntryTeaserWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "entry-teaser-2",
      type: "entry-teaser",
      variant: "unknown",
      data: entryTeaserDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("entry teaser editors render expected sections", () => {
  const wizardHtml = renderToString(
    <EntryTeaserWizardEditor
      value={entryTeaserDefaults}
      onChange={() => undefined}
      variant="horizontal"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Source mode");
  expect(wizardHtml).not.toContain("Variant");
  expect(wizardHtml).not.toContain('data-variant-thumbnail="horizontal"');

  const visualHtml = renderToString(
    <EntryTeaserVisualEditor
      value={entryTeaserDefaults}
      onChange={() => undefined}
      variant="horizontal"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and structure");
  expect(visualHtml).toContain("Section context");
  expect(visualHtml).toContain("Source summary");
  expect(visualHtml).toContain("Layout and media");
  expect(visualHtml).toContain("Style");
  expect(visualHtml).toContain("CTA behavior");
  expect(visualHtml).toContain("Fallback state");

  const advancedHtml = renderToString(
    <EntryTeaserAdvancedEditor
      value={entryTeaserDefaults}
      onChange={() => undefined}
      variant="horizontal"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Source diagnostics");
  expect(advancedHtml).toContain("Presentation diagnostics");
  expect(advancedHtml).toContain("Runtime summary");
  expect(advancedHtml).toContain("Contract summary");
  expect(advancedHtml).toContain("Advanced mode is read-only.");
  expect(advancedHtml).toContain(
    'data-widget-editor-section="entry-teaser.advanced.contract-summary"'
  );
  expect(advancedHtml).not.toContain("<select");
  expect(advancedHtml).not.toContain("<input");
  expect(advancedHtml).not.toContain("<textarea");
});

test("entry teaser normalization keeps deterministic fallback defaults", () => {
  const normalized = normalizeEntryTeaserData({
    sourceMode: "featured",
    source: {
      contentTypeId: "blog-type-id",
    },
    cta: {
      hrefMode: "custom",
      href: "",
    },
  });

  expect(normalized.sourceMode).toBe("featured");
  expect(normalized.fallback?.fallbackToLatest).toBe(true);
  expect(normalized.cta?.hrefMode).toBe("custom");
  expect(normalized.fields?.tagLimit).toBe(5);
  expect(normalized.section?.headingLevel).toBe("h2");
  expect(normalized.title?.headingLevel).toBe("h3");
  expect(normalized.media?.height).toBe("auto");
  expect(normalized.layout?.maxWidth).toBe("lg");
  expect(normalized.style?.radius).toBe("lg");
});

test("entry teaser normalization clamps editor-facing copy lengths", () => {
  const normalized = normalizeEntryTeaserData({
    cta: {
      label: "Read the complete launch announcement today",
      hrefMode: "auto",
    },
    fallback: {
      title: "This fallback title is intentionally longer than the configured editor limit",
      description: "x".repeat(240),
    },
  });

  expect(normalized.cta?.label).toHaveLength(32);
  expect(normalized.fallback?.title).toHaveLength(60);
  expect(normalized.fallback?.description).toHaveLength(200);
});

test("entry teaser render falls back to horizontal for unknown variant intentionally", () => {
  const html = renderToString(
    <EntryTeaserBlock data={entryTeaserDefaults} variant="legacy-variant" />
  );

  expect(html).toContain('data-entry-teaser-variant="horizontal"');
});

test("entry teaser keeps backward compatibility for source.mode", () => {
  const listingCompatible = normalizeEntryTeaserData({
    source: {
      listingQueryId: "listing-query-legacy",
      contentTypeId: "blog-type-id",
      entryId: "",
    },
  });
  expect(listingCompatible.source?.mode).toBe("listing");

  const legacyCompatible = normalizeEntryTeaserData({
    source: {
      contentTypeId: "blog-type-id",
      entryId: "",
    },
  });
  expect(legacyCompatible.source?.mode).toBe("legacy");
});
