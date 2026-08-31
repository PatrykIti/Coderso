// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import {
  clickByText,
  createAdminRole,
  createAdminUser,
  deleteAdminRole,
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  findButtonByText,
  flush,
  inviteUserWithSetPassword,
  listAdminRoles,
  listAdminUsers,
  listPermissionCatalog,
  mount,
  replaceAdminUserRoles,
  requestAdminPasswordReset,
  updateAdminRole,
  updateAdminUser,
} from "./usersRolesFixtures";

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
    clickByText(view.container, "Send reset email");
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
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "bob@example.com"
    );
    clickByText(view.container, "Delete user");
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
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "Editor"
    );
    clickByText(view.container, "Delete role");
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
      sourceRoleId: "editor",
      sourceRoleName: "Editor",
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

test("UsersRolesPage keeps destructive user cancel side-effect free", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    clickByText(view.container, "filter-query-bob");
    clickByText(view.container, "filter-role-editor");
    clickByText(view.container, "filter-status-inactive");

    clickByText(view.container, "delete-first-user");
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "bob@example.com"
    );
    clickByText(view.container, "Cancel");
    await flush();

    expect(deleteAdminUser).not.toHaveBeenCalled();

    clickByText(view.container, "delete-first-user");
    clickByText(view.container, "Delete user");
    await flush();

    expect(deleteAdminUser).toHaveBeenCalledTimes(1);
    expect(deleteAdminUser).toHaveBeenCalledWith("user-2");
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
    clickByText(view.container, "Send reset email");
    await flush();
    clickByText(view.container, "toggle-first-user");
    expect(disableAdminUser).not.toHaveBeenCalled();
    clickByText(view.container, "Deactivate user");
    await flush();
    clickByText(view.container, "delete-first-user");
    expect(deleteAdminUser).not.toHaveBeenCalled();
    clickByText(view.container, "Delete user");
    await flush();

    expect(requestAdminPasswordReset).toHaveBeenCalledWith("user-1");
    expect(disableAdminUser).toHaveBeenCalledWith("user-1");
    expect(deleteAdminUser).toHaveBeenCalledWith("user-1");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage confirms activation when role risk cannot be verified", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(<UsersRolesPage permissions={["users:read", "users:write"]} />);

  try {
    await flush();
    await flush();

    clickByText(view.container, "filter-status-inactive");
    expect(view.container.querySelector('[data-testid="user-list-items"]')?.textContent).toBe(
      "Bob Editor"
    );

    clickByText(view.container, "toggle-first-user");
    expect(enableAdminUser).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "bob@example.com"
    );

    clickByText(view.container, "Activate user");
    await flush();

    expect(enableAdminUser).toHaveBeenCalledWith("user-2");
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
    clickByText(view.container, "Deactivate user");
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
