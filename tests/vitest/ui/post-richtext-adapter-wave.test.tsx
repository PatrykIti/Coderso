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
