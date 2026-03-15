// @vitest-environment happy-dom

import React, { act } from "react";
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
      checked={Boolean(checked)}
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
    <div data-dialog-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
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
  }) => (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  ),
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

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string }> =>
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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

import { UserEditor } from "../../../core/admin/ui/users/UserEditor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roles = [
  {
    id: "admin",
    name: "Admin",
    description: "Full platform access.",
    permissions: ["*"],
  },
  {
    id: "editor",
    name: "Editor",
    description: "Content management",
    permissions: ["content.write", "content.publish"],
  },
  {
    id: "viewer",
    name: "Viewer",
    permissions: ["content.read"],
  },
];

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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input for value: ${value}`);
  }
  act(() => {
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
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing checkbox for checked=${String(checked)}`);
  }
  act(() => {
    if (element.checked !== checked) {
      element.click();
    }
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.click();
  });
  return button;
};

const findCheckboxByRoleLabel = (container: HTMLElement, labelText: string) =>
  Array.from(container.querySelectorAll("label")).find((label) =>
    label.textContent?.includes(labelText)
  )?.querySelector('input[type="checkbox"]');

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("UserEditor create mode updates draft, toggles invite, and saves selected roles", () => {
  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <UserEditor open roles={roles} onOpenChange={onOpenChange} onSave={onSave} />
  );

  try {
    expect(view.container.textContent).toContain("Invite new user");
    expect(view.container.textContent).toContain("0 selected");
    expect(view.container.textContent).toContain("Send invite email");

    const saveButton = clickByText(view.container, "Invite user");
    expect(saveButton.disabled).toBe(true);

    act(() => {
      setInputValue(view.container.querySelector('input[placeholder="Full name"]'), "Ada Lovelace");
      setInputValue(
        view.container.querySelector('input[placeholder="name@company.com"]'),
        "ada@example.com"
      );
      setSelectValue(view.container.querySelector("select"), "pending");
      setCheckboxValue(findCheckboxByRoleLabel(view.container, "Admin"), true);
      setCheckboxValue(findCheckboxByRoleLabel(view.container, "Viewer"), true);
    });

    const checkboxes = Array.from(
      view.container.querySelectorAll('input[type="checkbox"]')
    ) as HTMLInputElement[];
    expect(checkboxes.at(-1)?.checked).toBe(true);

    act(() => {
      setCheckboxValue(checkboxes.at(-1), false);
    });

    clickByText(view.container, "Invite user");

    expect(onSave).toHaveBeenCalledWith(
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        roleIds: ["admin", "viewer"],
        status: "pending",
      },
      "create"
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("UserEditor edit mode protects locked roles, updates status, and saves remaining selection", () => {
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
        status: "inactive",
      }}
      roles={roles}
      lockedRoleIds={["admin"]}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  );

  try {
    expect(view.container.textContent).toContain("Edit user");
    expect(view.container.textContent).not.toContain("Send invite email");
    expect(view.container.textContent).toContain("Primary admin protected");
    expect(view.container.textContent).toContain("2 selected");

    const adminCheckbox = findCheckboxByRoleLabel(view.container, "Admin");
    const editorCheckbox = findCheckboxByRoleLabel(view.container, "Editor");

    expect((adminCheckbox as HTMLInputElement | null)?.disabled).toBe(true);
    expect((editorCheckbox as HTMLInputElement | null)?.checked).toBe(true);

    act(() => {
      setSelectValue(view.container.querySelector("select"), "active");
      setCheckboxValue(editorCheckbox, false);
    });

    clickByText(view.container, "Save changes");

    expect(onSave).toHaveBeenCalledWith(
      {
        name: "Grace Hopper",
        email: "grace@example.com",
        roleIds: ["admin"],
        status: "active",
      },
      "edit"
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("UserEditor read-only mode disables controls but still allows closing", () => {
  const onOpenChange = vi.fn();
  const onSave = vi.fn();

  const view = mount(
    <UserEditor
      open
      user={{
        id: "user-2",
        name: "Read Only",
        email: "readonly@example.com",
        roleIds: ["viewer"],
        status: "active",
      }}
      roles={roles}
      canManageUsers={false}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  );

  try {
    const inputs = Array.from(view.container.querySelectorAll("input")) as HTMLInputElement[];
    expect(inputs.every((input) => input.disabled)).toBe(true);

    const statusSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    expect(statusSelect?.disabled).toBe(true);

    const saveButton = clickByText(view.container, "Save changes");
    expect(saveButton.disabled).toBe(true);
    expect(onSave).not.toHaveBeenCalled();

    clickByText(view.container, "Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});
