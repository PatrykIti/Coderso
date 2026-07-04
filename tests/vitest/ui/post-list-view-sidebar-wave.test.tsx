// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const tabsState = vi.hoisted(() => ({
  value: "outline",
  onValueChange: null as ((value: string) => void) | null,
  reset() {
    this.value = "outline";
    this.onValueChange = null;
  },
}));

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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => {
    tabsState.value = value;
    tabsState.onValueChange = onValueChange ?? null;
    return <div data-tabs-value={value}>{children}</div>;
  },
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({
    value,
    children,
    ...props
  }: {
    value: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      data-tab-value={value}
      onClick={() => tabsState.onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  ),
  TabsContent: ({
    value,
    forceMount,
    children,
  }: {
    value: string;
    forceMount?: boolean;
    children: React.ReactNode;
  }) =>
    forceMount || value === tabsState.value ? <div data-tab-content={value}>{children}</div> : null,
}));

vi.mock("../../../core/admin/ui/posts/editor/outline/PostDocumentOutline", () => ({
  PostDocumentOutline: ({
    selectedBlockId,
    showHints,
    onSelectBlock,
  }: {
    selectedBlockId: string | null;
    showHints?: boolean;
    onSelectBlock: (id: string) => void;
  }) => (
    <div>
      <span>{`outline-selected:${selectedBlockId ?? "none"}`}</span>
      <span>{`outline-hints:${String(Boolean(showHints))}`}</span>
      <button type="button" onClick={() => onSelectBlock("heading-1")}>
        outline-select
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/blocks/PostListViewPanel", () => ({
  PostListViewPanel: ({
    selectedBlockId,
    showKeyboardHints,
    onSelectBlock,
    onDeleteBlock,
    onMoveBlockToIndex,
  }: {
    selectedBlockId: string | null;
    showKeyboardHints?: boolean;
    onSelectBlock: (id: string) => void;
    onDeleteBlock?: (id: string) => void;
    onMoveBlockToIndex: (id: string, index: number) => void;
  }) => (
    <div>
      <span>{`list-selected:${selectedBlockId ?? "none"}`}</span>
      <span>{`keyboard-hints:${String(Boolean(showKeyboardHints))}`}</span>
      <button type="button" onClick={() => onSelectBlock("block-2")}>
        list-select
      </button>
      <button type="button" onClick={() => onDeleteBlock?.("block-2")}>
        list-delete
      </button>
      <button type="button" onClick={() => onMoveBlockToIndex("block-2", 0)}>
        list-move
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/blocks/BlockInserter", () => ({
  BlockInserter: ({
    onInsertBlock,
    showHeader,
    recentlyUsedTypes,
  }: {
    onInsertBlock: (type: string) => void;
    showHeader?: boolean;
    recentlyUsedTypes?: string[];
  }) => (
    <div>
      <span>{`inserter-header:${String(Boolean(showHeader))}`}</span>
      <span>{`inserter-recent:${(recentlyUsedTypes ?? []).join(",")}`}</span>
      <button type="button" onClick={() => onInsertBlock("code")}>
        blocks-insert
      </button>
    </div>
  ),
}));

import { PostListViewSidebar } from "../../../core/admin/ui/posts/editor/sidebars/PostListViewSidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

afterEach(() => {
  document.body.innerHTML = "";
  tabsState.reset();
});

test("PostListViewSidebar routes outline/list view state and child callbacks", () => {
  const onLeftRailModeChange = vi.fn();
  const onSelectBlock = vi.fn();
  const onDeleteBlock = vi.fn();
  const onMoveBlockToIndex = vi.fn();

  const view = mount(
    <PostListViewSidebar
      document={{
        version: 1,
        blocks: [{ id: "block-1", type: "paragraph", attrs: {}, content: "Body" }],
        meta: {},
      }}
      selectedBlockId="block-1"
      onSelectBlock={onSelectBlock}
      onDeleteBlock={onDeleteBlock}
      onMoveBlockToIndex={onMoveBlockToIndex}
      onInsertBlock={() => undefined}
      leftRailMode="list-view"
      onLeftRailModeChange={onLeftRailModeChange}
      recentlyUsedTypes={["image", "quote"]}
      showOutlineHints={false}
      showKeyboardHints={false}
    />
  );

  try {
    expect(view.container.textContent).toContain("outline-hints:false");
    expect(view.container.textContent).toContain("keyboard-hints:false");
    expect(view.container.querySelector("[data-tabs-value='list-view']")).not.toBeNull();
    expect(
      view.container.querySelector("[data-post-editor-left-rail-tab='blocks']")
    ).not.toBeNull();
    expect(
      view.container.querySelector("[data-post-editor-left-rail-tab='outline']")
    ).not.toBeNull();
    expect(
      view.container.querySelector("[data-post-editor-left-rail-tab='list-view']")
    ).not.toBeNull();
    expect(view.container.textContent).toContain("inserter-header:false");
    expect(view.container.textContent).toContain("inserter-recent:image,quote");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "Outline")?.click();
      buttons.find((button) => button.textContent === "outline-select")?.click();
      buttons.find((button) => button.textContent === "list-select")?.click();
      buttons.find((button) => button.textContent === "list-delete")?.click();
      buttons.find((button) => button.textContent === "list-move")?.click();
    });

    expect(onLeftRailModeChange).toHaveBeenCalledWith("outline");
    expect(onSelectBlock).toHaveBeenNthCalledWith(1, "heading-1");
    expect(onSelectBlock).toHaveBeenNthCalledWith(2, "block-2");
    expect(onDeleteBlock).toHaveBeenCalledWith("block-2");
    expect(onMoveBlockToIndex).toHaveBeenCalledWith("block-2", 0);
  } finally {
    view.cleanup();
  }
});

test("PostListViewSidebar routes outline inserter groups through onInsertBlock", () => {
  const onInsertBlock = vi.fn();

  const view = mount(
    <PostListViewSidebar
      document={{
        version: 1,
        blocks: [
          {
            id: "writing-1",
            type: "writing-canvas",
            attrs: {},
            content: {
              version: 1,
              nodes: [{ id: "node-1", type: "heading", level: 2, text: "Heading" }],
            },
          },
        ],
        meta: {},
      }}
      selectedBlockId={null}
      onSelectBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
      onInsertBlock={onInsertBlock}
    />
  );

  try {
    expect(view.container.textContent).toContain("Text");
    expect(view.container.textContent).toContain("Media");
    expect(view.container.textContent).toContain("Interactive");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent?.includes("Paragraph"))?.click();
      buttons.find((button) => button.textContent?.includes("Image"))?.click();
      buttons.find((button) => button.textContent?.includes("Button"))?.click();
    });

    expect(onInsertBlock).toHaveBeenNthCalledWith(1, "paragraph");
    expect(onInsertBlock).toHaveBeenNthCalledWith(2, "image");
    expect(onInsertBlock).toHaveBeenNthCalledWith(3, "button");
  } finally {
    view.cleanup();
  }
});
