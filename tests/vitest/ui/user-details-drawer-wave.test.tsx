// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    defaultChecked,
    disabled,
    ...props
  }: {
    defaultChecked?: boolean;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      defaultChecked={defaultChecked}
      disabled={disabled}
      readOnly
      {...props}
    />
  ),
}));

import { UserDetailsDrawer } from "../../../core/admin/ui/users/UserDetailsDrawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roles = [
  {
    id: "role-admin",
    name: "Admin",
    permissions: ["users.read", "users.write", "roles.read"],
  },
  {
    id: "role-owner",
    name: "Owner",
    permissions: ["*"],
  },
];

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
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("UserDetailsDrawer renders empty fallback when no user is selected", () => {
  const view = mount(
    <UserDetailsDrawer
      user={null}
      roles={[]}
      onEditUser={() => undefined}
      onResetPassword={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("No user selected");
    expect(view.container.textContent).toContain(
      "Select a user to review permissions and activity."
    );
  } finally {
    view.cleanup();
  }
});

test("UserDetailsDrawer renders user details, permission summaries, and action guards", () => {
  const onEditUser = vi.fn();
  const onResetPassword = vi.fn();
  const onToggleStatus = vi.fn();
  const onDeleteUser = vi.fn();

  const managedView = mount(
    <UserDetailsDrawer
      user={{
        id: "user-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        roleIds: ["role-admin", "role-missing"],
        status: "active",
        mfaEnabled: false,
        lastActive: "Today at 10:15",
      }}
      roles={roles}
      onEditUser={onEditUser}
      onResetPassword={onResetPassword}
      onToggleStatus={onToggleStatus}
      onDeleteUser={onDeleteUser}
    />
  );

  try {
    expect(managedView.container.textContent).toContain("Ada Lovelace");
    expect(managedView.container.textContent).toContain("ada@example.com");
    expect(managedView.container.textContent).toContain("AL");
    expect(managedView.container.textContent).toContain("Admin");
    expect(managedView.container.textContent).toContain("3 permissions");
    expect(managedView.container.textContent).toContain("users.read");
    expect(managedView.container.textContent).toContain("users.write");
    expect(managedView.container.textContent).toContain("roles.read");
    expect(managedView.container.textContent).toContain("Two-factor authentication disabled.");
    const notificationControls = Array.from(
      managedView.container.querySelectorAll('input[type="checkbox"]')
    ).filter((control): control is HTMLInputElement => control instanceof HTMLInputElement);
    expect(notificationControls).toHaveLength(2);
    expect(notificationControls.every((control) => control.disabled)).toBe(true);
    expect(notificationControls.every((control) => !control.checked)).toBe(true);
    expect(
      notificationControls.every((control) =>
        control.getAttribute("title")?.includes("Notification preferences are read-only")
      )
    ).toBe(true);

    clickByText(managedView.container, "Edit permissions");
    clickByText(managedView.container, "Reset password");
    clickByText(managedView.container, "Deactivate user");
    clickByText(managedView.container, "Delete user");

    expect(onEditUser).toHaveBeenCalled();
    expect(onResetPassword).toHaveBeenCalled();
    expect(onToggleStatus).toHaveBeenCalled();
    expect(onDeleteUser).toHaveBeenCalled();
  } finally {
    managedView.cleanup();
  }

  const lockedView = mount(
    <UserDetailsDrawer
      user={{
        id: "user-2",
        name: "Grace Hopper",
        email: "grace@example.com",
        roleIds: ["role-owner"],
        status: "active",
        mfaEnabled: true,
        lastActive: "Yesterday",
      }}
      roles={roles}
      canManageUsers={false}
      onToggleStatus={onToggleStatus}
      onDeleteUser={onDeleteUser}
      onEditUser={onEditUser}
      onResetPassword={onResetPassword}
    />
  );

  try {
    expect(lockedView.container.textContent).toContain("Full access");
    expect(lockedView.container.textContent).toContain("All admin capabilities");
    expect(lockedView.container.textContent).toContain("Two-factor authentication enabled.");

    const buttons = Array.from(lockedView.container.querySelectorAll("button"));
    expect(buttons.every((button) => button.disabled)).toBe(true);
  } finally {
    lockedView.cleanup();
  }
});

test("UserDetailsDrawer hides role ids when role details are unavailable", () => {
  const view = mount(
    <UserDetailsDrawer
      user={{
        id: "user-3",
        name: "Readonly User",
        email: "readonly@example.com",
        roleIds: ["role-admin", "role-missing"],
        status: "active",
        mfaEnabled: false,
        lastActive: "Today",
      }}
      roles={roles}
      canManageUsers={false}
      roleDetailsUnavailableReason="Role names require roles:read permission."
      onEditUser={() => undefined}
      onResetPassword={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Roles unavailable");
    expect(view.container.textContent).toContain("Role details unavailable");
    expect(view.container.textContent).toContain("Role names require roles:read permission.");
    expect(view.container.textContent).not.toContain("role-admin");
    expect(view.container.textContent).not.toContain("role-missing");
  } finally {
    view.cleanup();
  }
});
