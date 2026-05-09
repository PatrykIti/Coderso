// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type {
  ListingQueryRecord,
  ListingTemplateRecord,
} from "../../../core/admin/services/listingsClient";

const listingPageState = vi.hoisted(() => ({
  navigate: vi.fn(),
  refreshQueries: vi.fn(async () => undefined),
  refreshTemplates: vi.fn(async () => undefined),
  deleteListingQuery: vi.fn(async () => undefined),
  deleteListingTemplate: vi.fn(async () => undefined),
  queryItems: [
    {
      id: "listing-query-1",
      name: "Services query",
      description: "Service listings",
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: "services", includeDrafts: false },
        filters: [],
        sort: [{ field: "updatedAt", dir: "desc" }],
        pagination: { limit: 12, offset: 0 },
        fields: ["id", "title"],
      },
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
  ] satisfies ListingQueryRecord[],
  templateItems: [
    {
      id: "listing-template-1",
      name: "Cards template",
      slug: "cards",
      description: "Cards",
      layout: "grid",
      config: {
        fields: [],
        itemActions: [],
        emptyState: {
          title: "No items found",
          description: null,
          ctaLabel: null,
          ctaHref: null,
        },
        style: { columns: 3, gap: "md", cardVariant: "default" },
      },
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
  ] satisfies ListingTemplateRecord[],
  queryError: null as string | null,
  templateError: null as string | null,
  reset() {
    this.navigate.mockReset();
    this.refreshQueries.mockReset();
    this.refreshQueries.mockResolvedValue(undefined);
    this.refreshTemplates.mockReset();
    this.refreshTemplates.mockResolvedValue(undefined);
    this.deleteListingQuery.mockReset();
    this.deleteListingQuery.mockResolvedValue(undefined);
    this.deleteListingTemplate.mockReset();
    this.deleteListingTemplate.mockResolvedValue(undefined);
    this.queryError = null;
    this.templateError = null;
  },
}));

const tabsMockState = vi.hoisted(() => ({
  currentValue: "queries",
  onValueChange: undefined as undefined | ((value: string) => void),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/tabs", () => {
  return {
    Tabs: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
    }) => {
      tabsMockState.currentValue = value ?? "queries";
      tabsMockState.onValueChange = onValueChange;
      return <div>{children}</div>;
    },
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => {
      return (
        <button type="button" onClick={() => tabsMockState.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
    TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => {
      return tabsMockState.currentValue === value ? <div>{children}</div> : null;
    },
  };
});

vi.mock("@/services/listingsClient", () => ({
  deleteListingQuery: listingPageState.deleteListingQuery,
  deleteListingTemplate: listingPageState.deleteListingTemplate,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: listingPageState.navigate,
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    confirmLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  }) =>
    open ? (
      <div>
        <p>{title}</p>
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("@/ui/shared/ListPaginationFooter", () => ({
  ListPaginationFooter: ({ resourceLabel }: { resourceLabel: string }) => (
    <div>{`pagination:${resourceLabel}`}</div>
  ),
}));

vi.mock("../../../core/admin/ui/listings/ListingBulkActionsBar", () => ({
  ListingBulkActionsBar: ({
    selectedCount,
    resourceLabel,
    onActionChange,
    onApply,
  }: {
    selectedCount: number;
    resourceLabel: string;
    onActionChange: (value: "delete") => void;
    onApply: () => void;
  }) => (
    <div>
      <span>{`bulk:${resourceLabel}:${selectedCount}`}</span>
      <button type="button" onClick={() => onActionChange("delete")}>
        choose-delete
      </button>
      <button type="button" onClick={onApply}>
        apply-bulk
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/listings/ListingQueryFilters", () => ({
  ListingQueryFilters: () => <div>query-filters</div>,
}));

vi.mock("../../../core/admin/ui/listings/ListingTemplateFilters", () => ({
  ListingTemplateFilters: () => <div>template-filters</div>,
}));

vi.mock("../../../core/admin/ui/listings/ListingQueryTable", () => ({
  ListingQueryTable: ({
    items,
    onDelete,
    onToggleItem,
  }: {
    items: Array<{ id: string; name: string }>;
    onDelete: (id: string) => void;
    onToggleItem: (id: string) => void;
  }) => (
    <div>
      <span>{`query-count:${items.length}`}</span>
      {items.map((item) => (
        <div key={item.id}>
          <button type="button" onClick={() => onToggleItem(item.id)}>
            {`select-query:${item.name}`}
          </button>
          <button type="button" onClick={() => onDelete(item.id)}>
            {`delete-query:${item.name}`}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/listings/ListingTemplateTable", () => ({
  ListingTemplateTable: ({
    items,
    onDelete,
    onToggleItem,
  }: {
    items: Array<{ id: string; name: string }>;
    onDelete: (id: string) => void;
    onToggleItem: (id: string) => void;
  }) => (
    <div>
      <span>{`template-count:${items.length}`}</span>
      {items.map((item) => (
        <div key={item.id}>
          <button type="button" onClick={() => onToggleItem(item.id)}>
            {`select-template:${item.name}`}
          </button>
          <button type="button" onClick={() => onDelete(item.id)}>
            {`delete-template:${item.name}`}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/listings/ListingTemplateManager", () => ({
  ListingTemplateManager: ({
    createOpen,
    editingTemplateId,
  }: {
    createOpen: boolean;
    editingTemplateId: string | null;
  }) => (
    <div>
      {createOpen ? <span>template-create-dialog</span> : null}
      {editingTemplateId ? <span>{`template-edit:${editingTemplateId}`}</span> : null}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/listings/hooks/useListingQueries", () => ({
  useListingQueries: () => ({
    items: listingPageState.queryItems,
    isLoading: false,
    error: listingPageState.queryError,
    refresh: listingPageState.refreshQueries,
  }),
}));

vi.mock("../../../core/admin/ui/listings/hooks/useListingTemplates", () => ({
  useListingTemplates: () => ({
    items: listingPageState.templateItems,
    isLoading: false,
    error: listingPageState.templateError,
    refresh: listingPageState.refreshTemplates,
  }),
}));

vi.mock("../../../core/admin/ui/listings/listingActionToasts", () => ({
  listingQueryToasts: {
    success: vi.fn(),
    error: vi.fn((_action: string, error: unknown) =>
      error instanceof Error ? error.message : "Query action failed."
    ),
    summarizeBulkAction: vi.fn(
      (_action: string, ids: string[], results: PromiseSettledResult<unknown>[]) => {
        const failedTargets = ids.filter((_, index) => results[index]?.status === "rejected");
        return {
          ok: failedTargets.length === 0,
          toastMessage: "bulk query result",
          inlineMessage: "bulk query result",
          succeededCount: ids.length - failedTargets.length,
          failedCount: failedTargets.length,
          failedTargets,
        };
      }
    ),
    emitBulk: vi.fn(),
  },
  listingTemplateToasts: {
    success: vi.fn(),
    error: vi.fn((_action: string, error: unknown) =>
      error instanceof Error ? error.message : "Template action failed."
    ),
    summarizeBulkAction: vi.fn(
      (_action: string, ids: string[], results: PromiseSettledResult<unknown>[]) => {
        const failedTargets = ids.filter((_, index) => results[index]?.status === "rejected");
        return {
          ok: failedTargets.length === 0,
          toastMessage: "bulk template result",
          inlineMessage: "bulk template result",
          succeededCount: ids.length - failedTargets.length,
          failedCount: failedTargets.length,
          failedTargets,
        };
      }
    ),
    emitBulk: vi.fn(),
  },
}));

import {
  filterListingQueries,
  filterListingTemplates,
  ListingListPage,
} from "../../../core/admin/ui/listings/ListingListPage";

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  listingPageState.reset();
});

afterEach(() => {
  vi.clearAllMocks();
});

test("ListingListPage routes active-tab New through the shell", () => {
  const view = mount(<ListingListPage />);

  try {
    clickByText(view.container, "New");
    expect(listingPageState.navigate).toHaveBeenCalledWith("/advanced/listings/new");

    clickByText(view.container, "Templates");
    clickByText(view.container, "New");
    expect(view.container.textContent).toContain("template-create-dialog");
    expect(listingPageState.navigate).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("ListingListPage gates query row delete behind confirmation", async () => {
  const view = mount(<ListingListPage />);

  try {
    clickByText(view.container, "delete-query:Services query");
    expect(listingPageState.deleteListingQuery).not.toHaveBeenCalled();

    clickByText(view.container, "Delete query");
    await flush();

    expect(listingPageState.deleteListingQuery).toHaveBeenCalledWith("listing-query-1");
    expect(listingPageState.refreshQueries).toHaveBeenCalledWith({
      force: true,
      background: true,
    });
  } finally {
    view.cleanup();
  }
});

test("ListingListPage scopes bulk delete to the active tab", async () => {
  const view = mount(<ListingListPage />);

  try {
    clickByText(view.container, "select-query:Services query");
    expect(view.container.textContent).toContain("bulk:listing queries:1");
    clickByText(view.container, "choose-delete");
    clickByText(view.container, "apply-bulk");
    clickByText(view.container, "Delete selected");
    await flush();

    expect(listingPageState.deleteListingQuery).toHaveBeenCalledWith("listing-query-1");
    expect(listingPageState.deleteListingTemplate).not.toHaveBeenCalled();

    clickByText(view.container, "Templates");
    clickByText(view.container, "select-template:Cards template");
    expect(view.container.textContent).toContain("bulk:listing templates:1");
    clickByText(view.container, "choose-delete");
    clickByText(view.container, "apply-bulk");
    clickByText(view.container, "Delete selected");
    await flush();

    expect(listingPageState.deleteListingTemplate).toHaveBeenCalledWith("listing-template-1");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage renders load errors from both listing hooks", () => {
  listingPageState.queryError = "Queries failed.";
  listingPageState.templateError = "Templates failed.";

  const view = mount(<ListingListPage />);

  try {
    expect(view.container.textContent).toContain("Unable to load listing queries");
    expect(view.container.textContent).toContain("Queries failed.");
    expect(view.container.textContent).toContain("Unable to load listing templates");
    expect(view.container.textContent).toContain("Templates failed.");
  } finally {
    view.cleanup();
  }
});

test("Listings filter helpers narrow query and template resources", () => {
  expect(
    filterListingQueries(listingPageState.queryItems, "service", "all").map((item) => item.id)
  ).toEqual(["listing-query-1"]);
  expect(filterListingQueries(listingPageState.queryItems, "missing", "all")).toEqual([]);
  expect(
    filterListingQueries(listingPageState.queryItems, "", "entries").map((item) => item.id)
  ).toEqual(["listing-query-1"]);
  expect(filterListingQueries(listingPageState.queryItems, "", "posts")).toEqual([]);

  expect(
    filterListingTemplates(listingPageState.templateItems, "cards", "all").map((item) => item.id)
  ).toEqual(["listing-template-1"]);
  expect(filterListingTemplates(listingPageState.templateItems, "cards", "list")).toEqual([]);
  expect(
    filterListingTemplates(listingPageState.templateItems, "card", "grid").map((item) => item.id)
  ).toEqual(["listing-template-1"]);
});
