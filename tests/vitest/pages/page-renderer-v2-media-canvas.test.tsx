import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import { PageSectionContent } from "../../../core/services/pages/pageRendererV2";

import { serializePageBlockPath } from "../../../core/services/pages/pageBlockPaths";

import { buildPageEditorCollectionPreviewBinding } from "../../../core/services/pages/pageEditorCollectionPreview";

import { buildPageEditorFormPreviewBinding } from "../../../core/services/pages/pageEditorFormPreview";

import {
  mapPageFiltersBlockToListingFiltersData,
  type PageRuntimeDataByBlockId,
} from "../../../core/services/pages/pageRuntimeBindingContract";

import { normalizeListingFiltersData } from "../../../core/services/renderContracts/listingFiltersContract";

test("video autoplay prop reaches the rendered video with policy companions", () => {
  const section = createPageSectionV2("content", {
    id: "sec-video-autoplay",
    blocks: [
      createPageBlockV2("video", {
        id: "blk-video-autoplay",
        props: {
          src: "https://cdn.example.test/intro.mp4",
          title: "Intro",
          autoplay: true,
          muted: false,
        },
      }),
      createPageBlockV2("video", {
        id: "blk-video-manual",
        props: {
          src: "https://cdn.example.test/manual.mp4",
          title: "Manual",
          autoplay: false,
          muted: false,
        },
      }),
    ],
  });

  const videoTags = Array.from(
    renderToStaticMarkup(<PageSectionContent section={section} />).matchAll(/<video[^>]*>/g),
    (match) => match[0]
  );

  expect(videoTags[0]).toContain("autoPlay");
  expect(videoTags[0]).toContain("muted");
  expect(videoTags[0]).toContain("playsInline");
  expect(videoTags[0]).toContain('title="Intro"');
  expect(videoTags[0]).toContain('aria-label="Intro"');
  expect(videoTags[1]).not.toContain("autoPlay");
  expect(videoTags[1]).not.toContain("playsInline");
  expect(videoTags[1]).not.toContain("muted");
  expect(videoTags[1]).toContain('title="Manual"');
  expect(videoTags[1]).toContain('aria-label="Manual"');
});

test("video title stays off the inert placeholder when no safe source renders", () => {
  const section = createPageSectionV2("content", {
    id: "sec-video-placeholder-title",
    blocks: [
      createPageBlockV2("video", {
        id: "blk-video-empty-src",
        props: {
          src: "",
          title: "No source",
          autoplay: false,
          muted: true,
        },
      }),
      createPageBlockV2("video", {
        id: "blk-video-unsafe-src",
        props: {
          src: "javascript:alert(1)",
          title: "Unsafe source",
          autoplay: true,
          muted: false,
        },
      }),
    ],
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('data-block-id="blk-video-empty-src"');
  expect(html).toContain('data-block-id="blk-video-unsafe-src"');
  expect(html).toContain("Video");
  expect(html).not.toContain("<video");
  expect(html).not.toContain("No source");
  expect(html).not.toContain("Unsafe source");
  expect(html).not.toContain("title=");
  expect(html).not.toContain("aria-label=");
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("alert(1)");
});

test("divider tone prop changes the rendered divider border style", () => {
  const section = createPageSectionV2("content", {
    id: "sec-divider-tone",
    blocks: [
      createPageBlockV2("divider", {
        id: "blk-divider-accent",
        props: { tone: "accent", thickness: 3 },
      }),
      createPageBlockV2("divider", {
        id: "blk-divider-muted",
        props: { tone: "muted", thickness: 2 },
      }),
      createPageBlockV2("divider", {
        id: "blk-divider-neutral",
        props: { tone: "neutral", thickness: 1 },
      }),
    ],
  });

  const hrTags = Array.from(
    renderToStaticMarkup(<PageSectionContent section={section} />).matchAll(/<hr[^>]*>/g),
    (match) => match[0]
  );

  expect(hrTags[0]).toContain("border-color:var(--coderso-section-accent,#0d9488)");
  expect(hrTags[0]).toContain("border-width:3px");
  expect(hrTags[0]).not.toContain("border-[var(--coderso-section-accent");
  expect(hrTags[1]).toContain("border-color:#cbd5e1");
  expect(hrTags[2]).toContain("border-color:#e2e8f0");
});

test("spacer size prop reaches the rendered inert spacer height", () => {
  const section = createPageSectionV2("content", {
    id: "sec-spacer-size",
    blocks: [
      createPageBlockV2("spacer", {
        id: "blk-spacer-default",
        props: {},
      }),
      createPageBlockV2("spacer", {
        id: "blk-spacer-large",
        props: { size: 72 },
      }),
    ],
  });

  const spacerTags = Array.from(
    renderToStaticMarkup(<PageSectionContent section={section} />).matchAll(
      /<div[^>]*aria-hidden="true"[^>]*>/g
    ),
    (match) => match[0]
  );

  expect(spacerTags[0]).toContain("height:32px");
  expect(spacerTags[1]).toContain("height:72px");
});

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

test("gallery renderer exposes a bounded empty state for empty item arrays", () => {
  const section = createPageSectionV2("content", {
    id: "sec-empty-gallery",
    blocks: [
      createPageBlockV2("gallery", {
        id: "blk-empty-gallery",
        props: { items: [], layout: "grid" },
      }),
    ],
  });
  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('data-block-id="blk-empty-gallery"');
  expect(html).toContain('data-page-gallery-empty="true"');
  expect(html).toContain("Empty gallery");
});

test("admin preview frame callback receives recursive block path metadata", () => {
  const section = createPageSectionV2("content", {
    id: "sec-frame-paths",
    blocks: [
      createPageBlockV2("container", {
        id: "blk-container",
        slots: {
          children: [
            createPageBlockV2("group", {
              id: "blk-group",
              slots: {
                children: [
                  createPageBlockV2("heading", {
                    id: "blk-nested-heading",
                    props: { text: "Nested frame", level: "h2", align: "left" },
                  }),
                ],
              },
            }),
          ],
        },
      }),
    ],
  });
  const frames: Array<{
    id: string;
    path: string;
    depth: number;
    slotKey?: string;
    parentId?: string;
  }> = [];

  renderToStaticMarkup(
    <PageSectionContent
      section={section}
      renderBlockFrame={({ block, content, blockPath, depth, slotKey, parentBlock }) => {
        frames.push({
          id: block.id,
          path: serializePageBlockPath(blockPath),
          depth,
          slotKey,
          parentId: parentBlock?.id,
        });
        return <div data-frame-id={block.id}>{content}</div>;
      }}
    />
  );

  expect(frames).toContainEqual({
    id: "blk-container",
    path: "root:0",
    depth: 1,
    slotKey: undefined,
    parentId: undefined,
  });
  expect(frames).toContainEqual({
    id: "blk-group",
    path: "root:0/children:0",
    depth: 2,
    slotKey: "children",
    parentId: "blk-container",
  });
  expect(frames).toContainEqual({
    id: "blk-nested-heading",
    path: "root:0/children:0/children:0",
    depth: 3,
    slotKey: "children",
    parentId: "blk-group",
  });
});
