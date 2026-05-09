// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/blocks/blockCatalog", () => ({
  BLOCK_CATEGORY_LABELS: {
    text: "Text",
    layout: "Layout",
  },
  POST_BLOCK_CATEGORY_ORDER: ["text", "layout"],
  getPostBlockLabel: (type: string) => `label:${type}`,
  resolveMostUsedPostBlocks: (recentlyUsedTypes: string[]) =>
    recentlyUsedTypes.map((type) => ({
      type,
      label: `Most used ${type}`,
      description: `Description ${type}`,
      category: "text",
    })),
  searchPostBlockCatalog: (query: string, { category }: { category: string }) => {
    const items = [
      {
        type: "paragraph",
        label: "Paragraph",
        description: "Text block",
        category: "text",
      },
      {
        type: "hero",
        label: "Hero",
        description: "Hero block",
        category: "layout",
      },
    ];
    return items.filter((item) => {
      const matchesQuery = !query || item.label.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || item.category === category;
      return matchesQuery && matchesCategory;
    });
  },
  groupPostBlockCatalogByCategory: (items: Array<{ category: string }>) => [
    {
      category: "text",
      items: items.filter((item) => item.category === "text"),
    },
    {
      category: "layout",
      items: items.filter((item) => item.category === "layout"),
    },
  ],
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
    rerender: (next: React.ReactNode) => {
      React.act(() => {
        root.render(next);
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("post editor shortcut helpers format labels and dispatch handlers", async () => {
  const { formatPostEditorShortcutAria, formatPostEditorShortcutLabel, usePostEditorShortcuts } =
    await import("../../../core/admin/ui/posts/editor/hooks/usePostEditorShortcuts");

  expect(formatPostEditorShortcutLabel("toggleInserter")).toBe("Mod+Shift+I");
  expect(formatPostEditorShortcutAria("toggleInserter")).toContain("Control+Shift+I");
  expect(formatPostEditorShortcutAria("closePanels")).toBe("escape");

  const onToggleInserter = vi.fn();
  const onToggleOutline = vi.fn();
  const onToggleDetails = vi.fn();
  const onEscape = vi.fn();

  const Harness = () => {
    usePostEditorShortcuts({
      onToggleInserter,
      onToggleOutline,
      onToggleDetails,
      onEscape,
    });
    return <input aria-label="editable" />;
  };

  const view = mount(<Harness />);

  try {
    React.act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "i",
          metaKey: true,
          shiftKey: true,
        })
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "o",
          ctrlKey: true,
          shiftKey: true,
        })
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "d",
          metaKey: true,
          shiftKey: true,
        })
      );
      window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });

    const editable = view.container.querySelector("input");
    editable?.focus();
    React.act(() => {
      editable?.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "i",
          metaKey: true,
          shiftKey: true,
        })
      );
    });

    expect(onToggleInserter).toHaveBeenCalledOnce();
    expect(onToggleOutline).toHaveBeenCalledOnce();
    expect(onToggleDetails).toHaveBeenCalledOnce();
    expect(onEscape).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("post editor layout reducer and hook expose secondary/details/focus transitions", async () => {
  const { createPostEditorLayoutState, postEditorLayoutReducer, usePostEditorLayout } =
    await import("../../../core/admin/ui/posts/editor/hooks/usePostEditorLayout");

  expect(
    createPostEditorLayoutState({
      initialSecondarySidebar: "inserter",
      initialDetailsOpen: true,
      initialDetailsTab: "block",
      initialFocusMode: false,
      initialLeftRailMode: "list-view",
    })
  ).toEqual({
    secondarySidebar: "inserter",
    detailsOpen: true,
    detailsTab: "block",
    focusMode: false,
    leftRailMode: "list-view",
    focusRestore: null,
  });

  const reduced = postEditorLayoutReducer(
    createPostEditorLayoutState({
      initialSecondarySidebar: "list-view",
      initialDetailsOpen: true,
    }),
    { type: "toggle_focus_mode" }
  );
  expect(reduced.focusMode).toBe(true);
  expect(reduced.secondarySidebar).toBeNull();
  expect(reduced.detailsOpen).toBe(false);

  let layout: ReturnType<typeof usePostEditorLayout> | undefined;
  const Harness = () => {
    layout = usePostEditorLayout({
      initialSecondarySidebar: "list-view",
      initialDetailsOpen: true,
      initialDetailsTab: "document",
    });
    return <div>layout</div>;
  };

  const view = mount(<Harness />);

  try {
    React.act(() => {
      layout?.openInserter();
      layout?.toggleListView();
      layout?.openDetails("block");
      layout?.toggleDetails("block");
      layout?.setLeftRailMode("list-view");
      layout?.toggleFocusMode();
    });

    expect(layout?.showInserter).toBe(false);
    expect(layout?.detailsSidebarOpen).toBe(false);
    expect(layout?.leftRailMode).toBe("list-view");
    expect(layout?.focusMode).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("SlashCommandMenu renders query badge, empty state, selection, and close action", async () => {
  const { SlashCommandMenu } =
    await import("../../../core/admin/ui/posts/editor/blocks/SlashCommandMenu");

  const onSelect = vi.fn();
  const onClose = vi.fn();

  const closedHtml = renderToString(
    <SlashCommandMenu open={false} query="" options={[]} onSelect={onSelect} onClose={onClose} />
  );
  expect(closedHtml).toBe("");

  const emptyView = mount(
    <SlashCommandMenu open query="x" options={[]} onSelect={onSelect} onClose={onClose} />
  );

  try {
    expect(emptyView.container.textContent).toContain("/x");
    expect(emptyView.container.textContent).toContain("No matching block type.");
    React.act(() => {
      Array.from(emptyView.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Esc")
        ?.click();
    });
    expect(onClose).toHaveBeenCalledOnce();
  } finally {
    emptyView.cleanup();
  }

  const view = mount(
    <SlashCommandMenu
      open
      query="par"
      options={[
        {
          type: "paragraph",
          label: "Paragraph",
          description: "Text block",
          category: "text",
        } as never,
      ]}
      onSelect={onSelect}
      onClose={onClose}
    />
  );

  try {
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Paragraph"))
        ?.click();
    });
    expect(onSelect).toHaveBeenCalledWith("paragraph");
  } finally {
    view.cleanup();
  }
});

test("BlockInserter and PostListViewPanel handle search/filter, keyboard, insert, selection, and delete", async () => {
  const { BlockInserter } =
    await import("../../../core/admin/ui/posts/editor/blocks/BlockInserter");
  const { PostListViewPanel } =
    await import("../../../core/admin/ui/posts/editor/blocks/PostListViewPanel");

  const onInsertBlock = vi.fn();
  const inserterView = mount(
    <BlockInserter
      onInsertBlock={onInsertBlock}
      disabled={false}
      showHeader={false}
      recentlyUsedTypes={["paragraph"]}
    />
  );

  try {
    expect(inserterView.container.textContent).toContain("Most used");
    React.act(() => {
      setInputValue(inserterView.container.querySelector("input") ?? undefined, "hero");
      Array.from(inserterView.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Layout")
        ?.click();
    });
    expect(inserterView.container.textContent).toContain("Hero");

    const listbox = inserterView.container.querySelector("[role='listbox']");
    React.act(() => {
      listbox?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
      listbox?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    });

    expect(onInsertBlock).toHaveBeenCalled();
  } finally {
    inserterView.cleanup();
  }

  const onSelectBlock = vi.fn();
  const onDeleteBlock = vi.fn();
  const onMoveBlockToIndex = vi.fn();
  const listView = mount(
    <PostListViewPanel
      blocks={
        [
          { id: "block-1", type: "paragraph" },
          { id: "block-2", type: "hero" },
        ] as never
      }
      selectedBlockId="block-1"
      onSelectBlock={onSelectBlock}
      onDeleteBlock={onDeleteBlock}
      onMoveBlockToIndex={onMoveBlockToIndex}
      showKeyboardHints
    />
  );

  try {
    expect(listView.container.textContent).toContain("Drag blocks to reorder");
    const buttons = Array.from(listView.container.querySelectorAll("button"));
    React.act(() => {
      buttons
        .find((button) => button.getAttribute("aria-label")?.includes("Select block 1"))
        ?.click();
      buttons
        .find((button) => button.getAttribute("aria-label")?.includes("Delete block 1"))
        ?.click();
      buttons
        .find((button) => button.getAttribute("aria-label")?.includes("Select block 2"))
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp", altKey: true })
        );
      buttons
        .find((button) => button.getAttribute("aria-label")?.includes("Select block 2"))
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", altKey: true })
        );
    });

    expect(onSelectBlock).toHaveBeenCalledWith("block-1");
    expect(onDeleteBlock).toHaveBeenCalledWith("block-1");
    expect(onMoveBlockToIndex).toHaveBeenCalledWith("block-2", 0);
    expect(onMoveBlockToIndex).toHaveBeenCalledWith("block-2", 3);
  } finally {
    listView.cleanup();
  }
});
