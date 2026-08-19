// @vitest-environment happy-dom

import {
  baseCanvasProps,
  linkedSection,
  mount,
  selectLinkRange,
  setNativeInputValue,
} from "./pageAuthoringCanvasFixtures";

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

test("the Remove link control is enabled over a link and emits an explicit unlink (TASK-478-02)", () => {
  const onApplyTextMark = vi.fn();
  const mounted = mount(
    <SectionCanvas
      section={linkedSection("sec-link-remove", "blk-link-remove", "/old")}
      baseSection={linkedSection("sec-link-remove", "blk-link-remove", "/old")}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-link-remove"
      inlineEditTarget={{ blockId: "blk-link-remove", propPath: "text" }}
      {...baseCanvasProps}
      onApplyTextMark={onApplyTextMark}
    />
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    const unlinkButton = mounted.container.querySelector(
      '[data-page-editor-text-mark-button="unlink"]'
    ) as HTMLButtonElement | null;
    expect(region && unlinkButton).toBeTruthy();
    // Disabled until the selection overlaps a link.
    expect(unlinkButton?.disabled).toBe(true);

    selectLinkRange(region!);
    expect(unlinkButton?.disabled).toBe(false);

    flushSync(() => {
      unlinkButton?.click();
    });

    expect(onApplyTextMark).toHaveBeenCalledWith(
      expect.objectContaining({
        blockId: "blk-link-remove",
        propPath: "text",
        type: "link",
        from: 0,
        to: 6,
        action: "remove",
      })
    );
  } finally {
    mounted.cleanup();
    window.getSelection()?.removeAllRanges();
  }
});

test("the dock toggle cycles the mark toolbar placement Top → Right → Left (TASK-478-03)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-dock-toggle",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-dock-toggle",
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
      selectedBlockId="blk-dock-toggle"
      inlineEditTarget={{ blockId: "blk-dock-toggle", propPath: "text" }}
      {...baseCanvasProps}
    />
  );

  try {
    const toolbar = mounted.container.querySelector(
      '[data-page-editor-text-mark-toolbar="true"]'
    ) as HTMLElement | null;
    const toggle = mounted.container.querySelector(
      "[data-page-editor-text-mark-toolbar-dock-toggle]"
    ) as HTMLButtonElement | null;
    expect(toolbar).toBeTruthy();
    expect(toggle).toBeTruthy();
    // The dock control is a UI pref, usable before any text is selected.
    expect(toggle?.disabled).toBe(false);

    // Default: docked top (pinned above the text, original placement).
    expect(toolbar?.getAttribute("data-page-editor-text-mark-toolbar-dock")).toBe("top");
    expect(toolbar?.className).toContain("-top-9");
    expect(toolbar?.className).not.toContain("left-full");
    expect(toolbar?.className).not.toContain("right-full");

    // Top → Right: beside the block on the right, off the edited text.
    flushSync(() => {
      toggle?.click();
    });
    expect(toolbar?.getAttribute("data-page-editor-text-mark-toolbar-dock")).toBe("right");
    expect(toolbar?.className).toContain("left-full");
    expect(toolbar?.className).not.toContain("-top-9");

    // Right → Left.
    flushSync(() => {
      toggle?.click();
    });
    expect(toolbar?.getAttribute("data-page-editor-text-mark-toolbar-dock")).toBe("left");
    expect(toolbar?.className).toContain("right-full");
    expect(toolbar?.className).not.toContain("left-full");

    // Left → Top (full cycle).
    flushSync(() => {
      toggle?.click();
    });
    expect(toolbar?.getAttribute("data-page-editor-text-mark-toolbar-dock")).toBe("top");
    expect(toolbar?.className).toContain("-top-9");
  } finally {
    mounted.cleanup();
  }
});

test("a docked (left/right) toolbar still applies marks to the selected range (TASK-478-03)", () => {
  const onApplyTextMark = vi.fn();
  const section = createPageSectionV2("content", {
    id: "sec-dock-apply",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-dock-apply",
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
      selectedBlockId="blk-dock-apply"
      inlineEditTarget={{ blockId: "blk-dock-apply", propPath: "text" }}
      {...baseCanvasProps}
      onApplyTextMark={onApplyTextMark}
    />
  );

  try {
    const toolbar = mounted.container.querySelector(
      '[data-page-editor-text-mark-toolbar="true"]'
    ) as HTMLElement | null;
    const toggle = mounted.container.querySelector(
      "[data-page-editor-text-mark-toolbar-dock-toggle]"
    ) as HTMLButtonElement | null;
    // Dock to the right so the bar/picker sit beside the text, not over it.
    flushSync(() => {
      toggle?.click();
    });
    expect(toolbar?.getAttribute("data-page-editor-text-mark-toolbar-dock")).toBe("right");

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

    const swatch = mounted.container.querySelector(
      "[data-page-editor-text-color-swatch]"
    ) as HTMLButtonElement | null;
    expect(swatch?.disabled).toBe(false);
    flushSync(() => {
      swatch?.click();
    });

    // The swatch handler still fires regardless of the dock side.
    expect(onApplyTextMark).toHaveBeenCalledWith(
      expect.objectContaining({ type: "color", from: 0, to: 6 })
    );
  } finally {
    mounted.cleanup();
    window.getSelection()?.removeAllRanges();
  }
});

test("an owner-controlled dock prop drives placement and reports cycles through the callback (TASK-478-03)", () => {
  const onMarkToolbarDockChange = vi.fn();
  const section = createPageSectionV2("content", {
    id: "sec-dock-controlled",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-dock-controlled",
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
      selectedBlockId="blk-dock-controlled"
      inlineEditTarget={{ blockId: "blk-dock-controlled", propPath: "text" }}
      {...baseCanvasProps}
      markToolbarDock="left"
      onMarkToolbarDockChange={onMarkToolbarDockChange}
    />
  );

  try {
    const toolbar = mounted.container.querySelector(
      '[data-page-editor-text-mark-toolbar="true"]'
    ) as HTMLElement | null;
    const toggle = mounted.container.querySelector(
      "[data-page-editor-text-mark-toolbar-dock-toggle]"
    ) as HTMLButtonElement | null;
    // Controlled: the prop wins, so the placement reflects the owner's value.
    expect(toolbar?.getAttribute("data-page-editor-text-mark-toolbar-dock")).toBe("left");
    expect(toolbar?.className).toContain("right-full");

    flushSync(() => {
      toggle?.click();
    });
    // The toggle reports the next side to the owner (Left → Top) rather than
    // forking local state.
    expect(onMarkToolbarDockChange).toHaveBeenCalledWith("top");
  } finally {
    mounted.cleanup();
  }
});

test("clicking a linked fragment in the canvas selects it (editor-owned) instead of navigating (TASK-478-02)", () => {
  // EDITOR-OWNED proof (audit M8): the linked run paints as a NON-navigating span
  // (no a[href]), so the global tests/setup a[href] preventDefault is irrelevant,
  // and the click drives the canvas's own selection callbacks.
  const onSelectBlock = vi.fn();
  const unselected = mount(
    <SectionCanvas
      section={linkedSection("sec-link-click", "blk-link-click", "/page")}
      baseSection={linkedSection("sec-link-click", "blk-link-click", "/page")}
      selected={false}
      selectedBlockPath={null}
      selectedBlockId={null}
      inlineEditTarget={null}
      {...baseCanvasProps}
      onSelectBlock={onSelectBlock}
    />
  );

  try {
    const linkSpan = unselected.container.querySelector(
      '[data-page-editor-link-noop="true"]'
    ) as HTMLElement | null;
    expect(linkSpan).toBeTruthy();
    // Structurally non-navigating: a span, never an anchor with an href.
    expect(linkSpan?.tagName.toLowerCase()).toBe("span");
    expect(linkSpan?.closest("a[href]")).toBeNull();

    flushSync(() => {
      linkSpan?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    // The click placed selection on the block (re-opening editor selection) rather
    // than following a URL.
    expect(onSelectBlock).toHaveBeenCalledWith([{ index: 0 }]);
  } finally {
    unselected.cleanup();
  }

  const onStartInlineEdit = vi.fn();
  const selectedMount = mount(
    <SectionCanvas
      section={linkedSection("sec-link-click-2", "blk-link-click-2", "/page")}
      baseSection={linkedSection("sec-link-click-2", "blk-link-click-2", "/page")}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-link-click-2"
      inlineEditTarget={null}
      {...baseCanvasProps}
      onStartInlineEdit={onStartInlineEdit}
    />
  );

  try {
    const linkSpan = selectedMount.container.querySelector(
      '[data-page-editor-link-noop="true"]'
    ) as HTMLElement | null;
    expect(linkSpan).toBeTruthy();
    flushSync(() => {
      linkSpan?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    // On an already-selected block the same click opens inline edit (caret/toolbar)
    // on the linked fragment — never navigation.
    expect(onStartInlineEdit).toHaveBeenCalledWith({
      blockId: "blk-link-click-2",
      propPath: "text",
    });
  } finally {
    selectedMount.cleanup();
  }
});
