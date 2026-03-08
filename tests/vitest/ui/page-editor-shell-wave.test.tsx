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
    isLoading,
    error,
    device,
  }: {
    open: boolean;
    previewUrl: string | null;
    isLoading: boolean;
    error: string | null;
    device: string;
  }) =>
    open ? (
      <div>
        <span>{`preview-url:${previewUrl ?? "none"}`}</span>
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
  }: {
    blocks: Array<{ id: string; type: string }>;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
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
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockSettings", () => ({
  BlockSettings: ({
    block,
    widget,
  }: {
    block?: { id: string; type: string } | null;
    widget?: { type: string } | null;
  }) => (
    <div>
      <span>{`settings-block:${block?.type ?? "none"}`}</span>
      <span>{`settings-widget:${widget?.type ?? "none"}`}</span>
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
    onRestore,
    onDiscard,
  }: {
    open: boolean;
    revisions: Array<{ id: string }>;
    onRestore: (id: string) => void;
    onDiscard: (id: string) => void;
  }) =>
    open ? (
      <div>
        <span>{`revision-count:${revisions.length}`}</span>
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
    onSave,
    onAutosave,
  }: {
    open: boolean;
    templateOptions: Array<{ key: string; label: string }> | null;
    templateOptionsLoading: boolean;
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

const clickButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );

  if (!button) {
    throw new Error(`Missing button: ${label}`);
  }

  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

beforeEach(() => {
  pageEditorState.reset();
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

    expect(pageEditorState.previewPage).toHaveBeenCalledWith("page-1");
    expect(view.container.textContent).toContain("preview-url:https://preview.test/page-1");
    expect(view.container.textContent).toContain("preview-device:tablet");

    clickButton(view.container, "Save draft");
    await flush();

    const draftPayload = pageEditorState.updatePage.mock.calls[0]?.[1] as {
      data: { blocks: unknown[] };
    };
    expect(draftPayload.data.blocks).toHaveLength(2);

    clickButton(view.container, "Publish");
    await flush();

    expect(pageEditorState.publishPage).toHaveBeenCalledWith(
      "page-1",
      expect.objectContaining({
        blocks: expect.any(Array),
      })
    );
    expect(view.container.textContent).toContain("Published");

    clickButton(view.container, "Page settings");
    await flush();

    expect(pageEditorState.getPageTemplateOptions).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("template-options-loading:true");

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
