// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { EntryList } from "../../../core/admin/ui/entries/EntryList";
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
  PageHeader: ({
    title,
    actions,
  }: {
    title: string;
    actions?: React.ReactNode;
  }) => (
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
  isApiClientError: () => false,
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
    return entryListState.createEntry(`${id}-copy`, slug, "Copy");
  },
  updateEntryMetadata: async (
    slug: string,
    id: string,
    input: Record<string, unknown>
  ) => {
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
    onSearchChange,
    onStatusChange,
    onTypeChange,
    onAuthorChange,
    onUpdatedFromChange,
    onUpdatedToChange,
    onClear,
  }: {
    search: string;
    status: string;
    typeValue: string;
    author: string;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onAuthorChange: (value: string) => void;
    onUpdatedFromChange: (value: string) => void;
    onUpdatedToChange: (value: string) => void;
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
    onActionChange: (value: "archive" | "delete") => void;
    onApply: () => void;
    onClear: () => void;
  }) => (
    <section data-selected-count={selectedCount}>
      <span>bulk:{action || "none"}</span>
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
    onCreated?: (
      entry: { id: string },
      typeSlug: string,
      openAfterCreate: boolean
    ) => void;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() =>
          onCreated?.(
            { id: "created-entry" },
            defaultTypeSlug ?? "articles",
            true
          )
        }
      >
        create entry
      </button>
    ) : null,
}));

vi.mock("@/ui/entries/EntryTable", () => ({
  EntryTable: ({
    entries,
    selectedKeys,
    onToggleEntry,
    onEdit,
    onDuplicate,
    onDelete,
  }: {
    entries: EntryListItem[];
    selectedKeys: string[];
    onToggleEntry: (id: string) => void;
    onEdit: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <table>
      <tbody>
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
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function mount(node: React.ReactNode) {
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

    act(() => {
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "search beta"
      )?.click();
    });
    expect(view.container.textContent).not.toContain("Alpha Entry");
    expect(view.container.textContent).toContain("Beta Product");

    act(() => {
      view.container
        .querySelectorAll("button")
        .forEach((button) => {
          if (button.textContent === "edit entry-2") button.click();
        });
    });
    expect(entryListState.navigateCalls).toContain("/entries/products/entry-2");

    act(() => {
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "New"
      )?.click();
    });
    act(() => {
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "create entry"
      )?.click();
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
    const checkboxes = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    );
    act(() => {
      checkboxes.forEach((checkbox) => {
        if (checkbox instanceof HTMLInputElement) checkbox.click();
      });
    });
    act(() => {
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "choose archive"
      )?.click();
    });
    await act(async () => {
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "apply bulk"
      )?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(entryListState.updateMetadataCalls).toEqual([
      { slug: "articles", id: "entry-1", input: { status: "archived" } },
      { slug: "products", id: "entry-2", input: { status: "archived" } },
    ]);
    expect(entryListState.toastSuccess).toHaveBeenCalledWith(
      "2 entries archived."
    );
  } finally {
    view.cleanup();
  }
});

test("EntryList bulk delete uses shared confirmation and keeps partial failure feedback", async () => {
  entryListState.nextDeleteError.set("products:entry-2", new Error("delete failed"));
  const view = mount(<EntryList />);

  try {
    await flushAsync();
    const checkboxes = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    );
    act(() => {
      checkboxes.forEach((checkbox) => {
        if (checkbox instanceof HTMLInputElement) checkbox.click();
      });
    });
    act(() => {
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "choose delete"
      )?.click();
    });
    act(() => {
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "apply bulk"
      )?.click();
    });
    await act(async () => {
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "Delete entries"
      )?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(entryListState.deleteEntryCalls).toEqual([
      { slug: "articles", id: "entry-1" },
      { slug: "products", id: "entry-2" },
    ]);
    expect(view.container.textContent).toContain("Deleted 1 entry; failed 1.");
    expect(entryListState.toastError).toHaveBeenCalledWith(
      "Deleted 1 entry; failed 1."
    );
  } finally {
    view.cleanup();
  }
});

test("EntryList refreshes all-entry and content-type caches on cache bus events", async () => {
  const view = mount(<EntryList />);

  try {
    await flushAsync();
    act(() => {
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
