// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { EntryList, filterEntries } from "../../../core/admin/ui/entries/EntryList";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

type CacheEvent = { key: string };

type ContentTypeSummary = {
  id: string;
  slug: string;
  name: string;
  schema: Record<string, unknown>;
  entryCount?: number;
};

type EntryListItem = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived" | "scheduled";
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name?: string;
    email: string;
  } | null;
  contentType: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
};

const entryListState = vi.hoisted(() => {
  const listeners = new Set<(event: CacheEvent) => void>();

  const createType = (slug: string, name: string, entryCount = 0) => ({
    id: `type-${slug}`,
    slug,
    name,
    schema: { type: "object" },
    entryCount,
  });

  const createEntry = (
    id: string,
    typeSlug: string,
    title: string,
    status: "draft" | "published" | "archived" | "scheduled" = "draft"
  ) => ({
    id,
    typeId: `type-${typeSlug}`,
    title,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    status,
    data: {},
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
    author: {
      id: `author-${typeSlug}`,
      name: `${typeSlug} Author`,
      email: `${typeSlug}@example.com`,
    },
    contentType: {
      id: `type-${typeSlug}`,
      slug: typeSlug,
      name: typeSlug === "articles" ? "Articles" : "Products",
      status: "published",
    },
  });

  const state = {
    createType,
    createEntry,
    cachedTypes: null as ContentTypeSummary[] | null,
    types: [] as ContentTypeSummary[],
    cachedEntries: null as EntryListItem[] | null,
    entries: [] as EntryListItem[],
    nextEntriesError: null as unknown,
    nextTypesError: null as unknown,
    nextDeleteError: new Map<string, unknown>(),
    nextMetadataError: new Map<string, unknown>(),
    listAllEntriesCalls: [] as Array<{ force?: boolean }>,
    listContentTypesCalls: [] as Array<{ force?: boolean }>,
    deleteEntryCalls: [] as Array<{ slug: string; id: string }>,
    duplicateEntryCalls: [] as Array<{ slug: string; id: string }>,
    nextDuplicateError: null as unknown,
    updateMetadataCalls: [] as Array<{
      slug: string;
      id: string;
      input: Record<string, unknown>;
    }>,
    navigateCalls: [] as string[],
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    reset() {
      listeners.clear();
      state.cachedTypes = null;
      state.types = [];
      state.cachedEntries = null;
      state.entries = [];
      state.nextEntriesError = null;
      state.nextTypesError = null;
      state.nextDeleteError = new Map<string, unknown>();
      state.nextMetadataError = new Map<string, unknown>();
      state.listAllEntriesCalls = [];
      state.listContentTypesCalls = [];
      state.deleteEntryCalls = [];
      state.duplicateEntryCalls = [];
      state.nextDuplicateError = null;
      state.updateMetadataCalls = [];
      state.navigateCalls = [];
      state.toastSuccess.mockClear();
      state.toastError.mockClear();
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

vi.mock("sonner", () => ({
  toast: {
    success: entryListState.toastSuccess,
    error: entryListState.toastError,
  },
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
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

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}));

vi.mock("@/ui/shared/ListPaginationFooter", () => ({
  ListPaginationFooter: ({
    pagination,
    resourceLabel,
  }: {
    pagination: { rangeStart: number; rangeEnd: number; totalItems: number };
    resourceLabel: string;
  }) => (
    <footer>
      Showing {pagination.rangeStart}-{pagination.rangeEnd} of {pagination.totalItems}{" "}
      {resourceLabel}
    </footer>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => entryListState.navigateCalls.push(href),
  }),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => entryListState.cachedTypes,
  listContentTypesCached: async (options?: { force?: boolean }) => {
    entryListState.listContentTypesCalls.push({ force: options?.force });
    if (entryListState.nextTypesError) {
      const error = entryListState.nextTypesError;
      entryListState.nextTypesError = null;
      throw error;
    }
    return entryListState.types;
  },
}));

vi.mock("@/services/entriesClient", () => ({
  getCachedAllEntries: () => entryListState.cachedEntries,
  listAllEntriesCached: async (options?: { force?: boolean }) => {
    entryListState.listAllEntriesCalls.push({ force: options?.force });
    if (entryListState.nextEntriesError) {
      const error = entryListState.nextEntriesError;
      entryListState.nextEntriesError = null;
      throw error;
    }
    return entryListState.entries;
  },
  deleteEntry: async (slug: string, id: string) => {
    entryListState.deleteEntryCalls.push({ slug, id });
    const error = entryListState.nextDeleteError.get(`${slug}:${id}`);
    if (error) throw error;
    entryListState.entries = entryListState.entries.filter((entry) => entry.id !== id);
    return { ok: true };
  },
  duplicateEntry: async (slug: string, id: string) => {
    entryListState.duplicateEntryCalls.push({ slug, id });
    if (entryListState.nextDuplicateError) {
      const error = entryListState.nextDuplicateError;
      entryListState.nextDuplicateError = null;
      throw error;
    }
    return entryListState.createEntry(`${id}-copy`, slug, "Copy");
  },
  updateEntryMetadata: async (slug: string, id: string, input: Record<string, unknown>) => {
    entryListState.updateMetadataCalls.push({ slug, id, input });
    const error = entryListState.nextMetadataError.get(`${slug}:${id}`);
    if (error) throw error;
    return entryListState.entries.find((entry) => entry.id === id) ?? null;
  },
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (listener: (event: CacheEvent) => void) =>
    entryListState.subscribe(listener),
}));

vi.mock("@/ui/entries/EntryFilters", () => ({
  EntryFilters: ({
    search,
    status,
    typeValue,
    author,
    view,
    advancedOpen,
    onSearchChange,
    onStatusChange,
    onTypeChange,
    onAuthorChange,
    onUpdatedFromChange,
    onUpdatedToChange,
    onViewChange,
    onAdvancedOpenChange,
    onClear,
  }: {
    search: string;
    status: string;
    typeValue: string;
    author: string;
    view: string;
    advancedOpen: boolean;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onAuthorChange: (value: string) => void;
    onUpdatedFromChange: (value: string) => void;
    onUpdatedToChange: (value: string) => void;
    onViewChange: (value: "list" | "grid") => void;
    onAdvancedOpenChange: (value: boolean) => void;
    onClear: () => void;
  }) => (
    <section>
      <input
        aria-label="search entries"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <button type="button" onClick={() => onSearchChange("beta")}>
        search beta
      </button>
      <button type="button" onClick={() => onStatusChange("published")}>
        status:{status}
      </button>
      <button type="button" onClick={() => onTypeChange("products")}>
        type:{typeValue}
      </button>
      <button type="button" onClick={() => onAuthorChange("author-products")}>
        author:{author}
      </button>
      <button type="button" onClick={() => onUpdatedFromChange("2026-03-01")}>
        from
      </button>
      <button type="button" onClick={() => onUpdatedToChange("2026-03-31")}>
        to
      </button>
      <button type="button" onClick={() => onAdvancedOpenChange(!advancedOpen)}>
        advanced:{String(advancedOpen)}
      </button>
      <button type="button" onClick={() => onViewChange("grid")}>
        view:{view}
      </button>
      <button type="button" onClick={onClear}>
        clear filters
      </button>
    </section>
  ),
}));

vi.mock("@/ui/entries/EntryBulkActionsBar", () => ({
  EntryBulkActionsBar: ({
    selectedCount,
    action,
    onActionChange,
    onApply,
    onClear,
  }: {
    selectedCount: number;
    action: string;
    onActionChange: (value: "archive" | "delete" | "draft") => void;
    onApply: () => void;
    onClear: () => void;
  }) => (
    <section data-selected-count={selectedCount}>
      <span>bulk:{action || "none"}</span>
      <button type="button" onClick={() => onActionChange("draft")}>
        choose draft
      </button>
      <button type="button" onClick={() => onActionChange("archive")}>
        choose archive
      </button>
      <button type="button" onClick={() => onActionChange("delete")}>
        choose delete
      </button>
      <button type="button" onClick={onApply}>
        apply bulk
      </button>
      <button type="button" onClick={onClear}>
        clear selection
      </button>
    </section>
  ),
}));

vi.mock("@/ui/entries/EntryCreateDrawer", () => ({
  EntryCreateDrawer: ({
    open,
    defaultTypeSlug,
    onCreated,
  }: {
    open: boolean;
    defaultTypeSlug?: string | null;
    onCreated?: (entry: { id: string }, typeSlug: string, openAfterCreate: boolean) => void;
  }) =>
    open ? (
      <>
        <button
          type="button"
          onClick={() => onCreated?.({ id: "created-entry" }, defaultTypeSlug ?? "articles", true)}
        >
          create entry
        </button>
        <button
          type="button"
          onClick={() => onCreated?.({ id: "created-entry" }, defaultTypeSlug ?? "articles", false)}
        >
          create entry no navigate
        </button>
      </>
    ) : null,
}));

vi.mock("@/ui/entries/EntryGrid", () => ({
  EntryGrid: ({
    entries,
    emptyMessage,
  }: {
    entries: Array<{ id: string; title: string }>;
    emptyMessage?: string;
  }) => (
    <section data-grid="true">
      <span>{emptyMessage ?? `grid:${entries.length}`}</span>
      {entries.map((entry) => (
        <div key={entry.id}>{entry.title}</div>
      ))}
    </section>
  ),
}));

vi.mock("@/ui/entries/EntryTable", () => ({
  EntryTable: ({
    entries,
    selectedKeys,
    onToggleAll,
    onToggleEntry,
    onEdit,
    onDuplicate,
    onDelete,
  }: {
    entries: EntryListItem[];
    selectedKeys: string[];
    onToggleAll?: () => void;
    onToggleEntry: (id: string) => void;
    onEdit: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <table>
      <tbody>
        <tr>
          <td>
            <button type="button" onClick={onToggleAll}>
              toggle all entries
            </button>
          </td>
        </tr>
        {entries.map((entry) => {
          const key = `${entry.contentType.slug}:${entry.id}`;
          return (
            <tr key={key} data-entry-key={key}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`select ${entry.title}`}
                  checked={selectedKeys.includes(key)}
                  onChange={() => onToggleEntry(entry.id)}
                  readOnly={false}
                />
              </td>
              <td>{entry.title}</td>
              <td>{entry.contentType.name}</td>
              <td>
                <button type="button" onClick={() => onEdit(entry.id)}>
                  edit {entry.id}
                </button>
                <button type="button" onClick={() => onDuplicate(entry.id)}>
                  duplicate {entry.id}
                </button>
                <button type="button" onClick={() => onDelete(entry.id)}>
                  delete {entry.id}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function flushAsync() {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function mount(node: React.ReactNode) {
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
}

beforeEach(() => {
  entryListState.reset();
  const types = [
    entryListState.createType("articles", "Articles", 1),
    entryListState.createType("products", "Products", 1),
  ];
  const entries = [
    entryListState.createEntry("entry-1", "articles", "Alpha Entry", "draft"),
    entryListState.createEntry("entry-2", "products", "Beta Product", "published"),
  ];
  entryListState.types = types;
  entryListState.cachedTypes = types;
  entryListState.entries = entries;
  entryListState.cachedEntries = entries;
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("EntryList hydrates all entries cache, filters rows, navigates, and creates in current type scope", async () => {
  const view = mount(<EntryList />);

  try {
    await flushAsync();

    expect(view.container.textContent).toContain("Entries");
    expect(entryListState.listAllEntriesCalls).toEqual([{ force: false }]);
    expect(view.container.textContent).toContain("Alpha Entry");
    expect(view.container.textContent).toContain("Beta Product");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "search beta")
        ?.click();
    });
    expect(view.container.textContent).not.toContain("Alpha Entry");
    expect(view.container.textContent).toContain("Beta Product");

    React.act(() => {
      view.container.querySelectorAll("button").forEach((button) => {
        if (button.textContent === "edit entry-2") button.click();
      });
    });
    expect(entryListState.navigateCalls).toContain("/entries/products/entry-2");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "New")
        ?.click();
    });
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "create entry")
        ?.click();
    });
    expect(entryListState.navigateCalls).toContain("/entries/articles/created-entry");
    expect(entryListState.toastSuccess).toHaveBeenCalledWith("Entry created.");
  } finally {
    view.cleanup();
  }
});

test("EntryList bulk updates selected row refs with their content type slugs", async () => {
  const view = mount(<EntryList />);

  try {
    await flushAsync();
    const checkboxes = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    React.act(() => {
      checkboxes.forEach((checkbox) => {
        if (checkbox instanceof HTMLInputElement) checkbox.click();
      });
    });
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "choose archive")
        ?.click();
    });
    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "apply bulk")
        ?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(entryListState.updateMetadataCalls).toEqual([
      { slug: "articles", id: "entry-1", input: { status: "archived" } },
      { slug: "products", id: "entry-2", input: { status: "archived" } },
    ]);
    expect(entryListState.toastSuccess).toHaveBeenCalledWith("2 entries archived.");
  } finally {
    view.cleanup();
  }
});

test("EntryList bulk delete uses shared confirmation and keeps partial failure feedback", async () => {
  entryListState.nextDeleteError.set("products:entry-2", new Error("delete failed"));
  const view = mount(<EntryList />);

  try {
    await flushAsync();
    const checkboxes = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    React.act(() => {
      checkboxes.forEach((checkbox) => {
        if (checkbox instanceof HTMLInputElement) checkbox.click();
      });
    });
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "choose delete")
        ?.click();
    });
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "apply bulk")
        ?.click();
    });
    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Delete entries")
        ?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(entryListState.deleteEntryCalls).toEqual([
      { slug: "articles", id: "entry-1" },
      { slug: "products", id: "entry-2" },
    ]);
    expect(view.container.textContent).toContain("Deleted 1 entry; failed 1.");
    expect(entryListState.toastError).toHaveBeenCalledWith("Deleted 1 entry; failed 1.");
  } finally {
    view.cleanup();
  }
});

test("EntryList refreshes all-entry and content-type caches on cache bus events", async () => {
  const view = mount(<EntryList />);

  try {
    await flushAsync();
    React.act(() => {
      entryListState.triggerCache(cacheKeys.entriesAllList);
      entryListState.triggerCache(cacheKeys.contentTypesList);
    });
    await flushAsync();

    expect(entryListState.listAllEntriesCalls).toContainEqual({ force: true });
    expect(entryListState.listContentTypesCalls).toContainEqual({ force: true });
  } finally {
    view.cleanup();
  }
});

test("filterEntries matches query, status, type, author, and date boundaries", () => {
  const { createEntry } = entryListState;
  const entries = [
    createEntry("entry-1", "articles", "Alpha Entry", "draft"),
    createEntry("entry-2", "products", "Beta Product", "published"),
    createEntry("entry-3", "articles", "Scheduled Piece", "scheduled"),
  ];

  const match = (filters: Record<string, string>) =>
    filterEntries(entries as never, {
      query: filters.query ?? "",
      status: filters.status ?? "all",
      typeSlug: filters.typeSlug ?? "all",
      author: filters.author ?? "any",
      updatedFrom: filters.updatedFrom ?? "",
      updatedTo: filters.updatedTo ?? "",
    }).map((entry) => entry.id);

  expect(match({ query: "beta" })).toEqual(["entry-2"]);
  expect(match({ query: "product" })).toEqual(["entry-2"]);
  expect(match({ status: "draft" })).toEqual(["entry-1"]);
  expect(match({ typeSlug: "articles" })).toEqual(["entry-1", "entry-3"]);
  expect(match({ author: "author-products" })).toEqual(["entry-2"]);
  // The fixture dates are 2026-03-11; both boundaries keep entry-2.
  expect(match({ updatedFrom: "2026-03-11", updatedTo: "2026-03-11" })).toEqual([
    "entry-1",
    "entry-2",
    "entry-3",
  ]);
  // Invalid boundaries degrade to no filtering.
  expect(match({ updatedFrom: "not-a-date" })).toEqual(["entry-1", "entry-2", "entry-3"]);
  expect(match({ query: "missing" })).toEqual([]);
});

test("grid view persists to localStorage and renders the grid surface", async () => {
  window.localStorage.setItem("entries.view", "grid");
  const view = mount(<EntryList />);
  try {
    await flushAsync();
    expect(view.container.querySelector('[data-grid="true"]')).not.toBeNull();
    expect(view.container.textContent).toContain("Alpha Entry");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "view:grid")
        ?.click();
    });
    expect(window.localStorage.getItem("entries.view")).toBe("grid");
  } finally {
    view.cleanup();
    window.localStorage.removeItem("entries.view");
  }
});

test("load failures surface the api message and generic fallbacks", async () => {
  entryListState.cachedEntries = null;
  entryListState.entries = [];
  entryListState.nextEntriesError = { name: "ApiClientError", message: "entries offline" };
  const entriesView = mount(<EntryList />);
  try {
    await flushAsync();
    expect(entriesView.container.textContent).toContain("entries offline");
  } finally {
    entriesView.cleanup();
  }

  entryListState.cachedEntries = null;
  entryListState.entries = [];
  entryListState.cachedTypes = null;
  entryListState.types = [];
  entryListState.nextTypesError = new Error("types boom");
  const typesView = mount(<EntryList />);
  try {
    await flushAsync();
    expect(typesView.container.textContent).toContain("Failed to load content types.");
  } finally {
    typesView.cleanup();
  }
});

test("selection toggles, toggle-all, and clear selection update the visible scope", async () => {
  const view = mount(<EntryList />);
  try {
    await flushAsync();
    const checkboxes = () => Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    React.act(() => {
      (checkboxes()[0] as HTMLInputElement | undefined)?.click();
    });
    expect(view.container.querySelector('[data-selected-count="1"]')).not.toBeNull();

    React.act(() => {
      (checkboxes()[0] as HTMLInputElement | undefined)?.click();
    });
    expect(view.container.querySelector('[data-selected-count="1"]')).toBeNull();

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "toggle all entries")
        ?.click();
    });
    expect(view.container.querySelector('[data-selected-count="2"]')).not.toBeNull();

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "toggle all entries")
        ?.click();
    });
    expect(view.container.querySelector('[data-selected-count="2"]')).toBeNull();

    React.act(() => {
      (checkboxes()[0] as HTMLInputElement | undefined)?.click();
    });
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "clear selection")
        ?.click();
    });
    expect(view.container.querySelector('[data-selected-count="1"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("bulk draft reports partial failures with the draft-specific message", async () => {
  entryListState.nextMetadataError.set("products:entry-2", new Error("metadata failed"));
  const view = mount(<EntryList />);
  try {
    await flushAsync();
    const checkboxes = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    React.act(() => {
      checkboxes.forEach((checkbox) => {
        if (checkbox instanceof HTMLInputElement) checkbox.click();
      });
    });
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "choose draft")
        ?.click();
    });
    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "apply bulk")
        ?.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Moved 1 entry to draft; failed 1.");
  } finally {
    view.cleanup();
  }
});

test("duplicate success navigates and failures surface inline and toast feedback", async () => {
  const view = mount(<EntryList />);
  try {
    await flushAsync();
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "duplicate entry-1")
        ?.click();
    });
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(entryListState.duplicateEntryCalls).toEqual([{ slug: "articles", id: "entry-1" }]);
    expect(entryListState.navigateCalls).toContain("/entries/articles/entry-1-copy");
    expect(entryListState.toastSuccess).toHaveBeenCalledWith("Entry duplicated.");

    entryListState.nextDuplicateError = new Error("duplicate boom");
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "duplicate entry-2")
        ?.click();
    });
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Failed to duplicate entry.");
    expect(entryListState.toastError).toHaveBeenCalledWith("Failed to duplicate entry.");

    entryListState.nextDuplicateError = { name: "ApiClientError", message: "duplicate denied" };
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "duplicate entry-2")
        ?.click();
    });
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("duplicate denied");
    expect(entryListState.toastError).toHaveBeenCalledWith("duplicate denied");
  } finally {
    view.cleanup();
  }
});

test("create honors the type scope and openAfterCreate preference", async () => {
  const view = mount(<EntryList />);
  try {
    await flushAsync();
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "type:all")
        ?.click();
    });
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "New")
        ?.click();
    });
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "create entry")
        ?.click();
    });
    expect(entryListState.navigateCalls).toContain("/entries/products/created-entry");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "create entry no navigate")
        ?.click();
    });
    const createsWithoutNavigation = entryListState.navigateCalls.filter(
      (path) => path === "/entries/articles/created-entry"
    );
    expect(createsWithoutNavigation).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("clear filters resets every filter control", async () => {
  const view = mount(<EntryList />);
  try {
    await flushAsync();
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "search beta")
        ?.click();
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "from")
        ?.click();
    });
    expect(view.container.textContent).not.toContain("Alpha Entry");
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "clear filters")
        ?.click();
    });
    expect(view.container.textContent).toContain("Alpha Entry");
    expect(view.container.textContent).toContain("Beta Product");
  } finally {
    view.cleanup();
  }
});

test("a refresh failure through a cache event surfaces the alert", async () => {
  const view = mount(<EntryList />);
  try {
    await flushAsync();
    entryListState.nextEntriesError = new Error("refresh boom");
    React.act(() => {
      entryListState.triggerCache(cacheKeys.entriesAllList);
    });
    await flushAsync();
    expect(view.container.textContent).toContain("Failed to load entries.");
  } finally {
    view.cleanup();
  }
});
