// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import type { PageDetail, PageRevision } from "../../../core/admin/services/pagesClient";

const pageEditorState = vi.hoisted(() => {
  const state = {
    cachedPage: null as PageDetail | null,
    currentPage: null as PageDetail | null,
    revisions: [] as PageRevision[],
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
    updatePage: vi.fn(async (_id: string, payload: { data?: Record<string, unknown> }) => ({
      ...(state.currentPage as PageDetail),
      currentData: payload.data ?? state.currentPage?.currentData ?? { blocks: [] },
    })),
    publishPage: vi.fn(async () => ({ ok: true })),
    autosavePage: vi.fn(async () => undefined),
    restorePageRevision: vi.fn(async () => undefined),
    discardPageRevision: vi.fn(async () => undefined),
    subscribeCacheEvents: vi.fn(() => () => undefined),
    reset() {
      state.cachedPage = null;
      state.currentPage = null;
      state.revisions = [];
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

const previewBridgeState = vi.hoisted(() => ({
  readyPayloadByType: {
    "posts-feed": {
      resolved: {
        items: [
          {
            id: "post-1",
            title: "Launch note",
            href: "/news/launch-note",
          },
        ],
        total: 1,
        sourceMode: "latest",
        listPath: "/news",
        resolvedAt: "2026-03-08T10:05:00.000Z",
      },
    },
    "product-compare": {
      resolved: {
        rows: [
          {
            id: "product-1",
            title: "Starter Home",
            slug: "starter-home",
            excerpt: "Compact modern home.",
            productHref: "/products/starter-home",
            imageUrl: "/media/starter-home.jpg",
            imageAlt: "Starter Home hero",
            priceAmount: 120000,
            currency: "USD",
            compareAtAmount: null,
            stockState: "in_stock",
            stockQuantity: 3,
          },
        ],
        total: 1,
        resolvedAt: "2026-05-19T12:00:00.000Z",
      },
    },
  },
  blockListPreviewMap: {} as Record<string, { status: string } | undefined>,
  reset() {
    previewBridgeState.blockListPreviewMap = {};
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
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
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
    leftPanel,
    rightPanel,
    children,
  }: {
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{leftPanel}</div>
      <div>{rightPanel}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: pageEditorState.subscribeCacheEvents,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: () => null,
}));

vi.mock("../../../core/admin/ui/pages/PageSettingsDrawer", () => ({
  PageSettingsDrawer: () => null,
}));

vi.mock("../../../core/admin/ui/pages/PageRevisionDrawer", () => ({
  PageRevisionDrawer: () => null,
}));

vi.mock("../../../core/admin/ui/pages/builder/LibraryPanel", () => ({
  LibraryPanel: () => <div>library</div>,
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockList", () => ({
  BlockList: ({
    blocks,
    previewStatesByBlockId,
  }: {
    blocks: Array<{ id: string; type: string }>;
    previewStatesByBlockId?: Record<string, { status: string } | undefined>;
  }) => {
    previewBridgeState.blockListPreviewMap = previewStatesByBlockId ?? {};
    return (
      <div>
        {blocks.map((block) => (
          <span
            key={block.id}
          >{`block:${block.id}:${previewStatesByBlockId?.[block.id]?.status ?? "none"}`}</span>
        ))}
      </div>
    );
  },
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockSettings", () => ({
  BlockSettings: ({
    block,
    editorContext,
  }: {
    block?: { id: string; type: string } | null;
    editorContext?: {
      previewState?: { status: string } | null;
      setPreviewState?:
        | ((state: { status: "ready"; dataPatch: Record<string, unknown> }) => void)
        | undefined;
    };
  }) => {
    React.useEffect(() => {
      if (
        !block?.type ||
        !previewBridgeState.readyPayloadByType[
          block.type as keyof typeof previewBridgeState.readyPayloadByType
        ] ||
        !editorContext?.setPreviewState ||
        editorContext.previewState?.status === "ready"
      ) {
        return;
      }
      editorContext.setPreviewState({
        status: "ready",
        dataPatch:
          previewBridgeState.readyPayloadByType[
            block.type as keyof typeof previewBridgeState.readyPayloadByType
          ],
      });
    }, [
      block?.id,
      block?.type,
      editorContext?.previewState?.status,
      editorContext?.setPreviewState,
    ]);

    return (
      <div>{`settings:${block?.id ?? "none"}:${editorContext?.previewState?.status ?? "idle"}`}</div>
    );
  },
}));

vi.mock("../../../core/admin/ui/pages/builder/widgetRegistry", () => ({
  getWidgetRegistry: () => [
    {
      type: "posts-feed",
      title: "Posts Feed",
      description: "Posts feed block",
      category: "content",
    },
    {
      type: "product-compare",
      title: "Product Compare",
      description: "Product compare block",
      category: "content",
      editorCapabilities: {
        supportsPreviewState: true,
      },
    },
  ],
}));

vi.mock("../../../core/widgets/validator", () => ({
  normalizeWidgetBlock: <T,>(block: T) => block,
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: () => undefined,
  setActiveAssistantSurfaceContext: () => undefined,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const createPage = (overrides: Partial<PageDetail> = {}): PageDetail => ({
  id: "page-1",
  title: "Homepage",
  slug: "homepage",
  status: "draft",
  currentData: {
    blocks: [
      {
        id: "posts-feed-1",
        type: "posts-feed",
        variant: "cards",
        data: {
          source: {
            mode: "latest",
            limit: 1,
            sort: "published-desc",
          },
        },
      },
    ],
  },
  updatedAt: "2026-03-08T09:00:00.000Z",
  ...overrides,
});

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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickButtonByLabel = async (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );

  expect(button).toBeTruthy();

  await React.act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
};

beforeEach(() => {
  pageEditorState.reset();
  previewBridgeState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("PageEditor routes posts-feed preview state through editor context and preview block map", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(view.container.textContent).toContain("settings:posts-feed-1:ready");
    expect(view.container.textContent).toContain("block:posts-feed-1:ready");
    expect(previewBridgeState.blockListPreviewMap["posts-feed-1"]?.status).toBe("ready");
  } finally {
    view.cleanup();
  }
});

test("PageEditor routes product-compare preview state through widget capability without shell allowlist", async () => {
  pageEditorState.cachedPage = createPage({
    currentData: {
      blocks: [
        {
          id: "product-compare-1",
          type: "product-compare",
          variant: "matrix",
          data: {
            source: {
              limit: 1,
            },
          },
        },
      ],
    },
  });
  pageEditorState.currentPage = createPage({
    currentData: {
      blocks: [
        {
          id: "product-compare-1",
          type: "product-compare",
          variant: "matrix",
          data: {
            source: {
              limit: 1,
            },
          },
        },
      ],
    },
  });

  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(view.container.textContent).toContain("settings:product-compare-1:ready");
    expect(view.container.textContent).toContain("block:product-compare-1:ready");
    expect(previewBridgeState.blockListPreviewMap["product-compare-1"]?.status).toBe("ready");
  } finally {
    view.cleanup();
  }
});

test("PageEditor does not persist posts-feed preview-only resolved data on save or publish", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(view.container.textContent).toContain("settings:posts-feed-1:ready");

    await clickButtonByLabel(view.container, "Save draft");
    await flush();

    const savedData = pageEditorState.updatePage.mock.calls[0]?.[1]?.data as
      | { blocks?: Array<{ id: string; data?: Record<string, unknown> }> }
      | undefined;
    const savedPostsFeedBlock = savedData?.blocks?.find((block) => block.id === "posts-feed-1");
    expect(savedPostsFeedBlock?.data).not.toHaveProperty("resolved");

    await clickButtonByLabel(view.container, "Publish");
    await flush();

    const publishCall = pageEditorState.publishPage.mock.calls[0] as unknown as
      | [string, { blocks?: Array<{ id: string; data?: Record<string, unknown> }> }]
      | undefined;
    const publishedData = publishCall?.[1];
    const publishedPostsFeedBlock = publishedData?.blocks?.find(
      (block) => block.id === "posts-feed-1"
    );
    expect(publishedPostsFeedBlock?.data).not.toHaveProperty("resolved");
  } finally {
    view.cleanup();
  }
});
