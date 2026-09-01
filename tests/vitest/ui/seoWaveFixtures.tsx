// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";

import type { SeoDocumentItem } from "../../../core/admin/services/seoClient";

export const seoHarness = (() => ({
  listItems: [] as SeoDocumentItem[],
  failList: false,
  listSeo: vi.fn(),
  listSeoCached: vi.fn(),
  getCachedSeo: vi.fn(() => null),
  getSeoOverview: vi.fn(async () => ({ indexedPages: 7 })),
  getCachedSeoOverview: vi.fn(() => null),
  runSeoAudit: vi.fn(async () => ({})),
  updateSeo: vi.fn(async () => ({})),
  syncSearchPerformance: vi.fn(async () => ({})),
  submitSitemap: vi.fn(async () => ({})),
  toastSuccesses: [] as string[],
  toastSuccessCalls() {
    return this.toastSuccesses;
  },
}))();

export function seedList(items: SeoDocumentItem[], options?: { failList?: boolean }) {
  seoHarness.listItems = items;
  seoHarness.failList = Boolean(options?.failList);
}

const defaultListSeoCached = async () => {
  if (seoHarness.failList) {
    throw new Error("seo-list-down");
  }
  return seoHarness.listItems;
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    title,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/services/seoClient", async () => {
  const h = await import("./seoWaveFixtures").then((m) => m.seoHarness);
  return {
    listSeo: h.listSeo,
    listSeoCached: h.listSeoCached,
    getCachedSeo: h.getCachedSeo,
    getSeoOverview: h.getSeoOverview,
    getCachedSeoOverview: h.getCachedSeoOverview,
    runSeoAudit: h.runSeoAudit,
    updateSeo: h.updateSeo,
    syncSearchPerformance: h.syncSearchPerformance,
    submitSitemap: h.submitSitemap,
  };
});

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/StatCard", () => ({
  StatCard: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      {label}:{String(value)}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/seo/SeoPerformancePanel", () => ({
  SeoPerformancePanel: ({ refreshKey }: { refreshKey: number }) => (
    <div>{`perf-panel:${refreshKey}`}</div>
  ),
}));

vi.mock("../../../core/admin/ui/seo/SeoDrawer", () => ({
  SeoDrawer: ({
    item,
    open,
    onSave,
  }: {
    item: { id: string } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (
      id: string,
      payload: { title: string; description: string; canonicalUrl: string; robots: string }
    ) => Promise<void>;
    isSaving: boolean;
    error?: string | null;
  }) =>
    open && item ? (
      <div>
        <button
          type="button"
          onClick={() =>
            void onSave(item.id, {
              title: "Updated title",
              description: "Updated description",
              canonicalUrl: "",
              robots: "",
            })
          }
        >
          drawer-save
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/seo/SeoAuditDialog", () => ({
  SeoAuditDialog: ({
    open,
    onRun,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRun: (checks: string[]) => Promise<void>;
    isRunning: boolean;
  }) =>
    open ? (
      <button type="button" onClick={() => void onRun(["all"])}>
        audit-run-confirm
      </button>
    ) : null,
}));

vi.mock("../../../core/admin/ui/seo/SeoTable", () => ({
  SeoTable: ({
    items,
    onEdit,
    emptyState,
    onEmptyAction,
    emptyActionDisabled,
  }: {
    items: Array<{ id: string }>;
    activeId?: string | null;
    onEdit: (id: string) => void;
    emptyState: { title: string; description: string; actionLabel?: string };
    onEmptyAction: () => void;
    emptyActionDisabled: boolean;
  }) => (
    <div>
      {items.length === 0 ? (
        <div>
          <span>{emptyState.title}</span>
          {emptyState.actionLabel ? (
            <button type="button" onClick={onEmptyAction} disabled={emptyActionDisabled}>
              {emptyState.actionLabel}
            </button>
          ) : null}
        </div>
      ) : (
        items.map((item) => (
          <div key={item.id}>
            <span>{item.id}</span>
            <button type="button" onClick={() => onEdit(item.id)}>
              {`edit:${item.id}`}
            </button>
          </div>
        ))
      )}
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => seoHarness.toastSuccesses.push(message),
    error: (message: string) => seoHarness.toastSuccesses.push(`error:${message}`),
  },
}));

export function resetSeoHarness() {
  seoHarness.listItems = [];
  seoHarness.failList = false;
  seoHarness.toastSuccesses = [];
  for (const key of [
    "listSeo",
    "listSeoCached",
    "getSeoOverview",
    "runSeoAudit",
    "updateSeo",
    "syncSearchPerformance",
    "submitSitemap",
  ] as const) {
    seoHarness[key].mockReset?.();
  }
  seoHarness.listSeoCached.mockImplementation(defaultListSeoCached);
  seoHarness.getSeoOverview.mockImplementation(async () => ({ indexedPages: 7 }));
  seoHarness.runSeoAudit.mockImplementation(async () => ({}));
  seoHarness.updateSeo.mockImplementation(async () => ({}));
  seoHarness.syncSearchPerformance.mockImplementation(async () => ({}));
  seoHarness.submitSitemap.mockImplementation(async () => ({}));
}

beforeEach(() => {
  resetSeoHarness();
});

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

export const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
};

export const findButton = (container: HTMLElement, text: string): HTMLButtonElement => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  return button;
};

export const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setInputValue = (container: HTMLElement, placeholder: string, value: string) => {
  const input = Array.from(container.querySelectorAll("input")).find(
    (candidate) => candidate.placeholder === placeholder
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input: ${placeholder}`);
  }
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    nativeSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

export const setSeoQuery = (view: { container: HTMLElement }, value: string) => {
  setInputValue(view.container, "Search pages…", value);
};

export const editFirstRow = (view: { container: HTMLElement }) => {
  clickByText(view.container, "edit:");
};

export const submitDrawer = (view: { container: HTMLElement }) => {
  clickByText(view.container, "drawer-save");
};

export const openAuditDialogAndRun = (view: { container: HTMLElement }) => {
  clickByText(view.container, "Run Full Audit");
  clickByText(view.container, "audit-run-confirm");
};
