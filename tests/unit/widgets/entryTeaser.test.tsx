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

test("entry teaser normalizes manual listing target defaults", () => {
  const normalized = normalizeEntryTeaserData({
    sourceMode: "manual",
    source: {
      mode: "listing",
      listingQueryId: "listing-query-1",
      listingManualTarget: {
        rowId: " row-2 ",
      },
    },
  });

  expect(normalized.source?.listingManualTarget).toEqual({
    rowId: " row-2 ",
    entryId: "",
  });
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

test("entry teaser listing mode prefers featured tagged items and can refuse fallback", async () => {
  const sharedDeps = {
    getListingQueryById: async () => ({
      id: "listing-query-1",
      name: "Top entries",
      description: null,
      query: {
        source: "entries" as const,
        sourceConfig: {
          contentTypeId: "type-1",
        },
        filters: [],
        sort: [{ field: "id", dir: "asc" as const }],
        pagination: { limit: 12, offset: 0 },
        fields: ["id", "title", "slug", "tags"],
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
  } satisfies Parameters<typeof resolveEntryTeaserRuntimeData>[2];

  const featuredResolved = await resolveEntryTeaserRuntimeData(
    {
      ...entryTeaserDefaults,
      sourceMode: "featured",
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
      ...sharedDeps,
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
            tags: ["news"],
          },
          {
            id: "entry-2",
            title: "Featured service note",
            slug: "featured-service-note",
            status: "published",
            tags: ["featured"],
          },
        ],
      }),
    }
  );

  expect(featuredResolved.item?.id).toBe("entry-2");
  expect(featuredResolved.item?.title).toBe("Featured service note");

  const noFallbackResolved = await resolveEntryTeaserRuntimeData(
    {
      ...entryTeaserDefaults,
      sourceMode: "featured",
      source: {
        ...entryTeaserDefaults.source,
        mode: "listing",
        listingQueryId: "listing-query-1",
        listingTemplateId: "listing-template-1",
      },
      fallback: {
        ...entryTeaserDefaults.fallback,
        fallbackToLatest: false,
      },
    },
    {
      preview: true,
      contentRoutes: [],
    },
    {
      ...sharedDeps,
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
            tags: ["news"],
          },
          {
            id: "entry-2",
            title: "Bodywork",
            slug: "bodywork",
            status: "published",
            tags: ["repair"],
          },
        ],
      }),
    }
  );

  expect(noFallbackResolved.item).toBeNull();
});

test("entry teaser listing manual mode resolves deterministic selected row", async () => {
  const resolved = await resolveEntryTeaserRuntimeData(
    {
      ...entryTeaserDefaults,
      sourceMode: "manual",
      source: {
        ...entryTeaserDefaults.source,
        mode: "listing",
        listingQueryId: "listing-query-1",
        listingTemplateId: "listing-template-1",
        listingManualTarget: {
          rowId: "entry-2",
          entryId: "entry-2",
        },
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

  expect(resolved.item?.id).toBe("entry-2");
  expect(resolved.item?.title).toBe("Bodywork");
});
