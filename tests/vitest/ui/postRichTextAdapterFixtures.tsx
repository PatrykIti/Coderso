// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
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

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
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

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
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
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const dispatchEditorEvent = (element: HTMLElement, type: string) => {
  React.act(() => {
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
  startNode: Node,
  startOffset: number,
  endNode: Node,
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
  React.act(() => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const flush = async () => {
  await React.act(async () => {
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
  await React.act(async () => {
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

export {
  mount,
  getEditor,
  clickByText,
  dispatchEditorEvent,
  setSelectionAtEnd,
  findTextNode,
  setRangeSelection,
  setCollapsedSelection,
  setSelectValue,
  flush,
  createClipboardData,
  dispatchPaste,
};
