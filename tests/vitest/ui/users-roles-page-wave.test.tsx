// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

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
    targetLabel,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title?: string;
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
            void Promise.resolve(onConfirm?.()).then(() => onOpenChange?.(false));
          }}
        >
          confirm-password-reset
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          cancel-password-reset
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
    items: Array<{ id: string; name: string }>;
    selectedId?: string;
    protectedIds?: string[];
    canManageUsers?: boolean;
    canEditUsers?: boolean;
    canManageUserLifecycle?: boolean;
    canResetPassword?: boolean;
    roleDetailsUnavailableReason?: string;
    onSelect: (id: string) => void;
    onViewProfile?: (user: { id: string; name: string }) => void;
    onEdit: (user: { id: string; name: string }) => void;
    onToggleStatus: (user: { id: string; name: string }) => void;
    onResetPassword: (user: { id: string; name: string }) => void;
    onDelete: (user: { id: string; name: string }) => void;
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
    roles: Array<{ id: string; name: string }>;
    selectedId?: string;
    canManageRoles?: boolean;
    onSelect: (id: string) => void;
    onEdit: (role: { id: string; name: string }) => void;
    onDuplicate: (role: { id: string; name: string }) => void;
    onDelete: (role: { id: string; name: string }) => void;
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
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/users/UserDetailsDrawer", () => ({
  UserDetailsDrawer: ({
    user,
    canManageUsers,
    onEditUser,
    onResetPassword,
    canResetPassword,
  }: {
    user?: { name?: string } | null;
    canManageUsers?: boolean;
    onEditUser?: () => void;
    onResetPassword?: () => void;
    canResetPassword?: boolean;
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
      <div data-testid="breadcrumbs">{breadcrumbs}</div>
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

beforeEach(() => {
  installMatchMedia(true);
  window.history.replaceState({}, "", "/admin/users");

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
});

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/admin/users");
});

test("UsersRolesPage orchestrates filters and user-role management flows", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    expect(view.container.textContent).toContain("Users & Roles");
    expect(view.container.querySelector('[data-testid="user-list-items"]')?.textContent).toContain(
      "Alice Admin|Bob Editor"
    );
    expect(view.container.querySelector('[data-testid="role-list-items"]')?.textContent).toContain(
      "Editor|Admin"
    );
    expect(view.container.querySelector('[data-testid="details-user"]')?.textContent).toContain(
      "Alice Admin"
    );

    clickByText(view.container, "filter-query-bob");
    clickByText(view.container, "filter-role-editor");
    clickByText(view.container, "filter-status-inactive");

    expect(view.container.querySelector('[data-testid="filters-state"]')?.textContent).toBe(
      "bob|editor|inactive"
    );
    expect(view.container.querySelector('[data-testid="user-list-items"]')?.textContent).toBe(
      "Bob Editor"
    );

    clickByText(view.container, "view-first-user");
    expect(view.container.querySelector('[data-testid="details-user"]')?.textContent).toContain(
      "Bob Editor"
    );

    clickByText(view.container, "reset-first-user");
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "bob@example.com"
    );
    clickByText(view.container, "confirm-password-reset");
    await flush();

    clickByText(view.container, "Invite User");
    clickByText(view.container, "submit-invite");
    await flush();

    clickByText(view.container, "edit-first-user");
    expect(view.container.querySelector('[data-testid="user-editor-mode"]')?.textContent).toBe(
      "edit"
    );
    clickByText(view.container, "submit-user-editor");
    await flush();

    clickByText(view.container, "toggle-first-user");
    await flush();

    clickByText(view.container, "delete-first-user");
    await flush();

    clickByText(view.container, "Create Role");
    clickByText(view.container, "submit-role-editor");
    await flush();

    clickByText(view.container, "edit-first-role");
    expect(view.container.querySelector('[data-testid="role-editor-mode"]')?.textContent).toBe(
      "edit"
    );
    clickByText(view.container, "submit-role-editor");
    await flush();

    clickByText(view.container, "duplicate-first-role");
    await flush();

    clickByText(view.container, "delete-first-role");
    await flush();

    expect(requestAdminPasswordReset).toHaveBeenCalledWith("user-2");
    expect(inviteUserWithSetPassword).toHaveBeenCalledWith({
      name: "Invited User",
      email: "invite@example.com",
      roleIds: ["editor"],
      sendSetPasswordInvite: true,
    });
    expect(createAdminUser).not.toHaveBeenCalled();
    expect(updateAdminUser).toHaveBeenCalledWith("user-2", {
      name: "Bob Editor Updated",
      email: "updated@example.com",
      status: "active",
    });
    expect(replaceAdminUserRoles).toHaveBeenCalledWith("user-2", ["editor"]);
    expect(enableAdminUser).toHaveBeenCalledWith("user-2");
    expect(deleteAdminUser).toHaveBeenCalledWith("user-2");

    expect(createAdminRole).toHaveBeenNthCalledWith(1, {
      name: "New Role",
      description: "Created role",
      permissions: ["content.write"],
    });
    expect(createAdminRole).toHaveBeenNthCalledWith(2, {
      name: "Editor copy",
      description: "Content team",
      permissions: ["content.write"],
    });
    expect(updateAdminRole).toHaveBeenCalledWith("editor", {
      name: "Editor Updated",
      description: "Updated role",
      permissions: ["content.write"],
    });
    expect(deleteAdminRole).toHaveBeenCalledWith("editor");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage supports users-read only mode without fetching roles", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(<UsersRolesPage permissions={["users:read"]} />);

  try {
    await flush();
    await flush();

    expect(listAdminUsers).toHaveBeenCalledTimes(1);
    expect(listAdminRoles).not.toHaveBeenCalled();
    expect(listPermissionCatalog).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Roles unavailable");
    expect(
      view.container.querySelector('[data-testid="filters-can-read-roles"]')?.textContent
    ).toBe("false");
    expect(
      view.container.querySelector('[data-testid="role-filter-unavailable"]')?.textContent
    ).toContain("roles:read");
    expect(
      view.container.querySelector('[data-testid="user-list-role-details-reason"]')?.textContent
    ).toContain("roles:read");
    expect(view.container.querySelector('[data-testid="details-can-manage"]')?.textContent).toBe(
      "false"
    );
    expect(view.container.querySelector('[data-testid="role-list-items"]')).toBeNull();
    expect(findButtonByText(view.container, "Create Role")).toBeUndefined();
    expect(findButtonByText(view.container, "Invite User")?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage separates user lifecycle writes from role-assignment writes", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(<UsersRolesPage permissions={["users:read", "users:write"]} />);

  try {
    await flush();
    await flush();

    expect(listAdminUsers).toHaveBeenCalledTimes(1);
    expect(listAdminRoles).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="user-list-can-edit"]')?.textContent).toBe(
      "false"
    );
    expect(
      view.container.querySelector('[data-testid="user-list-can-lifecycle"]')?.textContent
    ).toBe("true");
    expect(view.container.querySelector('[data-testid="user-list-can-reset"]')?.textContent).toBe(
      "true"
    );

    expect(findButtonByText(view.container, "edit-first-user")?.disabled).toBe(true);
    expect(findButtonByText(view.container, "toggle-first-user")?.disabled).toBe(false);
    expect(findButtonByText(view.container, "reset-first-user")?.disabled).toBe(false);
    expect(findButtonByText(view.container, "delete-first-user")?.disabled).toBe(false);

    clickByText(view.container, "reset-first-user");
    clickByText(view.container, "confirm-password-reset");
    await flush();
    clickByText(view.container, "toggle-first-user");
    await flush();
    clickByText(view.container, "delete-first-user");
    await flush();

    expect(requestAdminPasswordReset).toHaveBeenCalledWith("user-1");
    expect(disableAdminUser).toHaveBeenCalledWith("user-1");
    expect(deleteAdminUser).toHaveBeenCalledWith("user-1");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage supports roles-read only mode without fetching users", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(<UsersRolesPage permissions={["roles:read"]} />);

  try {
    await flush();
    await flush();

    expect(listAdminUsers).not.toHaveBeenCalled();
    expect(listAdminRoles).toHaveBeenCalledTimes(1);
    expect(listPermissionCatalog).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("User list unavailable");
    expect(view.container.querySelector('[data-testid="user-list-items"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="role-list-items"]')?.textContent).toContain(
      "Editor|Admin"
    );
    expect(findButtonByText(view.container, "Invite User")).toBeUndefined();
    expect(findButtonByText(view.container, "Create Role")?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage denies access before fetching when no read permission is present", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(<UsersRolesPage permissions={[]} />);

  try {
    await flush();

    expect(listAdminUsers).not.toHaveBeenCalled();
    expect(listAdminRoles).not.toHaveBeenCalled();
    expect(listPermissionCatalog).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Access denied");
    expect(view.container.textContent).toContain("users:read or roles:read");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage refreshes permissions after stale write 403s", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { AdminAuthProvider } = await import("../../../core/admin/ui/contexts/AdminAuthContext");
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const error = new ApiClientError("forbidden", "Forbidden", 403);
  error.sharedFailureKind = "permission_denied";
  disableAdminUser.mockRejectedValueOnce(error);
  const refreshPermissions = vi.fn(async () => undefined);

  const view = mount(
    <AdminAuthProvider
      refreshPermissions={refreshPermissions}
      user={{
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        permissionSnapshot: {
          permissions: ["users:read", "users:write", "roles:read", "roles:write"],
          roles: [{ id: "admin", slug: "admin", name: "Admin" }],
        },
      }}
    >
      <UsersRolesPage />
    </AdminAuthProvider>
  );

  try {
    await flush();
    await flush();

    clickByText(view.container, "toggle-first-user");
    await flush();

    expect(disableAdminUser).toHaveBeenCalledWith("user-1");
    expect(refreshPermissions).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain(
      "Your permissions changed. Refreshing access before enabling actions."
    );
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage respects read-only mode, URL-selected mobile details, and load failures", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  installMatchMedia(false);
  window.history.replaceState({}, "", "/admin/users?user=user-2");
  listAdminUsers.mockRejectedValueOnce(new Error("boom"));

  const view = mount(<UsersRolesPage permissions={["users:read", "roles:read"]} />);

  try {
    await flush();
    await flush();

    expect(view.container.textContent).toContain("Read-only access");
    expect(view.container.textContent).toContain("Read-only permissions");
    expect(view.container.textContent).toContain("Users & Roles unavailable");
    expect(view.container.textContent).toContain("Failed to load users and roles.");
    expect(view.container.querySelector('[data-testid="user-list-can-manage"]')?.textContent).toBe(
      "false"
    );
    expect(view.container.querySelector('[data-testid="role-list-can-manage"]')?.textContent).toBe(
      "false"
    );
    expect(
      view.container.querySelector('[data-testid="details-sheet"]')?.getAttribute("data-open")
    ).toBe("true");

    const inviteButton = clickByText(view.container, "Invite User");
    const createRoleButton = clickByText(view.container, "Create Role");
    expect(inviteButton.disabled).toBe(true);
    expect(createRoleButton.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});
