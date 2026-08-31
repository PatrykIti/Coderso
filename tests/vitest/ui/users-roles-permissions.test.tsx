// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";

import {
  clickByText,
  createAdminRole,
  findButtonByText,
  flush,
  installMatchMedia,
  listAdminRoles,
  listAdminUsers,
  listPermissionCatalog,
  mount,
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
