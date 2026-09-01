// @vitest-environment happy-dom

import React from "react";
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

const state = vi.hoisted(() => {
  const menus: TestMenuSummary[] = [
    {
      id: "menu-a",
      name: "Alpha",
      location: "primary",
      status: "published",
      publishedAt: "2026-04-22T00:00:00.000Z",
      createdAt: "2026-04-22T00:00:00.000Z",
    },
    {
      id: "menu-b",
      name: "Beta",
      location: "footer",
      status: "draft",
      publishedAt: null,
      createdAt: "2026-04-22T00:00:00.000Z",
    },
  ];

  return {
    menus: menus.map((menu) => ({ ...menu })),
    cached: true,
    loadError: null as unknown,
    apiError: false,
    createError: null as unknown,
    nextDraftError: new Map<string, unknown>(),
    nextDeleteError: new Map<string, unknown>(),
    deferredList: null as Promise<TestMenuSummary[]> | null,
    createCalls: [] as Array<{ name: string; location?: string | null }>,
    refreshCalls: [] as Array<{ force?: boolean }>,
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    reset() {
      this.menus = menus.map((menu) => ({ ...menu }));
      this.cached = true;
      this.loadError = null;
      this.apiError = false;
      this.createError = null;
      this.nextDraftError = new Map<string, unknown>();
      this.nextDeleteError = new Map<string, unknown>();
      this.deferredList = null;
      this.createCalls = [];
      this.refreshCalls = [];
      this.toastSuccess.mockClear();
      this.toastError.mockClear();
    },
  };
});

const navState = vi.hoisted(() => ({ calls: [] as string[] }));

const bus = vi.hoisted(() => ({
  subscribers: [] as Array<(event: { key: string }) => void>,
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

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
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
    SelectItem: ({ children }: { children: React.ReactNode; value: string }) => <>{children}</>,
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
  isApiClientError: () => state.apiError,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    menusList: "menusList",
  },
}));

vi.mock("@/services/menusClient", () => ({
  getCachedMenus: () => (state.cached ? state.menus : null),
  listMenusCached: vi.fn(async (options?: { force?: boolean }) => {
    state.refreshCalls.push({ force: options?.force });
    if (state.deferredList) return state.deferredList;
    if (state.loadError) throw state.loadError;
    return state.menus;
  }),
  createMenu: vi.fn(async (payload: { name: string; location?: string | null }) => {
    state.createCalls.push(payload);
    if (state.createError) throw state.createError;
    return {
      id: "menu-new",
      name: payload.name,
      location: payload.location ?? null,
      status: "draft" as const,
      publishedAt: null,
      createdAt: "2026-04-22T00:00:00.000Z",
    };
  }),
  publishMenu: vi.fn(async (id: string) => {
    state.menus = state.menus.map((menu) =>
      menu.id === id
        ? { ...menu, status: "published", publishedAt: "2026-04-23T00:00:00.000Z" }
        : menu
    );
  }),
  moveMenuToDraft: vi.fn(async (id: string) => {
    const error = state.nextDraftError.get(id);
    if (error) throw error;
    state.menus = state.menus.map((menu) =>
      menu.id === id ? { ...menu, status: "draft", publishedAt: null } : menu
    );
  }),
  deleteMenu: vi.fn(async (id: string) => {
    const error = state.nextDeleteError.get(id);
    if (error) throw error;
    state.menus = state.menus.filter((menu) => menu.id !== id);
    return { ok: true };
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: state.toastSuccess,
    error: state.toastError,
  },
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => {
      navState.calls.push(href);
    },
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/menus/MenuCreateDialog", () => ({
  MenuCreateDialog: ({
    open,
    onCreate,
    onCreateError,
  }: {
    open?: boolean;
    onCreate?: (payload: { name: string; location?: string }) => Promise<void> | void;
    onCreateError?: (error: unknown) => void;
  }) =>
    open ? (
      <div data-testid="menu-create-dialog">
        <button
          type="button"
          onClick={() => {
            void Promise.resolve(onCreate?.({ name: "Created Menu", location: "primary" })).catch(
              (error: unknown) => onCreateError?.(error)
            );
          }}
        >
          Mock create submit
        </button>
      </div>
    ) : null,
}));

vi.mock("@/ui/menus/SiteShellDialog", () => ({
  SiteShellDialog: ({ open }: { open?: boolean }) =>
    open ? <div data-testid="site-shell-dialog">Shell open</div> : null,
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

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    onConfirm,
    confirmLabel,
  }: {
    open?: boolean;
    onConfirm?: () => void;
    confirmLabel?: string;
  }) =>
    open ? (
      <div data-testid="confirm-action-dialog">
        <button type="button" onClick={() => onConfirm?.()}>
          {confirmLabel ?? "Confirm"}
        </button>
      </div>
    ) : null,
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
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    bus.subscribers.push(handler);
    return () => {
      bus.subscribers = bus.subscribers.filter((entry) => entry !== handler);
    };
  },
  broadcastCacheEvent: vi.fn(),
}));

const { MenuListPage } = await import("../../../core/admin/ui/menus/MenuListPage");

const flush = async () => {
  await React.act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
};

const createDeferredMenuList = () => {
  let resolve: (value: TestMenuSummary[]) => void = () => undefined;
  const promise = new Promise<TestMenuSummary[]>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

const mount = () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  React.act(() => {
    root.render(<MenuListPage />);
  });
  return {
    host,
    cleanup: () => {
      React.act(() => root.unmount());
      host.remove();
    },
  };
};

const clickButton = (scope: ParentNode, label: string) => {
  const button = Array.from(scope.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(label)
  );
  expect(button, `button "${label}"`).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickAsync = async (scope: ParentNode, label: string) => {
  clickButton(scope, label);
  await flush();
};

const setSelectValue = (select: HTMLSelectElement | null | undefined, next: string) => {
  expect(select).not.toBeUndefined();
  React.act(() => {
    if (!select) return;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    descriptor?.set?.call(select, next);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setInputValue = (input: HTMLInputElement | null | undefined, next: string) => {
  expect(input).not.toBeUndefined();
  React.act(() => {
    if (!input) return;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const emitCacheEvent = (key: string) => {
  for (const handler of bus.subscribers) {
    React.act(() => handler({ key }));
  }
};

beforeEach(() => {
  state.reset();
  navState.calls = [];
  bus.subscribers = [];
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("a foreground mount load with no cache paints the grid and clears loading", async () => {
  state.cached = false;
  const view = mount();
  try {
    expect(view.host.textContent).toContain("Loading menus");
    await flush();
    expect(view.host.textContent).not.toContain("Loading menus");
    expect(view.host.textContent).toContain("Alpha");
    expect(view.host.textContent).toContain("Beta");
  } finally {
    view.cleanup();
  }
});

test("a mount load failure surfaces the API message when the error is typed", async () => {
  state.cached = false;
  state.apiError = true;
  state.loadError = new Error("Menus API exploded");
  const view = mount();
  try {
    await flush();
    expect(view.host.textContent).toContain("Menus API exploded");
  } finally {
    view.cleanup();
  }
});

test("a mount load failure falls back to the generic message", async () => {
  state.cached = false;
  state.loadError = new Error("boom");
  const view = mount();
  try {
    await flush();
    expect(view.host.textContent).toContain("Failed to load menus.");
  } finally {
    view.cleanup();
  }
});

test("a cache-event reload that fails surfaces the refresh error", async () => {
  const view = mount();
  try {
    await flush();
    state.apiError = true;
    state.loadError = new Error("refresh boom");
    emitCacheEvent("menusList");
    await flush();
    expect(view.host.textContent).toContain("refresh boom");
  } finally {
    view.cleanup();
  }
});

test("a cache-event reload that fails with an opaque error surfaces the generic message", async () => {
  const view = mount();
  try {
    await flush();
    state.loadError = new Error("opaque refresh boom");
    emitCacheEvent("menusList");
    await flush();
    expect(view.host.textContent).toContain("Failed to load menus.");
  } finally {
    view.cleanup();
  }
});

test("a cache event preserves rows without foreground loading until its refresh resolves", async () => {
  const view = mount();
  try {
    await flush();
    const deferred = createDeferredMenuList();
    state.deferredList = deferred.promise;

    emitCacheEvent("menusList");
    await flush();

    expect(state.refreshCalls[state.refreshCalls.length - 1]).toEqual({ force: true });
    expect(view.host.textContent).toContain("Alpha");
    expect(view.host.textContent).toContain("Beta");
    expect(view.host.textContent).not.toContain("Loading menus...");

    await React.act(async () => {
      deferred.resolve([
        {
          id: "menu-replacement",
          name: "Replacement",
          location: "primary",
          status: "published",
          publishedAt: "2026-04-24T00:00:00.000Z",
          createdAt: "2026-04-24T00:00:00.000Z",
        },
      ]);
      await Promise.resolve();
    });

    expect(view.host.textContent).toContain("Replacement");
    expect(view.host.textContent).not.toContain("Alpha");
  } finally {
    view.cleanup();
  }
});

test("the search input filters the visible menu cards", async () => {
  const view = mount();
  try {
    await flush();
    const search = view.host.querySelector(
      'input[aria-label="Search menus by name or location"]'
    ) as HTMLInputElement | null;
    expect(search).not.toBeNull();
    setInputValue(search, "Alpha");
    expect(view.host.textContent).toContain("Alpha");
    expect(view.host.textContent).not.toContain("Beta");
  } finally {
    view.cleanup();
  }
});

test("the location filter narrows to unassigned menus", async () => {
  const view = mount();
  try {
    await flush();
    const selects = Array.from(view.host.querySelectorAll<HTMLSelectElement>("select"));
    // Second filter select is Location.
    setSelectValue(selects[1], "unassigned");
    expect(view.host.textContent).not.toContain("Alpha");
    expect(view.host.textContent).not.toContain("Beta");
    expect(view.host.textContent).toContain("No menus match your current filters.");
  } finally {
    view.cleanup();
  }
});

test("the row actions Edit navigates to the menu editor", async () => {
  const view = mount();
  try {
    await flush();
    // The dropdown Edit item is a bare button; the card-level Edit is an
    // AdminLink anchor, so target the un-anchored one.
    const editItem = Array.from(view.host.querySelectorAll("button")).find(
      (node) => node.textContent?.includes("Edit") && !node.closest("a")
    );
    expect(editItem).not.toBeUndefined();
    React.act(() => {
      editItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(navState.calls).toContain("/menus/menu-a");
  } finally {
    view.cleanup();
  }
});

test("the Site shell and New buttons open their dialogs", async () => {
  const view = mount();
  try {
    await flush();
    expect(view.host.querySelector('[data-testid="site-shell-dialog"]')).toBeNull();
    await clickAsync(view.host, "Site shell");
    expect(view.host.querySelector('[data-testid="site-shell-dialog"]')).not.toBeNull();

    expect(view.host.querySelector('[data-testid="menu-create-dialog"]')).toBeNull();
    clickButton(view.host, "New");
    expect(view.host.querySelector('[data-testid="menu-create-dialog"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("creating a menu prepends it to the grid and toasts success", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "New");
    await clickAsync(view.host, "Mock create submit");
    expect(state.createCalls).toEqual([{ name: "Created Menu", location: "primary" }]);
    expect(view.host.textContent).toContain("Created Menu");
    expect(state.toastSuccess).toHaveBeenCalledWith('Menu "Created Menu" created.');
  } finally {
    view.cleanup();
  }
});

test("a failed create surfaces the toast error", async () => {
  state.createError = new Error("create boom");
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "New");
    await clickAsync(view.host, "Mock create submit");
    expect(state.toastError).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("a failed unpublish surfaces the row error", async () => {
  state.nextDraftError.set("menu-a", {
    name: "ApiClientError",
    code: "menus_move_failed",
    status: 400,
    message: "draft boom",
  });
  const view = mount();
  try {
    await flush();
    const actions = Array.from(view.host.querySelectorAll("button")).find(
      (node) => node.getAttribute("aria-label") === "Open menu actions"
    );
    React.act(() => {
      actions?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await clickAsync(view.host, "Move to Draft");
    expect(view.host.textContent).toContain("draft boom");
  } finally {
    view.cleanup();
  }
});

test("a failed confirmed delete surfaces the row error", async () => {
  state.nextDeleteError.set("menu-a", {
    name: "ApiClientError",
    code: "menus_delete_failed",
    status: 400,
    message: "delete boom",
  });
  const view = mount();
  try {
    await flush();
    const actions = Array.from(view.host.querySelectorAll("button")).find(
      (node) => node.getAttribute("aria-label") === "Open menu actions"
    );
    React.act(() => {
      actions?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    clickButton(view.host, "Delete");
    await clickAsync(view.host, "Delete menu");
    expect(view.host.textContent).toContain("delete boom");
  } finally {
    view.cleanup();
  }
});

test("an invalid published date renders its raw value", async () => {
  state.menus = [
    {
      id: "menu-x",
      name: "Broken Date",
      location: null,
      status: "published",
      publishedAt: "not-a-date",
      createdAt: "2026-04-22T00:00:00.000Z",
    },
  ];
  const view = mount();
  try {
    await flush();
    expect(view.host.textContent).toContain("Updated not-a-date");
  } finally {
    view.cleanup();
  }
});

test("a bulk unpublish with mixed results reports the partial message", async () => {
  state.nextDraftError.set("menu-a", new Error("draft boom"));
  const view = mount();
  try {
    await flush();
    const selectAll = view.host.querySelector<HTMLButtonElement>(
      'button[aria-label="Select all menus"]'
    );
    React.act(() => {
      selectAll?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const bulkSelect = Array.from(view.host.querySelectorAll<HTMLSelectElement>("select")).find(
      (select) =>
        Array.from(select.querySelectorAll("option")).some((option) => option.value === "unpublish")
    );
    setSelectValue(bulkSelect, "unpublish");
    await clickAsync(view.host, "Apply");
    expect(state.toastError).toHaveBeenCalledWith("Moved 1 menu to draft; failed 1.");
  } finally {
    view.cleanup();
  }
});

test("a bulk unpublish with every target failing reports the failure message", async () => {
  state.nextDraftError.set("menu-a", new Error("draft boom"));
  state.nextDraftError.set("menu-b", new Error("draft boom"));
  const view = mount();
  try {
    await flush();
    const selectAll = view.host.querySelector<HTMLButtonElement>(
      'button[aria-label="Select all menus"]'
    );
    React.act(() => {
      selectAll?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const bulkSelect = Array.from(view.host.querySelectorAll<HTMLSelectElement>("select")).find(
      (select) =>
        Array.from(select.querySelectorAll("option")).some((option) => option.value === "unpublish")
    );
    setSelectValue(bulkSelect, "unpublish");
    await clickAsync(view.host, "Apply");
    expect(state.toastError).toHaveBeenCalledWith("Failed to move 2 menus to draft.");
  } finally {
    view.cleanup();
  }
});
