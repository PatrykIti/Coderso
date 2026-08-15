// TASK-491-04-L02: health UI surface (Vitest ui-integration lane). Verifies the
// card and drawer render real health states and that "Test connection" calls
// the client once, updates only the checked row, and surfaces API errors
// without wiping other rows.
// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const integrationsState = vi.hoisted(() => ({
  listIntegrations: vi.fn(),
  checkIntegration: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <span {...props}>{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    variant: _variant,
    size: _size,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    [key: string]: unknown;
  }) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
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

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({
    children,
    side: _side,
    showCloseButton: _showCloseButton,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  SheetTitle: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <h2 {...props}>{children}</h2>
  ),
  SheetDescription: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <p {...props}>{children}</p>,
}));

vi.mock("@/services/integrationsClient", () => ({
  listIntegrations: integrationsState.listIntegrations,
  checkIntegration: integrationsState.checkIntegration,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/ui/layouts/SettingsShell", () => ({
  SettingsShell: ({
    breadcrumbs,
    search,
    sidebar,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    search?: React.ReactNode;
    sidebar?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {breadcrumbs}
      {search}
      {sidebar}
      {children}
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

import { IntegrationsPage } from "../../../core/admin/ui/settings/IntegrationsPage";

type HealthRecord = {
  status: "unknown" | "healthy" | "issue";
  lastCheckedAt: string | null;
  lastError: string | null;
};

const makeRecord = (
  id: string,
  name: string,
  health: HealthRecord,
  status: "connected" | "disconnected" = "connected"
) => ({
  id,
  name,
  description: `${name} description`,
  category: "Communication",
  scopes: ["events:read"],
  status,
  health,
  updatedAt: null,
  fields: [
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "secret" as const,
      required: true,
      secret: true,
      configured: true,
      value: null,
    },
  ],
});

const healthyRecord = makeRecord("slack", "Slack", {
  status: "healthy",
  lastCheckedAt: "2026-08-01T10:00:00.000Z",
  lastError: null,
});
const issueRecord = makeRecord("zapier", "Zapier", {
  status: "issue",
  lastCheckedAt: "2026-08-01T10:00:00.000Z",
  lastError: "webhook_http_429",
});
const unknownRecord = makeRecord(
  "sentry",
  "Sentry",
  {
    status: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  "disconnected"
);

const mountPage = () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/settings/integrations">
        <IntegrationsPage />
      </AdminRouterProvider>
    );
  });

  return {
    host,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const findButton = (host: HTMLElement, text: string) =>
  Array.from(host.querySelectorAll("button")).find((button) =>
    button.textContent?.replace(/\s+/g, " ").includes(text)
  );

const clickButton = async (host: HTMLElement, text: string) => {
  await React.act(async () => {
    findButton(host, text)?.click();
  });
  await flush();
};

afterEach(() => {
  integrationsState.listIntegrations.mockReset();
  integrationsState.checkIntegration.mockReset();
  document.body.innerHTML = "";
});

test("cards render the real health state for healthy, issue, and unknown", async () => {
  integrationsState.listIntegrations.mockResolvedValue([healthyRecord, issueRecord, unknownRecord]);

  const view = mountPage();
  try {
    await flush();

    expect(view.host.textContent).toContain("Healthy");
    expect(view.host.textContent).toContain("Issue");
    expect(view.host.textContent).toContain("Not checked");
  } finally {
    view.cleanup();
  }
});

test("drawer shows health details and the Test connection action", async () => {
  integrationsState.listIntegrations.mockResolvedValue([issueRecord]);

  const view = mountPage();
  try {
    await flush();

    await clickButton(view.host, "Configure");

    expect(view.host.textContent).toContain("webhook_http_429");
    expect(view.host.textContent).toContain("Last checked:");
    const testButton = findButton(view.host, "Test connection");
    expect(testButton).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("Test connection calls checkIntegration once and replaces only that row", async () => {
  integrationsState.listIntegrations.mockResolvedValue([healthyRecord, unknownRecord]);
  const refreshed = {
    ...unknownRecord,
    health: {
      status: "healthy" as const,
      lastCheckedAt: "2026-08-02T09:00:00.000Z",
      lastError: null,
    },
  };
  integrationsState.checkIntegration.mockResolvedValue({ item: refreshed });

  const view = mountPage();
  try {
    await flush();

    await clickButton(view.host, "Connect");
    await clickButton(view.host, "Test connection");

    expect(integrationsState.checkIntegration).toHaveBeenCalledTimes(1);
    expect(integrationsState.checkIntegration).toHaveBeenCalledWith("sentry");

    // The checked row now reads healthy while the untouched row keeps its state.
    expect(view.host.textContent).toContain("Healthy");
    const healthyPills = view.host.textContent?.match(/Healthy/g)?.length ?? 0;
    expect(healthyPills).toBeGreaterThanOrEqual(2);
  } finally {
    view.cleanup();
  }
});

test("Test connection API errors surface in the drawer without wiping other rows", async () => {
  integrationsState.listIntegrations.mockResolvedValue([healthyRecord, issueRecord]);
  integrationsState.checkIntegration.mockRejectedValue(
    Object.assign(new Error("Forbidden"), { name: "ApiClientError" })
  );

  const view = mountPage();
  try {
    await flush();

    await clickButton(view.host, "Configure");
    await clickButton(view.host, "Test connection");

    expect(view.host.textContent).toContain("Forbidden");
    // Both cards are still rendered after the failed check.
    expect(view.host.textContent).toContain("Slack");
    expect(view.host.textContent).toContain("Zapier");
    expect(integrationsState.checkIntegration).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});
