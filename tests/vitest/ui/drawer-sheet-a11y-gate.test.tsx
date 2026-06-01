// @vitest-environment happy-dom

import React from "react";
import { Monitor } from "lucide-react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { expectNoRadixDialogA11yWarnings, getDialogTextByAttr } from "../utils/dialogA11y";
import { AuditDetailsDrawer } from "../../../core/admin/ui/audit/AuditDetailsDrawer";
import type { AuditLog } from "../../../core/admin/ui/audit/types";
import { AccessLogDetailsDrawer } from "../../../core/admin/ui/security/AccessLogDetailsDrawer";
import type { AccessLogItem } from "../../../core/admin/ui/security/types";
import { EmailLogsDrawer } from "../../../core/admin/ui/settings/EmailLogsDrawer";
import { IntegrationDrawer } from "../../../core/admin/ui/settings/IntegrationDrawer";
import { IpAllowlistDrawer } from "../../../core/admin/ui/settings/IpAllowlistDrawer";
import { WebhookDrawer } from "../../../core/admin/ui/settings/WebhookDrawer";

const listAdminRoles = vi.fn();
const createAdminRole = vi.fn();
const updateAdminRole = vi.fn();
const deleteAdminRole = vi.fn();
const listPermissionCatalog = vi.fn();

const listAdminUsers = vi.fn();
const createAdminUser = vi.fn();
const updateAdminUser = vi.fn();
const replaceAdminUserRoles = vi.fn();
const enableAdminUser = vi.fn();
const disableAdminUser = vi.fn();
const deleteAdminUser = vi.fn();

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/adminRolesClient", () => ({
  listAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  listPermissionCatalog,
}));

vi.mock("@/services/adminUsersClient", () => ({
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  replaceAdminUserRoles,
  enableAdminUser,
  disableAdminUser,
  deleteAdminUser,
}));

vi.mock("@/ui/layouts/SplitShell", () => ({
  SplitShell: ({
    children,
    rightPanel,
  }: {
    children: React.ReactNode;
    rightPanel?: React.ReactNode;
  }) => (
    <div>
      <aside>{rightPanel}</aside>
      {children}
    </div>
  ),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const installMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches,
      media: "(min-width: 1024px)",
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
};

const expectOpenDialogSemantics = async (
  node: React.ReactNode,
  expectedTitle: string,
  expectedDescription: string
) => {
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const view = mount(node);

  try {
    await flushEffects();
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(getDialogTextByAttr(dialog!, "aria-labelledby")).toContain(expectedTitle);
    expect(getDialogTextByAttr(dialog!, "aria-describedby")).toContain(expectedDescription);
    expectNoRadixDialogA11yWarnings(consoleWarn.mock.calls, consoleError.mock.calls);
  } finally {
    view.cleanup();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  }
};

const auditLog: AuditLog = {
  id: "log_test_1",
  event: "Updated Article",
  category: "content",
  actor: {
    name: "Sarah Jenks",
    role: "Admin",
    type: "user",
  },
  resource: "/api/v1/posts/302",
  resourceLabel: "Article #302",
  ipAddress: "192.168.1.45",
  timestamp: "2 mins ago",
  timestampLabel: "Oct 24, 14:22:10",
  status: "success",
  severity: "info",
  requestId: "req_abc123",
  description: "Article metadata updated and published.",
  payload: {
    action: "UPDATE",
    entity: "post",
  },
};

const accessLog: AccessLogItem = {
  id: "log-1",
  user: { name: "Admin", detail: "admin@coderso.io" },
  ipAddress: "192.168.1.1",
  device: { label: "Chrome / macOS", icon: Monitor },
  timestamp: { date: "Jan 28", time: "09:00" },
  status: "success",
  method: "GET",
  path: "/admin",
  statusCode: 200,
};

const integration = {
  id: "slack",
  name: "Slack",
  status: "connected" as const,
  description: "Team notifications",
  scopes: ["notifications:send"],
  fields: [
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "secret" as const,
      required: true,
      configured: true,
      value: null,
    },
  ],
};

beforeEach(() => {
  installMatchMedia(false);
  window.history.replaceState({}, "", "/admin/users?user=user-1");
  vi.clearAllMocks();
  listAdminUsers.mockResolvedValue([
    {
      id: "user-1",
      name: "Alice Admin",
      email: "alice@example.com",
      roleIds: ["admin"],
      status: "active",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
      lastLoginAt: "2026-03-01T10:30:00.000Z",
    },
  ]);
  listAdminRoles.mockResolvedValue([
    {
      id: "admin",
      name: "Admin",
      description: "Full access",
      permissions: ["*"],
      system: true,
    },
  ]);
  listPermissionCatalog.mockResolvedValue([]);
});

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/admin/users");
  vi.restoreAllMocks();
});

test("UsersRolesPage mobile user details sheet binds a title and description", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  await expectOpenDialogSemantics(
    <UsersRolesPage />,
    "User details",
    "Review the selected user's roles, permissions, and account activity."
  );
});

test("AuditDetailsDrawer binds title and description in selected and empty states", async () => {
  await expectOpenDialogSemantics(
    <AuditDetailsDrawer log={auditLog} open onOpenChange={() => undefined} />,
    "Event Details",
    "Review the selected audit event metadata and payload."
  );

  await expectOpenDialogSemantics(
    <AuditDetailsDrawer log={null} open onOpenChange={() => undefined} />,
    "Event Details",
    "Select an audit log to review details."
  );
});

test("AccessLogDetailsDrawer binds title and description in selected and empty states", async () => {
  await expectOpenDialogSemantics(
    <AccessLogDetailsDrawer log={accessLog} open onOpenChange={() => undefined} />,
    "Access Log Details",
    "admin@coderso.io"
  );

  await expectOpenDialogSemantics(
    <AccessLogDetailsDrawer log={null} open onOpenChange={() => undefined} />,
    "Access Log Details",
    "Select a log to review details."
  );
});

test("Settings drawers bind titles and descriptions without Radix warnings", async () => {
  await expectOpenDialogSemantics(
    <IpAllowlistDrawer defaultOpen onSubmit={() => undefined} />,
    "Add New IP Range",
    "Restrict admin access by CIDR."
  );

  await expectOpenDialogSemantics(
    <EmailLogsDrawer open onOpenChange={() => undefined} logs={[]} />,
    "Delivery Logs",
    "Recent SMTP activity and delivery status."
  );

  await expectOpenDialogSemantics(
    <EmailLogsDrawer open onOpenChange={() => undefined} logs={[]} isLoading />,
    "Delivery Logs",
    "Recent SMTP activity and delivery status."
  );

  await expectOpenDialogSemantics(
    <EmailLogsDrawer open onOpenChange={() => undefined} logs={[]} error="SMTP unavailable" />,
    "Delivery Logs",
    "Recent SMTP activity and delivery status."
  );

  await expectOpenDialogSemantics(
    <IntegrationDrawer open onOpenChange={() => undefined} integration={integration} />,
    "Slack",
    "Team notifications"
  );

  await expectOpenDialogSemantics(
    <IntegrationDrawer open onOpenChange={() => undefined} integration={null} />,
    "Integration",
    "Configure connection settings."
  );

  await expectOpenDialogSemantics(
    <WebhookDrawer
      open
      onOpenChange={() => undefined}
      mode="create"
      webhook={null}
      onSave={() => undefined}
    />,
    "Create New Webhook",
    "Configure the endpoint, signing secret, and event triggers for this webhook."
  );

  await expectOpenDialogSemantics(
    <WebhookDrawer
      open
      onOpenChange={() => undefined}
      mode="edit"
      webhook={{
        id: "webhook-1",
        name: "Deploy Hook",
        url: "https://example.com/webhook",
        events: ["entry.created"],
        enabled: true,
      }}
      onSave={() => undefined}
    />,
    "Edit Webhook",
    "Update the endpoint, signing secret, and event triggers for this webhook."
  );
});
