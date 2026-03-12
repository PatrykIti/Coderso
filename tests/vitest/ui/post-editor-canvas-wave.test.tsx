// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const mediaState = vi.hoisted(() => ({
  records: [
    {
      id: "media-1",
      key: "uploads/media-1.png",
      url: "/media/media-1.png",
      originalName: "hero-image.png",
      type: "image" as const,
      mimeType: "image/png",
      size: 1234,
      width: 1200,
      height: 800,
      alt: "Hero alt",
      title: "Hero title",
      caption: "Hero caption",
      createdAt: "2026-03-12T10:00:00.000Z",
    },
  ],
  error: null as unknown,
  calls: [] as Array<boolean | undefined>,
  reset() {
    this.records = [
      {
        id: "media-1",
        key: "uploads/media-1.png",
        url: "/media/media-1.png",
        originalName: "hero-image.png",
        type: "image" as const,
        mimeType: "image/png",
        size: 1234,
        width: 1200,
        height: 800,
        alt: "Hero alt",
        title: "Hero title",
        caption: "Hero caption",
        createdAt: "2026-03-12T10:00:00.000Z",
      },
    ];
    this.error = null;
    this.calls = [];
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-dialog-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {open ? children : null}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    onBlur,
    onFocus,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
  };
});

vi.mock("@/ui/media/MediaGrid", () => ({
  MediaGrid: ({
    items,
    selectedId,
    onSelect,
  }: {
    items: Array<{ id: string; name: string }>;
    selectedId?: string | null;
    onSelect: (id: string) => void;
  }) => (
    <div>
      <span>{`media-grid:${items.length}`}</span>
      <span>{`selected-media:${selectedId ?? "none"}`}</span>
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onSelect(item.id)}>
          {`select-media:${item.name}`}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    mediaState.calls.push(force);
    if (mediaState.error) throw mediaState.error;
    return mediaState.records;
  }),
}));

vi.mock("../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter", () => ({
  PostRichTextAdapter: ({
    value,
    onChange,
    onEditorBlur,
    onPasteDirectives,
    onSlashInsertBlock,
    onFocus,
    onBlockTypeChange,
    onFontFamilyChange,
    onBaseTextScaleChange,
  }: {
    value: string;
    onChange: (next: string) => void;
    onEditorBlur?: (finalHtml: string) => void;
    onPasteDirectives?: (directives: { replaceWordTocWithDynamicToc: boolean }) => void;
    onSlashInsertBlock?: (type: "quote") => void;
    onFocus?: () => void;
    onBlockTypeChange?: (type: "heading", attrs?: Record<string, unknown>) => void;
    onFontFamilyChange?: (value: "serif") => void;
    onBaseTextScaleChange?: (value: "xl") => void;
  }) => (
    <div>
      <span>{`adapter:${value}`}</span>
      <button type="button" onClick={() => onFocus?.()}>
        adapter-focus
      </button>
      <button type="button" onClick={() => onChange("<p>Changed</p>")}>
        adapter-change
      </button>
      <button type="button" onClick={() => onEditorBlur?.("<p>Blurred</p>")}>
        adapter-blur
      </button>
      <button
        type="button"
        onClick={() => onPasteDirectives?.({ replaceWordTocWithDynamicToc: true })}
      >
        adapter-directive
      </button>
      <button type="button" onClick={() => onSlashInsertBlock?.("quote")}>
        adapter-slash
      </button>
      <button type="button" onClick={() => onBlockTypeChange?.("heading", { level: 2 })}>
        adapter-transform
      </button>
      <button type="button" onClick={() => onFontFamilyChange?.("serif")}>
        adapter-font
      </button>
      <button type="button" onClick={() => onBaseTextScaleChange?.("xl")}>
        adapter-scale
      </button>
    </div>
  ),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    );
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    );
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value"
    );
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const focusElement = (element: HTMLElement | null | undefined) => {
  if (!element) return;
  act(() => {
    element.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
  });
};

const blurElement = (element: HTMLElement | null | undefined) => {
  if (!element) return;
  act(() => {
    element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
};

afterEach(() => {
  mediaState.reset();
  vi.restoreAllMocks();
});

test("PostEditorCanvas routes title change, empty-state insertion, and root deselection", async () => {
  const { PostEditorCanvas } = await import(
    "../../../core/admin/ui/posts/editor/PostEditorCanvas"
  );

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
  const { PostEditorCanvas } = await import(
    "../../../core/admin/ui/posts/editor/PostEditorCanvas"
  );

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

test("PostEditorCanvas selected controls update button, embed, list, and code blocks", async () => {
  const { PostEditorCanvas } = await import(
    "../../../core/admin/ui/posts/editor/PostEditorCanvas"
  );

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

test("PostEditorCanvas opens image picker, loads media, applies selected asset, and resolves existing media ids", async () => {
  const { PostEditorCanvas } = await import(
    "../../../core/admin/ui/posts/editor/PostEditorCanvas"
  );

  const onSelectBlock = vi.fn();
  const onUpdateBlockAttrs = vi.fn();

  const pickerView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [{ id: "image-1", type: "image", attrs: {}, content: null }],
      }}
      title="Canvas"
      onTitleChange={() => undefined}
      selectedBlockId="image-1"
      insertFocusToken={0}
      onSelectBlock={onSelectBlock}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      onInsertBlock={() => undefined}
    />
  );

  try {
    clickByText(pickerView.container, "Click to choose image from media library");
    await flush();

    expect(mediaState.calls).toContain(true);
    expect(pickerView.container.textContent).toContain("Select Image");
    expect(pickerView.container.textContent).toContain("media-grid:1");

    clickByText(pickerView.container, "select-media:media-1.png");

    expect(onSelectBlock).toHaveBeenCalledWith("image-1");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith("image-1", {
      mediaId: "media-1",
      alt: "Hero alt",
      caption: "Hero caption",
    });
  } finally {
    pickerView.cleanup();
  }

  mediaState.reset();
  const lookupView = mount(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "image-2",
            type: "image",
            attrs: { mediaId: "media-1" },
            content: null,
          },
        ],
      }}
      title="Lookup"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  try {
    await flush();

    expect(mediaState.calls).toContain(false);
    expect(lookupView.container.innerHTML).toContain('/media/media-1.png');
    expect(lookupView.container.innerHTML).toContain('alt="Hero alt"');
  } finally {
    lookupView.cleanup();
  }
});
