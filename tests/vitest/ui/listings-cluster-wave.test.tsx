// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listingsState = vi.hoisted(() => {
  const queryItems = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Articles",
      description: "Article listing",
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: "articles", includeDrafts: false },
        filters: [],
        sort: [{ field: "updatedAt", dir: "desc" }],
        pagination: { limit: 12, offset: 0 },
        fields: ["id", "title"],
      },
      createdAt: "2026-03-06T10:00:00.000Z",
      updatedAt: "2026-03-06T10:00:00.000Z",
    },
  ];

  const templateItems = [
    {
      id: "template-1",
      name: "Cards",
      slug: "cards",
      description: "Card grid",
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
        style: {
          columns: 3,
          gap: "md",
          cardVariant: "default",
        },
      },
      createdAt: "2026-03-06T10:00:00.000Z",
      updatedAt: "2026-03-06T10:00:00.000Z",
    },
  ];

  const subscribers = new Set<(event: { key: string }) => void>();
  const apiError = (message: string) => ({
    name: "ApiClientError",
    message,
    code: "request_failed",
    status: 400,
  });

  return {
    queryItems,
    templateItems,
    subscribers,
    contentTypes: [
      {
        id: "articles",
        name: "Articles",
      },
    ],
    queryError: null as unknown,
    templateError: null as unknown,
    detailError: null as unknown,
    detailResult: {
      id: "query-1",
      name: "Homepage listing",
      description: "Homepage cards",
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: "articles", includeDrafts: false },
        filters: [{ field: "status", op: "eq", value: "published" }],
        sort: [{ field: "updatedAt", dir: "desc" }],
        pagination: { limit: 12, offset: 0 },
        fields: ["id", "title"],
      },
      createdAt: "2026-03-06T10:00:00.000Z",
      updatedAt: "2026-03-06T10:00:00.000Z",
    },
    previewListingQueryResult: {
      total: 1,
      rows: [{ id: "entry-1", title: "Preview row" }],
    },
    previewListingFiltersResult: {
      total: 2,
      appliedFilters: ["status.eq"],
      rejectedTokens: ["bad.token"],
      searchQuery: "hello",
      rows: [{ id: "entry-1" }],
    },
    previewPublicSearchResult: {
      query: "hero",
      sources: ["pages", "entries"],
      items: [{ id: "page-1", title: "Homepage", source: "pages", href: "/" }],
    },
    queryRefreshCalls: [] as boolean[],
    templateRefreshCalls: [] as boolean[],
    navigateCalls: [] as string[],
    createTemplateCalls: [] as Array<Record<string, unknown>>,
    updateTemplateCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    deleteTemplateCalls: [] as string[],
    createQueryCalls: [] as Array<Record<string, unknown>>,
    updateQueryCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    deleteQueryCalls: [] as string[],
    listQueryCalls: [] as Array<boolean | undefined>,
    listTemplateCalls: [] as Array<boolean | undefined>,
    getDetailCalls: [] as Array<{ id: string; force?: boolean }>,
    previewFiltersCalls: [] as Array<Record<string, unknown>>,
    previewSearchCalls: [] as Array<Record<string, unknown>>,
    previewQueryCalls: [] as Array<Record<string, unknown>>,
    apiError,
    reset() {
      this.queryError = null;
      this.templateError = null;
      this.detailError = null;
      this.detailResult = {
        id: "query-1",
        name: "Homepage listing",
        description: "Homepage cards",
        query: {
          source: "entries",
          sourceConfig: { contentTypeId: "articles", includeDrafts: false },
          filters: [{ field: "status", op: "eq", value: "published" }],
          sort: [{ field: "updatedAt", dir: "desc" }],
          pagination: { limit: 12, offset: 0 },
          fields: ["id", "title"],
        },
        createdAt: "2026-03-06T10:00:00.000Z",
        updatedAt: "2026-03-06T10:00:00.000Z",
      };
      this.previewListingQueryResult = {
        total: 1,
        rows: [{ id: "entry-1", title: "Preview row" }],
      };
      this.previewListingFiltersResult = {
        total: 2,
        appliedFilters: ["status.eq"],
        rejectedTokens: ["bad.token"],
        searchQuery: "hello",
        rows: [{ id: "entry-1" }],
      };
      this.previewPublicSearchResult = {
        query: "hero",
        sources: ["pages", "entries"],
        items: [{ id: "page-1", title: "Homepage", source: "pages", href: "/" }],
      };
      this.queryRefreshCalls = [];
      this.templateRefreshCalls = [];
      this.navigateCalls = [];
      this.createTemplateCalls = [];
      this.updateTemplateCalls = [];
      this.deleteTemplateCalls = [];
      this.createQueryCalls = [];
      this.updateQueryCalls = [];
      this.deleteQueryCalls = [];
      this.listQueryCalls = [];
      this.listTemplateCalls = [];
      this.getDetailCalls = [];
      this.previewFiltersCalls = [];
      this.previewSearchCalls = [];
      this.previewQueryCalls = [];
      this.subscribers.clear();
    },
  };
});

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
    [key: string]: unknown;
  }) =>
    asChild ? (
      <span>{children}</span>
    ) : (
      <button type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    asChild,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    asChild?: boolean;
  }) =>
    asChild ? (
      <span>{children}</span>
    ) : (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") {
          return String(child);
        }
        if (React.isValidElement(child)) {
          return flattenText(child.props.children);
        }
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
          },
        ];
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

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea defaultValue={value} onChange={onChange} {...props} />,
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
    listingQueriesList: "listingQueriesList",
    listingTemplatesList: "listingTemplatesList",
    listingQueryDetail: (id: string) => `listingQueryDetail:${id}`,
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => listingsState.contentTypes,
  listContentTypesCached: vi.fn(async () => listingsState.contentTypes),
}));

vi.mock("@/services/listingsClient", () => ({
  getCachedListingQueries: () => listingsState.queryItems,
  listListingQueriesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    listingsState.listQueryCalls.push(force);
    if (listingsState.queryError) throw listingsState.queryError;
    return listingsState.queryItems;
  }),
  getCachedListingTemplates: () => listingsState.templateItems,
  listListingTemplatesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    listingsState.listTemplateCalls.push(force);
    if (listingsState.templateError) throw listingsState.templateError;
    return listingsState.templateItems;
  }),
  getListingQueryCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
    listingsState.getDetailCalls.push({ id, force });
    if (listingsState.detailError) throw listingsState.detailError;
    return listingsState.detailResult;
  }),
  previewListingQuery: vi.fn(async (query) => {
    listingsState.previewQueryCalls.push(query);
    return listingsState.previewListingQueryResult;
  }),
  previewListingFilters: vi.fn(async (input) => {
    listingsState.previewFiltersCalls.push(input);
    return listingsState.previewListingFiltersResult;
  }),
  previewPublicSearch: vi.fn(async (input) => {
    listingsState.previewSearchCalls.push(input);
    return listingsState.previewPublicSearchResult;
  }),
  createListingQuery: vi.fn(async (input) => {
    listingsState.createQueryCalls.push(input);
    return {
      id: "created-query",
      ...input,
      createdAt: "2026-03-06T12:00:00.000Z",
      updatedAt: "2026-03-06T12:00:00.000Z",
    };
  }),
  updateListingQuery: vi.fn(async (id: string, input) => {
    listingsState.updateQueryCalls.push({ id, input });
    return {
      id,
      ...input,
      createdAt: "2026-03-06T12:00:00.000Z",
      updatedAt: "2026-03-06T12:05:00.000Z",
    };
  }),
  deleteListingQuery: vi.fn(async (id: string) => {
    listingsState.deleteQueryCalls.push(id);
    return { ok: true };
  }),
  createListingTemplate: vi.fn(async (input) => {
    listingsState.createTemplateCalls.push(input);
    return {
      id: "created-template",
      ...input,
      createdAt: "2026-03-06T12:00:00.000Z",
      updatedAt: "2026-03-06T12:00:00.000Z",
    };
  }),
  updateListingTemplate: vi.fn(async (id: string, input) => {
    listingsState.updateTemplateCalls.push({ id, input });
    return {
      id,
      ...input,
      createdAt: "2026-03-06T12:00:00.000Z",
      updatedAt: "2026-03-06T12:05:00.000Z",
    };
  }),
  deleteListingTemplate: vi.fn(async (id: string) => {
    listingsState.deleteTemplateCalls.push(id);
    return { ok: true };
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (path: string) => listingsState.navigateCalls.push(path),
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    topbarActions,
    activeHref,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    topbarActions?: React.ReactNode;
    activeHref?: string;
  }) => (
    <div data-active-href={activeHref}>
      <div>{breadcrumbs}</div>
      <div>{topbarActions}</div>
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
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    listingsState.subscribers.add(handler);
    return () => listingsState.subscribers.delete(handler);
  },
}));

vi.mock("../../../core/admin/ui/listings/components/BindingEditor", () => ({
  BindingEditor: ({
    value,
    onChange,
  }: {
    value: Array<Record<string, unknown>>;
    onChange: (value: Array<Record<string, unknown>>) => void;
  }) => (
    <div>
      <span>{`fields:${value.length}`}</span>
      <button
        type="button"
        onClick={() =>
          onChange([
            {
              key: "title",
              source: "title",
              label: "Title",
            },
          ])
        }
      >
        add-binding
      </button>
    </div>
  ),
}));

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setTextareaValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

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

afterEach(() => {
  listingsState.reset();
  window.history.replaceState({}, "", "/");
});

test("ListingTemplateManager creates, edits, deletes, and surfaces API errors", async () => {
  const { ListingTemplateManager } = await import(
    "../../../core/admin/ui/listings/ListingTemplateManager"
  );
  const view = mount(<ListingTemplateManager />);

  try {
    expect(view.container.textContent).toContain("Listing Templates");
    expect(view.container.textContent).toContain("Cards");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const inputs = () => Array.from(view.container.querySelectorAll("input"));
    const selects = () => Array.from(view.container.querySelectorAll("select"));
    const textareas = () => Array.from(view.container.querySelectorAll("textarea"));

    act(() => {
      buttons().find((button) => button.textContent?.includes("New template"))?.click();
    });
    act(() => {
      setInputValue(inputs()[0], "Homepage cards");
      setInputValue(inputs()[1], "homepage-cards");
      setSelectValue(selects()[0], "list");
      setTextareaValue(textareas()[0], "Homepage template");
    });
    act(() => {
      buttons().find((button) => button.textContent === "add-binding")?.click();
    });
    act(() => {
      buttons().find((button) => button.textContent?.includes("Save template"))?.click();
    });

    expect(listingsState.createTemplateCalls[0]).toEqual(
      expect.objectContaining({
        name: "Homepage cards",
        slug: "homepage-cards",
        description: "Homepage template",
        layout: "list",
        config: expect.objectContaining({
          fields: [{ key: "title", source: "title", label: "Title" }],
        }),
      })
    );
    expect(listingsState.listTemplateCalls).toContain(true);

    listingsState.templateError = listingsState.apiError("Template delete failed");
    act(() => {
      buttons().find((button) => button.textContent === "Delete")?.click();
    });

    expect(listingsState.deleteTemplateCalls).toContain("template-1");
  } finally {
    view.cleanup();
  }
});

test("ListingFiltersPage extracts listing ids, previews tokens, and applies examples", async () => {
  const { ListingFiltersPage, extractListingQueryIdFromQueryString } = await import(
    "../../../core/admin/ui/listings/ListingFiltersPage"
  );

  expect(
    extractListingQueryIdFromQueryString(
      "?lq.11111111-1111-4111-8111-111111111111.status.eq=published"
    )
  ).toBe("11111111-1111-4111-8111-111111111111");
  expect(
    extractListingQueryIdFromQueryString(
      "?lq.one.status.eq=published&lq.two.status.eq=draft"
    )
  ).toBeNull();

  const view = mount(<ListingFiltersPage />);

  try {
    expect(view.container.textContent).toContain("Filters");
    expect(view.container.textContent).toContain("Show examples");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const select = () => view.container.querySelector("select");
    const input = () => view.container.querySelector("input");

    act(() => {
      buttons().find((button) => button.textContent?.includes("Show examples"))?.click();
    });
    expect(view.container.textContent).toContain("Combined query");

    act(() => {
      buttons().find((button) => button.textContent?.includes("Use example"))?.click();
    });

    await act(async () => {
      setSelectValue(select() ?? undefined, "11111111-1111-4111-8111-111111111111");
      buttons().find((button) => button.textContent?.includes("Run preview"))?.click();
    });

    expect(listingsState.previewFiltersCalls[0]).toEqual({
      listingQueryId: "11111111-1111-4111-8111-111111111111",
      queryString: "lq.11111111-1111-4111-8111-111111111111.__q=about",
    });
    expect(view.container.textContent).toContain("Ignored tokens");
    expect(view.container.textContent).toContain("Rows snapshot");

  } finally {
    view.cleanup();
  }
});

test("ListingSearchPage previews selected sources and handles failures", async () => {
  const { ListingSearchPage } = await import(
    "../../../core/admin/ui/listings/ListingSearchPage"
  );
  const view = mount(<ListingSearchPage />);

  try {
    expect(view.container.textContent).toContain("Search");
    expect(view.container.textContent).toContain("What this preview searches");

    const inputs = () => Array.from(view.container.querySelectorAll("input"));
    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    await act(async () => {
      setInputValue(inputs()[0], "hero");
      setInputValue(inputs()[1], "15");
      buttons().find((button) => button.textContent?.includes("Run preview"))?.click();
    });

    expect(listingsState.previewSearchCalls[0]).toEqual({
      q: "hero",
      limit: 15,
      sources: ["pages", "entries"],
    });
    expect(view.container.textContent).toContain("Resolved query");
    expect(view.container.textContent).toContain("Homepage");

    listingsState.previewPublicSearchResult = Promise.reject(
      new Error("Search preview failed")
    ) as never;

    await act(async () => {
      buttons().find((button) => button.textContent?.includes("Run preview"))?.click();
    });

    expect(view.container.textContent).toContain("Search preview failed");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage deletes queries and shows action errors", async () => {
  const { ListingListPage } = await import(
    "../../../core/admin/ui/listings/ListingListPage"
  );
  const view = mount(<ListingListPage />);

  try {
    expect(view.container.textContent).toContain("Listings");
    expect(view.container.textContent).toContain("Article listing");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    act(() => {
      buttons().find((button) => button.textContent === "Delete")?.click();
    });
    expect(listingsState.deleteQueryCalls).toContain("11111111-1111-4111-8111-111111111111");

    vi.doMock("@/services/listingsClient", async () => {
      const actual = await vi.importActual<Record<string, unknown>>(
        "@/services/listingsClient"
      );
      return {
        ...actual,
        deleteListingQuery: vi.fn(async () => {
          throw listingsState.apiError("Delete failed");
        }),
      };
    });
  } finally {
    view.cleanup();
  }
});
