// @vitest-environment happy-dom

import { flushSync } from "react-dom";
import React from "react";
import { expect, test, vi } from "vitest";

import { SectionCanvas } from "../../../core/admin/ui/pages/editor/PageAuthoringCanvas";
import {
  baseCanvasProps,
  createPageBlockV2,
  createPageSectionV2,
  mount,
} from "./pageAuthoringCanvasHarness";

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

test("inline color swatches preview the applied token var; custom picker applies a hex (TASK-477-01)", () => {
  const onApplyTextMark = vi.fn();
  const section = createPageSectionV2("content", {
    id: "sec-color-picker",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-color-picker",
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
      selectedBlockId="blk-color-picker"
      inlineEditTarget={{ blockId: "blk-color-picker", propPath: "text" }}
      {...baseCanvasProps}
      onApplyTextMark={onApplyTextMark}
    />
  );

  try {
    // The swatch previews the exact value it applies (the token var), not a fixed
    // default hex, so it can never lie about the live theme color.
    const swatch = mounted.container.querySelector(
      '[data-page-editor-text-color-swatch="primary"]'
    ) as HTMLElement | null;
    expect(swatch?.getAttribute("style") ?? "").toContain("var(--color-primary)");

    // A native custom color picker is offered alongside the token swatches.
    const picker = mounted.container.querySelector(
      'input[type="color"][data-page-editor-text-color-picker="true"]'
    ) as HTMLInputElement | null;
    expect(picker).toBeTruthy();

    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    const textNode = region?.firstChild;
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
    expect(picker?.disabled).toBe(false);
    flushSync(() => {
      if (!picker) return;
      // Use the native value setter so React's input value-tracker registers the
      // change; React maps an input's onChange to the native "input" event.
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      setValue?.call(picker, "#ff8800");
      picker.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(onApplyTextMark).toHaveBeenCalledWith(
      expect.objectContaining({ type: "color", color: "#ff8800", from: 0, to: 6 })
    );
  } finally {
    mounted.cleanup();
    window.getSelection()?.removeAllRanges();
  }
});

test("clicking the custom color picker is not cancelled by the block-frame preventDefault (TASK-477-01)", () => {
  // The native color dialog opens as the click's default action; the block-frame
  // onClick calls preventDefault, so the picker must stop the click from reaching
  // it or the dialog never opens. This guards that regression.
  const section = createPageSectionV2("content", {
    id: "sec-picker-activation",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-picker-activation",
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
      selectedBlockId="blk-picker-activation"
      inlineEditTarget={{ blockId: "blk-picker-activation", propPath: "text" }}
      {...baseCanvasProps}
    />
  );

  try {
    const blockFrame = mounted.container.querySelector(
      '[data-page-editor-block="heading"]'
    ) as HTMLElement | null;
    expect(blockFrame).toBeTruthy();
    const picker = mounted.container.querySelector(
      '[data-page-editor-text-color-picker="true"]'
    ) as HTMLElement | null;
    expect(picker).toBeTruthy();
    // Sanity: a swatch (which stops propagation) is also not cancelled, while a
    // bubbling click that reaches the block frame IS preventDefaulted.
    const reachedFrame = new MouseEvent("click", { bubbles: true, cancelable: true });
    blockFrame?.dispatchEvent(reachedFrame);
    expect(reachedFrame.defaultPrevented).toBe(true);

    const pickerClick = new MouseEvent("click", { bubbles: true, cancelable: true });
    picker?.dispatchEvent(pickerClick);
    expect(pickerClick.defaultPrevented).toBe(false);
  } finally {
    mounted.cleanup();
  }
});
