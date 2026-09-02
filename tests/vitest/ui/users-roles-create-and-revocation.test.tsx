// @vitest-environment happy-dom

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { RoleSummary } from "../../../core/admin/ui/roles/types";
import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";
import type { UserSummary } from "../../../core/admin/ui/users/types";

const roleClient = vi.hoisted(() => ({
  createAdminRole: vi.fn(),
  deleteAdminRole: vi.fn(),
  listAdminRoles: vi.fn(),
  listPermissionCatalog: vi.fn(),
  updateAdminRole: vi.fn(),
}));

const userClient = vi.hoisted(() => ({
  deleteAdminUser: vi.fn(),
  disableAdminUser: vi.fn(),
  enableAdminUser: vi.fn(),
  inviteUserWithSetPassword: vi.fn(),
  listAdminUsers: vi.fn(),
  replaceAdminUserRoles: vi.fn(),
  requestAdminPasswordReset: vi.fn(),
  updateAdminUser: vi.fn(),
}));

const { createAdminRole, deleteAdminRole, listAdminRoles, listPermissionCatalog } = roleClient;
const {
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  inviteUserWithSetPassword,
  listAdminUsers,
  replaceAdminUserRoles,
  requestAdminPasswordReset,
  updateAdminUser,
} = userClient;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  size?: string;
  variant?: string;
};

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, size: _size, variant: _variant, ...props }: ButtonProps) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children?: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <div>
      {children}
      <button type="button" onClick={() => onValueChange?.("editor")}>
        Choose editor role
      </button>
    </div>
  ),
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock("@/components/ui/separator", () => ({ Separator: () => <hr /> }));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/services/adminRolesClient", () => roleClient);
vi.mock("@/services/adminUsersClient", () => userClient);

vi.mock("../../../core/admin/ui/users/UserFilters", () => ({ UserFilters: () => null }));

vi.mock("../../../core/admin/ui/users/UserList", () => ({
  UserList: ({
    canManageUserLifecycle,
    items,
    onDelete,
    onToggleStatus,
    selectedId,
  }: {
    canManageUserLifecycle?: boolean;
    items: UserSummary[];
    onDelete: (user: UserSummary) => void;
    onToggleStatus: (user: UserSummary) => void;
    selectedId?: string;
  }) => (
    <div>
      <output data-testid="selected-user-id">{selectedId ?? ""}</output>
      {items.map((user) => (
        <div key={user.id}>
          <span>{user.email}</span>
          <button
            type="button"
            disabled={!canManageUserLifecycle}
            onClick={() => onToggleStatus(user)}
          >
            Toggle {user.name}
          </button>
          <button type="button" disabled={!canManageUserLifecycle} onClick={() => onDelete(user)}>
            Delete {user.name}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/roles/RoleList", () => ({
  RoleList: ({
    canManageRoles,
    onDelete,
    onDuplicate,
    roles,
  }: {
    canManageRoles?: boolean;
    onDelete: (role: RoleSummary) => void;
    onDuplicate: (role: RoleSummary) => void;
    roles: RoleSummary[];
  }) => (
    <div>
      {roles.map((role) => (
        <div key={role.id}>
          <span>{role.name}</span>
          <button type="button" disabled={!canManageRoles} onClick={() => onDelete(role)}>
            Delete role {role.name}
          </button>
          <button type="button" disabled={!canManageRoles} onClick={() => onDuplicate(role)}>
            Duplicate role {role.name}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/users/UserDetailsDrawer", () => ({
  UserDetailsDrawer: () => null,
}));
vi.mock("../../../core/admin/ui/users/UserEditor", () => ({ UserEditor: () => null }));
vi.mock("../../../core/admin/ui/roles/RoleEditor", () => ({ RoleEditor: () => null }));

vi.mock("@/ui/layouts/SplitShell", () => ({
  SplitShell: ({ children }: { children?: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({ actions, title }: { actions?: React.ReactNode; title: string }) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}));

vi.mock("@/ui/shared/SectionHeader", () => ({
  SectionHeader: ({ action, title }: { action?: React.ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {action}
    </section>
  ),
}));

vi.mock("@/ui/shared/StatCard", () => ({ StatCard: () => null }));

const writablePermissions = ["users:read", "users:write", "roles:read", "roles:write"];
const readOnlyPermissions = ["users:read", "roles:read"];

const editorRole: RoleSummary = {
  id: "editor",
  name: "Editor",
  description: "Content team",
  permissions: ["content:write"],
};
const adminRole: RoleSummary = {
  id: "admin",
  name: "Admin",
  description: "Full access",
  permissions: ["*"],
  system: true,
};

const initialUsers = [
  {
    id: "user-1",
    name: "Alice Admin",
    email: "alice@example.com",
    roleIds: ["admin"],
    status: "active" as const,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    lastLoginAt: "2026-03-01T10:30:00.000Z",
  },
  {
    id: "user-2",
    name: "Bob Editor",
    email: "bob@example.com",
    roleIds: ["editor"],
    status: "inactive" as const,
    createdAt: "2026-03-02T10:00:00.000Z",
    updatedAt: "2026-03-02T10:00:00.000Z",
    lastLoginAt: null,
  },
];

const invitedUser = {
  id: "user-3",
  name: "New Invitee",
  email: "new-invitee@example.com",
  roleIds: ["editor"],
  status: "pending" as const,
  createdAt: "2026-03-03T10:00:00.000Z",
  updatedAt: "2026-03-03T10:00:00.000Z",
  lastLoginAt: null,
};

type RenderedUsersRoles = {
  cleanup: () => void;
  container: HTMLDivElement;
  rerender: (permissions: string[]) => void;
};

let currentView: RenderedUsersRoles | null = null;

const renderUsersRolesWithPermissions = (initialPermissions: string[]): RenderedUsersRoles => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const render = (permissions: string[]) => {
    React.act(() => {
      root.render(<UsersRolesPage permissions={permissions} />);
    });
  };

  render(initialPermissions);

  const view = {
    container,
    rerender: render,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
  currentView = view;
  return view;
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const findButton = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  );

const clickButton = (container: HTMLElement, text: string) => {
  const button = findButton(container, text);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
  return button;
};

const clickExactButton = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing exact button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
  return button;
};

const enterText = (container: HTMLElement, selector: string, value: string) => {
  const input = container.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input: ${selector}`);
  }
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) {
    throw new Error("Missing native input value setter");
  }
  React.act(() => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const expectVisibleDenied = (container: HTMLElement, message: string) => {
  const alerts = Array.from(container.querySelectorAll('[role="alert"]'));
  expect(alerts.some((alert) => alert.textContent?.includes(message))).toBe(true);
};

const installMatchMedia = () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: () => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches: true,
      media: "(min-width: 1024px)",
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  installMatchMedia();
  listAdminUsers.mockResolvedValue(initialUsers);
  listAdminRoles.mockResolvedValue([editorRole, adminRole]);
  listPermissionCatalog.mockResolvedValue([]);
  inviteUserWithSetPassword.mockResolvedValue({
    user: invitedUser,
    setPassword: {
      delivery: "email",
      expiresAt: "2026-03-03T11:00:00.000Z",
      status: "sent",
    },
  });
  createAdminRole.mockResolvedValue({ id: "role-3" });
  deleteAdminRole.mockResolvedValue(undefined);
  deleteAdminUser.mockResolvedValue(undefined);
  disableAdminUser.mockResolvedValue(undefined);
  enableAdminUser.mockResolvedValue(undefined);
  replaceAdminUserRoles.mockResolvedValue(undefined);
  requestAdminPasswordReset.mockResolvedValue(undefined);
  updateAdminUser.mockResolvedValue(undefined);
});

afterEach(() => {
  currentView?.cleanup();
  currentView = null;
  document.body.replaceChildren();
});

test("UsersRolesPage sends a public invite, refreshes the selected invitee, and closes the dialog", async () => {
  listAdminUsers
    .mockResolvedValueOnce(initialUsers)
    .mockResolvedValueOnce([...initialUsers, invitedUser]);
  const view = renderUsersRolesWithPermissions(writablePermissions);
  await flush();

  clickButton(view.container, "Invite User");
  expect(view.container.textContent).toContain("Add a new member to your workspace");
  enterText(view.container, "#invite-user-name", invitedUser.name);
  enterText(view.container, "#invite-user-email", invitedUser.email);
  clickButton(view.container, "Choose editor role");
  clickButton(view.container, "Send Invitation");
  await flush();

  expect(inviteUserWithSetPassword).toHaveBeenCalledWith({
    name: invitedUser.name,
    email: invitedUser.email,
    roleIds: ["editor"],
    sendSetPasswordInvite: true,
  });
  expect(view.container.querySelector('[data-testid="selected-user-id"]')?.textContent).toBe(
    invitedUser.id
  );
  expect(view.container.textContent).toContain(`Invitation email sent to ${invitedUser.email}.`);
  expect(view.container.textContent).not.toContain("Add a new member to your workspace");
});

test("UsersRolesPage refuses an invite submitted after writable access is revoked", async () => {
  const view = renderUsersRolesWithPermissions(writablePermissions);
  await flush();

  clickButton(view.container, "Invite User");
  enterText(view.container, "#invite-user-name", "Revoked Invitee");
  enterText(view.container, "#invite-user-email", "revoked@example.com");
  clickButton(view.container, "Choose editor role");
  view.rerender(readOnlyPermissions);
  await flush();

  clickButton(view.container, "Send Invitation");
  await flush();

  expect(inviteUserWithSetPassword).not.toHaveBeenCalled();
  expectVisibleDenied(
    view.container,
    "Inviting users requires users:write and roles:read permissions."
  );
  expect(view.container.textContent).toContain("Invite User");
});

test("UsersRolesPage refuses a status mutation after an already-open confirmation loses write access", async () => {
  const view = renderUsersRolesWithPermissions(writablePermissions);
  await flush();

  clickButton(view.container, "Toggle Alice Admin");
  expect(view.container.textContent).toContain("Deactivate user?");
  view.rerender(readOnlyPermissions);
  await flush();

  clickExactButton(view.container, "Deactivate user");
  await flush();

  expect(disableAdminUser).not.toHaveBeenCalled();
  expectVisibleDenied(view.container, "User status changes require users:write permission.");
});

test("UsersRolesPage refuses an unprotected user deletion after permission revocation", async () => {
  const view = renderUsersRolesWithPermissions(writablePermissions);
  await flush();

  clickButton(view.container, "Delete Bob Editor");
  expect(view.container.textContent).toContain("Delete user?");
  view.rerender(readOnlyPermissions);
  await flush();

  clickExactButton(view.container, "Delete user");
  await flush();

  expect(deleteAdminUser).not.toHaveBeenCalled();
  expectVisibleDenied(view.container, "Deleting users requires users:write permission.");
});

test("UsersRolesPage refuses a role deletion after permission revocation", async () => {
  const view = renderUsersRolesWithPermissions(writablePermissions);
  await flush();

  clickButton(view.container, "Delete role Editor");
  expect(view.container.textContent).toContain("Delete role?");
  view.rerender(readOnlyPermissions);
  await flush();

  clickExactButton(view.container, "Delete role");
  await flush();

  expect(deleteAdminRole).not.toHaveBeenCalled();
  expectVisibleDenied(view.container, "Deleting roles requires roles:write permission.");
});

test("UsersRolesPage refuses high-risk role duplication after permission revocation", async () => {
  const view = renderUsersRolesWithPermissions(writablePermissions);
  await flush();

  clickButton(view.container, "Duplicate role Admin");
  expect(view.container.textContent).toContain("Duplicate high-risk role?");
  view.rerender(readOnlyPermissions);
  await flush();

  clickExactButton(view.container, "Duplicate role");
  await flush();

  expect(createAdminRole).not.toHaveBeenCalled();
  expectVisibleDenied(view.container, "Duplicating roles requires roles:write permission.");
});
