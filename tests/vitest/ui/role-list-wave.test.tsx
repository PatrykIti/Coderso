// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <span {...props}>{children}</span>,
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

vi.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <div data-testid="role-card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardAction: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
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

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
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
  act(() => {
    element.click();
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

test("RoleList renders selected, protected, and actionable role states", async () => {
  const { RoleList } = await import("../../../core/admin/ui/roles/RoleList");

  const adminRole = {
    id: "admin",
    name: "Admin",
    description: "Full platform control",
    permissions: ["*"],
    system: true,
  };
  const editorRole = {
    id: "editor",
    name: "Editor",
    description: "Content operations",
    permissions: ["posts.read", "posts.write"],
    system: false,
  };

  const onSelect = vi.fn();
  const onEdit = vi.fn();
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();

  const view = mount(
    <RoleList
      roles={[adminRole, editorRole]}
      selectedId="editor"
      usageCounts={{ admin: 2, editor: 5 }}
      onSelect={onSelect}
      onEdit={onEdit}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    />
  );

  try {
    const cards = Array.from(view.container.querySelectorAll('[data-testid="role-card"]'));
    expect(cards).toHaveLength(2);
    expect(cards[1]?.className).toContain("border-primary/60");
    expect(view.container.textContent).toContain("Full access");
    expect(view.container.textContent).toContain("2 permissions");
    expect(view.container.textContent).toContain("5 assigned");
    expect(view.container.textContent).toContain("System role");

    click(cards[1]);
    expect(onSelect).toHaveBeenCalledWith("editor");

    const editButtons = findButtonsByText(view.container, "Edit role");
    const duplicateButtons = findButtonsByText(view.container, "Duplicate");
    const deleteButtons = findButtonsByText(view.container, "Delete role");
    const configureButtons = findButtonsByText(view.container, "Configure permissions");

    expect(deleteButtons[0]?.disabled).toBe(true);
    expect(deleteButtons[1]?.disabled).toBe(false);

    click(editButtons[1]);
    click(duplicateButtons[1]);
    click(deleteButtons[1]);
    click(configureButtons[1]);

    expect(onEdit).toHaveBeenNthCalledWith(1, editorRole);
    expect(onEdit).toHaveBeenNthCalledWith(2, editorRole);
    expect(onDuplicate).toHaveBeenCalledWith(editorRole);
    expect(onDelete).toHaveBeenCalledWith(editorRole);
  } finally {
    view.cleanup();
  }
});

test("RoleList disables management controls when canManageRoles is false", async () => {
  const { RoleList } = await import("../../../core/admin/ui/roles/RoleList");

  const analystRole = {
    id: "analyst",
    name: "Analyst",
    description: "Read-only reporting",
    permissions: ["reports.read"],
    system: false,
  };

  const onSelect = vi.fn();
  const onEdit = vi.fn();
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();

  const view = mount(
    <RoleList
      roles={[analystRole]}
      canManageRoles={false}
      onSelect={onSelect}
      onEdit={onEdit}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    />
  );

  try {
    expect(view.container.textContent).toContain("0 assigned");
    expect(view.container.textContent).toContain("Scoped access across admin modules and actions.");

    const cards = Array.from(view.container.querySelectorAll('[data-testid="role-card"]'));
    click(cards[0]);
    expect(onSelect).toHaveBeenCalledWith("analyst");

    for (const text of ["Edit role", "Duplicate", "Delete role", "Configure permissions"]) {
      const button = findButtonsByText(view.container, text)[0];
      expect(button?.disabled).toBe(true);
    }

    expect(onEdit).not.toHaveBeenCalled();
    expect(onDuplicate).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
