// @vitest-environment happy-dom

import React, { useState } from "react";
import { test, expect, vi } from "vitest";
import {
  mount,
  getEditor,
  clickByText,
  dispatchEditorEvent,
  setSelectionAtEnd,
  setSelectValue,
  flush,
  createClipboardData,
  dispatchPaste,
} from "./postRichTextAdapterFixtures";
import { PostRichTextAdapter } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("PostRichTextAdapter uploads clipboard images and exposes image layout controls", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const onChangeSpy = vi.fn();
  const onUploadClipboardImage = vi.fn(async () => ({
    id: "media-1",
    key: "media-key",
    url: "/media/example.png",
  }));

  const Harness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
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

    const imageFile = new File(["img"], "hero-banner.png", { type: "image/png" });
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

    expect(onUploadClipboardImage).toHaveBeenCalledTimes(1);
    expect(onChangeSpy.mock.calls.some((call) => String(call[0]).includes("data-media-id"))).toBe(
      true
    );
    dispatchEditorEvent(editor, "mouseup");
    const selects = Array.from(view.container.querySelectorAll("select"));
    setSelectValue(selects[0], "left");
    setSelectValue(selects[1], "66");
    setSelectValue(selects[2], "lg");
    await flush();

    expect(view.container.textContent).toContain("Image uploaded and inserted.");
    expect(view.container.textContent).toContain("Selected image layout");
    expect(
      onChangeSpy.mock.calls.some((call) => String(call[0]).includes('data-wrap="left"'))
    ).toBe(true);
    expect(onChangeSpy.mock.calls.some((call) => String(call[0]).includes('data-width="66"'))).toBe(
      true
    );
    expect(
      onChangeSpy.mock.calls.some((call) => String(call[0]).includes('data-margin="lg"'))
    ).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter reports insertion fallback, multiple uploads, generic upload failures, and mixed slash selection", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const originalGetSelection = window.getSelection;

  const zeroInsertUpload = vi.fn(async () => ({
    id: "media-zero",
    key: "media-zero",
    url: "/media/zero.png",
  }));
  const ZeroHarness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onUploadClipboardImage={zeroInsertUpload}
      />
    );
  };

  const zeroView = mount(<ZeroHarness />);
  try {
    const editor = getEditor(zeroView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);
    Object.defineProperty(window, "getSelection", {
      value: () => null,
      configurable: true,
      writable: true,
    });

    const imageFile = new File(["img"], "zero.png", { type: "image/png" });
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

    expect(zeroInsertUpload).toHaveBeenCalledTimes(1);
    expect(zeroView.container.textContent).toContain(
      "Image upload finished but insertion failed. Try paste again."
    );
  } finally {
    Object.defineProperty(window, "getSelection", {
      value: originalGetSelection,
      configurable: true,
      writable: true,
    });
    zeroView.cleanup();
  }

  const multiUpload = vi
    .fn()
    .mockResolvedValueOnce({ id: "media-1", key: "m1", url: "/media/one.png" })
    .mockResolvedValueOnce({ id: "media-2", key: "m2", url: "/media/two.png" });
  const multiChangeSpy = vi.fn();
  const MultiHarness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={(next) => {
          multiChangeSpy(next);
          setValue(next);
        }}
        onUploadClipboardImage={multiUpload}
      />
    );
  };

  const multiView = mount(<MultiHarness />);
  try {
    const editor = getEditor(multiView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);

    const first = new File(["img"], "one.png", { type: "image/png" });
    const second = new File(["img"], "two.png", { type: "image/png" });
    await dispatchPaste(
      editor,
      createClipboardData({
        items: [
          { kind: "file", type: "image/png", getAsFile: () => first },
          { kind: "file", type: "image/png", getAsFile: () => second },
        ],
      })
    );

    expect(multiUpload).toHaveBeenCalledTimes(2);
    expect(multiView.container.textContent).toContain("2 images uploaded and inserted.");
    expect(multiChangeSpy.mock.calls.some((call) => String(call[0]).includes("media-2"))).toBe(
      true
    );
  } finally {
    multiView.cleanup();
  }

  const genericUpload = vi.fn(async () => {
    throw { boom: true };
  });
  const genericView = mount(
    <PostRichTextAdapter
      value=""
      onChange={() => undefined}
      onUploadClipboardImage={genericUpload}
    />
  );
  try {
    const editor = getEditor(genericView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);
    const imageFile = new File(["img"], "fail.png", { type: "image/png" });
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

    expect(genericView.container.textContent).toContain(
      "Image upload failed: Image upload failed.. Paste again to retry."
    );
  } finally {
    genericView.cleanup();
  }

  const slashChangeSpy = vi.fn();
  const slashInsert = vi.fn();
  const SlashHarness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={(next) => {
          slashChangeSpy(next);
          setValue(next);
        }}
        onSlashInsertBlock={slashInsert}
      />
    );
  };

  const slashView = mount(<SlashHarness />);
  try {
    const editor = getEditor(slashView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    React.act(() => {
      editor.innerHTML = "<p>Hello /quote</p>";
      setSelectionAtEnd(editor);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();

    expect(slashView.container.textContent).toContain("slash:open:quote");
    clickByText(slashView.container, "slash-select");

    expect(slashInsert).toHaveBeenCalledWith("quote");
    expect(slashChangeSpy).not.toHaveBeenLastCalledWith("");
  } finally {
    slashView.cleanup();
  }
});

test("PostRichTextAdapter updates image layout on keyup and clears paste hint after timeout or clean paste", async () => {
  vi.useFakeTimers();

  const timeoutView = mount(
    <PostRichTextAdapter value="" onChange={() => undefined} onSlashInsertBlock={() => undefined} />
  );

  try {
    const editor = getEditor(timeoutView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
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
    expect(timeoutView.container.textContent).toContain("Paste notice:");

    await React.act(async () => {
      vi.advanceTimersByTime(7000);
    });
    expect(timeoutView.container.textContent).not.toContain("Paste notice:");

    React.act(() => {
      editor.innerHTML =
        '<p><img src="/media/example.png" data-wrap="right" data-width="75" data-margin="md" alt="Example"></p>';
      const image = editor.querySelector("img");
      if (!(image instanceof HTMLImageElement)) {
        throw new Error("missing image");
      }
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNode(image);
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
    });

    expect(timeoutView.container.textContent).toContain("Selected image layout");
  } finally {
    timeoutView.cleanup();
    vi.useRealTimers();
  }

  const cleanPasteView = mount(
    <PostRichTextAdapter value="" onChange={() => undefined} onPasteDirectives={() => undefined} />
  );

  try {
    const editor = getEditor(cleanPasteView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
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
    expect(cleanPasteView.container.textContent).toContain("Paste notice:");

    await dispatchPaste(
      editor,
      createClipboardData({
        html: "<p>Plain content</p>",
        text: "Plain content",
      })
    );

    expect(cleanPasteView.container.textContent).not.toContain("Paste notice:");
  } finally {
    cleanPasteView.cleanup();
  }
});

test("PostRichTextAdapter uploads images from clipboard files fallback and normalizes invalid selected image layout", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const onChangeSpy = vi.fn();
  const onUploadClipboardImage = vi.fn(async () => ({
    id: "media-files-fallback",
    key: "files-fallback",
    url: "/media/files-fallback.png",
  }));

  const Harness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
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

    const imageFile = new File(["img"], "files-fallback.png", {
      type: "image/png",
    });
    await dispatchPaste(
      editor,
      createClipboardData({
        items: [],
        files: [imageFile],
      })
    );

    expect(onUploadClipboardImage).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Image uploaded and inserted.");
    expect(
      onChangeSpy.mock.calls.some((call) => String(call[0]).includes("media-files-fallback"))
    ).toBe(true);

    React.act(() => {
      editor.innerHTML =
        '<p><img src="/media/raw.png" data-wrap="diagonal" data-width="999" data-margin="huge" alt="Raw"></p>';
      const image = editor.querySelector("img");
      if (!(image instanceof HTMLImageElement)) {
        throw new Error("missing image");
      }
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNode(image);
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    await flush();

    const selects = Array.from(view.container.querySelectorAll("select"));
    expect(selects[0]?.value).toBe("none");
    expect(selects[1]?.value).toBe("50");
    expect(selects[2]?.value).toBe("md");
  } finally {
    view.cleanup();
  }
});
