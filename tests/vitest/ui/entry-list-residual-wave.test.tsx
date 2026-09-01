// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { EntryListItem } from "../../../core/admin/services/entriesClient";

const state = vi.hoisted(() => {
  const listeners = new Set<(event: { key: string }) => void>();
  const createEntry = (
    id: string,
    typeSlug: string,
    title: string,
    status: "draft" | "published" = "published"
  ): EntryListItem => ({
    id,
    typeId: `type-${typeSlug}`,
    title,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    status,
    visibility: "public",
    hasPassword: false,
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

  type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
  };
  const deferred = <T,>(): Deferred<T> => {
    let resolve: (value: T) => void = () => {};
    let reject: (reason: unknown) => void = () => {};
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  return {
    createEntry,
    cachedEntries: null as ReturnType<typeof createEntry>[] | null,
    cachedTypes: null as Array<{ id: string; slug: string; name: string }> | null,
    entries: [] as ReturnType<typeof createEntry>[],
    types: [] as Array<{ id: string; slug: string; name: string }>,
    nextEntriesError: null as unknown,
    nextTypesError: null as unknown,
    nextMetadataError: null as unknown,
    entriesDeferred: null as Deferred<ReturnType<typeof createEntry>[]> | null,
    typesDeferred: null as Deferred<Array<{ id: string; slug: string; name: string }>> | null,
    nextDeleteError: new Map<string, unknown>(),
    deleteEntryCalls: [] as Array<{ slug: string; id: string }>,
    updateMetadataCalls: [] as Array<{ slug: string; id: string; input: Record<string, unknown> }>,
    listAllEntriesCalls: [] as Array<{ force?: boolean }>,
    listContentTypesCalls: [] as Array<{ force?: boolean }>,
    navigateCalls: [] as string[],
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    triggerCache(key: string) {
      for (const listener of listeners) listener({ key });
    },
    subscribe(listener: (event: { key: string }) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset() {
      listeners.clear();
      state.cachedEntries = null;
      state.cachedTypes = null;
      state.entries = [];
      state.types = [];
      state.nextEntriesError = null;
      state.nextTypesError = null;
      state.nextMetadataError = null;
      state.entriesDeferred = null;
      state.typesDeferred = null;
      state.nextDeleteError = new Map();
      state.deleteEntryCalls = [];
      state.updateMetadataCalls = [];
      state.listAllEntriesCalls = [];
      state.listContentTypesCalls = [];
      state.navigateCalls = [];
      state.toastSuccess.mockClear();
      state.toastError.mockClear();
    },
    newDeferred() {
      return deferred<ReturnType<typeof createEntry>[]>();
    },
    newTypesDeferred() {
      return deferred<Array<{ id: string; slug: string; name: string }>>();
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: state.toastSuccess,
    error: state.toastError,
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
  ListPaginationFooter: () => <footer />,
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div role="dialog" data-open={String(open)}>
      <h2>{title}</h2>
      <p>{description}</p>
      <button type="button" data-confirm-delete onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" data-cancel-delete onClick={() => onOpenChange(false)}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => state.navigateCalls.push(href),
  }),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => state.cachedTypes,
  listContentTypesCached: async (options?: { force?: boolean }) => {
    state.listContentTypesCalls.push({ force: options?.force });
    if (state.typesDeferred) return state.typesDeferred.promise;
    if (state.nextTypesError) {
      const error = state.nextTypesError;
      state.nextTypesError = null;
      throw error;
    }
    return state.types;
  },
}));

vi.mock("@/services/entriesClient", () => ({
  getCachedAllEntries: () => state.cachedEntries,
  listAllEntriesCached: async (options?: { force?: boolean }) => {
    state.listAllEntriesCalls.push({ force: options?.force });
    if (state.entriesDeferred) return state.entriesDeferred.promise;
    if (state.nextEntriesError) {
      const error = state.nextEntriesError;
      state.nextEntriesError = null;
      throw error;
    }
    return state.entries;
  },
  deleteEntry: async (slug: string, id: string) => {
    state.deleteEntryCalls.push({ slug, id });
    const error = state.nextDeleteError.get(`${slug}:${id}`);
    if (error) throw error;
    return { ok: true };
  },
  duplicateEntry: async (slug: string, id: string) => state.createEntry(`${id}-copy`, slug, "Copy"),
  updateEntryMetadata: async (slug: string, id: string, input: Record<string, unknown>) => {
    state.updateMetadataCalls.push({ slug, id, input });
    if (state.nextMetadataError) {
      const error = state.nextMetadataError;
      state.nextMetadataError = null;
      throw error;
    }
    return null;
  },
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (listener: (event: { key: string }) => void) => state.subscribe(listener),
}));

vi.mock("@/ui/entries/EntryFilters", () => ({
  EntryFilters: () => <section data-filters="true" />,
}));

vi.mock("@/ui/entries/EntryBulkActionsBar", () => ({
  EntryBulkActionsBar: ({
    selectedCount,
    onActionChange,
    onApply,
  }: {
    selectedCount: number;
    onActionChange: (value: "archive" | "delete" | "draft") => void;
    onApply: () => void;
    onClear: () => void;
  }) => (
    <section data-selected-count={selectedCount}>
      <button type="button" onClick={() => onActionChange("delete")}>
        choose delete
      </button>
      <button type="button" onClick={() => onActionChange("draft")}>
        choose draft
      </button>
      <button type="button" onClick={onApply}>
        apply bulk
      </button>
    </section>
  ),
}));

vi.mock("@/ui/entries/EntryCreateDrawer", () => ({
  EntryCreateDrawer: ({
    open,
    onCreateError,
  }: {
    open: boolean;
    onCreateError?: (error: unknown) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onCreateError?.(new Error("create failed"))}>
        create fail
      </button>
    ) : null,
}));

vi.mock("@/ui/entries/EntryGrid", () => ({
  EntryGrid: () => <section data-grid="true" />,
}));

vi.mock("@/ui/entries/EntryTable", () => ({
  EntryTable: ({
    entries,
    onToggleEntry,
    onEdit,
    onDuplicate,
    onDelete,
  }: {
    entries: Array<{ id: string; title: string }>;
    onToggleEntry: (id: string) => void;
    onEdit: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.title}</td>
            <td>
              <button type="button" onClick={() => onToggleEntry(entry.id)}>
                toggle {entry.id}
              </button>
              <button type="button" onClick={() => onEdit(entry.id)}>
                edit {entry.id}
              </button>
              <button type="button" onClick={() => onDelete(entry.id)}>
                delete {entry.id}
              </button>
              <button type="button" onClick={() => onDuplicate(entry.id)}>
                duplicate {entry.id}
              </button>
            </td>
          </tr>
        ))}
        <tr>
          <td colSpan={2}>
            <button type="button" onClick={() => onEdit("missing-entry")}>
              edit missing
            </button>
            <button type="button" onClick={() => onDelete("missing-entry")}>
              delete missing
            </button>
            <button type="button" onClick={() => onDuplicate("missing-entry")}>
              duplicate missing
            </button>
            <button type="button" onClick={() => onToggleEntry("missing-entry")}>
              toggle missing
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  ),
}));

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { EntryList } from "../../../core/admin/ui/entries/EntryList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const click = (container: HTMLElement, selector: string) => {
  React.act(() => {
    container.querySelector(selector)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  state.reset();
});

test("initial load failures surface the generic entries fallback and the api types message", async () => {
  state.nextEntriesError = new Error("entries boom");
  const entriesView = mount(<EntryList />);
  try {
    await flush();
    expect(entriesView.container.textContent).toContain("Failed to load entries.");
  } finally {
    entriesView.cleanup();
  }

  state.nextTypesError = { name: "ApiClientError", message: "types offline" };
  const typesView = mount(<EntryList />);
  try {
    await flush();
    expect(typesView.container.textContent).toContain("types offline");
  } finally {
    typesView.cleanup();
  }
});

test("unmounting before the initial loads settle runs the entries active guards", async () => {
  const first = state.newDeferred();
  state.entriesDeferred = first;
  const firstView = mount(<EntryList />);
  firstView.cleanup();
  await React.act(async () => {
    first.resolve(state.entries);
  });

  const second = state.newDeferred();
  state.entriesDeferred = second;
  const secondView = mount(<EntryList />);
  secondView.cleanup();
  await React.act(async () => {
    second.reject(new Error("late failure"));
  });
});

test("unmounting before the initial loads settle runs the types active guards", async () => {
  const first = state.newTypesDeferred();
  state.typesDeferred = first;
  const firstView = mount(<EntryList />);
  firstView.cleanup();
  await React.act(async () => {
    first.resolve(state.types);
  });

  const second = state.newTypesDeferred();
  state.typesDeferred = second;
  const secondView = mount(<EntryList />);
  secondView.cleanup();
  await React.act(async () => {
    second.reject(new Error("late failure"));
  });
});

test("entries without an author are skipped when building author options", async () => {
  state.entries = [{ ...state.createEntry("entry-1", "articles", "Alpha Entry"), author: null }];
  const view = mount(<EntryList />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Alpha Entry");
  } finally {
    view.cleanup();
  }
});

test("edit, delete, duplicate, and toggle guards return for unknown ids", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  const view = mount(<EntryList />);
  try {
    await flush();
    clickByText(view.container, "edit missing");
    clickByText(view.container, "delete missing");
    clickByText(view.container, "duplicate missing");
    clickByText(view.container, "toggle missing");
    expect(state.navigateCalls).toEqual([]);
    expect(view.container.querySelector('[role="dialog"]')?.getAttribute("data-open")).toBe(
      "false"
    );
    expect(view.container.getAttribute("data-selected-count")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("bulk apply without a chosen action is a no-op", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  const view = mount(<EntryList />);
  try {
    await flush();
    // Select an entry so the bulk bar renders, but apply with NO action chosen.
    clickByText(view.container, "toggle entry-1");
    clickByText(view.container, "apply bulk");
    expect(state.updateMetadataCalls).toEqual([]);
    expect(view.container.querySelector('[role="dialog"]')?.getAttribute("data-open")).toBe(
      "false"
    );
  } finally {
    view.cleanup();
  }
});

test("confirming delete with no pending request is a no-op", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  const view = mount(<EntryList />);
  try {
    await flush();
    click(view.container, "[data-confirm-delete]");
    expect(state.deleteEntryCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("single delete success toasts and cancel after close clears the request", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  const view = mount(<EntryList />);
  try {
    await flush();
    clickByText(view.container, "delete entry-1");
    expect(view.container.querySelector('[role="dialog"]')?.getAttribute("data-open")).toBe("true");
    click(view.container, "[data-confirm-delete]");
    await flush();
    expect(state.deleteEntryCalls).toEqual([{ slug: "articles", id: "entry-1" }]);
    expect(state.toastSuccess).toHaveBeenCalledWith("Entry deleted.");

    // The dialog is closed now; a cancel in that state clears a stale request.
    click(view.container, "[data-cancel-delete]");
  } finally {
    view.cleanup();
  }
});

test("cache bus refresh failures are swallowed", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  state.nextEntriesError = new Error("entries offline");
  state.nextTypesError = new Error("types offline");
  const view = mount(<EntryList />);
  try {
    await flush();
    React.act(() => {
      state.triggerCache(cacheKeys.entriesAllList);
      state.triggerCache(cacheKeys.contentTypesList);
    });
    await flush();
    expect(state.listAllEntriesCalls.length).toBeGreaterThanOrEqual(2);
    expect(state.listContentTypesCalls.length).toBeGreaterThanOrEqual(2);
  } finally {
    view.cleanup();
  }
});

test("create errors surface through the toast adapter", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  state.types = [{ id: "type-articles", slug: "articles", name: "Articles" }];
  const view = mount(<EntryList />);
  try {
    await flush();
    const createOpen = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "New"
    );
    React.act(() => {
      createOpen?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    clickByText(view.container, "create fail");
    expect(state.toastError).toHaveBeenCalledWith("Failed to create entry.");
  } finally {
    view.cleanup();
  }
});

test("bulk move to draft reports a full failure through the toast adapter", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  state.nextMetadataError = new Error("move failed");
  const view = mount(<EntryList />);
  try {
    await flush();
    clickByText(view.container, "toggle entry-1");
    clickByText(view.container, "choose draft");
    clickByText(view.container, "apply bulk");
    await flush();
    expect(state.updateMetadataCalls).toHaveLength(1);
    expect(state.toastError).toHaveBeenCalledWith("Failed to move 1 entry to draft.");
    expect(view.container.textContent).toContain("Failed to move 1 entry to draft.");
  } finally {
    view.cleanup();
  }
});

test("background entries refresh surfaces an api client error message", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  const view = mount(<EntryList />);
  try {
    await flush();
    state.nextEntriesError = {
      name: "ApiClientError",
      message: "entries api down",
      code: "request_failed",
      status: 400,
    };
    React.act(() => {
      state.triggerCache(cacheKeys.entriesAllList);
    });
    await flush();
    expect(view.container.textContent).toContain("entries api down");
  } finally {
    view.cleanup();
  }
});

test("background types refresh surfaces an api client error message", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  state.types = [{ id: "type-articles", slug: "articles", name: "Articles" }];
  const view = mount(<EntryList />);
  try {
    await flush();
    state.nextTypesError = {
      name: "ApiClientError",
      message: "types api down",
      code: "request_failed",
      status: 400,
    };
    React.act(() => {
      state.triggerCache(cacheKeys.contentTypesList);
    });
    await flush();
    expect(view.container.textContent).toContain("types api down");
  } finally {
    view.cleanup();
  }
});

test("background types refresh surfaces the generic fallback message", async () => {
  state.entries = [state.createEntry("entry-1", "articles", "Alpha Entry")];
  state.types = [{ id: "type-articles", slug: "articles", name: "Articles" }];
  const view = mount(<EntryList />);
  try {
    await flush();
    state.nextTypesError = new Error("types offline");
    React.act(() => {
      state.triggerCache(cacheKeys.contentTypesList);
    });
    await flush();
    expect(view.container.textContent).toContain("Failed to load content types.");
  } finally {
    view.cleanup();
  }
});
