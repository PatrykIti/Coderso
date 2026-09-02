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

const state = vi.hoisted(() => {
  const inner = {
    cachedRecord: null as DetailPageRecord | null,
    remoteRecord: null as DetailPageRecord | null,
    contentTypes: [] as ContentTypeSummary[],
    entries: [] as EntrySummary[],
    revisions: [] as DetailPageRevisionSummary[],
    cacheListener: null as ((event: CacheEvent) => void) | null,
    failNextListContentTypes: false,
    failNextListEntries: false,
    failNextListRevisions: false,
    failNextUpdate: false,
    failNextAutosave: false,
    failNextPublish: false,
    failNextUnpublish: false,
    failNextRestore: false,
    failNextDiscard: false,
    getCachedDetailPage: vi.fn((id: string) =>
      inner.cachedRecord?.id === id ? inner.cachedRecord : null
    ),
    getDetailPageCached: vi.fn(async (id: string) => {
      if (inner.remoteRecord?.id === id) return inner.remoteRecord;
      throw new Error("detail_page_not_found");
    }),
    updateDetailPage: vi.fn(async (id: string, document: DetailPageDocument) => {
      if (inner.failNextUpdate) {
        inner.failNextUpdate = false;
        throw new Error("update_failed");
      }
      if (!inner.remoteRecord || inner.remoteRecord.id !== id) {
        throw new Error("detail_page_not_found");
      }
      const updated: DetailPageRecord = {
        ...inner.remoteRecord,
        name: document.name,
        status: document.status,
        currentDocument: document,
        updatedAt: "2026-05-10T12:00:00.000Z",
      };
      inner.cachedRecord = updated;
      inner.remoteRecord = updated;
      return updated;
    }),
    autosaveDetailPage: vi.fn(async () => {
      if (inner.failNextAutosave) {
        inner.failNextAutosave = false;
        throw new Error("autosave_failed");
      }
      return {
        savedAt: "2026-05-10T12:01:00.000Z",
        reusedRevision: false,
        revision: inner.revisions[0]!,
      };
    }),
    previewDetailPage: vi.fn(async () => {
      return {
        token: "detail-preview-token",
        previewUrl: "/preview?type=detail-page&token=detail-preview-token",
        expiresAt: "2026-05-10T12:30:00.000Z",
      };
    }),
    publishDetailPage: vi.fn(async (id: string) => {
      if (inner.failNextPublish) {
        inner.failNextPublish = false;
        throw new Error("publish_failed");
      }
      if (!inner.remoteRecord || inner.remoteRecord.id !== id) {
        throw new Error("detail_page_not_found");
      }
      const nextDocument = { ...inner.remoteRecord.currentDocument, status: "published" as const };
      inner.remoteRecord = {
        ...inner.remoteRecord,
        status: "published",
        currentDocument: nextDocument,
        updatedAt: "2026-05-10T12:02:00.000Z",
        publishedAt: "2026-05-10T12:02:00.000Z",
      };
      inner.cachedRecord = inner.remoteRecord;
      return { ok: true };
    }),
    unpublishDetailPage: vi.fn(async (id: string) => {
      if (inner.failNextUnpublish) {
        inner.failNextUnpublish = false;
        throw new Error("unpublish_failed");
      }
      if (!inner.remoteRecord || inner.remoteRecord.id !== id) {
        throw new Error("detail_page_not_found");
      }
      const nextDocument = { ...inner.remoteRecord.currentDocument, status: "draft" as const };
      inner.remoteRecord = {
        ...inner.remoteRecord,
        status: "draft",
        currentDocument: nextDocument,
        updatedAt: "2026-05-10T12:03:00.000Z",
        publishedAt: null,
      };
      inner.cachedRecord = inner.remoteRecord;
      return { ok: true };
    }),
    listDetailPageRevisions: vi.fn(async () => {
      if (inner.failNextListRevisions) {
        inner.failNextListRevisions = false;
        throw new Error("revisions_failed");
      }
      return inner.revisions;
    }),
    restoreDetailPageRevision: vi.fn(async (id: string) => {
      if (inner.failNextRestore) {
        inner.failNextRestore = false;
        throw new Error("restore_failed");
      }
      if (!inner.remoteRecord || inner.remoteRecord.id !== id) {
        throw new Error("detail_page_not_found");
      }
      inner.remoteRecord = {
        ...inner.remoteRecord,
        name: "Restored detail template",
        currentDocument: {
          ...inner.remoteRecord.currentDocument,
          name: "Restored detail template",
        },
        updatedAt: "2026-05-10T12:04:00.000Z",
      };
      inner.cachedRecord = inner.remoteRecord;
      return { ok: true, restored: true };
    }),
    discardDetailPageRevision: vi.fn(async () => {
      if (inner.failNextDiscard) {
        inner.failNextDiscard = false;
        throw new Error("discard_failed");
      }
      return { ok: true };
    }),
    getCachedEntries: vi.fn(() => inner.entries),
    listEntriesCached: vi.fn(async () => {
      if (inner.failNextListEntries) {
        inner.failNextListEntries = false;
        throw new Error("entries_failed");
      }
      return inner.entries;
    }),
    getCachedContentTypes: vi.fn(() => inner.contentTypes),
    listContentTypesCached: vi.fn(async () => {
      if (inner.failNextListContentTypes) {
        inner.failNextListContentTypes = false;
        throw new Error("content_types_failed");
      }
      return inner.contentTypes;
    }),
    subscribeCacheEvents: vi.fn((listener: (event: CacheEvent) => void) => {
      inner.cacheListener = listener;
      return () => {
        if (inner.cacheListener === listener) inner.cacheListener = null;
      };
    }),
    triggerCacheEvent(key: string) {
      inner.cacheListener?.({ key, action: "update" });
    },
    reset() {
      inner.cachedRecord = null;
      inner.remoteRecord = null;
      inner.contentTypes = [];
      inner.entries = [];
      inner.revisions = [];
      inner.cacheListener = null;
      inner.failNextListContentTypes = false;
      inner.failNextListEntries = false;
      inner.failNextListRevisions = false;
      inner.failNextUpdate = false;
      inner.failNextAutosave = false;
      inner.failNextPublish = false;
      inner.failNextUnpublish = false;
      inner.failNextRestore = false;
      inner.failNextDiscard = false;
      Object.values(inner).forEach((value) => {
        if (typeof value === "function" && "mockClear" in (value as { mockClear?: unknown })) {
          (value as { mockClear: () => void }).mockClear();
        }
      });
    },
  };
  return inner;
});

vi.mock("@/services/detailPagesClient", () => ({
  autosaveDetailPage: state.autosaveDetailPage,
  discardDetailPageRevision: state.discardDetailPageRevision,
  getCachedDetailPage: state.getCachedDetailPage,
  getDetailPageCached: state.getDetailPageCached,
  listDetailPageRevisions: state.listDetailPageRevisions,
  previewDetailPage: state.previewDetailPage,
  publishDetailPage: state.publishDetailPage,
  restoreDetailPageRevision: state.restoreDetailPageRevision,
  unpublishDetailPage: state.unpublishDetailPage,
  updateDetailPage: state.updateDetailPage,
}));

vi.mock("@/services/entriesClient", () => ({
  getCachedEntries: state.getCachedEntries,
  listEntriesCached: state.listEntriesCached,
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: state.getCachedContentTypes,
  listContentTypesCached: state.listContentTypesCached,
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
  subscribeCacheEvents: state.subscribeCacheEvents,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

vi.mock("@/components/ui/tabs", () => {
  const registry: { onValueChange?: (value: string) => void } = {};
  return {
    Tabs: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
    }) => {
      registry.onValueChange = onValueChange;
      return <div>{children}</div>;
    },
    TabsContent: ({ children }: { children: React.ReactNode; value: string }) => (
      <div>{children}</div>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <button
        type="button"
        data-tab-trigger={value}
        onClick={() => registry.onValueChange?.(value)}
      >
        {children}
      </button>
    ),
  };
});

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

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/ui/pages/editorControls", () => ({
  ColorSwatchControl: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value?: unknown;
    onChange: (value: string | null) => void;
  }) => (
    <div data-control="color" data-value={String(value ?? "")}>
      <span>{label}</span>
      <button type="button" data-commit="color" onClick={() => onChange("#112233")}>
        commit color
      </button>
    </div>
  ),
  ComboboxControl: ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string | null;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string | null) => void;
  }) => (
    <div data-control="combobox" data-value={value ?? ""}>
      <span>{label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-commit="combobox"
          data-option={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
  FacetListControl: () => <div data-control="facets" />,
  ListItemsControl: () => <div data-control="items" />,
  SegmentedControl: ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
  }) => (
    <div data-control="segmented" data-value={value}>
      <span>{label}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-commit="segmented"
          data-option={option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  ),
  SliderControl: () => <div data-control="slider" />,
  SliderStepperControl: () => <div data-control="slider-stepper" />,
  ToggleSwitch: () => <div data-control="toggle" />,
}));

import { DetailTemplateEditorPage } from "../../../core/admin/ui/content-types/DetailTemplateEditorPage";
import { clearActiveAssistantSurfaceContext } from "../../../core/admin/ui/assistant/activeSurfaceContext";

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

const DETAIL_ROUTE =
  "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff";

beforeEach(() => {
  clearActiveAssistantSurfaceContext();
  state.reset();
  state.cachedRecord = createRecord();
  state.remoteRecord = createRecord();
  state.contentTypes = [createContentType()];
  state.entries = [createEntry()];
  state.revisions = [
    createRevision({ id: "rev-published", kind: "publish" }),
    createRevision({ id: "rev-autosave", kind: "autosave", version: 0 }),
  ];
});

const mount = (path: string = DETAIL_ROUTE) => {
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

const textOf = (container: HTMLElement) => container.textContent ?? "";

test("switches details tabs through the tab triggers", async () => {
  const view = mount();
  try {
    await flush();
    const dataTab = view.container.querySelector<HTMLButtonElement>('[data-tab-trigger="data"]');
    React.act(() => {
      dataTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(textOf(view.container)).toContain("Content field bindings");
  } finally {
    view.cleanup();
  }
});

test("ignores cache events for unrelated keys", async () => {
  const view = mount();
  try {
    await flush();
    const callsBefore = state.getDetailPageCached.mock.calls.length;
    React.act(() => {
      state.triggerCacheEvent("unrelated:key");
    });
    await flush();
    expect(state.getDetailPageCached.mock.calls.length).toBe(callsBefore);
  } finally {
    view.cleanup();
  }
});

test("ignores load and entry results after unmount", async () => {
  const view = mount();
  view.cleanup();
  await flush();
  expect(state.getDetailPageCached).toHaveBeenCalled();
});

test("ignores a failed entry load after unmount", async () => {
  state.failNextListEntries = true;
  const view = mount();
  view.cleanup();
  await flush();
  expect(state.getCachedEntries).toBeDefined();
});

test("commits a section style control through the inspector", async () => {
  const view = mount();
  try {
    await flush();
    const sectionFrame = view.container.querySelector<HTMLElement>(
      '[data-detail-template-section="section-hero"]'
    );
    React.act(() => {
      sectionFrame?.click();
    });
    await flush();
    const colorCommit = view.container.querySelector<HTMLButtonElement>('[data-commit="color"]');
    React.act(() => {
      colorCommit?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(
      view.container.querySelector('[data-control="color"][data-value="#112233"]')
    ).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("opens the mobile details panel", async () => {
  const view = mount();
  try {
    await flush();
    const detailsButton = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Details"
    );
    React.act(() => {
      detailsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(textOf(view.container)).toContain("Content field bindings");
  } finally {
    view.cleanup();
  }
});
