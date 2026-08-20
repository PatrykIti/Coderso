// TASK-539-05-L01 — shared renderer core: admin canvas chrome, preview callbacks, hidden/inert states, per-column composition, byte-identity, per-edge border, native timeline
// Cohesive suite split out of the former `page-renderer-v2.test.tsx` monolith.
// Each suite is independently runnable in the Vitest lane (Bun-free pages renderer).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { readFileSync } from "node:fs";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  PageDocumentRender,
  PageSectionContent,
  PageSectionRender,
  resolvePageRenderTree,
  toPageBlockRenderProps,
  toPageSectionBleedStyle,
  toPageSectionStyle,
} from "../../../core/services/pages/pageRendererV2";
import { serializePageBlockPath } from "../../../core/services/pages/pageBlockPaths";
import { createDocument, createSection } from "./pageRendererV2TestFixtures";
test("admin preview wrappers preserve the same shared section and block content", () => {
  const section = createSection();
  const runtimeContent = renderToStaticMarkup(<PageSectionContent section={section} />);
  const adminContent = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      renderBlockFrame={({ content, renderProps }) => (
        <div
          className={renderProps.className}
          style={renderProps.style}
          {...renderProps.dataAttributes}
          data-editor-chrome="true"
        >
          {content}
        </div>
      )}
    />
  );

  expect(adminContent.replaceAll(' data-editor-chrome="true"', "")).toBe(runtimeContent);
  expect(renderToStaticMarkup(<PageSectionRender section={section} />)).toContain(
    'data-page-variant="centered"'
  );
  expect(
    renderToStaticMarkup(<PageSectionContent section={section} layoutMode="canvas-device" />)
  ).toContain('data-page-section-layout-mode="canvas-device"');
});

test("shared renderer omits hidden block frames unless admin opts in", () => {
  const section = createPageSectionV2("content", {
    id: "sec-hidden-block-renderer",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-public-heading",
        props: { text: "Public headline", level: "h2", align: "left" },
      }),
      createPageBlockV2("text", {
        id: "blk-hidden-text",
        props: { text: "Hidden body", format: "plain", align: "left" },
        visibility: { visible: false },
      }),
    ],
  });

  const runtimeContent = renderToStaticMarkup(<PageSectionContent section={section} />);
  const adminContent = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      includeHiddenBlocks
      renderBlockFrame={({ block, content, renderProps }) => (
        <div {...renderProps.dataAttributes} data-admin-preview="true">
          {content ?? <span>Hidden ghost</span>}
        </div>
      )}
    />
  );

  expect(runtimeContent).toContain("Public headline");
  expect(runtimeContent).not.toContain("Hidden body");
  expect(runtimeContent).not.toContain('data-block-id="blk-hidden-text"');
  expect(adminContent).toContain('data-block-id="blk-hidden-text"');
  expect(adminContent).toContain("Hidden ghost");

  const documentHtml = renderToStaticMarkup(
    <PageDocumentRender document={createDocument([section])} />
  );
  expect(documentHtml).not.toContain('data-block-id="blk-hidden-text"');
});

test("shared renderer provides safe inert states while rendering active layout slots recursively", () => {
  const section = createPageSectionV2("content", {
    id: "sec-empty-block-placeholders",
    blocks: [
      createPageBlockV2("image", {
        id: "blk-empty-image",
        props: { src: "", alt: "", caption: "", fit: "cover" },
      }),
      createPageBlockV2("video", {
        id: "blk-empty-video",
        props: { src: "", title: "", autoplay: false, muted: true },
      }),
      createPageBlockV2("gallery", {
        id: "blk-static-gallery",
        props: {
          layout: "masonry",
          items: [
            {
              src: "https://cdn.example.test/studio.jpg",
              alt: "Studio",
              caption: "Studio view",
            },
            { title: "Planning board" },
          ],
        },
      }),
      createPageBlockV2("collection", {
        id: "blk-inert-collection",
        props: { contentTypeId: "ct-private", queryId: "query-private", limit: 6 },
      }),
      createPageBlockV2("form", {
        id: "blk-inert-form",
        props: { formId: "form-private", title: "Contact form" },
      }),
      createPageBlockV2("embed", {
        id: "blk-safe-embed",
        props: {
          html: "<script>alert(1)</script>",
          url: "https://example.test/embed",
          provider: "custom",
        },
      }),
      createPageBlockV2("columns", {
        id: "blk-layout-columns",
        props: { count: 2, gap: 24, distribution: "equal" },
        slots: {
          "column:1": [
            createPageBlockV2("heading", {
              id: "blk-nested-active",
              props: { text: "Nested active", level: "h2", align: "left" },
            }),
          ],
          "column:2": [
            createPageBlockV2("text", {
              id: "blk-hidden-nested",
              props: { text: "Hidden nested", format: "plain", align: "left" },
              visibility: { visible: false },
            }),
          ],
          "column:3": [
            createPageBlockV2("heading", {
              id: "blk-dormant-nested",
              props: { text: "Dormant nested", level: "h2", align: "left" },
            }),
          ],
        },
      }),
    ],
  });
  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('data-block-id="blk-empty-image"');
  expect(html).toContain('data-block-id="blk-empty-video"');
  expect(html).toContain('data-block-id="blk-static-gallery"');
  expect(html).toContain('data-block-id="blk-inert-collection"');
  expect(html).toContain('data-block-id="blk-inert-form"');
  expect(html).toContain('data-block-id="blk-safe-embed"');
  expect(html).toContain('data-block-id="blk-layout-columns"');
  expect(html).toContain("Image");
  expect(html).toContain("Video");
  expect(html).toContain('data-page-gallery="true"');
  expect(html).toContain('data-page-gallery-layout="masonry"');
  expect(html).toContain("https://cdn.example.test/studio.jpg");
  expect(html).toContain("Studio view");
  expect(html).toContain("Planning board");
  expect(html).toContain('data-page-block-inert="collection"');
  expect(html).toContain('data-page-block-inert="form"');
  expect(html).toContain('data-page-block-inert="embed"');
  expect(html).toContain("Contact form is not available yet.");
  expect(html).toContain('data-page-layout-block="columns"');
  expect(html).toContain('data-page-block-slot="column:1"');
  expect(html).toContain('data-page-block-slot="column:2"');
  expect(html).not.toContain('data-page-block-slot="column:3"');
  expect(html).toContain("Nested active");
  expect(html).not.toContain("Columns");
  expect(html).not.toContain("Hidden nested");
  expect(html).not.toContain("Dormant nested");
  expect(html).not.toContain("ct-private");
  expect(html).not.toContain("query-private");
  expect(html).not.toContain("form-private");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("alert(1)");
});

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

test("document renderer resolves responsive block overrides before rendering", () => {
  const section = createPageSectionV2("hero", {
    id: "sec-responsive-renderer",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-responsive-heading",
        props: { text: "Desktop headline", level: "h1", align: "center" },
        responsive: {
          mobile: { props: { text: "Mobile headline" } },
        },
      }),
      createPageBlockV2("container", {
        id: "blk-responsive-container",
        slots: {
          children: [
            createPageBlockV2("heading", {
              id: "blk-responsive-nested-heading",
              props: { text: "Desktop nested headline", level: "h2", align: "left" },
              responsive: {
                mobile: { props: { text: "Mobile nested headline" } },
              },
            }),
          ],
        },
      }),
    ],
  });
  const document = createDocument([section]);

  expect(resolvePageRenderTree(document, "mobile").sections[0]?.blocks[0]?.props.text).toBe(
    "Mobile headline"
  );
  expect(
    resolvePageRenderTree(document, "mobile").sections[0]?.blocks[1]?.slots?.children?.[0]?.props
      .text
  ).toBe("Mobile nested headline");
  const html = renderToStaticMarkup(<PageDocumentRender document={document} breakpoint="mobile" />);
  expect(html).toContain('data-page-v2="true"');
  expect(html).toContain("Mobile headline");
  expect(html).toContain("Mobile nested headline");
  expect(html).not.toContain("Desktop headline");
  expect(html).not.toContain("Desktop nested headline");
});

test("document renderer omits hidden sections outside admin chrome", () => {
  const visibleSection = createPageSectionV2("content", {
    id: "sec-visible-renderer",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-visible-heading",
        props: { text: "Visible headline", level: "h2", align: "left" },
      }),
    ],
  });
  const hiddenSection = createPageSectionV2("content", {
    id: "sec-hidden-renderer",
    visibility: {
      visible: false,
      authOnly: false,
      anchor: "hidden",
      startsAt: null,
      endsAt: null,
    },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-hidden-heading",
        props: { text: "Hidden headline", level: "h2", align: "left" },
      }),
    ],
  });
  const html = renderToStaticMarkup(
    <PageDocumentRender document={createDocument([visibleSection, hiddenSection])} />
  );

  expect(html).toContain("Visible headline");
  expect(html).not.toContain("Hidden headline");
  expect(html).not.toContain('data-section-id="sec-hidden-renderer"');
});

test("shared renderer remains inside the Bun-free Pages service boundary", () => {
  const source = readFileSync("core/services/pages/pageRendererV2.tsx", "utf8");

  expect(source).toContain('from "./pageDocumentV2"');
  expect(source).not.toMatch(/@\/|db\/client|settingsService|pagesClient|server\/|core\/site/);
});

test("admin and site Tailwind entrypoints scan Pages service renderer classes", () => {
  const adminCss = readFileSync("core/admin/styles/globals.css", "utf8");
  const siteCss = readFileSync("core/site/styles/site.css", "utf8");

  expect(adminCss).toContain('@source "../../services/pages/**/*.{ts,tsx}"');
  expect(siteCss).toContain('@source "../../services/pages/**/*.{ts,tsx}"');
});

test("front render of multi-column grids keeps editor ghost affordances out of the markup", () => {
  const emptyGridSection = createPageSectionV2("content", {
    id: "sec-empty-grid",
    layout: { columns: 3, align: "start", justify: "start", maxWidth: 1100 },
    blocks: [],
  });
  const gridSection = createPageSectionV2("content", {
    id: "sec-grid",
    layout: { columns: 2, align: "start", justify: "start", maxWidth: 1100 },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-grid-heading",
        props: { text: "Grid heading", level: "h2", align: "left" },
      }),
      createPageBlockV2("columns", {
        id: "blk-grid-columns",
        props: { count: 2, gap: 24, distribution: "equal" },
        slots: {
          "column:1": [
            createPageBlockV2("text", {
              id: "blk-grid-copy",
              props: { text: "Column copy", format: "plain", align: "left" },
            }),
          ],
        },
      }),
    ],
  });
  const html = renderToStaticMarkup(
    <PageDocumentRender document={createDocument([emptyGridSection, gridSection])} />
  );

  expect(html).toContain('data-section-id="sec-grid"');
  expect(html).toContain('data-page-block-slot="column:1"');
  expect(html).toContain('data-page-block-slot="column:2"');
  // Front parity guard: ghost add tiles are editor-only chrome and must never
  // serialize into public markup, even for empty grids and empty column slots.
  expect(html).not.toContain("data-page-editor");
  expect(html).not.toContain("Add block");
  expect(html).not.toContain("Add the first block");
});

test("row-direction group renders two buttons side by side on front and canvas (owner finding #7)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-row-group",
    blocks: [
      createPageBlockV2("group", {
        id: "blk-row-group",
        props: { direction: "row", wrap: false, gap: 16 },
        slots: {
          children: [
            createPageBlockV2("button", {
              id: "blk-cta-first",
              props: {
                label: "First action",
                href: "/a",
                target: "self",
                variant: "primary",
                size: "md",
              },
            }),
            createPageBlockV2("button", {
              id: "blk-cta-second",
              props: {
                label: "Second action",
                href: "/b",
                target: "self",
                variant: "primary",
                size: "md",
              },
            }),
          ],
        },
      }),
    ],
  });

  const front = renderToStaticMarkup(<PageSectionRender section={section} />);
  expect(front).toContain('data-page-block-slot="children"');
  expect(front).toContain("flex flex-row");
  expect(front.match(/<a\s/g) ?? []).toHaveLength(2);
  expect(front.indexOf("First action")).toBeLessThan(front.indexOf("Second action"));

  const canvas = renderToStaticMarkup(
    <PageSectionContent section={section} layoutMode="canvas-device" />
  );
  expect(canvas).toContain("flex flex-row");
  expect(canvas.match(/<a\s/g) ?? []).toHaveLength(2);
});

test("admin columns-slot trailing hook renders per active slot and never on runtime paths", () => {
  const section = createPageSectionV2("content", {
    id: "sec-slot-hook",
    blocks: [
      createPageBlockV2("columns", {
        id: "blk-hook-columns",
        props: { count: 2, gap: 24, distribution: "equal" },
        slots: {
          "column:1": [
            createPageBlockV2("heading", {
              id: "blk-hook-heading",
              props: { text: "Slot child", level: "h2", align: "left" },
            }),
          ],
        },
      }),
    ],
  });

  const calls: Array<{ slotKey: string; childCount: number; ownerPath: string }> = [];
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      layoutMode="canvas-device"
      renderColumnsSlotTrailing={({ slotKey, ownerPath, childCount }) => {
        calls.push({ slotKey, childCount, ownerPath: serializePageBlockPath(ownerPath) });
        return (
          <button type="button" data-page-editor-ghost="columns-slot">
            Add block
          </button>
        );
      }}
      trailingContent={
        <button type="button" data-page-editor-ghost="section-append">
          Add block
        </button>
      }
    />
  );

  expect(calls).toEqual([
    { slotKey: "column:1", childCount: 1, ownerPath: "root:0" },
    { slotKey: "column:2", childCount: 0, ownerPath: "root:0" },
  ]);
  expect(html.match(/data-page-editor-ghost="columns-slot"/g)).toHaveLength(2);
  expect(html).toContain('data-page-editor-ghost="section-append"');

  const runtime = renderToStaticMarkup(<PageSectionRender section={section} />);
  expect(runtime).not.toContain("data-page-editor-ghost");
});

// --- Section per-column composition (owner finding #5, round 3) ---

const createTwoColumnSection = (blocks: PageSectionV2["blocks"]) =>
  createPageSectionV2("content", {
    id: "sec-column-composition",
    name: "Column composition",
    layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
    blocks,
  });

const compositionBlocks = (columns: Array<number | null>) =>
  columns.map((column, index) =>
    createPageBlockV2("text", {
      id: `blk-col-${index + 1}`,
      props: { text: `Copy ${index + 1}`, format: "plain", align: "left" },
      ...(column === null ? {} : { style: { column } }),
    })
  );

test("section without column assignments keeps the auto-flow markup byte-identical (legacy pin)", () => {
  // Documents authored before `style.column` existed never carry the field;
  // an explicit `column: null` is the normalized "legacy auto-flow" value.
  // Both must produce the exact same wrapper-free auto-flow markup.
  const unset = createTwoColumnSection(compositionBlocks([null, null, null]));
  const explicitNull = createTwoColumnSection(
    compositionBlocks([null, null, null]).map((block) => ({
      ...block,
      style: { ...(block.style ?? {}), column: null },
    }))
  );

  const unsetMarkup = renderToStaticMarkup(<PageSectionContent section={unset} />);
  const explicitNullMarkup = renderToStaticMarkup(<PageSectionContent section={explicitNull} />);
  expect(explicitNullMarkup).toBe(unsetMarkup);
  // No per-column wrappers: blocks stay direct auto-flow grid children, in
  // stored order, immediately inside the section content element.
  expect(unsetMarkup).not.toContain("data-page-section-column");
  expect(unsetMarkup.indexOf("blk-col-1")).toBeLessThan(unsetMarkup.indexOf("blk-col-2"));
  expect(unsetMarkup.indexOf("blk-col-2")).toBeLessThan(unsetMarkup.indexOf("blk-col-3"));
  expect(/data-page-section-layout-mode="runtime"><div class="max-w-full/.test(unsetMarkup)).toBe(
    true
  );
});

test("section column assignments render per-column wrapper stacks with legacy cells for unassigned blocks", () => {
  // Hero starter shape: three blocks pinned to column 1, plus one unassigned
  // block at index 3 (legacy auto-flow cell 3 % 2 -> column 2) and one
  // out-of-range assignment that clamps into the last painted column.
  const section = createTwoColumnSection(compositionBlocks([1, 1, 1, null, 4]));
  const markup = renderToStaticMarkup(<PageSectionContent section={section} />);

  const wrappers = markup.split('data-page-section-column="').slice(1);
  expect(wrappers).toHaveLength(2);
  const [columnOne, columnTwo] = wrappers as [string, string];
  expect(columnOne.startsWith("1")).toBe(true);
  expect(columnTwo.startsWith("2")).toBe(true);
  for (const id of ["blk-col-1", "blk-col-2", "blk-col-3"]) {
    expect(columnOne).toContain(id);
    expect(columnTwo.includes(id)).toBe(false);
  }
  // Unassigned block keeps its legacy visual cell; column 4 clamps to 2.
  expect(columnTwo).toContain("blk-col-4");
  expect(columnTwo).toContain("blk-col-5");
  expect(columnTwo.indexOf("blk-col-4")).toBeLessThan(columnTwo.indexOf("blk-col-5"));
  // Wrappers inherit the section gap so vertical rhythm matches auto-flow.
  expect(markup).toContain("gap:inherit");
  expect(markup).toContain('data-page-section-column-owner="sec-column-composition"');
});

test("section column composition keeps canvas/front parity and runtime renders no ghost affordances", () => {
  const section = createTwoColumnSection(compositionBlocks([1, null, 2]));
  const runtime = renderToStaticMarkup(<PageSectionContent section={section} />);
  const admin = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      renderBlockFrame={({ content, renderProps }) => (
        <div
          className={renderProps.className}
          style={renderProps.style}
          {...renderProps.dataAttributes}
          data-editor-chrome="true"
        >
          {content}
        </div>
      )}
    />
  );
  expect(admin.replaceAll(' data-editor-chrome="true"', "")).toBe(runtime);
  expect(runtime).not.toContain("data-page-editor-ghost");

  // The per-column trailing hook is admin-only chrome: it fires once per
  // composition column AFTER that column's blocks, and runtime paths that
  // never pass it stay unchanged.
  const calls: Array<{ column: number; childCount: number }> = [];
  const canvas = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      layoutMode="canvas-device"
      renderSectionColumnTrailing={({ column, childCount }) => {
        calls.push({ column, childCount });
        return (
          <button type="button" data-page-editor-ghost="section-column-append">
            Add block
          </button>
        );
      }}
    />
  );
  expect(calls).toEqual([
    { column: 1, childCount: 1 },
    { column: 2, childCount: 2 },
  ]);
  expect(canvas.match(/data-page-editor-ghost="section-column-append"/g)).toHaveLength(2);
});

test("stackVertical collapses column wrappers into one stacked column without losing composition", () => {
  const base = createTwoColumnSection(compositionBlocks([1, 1, null]));
  const stacked: PageSectionV2 = { ...base, layout: { ...base.layout, stackVertical: true } };
  const markup = renderToStaticMarkup(
    <PageSectionContent section={stacked} layoutMode="canvas-device" />
  );
  // The grid collapses to a single column while the wrapper DOM (derived from
  // the composition count, not the collapsed count) keeps the column groups —
  // mirroring the front's grid-cols-1 media collapse over base markup.
  expect(markup).toContain("grid-cols-1");
  expect(markup.match(/data-page-section-column="/g)).toHaveLength(2);
});

test("no-glow / no-gradient section + block render byte-identical to the pre-531 style shape", () => {
  const section = createPageSectionV2("hero", {
    id: "sec-noeffect",
    style: {
      background: "#eef2ff",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 12,
      shadow: "sm",
    },
  });
  const style = toPageSectionStyle(section);
  // The enum shadow alone (no glow) is UNCHANGED — no trailing comma-joined glow.
  expect(style.boxShadow).toBe("0 6px 20px rgba(15, 23, 42, 0.08)");
  expect(style.backgroundColor).toBe("#eef2ff");
  const block = createPageBlockV2("heading", {
    id: "blk-noeffect",
    props: { text: "Plain", level: "h2", align: "left" },
    style: { shadow: "md" },
  });
  expect(toPageBlockRenderProps(block).style.boxShadow).toBe("0 14px 40px rgba(15, 23, 42, 0.12)");
});
// TASK-533-02-L04 — render emit: per-edge section border on the box that paints the
// section background in each mode (content box for normal, bleed box for full-bleed).
describe("per-edge section border render emit (TASK-533-02)", () => {
  test("emits per-edge border on the section box (border-block = top+bottom only)", () => {
    const section = createPageSectionV2("content", {
      id: "sec-border-block",
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        border: { top: { color: "#fff2", width: 1 }, bottom: { color: "#fff2", width: 1 } },
      } as never,
    });
    const st = toPageSectionStyle(section) as Record<string, unknown>;
    expect(st.borderTopWidth).toBe("1px");
    expect(st.borderBottomWidth).toBe("1px");
    expect(st.borderTopStyle).toBe("solid");
    // border-block: NO left/right emitted.
    expect("borderLeftWidth" in st).toBe(false);
    expect("borderRightWidth" in st).toBe(false);
  });

  test("emits nothing when border unset (byte-identical to post-530)", () => {
    const st = toPageSectionStyle(
      createPageSectionV2("content", { id: "sec-no-border" })
    ) as Record<string, unknown>;
    expect(Object.keys(st).some((k) => k.startsWith("border") && k !== "borderRadius")).toBe(false);
  });

  test("a full-bleed section frames its border on the BLEED box, not the paint-empty content box", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-bleed-border",
      variant: "default",
      style: {
        background: "#dcfce7",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        fullBleed: true,
        border: { top: { color: "#fff2", width: 1 }, bottom: { color: "#fff2", width: 1 } },
      } as never,
    });
    const bleed = toPageSectionBleedStyle(section) as Record<string, unknown>;
    expect(bleed.borderTopWidth).toBe("1px");
    expect(bleed.borderBottomWidth).toBe("1px");
    // The paint-empty full-bleed content-box return carries NO border (frame rides the bleed box).
    const content = toPageSectionStyle(section) as Record<string, unknown>;
    expect(Object.keys(content).some((k) => k.startsWith("border"))).toBe(false);
  });

  test("a NON-full-bleed section carries the border on the content box; bleed style is undefined", () => {
    const section = createPageSectionV2("content", {
      id: "sec-normal-border",
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        border: { top: { color: "#fff2", width: 1 } },
      } as never,
    });
    const st = toPageSectionStyle(section) as Record<string, unknown>;
    expect(st.borderTopWidth).toBe("1px");
    expect(toPageSectionBleedStyle(section)).toBeUndefined();
  });
});

// TASK-533-03-L02 — native timeline vertical axis + glow dots. Additive DOM: all
// existing data-page-timeline-* hooks retained; the horizontal variant is not
// regressed. No author-controlled value (axis tinted off --coderso-section-accent).
describe("native timeline vertical axis (TASK-533-03)", () => {
  const makeTimelineSection = (variant: "default" | "compact" | "horizontal") =>
    createPageSectionV2("timeline", {
      id: `sec-timeline-${variant}`,
      variant,
      layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
      blocks: [
        createPageBlockV2("heading", {
          id: `tl-a-${variant}`,
          props: { text: "Step one", level: "h3", align: "left" },
        }),
        createPageBlockV2("heading", {
          id: `tl-b-${variant}`,
          props: { text: "Step two", level: "h3", align: "left" },
        }),
        createPageBlockV2("heading", {
          id: `tl-c-${variant}`,
          props: { text: "Step three", level: "h3", align: "left" },
        }),
      ],
    });

  test("vertical variant draws a CONTINUOUS axis: full-item segments bleed across the row gap", () => {
    const html = renderToStaticMarkup(
      <PageSectionRender section={makeTimelineSection("default")} />
    );
    // 3 items, each with an axis segment + a retained marker + retained content hook.
    expect((html.match(/data-page-timeline-item=/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-axis-line="true"/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-marker="true"/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-content="true"/g) ?? []).length).toBe(3);
    // The axis is tinted off the fixed section-accent gradient literal (not an author
    // string), reinforcing that no author-controlled value reaches the timeline CSS.
    expect(html).toContain("linear-gradient(var(--coderso-section-accent");
    // CONTINUITY (audit remediation 2026-07-09). The section content grid stacks these
    // items with a real 24px ROW gap AND each item carries its own `py-3` (12px) padding.
    // The axis-line must span the FULL item box (`inset-y-0`) so the py padding is INSIDE
    // the segment — otherwise a dot-row-only span leaves a visible ~24px BREAK at every
    // boundary (the pre-fix dashed rule). Assert the axis-line is the full-item `inset-y-0`
    // rule, no longer clamped to the dot-row.
    expect(html).toMatch(
      /data-page-timeline-axis-line="true"[^>]*inset-y-0|inset-y-0[^>]*data-page-timeline-axis-line="true"/
    );
    // The NON-LAST items bleed the bottom by exactly the resolved row gap (24px default) so
    // segment N reaches segment N+1's top — real inter-segment continuity, not just the
    // grid gap. There are 3 items ⇒ 2 non-last segments carry the bleed.
    expect((html.match(/bottom:calc\(-1 \* 24px\)/g) ?? []).length).toBe(2);
    // The LAST item ENDS the rule at its dot: TASK-539-05-L01 geometry resolves the
    // final bottom to `calc(100% - markerCenterPx)` so the segment stops exactly at the
    // final marker center — no overshoot into the item's bottom padding or empty section
    // space (the old `bottom:0` overshot the py-3 padding; the 539-05 geometry fixes it).
    expect(html).toContain("bottom:calc(100% - 22px)");
    // The glow dot carries a box-shadow off the accent (`.timeline article:before`).
    expect(html).toContain("box-shadow:0 0 16px var(--coderso-section-accent");
  });

  test("compact vertical variant bleeds the axis across the CLAMPED (smaller) gap", () => {
    const html = renderToStaticMarkup(
      <PageSectionRender section={makeTimelineSection("compact")} />
    );
    expect((html.match(/data-page-timeline-axis-line="true"/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-marker="true"/g) ?? []).length).toBe(3);
    // Compact scales the section gap (24 → round(24*0.6)=14 via scalePageSectionSpacing,
    // floored at min 8); the bleed offset is DERIVED from the actual resolved gap, so it
    // tracks the scaled value, not the default 24px. Two non-last segments carry it.
    expect((html.match(/bottom:calc\(-1 \* 14px\)/g) ?? []).length).toBe(2);
    expect(html).not.toContain("bottom:calc(-1 * 24px)");
    // Full-item span + last-item marker-center end are preserved under the compact clamp
    // too (compact marker center = 18px).
    expect(html).toMatch(
      /data-page-timeline-axis-line="true"[^>]*inset-y-0|inset-y-0[^>]*data-page-timeline-axis-line="true"/
    );
    expect(html).toContain("bottom:calc(100% - 18px)");
  });

  test("horizontal variant still renders (markers retained, no vertical axis, no regression)", () => {
    const html = renderToStaticMarkup(
      <PageSectionRender section={makeTimelineSection("horizontal")} />
    );
    expect((html.match(/data-page-timeline-item=/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-marker="true"/g) ?? []).length).toBe(3);
    // Horizontal keeps the top-row marker layout and draws NO vertical axis line.
    expect(html).not.toContain('data-page-timeline-axis-line="true"');
    expect(html).toContain("md:grid-rows-[auto_1fr]");
  });
});
