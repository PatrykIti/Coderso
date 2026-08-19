// @vitest-environment happy-dom

import React, { useState } from "react";
import { test, expect, vi } from "vitest";
import {
  mount,
  getEditor,
  clickByText,
  dispatchEditorEvent,
  setSelectionAtEnd,
  flush,
} from "./postRichTextAdapterFixtures";
import { PostRichTextAdapter } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("PostRichTextAdapter opens slash menu and clears standalone slash content on selection", async () => {
  const onSlashInsertBlock = vi.fn();
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
        onSlashInsertBlock={onSlashInsertBlock}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    React.act(() => {
      editor.innerHTML = "/quote";
      setSelectionAtEnd(editor);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("slash:open:quote");

    clickByText(view.container, "slash-select");

    expect(onSlashInsertBlock).toHaveBeenCalledWith("quote");
    expect(onChangeSpy).toHaveBeenLastCalledWith("");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter closes slash menu and emits blur callback", async () => {
  const onEditorBlur = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onEditorBlur={onEditorBlur}
        onSlashInsertBlock={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    React.act(() => {
      editor.innerHTML = "/quote";
      setSelectionAtEnd(editor);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("slash:open:quote");

    clickByText(view.container, "slash-close");
    expect(view.container.textContent).toContain("slash:closed:");

    React.act(() => {
      editor.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      editor.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(onEditorBlur).toHaveBeenCalledWith("/quote");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter closes slash menu on Escape and clears selected image layout on blur", async () => {
  const view = mount(
    <PostRichTextAdapter value="" onChange={() => undefined} onSlashInsertBlock={() => undefined} />
  );

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    React.act(() => {
      editor.innerHTML = "/quote";
      setSelectionAtEnd(editor);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();
    expect(view.container.textContent).toContain("slash:open:quote");

    React.act(() => {
      editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(view.container.textContent).toContain("slash:closed:");

    React.act(() => {
      editor.innerHTML =
        '<p><img src="/media/example.png" data-wrap="left" data-width="66" data-margin="lg" alt="Example"></p>';
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

    expect(view.container.textContent).toContain("Selected image layout");

    React.act(() => {
      editor.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      editor.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });

    expect(view.container.textContent).not.toContain("Selected image layout");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter keeps slash menu closed without slash handler and respects block transform mode", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const plainView = mount(<PostRichTextAdapter value="" onChange={() => undefined} />);

  try {
    const editor = getEditor(plainView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    React.act(() => {
      editor.innerHTML = "/quote";
      setSelectionAtEnd(editor);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();

    expect(plainView.container.textContent).toContain("slash:closed:");
    expect(plainView.container.textContent).not.toContain("slash:open:quote");
  } finally {
    plainView.cleanup();
  }

  const onBlockTypeChange = vi.fn();
  const TypeOnlyHarness = () => {
    const [value, setValue] = useState("Loose text");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onBlockTypeChange={onBlockTypeChange}
        blockTransformMode="type-only"
      />
    );
  };

  const typeOnlyView = mount(<TypeOnlyHarness />);

  try {
    const editor = getEditor(typeOnlyView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    clickByText(typeOnlyView.container, "heading-1");
    await flush();

    expect(onBlockTypeChange).not.toHaveBeenCalled();
    expect(editor.innerHTML).toContain("Loose text");
  } finally {
    typeOnlyView.cleanup();
  }

  const onFormatTransform = vi.fn();
  const TransformHarness = () => {
    const [value, setValue] = useState("Loose text");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onBlockTypeChange={onFormatTransform}
      />
    );
  };

  const transformView = mount(<TransformHarness />);

  try {
    const editor = getEditor(transformView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    clickByText(transformView.container, "heading-1");
    await flush();

    expect(onFormatTransform).toHaveBeenCalledWith("heading", { level: 1 });
    expect(editor.innerHTML).not.toContain("<h1>Loose text</h1>");
  } finally {
    transformView.cleanup();
  }
});

test("PostRichTextAdapter closes slash menu when content no longer matches slash command syntax", async () => {
  const Harness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter value={value} onChange={setValue} onSlashInsertBlock={() => undefined} />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    React.act(() => {
      editor.innerHTML = "/quote";
      setSelectionAtEnd(editor);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();
    expect(view.container.textContent).toContain("slash:open:quote");

    React.act(() => {
      editor.innerHTML = "regular text";
      setSelectionAtEnd(editor);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("slash:closed:");
    expect(view.container.textContent).not.toContain("slash:open:quote");
  } finally {
    view.cleanup();
  }
});
