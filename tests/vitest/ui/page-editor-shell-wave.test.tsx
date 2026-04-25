// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import { createBlock } from "../../../core/admin/ui/pages/builder/blockUtils";
import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import { normalizePageLayoutSettings } from "../../../core/services/pages/layoutSettings";
import type {
  PageDetail,
  PageRevision,
} from "../../../core/admin/services/pagesClient";

type CacheEvent = {
  key: string;
  action: "update";
};

const pageEditorState = vi.hoisted(() => {
  const state = {
    cachedPage: null as PageDetail | null,
    currentPage: null as PageDetail | null,
    revisions: [] as PageRevision[],
    cacheListener: null as ((event: CacheEvent) => void) | null,
    getCachedPageDetail: vi.fn((id: string) =>
      state.cachedPage && state.cachedPage.id === id ? state.cachedPage : null
    ),
    getPageCached: vi.fn(async () => state.currentPage),
    getPageTemplateOptions: vi.fn(async () => ({
      themeName: "starter",
      templates: [{ key: "landing", label: "Landing" }],
    })),
    listPageRevisions: vi.fn(async () => state.revisions),
    previewPage: vi.fn(async (pageId: string) => ({
      previewUrl: `https://preview.test/${pageId}`,
      probe: {
        ok: true,
        status: 200,
        targetLabel: `https://preview.test/${pageId}`,
      },
    })),
    updatePage: vi.fn(
      async (id: string, payload: Partial<PageDetail> & { data?: Record<string, unknown> }) => {
        const current =
          state.currentPage ??
          ({
            id,
            title: "Homepage",
            slug: "homepage",
            status: "draft",
            currentData: { blocks: [] },
            updatedAt: "2026-03-08T09:00:00.000Z",
          } satisfies PageDetail);
        const updated = {
          ...current,
          title: typeof payload.title === "string" ? payload.title : current.title,
          slug: typeof payload.slug === "string" ? payload.slug : current.slug,
          currentData: payload.data ?? current.currentData,
        } satisfies PageDetail;
        state.currentPage = updated;
        return updated;
      }
    ),
    publishPage: vi.fn(async (id: string, data: Record<string, unknown>) => {
      if (!state.currentPage) return;
      state.currentPage = {
        ...state.currentPage,
        id,
        status: "published",
        currentData: data,
      };
    }),
    autosavePage: vi.fn(async () => ({
      savedAt: "2026-03-08T09:10:00.000Z",
      reusedRevision: false,
      revision: state.revisions[0],
    })),
    restorePageRevision: vi.fn(async () => {
      const restored =
        state.currentPage &&
        ({
          ...state.currentPage,
          title: "Restored Homepage",
        } satisfies PageDetail);
      state.currentPage = restored;
      return { page: restored };
    }),
    discardPageRevision: vi.fn(async () => undefined),
    subscribeCacheEvents: vi.fn(
      (listener: (event: CacheEvent) => void) => {
        state.cacheListener = listener;
        return () => {
          if (state.cacheListener === listener) {
            state.cacheListener = null;
          }
        };
      }
    ),
    triggerCacheEvent(key: string) {
      state.cacheListener?.({ key, action: "update" });
    },
    reset() {
      state.cachedPage = null;
      state.currentPage = null;
      state.revisions = [];
      state.cacheListener = null;
      state.getCachedPageDetail.mockClear();
      state.getPageCached.mockClear();
      state.getPageTemplateOptions.mockClear();
      state.listPageRevisions.mockClear();
      state.previewPage.mockClear();
      state.updatePage.mockClear();
      state.publishPage.mockClear();
      state.autosavePage.mockClear();
      state.restorePageRevision.mockClear();
      state.discardPageRevision.mockClear();
      state.subscribeCacheEvents.mockClear();
    },
  };

  return state;
});

const pageEditorToastState = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: pageEditorToastState.success,
    error: pageEditorToastState.error,
  },
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  SheetContent: ({
    side,
    children,
  }: {
    side: "left" | "right";
    children: React.ReactNode;
  }) => <div>{`sheet:${side}`}{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error && error.kind === "api",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    pageDetail: (id: string) => `page-detail:${id}`,
  },
  cacheTtlMs: {
    list: 300_000,
    detail: 300_000,
  },
}));

vi.mock("@/services/pagesClient", () => ({
  autosavePage: pageEditorState.autosavePage,
  discardPageRevision: pageEditorState.discardPageRevision,
  getCachedPageDetail: pageEditorState.getCachedPageDetail,
  getPageCached: pageEditorState.getPageCached,
  getPageTemplateOptions: pageEditorState.getPageTemplateOptions,
  listPageRevisions: pageEditorState.listPageRevisions,
  previewPage: pageEditorState.previewPage,
  publishPage: pageEditorState.publishPage,
  restorePageRevision: pageEditorState.restorePageRevision,
  updatePage: pageEditorState.updatePage,
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    breadcrumbs,
    leftPanel,
    rightPanel,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div>{leftPanel}</div>
      <div>{rightPanel}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: pageEditorState.subscribeCacheEvents,
}));

vi.mock("@/ui/pages/DeviceSwitcher", () => ({
  DeviceSwitcher: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: "desktop" | "tablet" | "mobile") => void;
  }) => (
    <div>
      <span>{`device:${value}`}</span>
      <button type="button" onClick={() => onChange("tablet")}>
        device-tablet
      </button>
    </div>
  ),
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({
    open,
    previewUrl,
    probeResult,
    isLoading,
    error,
    device,
  }: {
    open: boolean;
    previewUrl: string | null;
    probeResult?: { ok: boolean; targetLabel?: string } | null;
    isLoading: boolean;
    error: string | null;
    device: string;
  }) =>
    open ? (
      <div>
        <span>{`preview-url:${previewUrl ?? "none"}`}</span>
        <span>{`preview-probe:${probeResult ? String(probeResult.ok) : "none"}`}</span>
        <span>{`preview-loading:${String(isLoading)}`}</span>
        <span>{`preview-error:${error ?? "none"}`}</span>
        <span>{`preview-device:${device}`}</span>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockList", () => ({
  BlockList: ({
    blocks,
    selectedId,
    onSelect,
    onDuplicate,
    onDelete,
    onMove,
    onInsert,
    onMoveToSlot,
  }: {
    blocks: Array<{ id: string; type: string }>;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onDuplicate?: (id: string) => void;
    onDelete?: (id: string) => void;
    onMove?: (path: unknown, from: number, to: number) => void;
    onInsert?: (parentId: string, slotId: string, type: string) => void;
    onMoveToSlot?: (blockId: string, parentId: string, slotId: string) => void;
  }) => (
    <div>
      <span>{`block-count:${blocks.length}`}</span>
      <span>{`selected-block:${selectedId ?? "none"}`}</span>
      <span>{`block-types:${blocks.map((block) => block.type).join(",")}`}</span>
      <button
        type="button"
        onClick={() => onSelect(blocks[blocks.length - 1]?.id ?? null)}
      >
        select-last-block
      </button>
      <button
        type="button"
        onClick={() => onDuplicate?.(selectedId ?? blocks[0]?.id ?? "missing")}
      >
        duplicate-selected-block
      </button>
      <button
        type="button"
        onClick={() => onDelete?.(selectedId ?? blocks[0]?.id ?? "missing")}
      >
        delete-selected-block
      </button>
      <button type="button" onClick={() => onDelete?.("missing-block")}>
        delete-missing-block
      </button>
      <button type="button" onClick={() => onMove?.([], 0, 1)}>
        move-first-block-down
      </button>
      <button type="button" onClick={() => onMove?.([], 0, -1)}>
        invalid-move-block
      </button>
      <button
        type="button"
        onClick={() => {
          const hero = blocks.find((block) => block.type === "hero") ?? blocks[0];
          if (!hero) return;
          onInsert?.(hero.id, "content", "compare-timeline");
        }}
      >
        insert-into-hero-slot
      </button>
      <button
        type="button"
        onClick={() => {
          const hero = blocks.find((block) => block.type === "hero") ?? blocks[0];
          const selectedBlock = blocks.find((block) => block.id === selectedId);
          const fallback = [...blocks]
            .reverse()
            .find((block) => block.id !== hero?.id);
          if (!hero) return;
          const moving = selectedBlock?.id !== hero.id ? selectedBlock : fallback;
          if (!moving) return;
          onMoveToSlot?.(moving.id, hero.id, "content");
        }}
      >
        move-selected-into-hero-slot
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockSettings", () => ({
  BlockSettings: ({
    block,
    widget,
    onChange,
  }: {
    block?: {
      id: string;
      type: string;
      layout?: {
        container?: string;
        padding?: { top?: string; bottom?: string };
        margin?: { top?: string; bottom?: string };
      };
    } | null;
    widget?: { type: string } | null;
    onChange?: (next: {
      id: string;
      type: string;
      layout?: {
        container?: string;
        padding?: { top?: string; bottom?: string };
        margin?: { top?: string; bottom?: string };
      };
    }) => void;
  }) => (
    <div>
      <span>{`settings-block:${block?.type ?? "none"}`}</span>
      <span>{`settings-widget:${widget?.type ?? "none"}`}</span>
      <span>
        {`settings-layout:${block?.layout?.container ?? "none"}:${block?.layout?.padding?.top ?? "none"}:${block?.layout?.padding?.bottom ?? "none"}:${block?.layout?.margin?.top ?? "none"}:${block?.layout?.margin?.bottom ?? "none"}`}
      </span>
      <button
        type="button"
        onClick={() => {
          if (!block) return;
          onChange?.({
            ...block,
            type: "unknown-widget",
          });
        }}
      >
        mutate-selected-block
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/LibraryPanel", () => ({
  LibraryPanel: ({
    onAddWidget,
    onAddTemplate,
    onAddForm,
  }: {
    onAddWidget: (type: string) => void;
    onAddTemplate: (template: { id: string; name: string }) => void;
    onAddForm: (form: { id: string; name: string }) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onAddWidget("hero")}>
        add-widget
      </button>
      <button
        type="button"
        onClick={() => onAddTemplate({ id: "template-1", name: "Hero Template" })}
      >
        add-template
      </button>
      <button
        type="button"
        onClick={() => onAddForm({ id: "form-1", name: "Lead Form" })}
      >
        add-form
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/PageRevisionDrawer", () => ({
  PageRevisionDrawer: ({
    open,
    revisions,
    error,
    onRestore,
    onDiscard,
  }: {
    open: boolean;
    revisions: Array<{ id: string }>;
    error?: string | null;
    onRestore: (id: string) => void;
    onDiscard: (id: string) => void;
  }) =>
    open ? (
      <div>
        <span>{`revision-count:${revisions.length}`}</span>
        <span>{`revision-error:${error ?? "none"}`}</span>
        <button type="button" onClick={() => onRestore(revisions[0]?.id ?? "rev-published")}>
          restore-revision
        </button>
        <button type="button" onClick={() => onDiscard(revisions[1]?.id ?? "rev-autosave")}>
          discard-revision
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/pages/PageSettingsDrawer", () => ({
  PageSettingsDrawer: ({
    open,
    templateOptions,
    templateOptionsLoading,
    templateOptionsError,
    onSave,
    onAutosave,
  }: {
    open: boolean;
    templateOptions: Array<{ key: string; label: string }> | null;
    templateOptionsLoading: boolean;
    templateOptionsError?: string | null;
    onSave: (payload: {
      title: string;
      slug: string;
      settings: ReturnType<typeof normalizePageLayoutSettings> extends never
        ? never
        : {
            template: string;
            showInNav: boolean;
            layout: ReturnType<typeof normalizePageLayoutSettings>;
            revisionRetention: number;
          };
    }) => Promise<boolean>;
    onAutosave: (payload: {
      title: string;
      slug: string;
      settings: {
        template: string;
        showInNav: boolean;
        layout: ReturnType<typeof normalizePageLayoutSettings>;
        revisionRetention: number;
      };
    }) => Promise<void>;
  }) =>
    open ? (
      <div>
        <span>{`template-options:${templateOptions?.length ?? 0}`}</span>
        <span>{`template-options-loading:${String(templateOptionsLoading)}`}</span>
        <span>{`template-options-error:${templateOptionsError ?? "none"}`}</span>
        <button
          type="button"
          onClick={() =>
            void onSave({
              title: "SEO Homepage",
              slug: "seo-homepage",
              settings: {
                template: "landing",
                showInNav: false,
                layout: normalizePageLayoutSettings(undefined),
                revisionRetention: 12,
              },
            })
          }
        >
          settings-save
        </button>
        <button
          type="button"
          onClick={() =>
            void onAutosave({
              title: "Autosaved Homepage",
              slug: "autosaved-homepage",
              settings: {
                template: "landing",
                showInNav: true,
                layout: normalizePageLayoutSettings(undefined),
                revisionRetention: 15,
              },
            })
          }
        >
          settings-autosave
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/pages/builder/widgetRegistry", () => ({
  getWidgetRegistry: () => [
    { type: "hero" },
    { type: "compare-timeline" },
    { type: "template-section" },
    { type: "form-embed" },
  ],
}));

vi.mock("../../../core/widgets/validator", () => ({
  normalizeWidgetBlock: <T,>(block: T) => block,
}));

const clonePage = (page: PageDetail): PageDetail => ({
  ...page,
  currentData: {
    ...(page.currentData ?? {}),
    blocks: Array.isArray(page.currentData?.blocks)
      ? [...(page.currentData.blocks as unknown[])]
      : [],
  },
});

const createPage = (
  overrides: Partial<PageDetail> = {}
): PageDetail => {
  const hero = createBlock("hero");
  const comparison = createBlock("compare-timeline");

  return {
    id: "page-1",
    title: "Homepage",
    slug: "homepage",
    status: "draft",
    currentData: { blocks: [hero, comparison] },
    updatedAt: "2026-03-08T09:00:00.000Z",
    ...overrides,
  };
};

const createRevision = (overrides: Partial<PageRevision>): PageRevision => ({
  id: "rev-1",
  pageId: "page-1",
  version: 1,
  kind: "publish",
  title: "Homepage",
  slug: "homepage",
  data: { blocks: [] },
  createdAt: "2026-03-08T09:00:00.000Z",
  createdBy: null,
  ...overrides,
});

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickButton = (
  container: HTMLElement,
  label: string,
  occurrence: "first" | "last" = "first"
) => {
  const matches = Array.from(container.querySelectorAll("button")).filter((candidate) =>
    candidate.textContent?.includes(label)
  );
  const button =
    occurrence === "last" ? matches[matches.length - 1] : matches[0];

  if (!button) {
    throw new Error(`Missing button: ${label}`);
  }

  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const apiError = (message: string) => ({
  kind: "api" as const,
  name: "ApiClientError",
  code: "request_failed",
  message,
  status: 400,
});

beforeEach(() => {
  pageEditorState.reset();
  pageEditorToastState.success.mockClear();
  pageEditorToastState.error.mockClear();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = clonePage(pageEditorState.cachedPage);
  pageEditorState.revisions = [
    createRevision({ id: "rev-published", kind: "publish" }),
    createRevision({ id: "rev-autosave", kind: "autosave", version: 2 }),
  ];
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;
});

test("PageEditor hydrates from cache, surfaces remote updates, and supports shell library/details flows", async () => {
  const view = mount(<PageEditor pageId="page-1" />);

  try {
    await flush();

    expect(pageEditorState.getCachedPageDetail).toHaveBeenCalledWith("page-1");
    expect(pageEditorState.getPageCached).toHaveBeenCalledWith("page-1", {
      force: true,
    });
    expect(view.container.textContent).toContain("Homepage");
    expect(view.container.textContent).toContain("block-count:2");
    expect(view.container.textContent).toContain("settings-block:hero");

    clickButton(view.container, "add-widget");
    await flush();

    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).toContain("block-count:3");

    clickButton(view.container, "Details");
    await flush();

    expect(view.container.textContent).toContain("sheet:right");

    pageEditorState.currentPage = createPage({
      title: "Remote Homepage",
      currentData: { blocks: [createBlock("hero")] },
    });
    act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    await flush();

    expect(view.container.textContent).toContain("Updated in another tab");
    expect(view.container.textContent).toContain("Refresh");

    clickButton(view.container, "Refresh");
    await flush();

    expect(view.container.textContent).toContain("Remote Homepage");
    expect(view.container.textContent).not.toContain("Updated in another tab");
  } finally {
    view.cleanup();
  }
});

test("PageEditor handles preview, draft/publish, settings persistence, autosave, and revision actions", async () => {
  const initialPage = createPage();
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();

    clickButton(view.container, "device-tablet");
    clickButton(view.container, "Runtime preview");
    await flush();

    expect(pageEditorState.previewPage).toHaveBeenCalledWith("page-1", {
      probe: true,
    });
    expect(view.container.textContent).toContain("preview-url:https://preview.test/page-1");
    expect(view.container.textContent).toContain("preview-probe:true");
    expect(view.container.textContent).toContain("preview-device:tablet");

    clickButton(view.container, "Save draft");
    await flush();

    const draftPayload = pageEditorState.updatePage.mock.calls[0]?.[1] as {
      data: { blocks: unknown[] };
    };
    expect(draftPayload.data.blocks).toHaveLength(2);
    expect(view.container.textContent).toContain("Page updated");
    expect(view.container.textContent).toContain("Draft saved.");
    expect(pageEditorToastState.success).toHaveBeenCalledWith("Draft saved.");

    clickButton(view.container, "Publish");
    await flush();

    expect(pageEditorState.publishPage).toHaveBeenCalledWith(
      "page-1",
      expect.objectContaining({
        blocks: expect.any(Array),
      })
    );
    expect(view.container.textContent).toContain("Published");
    expect(view.container.textContent).toContain("Page published.");
    expect(pageEditorToastState.success).toHaveBeenCalledWith("Page published.");

    clickButton(view.container, "Page settings");
    await flush();

    expect(pageEditorState.getPageTemplateOptions).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("template-options-loading:false");

    clickButton(view.container, "settings-save");
    await flush();

    const settingsSavePayload = pageEditorState.updatePage.mock.calls[1]?.[1] as {
      title: string;
      slug: string;
      data: {
        settings: {
          template: string;
          showInNav: boolean;
          revisionRetention: number;
        };
      };
    };
    expect(settingsSavePayload.title).toBe("SEO Homepage");
    expect(settingsSavePayload.slug).toBe("seo-homepage");
    expect(settingsSavePayload.data.settings).toMatchObject({
      template: "landing",
      showInNav: false,
      revisionRetention: 12,
    });

    clickButton(view.container, "Page settings");
    await flush();
    clickButton(view.container, "settings-autosave");
    await flush();

    expect(pageEditorState.autosavePage).toHaveBeenCalledWith(
      "page-1",
      expect.objectContaining({
        title: "Autosaved Homepage",
        slug: "autosaved-homepage",
      })
    );

    clickButton(view.container, "History");
    await flush();

    expect(pageEditorState.listPageRevisions).toHaveBeenCalled();
    expect(view.container.textContent).toContain("revision-count:2");

    clickButton(view.container, "restore-revision");
    await flush();

    expect(pageEditorState.restorePageRevision).toHaveBeenCalledWith(
      "page-1",
      "rev-published"
    );
    expect(view.container.textContent).toContain("Restored Homepage");

    clickButton(view.container, "discard-revision");
    await flush();

    expect(pageEditorState.discardPageRevision).toHaveBeenCalledWith(
      "page-1",
      "rev-autosave"
    );
  } finally {
    view.cleanup();
  }
});

test("PageEditor emits save success toast only after the mutation resolves", async () => {
  const initialPage = createPage();
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);
  let resolveSave: ((value: PageDetail) => void) | null = null;
  pageEditorState.updatePage.mockImplementationOnce(
    async () =>
      new Promise<PageDetail>((resolve) => {
        resolveSave = resolve;
      })
  );

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();

    clickButton(view.container, "Save draft");
    await flush();

    expect(pageEditorToastState.success).not.toHaveBeenCalledWith("Draft saved.");

    await act(async () => {
      resolveSave?.(clonePage(initialPage));
      await Promise.resolve();
    });
    await flush();

    expect(pageEditorToastState.success).toHaveBeenCalledWith("Draft saved.");
  } finally {
    view.cleanup();
  }
});

test("PageEditor resolves page id from location and surfaces generic preview/template/revision/load failures", async () => {
  pageEditorState.reset();
  window.history.replaceState({}, "", "/admin/coderso/pages/page-2");
  pageEditorState.currentPage = createPage({ id: "page-2", title: "Fallback page" });
  pageEditorState.getPageCached.mockRejectedValueOnce(new Error("load-failed"));

  const loadingView = mount(<PageEditor />);

  try {
    await flush();
    expect(pageEditorState.getPageCached).toHaveBeenCalledWith("page-2", {
      force: true,
    });
    expect(loadingView.container.textContent).toContain("Page error");
    expect(loadingView.container.textContent).toContain("Failed to load page.");
  } finally {
    loadingView.cleanup();
  }

  pageEditorState.reset();
  const initialPage = createPage({ id: "page-1" });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);
  pageEditorState.previewPage.mockRejectedValueOnce(new Error("preview-failed"));
  pageEditorState.getPageTemplateOptions.mockRejectedValueOnce(new Error("templates-failed"));
  pageEditorState.listPageRevisions.mockRejectedValueOnce(new Error("history-failed"));

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();

    clickButton(view.container, "Runtime preview");
    await flush();
    expect(view.container.textContent).toContain("preview-error:Failed to generate preview.");

    clickButton(view.container, "Page settings");
    await flush();
    await flush();
    expect(pageEditorState.getPageTemplateOptions).toHaveBeenCalledTimes(1);

    clickButton(view.container, "History");
    await flush();
    await flush();
    expect(pageEditorState.listPageRevisions).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("PageEditor handles mobile library insert flows, applies page defaults, and ignores invalid non-page paths", async () => {
  pageEditorState.reset();
  const initialPage = createPage({
    id: "page-1",
    currentData: {
      blocks: [createBlock("hero")],
      settings: {
        layout: normalizePageLayoutSettings({
          wrapper: {
            container: "default",
            maxWidth: "5xl",
            padding: { top: "sm", bottom: "md" },
            background: {
              color: "#111827",
              media: {
                type: "video",
                source: "external",
                src: "https://cdn.test/page-bg.mp4",
              },
            },
          },
          sections: {
            defaults: {
              container: "narrow",
              padding: { top: "sm", bottom: "lg" },
              margin: { top: "xs", bottom: "md" },
            },
            gap: "lg",
          },
          applyDefaultsToNewBlocks: true,
        }),
      },
    },
  });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();
    expect(view.container.textContent).toContain("block-count:1");
    expect(
      view.container.querySelector('video[src="https://cdn.test/page-bg.mp4"]')
    ).not.toBeNull();

    clickButton(view.container, "Components");
    await flush();
    expect(view.container.textContent).toContain("sheet:left");

    clickButton(view.container, "add-widget", "last");
    await flush();
    expect(view.container.textContent).toContain("block-count:2");
    expect(view.container.textContent).toContain("block-types:hero,hero");
    expect(view.container.textContent).toContain("settings-layout:narrow:sm:lg:xs:md");
    expect(view.container.textContent).not.toContain("sheet:left");

    clickButton(view.container, "Components");
    await flush();
    clickButton(view.container, "add-template", "last");
    await flush();
    expect(view.container.textContent).toContain("block-count:3");
    expect(view.container.textContent).toContain("block-types:hero,hero,template-section");
    expect(view.container.textContent).toContain("settings-block:template-section");
    expect(view.container.textContent).not.toContain("sheet:left");

    clickButton(view.container, "Components");
    await flush();
    clickButton(view.container, "add-form", "last");
    await flush();
    expect(view.container.textContent).toContain("block-count:4");
    expect(view.container.textContent).toContain(
      "block-types:hero,hero,template-section,form-embed"
    );
    expect(view.container.textContent).toContain("settings-block:form-embed");
    expect(view.container.textContent).not.toContain("sheet:left");
  } finally {
    view.cleanup();
  }

  pageEditorState.reset();
  window.history.replaceState({}, "", "/admin/coderso/settings");
  const invalidPathView = mount(<PageEditor />);

  try {
    await flush();
    expect(pageEditorState.getPageCached).not.toHaveBeenCalled();
    expect(invalidPathView.container.textContent).toContain("Loading page...");
  } finally {
    invalidPathView.cleanup();
  }
});

test("PageEditor uses image background fallback, starts without selection for empty blocks, and falls back to default data on refresh/settings persistence", async () => {
  pageEditorState.reset();
  const initialPage = createPage({
    id: "page-1",
    currentData: {
      blocks: [],
      settings: {
        layout: normalizePageLayoutSettings({
          wrapper: {
            container: "default",
            maxWidth: "6xl",
            background: {
              color: "#f8fafc",
              image: "https://cdn.test/page-bg.png",
              media: {
                type: "image",
                source: "library",
              },
            },
          },
          sections: {
            defaults: {
              container: "default",
              padding: { top: "md", bottom: "md" },
              margin: { top: "none", bottom: "none" },
            },
            gap: "md",
          },
          applyDefaultsToNewBlocks: true,
        }),
      },
    },
  });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();

    expect(view.container.textContent).toContain("block-count:0");
    expect(view.container.textContent).toContain("selected-block:none");
    expect(view.container.textContent).toContain("settings-block:none");

    const backgroundShell = Array.from(view.container.querySelectorAll("div")).find(
      (candidate) =>
        candidate instanceof HTMLDivElement
        && candidate.style.backgroundImage.includes("page-bg.png")
    ) as HTMLDivElement | null | undefined;
    if (!backgroundShell) {
      throw new Error("Missing background shell");
    }

    expect(backgroundShell.style.backgroundImage).toContain("page-bg.png");
    expect(backgroundShell.style.backgroundSize).toBe("cover");
    expect(backgroundShell.style.backgroundPosition).toContain("center");

    pageEditorState.currentPage = {
      ...createPage({
        id: "page-1",
        title: "Fallback blocks page",
      }),
      currentData: undefined,
    } as unknown as PageDetail;
    act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    await flush();

    expect(view.container.textContent).toContain("Fallback blocks page");
    expect(view.container.textContent).toContain("block-count:2");
    expect(view.container.textContent).toContain("block-types:hero,compare-timeline");
    expect(view.container.textContent).toContain("settings-block:hero");

    clickButton(view.container, "Page settings");
    await flush();
    clickButton(view.container, "settings-save");
    await flush();

    const settingsSavePayload = (
      pageEditorState.updatePage.mock.calls as unknown as Array<
        [unknown, { data?: { blocks?: unknown[]; settings?: Record<string, unknown> } }]
      >
    ).at(-1)?.[1];
    if (!settingsSavePayload) throw new Error("missing_settings_save_payload");
    expect(settingsSavePayload.data?.blocks).toHaveLength(2);
    expect(settingsSavePayload.data?.settings).toMatchObject({
      template: "landing",
      showInNav: false,
      revisionRetention: 12,
    });

    clickButton(view.container, "Page settings");
    await flush();
    clickButton(view.container, "settings-autosave");
    await flush();

    const autosavePayload = (
      pageEditorState.autosavePage.mock.calls as unknown as Array<
        [unknown, { data?: { blocks?: unknown[]; settings?: Record<string, unknown> } }]
      >
    ).at(-1)?.[1];
    if (!autosavePayload) throw new Error("missing_settings_autosave_payload");
    expect(autosavePayload.data?.blocks).toHaveLength(2);
    expect(autosavePayload.data?.settings).toMatchObject({
      template: "landing",
      showInNav: true,
      revisionRetention: 15,
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor inserts into slots, mutates selected blocks, and warns before unload", async () => {
  pageEditorState.reset();
  const initialPage = createPage({
    id: "page-1",
    currentData: { blocks: [createBlock("hero"), createBlock("compare-timeline")] },
  });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();
    expect(view.container.textContent).toContain("block-count:2");
    expect(view.container.textContent).toContain("settings-block:hero");

    clickButton(view.container, "insert-into-hero-slot");
    await flush();

    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).toContain("block-count:2");
    expect(view.container.textContent).toContain("settings-block:compare-timeline");

    clickButton(view.container, "select-last-block");
    await flush();
    clickButton(view.container, "move-selected-into-hero-slot");
    await flush();

    expect(view.container.textContent).toContain("block-count:1");
    expect(view.container.textContent).toContain("settings-block:compare-timeline");

    clickButton(view.container, "mutate-selected-block");
    await flush();

    expect(view.container.textContent).toContain("settings-block:unknown-widget");
    expect(view.container.textContent).toContain("settings-widget:none");
    expect(
      Array.from(view.container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Details")
      )
    ).toHaveProperty("disabled", true);

    const beforeUnload = new Event("beforeunload", {
      cancelable: true,
    }) as BeforeUnloadEvent & { returnValue: string };
    beforeUnload.returnValue = "keep";

    act(() => {
      window.dispatchEvent(beforeUnload);
    });

    expect(beforeUnload.defaultPrevented).toBe(true);
    expect(beforeUnload.returnValue).toBe("");
  } finally {
    view.cleanup();
  }
});

test("PageEditor handles mobile details, no-page preview/settings guards, and non-api settings save failure", async () => {
  pageEditorState.reset();
  const initialPage = createPage({
    id: "page-1",
    currentData: { blocks: [createBlock("hero"), createBlock("compare-timeline")] },
  });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);
  pageEditorState.updatePage.mockRejectedValueOnce(new Error("settings-boom"));

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();
    expect(view.container.textContent).toContain("settings-block:hero");

    clickButton(view.container, "select-last-block");
    await flush();
    expect(view.container.textContent).toContain("settings-block:compare-timeline");

    clickButton(view.container, "Details");
    await flush();
    expect(view.container.textContent).toContain("sheet:right");

    clickButton(view.container, "Page settings");
    await flush();
    clickButton(view.container, "settings-save");
    await flush();
    expect(view.container.textContent).toContain("Page settings error");
    expect(view.container.textContent).toContain("Failed to update page settings.");
  } finally {
    view.cleanup();
  }

  pageEditorState.reset();
  window.history.replaceState({}, "", "/admin/coderso/pages");
  const noPageView = mount(<PageEditor />);

  try {
    await flush();
    clickButton(noPageView.container, "Runtime preview");
    await flush();
    expect(pageEditorState.previewPage).not.toHaveBeenCalled();
    expect(noPageView.container.textContent).toContain("Loading page...");
  } finally {
    noPageView.cleanup();
  }
});

test("PageEditor surfaces API client error messages across page, settings, and revision flows", async () => {
  pageEditorState.reset();
  const initialPage = createPage({ id: "page-1" });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();

    pageEditorState.getPageCached.mockRejectedValueOnce(apiError("Remote refresh denied"));
    act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    await flush();
    expect(view.container.textContent).toContain("Page error");
    expect(view.container.textContent).toContain("Remote refresh denied");

    pageEditorState.previewPage.mockRejectedValueOnce(apiError("Preview denied"));
    clickButton(view.container, "Runtime preview");
    await flush();
    expect(view.container.textContent).toContain("preview-error:Preview denied");

    pageEditorState.updatePage.mockRejectedValueOnce(apiError("Draft denied"));
    clickButton(view.container, "Save draft");
    await flush();
    expect(view.container.textContent).toContain("Draft denied");
    expect(pageEditorToastState.error).toHaveBeenCalledWith("Draft denied");

    pageEditorState.publishPage.mockRejectedValueOnce(apiError("Publish denied"));
    clickButton(view.container, "Publish");
    await flush();
    expect(view.container.textContent).toContain("Publish denied");
    expect(pageEditorToastState.error).toHaveBeenCalledWith("Publish denied");

    clickButton(view.container, "Page settings");
    await flush();
    await flush();
    expect(pageEditorState.getPageTemplateOptions).toHaveBeenCalledTimes(1);

    pageEditorState.updatePage.mockRejectedValueOnce(apiError("Settings denied"));
    clickButton(view.container, "settings-save");
    await flush();
    expect(view.container.textContent).toContain("Page settings error");
    expect(view.container.textContent).toContain("Settings denied");

    pageEditorState.listPageRevisions.mockImplementationOnce(async () => {
      throw apiError("History denied");
    });
    clickButton(view.container, "History");
    await flush();
    await flush();
    expect(view.container.textContent).toContain("revision-error:History denied");

    pageEditorState.restorePageRevision.mockRejectedValueOnce(apiError("Restore denied"));
    clickButton(view.container, "restore-revision");
    await flush();
    expect(view.container.textContent).toContain("revision-error:Restore denied");

    pageEditorState.discardPageRevision.mockRejectedValueOnce(apiError("Discard denied"));
    clickButton(view.container, "discard-revision");
    await flush();
    expect(view.container.textContent).toContain("revision-error:Discard denied");
  } finally {
    view.cleanup();
  }
});

test("PageEditor duplicates and deletes selected blocks with selection fallback", async () => {
  pageEditorState.reset();
  const initialPage = createPage({
    id: "page-1",
    currentData: { blocks: [createBlock("hero"), createBlock("compare-timeline")] },
  });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();
    expect(view.container.textContent).toContain("block-count:2");
    expect(view.container.textContent).toContain("settings-block:hero");

    clickButton(view.container, "select-last-block");
    await flush();
    expect(view.container.textContent).toContain("settings-block:compare-timeline");

    clickButton(view.container, "duplicate-selected-block");
    await flush();
    expect(view.container.textContent).toContain("block-count:3");

    clickButton(view.container, "delete-selected-block");
    await flush();
    expect(view.container.textContent).toContain("block-count:2");
    expect(view.container.textContent).toContain("settings-block:hero");

    clickButton(view.container, "delete-missing-block");
    await flush();
    expect(view.container.textContent).toContain("block-count:2");
  } finally {
    view.cleanup();
  }
});

test("PageEditor clears unsaved and remote-update flags when publish completes without refreshed data", async () => {
  pageEditorState.reset();
  const initialPage = createPage({
    id: "page-1",
    currentData: { blocks: [createBlock("hero")] },
  });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();

    clickButton(view.container, "add-widget");
    await flush();
    expect(view.container.textContent).toContain("Unsaved changes");

    pageEditorState.currentPage = createPage({
      id: "page-1",
      title: "Remote Homepage",
      currentData: { blocks: [createBlock("hero")] },
    });
    act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    await flush();
    expect(view.container.textContent).toContain("Updated in another tab");

    pageEditorState.getPageCached.mockResolvedValueOnce(null);
    clickButton(view.container, "Publish");
    await flush();

    expect(pageEditorState.publishPage).toHaveBeenCalledWith(
      "page-1",
      expect.objectContaining({
        blocks: expect.any(Array),
      })
    );
    expect(view.container.textContent).not.toContain("Unsaved changes");
    expect(view.container.textContent).not.toContain("Updated in another tab");
  } finally {
    view.cleanup();
  }
});

test("PageEditor reorders blocks and ignores invalid move targets", async () => {
  pageEditorState.reset();
  const initialPage = createPage({
    id: "page-1",
    currentData: { blocks: [createBlock("hero"), createBlock("compare-timeline")] },
  });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();
    expect(view.container.textContent).toContain("block-types:hero,compare-timeline");

    clickButton(view.container, "move-first-block-down");
    await flush();
    expect(view.container.textContent).toContain("block-types:compare-timeline,hero");

    clickButton(view.container, "invalid-move-block");
    await flush();
    expect(view.container.textContent).toContain("block-types:compare-timeline,hero");
  } finally {
    view.cleanup();
  }
});

test("PageEditor reports generic autosave-settings and discard-revision failures", async () => {
  pageEditorState.reset();
  const initialPage = createPage({ id: "page-1" });
  pageEditorState.cachedPage = initialPage;
  pageEditorState.currentPage = clonePage(initialPage);
  pageEditorState.autosavePage.mockRejectedValueOnce(new Error("autosave-failed"));
  pageEditorState.discardPageRevision.mockRejectedValueOnce(new Error("discard-failed"));

  const view = mount(<PageEditor pageId="page-1" initialPage={initialPage} />);

  try {
    await flush();

    clickButton(view.container, "Page settings");
    await flush();
    clickButton(view.container, "settings-autosave");
    await flush();

    expect(view.container.textContent).toContain("Page settings error");
    expect(view.container.textContent).toContain("Failed to autosave page settings.");

    clickButton(view.container, "History");
    await flush();
    clickButton(view.container, "discard-revision");
    await flush();

    expect(view.container.textContent).toContain("revision-error:Failed to discard autosave.");
  } finally {
    view.cleanup();
  }
});
