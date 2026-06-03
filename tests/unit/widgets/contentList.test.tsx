import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  ContentListAdvancedEditor,
  ContentListVisualEditor,
  ContentListWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ContentListEditors";
import {
  applyContentListRuntimeFilters,
  resolveContentListRuntimeData,
  sortContentListRuntimeEntries,
  type ContentListResolverEntry,
} from "../../../core/services/content/contentListResolver";
import {
  ContentListBlock,
  contentListEditorContract,
  contentListDefaults,
  createContentListWidget,
  normalizeContentListData,
  normalizeContentListLimit,
  type ContentListData,
} from "../../../core/widgets/core/contentList";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<ContentListData>> = () => null;

test("content list exposes a strict v2 editor contract", () => {
  const widget = createContentListWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });

  expect(widget.editorContract).toBe(contentListEditorContract);
  expect(validation.valid).toBe(true);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual([
    "content-list.wizard.source-binding",
    "content-list.wizard.source-rules",
    "content-list.visual.variant-layout",
    "content-list.visual.filters",
    "content-list.visual.section-context",
    "content-list.visual.pagination-actions",
    "content-list.visual.presentation-fields",
    "content-list.visual.surface-colors",
    "content-list.visual.empty-state",
    "content-list.advanced.source-summary",
    "content-list.advanced.style-summary",
    "content-list.advanced.runtime-summary",
  ]);
  expect(
    widget.editorContract?.sections
      .filter((section) => section.mode === "advanced")
      .flatMap((section) => section.writablePaths)
  ).toEqual([]);
});

const createEntry = (patch: Partial<ContentListResolverEntry>): ContentListResolverEntry => ({
  id: "entry-1",
  typeId: "type-1",
  title: "Entry title",
  slug: "entry-title",
  status: "published",
  tags: [],
  data: {},
  publishedAt: new Date("2026-02-07T10:00:00.000Z"),
  scheduledAt: null,
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  updatedAt: new Date("2026-02-07T10:00:00.000Z"),
  author: null,
  ...patch,
});

const contentTypeRecord = {
  id: "type-1",
  name: "Articles",
  slug: "articles",
  status: "published",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  createdAt: new Date("2026-02-18T12:00:00.000Z"),
  updatedAt: new Date("2026-02-18T12:00:00.000Z"),
};

test("content list renders source placeholder without content type", () => {
  const html = renderToString(<ContentListBlock data={contentListDefaults} variant="cards" />);

  expect(html).toContain("Choose a content type");
  expect(html).toContain('data-content-list-state="missing-source"');
});

test("content list renders listing source placeholder when listing query is missing", () => {
  const html = renderToString(
    <ContentListBlock
      data={normalizeContentListData({
        ...contentListDefaults,
        source: {
          ...contentListDefaults.source,
          mode: "listing",
          listingQueryId: "",
          listingTemplateId: "",
        },
      })}
      variant="cards"
    />
  );

  expect(html).toContain("Choose a listing query");
  expect(html).toContain('data-content-list-source-mode="listing"');
  expect(html).toContain('data-content-list-state="missing-source"');
});

test("content list renders section heading and listing-aware empty description", () => {
  const html = renderToString(
    <ContentListBlock
      blockId="content-list-1"
      variant="cards"
      data={normalizeContentListData({
        ...contentListDefaults,
        title: "Latest work",
        description: "Fresh additions from the listing query.",
        source: {
          ...contentListDefaults.source,
          mode: "listing",
          listingQueryId: "query-1",
          listingTemplateId: "template-1",
        },
        resolved: {
          items: [],
          total: 0,
          listingQueryId: "query-1",
          listingTemplateId: "template-1",
          resolvedAt: "2026-02-08T09:10:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain('aria-labelledby="content-list-1-title"');
  expect(html).toContain("Latest work");
  expect(html).toContain("Fresh additions from the listing query.");
  expect(html).toContain("Adjust the listing query or publish matching entries.");
  expect(html).not.toContain("Adjust filters or publish entries for this content type.");
});

test("content list renders resolved items and runtime markers", () => {
  const html = renderToString(
    <ContentListBlock
      variant="compact"
      data={normalizeContentListData({
        ...contentListDefaults,
        source: {
          contentTypeId: "blog-type-id",
          statusScope: "published",
          limit: 3,
          sort: "published-desc",
        },
        style: {
          ...contentListDefaults.style,
          ctaLabel: "Open post",
        },
        resolved: {
          items: [
            {
              id: "entry-1",
              title: "Release notes",
              href: "/blog/release-notes",
              excerpt: "Latest platform updates.",
              publishedAt: "2026-02-08T09:00:00.000Z",
              status: "published",
            },
          ],
          total: 1,
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-08T09:10:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Release notes");
  expect(html).toContain("Open post");
  expect(html).toContain('dateTime="2026-02-08T09:00:00.000Z"');
  expect(html).toContain("Feb 8, 2026");
  expect(html).toContain('aria-label="Open post: Release notes"');
  expect(html).toContain('data-content-list-variant="compact"');
  expect(html).toContain('data-content-list-items="1"');
  expect(html).toContain('data-content-list-state="ready"');
});

test("content list renders image aspect classes and CTA fallback label when href is missing", () => {
  const html = renderToString(
    <ContentListBlock
      variant="cards"
      data={normalizeContentListData({
        ...contentListDefaults,
        source: {
          contentTypeId: "blog-type-id",
          statusScope: "published",
          limit: 3,
          sort: "published-desc",
        },
        style: {
          ...contentListDefaults.style,
          imageAspect: "wide",
          ctaLabel: "Open post",
        },
        resolved: {
          items: [
            {
              id: "entry-1",
              title: "Release notes",
              excerpt: "Latest platform updates.",
              imageSrc: "/assets/release-notes.jpg",
              publishedAt: "2026-02-08T09:00:00.000Z",
              status: "published",
            },
          ],
          total: 1,
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-08T09:10:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("aspect-[16/9]");
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('aria-label="Open post: Release notes"');
  expect(html).toContain('data-content-list-cta-disabled="missing-href"');
  expect(html).toContain("Open post");
  expect(html).not.toContain('data-content-list-link-unavailable="1"');
  expect(html).not.toContain("Links unavailable until a detail route is configured.");
  expect(html).not.toContain('href="/blog/release-notes"');
});

test("content list omits semantic time markup when runtime date is invalid", () => {
  const html = renderToString(
    <ContentListBlock
      variant="cards"
      data={normalizeContentListData({
        ...contentListDefaults,
        source: {
          contentTypeId: "blog-type-id",
          statusScope: "published",
          limit: 3,
          sort: "published-desc",
        },
        resolved: {
          items: [
            {
              id: "entry-1",
              title: "Release notes",
              href: "/blog/release-notes",
              excerpt: "Latest platform updates.",
              authorName: "Editor",
              publishedAt: "not-a-date",
              status: "published",
            },
          ],
          total: 1,
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-08T09:10:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Editor");
  expect(html).not.toContain("<time");
  expect(html).not.toContain('dateTime="');
});

test("content list renders paged navigation and view-all actions", () => {
  const pagedHtml = renderToString(
    <ContentListBlock
      blockId="content-list-1"
      variant="cards"
      data={normalizeContentListData({
        ...contentListDefaults,
        source: {
          contentTypeId: "blog-type-id",
          statusScope: "published",
          limit: 3,
          sort: "published-desc",
        },
        pagination: {
          mode: "paged",
          pageSize: 2,
          viewAllHref: "",
          viewAllLabel: "View all",
          loadMoreLabel: "Load more",
        },
        resolved: {
          items: [
            {
              id: "entry-1",
              title: "Release notes",
              href: "/blog/release-notes",
              excerpt: "Latest platform updates.",
              publishedAt: "2026-02-08T09:00:00.000Z",
              status: "published",
            },
          ],
          total: 5,
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-08T09:10:00.000Z",
          runtime: {
            page: 2,
            pageSize: 2,
            totalPages: 3,
            previousPageHref: "?cl.content-list-1.page=1",
            nextPageHref: "?cl.content-list-1.page=3",
          },
        },
      })}
    />
  );

  const viewAllHtml = renderToString(
    <ContentListBlock
      variant="cards"
      data={normalizeContentListData({
        ...contentListDefaults,
        source: {
          contentTypeId: "blog-type-id",
          statusScope: "published",
          limit: 3,
          sort: "published-desc",
        },
        pagination: {
          mode: "view-all",
          pageSize: 3,
          viewAllHref: "",
          viewAllLabel: "Browse all",
          loadMoreLabel: "Load more",
        },
        resolved: {
          items: [
            {
              id: "entry-1",
              title: "Release notes",
              href: "/blog/release-notes",
              excerpt: "Latest platform updates.",
              publishedAt: "2026-02-08T09:00:00.000Z",
              status: "published",
            },
          ],
          total: 5,
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          listPath: "/articles",
          resolvedAt: "2026-02-08T09:10:00.000Z",
        },
      })}
    />
  );

  expect(pagedHtml).toContain('aria-label="Content list pagination"');
  expect(pagedHtml.replace(/<!-- -->/g, "")).toContain("Page 2 of 3");
  expect(pagedHtml).toContain('href="?cl.content-list-1.page=1"');
  expect(pagedHtml).toContain('href="?cl.content-list-1.page=3"');
  expect(viewAllHtml).toContain('href="/articles"');
  expect(viewAllHtml).toContain("Browse all");
});

test("content list renders tags as badges when configured", () => {
  const html = renderToString(
    <ContentListBlock
      variant="cards"
      data={normalizeContentListData({
        ...contentListDefaults,
        source: {
          contentTypeId: "blog-type-id",
          statusScope: "published",
          limit: 3,
          sort: "published-desc",
        },
        style: {
          ...contentListDefaults.style,
          tagMode: "badges",
          tagLimit: 1,
        },
        resolved: {
          items: [
            {
              id: "entry-1",
              title: "Release notes",
              href: "/blog/release-notes",
              excerpt: "Latest platform updates.",
              tags: ["featured", "news"],
              authorName: "Editor",
              publishedAt: "2026-02-08T09:00:00.000Z",
              status: "published",
            },
          ],
          total: 1,
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-08T09:10:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("featured");
  expect(html).not.toContain("featured, news");
});

test("content list preserves none gap token", () => {
  const normalized = normalizeContentListData({
    ...contentListDefaults,
    source: {
      contentTypeId: "blog-type-id",
      statusScope: "published",
      limit: 3,
      sort: "published-desc",
    },
    style: {
      ...contentListDefaults.style,
      gap: "none",
    },
    resolved: {
      items: [
        {
          id: "entry-1",
          title: "Release notes",
          href: "/blog/release-notes",
          excerpt: "Latest platform updates.",
          publishedAt: "2026-02-08T09:00:00.000Z",
          status: "published",
        },
      ],
      total: 1,
      sourceTypeId: "blog-type-id",
      sourceTypeSlug: "blog",
      resolvedAt: "2026-02-08T09:10:00.000Z",
    },
  });

  expect(normalized.style?.gap).toBe("none");
  expect(renderToString(<ContentListBlock data={normalized} variant="cards" />)).toContain("gap-0");
});

test("content list cleared card background omits runtime background style", () => {
  const normalized = normalizeContentListData({
    ...contentListDefaults,
    source: {
      contentTypeId: "blog-type-id",
      statusScope: "published",
      limit: 3,
      sort: "published-desc",
    },
    style: {},
    resolved: {
      items: [
        {
          id: "entry-1",
          title: "Release notes",
          href: "/blog/release-notes",
          excerpt: "Latest platform updates.",
          publishedAt: "2026-02-08T09:00:00.000Z",
          status: "published",
        },
      ],
      total: 1,
      sourceTypeId: "blog-type-id",
      sourceTypeSlug: "blog",
      resolvedAt: "2026-02-08T09:10:00.000Z",
    },
  });
  const html = renderToString(<ContentListBlock data={normalized} variant="cards" />);

  expect(normalized.style?.backgroundColor).toBeUndefined();
  expect(normalized.style?.textColor).toBeUndefined();
  expect(html).toContain('data-content-list-state="ready"');
  expect(html).not.toContain("background-color:");
  expect(html).not.toContain("color:var(--color-text)");
});

test("content list normalizes limit and model defaults", () => {
  expect(normalizeContentListLimit(999)).toBe(24);
  expect(normalizeContentListLimit(0)).toBe(1);

  const normalized = normalizeContentListData({
    source: { limit: 0, sort: "title-asc" },
  });
  expect(normalized.source?.limit).toBe(1);
  expect(normalized.source?.sort).toBe("title-asc");
  expect(normalized.fields?.showImage).toBe(true);
});

test("content list keeps backward compatibility for source.mode", () => {
  const listingCompatible = normalizeContentListData({
    source: {
      listingQueryId: "listing-query-legacy",
      contentTypeId: "type-1",
    },
  });
  expect(listingCompatible.source?.mode).toBe("listing");

  const legacyCompatible = normalizeContentListData({
    source: {
      contentTypeId: "type-1",
    },
  });
  expect(legacyCompatible.source?.mode).toBe("legacy");
});

test("content list listing mode normalizer clears dormant legacy filters", () => {
  const normalized = normalizeContentListData({
    source: {
      mode: "listing",
      listingQueryId: "listing-query-1",
      listingTemplateId: "listing-template-1",
      contentTypeId: "type-1",
    },
    filters: {
      taxonomy: "legacy-topic",
      authorId: "user-1",
      searchQuery: "launch",
      featuredOnly: true,
    },
  });

  expect(normalized.source?.mode).toBe("listing");
  expect(normalized.filters).toEqual({
    taxonomy: "",
    authorId: "",
    searchQuery: "",
    featuredOnly: false,
  });
});

test("content list validator accepts resolved payload and exposes visual variant ownership", () => {
  clearWidgets();
  const widget = createContentListWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "content-list-1",
      type: "content-list",
      variant: "cards",
      data: {
        ...contentListDefaults,
        source: {
          contentTypeId: "blog-type-id",
          statusScope: "published",
          limit: 4,
          sort: "published-desc",
        },
        resolved: {
          items: [
            {
              id: "entry-1",
              title: "Entry one",
              href: "/blog/entry-one",
            },
          ],
          total: 1,
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-08T09:10:00.000Z",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("content list validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createContentListWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "content-list-2",
      type: "content-list",
      variant: "unknown",
      data: contentListDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("content list editors render expected sections", () => {
  const wizardHtml = renderToString(
    <ContentListWizardEditor
      value={contentListDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Source setup");
  expect(wizardHtml).not.toContain("Variant");

  const visualHtml = renderToString(
    <ContentListVisualEditor
      value={contentListDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and layout");
  expect(visualHtml).toContain("Daily filters");
  expect(visualHtml).toContain("Presentation fields");

  const advancedHtml = renderToString(
    <ContentListAdvancedEditor
      value={contentListDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Source summary");
  expect(advancedHtml).toContain("Style summary");
  expect(advancedHtml).toContain("Runtime summary");
});

test("content list runtime filters and sorting respect preview and status scope", () => {
  const entries: ContentListResolverEntry[] = [
    createEntry({
      id: "entry-published",
      title: "Zeta release",
      slug: "zeta-release",
      status: "published",
      tags: ["platform", "featured"],
      publishedAt: new Date("2026-02-08T11:00:00.000Z"),
    }),
    createEntry({
      id: "entry-draft",
      title: "Alpha draft",
      slug: "alpha-draft",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-02-09T11:00:00.000Z"),
    }),
  ];

  const publishedOnly = applyContentListRuntimeFilters(
    entries,
    {
      ...contentListDefaults,
      source: {
        contentTypeId: "type-1",
        statusScope: "all",
        limit: 10,
        sort: "title-asc",
      },
    },
    { preview: false }
  );
  expect(publishedOnly).toHaveLength(1);
  expect(publishedOnly[0]?.id).toBe("entry-published");

  const draftInPreview = applyContentListRuntimeFilters(
    entries,
    {
      ...contentListDefaults,
      source: {
        contentTypeId: "type-1",
        statusScope: "draft",
        limit: 10,
        sort: "title-asc",
      },
    },
    { preview: true }
  );
  expect(draftInPreview).toHaveLength(1);
  expect(draftInPreview[0]?.id).toBe("entry-draft");

  const sorted = sortContentListRuntimeEntries(entries, "title-asc");
  expect(sorted[0]?.title).toBe("Alpha draft");
  expect(sorted[1]?.title).toBe("Zeta release");
});

test("content list listing mode resolves rows from saved query", async () => {
  const resolved = await resolveContentListRuntimeData(
    {
      ...contentListDefaults,
      source: {
        ...contentListDefaults.source,
        mode: "listing",
        listingQueryId: "listing-query-1",
        listingTemplateId: "listing-template-1",
      },
      fields: {
        ...contentListDefaults.fields,
        showImage: false,
      },
    },
    {
      preview: false,
      contentRoutes: [
        { type: "articles", listPath: "/articles", detailPath: "/articles/:slug", enabled: true },
      ],
    },
    {
      getListingQueryById: async () => ({
        id: "listing-query-1",
        name: "Articles list",
        description: null,
        query: {
          source: "entries",
          sourceConfig: {
            contentTypeId: "type-1",
          },
          filters: [],
          sort: [{ field: "id", dir: "asc" }],
          pagination: { limit: 12, offset: 0 },
          fields: ["id", "title", "slug", "status", "publishedAt"],
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
            title: "Oil service",
            slug: "oil-service",
            status: "published",
            publishedAt: "2026-02-18T10:00:00.000Z",
          },
          {
            id: "entry-2",
            title: "Brake inspection",
            slug: "brake-inspection",
            status: "published",
            publishedAt: "2026-02-17T10:00:00.000Z",
          },
        ],
      }),
      getContentTypeById: async () => contentTypeRecord,
      getContentTypeBySlug: async () => null,
    }
  );

  expect(resolved.total).toBe(2);
  expect(resolved.items).toHaveLength(2);
  expect(resolved.items[0]?.title).toBe("Oil service");
  expect(resolved.items[0]?.href).toBe("/articles/oil-service");
  expect(resolved.sourceTypeSlug).toBe("articles");
  const listingResolved = resolved as typeof resolved & {
    listingQueryId: string;
    listingTemplateId: string;
  };
  expect(listingResolved.listingQueryId).toBe("listing-query-1");
  expect(listingResolved.listingTemplateId).toBe("listing-template-1");
});

test("content list listing mode resolves posts source without content-type lookup", async () => {
  const resolved = await resolveContentListRuntimeData(
    {
      ...contentListDefaults,
      source: {
        ...contentListDefaults.source,
        mode: "listing",
        listingQueryId: "listing-query-posts",
        listingTemplateId: "",
      },
    },
    {
      preview: false,
      contentRoutes: [
        {
          type: "posts",
          listPath: "/news",
          detailPath: "/news/:slug",
          enabled: true,
        },
      ],
    },
    {
      getListingQueryById: async () => ({
        id: "listing-query-posts",
        name: "Posts list",
        description: null,
        query: {
          source: "posts",
          sourceConfig: {
            includeDrafts: false,
          },
          filters: [],
          sort: [{ field: "id", dir: "asc" }],
          pagination: { limit: 12, offset: 0 },
          fields: ["id", "title", "slug", "status", "publishedAt"],
        },
        createdAt: new Date("2026-02-18T12:00:00.000Z"),
        updatedAt: new Date("2026-02-18T12:00:00.000Z"),
      }),
      executeListing: async () => ({
        source: "posts",
        total: 1,
        limit: 12,
        offset: 0,
        rows: [
          {
            id: "post-1",
            title: "Monthly update",
            slug: "monthly-update",
            status: "published",
            publishedAt: "2026-02-18T10:00:00.000Z",
          },
        ],
      }),
      getContentTypeById: async () => {
        throw new Error("content_type_lookup_should_not_run_for_posts");
      },
      getContentTypeBySlug: async () => null,
    }
  );

  expect(resolved.total).toBe(1);
  expect(resolved.sourceTypeId).toBe("post");
  expect(resolved.sourceTypeSlug).toBe("posts");
  expect(resolved.items[0]?.href).toBe("/news/monthly-update");
});

test("content list listing bindings can hide blocks via conditions", async () => {
  const resolved = await resolveContentListRuntimeData(
    {
      ...contentListDefaults,
      source: {
        ...contentListDefaults.source,
        mode: "listing",
        listingQueryId: "listing-query-2",
        listingTemplateId: "listing-template-2",
      },
    },
    {
      preview: false,
      contentRoutes: [
        { type: "articles", listPath: "/articles", detailPath: "/articles/:slug", enabled: true },
      ],
    },
    {
      getListingQueryById: async () => ({
        id: "listing-query-2",
        name: "Services",
        description: null,
        query: {
          source: "entries",
          sourceConfig: {
            contentTypeId: "type-1",
          },
          filters: [],
          sort: [{ field: "id", dir: "asc" }],
          pagination: { limit: 12, offset: 0 },
          fields: ["id", "title", "slug", "status", "summary"],
        },
        createdAt: new Date("2026-02-18T12:00:00.000Z"),
        updatedAt: new Date("2026-02-18T12:00:00.000Z"),
      }),
      getListingTemplateById: async () => ({
        id: "listing-template-2",
        name: "Cards with rules",
        slug: "cards-rules",
        description: null,
        layout: "grid",
        config: {
          fields: [
            {
              key: "excerpt",
              source: "summary",
              label: null,
              fallback: null,
              format: "text",
              conditions: [{ id: "excerpt-draft-only", field: "status", op: "eq", value: "draft" }],
            },
            {
              key: "href",
              source: "slug",
              label: null,
              fallback: null,
              format: "text",
              conditions: [{ id: "href-draft-only", field: "status", op: "eq", value: "draft" }],
            },
          ],
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
        total: 1,
        limit: 12,
        offset: 0,
        rows: [
          {
            id: "entry-1",
            title: "Oil service",
            slug: "oil-service",
            status: "published",
            summary: "Keep your engine protected",
          },
        ],
      }),
      getContentTypeById: async () => contentTypeRecord,
      getContentTypeBySlug: async () => null,
    }
  );

  expect(resolved.items[0]?.title).toBe("Oil service");
  expect(resolved.items[0]?.excerpt).toBeUndefined();
  expect(resolved.items[0]?.href).toBeUndefined();
});
