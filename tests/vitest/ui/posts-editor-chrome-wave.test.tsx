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
      leftRailMode: "outline" as "outline" | "list-view",
      focusRestore: null as unknown,
    },
    secondarySidebarOpen: true,
    detailsSidebarOpen: true,
    showListView: true,
    showInserter: false,
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
    this.editor.status = "draft";
    this.editor.canUndo = true;
    this.editor.canRedo = true;
    this.editor.selectedBlock = null;
    this.editor.state.selectedBlockId = null;
    this.layout.showInserter = false;
    this.layout.showListView = true;
    this.layout.secondarySidebarOpen = true;
    this.layout.detailsSidebarOpen = true;
    this.layout.state.secondarySidebar = "list-view";
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

describe("post editor chrome restyle (TASK-497-02)", () => {
  it("renders a single muted chrome strip (no secondary toolbar row)", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      expect(container.querySelector('[data-post-editor-header-row="primary"]')).toBeTruthy();
      expect(container.querySelector('[data-post-editor-header-row="secondary"]')).toBeNull();
      expect(container.querySelector('[data-post-editor-region="header"]')?.className).toContain(
        "bg-muted/40"
      );
      for (const id of [
        "post-editor-block-inserter",
        "post-editor-document-overview",
        "post-editor-details",
      ]) {
        expect(container.querySelector(`[aria-controls="${id}"]`)).toBeTruthy();
      }
    } finally {
      view.cleanup();
    }
  });

  it("keeps the autosave badge with dynamic sync text", async () => {
    const view = await renderEditor();
    try {
      const badge = view.container.querySelector('[data-post-editor-sync-state="true"]');
      expect(badge?.textContent).toMatch(/Saving\.\.\.|Unsaved changes|Saved at|Synced/);
    } finally {
      view.cleanup();
    }
  });

  it("wires undo/redo and disables them when no history", async () => {
    chromeState.editor.canUndo = false;
    chromeState.editor.canRedo = false;
    const view = await renderEditor();
    try {
      expect(view.container.querySelector('[aria-label="Undo"]')?.hasAttribute("disabled")).toBe(
        true
      );
      expect(view.container.querySelector('[aria-label="Redo"]')?.hasAttribute("disabled")).toBe(
        true
      );
    } finally {
      view.cleanup();
    }
  });

  it("exposes Save draft, Preview, and a status-driven Publish(Rocket)", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      expect(container.querySelector('[aria-label="Save draft"]')).toBeTruthy();
      expect(container.querySelector('[aria-label="Open runtime preview"]')).toBeTruthy();
      const publish = Array.from(container.querySelectorAll("button")).find((b) =>
        /Publish post|Update published post/.test(b.getAttribute("aria-label") ?? "")
      );
      expect(publish).toBeTruthy();
      expect(publish?.textContent).toContain("Publish");
    } finally {
      view.cleanup();
    }
  });

  it("preserves toggle a11y + shortcut hooks after demoting labels to icons", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      const add = container.querySelector('[aria-label="Toggle block inserter"]');
      expect(add?.getAttribute("aria-controls")).toBe("post-editor-block-inserter");
      expect(add?.hasAttribute("aria-pressed")).toBe(true);
      expect(add?.getAttribute("data-post-editor-shortcut")).toBeTruthy();
      // Scope to the header BUTTON — PostListViewSidebar's region also carries an
      // aria-label containing "document overview".
      const header = container.querySelector('[data-post-editor-region="header"]');
      const outline = Array.from(header?.querySelectorAll("button") ?? []).find((b) =>
        /document overview/i.test(b.getAttribute("aria-label") ?? "")
      );
      expect(outline?.getAttribute("aria-controls")).toBe("post-editor-document-overview");
    } finally {
      view.cleanup();
    }
  });

  it("wires the optional device toggle (aria-pressed) with no network change", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      const desktop = container.querySelector('[aria-label="Desktop preview"]');
      const mobile = container.querySelector('[aria-label="Mobile preview"]');
      expect(desktop?.getAttribute("aria-pressed")).toBe("true");
      React.act(() => {
        mobile?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(desktop?.getAttribute("aria-pressed")).toBe("false");
    } finally {
      view.cleanup();
    }
  });

  it("uses bg-muted/20 left rail and wraps the inserter in EditorRailGroup with the active rail token", async () => {
    chromeState.layout.showInserter = true;
    chromeState.layout.showListView = false;
    chromeState.layout.state.secondarySidebar = "inserter";
    const view = await renderEditor();
    try {
      const { container } = view;
      const region = container.querySelector('[data-post-editor-region="secondary-sidebar"]');
      expect(region?.className).toContain("bg-muted/20");
      // EditorRail.tsx IS consumed (parent AC#5): inserter sections are wrapped in
      // EditorRailGroup (emits data-editor-rail-group).
      expect(container.querySelector("[data-editor-rail-group]")).toBeTruthy();
      // …and an inserter option row carries the active rail token via its kept
      // <Button role="option"> className (NOT a literal EditorRailItem element).
      const activeOption = Array.from(region?.querySelectorAll('[role="option"]') ?? []).find(
        (node) => node.className.includes("bg-primary-soft")
      );
      expect(activeOption).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  it("flattens the inspector: Post settings header + single SEO sub-card + Block tab", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      const sidebar = container.querySelector('[data-post-editor-region="sidebar"]');
      expect(sidebar?.className).toContain("bg-card");
      expect(sidebar?.textContent).toContain("Post settings");
      expect(sidebar?.textContent).toContain("SEO");
      // exactly ONE muted SEO sub-card — scoped to the details sidebar.
      expect(sidebar?.querySelectorAll(".bg-muted\\/30").length).toBe(1);
      // Block tab still present (post block model preserved).
      expect(
        container.querySelector('[data-post-editor-details-tab-trigger="block"]')
      ).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  it("keeps the canvas dotted background + max-w-2xl card without a fixture byline", async () => {
    const view = await renderEditor();
    try {
      const { container } = view;
      expect(container.querySelector(".bg-dotted")).toBeTruthy();
      expect(container.querySelector(".max-w-2xl")).toBeTruthy();
      expect(container.textContent).not.toContain("Alex Rivera");
    } finally {
      view.cleanup();
    }
  });
});
