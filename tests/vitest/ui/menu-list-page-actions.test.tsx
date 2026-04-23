// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

type TestMenuSummary = {
  id: string;
  name: string;
  location: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
};

const menuListState = vi.hoisted(() => {
  const menus: TestMenuSummary[] = [
    {
      id: "menu-1",
      name: "Primary",
      location: "primary",
      status: "published",
      publishedAt: "2026-04-22T00:00:00.000Z",
      createdAt: "2026-04-22T00:00:00.000Z",
    },
    {
      id: "menu-2",
      name: "Footer",
      location: null,
      status: "draft",
      publishedAt: null,
      createdAt: "2026-04-22T00:00:00.000Z",
    },
  ];

  return {
    menus: menus.map((menu) => ({ ...menu })),
    publishCalls: [] as string[],
    draftCalls: [] as string[],
    deleteCalls: [] as string[],
    refreshCalls: [] as Array<{ force?: boolean }>,
    reset() {
      this.menus = menus.map((menu) => ({ ...menu }));
      this.publishCalls = [];
      this.draftCalls = [];
      this.deleteCalls = [];
      this.refreshCalls = [];
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
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
    [key: string]: unknown;
  }) =>
    asChild && React.isValidElement(children) ? (
      children
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
      aria-label={ariaLabel}
      type="button"
      aria-pressed={checked === true}
      onClick={() => onCheckedChange?.(checked !== true)}
    >
      checkbox
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
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
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) {
          return flattenText((child.props as { children?: React.ReactNode }).children);
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
      const props = child.props as { value?: string; children?: React.ReactNode };
      if (typeof props.value === "string") {
        return [{ value: props.value, label: flattenText(props.children) }];
      }
      return collectOptions(props.children);
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
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode; value: string }) => (
      <>{children}</>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
  };
});

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: { children: React.ReactNode }) => (
    <td {...props}>{children}</td>
  ),
  TableHead: ({ children, ...props }: { children: React.ReactNode }) => (
    <th {...props}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, ...props }: { children: React.ReactNode }) => (
    <tr {...props}>{children}</tr>
  ),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    menusList: "menusList",
  },
}));

vi.mock("@/services/menusClient", () => ({
  getCachedMenus: () => menuListState.menus,
  listMenusCached: vi.fn(async (options?: { force?: boolean }) => {
    menuListState.refreshCalls.push({ force: options?.force });
    return menuListState.menus;
  }),
  createMenu: vi.fn(),
  publishMenu: vi.fn(async (id: string) => {
    menuListState.publishCalls.push(id);
    menuListState.menus = menuListState.menus.map((menu) =>
      menu.id === id
        ? { ...menu, status: "published", publishedAt: "2026-04-23T00:00:00.000Z" }
        : menu
    );
  }),
  moveMenuToDraft: vi.fn(async (id: string) => {
    menuListState.draftCalls.push(id);
    menuListState.menus = menuListState.menus.map((menu) =>
      menu.id === id ? { ...menu, status: "draft", publishedAt: null } : menu
    );
  }),
  deleteMenu: vi.fn(async (id: string) => {
    menuListState.deleteCalls.push(id);
    menuListState.menus = menuListState.menus.filter((menu) => menu.id !== id);
    return { ok: true };
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: vi.fn(),
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/menus/MenuCreateDialog", () => ({
  MenuCreateDialog: () => <div data-testid="menu-create-dialog" />,
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
    <a href={`/admin${href}`} {...props}>
      {children}
    </a>
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
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </header>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("@/utils/cacheRefresh", () => ({
  resolveCacheRefreshBackground: () => true,
}));

const { MenuListPage } = await import("../../../core/admin/ui/menus/MenuListPage");

const flush = () => act(async () => Promise.resolve());

const mount = () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<MenuListPage />);
  });
  return {
    host,
    cleanup: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
};

beforeEach(() => {
  menuListState.reset();
  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("MenuListPage filters rows and bulk publishes only selected visible menus", async () => {
  const view = mount();
  try {
    await flush();

    expect(view.host.textContent).toContain("Primary");
    expect(view.host.textContent).toContain("Footer");

    const selects = Array.from(view.host.querySelectorAll("select"));
    await act(async () => {
      selects[0]!.value = "draft";
      selects[0]!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(view.host.textContent).not.toContain("Primary");
    expect(view.host.textContent).toContain("Footer");

    const selectAll = view.host.querySelector(
      'button[aria-label="Select all menus"]'
    ) as HTMLButtonElement;
    await act(async () => {
      selectAll.click();
      await Promise.resolve();
    });

    const bulkSelect = Array.from(view.host.querySelectorAll("select"))[0]!;
    await act(async () => {
      bulkSelect.value = "publish";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const apply = Array.from(view.host.querySelectorAll("button")).find(
      (button) => button.textContent === "Apply"
    );
    await act(async () => {
      apply?.click();
      await Promise.resolve();
    });

    expect(menuListState.publishCalls).toEqual(["menu-2"]);
    expect(menuListState.publishCalls).not.toContain("menu-1");
  } finally {
    view.cleanup();
  }
});

test("MenuListPage requires confirmation before bulk delete", async () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  const view = mount();
  try {
    await flush();

    const selectAll = view.host.querySelector(
      'button[aria-label="Select all menus"]'
    ) as HTMLButtonElement;
    await act(async () => {
      selectAll.click();
      await Promise.resolve();
    });

    const bulkSelect = Array.from(view.host.querySelectorAll("select"))[0]!;
    await act(async () => {
      bulkSelect.value = "delete";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const apply = Array.from(view.host.querySelectorAll("button")).find(
      (button) => button.textContent === "Apply"
    );
    await act(async () => {
      apply?.click();
      await Promise.resolve();
    });

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete 2 menus? This cannot be undone."
    );
    expect(menuListState.deleteCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});
