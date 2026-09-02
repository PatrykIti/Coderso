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
} from "./usersRolesFixtures";

test("UsersRolesPage surfaces invitation failures from the admin clients", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  inviteUserWithSetPassword.mockRejectedValueOnce(new Error("invite down"));

  // handleInviteUser rethrows so the real InviteUserDialog can keep the drawer
  // open and show its own message; the fixture's dialog mock calls onInvite
  // without catching, so the harness absorbs the rejection here.
  const swallow = () => {
    const handler = () => undefined;
    process.on("unhandledRejection", handler);
    return () => process.off("unhandledRejection", handler);
  };
  const restore = swallow();

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    clickByText(view.container, "Invite User");
    clickByText(view.container, "submit-invite");
    await flush();
    await flush();

    expect(inviteUserWithSetPassword).toHaveBeenCalledWith({
      name: "Invited User",
      email: "invite@example.com",
      roleIds: ["editor"],
      sendSetPasswordInvite: true,
    });
    // The invitation failure surfaces the page-level error slot with the write
    // fallback, not the success notice.
    expect(view.container.textContent).toContain("Failed to send invitation.");
    expect(view.container.textContent).not.toContain("Invitation email sent");
  } finally {
    restore();
    view.cleanup();
  }
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

test("UsersRolesPage shields the last admin from deletion and confirms risky deactivation", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    // Alice is the only admin-role user, so she is reported as protected.
    expect(view.container.querySelector('[data-testid="user-list-protected"]')?.textContent).toBe(
      "user-1"
    );

    // Deleting the last admin is refused before any confirmation is offered.
    clickByText(view.container, "delete-first-user");
    expect(view.container.querySelector('[data-testid="confirm-action-dialog"]')).toBeNull();
    expect(deleteAdminUser).not.toHaveBeenCalled();

    // Deactivating a high-risk (wildcard) admin requires an explicit confirmation.
    clickByText(view.container, "toggle-first-user");
    expect(disableAdminUser).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Deactivate user?");
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "alice@example.com"
    );

    // Cancelling keeps the account untouched.
    clickByText(view.container, "Cancel");
    await flush();
    expect(disableAdminUser).not.toHaveBeenCalled();

    // Confirming performs the deactivation against the admin client.
    clickByText(view.container, "toggle-first-user");
    clickByText(view.container, "Deactivate user");
    await flush();
    expect(disableAdminUser).toHaveBeenCalledWith("user-1");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage surfaces per-action failure messages from the admin clients", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    // Password reset failure maps an API error onto its client-provided message.
    requestAdminPasswordReset.mockRejectedValueOnce(
      new ApiClientError("smtp_unavailable", "SMTP unavailable", 500)
    );
    clickByText(view.container, "reset-first-user");
    clickByText(view.container, "Send reset email");
    await flush();
    expect(requestAdminPasswordReset).toHaveBeenCalledWith("user-1");
    expect(view.container.textContent).toContain("SMTP unavailable");

    clickByText(view.container, "filter-status-inactive");

    // Activation failure reports the lifecycle fallback message. Each new action
    // resets the single error slot, so every fallback is asserted right away.
    enableAdminUser.mockRejectedValueOnce(new Error("activation down"));
    clickByText(view.container, "toggle-first-user");
    await flush();
    expect(enableAdminUser).toHaveBeenCalledWith("user-2");
    expect(view.container.textContent).toContain("Failed to update user status.");

    // Deletion failure reports the deletion fallback message.
    deleteAdminUser.mockRejectedValueOnce(new Error("delete down"));
    clickByText(view.container, "delete-first-user");
    clickByText(view.container, "Delete user");
    await flush();
    expect(deleteAdminUser).toHaveBeenCalledWith("user-2");
    expect(view.container.textContent).toContain("Failed to delete user.");

    // High-risk duplication failure reports the duplication fallback message.
    createAdminRole.mockRejectedValueOnce(new Error("duplicate down"));
    clickByText(view.container, "duplicate-second-role");
    clickByText(view.container, "Duplicate role");
    await flush();
    expect(createAdminRole).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Admin copy", sourceRoleId: "admin" })
    );
    expect(view.container.textContent).toContain("Failed to duplicate role.");

    // Role deletion failure reports the role-deletion fallback message.
    deleteAdminRole.mockRejectedValueOnce(new Error("role delete down"));
    clickByText(view.container, "delete-first-role");
    clickByText(view.container, "Delete role");
    await flush();
    expect(deleteAdminRole).toHaveBeenCalledWith("editor");
    expect(view.container.textContent).toContain("Failed to delete role.");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage opens editors from the roles header, role selection, and details drawer", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    // The Roles section header hosts its own create-role affordance.
    clickByText(view.container, "Create role");
    expect(view.container.querySelector('[data-testid="role-editor-mode"]')?.textContent).toBe(
      "create"
    );
    clickByText(view.container, "close-role-editor");

    // Selecting a role card moves the highlighted role.
    clickByText(view.container, "select-first-role");
    expect(view.container.querySelector('[data-testid="role-list-selected"]')?.textContent).toBe(
      "editor"
    );

    // The right-hand details drawer opens the editor pre-seeded with the selection.
    clickByText(view.container, "details-edit-user");
    expect(view.container.querySelector('[data-testid="user-editor-mode"]')?.textContent).toBe(
      "edit"
    );
    clickByText(view.container, "close-user-editor");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage lists pending invites only under the Invitations tab", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

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
      id: "user-9",
      name: "Cara Pending",
      email: "cara@example.com",
      roleIds: ["editor"],
      status: "pending",
      createdAt: "2026-03-04T10:00:00.000Z",
      updatedAt: "2026-03-04T10:00:00.000Z",
      lastLoginAt: null,
    },
  ]);

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  const activateTab = (label: string) => {
    const trigger = Array.from(view.container.querySelectorAll('[role="tab"]')).find((candidate) =>
      candidate.textContent?.includes(label)
    );
    if (!(trigger instanceof HTMLElement)) {
      throw new Error(`Missing tab trigger: ${label}`);
    }
    React.act(() => {
      trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      trigger.click();
    });
  };

  try {
    await flush();
    await flush();

    expect(view.container.textContent).toContain("Pending invites");
    expect(view.container.querySelector('[data-testid="user-list-items"]')?.textContent).toBe(
      "Alice Admin"
    );

    activateTab("Invitations");
    expect(view.container.querySelector('[data-testid="user-list-items"]')?.textContent).toBe(
      "Cara Pending"
    );

    activateTab("Members");
    expect(view.container.querySelector('[data-testid="user-list-items"]')?.textContent).toBe(
      "Alice Admin"
    );
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage cancels the password reset dialog without sending email", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    clickByText(view.container, "reset-first-user");
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "alice@example.com"
    );

    clickByText(view.container, "Cancel");
    await flush();

    expect(view.container.querySelector('[data-testid="confirm-action-dialog"]')).toBeNull();
    expect(requestAdminPasswordReset).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage opens the mobile details sheet when a row is selected", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  installMatchMedia(false);
  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    expect(
      view.container.querySelector('[data-testid="details-sheet"]')?.getAttribute("data-open")
    ).toBe("false");

    clickByText(view.container, "select-first-user");

    expect(
      view.container.querySelector('[data-testid="details-sheet"]')?.getAttribute("data-open")
    ).toBe("true");
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

test("UsersRolesPage reports post-save refresh failures from the admin clients", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  // The initial load resolves; the re-fetch triggered by a successful save fails.
  listAdminUsers.mockResolvedValueOnce([
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
  listAdminUsers.mockRejectedValueOnce(new Error("refresh down"));

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    clickByText(view.container, "edit-first-user");
    clickByText(view.container, "submit-user-editor");
    await flush();
    await flush();

    expect(updateAdminUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ name: "Alice Admin Updated" })
    );
    // The write succeeded, but the follow-up reload surfaced a load error.
    expect(view.container.textContent).toContain("Failed to load users and roles.");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage surfaces user-save failures from the admin clients", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  updateAdminUser.mockRejectedValueOnce(new Error("save down"));

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    clickByText(view.container, "edit-first-user");
    clickByText(view.container, "submit-user-editor");
    await flush();

    expect(updateAdminUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ name: "Alice Admin Updated" })
    );
    expect(view.container.textContent).toContain("Failed to save user.");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage surfaces role-save failures from the admin clients", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  createAdminRole.mockRejectedValueOnce(new Error("role save down"));

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    clickByText(view.container, "Create Role");
    clickByText(view.container, "submit-role-editor");
    await flush();

    expect(createAdminRole).toHaveBeenCalledWith(expect.objectContaining({ name: "New Role" }));
    expect(view.container.textContent).toContain("Failed to save role.");
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage guards role deletes and duplicates when roles:write is missing", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(<UsersRolesPage permissions={["users:read", "roles:read"]} />);

  try {
    await flush();
    await flush();

    // Role cards remain visible, but destructive role actions are refused before
    // any confirmation dialog is offered.
    clickByText(view.container, "delete-first-role");
    expect(view.container.querySelector('[data-testid="confirm-action-dialog"]')).toBeNull();
    expect(deleteAdminRole).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Deleting roles requires roles:write permission.");

    clickByText(view.container, "duplicate-first-role");
    expect(createAdminRole).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain(
      "Duplicating roles requires roles:write permission."
    );
  } finally {
    view.cleanup();
  }
});

test("UsersRolesPage drives lifecycle actions from the right-hand details drawer", async () => {
  const { UsersRolesPage } = await import("../../../core/admin/ui/users/UsersRolesPage");

  const view = mount(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  try {
    await flush();
    await flush();

    // Select the non-protected inactive user so every drawer action is legal.
    clickByText(view.container, "filter-status-inactive");
    expect(view.container.querySelector('[data-testid="user-list-items"]')?.textContent).toBe(
      "Bob Editor"
    );

    // Toggling status from the drawer activates the inactive user directly.
    clickByText(view.container, "details-toggle-user");
    await flush();
    expect(enableAdminUser).toHaveBeenCalledWith("user-2");

    // The drawer reset flow opens the password reset confirmation.
    clickByText(view.container, "details-reset-password");
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "bob@example.com"
    );
    clickByText(view.container, "Cancel");
    await flush();

    // The drawer delete flow offers the destructive confirmation.
    clickByText(view.container, "details-delete-user");
    expect(view.container.querySelector('[data-testid="confirm-target"]')?.textContent).toContain(
      "bob@example.com"
    );
    expect(view.container.textContent).toContain("Delete user?");
    clickByText(view.container, "Cancel");
    await flush();
    expect(deleteAdminUser).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
