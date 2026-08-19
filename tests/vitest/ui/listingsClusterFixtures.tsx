// Shared mock world for the TASK-105-04 A2 listings wave (LEAF A2).
//
// Extracted from the former `listings-cluster-wave.test.tsx` preamble: the
// `listingsState` mock state, the ui/component mocks, the listingsClient mocks,
// and the interaction helpers. Test files import these fixtures and lazily
// import the page components so all mocks register before any production
// module is evaluated.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, vi } from "vitest";

const listingsState = vi.hoisted(() => {
  const queryItems = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Articles",
      description: "Article listing",
      query: {
        source: "entries" as const,
        sourceConfig: { contentTypeId: "articles", includeDrafts: false },
        filters: [],
        sort: [{ field: "updatedAt", dir: "desc" as const }],
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
      layout: "grid" as const,
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
          gap: "md" as const,
          cardVariant: "default" as const,
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
        sort: [{ field: "updatedAt", dir: "desc" as const }],
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
      // Restore pristine fixtures: tests may reassign the item arrays, so the
      // reset must re-clone the factory-level arrays instead of reusing the
      // (possibly replaced) current references.
      this.queryItems = JSON.parse(JSON.stringify(queryItems));
      this.templateItems = JSON.parse(JSON.stringify(templateItems));
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
          sort: [{ field: "updatedAt", dir: "desc" as const }],
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

const tabsMockState = vi.hoisted(() => ({
  currentValue: "queries",
  onValueChange: undefined as undefined | ((value: string) => void),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
    "aria-label"?: string;
  }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={checked === true}
      onClick={() => onCheckedChange?.(checked !== true)}
    >
      {checked === "indeterminate" ? "mixed" : checked ? "checked" : "unchecked"}
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
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
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

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
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
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) =>
    tabsMockState.currentValue === value ? <div>{children}</div> : null,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button type="button" onClick={() => tabsMockState.onValueChange?.(value)}>
      {children}
    </button>
  ),
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
    path:
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/admin/advanced/listings",
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

export const getListingsState = () => listingsState;

export const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

export const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

export const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

export const mount = (node: React.ReactNode) => {
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

export const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

export const clickButtonByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

export const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

export const findInputsByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

export const findTextareaByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

export const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

export const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

afterEach(() => {
  listingsState.reset();
  window.history.replaceState({}, "", "/");
});
