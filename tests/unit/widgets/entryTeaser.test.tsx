import type { ComponentType } from "react";
import { expect, test } from "bun:test";
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
import { resolveEntryTeaserRuntimeData } from "../../../core/services/content/entryTeaserResolver";
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
            tags: ["news", "featured"],
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

  expect(html).toContain("Quarterly update");
  expect(html).toContain("Open post");
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

  expect(normalized.cta?.href).toBe("#");
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
  expect(wizardHtml).toContain("Variant");

  const visualHtml = renderToString(
    <EntryTeaserVisualEditor
      value={entryTeaserDefaults}
      onChange={() => undefined}
      variant="horizontal"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and structure");
  expect(visualHtml).toContain("Source configuration");
  expect(visualHtml).toContain("CTA behavior");

  const advancedHtml = renderToString(
    <EntryTeaserAdvancedEditor
      value={entryTeaserDefaults}
      onChange={() => undefined}
      variant="horizontal"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Style tokens");
  expect(advancedHtml).toContain("Fallback behavior");
  expect(advancedHtml).toContain("Runtime payload snapshot");
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
  expect(normalized.style?.radius).toBe("lg");
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

test("entry teaser listing mode resolves first listing item", async () => {
  const resolved = await resolveEntryTeaserRuntimeData(
    {
      ...entryTeaserDefaults,
      source: {
        ...entryTeaserDefaults.source,
        mode: "listing",
        listingQueryId: "listing-query-1",
        listingTemplateId: "listing-template-1",
      },
    },
    {
      preview: true,
      contentRoutes: [],
    },
    {
      getListingQueryById: async () => ({
        id: "listing-query-1",
        name: "Top entries",
        description: null,
        query: {
          source: "entries",
          sourceConfig: {
            contentTypeId: "type-1",
          },
          filters: [],
          sort: [{ field: "id", dir: "asc" }],
          pagination: { limit: 12, offset: 0 },
          fields: ["id", "title", "slug"],
        },
        createdAt: new Date("2026-02-18T12:00:00.000Z"),
        updatedAt: new Date("2026-02-18T12:00:00.000Z"),
      }),
      getListingTemplateById: async () => ({
        id: "listing-template-1",
        name: "Cards",
        slug: "cards",
        description: null,
        layout: "grid",
        config: {
          fields: [],
          itemActions: [],
          emptyState: {
            title: "No items",
            description: null,
            ctaLabel: null,
            ctaHref: null,
          },
          style: {
            columns: 3,
            gap: "md",
            cardVariant: "default",
          },
        },
        createdAt: new Date("2026-02-18T12:00:00.000Z"),
        updatedAt: new Date("2026-02-18T12:00:00.000Z"),
      }),
      executeListing: async () => ({
        source: "entries",
        total: 2,
        limit: 12,
        offset: 0,
        rows: [
          {
            id: "entry-1",
            title: "Engine diagnostics",
            slug: "engine-diagnostics",
            status: "published",
          },
          {
            id: "entry-2",
            title: "Bodywork",
            slug: "bodywork",
            status: "published",
          },
        ],
      }),
      getContentTypeById: async () => ({
        id: "type-1",
        name: "Entries",
        slug: "entries",
        status: "published",
        schema: { type: "object", additionalProperties: false, properties: {} },
        createdAt: new Date("2026-02-18T12:00:00.000Z"),
        updatedAt: new Date("2026-02-18T12:00:00.000Z"),
      }),
      getContentTypeBySlug: async () => null,
    }
  );

  expect(resolved.item?.title).toBe("Engine diagnostics");
  expect(resolved.item?.id).toBe("entry-1");
  expect(resolved.sourceTypeSlug).toBe("entries");
  expect(resolved.listingQueryId).toBe("listing-query-1");
});
