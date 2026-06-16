// @vitest-environment happy-dom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { SectionCanvas } from "../../../core/admin/ui/pages/editor/PageAuthoringCanvas";

const baseCanvasProps = {
  device: "desktop" as const,
  canAddBlockBeside: false,
  canvasDataByBlockId: {},
  onSelect: vi.fn(),
  onSelectBlock: vi.fn(),
  onAddBlock: vi.fn(),
  onAddBlockToTarget: vi.fn(),
  onAddBlockBeside: vi.fn(),
  onStartInlineEdit: vi.fn(),
  onCommitInlineEdit: vi.fn(),
};

const mount = (node: ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      flushSync(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

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
    />
  );

  expect(html).toContain('data-page-editor-hidden-block-ghost="true"');
  expect(html).toContain("Hidden text");
  expect(html).toContain("Hidden canvas text");
});

test("SectionCanvas renders rich text output inside the inline edit hook", () => {
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
    />
  );

  expect(html).toContain('data-page-editor-inline-edit-prop="text"');
  expect(html).toContain("<strong");
  expect(html).toContain(">rich</strong>");
  expect(html).toContain('href="/safe"');
  expect(html).not.toContain("<script");
  expect(html).not.toContain("alert(1)");
});

test("SectionCanvas mounts rich text inline-edit chrome without invalid block-in-span nesting", () => {
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
    const inline = mounted.container.querySelector('[data-page-editor-inline-edit-prop="text"]');
    expect(inline?.tagName).toBe("DIV");
    expect(inline?.querySelector("p")).toBeTruthy();
    expect(inline?.querySelector("ul")).toBeTruthy();
    expect(
      mounted.container.querySelector('span[data-page-editor-inline-edit-prop="text"] p')
    ).toBeNull();
    expect(
      mounted.container.querySelector('span[data-page-editor-inline-edit-prop="text"] ul')
    ).toBeNull();
  } finally {
    mounted.cleanup();
  }
});
