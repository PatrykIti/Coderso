// @vitest-environment happy-dom

// Residual PopupsListPage branches: the successful status-toggle path, the
// ApiClientError surface for status mutations, and the "New popup" navigation.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listState = vi.hoisted(() => ({
  items: [] as Array<Record<string, unknown>>,
  isLoading: false,
  loadError: null as string | null,
  refresh: vi.fn(async () => undefined),
  statusError: null as unknown,
}));

vi.mock("../../../core/admin/ui/popups/hooks/usePopups", () => ({
  usePopups: () => ({
    items: listState.items as never[],
    isLoading: listState.isLoading,
    error: listState.loadError,
    refresh: listState.refresh,
  }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <select data-testid="status-tabs" aria-label="Status filter" defaultValue={value}>
      {children}
    </select>
  ),
  TabsList: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TabsTrigger: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/services/popupsClient", async () => {
  const actual = await import("../../../core/admin/services/popupsClient");
  return {
    ...actual,
    deletePopup: vi.fn(async () => ({ ok: true })),
    updatePopupStatus: vi.fn(async () => {
      if (listState.statusError) throw listState.statusError;
      return { ok: true };
    }),
  };
});

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: React.ReactNode;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </header>
  ),
}));

vi.mock("@/ui/shared/StatCard", () => ({
  StatCard: ({ label }: { label: string; value: number }) => <div>{label}</div>,
}));

import { ApiClientError } from "../../../core/admin/services/apiClient";
import type { PopupRecord } from "../../../core/admin/services/popupsClient";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";
import { PopupsListPage } from "../../../core/admin/ui/popups/PopupsListPage";

// Sibling probe that renders the live router path so navigation clicks are observable.
const RouterPathProbe = () => {
  const { path } = useAdminRouter();
  return <div data-testid="probe-path">{path}</div>;
};

const record = (): PopupRecord =>
  ({
    id: "popup-1",
    name: "Winter Promo",
    slug: "winter-promo",
    status: "draft",
    trigger: { type: "time_delay", delaySeconds: 3 },
    targeting: { includePaths: [], excludePaths: [], audience: "all" },
    frequency: { strategy: "session_once", cooldownMinutes: null },
    content: { title: null, body: null, templateId: null, ctaLabel: null, ctaHref: null },
    settings: { placement: "center", dismissible: true, showOverlay: true },
    createdAt: "",
    updatedAt: "",
    publishedAt: null,
  }) as PopupRecord;

const mountWithProbe = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/advanced/popups">
        <RouterPathProbe />
        {node}
      </AdminRouterProvider>
    );
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const clickButtonWithText = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button ${label}`);
  React.act(() => {
    button.click();
  });
};

// The status Switch carries its identity in aria-label, not text content.
const clickStatusToggle = (container: HTMLElement, popupName: string) => {
  const toggle = container.querySelector<HTMLButtonElement>(
    `button[role='switch'][aria-label='Toggle ${popupName}']`
  );
  if (!toggle) throw new Error(`missing toggle for ${popupName}`);
  React.act(() => {
    toggle.click();
  });
};

afterEach(() => {
  listState.items = [];
  listState.isLoading = false;
  listState.loadError = null;
  listState.statusError = null;
  listState.refresh.mockClear();
  document.body.innerHTML = "";
});

describe("PopupsListPage residual gaps", () => {
  it("a successful status toggle refreshes the list and clears a stale action error", async () => {
    listState.items = [record()] as never[];
    // seed a stale action banner first so the success path must clear it
    listState.statusError = new Error("offline");
    const view = mountWithProbe(<PopupsListPage />);
    clickStatusToggle(view.container, "Winter Promo");
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to update popup status.");

    listState.statusError = null;
    clickStatusToggle(view.container, "Winter Promo");
    await flushEffects();
    // visible effect: the stale failure banner is gone and the list was refetched
    expect(listState.refresh).toHaveBeenCalledWith(true);
    expect(view.container.textContent).not.toContain("Popup action failed");
    expect(view.container.textContent).not.toContain("Failed to update popup status.");
    view.unmount();
  });

  it("an ApiClientError from updatePopupStatus surfaces its message verbatim", async () => {
    listState.items = [record()] as never[];
    listState.statusError = new ApiClientError("popup_locked", "status is locked", 409);
    const view = mountWithProbe(<PopupsListPage />);
    clickStatusToggle(view.container, "Winter Promo");
    await flushEffects();
    expect(view.container.textContent).toContain("Popup action failed");
    expect(view.container.textContent).toContain("status is locked");
    view.unmount();
  });

  it("the New popup action navigates the admin router to the create form", () => {
    listState.items = [record()] as never[];
    const view = mountWithProbe(<PopupsListPage />);
    expect(view.container.querySelector("[data-testid='probe-path']")!.textContent).toBe(
      "/admin/advanced/popups"
    );

    clickButtonWithText(view.container, "New popup");
    expect(view.container.querySelector("[data-testid='probe-path']")!.textContent).toBe(
      "/admin/advanced/popups/new"
    );
    view.unmount();
  });
});
