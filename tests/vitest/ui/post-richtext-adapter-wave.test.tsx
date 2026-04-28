// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  PostRichTextAdapter,
  buildPostRichTextPasteInsert,
} from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

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
      <button type="button" onClick={() => onCommand("italic")}>
        italic
      </button>
      <button type="button" onClick={() => onCommand("underline")}>
        underline
      </button>
      <button type="button" onClick={() => onCommand("strike")}>
        strike
      </button>
      <button type="button" onClick={() => onCommand("link")}>
        link
      </button>
      <button type="button" onClick={() => onCommand("highlight")}>
        highlight
      </button>
      <button type="button" onClick={() => onCommand("inline-code")}>
        inline-code
      </button>
      <button type="button" onClick={() => onCommand("heading-1")}>
        heading-1
      </button>
      <button type="button" onClick={() => onCommand("type-section")}>
        type-section
      </button>
      <button type="button" onClick={() => onCommand("type-heading")}>
        type-heading
      </button>
      <button type="button" onClick={() => onCommand("type-quote")}>
        type-quote
      </button>
      <button type="button" onClick={() => onCommand("bullet-list")}>
        bullet-list
      </button>
      <button type="button" onClick={() => onCommand("ordered-list")}>
        ordered-list
      </button>
      <button type="button" onClick={() => onCommand("align-center")}>
        align-center
      </button>
      <button type="button" onClick={() => onCommand("clear-formatting")}>
        clear-formatting
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
    onClose,
  }: {
    open: boolean;
    query: string;
    onSelect: (type: "quote") => void;
    onClose?: () => void;
  }) => (
    <div>
      <span>{`slash:${open ? "open" : "closed"}:${query}`}</span>
      {open ? (
        <>
          <button type="button" onClick={() => onSelect("quote")}>
            slash-select
          </button>
          <button type="button" onClick={() => onClose?.()}>
            slash-close
          </button>
        </>
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

const setRangeSelection = (
  startNode: Text,
  startOffset: number,
  endNode: Text,
  endOffset: number
) => {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
};

const setCollapsedSelection = (node: Text, offset: number) => {
  setRangeSelection(node, offset, node, offset);
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Missing select for value: ${value}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  act(() => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
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

test("PostRichTextAdapter routes native-inline and link commands", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const originalPrompt = window.prompt;
  const prompt = vi
    .fn()
    .mockReturnValueOnce("https://example.com")
    .mockReturnValueOnce("Example link")
    .mockReturnValueOnce("https://example.com/selected")
    .mockReturnValueOnce("   ");
  Object.defineProperty(window, "prompt", {
    value: prompt,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Link target</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);

    clickByText(view.container, "italic");
    clickByText(view.container, "underline");
    clickByText(view.container, "strike");

    const linkNode = findTextNode(editor, "Link");
    setCollapsedSelection(linkNode, 1);
    clickByText(view.container, "link");

    const targetNode = findTextNode(editor, "target");
    setRangeSelection(targetNode, 0, targetNode, targetNode.nodeValue?.length ?? 6);
    clickByText(view.container, "link");
    clickByText(view.container, "link");

    expect(execCommand).toHaveBeenCalledWith("italic", false, undefined);
    expect(execCommand).toHaveBeenCalledWith("underline", false, undefined);
    expect(execCommand).toHaveBeenCalledWith("strikeThrough", false, undefined);
    expect(execCommand).toHaveBeenCalledWith(
      "insertHTML",
      false,
      '<a href="https://example.com">Example link</a>'
    );
    expect(execCommand).toHaveBeenCalledWith("createLink", false, "https://example.com/selected");
    expect(execCommand).toHaveBeenCalledWith("unlink", false, undefined);
  } finally {
    Object.defineProperty(window, "prompt", {
      value: originalPrompt,
      configurable: true,
      writable: true,
    });
    view.cleanup();
  }
});

test("PostRichTextAdapter applies inline typography to selection and reuses typography spans", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const onFontFamilyChange = vi.fn();
  const onBaseTextScaleChange = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState("<p>Alpha <strong>Beta</strong></p>");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
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

    const alphaNode = findTextNode(editor, "Alpha");
    const betaNode = findTextNode(editor, "Beta");
    setRangeSelection(alphaNode, 0, betaNode, betaNode.nodeValue?.length ?? 4);

    clickByText(view.container, "font-serif");
    await flush();

    const selectedSpan = editor.querySelector('span[data-font="serif"]');
    expect(selectedSpan).not.toBeNull();

    const serifNode = findTextNode(editor, "Alpha");
    setRangeSelection(serifNode, 0, serifNode, serifNode.nodeValue?.length ?? 5);

    clickByText(view.container, "scale-lg");
    await flush();

    expect(onFontFamilyChange).not.toHaveBeenCalled();
    expect(onBaseTextScaleChange).not.toHaveBeenCalled();
    expect(editor.innerHTML).toContain('data-font="serif"');
    expect(editor.innerHTML).toContain('data-text-scale="lg"');
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter falls back for block commands without block wrappers", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const HeadingHarness = () => {
    const [value, setValue] = useState("Loose text");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const headingView = mount(<HeadingHarness />);

  try {
    const editor = getEditor(headingView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    clickByText(headingView.container, "heading-1");
    await flush();
    expect(editor.innerHTML).toContain("<h1>Loose text</h1>");

    act(() => {
      editor.innerHTML = "Loose text";
      setSelectionAtEnd(editor);
    });
    clickByText(headingView.container, "clear-formatting");
    await flush();

    expect(editor.innerHTML).toContain("<p>Loose text</p>");
  } finally {
    headingView.cleanup();
  }
});

test("PostRichTextAdapter wraps collapsed caret tokens with highlight and inline code", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Gamma Delta</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    const initialNode = findTextNode(editor, "Gamma Delta");
    setCollapsedSelection(initialNode, 1);
    clickByText(view.container, "inline-code");
    await flush();

    expect(editor.innerHTML).toContain("<code>Gamma</code>");

    const deltaNode = findTextNode(editor, "Delta");
    setCollapsedSelection(deltaNode, 1);
    clickByText(view.container, "highlight");
    await flush();

    expect(editor.innerHTML).toContain("<mark>Delta</mark>");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter applies block alignment and clears formatting for selected blocks", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState(
      '<p data-align="right"><span data-font="serif"><mark>Styled</mark></span></p>'
    );
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    const styledNode = findTextNode(editor, "Styled");
    setRangeSelection(styledNode, 0, styledNode, styledNode.nodeValue?.length ?? 6);

    clickByText(view.container, "align-center");
    await flush();
    expect(editor.innerHTML).toContain('data-align="center"');

    clickByText(view.container, "clear-formatting");
    await flush();

    expect(execCommand).toHaveBeenCalledWith("removeFormat", false, undefined);
    expect(execCommand).toHaveBeenCalledWith("unlink", false, undefined);
    expect(editor.innerHTML).not.toContain("data-align");
    expect(editor.innerHTML).not.toContain("data-font");
    expect(editor.innerHTML).not.toContain("<mark");
    expect(editor.innerHTML).toContain("<p>Styled</p>");
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
    dispatchEditorEvent(editor, "mouseup");
    const selects = Array.from(view.container.querySelectorAll("select"));
    setSelectValue(selects[0], "left");
    setSelectValue(selects[1], "66");
    setSelectValue(selects[2], "lg");
    await flush();

    expect(view.container.textContent).toContain("Image uploaded and inserted.");
    expect(view.container.textContent).toContain("Selected image layout");
    expect(onChangeSpy.mock.calls.some((call) => String(call[0]).includes('data-wrap="left"'))).toBe(
      true
    );
    expect(onChangeSpy.mock.calls.some((call) => String(call[0]).includes('data-width="66"'))).toBe(
      true
    );
    expect(onChangeSpy.mock.calls.some((call) => String(call[0]).includes('data-margin="lg"'))).toBe(
      true
    );
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
    <PostRichTextAdapter value="" onChange={() => undefined} onUploadClipboardImage={genericUpload} />
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
    act(() => {
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
    <PostRichTextAdapter value="" onChange={() => undefined} onPasteDirectives={onPasteDirectives} />
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
    act(() => {
      editor.innerHTML = "/quote";
      setSelectionAtEnd(editor);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("slash:open:quote");

    clickByText(view.container, "slash-close");
    expect(view.container.textContent).toContain("slash:closed:");

    act(() => {
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
    <PostRichTextAdapter
      value=""
      onChange={() => undefined}
      onSlashInsertBlock={() => undefined}
    />
  );

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

    act(() => {
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
    expect(view.container.textContent).toContain("slash:closed:");

    act(() => {
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

    act(() => {
      editor.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      editor.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });

    expect(view.container.textContent).not.toContain("Selected image layout");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter updates image layout on keyup and clears paste hint after timeout or clean paste", async () => {
  vi.useFakeTimers();

  const timeoutView = mount(
    <PostRichTextAdapter
      value=""
      onChange={() => undefined}
      onSlashInsertBlock={() => undefined}
    />
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

    await act(async () => {
      vi.advanceTimersByTime(7000);
    });
    expect(timeoutView.container.textContent).not.toContain("Paste notice:");

    act(() => {
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

    act(() => {
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

test("PostRichTextAdapter routes type commands through onBlockTypeChange and exposes multi-warning paste insert diagnostics", async () => {
  const onBlockTypeChange = vi.fn();
  const Harness = () => {
    const [value, setValue] = useState("<p>Section text</p>");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onBlockTypeChange={onBlockTypeChange}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    clickByText(view.container, "type-section");
    clickByText(view.container, "type-heading");
    clickByText(view.container, "type-quote");

    expect(onBlockTypeChange.mock.calls).toEqual([
      ["writing-canvas", undefined],
      ["heading", { level: 2 }],
      ["quote", undefined],
    ]);
  } finally {
    view.cleanup();
  }

  const pasteInsert = buildPostRichTextPasteInsert({
    html: `
      <p class="MsoHeading1" style="mso-outline-level:1">Table of contents</p>
      <p><a href="#_Toc100">1. Intro 1</a></p>
      <p><a href="#_Toc200">2. Setup 3</a></p>
      <p><a href="#_Toc300">3. Output 5</a></p>
      <table><tr><td>unsupported</td></tr></table>
      <p>Body</p>
    `,
    text: "",
  });

  expect(pasteInsert.mode).toBe("writing-canvas");
  expect(pasteInsert.directives.replaceWordTocWithDynamicToc).toBe(true);
  expect(pasteInsert.warnings.length).toBeGreaterThan(1);
  expect(pasteInsert.warnings.some((warning) => warning.includes("Unsupported HTML markup"))).toBe(
    true
  );
  expect(pasteInsert.warnings.some((warning) => warning.includes("dynamic TOC"))).toBe(true);
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

    expect(view.container.textContent).toContain(
      "Image upload failed: Image upload failed."
    );
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter applies placeholder and editor typography classes for serif and mono scales", async () => {
  const serifView = mount(
    <PostRichTextAdapter
      value=""
      onChange={() => undefined}
      fontFamily="serif"
      baseTextScale="xl"
    />
  );

  try {
    const placeholder = Array.from(serifView.container.querySelectorAll("div")).find(
      (candidate) =>
        candidate.textContent?.includes("Start writing")
        && candidate.className.includes("pointer-events-none")
    ) as HTMLDivElement | null | undefined;
    const editor = getEditor(serifView.container);
    if (!placeholder || !editor) {
      throw new Error("missing serif editor nodes");
    }

    expect(placeholder.className).toContain("text-2xl");
    expect(placeholder.className).toContain("font-serif");
    expect(editor.className).toContain("text-2xl");
    expect(editor.className).toContain("font-serif");
  } finally {
    serifView.cleanup();
  }

  const monoView = mount(
    <PostRichTextAdapter
      value=""
      onChange={() => undefined}
      fontFamily="mono"
      baseTextScale="sm"
    />
  );

  try {
    const placeholder = Array.from(monoView.container.querySelectorAll("div")).find(
      (candidate) =>
        candidate.textContent?.includes("Start writing")
        && candidate.className.includes("pointer-events-none")
    ) as HTMLDivElement | null | undefined;
    const editor = getEditor(monoView.container);
    if (!placeholder || !editor) {
      throw new Error("missing mono editor nodes");
    }

    expect(placeholder.className).toContain("text-base");
    expect(placeholder.className).toContain("font-mono");
    expect(editor.className).toContain("text-base");
    expect(editor.className).toContain("font-mono");
  } finally {
    monoView.cleanup();
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
    act(() => {
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

test("PostRichTextAdapter inserts paragraphs on Enter outside lists but leaves list Enter alone", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Alpha</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    const alphaNode = findTextNode(editor, "Alpha");
    setCollapsedSelection(alphaNode, alphaNode.nodeValue?.length ?? 5);
    act(() => {
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(execCommand).toHaveBeenCalledWith("insertParagraph", false, undefined);

    execCommand.mockClear();
    act(() => {
      editor.innerHTML = "<ul><li>List item</li></ul>";
      const listNode = findTextNode(editor, "List item");
      setCollapsedSelection(listNode, listNode.nodeValue?.length ?? 9);
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(execCommand).not.toHaveBeenCalledWith("insertParagraph", false, undefined);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter wraps loose root content as a bullet list and falls back to native ordered-list commands", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("Loose text");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    clickByText(view.container, "bullet-list");
    await flush();
    expect(editor.innerHTML).toContain("<ul><li>Loose text</li></ul>");

    execCommand.mockClear();
    clickByText(view.container, "ordered-list");
    await flush();

    expect(execCommand).toHaveBeenCalledWith("insertOrderedList", false, undefined);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter resolves collapsed inline wrappers from element and trailing offsets", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p><strong>Gamma</strong> Delta</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    const strong = editor.querySelector("strong");
    if (!(strong instanceof HTMLElement)) {
      throw new Error("missing strong");
    }
    const selection = window.getSelection();
    const strongRange = document.createRange();
    strongRange.setStart(strong, 0);
    strongRange.setEnd(strong, 0);
    selection?.removeAllRanges();
    selection?.addRange(strongRange);
    document.dispatchEvent(new Event("selectionchange"));

    clickByText(view.container, "inline-code");
    await flush();
    expect(editor.innerHTML).toContain("<code>Gamma</code>");

    const paragraph = editor.querySelector("p");
    if (!(paragraph instanceof HTMLParagraphElement)) {
      throw new Error("missing paragraph");
    }
    const paragraphRange = document.createRange();
    paragraphRange.setStart(paragraph, paragraph.childNodes.length);
    paragraphRange.setEnd(paragraph, paragraph.childNodes.length);
    selection?.removeAllRanges();
    selection?.addRange(paragraphRange);
    document.dispatchEvent(new Event("selectionchange"));

    clickByText(view.container, "highlight");
    await flush();
    expect(editor.innerHTML).toContain("<mark>Delta</mark>");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter closes slash menu when content no longer matches slash command syntax", async () => {
  const Harness = () => {
    const [value, setValue] = useState("");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onSlashInsertBlock={() => undefined}
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

    act(() => {
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

    act(() => {
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

test("PostRichTextAdapter falls back to native list commands when no block selection is available", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Alpha</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    window.getSelection()?.removeAllRanges();

    clickByText(view.container, "bullet-list");
    clickByText(view.container, "ordered-list");

    expect(execCommand).toHaveBeenCalledWith("insertUnorderedList", false, undefined);
    expect(execCommand).toHaveBeenCalledWith("insertOrderedList", false, undefined);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter leaves link commands inert when the URL prompt is cancelled", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const originalPrompt = window.prompt;
  Object.defineProperty(window, "prompt", {
    value: vi.fn(() => null),
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Link target</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);
    execCommand.mockClear();

    clickByText(view.container, "link");

    expect(execCommand).not.toHaveBeenCalledWith("insertHTML", expect.anything(), expect.anything());
    expect(execCommand).not.toHaveBeenCalledWith("createLink", expect.anything(), expect.anything());
    expect(execCommand).not.toHaveBeenCalledWith("unlink", expect.anything(), expect.anything());
  } finally {
    Object.defineProperty(window, "prompt", {
      value: originalPrompt,
      configurable: true,
      writable: true,
    });
    view.cleanup();
  }
});
