// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const postShellState = vi.hoisted(() => ({
  navigate: vi.fn(),
  focusCapture: vi.fn(),
  focusReturn: vi.fn(),
  layoutHookCalls: [] as Array<Record<string, unknown>>,
  shortcutCalls: [] as Array<Record<string, unknown>>,
  layout: {
    state: {
      secondarySidebar: "inserter" as "inserter" | "list-view" | null,
      detailsOpen: true,
      detailsTab: "document" as "document" | "block",
      focusMode: false,
      leftRailMode: "outline" as "outline" | "list-view",
      focusRestore: null,
    },
    secondarySidebarOpen: true,
    detailsSidebarOpen: true,
    showListView: false,
    showInserter: true,
    focusMode: false,
    leftRailMode: "outline" as "outline" | "list-view",
    openListView: vi.fn(),
    toggleListView: vi.fn(),
    openInserter: vi.fn(),
    toggleInserter: vi.fn(),
    closeSecondarySidebar: vi.fn(),
    openDetails: vi.fn(),
    toggleDetails: vi.fn(),
    openDetailsForSelection: vi.fn(),
    closeDetails: vi.fn(),
    setDetailsTab: vi.fn(),
    setLeftRailMode: vi.fn(),
    setFocusMode: vi.fn(),
    toggleFocusMode: vi.fn(),
  },
  preferences: {
    preferences: {
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable" as const,
      showKeyboardHints: true,
      defaultInspectorTab: "post" as const,
      restoreLastSidebarsState: true,
    },
    initialPreferences: {
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable" as const,
      showKeyboardHints: true,
      defaultInspectorTab: "post" as const,
      restoreLastSidebarsState: true,
    },
    setPreferences: vi.fn(),
    resetPreferences: vi.fn(),
  },
  editor: {
    error: "Post editor error" as string | null,
    autosaveError: "Autosave paused" as string | null,
    loading: false,
    title: "Post A",
    status: "draft",
    hasUnsavedChanges: true,
    state: {
      document: {
        blocks: [{ id: "block-1", type: "paragraph" }],
        meta: {
          excerpt: "Excerpt",
          typography: {
            fontFamily: "Inter",
            scale: "md",
          },
        },
      },
      selectedBlockId: "block-1",
      saving: false,
    },
    selectedBlock: { id: "block-1", type: "paragraph" } as { id: string; type: string } | null,
    postId: "post-1",
    post: { updatedAt: "2026-03-08T10:00:00.000Z" },
    insertFocusToken: 1,
    canUndo: true,
    canRedo: true,
    lastSavedAt: "2026-03-08T10:00:00.000Z",
    deletingPost: false,
    previewOpen: true,
    previewUrl: "https://preview.test/post",
    previewLoading: false,
    previewError: null,
    revisionsOpen: true,
    revisions: [{ id: "rev-1" }],
    revisionsLoading: false,
    revisionsError: null,
    restoringRevisionId: null,
    taxonomySummary: { categoryName: "News", tagCount: 2 },
    tagsInput: "news, launch",
    categoryId: "cat-1",
    seoDraft: {
      title: "SEO title",
      description: "SEO description",
      canonicalUrl: "",
      robots: "index,follow",
    },
    featuredImage: "media-1",
    remoteUpdatePending: false,
    selectBlock: vi.fn(),
    updateBlockContent: vi.fn(),
    updateSelectedBlockContent: vi.fn(),
    updateBlockAttrs: vi.fn(),
    updateSelectedBlockAttrs: vi.fn(),
    updateDocumentTypography: vi.fn(),
    setTitle: vi.fn(),
    setSlug: vi.fn(),
    setExcerpt: vi.fn(),
    setFeaturedImage: vi.fn(),
    setTagsInput: vi.fn(),
    setCategoryId: vi.fn(),
    setSeoDraft: vi.fn(),
    deleteBlock: vi.fn(),
    deleteSelectedBlock: vi.fn(),
    moveBlockToIndex: vi.fn(),
    moveBlock: vi.fn(),
    moveSelectedBlock: vi.fn(),
    insertBlock: vi.fn(),
    ensureDynamicTocBlock: vi.fn(),
    transformBlock: vi.fn(),
    transformSelectedBlock: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    saveDraft: vi.fn(),
    publish: vi.fn(async () => undefined),
    unpublish: vi.fn(),
    preview: vi.fn(async () => undefined),
    setPreviewOpen: vi.fn(),
    setRevisionsOpen: vi.fn(),
    openRevisions: vi.fn(),
    restoreRevision: vi.fn(async () => undefined),
    markReloadRemote: vi.fn(),
    uploadClipboardImage: vi.fn(async () => ({
      id: "media-1",
      key: "media-1",
      url: "/media-1.jpg",
    })),
    moveToTrash: vi.fn(async () => true),
  },
  reset() {
    this.navigate.mockReset();
    this.focusCapture.mockReset();
    this.focusReturn.mockReset();
    this.layoutHookCalls = [];
    this.shortcutCalls = [];
    for (const value of Object.values(this.layout)) {
      if (typeof value === "function" && "mockReset" in value) {
        (value as ReturnType<typeof vi.fn>).mockReset();
      }
    }
    for (const [key, value] of Object.entries(this.editor)) {
      if (typeof value === "function" && "mockReset" in value) {
        (value as ReturnType<typeof vi.fn>).mockReset();
      }
      if (key === "error") this.editor.error = "Post editor error";
      if (key === "autosaveError") this.editor.autosaveError = "Autosave paused";
      if (key === "loading") this.editor.loading = false;
      if (key === "status") this.editor.status = "draft";
      if (key === "deletingPost") this.editor.deletingPost = false;
    }
    this.editor.post = {
      updatedAt: "2026-03-08T10:00:00.000Z",
    };
    this.editor.moveToTrash.mockResolvedValue(true);
    this.editor.saveDraft.mockResolvedValue(undefined);
    this.editor.preview.mockResolvedValue(undefined);
    this.editor.publish.mockResolvedValue(undefined);
    this.editor.restoreRevision.mockResolvedValue(undefined);
    this.layout.state.secondarySidebar = "inserter";
    this.layout.state.detailsOpen = true;
    this.layout.state.detailsTab = "document";
    this.layout.state.focusMode = false;
    this.layout.state.leftRailMode = "outline";
    this.layout.secondarySidebarOpen = true;
    this.layout.detailsSidebarOpen = true;
    this.layout.showInserter = true;
    this.layout.showListView = false;
    this.layout.focusMode = false;
    this.layout.leftRailMode = "outline";
    this.preferences.setPreferences.mockReset();
    this.preferences.resetPreferences.mockReset();
    toastState.success.mockReset();
    toastState.error.mockReset();
    taxonomyClientState.getTaxonomyOverview.mockReset();
    taxonomyClientState.getTaxonomyOverview.mockResolvedValue(
      taxonomyClientState.overview
    );
  },
}));

const toastState = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const taxonomyClientState = vi.hoisted(() => {
  const overview = {
    taxonomies: {
      category: {
        id: "taxonomy-category",
        typeId: "post",
        name: "Categories",
        slug: "category",
        kind: "category",
        createdAt: "",
        updatedAt: "",
      },
      tag: null,
    },
    terms: {
      categories: [
        {
          id: "cat-1",
          taxonomyId: "taxonomy-category",
          name: "News",
          slug: "news",
          createdAt: "",
          updatedAt: "",
        },
      ],
      tags: [],
    },
  };

  return {
    overview,
    getTaxonomyOverview: vi.fn(async () => overview),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({
    open,
    title,
  }: {
    open: boolean;
    title: string;
  }) => <div>{`${title}:${open ? "open" : "closed"}`}</div>,
}));

vi.mock("@/services/taxonomyClient", () => ({
  getTaxonomyOverview: taxonomyClientState.getTaxonomyOverview,
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: vi.fn(async () => ({
    adminBaseUrl: null,
    publicBaseUrl: "https://coderso.test",
    adminPath: "/admin",
    adminRedirectEnabled: false,
    homepageId: null,
    notFoundPageId: null,
    previewEnabled: true,
    cacheTtlSeconds: 30,
    contentRoutes: [
      {
        type: "posts",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
      },
    ],
  })),
  resolvePostSlugRouteContext: (settings: {
    publicBaseUrl?: string | null;
    contentRoutes?: Array<{ detailPath: string; enabled: boolean; type: string }>;
  } | null) => ({
    publicBaseUrl: settings?.publicBaseUrl ?? null,
    detailPathPattern:
      settings?.contentRoutes?.find((route) => route.enabled)?.detailPath ?? "/post/:slug",
  }),
  resolvePostSlugDisplay: (
    context: { publicBaseUrl: string | null; detailPathPattern: string },
    slug: string
  ) => ({
    label: context.publicBaseUrl ? "Public URL" : "Route hint",
    value:
      context.publicBaseUrl && slug
        ? `${context.publicBaseUrl}${context.detailPathPattern.replace(":slug", slug)}`
        : context.detailPathPattern,
    concrete: Boolean(context.publicBaseUrl && slug),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastState.success,
    error: toastState.error,
  },
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: postShellState.navigate,
  }),
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorLayout", () => ({
  usePostEditorLayout: (options: Record<string, unknown>) => {
    postShellState.layoutHookCalls.push(options);
    return postShellState.layout;
  },
}));

vi.mock("../../../core/admin/ui/posts/editor/inspector/PostDetailsSidebar", () => ({
  PostDetailsSidebar: ({
    document,
  }: {
    document?: {
      onMoveToTrash?: () => void;
      onTaxonomyRetry?: () => void;
      taxonomyError?: string | null;
    };
  }) => (
    <div>
      <div>post-details-sidebar</div>
      <div>{document?.taxonomyError ?? ""}</div>
      {document?.onTaxonomyRetry ? (
        <button type="button" onClick={() => document.onTaxonomyRetry?.()}>
          retry-taxonomy
        </button>
      ) : null}
      <button type="button" onClick={() => document?.onMoveToTrash?.()}>
        move-to-trash
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/layout/PostEditorLayout", () => ({
  PostEditorLayout: ({
    header,
    content,
    secondarySidebar,
    detailsSidebar,
    onSecondarySidebarOpenChange,
    onDetailsSidebarOpenChange,
  }: {
    header: React.ReactNode;
    content: React.ReactNode;
    secondarySidebar: React.ReactNode;
    detailsSidebar: React.ReactNode;
    onSecondarySidebarOpenChange: (open: boolean) => void;
    onDetailsSidebarOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <div>{header}</div>
      <div>{content}</div>
      <div>{secondarySidebar}</div>
      <div>{detailsSidebar}</div>
      <button type="button" onClick={() => onSecondarySidebarOpenChange(false)}>
        close-secondary-shell
      </button>
      <button type="button" onClick={() => onSecondarySidebarOpenChange(true)}>
        open-secondary-shell
      </button>
      <button type="button" onClick={() => onDetailsSidebarOpenChange(false)}>
        close-details-shell
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/PostEditorCanvas", () => ({
  PostEditorCanvas: ({
    onSelectBlock,
    onOpenBlockDetails,
  }: {
    onSelectBlock: (id: string | null) => void;
    onOpenBlockDetails: (id: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSelectBlock("block-2")}>
        select-canvas-block
      </button>
      <button type="button" onClick={() => onOpenBlockDetails("block-2")}>
        open-canvas-details
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/PostEditorTopBar", () => ({
  PostEditorTopBar: ({
    title,
    onClose,
    onOpenRevisions,
    onPreview,
    onPublish,
    onToggleInserter,
    onToggleOutline,
    onToggleDetails,
    onOpenSettings,
    onToggleFocusMode,
  }: {
    title: string;
    onClose: () => void;
    onOpenRevisions: () => void;
    onPreview: () => void;
    onPublish: () => void;
    onToggleInserter: () => void;
    onToggleOutline: () => void;
    onToggleDetails: () => void;
    onOpenSettings: () => void;
    onToggleFocusMode: () => void;
  }) => (
    <div>
      <span>{title}</span>
      <button type="button" onClick={onClose}>
        close-editor
      </button>
      <button type="button" onClick={onOpenRevisions}>
        open-revisions
      </button>
      <button type="button" onClick={onPreview}>
        preview-post
      </button>
      <button type="button" onClick={onPublish}>
        publish-post
      </button>
      <button type="button" onClick={onToggleInserter}>
        toggle-inserter
      </button>
      <button type="button" onClick={onToggleOutline}>
        toggle-outline
      </button>
      <button type="button" onClick={onToggleDetails}>
        toggle-details
      </button>
      <button type="button" onClick={onOpenSettings}>
        open-settings
      </button>
      <button type="button" onClick={onToggleFocusMode}>
        toggle-focus-mode
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/PostRevisionDrawer", () => ({
  PostRevisionDrawer: ({
    open,
    onRestore,
  }: {
    open: boolean;
    onRestore: (revisionId: string) => void;
  }) => (
    <div>
      <span>{`revisions:${open ? "open" : "closed"}`}</span>
      <button type="button" onClick={() => onRestore("rev-1")}>
        restore-revision
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/sidebars/PostInserterSidebar", () => ({
  PostInserterSidebar: ({
    onClose,
    onInsertBlock,
  }: {
    onClose: () => void;
    onInsertBlock: (type: string) => void;
  }) => (
    <div>
      <button type="button" onClick={onClose}>
        close-inserter
      </button>
      <button type="button" onClick={() => onInsertBlock("paragraph")}>
        insert-paragraph
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/sidebars/PostListViewSidebar", () => ({
  PostListViewSidebar: ({
    onSelectBlock,
    onDeleteBlock,
    onMoveBlockToIndex,
    onInsertBlock,
    onLeftRailModeChange,
  }: {
    onSelectBlock: (id: string) => void;
    onDeleteBlock: (id: string) => void;
    onMoveBlockToIndex: (id: string, index: number) => void;
    onInsertBlock: (type: string) => void;
    onLeftRailModeChange: (mode: "outline" | "list-view") => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSelectBlock("block-3")}>
        select-list-block
      </button>
      <button type="button" onClick={() => onDeleteBlock("block-3")}>
        delete-list-block
      </button>
      <button type="button" onClick={() => onMoveBlockToIndex("block-3", 4)}>
        move-list-block
      </button>
      <button type="button" onClick={() => onInsertBlock("heading")}>
        insert-heading
      </button>
      <button type="button" onClick={() => onLeftRailModeChange("list-view")}>
        set-left-rail-list
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorState", () => ({
  usePostEditorState: () => postShellState.editor,
}));

vi.mock("../../../core/admin/ui/posts/editor/settings/PostEditorSettingsDialog", () => ({
  PostEditorSettingsDialog: ({
    open,
    onReset,
  }: {
    open: boolean;
    onReset: () => void;
  }) => (
    <div>
      <span>{`settings:${open ? "open" : "closed"}`}</span>
      <button type="button" onClick={onReset}>
        reset-preferences
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorPreferences", () => ({
  usePostEditorPreferences: () => postShellState.preferences,
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorShortcuts", () => ({
  usePostEditorShortcuts: (options: Record<string, unknown>) => {
    postShellState.shortcutCalls.push(options);
  },
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/useFocusReturn", () => ({
  useFocusReturn: () => ({
    capture: postShellState.focusCapture,
    returnFocus: postShellState.focusReturn,
    clear: vi.fn(),
  }),
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
    rerender: (next: React.ReactNode) => {
      act(() => {
        root.render(next);
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  postShellState.reset();
});

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test("PostBlockEditorShell renders alerts and wires topbar, sidebar, and settings actions", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  const view = mount(<PostBlockEditorShell />);

  try {
    expect(view.container.textContent).toContain("Post editor error");
    expect(view.container.textContent).toContain("Autosave paused");
    expect(view.container.textContent).toContain("Post A");
    expect(view.container.textContent).toContain("Runtime preview:open");
    expect(view.container.textContent).toContain("settings:closed");

    const buttons = Array.from(view.container.querySelectorAll("button"));

    await act(async () => {
      buttons.find((button) => button.textContent === "preview-post")?.click();
      buttons.find((button) => button.textContent === "publish-post")?.click();
      buttons.find((button) => button.textContent === "open-revisions")?.click();
      buttons.find((button) => button.textContent === "toggle-inserter")?.click();
      buttons.find((button) => button.textContent === "toggle-outline")?.click();
      buttons.find((button) => button.textContent === "toggle-details")?.click();
      buttons.find((button) => button.textContent === "open-settings")?.click();
      buttons.find((button) => button.textContent === "toggle-focus-mode")?.click();
      buttons.find((button) => button.textContent === "close-inserter")?.click();
      buttons.find((button) => button.textContent === "insert-paragraph")?.click();
      buttons.find((button) => button.textContent === "close-secondary-shell")?.click();
      buttons.find((button) => button.textContent === "close-details-shell")?.click();
      buttons.find((button) => button.textContent === "reset-preferences")?.click();
      buttons.find((button) => button.textContent === "close-editor")?.click();
      await Promise.resolve();
    });

    expect(postShellState.editor.preview).toHaveBeenCalled();
    expect(postShellState.editor.publish).toHaveBeenCalled();
    expect(postShellState.editor.openRevisions).toHaveBeenCalled();
    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.layout.setLeftRailMode).toHaveBeenCalledWith("outline");
    expect(postShellState.layout.openListView).toHaveBeenCalled();
    expect(postShellState.layout.toggleFocusMode).toHaveBeenCalled();
    expect(postShellState.editor.insertBlock).toHaveBeenCalledWith("paragraph", {
      source: "sidebar",
      target: { mode: "after-selected" },
    });
    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.layout.closeDetails).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalled();
    expect(postShellState.preferences.resetPreferences).toHaveBeenCalled();
    expect(postShellState.navigate).toHaveBeenCalledWith("/admin/posts", {
      replace: true,
    });
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell retries autosave and emits publish success toast through shared adapter", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  const view = mount(<PostBlockEditorShell />);

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));

    await act(async () => {
      buttons.find((button) => button.textContent === "Retry now")?.click();
      buttons.find((button) => button.textContent === "publish-post")?.click();
      await flushMicrotasks();
    });

    expect(postShellState.editor.saveDraft).toHaveBeenCalledTimes(1);
    expect(postShellState.editor.publish).toHaveBeenCalledTimes(1);
    expect(toastState.success).toHaveBeenCalledWith("Post published");
    expect(toastState.error).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell emits update success and bounded failure toasts", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.editor.status = "published";
  const updateView = mount(<PostBlockEditorShell />);

  try {
    const buttons = Array.from(updateView.container.querySelectorAll("button"));

    await act(async () => {
      buttons.find((button) => button.textContent === "publish-post")?.click();
      await flushMicrotasks();
    });

    expect(toastState.success).toHaveBeenCalledWith("Changes saved");
  } finally {
    updateView.cleanup();
  }

  postShellState.reset();
  postShellState.editor.publish.mockRejectedValueOnce(
    new ApiClientError("post_publish_denied", "Publishing is unavailable.", 403)
  );
  const failureView = mount(<PostBlockEditorShell />);

  try {
    const buttons = Array.from(failureView.container.querySelectorAll("button"));

    await act(async () => {
      buttons.find((button) => button.textContent === "publish-post")?.click();
      await flushMicrotasks();
    });

    expect(toastState.error).toHaveBeenCalledWith("Publishing is unavailable.");
    expect(toastState.success).not.toHaveBeenCalled();
  } finally {
    failureView.cleanup();
  }
});

test("PostBlockEditorShell hides raw taxonomy errors and retries overview loading", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.editor.post = {
    ...postShellState.editor.post,
    typeId: "post",
  } as never;
  taxonomyClientState.getTaxonomyOverview
    .mockRejectedValueOnce(
      new ApiClientError(
        "taxonomy_unexpected_error",
        'Failed query: select "content_terms"."id" from "content_terms"',
        500
      )
    )
    .mockResolvedValueOnce(taxonomyClientState.overview);

  const view = mount(<PostBlockEditorShell />);

  try {
    await act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Could not load categories.");
    expect(view.container.textContent).not.toContain("Failed query");
    expect(view.container.textContent).not.toContain("content_terms");

    const retryButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "retry-taxonomy"
    );
    expect(retryButton).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      (retryButton as HTMLButtonElement).click();
      await flushMicrotasks();
    });

    expect(taxonomyClientState.getTaxonomyOverview).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).not.toContain("Failed query");
  } finally {
    view.cleanup();
    postShellState.editor.post = {
      updatedAt: "2026-03-08T10:00:00.000Z",
    } as never;
  }
});

test("PostBlockEditorShell handles move-to-trash confirm flow and list-view interactions", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.layout.showInserter = false;
  postShellState.layout.showListView = true;
  postShellState.layout.secondarySidebarOpen = true;
  postShellState.layout.state.secondarySidebar = "list-view";
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;
  postShellState.editor.moveToTrash.mockResolvedValue(true);

  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });

  const view = mount(<PostBlockEditorShell />);

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));

    act(() => {
      buttons.find((button) => button.textContent === "select-list-block")?.click();
      buttons.find((button) => button.textContent === "delete-list-block")?.click();
      buttons.find((button) => button.textContent === "move-list-block")?.click();
      buttons.find((button) => button.textContent === "insert-heading")?.click();
      buttons.find((button) => button.textContent === "set-left-rail-list")?.click();
      buttons.find((button) => button.textContent === "select-canvas-block")?.click();
      buttons.find((button) => button.textContent === "open-canvas-details")?.click();
    });

    expect(postShellState.editor.selectBlock).toHaveBeenCalledWith("block-3");
    expect(postShellState.editor.deleteBlock).toHaveBeenCalledWith("block-3");
    expect(postShellState.editor.moveBlockToIndex).toHaveBeenCalledWith("block-3", 4);
    expect(postShellState.editor.insertBlock).toHaveBeenCalledWith("heading", {
      source: "outline-plus",
      target: { mode: "after-selected" },
    });
    expect(postShellState.layout.setLeftRailMode).toHaveBeenCalledWith("list-view");
    expect(postShellState.editor.selectBlock).toHaveBeenCalledWith("block-2");
    expect(postShellState.layout.openDetails).toHaveBeenCalledWith("block");
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
  }
});

test("PostBlockEditorShell handles loading shell, details reopen, and cancelled trash flow", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.layout.secondarySidebarOpen = false;
  postShellState.layout.detailsSidebarOpen = false;
  postShellState.layout.showInserter = false;
  postShellState.layout.showListView = false;
  postShellState.editor.loading = true;
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;
  postShellState.editor.selectedBlock = null;
  postShellState.editor.deletingPost = false;

  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => false),
  });

  const view = mount(<PostBlockEditorShell />);

  try {
    expect(view.container.textContent).toContain("Loading post editor...");

    const buttons = Array.from(view.container.querySelectorAll("button"));

    act(() => {
      buttons.find((button) => button.textContent === "toggle-details")?.click();
      buttons.find((button) => button.textContent === "open-secondary-shell")?.click();
      buttons.find((button) => button.textContent === "move-to-trash")?.click();
    });

    expect(postShellState.layout.openDetailsForSelection).toHaveBeenCalledWith(false);
    expect(postShellState.layout.setLeftRailMode).toHaveBeenCalledWith("outline");
    expect(postShellState.layout.openListView).toHaveBeenCalled();
    expect(postShellState.editor.moveToTrash).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
  }
});

test("PostBlockEditorShell persists focus mode, clears stored layout when restore is disabled, and only navigates on successful trash", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.layout.focusMode = true;
  postShellState.layout.state.focusMode = true;
  postShellState.layout.state.focusRestore = {
    secondarySidebar: "list-view",
    detailsOpen: false,
  } as never;
  postShellState.layout.state.secondarySidebar = "inserter";
  postShellState.layout.state.detailsOpen = true;
  postShellState.preferences.preferences.restoreLastSidebarsState = false;
  postShellState.preferences.initialPreferences.restoreLastSidebarsState = false;
  postShellState.editor.loading = false;
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;

  window.localStorage.setItem("coderso.posts.editor.layout.v1", "{invalid");

  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });

  postShellState.editor.moveToTrash.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

  const view = mount(<PostBlockEditorShell />);

  try {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const buttons = Array.from(view.container.querySelectorAll("button"));
    expect(window.localStorage.getItem("coderso.posts.editor.focusMode")).toBe("1");
    expect(window.localStorage.getItem("coderso.posts.editor.layout.v1")).toBeNull();

    act(() => {
      buttons.find((button) => button.textContent === "move-to-trash")?.click();
      buttons.find((button) => button.textContent === "move-to-trash")?.click();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(postShellState.editor.moveToTrash).toHaveBeenCalledTimes(2);
    expect(postShellState.navigate).toHaveBeenCalledWith("/admin/posts", {
      replace: true,
    });
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
    window.localStorage.clear();
    postShellState.layout.focusMode = false;
    postShellState.layout.state.focusMode = false;
    postShellState.layout.state.focusRestore = null;
    postShellState.preferences.preferences.restoreLastSidebarsState = true;
    postShellState.preferences.initialPreferences.restoreLastSidebarsState = true;
  }
});

test("PostBlockEditorShell persists focus-restore layout values while focus mode is enabled", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.layout.focusMode = true;
  postShellState.layout.state.focusMode = true;
  postShellState.layout.state.focusRestore = {
    secondarySidebar: "list-view",
    detailsOpen: false,
  } as never;
  postShellState.layout.state.secondarySidebar = "inserter";
  postShellState.layout.state.detailsOpen = true;
  postShellState.layout.state.detailsTab = "block";
  postShellState.layout.state.leftRailMode = "list-view";

  const view = mount(<PostBlockEditorShell />);

  try {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      JSON.parse(window.localStorage.getItem("coderso.posts.editor.layout.v1") ?? "{}")
    ).toMatchObject({
      secondarySidebar: "list-view",
      detailsOpen: false,
      detailsTab: "block",
      leftRailMode: "list-view",
    });
    expect(window.localStorage.getItem("coderso.posts.editor.focusMode")).toBe("1");
  } finally {
    view.cleanup();
    window.localStorage.clear();
    postShellState.layout.focusMode = false;
    postShellState.layout.state.focusMode = false;
    postShellState.layout.state.focusRestore = null;
    postShellState.layout.state.secondarySidebar = "inserter";
    postShellState.layout.state.detailsOpen = true;
    postShellState.layout.state.detailsTab = "document";
    postShellState.layout.state.leftRailMode = "outline";
  }
});

test("PostBlockEditorShell seeds layout hook options from stored layout and focus-mode preferences", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.preferences.initialPreferences.focusModeOnOpen = true;
  postShellState.preferences.initialPreferences.defaultInspectorTab = "block" as never;
  postShellState.preferences.initialPreferences.restoreLastSidebarsState = true;
  window.localStorage.setItem(
    "coderso.posts.editor.layout.v1",
    JSON.stringify({
      secondarySidebar: null,
      detailsOpen: false,
      detailsTab: "block",
      leftRailMode: "list-view",
    })
  );

  const view = mount(<PostBlockEditorShell />);

  try {
    await act(async () => {
      await Promise.resolve();
    });

    expect(postShellState.layoutHookCalls.at(-1)).toMatchObject({
      initialSecondarySidebar: null,
      initialDetailsOpen: false,
      initialDetailsTab: "block",
      initialFocusMode: true,
      initialLeftRailMode: "list-view",
    });
  } finally {
    view.cleanup();
    window.localStorage.clear();
    postShellState.preferences.initialPreferences.focusModeOnOpen = false;
    postShellState.preferences.initialPreferences.defaultInspectorTab = "post" as never;
  }
});

test("PostBlockEditorShell escape shortcut closes inserter, outline, and details in priority order", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  const view = mount(<PostBlockEditorShell />);

  try {
    const shortcuts = postShellState.shortcutCalls.at(-1) as
      | { onEscape?: () => void }
      | undefined;
    if (!shortcuts?.onEscape) {
      throw new Error("Missing escape shortcut");
    }

    postShellState.layout.showInserter = true;
    postShellState.layout.secondarySidebarOpen = true;
    act(() => {
      shortcuts.onEscape?.();
    });
    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("inserter");

    postShellState.layout.closeSecondarySidebar.mockClear();
    postShellState.focusReturn.mockClear();
    postShellState.layout.showInserter = false;
    postShellState.layout.secondarySidebarOpen = true;
    act(() => {
      shortcuts.onEscape?.();
    });
    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("outline");

    postShellState.layout.closeSecondarySidebar.mockClear();
    postShellState.focusReturn.mockClear();
    postShellState.layout.secondarySidebarOpen = false;
    postShellState.layout.detailsSidebarOpen = true;
    act(() => {
      shortcuts.onEscape?.();
    });
    expect(postShellState.layout.closeDetails).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("details");
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell closes already-open outline or inserter toggles", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.layout.secondarySidebarOpen = true;
  postShellState.layout.showInserter = false;
  postShellState.layout.leftRailMode = "outline";
  postShellState.layout.state.leftRailMode = "outline";
  postShellState.layout.state.secondarySidebar = "list-view";

  const view = mount(<PostBlockEditorShell />);

  try {
    await act(async () => {
      await Promise.resolve();
    });

    const buttons = Array.from(view.container.querySelectorAll("button"));
    act(() => {
      buttons.find((button) => button.textContent === "toggle-outline")?.click();
    });

    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("outline");

    postShellState.layout.showInserter = true;
    postShellState.layout.state.secondarySidebar = "inserter";
    view.rerender(<PostBlockEditorShell />);

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "toggle-inserter")
        ?.click();
    });

    expect(postShellState.focusReturn).toHaveBeenCalledWith("inserter");
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell closes list-view sidebars through the shell callback and returns focus to outline", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.layout.secondarySidebarOpen = true;
  postShellState.layout.showInserter = false;
  postShellState.layout.showListView = true;
  postShellState.layout.leftRailMode = "list-view";
  postShellState.layout.state.leftRailMode = "list-view";
  postShellState.layout.state.secondarySidebar = "list-view";

  const view = mount(<PostBlockEditorShell />);

  try {
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "close-secondary-shell")
        ?.click();
    });

    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalledWith("outline");
  } finally {
    view.cleanup();
    postShellState.layout.showListView = false;
    postShellState.layout.leftRailMode = "outline";
    postShellState.layout.state.leftRailMode = "outline";
    postShellState.layout.state.secondarySidebar = "inserter";
  }
});

test("PostBlockEditorShell tolerates malformed stored layout fields and falls back to default inspector tab", async () => {
  const { PostBlockEditorShell } = await import(
    "../../../core/admin/ui/posts/editor/PostBlockEditorShell"
  );

  postShellState.preferences.initialPreferences.defaultInspectorTab = "post" as never;
  window.localStorage.setItem(
    "coderso.posts.editor.layout.v1",
    JSON.stringify({
      secondarySidebar: "bad-value",
      detailsOpen: "bad",
      detailsTab: "weird",
      leftRailMode: "also-bad",
    })
  );

  const view = mount(<PostBlockEditorShell />);

  try {
    await act(async () => {
      await Promise.resolve();
    });

    expect(postShellState.layoutHookCalls.at(-1)).toMatchObject({
      initialSecondarySidebar: "list-view",
      initialDetailsOpen: true,
      initialDetailsTab: "document",
      initialLeftRailMode: "outline",
    });
  } finally {
    view.cleanup();
    window.localStorage.clear();
  }
});
