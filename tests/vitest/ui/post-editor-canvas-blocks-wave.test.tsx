// @vitest-environment happy-dom

import React from "react";
import { test, expect, vi } from "vitest";
import {
  mediaState,
  mount,
  clickByText,
  setInputValue,
  setTextareaValue,
  setSelectValue,
  flush,
  focusElement,
  blurElement,
} from "./postEditorCanvasFixtures";

test("PostEditorCanvas routes title change, empty-state insertion, and root deselection", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const onTitleChange = vi.fn();
  const onSelectBlock = vi.fn();
  const onInsertBlock = vi.fn();

  const view = mount(
    <PostEditorCanvas
      document={{ version: 1, meta: {}, blocks: [] }}
      title=""
      onTitleChange={onTitleChange}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={onSelectBlock}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={onInsertBlock}
    />
  );

  try {
    const titleInput = view.container.querySelector(
      "[data-post-editor-title-input='true']"
    ) as HTMLTextAreaElement | null;
    if (!titleInput) throw new Error("missing title input");

    focusElement(titleInput);
    setTextareaValue(titleInput, "Post title");
    clickByText(view.container, "Add section");
    (view.container.querySelector("[data-post-editor-canvas='article']") as HTMLElement)?.click();

    expect(onTitleChange).toHaveBeenCalledWith("Post title");
    expect(onInsertBlock).toHaveBeenCalledWith("writing-canvas", {
      source: "outline-plus",
      target: { mode: "index", index: 0 },
    });
    expect(onSelectBlock).toHaveBeenCalledWith(null);
  } finally {
    view.cleanup();
  }
});

test("PostEditorCanvas routes writing-canvas adapter callbacks to document update hooks", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const onSelectBlock = vi.fn();
  const onUpdateBlockContent = vi.fn();
  const onInsertBlock = vi.fn();
  const onEnsureDynamicTocBlock = vi.fn();
  const onTransformBlock = vi.fn();
  const onUpdateBlockAttrs = vi.fn();
  const onUpdateDocumentTypography = vi.fn();

  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "block-1",
            type: "writing-canvas",
            attrs: {},
            content: {
              version: 1,
              nodes: [{ id: "node-1", type: "paragraph", text: "<p>Hello</p>" }],
            },
          },
        ],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="block-1"
      insertFocusToken={0}
      onSelectBlock={onSelectBlock}
      onUpdateBlockContent={onUpdateBlockContent}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      onTransformBlock={onTransformBlock}
      onUpdateDocumentTypography={onUpdateDocumentTypography}
      onInsertBlock={onInsertBlock}
      onEnsureDynamicTocBlock={onEnsureDynamicTocBlock}
    />
  );

  try {
    clickByText(view.container, "adapter-focus");
    clickByText(view.container, "adapter-change");
    clickByText(view.container, "adapter-blur");
    clickByText(view.container, "adapter-directive");
    clickByText(view.container, "adapter-slash");
    clickByText(view.container, "adapter-transform");
    clickByText(view.container, "adapter-font");
    clickByText(view.container, "adapter-scale");

    expect(onSelectBlock).toHaveBeenCalledWith("block-1");
    expect(onUpdateBlockContent).toHaveBeenCalledWith(
      "block-1",
      expect.objectContaining({ version: 1, nodes: expect.any(Array) })
    );
    expect(onEnsureDynamicTocBlock).toHaveBeenCalled();
    expect(onInsertBlock).toHaveBeenCalledWith("quote", {
      source: "slash",
      target: { mode: "after-block", blockId: "block-1" },
    });
    expect(onTransformBlock).toHaveBeenCalledWith("block-1", "heading");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("block-1", { level: 2 });
    expect(onUpdateDocumentTypography).toHaveBeenCalledWith({
      fontFamily: "serif",
      baseTextScale: "md",
    });
    expect(onUpdateDocumentTypography).toHaveBeenLastCalledWith({
      fontFamily: "sans",
      baseTextScale: "xl",
    });
  } finally {
    view.cleanup();
  }
});

test("PostEditorCanvas routes rich-text block adapter callbacks to paragraph block hooks", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const onSelectBlock = vi.fn();
  const onUpdateBlockContent = vi.fn();
  const onInsertBlock = vi.fn();
  const onTransformBlock = vi.fn();
  const onUpdateBlockAttrs = vi.fn();
  const onUpdateDocumentTypography = vi.fn();

  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "paragraph-1",
            type: "paragraph",
            attrs: {},
            content: "<p>Hello</p>",
          },
        ],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="paragraph-1"
      insertFocusToken={0}
      onSelectBlock={onSelectBlock}
      onUpdateBlockContent={onUpdateBlockContent}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      onTransformBlock={onTransformBlock}
      onUpdateDocumentTypography={onUpdateDocumentTypography}
      onInsertBlock={onInsertBlock}
    />
  );

  try {
    clickByText(view.container, "adapter-focus");
    clickByText(view.container, "adapter-change");
    clickByText(view.container, "adapter-slash");
    clickByText(view.container, "adapter-transform");
    clickByText(view.container, "adapter-font");
    clickByText(view.container, "adapter-scale");

    expect(onSelectBlock).toHaveBeenCalledWith("paragraph-1");
    expect(onUpdateBlockContent).toHaveBeenCalledWith("paragraph-1", "<p>Changed</p>");
    expect(onInsertBlock).toHaveBeenCalledWith("quote", {
      source: "slash",
      target: { mode: "after-block", blockId: "paragraph-1" },
    });
    expect(onTransformBlock).toHaveBeenCalledWith("paragraph-1", "heading");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("paragraph-1", { level: 2 });
    expect(onUpdateDocumentTypography).toHaveBeenCalledWith({
      fontFamily: "serif",
      baseTextScale: "md",
    });
    expect(onUpdateDocumentTypography).toHaveBeenLastCalledWith({
      fontFamily: "sans",
      baseTextScale: "xl",
    });
  } finally {
    view.cleanup();
  }
});

test("PostEditorCanvas previews rich text through sanitized React rendering", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "paragraph-1",
            type: "paragraph",
            attrs: {},
            content:
              '<p onclick="evil()">Safe <strong>copy</strong><script>alert(1)</script><a href="javascript:alert(1)">bad</a></p>',
          },
        ],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  try {
    expect(view.container.innerHTML).toContain("<strong>copy</strong>");
    expect(view.container.innerHTML).toContain('href="#"');
    expect(view.container.innerHTML).not.toContain("script");
    expect(view.container.innerHTML).not.toContain("onclick");
    expect(view.container.innerHTML).not.toContain("javascript:alert");
  } finally {
    view.cleanup();
  }
});

test("PostEditorCanvas selected controls update button, embed, list, and code blocks", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const onUpdateBlockAttrs = vi.fn();
  const onUpdateBlockContent = vi.fn();
  const onSelectBlock = vi.fn();
  const onOpenBlockDetails = vi.fn();

  const renderWithBlock = (block: Record<string, unknown>) =>
    mount(
      <PostEditorCanvas
        document={{ version: 1, meta: {}, blocks: [block as never] }}
        title="Canvas"
        onTitleChange={() => undefined}
        selectedBlockId={String(block.id)}
        insertFocusToken={0}
        onSelectBlock={onSelectBlock}
        onUpdateBlockContent={onUpdateBlockContent}
        onUpdateBlockAttrs={onUpdateBlockAttrs}
        onInsertBlock={() => undefined}
        onOpenBlockDetails={onOpenBlockDetails}
      />
    );

  const buttonView = renderWithBlock({
    id: "button-1",
    type: "button",
    attrs: {},
    content: null,
  });

  try {
    const buttonInputs = Array.from(buttonView.container.querySelectorAll("input"));
    const buttonSelects = Array.from(buttonView.container.querySelectorAll("select"));

    setInputValue(buttonInputs[0], "Read more");
    setInputValue(buttonInputs[1], "https://example.com");
    setSelectValue(buttonSelects[0], "secondary");
    setSelectValue(buttonSelects[1], "lg");
    clickByText(buttonView.container, "Button");

    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("button-1", { label: "Read more" });
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("button-1", {
      url: "https://example.com",
    });
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("button-1", { variant: "secondary" });
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("button-1", { size: "lg" });
    expect(onOpenBlockDetails).toHaveBeenCalledWith("button-1");
  } finally {
    buttonView.cleanup();
  }

  const embedView = renderWithBlock({
    id: "embed-1",
    type: "embed",
    attrs: {},
    content: null,
  });

  try {
    const embedInputs = Array.from(embedView.container.querySelectorAll("input"));
    const embedSelects = Array.from(embedView.container.querySelectorAll("select"));

    setInputValue(embedInputs[0], "https://youtube.com/watch?v=abc123");
    setSelectValue(embedSelects[0], "youtube");
    setSelectValue(embedSelects[1], "4:3");
    clickByText(embedView.container, "Click to configure embed URL");

    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("embed-1", {
      url: "https://youtube.com/watch?v=abc123",
    });
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("embed-1", { provider: "youtube" });
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("embed-1", { aspect: "4:3" });
    expect(onOpenBlockDetails).toHaveBeenCalledWith("embed-1");
  } finally {
    embedView.cleanup();
  }

  const listView = renderWithBlock({
    id: "list-1",
    type: "list",
    attrs: { ordered: false, compact: false },
    content: ["One"],
  });

  try {
    const listSelect = listView.container.querySelector("select");
    const listTextarea = listView.container.querySelector(
      "[data-post-editor-primary-editable='true']"
    ) as HTMLTextAreaElement | null;
    if (!listTextarea) throw new Error("missing list textarea");

    setSelectValue(listSelect ?? undefined, "ordered");
    clickByText(listView.container, "Compact spacing");
    focusElement(listTextarea);
    setTextareaValue(listTextarea, "First\nSecond");
    blurElement(listTextarea);

    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("list-1", { ordered: true });
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("list-1", { compact: true });
    expect(onUpdateBlockContent).toHaveBeenCalledWith("list-1", ["First", "Second"]);
  } finally {
    listView.cleanup();
  }

  const codeView = renderWithBlock({
    id: "code-1",
    type: "code",
    attrs: {},
    content: "const answer = 42;",
  });

  try {
    const codeTextarea = codeView.container.querySelector(
      "[data-post-editor-primary-editable='true']"
    ) as HTMLTextAreaElement | null;
    if (!codeTextarea) throw new Error("missing code textarea");

    focusElement(codeTextarea);
    setTextareaValue(codeTextarea, "console.log('updated')");

    expect(onUpdateBlockContent).toHaveBeenCalledWith("code-1", "console.log('updated')");
  } finally {
    codeView.cleanup();
  }
});

test("PostEditorCanvas renders preview fallbacks for toc, list, button, and embed blocks", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          { id: "toc-1", type: "toc", attrs: {}, content: null },
          { id: "list-empty", type: "list", attrs: {}, content: [] },
          { id: "button-default", type: "button", attrs: {}, content: null },
          { id: "embed-empty", type: "embed", attrs: {}, content: null },
          {
            id: "embed-valid",
            type: "embed",
            attrs: {
              provider: "loom",
              url: "https://www.loom.com/share/demo-clip",
              aspect: "1:1",
              lazy: false,
            },
            content: null,
          },
        ],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
      onOpenBlockDetails={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Table of contents");
    expect(view.container.textContent).toContain("One item per line...");
    expect(view.container.textContent).toContain("Button");
    expect(view.container.textContent).toContain("Target: #");
    expect(view.container.textContent).toContain("Click to configure embed URL");
    expect(view.container.innerHTML).toContain("https://www.loom.com/embed/demo-clip");
    expect(view.container.innerHTML).toContain('loading="eager"');
  } finally {
    view.cleanup();
  }
});

test("PostEditorCanvas title focus clears selection and image toolbar falls back to default control values", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  mediaState.reset();
  const onSelectBlock = vi.fn();
  const onUpdateBlockAttrs = vi.fn();
  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "image-toolbar",
            type: "image",
            attrs: {
              mediaId: "/media/default-image.png",
              wrap: "weird",
              widthPercent: 999,
            },
            content: null,
          },
        ],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="image-toolbar"
      insertFocusToken={0}
      onSelectBlock={onSelectBlock}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      onInsertBlock={() => undefined}
    />
  );

  try {
    await flush();
    expect(mediaState.calls).not.toContain(false);

    const titleInput = view.container.querySelector(
      "[data-post-editor-title-input='true']"
    ) as HTMLTextAreaElement | null;
    if (!titleInput) throw new Error("missing title input");

    React.act(() => {
      titleInput.dispatchEvent(new Event("focusin", { bubbles: true }));
      titleInput.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
    });

    const selects = Array.from(view.container.querySelectorAll("select"));
    expect((selects[0] as HTMLSelectElement | null | undefined)?.value).toBe("none");
    expect((selects[1] as HTMLSelectElement | null | undefined)?.value).toBe("50");

    expect(onSelectBlock).toHaveBeenCalledWith(null);
    expect(onUpdateBlockAttrs).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PostEditorCanvas routes delete and replace-image controls without deselecting the canvas shell", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  mediaState.reset();
  const onDeleteBlock = vi.fn();
  const onSelectBlock = vi.fn();
  const onUpdateBlockAttrs = vi.fn();
  const view = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "image-delete",
            type: "image",
            attrs: { mediaId: "   " },
            content: null,
          },
        ],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="image-delete"
      insertFocusToken={0}
      onSelectBlock={onSelectBlock}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      onInsertBlock={() => undefined}
      onDeleteBlock={onDeleteBlock}
    />
  );

  try {
    const deleteButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Delete block: Image"
    ) as HTMLButtonElement | null | undefined;
    if (!deleteButton) {
      throw new Error("missing delete button");
    }

    React.act(() => {
      deleteButton.click();
    });

    expect(onDeleteBlock).toHaveBeenCalledWith("image-delete");

    clickByText(view.container, "Replace image");
    await flush();

    expect(view.container.textContent).toContain("Select Image");
    expect(view.container.textContent).toContain("selected-media:none");

    clickByText(view.container, "select-media:media-1.png");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("image-delete", {
      mediaId: "media-1",
      alt: "Hero alt",
      caption: "Hero caption",
    });
  } finally {
    view.cleanup();
  }
});

test("PostEditorCanvas uses document typography for selected callout blocks and renders richer preview defaults", async () => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  const onTransformBlock = vi.fn();
  const onUpdateBlockAttrs = vi.fn();
  const onUpdateDocumentTypography = vi.fn();
  const onOpenBlockDetails = vi.fn();

  const selectedView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {
          typography: {
            fontFamily: "mono",
            baseTextScale: "xl",
          },
        },
        blocks: [
          {
            id: "callout-1",
            type: "callout",
            attrs: {},
            content: "<p>Alert</p>",
          },
        ],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="callout-1"
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      onTransformBlock={onTransformBlock}
      onUpdateDocumentTypography={onUpdateDocumentTypography}
      onInsertBlock={() => undefined}
    />
  );

  try {
    expect(selectedView.container.textContent).toContain("adapter-profile:callout");
    expect(selectedView.container.textContent).toContain("adapter-typography:mono:xl");

    clickByText(selectedView.container, "adapter-transform");
    clickByText(selectedView.container, "adapter-font");
    clickByText(selectedView.container, "adapter-scale");

    expect(onTransformBlock).toHaveBeenCalledWith("callout-1", "heading");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("callout-1", { level: 2 });
    expect(onUpdateDocumentTypography).toHaveBeenNthCalledWith(1, {
      fontFamily: "serif",
      baseTextScale: "xl",
    });
    expect(onUpdateDocumentTypography).toHaveBeenNthCalledWith(2, {
      fontFamily: "mono",
      baseTextScale: "xl",
    });
  } finally {
    selectedView.cleanup();
  }

  const previewView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "toc-custom",
            type: "toc",
            attrs: { title: "Contents" },
            content: null,
          },
          {
            id: "image-captioned",
            type: "image",
            attrs: {
              mediaId: "https://cdn.test/image.png",
              alt: "Poster alt",
              caption: "Poster caption",
            },
            content: null,
          },
          {
            id: "button-styled",
            type: "button",
            attrs: {
              label: "Read more",
              url: " https://example.com/read-more ",
              variant: "link",
              size: "lg",
            },
            content: null,
          },
        ],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
      onOpenBlockDetails={onOpenBlockDetails}
    />
  );

  try {
    expect(previewView.container.textContent).toContain("Contents");
    expect(previewView.container.innerHTML).toContain('alt="Poster alt"');
    expect(previewView.container.textContent).toContain("Poster caption");

    const button = Array.from(previewView.container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Read more")
    ) as HTMLButtonElement | null | undefined;
    expect(button?.className).toContain("underline-offset-4");
    expect(button?.className).toContain("h-11");

    React.act(() => {
      button?.click();
    });

    expect(onOpenBlockDetails).toHaveBeenCalledWith("button-styled");
  } finally {
    previewView.cleanup();
  }
});
