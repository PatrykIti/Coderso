// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import { SectionCanvas } from "../../../core/admin/ui/pages/editor/PageAuthoringCanvas";
import {
  baseCanvasProps,
  createPageBlockV2,
  createPageSectionV2,
  mount,
  renderToStaticMarkup,
  sectionWithBrandBlockProps,
} from "./pageAuthoringCanvasHarness";

test("SectionCanvas renders existing canvas chrome and ghost add affordances", () => {
  const section = createPageSectionV2("hero", {
    id: "sec-canvas",
    name: "Canvas",
    layout: { columns: 2, align: "start", justify: "start", maxWidth: 960 },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-heading",
        props: { text: "Canvas headline", level: "h2", align: "left" },
      }),
    ],
  });

  const html = renderToStaticMarkup(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-heading"
      inlineEditTarget={null}
      device="desktop"
      canAddBlockBeside
      canvasDataByBlockId={{}}
      onSelect={vi.fn()}
      onSelectBlock={vi.fn()}
      onAddBlock={vi.fn()}
      onAddBlockToTarget={vi.fn()}
      onAddBlockBeside={vi.fn()}
      onStartInlineEdit={vi.fn()}
      onCommitInlineEdit={vi.fn()}
      onApplyTextMark={vi.fn()}
    />
  );

  expect(html).toContain('data-page-editor-section="hero"');
  expect(html).toContain('data-page-editor-block="heading"');
  expect(html).toContain('data-page-editor-ghost="add-block-beside"');
  expect(html).toContain('data-page-editor-ghost="section-column-append"');
  expect(html).toContain('data-page-editor-inline-edit="idle"');
});

test("SectionCanvas renders hidden block ghost through the reusable label helper", () => {
  const section = createPageSectionV2("content", {
    id: "sec-hidden-canvas",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-hidden-text",
        props: { text: "Hidden canvas text", format: "plain", align: "left" },
        visibility: { visible: false },
      }),
    ],
  });

  const html = renderToStaticMarkup(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected={false}
      selectedBlockPath={null}
      selectedBlockId={null}
      inlineEditTarget={null}
      device="desktop"
      canAddBlockBeside={false}
      canvasDataByBlockId={{}}
      onSelect={vi.fn()}
      onSelectBlock={vi.fn()}
      onAddBlock={vi.fn()}
      onAddBlockToTarget={vi.fn()}
      onAddBlockBeside={vi.fn()}
      onStartInlineEdit={vi.fn()}
      onCommitInlineEdit={vi.fn()}
      onApplyTextMark={vi.fn()}
    />
  );

  expect(html).toContain('data-page-editor-hidden-block-ghost="true"');
  expect(html).toContain("Hidden text");
  expect(html).toContain("Hidden canvas text");
});

test("SectionCanvas exposes sanitized rich text through the inline edit wrapper", () => {
  const section = createPageSectionV2("content", {
    id: "sec-rich-canvas",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-rich-text",
        props: {
          text: '<p>Canvas <strong>rich</strong> <script>alert(1)</script><a href="/safe">safe</a></p>',
          format: "rich",
          align: "left",
        },
      }),
    ],
  });

  const html = renderToStaticMarkup(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-rich-text"
      inlineEditTarget={{ blockId: "blk-rich-text", propPath: "text" }}
      device="desktop"
      canAddBlockBeside={false}
      canvasDataByBlockId={{}}
      onSelect={vi.fn()}
      onSelectBlock={vi.fn()}
      onAddBlock={vi.fn()}
      onAddBlockToTarget={vi.fn()}
      onAddBlockBeside={vi.fn()}
      onStartInlineEdit={vi.fn()}
      onCommitInlineEdit={vi.fn()}
      onApplyTextMark={vi.fn()}
    />
  );

  expect(html).toContain('data-page-editor-inline-edit="active"');
  expect(html).toContain('data-page-editor-inline-edit-prop="text"');
  expect(html).toContain("<strong");
  expect(html).toContain(">rich</strong>");
  expect(html).toContain('href="/safe"');
  expect(html).not.toContain("<script");
  expect(html).not.toContain("alert(1)");
});

test("SectionCanvas mounts rich text blocks with a block inline-edit wrapper", () => {
  const section = createPageSectionV2("content", {
    id: "sec-rich-canvas-dom",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-rich-text-dom",
        props: {
          text: "<p>Canvas <strong>rich</strong></p><ul><li>Nested item</li></ul>",
          format: "rich",
          align: "left",
        },
      }),
    ],
  });

  const mounted = mount(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-rich-text-dom"
      inlineEditTarget={null}
      {...baseCanvasProps}
    />
  );

  try {
    const wrapper = mounted.container.querySelector(
      'div[data-page-editor-inline-edit-prop="text"]'
    );
    expect(wrapper).toBeTruthy();
    expect(mounted.container.querySelector(".prose p")).toBeTruthy();
    expect(mounted.container.querySelector(".prose ul")).toBeTruthy();
    expect(wrapper?.querySelector("p")).toBeTruthy();
    expect(wrapper?.querySelector("ul")).toBeTruthy();
    expect(
      mounted.container.querySelector('span[data-page-editor-inline-edit-prop="text"]')
    ).toBeNull();
  } finally {
    mounted.cleanup();
  }
});

test("SectionCanvas rich inline edit commits innerHTML for the sanitizer owner", () => {
  const onCommitInlineEdit = vi.fn();
  const section = createPageSectionV2("content", {
    id: "sec-rich-canvas-commit",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-rich-text-commit",
        props: {
          text: "<p>Canvas <strong>rich</strong></p>",
          format: "rich",
          align: "left",
        },
      }),
    ],
  });

  const mounted = mount(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-rich-text-commit"
      inlineEditTarget={{ blockId: "blk-rich-text-commit", propPath: "text" }}
      {...baseCanvasProps}
      onCommitInlineEdit={onCommitInlineEdit}
    />
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    expect(region).toBeTruthy();
    React.act(() => {
      if (!region) return;
      region.innerHTML =
        '<p>Edited <strong>rich</strong> <a href="/safe" onclick="alert(1)">safe</a></p>';
      region.blur();
    });

    expect(onCommitInlineEdit).toHaveBeenCalledWith({
      blockId: "blk-rich-text-commit",
      propPath: "text",
      text: '<p>Edited <strong>rich</strong> <a href="/safe" onclick="alert(1)">safe</a></p>',
      renderedText: "<p>Canvas <strong>rich</strong></p>",
    });
  } finally {
    mounted.cleanup();
  }
});

test("wraps rendered block content in a single data-page-editor-content scope", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const frame = mounted.container.querySelector("[data-page-editor-block-id]");
  const scope = frame!.querySelector(":scope > [data-page-editor-content]");
  expect(scope).not.toBeNull();
  // Exactly one content scope sits directly under the frame; chrome never nests
  // inside it (TASK-481-01-L01 single-wrapper invariant).
  const directContentScopes = Array.from(frame!.children).filter(
    (child) => child.getAttribute("data-page-editor-content") === "true"
  );
  expect(directContentScopes).toHaveLength(1);
  mounted.cleanup();
});

test("keeps chrome OUTSIDE the content scope", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const scope = mounted.container.querySelector("[data-page-editor-content]");
  // selection ring / outline classes live on the frame, not inside the scope:
  expect(scope!.querySelector("[data-page-editor-ghost='add-block-beside']")).toBeNull();
  expect(scope!.className).not.toMatch(/ring-primary|outline-primary/);
  // override badge + add-beside are siblings under the frame, outside the scope.
  mounted.cleanup();
});

test("co-locates block brand visual style with the content scope", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  // The FIRST `data-page-editor-content` in document order is the section-level
  // scope (no inline style); the block-level scope under the block frame owns
  // the brand visual style.
  const frame = mounted.container.querySelector("[data-page-editor-block-id]");
  const scope = frame!.querySelector(":scope > [data-page-editor-content]");
  // block.style.textColor = "var(--color-accent)" => the CSS `color` declaration
  // co-locates on the content scope.
  expect(scope!.getAttribute("style")).toContain("color: var(--color-accent)");
  // frame keeps layout only — no CSS `color` declaration (the brand visual moved
  // to the scope; the --coderso-block-* custom props stay on the frame per the
  // implemented L01 split, they are not a CSS color declaration).
  expect(frame!.getAttribute("style")).not.toMatch(/(^|;)\s*color:/);
  mounted.cleanup();
});

test("re-asserts admin brand on section + block + nested chrome (TASK-481-01-L02)", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const section = mounted.container.querySelector("[data-page-editor-section]");
  const blockFrame = mounted.container.querySelector("[data-page-editor-block-id]");
  expect(section!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  expect(blockFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  // a child block frame (columns slot) also carries the admin re-assertion
  const nestedFrame = mounted.container.querySelector(
    '[data-page-editor-block-slot-key="column:1"]'
  );
  expect(nestedFrame).toBeTruthy();
  expect(nestedFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  mounted.cleanup();
});

test("does not regress TASK-477-02 neutral emission on the canvas frame", () => {
  // The canvas frame (`data-page-editor-canvas-frame="true"`, PageEditor.tsx)
  // carries `canvasSiteTokenVariables`. renderToStaticMarkup never runs the
  // settings effect, so the frame anchors on the DEFAULT_TOKENS neutral map —
  // the TASK-477-02 contract — unchanged by the L01 content-scope / L02 admin
  // re-assertion edits (which live inside SectionCanvas, not on the frame).
  const html = renderToStaticMarkup(
    <AdminRouterProvider initialPath="/admin">
      <PageEditor />
    </AdminRouterProvider>
  );
  const frameTag = html.match(/<div[^>]*data-page-editor-canvas-frame="true"[^>]*>/)?.[0] ?? "";
  expect(frameTag).toContain('data-page-editor-canvas-frame="true"');
  expect(frameTag).toContain("--color-bg");
  expect(frameTag).toContain("--color-surface");
  expect(frameTag).toContain("--color-text");
  expect(frameTag).toContain("--font-sans");
  // Brand vars stay OUT of the neutral canvas frame (chrome-safe TASK-477-02).
  expect(frameTag).not.toContain("--color-primary");
  expect(frameTag).not.toContain("--color-accent");
});
