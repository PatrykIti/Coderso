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
import {
  buildDetailTemplateDocumentUpdate,
  normalizeDetailTemplateDocument,
} from "../../../core/admin/ui/content-types/detailTemplateEditorModel";
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

const createLegacySection = (): PageSectionV2 =>
  createPageSectionV2("custom", {
    id: "section-legacy",
    name: "Legacy section",
    blocks: [
      createPageBlockV2("legacy-widget", {
        id: "block-legacy",
        props: {
          legacyWidgetType: "totally-custom-widget",
          data: { note: "preserved verbatim" },
        },
      }),
    ],
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

const clickButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickBySelector = (container: HTMLElement, selector: string) => {
  const element = container.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  React.act(() => {
    element.click();
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

const changeAddBlockSelect = (container: HTMLElement, blockType: string) => {
  const select = container.querySelector<HTMLSelectElement>("[data-detail-template-add-block]");
  if (!select) throw new Error("Missing add-block select");
  React.act(() => {
    select.value = blockType;
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
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

test("detail template read normalization converts v1 hero widgets to V2 hero sections", () => {
  const record = createRecord({
    currentDocument: {
      schemaVersion: 1,
      id: "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
      name: "Product detail template",
      contentTypeId: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
      contentTypeSlug: "products",
      status: "draft",
      titlePattern: "{title}",
      settings: { template: "detail", layout },
      blocks: [
        {
          id: "block-hero",
          type: "hero",
          data: {
            headline: "Product",
            primaryCta: { label: "Shop now", href: "/shop" },
          },
        },
      ],
      bindings: [],
    } as unknown as DetailPageDocument,
  });

  const document = normalizeDetailTemplateDocument(record);
  expect(document.schemaVersion).toBe(2);
  expect(document.sections).toHaveLength(1);
  expect(document.sections[0]?.type).toBe("hero");
  const blocks = document.sections[0]?.blocks ?? [];
  expect(blocks.map((block) => block.type)).toEqual([
    "heading",
    "text",
    "badge",
    "button",
    "image",
  ]);
  expect(blocks[0]?.props.text).toBe("Product");
  expect(blocks[3]?.props.label).toBe("Shop now");
  expect(blocks[3]?.props.href).toBe("/shop");
});

test("detail template read normalization keeps unmapped v1 widgets as read-only legacy blocks", () => {
  const record = createRecord({
    currentDocument: {
      schemaVersion: 1,
      id: "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
      name: "Product detail template",
      contentTypeId: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
      contentTypeSlug: "products",
      status: "draft",
      titlePattern: "{title}",
      settings: { template: "detail", layout },
      blocks: [
        {
          id: "block-custom",
          type: "totally-custom-widget",
          data: { note: "kept verbatim" },
        },
      ],
      bindings: [],
    } as unknown as DetailPageDocument,
  });

  const document = normalizeDetailTemplateDocument(record);
  expect(document.sections).toHaveLength(1);
  expect(document.sections[0]?.type).toBe("custom");
  const legacyBlock = document.sections[0]?.blocks[0];
  expect(legacyBlock?.type).toBe("legacy-widget");
  expect(legacyBlock?.props.legacyWidgetType).toBe("totally-custom-widget");
  expect(legacyBlock?.props.data).toEqual({ note: "kept verbatim" });
});

test("detail template editor hydrates cached detail page and bounded sample entries", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );

  try {
    expect(view.container.textContent).toContain("Product detail template");
    expect(view.container.textContent).toContain("/products");
    expect(view.container.querySelector("[data-detail-template-section]")).not.toBeNull();
    expect(
      view.container.querySelector('[data-detail-template-block="block-heading"]')
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-authoring-layer-node="block-heading"]')
    ).not.toBeNull();
    await flush();

    expect(
      view.container.querySelector("[data-active-href]")?.getAttribute("data-active-href")
    ).toBe("/admin/advanced/engine");
    expect(detailTemplateState.getDetailPageCached).toHaveBeenCalledWith(
      "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
      {
        force: true,
      }
    );
    expect(detailTemplateState.listEntriesCached).toHaveBeenCalledWith("products");
    expect(getActiveAssistantSurfaceContext()).toMatchObject({
      kind: "detail-page",
      detailPage: {
        id: "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
        contentTypeId: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
        contentTypeSlug: "products",
      },
      sampleEntryId: "entry-product-1",
      selectedBlockId: "block-heading",
    });
  } finally {
    view.cleanup();
  }
});

test("detail template editor saves canvas sections through draft payloads", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );

  try {
    await flush();
    clickBySelector(view.container, '[data-detail-template-add-section="hero"]');
    expect(view.container.querySelectorAll("[data-detail-template-section]")).toHaveLength(2);
    changeAddBlockSelect(view.container, "text");
    expect(
      view.container
        .querySelector('[data-detail-template-section="section-hero"]')
        ?.querySelectorAll("[data-detail-template-block]")
    ).toHaveLength(3);

    clickButton(view.container, "Save draft");
    await flush();
    const savedDocument = detailTemplateState.updateDetailPage.mock.calls.at(-1)?.[1];
    expect(savedDocument?.sections).toHaveLength(2);
    expect(savedDocument?.sections[0]?.blocks).toHaveLength(3);
    expect(savedDocument?.sections[1]?.blocks[0]?.type).toBe("heading");
  } finally {
    view.cleanup();
  }
});

test("detail template editor saves block field bindings with draft payloads", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );

  try {
    await flush();
    clickButton(view.container, "Add binding");
    changeSelect(view.container, "entry-field:headline");
    clickButton(view.container, "Save draft");
    await flush();

    const savedDocument = detailTemplateState.updateDetailPage.mock.calls.at(-1)?.[1];
    expect(savedDocument?.bindings).toEqual([
      expect.objectContaining({
        blockId: "block-heading",
        propPath: "text",
        source: { kind: "entry-field", field: "headline" },
        transform: "text",
      }),
    ]);
    expect(savedDocument?.sections[0]?.blocks[0]?.props.text).toBe("Product heading");
  } finally {
    view.cleanup();
  }
});

test("detail template editor removes bindings for deleted blocks", async () => {
  const document = createDocument({
    bindings: [
      {
        id: "binding-heading",
        blockId: "block-heading",
        propPath: "text",
        source: { kind: "entry-field", field: "headline" },
        transform: "text",
      },
    ],
  });
  detailTemplateState.cachedRecord = createRecord({ currentDocument: document });
  detailTemplateState.remoteRecord = createRecord({ currentDocument: document });
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );

  try {
    await flush();
    clickBySelector(view.container, '[aria-label="Delete Product heading"]');
    clickButton(view.container, "Save draft");
    await flush();

    const savedDocument = detailTemplateState.updateDetailPage.mock.calls.at(-1)?.[1];
    expect(savedDocument?.sections[0]?.blocks.map((block) => block.type)).toEqual(["button"]);
    expect(savedDocument?.bindings).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("detail template editor saves published templates through draft payloads", async () => {
  const publishedDocument = createDocument({ status: "published" });
  detailTemplateState.cachedRecord = createRecord({
    status: "published",
    currentDocument: publishedDocument,
    publishedDocument,
    publishedAt: "2026-05-10T11:00:00.000Z",
  });
  detailTemplateState.remoteRecord = createRecord({
    status: "published",
    currentDocument: publishedDocument,
    publishedDocument,
    publishedAt: "2026-05-10T11:00:00.000Z",
  });
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );

  try {
    await flush();
    clickBySelector(view.container, '[data-detail-template-add-section="hero"]');
    clickButton(view.container, "Save draft");
    await flush();

    const savedDocument = detailTemplateState.updateDetailPage.mock.calls.at(-1)?.[1];
    expect(savedDocument?.status).toBe("draft");
  } finally {
    view.cleanup();
  }
});

test("buildDetailTemplateDocumentUpdate downgrades published records to draft updates", () => {
  const publishedDocument = createDocument({ status: "published" });
  const document = buildDetailTemplateDocumentUpdate(
    createRecord({
      status: "published",
      currentDocument: publishedDocument,
      publishedDocument,
      publishedAt: "2026-05-10T11:00:00.000Z",
    }),
    {
      name: "Product detail template edited",
      titlePattern: "{title}",
      sections: publishedDocument.sections,
      bindings: publishedDocument.bindings,
    }
  );

  expect(document.status).toBe("draft");
});

test("detail template editor publishes through detail pages lifecycle", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );

  try {
    await flush();
    clickBySelector(view.container, '[data-detail-template-add-section="hero"]');
    clickButton(view.container, "Publish");
    await flush();

    expect(detailTemplateState.updateDetailPage).toHaveBeenCalled();
    expect(detailTemplateState.publishDetailPage).toHaveBeenCalledWith(
      "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
      "6f9619ff-8b86-4a11-b42d-00c04fc964f0"
    );
    expect(view.container.textContent).toContain("Published");
  } finally {
    view.cleanup();
  }
});

test("detail template editor keeps unsaved edits when cache bus reports remote changes", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );

  try {
    await flush();
    clickBySelector(view.container, '[data-detail-template-add-section="hero"]');
    React.act(() => {
      detailTemplateState.triggerCacheEvent(
        cacheKeys.detailPageDetail("6f9619ff-8b86-4a11-b42d-00c04fc964ff")
      );
    });

    expect(view.container.textContent).toContain("Template changed");
    expect(view.container.textContent).toContain("New changes are available.");
  } finally {
    view.cleanup();
  }
});

test("detail template editor renders legacy widgets read-only in canvas and inspector", async () => {
  const document = createDocument({ sections: [createSection(), createLegacySection()] });
  detailTemplateState.cachedRecord = createRecord({ currentDocument: document });
  detailTemplateState.remoteRecord = createRecord({ currentDocument: document });
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );

  try {
    await flush();
    expect(
      view.container.querySelector('[data-detail-template-block-type="legacy-widget"]')
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-legacy-widget="totally-custom-widget"]')
    ).not.toBeNull();
    expect(view.container.querySelector('[data-legacy-reauthor-note="true"]')).not.toBeNull();
    const legacyBlock = view.container.querySelector('[data-detail-template-block="block-legacy"]');
    expect(legacyBlock?.querySelector('[aria-label^="Delete"]')).toBeNull();
    expect(legacyBlock?.querySelector('[aria-label^="Duplicate"]')).toBeNull();

    clickBySelector(view.container, '[data-authoring-layer-node="block-legacy"]');
    expect(view.container.querySelector('[data-legacy-inspector-note="true"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("detail template editor loads revisions and wires restore and discard actions", async () => {
  const view = mount(
    "/admin/advanced/engine/6f9619ff-8b86-4a11-b42d-00c04fc964f0/collection/detail-template/6f9619ff-8b86-4a11-b42d-00c04fc964ff"
  );

  try {
    await flush();
    clickButton(view.container, "History");
    await flush();
    expect(detailTemplateState.listDetailPageRevisions).toHaveBeenCalledWith(
      "6f9619ff-8b86-4a11-b42d-00c04fc964ff"
    );
    expect(view.container.textContent).toContain("Version 1");
    expect(view.container.textContent).toContain("Draft version");

    clickButton(view.container, "Restore");
    await flush();
    expect(detailTemplateState.restoreDetailPageRevision).toHaveBeenCalledWith(
      "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
      "rev-published",
      "6f9619ff-8b86-4a11-b42d-00c04fc964f0"
    );

    clickButton(view.container, "Discard");
    await flush();
    expect(detailTemplateState.discardDetailPageRevision).toHaveBeenCalledWith(
      "6f9619ff-8b86-4a11-b42d-00c04fc964ff",
      "rev-autosave"
    );
  } finally {
    view.cleanup();
  }
});
