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

const setNativeInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const linkedSection = (id: string, blockId: string, href: string) =>
  createPageSectionV2("content", {
    id,
    blocks: [
      createPageBlockV2("heading", {
        id: blockId,
        props: {
          text: "Canvas headline",
          level: "h2",
          align: "left",
          marks: [{ type: "link", from: 0, to: 6, href }],
        },
      }),
    ],
  });

const selectLinkRange = (region: HTMLElement) => {
  const linkSpan = region.querySelector(
    '[data-page-editor-link-noop="true"]'
  ) as HTMLElement | null;
  const linkText = linkSpan?.firstChild;
  expect(linkText?.nodeType).toBe(Node.TEXT_NODE);
  flushSync(() => {
    if (!linkText) return;
    const range = document.createRange();
    range.setStart(linkText, 0);
    range.setEnd(linkText, 6);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    region.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
};

test("selecting a linked fragment seeds the URL field with its existing href (TASK-478-02)", () => {
  const mounted = mount(
    <SectionCanvas
      section={linkedSection("sec-link-seed", "blk-link-seed", "/seeded")}
      baseSection={linkedSection("sec-link-seed", "blk-link-seed", "/seeded")}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-link-seed"
      inlineEditTarget={{ blockId: "blk-link-seed", propPath: "text" }}
      {...baseCanvasProps}
    />
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    expect(region).toBeTruthy();
    const input = mounted.container.querySelector(
      'input[aria-label="Inline link URL"]'
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    // Not seeded until the selection actually lands on the linked run.
    expect(input?.value).toBe("");

    selectLinkRange(region!);

    // The URL field is seeded with the link's stored href so it can be edited.
    expect(input?.value).toBe("/seeded");
  } finally {
    mounted.cleanup();
    window.getSelection()?.removeAllRanges();
  }
});

test("clearing the seeded URL field over a link unlinks it through the Apply button (TASK-478-02)", () => {
  const onApplyTextMark = vi.fn();
  const mounted = mount(
    <SectionCanvas
      section={linkedSection("sec-link-clear", "blk-link-clear", "/old")}
      baseSection={linkedSection("sec-link-clear", "blk-link-clear", "/old")}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-link-clear"
      inlineEditTarget={{ blockId: "blk-link-clear", propPath: "text" }}
      {...baseCanvasProps}
      onApplyTextMark={onApplyTextMark}
    />
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    const input = mounted.container.querySelector(
      'input[aria-label="Inline link URL"]'
    ) as HTMLInputElement | null;
    const applyButton = mounted.container.querySelector(
      '[data-page-editor-text-mark-button="link"]'
    ) as HTMLButtonElement | null;
    expect(region && input && applyButton).toBeTruthy();

    selectLinkRange(region!);
    expect(input?.value).toBe("/old");
    expect(applyButton?.disabled).toBe(false);

    // Clear the field: Apply must STAY enabled (not permanently disabled on empty)
    // because the selection still carries a link to remove.
    flushSync(() => {
      if (input) setNativeInputValue(input, "");
    });
    expect(input?.value).toBe("");
    expect(applyButton?.disabled).toBe(false);

    flushSync(() => {
      applyButton?.click();
    });

    // Empty field over an existing link applies an explicit remove (unlink).
    expect(onApplyTextMark).toHaveBeenCalledWith(
      expect.objectContaining({
        blockId: "blk-link-clear",
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
