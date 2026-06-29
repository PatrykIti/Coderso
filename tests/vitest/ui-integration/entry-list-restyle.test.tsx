// @vitest-environment happy-dom

// TASK-479-13-L03: locks the restyled Entries list (type filter counts, status
// tab strip + filtering, rounded-2xl DataTable with shared StatusBadge, bulk
// cluster on selection). Real EntryTable + StatusTabs render; the EntryFilters
// host is mocked so per-type counts stay assertable as plain DOM (the Radix
// Select would otherwise portal them away).

import React from "react";
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

type EntryListItem = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived" | "scheduled";
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name?: string; email: string } | null;
  contentType: { id: string; slug: string; name: string; status: string };
};

const tabsState = vi.hoisted(() => ({
  onValueChange: undefined as undefined | ((value: string) => void),
}));

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
    typeName: string,
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
      name: `${typeName} Author`,
      email: `${typeSlug}@example.com`,
    },
    contentType: { id: `type-${typeSlug}`, slug: typeSlug, name: typeName, status: "published" },
  });

  const state = {
    createType,
    createEntry,
    cachedTypes: null as ContentTypeSummary[] | null,
    types: [] as ContentTypeSummary[],
    cachedEntries: null as EntryListItem[] | null,
    entries: [] as EntryListItem[],
    reset() {
      listeners.clear();
      state.cachedTypes = null;
      state.types = [];
      state.cachedEntries = null;
      state.entries = [];
    },
    seed(types: ContentTypeSummary[], entries: EntryListItem[]) {
      state.types = types;
      state.cachedTypes = types;
      state.entries = entries;
      state.cachedEntries = entries;
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

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: () => void;
    "aria-label"?: string;
  }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      data-checked={String(checked)}
      checked={checked === true}
      onChange={() => onCheckedChange?.()}
      readOnly={false}
    />
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => {
    tabsState.onValueChange = onValueChange;
    return <div data-status-tabs="true">{children}</div>;
  },
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button type="button" data-tab-value={value} onClick={() => tabsState.onValueChange?.(value)}>
      {children}
    </button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  ConfirmActionDialog: () => null,
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: vi.fn() }),
}));

vi.mock("@/services/apiClient", () => ({ isApiClientError: () => false }));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => entryListState.cachedTypes,
  listContentTypesCached: async () => entryListState.types,
}));

vi.mock("@/services/entriesClient", () => ({
  getCachedAllEntries: () => entryListState.cachedEntries,
  listAllEntriesCached: async () => entryListState.entries,
  deleteEntry: async () => ({ ok: true }),
  duplicateEntry: async () => entryListState.entries[0],
  updateEntryMetadata: async () => entryListState.entries[0],
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (listener: (event: CacheEvent) => void) =>
    entryListState.subscribe(listener),
}));

vi.mock("@/ui/entries/EntryFilters", () => ({
  EntryFilters: ({
    typeOptions,
    onTypeChange,
    onStatusChange,
    onClear,
  }: {
    typeOptions: Array<{ value: string; label: string }>;
    onTypeChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onClear: () => void;
  }) => (
    <section data-entry-filters="true">
      <ul>
        {typeOptions.map((option) => (
          <li key={option.value} data-type-option={option.value}>
            {option.label}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onTypeChange("event")}>
        choose type event
      </button>
      <button type="button" onClick={() => onStatusChange("published")}>
        choose status published
      </button>
      <button type="button" onClick={onClear}>
        clear filters
      </button>
    </section>
  ),
}));

vi.mock("@/ui/entries/EntryBulkActionsBar", () => ({
  EntryBulkActionsBar: ({ selectedCount }: { selectedCount: number }) => (
    <section data-bulk-cluster="true" data-selected-count={selectedCount}>
      Selected {selectedCount} · Apply
    </section>
  ),
}));

vi.mock("@/ui/entries/EntryCreateDrawer", () => ({
  EntryCreateDrawer: () => null,
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
  tabsState.onValueChange = undefined;
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("list renders the type filter with per-type counts from cache", async () => {
  entryListState.seed(
    [
      entryListState.createType("article", "Article", 1),
      entryListState.createType("event", "Event", 1),
    ],
    [
      entryListState.createEntry("e1", "article", "Article", "Launch Plan", "published"),
      entryListState.createEntry("e2", "event", "Event", "Summer Meetup", "draft"),
    ]
  );

  const view = mount(<EntryList />);
  try {
    await flushAsync();
    expect(view.container.textContent).toContain("Article (1)");
    expect(view.container.textContent).toContain("Event (1)");
  } finally {
    view.cleanup();
  }
});

test("status tab strip shows counts derived from cached entries and drives statusFilter", async () => {
  entryListState.seed(
    [entryListState.createType("article", "Article", 3)],
    [
      entryListState.createEntry("e1", "article", "Article", "Alpha Published", "published"),
      entryListState.createEntry("e2", "article", "Article", "Beta Published", "published"),
      entryListState.createEntry("e3", "article", "Article", "Gamma Draft", "draft"),
    ]
  );

  const view = mount(<EntryList />);
  try {
    await flushAsync();
    // count pills are inline (label + count concatenated in textContent)
    expect(view.container.textContent).toContain("All3");
    expect(view.container.textContent).toContain("Published2");
    expect(view.container.textContent).toContain("Drafts1");
    expect(view.container.textContent).toContain("Alpha Published");
    expect(view.container.textContent).toContain("Gamma Draft");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button[data-tab-value]"))
        .find((button) => button.getAttribute("data-tab-value") === "draft")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Gamma Draft");
    expect(view.container.textContent).not.toContain("Alpha Published");
    expect(view.container.textContent).not.toContain("Beta Published");
  } finally {
    view.cleanup();
  }
});

test("table wrapper carries the rounded-2xl card classes and renders StatusBadge labels", async () => {
  entryListState.seed(
    [entryListState.createType("article", "Article", 1)],
    [entryListState.createEntry("e1", "article", "Article", "Launch", "scheduled")]
  );

  const view = mount(<EntryList />);
  try {
    await flushAsync();
    const tableWrapper = view.container.querySelector('[data-slot="data-table"]');
    expect(tableWrapper).not.toBeNull();
    expect(tableWrapper?.className).toContain("rounded-2xl");
    expect(tableWrapper?.className).toContain("shadow-card");
    // shared StatusBadge renders the raw status (CSS capitalizes for display)
    expect(view.container.textContent).toContain("scheduled");
    expect(view.container.textContent).toContain("Launch");
  } finally {
    view.cleanup();
  }
});

test("selecting a row surfaces the bulk actions cluster", async () => {
  entryListState.seed(
    [entryListState.createType("article", "Article", 2)],
    [
      entryListState.createEntry("e1", "article", "Article", "One", "published"),
      entryListState.createEntry("e2", "article", "Article", "Two", "draft"),
    ]
  );

  const view = mount(<EntryList />);
  try {
    await flushAsync();
    expect(view.container.querySelector('[data-bulk-cluster="true"]')).toBeNull();

    React.act(() => {
      const checkbox = view.container.querySelector("input[type='checkbox']");
      if (checkbox instanceof HTMLInputElement) checkbox.click();
    });

    const cluster = view.container.querySelector('[data-bulk-cluster="true"]');
    expect(cluster).not.toBeNull();
    expect(view.container.textContent).toContain("Apply");
  } finally {
    view.cleanup();
  }
});
