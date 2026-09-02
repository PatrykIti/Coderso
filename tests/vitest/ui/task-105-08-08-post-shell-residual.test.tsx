// @vitest-environment happy-dom

// TASK-105-08-08-L02 residual suite (shell/header/drawer): the block editor shell's side
// effects plus the drawer and header controls it hosts — loading gate, toggles, trash,
// layout fallbacks, restore, save, deselect, and header defaults.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { PostEditorHeader } from "../../../core/admin/ui/posts/editor/header/PostEditorHeader";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const shellState = vi.hoisted(() => {
  const preferences = {
    focusModeOnOpen: false,
    compactSidePanels: false,
    showOutlineHints: true,
    editorDensity: "comfortable" as const,
    showKeyboardHints: true,
    defaultInspectorTab: "post" as const,
    restoreLastSidebarsState: true,
  };
  return {
    navigate: vi.fn(),
    focusCapture: vi.fn(),
    focusReturn: vi.fn(),
    editor: {
      error: null as string | null,
      autosaveError: null as string | null,
      loading: false,
      canMutatePost: true,
      title: "Post A",
      slug: "canonical-post",
      status: "draft",
      hasUnsavedChanges: false,
      state: {
        document: {
          blocks: [{ id: "block-1", type: "paragraph" }],
          meta: {},
        },
        selectedBlockId: "block-1",
        saving: false,
      },
      selectedBlock: { id: "block-1", type: "paragraph" } as { id: string; type: string } | null,
      postId: "post-1",
      editorSessionKey: '["post-1",0]' as string | null,
      post: { typeId: "post", updatedAt: "2026-03-08T10:00:00.000Z" },
      insertFocusToken: 1,
      canUndo: true,
      canRedo: true,
      lastSavedAt: "2026-03-08T10:00:00.000Z",
      deletingPost: false,
      revisionsOpen: false,
      revisions: [] as Array<Record<string, unknown>>,
      revisionsLoading: false,
      revisionsError: null,
      restoringRevisionId: null,
      taxonomySummary: null,
      tagsInput: "",
      categoryId: null,
      seoDraft: {
        title: "",
        description: "",
        canonicalUrl: "",
        robots: "index,follow",
      },
      featuredImage: "",
      remoteUpdatePending: false,
      selectBlock: vi.fn(),
      setSeoDraft: vi.fn((patch: Record<string, string>) => {
        Object.assign(shellState.editor.seoDraft, patch);
      }),
      setSlug: vi.fn(),
      setRevisionsOpen: vi.fn(),
      openRevisions: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      restoreRevision: vi.fn(async () => undefined),
      moveToTrash: vi.fn(async () => true),
      saveDraft: vi.fn(async () => undefined),
      preview: vi.fn(async () => undefined),
    },
    layout: {
      state: { detailsTab: "document" as "document" | "block" },
      secondarySidebarOpen: true,
      detailsSidebarOpen: true,
      showInserter: true,
      showListView: false,
      focusMode: false,
      leftRailMode: "outline" as "blocks" | "outline" | "list-view",
      openInserter: vi.fn(),
      openListView: vi.fn(),
      openDetails: vi.fn(),
      openDetailsForSelection: vi.fn(),
      closeDetails: vi.fn(),
      closeSecondarySidebar: vi.fn(),
      setDetailsTab: vi.fn(),
      setLeftRailMode: vi.fn(),
    },
    preferences: {
      preferences,
      initialPreferences: preferences,
      setPreferences: vi.fn(),
      resetPreferences: vi.fn(),
    },
    taxonomy: {
      overview: null as unknown,
      nextError: null as unknown,
      calls: [] as string[],
    },
    siteSettings: {
      nextError: null as unknown,
      getSettingsHandler: null as (() => Promise<Record<string, unknown>>) | null,
    },
    layoutInitials: [] as unknown[],
    reset() {
      shellState.layoutInitials = [];
      shellState.layout.showInserter = true;
      shellState.layout.secondarySidebarOpen = true;
      shellState.layout.detailsSidebarOpen = true;
      shellState.layout.leftRailMode = "outline";
      shellState.layout.state.detailsTab = "document";
      shellState.editor.revisionsOpen = false;
      shellState.editor.revisions = [];
      shellState.navigate.mockReset();
      shellState.focusCapture.mockReset();
      shellState.focusReturn.mockReset();
      for (const value of Object.values(shellState.layout)) {
        if (typeof value === "function" && "mockReset" in value) {
          (value as ReturnType<typeof vi.fn>).mockReset();
        }
      }
      shellState.editor.selectBlock.mockReset();
      shellState.editor.setSeoDraft.mockReset();
      shellState.editor.setSeoDraft.mockImplementation((patch: Record<string, string>) => {
        Object.assign(shellState.editor.seoDraft, patch);
      });
      shellState.editor.setSlug.mockReset();
      shellState.editor.setRevisionsOpen.mockReset();
      shellState.editor.openRevisions.mockReset();
      shellState.editor.undo.mockReset();
      shellState.editor.redo.mockReset();
      shellState.editor.restoreRevision.mockReset();
      shellState.editor.moveToTrash.mockReset();
      shellState.editor.saveDraft.mockReset();
      shellState.editor.preview.mockReset();
      shellState.editor.restoreRevision.mockResolvedValue(undefined);
      shellState.editor.moveToTrash.mockResolvedValue(true);
      shellState.editor.saveDraft.mockResolvedValue(undefined);
      shellState.editor.preview.mockResolvedValue(undefined);
      shellState.editor.loading = false;
      shellState.editor.canMutatePost = true;
      shellState.editor.error = null;
      shellState.editor.autosaveError = null;
      shellState.editor.slug = "canonical-post";
      shellState.editor.seoDraft.canonicalUrl = "";
      shellState.preferences.setPreferences.mockReset();
      shellState.preferences.resetPreferences.mockReset();
      shellState.taxonomy.nextError = null;
      shellState.taxonomy.calls = [];
      shellState.siteSettings.nextError = null;
      shellState.siteSettings.getSettingsHandler = null;
    },
  };
});

type NodeProps = { children?: React.ReactNode; [key: string]: unknown };

type ButtonProps = React.ComponentProps<"button">;

type InputProps = {
  value?: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  [key: string]: unknown;
};

type SelectProps = {
  children?: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
};

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children?: React.ReactNode }) => <strong>{children}</strong>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { children, onClick, disabled, ...props },
    ref
  ) {
    return (
      <button type="button" ref={ref} onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, ...props }: InputProps) => (
    <input value={value} onChange={onChange} {...props} />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, onChange, ...props }: InputProps) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: SelectProps) => (
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: NodeProps) => <>{children}</>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: NodeProps) => <>{children}</>,
}));

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: NodeProps) => <>{children}</>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    "aria-label"?: string;
  }) => (
    <input
      type="checkbox"
      role="switch"
      aria-label={ariaLabel}
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: NodeProps) => <div>{children}</div>,
  TabsList: ({ children }: NodeProps) => <div>{children}</div>,
  TabsTrigger: ({
    children,
    onClick,
    value,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    value?: string;
  }) => (
    <button type="button" data-tab={value} onClick={onClick}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <div data-tab-content={value}>{children}</div>
  ),
}));

vi.mock("@/ui/shared/EditorRail", () => ({
  EditorRailGroup: ({ label, children }: { label?: string; children?: React.ReactNode }) => (
    <div data-rail-label={label}>{children}</div>
  ),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ value }: { value?: string }) => (
    <div data-media-picker="true">{`media:${value ?? "none"}`}</div>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    onConfirm,
    confirmLabel,
  }: {
    open?: boolean;
    onConfirm?: () => void;
    confirmLabel?: string;
  }) =>
    open ? (
      <button type="button" data-confirm-dialog="true" onClick={() => onConfirm?.()}>
        {confirmLabel ?? "Confirm"}
      </button>
    ) : null,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({ open }: { open?: boolean }) => (
    <div>{`preview-dialog:${open ? "open" : "closed"}`}</div>
  ),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: shellState.navigate }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/taxonomyClient", () => ({
  getTaxonomyOverview: vi.fn(async (typeId: string) => {
    shellState.taxonomy.calls.push(typeId);
    if (shellState.taxonomy.nextError) {
      const error = shellState.taxonomy.nextError;
      shellState.taxonomy.nextError = null;
      throw error;
    }
    if (shellState.taxonomy.overview) return shellState.taxonomy.overview;
    return { taxonomies: { category: null, tag: null }, terms: { categories: [], tags: [] } };
  }),
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: vi.fn(async () => {
    if (shellState.siteSettings.getSettingsHandler) {
      return shellState.siteSettings.getSettingsHandler();
    }
    if (shellState.siteSettings.nextError) {
      const error = shellState.siteSettings.nextError;
      shellState.siteSettings.nextError = null;
      throw error;
    }
    return {
      publicBaseUrl: "https://coderso.test",
      contentRoutes: [{ type: "posts", detailPath: "/blog/:slug", enabled: true }],
    };
  }),
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

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorState", () => ({
  usePostEditorState: () => shellState.editor,
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorLayout", () => ({
  usePostEditorLayout: (initial: unknown) => {
    shellState.layoutInitials.push(initial);
    return shellState.layout;
  },
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostEditorPreferences", () => ({
  usePostEditorPreferences: () => shellState.preferences,
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/useFocusReturn", () => ({
  useFocusReturn: () => ({
    capture: shellState.focusCapture,
    returnFocus: shellState.focusReturn,
    clear: () => undefined,
  }),
}));

vi.mock("../../../core/admin/ui/posts/editor/PostEditorCanvas", () => ({
  PostEditorCanvas: ({ onSelectBlock }: { onSelectBlock: (id: string | null) => void }) => (
    <button type="button" onClick={() => onSelectBlock(null)}>
      deselect-canvas-block
    </button>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/PostEditorTopBar", () => ({
  PostEditorTopBar: ({
    onClose,
    onOpenRevisions,
    onToggleInserter,
    onToggleOutline,
    onToggleDetails,
  }: Record<string, () => void>) => {
    const actions: Array<[string, () => void]> = [
      ["close-editor", onClose],
      ["open-revisions", onOpenRevisions],
      ["toggle-inserter", onToggleInserter],
      ["toggle-outline", onToggleOutline],
      ["toggle-details", onToggleDetails],
    ];
    return (
      <div>
        {actions.map(([label, handler]) => (
          <button key={label} type="button" onClick={handler}>
            {label}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock("../../../core/admin/ui/posts/editor/sidebars/PostListViewSidebar", () => ({
  PostListViewSidebar: () => <div>list-view-sidebar</div>,
}));

vi.mock("../../../core/admin/ui/posts/editor/settings/PostEditorSettingsDialog", () => ({
  PostEditorSettingsDialog: ({ open }: { open?: boolean }) => (
    <div>{`settings-dialog:${open ? "open" : "closed"}`}</div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/editor/layout/PostEditorLayout", () => ({
  PostEditorLayout: ({
    header,
    pageActions,
    content,
    secondarySidebar,
    detailsSidebar,
    onSecondarySidebarOpenChange,
  }: {
    header: React.ReactNode;
    pageActions: React.ReactNode;
    content: React.ReactNode;
    secondarySidebar: React.ReactNode;
    detailsSidebar: React.ReactNode;
    onSecondarySidebarOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <div>{header}</div>
      <div>{pageActions}</div>
      <div>{content}</div>
      <div>{secondarySidebar}</div>
      <div>{detailsSidebar}</div>
      {[false, true].map((open) => (
        <button key={String(open)} type="button" onClick={() => onSecondarySidebarOpenChange(open)}>
          {open ? "open-secondary-shell" : "close-secondary-shell"}
        </button>
      ))}
    </div>
  ),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (next: React.ReactNode) => {
    React.act(() => {
      root.render(next);
    });
  };

  render(node);
  return {
    container,
    rerender: render,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async (times = 4) => {
  for (let index = 0; index < times; index += 1) {
    await React.act(async () => {
      await Promise.resolve();
    });
  }
};

const click = (element: Element) => {
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!button) throw new Error(`Missing button: ${text}`);
  click(button);
  return button;
};

afterEach(() => {
  shellState.reset();
  vi.clearAllMocks();
});

test("the shell loading gate replaces the editor body", async () => {
  shellState.editor.loading = true;
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Loading post editor...");
    expect(view.container.textContent).not.toContain("deselect-canvas-block");
  } finally {
    view.cleanup();
  }
});

test("the top-bar toggles close the panel that is already open", async () => {
  shellState.layout.showInserter = true;
  shellState.layout.secondarySidebarOpen = true;
  shellState.layout.detailsSidebarOpen = true;
  shellState.layout.leftRailMode = "outline";
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();

    clickByText(view.container, "toggle-inserter");
    expect(shellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(shellState.focusReturn).toHaveBeenCalledWith("inserter");

    clickByText(view.container, "toggle-details");
    expect(shellState.layout.closeDetails).toHaveBeenCalled();
    expect(shellState.focusReturn).toHaveBeenCalledWith("details");

    clickByText(view.container, "open-revisions");
    expect(shellState.editor.openRevisions).toHaveBeenCalledTimes(1);

    // With the details sidebar closed the same control opens it for the current
    // selection instead.
    shellState.layout.detailsSidebarOpen = false;
    view.rerender(<PostBlockEditorShell />);
    clickByText(view.container, "toggle-details");
    expect(shellState.focusCapture).toHaveBeenCalledWith("details", expect.anything());
    expect(shellState.layout.openDetailsForSelection).toHaveBeenCalledWith(true);

    // Reopening a closed rail from the shell chrome lands on the list view.
    shellState.layout.secondarySidebarOpen = false;
    view.rerender(<PostBlockEditorShell />);
    clickByText(view.container, "open-secondary-shell");
    expect(shellState.layout.setLeftRailMode).toHaveBeenCalledWith("blocks");
    expect(shellState.layout.openListView).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("opening the inserter captures focus on the add-block control", async () => {
  shellState.layout.showInserter = false;
  shellState.layout.secondarySidebarOpen = false;
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();
    clickByText(view.container, "toggle-inserter");
    expect(shellState.focusCapture).toHaveBeenCalledWith("inserter", expect.anything());
    expect(shellState.layout.openInserter).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("moving to trash navigates home and swallows a rejected delete", async () => {
  Object.defineProperty(window, "confirm", {
    value: vi.fn(() => true),
    configurable: true,
    writable: true,
  });
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();
    clickByText(view.container, "Move to trash");
    await flush();
    expect(shellState.editor.moveToTrash).toHaveBeenCalledTimes(1);
    expect(shellState.navigate).toHaveBeenCalledWith("/admin/posts", { replace: true });

    // A rejected delete is swallowed: the editor stays put with no surfaced error.
    shellState.editor.moveToTrash.mockRejectedValue(new Error("delete offline"));
    clickByText(view.container, "Move to trash");
    await flush();
    expect(shellState.editor.moveToTrash).toHaveBeenCalledTimes(2);
    expect(shellState.navigate).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).not.toContain("delete offline");
  } finally {
    Reflect.deleteProperty(window, "confirm");
    view.cleanup();
  }
});

test("a corrupt stored layout falls back to the default rail", async () => {
  window.localStorage.setItem("coderso.posts.editor.layout.v1", "[]");
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();
    expect(shellState.layoutInitials[0]).toMatchObject({
      initialSecondarySidebar: "list-view",
      initialDetailsOpen: true,
      initialLeftRailMode: "blocks",
    });
  } finally {
    view.cleanup();
  }
});

test("the hosted revision drawer previews snapshots and restores through the shell", async () => {
  shellState.editor.revisionsOpen = true;
  shellState.editor.revisions = [
    {
      id: "rev-1",
      version: 3,
      createdAt: "not-a-date",
      createdBy: { name: "Ada", email: "ada@example.com" },
      data: { document: { blocks: [{ content: "x".repeat(200) }] } },
    },
    {
      id: "rev-2",
      version: 2,
      createdAt: "2026-03-11T10:00:00.000Z",
      createdBy: { name: "", email: "" },
      data: {},
    },
  ];
  shellState.editor.restoreRevision.mockRejectedValue(new Error("restore offline"));
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();
    expect(view.container.textContent).toContain("not-a-date · Ada");

    const revisionRow = (version: number) => {
      const label = Array.from(view.container.querySelectorAll("p")).find(
        (node) => node.textContent === `Version ${version}`
      );
      let row = label?.parentElement ?? null;
      while (
        row &&
        !Array.from(row.querySelectorAll("button")).some((button) =>
          ["Preview", "Hide preview", "Restore"].includes(button.textContent?.trim() ?? "")
        )
      ) {
        row = row.parentElement;
      }
      if (!row) throw new Error(`missing revision row ${version}`);
      return row;
    };
    const rowButton = (row: HTMLElement, text: string) => {
      const button = Array.from(row.querySelectorAll("button")).find(
        (candidate) => candidate.textContent?.trim() === text
      );
      if (!button) throw new Error(`missing revision button ${text}`);
      return button;
    };

    click(rowButton(revisionRow(3), "Preview"));
    expect(view.container.textContent).toContain(`${"x".repeat(177)}...`);
    expect(view.container.textContent).not.toContain("x".repeat(200));

    // A revision without a snapshot falls back to the descriptive copy.
    click(rowButton(revisionRow(2), "Preview"));
    expect(view.container.textContent).toContain(
      "No document snapshot is stored for this revision."
    );
    expect(view.container.textContent).toContain("0 blocks");

    click(rowButton(revisionRow(3), "Restore"));
    const confirmButton = view.container.querySelector<HTMLButtonElement>(
      "[data-confirm-dialog='true']"
    );
    if (!confirmButton) throw new Error("missing restore confirmation");
    click(confirmButton);
    await flush();

    expect(shellState.editor.restoreRevision).toHaveBeenCalledWith("rev-1");
    expect(view.container.textContent).toContain("Restore an earlier snapshot of this post.");
    expect(view.container.textContent).not.toContain("restore offline");
  } finally {
    view.cleanup();
  }
});

test("deselecting the only block falls back to the document details tab", async () => {
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();

    clickByText(view.container, "deselect-canvas-block");
    expect(shellState.editor.selectBlock).toHaveBeenCalledWith(null);
    expect(shellState.layout.setDetailsTab).toHaveBeenCalledWith("document");

    // Closing the secondary sidebar from the shell chrome uses the same handler.
    clickByText(view.container, "close-secondary-shell");
    expect(shellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(shellState.focusReturn).toHaveBeenCalledWith("inserter");
  } finally {
    view.cleanup();
  }
});

test("the action cluster drives draft saving and swallows a rejected save", async () => {
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();
    clickByText(view.container, "Save draft");
    await flush();
    expect(shellState.editor.saveDraft).toHaveBeenCalledTimes(1);

    shellState.editor.saveDraft.mockRejectedValue(new Error("save offline"));
    clickByText(view.container, "Save draft");
    await flush();
    expect(shellState.editor.saveDraft).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).not.toContain("save offline");
  } finally {
    view.cleanup();
  }
});

test("the editor header renders malformed save times verbatim and switches viewport", () => {
  const onSetViewportMode = vi.fn();
  const view = mount(
    <PostEditorHeader
      dirty={false}
      saving={false}
      lastSavedAt="not-a-date"
      onClose={() => undefined}
      outlineVisible={false}
      onToggleOutline={() => undefined}
      onToggleDetails={() => undefined}
      detailsOpen={false}
      onOpenRevisions={() => undefined}
      onToggleInserter={() => undefined}
      inserterVisible={false}
      onToggleFocusMode={() => undefined}
      focusMode={false}
      onOpenSettings={() => undefined}
      viewportMode="mobile"
      onSetViewportMode={onSetViewportMode}
    />
  );

  try {
    expect(view.container.textContent).toContain("not-a-date");
    const desktop = view.container.querySelector<HTMLButtonElement>(
      '[aria-label="Desktop preview"]'
    );
    if (!desktop) throw new Error("missing desktop preview control");
    click(desktop);
    expect(onSetViewportMode).toHaveBeenCalledWith("desktop");
  } finally {
    view.cleanup();
  }
});
