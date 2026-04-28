// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostDetailsSidebar } from "../../../core/admin/ui/posts/editor/inspector/PostDetailsSidebar";

vi.mock("@/components/ui/tabs", () => {
  const ReactLocal = React;
  const TabsContext = ReactLocal.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  } | null>(null);

  return {
    Tabs: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value: string;
      onValueChange?: (value: string) => void;
    }) => (
      <TabsContext.Provider value={{ value, onValueChange }}>
        <div data-tabs-value={value}>{children}</div>
      </TabsContext.Provider>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({
      children,
      value,
      disabled,
      ...props
    }: {
      children: React.ReactNode;
      value: string;
      disabled?: boolean;
      [key: string]: unknown;
    }) => {
      const context = ReactLocal.useContext(TabsContext);
      return (
        <button
          type="button"
          disabled={disabled}
          data-active={String(context?.value === value)}
          onClick={() => context?.onValueChange?.(value)}
          {...props}
        >
          {children}
        </button>
      );
    },
    TabsContent: ({
      children,
      value,
      className,
    }: {
      children: React.ReactNode;
      value: string;
      className?: string;
    }) => {
      const context = ReactLocal.useContext(TabsContext);
      if (context?.value !== value) return null;
      return <div className={className}>{children}</div>;
    },
  };
});

vi.mock("../../../core/admin/ui/posts/editor/inspector/DocumentInspector", () => ({
  DocumentInspector: ({ title }: { title: string }) => <div>{`document:${title}`}</div>,
}));

vi.mock("../../../core/admin/ui/posts/editor/inspector/BlockInspector", () => ({
  BlockInspector: ({
    block,
  }: {
    block: { id: string } | null;
  }) => <div>{`block:${block?.id ?? "none"}`}</div>,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const baseDocumentProps = {
  title: "Post title",
  status: "draft" as const,
  slug: "post-title",
  excerpt: "",
  featuredImage: "",
  tagsInput: "",
  categoryId: "",
  seo: {
    title: "",
    description: "",
    canonicalUrl: "",
    robots: "index,follow",
  },
  taxonomySummary: {
    categoryName: null,
    tagCount: 0,
  },
  updatedAt: null,
  scheduledAt: null,
  publishedAt: null,
  moveToTrashPending: false,
  onMoveToTrash: () => undefined,
  onTitleChange: () => undefined,
  onSlugChange: () => undefined,
  onExcerptChange: () => undefined,
  onFeaturedImageChange: () => undefined,
  onTagsInputChange: () => undefined,
  onCategoryIdChange: () => undefined,
  onSeoChange: () => undefined,
};

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
  vi.restoreAllMocks();
});

test("PostDetailsSidebar routes tab changes and disables block tab when no block is selected", () => {
  const onTabChange = vi.fn();

  const view = mount(
    <PostDetailsSidebar
      activeTab="document"
      onTabChange={onTabChange}
      document={baseDocumentProps}
      block={null}
      onChangeBlockAttrs={() => undefined}
    />
  );

  try {
    const triggers = Array.from(view.container.querySelectorAll("button"));
    const documentTrigger = triggers.find((button) => button.textContent === "Post");
    const blockTrigger = triggers.find((button) => button.textContent === "Block");

    expect(blockTrigger).toBeInstanceOf(HTMLButtonElement);
    expect((blockTrigger as HTMLButtonElement).disabled).toBe(true);
    expect(view.container.textContent).toContain("document:Post title");
    expect(view.container.textContent).not.toContain("block:none");

    React.act(() => {
      documentTrigger?.click();
    });

    expect(onTabChange).toHaveBeenCalledWith("document");
  } finally {
    view.cleanup();
  }
});

test("PostDetailsSidebar routes block tab activation when a block is selected", () => {
  const onTabChange = vi.fn();

  const view = mount(
    <PostDetailsSidebar
      activeTab="document"
      onTabChange={onTabChange}
      document={baseDocumentProps}
      block={{
        id: "block-1",
        type: "paragraph",
        attrs: {},
        content: "<p>Intro</p>",
      }}
      onChangeBlockAttrs={() => undefined}
    />
  );

  try {
    const blockTrigger = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Block"
    );
    if (!(blockTrigger instanceof HTMLButtonElement)) {
      throw new Error("missing block trigger");
    }

    expect(blockTrigger.disabled).toBe(false);

    React.act(() => {
      blockTrigger.click();
    });

    expect(onTabChange).toHaveBeenCalledWith("block");
  } finally {
    view.cleanup();
  }
});
