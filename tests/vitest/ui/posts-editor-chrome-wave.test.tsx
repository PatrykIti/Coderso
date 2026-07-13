// @vitest-environment happy-dom

// TASK-497-02 / TASK-497-03: pins the Post editor chrome restyle. Renders the REAL
// PostBlockEditorShell (header / regions / sidebars / inspector / canvas all real) and
// mocks ONLY the data/seam hooks + heavy IO leaf deps (AdminShell, sheet, rich-text
// adapter, MediaPicker, revision drawer, settings dialog, runtime-preview, taxonomy,
// site-settings, sonner, router). Repo idiom — createRoot + React.act,
// container.querySelector assertions (NO @testing-library / jest-dom in this repo).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chromeState = vi.hoisted(() => ({
  navigate: vi.fn(),
  focusCapture: vi.fn(),
  focusReturn: vi.fn(),
  layout: {
    state: {
      secondarySidebar: "list-view" as "inserter" | "list-view" | null,
      detailsOpen: true,
      detailsTab: "document" as "document" | "block",
      focusMode: false,
      leftRailMode: "blocks" as "blocks" | "outline" | "list-view",
      focusRestore: null as unknown,
    },
    secondarySidebarOpen: true,
    detailsSidebarOpen: true,
    showListView: false,
    showInserter: false,
    focusMode: false,
    leftRailMode: "blocks" as "blocks" | "outline" | "list-view",
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
      restoreLastSidebarsState: false,
    },
    initialPreferences: {
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable" as const,
      showKeyboardHints: true,
      defaultInspectorTab: "post" as const,
      restoreLastSidebarsState: false,
    },
    setPreferences: vi.fn(),
    resetPreferences: vi.fn(),
  },
  editor: {
    error: null as string | null,
    autosaveError: null as string | null,
    autosaveSaving: false,
    loading: false,
    canMutatePost: true,
    title: "Post A",
    status: "draft",
    slug: "post-a",
    hasUnsavedChanges: false,
    state: {
      document: { version: 1, meta: {}, blocks: [] as unknown[] },
      selectedBlockId: null as string | null,
      saving: false,
    },
    selectedBlock: null as { id: string; type: string } | null,
    postId: "post-1",
    editorSessionKey: '["post-1",0]',
    post: {
      updatedAt: "2026-03-08T10:00:00.000Z",
      scheduledAt: null,
      publishedAt: null,
    } as Record<string, unknown>,
    insertFocusToken: 0,
    canUndo: true,
    canRedo: true,
    lastSavedAt: "2026-03-08T10:00:00.000Z",
    deletingPost: false,
    previewOpen: false,
    previewUrl: "",
    previewLoading: false,
    previewError: null,
    revisionsOpen: false,
    revisions: [] as unknown[],
    revisionsLoading: false,
    revisionsError: null,
    restoringRevisionId: null as string | null,
    taxonomySummary: { categoryName: null, tagCount: 0 },
    tagsInput: "",
    categoryId: "",
    seoDraft: {
      title: "",
      description: "",
      canonicalUrl: "",
      robots: "index,follow",
    },
    featuredImage: "",
    selectBlock: vi.fn(),
    updateBlockContent: vi.fn(),
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
    moveBlockToIndex: vi.fn(),
    insertBlock: vi.fn(),
    ensureDynamicTocBlock: vi.fn(),
    transformBlock: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    saveDraft: vi.fn(async () => undefined),
    flushLatestAutosave: vi.fn(async () => undefined),
    publish: vi.fn(async () => undefined),
    preview: vi.fn(async () => undefined),
    setPreviewOpen: vi.fn(),
    setRevisionsOpen: vi.fn(),
    openRevisions: vi.fn(),
    restoreRevision: vi.fn(async () => undefined),
    uploadClipboardImage: vi.fn(async () => ({ id: "media-1", key: "media-1", url: "/m.jpg" })),
    moveToTrash: vi.fn(async () => true),
  },
  reset() {
    this.navigate.mockReset();
    this.focusCapture.mockReset();
    this.focusReturn.mockReset();
    this.editor.error = null;
    this.editor.autosaveError = null;
    this.editor.loading = false;
    this.editor.canMutatePost = true;
    this.editor.editorSessionKey = '["post-1",0]';
    this.editor.status = "draft";
    this.editor.canUndo = true;
    this.editor.canRedo = true;
    this.editor.selectedBlock = null;
    this.editor.state.selectedBlockId = null;
    this.editor.flushLatestAutosave.mockReset();
    this.editor.flushLatestAutosave.mockResolvedValue(undefined);
    this.layout.showInserter = false;
    this.layout.showListView = false;
    this.layout.secondarySidebarOpen = true;
    this.layout.detailsSidebarOpen = true;
    this.layout.state.secondarySidebar = "list-view";
    this.layout.state.leftRailMode = "blocks";
    this.layout.leftRailMode = "blocks";
    this.layout.focusMode = false;
    this.layout.state.focusMode = false;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: () => null,
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: () => <div data-media-picker="true" />,
}));

vi.mock("../../../core/admin/ui/posts/editor/PostRevisionDrawer", () => ({
  PostRevisionDrawer: () => null,
}));

vi.mock("../../../core/admin/ui/posts/editor/settings/PostEditorSettingsDialog", () => ({
  PostEditorSettingsDialog: () => null,
}));

vi.mock("../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter", () => ({
  PostRichTextAdapter: ({ value }: { value: string }) => <div>{`adapter:${value}`}</div>,
}));

vi.mock("@/services/taxonomyClient", () => ({
  getTaxonomyOverview: vi.fn(async () => ({ terms: { categories: [], tags: [] } })),
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: vi.fn(async () => ({ publicBaseUrl: null, contentRoutes: [] })),
  resolvePostSlugRouteContext: () => ({
    publicBaseUrl: null,
    detailPathPattern: "/post/:slug",
  }),
  resolvePostSlugDisplay: () => ({
    label: "Route hint",
    value: "/post/:slug",
    concrete: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: chromeState.navigate }),
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorState", () => ({
  usePostEditorState: () => chromeState.editor,
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorLayout", () => ({
  usePostEditorLayout: () => chromeState.layout,
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorPreferences", () => ({
  usePostEditorPreferences: () => chromeState.preferences,
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorShortcuts", () => ({
  usePostEditorShortcuts: () => undefined,
  formatPostEditorShortcutAria: () => "Control+Alt+B",
  formatPostEditorShortcutLabel: () => "Ctrl+Alt+B",
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/useFocusReturn", () => ({
  useFocusReturn: () => ({
    capture: chromeState.focusCapture,
    returnFocus: chromeState.focusReturn,
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
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const renderEditor = async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
  );
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");
  const view = mount(<PostBlockEditorShell />);
  // Flush the shell's async mount effects (site-settings / taxonomy / slug) inside act
  // so their settling setState calls do not trip the "not wrapped in act" guard.
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return view;
};

beforeEach(() => {
  chromeState.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("TASK-497-02 post editor prototype parity", () => {
  it("renders an in-page PageHeader (description + Preview/Publish in actions) ABOVE a framed card", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      expect(container.textContent).toContain("Write, format, and publish your story.");
      const frame = container.querySelector('[data-post-editor-frame="true"]');
      expect(frame?.className).toContain("rounded-2xl");
      expect(frame?.className).toContain("shadow-card");
      // Preview + Publish live in the PageHeader actions, ABOVE the frame (not the chrome strip)
      expect(container.querySelector('[aria-label="Open runtime preview"]')).toBeTruthy();
      expect(
        Array.from(container.querySelectorAll("button")).some((b) =>
          /Publish post|Update published post/.test(b.getAttribute("aria-label") ?? "")
        )
      ).toBe(true);
    } finally {
      view.cleanup();
    }
  });

  it("chrome bar: single strip with title, autosave badge, undo/redo, device toggle", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      const header = container.querySelector('[data-post-editor-region="header"]');
      expect(header?.className).toContain("bg-muted/40");
      expect(container.querySelector('[data-post-editor-header-row="secondary"]')).toBeNull();
      expect(container.querySelector('[data-post-editor-sync-state="true"]')?.textContent).toMatch(
        /Saving\.\.\.|Unsaved changes|Saved at|Synced/
      );
      expect(container.querySelector('[aria-label="Undo"]')).toBeTruthy();
      expect(container.querySelector('[aria-label="Desktop preview"]')).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  it("undo/redo disabled when no history + preserve the data-post-editor-undo/redo hooks (override the mock canUndo/canRedo → false)", async () => {
    chromeState.editor.canUndo = false;
    chromeState.editor.canRedo = false;
    const view = await renderEditor();
    try {
      const { container } = view;
      expect(container.querySelector('[aria-label="Undo"]')?.hasAttribute("disabled")).toBe(true);
      expect(container.querySelector('[aria-label="Redo"]')?.hasAttribute("disabled")).toBe(true);
      // the RELOCATED undo/redo MUST carry over their existing data hooks (Preserve line 172) —
      // otherwise unguarded, they would drop silently if rebuilt from the hookless prototype
      expect(container.querySelector('[data-post-editor-undo="true"]')).toBeTruthy();
      expect(container.querySelector('[data-post-editor-redo="true"]')).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  it("LEFT rail defaults to Blocks; Outline + List survive as sibling tabs", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      const region = container.querySelector('[data-post-editor-region="secondary-sidebar"]');
      expect(region?.className).toContain("bg-muted/20");
      // three tabs; Blocks is the default (Extension #1)
      expect(container.querySelector('[data-post-editor-left-rail-tab="blocks"]')).toBeTruthy();
      expect(container.querySelector('[data-post-editor-left-rail-tab="outline"]')).toBeTruthy();
      expect(container.querySelector('[data-post-editor-left-rail-tab="list-view"]')).toBeTruthy();
      // EditorRail IS consumed: the Blocks palette wraps its sections in EditorRailGroup
      expect(container.querySelector("[data-editor-rail-group]")).toBeTruthy();
      // the default rail mode is "blocks"
      expect(container.querySelector('[data-post-editor-left-rail-mode="blocks"]')).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  it("preserves the six chrome toggles' a11y + shortcut hooks after demoting labels to icons", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      const header = container.querySelector('[data-post-editor-region="header"]');
      const add = header?.querySelector('[aria-label="Toggle block inserter"]');
      expect(add?.getAttribute("aria-controls")).toBe("post-editor-block-inserter");
      expect(add?.hasAttribute("aria-pressed")).toBe(true);
      expect(add?.getAttribute("data-post-editor-shortcut")).toBeTruthy();
      const outline = Array.from(header?.querySelectorAll("button") ?? []).find((b) =>
        /document overview/i.test(b.getAttribute("aria-label") ?? "")
      );
      expect(outline?.getAttribute("aria-controls")).toBe("post-editor-document-overview");
    } finally {
      view.cleanup();
    }
  });

  it("RIGHT inspector is flat 'Post settings' with a single SEO sub-card + Block tab, default open", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      const sidebar = container.querySelector('[data-post-editor-region="sidebar"]');
      expect(sidebar?.className).toContain("bg-card");
      expect(sidebar?.textContent).toContain("Post settings");
      expect(sidebar?.querySelectorAll(".bg-muted\\/30").length).toBe(1);
      expect(
        container.querySelector('[data-post-editor-details-tab-trigger="block"]')
      ).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  it("canvas keeps bg-dotted + max-w-2xl card", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      expect(container.querySelector(".bg-dotted")).toBeTruthy();
      expect(container.querySelector(".max-w-2xl")).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  it("device toggle is client-only: clicking Mobile preview flips Desktop preview aria-pressed true→false", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      expect(
        container.querySelector('[aria-label="Desktop preview"]')?.getAttribute("aria-pressed")
      ).toBe("true");

      React.act(() => {
        (container.querySelector('[aria-label="Mobile preview"]') as HTMLButtonElement).click();
      });

      expect(
        container.querySelector('[aria-label="Desktop preview"]')?.getAttribute("aria-pressed")
      ).toBe("false");
    } finally {
      view.cleanup();
    }
  });

  it("does not port the prototype sample byline into the canvas", async () => {
    const view = await renderEditor();
    try {
      expect(view.container.textContent).not.toContain("Alex Rivera");
    } finally {
      view.cleanup();
    }
  });
});
