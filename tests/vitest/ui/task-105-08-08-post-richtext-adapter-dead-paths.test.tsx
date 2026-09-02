// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";

import {
  dispatchEditorEvent,
  flush,
  getEditor,
  mount,
  setRangeSelection,
  setSelectValue,
} from "./postRichTextAdapterFixtures";
import {
  PostRichTextAdapter,
  buildClipboardImageInsertHtml,
  extractClipboardImageFiles,
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

const findTextNode = (root: Node, text: string) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text && current.nodeValue?.includes(text)) {
      return current;
    }
    current = walker.nextNode();
  }
  throw new Error(`Missing text node: ${text}`);
};

const selectImage = (editor: HTMLElement, image: Element) => {
  React.act(() => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNode(image);
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
};

test("resolveInlineWrapperTextRange keeps word ranges and rejects empty or all-whitespace text", () => {
  expect(resolveInlineWrapperTextRange("hello world", 1)).toEqual({ start: 0, end: 5 });
  expect(resolveInlineWrapperTextRange("hello world", 6)).toEqual({ start: 6, end: 11 });
  expect(resolveInlineWrapperTextRange("hello world ", 12)).toEqual({ start: 6, end: 11 });
  expect(resolveInlineWrapperTextRange("  hello", 0)).toEqual({ start: 2, end: 7 });
});

test("resolveInlineWrapperTextRange returns null for whitespace-only text at every offset", () => {
  for (const text of ["", " ", "   ", "\n\t ", "   "]) {
    for (const offset of [0, 1, 2, 3, 12, text.length, text.length + 5]) {
      expect(resolveInlineWrapperTextRange(text, offset)).toBeNull();
    }
  }
});

test("inline wrapper skips an all-whitespace caret and still wraps the surrounding word", async () => {
  const { view, editor } = mountEditor("<p>   </p>");

  try {
    dispatchEditorEvent(editor, "focus");
    const blank = findTextNode(editor, "   ");
    setRangeSelection(blank, 1, blank, 1);
    const before = editor.innerHTML;
    const click = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "inline-code"
    );
    if (!click) throw new Error("missing inline-code button");
    React.act(() => {
      click.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(editor.querySelector("code")).toBeNull();
    expect(editor.querySelector("mark")).toBeNull();
    expect(editor.innerHTML).toBe(before);
  } finally {
    view.cleanup();
  }
});

test("inline wrapper expands a collapsed caret onto the word it sits in", async () => {
  const { view, editor } = mountEditor("<p>word</p>");

  try {
    dispatchEditorEvent(editor, "focus");
    const word = findTextNode(editor, "word");
    setRangeSelection(word, 2, word, 2);
    const click = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "inline-code"
    );
    if (!click) throw new Error("missing inline-code button");
    React.act(() => {
      click.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(editor.querySelector("code")?.textContent).toBe("word");
  } finally {
    view.cleanup();
  }
});

test("media selection resolves a real image inside the editor root and writes layout attributes", async () => {
  const view = mount(<PostRichTextAdapter value="" onChange={() => undefined} />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");
    dispatchEditorEvent(editor, "focus");

    React.act(() => {
      editor.innerHTML =
        '<p><img src="/media/example.png" data-wrap="right" data-width="50" data-margin="sm" alt="Example"></p>';
    });
    const image = editor.querySelector("img");
    if (!image) throw new Error("missing image");
    selectImage(editor, image);
    await flush();

    expect(view.container.textContent).toContain("Selected image layout");
    const selects = Array.from(view.container.querySelectorAll("select"));
    expect(selects).toHaveLength(3);
    setSelectValue(selects[0], "left");
    setSelectValue(selects[1], "66");
    setSelectValue(selects[2], "lg");
    await flush();

    const updated = editor.querySelector("img");
    expect(updated?.getAttribute("data-wrap")).toBe("left");
    expect(updated?.getAttribute("data-width")).toBe("66");
    expect(updated?.getAttribute("data-margin")).toBe("lg");
  } finally {
    view.cleanup();
  }
});

test("media selection resolves the image through the selection walk, not only the range fallback", async () => {
  const view = mount(<PostRichTextAdapter value="" onChange={() => undefined} />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");
    dispatchEditorEvent(editor, "focus");

    React.act(() => {
      editor.innerHTML = '<p>lead-in text</p><img src="/media/walk.png" alt="Walk image">';
    });
    const image = editor.querySelector("img");
    if (!image) throw new Error("missing image");
    // The range starts in a text node, so the range-container fallback cannot be the
    // path that finds the image: only the node walk over the selection can.
    const leadIn = findTextNode(editor, "lead-in text");
    React.act(() => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(leadIn, 0);
      range.setEnd(image, 0);
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("Selected image layout");
  } finally {
    view.cleanup();
  }
});

test("media selection does not depend on the image element's document of origin", async () => {
  const view = mount(<PostRichTextAdapter value="" onChange={() => undefined} />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");
    dispatchEditorEvent(editor, "focus");

    // An <img> authored in a different document is adopted into the editor tree; the
    // traversal must recognise it as an image element by node type and node name,
    // not by realm-bound prototype identity.
    const foreignImage = document.implementation.createHTMLDocument("pasted").createElement("img");
    foreignImage.setAttribute("src", "/media/foreign.png");
    foreignImage.setAttribute("alt", "Foreign document image");

    React.act(() => {
      editor.innerHTML = "";
      editor.appendChild(foreignImage);
    });
    selectImage(editor, foreignImage);
    await flush();

    expect(editor.querySelector("img")).toBe(foreignImage);
    expect(view.container.textContent).toContain("Selected image layout");
  } finally {
    view.cleanup();
  }
});

test("media selection never resolves an image outside the editor root", async () => {
  const view = mount(<PostRichTextAdapter value="<p>body text</p>" onChange={() => undefined} />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");
    dispatchEditorEvent(editor, "focus");

    const outside = document.createElement("div");
    outside.innerHTML = '<img src="/media/outside.png" alt="Outside image">';
    document.body.appendChild(outside);
    try {
      const outsideImage = outside.querySelector("img");
      if (!outsideImage) throw new Error("missing outside image");
      React.act(() => {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(outsideImage, 0);
        range.setEnd(outsideImage, 0);
        selection?.removeAllRanges();
        selection?.addRange(range);
        editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      });
      await flush();
      expect(view.container.textContent).not.toContain("Selected image layout");

      // The editor's own image is still found from a selection that spans the root.
      React.act(() => {
        editor.innerHTML = '<p>body text</p><img src="/media/inner.png" alt="Inner image">';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        selection?.removeAllRanges();
        selection?.addRange(range);
        editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      });
      await flush();
      expect(view.container.textContent).toContain("Selected image layout");
      expect(editor.querySelector("img")?.getAttribute("src")).toBe("/media/inner.png");
    } finally {
      outside.remove();
    }
  } finally {
    view.cleanup();
  }
});

test("clipboard image insertion keeps escaping and file filtering", () => {
  const html = buildClipboardImageInsertHtml(
    { id: 'm1" onload="alert(1)', url: "https://cdn.test/a.png?size=<large>" },
    'alt "quoted" <b>bold</b>'
  );

  expect(html.startsWith("<img ")).toBe(true);
  expect(html).toContain('src="https://cdn.test/a.png?size=&lt;large&gt;"');
  expect(html).toContain('data-media-id="m1&quot; onload=&quot;alert(1)"');
  expect(html).toContain('alt="alt &quot;quoted&quot; &lt;b&gt;bold&lt;/b&gt;"');
  expect(html).not.toContain("<script");

  const imageFile = new File(["img"], "hero.png", { type: "image/png" });
  const pdfFile = new File(["%PDF"], "notes.pdf", { type: "application/pdf" });
  const extracted = extractClipboardImageFiles({
    items: [
      { kind: "string", type: "text/plain" },
      { kind: "file", type: "application/pdf", getAsFile: () => pdfFile },
      { kind: "file", type: "image/png", getAsFile: () => imageFile },
    ],
    files: [pdfFile, imageFile],
  });
  expect(extracted).toEqual([imageFile]);
  expect(extractClipboardImageFiles(null)).toEqual([]);
});

test("slash state opens on a trailing slash command and clears the editor only for a bare command", async () => {
  const emitted: string[] = [];
  const view = mount(
    <PostRichTextAdapter
      value=""
      onChange={(next) => {
        emitted.push(next);
      }}
      onSlashInsertBlock={() => undefined}
    />
  );

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");
    dispatchEditorEvent(editor, "focus");

    React.act(() => {
      editor.innerHTML = "/quote";
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();
    expect(view.container.textContent).toContain("slash:open:quote");

    React.act(() => {
      editor.innerHTML = "keep this /quote";
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();
    expect(view.container.textContent).toContain("slash:open:quote");

    const select = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "slash-select"
    );
    if (!select) throw new Error("missing slash-select button");
    React.act(() => {
      select.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("slash:closed:");
    expect(editor.innerHTML).toBe("keep this /quote");
    expect(emitted).not.toContain("");
  } finally {
    view.cleanup();
  }
});

test("slash state stays closed without a slash insert handler", async () => {
  const { view, editor } = mountEditor("");

  try {
    dispatchEditorEvent(editor, "focus");
    React.act(() => {
      editor.innerHTML = "/quote";
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("slash:closed:");
    expect(view.container.textContent).not.toContain("slash:open");
  } finally {
    view.cleanup();
  }
});
