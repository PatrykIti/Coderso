// @vitest-environment happy-dom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import React, { type ReactNode } from "react";
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
  onApplyTextMark: vi.fn(),
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

test("SectionCanvas inline text color toolbar applies the selected text range", () => {
  const onApplyTextMark = vi.fn();
  const section = createPageSectionV2("content", {
    id: "sec-mark-toolbar",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-mark-toolbar",
        props: { text: "Canvas headline", level: "h2", align: "left" },
      }),
    ],
  });

  const mounted = mount(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-mark-toolbar"
      inlineEditTarget={{ blockId: "blk-mark-toolbar", propPath: "text" }}
      {...baseCanvasProps}
      onApplyTextMark={onApplyTextMark}
    />
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    expect(region).toBeTruthy();
    const textNode = region?.firstChild;
    expect(textNode?.nodeType).toBe(Node.TEXT_NODE);
    flushSync(() => {
      if (!region || !textNode) return;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 6);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      region.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    const swatch = mounted.container.querySelector(
      "[data-page-editor-text-color-swatch]"
    ) as HTMLButtonElement | null;
    expect(
      mounted.container.querySelector('[data-page-editor-text-color-toolbar="true"]')
    ).toBeTruthy();
    expect(swatch).toBeTruthy();
    expect(swatch?.disabled).toBe(false);
    flushSync(() => {
      swatch?.click();
    });

    expect(onApplyTextMark).toHaveBeenCalledWith(
      expect.objectContaining({
        blockId: "blk-mark-toolbar",
        propPath: "text",
        type: "color",
        from: 0,
        to: 6,
        color: expect.stringMatching(/^(#|var\(--color-)/),
      })
    );
  } finally {
    mounted.cleanup();
    window.getSelection()?.removeAllRanges();
  }
});

test("inline color swatch applies via the live selection snapshot without a prior region mouseup (TASK-475-01)", () => {
  // Regression for the real-input no-op: the mark toolbar is a sibling of the
  // editable, so a swatch interaction never fires the editable mouseup/keyup that
  // sets `selectionRange`. The toolbar mousedown must snapshot the live DOM
  // selection so the swatch still applies. NOTE: deliberately no region mouseup.
  const onApplyTextMark = vi.fn();
  const section = createPageSectionV2("content", {
    id: "sec-mark-snapshot",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-mark-snapshot",
        props: { text: "Canvas headline", level: "h2", align: "left" },
      }),
    ],
  });

  const mounted = mount(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-mark-snapshot"
      inlineEditTarget={{ blockId: "blk-mark-snapshot", propPath: "text" }}
      {...baseCanvasProps}
      onApplyTextMark={onApplyTextMark}
    />
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    const textNode = region?.firstChild;
    expect(textNode?.nodeType).toBe(Node.TEXT_NODE);
    flushSync(() => {
      if (!textNode) return;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 6);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });

    const toolbar = mounted.container.querySelector(
      '[data-page-editor-text-mark-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar).toBeTruthy();
    // Snapshot the live selection on the toolbar mousedown (the fix), then activate.
    flushSync(() => {
      toolbar?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    });
    const swatch = mounted.container.querySelector(
      "[data-page-editor-text-color-swatch]"
    ) as HTMLButtonElement | null;
    expect(swatch?.disabled).toBe(false);
    flushSync(() => {
      swatch?.click();
    });

    expect(onApplyTextMark).toHaveBeenCalledWith(
      expect.objectContaining({ type: "color", from: 0, to: 6 })
    );
  } finally {
    mounted.cleanup();
    window.getSelection()?.removeAllRanges();
  }
});

test("toolbar mousedown preserves focus for swatches but not for the link URL input (TASK-475-01)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-mark-focus",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-mark-focus",
        props: { text: "Canvas headline", level: "h2", align: "left" },
      }),
    ],
  });

  const mounted = mount(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-mark-focus"
      inlineEditTarget={{ blockId: "blk-mark-focus", propPath: "text" }}
      {...baseCanvasProps}
    />
  );

  try {
    const swatch = mounted.container.querySelector(
      "[data-page-editor-text-color-swatch]"
    ) as HTMLButtonElement | null;
    const input = mounted.container.querySelector(
      'input[aria-label="Inline link URL"]'
    ) as HTMLInputElement | null;
    expect(swatch).toBeTruthy();
    expect(input).toBeTruthy();

    const swatchDown = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    flushSync(() => {
      swatch?.dispatchEvent(swatchDown);
    });
    // Swatches keep the selection by cancelling the default focus shift.
    expect(swatchDown.defaultPrevented).toBe(true);

    const inputDown = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    flushSync(() => {
      input?.dispatchEvent(inputDown);
    });
    // The URL input must be allowed to focus + type (bug #2).
    expect(inputDown.defaultPrevented).toBe(false);
  } finally {
    mounted.cleanup();
    window.getSelection()?.removeAllRanges();
  }
});

test("single click on a selected text block enters inline edit; an unselected one does not (TASK-475-03)", () => {
  const onStartInlineEdit = vi.fn();
  const section = createPageSectionV2("content", {
    id: "sec-click-edit",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-click-edit",
        props: { text: "Canvas headline", level: "h2", align: "left" },
      }),
    ],
  });

  const selectedMount = mount(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-click-edit"
      inlineEditTarget={null}
      {...baseCanvasProps}
      onStartInlineEdit={onStartInlineEdit}
    />
  );

  try {
    const idle = selectedMount.container.querySelector(
      '[data-page-editor-inline-edit="idle"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    expect(idle).toBeTruthy();
    flushSync(() => {
      idle?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onStartInlineEdit).toHaveBeenCalledWith({
      blockId: "blk-click-edit",
      propPath: "text",
    });
  } finally {
    selectedMount.cleanup();
  }

  const onStartInlineEditUnselected = vi.fn();
  const unselectedMount = mount(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected={false}
      selectedBlockPath={null}
      selectedBlockId={null}
      inlineEditTarget={null}
      {...baseCanvasProps}
      onStartInlineEdit={onStartInlineEditUnselected}
    />
  );

  try {
    const idle = unselectedMount.container.querySelector(
      '[data-page-editor-inline-edit="idle"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    expect(idle).toBeTruthy();
    flushSync(() => {
      idle?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onStartInlineEditUnselected).not.toHaveBeenCalled();
  } finally {
    unselectedMount.cleanup();
  }
});

test("inline edit paints existing color marks in place instead of plain text (TASK-476-02)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-mark-paint",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-mark-paint",
        props: {
          text: "Canvas headline",
          level: "h2",
          align: "left",
          marks: [{ type: "color", from: 0, to: 6, color: "#2563eb" }],
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
      selectedBlockId="blk-mark-paint"
      inlineEditTarget={{ blockId: "blk-mark-paint", propPath: "text" }}
      {...baseCanvasProps}
    />
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    expect(region).toBeTruthy();
    // The colored fragment is painted while editing (not flattened to plain text).
    const colored = region?.querySelector('[data-page-text-mark="color"]') as HTMLElement | null;
    expect(colored).toBeTruthy();
    expect(colored?.textContent).toBe("Canvas");
    expect(region?.textContent).toBe("Canvas headline");
  } finally {
    mounted.cleanup();
  }
});
