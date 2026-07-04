// @vitest-environment happy-dom

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import {
  buildCustomScreenListRows,
  filterCustomScreenRows,
} from "../../../core/admin/ui/custom-screens/customScreenListModel";

const customScreensState = vi.hoisted(() => {
  const makeScreen = (overrides: Partial<CustomScreenRecord> = {}): CustomScreenRecord => ({
    id: "screen-1",
    name: "Product workspace",
    contentTypeId: "ct-products",
    status: "draft",
    collectionRole: null,
    compositionKey: null,
    showInSidebar: true,
    sidebarLabel: "Catalog",
    schemaVersion: 1,
    blocks: [],
    bindings: [],
    createdAt: "2026-03-05T00:00:00.000Z",
    updatedAt: "2026-03-05T00:00:00.000Z",
    ...overrides,
  });
  const makeContentType = (overrides: Partial<ContentTypeSummary> = {}): ContentTypeSummary => ({
    id: "ct-products",
    name: "Products",
    slug: "products",
    status: "published",
    schema: { type: "object", additionalProperties: false, properties: {} },
    createdAt: "2026-03-05T00:00:00.000Z",
    updatedAt: "2026-03-05T00:00:00.000Z",
    ...overrides,
  });

  return {
    makeScreen,
    makeContentType,
    screens: [makeScreen()],
    cachedScreens: null as CustomScreenRecord[] | null,
    contentTypes: [makeContentType()],
    cachedContentTypes: null as ContentTypeSummary[] | null,
    customSubscribers: new Set<(event: { key: string; action?: string }) => void>(),
    contentTypeSubscribers: new Set<(event: { key: string; action?: string }) => void>(),
    listScreenCalls: [] as Array<{ force?: boolean }>,
    listContentTypeCalls: [] as Array<{ force?: boolean }>,
    createCalls: [] as Array<Record<string, unknown>>,
    updateCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    deleteCalls: [] as string[],
    navigateCalls: [] as string[],
    setUserSettingCalls: [] as Array<{ key: string; value: unknown }>,
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    getUserSettings: vi.fn(async () => ({
      "customScreens.openAfterCreate": true,
    })),
    reset() {
      this.screens = [makeScreen()];
      this.cachedScreens = null;
      this.contentTypes = [makeContentType()];
      this.cachedContentTypes = null;
      this.customSubscribers.clear();
      this.contentTypeSubscribers.clear();
      this.listScreenCalls = [];
      this.listContentTypeCalls = [];
      this.createCalls = [];
      this.updateCalls = [];
      this.deleteCalls = [];
      this.navigateCalls = [];
      this.setUserSettingCalls = [];
      this.toastSuccess.mockClear();
      this.toastError.mockClear();
      this.getUserSettings.mockReset();
      this.getUserSettings.mockImplementation(async () => ({
        "customScreens.openAfterCreate": true,
      }));
    },
  };
});

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
    id,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
    "aria-label"?: string;
  }) => (
    <input
      id={id}
      aria-label={ariaLabel}
      type="checkbox"
      checked={checked === true}
      data-indeterminate={checked === "indeterminate" ? "true" : undefined}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-dialog-open="true">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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
      <>{children}</>
    ) : (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} {...props} />,
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
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      disabled,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      disabled?: boolean;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select
        disabled={disabled}
        value={value ?? ""}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        <option value="" disabled>
          Select
        </option>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  };
});

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-sheet-open="true">{children}</div> : null),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-sheet-content="true">{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) => (
    <td colSpan={colSpan}>{children}</td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    customScreensList: "customScreens:list",
    contentTypesList: "contentTypes:list",
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => customScreensState.cachedContentTypes,
  listContentTypesCached: vi.fn(async (options?: { force?: boolean }) => {
    customScreensState.listContentTypeCalls.push(options ?? {});
    return customScreensState.contentTypes;
  }),
}));

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: () => customScreensState.cachedScreens,
  listCustomScreensCached: vi.fn(async (options?: { force?: boolean }) => {
    customScreensState.listScreenCalls.push(options ?? {});
    return customScreensState.screens;
  }),
  createCustomScreen: vi.fn(async (input: Record<string, unknown>) => {
    customScreensState.createCalls.push(input);
    const created = customScreensState.makeScreen({
      id: "created-screen",
      name: String(input.name),
      contentTypeId: String(input.contentTypeId),
      status: input.status === "active" ? "active" : "draft",
      showInSidebar: input.showInSidebar === true,
      sidebarLabel: typeof input.sidebarLabel === "string" ? input.sidebarLabel : null,
    });
    customScreensState.screens = [created, ...customScreensState.screens];
    return created;
  }),
  updateCustomScreen: vi.fn(async (id: string, input: Record<string, unknown>) => {
    customScreensState.updateCalls.push({ id, input });
    customScreensState.screens = customScreensState.screens.map((screen) =>
      screen.id === id ? { ...screen, ...input } : screen
    );
    return customScreensState.screens.find((screen) => screen.id === id);
  }),
  deleteCustomScreen: vi.fn(async (id: string) => {
    customScreensState.deleteCalls.push(id);
    customScreensState.screens = customScreensState.screens.filter((screen) => screen.id !== id);
    return { ok: true };
  }),
}));

vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: customScreensState.getUserSettings,
  setUserSetting: vi.fn(async (key: string, value: unknown) => {
    customScreensState.setUserSettingCalls.push({ key, value });
    return { key, value };
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => customScreensState.navigateCalls.push(href),
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
    <main>
      <nav>{breadcrumbs}</nav>
      {children}
    </main>
  ),
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({
    children,
    href,
    prefetch: _prefetch,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/ui/shared/ListPaginationFooter", () => ({
  ListPaginationFooter: ({ resourceLabel }: { resourceLabel: string }) => (
    <footer>{resourceLabel}</footer>
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
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      <div>{actions}</div>
    </header>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (callback: (event: { key: string; action?: string }) => void) => {
    customScreensState.customSubscribers.add(callback);
    customScreensState.contentTypeSubscribers.add(callback);
    return () => {
      customScreensState.customSubscribers.delete(callback);
      customScreensState.contentTypeSubscribers.delete(callback);
    };
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: customScreensState.toastSuccess,
    error: customScreensState.toastError,
  },
}));

const { CustomScreenListPage } =
  await import("../../../core/admin/ui/custom-screens/CustomScreenListPage");

const flushAsync = async () => {
  await Promise.resolve();
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const renderPage = async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(<CustomScreenListPage />);
  });
  await flushAsync();
  return { container, root };
};

const updateInput = async (input: HTMLInputElement, value: string) => {
  await React.act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const updateSelect = async (select: HTMLSelectElement, value: string) => {
  await React.act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButton = async (button: HTMLButtonElement) => {
  await React.act(async () => {
    button.click();
  });
  await flushAsync();
};

const findButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent?.trim() === label
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${label}`);
  }
  return button;
};

afterEach(() => {
  customScreensState.reset();
  document.body.innerHTML = "";
});

test("custom screen list view model enriches labels without mutating records", () => {
  const source = customScreensState.makeScreen({
    contentTypeId: "missing-type",
    status: "draft",
    showInSidebar: true,
  });
  const rows = buildCustomScreenListRows([source], []);

  expect(rows[0]).toMatchObject({
    contentTypeLabel: "missing-type",
    modeLabel: "Setup required",
    sidebarShortcutState: "configured_after_activation",
    sidebarShortcutLabel: "Catalog",
  });
  expect(source).not.toHaveProperty("contentTypeLabel");
  expect(filterCustomScreenRows(rows, "missing-type", "draft", "missing-type")).toHaveLength(1);
  expect(filterCustomScreenRows(rows, "Catalog", "active", "missing-type")).toHaveLength(0);
});

test("CustomScreenListPage hydrates cached rows and refreshes content labels from cache bus", async () => {
  customScreensState.cachedScreens = [customScreensState.makeScreen()];
  customScreensState.cachedContentTypes = [
    customScreensState.makeContentType({ name: "Products" }),
  ];

  const { container, root } = await renderPage();

  expect(container.textContent).toContain("Product workspace");
  expect(container.textContent).toContain("Products");
  expect(container.textContent).not.toContain("Loading custom screens");
  expect(customScreensState.listScreenCalls[0]).toEqual({ force: false });
  expect(customScreensState.listContentTypeCalls[0]).toEqual({ force: false });

  customScreensState.contentTypes = [
    customScreensState.makeContentType({ name: "Product catalog" }),
  ];
  await React.act(async () => {
    for (const subscriber of customScreensState.contentTypeSubscribers) {
      subscriber({ key: "contentTypes:list", action: "update" });
    }
  });
  await flushAsync();

  expect(container.textContent).toContain("Product catalog");
  expect(customScreensState.listContentTypeCalls.at(-1)).toEqual({ force: true });

  await React.act(async () => root.unmount());
});

test("CustomScreenListPage create drawer submits schema fields and navigates by preference", async () => {
  customScreensState.cachedScreens = [];
  customScreensState.cachedContentTypes = [customScreensState.makeContentType()];

  const { container, root } = await renderPage();
  await clickButton(findButton(container, "New screen"));

  const drawer = container.querySelector("[data-sheet-content='true']");
  if (!(drawer instanceof HTMLElement)) {
    throw new Error("Create drawer did not open");
  }

  const nameInput = drawer.querySelector("input[placeholder='e.g. Product workspace']");
  if (!(nameInput instanceof HTMLInputElement)) {
    throw new Error("Missing custom screen name input");
  }
  await updateInput(nameInput, "Inventory dashboard");

  const contentTypeSelect = drawer.querySelectorAll("select")[0];
  if (!(contentTypeSelect instanceof HTMLSelectElement)) {
    throw new Error("Missing content type select");
  }
  await updateSelect(contentTypeSelect, "ct-products");

  await clickButton(findButton(drawer, "Create Custom Screen"));

  expect(customScreensState.createCalls[0]).toEqual({
    name: "Inventory dashboard",
    contentTypeId: "ct-products",
    status: "draft",
    showInSidebar: false,
    sidebarLabel: null,
  });
  expect(customScreensState.toastSuccess).toHaveBeenCalledWith(
    'Custom screen "Inventory dashboard" created.'
  );
  expect(customScreensState.navigateCalls).toEqual(["/advanced/custom-screens/created-screen"]);

  await React.act(async () => root.unmount());
});

test("CustomScreenListPage status and delete actions use existing contracts and confirmation", async () => {
  customScreensState.cachedScreens = [
    customScreensState.makeScreen({ id: "screen-1", status: "draft" }),
  ];
  customScreensState.cachedContentTypes = [customScreensState.makeContentType()];

  const { container, root } = await renderPage();

  await clickButton(findButton(container, "Activate"));
  expect(customScreensState.updateCalls[0]).toEqual({
    id: "screen-1",
    input: { status: "active" },
  });
  expect(customScreensState.toastSuccess).toHaveBeenCalledWith("Custom screen activated.");

  await clickButton(findButton(container, "Delete"));
  expect(customScreensState.deleteCalls).toEqual([]);
  expect(container.textContent).toContain("Delete custom screen?");

  await clickButton(findButton(container, "Delete custom screen"));
  expect(customScreensState.deleteCalls).toEqual(["screen-1"]);
  expect(customScreensState.toastSuccess).toHaveBeenCalledWith("Custom screen deleted.");

  await React.act(async () => root.unmount());
});

test("CustomScreenListPage bulk actions stay scoped to selected visible rows", async () => {
  customScreensState.cachedScreens = [
    customScreensState.makeScreen({ id: "screen-1", status: "active" }),
    customScreensState.makeScreen({
      id: "screen-2",
      name: "Hidden workspace",
      status: "active",
    }),
  ];
  customScreensState.cachedContentTypes = [customScreensState.makeContentType()];

  const { container, root } = await renderPage();
  const searchInput = container.querySelector("input[aria-label='Search custom screens']");
  if (!(searchInput instanceof HTMLInputElement)) {
    throw new Error("Missing search input");
  }
  await updateInput(searchInput, "Product");

  const rowCheckbox = container.querySelector("input[aria-label='Select Product workspace']");
  if (!(rowCheckbox instanceof HTMLInputElement)) {
    throw new Error("Missing visible row checkbox");
  }
  await React.act(async () => {
    rowCheckbox.click();
  });
  await flushAsync();

  const bulkSelect = container.querySelector("header select");
  if (!(bulkSelect instanceof HTMLSelectElement)) {
    throw new Error("Missing bulk action select");
  }
  await updateSelect(bulkSelect, "moveToDraft");
  await clickButton(findButton(container, "Apply"));

  expect(customScreensState.updateCalls).toEqual([{ id: "screen-1", input: { status: "draft" } }]);
  expect(customScreensState.toastSuccess).toHaveBeenCalledWith("1 custom screen moved to draft.");

  await React.act(async () => root.unmount());
});
