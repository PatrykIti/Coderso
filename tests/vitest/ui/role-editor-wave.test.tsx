// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: () => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => onCheckedChange?.()}
    />
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
    <div
      data-dialog-open={String(Boolean(open))}
      data-has-open-change={String(Boolean(onOpenChange))}
    >
      {open ? children : null}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    disabled,
    placeholder,
    rows,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
    placeholder?: string;
    rows?: number;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
    />
  ),
}));

import { RoleEditor } from "../../../core/admin/ui/roles/RoleEditor";

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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input for ${value}`);
  }
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing textarea for ${value}`);
  }
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("RoleEditor create mode uses fallback catalog, select-all full access, and saves wildcard permissions", () => {
  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <RoleEditor open onOpenChange={onOpenChange} onSave={onSave} permissionGroups={[]} />
  );

  try {
    expect(view.container.textContent).toContain("Create new role");
    expect(view.container.textContent).toContain("Content");
    expect(view.container.textContent).toContain("Backups");
    expect(view.container.textContent).toContain("0 selected");

    setInputValue(view.container.querySelector('input[placeholder="Editor"]'), "Ops");
    setTextareaValue(
      view.container.querySelector('textarea[placeholder="Short summary of responsibilities"]'),
      "Operations role"
    );

    clickByText(view.container, "Select all");
    expect(onSave).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Confirm full access");
    expect(view.container.textContent).toContain("Full access will grant");
    expect(view.container.textContent).toContain("0 selected");

    clickByText(view.container, "Keep current permissions");
    expect(view.container.textContent).not.toContain("Full access enabled");
    expect(view.container.textContent).toContain("0 selected");

    clickByText(view.container, "Select all");
    clickByText(view.container, "Confirm high-risk change");
    expect(view.container.textContent).toContain("Full access");
    expect(view.container.textContent).toContain("Full access enabled");

    clickByText(view.container, "Create role");

    expect(onSave).toHaveBeenCalledWith(
      {
        name: "Ops",
        description: "Operations role",
        permissions: ["*"],
      },
      "create"
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("RoleEditor confirms high-risk permission grants before mutating the draft", () => {
  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <RoleEditor
      open
      onOpenChange={onOpenChange}
      onSave={onSave}
      permissionGroups={[
        {
          id: "custom",
          label: "Custom",
          permissions: [
            { id: "content:read", label: "Read content" },
            { id: "roles:write", label: "Manage roles" },
          ],
        },
      ]}
    />
  );

  try {
    setInputValue(view.container.querySelector('input[placeholder="Editor"]'), "Security");

    const checkboxes = Array.from(
      view.container.querySelectorAll('input[type="checkbox"]')
    ) as HTMLInputElement[];
    React.act(() => {
      checkboxes[1]?.click();
    });

    expect(view.container.textContent).toContain("Confirm high-risk permissions");
    expect(view.container.textContent).toContain("High-risk permissions: roles:write.");
    expect(view.container.textContent).toContain("0 selected");

    clickByText(view.container, "Create role");
    expect(onSave).not.toHaveBeenCalled();

    clickByText(view.container, "Keep current permissions");
    expect(view.container.textContent).toContain("0 selected");

    const retryCheckboxes = Array.from(
      view.container.querySelectorAll('input[type="checkbox"]')
    ) as HTMLInputElement[];
    React.act(() => {
      retryCheckboxes[1]?.click();
    });
    clickByText(view.container, "Confirm high-risk change");
    expect(view.container.textContent).toContain("1 selected");

    clickByText(view.container, "Create role");

    expect(onSave).toHaveBeenCalledWith(
      {
        name: "Security",
        description: "",
        permissions: ["roles:write"],
      },
      "create"
    );
  } finally {
    view.cleanup();
  }
});

test("RoleEditor does not re-prompt for low-risk edits after confirmed high-risk grant", () => {
  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <RoleEditor
      open
      onOpenChange={onOpenChange}
      onSave={onSave}
      permissionGroups={[
        {
          id: "custom",
          label: "Custom",
          permissions: [
            { id: "content:read", label: "Read content" },
            { id: "content:write", label: "Write content" },
            { id: "roles:write", label: "Manage roles" },
          ],
        },
      ]}
    />
  );

  try {
    setInputValue(view.container.querySelector('input[placeholder="Editor"]'), "Security");

    let checkboxes = Array.from(
      view.container.querySelectorAll('input[type="checkbox"]')
    ) as HTMLInputElement[];
    React.act(() => {
      checkboxes[2]?.click();
    });
    clickByText(view.container, "Confirm high-risk change");

    checkboxes = Array.from(
      view.container.querySelectorAll('input[type="checkbox"]')
    ) as HTMLInputElement[];
    React.act(() => {
      checkboxes[0]?.click();
    });

    expect(view.container.textContent).not.toContain("Confirm high-risk permissions");
    expect(view.container.textContent).toContain("2 selected");

    clickByText(view.container, "Create role");
    expect(onSave).toHaveBeenCalledWith(
      {
        name: "Security",
        description: "",
        permissions: ["roles:write", "content:read"],
      },
      "create"
    );
  } finally {
    view.cleanup();
  }
});

test("RoleEditor edit mode clears full access, toggles specific permissions, and saves explicit permission ids", () => {
  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <RoleEditor
      open
      onOpenChange={onOpenChange}
      onSave={onSave}
      role={{
        id: "role-1",
        name: "Admins",
        description: "Admin role",
        permissions: ["*"],
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain("Edit role");
    expect(view.container.textContent).toContain("Full access");

    clickByText(view.container, "Clear");
    expect(view.container.textContent).toContain("0 selected");
    expect(view.container.textContent).not.toContain("Full access enabled");

    const firstEnabledCheckbox = Array.from(
      view.container.querySelectorAll('input[type="checkbox"]')
    ).find((checkbox) => !(checkbox as HTMLInputElement).disabled) as
      | HTMLInputElement
      | null
      | undefined;
    if (!firstEnabledCheckbox) {
      throw new Error("Missing permission checkbox");
    }

    React.act(() => {
      firstEnabledCheckbox.click();
    });
    clickByText(view.container, "Save role");

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Admins",
        description: "Admin role",
        permissions: ["content:read"],
      }),
      "edit"
    );
  } finally {
    view.cleanup();
  }
});

test("RoleEditor respects canManageRoles=false and keeps controls inert", () => {
  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <RoleEditor
      open
      canManageRoles={false}
      onOpenChange={onOpenChange}
      onSave={onSave}
      role={{
        id: "role-2",
        name: "Editors",
        description: "Editorial role",
        permissions: ["content:write"],
      }}
    />
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const selectAll = buttons.find((button) => button.textContent?.includes("Select all"));
    const clear = buttons.find((button) => button.textContent?.includes("Clear"));
    const save = buttons.find((button) => button.textContent?.includes("Save role"));

    expect((selectAll as HTMLButtonElement | null | undefined)?.disabled).toBe(true);
    expect((clear as HTMLButtonElement | null | undefined)?.disabled).toBe(true);
    expect((save as HTMLButtonElement | null | undefined)?.disabled).toBe(true);

    React.act(() => {
      (selectAll as HTMLButtonElement | null | undefined)?.click();
      (clear as HTMLButtonElement | null | undefined)?.click();
      (save as HTMLButtonElement | null | undefined)?.click();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});
