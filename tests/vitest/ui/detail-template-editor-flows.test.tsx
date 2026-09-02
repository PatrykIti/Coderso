// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import type {
  DetailPageRecord,
  DetailPageRevisionSummary,
} from "../../../core/admin/services/detailPagesClient";
import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import type { EntrySummary } from "../../../core/admin/services/entriesClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

type CacheEvent = {
  key: string;
  action: "invalidate" | "update";
};

const detailTemplateState = vi.hoisted(() => {
  const state = {
    cachedRecord: null as DetailPageRecord | null,
    remoteRecord: null as DetailPageRecord | null,
    contentTypes: [] as ContentTypeSummary[],
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
    getCachedContentTypes: vi.fn(() => state.contentTypes),
    listContentTypesCached: vi.fn(async () => state.contentTypes),
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
      state.contentTypes = [];
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
      state.getCachedContentTypes.mockClear();
      state.listContentTypesCached.mockClear();
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

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: detailTemplateState.getCachedContentTypes,
  listContentTypesCached: detailTemplateState.listContentTypesCached,
}));

vi.mock("@/services/formsClient", () => ({
  getCachedForms: () => null,
}));

vi.mock("@/services/listingsClient", () => ({
  getCachedListingQueries: () => null,
  getCachedListingTemplates: () => null,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: detailTemplateState.subscribeCacheEvents,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, disabled: _disabled, ...props }: React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
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
    topbarActions,
    children,
  }: {
    activeHref?: string;
    breadcrumbs?: React.ReactNode;
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    topbarActions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-active-href={activeHref}>
      <div>{breadcrumbs}</div>
      <div>{topbarActions}</div>
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

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode; value: string }) => (
    <div>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode; value: string }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  };
});

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
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

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearActiveAssistantSurfaceContext } from "../../../core/admin/ui/assistant/activeSurfaceContext";
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

const createSection = (overrides: Partial<PageSectionV2> = {}): PageSectionV2 =>
  createPageSectionV2("hero", {
    id: "section-hero",
    name: "Hero section",
    variant: "centered",
    blocks: [
      createPageBlockV2("heading", {
        id: "block-heading",
        props: { text: "Product heading", level: "h2", align: "left" },
      }),
      createPageBlockV2("button", {
        id: "block-cta",
        props: {
          label: "Shop now",
          href: "/shop",
          target: "_self",
          variant: "primary",
          size: "md",
        },
      }),
    ],
    ...overrides,
  });

const createDocument = (overrides: Partial<DetailPageDocument> = {}): DetailPageDocument => ({
  schemaVersion: 2,
  id: "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
  name: "Product detail template",
  contentTypeId: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
  contentTypeSlug: "products",
  status: "draft",
  titlePattern: "{title}",
  settings: {
    template: "detail",
    layout,
  },
  sections: [createSection()],
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
    id: "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
    contentTypeId: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
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
  typeId: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
  title: "Sample Product",
  slug: "sample-product",
  status: "published",
  visibility: "public",
  hasPassword: false,
  data: {},
  createdAt: "2026-05-10T10:00:00.000Z",
  updatedAt: "2026-05-10T10:00:00.000Z",
  ...overrides,
});

const createContentType = (overrides: Partial<ContentTypeSummary> = {}): ContentTypeSummary => ({
  id: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
  name: "Products",
  slug: "products",
  status: "published",
  createdAt: "2026-05-10T10:00:00.000Z",
  updatedAt: "2026-05-10T10:00:00.000Z",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["headline"],
    properties: {
      headline: { type: "string", title: "Headline" },
      summary: { type: "string", title: "Summary" },
      coverImage: { type: "string", title: "Cover image", xFieldType: "media" },
    },
  },
  ...overrides,
});

const createRevision = (
  overrides: Partial<DetailPageRevisionSummary> = {}
): DetailPageRevisionSummary => ({
  id: "rev-1",
  detailPageId: "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
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
  detailTemplateState.contentTypes = [createContentType()];
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
  });
};

const deferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
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

const changeSelect = (container: HTMLElement, optionValue: string) => {
  const select = Array.from(container.querySelectorAll("select")).find((candidate) =>
    Array.from(candidate.options).some((option) => option.value === optionValue)
  );
  if (!select) throw new Error(`Missing select option: ${optionValue}`);
  React.act(() => {
    select.value = optionValue;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const changeInputByLabel = (container: HTMLElement, labelText: string, value: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((candidate) =>
    candidate.textContent?.includes(labelText)
  );
  const input = label?.querySelector<HTMLInputElement>("input");
  if (!input) throw new Error(`Missing input for label: ${labelText}`);
  React.act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

test("preview generates a runtime url for the selected sample entry", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    clickButton(view.container, "Preview");
    await flush();
    expect(detailTemplateState.previewDetailPage).toHaveBeenCalledWith(
      "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
      { sampleEntryId: "entry-product-1", ttlMinutes: 30 }
    );
    expect(view.container.textContent).toContain(
      "preview-url:/preview?type=detail-page&token=detail-preview-token"
    );
  } finally {
    view.cleanup();
  }
});

test("preview requires a selected sample entry", async () => {
  detailTemplateState.entries = [];
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    clickButton(view.container, "Preview");
    await flush();
    expect(detailTemplateState.previewDetailPage).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Select a sample entry before previewing");
  } finally {
    view.cleanup();
  }
});

test("preview surfaces an api error in the dialog", async () => {
  detailTemplateState.previewDetailPage.mockRejectedValueOnce({
    kind: "http_error",
    message: "preview boom",
  });
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    clickButton(view.container, "Preview");
    await flush();
    expect(view.container.textContent).toContain("preview-error:preview boom");
  } finally {
    view.cleanup();
  }
});

test("autosave posts the current draft document", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    clickButton(view.container, "Autosave");
    await flush();
    expect(detailTemplateState.autosaveDetailPage).toHaveBeenCalled();
    expect(detailTemplateState.listDetailPageRevisions).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("unpublish flips a published template back to draft", async () => {
  detailTemplateState.cachedRecord = createRecord({ status: "published" });
  detailTemplateState.remoteRecord = createRecord({ status: "published" });
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    expect(view.container.textContent).toContain("Published");
    clickButton(view.container, "Unpublish");
    await flush();
    expect(detailTemplateState.unpublishDetailPage).toHaveBeenCalled();
    expect(view.container.textContent).toContain("Draft");
  } finally {
    view.cleanup();
  }
});

test("sample entry load failure shows an inline error", async () => {
  detailTemplateState.listEntriesCached.mockRejectedValueOnce(new Error("entries offline"));
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    expect(view.container.textContent).toContain("Failed to load sample entries.");
  } finally {
    view.cleanup();
  }
});

test("beforeunload guards unsaved drafts", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    const untouched = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(untouched);
    expect(untouched.defaultPrevented).toBe(false);

    changeInputByLabel(view.container, "Name", "Renamed template");
    expect(view.container.textContent).toContain("Unsaved changes");
    const guarded = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(guarded);
    expect(guarded.defaultPrevented).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("renders a missing id error when the route has no detail page id", async () => {
  const view = mount("/admin/advanced/engine");
  try {
    await flush();
    expect(view.container.textContent).toContain("Missing detail template id.");
  } finally {
    view.cleanup();
  }
});

test("shows a load error when the initial fetch fails", async () => {
  detailTemplateState.cachedRecord = null;
  detailTemplateState.remoteRecord = null;
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    expect(view.container.textContent).toContain("Failed to load detail template.");
  } finally {
    view.cleanup();
  }
});

test("edits name and title pattern from the template panel", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    changeInputByLabel(view.container, "Name", "Renamed template");
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).toContain("Renamed template");

    changeInputByLabel(view.container, "Title pattern", "{slug}");
    clickButton(view.container, "Save draft");
    await flush();
    expect(detailTemplateState.updateDetailPage).toHaveBeenCalled();
    const payload = detailTemplateState.updateDetailPage.mock.calls[0][1] as {
      name: string;
      titlePattern: string;
    };
    expect(payload.name).toBe("Renamed template");
    expect(payload.titlePattern).toBe("{slug}");
  } finally {
    view.cleanup();
  }
});

test("selects a different sample entry before previewing", async () => {
  detailTemplateState.entries = [
    createEntry({ id: "entry-a", title: "Alpha", slug: "alpha" }),
    createEntry({ id: "entry-b", title: "Beta", slug: "beta", status: "draft" }),
  ];
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    changeSelect(view.container, "entry-b");
    clickButton(view.container, "Preview");
    await flush();
    expect(detailTemplateState.previewDetailPage).toHaveBeenCalledWith(
      "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
      { sampleEntryId: "entry-b", ttlMinutes: 30 }
    );
  } finally {
    view.cleanup();
  }
});

test("shows a refresh error from a cache event", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    detailTemplateState.remoteRecord = null;
    React.act(() => {
      detailTemplateState.triggerCacheEvent(
        cacheKeys.detailPageDetail("6f9619ff-8b86-4a11-b42d-00c04fc964ff")
      );
    });
    await flush();
    expect(view.container.textContent).toContain("Failed to load detail template.");
  } finally {
    view.cleanup();
  }
});

test("keeps unsaved changes when a cache event arrives mid-flight", async () => {
  detailTemplateState.updateDetailPage.mockImplementationOnce(async () => {
    detailTemplateState.triggerCacheEvent(
      cacheKeys.detailPageDetail("6f9619ff-8b86-4a11-b42d-00c04fc964ff")
    );
    return createRecord({ name: "Saved mid-flight" });
  });
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    changeInputByLabel(view.container, "Name", "Pending draft");
    clickButton(view.container, "Save draft");
    await flush();
    expect(view.container.textContent).not.toContain("Template changed");
  } finally {
    view.cleanup();
  }
});

test("preserves a dirty draft when a cache refresh resolves after an edit", async () => {
  const remote = deferred<DetailPageRecord>();
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    detailTemplateState.getDetailPageCached.mockImplementationOnce(() => remote.promise);
    React.act(() => {
      detailTemplateState.triggerCacheEvent(
        cacheKeys.detailPageDetail("6f9619ff-8b86-4a11-b42d-00c04fc964ff")
      );
    });
    await flush();

    changeInputByLabel(view.container, "Name", "Local cache-refresh draft");
    await React.act(async () => {
      remote.resolve(createRecord({ name: "Remote cache refresh" }));
      await Promise.resolve();
    });

    const nameInput = Array.from(view.container.querySelectorAll("label"))
      .find((label) => label.textContent?.includes("Name"))
      ?.querySelector<HTMLInputElement>("input");
    expect(nameInput?.value).toBe("Local cache-refresh draft");
    expect(view.container.textContent).toContain("Template changed");
  } finally {
    view.cleanup();
  }
});

test("preserves a dirty draft when the initial forced fetch resolves after an edit", async () => {
  const remote = deferred<DetailPageRecord>();
  detailTemplateState.getDetailPageCached.mockImplementationOnce(() => remote.promise);
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );
  try {
    await flush();
    changeInputByLabel(view.container, "Name", "Local initial-load draft");
    await React.act(async () => {
      remote.resolve(createRecord({ name: "Remote initial load" }));
      await Promise.resolve();
    });

    const nameInput = Array.from(view.container.querySelectorAll("label"))
      .find((label) => label.textContent?.includes("Name"))
      ?.querySelector<HTMLInputElement>("input");
    expect(nameInput?.value).toBe("Local initial-load draft");
    expect(view.container.textContent).toContain("Template changed");
  } finally {
    view.cleanup();
  }
});
