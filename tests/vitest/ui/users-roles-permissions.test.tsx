// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import {
  clickByText,
  createAdminRole,
  deleteAdminUser,
  disableAdminUser,
  findButtonByText,
  flush,
  installMatchMedia,
  listAdminRoles,
  listAdminUsers,
  listPermissionCatalog,
  mount,
  requestAdminPasswordReset,
  updateAdminUser,
} from "./usersRolesFixtures";

test("UsersRolesPage confirms only high-risk role duplication", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    clickByText(view.container, "duplicate-first-role");
    await flush();

    expect(createAdminRole).toHaveBeenCalledTimes(1);
    expect(createAdminRole).toHaveBeenCalledWith({
      name: "Editor copy",
      description: "Content team",
      permissions: ["content.write"],
      sourceRoleId: "editor",
      sourceRoleName: "Editor",
    });

    clickByText(view.container, "duplicate-second-role");
    expect(createAdminRole).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "Admin"
    );
    clickByText(view.container, "Cancel");
    await flush();
    expect(createAdminRole).toHaveBeenCalledTimes(1);

    clickByText(view.container, "duplicate-second-role");
    clickByText(view.container, "Duplicate role");
    await flush();

    expect(createAdminRole).toHaveBeenCalledTimes(2);
    expect(createAdminRole).toHaveBeenLastCalledWith({
      name: "Admin copy",
      description: "Full access",
      permissions: ["*"],
      sourceRoleId: "admin",
      sourceRoleName: "Admin",
    });
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
    expect(view.container.querySelector("[data-testid='breadcrumbs']")?.textContent).toBe(
      "Admin / Users & Roles"
    );
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

test("UsersRolesPage routes every details action through the mobile sheet drawer", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  installMatchMedia(false);
  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  // Both the right panel and the mobile sheet render the same drawer controls;
  // the sheet instance is the second occurrence of each labelled button.
  const sheetButtons = (text: string) => {
    const buttons = Array.from(view.container.querySelectorAll("button")).filter((candidate) =>
      candidate.textContent?.includes(text)
    );
    if (buttons.length < 2) {
      throw new Error(`Expected sheet duplicate for ${text}`);
    }
    return buttons[buttons.length - 1];
  };

  try {
    await flush();
    await flush();

    clickByText(view.container, "select-first-user");
    expect(
      view.container.querySelector('[data-testid="details-sheet"]')?.getAttribute("data-open")
    ).toBe("true");

    React.act(() => {
      sheetButtons("details-edit-user").click();
    });
    expect(view.container.querySelector('[data-testid="user-editor-mode"]')?.textContent).toBe(
      "edit"
    );
    clickByText(view.container, "close-user-editor");
    await flush();
    expect(updateAdminUser).not.toHaveBeenCalled();

    React.act(() => {
      sheetButtons("details-reset-password").click();
    });
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "alice@example.com"
    );
    clickByText(view.container, "Send reset email");
    await flush();
    expect(requestAdminPasswordReset).toHaveBeenCalledWith("user-1");

    React.act(() => {
      sheetButtons("details-toggle-user").click();
    });
    expect(view.container.textContent).toContain("Deactivate user?");
    clickByText(view.container, "Cancel");
    expect(disableAdminUser).not.toHaveBeenCalled();

    // Deleting the protected last admin from the sheet stays side-effect free.
    React.act(() => {
      sheetButtons("details-delete-user").click();
    });
    expect(view.container.querySelector('[data-testid="confirm-action-dialog"]')).toBeNull();
    expect(deleteAdminUser).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage survives a failing permission refresh after a write 403", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { AdminAuthProvider } = await import("../../../core/admin/ui/contexts/AdminAuthContext");
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const error = new ApiClientError("forbidden", "Forbidden", 403);
  error.sharedFailureKind = "permission_denied";
  disableAdminUser.mockRejectedValueOnce(error);
  const refreshPermissions = vi.fn(async () => {
    throw new Error("refresh endpoint down");
  });

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
    await flush();

    expect(refreshPermissions).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain(
      "Your permissions changed. Refreshing access before enabling actions."
    );
    // permission_denied 403 is fail-closed: resolveErrorMessage maps it to the
    // permission-changed notice, so the generic write fallback must NOT surface.
    expect(view.container.textContent).not.toContain("Failed to update user status.");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage drops in-flight load results when unmounted mid-refresh", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  let resolveUsers: (value: unknown) => void = () => undefined;
  listAdminUsers.mockImplementationOnce(() => new Promise((resolve) => (resolveUsers = resolve)));

  const view = mount(<UsersRolesPage permissions={["users:read", "roles:read"]} />);
  await flush();

  // Unmount while the users request is still pending, then let it settle.
  view.cleanup();
  React.act(() => {
    resolveUsers([]);
  });
  await flush();
  await flush();

  expect(listAdminRoles).toHaveBeenCalledTimes(1);
  expect(listPermissionCatalog).toHaveBeenCalledTimes(1);
});

test("UsersRolesPage swallows load rejections from an unmounted instance", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  listAdminRoles.mockRejectedValueOnce(new Error("late failure"));

  const view = mount(<UsersRolesPage permissions={["users:read", "roles:read"]} />);
  await flush();

  view.cleanup();
  await flush();
  await flush();

  expect(listAdminUsers).toHaveBeenCalledTimes(1);
});
