import { describe, expect, test, vi } from "vitest";

import {
  mapPageCollectionBlockToContentListData,
  mapPageFiltersBlockToListingFiltersData,
  preparePageRuntimeDocument,
  sanitizePageEmbedHtml,
  type PageRuntimeDataBindingDeps,
} from "../../../core/services/pages/pageRuntimeDataBinding";
import type { PageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";
import type { ContentListResolvedRuntimeData } from "../../../core/services/content/contentListResolver";
import { getDefaultFormSettings } from "../../../core/services/forms/formSettings";

const resolvedCollection = (): ContentListResolvedRuntimeData => ({
  items: [
    {
      id: "entry-public",
      title: "Published entry",
      slug: "published-entry",
      href: "/entries/published-entry",
      excerpt: "Published excerpt",
      status: "published",
    },
  ],
  total: 1,
  sourceTypeId: "type-public",
  sourceTypeSlug: "public",
  resolvedAt: "2026-06-10T00:00:00.000Z",
});

const pageDocument = (
  visibility: PageDocumentV2["sections"][number]["visibility"]
): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: {
    template: "page-v2",
    showInNav: true,
  },
  sections: [
    {
      id: "sec_data",
      type: "content",
      name: "Data",
      variant: "default",
      layout: {
        columns: 1,
        align: "start",
        justify: "start",
        maxWidth: 1080,
      },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
      spacing: {
        paddingTop: 32,
        paddingBottom: 32,
        paddingLeft: 24,
        paddingRight: 24,
        gap: 24,
      },
      visibility,
      responsive: {},
      blocks: [
        {
          id: "blk_collection",
          type: "collection",
          props: {
            contentTypeId: "type-public",
            queryId: "",
            templateId: "",
            limit: 42,
          },
          visibility: { visible: true },
        },
        {
          id: "blk_form",
          type: "form",
          props: {
            formId: "form-public",
            title: "Contact",
          },
          visibility: { visible: true },
        },
        {
          id: "blk_embed",
          type: "embed",
          props: {
            html: '<p><a href="/safe">Safe</a><script>bad()</script></p>',
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          },
          visibility: { visible: true },
        },
      ],
    },
  ],
});

const bindingDeps = (): Required<
  Pick<PageRuntimeDataBindingDeps, "resolveContentListRuntimeData" | "resolveFormRuntimeData">
> => ({
  resolveContentListRuntimeData: vi.fn(async () => resolvedCollection()),
  resolveFormRuntimeData: vi.fn(async () => ({
    formId: "form-public",
    formName: "Contact",
    description: "Contact form",
    status: "published",
    successMessage: "Thanks",
    successRedirectUrl: null,
    submissionAccess: "public" as const,
    submissionNonce: "nonce",
    settings: getDefaultFormSettings(),
    fields: [],
  })),
});

describe("page runtime data binding", () => {
  test("maps collection props to a published-only content list contract", () => {
    const data = mapPageCollectionBlockToContentListData({
      id: "collection",
      type: "collection",
      props: {
        contentTypeId: "type-public",
        queryId: "query-public",
        templateId: "template-public",
        limit: 42,
      },
      visibility: { visible: true },
    });

    expect(data.source).toMatchObject({
      mode: "listing",
      contentTypeId: "type-public",
      listingQueryId: "query-public",
      listingTemplateId: "template-public",
      statusScope: "published",
      limit: 24,
    });
    expect(data.pagination).toMatchObject({
      mode: "none",
      pageSize: 24,
    });
  });

  test("prunes gated public sections before resolving collection or form data", async () => {
    const deps = bindingDeps();
    const prepared = await preparePageRuntimeDocument(
      pageDocument({
        visible: true,
        authOnly: true,
        anchor: null,
        startsAt: null,
        endsAt: null,
      }),
      {
        preview: false,
        breakpoint: "desktop",
        contentRoutes: [],
      },
      deps
    );

    expect(prepared.document.sections).toHaveLength(0);
    expect(prepared.runtimeDataByBlockId).toEqual({});
    expect(prepared.cacheable).toBe(false);
    expect(deps.resolveContentListRuntimeData).not.toHaveBeenCalled();
    expect(deps.resolveFormRuntimeData).not.toHaveBeenCalled();
  });

  test("keeps gated sections in preview and resolves scoped runtime data", async () => {
    const deps = bindingDeps();
    const prepared = await preparePageRuntimeDocument(
      pageDocument({
        visible: true,
        authOnly: true,
        anchor: null,
        startsAt: null,
        endsAt: null,
      }),
      {
        preview: true,
        breakpoint: "desktop",
        contentRoutes: [],
        runtimeSearchParams: new URLSearchParams("cl.blk_collection.page=2"),
      },
      deps
    );

    expect(prepared.document.sections).toHaveLength(1);
    expect(prepared.runtimeDataByBlockId.blk_collection?.kind).toBe("collection");
    expect(prepared.runtimeDataByBlockId.blk_form?.kind).toBe("form");
    expect(prepared.runtimeDataByBlockId.blk_embed).toMatchObject({
      kind: "embed",
      iframeSrc: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(prepared.cacheable).toBe(false);
    expect(deps.resolveContentListRuntimeData).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        preview: true,
        runtimeSearchParams: expect.any(URLSearchParams),
        blockId: "blk_collection",
      })
    );
  });

  test("maps filters block props onto the shared listing-filters data shape", () => {
    const data = mapPageFiltersBlockToListingFiltersData({
      id: "filters",
      type: "filters",
      props: {
        queryId: "query-public",
        autoApply: false,
        showSearch: false,
        applyLabel: "Filter now",
        aliases: { rooms: "data.rooms.in" },
        facets: [
          {
            id: "rooms",
            kind: "checkbox",
            label: "Rooms",
            field: "data.rooms",
            op: "in",
            options: [{ value: "3", label: "Three" }],
          },
        ],
      },
      visibility: { visible: true },
    });

    expect(data.listingQueryId).toBe("query-public");
    expect(data.autoApply).toBe(false);
    expect(data.showSearch).toBe(false);
    expect(data.applyLabel).toBe("Filter now");
    expect(data.aliases).toEqual({ rooms: "data.rooms.in" });
    expect(data.facets).toEqual([
      {
        id: "rooms",
        kind: "checkbox",
        label: "Rooms",
        field: "data.rooms",
        op: "in",
        options: [{ value: "3", label: "Three" }],
      },
    ]);
  });

  test("empty facet config falls back to the shared default sort facet", () => {
    const data = mapPageFiltersBlockToListingFiltersData({
      id: "filters",
      type: "filters",
      props: { queryId: "query-public", facets: [] },
      visibility: { visible: true },
    });
    // The widget normalizer owns this fallback: a facet-less filters block
    // still renders the generic sort control (updatedAt asc/desc).
    expect(data.facets?.map((facet) => facet.kind)).toEqual(["sort"]);
  });

  test("resolves filters bindings and flags the listing runtime script need", async () => {
    const deps = {
      ...bindingDeps(),
      resolveListingFiltersRuntimeData: vi.fn(async () => ({
        listingQueryId: "query-public",
        metrics: [],
        searchQuery: "loft",
        rejectedTokens: [],
        total: 7,
      })),
    };
    const document = pageDocument({
      visible: true,
      authOnly: false,
      anchor: null,
      startsAt: null,
      endsAt: null,
    });
    document.sections[0]!.blocks.push({
      id: "blk_filters",
      type: "filters",
      props: { queryId: "query-public", facets: [] },
      visibility: { visible: true },
    });

    const prepared = await preparePageRuntimeDocument(
      document,
      { preview: false, breakpoint: "desktop", contentRoutes: [] },
      deps
    );

    const binding = prepared.runtimeDataByBlockId.blk_filters;
    expect(binding).toMatchObject({ kind: "filters", total: 7 });
    if (binding?.kind === "filters") {
      expect(binding.data.resolved).toMatchObject({
        listingQueryId: "query-public",
        searchQuery: "loft",
      });
    }
    expect(prepared.cacheable).toBe(false);
    expect(prepared.needsListingRuntimeScript).toBe(true);
    expect(deps.resolveListingFiltersRuntimeData).toHaveBeenCalledWith(
      expect.objectContaining({ listingQueryId: "query-public", aliases: {}, preview: false })
    );
  });

  test("threads filters aliases into linked listing collections", async () => {
    const deps = {
      ...bindingDeps(),
      resolveListingFiltersRuntimeData: vi.fn(async () => ({
        listingQueryId: "query-public",
        metrics: [],
        rejectedTokens: [],
        total: 1,
      })),
    };
    const document = pageDocument({
      visible: true,
      authOnly: false,
      anchor: null,
      startsAt: null,
      endsAt: null,
    });
    document.sections[0]!.blocks = [
      {
        id: "blk_collection",
        type: "collection",
        props: {
          contentTypeId: "",
          queryId: "query-public",
          templateId: "",
          limit: 6,
          paginationMode: "paged",
          pageSize: null,
        },
        visibility: { visible: true },
      },
      {
        id: "blk_filters",
        type: "filters",
        props: {
          queryId: "query-public",
          aliases: { rooms: "data.rooms.in", page: "__page" },
          facets: [{ id: "rooms", kind: "checkbox", label: "Rooms", field: "data.rooms" }],
        },
        visibility: { visible: true },
      },
    ];

    await preparePageRuntimeDocument(
      document,
      {
        preview: false,
        breakpoint: "desktop",
        contentRoutes: [],
        runtimeSearchParams: new URLSearchParams("rooms=3"),
      },
      deps
    );

    expect(deps.resolveContentListRuntimeData).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        runtimeAliases: { rooms: "data.rooms.in", page: "__page" },
      })
    );
    expect(deps.resolveListingFiltersRuntimeData).toHaveBeenCalledWith(
      expect.objectContaining({
        aliases: { rooms: "data.rooms.in", page: "__page" },
      })
    );
  });

  test("dangling or unbound filters blocks never request the runtime script", async () => {
    const danglingDeps = {
      ...bindingDeps(),
      resolveListingFiltersRuntimeData: vi.fn(async () => ({
        listingQueryId: "query-missing",
        metrics: [],
        rejectedTokens: [],
        total: 0,
        error: "Selected listing query no longer exists.",
      })),
    };
    const document = pageDocument({
      visible: true,
      authOnly: false,
      anchor: null,
      startsAt: null,
      endsAt: null,
    });
    document.sections[0]!.blocks.push({
      id: "blk_filters",
      type: "filters",
      props: { queryId: "query-missing", facets: [] },
      visibility: { visible: true },
    });

    const prepared = await preparePageRuntimeDocument(
      document,
      { preview: false, breakpoint: "desktop", contentRoutes: [] },
      danglingDeps
    );
    expect(prepared.runtimeDataByBlockId.blk_filters?.kind).toBe("filters");
    expect(prepared.needsListingRuntimeScript).toBe(false);

    // A document without any filters block never flags the script either.
    const plain = await preparePageRuntimeDocument(
      pageDocument({ visible: true, authOnly: false, anchor: null, startsAt: null, endsAt: null }),
      { preview: false, breakpoint: "desktop", contentRoutes: [] },
      bindingDeps()
    );
    expect(plain.needsListingRuntimeScript).toBe(false);
  });

  test("maps the collection pagination props (TASK-459-03): default none, paged/load-more, pageSize follows limit", () => {
    const buildBlock = (props: Record<string, unknown>) => ({
      id: "collection",
      type: "collection" as const,
      props,
      visibility: { visible: true },
    });

    // Legacy props (no pagination fields) keep today's contract exactly.
    const legacy = mapPageCollectionBlockToContentListData(
      buildBlock({ contentTypeId: "type-public", limit: 8 })
    );
    expect(legacy.pagination).toMatchObject({ mode: "none", pageSize: 8 });

    // Authored paged mode with an explicit page size.
    const paged = mapPageCollectionBlockToContentListData(
      buildBlock({
        contentTypeId: "type-public",
        queryId: "query-public",
        limit: 12,
        paginationMode: "paged",
        pageSize: 9,
      })
    );
    expect(paged.pagination).toMatchObject({ mode: "paged", pageSize: 9 });

    // Nullable pageSize follows limit; load-more keeps anchor semantics.
    const loadMore = mapPageCollectionBlockToContentListData(
      buildBlock({
        contentTypeId: "type-public",
        limit: 10,
        paginationMode: "load-more",
        pageSize: null,
      })
    );
    expect(loadMore.pagination).toMatchObject({ mode: "load-more", pageSize: 10 });

    // Out-of-range pageSize clamps to the single owner bound (24).
    const clamped = mapPageCollectionBlockToContentListData(
      buildBlock({
        contentTypeId: "type-public",
        limit: 6,
        paginationMode: "paged",
        pageSize: 99,
      })
    );
    expect(clamped.pagination).toMatchObject({ mode: "paged", pageSize: 24 });

    // Unknown stored mode values fail closed to "none".
    const unknown = mapPageCollectionBlockToContentListData(
      buildBlock({ contentTypeId: "type-public", paginationMode: "view-all" })
    );
    expect(unknown.pagination?.mode).toBe("none");
  });

  test("paged listing-bound collections flag the listing runtime script; legacy/none do not", async () => {
    const buildPagedDocument = (props: Record<string, unknown>) => {
      const document = pageDocument({
        visible: true,
        authOnly: false,
        anchor: null,
        startsAt: null,
        endsAt: null,
      });
      document.sections[0]!.blocks = [
        {
          id: "blk_collection",
          type: "collection",
          props,
          visibility: { visible: true },
        },
      ];
      return document;
    };

    const pagedListing = await preparePageRuntimeDocument(
      buildPagedDocument({
        contentTypeId: "type-public",
        queryId: "query-public",
        paginationMode: "paged",
      }),
      { preview: false, breakpoint: "desktop", contentRoutes: [] },
      bindingDeps()
    );
    expect(pagedListing.needsListingRuntimeScript).toBe(true);

    // Legacy-mode pagers (cl.* params) stay no-JS full navigations.
    const pagedLegacy = await preparePageRuntimeDocument(
      buildPagedDocument({ contentTypeId: "type-public", paginationMode: "paged" }),
      { preview: false, breakpoint: "desktop", contentRoutes: [] },
      bindingDeps()
    );
    expect(pagedLegacy.needsListingRuntimeScript).toBe(false);

    // Default "none" never requests the script.
    const unpaged = await preparePageRuntimeDocument(
      buildPagedDocument({ contentTypeId: "type-public", queryId: "query-public" }),
      { preview: false, breakpoint: "desktop", contentRoutes: [] },
      bindingDeps()
    );
    expect(unpaged.needsListingRuntimeScript).toBe(false);
  });

  test("consumes listing template style and emptyState at render bind (TASK-459-03)", async () => {
    const document = pageDocument({
      visible: true,
      authOnly: false,
      anchor: null,
      startsAt: null,
      endsAt: null,
    });
    document.sections[0]!.blocks = [
      {
        id: "blk_collection",
        type: "collection",
        props: {
          contentTypeId: "type-public",
          queryId: "query-public",
          templateId: "template-public",
        },
        visibility: { visible: true },
      },
    ];
    const deps = {
      ...bindingDeps(),
      resolveContentListRuntimeData: vi.fn(
        async (): Promise<ContentListResolvedRuntimeData> => ({
          ...resolvedCollection(),
          templateStyle: { columns: 4, gap: "xl", cardVariant: "compact" },
          templateEmptyState: {
            title: "No homes match",
            description: "Loosen the filters.",
            ctaLabel: null,
            ctaHref: null,
          },
        })
      ),
    };

    const prepared = await preparePageRuntimeDocument(
      document,
      { preview: false, breakpoint: "desktop", contentRoutes: [] },
      deps
    );
    const binding = prepared.runtimeDataByBlockId.blk_collection;
    expect(binding?.kind).toBe("collection");
    if (binding?.kind !== "collection") throw new Error("expected collection binding");
    expect(binding.variant).toBe("compact");
    expect(binding.data.style).toMatchObject({ columns: "4", gap: "lg", cardStyle: "outlined" });
    expect(binding.data.emptyState).toMatchObject({
      title: "No homes match",
      description: "Loosen the filters.",
    });

    // Without a template the binding keeps today's defaults (no variant).
    const plain = await preparePageRuntimeDocument(
      document,
      { preview: false, breakpoint: "desktop", contentRoutes: [] },
      bindingDeps()
    );
    const plainBinding = plain.runtimeDataByBlockId.blk_collection;
    if (plainBinding?.kind !== "collection") throw new Error("expected collection binding");
    expect(plainBinding.variant).toBeUndefined();
    expect(plainBinding.data.style).toMatchObject({ columns: "3", gap: "md" });
  });

  test("strips unsafe inline embed markup and keeps safe links", () => {
    const html = sanitizePageEmbedHtml(
      '<p onclick="bad()">Hello <a href="javascript:bad()">bad</a><a href="/ok">ok</a></p><iframe src="https://example.test"></iframe><script>alert(1)</script>'
    );

    expect(html).toContain("<p>Hello");
    expect(html).toContain('<a href="/ok" rel="nofollow noreferrer" target="_blank">ok</a>');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });
});
