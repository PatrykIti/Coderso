// @vitest-environment happy-dom

// TASK-105-08-09 (L09, users-roles): closes residual component-level gaps in the
// users/roles cluster by rendering the real list/editor/dialog components directly.
// Each assertion checks a visible DOM effect or the client-facing callback payload.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

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

// The locked-role guard in UserEditor (line 81) is defensive: the real checkbox is
// disabled, but a direct onCheckedChange callback can still arrive. This seam fires
// the callback even on a disabled button so the guard's visible effect (selection
// stays unchanged) can be asserted.
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    disabled,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked ? "true" : "false"}
      data-checked={String(Boolean(checked))}
      data-disabled={String(Boolean(disabled))}
      onClick={() => {
        onCheckedChange?.(!checked);
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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    disabled,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") {
          return String(child);
        }
        if (React.isValidElement(child)) {
          return flattenText(child.props.children);
        }
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      value,
      onValueChange,
      disabled,
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
      disabled?: boolean;
    }) => (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  };
});

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    onConfirm: () => void | Promise<void>;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <span>{title}</span>
        <button type="button" onClick={() => void onConfirm()}>
          confirm-risk
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          risk-close
        </button>
      </div>
    ) : null,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const click = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing clickable element");
  }
  React.act(() => {
    element.click();
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  click(button);
};

const checkboxes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('button[role="checkbox"]')) as HTMLButtonElement[];

afterEach(() => {
  document.body.innerHTML = "";
});

const editorRoles = [
  { id: "admin", name: "Admin", description: "Full access", permissions: ["users:read"] },
  { id: "editor", name: "Editor", description: "Content team", permissions: ["users:read"] },
];

test("UserList MoreHorizontal trigger stops propagation so the row does not select", async () => {
  const { UserList } = await import("../../../core/admin/ui/users/UserList");

  const onSelect = vi.fn();
  const onEdit = vi.fn();
  const onToggleStatus = vi.fn();
  const onResetPassword = vi.fn();
  const onDelete = vi.fn();

  const view = mount(
    <UserList
      items={[
        {
          id: "user-1",
          name: "Grace Hopper",
          email: "grace@example.com",
          roleIds: ["editor"],
          status: "active",
          lastActive: "Just now",
          mfaEnabled: true,
        },
      ]}
      roles={[
        { id: "admin", name: "Admin", permissions: ["*"] },
        { id: "editor", name: "Editor", permissions: ["content.write"] },
      ]}
      onSelect={onSelect}
      onEdit={onEdit}
      onToggleStatus={onToggleStatus}
      onResetPassword={onResetPassword}
      onDelete={onDelete}
    />
  );

  try {
    // The overflow trigger is the action-cell button that wraps the ellipsis icon.
    const trigger = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.querySelector("svg")
    );
    expect(trigger).toBeDefined();

    // Clicking the overflow trigger must not bubble up to the row's onSelect.
    click(trigger);
    expect(onSelect).not.toHaveBeenCalled();

    // Positive control: clicking the row body does select.
    const rows = Array.from(view.container.querySelectorAll("tr"));
    click(rows[1]);
    expect(onSelect).toHaveBeenCalledWith("user-1");
  } finally {
    view.cleanup();
  }
});

test("UserEditor keeps a locked selected role in the draft when its toggle fires", async () => {
  const { UserEditor } = await import("../../../core/admin/ui/users/UserEditor");

  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <UserEditor
      open
      user={{
        id: "user-1",
        name: "Grace Hopper",
        email: "grace@example.com",
        roleIds: ["admin", "editor"],
        status: "active",
        lastActive: "Never",
      }}
      roles={editorRoles}
      lockedRoleIds={["admin"]}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  );

  try {
    expect(view.container.textContent).toContain("2 selected");
    const toggles = checkboxes(view.container);
    const adminToggle = toggles.find((toggle) => toggle.getAttribute("data-disabled") === "true");
    expect(adminToggle).toBeDefined();

    // The locked-role guard leaves the selection untouched.
    click(adminToggle);
    expect(view.container.textContent).toContain("2 selected");

    // Unlocking is not part of this seam: removing an unlocked role still works.
    const editorToggle = toggles.find((toggle) => toggle.getAttribute("data-disabled") === "false");
    click(editorToggle);
    expect(view.container.textContent).toContain("1 selected");

    clickByText(view.container, "Save changes");
    expect(onSave).toHaveBeenCalledWith(
      { name: "Grace Hopper", email: "grace@example.com", roleIds: ["admin"], status: "active" },
      "edit"
    );
  } finally {
    view.cleanup();
  }
});

test("InviteUserDialog close button closes while idle", async () => {
  const { InviteUserDialog } = await import("../../../core/admin/ui/users/InviteUserDialog");

  const onOpenChange = vi.fn();

  const view = mount(
    <InviteUserDialog
      open
      roles={[{ id: "editor", name: "Editor", permissions: ["content.write"] }]}
      onOpenChange={onOpenChange}
    />
  );

  try {
    const closeButton = view.container.querySelector(
      'button[aria-label="Close invite user dialog"]'
    );
    expect(closeButton).not.toBeNull();

    click(closeButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

const permissionCatalog = [
  {
    id: "content",
    label: "Content",
    permissions: [
      { id: "content:read", label: "Read content" },
      { id: "content:write", label: "Write content" },
    ],
  },
];

test("RoleEditor removes a permission from the draft without a confirmation prompt", async () => {
  const { RoleEditor } = await import("../../../core/admin/ui/roles/RoleEditor");

  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <RoleEditor
      open
      role={{
        id: "editor",
        name: "Editor",
        description: "Content team",
        permissions: ["content:read", "content:write"],
      }}
      permissionGroups={permissionCatalog}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  );

  try {
    expect(view.container.textContent).toContain("2 selected");

    // Removing a low-risk permission applies immediately and updates the visible count.
    const toggles = checkboxes(view.container);
    click(toggles[0]);
    expect(view.container.textContent).toContain("1 selected");
    expect(view.container.textContent).not.toContain("Confirm high-risk permissions");

    clickByText(view.container, "Save role");
    expect(onSave).toHaveBeenCalledWith(
      { name: "Editor", description: "Content team", permissions: ["content:write"] },
      "edit"
    );
  } finally {
    view.cleanup();
  }
});

test("RoleEditor footer Cancel closes the dialog directly", async () => {
  const { RoleEditor } = await import("../../../core/admin/ui/roles/RoleEditor");

  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <RoleEditor
      open
      role={{
        id: "editor",
        name: "Editor",
        description: "Content team",
        permissions: ["content:read"],
      }}
      permissionGroups={permissionCatalog}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  );

  try {
    clickByText(view.container, "Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("RoleEditor dialog close clears a pending risk confirmation", async () => {
  const { RoleEditor } = await import("../../../core/admin/ui/roles/RoleEditor");

  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const highRiskCatalog = [
    {
      id: "custom",
      label: "Custom",
      permissions: [
        { id: "content:read", label: "Read content" },
        { id: "content:write", label: "Write content" },
        { id: "media:write", label: "Manage media" },
        { id: "roles:write", label: "Manage roles" },
      ],
    },
  ];

  const view = mount(
    <RoleEditor
      open
      role={{
        id: "editor",
        name: "Editor",
        description: "Content team",
        permissions: ["content:read"],
      }}
      permissionGroups={highRiskCatalog}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  );

  try {
    // Granting a high-risk permission (roles:write, the last catalog entry) opens
    // the confirmation gate.
    const toggles = checkboxes(view.container);
    click(toggles[3]);
    expect(view.container.textContent).toContain("Confirm high-risk permissions");

    // Closing the dialog via its close affordance cancels the pending confirmation.
    const closeButton = view.container.querySelector('[data-testid="dialog-close"]');
    expect(closeButton).not.toBeNull();
    click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(view.container.textContent).not.toContain("Confirm high-risk permissions");
  } finally {
    view.cleanup();
  }
});
