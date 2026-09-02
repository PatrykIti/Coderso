// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PermissionsMatrixPage } from "../../../core/admin/ui/roles/PermissionsMatrixPage";

const roleMocks = vi.hoisted(() => ({
  listAdminRoles: vi.fn(),
  listPermissionCatalog: vi.fn(),
  createAdminRole: vi.fn(),
  updateAdminRole: vi.fn(),
  deleteAdminRole: vi.fn(),
}));
const listAdminRoles = roleMocks.listAdminRoles;
const listPermissionCatalog = roleMocks.listPermissionCatalog;
const createAdminRole = roleMocks.createAdminRole;
const updateAdminRole = roleMocks.updateAdminRole;

const riskConfirmState = vi.hoisted(() => ({ onConfirm: undefined as undefined | (() => void) }));

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
    size,
    variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    className?: string;
    size?: string;
    variant?: string;
  }) => {
    return (
      <button type="button" data-size={size} data-variant={variant} {...props}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean;
    disabled?: boolean;
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
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-dialog-open={String(Boolean(open))}>
      {open ? children : null}
      <button type="button" data-testid="dialog-close" onClick={() => onOpenChange?.(false)}>
        close-dialog
      </button>
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({ Separator: () => <hr /> }));

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

vi.mock("@/services/adminRolesClient", () => roleMocks);

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    confirmLabel,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
    onOpenChange: (open: boolean) => void;
  }) => {
    riskConfirmState.onConfirm = onConfirm;
    return open ? (
      <div>
        <span>{title}</span>
        <button
          type="button"
          onClick={() => {
            void onConfirm();
          }}
        >
          {`risk-confirm:${confirmLabel}`}
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          risk-close
        </button>
      </div>
    ) : null;
  },
}));

vi.mock("../../../core/admin/ui/roles/RoleEditor", () => ({
  RoleEditor: ({
    open,
    onSave,
  }: {
    open: boolean;
    onSave: (draft: unknown) => void | Promise<void>;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() =>
          void onSave({ name: "Created role", description: "", permissions: ["content:read"] })
        }
      >
        role-editor-save
      </button>
    ) : null,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    topbarActions,
  }: {
    breadcrumbs?: React.ReactNode[];
    children: React.ReactNode;
    search?: React.ReactNode;
    topbarActions?: React.ReactNode;
  }) => (
    <main>
      <div>{topbarActions}</div>
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
  { id: "editor", name: "Editor", description: "Content team", permissions: ["content:read"] },
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
};

beforeEach(() => {
  vi.clearAllMocks();
  listAdminRoles.mockResolvedValue(roles);
  listPermissionCatalog.mockResolvedValue(permissionGroups);
  createAdminRole.mockResolvedValue({ id: "new-role" });
  updateAdminRole.mockImplementation(async (id: string) => roles.find((r) => r.id === id));
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("403 during initial load fails closed into the denied matrix", async () => {
  listAdminRoles.mockRejectedValueOnce(
    Object.assign(new Error("forbidden"), { kind: "api", status: 403 })
  );
  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Access denied");
    expect(view.container.textContent).toContain(
      "Your permissions changed. Refreshing access before enabling actions."
    );
    // Fail-closed: the matrix body is not rendered for a denied account.
    expect(view.container.textContent).not.toContain("Write content");
  } finally {
    view.cleanup();
  }
});

test("non-API load failure surfaces the generic load error", async () => {
  listAdminRoles.mockRejectedValueOnce(new Error("offline"));
  const view = mount(<PermissionsMatrixPage permissions={["roles:read"]} />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Failed to load roles and permissions.");
  } finally {
    view.cleanup();
  }
});

test("role creation without roles:write is blocked; API failure maps to the create fallback", async () => {
  // Read-only account cannot reach the editor through the toolbar.
  const readonly = mount(<PermissionsMatrixPage permissions={["roles:read"]} />);
  await flush();
  const addRoleReadonly = findButtonByText(readonly.container, "Add Role");
  expect(addRoleReadonly?.disabled).toBe(true);
  readonly.cleanup();

  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);
  try {
    await flush();
    clickByText(view.container, "Add Role");
    createAdminRole.mockRejectedValueOnce(new Error("db down"));
    clickByText(view.container, "role-editor-save");
    await flush();
    expect(createAdminRole).toHaveBeenCalled();
    expect(view.container.textContent).toContain("Failed to create role.");

    // Successful creation closes the editor and refreshes the lists.
    clickByText(view.container, "Add Role");
    clickByText(view.container, "role-editor-save");
    await flush();
    expect(listAdminRoles).toHaveBeenCalledTimes(3);
  } finally {
    view.cleanup();
  }
});

test("review modal: cancel resets drafts; unconfirmed high-risk save blocks with guidance", async () => {
  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);
  try {
    await flush();

    // Grant a high-risk permission to Editor.
    const writeToggle = view.container.querySelector(
      "button[aria-label='Write settings for Editor']"
    );
    if (!(writeToggle instanceof HTMLButtonElement)) throw new Error("missing toggle");
    React.act(() => {
      writeToggle.click();
    });

    clickByText(view.container, "Review changes");
    expect(view.container.textContent).toContain("Confirm changes");
    expect(findButtonByText(view.container, "Confirm changes")?.disabled).toBe(true);

    // High-risk confirmation gate.
    clickByFirstText(view.container, "Confirm changes");
    await flush();
    expect(view.container.textContent).toContain(
      "Confirm full-access or high-risk permission grants before saving these role changes."
    );

    // Confirm the risk via the nested dialog, then save successfully.
    if (!riskConfirmState.onConfirm) throw new Error("risk dialog not mounted");
    React.act(() => {
      void riskConfirmState.onConfirm?.();
    });
    await flush();
    clickByFirstText(view.container, "Confirm changes");
    await flush();
    expect(updateAdminRole).toHaveBeenCalledWith(
      "editor",
      expect.objectContaining({ permissions: expect.arrayContaining(["settings:write"]) })
    );

    // Cancel path resets drafts back to server state.
    React.act(() => {
      const toggle = view.container.querySelector("button[aria-label='Write settings for Editor']");
      if (!(toggle instanceof HTMLButtonElement)) throw new Error("missing toggle");
      toggle.click();
    });
    clickByText(view.container, "Cancel");
    await flush();
    expect(view.container.textContent).toContain("No pending permission changes.");
  } finally {
    view.cleanup();
  }
});

function clickByFirstText(container: HTMLElement, text: string) {
  const button = findButtonByText(container, text);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
}

test("role creation that triggers a failing refresh surfaces the load fallback", async () => {
  // Initial load succeeds, then the post-create refresh fails with a generic error.
  listAdminRoles.mockResolvedValueOnce(roles).mockRejectedValueOnce(new Error("refresh down"));
  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);
  try {
    await flush();
    clickByText(view.container, "Add Role");
    clickByText(view.container, "role-editor-save");
    await flush();
    expect(createAdminRole).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Failed to load roles and permissions.");
    // A non-403 refresh failure keeps the matrix editable.
    expect(view.container.textContent).toContain("Write content");
  } finally {
    view.cleanup();
  }
});

test("a post-save refresh 403 fails the matrix closed and requests a permission refresh", async () => {
  listAdminRoles
    .mockResolvedValueOnce(roles)
    .mockRejectedValueOnce(Object.assign(new Error("forbidden"), { kind: "api", status: 403 }));
  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);
  try {
    await flush();
    clickByText(view.container, "Add Role");
    clickByText(view.container, "role-editor-save");
    await flush();
    expect(createAdminRole).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Access denied");
    expect(view.container.textContent).toContain(
      "Your permissions changed. Refreshing access before enabling actions."
    );
    // Fail-closed: the matrix body no longer renders after a stale 403.
    expect(view.container.textContent).not.toContain("Write content");
  } finally {
    view.cleanup();
  }
});

test("closing the review dialog dismisses an open high-risk confirmation", async () => {
  const view = mount(<PermissionsMatrixPage permissions={["roles:read", "roles:write"]} />);
  try {
    await flush();

    const writeToggle = view.container.querySelector(
      "button[aria-label='Write settings for Editor']"
    );
    if (!(writeToggle instanceof HTMLButtonElement)) throw new Error("missing toggle");
    React.act(() => {
      writeToggle.click();
    });

    clickByText(view.container, "Review changes");
    clickByText(view.container, "Review high-risk changes");
    expect(view.container.textContent).toContain("Confirm high-risk role permissions");

    // Closing the review dialog via its close affordance clears the nested risk dialog.
    clickByText(view.container, "close-dialog");
    await flush();
    expect(view.container.textContent).not.toContain("Confirm high-risk role permissions");
    expect(view.container.textContent).not.toContain("Review permission changes");
  } finally {
    view.cleanup();
  }
});
