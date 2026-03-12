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
    cachedTemplateItems: templateItems as typeof templateItems | undefined,
    subscribers,
    contentTypes: [
      {
        id: "articles",
        name: "Articles",
      },
    ],
    queryError: null as unknown,
    templateError: null as unknown,
    saveTemplateError: null as unknown,
    deleteTemplateError: null as unknown,
    detailError: null as unknown,
    previewQueryError: null as unknown,
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
      this.saveTemplateError = null;
      this.deleteTemplateError = null;
      this.detailError = null;
      this.previewQueryError = null;
      this.cachedTemplateItems = this.templateItems;
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
  getCachedListingTemplates: () => listingsState.cachedTemplateItems,
  listListingTemplatesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    listingsState.listTemplateCalls.push(force);
    if (listingsState.templateError) throw listingsState.templateError;
    return listingsState.templateItems;
  }),
  getListingQueryCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
    listingsState.getDetailCalls.push({ id, force });
    if (listingsState.detailError) throw listingsState.detailError;
    return JSON.parse(JSON.stringify(listingsState.detailResult));
  }),
  previewListingQuery: vi.fn(async (query) => {
    listingsState.previewQueryCalls.push(query);
    if (listingsState.previewQueryError) throw listingsState.previewQueryError;
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
    if (listingsState.saveTemplateError) throw listingsState.saveTemplateError;
    return {
      id: "created-template",
      ...input,
      createdAt: "2026-03-06T12:00:00.000Z",
      updatedAt: "2026-03-06T12:00:00.000Z",
    };
  }),
  updateListingTemplate: vi.fn(async (id: string, input) => {
    listingsState.updateTemplateCalls.push({ id, input });
    if (listingsState.saveTemplateError) throw listingsState.saveTemplateError;
    return {
      id,
      ...input,
      createdAt: "2026-03-06T12:00:00.000Z",
      updatedAt: "2026-03-06T12:05:00.000Z",
    };
  }),
  deleteListingTemplate: vi.fn(async (id: string) => {
    listingsState.deleteTemplateCalls.push(id);
    if (listingsState.deleteTemplateError) throw listingsState.deleteTemplateError;
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

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickButtonByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputsByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

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
    expect(view.container.textContent).toContain("New listing template");
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
    await flush();

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

    act(() => {
      buttons().find((button) => button.textContent === "Edit")?.click();
    });
    act(() => {
      setInputValue(inputs()[0], "Cards updated");
      setInputValue(inputs()[1], "cards-updated");
      setSelectValue(selects()[0], "grid");
      setTextareaValue(textareas()[0], "Updated template");
    });
    act(() => {
      buttons().find((button) => button.textContent?.includes("Save template"))?.click();
    });
    await flush();

    expect(listingsState.updateTemplateCalls[0]).toEqual({
      id: "template-1",
      input: expect.objectContaining({
        name: "Cards updated",
        slug: "cards-updated",
        description: "Updated template",
        layout: "grid",
      }),
    });

    listingsState.saveTemplateError = listingsState.apiError("Template save failed");
    act(() => {
      buttons().find((button) => button.textContent?.includes("New template"))?.click();
    });
    act(() => {
      setInputValue(inputs()[0], "Broken template");
      buttons().find((button) => button.textContent?.includes("Save template"))?.click();
    });
    await flush();

    expect(view.container.textContent).toContain("Template save failed");

    listingsState.saveTemplateError = null;
    listingsState.deleteTemplateError = listingsState.apiError("Template delete failed");
    act(() => {
      buttons().find((button) => button.textContent === "Delete")?.click();
    });
    await flush();

    expect(listingsState.deleteTemplateCalls).toContain("template-1");
    expect(view.container.textContent).toContain("Template delete failed");
  } finally {
    view.cleanup();
  }
});

test("ListingTemplateManager shows loading, empty, and load-error states", async () => {
  const { ListingTemplateManager } = await import(
    "../../../core/admin/ui/listings/ListingTemplateManager"
  );

  listingsState.cachedTemplateItems = undefined;
  listingsState.templateItems = [];
  const emptyView = mount(<ListingTemplateManager />);

  try {
    expect(emptyView.container.textContent).toContain("Loading templates...");
    await flush();
    expect(emptyView.container.textContent).toContain("No listing templates yet.");
  } finally {
    emptyView.cleanup();
  }

  listingsState.reset();
  listingsState.cachedTemplateItems = undefined;
  listingsState.templateItems = [];
  listingsState.templateError = listingsState.apiError("Templates load failed");

  const errorView = mount(<ListingTemplateManager />);

  try {
    await flush();
    expect(errorView.container.textContent).toContain("Unable to load templates");
    expect(errorView.container.textContent).toContain("Templates load failed");
  } finally {
    errorView.cleanup();
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
  } finally {
    view.cleanup();
  }
});

test("ListingEditorPage edits query state, previews normalized payload, discards changes, saves, and refreshes from cache bus", async () => {
  window.history.replaceState({}, "", "/admin/coderso/listings/query-1");
  const { ListingEditorPage } = await import(
    "../../../core/admin/ui/listings/ListingEditorPage"
  );

  const view = mount(<ListingEditorPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Edit listing query");
    expect(view.container.textContent).toContain("Homepage listing");
    expect(listingsState.getDetailCalls).toContainEqual({ id: "query-1", force: true });

    act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Homepage featured cards"),
        "Homepage cards"
      );
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Optional context for editors."),
        "Updated cards"
      );
    });

    const sourceSelect = findSelectByOptions(view.container, [
      "entries",
      "posts",
      "users",
      "taxonomies",
    ]);
    act(() => {
      setSelectValue(sourceSelect, "posts");
    });
    expect(view.container.textContent).toContain(
      "Uses the default post content type mapping."
    );

    const includeDraftsSelect = findSelectByOptions(view.container, ["no", "yes"]);
    act(() => {
      setSelectValue(includeDraftsSelect, "yes");
    });

    clickButtonByText(view.container, "Add filter");
    clickButtonByText(view.container, "Add sort");

    const sortFieldInputs = Array.from(view.container.querySelectorAll("input")).filter(
      (element) =>
        element instanceof HTMLInputElement &&
        element.getAttribute("placeholder") === "sort field"
    );
    const numericInputs = Array.from(view.container.querySelectorAll("input")).filter(
      (element) => element instanceof HTMLInputElement && element.getAttribute("type") === "number"
    );
    const fieldsTextarea = findTextareaByPlaceholder(
      view.container,
      "id, title, slug, status"
    );
    const templateSelect = findSelectByOptions(view.container, ["__none__", "template-1"]);

    act(() => {
      setInputValue(
        findInputsByPlaceholder(view.container, "field path (e.g. status)").at(-1),
        "category"
      );
      setSelectValue(
        findSelectsByOptions(view.container, [
          "eq",
          "neq",
          "lt",
          "lte",
          "gt",
          "gte",
          "contains",
          "in",
          "nin",
          "between",
          "exists",
        ]).at(-1),
        "in"
      );
      setInputValue(sortFieldInputs.at(-1), "title");
      setSelectValue(
        findSelectsByOptions(view.container, ["asc", "desc"]).at(-1),
        "asc"
      );
      setInputValue(numericInputs[0], "24");
      setInputValue(numericInputs[1], "5");
      setTextareaValue(fieldsTextarea, "id, title, slug");
      setSelectValue(templateSelect, "template-1");
    });
    await flush();

    act(() => {
      setInputValue(
        findInputsByPlaceholder(view.container, "value (comma separated for arrays)").at(-1),
        "featured, news"
      );
    });

    clickButtonByText(view.container, "Run preview");
    await flush();

    expect(listingsState.previewQueryCalls.at(-1)).toEqual({
      source: "posts",
      sourceConfig: { includeDrafts: true },
      filters: [
        { field: "status", op: "eq", value: "published" },
        { field: "category", op: "in", value: ["featured", "news"] },
      ],
      sort: [
        { field: "updatedAt", dir: "desc" },
        { field: "title", dir: "asc" },
      ],
      pagination: { limit: 24, offset: 5 },
      fields: ["id", "title", "slug"],
    });
    expect(view.container.textContent).toContain("1 matching row");
    expect(view.container.textContent).toContain("Preview row");

    clickButtonByText(view.container, "Discard");
    await flush();

    clickButtonByText(view.container, "Save query");
    await flush();

    expect(listingsState.updateQueryCalls[0]).toEqual({
      id: "query-1",
      input: {
        name: "Homepage listing",
        description: "Homepage cards",
        query: listingsState.detailResult.query,
      },
    });

    listingsState.detailResult = {
      ...listingsState.detailResult,
      name: "Remote listing",
      description: "Remote cards",
    };

    await act(async () => {
      for (const subscriber of listingsState.subscribers) {
        subscriber({ key: "listingQueryDetail:query-1" });
      }
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Remote listing");

    clickButtonByText(view.container, "Back to list");
    expect(listingsState.navigateCalls).toContain("/coderso/listings");
  } finally {
    view.cleanup();
  }
});

test("ListingEditorPage create mode creates queries and reports preview/load errors", async () => {
  const { ListingEditorPage } = await import(
    "../../../core/admin/ui/listings/ListingEditorPage"
  );

  window.history.replaceState({}, "", "/admin/coderso/listings/new");
  const createView = mount(<ListingEditorPage />);

  try {
    await flush();

    expect(createView.container.textContent).toContain("New listing query");
    expect(createView.container.textContent).toContain("No filters yet.");

    act(() => {
      setInputValue(
        findInputByPlaceholder(createView.container, "Homepage featured cards"),
        "Taxonomy query"
      );
      setTextareaValue(
        findTextareaByPlaceholder(createView.container, "Optional context for editors."),
        "Taxonomy listing"
      );
    });

    act(() => {
      setSelectValue(
        findSelectByOptions(createView.container, [
          "entries",
          "posts",
          "users",
          "taxonomies",
        ]),
        "taxonomies"
      );
    });

    act(() => {
      setInputValue(
        findInputByPlaceholder(createView.container, "taxonomy-id"),
        "categories"
      );
    });

    listingsState.previewQueryError = listingsState.apiError("Preview failed");

    clickButtonByText(createView.container, "Run preview");
    await flush();

    expect(createView.container.textContent).toContain("Preview failed");

    listingsState.previewQueryError = null;
    listingsState.previewListingQueryResult = {
      total: 0,
      rows: [],
    };

    clickButtonByText(createView.container, "Save query");
    await flush();

    expect(listingsState.createQueryCalls[0]).toEqual({
      name: "Taxonomy query",
      description: "Taxonomy listing",
      query: expect.objectContaining({
        source: "taxonomies",
        sourceConfig: { taxonomyId: "categories" },
        filters: [],
        sort: [{ field: "updatedAt", dir: "desc" }],
        pagination: { limit: 12, offset: 0 },
        fields: expect.arrayContaining(["id", "title"]),
      }),
    });
    expect(listingsState.navigateCalls).toContain("/coderso/listings/created-query");
  } finally {
    createView.cleanup();
  }

  listingsState.reset();
  listingsState.detailError = listingsState.apiError("Detail failed");
  window.history.replaceState({}, "", "/admin/coderso/listings/query-1");

  const errorView = mount(<ListingEditorPage />);

  try {
    await flush();
    expect(errorView.container.textContent).toContain("Listing query error");
    expect(errorView.container.textContent).toContain("Detail failed");
  } finally {
    errorView.cleanup();
  }
});

test("ListingEditorPage reports query-not-found and generic preview failures", async () => {
  window.history.replaceState({}, "", "/admin/coderso/listings/query-1");
  const { ListingEditorPage } = await import(
    "../../../core/admin/ui/listings/ListingEditorPage"
  );

  listingsState.detailResult = null;
  const missingView = mount(<ListingEditorPage />);

  try {
    await flush();

    expect(missingView.container.textContent).toContain("Listing query error");
    expect(missingView.container.textContent).toContain("Listing query not found.");
  } finally {
    missingView.cleanup();
  }

  listingsState.reset();
  listingsState.previewQueryError = new Error("boom");
  window.history.replaceState({}, "", "/admin/coderso/listings/new");

  const previewErrorView = mount(<ListingEditorPage />);

  try {
    await flush();

    clickButtonByText(previewErrorView.container, "Run preview");
    await flush();

    expect(previewErrorView.container.textContent).toContain(
      "Failed to run listing preview."
    );
  } finally {
    previewErrorView.cleanup();
  }
});
