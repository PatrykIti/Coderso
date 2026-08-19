// @vitest-environment happy-dom

import React from "react";
import { test, expect, vi } from "vitest";
import {
  mount,
  getEditor,
  clickByText,
  dispatchEditorEvent,
  setRangeSelection,
  flush,
} from "./postRichTextAdapterFixtures";
import {
  PostRichTextAdapter,
  clearFormattingInBlocks,
  resolveInlineWrapperTextRange,
} from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

const mountEditor = (value: string, onChange?: (next: string) => void) => {
  const view = mount(
    <PostRichTextAdapter value={value} onChange={onChange ?? (() => undefined)} />
  );
  const editor = getEditor(view.container);
  if (!editor) throw new Error("missing editor");
  return { view, editor };
};

test("inline-code expands a collapsed selection anchored before an element child", async () => {
  const { view, editor } = mountEditor("<p><strong>bold text</strong> tail</p>");

  try {
    dispatchEditorEvent(editor, "focus");

    const strong = editor.querySelector("strong");
    if (!(strong instanceof HTMLElement)) throw new Error("missing strong");
    strong.insertBefore(document.createTextNode(""), strong.firstChild);
    const paragraph = editor.querySelector("p");
    if (!(paragraph instanceof HTMLElement)) throw new Error("missing paragraph");

    setRangeSelection(paragraph, 0, paragraph, 0);
    clickByText(view.container, "inline-code");
    await flush();

    const code = editor.querySelector("code");
    expect(code?.textContent).toBe("bold");
  } finally {
    view.cleanup();
  }
});

test("inline-code expands a collapsed selection anchored after an element child", async () => {
  const { view, editor } = mountEditor("<p>head <strong>bold</strong></p>");

  try {
    dispatchEditorEvent(editor, "focus");

    const strong = editor.querySelector("strong");
    if (!(strong instanceof HTMLElement)) throw new Error("missing strong");
    strong.appendChild(document.createTextNode(""));
    const paragraph = editor.querySelector("p");
    if (!(paragraph instanceof HTMLElement)) throw new Error("missing paragraph");

    setRangeSelection(paragraph, 2, paragraph, 2);
    clickByText(view.container, "inline-code");
    await flush();

    const code = editor.querySelector("code");
    expect(code?.textContent).toBe("bold");
  } finally {
    view.cleanup();
  }
});

test("highlight wraps only runs intersecting the selection range", async () => {
  const { view, editor } = mountEditor("<p>aaa <strong>bbb</strong> ccc</p>");

  try {
    dispatchEditorEvent(editor, "focus");

    const paragraph = editor.querySelector("p");
    if (!(paragraph instanceof HTMLElement)) throw new Error("missing paragraph");
    paragraph.insertBefore(document.createTextNode(""), paragraph.firstChild);

    const strongText = editor.querySelector("strong")?.firstChild;
    const cccText = paragraph.childNodes[paragraph.childNodes.length - 1];
    if (!(strongText instanceof Text) || !(cccText instanceof Text)) {
      throw new Error("missing text nodes");
    }

    setRangeSelection(strongText, 0, cccText, 2);
    clickByText(view.container, "highlight");
    await flush();

    const marks = editor.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(editor.textContent).toContain("bbb");
    expect(editor.textContent).toContain("ccc");
  } finally {
    view.cleanup();
  }
});

test("resolveInlineWrapperTextRange skips leading whitespace runs and rejects all-whitespace input", () => {
  expect(resolveInlineWrapperTextRange("  x", 1)).toEqual({ start: 2, end: 3 });
  expect(resolveInlineWrapperTextRange("   ", 1)).toBeNull();
  expect(resolveInlineWrapperTextRange("abc", 1)).toEqual({ start: 0, end: 3 });
});

test("native inline command swallows a throwing document.execCommand", async () => {
  const execCommand = vi.fn(() => {
    throw new Error("execCommand unavailable");
  });
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const { view, editor } = mountEditor("<p>Hello</p>");
  try {
    dispatchEditorEvent(editor, "focus");
    setRangeSelection(
      editor.querySelector("p")?.firstChild as Text,
      5,
      editor.querySelector("p")?.firstChild as Text,
      5
    );
    clickByText(view.container, "bold");
    await flush();

    expect(execCommand).toHaveBeenCalledWith("bold", false, undefined);
  } finally {
    view.cleanup();
  }
});

test("clearFormattingInBlocks strips data attributes from surviving inline nodes", () => {
  document.body.innerHTML = `
    <div id="clear-root">
      <blockquote>
        <p data-align="center">Hello world</p>
      </blockquote>
    </div>
  `;

  const block = document.querySelector("#clear-root blockquote");
  if (!(block instanceof HTMLElement)) throw new Error("missing block");

  clearFormattingInBlocks([block]);

  const innerParagraph = block.querySelector("p");
  expect(innerParagraph?.hasAttribute("data-align")).toBe(false);
  expect(innerParagraph?.textContent).toContain("Hello world");
});

test("selecting an image element reveals the image layout bar", async () => {
  const { view, editor } = mountEditor("<p>Hello</p>");
  editor.innerHTML =
    '<p>Hello<img src="https://example.com/photo.png" data-media-id="media-1" alt="photo"></p>';

  try {
    dispatchEditorEvent(editor, "focus");

    const image = editor.querySelector("img");
    if (!(image instanceof HTMLImageElement)) throw new Error("missing image");

    setRangeSelection(image, 0, image, 0);
    dispatchEditorEvent(editor, "mouseup");
    await flush();

    expect(view.container.textContent).toContain("Selected image layout");
  } finally {
    view.cleanup();
  }
});
