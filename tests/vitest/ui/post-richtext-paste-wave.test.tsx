// @vitest-environment happy-dom

import React, { useState } from "react";
import { test, expect, vi } from "vitest";
import {
  mount,
  getEditor,
  dispatchEditorEvent,
  setSelectionAtEnd,
  findTextNode,
  setRangeSelection,
  flush,
  createClipboardData,
  dispatchPaste,
} from "./postRichTextAdapterFixtures";
import { PostRichTextAdapter } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("PostRichTextAdapter routes rich-text paste directives and image-paste unavailable hint", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const onPasteDirectives = vi.fn();
  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
        onPasteDirectives={onPasteDirectives}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);

    await dispatchPaste(
      editor,
      createClipboardData({
        html: `
          <p>Table of contents</p>
          <p><a href="#_Toc100">1. Intro 1</a></p>
          <p><a href="#_Toc200">2. Setup 3</a></p>
          <p><a href="#_Toc300">3. Output 5</a></p>
          <h1>Intro</h1>
          <p>Body</p>
        `,
        text: "",
      })
    );

    expect(onPasteDirectives).toHaveBeenCalledWith(
      expect.objectContaining({ replaceWordTocWithDynamicToc: true })
    );
    expect(onChangeSpy).toHaveBeenCalled();
    expect(view.container.textContent).toContain("Paste notice:");

    const imageFile = new File(["img"], "clipboard.png", { type: "image/png" });
    await dispatchPaste(
      editor,
      createClipboardData({
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => imageFile,
          },
        ],
      })
    );

    expect(view.container.textContent).toContain(
      "Image paste is unavailable in this editor context."
    );
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter forwards directives even when rich-text insertion fallback cannot insert", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const originalGetSelection = window.getSelection;
  const onPasteDirectives = vi.fn();

  const view = mount(
    <PostRichTextAdapter
      value=""
      onChange={() => undefined}
      onPasteDirectives={onPasteDirectives}
    />
  );

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    Object.defineProperty(window, "getSelection", {
      value: () => null,
      configurable: true,
      writable: true,
    });

    await dispatchPaste(
      editor,
      createClipboardData({
        html: `
          <p>Table of contents</p>
          <p><a href="#_Toc100">1. Intro 1</a></p>
          <p><a href="#_Toc200">2. Setup 3</a></p>
          <p><a href="#_Toc300">3. Output 5</a></p>
          <h1>Intro</h1>
          <p>Body</p>
        `,
        text: "",
      })
    );

    expect(onPasteDirectives).toHaveBeenCalledWith(
      expect.objectContaining({ replaceWordTocWithDynamicToc: true })
    );
    expect(view.container.textContent).toContain("Paste notice:");
  } finally {
    Object.defineProperty(window, "getSelection", {
      value: originalGetSelection,
      configurable: true,
      writable: true,
    });
    view.cleanup();
  }
});

test("PostRichTextAdapter handles quote shortcut and ignores paste payloads with no rich text or images", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Quoted text</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    const quotedNode = findTextNode(editor, "Quoted text");
    setRangeSelection(quotedNode, 0, quotedNode, quotedNode.nodeValue?.length ?? 11);

    React.act(() => {
      editor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "5",
          shiftKey: true,
          altKey: true,
          bubbles: true,
        })
      );
    });
    await flush();

    expect(editor.innerHTML).toContain("<blockquote>Quoted text</blockquote>");

    await dispatchPaste(
      editor,
      createClipboardData({
        html: "",
        text: "",
      })
    );

    expect(view.container.textContent).not.toContain("Paste notice:");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter surfaces multi-warning paste suffixes and default upload-failure messages", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const imageFile = new File(["img"], "clipboard.png", { type: "image/png" });
  const onUploadClipboardImage = vi.fn(async () => {
    throw "upload-string-error";
  });

  const Harness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onUploadClipboardImage={onUploadClipboardImage}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);

    await dispatchPaste(
      editor,
      createClipboardData({
        html: `
          <p class="MsoHeading1" style="mso-outline-level:1">Table of contents</p>
          <p><a href="#_Toc100">1. Intro 1</a></p>
          <p><a href="#_Toc200">2. Setup 3</a></p>
          <p><a href="#_Toc300">3. Output 5</a></p>
          <table><tr><td>unsupported</td></tr></table>
          <p>Body</p>
        `,
        text: "",
      })
    );

    expect(view.container.textContent).toContain("Paste notice:");
    expect(view.container.textContent).toContain("(+1 more)");

    await dispatchPaste(
      editor,
      createClipboardData({
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => imageFile,
          },
        ],
      })
    );

    expect(view.container.textContent).toContain("Image upload failed: Image upload failed.");
  } finally {
    view.cleanup();
  }
});
