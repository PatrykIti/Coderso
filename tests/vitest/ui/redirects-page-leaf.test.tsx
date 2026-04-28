// @vitest-environment happy-dom

import React, { act } from "react";
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
  reset() {
    redirectsState.listResult = [];
    redirectsState.listError = null;
    redirectsState.listRedirects.mockClear();
    redirectsState.createRedirect.mockClear();
    redirectsState.updateRedirect.mockClear();
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
  createRedirect: redirectsState.createRedirect,
  updateRedirect: redirectsState.updateRedirect,
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

vi.mock("../../../core/admin/ui/redirects/RedirectsTable", () => ({
  RedirectsTable: ({
    items,
    isLoading,
    isSaving,
    onEdit,
    onToggle,
  }: {
    items: Array<{ id: string; from: string; to: string; type: string; status: string }>;
    isLoading: boolean;
    isSaving: boolean;
    onEdit: (item: { id: string; from: string; to: string; type: string; status: string }) => void;
    onToggle: (item: { id: string; from: string; to: string; type: string; status: string }) => void;
  }) => (
    <div>
      <span>{isLoading ? "loading" : "loaded"}</span>
      <span>{isSaving ? "saving" : "idle"}</span>
      {items.map((item) => (
        <div key={item.id}>{`${item.from}->${item.to}`}</div>
      ))}
      <button
        type="button"
        onClick={() => items[0] && onEdit(items[0])}
      >
        edit-first
      </button>
      <button
        type="button"
        onClick={() => items[0] && onToggle(items[0])}
      >
        toggle-first
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

  act(() => {
    root.render(node);
  });

  return {
    container,
    rerender: () => {
      act(() => {
        root.render(node);
      });
    },
    cleanup: () => {
      act(() => {
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
    await act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Redirects");
    expect(view.container.textContent).toContain("Site management - 1 active routes.");
    expect(view.container.textContent).toContain("/old-home->/home");

    act(() => {
      view.container
        .querySelector("button[data-input-action='match']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("/shop-old->/shop");
    expect(view.container.textContent).not.toContain("/old-home->/home");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Create redirect"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("drawer:create");

    await act(async () => {
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

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "edit-first")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("drawer:edit");
    expect(view.container.textContent).toContain("/shop-old");

    await act(async () => {
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

    await act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "toggle-first")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-2", {
      enabled: true,
    });
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
    await act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Redirects unavailable");
    expect(view.container.textContent).toContain("Redirect list failed");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});
