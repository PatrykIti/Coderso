// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

const redirectsState = vi.hoisted(() => ({
  listResult: [] as Array<{
    id: string;
    fromPath: string;
    toPath: string;
    statusCode: 301 | 302 | 307 | 308;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }>,
  listError: null as unknown,
  listRedirects: vi.fn(async () => {
    if (redirectsState.listError) throw redirectsState.listError;
    return redirectsState.listResult;
  }),
  createRedirect: vi.fn(async () => ({})),
  updateRedirect: vi.fn(async () => ({})),
  deleteRedirect: vi.fn(async (id: string) => {
    redirectsState.listResult = redirectsState.listResult.filter((item) => item.id !== id);
    return { ok: true };
  }),
  reset() {
    redirectsState.listResult = [];
    redirectsState.listError = null;
    redirectsState.listRedirects.mockClear();
    redirectsState.createRedirect.mockClear();
    redirectsState.updateRedirect.mockClear();
    redirectsState.deleteRedirect.mockClear();
  },
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <input value={value} onChange={onChange} />
      <button
        type="button"
        data-input-action="match"
        onClick={() =>
          onChange?.({
            target: { value: "shop" },
          } as React.ChangeEvent<HTMLInputElement>)
        }
      >
        match
      </button>
      <button
        type="button"
        data-input-action="empty"
        onClick={() =>
          onChange?.({
            target: { value: "missing" },
          } as React.ChangeEvent<HTMLInputElement>)
        }
      >
        empty
      </button>
    </div>
  ),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error && error.kind === "api",
}));

vi.mock("@/services/redirectsClient", () => ({
  listRedirects: redirectsState.listRedirects,
  listRedirectsCached: redirectsState.listRedirects,
  getCachedRedirects: vi.fn(() => null),
  createRedirect: redirectsState.createRedirect,
  updateRedirect: redirectsState.updateRedirect,
  deleteRedirect: redirectsState.deleteRedirect,
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
      {actions}
    </div>
  ),
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
    onConfirm: () => void | Promise<void>;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <span>{title}</span>
        <span>{description}</span>
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          cancel-confirm
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/redirects/RedirectsTable", () => ({
  RedirectsTable: ({
    items,
    isLoading,
    isSaving,
    total,
    page,
    limit,
    isFiltering,
    selectedIds,
    isAllSelected,
    isIndeterminate,
    onToggleAll,
    onToggleRedirect,
    onEdit,
    onToggle,
    onDelete,
    onPageChange,
  }: {
    items: Array<{ id: string; from: string; to: string; type: string; status: string }>;
    isLoading: boolean;
    isSaving: boolean;
    selectedIds: string[];
    isAllSelected: boolean;
    isIndeterminate: boolean;
    total: number;
    page: number;
    limit: number;
    isFiltering: boolean;
    onToggleAll: () => void;
    onToggleRedirect: (id: string) => void;
    onEdit: (item: { id: string; from: string; to: string; type: string; status: string }) => void;
    onToggle: (item: {
      id: string;
      from: string;
      to: string;
      type: string;
      status: string;
    }) => void;
    onDelete: (item: {
      id: string;
      from: string;
      to: string;
      type: string;
      status: string;
    }) => void;
    onPageChange: (page: number) => void;
  }) => (
    <div>
      <span>{isLoading ? "loading" : "loaded"}</span>
      <span>{isSaving ? "saving" : "idle"}</span>
      <span>{`table-count:${items.length}`}</span>
      <span>{`table-total:${total}`}</span>
      <span>{`table-page:${page}`}</span>
      <span>{`table-limit:${limit}`}</span>
      <span>{`filtering:${String(isFiltering)}`}</span>
      <span>{`selected:${selectedIds.length}`}</span>
      <span>{`all:${String(isAllSelected)}`}</span>
      <span>{`mixed:${String(isIndeterminate)}`}</span>
      {items.map((item) => (
        <div key={item.id}>{`${item.from}->${item.to}`}</div>
      ))}
      <button type="button" onClick={onToggleAll}>
        select-all
      </button>
      <button type="button" onClick={() => items[0] && onToggleRedirect(items[0].id)}>
        select-first
      </button>
      <button type="button" onClick={() => items[0] && onEdit(items[0])}>
        edit-first
      </button>
      <button type="button" onClick={() => items[0] && onToggle(items[0])}>
        toggle-first
      </button>
      <button type="button" onClick={() => items[0] && onDelete(items[0])}>
        delete-first
      </button>
      <button type="button" onClick={() => onPageChange(page + 1)}>
        page-two
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/redirects/RedirectDrawer", () => ({
  RedirectDrawer: ({
    open,
    mode,
    redirect,
    onSave,
  }: {
    open: boolean;
    mode: "create" | "edit";
    redirect: { from: string; to: string; type: string; active: boolean } | null;
    onSave: (payload: {
      fromPath: string;
      toPath: string;
      statusCode: 301 | 302 | 307 | 308;
      enabled?: boolean;
    }) => Promise<boolean>;
  }) => (
    <div>
      <span>{open ? `drawer:${mode}` : "drawer:closed"}</span>
      <span>{redirect?.from ?? "no-redirect"}</span>
      <button
        type="button"
        onClick={() =>
          onSave({
            fromPath: "/promo",
            toPath: "/shop",
            statusCode: 302,
            enabled: true,
          })
        }
      >
        save-drawer
      </button>
    </div>
  ),
}));

import { RedirectsPage } from "../../../core/admin/ui/redirects/RedirectsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    rerender: () => {
      React.act(() => {
        root.render(node);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

test("RedirectsPage loads, filters, creates, edits, and toggles redirects", async () => {
  redirectsState.reset();
  redirectsState.listResult = [
    {
      id: "redirect-1",
      fromPath: "/old-home",
      toPath: "/home",
      statusCode: 301,
      enabled: true,
      createdAt: "2026-03-06",
      updatedAt: "2026-03-06",
    },
    {
      id: "redirect-2",
      fromPath: "/shop-old",
      toPath: "/shop",
      statusCode: 302,
      enabled: false,
      createdAt: "2026-03-06",
      updatedAt: "2026-03-06",
    },
  ];

  const view = mount(<RedirectsPage />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Redirects");
    expect(view.container.textContent).toContain("Site management - 1 active routes.");
    expect(view.container.textContent).toContain("/old-home->/home");
    expect(view.container.textContent).toContain("table-total:2");
    expect(view.container.textContent).toContain("table-page:1");
    expect(view.container.textContent).toContain("table-limit:10");

    React.act(() => {
      view.container
        .querySelector("button[data-input-action='match']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("/shop-old->/shop");
    expect(view.container.textContent).not.toContain("/old-home->/home");
    expect(view.container.textContent).toContain("filtering:true");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.trim() === "Create")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("drawer:create");

    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "save-drawer")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(redirectsState.createRedirect).toHaveBeenCalledWith({
      fromPath: "/promo",
      toPath: "/shop",
      statusCode: 302,
      enabled: true,
    });

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "edit-first")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("drawer:edit");
    expect(view.container.textContent).toContain("/shop-old");

    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "save-drawer")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-2", {
      fromPath: "/promo",
      toPath: "/shop",
      statusCode: 302,
      enabled: true,
    });

    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "toggle-first")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-2", {
      enabled: true,
    });

    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "delete-first")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Delete redirect?");

    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Delete")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(redirectsState.deleteRedirect).toHaveBeenCalledWith("redirect-2");
    expect(view.container.textContent).not.toContain("/shop-old->/shop");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.trim() === "Create")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("drawer:create");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage paginates local rows and resets page on search", async () => {
  redirectsState.reset();
  redirectsState.listResult = Array.from({ length: 12 }, (_, index) => ({
    id: `redirect-${index + 1}`,
    fromPath: `/old-${index + 1}`,
    toPath: `/new-${index + 1}`,
    statusCode: 301 as const,
    enabled: true,
    createdAt: "2026-03-06",
    updatedAt: "2026-03-06",
  }));

  const view = mount(<RedirectsPage />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("table-count:10");
    expect(view.container.textContent).toContain("table-total:12");
    expect(view.container.textContent).toContain("table-page:1");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "page-two")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("/old-11->/new-11");
    expect(view.container.textContent).toContain("table-page:2");

    React.act(() => {
      view.container
        .querySelector("button[data-input-action='match']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("table-count:0");
    expect(view.container.textContent).toContain("table-page:1");
    expect(view.container.textContent).toContain("filtering:true");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage surfaces API load errors", async () => {
  redirectsState.reset();
  redirectsState.listError = { kind: "api", message: "Redirect list failed" };
  const view = mount(<RedirectsPage />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Redirects unavailable");
    expect(view.container.textContent).toContain("Redirect list failed");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});
