// @vitest-environment happy-dom

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { AdminAuthProvider } from "../../../core/admin/ui/contexts/AdminAuthContext";
import { PermissionsMatrixPage } from "../../../core/admin/ui/roles/PermissionsMatrixPage";

const roleClient = vi.hoisted(() => ({
  createAdminRole: vi.fn(),
  deleteAdminRole: vi.fn(),
  listAdminRoles: vi.fn(),
  listPermissionCatalog: vi.fn(),
  updateAdminRole: vi.fn(),
}));

const { listAdminRoles, listPermissionCatalog, updateAdminRole } = roleClient;

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
      aria-pressed={Boolean(checked)}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      toggle
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

vi.mock("@/components/ui/separator", () => ({ Separator: () => <hr /> }));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children?: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan }: { children?: React.ReactNode; colSpan?: number }) => (
    <td colSpan={colSpan}>{children}</td>
  ),
  TableHead: ({ children }: { children?: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children?: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/services/adminRolesClient", () => roleClient);

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    search,
    topbarActions,
  }: {
    children?: React.ReactNode;
    search?: React.ReactNode;
    topbarActions?: React.ReactNode;
  }) => (
    <main>
      {search}
      {topbarActions}
      {children}
    </main>
  ),
}));

vi.mock("../../../core/admin/ui/roles/RoleEditor", () => ({ RoleEditor: () => null }));
vi.mock("@/ui/shared/ConfirmActionDialog", () => ({ ConfirmActionDialog: () => null }));

const permissionGroups = [
  {
    id: "content",
    label: "Content",
    permissions: [
      { id: "content:read", label: "Read content" },
      { id: "content:write", label: "Write content" },
      { id: "content:publish", label: "Publish content" },
    ],
  },
];

const initialRoles = [
  {
    id: "editor",
    name: "Editor",
    description: "Content team",
    permissions: ["content:read"],
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Review team",
    permissions: ["content:read"],
  },
];

const writablePermissions = ["roles:read", "roles:write"];

type MountedView = {
  cleanup: () => void;
  container: HTMLDivElement;
};

const mountedViews: MountedView[] = [];

const mount = (node: React.ReactNode): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  const view = {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
  mountedViews.push(view);
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

const clickByLabel = (container: HTMLElement, label: string) => {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing control: ${label}`);
  }
  React.act(() => {
    button.click();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  listAdminRoles.mockResolvedValue(initialRoles);
  listPermissionCatalog.mockResolvedValue(permissionGroups);
  updateAdminRole.mockImplementation(async (roleId: string, payload: { permissions: string[] }) => {
    const role = initialRoles.find((item) => item.id === roleId);
    if (!role) throw new Error(`Unknown role: ${roleId}`);
    return { ...role, permissions: payload.permissions };
  });
});

afterEach(() => {
  while (mountedViews.length > 0) {
    mountedViews.pop()?.cleanup();
  }
  document.body.replaceChildren();
});

test("PermissionsMatrixPage retains review failures, refreshes access, and closes a real review", async () => {
  const refreshPermissions = vi.fn(async () => undefined);
  const view = mount(
    <AdminAuthProvider
      refreshPermissions={refreshPermissions}
      user={{
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        permissionSnapshot: {
          permissions: writablePermissions,
          roles: [{ id: "admin", slug: "admin", name: "Admin" }],
        },
      }}
    >
      <PermissionsMatrixPage permissions={writablePermissions} />
    </AdminAuthProvider>
  );

  await flush();

  clickByLabel(view.container, "Write content for Editor");
  clickByLabel(view.container, "Write content for Reviewer");
  clickButton(view.container, "Review changes");

  const stale = new ApiClientError("role_conflict", "Role changed", 409);
  const denied = new ApiClientError("forbidden", "Forbidden", 403);
  denied.sharedFailureKind = "permission_denied";
  updateAdminRole.mockRejectedValueOnce(stale).mockRejectedValueOnce(denied);

  clickButton(view.container, "Confirm changes");
  await flush();

  expect(updateAdminRole).toHaveBeenNthCalledWith(1, "editor", {
    permissions: ["content:read", "content:write"],
  });
  expect(updateAdminRole).toHaveBeenNthCalledWith(2, "reviewer", {
    permissions: ["content:read", "content:write"],
  });
  expect(view.container.textContent).toContain(
    "Editor: Role changed on the server. Refresh roles before retrying."
  );
  expect(view.container.textContent).toContain("Reviewer: Permissions changed; refresh required.");
  expect(view.container.textContent).toContain("Some role permission changes failed.");
  expect(refreshPermissions).toHaveBeenCalledTimes(1);
  expect(view.container.textContent).not.toContain("Access denied");

  clickButton(view.container, "Refresh roles");
  await flush();

  expect(listAdminRoles).toHaveBeenCalledTimes(2);
  expect(listPermissionCatalog).toHaveBeenCalledTimes(2);
  expect(view.container.textContent).not.toContain("Review permission changes");
  expect(view.container.textContent).not.toContain("Access denied");
});
