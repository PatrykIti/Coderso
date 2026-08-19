// @vitest-environment happy-dom

/**
 * Branch wave for the page authoring canvas: inline text editing (caret
 * placement from client points, mark toolbar apply/restore, link seeding and
 * unlink, keyboard commit paths) rendered through the real PageEditor shell.
 * Every assertion targets a visible effect (DOM state, selection, committed
 * draft payload), never mere control presence.
 */

import React from "react";
import { beforeEach, expect, test, vi } from "vitest";

import {
  clickButton,
  clickSelector,
  createDocument,
  createPage,
  mount,
  pageEditorState,
} from "./pageEditorV2Fixtures";

import { dblClickElement, findInlineEditRegion } from "./pageEditorV2Helpers";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import type { PageTextMark } from "../../../core/services/pages/pageDocumentV2Types";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
  await React.act(async () => {
    await Promise.resolve();
  });
};

const buildTextPage = (marks: PageTextMark[] = []): ReturnType<typeof createPage> =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-content",
          name: "Content",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: {
                text: "Hello world",
                level: "h1",
                align: "center",
                ...(marks.length > 0 ? { marks } : {}),
              },
            }),
          ],
        }),
      ],
    }),
  });

/** Set a real DOM selection over character offsets within a text-bearing element. */
const selectTextRange = (root: HTMLElement, from: number, to: number): Range => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let offset = 0;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (startNode === null && from <= offset + length) {
      startNode = node;
      startOffset = from - offset;
    }
    if (to <= offset + length) {
      endNode = node;
      endOffset = to - offset;
      break;
    }
    offset += length;
    node = walker.nextNode();
  }
  expect(startNode).toBeTruthy();
  expect(endNode).toBeTruthy();
  const range = document.createRange();
  range.setStart(startNode as Node, startOffset);
  range.setEnd(endNode as Node, endOffset);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return range;
};

const setInputValue = (input: HTMLInputElement | null | undefined, value: string) => {
  if (!input) return;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const enterInlineEdit = (view: { container: HTMLElement }, from = 6, to = 11) => {
  const region = findInlineEditRegion(view.container, "blk-heading", "text");
  selectTextRange(region, from, to);
  dblClickElement(region);
  return region;
};

const readSavedMarks = (): PageTextMark[] | undefined => {
  const payload = pageEditorState.updatePage.mock.calls.at(-1)?.[1] as {
    data: PageDocumentV2;
  };
  const heading = payload?.data.sections[0]?.blocks.find(
    (candidate) => candidate.id === "blk-heading"
  );
  return heading?.props.marks as PageTextMark[] | undefined;
};

beforeEach(() => {
  pageEditorState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
});

test("PageAuthoringCanvas mark toolbar applies bold/italic/highlight/color over a selection, restores it, and commits", async () => {
  const page = buildTextPage();
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    enterInlineEdit(view);
    await flush();

    const editable = view.container.querySelector(
      '[data-page-editor-inline-edit="active"]'
    ) as HTMLElement | null;
    expect(editable).toBeTruthy();
    expect(editable?.getAttribute("contenteditable")).toBe("true");

    // A real collapsed-to-range selection, then mouseup/keyup sync it into state.
    selectTextRange(editable as HTMLElement, 6, 11);
    React.act(() => {
      editable?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    await flush();
    // Clicking inside the editable while editing is a no-op that stops the
    // event from reaching the block-frame select handler.
    React.act(() => {
      editable?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-text-mark-toolbar="true"]')
    ).toBeTruthy();

    React.act(() => {
      editable?.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    });
    await flush();

    const boldButton = view.container.querySelector(
      '[data-page-editor-text-mark-button="bold"]'
    ) as HTMLButtonElement | null;
    expect(boldButton?.disabled).toBeFalsy();
    React.act(() => {
      boldButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    // The applied mark repaints children; the restore effect re-selects [6,11).
    expect(document.getSelection()?.toString()).toBe("world");

    React.act(() => {
      view.container
        .querySelector('[data-page-editor-text-mark-button="italic"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    React.act(() => {
      view.container
        .querySelector('[data-page-editor-text-highlight-swatch="primary"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    const colorPicker = view.container.querySelector(
      '[data-page-editor-text-color-picker="true"]'
    ) as HTMLInputElement | null;
    expect(colorPicker?.disabled).toBeFalsy();
    setInputValue(colorPicker, "#ff0000");
    await flush();

    // Escape blurs and commits; the active edit region unmounts.
    React.act(() => {
      editable?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await flush();
    expect(view.container.querySelector('[data-page-editor-inline-edit="active"]')).toBeNull();

    clickButton(view.container, "Save");
    await flush();
    const marks = readSavedMarks();
    expect(marks?.some((m) => m.type === "bold" && m.from === 6 && m.to === 11)).toBe(true);
    expect(marks?.some((m) => m.type === "italic" && m.from === 6 && m.to === 11)).toBe(true);
    expect(
      marks?.some(
        (m) =>
          m.type === "highlight" &&
          m.from === 6 &&
          m.to === 11 &&
          m.color === "var(--color-primary)"
      )
    ).toBe(true);
    expect(
      marks?.some((m) => m.type === "color" && m.from === 6 && m.to === 11 && m.color === "#ff0000")
    ).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("PageAuthoringCanvas single click on a selected text block places the caret at the clicked point", async () => {
  const clickBlockAndEditable = () => {
    const page = buildTextPage();
    pageEditorState.cachedPage = page;
    pageEditorState.currentPage = page;
    const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    return view;
  };

  // Default happy-dom has neither client-point API: the caret falls back to end.
  const fallbackView = clickBlockAndEditable();
  try {
    await flush();
    const region = findInlineEditRegion(fallbackView.container, "blk-heading", "text");
    React.act(() => {
      region.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 14, clientY: 22 }));
    });
    await flush();
    const editable = fallbackView.container.querySelector(
      '[data-page-editor-inline-edit="active"]'
    );
    expect(editable).toBeTruthy();
    expect(document.activeElement).toBe(editable);
  } finally {
    fallbackView.cleanup();
  }

  // caretRangeFromPoint is stubbed: the caret lands where the click pointed.
  const pointRangeHolder: { range: Range | null } = { range: null };
  const caretRangeFromPoint = vi.fn(() => pointRangeHolder.range);
  Object.defineProperty(document, "caretRangeFromPoint", {
    configurable: true,
    value: caretRangeFromPoint,
  });
  const rangeView = clickBlockAndEditable();
  try {
    await flush();
    const region = findInlineEditRegion(rangeView.container, "blk-heading", "text");
    const textNode = region.firstChild as Node | null;
    expect(textNode?.textContent).toBe("Hello world");
    pointRangeHolder.range = (() => {
      const range = document.createRange();
      range.setStart(textNode as Node, 6);
      range.collapse(true);
      return range;
    })();
    React.act(() => {
      region.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 14, clientY: 22 }));
    });
    await flush();
    const editable = rangeView.container.querySelector('[data-page-editor-inline-edit="active"]');
    expect(editable).toBeTruthy();
    // The client-point resolver ran with the click coordinates and returned a
    // caret inside the editable, so the caret was placed at offset 6.
    expect(caretRangeFromPoint).toHaveBeenCalledWith(14, 22);
    const selection = document.getSelection();
    expect(selection?.rangeCount).toBe(1);
    expect(selection?.isCollapsed).toBe(true);
    expect(selection?.anchorOffset).toBe(6);
  } finally {
    rangeView.cleanup();
    delete (document as unknown as { caretRangeFromPoint?: unknown }).caretRangeFromPoint;
  }

  // caretPositionFromPoint fallback: offset node + offset drive the caret.
  const caretPositionFromPoint = vi.fn(() => {
    const active = document.querySelector('[data-page-editor-inline-edit="active"]');
    const node = active?.firstChild ?? null;
    return { offsetNode: node, offset: 6 };
  });
  Object.defineProperty(document, "caretPositionFromPoint", {
    configurable: true,
    value: caretPositionFromPoint,
  });
  const positionView = clickBlockAndEditable();
  try {
    await flush();
    const region = findInlineEditRegion(positionView.container, "blk-heading", "text");
    React.act(() => {
      region.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 14, clientY: 22 }));
    });
    await flush();
    const editable = positionView.container.querySelector(
      '[data-page-editor-inline-edit="active"]'
    );
    expect(editable).toBeTruthy();
    expect(caretPositionFromPoint).toHaveBeenCalledWith(14, 22);
    const selection = document.getSelection();
    expect(selection?.rangeCount).toBe(1);
    expect(selection?.isCollapsed).toBe(true);
    expect(selection?.anchorOffset).toBe(6);
  } finally {
    positionView.cleanup();
    delete (document as unknown as { caretPositionFromPoint?: unknown }).caretPositionFromPoint;
  }
});

test("PageAuthoringCanvas link marks seed the URL field, clear-to-unlink removes, and a new URL applies", async () => {
  const page = buildTextPage([{ type: "link", from: 6, to: 11, href: "https://example.com" }]);
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    enterInlineEdit(view);
    await flush();

    const editable = view.container.querySelector(
      '[data-page-editor-inline-edit="active"]'
    ) as HTMLElement | null;
    expect(editable).toBeTruthy();
    selectTextRange(editable as HTMLElement, 6, 11);
    React.act(() => {
      editable?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    await flush();

    const linkInput = view.container.querySelector(
      'input[aria-label="Inline link URL"]'
    ) as HTMLInputElement | null;
    expect(linkInput).toBeTruthy();
    expect(linkInput?.value).toBe("https://example.com");

    // Clearing the seeded field and confirming unlinks the existing mark.
    setInputValue(linkInput, "");
    await flush();
    const applyLink = view.container.querySelector(
      '[data-page-editor-text-mark-button="link"]'
    ) as HTMLButtonElement | null;
    expect(applyLink?.disabled).toBeFalsy();
    React.act(() => {
      applyLink?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(readSavedMarks()?.some((m) => m.type === "link")).toBeFalsy();

    // Typing a new URL applies a fresh link over the same range.
    setInputValue(linkInput, "https://new.test/path");
    await flush();
    React.act(() => {
      applyLink?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    React.act(() => {
      editable?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await flush();
    clickButton(view.container, "Save");
    await flush();
    expect(
      readSavedMarks()?.some(
        (m) =>
          m.type === "link" && m.from === 6 && m.to === 11 && m.href === "https://new.test/path"
      )
    ).toBe(true);
    // The unlink action never left a stray empty link mark behind.
    expect(readSavedMarks()?.filter((m) => m.type === "link")).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("PageAuthoringCanvas keyboard commit paths: Enter on single-line text exits edit and blurs", async () => {
  const page = buildTextPage();
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    enterInlineEdit(view);
    await flush();
    const editable = view.container.querySelector(
      '[data-page-editor-inline-edit="active"]'
    ) as HTMLElement | null;
    expect(editable).toBeTruthy();
    expect(editable?.getAttribute("aria-multiline")).toBeNull();
    React.act(() => {
      editable?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await flush();
    expect(view.container.querySelector('[data-page-editor-inline-edit="active"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});
