// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, vi } from "vitest";

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
      leftRailMode: "outline" as "blocks" | "outline" | "list-view",
      focusRestore: null,
    },
    secondarySidebarOpen: true,
    detailsSidebarOpen: true,
    showListView: false,
    showInserter: true,
    focusMode: false,
    leftRailMode: "outline" as "blocks" | "outline" | "list-view",
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
    canMutatePost: true,
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
    editorSessionKey: '["post-1",0]' as string | null,
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
    flushLatestAutosave: vi.fn<() => Promise<void>>(async () => undefined),
    publish: vi.fn<() => Promise<void>>(async () => undefined),
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
      if (key === "canMutatePost") this.editor.canMutatePost = true;
      if (key === "postId") this.editor.postId = "post-1";
      if (key === "editorSessionKey") this.editor.editorSessionKey = '["post-1",0]';
      if (key === "status") this.editor.status = "draft";
      if (key === "deletingPost") this.editor.deletingPost = false;
    }
    this.editor.post = {
      updatedAt: "2026-03-08T10:00:00.000Z",
    };
    this.editor.moveToTrash.mockResolvedValue(true);
    this.editor.saveDraft.mockResolvedValue(undefined);
    this.editor.flushLatestAutosave.mockResolvedValue(undefined);
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
    taxonomyClientState.getTaxonomyOverview.mockResolvedValue(taxonomyClientState.overview);
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
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({
    open,
    title,
    canPreview,
  }: {
    open: boolean;
    title: string;
    canPreview: boolean;
  }) => (
    <div data-runtime-can-preview={canPreview ? "true" : "false"}>
      {`${title}:${open ? "open" : "closed"}`}
    </div>
  ),
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
  resolvePostSlugRouteContext: (
    settings: {
      publicBaseUrl?: string | null;
      contentRoutes?: Array<{ detailPath: string; enabled: boolean; type: string }>;
    } | null
  ) => ({
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
    pageTitle,
    pageActions,
    content,
    secondarySidebar,
    detailsSidebar,
    onSecondarySidebarOpenChange,
    onDetailsSidebarOpenChange,
  }: {
    header: React.ReactNode;
    pageTitle: React.ReactNode;
    pageActions: React.ReactNode;
    content: React.ReactNode;
    secondarySidebar: React.ReactNode;
    detailsSidebar: React.ReactNode;
    onSecondarySidebarOpenChange: (open: boolean) => void;
    onDetailsSidebarOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <div>{pageTitle}</div>
      <div>{pageActions}</div>
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
    onTitleChange,
    onSelectBlock,
    onOpenBlockDetails,
  }: {
    onTitleChange: (title: string) => void;
    onSelectBlock: (id: string | null) => void;
    onOpenBlockDetails: (id: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onTitleChange("Post A edited during Close")}>
        edit-canvas-title
      </button>
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
    onClose,
    onOpenRevisions,
    onToggleInserter,
    onToggleOutline,
    onToggleDetails,
    onOpenSettings,
    onToggleFocusMode,
    closePending,
    actionsDisabled,
  }: {
    onClose: () => void;
    onOpenRevisions: () => void;
    onToggleInserter: () => void;
    onToggleOutline: () => void;
    onToggleDetails: () => void;
    onOpenSettings: () => void;
    onToggleFocusMode: () => void;
    closePending?: boolean;
    actionsDisabled?: boolean;
  }) => (
    <div>
      <button
        type="button"
        onClick={onClose}
        disabled={closePending}
        aria-busy={closePending || undefined}
        data-post-editor-close-pending={closePending ? "true" : "false"}
      >
        close-editor
      </button>
      <button type="button" onClick={onOpenRevisions} disabled={actionsDisabled}>
        open-revisions
      </button>
      <button type="button" onClick={onToggleInserter} disabled={actionsDisabled}>
        toggle-inserter
      </button>
      <button type="button" onClick={onToggleOutline} disabled={actionsDisabled}>
        toggle-outline
      </button>
      <button type="button" onClick={onToggleDetails} disabled={actionsDisabled}>
        toggle-details
      </button>
      <button type="button" onClick={onOpenSettings} disabled={actionsDisabled}>
        open-settings
      </button>
      <button type="button" onClick={onToggleFocusMode} disabled={actionsDisabled}>
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
  }) => {
    const [pendingRevisionId, setPendingRevisionId] = React.useState<string | null>(null);
    return (
      <div>
        <span>{`revisions:${open ? "open" : "closed"}`}</span>
        <button type="button" onClick={() => onRestore("rev-1")}>
          restore-revision
        </button>
        <button type="button" onClick={() => setPendingRevisionId("rev-1")}>
          begin-restore-confirm
        </button>
        {pendingRevisionId ? (
          <button
            type="button"
            onClick={() => {
              onRestore(pendingRevisionId);
              setPendingRevisionId(null);
            }}
          >
            confirm-restore-revision
          </button>
        ) : null}
      </div>
    );
  },
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
  PostEditorSettingsDialog: ({ open, onReset }: { open: boolean; onReset: () => void }) => (
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

afterEach(() => {
  vi.restoreAllMocks();
  postShellState.reset();
});
const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

export { postShellState, toastState, taxonomyClientState, mount, flushMicrotasks };
