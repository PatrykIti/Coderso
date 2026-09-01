// @vitest-environment happy-dom

// TASK-105-08-08-L02 residual suite (inspector/store): the document and block
// inspectors, the block inserter and store defaults, plus the taxonomy/site-settings
// failure copy the hosted document inspector renders.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { BlockInserter } from "../../../core/admin/ui/posts/editor/blocks/BlockInserter";
import { BlockInspector } from "../../../core/admin/ui/posts/editor/inspector/BlockInspector";
import { DocumentInspector } from "../../../core/admin/ui/posts/editor/inspector/DocumentInspector";
import { transformPostBlock } from "../../../core/admin/ui/posts/editor/blocks/blockTransforms";
import {
  createInitialPostEditorState,
  createPostBlock,
  postEditorReducer,
} from "../../../core/admin/ui/posts/editor/postEditorStore";

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

const typeValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  React.act(() => {
    const proto =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const selectByLabel = (container: HTMLElement, label: string) => {
  const group = Array.from(container.querySelectorAll("div")).find(
    (node) => node.querySelector("label")?.textContent === label && node.querySelector("select")
  );
  const select = group?.querySelector<HTMLSelectElement>("select");
  if (!select) throw new Error(`Missing select: ${label}`);
  return select;
};

afterEach(() => {
  shellState.reset();
  vi.clearAllMocks();
});

test("api client taxonomy failures use the category-aware copy", async () => {
  shellState.taxonomy.nextError = Object.assign(new Error("category off"), {
    name: "ApiClientError",
    code: "taxonomy_category_disabled",
  });
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();
    const inspector = () => view.container.querySelector("[data-post-editor-inspector='document']");
    expect(inspector()?.textContent).toContain("Categories are not enabled for this post type.");
    view.cleanup();

    // Any other api client code falls back to the generic load copy.
    shellState.taxonomy.nextError = Object.assign(new Error("terms offline"), {
      name: "ApiClientError",
      code: "taxonomy_terms_disabled",
    });
    const retryView = mount(<PostBlockEditorShell />);
    try {
      await flush();
      expect(retryView.container.textContent).toContain("Could not load categories.");
    } finally {
      retryView.cleanup();
    }
  } finally {
    view.cleanup();
  }
});

test("a site-settings rejection that lands after unmount is dropped", async () => {
  let rejectSettings: (error: Error) => void = () => undefined;
  shellState.siteSettings.getSettingsHandler = () =>
    new Promise((_resolve, reject) => {
      rejectSettings = reject;
    });

  const staleView = mount(<PostBlockEditorShell />);
  await flush();
  staleView.cleanup();

  rejectSettings(new Error("late settings outage"));
  await flush();

  // The stale failure must not leak into the next editor session's route hint.
  shellState.siteSettings.getSettingsHandler = null;
  const freshView = mount(<PostBlockEditorShell />);
  try {
    await flush();
    expect(freshView.container.textContent).toContain("https://coderso.test/blog/canonical-post");
    expect(freshView.container.textContent).not.toContain("late settings outage");
  } finally {
    freshView.cleanup();
  }
});

test("taxonomy failures surface the generic copy and site-settings failures keep the route hint", async () => {
  shellState.taxonomy.nextError = new Error("totally custom taxonomy outage");
  shellState.siteSettings.nextError = new Error("settings offline");
  const view = mount(<PostBlockEditorShell />);

  try {
    await flush();

    const inspector = view.container.querySelector("[data-post-editor-inspector='document']");
    expect(inspector?.textContent).toContain("Could not load categories.");
    expect(inspector?.textContent).not.toContain("totally custom taxonomy outage");
  } finally {
    view.cleanup();
  }
});

test("the canonical URL auto-fills from the slug route and follows a slug rename", async () => {
  const view = mount(<PostBlockEditorShell />);
  try {
    await flush();
    expect(shellState.editor.setSeoDraft).toHaveBeenCalledWith({
      canonicalUrl: "https://coderso.test/blog/canonical-post",
    });
    expect(shellState.editor.seoDraft.canonicalUrl).toBe(
      "https://coderso.test/blog/canonical-post"
    );

    shellState.editor.slug = "renamed-post";
    view.rerender(<PostBlockEditorShell />);
    await flush();

    expect(shellState.editor.setSeoDraft).toHaveBeenLastCalledWith({
      canonicalUrl: "https://coderso.test/blog/renamed-post",
    });
    expect(shellState.editor.seoDraft.canonicalUrl).toBe("https://coderso.test/blog/renamed-post");
  } finally {
    view.cleanup();
  }
});

test("the block inserter moves its roving selection when an item receives focus", () => {
  const onInsertBlock = vi.fn();
  const view = mount(<BlockInserter onInsertBlock={onInsertBlock} recentlyUsedTypes={["quote"]} />);

  try {
    const options = () =>
      Array.from(view.container.querySelectorAll<HTMLButtonElement>("[role='option']"));
    const optionByLabel = (label: string) => {
      const option = options().find(
        (candidate) => candidate.querySelector("p")?.textContent === label
      );
      if (!option) throw new Error(`missing option ${label}`);
      return option;
    };

    // The first catalog item owns the initial roving selection.
    expect(optionByLabel("Section").getAttribute("aria-selected")).toBe("true");
    expect(optionByLabel("Quote").getAttribute("aria-selected")).toBe("false");

    React.act(() => {
      optionByLabel("Quote").focus();
    });
    expect(optionByLabel("Quote").getAttribute("aria-selected")).toBe("true");
    expect(optionByLabel("Section").getAttribute("aria-selected")).toBe("false");

    // The most-used rail renders the same selectable option controls.
    expect(view.container.querySelector("[data-rail-label='Most used']")?.textContent).toContain(
      "Quote"
    );
    click(optionByLabel("Quote"));
    expect(onInsertBlock).toHaveBeenCalledWith("quote");
  } finally {
    view.cleanup();
  }
});

test("the block inspector edits text scale and audio attributes", () => {
  const onChangeAttrs = vi.fn();
  const view = mount(
    <div>
      <BlockInspector
        block={{ id: "block-toc", type: "toc", attrs: {}, content: null }}
        onChangeAttrs={onChangeAttrs}
      />
      <BlockInspector
        block={{ id: "block-audio", type: "audio", attrs: {}, content: null }}
        onChangeAttrs={onChangeAttrs}
      />
    </div>
  );

  try {
    const textScale = selectByLabel(view.container, "Text size");
    React.act(() => {
      textScale.value = "lg";
      textScale.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChangeAttrs).toHaveBeenCalledWith({ textScale: "lg" });

    const audioSection = Array.from(view.container.querySelectorAll("div")).find(
      (node) => node.querySelector("label")?.textContent === "Media ID"
    );
    const mediaId = audioSection?.querySelector<HTMLInputElement>("input");
    if (!mediaId) throw new Error("missing audio media id input");
    const audioInputs = Array.from(
      view.container.querySelectorAll<HTMLInputElement>("input")
    ).filter((input) => input.type === "text");
    const url = audioInputs[audioInputs.indexOf(mediaId) + 1];
    const caption = audioInputs[audioInputs.indexOf(mediaId) + 2];
    if (!url || !caption) throw new Error("missing audio url/caption inputs");

    typeValue(mediaId, "media-9");
    typeValue(url, "https://cdn.example.com/audio.mp3");
    typeValue(caption, "Episode 1");

    expect(onChangeAttrs).toHaveBeenCalledWith({ mediaId: "media-9" });
    expect(onChangeAttrs).toHaveBeenCalledWith({ url: "https://cdn.example.com/audio.mp3" });
    expect(onChangeAttrs).toHaveBeenCalledWith({ caption: "Episode 1" });
  } finally {
    view.cleanup();
  }
});

test("the document inspector renders unknown taxonomy failures verbatim", () => {
  const view = mount(
    <DocumentInspector
      title="Post A"
      status="draft"
      slug="post-a"
      excerpt="Summary"
      featuredImage=""
      tagsInput=""
      categoryId="cat-1"
      taxonomySummary={{ categoryName: null, tagCount: 0 }}
      seo={{ title: "", description: "", canonicalUrl: "", robots: "index,follow" }}
      taxonomyError="Totally custom failure"
      updatedAt="2026-03-08T10:00:00.000Z"
      onTitleChange={() => undefined}
      onSlugChange={() => undefined}
      onExcerptChange={() => undefined}
      onFeaturedImageChange={() => undefined}
      onTagsInputChange={() => undefined}
      onCategoryIdChange={() => undefined}
      onSeoChange={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Totally custom failure");
  } finally {
    view.cleanup();
  }
});
test("block transforms and fresh code blocks land with their documented defaults", () => {
  const paragraph = createPostBlock("paragraph");
  const callout = transformPostBlock(paragraph, "callout");
  if (!callout) throw new Error("missing callout block");
  expect(callout.type).toBe("callout");
  expect(callout.attrs).toMatchObject({ tone: "info" });

  const state = createInitialPostEditorState();
  const withCode = postEditorReducer(state, {
    type: "insert_block",
    mutation: { block: createPostBlock("code"), afterId: state.selectedBlockId },
  });
  const inserted = withCode.document.blocks.find((block) => block.type === "code");
  expect(inserted?.content).toBe("");
  expect(withCode.document.blocks[0]?.type).toBe("writing-canvas");
});
