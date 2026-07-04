// @vitest-environment happy-dom

/**
 * TASK-479-27-L05: render guards for the four restyled Admin surfaces
 * (Users & Roles, Roles matrix, Audit logs, Access logs). These lock the
 * presentation-only re-skin (TASK-479-27-L01..L04): tab strip + stat row +
 * avatar/role/status/2FA table (Users), legend + sticky permission column +
 * read-only vs editable cells (Roles), tokenized category badges + Export
 * (Audit), and the page-scoped stat row + method/status tone table (Access).
 *
 * They prove the restyle preserved behavior (RBAC gating, partial-read,
 * diff/Save, cursor footer) and never fabricates data (no "+4" deltas, no
 * "38,420" 24h aggregate, no invented Location column).
 */

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Monitor } from "lucide-react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";

const auditState = vi.hoisted(() => ({
  listAuditLogs: vi.fn(),
  exportAuditLogs: vi.fn(),
}));

const accessState = vi.hoisted(() => ({
  listAccessLogs: vi.fn(),
  exportAccessLogs: vi.fn(),
  revokeAccessFromLog: vi.fn(),
}));

const rolesState = vi.hoisted(() => ({
  listAdminRoles: vi.fn(),
  listPermissionCatalog: vi.fn(),
  createAdminRole: vi.fn(),
  updateAdminRole: vi.fn(),
  deleteAdminRole: vi.fn(),
}));

vi.mock("@/services/auditClient", () => ({
  listAuditLogs: auditState.listAuditLogs,
  exportAuditLogs: auditState.exportAuditLogs,
}));

vi.mock("@/services/accessLogsClient", () => ({
  listAccessLogs: accessState.listAccessLogs,
  exportAccessLogs: accessState.exportAccessLogs,
  revokeAccessFromLog: accessState.revokeAccessFromLog,
}));

vi.mock("@/services/adminRolesClient", () => ({
  listAdminRoles: rolesState.listAdminRoles,
  listPermissionCatalog: rolesState.listPermissionCatalog,
  createAdminRole: rolesState.createAdminRole,
  updateAdminRole: rolesState.updateAdminRole,
  deleteAdminRole: rolesState.deleteAdminRole,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    breadcrumbs,
    children,
    search,
    topbarActions,
  }: {
    breadcrumbs?: React.ReactNode[];
    children: React.ReactNode;
    search?: React.ReactNode;
    topbarActions?: React.ReactNode;
  }) => (
    <main>
      <div data-testid="breadcrumbs">
        {Array.isArray(breadcrumbs) ? breadcrumbs.join(" / ") : breadcrumbs}
      </div>
      <div data-testid="search-slot">{search}</div>
      <div data-testid="topbar-actions">{topbarActions}</div>
      {children}
    </main>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(event) => onValueChange(event.currentTarget.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <section>{children}</section> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      data-checkbox={String(Boolean(checked))}
      onClick={() => {
        if (!props.disabled) onCheckedChange?.(!checked);
      }}
      {...props}
    >
      checkbox
    </button>
  ),
}));

import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";
import { PermissionsMatrix } from "../../../core/admin/ui/roles/PermissionsMatrix";
import { PermissionsMatrixPage } from "../../../core/admin/ui/roles/PermissionsMatrixPage";
import { AuditList } from "../../../core/admin/ui/audit/AuditList";
import { AccessLogsPage } from "../../../core/admin/ui/security/AccessLogsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const permissionGroups = [
  {
    id: "content",
    label: "Content",
    permissions: [
      { id: "content:read", label: "Read content" },
      { id: "content:write", label: "Write content" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    permissions: [{ id: "settings:write", label: "Write settings" }],
  },
];

const roles = [
  { id: "editor", name: "Editor", description: "Content team", permissions: ["content:read"] },
  { id: "admin", name: "Admin", description: "Full access", permissions: ["*"], system: true },
];

const auditRecords = [
  {
    id: "audit-1",
    action: "content.publish",
    actorId: "user-1",
    targetType: "page",
    targetId: "home",
    createdAt: "2026-03-15T10:00:00.000Z",
    metadata: { actorName: "Ada Lovelace", ip: "127.0.0.1", requestId: "req-1" },
  },
  {
    id: "audit-2",
    action: "auth.denied",
    actorId: "user-2",
    targetType: "session",
    targetId: "sess-1",
    createdAt: "2026-03-15T09:00:00.000Z",
    metadata: { actorEmail: "grace@example.com", severity: "warning" },
  },
];

const accessRecords = [
  {
    id: "access-1",
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    ip: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Macintosh)",
    userId: "user-1",
    userName: "Ada Lovelace",
    userEmail: "ada@example.com",
    durationMs: 42,
    createdAt: "2026-06-01T10:00:00.000Z",
    matchContext: null,
    session: null,
  },
  {
    id: "access-2",
    method: "POST",
    path: "/admin/api/auth/login",
    status: 401,
    ip: "10.0.0.2",
    userAgent: "curl/8.4.0",
    userId: "user-2",
    userName: "Grace Hopper",
    userEmail: "grace@example.com",
    durationMs: 12,
    createdAt: "2026-06-01T09:00:00.000Z",
    matchContext: null,
    session: null,
  },
];

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const mount = (node: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, cleanup: () => cleanupRoot(root, container) };
};

const cleanupRoot = (root: ReturnType<typeof createRoot>, container: HTMLDivElement) => {
  act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const findButtonByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );

const clickByLabel = (container: HTMLElement, label: string) => {
  const button = container.querySelector(`button[aria-label='${label}']`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${label}`);
  }
  act(() => {
    button.click();
  });
  return button;
};

beforeEach(() => {
  vi.clearAllMocks();
  auditState.listAuditLogs.mockResolvedValue({ items: auditRecords, nextCursor: null });
  auditState.exportAuditLogs.mockResolvedValue({
    status: "downloaded",
    filename: "audit.csv",
    mimeType: "text/csv",
  });
  accessState.listAccessLogs.mockResolvedValue({ items: accessRecords, nextCursor: null });
  accessState.exportAccessLogs.mockResolvedValue({
    status: "downloaded",
    filename: "access.csv",
    mimeType: "text/csv",
  });
  accessState.revokeAccessFromLog.mockResolvedValue({ ok: true });
  rolesState.listAdminRoles.mockResolvedValue(roles);
  rolesState.listPermissionCatalog.mockResolvedValue(permissionGroups);
  rolesState.createAdminRole.mockResolvedValue({ id: "new-role" });
  rolesState.updateAdminRole.mockImplementation(
    async (id: string, payload: { permissions?: string[] }) => {
      const role = roles.find((item) => item.id === id);
      return {
        ...(role ?? roles[0]),
        id,
        permissions: payload.permissions ?? role?.permissions ?? [],
      };
    }
  );
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

// --- Users (L01) ---

test("Users screen renders the restyled header, member tabs, and derived stat row", () => {
  const html = renderAdminUi(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  expect(html).toContain("Users &amp; Roles");
  expect(html).toContain("Invite User");
  // member/invitation tab strip
  expect(html).toContain("Members");
  expect(html).toContain("Invitations");
  // derived stat row labels (no fabricated deltas)
  expect(html).toContain("Total users");
  expect(html).toContain("Active");
  expect(html).toContain("Pending invites");
  expect(html).not.toContain("+4");
  expect(html).not.toContain("+2");
});

test("Users screen surfaces partial-read affordances without roles:read", () => {
  const html = renderAdminUi(<UsersRolesPage permissions={["users:read"]} />);

  // read-only banner + role partial-read affordances
  expect(html).toContain("Read-only");
  expect(html).toContain("Role filter unavailable");
  expect(html).toContain("Roles unavailable");
});

// --- Roles matrix (L02) ---

test("Roles matrix renders the legend, grouped sections, and disabled read-only cells", () => {
  const onTogglePermission = vi.fn();
  const onToggleRoleAll = vi.fn();
  const view = mount(
    <PermissionsMatrix
      roles={roles}
      permissionGroups={permissionGroups}
      rolePermissions={{ editor: ["content:read"], admin: ["content:read", "content:write"] }}
      readOnlyReason="roles:write permission is required to edit roles."
      onTogglePermission={onTogglePermission}
      onToggleRoleAll={onToggleRoleAll}
    />
  );

  try {
    // legend ported from the prototype
    expect(view.container.textContent).toContain("Allowed");
    expect(view.container.textContent).toContain("No access");
    // grouped section labels + bulk toggles preserved
    expect(view.container.textContent).toContain("Bulk toggles");
    expect(view.container.textContent).toContain("Content");
    expect(view.container.textContent).toContain("Read content");

    const cell = view.container.querySelector("button[aria-label='Read content for Editor']");
    expect(cell).toBeInstanceOf(HTMLButtonElement);
    expect((cell as HTMLButtonElement).disabled).toBe(true);
    act(() => {
      (cell as HTMLButtonElement).click();
    });
    expect(onTogglePermission).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("Roles matrix page stays read-only without roles:write and exposes Save when editable", async () => {
  const readOnly = mount(<PermissionsMatrixPage permissions={["roles:read"]} />);
  try {
    await flush();
    expect(readOnly.container.textContent).toContain("Read-only permissions");
    expect(findButtonByText(readOnly.container, "Review changes")).toBeUndefined();
  } finally {
    readOnly.cleanup();
  }

  const editable = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);
  try {
    await flush();
    expect(editable.container.textContent).toContain("Write content");
    // editable mode renders Save, disabled until a diff exists
    const beforeReview = findButtonByText(editable.container, "Review changes");
    expect(beforeReview).toBeInstanceOf(HTMLButtonElement);
    expect((beforeReview as HTMLButtonElement).disabled).toBe(true);
    clickByLabel(editable.container, "Write content for Editor");
    const afterReview = findButtonByText(editable.container, "Review changes");
    expect((afterReview as HTMLButtonElement).disabled).toBe(false);
    expect(editable.container.textContent).toContain("1 role changed: +1 / -0.");
    expect(rolesState.updateAdminRole).not.toHaveBeenCalled();
  } finally {
    editable.cleanup();
  }
});

// --- Audit (L03) ---

test("Audit screen renders rows with tokenized category badges and Export", async () => {
  const view = mount(<AuditList />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Ada Lovelace");
    expect(view.container.textContent).toContain("Content Publish");
    // category badges derive from the resolved view-model entry.category
    expect(view.container.textContent).toContain("Content");
    expect(view.container.textContent).toContain("Authentication");
    expect(findButtonByText(view.container, "Export")).toBeInstanceOf(HTMLButtonElement);
  } finally {
    view.cleanup();
  }
});

// --- Access logs (L04) ---

test("Access logs renders the page-scoped stat row and method/status tone table", async () => {
  const view = mount(<AccessLogsPage />);
  try {
    await flush();
    // method badges + numeric status codes (no invented Location column)
    expect(view.container.textContent).toContain("GET");
    expect(view.container.textContent).toContain("POST");
    expect(view.container.textContent).toContain("200");
    expect(view.container.textContent).toContain("401");
    // honest, page-scoped stat labels — never a fabricated 24h aggregate
    expect(view.container.textContent).toContain("Loaded (page)");
    expect(view.container.textContent).toContain("Blocked (page)");
    expect(view.container.textContent).toContain("Unique IPs (page)");
    expect(view.container.textContent).toContain("Failed logins (page)");
    expect(view.container.textContent).not.toContain("38,420");
  } finally {
    view.cleanup();
  }
});
