// @vitest-environment happy-dom

import React from "react";
import { Monitor } from "lucide-react";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import {
  expectNoOpControlExpectations,
  type ControlExpectation,
} from "../utils/adminNoOpControlGate";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { AuditDetailsDrawer } from "../../../core/admin/ui/audit/AuditDetailsDrawer";
import { AuditFilters } from "../../../core/admin/ui/audit/AuditFilters";
import { AuditTable } from "../../../core/admin/ui/audit/AuditTable";
import type { AuditLog } from "../../../core/admin/ui/audit/types";
import { AccessLogDetailsDrawer } from "../../../core/admin/ui/security/AccessLogDetailsDrawer";
import { AccessLogsPage } from "../../../core/admin/ui/security/AccessLogsPage";
import { AccessLogsTable } from "../../../core/admin/ui/security/AccessLogsTable";
import type { AccessLogItem } from "../../../core/admin/ui/security/types";
import { LogoUploadCard } from "../../../core/admin/ui/settings/LogoUploadCard";
import { BrandingCard } from "../../../core/admin/ui/settings/BrandingCard";
import { EmailLogsDrawer } from "../../../core/admin/ui/settings/EmailLogsDrawer";
import { LoginAlertsPage } from "../../../core/admin/ui/settings/LoginAlertsPage";
import { SessionsPage } from "../../../core/admin/ui/settings/SessionsPage";
import { StorageSettingsPage } from "../../../core/admin/ui/settings/StorageSettingsPage";
import { UserDetailsDrawer } from "../../../core/admin/ui/users/UserDetailsDrawer";
import { UserFilters } from "../../../core/admin/ui/users/UserFilters";
import { UserList } from "../../../core/admin/ui/users/UserList";

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
    asChild: _asChild,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    asChild?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" disabled={disabled} {...props}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuRadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuRadioItem: ({
    children,
    disabled,
    asChild: _asChild,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    asChild?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" disabled={disabled} {...props}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/ui/select", () => {
  const SelectContext = React.createContext(false);

  return {
    Select: ({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) => (
      <SelectContext.Provider value={disabled}>
        <div data-disabled={disabled ? "" : undefined}>{children}</div>
      </SelectContext.Provider>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({
      children,
      disabled,
      ...props
    }: {
      children: React.ReactNode;
      disabled?: boolean;
      [key: string]: unknown;
    }) => (
      <button type="button" disabled={disabled} {...props}>
        {children}
      </button>
    ),
    SelectTrigger: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => {
      const disabled = React.useContext(SelectContext);
      return (
        <button type="button" disabled={disabled} {...props}>
          {children}
        </button>
      );
    },
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  };
});

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open = true }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({
    children,
    asChild: _asChild,
    showCloseButton: _showCloseButton,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    showCloseButton?: boolean;
    [key: string]: unknown;
  }) => (
    <div role="dialog" {...props}>
      {children}
    </div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({ disabled, ...props }: { disabled?: boolean; [key: string]: unknown }) => (
    <input type="range" disabled={disabled} {...props} />
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ disabled, ...props }: { disabled?: boolean; [key: string]: unknown }) => (
    <button type="button" role="switch" disabled={disabled} {...props} />
  ),
}));

const asDocument = (node: React.ReactNode) => {
  const container = document.createElement("div");
  container.innerHTML = renderToString(node);
  return container;
};

const adminDocument = (node: React.ReactNode) => {
  const container = document.createElement("div");
  container.innerHTML = renderAdminUi(node);
  return container;
};

const auditLog: AuditLog = {
  id: "log-1",
  event: "User login",
  category: "authentication",
  actor: { name: "Ada Lovelace", role: "Admin", type: "user" },
  resource: "/admin",
  resourceLabel: "Admin",
  ipAddress: "192.168.1.1",
  createdAt: "2026-06-01T12:00:00.000Z",
  timestamp: "2 mins ago",
  timestampLabel: "2026-06-01 12:00",
  status: "success",
  severity: "info",
  requestId: "req-1",
  description: "Successful login.",
  payload: { action: "login" },
};

const accessLog: AccessLogItem = {
  id: "access-1",
  user: { name: "Ada Lovelace", detail: "ada@example.test" },
  ipAddress: "192.168.1.1",
  method: "GET",
  path: "/admin",
  statusCode: 200,
  device: { label: "Chrome / macOS", icon: Monitor },
  timestamp: { date: "Jun 1", time: "12:00" },
  status: "success",
};

const user = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.test",
  roleIds: ["admin"],
  status: "active" as const,
  lastActive: "Just now",
  mfaEnabled: true,
};

const roles = [{ id: "admin", name: "Admin", permissions: ["*"] }];

test("Users report no-op controls are disabled with explicit reasons", () => {
  const root = asDocument(
    <div>
      <UserFilters
        query=""
        roleFilter="all"
        statusFilter="any"
        roles={roles}
        onQueryChange={() => undefined}
        onRoleChange={() => undefined}
        onStatusChange={() => undefined}
      />
      <UserDetailsDrawer
        user={user}
        roles={roles}
        onEditUser={() => undefined}
        onResetPassword={() => undefined}
      />
      <UserList
        items={[user]}
        roles={roles}
        onSelect={() => undefined}
        onEdit={() => undefined}
        onToggleStatus={() => undefined}
        onResetPassword={() => undefined}
        onDelete={() => undefined}
      />
    </div>
  );

  expectNoOpControlExpectations(root, [
    {
      area: "Users",
      controlId: "users-advanced-filters",
      expected: "disabled",
      reasonPattern: /Advanced user filters.*unavailable/,
      report: "REPORT_ADMIN_USERS.md",
    },
    {
      area: "Users",
      controlId: "users-notification-weekly-summary",
      expected: "disabled",
      reasonPattern: /Notification preferences.*read-only/,
      report: "REPORT_ADMIN_USERS.md",
    },
    {
      area: "Users",
      controlId: "users-notification-security-alerts",
      expected: "disabled",
      reasonPattern: /Notification preferences.*read-only/,
      report: "REPORT_ADMIN_USERS.md",
    },
  ]);
});

test("Audit Logs report no-op controls are disabled with explicit reasons", () => {
  const root = asDocument(
    <div>
      <AuditFilters
        query=""
        dateRange="last-7-days"
        eventType="all"
        severity="all"
        onQueryChange={() => undefined}
        onDateRangeChange={() => undefined}
        onEventTypeChange={() => undefined}
        onSeverityChange={() => undefined}
      />
      <AuditTable logs={[auditLog]} onSelect={() => undefined} />
      <AuditDetailsDrawer log={auditLog} open onOpenChange={() => undefined} />
    </div>
  );

  expectNoOpControlExpectations(root, [
    {
      area: "Audit Logs",
      controlId: "audit-copy-json-menu",
      expected: "hidden",
      report: "REPORT_ADMIN_AUDIT_LOGS.md",
    },
    {
      area: "Audit Logs",
      controlId: "audit-export-entry",
      expected: "disabled",
      reasonPattern: /Single-entry export.*page export/,
      report: "REPORT_ADMIN_AUDIT_LOGS.md",
    },
    {
      area: "Audit Logs",
      controlId: "audit-copy-json-drawer",
      expected: "hidden",
      report: "REPORT_ADMIN_AUDIT_LOGS.md",
    },
    {
      area: "Audit Logs",
      controlId: "audit-share-log",
      expected: "disabled",
      reasonPattern: /Share Log.*unavailable/,
      report: "REPORT_ADMIN_AUDIT_LOGS.md",
    },
    {
      area: "Audit Logs",
      controlId: "audit-report-log",
      expected: "disabled",
      reasonPattern: /Report.*unavailable/,
      report: "REPORT_ADMIN_AUDIT_LOGS.md",
    },
    {
      area: "Audit Logs",
      controlId: "audit-next-page",
      expected: "hidden",
      report: "REPORT_ADMIN_AUDIT_LOGS.md",
    },
  ]);
});

test("Access Logs report no-op controls are disabled with explicit reasons", () => {
  const root = adminDocument(
    <div>
      <AccessLogsPage />
      <AccessLogsTable logs={[accessLog]} />
      <AccessLogDetailsDrawer log={accessLog} open onOpenChange={() => undefined} />
    </div>
  );

  expectNoOpControlExpectations(root, [
    {
      area: "Access Logs",
      controlId: "access-advanced-filters",
      expected: "disabled",
      reasonPattern: /Advanced access log filters.*not wired yet/,
      report: "REPORT_ADMIN_ACCESS_LOGS.md",
    },
    {
      area: "Access Logs",
      controlId: "access-custom-range",
      expected: "disabled",
      reasonPattern: /Custom date range.*TASK-358-01/,
      report: "REPORT_ADMIN_ACCESS_LOGS.md",
    },
    {
      area: "Access Logs",
      controlId: "access-next-page",
      expected: "disabled",
      reasonPattern: /Server pagination.*TASK-358-01/,
      report: "REPORT_ADMIN_ACCESS_LOGS.md",
    },
    {
      area: "Access Logs",
      controlId: "access-view-full-session",
      expected: "disabled",
      reasonPattern: /Full session details.*TASK-358-02/,
      report: "REPORT_ADMIN_ACCESS_LOGS.md",
    },
    {
      area: "Access Logs",
      controlId: "access-revoke-access",
      expected: "disabled",
      reasonPattern: /Revoke access.*TASK-358-02/,
      report: "REPORT_ADMIN_ACCESS_LOGS.md",
    },
  ]);
});

test("Settings report no-op controls are disabled or explicitly unavailable", () => {
  const root = adminDocument(
    <div>
      <LogoUploadCard />
      <BrandingCard siteName="Coderso" siteLocale="en" />
      <StorageSettingsPage />
      <EmailLogsDrawer open onOpenChange={() => undefined} logs={[]} />
      <SessionsPage />
      <LoginAlertsPage />
    </div>
  );

  const expectations: ControlExpectation[] = [
    {
      area: "Settings",
      controlId: "settings-logo-upload",
      expected: "disabled",
      reasonPattern: /Brand asset uploads.*TASK-359-04/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-favicon-upload",
      expected: "disabled",
      reasonPattern: /Brand asset uploads.*TASK-359-04/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-favicon-remove",
      expected: "disabled",
      reasonPattern: /Brand asset uploads.*TASK-359-04/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-timezone",
      expected: "disabled",
      reasonPattern: /Timezone.*TASK-359-04/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-storage-test-connection",
      expected: "disabled",
      reasonPattern: /Storage connection testing.*TASK-359-06/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-email-export-logs",
      expected: "disabled",
      reasonPattern: /Delivery log export.*TASK-359-06/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-sessions-change-password",
      expected: "disabled",
      reasonPattern: /Account security links.*TASK-359-07/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-sessions-security-settings",
      expected: "disabled",
      reasonPattern: /Account security links.*TASK-359-07/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-login-alerts-brute-force-threshold",
      expected: "disabled",
      reasonPattern: /Advanced login alert.*TASK-359-07/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-login-alerts-admin-only",
      expected: "disabled",
      reasonPattern: /Advanced login alert.*TASK-359-07/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-login-alerts-custom-recipients",
      expected: "disabled",
      reasonPattern: /Advanced login alert.*TASK-359-07/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-login-alerts-email-channel",
      expected: "disabled",
      reasonPattern: /Advanced login alert.*TASK-359-07/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-login-alerts-webhook-channel",
      expected: "disabled",
      reasonPattern: /Advanced login alert.*TASK-359-07/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-login-alerts-sticky-discard",
      expected: "disabled",
      reasonPattern: /Advanced login alert.*TASK-359-07/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
    {
      area: "Settings",
      controlId: "settings-login-alerts-sticky-save",
      expected: "disabled",
      reasonPattern: /Advanced login alert.*TASK-359-07/,
      report: "REPORT_ADMIN_SETTINGS.md",
    },
  ];

  expectNoOpControlExpectations(root, expectations);
});
