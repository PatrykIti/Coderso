// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <span className={className} {...props}>
      {children}
    </span>
  ),
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
    placeholder,
    className,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} className={className} />,
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
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
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

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <thead className={className}>{children}</thead>
  ),
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input for value: ${value}`);
  }
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Missing select for value: ${value}`);
  }
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const findButtonsByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).filter((candidate) =>
    candidate.textContent?.includes(text)
  ) as HTMLButtonElement[];

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("UserFilters routes search and select changes through the provided callbacks", async () => {
  const { UserFilters } = await import("../../../core/admin/ui/users/UserFilters");

  const onQueryChange = vi.fn();
  const onRoleChange = vi.fn();
  const onStatusChange = vi.fn();

  const view = mount(
    <UserFilters
      query=""
      roleFilter="all"
      statusFilter="any"
      roles={[
        { id: "admin", name: "Admin", permissions: ["*"] },
        { id: "editor", name: "Editor", permissions: ["content.write"] },
      ]}
      onQueryChange={onQueryChange}
      onRoleChange={onRoleChange}
      onStatusChange={onStatusChange}
    />
  );

  try {
    expect(view.container.textContent).toContain("All roles");
    expect(view.container.textContent).toContain("Active");

    setInputValue(
      view.container.querySelector('input[placeholder="Search users by name or email..."]'),
      "grace"
    );
    const selects = Array.from(view.container.querySelectorAll("select"));
    setSelectValue(selects[0], "editor");
    setSelectValue(selects[1], "inactive");

    expect(onQueryChange).toHaveBeenCalledWith("grace");
    expect(onRoleChange).toHaveBeenCalledWith("editor");
    expect(onStatusChange).toHaveBeenCalledWith("inactive");
  } finally {
    view.cleanup();
  }
});

test("UserList renders badges, fallback roles, protected users, and routes actions", async () => {
  const { UserList } = await import("../../../core/admin/ui/users/UserList");

  const users = [
    {
      id: "user-1",
      name: "Grace Hopper",
      email: "grace@example.com",
      roleIds: ["admin", "editor", "mystery"],
      status: "active" as const,
      lastActive: "Just now",
      mfaEnabled: true,
    },
    {
      id: "user-2",
      name: "Ada Lovelace",
      email: "ada@example.com",
      roleIds: ["viewer"],
      status: "inactive" as const,
      lastActive: "Never",
      mfaEnabled: false,
    },
  ];
  const roles = [
    { id: "admin", name: "Admin", permissions: ["*"] },
    { id: "editor", name: "Editor", permissions: ["content.write"] },
    { id: "viewer", name: "Viewer", permissions: ["content.read"] },
  ];

  const onSelect = vi.fn();
  const onViewProfile = vi.fn();
  const onEdit = vi.fn();
  const onToggleStatus = vi.fn();
  const onResetPassword = vi.fn();
  const onDelete = vi.fn();

  const view = mount(
    <UserList
      items={users}
      roles={roles}
      selectedId="user-1"
      protectedIds={["user-1"]}
      onSelect={onSelect}
      onViewProfile={onViewProfile}
      onEdit={onEdit}
      onToggleStatus={onToggleStatus}
      onResetPassword={onResetPassword}
      onDelete={onDelete}
    />
  );

  try {
    const rows = Array.from(view.container.querySelectorAll("tr"));
    expect(rows[1]?.className).toContain("border-l-primary");
    expect(view.container.textContent).toContain("GH");
    expect(view.container.textContent).toContain("Admin");
    expect(view.container.textContent).toContain("Editor");
    expect(view.container.textContent).toContain("+1");
    expect(view.container.textContent).toContain("Last admin");
    expect(view.container.textContent).toContain("Active");
    expect(view.container.textContent).toContain("Inactive");

    click(rows[1]);
    expect(onSelect).toHaveBeenCalledWith("user-1");

    const viewProfileButtons = findButtonsByText(view.container, "View profile");
    const editButtons = findButtonsByText(view.container, "Edit user");
    const resetButtons = findButtonsByText(view.container, "Reset password");
    const deactivateButtons = findButtonsByText(view.container, "Deactivate user");
    const activateButtons = findButtonsByText(view.container, "Activate user");
    const deleteButtons = findButtonsByText(view.container, "Delete user");

    expect(deleteButtons[0]?.disabled).toBe(true);
    expect(deleteButtons[1]?.disabled).toBe(false);

    click(viewProfileButtons[0]);
    click(editButtons[0]);
    click(resetButtons[0]);
    click(deactivateButtons[0]);
    click(activateButtons[0]);
    click(deleteButtons[1]);

    expect(onViewProfile).toHaveBeenCalledWith(users[0]);
    expect(onEdit).toHaveBeenCalledWith(users[0]);
    expect(onResetPassword).toHaveBeenCalledWith(users[0]);
    expect(onToggleStatus).toHaveBeenNthCalledWith(1, users[0]);
    expect(onToggleStatus).toHaveBeenNthCalledWith(2, users[1]);
    expect(onDelete).toHaveBeenCalledWith(users[1]);
  } finally {
    view.cleanup();
  }
});

test("UserList read-only mode disables management actions and falls back to onSelect", async () => {
  const { UserList } = await import("../../../core/admin/ui/users/UserList");

  const user = {
    id: "user-3",
    name: "Observer",
    email: "observer@example.com",
    roleIds: ["custom"],
    status: "pending" as const,
    lastActive: "Unknown",
    mfaEnabled: false,
  };

  const onSelect = vi.fn();
  const onEdit = vi.fn();
  const onToggleStatus = vi.fn();
  const onResetPassword = vi.fn();
  const onDelete = vi.fn();

  const view = mount(
    <UserList
      items={[user]}
      roles={[]}
      canManageUsers={false}
      onSelect={onSelect}
      onEdit={onEdit}
      onToggleStatus={onToggleStatus}
      onResetPassword={onResetPassword}
      onDelete={onDelete}
    />
  );

  try {
    expect(view.container.textContent).toContain("custom");
    expect(view.container.textContent).toContain("Pending");

    click(findButtonsByText(view.container, "View profile")[0]);
    expect(onSelect).toHaveBeenCalledWith("user-3");

    for (const text of ["Edit user", "Reset password", "Deactivate user", "Delete user"]) {
      const button = findButtonsByText(view.container, text)[0];
      expect(button?.disabled).toBe(true);
    }

    expect(onEdit).not.toHaveBeenCalled();
    expect(onToggleStatus).not.toHaveBeenCalled();
    expect(onResetPassword).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("UserList hides raw role ids when role details are unavailable", async () => {
  const { UserList } = await import("../../../core/admin/ui/users/UserList");

  const user = {
    id: "user-4",
    name: "Partial Reader",
    email: "partial@example.com",
    roleIds: ["role-secret"],
    status: "active" as const,
    lastActive: "Today",
    mfaEnabled: false,
  };

  const view = mount(
    <UserList
      items={[user]}
      roles={[]}
      roleDetailsUnavailableReason="Role names require roles:read permission."
      onSelect={() => undefined}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onResetPassword={() => undefined}
      onDelete={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Role details unavailable");
    expect(view.container.textContent).not.toContain("role-secret");
  } finally {
    view.cleanup();
  }
});

test("UserList can disable role editing while keeping lifecycle writes available", async () => {
  const { UserList } = await import("../../../core/admin/ui/users/UserList");

  const user = {
    id: "user-5",
    name: "Lifecycle Writer",
    email: "lifecycle@example.com",
    roleIds: ["role-secret"],
    status: "active" as const,
    lastActive: "Today",
    mfaEnabled: false,
  };
  const onEdit = vi.fn();
  const onToggleStatus = vi.fn();
  const onDelete = vi.fn();

  const view = mount(
    <UserList
      items={[user]}
      roles={[]}
      canEditUsers={false}
      canManageUserLifecycle
      roleDetailsUnavailableReason="Role names require roles:read permission."
      onSelect={() => undefined}
      onEdit={onEdit}
      onToggleStatus={onToggleStatus}
      onResetPassword={() => undefined}
      onDelete={onDelete}
    />
  );

  try {
    const editButton = findButtonsByText(view.container, "Edit user")[0];
    const statusButton = findButtonsByText(view.container, "Deactivate user")[0];
    const deleteButton = findButtonsByText(view.container, "Delete user")[0];

    expect(editButton?.disabled).toBe(true);
    expect(statusButton?.disabled).toBe(false);
    expect(deleteButton?.disabled).toBe(false);

    click(editButton);
    click(statusButton);
    click(deleteButton);

    expect(onEdit).not.toHaveBeenCalled();
    expect(onToggleStatus).toHaveBeenCalledWith(user);
    expect(onDelete).toHaveBeenCalledWith(user);
  } finally {
    view.cleanup();
  }
});
