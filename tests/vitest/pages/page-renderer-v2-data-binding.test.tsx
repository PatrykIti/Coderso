// TASK-539-05-L01 — runtime data binding: data-driven block canvas previews (form/embed/collection/filters) + paged collection binding
// Cohesive suite split out of the former `page-renderer-v2.test.tsx` monolith.
// Each suite is independently runnable in the Vitest lane (Bun-free pages renderer).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { PageSectionContent } from "../../../core/services/pages/pageRendererV2";
import { buildPageEditorCollectionPreviewBinding } from "../../../core/services/pages/pageEditorCollectionPreview";
import { buildPageEditorFormPreviewBinding } from "../../../core/services/pages/pageEditorFormPreview";
import {
  mapPageFiltersBlockToListingFiltersData,
  type PageRuntimeCollectionBinding,
  type PageRuntimeDataByBlockId,
} from "../../../core/services/pages/pageRuntimeBindingContract";
import { normalizeContentListData } from "../../../core/widgets/core/contentList";
import { normalizeListingFiltersData } from "../../../core/widgets/core/listingFilters";
test("form block renders a canvas-safe inert preview in canvas layout mode (TASK-456)", () => {
  const detail = {
    form: {
      id: "form-contact",
      name: "Contact",
      status: "published",
      description: "Send us a message.",
      successMessage: "Thanks!",
      successRedirectUrl: null,
      submissionAccess: "public" as const,
      settings: { layoutMode: "single", saveProgress: false, stepTitles: [] },
    },
    fields: [
      {
        id: "fld-email",
        type: "email",
        label: "Email address",
        name: "email",
        required: true,
        settings: {},
        orderIndex: 0,
      },
    ],
  };
  const section = createPageSectionV2("content", {
    id: "sec-form-canvas",
    blocks: [
      createPageBlockV2("form", { id: "blk-form-unpicked", props: { formId: null, title: "" } }),
      createPageBlockV2("form", {
        id: "blk-form-loading",
        props: { formId: "form-pending", title: "" },
      }),
      createPageBlockV2("form", {
        id: "blk-form-ready",
        props: { formId: "form-contact", title: "Contact us" },
      }),
      createPageBlockV2("form", {
        id: "blk-form-missing",
        props: { formId: "form-deleted", title: "" },
      }),
    ],
  });
  const runtimeDataByBlockId = {
    "blk-form-ready": buildPageEditorFormPreviewBinding("form-contact", "Contact us", detail),
    "blk-form-missing": buildPageEditorFormPreviewBinding("form-deleted", null, null),
  };
  const canvasHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      layoutMode="canvas-device"
      runtimeDataByBlockId={runtimeDataByBlockId}
    />
  );

  // Unpicked form -> explicit empty state; set-but-unresolved -> loading state.
  expect(canvasHtml).toContain("Pick a form in the Content panel to preview it here.");
  expect(canvasHtml).toContain("Loading form preview...");
  // Resolved preview: the SHARED form markup, fully inert (disabled fieldset,
  // pointer events off) and without any submission nonce.
  expect(canvasHtml).toContain('data-page-editor-form-preview="inert"');
  expect(canvasHtml).toContain("pointer-events-none");
  expect(canvasHtml).toContain("<fieldset disabled");
  expect(canvasHtml).toContain("Contact us");
  expect(canvasHtml).toContain("Email address");
  // No nonce hidden input is ever emitted (the runtime client script string
  // mentions the field name, but scripts injected via innerHTML never run in
  // the admin SPA and the disabled fieldset blocks submission regardless).
  expect(canvasHtml).not.toContain('type="hidden" name="__nl_form_nonce"');
  // Dangling reference: the runtime's fail-closed boundary, not a fake form.
  expect(canvasHtml).toContain('data-form-embed-runtime-boundary="error"');
  expect(canvasHtml).toContain("This form is not available right now.");

  // Runtime parity: the default layout mode keeps the existing inert
  // fallback (no canvas copy, no fieldset wrapper) for unbound form blocks.
  const runtimeHtml = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(runtimeHtml).not.toContain("Pick a form in the Content panel to preview it here.");
  expect(runtimeHtml).not.toContain("Loading form preview...");
  expect(runtimeHtml).not.toContain('data-page-editor-form-preview="inert"');
  expect(runtimeHtml).toContain("Form is not available yet.");
});

test("embed block renders sanitized inline HTML as React nodes", () => {
  const section = createPageSectionV2("embed", {
    id: "sec-inline-embed",
    blocks: [
      createPageBlockV2("embed", {
        id: "blk-inline-embed",
        props: { provider: "custom", url: "", html: "" },
      }),
    ],
  });
  const runtimeDataByBlockId: PageRuntimeDataByBlockId = {
    "blk-inline-embed": {
      kind: "embed",
      iframeSrc: null,
      iframeTitle: "Custom embed",
      sanitizedHtml:
        '<p>Fish &amp; chips <strong>menu</strong><br><a href="/menu" rel="nofollow noreferrer" target="_blank">Open</a></p>',
    },
  };

  const html = renderToStaticMarkup(
    <PageSectionContent section={section} runtimeDataByBlockId={runtimeDataByBlockId} />
  );

  expect(html).toContain('data-page-embed-html="sanitized"');
  expect(html).toContain("Fish &amp; chips");
  expect(html).toContain("<strong>menu</strong>");
  expect(html).toContain("<br/>");
  expect(html).toContain('<a href="/menu" rel="nofollow noreferrer" target="_blank">Open</a>');
});

test("collection block renders a canvas-safe inert preview in canvas layout mode (TASK-457)", () => {
  const source = {
    contentType: { id: "ct-services", name: "Services", slug: "services" },
    entries: [
      {
        id: "entry-audit",
        title: "Site audit",
        slug: "site-audit",
        status: "published",
        data: { summary: "We review your whole site." },
        updatedAt: "2026-05-01T09:00:00.000Z",
        publishedAt: "2026-05-01T09:00:00.000Z",
      },
      {
        id: "entry-care",
        title: "Care plan",
        slug: "care-plan",
        status: "published",
        data: {},
        updatedAt: "2026-04-01T09:00:00.000Z",
        publishedAt: "2026-04-01T09:00:00.000Z",
      },
      {
        id: "entry-draft",
        title: "Unpublished service",
        slug: "unpublished-service",
        status: "draft",
        data: {},
        updatedAt: "2026-05-20T09:00:00.000Z",
      },
    ],
  };
  const readyBlock = createPageBlockV2("collection", {
    id: "blk-collection-ready",
    props: { contentTypeId: "ct-services", queryId: null, limit: 2, templateId: null },
  });
  const danglingBlock = createPageBlockV2("collection", {
    id: "blk-collection-dangling",
    props: { contentTypeId: "ct-deleted", queryId: null, limit: 6, templateId: null },
  });
  const section = createPageSectionV2("content", {
    id: "sec-collection-canvas",
    blocks: [
      createPageBlockV2("collection", {
        id: "blk-collection-unpicked",
        props: { contentTypeId: null, queryId: null, limit: 6, templateId: null },
      }),
      createPageBlockV2("collection", {
        id: "blk-collection-loading",
        props: { contentTypeId: "ct-pending", queryId: null, limit: 6, templateId: null },
      }),
      readyBlock,
      danglingBlock,
    ],
  });
  const runtimeDataByBlockId = {
    "blk-collection-ready": buildPageEditorCollectionPreviewBinding(readyBlock, source),
    "blk-collection-dangling": buildPageEditorCollectionPreviewBinding(danglingBlock, null),
  };
  const canvasHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      layoutMode="canvas-device"
      runtimeDataByBlockId={runtimeDataByBlockId}
    />
  );

  // Unpicked type -> explicit empty state; set-but-unresolved -> loading.
  expect(canvasHtml).toContain("Pick a content type in the Content panel to preview entries here.");
  expect(canvasHtml).toContain("Loading collection preview...");
  // Resolved preview: the SHARED content-list markup, pointer events off so
  // entry links never navigate inside the canvas; published entries only,
  // limit respected (the draft entry and the third slot never render).
  expect(canvasHtml).toContain('data-page-editor-collection-preview="inert"');
  expect(canvasHtml).toContain("pointer-events-none");
  expect(canvasHtml).toContain("Site audit");
  expect(canvasHtml).toContain("Care plan");
  expect(canvasHtml).toContain("We review your whole site.");
  expect(canvasHtml).not.toContain("Unpublished service");
  // Dangling content type: the runtime's fail-closed boundary, no fake list.
  expect(canvasHtml).toContain('data-page-block-inert="collection"');
  expect(canvasHtml).toContain("Collection content is not available yet.");

  // Runtime parity: the default layout mode keeps the existing inert
  // fallback (no canvas copy, no inert preview wrapper) for unbound blocks.
  const runtimeHtml = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(runtimeHtml).not.toContain(
    "Pick a content type in the Content panel to preview entries here."
  );
  expect(runtimeHtml).not.toContain("Loading collection preview...");
  expect(runtimeHtml).not.toContain('data-page-editor-collection-preview="inert"');
  expect(runtimeHtml).toContain("Collection content is not available yet.");
});

test("filters block renders the shared facet form with count, sort, and swap hooks (TASK-459-02)", () => {
  const filtersBlock = createPageBlockV2("filters", {
    id: "blk-filters",
    props: {
      queryId: "query-homes",
      autoApply: false,
      showSearch: true,
      showCount: true,
      applyLabel: "Apply filters",
      facets: [
        {
          id: "rooms",
          kind: "checkbox",
          label: "Rooms",
          field: "data.rooms",
          op: "in",
          options: [{ value: "3", label: "Three rooms" }],
        },
        {
          id: "sort",
          kind: "sort",
          label: "Sort",
          sortOptions: [
            { value: "data.price:asc", label: "Cheapest first", field: "data.price", dir: "asc" },
          ],
        },
      ],
    },
  });
  const section = createPageSectionV2("content", {
    id: "sec-filters-runtime",
    blocks: [filtersBlock],
  });
  const binding = {
    kind: "filters" as const,
    data: normalizeListingFiltersData({
      ...mapPageFiltersBlockToListingFiltersData(filtersBlock),
      resolved: {
        listingQueryId: "query-homes",
        metrics: [],
        searchQuery: "loft",
        rejectedTokens: [],
      },
    }),
    total: 7,
  };

  const runtimeHtml = renderToStaticMarkup(
    <PageSectionContent section={section} runtimeDataByBlockId={{ "blk-filters": binding }} />
  );

  // Fetch-swap hooks: the wrapper carries the SAME data attributes the
  // collection listing markup ships, so count + form swap together.
  expect(runtimeHtml).toContain('data-page-filters-block="true"');
  expect(runtimeHtml).toContain('data-listing-block-id="blk-filters"');
  expect(runtimeHtml).toContain('data-listing-query-id="query-homes"');
  // Result-count display (TASK-459-01 counts contract field).
  expect(runtimeHtml).toContain('data-page-filters-count="7"');
  expect(runtimeHtml).toContain("7 results");
  // The facet form is a plain GET form with canonical lq.* input names: the
  // no-JS fallback submits straight into the existing server pipeline.
  expect(runtimeHtml).toContain('method="get"');
  expect(runtimeHtml).toContain("data-listing-runtime-form");
  expect(runtimeHtml).toContain('name="lq.query-homes.data.rooms.in"');
  expect(runtimeHtml).toContain("Three rooms");
  // Visitor sort control emitting lq.<id>.__sort.
  expect(runtimeHtml).toContain('name="lq.query-homes.__sort"');
  expect(runtimeHtml).toContain("Cheapest first");
  // Search row with the applied state from the URL.
  expect(runtimeHtml).toContain('name="lq.query-homes.__q"');
  expect(runtimeHtml).toContain('value="loft"');
  // Non-auto-apply forms keep the explicit submit button (no-JS path).
  expect(runtimeHtml).toContain("Apply filters");
  // The script ships through the v2 body-script seam, never inline here.
  expect(runtimeHtml).not.toContain("__nextlessListingRuntimeClient");

  // showCount=false drops the count line, nothing else.
  const noCountBlock = createPageBlockV2("filters", {
    id: "blk-filters",
    props: { ...filtersBlock.props, showCount: false },
  });
  const noCountHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-filters-nocount",
        blocks: [noCountBlock],
      })}
      runtimeDataByBlockId={{ "blk-filters": binding }}
    />
  );
  expect(noCountHtml).not.toContain("data-page-filters-count");
  expect(noCountHtml).toContain("data-listing-runtime-form");

  // Unbound (no binding) and dangling (resolver error) fail closed to the
  // same inert placeholder the other data-bound blocks use.
  const unboundHtml = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(unboundHtml).toContain('data-page-block-inert="filters"');
  expect(unboundHtml).toContain("Filters are not available yet.");
  const danglingBinding = {
    kind: "filters" as const,
    data: normalizeListingFiltersData({
      ...mapPageFiltersBlockToListingFiltersData(filtersBlock),
      resolved: {
        listingQueryId: "query-homes",
        metrics: [],
        rejectedTokens: [],
        error: "Selected listing query no longer exists.",
      },
    }),
    total: 0,
  };
  const danglingHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      runtimeDataByBlockId={{ "blk-filters": danglingBinding }}
    />
  );
  expect(danglingHtml).toContain("Filters are not available yet.");
  expect(danglingHtml).not.toContain("data-listing-runtime-form");
});

test("filters block renders a canvas-safe inert preview in canvas layout mode (TASK-459-02)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-filters-canvas",
    blocks: [
      createPageBlockV2("filters", {
        id: "blk-filters-unpicked",
        props: { queryId: null, facets: [] },
      }),
      createPageBlockV2("filters", {
        id: "blk-filters-bound",
        props: {
          queryId: "query-homes",
          facets: [
            {
              id: "rooms",
              kind: "checkbox",
              label: "Rooms",
              field: "data.rooms",
              op: "in",
              options: [{ value: "3", label: "Three rooms" }],
            },
          ],
        },
      }),
    ],
  });

  const canvasHtml = renderToStaticMarkup(
    <PageSectionContent section={section} layoutMode="canvas-device" />
  );

  // Unpicked query -> explicit empty state pointing at the Content panel.
  expect(canvasHtml).toContain("Pick a saved query in the Content panel to preview filters here.");
  // Bound query -> the configured facet form, inert: pointer events off, no
  // live filtering, no inline runtime script.
  expect(canvasHtml).toContain('data-page-editor-filters-preview="inert"');
  expect(canvasHtml).toContain("pointer-events-none");
  expect(canvasHtml).toContain('name="lq.query-homes.data.rooms.in"');
  expect(canvasHtml).toContain("Three rooms");
  expect(canvasHtml).not.toContain("__nextlessListingRuntimeClient");

  // Runtime parity: the default layout mode keeps the inert fallback.
  const runtimeHtml = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(runtimeHtml).not.toContain('data-page-editor-filters-preview="inert"');
  expect(runtimeHtml).toContain("Filters are not available yet.");
});

test("paged collection binding renders the numbered pager, totals, and template variant (TASK-459-03)", () => {
  const buildBinding = (
    overrides: Partial<PageRuntimeCollectionBinding> = {}
  ): PageRuntimeCollectionBinding => ({
    kind: "collection",
    data: normalizeContentListData({
      source: {
        mode: "listing",
        listingQueryId: "query-homes",
        contentTypeId: "ct-homes",
        statusScope: "published",
        limit: 6,
      },
      pagination: { mode: "paged", pageSize: 6 },
      resolved: {
        items: [
          {
            id: "entry-1",
            title: "Lakeside home",
            slug: "lakeside-home",
            href: "/homes/lakeside-home",
            status: "published",
          },
        ],
        total: 42,
        sourceTypeId: "ct-homes",
        sourceTypeSlug: "homes",
        listingQueryId: "query-homes",
        resolvedAt: "2026-06-12T00:00:00.000Z",
        runtime: {
          page: 5,
          pageSize: 6,
          totalPages: 7,
          pageParamKey: "lq.query-homes.__page",
          search: "lq.query-homes.__page=5",
          previousPageHref: "?lq.query-homes.__page=4",
          nextPageHref: "?lq.query-homes.__page=6",
        },
      },
    }),
    ...overrides,
  });

  const section = createPageSectionV2("content", {
    id: "sec-paged-collection",
    blocks: [
      createPageBlockV2("collection", {
        id: "blk-paged-collection",
        props: {
          contentTypeId: "ct-homes",
          queryId: "query-homes",
          limit: 6,
          paginationMode: "paged",
          pageSize: 6,
        },
      }),
    ],
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      runtimeDataByBlockId={{ "blk-paged-collection": buildBinding() }}
    />
  );

  // Totals on the pager line + windowed numbers (1 … 3 4 5 6 7) with the
  // current page marked; prev/next anchors carry the script pickup flag.
  expect(html).toContain('data-content-list-pagination="paged"');
  expect(html).toContain('data-content-list-total="42"');
  expect(html).toContain("42 results");
  expect(html).toContain('aria-current="page"');
  expect(html).toContain('href="?lq.query-homes.__page=4"');
  expect(html).toContain('href="?lq.query-homes.__page=6"');
  expect(html).toContain('aria-label="Page 7"');
  expect(html).toContain('data-listing-page-link="1"');
  // The lq page-token grammar drives every pager href.
  expect(html).toContain("lq.query-homes.__page=7");

  // Template-driven variant: the binding's resolved variant replaces the
  // hardcoded grid default.
  const compactHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      runtimeDataByBlockId={{ "blk-paged-collection": buildBinding({ variant: "compact" }) }}
    />
  );
  expect(compactHtml).toContain('data-content-list-variant="compact"');

  // Dangling-route guard: suppressed links render the explicit note instead
  // of unmatched hrefs.
  const missingRouteBinding = buildBinding();
  missingRouteBinding.data = normalizeContentListData({
    ...missingRouteBinding.data,
    resolved: {
      ...missingRouteBinding.data.resolved,
      items: [{ id: "entry-1", title: "Lakeside home", slug: "lakeside-home" }],
      cardLinkMode: "missing-route",
    },
  });
  const guardedHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      runtimeDataByBlockId={{ "blk-paged-collection": missingRouteBinding }}
    />
  );
  expect(guardedHtml).toContain('data-content-list-link-unavailable="1"');
  expect(guardedHtml).not.toContain('href="/homes/lakeside-home"');
});
