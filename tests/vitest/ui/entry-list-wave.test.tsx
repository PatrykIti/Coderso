// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { EntryList } from "../../../core/admin/ui/entries/EntryList";

type CacheEvent = { key: string };

type ContentTypeSummary = {
  id: string;
  slug: string;
  name: string;
  schema: Record<string, unknown>;
  entryCount?: number;
};

type EntrySummary = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name?: string;
    email: string;
  } | null;
};

const entryListState = vi.hoisted(() => {
  const apiError = (message: string) => ({
    name: "ApiClientError",
    message,
    code: "request_failed",
    status: 400,
  });

  const createType = (
    slug: string,
    name: string,
    entryCount = 0
  ): ContentTypeSummary => ({
    id: `type-${slug}`,
    slug,
    name,
    schema: { type: "object" },
    entryCount,
  });

  const createEntry = (
    id: string,
    title: string,
    slug: string,
    status: EntrySummary["status"],
    authorId: string,
    authorLabel: string
  ): EntrySummary => ({
    id,
    typeId: "type-articles",
    title,
    slug,
    status,
    data: {},
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
    author: {
      id: authorId,
      name: authorLabel,
      email: `${authorId}@example.com`,
    },
  });

  const listeners = new Set<(event: CacheEvent) => void>();

  const state = {
    apiError,
    createType,
    createEntry,
    cachedTypes: null as ContentTypeSummary[] | null,
    types: [] as ContentTypeSummary[],
    cachedEntries: {} as Record<string, EntrySummary[] | null>,
    entries: {} as Record<string, EntrySummary[]>,
    nextContentTypesError: null as unknown,
    contentTypesError: null as unknown,
    nextEntriesError: new Map<string, unknown>(),
    entriesError: new Map<string, unknown>(),
    nextDeleteError: new Map<string, unknown>(),
    nextDuplicateError: new Map<string, unknown>(),
    nextMetadataError: new Map<string, unknown>(),
    listContentTypesCalls: [] as Array<{ force?: boolean }>,
    listEntriesCalls: [] as Array<{ slug: string; force?: boolean }>,
    deleteEntryCalls: [] as Array<{ slug: string; id: string }>,
    duplicateEntryCalls: [] as Array<{ slug: string; id: string }>,
    updateMetadataCalls: [] as Array<{
      slug: string;
      id: string;
      input: Record<string, unknown>;
    }>,
    navigateCalls: [] as string[],
    reset() {
      listeners.clear();
      state.cachedTypes = null;
      state.types = [];
      state.cachedEntries = {};
      state.entries = {};
      state.nextContentTypesError = null;
      state.contentTypesError = null;
      state.nextEntriesError = new Map<string, unknown>();
      state.entriesError = new Map<string, unknown>();
      state.nextDeleteError = new Map<string, unknown>();
      state.nextDuplicateError = new Map<string, unknown>();
      state.nextMetadataError = new Map<string, unknown>();
      state.listContentTypesCalls = [];
      state.listEntriesCalls = [];
      state.deleteEntryCalls = [];
      state.duplicateEntryCalls = [];
      state.updateMetadataCalls = [];
      state.navigateCalls = [];
    },
    triggerCache(key: string) {
      for (const listener of listeners) {
        listener({ key });
      }
    },
    subscribe(listener: (event: CacheEvent) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return state;
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
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

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    contentTypesList: "contentTypesList",
    entriesList: (slug: string) => `entries:${slug}`,
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => entryListState.cachedTypes,
  listContentTypesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    entryListState.listContentTypesCalls.push({ force });
    if (entryListState.nextContentTypesError) {
      const error = entryListState.nextContentTypesError;
      entryListState.nextContentTypesError = null;
      throw error;
    }
    if (entryListState.contentTypesError) {
      throw entryListState.contentTypesError;
    }
    return entryListState.types;
  }),
}));

vi.mock("@/services/entriesClient", () => ({
  deleteEntry: vi.fn(async (slug: string, id: string) => {
    entryListState.deleteEntryCalls.push({ slug, id });
    const key = `${slug}:${id}`;
    const queuedError = entryListState.nextDeleteError.get(key);
    if (queuedError) {
      entryListState.nextDeleteError.delete(key);
      throw queuedError;
    }
    entryListState.entries[slug] = (entryListState.entries[slug] ?? []).filter(
      (entry) => entry.id !== id
    );
    entryListState.cachedEntries[slug] = entryListState.entries[slug];
  }),
  duplicateEntry: vi.fn(async (slug: string, id: string) => {
    entryListState.duplicateEntryCalls.push({ slug, id });
    const key = `${slug}:${id}`;
    const queuedError = entryListState.nextDuplicateError.get(key);
    if (queuedError) {
      entryListState.nextDuplicateError.delete(key);
      throw queuedError;
    }
    const source = (entryListState.entries[slug] ?? []).find((entry) => entry.id === id);
    const clone = {
      ...(source ?? entryListState.createEntry("copy-1", "Copy", "copy", "draft", "author-1", "Ada")),
      id: `${id}-copy`,
      title: `${source?.title ?? "Copy"} (Copy)`,
      slug: `${source?.slug ?? "copy"}-copy`,
      status: "draft" as const,
    };
    entryListState.entries[slug] = [clone, ...(entryListState.entries[slug] ?? [])];
    entryListState.cachedEntries[slug] = entryListState.entries[slug];
    return clone;
  }),
  getCachedEntries: (slug: string) => entryListState.cachedEntries[slug] ?? null,
  listEntriesCached: vi.fn(async (slug: string, { force }: { force?: boolean } = {}) => {
    entryListState.listEntriesCalls.push({ slug, force });
    const queuedError = entryListState.nextEntriesError.get(slug);
    if (queuedError) {
      entryListState.nextEntriesError.delete(slug);
      throw queuedError;
    }
    const persistentError = entryListState.entriesError.get(slug);
    if (persistentError) {
      throw persistentError;
    }
    return entryListState.entries[slug] ?? [];
  }),
  updateEntryMetadata: vi.fn(async (slug: string, id: string, input: Record<string, unknown>) => {
    entryListState.updateMetadataCalls.push({ slug, id, input });
    const key = `${slug}:${id}`;
    const queuedError = entryListState.nextMetadataError.get(key);
    if (queuedError) {
      entryListState.nextMetadataError.delete(key);
      throw queuedError;
    }
    entryListState.entries[slug] = (entryListState.entries[slug] ?? []).map((entry) =>
      entry.id === id
        ? {
            ...entry,
            status:
              typeof input.status === "string"
                ? (input.status as EntrySummary["status"])
                : entry.status,
          }
        : entry
    );
    entryListState.cachedEntries[slug] = entryListState.entries[slug];
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => {
      entryListState.navigateCalls.push(href);
    },
  }),
}));

vi.mock("@/ui/layouts/SplitShell", () => ({
  SplitShell: ({
    breadcrumbs,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-entry-shell-breadcrumbs="true">{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (listener: (event: CacheEvent) => void) =>
    entryListState.subscribe(listener),
}));

vi.mock("../../../core/admin/ui/content-types/ContentTypeCreateDrawer", () => ({
  ContentTypeCreateDrawer: ({
    open,
    onCreated,
  }: {
    open: boolean;
    onCreated: (type: ContentTypeSummary) => void;
  }) =>
    open ? (
      <div data-entry-type-drawer="open">
        <button
          type="button"
          data-entry-create-type="true"
          onClick={() =>
            onCreated(entryListState.createType("releases", "Releases", 0))
          }
        >
          create-type
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/entries/EntryCreateDrawer", () => ({
  EntryCreateDrawer: ({
    open,
    types,
    defaultTypeSlug,
    onCreated,
  }: {
    open: boolean;
    types: ContentTypeSummary[];
    defaultTypeSlug: string | null;
    onCreated: (entry: { id: string }, typeSlug: string, openAfterCreate: boolean) => void;
  }) =>
    open ? (
      <div data-entry-create-drawer="open">
        <div>{`default:${defaultTypeSlug ?? "none"}`}</div>
        <div>{`types:${types.map((type) => type.slug).join("|")}`}</div>
        <button
          type="button"
          data-entry-create-active-open="true"
          onClick={() => onCreated({ id: "created-entry" }, defaultTypeSlug ?? "articles", true)}
        >
          create-active-open
        </button>
        <button
          type="button"
          data-entry-create-second-closed="true"
          onClick={() =>
            onCreated({ id: "second-entry" }, types[1]?.slug ?? defaultTypeSlug ?? "articles", false)
          }
        >
          create-second-closed
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/entries/EntryBulkActionsBar", () => ({
  EntryBulkActionsBar: ({
    selectedCount,
    action,
    onActionChange,
    onApply,
    onClear,
    isApplying,
  }: {
    selectedCount: number;
    action: string;
    onActionChange: (value: "publish" | "draft" | "archive" | "delete" | "") => void;
    onApply: () => void;
    onClear: () => void;
    isApplying?: boolean;
  }) => (
    <div data-entry-bulk-bar="true">
      <div>{`selected:${selectedCount}`}</div>
      <div>{`action:${action || "none"}`}</div>
      <div>{`applying:${String(Boolean(isApplying))}`}</div>
      <button type="button" data-entry-bulk-publish="true" onClick={() => onActionChange("publish")}>
        bulk-publish
      </button>
      <button type="button" data-entry-bulk-delete="true" onClick={() => onActionChange("delete")}>
        bulk-delete
      </button>
      <button type="button" data-entry-bulk-apply="true" onClick={onApply}>
        bulk-apply
      </button>
      <button type="button" data-entry-bulk-clear="true" onClick={onClear}>
        bulk-clear
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/entries/EntryFilters", () => ({
  EntryFilters: ({
    search,
    status,
    typeValue,
    author,
    authorOptions,
    onSearchChange,
    onStatusChange,
    onTypeChange,
    onAuthorChange,
    onClear,
  }: {
    search: string;
    status: string;
    typeValue: string;
    author: string;
    authorOptions: Array<{ value: string; label: string }>;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onAuthorChange: (value: string) => void;
    onClear: () => void;
  }) => (
    <div data-entry-filters="true">
      <div>{`search:${search}`}</div>
      <div>{`status:${status}`}</div>
      <div>{`type:${typeValue}`}</div>
      <div>{`author:${author}`}</div>
      <div>{`authors:${authorOptions.map((option) => option.label).join("|")}`}</div>
      <button type="button" data-entry-filter-search="true" onClick={() => onSearchChange("draft")}>
        filter-search
      </button>
      <button type="button" data-entry-filter-status="true" onClick={() => onStatusChange("draft")}>
        filter-status
      </button>
      <button type="button" data-entry-filter-type="true" onClick={() => onTypeChange("faqs")}>
        filter-type
      </button>
      <button
        type="button"
        data-entry-filter-author="true"
        onClick={() => onAuthorChange("author-1")}
      >
        filter-author
      </button>
      <button type="button" data-entry-filter-clear="true" onClick={onClear}>
        filter-clear
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/entries/EntryGrid", () => ({
  EntryGrid: ({
    entries,
    emptyMessage,
    onEdit,
  }: {
    entries: EntrySummary[];
    emptyMessage?: string;
    onEdit: (id: string) => void;
  }) => (
    <div data-entry-grid="true">
      <div>{entries.map((entry) => entry.title).join("|") || "grid-empty"}</div>
      <div>{emptyMessage ?? "no-grid-message"}</div>
      <button
        type="button"
        data-entry-grid-edit="true"
        onClick={() => entries[0] && onEdit(entries[0].id)}
      >
        grid-edit
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/entries/EntryTable", () => ({
  EntryTable: ({
    entries,
    selectedIds,
    isAllSelected,
    isIndeterminate,
    emptyMessage,
    onToggleAll,
    onToggleEntry,
    onEdit,
    onDuplicate,
    onDelete,
  }: {
    entries: EntrySummary[];
    selectedIds: string[];
    isAllSelected: boolean;
    isIndeterminate: boolean;
    emptyMessage?: string;
    onToggleAll: () => void;
    onToggleEntry: (id: string) => void;
    onEdit: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div data-entry-table="true">
      <div>{entries.map((entry) => entry.title).join("|") || "table-empty"}</div>
      <div>{`selected:${selectedIds.join("|") || "none"}`}</div>
      <div>{`all:${String(isAllSelected)}`}</div>
      <div>{`indeterminate:${String(isIndeterminate)}`}</div>
      <div>{emptyMessage ?? "no-table-message"}</div>
      <button type="button" data-entry-toggle-all="true" onClick={onToggleAll}>
        toggle-all
      </button>
      <button
        type="button"
        data-entry-toggle-first="true"
        onClick={() => entries[0] && onToggleEntry(entries[0].id)}
      >
        toggle-first
      </button>
      <button
        type="button"
        data-entry-edit-first="true"
        onClick={() => entries[0] && onEdit(entries[0].id)}
      >
        edit-first
      </button>
      <button
        type="button"
        data-entry-duplicate-first="true"
        onClick={() => entries[0] && onDuplicate(entries[0].id)}
      >
        duplicate-first
      </button>
      <button
        type="button"
        data-entry-delete-first="true"
        onClick={() => entries[0] && onDelete(entries[0].id)}
      >
        delete-first
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/entries/EntryDeleteDialog", () => ({
  EntryDeleteDialog: ({
    open,
    title,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-entry-delete-dialog="true">
        <span>{title}</span>
        <button type="button" data-entry-delete-confirm="true" onClick={onConfirm}>
          confirm-delete
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/entries/EntryTypeSidebar", () => ({
  EntryTypeSidebar: ({
    types,
    activeSlug,
    onSelect,
    onCreateCollection,
  }: {
    types: Array<{ slug: string; name: string; count: number }>;
    activeSlug: string | null;
    onSelect: (slug: string) => void;
    onCreateCollection: () => void;
  }) => (
    <div data-entry-sidebar="true">
      <div>{`active:${activeSlug ?? "none"}`}</div>
      <div>{types.map((type) => `${type.slug}:${type.count}`).join("|")}</div>
      {types.map((type) => (
        <button
          key={type.slug}
          type="button"
          data-entry-sidebar-select={type.slug}
          onClick={() => onSelect(type.slug)}
        >
          {type.name}
        </button>
      ))}
      <button
        type="button"
        data-entry-create-collection="true"
        onClick={onCreateCollection}
      >
        create-collection
      </button>
    </div>
  ),
}));

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

const flush = async (times = 2) => {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const text = (container: HTMLElement) => container.textContent ?? "";

beforeEach(() => {
  entryListState.reset();
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("EntryList covers cached load, filters, create flows, cache refresh, and grid transitions", async () => {
  const articleType = entryListState.createType("articles", "Articles", 2);
  const faqType = entryListState.createType("faqs", "FAQs", 1);
  const releaseType = entryListState.createType("releases", "Releases", 0);
  const articleEntries = [
    entryListState.createEntry("entry-1", "Hello launch", "hello-launch", "published", "author-1", "Alex Doe"),
    entryListState.createEntry("entry-2", "Draft checklist", "draft-checklist", "draft", "author-2", "Editor Two"),
  ];
  const faqEntries = [
    entryListState.createEntry("faq-1", "Common questions", "common-questions", "published", "author-1", "Alex Doe"),
  ];
  const releaseEntries = [
    entryListState.createEntry("release-1", "Release notes", "release-notes", "published", "author-3", "Release Bot"),
  ];

  entryListState.cachedTypes = [articleType, faqType];
  entryListState.types = [articleType, faqType];
  entryListState.cachedEntries = {
    articles: articleEntries,
    faqs: faqEntries,
  };
  entryListState.entries = {
    articles: articleEntries,
    faqs: faqEntries,
    releases: releaseEntries,
  };

  const view = mount(<EntryList />);

  try {
    await flush();

    expect(text(view.container)).toContain("Hello launch");
    expect(text(view.container)).toContain("Draft checklist");
    expect(text(view.container)).toContain("authors:Alex Doe|Editor Two");
    expect(entryListState.listContentTypesCalls).toEqual([{ force: true }]);
    expect(entryListState.listEntriesCalls).toContainEqual({ slug: "articles", force: true });

    act(() => {
      view.container
        .querySelector("button[data-entry-toggle-first='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(text(view.container)).toContain("selected:entry-1");
    expect(text(view.container)).toContain("selected:1");

    act(() => {
      view.container
        .querySelector("button[data-entry-bulk-publish='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      view.container
        .querySelector("button[data-entry-bulk-apply='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(entryListState.updateMetadataCalls).toContainEqual({
      slug: "articles",
      id: "entry-1",
      input: { status: "published" },
    });
    expect(text(view.container)).not.toContain("data-entry-bulk-bar");

    act(() => {
      view.container
        .querySelector("button[data-entry-filter-search='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(text(view.container)).toContain("Draft checklist");
    expect(text(view.container)).not.toContain("Hello launch");

    act(() => {
      view.container
        .querySelector("button[data-entry-filter-clear='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(text(view.container)).toContain("search:");
    expect(text(view.container)).toContain("status:all");
    expect(text(view.container)).toContain("author:any");

    act(() => {
      view.container
        .querySelector("button[data-entry-filter-author='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(text(view.container)).toContain("Hello launch");
    expect(text(view.container)).not.toContain("Draft checklist");

    act(() => {
      view.container
        .querySelector("button[data-entry-filter-clear='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      view.container
        .querySelector("button[data-entry-edit-first='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(entryListState.navigateCalls).toContain("/entries/articles/entry-1");

    act(() => {
      view.container
        .querySelector("button[data-entry-duplicate-first='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(entryListState.duplicateEntryCalls).toContainEqual({
      slug: "articles",
      id: "entry-1",
    });
    expect(entryListState.navigateCalls).toContain("/entries/articles/entry-1-copy");

    act(() => {
      view.container
        .querySelector("button[data-entry-filter-type='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(entryListState.listEntriesCalls).toContainEqual({ slug: "faqs", force: true });
    expect(text(view.container)).toContain("Common questions");

    const viewButtons = Array.from(view.container.querySelectorAll("button[aria-pressed]"));
    act(() => {
      viewButtons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(view.container.querySelector("[data-entry-grid='true']")).not.toBeNull();

    act(() => {
      view.container
        .querySelector("button[data-entry-grid-edit='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(entryListState.navigateCalls).toContain("/entries/faqs/faq-1");

    act(() => {
      Array.from(view.container.querySelectorAll("[data-entry-create-collection='true']"))[0]?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    act(() => {
      view.container
        .querySelector("button[data-entry-create-type='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(text(view.container)).toContain("active:releases");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => (button.textContent ?? "").includes("Create New"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      view.container
        .querySelector("button[data-entry-create-active-open='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(entryListState.navigateCalls).toContain("/entries/releases/created-entry");
    expect(entryListState.listEntriesCalls).toContainEqual({ slug: "releases", force: true });

    entryListState.types = [articleType, faqType, releaseType];
    entryListState.entries.releases = [
      ...releaseEntries,
      entryListState.createEntry("release-2", "Patch release", "patch-release", "draft", "author-3", "Release Bot"),
    ];
    act(() => {
      entryListState.triggerCache("contentTypesList");
      entryListState.triggerCache("entries:releases");
    });
    await flush();

    expect(text(view.container)).toContain("Patch release");
  } finally {
    view.cleanup();
  }
});

test("EntryList surfaces content-type and entry loading failures", async () => {
  entryListState.nextContentTypesError = new Error("network");

  const errorView = mount(<EntryList />);
  try {
    await flush();
    expect(text(errorView.container)).toContain("Failed to load content types.");
  } finally {
    errorView.cleanup();
  }

  const articleType = entryListState.createType("articles", "Articles", 1);
  const articleEntries = [
    entryListState.createEntry("entry-1", "Cached article", "cached-article", "draft", "author-1", "Alex Doe"),
  ];

  entryListState.cachedTypes = [articleType];
  entryListState.types = [articleType];
  entryListState.cachedEntries = { articles: articleEntries };
  entryListState.entries = { articles: articleEntries };
  entryListState.nextEntriesError.set("articles", entryListState.apiError("Entries failed"));

  const entriesView = mount(<EntryList />);
  try {
    await flush();
    expect(text(entriesView.container)).toContain("Cached article");
    expect(text(entriesView.container)).toContain("Entries failed");
  } finally {
    entriesView.cleanup();
  }
});

test("EntryList covers delete flows, bulk delete cancellation, and partial bulk failures", async () => {
  const articleType = entryListState.createType("articles", "Articles", 2);
  const articleEntries = [
    entryListState.createEntry("entry-1", "Delete me", "delete-me", "draft", "author-1", "Alex Doe"),
    entryListState.createEntry("entry-2", "Keep me", "keep-me", "draft", "author-2", "Editor Two"),
  ];

  entryListState.cachedTypes = [articleType];
  entryListState.types = [articleType];
  entryListState.cachedEntries = { articles: articleEntries };
  entryListState.entries = { articles: [...articleEntries] };

  const view = mount(<EntryList />);

  try {
    await flush();

    entryListState.nextDeleteError.set(
      "articles:entry-1",
      entryListState.apiError("Delete blocked")
    );
    act(() => {
      view.container
        .querySelector("button[data-entry-delete-first='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      view.container
        .querySelector("button[data-entry-delete-confirm='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(text(view.container)).toContain("Failed to delete 1 entry.");

    act(() => {
      view.container
        .querySelector("button[data-entry-toggle-all='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      view.container
        .querySelector("button[data-entry-bulk-delete='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      view.container
        .querySelector("button[data-entry-bulk-apply='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(view.container.querySelector("[data-entry-delete-dialog='true']")).not.toBeNull();
    expect(entryListState.deleteEntryCalls).toHaveLength(1);

    entryListState.nextDeleteError.set(
      "articles:entry-2",
      entryListState.apiError("Bulk delete blocked")
    );

    act(() => {
      view.container
        .querySelector("button[data-entry-delete-confirm='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(text(view.container)).toContain("Failed to delete 1 entry.");
    expect(text(view.container)).toContain("Keep me");
    expect(text(view.container)).not.toContain("Delete me");
  } finally {
    view.cleanup();
  }
});
