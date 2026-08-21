// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, vi } from "vitest";

const listAdminRoles = vi.fn();
const createAdminRole = vi.fn();
const updateAdminRole = vi.fn();
const deleteAdminRole = vi.fn();
const listPermissionCatalog = vi.fn();

const listAdminUsers = vi.fn();
const createAdminUser = vi.fn();
const updateAdminUser = vi.fn();
const replaceAdminUserRoles = vi.fn();
const inviteUserWithSetPassword = vi.fn();
const requestAdminPasswordReset = vi.fn();
const enableAdminUser = vi.fn();
const disableAdminUser = vi.fn();
const deleteAdminUser = vi.fn();

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
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div
      data-testid="details-sheet"
      data-open={String(Boolean(open))}
      data-has-open-change={String(Boolean(onOpenChange))}
    >
      {children}
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

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
  inviteUserWithSetPassword,
  requestAdminPasswordReset,
  enableAdminUser,
  disableAdminUser,
  deleteAdminUser,
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    confirmLabel,
    targetLabel,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title?: string;
    confirmLabel?: string;
    targetLabel?: string;
    onConfirm?: () => void | Promise<void>;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="confirm-action-dialog">
        <div>{title}</div>
        <div data-testid="confirm-target">{targetLabel}</div>
        <button
          type="button"
          onClick={() => {
            void Promise.resolve(onConfirm?.())
              .then(() => onOpenChange?.(false))
              .catch(() => undefined);
          }}
        >
          {confirmLabel ?? "Confirm"}
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/users/UserFilters", () => ({
  UserFilters: ({
    query,
    roleFilter,
    statusFilter,
    canReadRoles,
    roleFilterUnavailableReason,
    onQueryChange,
    onRoleChange,
    onStatusChange,
  }: {
    query: string;
    roleFilter: string;
    statusFilter: string;
    canReadRoles?: boolean;
    roleFilterUnavailableReason?: string;
    onQueryChange: (value: string) => void;
    onRoleChange: (value: string) => void;
    onStatusChange: (value: string) => void;
  }) => (
    <div>
      <div data-testid="filters-state">{`${query}|${roleFilter}|${statusFilter}`}</div>
      <div data-testid="filters-can-read-roles">{String(Boolean(canReadRoles))}</div>
      {canReadRoles ? null : (
        <div data-testid="role-filter-unavailable">{roleFilterUnavailableReason}</div>
      )}
      <button type="button" onClick={() => onQueryChange("bob")}>
        filter-query-bob
      </button>
      {canReadRoles ? (
        <button type="button" onClick={() => onRoleChange("editor")}>
          filter-role-editor
        </button>
      ) : null}
      <button type="button" onClick={() => onStatusChange("inactive")}>
        filter-status-inactive
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/users/UserList", () => ({
  UserList: ({
    items,
    selectedId,
    protectedIds,
    canManageUsers,
    canEditUsers,
    canManageUserLifecycle,
    canResetPassword,
    roleDetailsUnavailableReason,
    onSelect,
    onViewProfile,
    onEdit,
    onToggleStatus,
    onResetPassword,
    onDelete,
  }: {
    items: Array<{
      id: string;
      name: string;
      email: string;
      status: "active" | "inactive" | "pending";
    }>;
    selectedId?: string;
    protectedIds?: string[];
    canManageUsers?: boolean;
    canEditUsers?: boolean;
    canManageUserLifecycle?: boolean;
    canResetPassword?: boolean;
    roleDetailsUnavailableReason?: string;
    onSelect: (id: string) => void;
    onViewProfile?: (user: {
      id: string;
      name: string;
      email: string;
      status: "active" | "inactive" | "pending";
    }) => void;
    onEdit: (user: {
      id: string;
      name: string;
      email: string;
      status: "active" | "inactive" | "pending";
    }) => void;
    onToggleStatus: (user: {
      id: string;
      name: string;
      email: string;
      status: "active" | "inactive" | "pending";
    }) => void;
    onResetPassword: (user: {
      id: string;
      name: string;
      email: string;
      status: "active" | "inactive" | "pending";
    }) => void;
    onDelete: (user: {
      id: string;
      name: string;
      email: string;
      status: "active" | "inactive" | "pending";
    }) => void;
  }) => (
    <div>
      <div data-testid="user-list-items">{items.map((item) => item.name).join("|")}</div>
      <div data-testid="user-list-selected">{selectedId ?? ""}</div>
      <div data-testid="user-list-protected">{(protectedIds ?? []).join("|")}</div>
      <div data-testid="user-list-can-manage">{String(Boolean(canManageUsers))}</div>
      <div data-testid="user-list-can-edit">{String(Boolean(canEditUsers))}</div>
      <div data-testid="user-list-can-lifecycle">{String(Boolean(canManageUserLifecycle))}</div>
      <div data-testid="user-list-can-reset">{String(Boolean(canResetPassword))}</div>
      <div data-testid="user-list-role-details-reason">{roleDetailsUnavailableReason ?? ""}</div>
      <button type="button" onClick={() => items[0] && onSelect(items[0].id)}>
        select-first-user
      </button>
      <button type="button" onClick={() => items[0] && onViewProfile?.(items[0])}>
        view-first-user
      </button>
      <button type="button" disabled={!canEditUsers} onClick={() => items[0] && onEdit(items[0])}>
        edit-first-user
      </button>
      <button
        type="button"
        disabled={!canManageUserLifecycle}
        onClick={() => items[0] && onToggleStatus(items[0])}
      >
        toggle-first-user
      </button>
      <button
        type="button"
        disabled={!canResetPassword}
        onClick={() => items[0] && onResetPassword(items[0])}
      >
        reset-first-user
      </button>
      <button
        type="button"
        disabled={!canManageUserLifecycle}
        onClick={() => items[0] && onDelete(items[0])}
      >
        delete-first-user
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/roles/RoleList", () => ({
  RoleList: ({
    roles,
    selectedId,
    canManageRoles,
    onSelect,
    onEdit,
    onDuplicate,
    onDelete,
  }: {
    roles: Array<{
      id: string;
      name: string;
      description?: string;
      permissions: string[];
      system?: boolean;
    }>;
    selectedId?: string;
    canManageRoles?: boolean;
    onSelect: (id: string) => void;
    onEdit: (role: {
      id: string;
      name: string;
      description?: string;
      permissions: string[];
      system?: boolean;
    }) => void;
    onDuplicate: (role: {
      id: string;
      name: string;
      description?: string;
      permissions: string[];
      system?: boolean;
    }) => void;
    onDelete: (role: {
      id: string;
      name: string;
      description?: string;
      permissions: string[];
      system?: boolean;
    }) => void;
  }) => (
    <div>
      <div data-testid="role-list-items">{roles.map((role) => role.name).join("|")}</div>
      <div data-testid="role-list-selected">{selectedId ?? ""}</div>
      <div data-testid="role-list-can-manage">{String(Boolean(canManageRoles))}</div>
      <button type="button" onClick={() => roles[0] && onSelect(roles[0].id)}>
        select-first-role
      </button>
      <button type="button" onClick={() => roles[0] && onEdit(roles[0])}>
        edit-first-role
      </button>
      <button type="button" onClick={() => roles[0] && onDuplicate(roles[0])}>
        duplicate-first-role
      </button>
      <button type="button" onClick={() => roles[0] && onDelete(roles[0])}>
        delete-first-role
      </button>
      <button type="button" onClick={() => roles[1] && onDuplicate(roles[1])}>
        duplicate-second-role
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/users/UserDetailsDrawer", () => ({
  UserDetailsDrawer: ({
    user,
    canManageUsers,
    onEditUser,
    onResetPassword,
    onToggleStatus,
    onDeleteUser,
    canResetPassword,
    canManageUserLifecycle,
  }: {
    user?: { name?: string } | null;
    canManageUsers?: boolean;
    onEditUser?: () => void;
    onResetPassword?: () => void;
    onToggleStatus?: () => void;
    onDeleteUser?: () => void;
    canResetPassword?: boolean;
    canManageUserLifecycle?: boolean;
  }) => (
    <div>
      <div data-testid="details-user">{user?.name ?? "none"}</div>
      <div data-testid="details-can-manage">{String(Boolean(canManageUsers))}</div>
      <button type="button" onClick={onEditUser}>
        details-edit-user
      </button>
      <button type="button" disabled={!canResetPassword} onClick={onResetPassword}>
        details-reset-password
      </button>
      <button type="button" disabled={!canManageUserLifecycle} onClick={onToggleStatus}>
        details-toggle-user
      </button>
      <button type="button" disabled={!canManageUserLifecycle} onClick={onDeleteUser}>
        details-delete-user
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/users/UserEditor", () => ({
  UserEditor: ({
    open,
    user,
    onSave,
    onOpenChange,
  }: {
    open: boolean;
    user?: { name?: string } | null;
    onSave: (
      draft: {
        name: string;
        email: string;
        roleIds: string[];
        status: "active" | "inactive" | "pending";
      },
      mode: "create" | "edit"
    ) => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <div data-testid="user-editor-mode">{user ? "edit" : "create"}</div>
        <button
          type="button"
          onClick={() =>
            onSave(
              {
                name: user ? `${user.name} Updated` : "Created User",
                email: user ? "updated@example.com" : "created@example.com",
                roleIds: ["editor"],
                status: "active",
              },
              user ? "edit" : "create"
            )
          }
        >
          submit-user-editor
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-user-editor
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/users/InviteUserDialog", () => ({
  InviteUserDialog: ({
    open,
    onInvite,
    onOpenChange,
  }: {
    open: boolean;
    onInvite: (values: { name: string; email: string; roleId: string }) => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <button
          type="button"
          onClick={() =>
            onInvite({
              name: "Invited User",
              email: "invite@example.com",
              roleId: "editor",
            })
          }
        >
          submit-invite
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-invite
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/roles/RoleEditor", () => ({
  RoleEditor: ({
    open,
    role,
    onSave,
    onOpenChange,
  }: {
    open: boolean;
    role?: { name?: string } | null;
    onSave: (
      draft: {
        name: string;
        description: string;
        permissions: string[];
      },
      mode: "create" | "edit"
    ) => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <div data-testid="role-editor-mode">{role ? "edit" : "create"}</div>
        <button
          type="button"
          onClick={() =>
            onSave(
              {
                name: role ? `${role.name} Updated` : "New Role",
                description: role ? "Updated role" : "Created role",
                permissions: ["content.write"],
              },
              role ? "edit" : "create"
            )
          }
        >
          submit-role-editor
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-role-editor
        </button>
      </div>
    ) : null,
}));

vi.mock("@/ui/layouts/SplitShell", () => ({
  SplitShell: ({
    children,
    rightPanel,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    rightPanel?: React.ReactNode;
    breadcrumbs?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="breadcrumbs">
        {Array.isArray(breadcrumbs) ? breadcrumbs.join(" / ") : breadcrumbs}
      </div>
      <div data-testid="right-panel">{rightPanel}</div>
      {React.Children.toArray(children)}
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
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/SectionHeader", () => ({
  SectionHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div>
      <h2>{title}</h2>
      <div>{action}</div>
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
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
  return button;
};

const findButtonByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );

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

const adminRole = {
  id: "admin",
  name: "Admin",
  description: "Full access",
  permissions: ["*"],
  system: true,
};

const editorRole = {
  id: "editor",
  name: "Editor",
  description: "Content team",
  permissions: ["content.write"],
  system: false,
};

export const applyDefaultUsersRolesMockState = () => {
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
    {
      id: "user-2",
      name: "Bob Editor",
      email: "bob@example.com",
      roleIds: ["editor"],
      status: "inactive",
      createdAt: "2026-03-02T10:00:00.000Z",
      updatedAt: "2026-03-02T10:00:00.000Z",
      lastLoginAt: null,
    },
  ]);
  listAdminRoles.mockResolvedValue([editorRole, adminRole]);
  listPermissionCatalog.mockResolvedValue([]);
  createAdminUser.mockResolvedValue({ id: "user-3" });
  inviteUserWithSetPassword.mockResolvedValue({
    user: {
      id: "user-3",
      name: "Invited User",
      email: "invite@example.com",
      roleIds: ["editor"],
      status: "pending",
      createdAt: "2026-03-03T10:00:00.000Z",
      updatedAt: "2026-03-03T10:00:00.000Z",
      lastLoginAt: null,
    },
    setPassword: {
      delivery: "email",
      status: "sent",
      expiresAt: "2026-03-03T11:00:00.000Z",
    },
  });
  requestAdminPasswordReset.mockResolvedValue({
    delivery: "email",
    status: "sent",
    expiresAt: "2026-03-03T11:00:00.000Z",
  });
  createAdminRole.mockResolvedValue({ id: "role-3" });
  updateAdminRole.mockResolvedValue({ id: "editor" });
};
beforeEach(() => {
  installMatchMedia(true);
  window.history.replaceState({}, "", "/admin/users");

  vi.clearAllMocks();

  applyDefaultUsersRolesMockState();
});
afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/admin/users");
});

export {
  adminRole,
  clickByText,
  createAdminRole,
  createAdminUser,
  deleteAdminRole,
  deleteAdminUser,
  disableAdminUser,
  editorRole,
  enableAdminUser,
  findButtonByText,
  flush,
  installMatchMedia,
  inviteUserWithSetPassword,
  listAdminRoles,
  listAdminUsers,
  listPermissionCatalog,
  mount,
  replaceAdminUserRoles,
  requestAdminPasswordReset,
  updateAdminRole,
  updateAdminUser,
};
