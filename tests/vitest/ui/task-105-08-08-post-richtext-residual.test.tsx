// @vitest-environment happy-dom

// TASK-105-08-08-L02 residual suite: rich-text command paths the adapter suites
// leave behind, driven through the real toolbar, the real slash menu, and the
// real adapter.
//   1. The command executor's formatBlock fallback runs when neither a selected
//      block nor a root rewrite can handle the command, and it tries both
//      formatBlock argument forms through the document command seam.
//   2. When that seam reports success the editor adopts the rewritten document
//      and emits the change.
//   3. A slash popover opened while `onSlashInsertBlock` was mounted closes on
//      the next input once the callback prop is gone, without inserting.
//   4. Toolbar `mousedown` never steals the caret from the editor, in the
//      primary, layout, and advanced action rows.
//   5. Unwrapping an empty list keeps its inherited alignment.
//   6. An inline-code command with the caret outside the editor wraps nothing.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostRichTextAdapter } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    onMouseDown,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
    onMouseDown?: (event: React.MouseEvent) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onSelect,
    "aria-label": ariaLabel,
  }: {
    children?: React.ReactNode;
    onSelect?: () => void;
    "aria-label"?: string;
  }) => (
    <button type="button" onClick={onSelect} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children?: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

const installExecCommand = (impl: (command: string, ui: boolean, value?: string) => boolean) => {
  const execCommand = vi.fn(impl);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });
  return execCommand;
};

const mountAdapter = (
  value: string,
  onEmitted: (next: string) => void,
  extraProps: { toolbarProfile?: "writing-canvas" | "paragraph" } = {}
) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <PostRichTextAdapter
        value={value}
        onChange={(next) => {
          onEmitted(next);
        }}
        {...extraProps}
      />
    );
  });

  return {
    container,
    rerender: (node: React.ReactNode) => {
      React.act(() => {
        root.render(node);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const getEditor = (container: HTMLElement) => {
  const editor = container.querySelector<HTMLElement>("[data-post-editor-primary-editable='true']");
  if (!editor) throw new Error("missing editor");
  return editor;
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickButton = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!button) throw new Error(`Missing button: ${text}`);
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return button;
};

const getLabelledButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  return button;
};

const clickLabelled = (container: HTMLElement, label: string) => {
  const button = getLabelledButton(container, label);
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return button;
};

const dispatchMouseDown = (button: HTMLButtonElement) => {
  React.act(() => {
    button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  });
};

const findTextNode = (root: Node, text: string) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text && current.nodeValue?.includes(text)) return current;
    current = walker.nextNode();
  }
  throw new Error(`Missing text node: ${text}`);
};

const setCollapsedSelection = (node: Node, offset: number) => {
  React.act(() => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
};

const dispatchEditorEvent = (element: HTMLElement, type: string) => {
  React.act(() => {
    element.dispatchEvent(new Event(type, { bubbles: true }));
  });
};

const selectEditorContentsEnd = (editor: HTMLElement) => {
  React.act(() => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
};

afterEach(() => {
  Reflect.deleteProperty(document, "execCommand");
});

test("the formatBlock fallback tries both command forms and leaves the document intact", () => {
  const execCommand = installExecCommand(() => false);
  const emitted: string[] = [];
  const view = mountAdapter("<p>Body copy</p>", (next) => {
    emitted.push(next);
  });

  try {
    const editor = getEditor(view.container);
    // No caret inside the editor: no block hosts the rewrite, and the paragraph
    // document cannot be rewritten as a whole, so the command executor falls
    // through to the document command seam.
    window.getSelection()?.removeAllRanges();

    clickLabelled(view.container, "Heading 1");

    expect(execCommand).toHaveBeenCalledWith("formatBlock", false, "h1");
    expect(execCommand).toHaveBeenCalledWith("formatBlock", false, "<h1>");
    expect(editor.querySelector("h1")).toBeNull();
    expect(editor.textContent).toBe("Body copy");
    expect(emitted).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("the formatBlock fallback adopts the rewritten document when the seam reports success", () => {
  installExecCommand((_command, _ui, value) => {
    if (value === "<h1>") {
      const editor = document.querySelector<HTMLElement>(
        "[data-post-editor-primary-editable='true']"
      );
      if (editor) editor.innerHTML = "<h1>Body copy</h1>";
      return true;
    }
    return false;
  });

  const emitted: string[] = [];
  const view = mountAdapter("<p>Body copy</p>", (next) => {
    emitted.push(next);
  });

  try {
    window.getSelection()?.removeAllRanges();
    clickLabelled(view.container, "Heading 1");

    const editor = getEditor(view.container);
    expect(editor.querySelector("h1")?.textContent).toBe("Body copy");
    expect(editor.querySelector("p")).toBeNull();
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toContain("Body copy");
  } finally {
    view.cleanup();
  }
});

test("a slash popover opened with the callback closes once the callback is gone", async () => {
  const onSlashInsertBlock = vi.fn();
  const emitted: string[] = [];
  const SlashHarness = ({ withHandler }: { withHandler: boolean }) => (
    <PostRichTextAdapter
      value=""
      onChange={(next) => {
        emitted.push(next);
      }}
      onSlashInsertBlock={withHandler ? onSlashInsertBlock : undefined}
    />
  );

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<SlashHarness withHandler />);
  });

  try {
    const editor = getEditor(container);
    dispatchEditorEvent(editor, "focus");

    React.act(() => {
      editor.innerHTML = "/quote";
      selectEditorContentsEnd(editor);
      dispatchEditorEvent(editor, "input");
    });
    await flush();

    expect(container.textContent).toContain("Slash command");
    expect(container.textContent).toContain("/quote");

    // The callback disappears on rerender: the next input closes the stale
    // popover instead of keeping it alive, and nothing is inserted.
    React.act(() => {
      root.render(<SlashHarness withHandler={false} />);
    });
    dispatchEditorEvent(editor, "input");
    await flush();

    expect(container.textContent).not.toContain("Slash command");
    expect(onSlashInsertBlock).not.toHaveBeenCalled();
    expect(editor.textContent).toContain("/quote");
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});

test("toolbar mousedown never steals the caret in any action row", () => {
  installExecCommand(() => false);
  const view = mountAdapter("<p>Focusable text</p>", () => undefined);

  try {
    const editor = getEditor(view.container);
    React.act(() => {
      editor.focus();
    });
    const word = findTextNode(editor, "Focusable text");
    setCollapsedSelection(word, 4);
    expect(document.activeElement).toBe(editor);

    dispatchMouseDown(getLabelledButton(view.container, "Bold"));
    expect(document.activeElement).toBe(editor);

    // The writing-canvas profile parks the layout actions in the advanced row.
    expect(() => getLabelledButton(view.container, "Align left")).toThrow();
    expect(() => getLabelledButton(view.container, "Underline")).toThrow();
    clickButton(view.container, "More formatting");

    dispatchMouseDown(getLabelledButton(view.container, "Underline"));
    expect(document.activeElement).toBe(editor);

    dispatchMouseDown(getLabelledButton(view.container, "Align left"));
    expect(document.activeElement).toBe(editor);

    clickButton(view.container, "More formatting");
    expect(() => getLabelledButton(view.container, "Underline")).toThrow();
  } finally {
    view.cleanup();
  }

  // The paragraph profile keeps the layout actions inline in the primary row.
  const paragraphEmitted: string[] = [];
  const paragraphView = mountAdapter(
    "<p>Focusable text</p>",
    (next) => {
      paragraphEmitted.push(next);
    },
    { toolbarProfile: "paragraph" }
  );
  try {
    const editor = getEditor(paragraphView.container);
    React.act(() => {
      editor.focus();
    });
    const word = findTextNode(editor, "Focusable text");
    setCollapsedSelection(word, 4);

    dispatchMouseDown(getLabelledButton(paragraphView.container, "Align left"));
    expect(document.activeElement).toBe(editor);

    // Releasing the same control keeps the caret and applies the alignment.
    clickLabelled(paragraphView.container, "Align left");
    expect(document.activeElement).toBe(editor);
    expect(editor.querySelector("p")?.getAttribute("data-align")).toBe("left");
    expect(paragraphEmitted).toHaveLength(1);
  } finally {
    paragraphView.cleanup();
  }
});

test("unwrapping an empty list keeps its inherited alignment", () => {
  installExecCommand(() => false);
  const emitted: string[] = [];
  const view = mountAdapter("", (next) => {
    emitted.push(next);
  });

  try {
    const editor = getEditor(view.container);
    React.act(() => {
      editor.innerHTML = '<ul data-align="center"></ul>';
    });
    const list = editor.querySelector("ul");
    if (!list) throw new Error("missing list");
    setCollapsedSelection(list, 0);

    clickLabelled(view.container, "Bullet list");

    expect(editor.querySelector("ul")).toBeNull();
    const paragraph = editor.querySelector("p[data-align='center']");
    expect(paragraph).not.toBeNull();
    expect(paragraph?.innerHTML).toBe("<br>");
    expect(emitted).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("an inline-code command with the caret outside the editor never wraps", () => {
  installExecCommand(() => false);
  const outside = document.createElement("div");
  outside.innerHTML = "<p>outside text</p>";
  document.body.appendChild(outside);

  try {
    // Positive control: a caret inside a word wraps that word.
    const insideEmitted: string[] = [];
    const inside = mountAdapter("<p>word</p>", (next) => {
      insideEmitted.push(next);
    });
    try {
      const insideEditor = getEditor(inside.container);
      const word = findTextNode(insideEditor, "word");
      setCollapsedSelection(word, 2);
      clickLabelled(inside.container, "Inline code");

      expect(insideEditor.querySelector("code")?.textContent).toBe("word");
      expect(insideEmitted).toHaveLength(1);
    } finally {
      inside.cleanup();
    }

    // A caret anchored outside the editor root cannot be expanded: the command
    // is a no-op instead of wrapping foreign content.
    const outsideEmitted: string[] = [];
    const outsideView = mountAdapter("<p>word</p>", (next) => {
      outsideEmitted.push(next);
    });
    try {
      const editor = getEditor(outsideView.container);
      const outsideText = findTextNode(outside, "outside text");
      setCollapsedSelection(outsideText, 3);
      clickLabelled(outsideView.container, "Inline code");

      expect(editor.querySelector("code")).toBeNull();
      expect(editor.textContent).toBe("word");
      expect(outside.querySelector("code")).toBeNull();
      expect(outsideEmitted).toEqual([]);
    } finally {
      outsideView.cleanup();
    }
  } finally {
    outside.remove();
  }
});
