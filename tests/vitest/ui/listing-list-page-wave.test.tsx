// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const listingPageState = vi.hoisted(() => ({
  navigate: vi.fn(),
  refresh: vi.fn(async () => undefined),
  deleteListingQuery: vi.fn(async () => undefined),
  items: [
    {
      id: "listing-query-1",
      name: "Services query",
    },
  ],
  isLoading: false,
  error: null as string | null,
  reset() {
    this.navigate.mockReset();
    this.refresh.mockReset();
    this.refresh.mockResolvedValue(undefined);
    this.deleteListingQuery.mockReset();
    this.deleteListingQuery.mockResolvedValue(undefined);
    this.items = [{ id: "listing-query-1", name: "Services query" }];
    this.isLoading = false;
    this.error = null;
  },
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

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object"
    && error !== null
    && "kind" in error
    && (error as { kind?: string }).kind === "api",
}));

vi.mock("@/services/listingsClient", () => ({
  deleteListingQuery: listingPageState.deleteListingQuery,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: listingPageState.navigate,
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children, breadcrumbs }: { children: React.ReactNode; breadcrumbs?: React.ReactNode }) => (
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

vi.mock("../../../core/admin/ui/listings/ListingQueryTable", () => ({
  ListingQueryTable: ({
    items,
    emptyMessage,
    onDelete,
  }: {
    items: Array<{ id: string; name: string }>;
    emptyMessage?: string;
    onDelete: (id: string) => Promise<void>;
  }) => (
    <div>
      <span>{`query-count:${items.length}`}</span>
      <span>{`empty-message:${emptyMessage ?? "none"}`}</span>
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => void onDelete(item.id)}>
          {`delete:${item.name}`}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/listings/ListingTemplateManager", () => ({
  ListingTemplateManager: () => <div>template-manager</div>,
}));

vi.mock("../../../core/admin/ui/listings/hooks/useListingQueries", () => ({
  useListingQueries: () => ({
    items: listingPageState.items,
    isLoading: listingPageState.isLoading,
    error: listingPageState.error,
    refresh: listingPageState.refresh,
  }),
}));

import { ListingListPage } from "../../../core/admin/ui/listings/ListingListPage";

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.click();
  });
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  listingPageState.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("ListingListPage navigates to create flow and renders loading placeholder through the query table", () => {
  listingPageState.items = [];
  listingPageState.isLoading = true;

  const view = mount(<ListingListPage />);

  try {
    expect(view.container.textContent).toContain("Listings");
    expect(view.container.textContent).toContain("query-count:0");
    expect(view.container.textContent).toContain("empty-message:Loading listing queries...");
    expect(view.container.textContent).toContain("template-manager");

    clickByText(view.container, "New query");
    expect(listingPageState.navigate).toHaveBeenCalledWith("/coderso/listings/new");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage renders load errors from the listing queries hook", () => {
  listingPageState.error = "Load failed.";

  const view = mount(<ListingListPage />);

  try {
    expect(view.container.textContent).toContain("Unable to load listing queries");
    expect(view.container.textContent).toContain("Load failed.");
    expect(view.container.textContent).not.toContain("Listing action failed");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage deletes queries, refreshes the list, and clears prior action errors on success", async () => {
  const view = mount(<ListingListPage />);

  try {
    listingPageState.deleteListingQuery.mockRejectedValueOnce({
      kind: "api",
      message: "Delete denied",
    });
    clickByText(view.container, "delete:Services query");
    await flush();

    expect(view.container.textContent).toContain("Listing action failed");
    expect(view.container.textContent).toContain("Delete denied");

    listingPageState.deleteListingQuery.mockResolvedValueOnce(undefined);
    clickByText(view.container, "delete:Services query");
    await flush();

    expect(listingPageState.deleteListingQuery).toHaveBeenNthCalledWith(1, "listing-query-1");
    expect(listingPageState.deleteListingQuery).toHaveBeenNthCalledWith(2, "listing-query-1");
    expect(listingPageState.refresh).toHaveBeenCalledWith(true);
    expect(view.container.textContent).not.toContain("Listing action failed");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage falls back to a generic action error when delete throws a non-api error", async () => {
  listingPageState.deleteListingQuery.mockRejectedValueOnce(new Error("boom"));

  const view = mount(<ListingListPage />);

  try {
    clickByText(view.container, "delete:Services query");
    await flush();

    expect(view.container.textContent).toContain("Listing action failed");
    expect(view.container.textContent).toContain("Failed to delete listing query.");
  } finally {
    view.cleanup();
  }
});
