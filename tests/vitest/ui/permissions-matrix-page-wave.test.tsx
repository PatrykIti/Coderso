// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const listAdminRoles = vi.fn();
const listPermissionCatalog = vi.fn();
const createAdminRole = vi.fn();
const updateAdminRole = vi.fn();
const deleteAdminRole = vi.fn();

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    className: _className,
    size: _size,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    size?: string;
    variant?: string;
  }) => (
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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
  }) => <div data-dialog-open={String(Boolean(open))}>{open ? children : null}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      onChange={onChange}
      onInput={(event) => onChange?.(event as React.ChangeEvent<HTMLInputElement>)}
    />
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) => (
    <td colSpan={colSpan}>{children}</td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock("@/services/adminRolesClient", () => ({
  createAdminRole,
  deleteAdminRole,
  listAdminRoles,
  listPermissionCatalog,
  updateAdminRole,
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
      <div>{breadcrumbs?.join(" / ")}</div>
      <div data-testid="search-slot">{search}</div>
      <div data-testid="topbar-actions">{topbarActions}</div>
      {children}
    </main>
  ),
}));

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
  {
    id: "editor",
    name: "Editor",
    description: "Content team",
    permissions: ["content:read"],
  },
  {
    id: "admin",
    name: "Admin",
    description: "Full access",
    permissions: ["*"],
    system: true,
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const findButtonByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );

const clickByText = (container: HTMLElement, text: string) => {
  const button = findButtonByText(container, text);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
  return button;
};

const clickByLabel = (container: HTMLElement, label: string) => {
  const button = container.querySelector(`button[aria-label='${label}']`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${label}`);
  }
  React.act(() => {
    button.click();
  });
  return button;
};

beforeEach(() => {
  vi.clearAllMocks();
  listAdminRoles.mockResolvedValue(roles);
  listPermissionCatalog.mockResolvedValue(permissionGroups);
  createAdminRole.mockResolvedValue({ id: "new-role" });
  updateAdminRole.mockImplementation(async (id: string, payload: { permissions?: string[] }) => {
    const role = roles.find((item) => item.id === id);
    return {
      ...(role ?? roles[0]),
      id,
      permissions: payload.permissions ?? role?.permissions ?? [],
    };
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("PermissionsMatrixPage denies access before fetching without roles:read", async () => {
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");

  const view = mount(<PermissionsMatrixPage permissions={[]} />);

  try {
    await flush();

    expect(listAdminRoles).not.toHaveBeenCalled();
    expect(listPermissionCatalog).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Access denied");
    expect(view.container.textContent).toContain("roles:read permission");
    expect(view.container.textContent).not.toContain("Loading permissions matrix");
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrixPage lets roles:read users search but not edit", async () => {
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");

  const view = mount(<PermissionsMatrixPage permissions={["roles:read"]} />);

  try {
    await flush();

    expect(listAdminRoles).toHaveBeenCalledTimes(1);
    expect(listPermissionCatalog).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Read-only permissions");
    expect(view.container.textContent).toContain("Write content");

    const addRole = findButtonByText(view.container, "Add Role");
    const bulkToggle = view.container.querySelector(
      "button[aria-label='Toggle all Editor permissions']"
    );
    const writeToggle = view.container.querySelector(
      "button[aria-label='Write content for Editor']"
    );

    expect(addRole).toBeInstanceOf(HTMLButtonElement);
    expect((addRole as HTMLButtonElement).disabled).toBe(true);
    expect(findButtonByText(view.container, "Review changes")).toBeUndefined();
    expect((bulkToggle as HTMLButtonElement).disabled).toBe(true);
    expect((writeToggle as HTMLButtonElement).disabled).toBe(true);
    expect(writeToggle?.getAttribute("aria-describedby")).toBe(
      "permissions-matrix-readonly-reason"
    );

    React.act(() => {
      (writeToggle as HTMLButtonElement).click();
    });
    expect(updateAdminRole).not.toHaveBeenCalled();

    const search = view.container.querySelector("input[placeholder='Search permissions...']");
    expect(search).toBeInstanceOf(HTMLInputElement);
    React.act(() => {
      (search as HTMLInputElement).value = "settings";
      search?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Write settings");
    expect(view.container.textContent).not.toContain("Write content");
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrixPage preserves editable matrix behavior for roles:write users", async () => {
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");

  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);

  try {
    await flush();

    clickByLabel(view.container, "Write content for Editor");

    const review = findButtonByText(view.container, "Review changes");
    expect(review).toBeInstanceOf(HTMLButtonElement);
    expect((review as HTMLButtonElement).disabled).toBe(false);
    expect(view.container.textContent).toContain("1 role changed: +1 / -0.");

    clickByText(view.container, "Review changes");
    expect(view.container.textContent).toContain("Review permission changes");
    expect(view.container.textContent).toContain("+ content:write");
    clickByText(view.container, "Confirm changes");
    await flush();

    expect(updateAdminRole).toHaveBeenCalledWith("editor", {
      permissions: ["content:read", "content:write"],
    });
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrixPage blocks high-risk permission saves until confirmed", async () => {
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");

  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);

  try {
    await flush();

    clickByLabel(view.container, "Write settings for Editor");
    clickByText(view.container, "Review changes");

    expect(view.container.textContent).toContain("High-risk confirmation required");
    expect(view.container.textContent).toContain("+ settings:write");
    const confirm = findButtonByText(view.container, "Confirm changes");
    expect(confirm).toBeInstanceOf(HTMLButtonElement);
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    clickByText(view.container, "Confirm changes");
    expect(updateAdminRole).not.toHaveBeenCalled();

    clickByText(view.container, "Review high-risk changes");
    expect(view.container.textContent).toContain("Confirm high-risk role permissions");
    expect(view.container.textContent).toContain("Editor: settings:write");

    clickByText(view.container, "Back to review");
    expect(updateAdminRole).not.toHaveBeenCalled();

    clickByText(view.container, "Review high-risk changes");
    clickByText(view.container, "Confirm high-risk changes");

    const confirmed = findButtonByText(view.container, "Confirm changes");
    expect(confirmed).toBeInstanceOf(HTMLButtonElement);
    expect((confirmed as HTMLButtonElement).disabled).toBe(false);

    clickByText(view.container, "Confirm changes");
    await flush();

    expect(updateAdminRole).toHaveBeenCalledWith("editor", {
      permissions: ["content:read", "settings:write"],
    });
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrixPage requires high-risk confirmation for bulk full-access promotion", async () => {
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");

  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);

  try {
    await flush();

    clickByLabel(view.container, "Toggle all Editor permissions");
    clickByText(view.container, "Review changes");

    expect(view.container.textContent).toContain("High-risk confirmation required");
    clickByText(view.container, "Review high-risk changes");
    expect(view.container.textContent).toContain("Editor: full access");
    clickByText(view.container, "Confirm high-risk changes");
    clickByText(view.container, "Confirm changes");
    await flush();

    expect(updateAdminRole).toHaveBeenCalledWith("editor", {
      permissions: ["*"],
    });
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrixPage refreshes permissions and shows access denied after stale load 403", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { AdminAuthProvider } = await import("../../../core/admin/ui/contexts/AdminAuthContext");
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");
  const error = new ApiClientError("forbidden", "Forbidden", 403);
  error.sharedFailureKind = "permission_denied";
  listAdminRoles.mockRejectedValueOnce(error);
  const refreshPermissions = vi.fn(async () => undefined);

  const view = mount(
    <AdminAuthProvider
      refreshPermissions={refreshPermissions}
      user={{
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        permissionSnapshot: {
          permissions: ["roles:read", "roles:write"],
          roles: [{ id: "admin", slug: "admin", name: "Admin" }],
        },
      }}
    >
      <PermissionsMatrixPage />
    </AdminAuthProvider>
  );

  try {
    await flush();

    expect(refreshPermissions).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Access denied");
    expect(view.container.textContent).toContain(
      "Your permissions changed. Refreshing access before enabling actions."
    );
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrixPage keeps the draft and refreshes permissions after stale save 403", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { AdminAuthProvider } = await import("../../../core/admin/ui/contexts/AdminAuthContext");
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");
  const error = new ApiClientError("forbidden", "Forbidden", 403);
  error.sharedFailureKind = "permission_denied";
  updateAdminRole.mockRejectedValueOnce(error);
  const refreshPermissions = vi.fn(async () => undefined);

  const view = mount(
    <AdminAuthProvider
      refreshPermissions={refreshPermissions}
      user={{
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        permissionSnapshot: {
          permissions: ["roles:read", "roles:write"],
          roles: [{ id: "admin", slug: "admin", name: "Admin" }],
        },
      }}
    >
      <PermissionsMatrixPage />
    </AdminAuthProvider>
  );

  try {
    await flush();

    clickByLabel(view.container, "Write content for Editor");
    clickByText(view.container, "Review changes");
    clickByText(view.container, "Confirm changes");
    await flush();

    expect(refreshPermissions).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Permissions changed; refresh required.");
    expect(view.container.textContent).toContain("Some role permission changes failed.");
    expect(view.container.textContent).toContain("1 role changed: +1 / -0.");
    expect(findButtonByText(view.container, "Confirm changes")).toBeDefined();
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrixPage reports stale role conflicts without clearing the draft", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");
  updateAdminRole.mockRejectedValueOnce(new ApiClientError("role_conflict", "Role conflict", 409));

  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);

  try {
    await flush();

    clickByLabel(view.container, "Write content for Editor");
    clickByText(view.container, "Review changes");
    clickByText(view.container, "Confirm changes");
    await flush();

    expect(view.container.textContent).toContain(
      "Editor: Role changed on the server. Refresh roles before retrying."
    );
    expect(view.container.textContent).toContain("1 role changed: +1 / -0.");
    const confirm = findButtonByText(view.container, "Confirm changes");
    expect(confirm).toBeInstanceOf(HTMLButtonElement);
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    clickByText(view.container, "Confirm changes");
    expect(updateAdminRole).toHaveBeenCalledTimes(1);

    clickByText(view.container, "Refresh roles");
    await flush();

    expect(listAdminRoles).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).not.toContain("Review permission changes");
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrixPage keeps only failed role diffs dirty after partial save failure", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");
  updateAdminRole.mockImplementation(async (id: string, payload: { permissions?: string[] }) => {
    if (id === "admin") {
      throw new ApiClientError("permission_invalid", "Invalid permission assignment", 400);
    }
    const role = roles.find((item) => item.id === id);
    return {
      ...(role ?? roles[0]),
      id,
      permissions: payload.permissions ?? role?.permissions ?? [],
    };
  });

  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);

  try {
    await flush();

    clickByLabel(view.container, "Write content for Editor");
    clickByLabel(view.container, "Write settings for Admin");
    expect(view.container.textContent).toContain("2 roles changed: +1 / -1.");

    clickByText(view.container, "Review changes");
    clickByText(view.container, "Confirm changes");
    await flush();

    expect(updateAdminRole).toHaveBeenCalledTimes(2);
    expect(updateAdminRole).toHaveBeenNthCalledWith(1, "editor", {
      permissions: ["content:read", "content:write"],
    });
    expect(updateAdminRole).toHaveBeenNthCalledWith(2, "admin", {
      permissions: ["content:read", "content:write"],
    });
    expect(view.container.textContent).toContain("Admin: Invalid permission assignment");
    expect(view.container.textContent).toContain("1 role changed: +0 / -1.");
    expect(view.container.textContent).not.toContain("+ content:write");
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrixPage review cancel is side-effect-free", async () => {
  const { PermissionsMatrixPage } =
    await import("../../../core/admin/ui/roles/PermissionsMatrixPage");

  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);

  try {
    await flush();

    clickByLabel(view.container, "Write content for Editor");
    clickByText(view.container, "Review changes");

    const openDialog = view.container.querySelector('[data-dialog-open="true"]');
    expect(openDialog?.textContent).toContain("Review permission changes");
    expect(openDialog?.textContent).toContain("+ content:write");

    const cancel = Array.from(openDialog?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("Cancel")
    );
    expect(cancel).toBeInstanceOf(HTMLButtonElement);
    React.act(() => {
      (cancel as HTMLButtonElement).click();
    });

    expect(updateAdminRole).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain("Review permission changes");
    expect(view.container.textContent).toContain("1 role changed: +1 / -0.");
  } finally {
    view.cleanup();
  }
});
