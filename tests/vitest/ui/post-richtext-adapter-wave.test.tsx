// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostRichTextAdapter } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) =>
    values.filter(Boolean).join(" "),
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
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => <option value={value}>{children}</option>,
  };
});

vi.mock("../../../core/admin/ui/posts/editor/richtext/PostRichTextToolbar", () => ({
  PostRichTextToolbar: ({
    onCommand,
    onFontFamilyChange,
    onBaseTextScaleChange,
  }: {
    onCommand: (command: string) => void;
    onFontFamilyChange?: (value: "sans" | "serif" | "mono") => void;
    onBaseTextScaleChange?: (value: "sm" | "md" | "lg" | "xl") => void;
  }) => (
    <div>
      <button type="button" aria-label="Bold" onClick={() => onCommand("bold")}>
        bold
      </button>
      <button type="button" onClick={() => onFontFamilyChange?.("serif")}>
        font-serif
      </button>
      <button type="button" onClick={() => onBaseTextScaleChange?.("lg")}>
        scale-lg
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/blocks/SlashCommandMenu", () => ({
  SlashCommandMenu: ({
    open,
    query,
    onSelect,
  }: {
    open: boolean;
    query: string;
    onSelect: (type: "quote") => void;
  }) => (
    <div>
      <span>{`slash:${open ? "open" : "closed"}:${query}`}</span>
      {open ? (
        <button type="button" onClick={() => onSelect("quote")}>
          slash-select
        </button>
      ) : null}
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

const getEditor = (container: HTMLElement) =>
  container.querySelector("[data-post-editor-primary-editable='true']") as HTMLDivElement | null;

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

const dispatchEditorEvent = (element: HTMLElement, type: string) => {
  act(() => {
    element.dispatchEvent(new Event(type, { bubbles: true }));
  });
};

const setSelectionAtEnd = (element: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const createClipboardData = (options: {
  html?: string;
  text?: string;
  items?: Array<{
    kind?: string;
    type?: string;
    getAsFile?: () => File | null;
  }>;
  files?: File[];
}) => ({
  getData: (type: string) => {
    if (type === "text/html") return options.html ?? "";
    if (type === "text/plain") return options.text ?? "";
    return "";
  },
  items: options.items ?? [],
  files: options.files ?? [],
});

const dispatchPaste = async (element: HTMLElement, clipboardData: unknown) => {
  await act(async () => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: clipboardData });
    element.dispatchEvent(event);
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("PostRichTextAdapter routes toolbar fallback callbacks and keyboard shortcuts", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const onChangeSpy = vi.fn();
  const onFontFamilyChange = vi.fn();
  const onBaseTextScaleChange = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState("<p>Hello</p>");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
        onFontFamilyChange={onFontFamilyChange}
        onBaseTextScaleChange={onBaseTextScaleChange}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);

    clickByText(view.container, "font-serif");
    clickByText(view.container, "scale-lg");

    expect(onFontFamilyChange).toHaveBeenCalledWith("serif");
    expect(onBaseTextScaleChange).toHaveBeenCalledWith("lg");

    act(() => {
      editor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "b",
          ctrlKey: true,
          bubbles: true,
        })
      );
    });

    expect(execCommand).toHaveBeenCalledWith("defaultParagraphSeparator", false, "p");
    expect(execCommand).toHaveBeenCalledWith("bold", false, undefined);
  } finally {
    view.cleanup();
  }
});

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
    act(() => {
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
    expect(view.container.textContent).toContain("Image uploaded and inserted.");
    expect(view.container.textContent).toContain("Selected image layout");
  } finally {
    view.cleanup();
  }
});
