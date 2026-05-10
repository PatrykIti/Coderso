// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import type {
  DetailPageRecord,
  DetailPageRevisionSummary,
} from "../../../core/admin/services/detailPagesClient";
import type { EntrySummary } from "../../../core/admin/services/entriesClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";

type CacheEvent = {
  key: string;
  action: "invalidate" | "update";
};

const detailTemplateState = vi.hoisted(() => {
  const state = {
    cachedRecord: null as DetailPageRecord | null,
    remoteRecord: null as DetailPageRecord | null,
    entries: [] as EntrySummary[],
    revisions: [] as DetailPageRevisionSummary[],
    cacheListener: null as ((event: CacheEvent) => void) | null,
    getCachedDetailPage: vi.fn((id: string) =>
      state.cachedRecord?.id === id ? state.cachedRecord : null
    ),
    getDetailPageCached: vi.fn(async (id: string) => {
      if (state.remoteRecord?.id === id) return state.remoteRecord;
      throw new Error("detail_page_not_found");
    }),
    updateDetailPage: vi.fn(async (id: string, document: DetailPageDocument) => {
      if (!state.remoteRecord || state.remoteRecord.id !== id) {
        throw new Error("detail_page_not_found");
      }
      const updated: DetailPageRecord = {
        ...state.remoteRecord,
        name: document.name,
        status: document.status,
        currentDocument: document,
        updatedAt: "2026-05-10T12:00:00.000Z",
      };
      state.cachedRecord = updated;
      state.remoteRecord = updated;
      return updated;
    }),
    autosaveDetailPage: vi.fn(async () => ({
      savedAt: "2026-05-10T12:01:00.000Z",
      reusedRevision: false,
      revision: state.revisions[0]!,
    })),
    previewDetailPage: vi.fn(async () => ({
      token: "detail-preview-token",
      previewUrl: "/preview?type=detail-page&token=detail-preview-token",
      expiresAt: "2026-05-10T12:30:00.000Z",
    })),
    publishDetailPage: vi.fn(async (id: string) => {
      if (!state.remoteRecord || state.remoteRecord.id !== id) {
        throw new Error("detail_page_not_found");
      }
      const nextDocument = { ...state.remoteRecord.currentDocument, status: "published" as const };
      state.remoteRecord = {
        ...state.remoteRecord,
        status: "published",
        currentDocument: nextDocument,
        updatedAt: "2026-05-10T12:02:00.000Z",
        publishedAt: "2026-05-10T12:02:00.000Z",
      };
      state.cachedRecord = state.remoteRecord;
      return { ok: true };
    }),
    unpublishDetailPage: vi.fn(async (id: string) => {
      if (!state.remoteRecord || state.remoteRecord.id !== id) {
        throw new Error("detail_page_not_found");
      }
      const nextDocument = { ...state.remoteRecord.currentDocument, status: "draft" as const };
      state.remoteRecord = {
        ...state.remoteRecord,
        status: "draft",
        currentDocument: nextDocument,
        updatedAt: "2026-05-10T12:03:00.000Z",
        publishedAt: null,
      };
      state.cachedRecord = state.remoteRecord;
      return { ok: true };
    }),
    listDetailPageRevisions: vi.fn(async () => state.revisions),
    restoreDetailPageRevision: vi.fn(async (id: string, revisionId: string) => {
      if (!state.remoteRecord || state.remoteRecord.id !== id) {
        throw new Error("detail_page_not_found");
      }
      state.remoteRecord = {
        ...state.remoteRecord,
        name: "Restored detail template",
        currentDocument: {
          ...state.remoteRecord.currentDocument,
          name: "Restored detail template",
        },
        updatedAt: "2026-05-10T12:04:00.000Z",
      };
      state.cachedRecord = state.remoteRecord;
      return {
        ok: true,
        restored: true,
        revision: state.revisions.find((item) => item.id === revisionId) ?? state.revisions[0]!,
        detailPage: {
          id,
          contentTypeId: state.remoteRecord.contentTypeId,
          name: state.remoteRecord.name,
          status: state.remoteRecord.status,
          updatedAt: state.remoteRecord.updatedAt,
          publishedAt: state.remoteRecord.publishedAt,
        },
      };
    }),
    discardDetailPageRevision: vi.fn(async () => ({ ok: true })),
    getCachedEntries: vi.fn(() => state.entries),
    listEntriesCached: vi.fn(async () => state.entries),
    subscribeCacheEvents: vi.fn((listener: (event: CacheEvent) => void) => {
      state.cacheListener = listener;
      return () => {
        if (state.cacheListener === listener) state.cacheListener = null;
      };
    }),
    triggerCacheEvent(key: string) {
      state.cacheListener?.({ key, action: "update" });
    },
    reset() {
      state.cachedRecord = null;
      state.remoteRecord = null;
      state.entries = [];
      state.revisions = [];
      state.cacheListener = null;
      state.getCachedDetailPage.mockClear();
      state.getDetailPageCached.mockClear();
      state.updateDetailPage.mockClear();
      state.autosaveDetailPage.mockClear();
      state.previewDetailPage.mockClear();
      state.publishDetailPage.mockClear();
      state.unpublishDetailPage.mockClear();
      state.listDetailPageRevisions.mockClear();
      state.restoreDetailPageRevision.mockClear();
      state.discardDetailPageRevision.mockClear();
      state.getCachedEntries.mockClear();
      state.listEntriesCached.mockClear();
      state.subscribeCacheEvents.mockClear();
    },
  };
  return state;
});

vi.mock("@/services/detailPagesClient", () => ({
  autosaveDetailPage: detailTemplateState.autosaveDetailPage,
  discardDetailPageRevision: detailTemplateState.discardDetailPageRevision,
  getCachedDetailPage: detailTemplateState.getCachedDetailPage,
  getDetailPageCached: detailTemplateState.getDetailPageCached,
  listDetailPageRevisions: detailTemplateState.listDetailPageRevisions,
  previewDetailPage: detailTemplateState.previewDetailPage,
  publishDetailPage: detailTemplateState.publishDetailPage,
  restoreDetailPageRevision: detailTemplateState.restoreDetailPageRevision,
  unpublishDetailPage: detailTemplateState.unpublishDetailPage,
  updateDetailPage: detailTemplateState.updateDetailPage,
}));

vi.mock("@/services/entriesClient", () => ({
  getCachedEntries: detailTemplateState.getCachedEntries,
  listEntriesCached: detailTemplateState.listEntriesCached,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: detailTemplateState.subscribeCacheEvents,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    activeHref,
    breadcrumbs,
    leftPanel,
    rightPanel,
    children,
  }: {
    activeHref?: string;
    breadcrumbs?: React.ReactNode;
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-active-href={activeHref}>
      <div>{breadcrumbs}</div>
      <aside>{leftPanel}</aside>
      <aside>{rightPanel}</aside>
      <main>{children}</main>
    </div>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({
    open,
    previewUrl,
    error,
  }: {
    open: boolean;
    previewUrl: string | null;
    error: string | null;
  }) =>
    open ? (
      <div>
        <span>{`preview-url:${previewUrl ?? "none"}`}</span>
        <span>{`preview-error:${error ?? "none"}`}</span>
      </div>
    ) : null,
}));

vi.mock("@/ui/pages/builder/BlockList", () => ({
  BlockList: ({
    blocks,
    selectedId,
    onSelect,
    onDuplicate,
    onDelete,
  }: {
    blocks: Array<{ id: string; type: string }>;
    selectedId?: string | null;
    onSelect: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <span>{`block-count:${blocks.length}`}</span>
      <span>{`block-types:${blocks.map((block) => block.type).join(",")}`}</span>
      <span>{`selected-block:${selectedId ?? "none"}`}</span>
      <button type="button" onClick={() => onSelect(blocks[0]?.id ?? "missing")}>
        select-first-block
      </button>
      <button type="button" onClick={() => onDuplicate(blocks[0]?.id ?? "missing")}>
        duplicate-first-block
      </button>
      <button type="button" onClick={() => onDelete(blocks[0]?.id ?? "missing")}>
        delete-first-block
      </button>
    </div>
  ),
}));

vi.mock("@/ui/pages/builder/BlockSettings", () => ({
  BlockSettings: ({
    block,
    widget,
    onChange,
  }: {
    block?: { id: string; type: string } | null;
    widget?: { type: string } | null;
    onChange: (next: { id: string; type: string }) => void;
  }) => (
    <div>
      <span>{`settings-block:${block?.type ?? "none"}`}</span>
      <span>{`settings-widget:${widget?.type ?? "none"}`}</span>
      <button
        type="button"
        onClick={() => {
          if (!block) return;
          onChange({ ...block, type: "compare-timeline" });
        }}
      >
        mutate-selected-block
      </button>
    </div>
  ),
}));

vi.mock("@/ui/pages/builder/LibraryPanel", () => ({
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
      <button type="button" onClick={() => onAddTemplate({ id: "tpl-1", name: "Template" })}>
        add-template
      </button>
      <button type="button" onClick={() => onAddForm({ id: "form-1", name: "Lead Form" })}>
        add-form
      </button>
    </div>
  ),
}));

vi.mock("@/ui/pages/builder/widgetRegistry", () => ({
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

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import {
  clearActiveAssistantSurfaceContext,
  getActiveAssistantSurfaceContext,
} from "../../../core/admin/ui/assistant/activeSurfaceContext";
import { DetailTemplateEditorPage } from "../../../core/admin/ui/content-types/DetailTemplateEditorPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const layout = {
  wrapper: {
    container: "full",
    padding: { top: "none", bottom: "none" },
    background: {
      color: "transparent",
      image: null,
      media: { type: "none", source: "external", src: null },
    },
  },
  sections: {
    gap: "none",
    defaults: {
      container: "default",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "none", bottom: "none" },
    },
  },
  applyDefaultsToNewBlocks: false,
} satisfies DetailPageDocument["settings"]["layout"];

const createDocument = (overrides: Partial<DetailPageDocument> = {}): DetailPageDocument => ({
  schemaVersion: 1,
  id: "detail-products",
  name: "Product detail template",
  contentTypeId: "ct-products",
  contentTypeSlug: "products",
  status: "draft",
  titlePattern: "{title}",
  settings: {
    template: "detail",
    layout,
  },
  blocks: [
    {
      id: "block-hero",
      type: "hero",
      data: { headline: "Product" },
      editor: { mode: "visual", wizardCompleted: true },
    },
  ],
  bindings: [],
  ...overrides,
});

const createRecord = (overrides: Partial<DetailPageRecord> = {}): DetailPageRecord => {
  const currentDocument =
    overrides.currentDocument ??
    createDocument({
      status: overrides.status ?? "draft",
    });
  return {
    id: "detail-products",
    contentTypeId: "ct-products",
    contentTypeSlug: "products",
    name: currentDocument.name,
    status: currentDocument.status,
    currentDocument,
    publishedDocument: null,
    createdAt: "2026-05-10T10:00:00.000Z",
    updatedAt: "2026-05-10T10:00:00.000Z",
    publishedAt: null,
    authorId: null,
    ...overrides,
  };
};

const createEntry = (overrides: Partial<EntrySummary> = {}): EntrySummary => ({
  id: "entry-product-1",
  typeId: "ct-products",
  title: "Sample Product",
  slug: "sample-product",
  status: "published",
  data: {},
  createdAt: "2026-05-10T10:00:00.000Z",
  updatedAt: "2026-05-10T10:00:00.000Z",
  ...overrides,
});

const createRevision = (
  overrides: Partial<DetailPageRevisionSummary> = {}
): DetailPageRevisionSummary => ({
  id: "rev-1",
  detailPageId: "detail-products",
  version: 1,
  kind: "publish",
  createdAt: "2026-05-10T10:00:00.000Z",
  createdBy: null,
  ...overrides,
});

beforeEach(() => {
  clearActiveAssistantSurfaceContext();
  detailTemplateState.reset();
  detailTemplateState.cachedRecord = createRecord();
  detailTemplateState.remoteRecord = createRecord();
  detailTemplateState.entries = [createEntry()];
  detailTemplateState.revisions = [
    createRevision({ id: "rev-published", kind: "publish" }),
    createRevision({ id: "rev-autosave", kind: "autosave", version: 0 }),
  ];
});

const mount = (path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <DetailTemplateEditorPage />
      </AdminRouterProvider>
    );
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

const clickButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

test("detail template editor hydrates cached detail page and bounded sample entries", async () => {
  const view = mount(
    "/admin/advanced/engine/ct-products/collection/detail-template/detail-products"
  );

  try {
    expect(view.container.textContent).toContain("Product detail template");
    expect(view.container.textContent).toContain("/products");
    expect(view.container.textContent).toContain("block-count:1");
    expect(view.container.textContent).toContain("settings-block:hero");
    await flush();

    expect(
      view.container.querySelector("[data-active-href]")?.getAttribute("data-active-href")
    ).toBe("/admin/advanced/engine");
    expect(detailTemplateState.getDetailPageCached).toHaveBeenCalledWith("detail-products", {
      force: true,
    });
    expect(detailTemplateState.listEntriesCached).toHaveBeenCalledWith("products");
    expect(getActiveAssistantSurfaceContext()).toMatchObject({
      kind: "detail-page",
      detailPage: {
        id: "detail-products",
        contentTypeId: "ct-products",
        contentTypeSlug: "products",
      },
      sampleEntryId: "entry-product-1",
      selectedBlockId: "block-hero",
    });
  } finally {
    view.cleanup();
  }
});

test("detail template editor saves shared builder blocks and previews with selected entry", async () => {
  const view = mount(
    "/admin/advanced/engine/ct-products/collection/detail-template/detail-products"
  );

  try {
    await flush();
    clickButton(view.container, "add-widget");
    expect(view.container.textContent).toContain("block-count:2");

    clickButton(view.container, "Save draft");
    await flush();
    const savedDocument = detailTemplateState.updateDetailPage.mock.calls.at(-1)?.[1];
    expect(savedDocument?.blocks).toHaveLength(2);

    clickButton(view.container, "Preview");
    await flush();
    expect(detailTemplateState.previewDetailPage).toHaveBeenCalledWith("detail-products", {
      sampleEntryId: "entry-product-1",
      ttlMinutes: 30,
    });
    expect(view.container.textContent).toContain(
      "preview-url:/preview?type=detail-page&token=detail-preview-token"
    );
  } finally {
    view.cleanup();
  }
});

test("detail template editor publishes through detail pages lifecycle", async () => {
  const view = mount(
    "/admin/advanced/engine/ct-products/collection/detail-template/detail-products"
  );

  try {
    await flush();
    clickButton(view.container, "add-template");
    clickButton(view.container, "Publish");
    await flush();

    expect(detailTemplateState.updateDetailPage).toHaveBeenCalled();
    expect(detailTemplateState.publishDetailPage).toHaveBeenCalledWith(
      "detail-products",
      "ct-products"
    );
    expect(view.container.textContent).toContain("Published");
  } finally {
    view.cleanup();
  }
});

test("detail template editor keeps unsaved edits when cache bus reports remote changes", async () => {
  const view = mount(
    "/admin/advanced/engine/ct-products/collection/detail-template/detail-products"
  );

  try {
    await flush();
    clickButton(view.container, "add-widget");
    React.act(() => {
      detailTemplateState.triggerCacheEvent(cacheKeys.detailPageDetail("detail-products"));
    });

    expect(view.container.textContent).toContain("Template changed");
    expect(view.container.textContent).toContain("New changes are available.");
  } finally {
    view.cleanup();
  }
});

test("detail template editor loads revisions and wires restore and discard actions", async () => {
  const view = mount(
    "/admin/advanced/engine/ct-products/collection/detail-template/detail-products"
  );

  try {
    await flush();
    clickButton(view.container, "History");
    await flush();
    expect(detailTemplateState.listDetailPageRevisions).toHaveBeenCalledWith("detail-products");
    expect(view.container.textContent).toContain("Version 1");
    expect(view.container.textContent).toContain("Draft version");

    clickButton(view.container, "Restore");
    await flush();
    expect(detailTemplateState.restoreDetailPageRevision).toHaveBeenCalledWith(
      "detail-products",
      "rev-published",
      "ct-products"
    );

    clickButton(view.container, "Discard");
    await flush();
    expect(detailTemplateState.discardDetailPageRevision).toHaveBeenCalledWith(
      "detail-products",
      "rev-autosave"
    );
  } finally {
    view.cleanup();
  }
});
