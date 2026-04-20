// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    disabled,
    placeholder,
    className,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-sheet-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
    </div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string; disabled: boolean }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
            disabled: Boolean(child.props.disabled),
          },
        ];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
      disabled,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
      disabled?: boolean;
    }) => (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectValue: ({ children }: { children?: React.ReactNode; placeholder?: string }) => (
      <>{children ?? null}</>
    ),
  };
});

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
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return button;
};

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

afterEach(() => {
  vi.restoreAllMocks();
});

test("ThemeProfileDrawer create mode supports template selection, palette copy, save, and cancel", async () => {
  const { ThemeProfileDrawer } = await import(
    "../../../core/admin/ui/themes/ThemeProfileDrawer"
  );

  const clipboardWriteText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: clipboardWriteText },
    configurable: true,
  });

  const onOpenChange = vi.fn();
  const onSave = vi.fn(async () => undefined);
  const templates = [
    {
      id: "template-1",
      name: "Default Admin",
      description: null,
      tokens: {
        base: { bg: "#ffffff", surface: "#f8fafc", text: "#0f172a", border: "#e2e8f0" },
        buttons: {
          primary: { bg: "#1d4ed8", text: "#fff", hoverBg: "#1e40af", hoverText: "#fff" },
          secondary: { bg: "#0f766e", text: "#fff", hoverBg: "#115e59", hoverText: "#fff" },
          outline: { border: "#e2e8f0", text: "#0f172a", hoverBg: "#f1f5f9", hoverText: "#0f172a" },
          ghost: { hoverBg: "#f1f5f9", hoverText: "#0f172a" },
        },
        inputs: {
          bg: "#ffffff",
          border: "#e2e8f0",
          text: "#0f172a",
          placeholder: "#94a3b8",
          focusRing: "#1d4ed8",
        },
        typography: {
          mutedText: "#64748b",
          sans: "Inter",
          display: "Space Grotesk",
          sm: "0.875rem",
          md: "1rem",
          lg: "1.125rem",
          xl: "1.25rem",
          "2xl": "1.5rem",
        },
        sidebar: {
          bg: "#ffffff",
          text: "#64748b",
          activeBg: "#e0f2fe",
          activeText: "#1d4ed8",
          hoverBg: "#f1f5f9",
        },
        topbar: { bg: "#ffffff", text: "#64748b", border: "#e2e8f0" },
        card: { bg: "#ffffff", border: "#e2e8f0" },
        state: { success: "#16a34a", warning: "#f59e0b", danger: "#ef4444" },
      },
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "template-2",
      name: "Dark Admin",
      description: null,
      tokens: {
        base: { bg: "#111111", surface: "#1d1d1d", text: "#f5f5f5", border: "#2b2b2b" },
        buttons: {
          primary: { bg: "#fafafa", text: "#111111", hoverBg: "#d4d4d4", hoverText: "#111111" },
          secondary: { bg: "#2b2b2b", text: "#fafafa", hoverBg: "#3b3b3b", hoverText: "#ffffff" },
          outline: { border: "#444444", text: "#fafafa", hoverBg: "#2a2a2a", hoverText: "#ffffff" },
          ghost: { hoverBg: "#2a2a2a", hoverText: "#ffffff" },
        },
        inputs: {
          bg: "#111111",
          border: "#333333",
          text: "#fafafa",
          placeholder: "#9a9a9a",
          focusRing: "#7dd3fc",
        },
        typography: {
          mutedText: "#cbd5e1",
          sans: "Inter",
          display: "Space Grotesk",
          sm: "0.875rem",
          md: "1rem",
          lg: "1.125rem",
          xl: "1.25rem",
          "2xl": "1.5rem",
        },
        sidebar: {
          bg: "#111111",
          text: "#cbd5e1",
          activeBg: "#262626",
          activeText: "#ffffff",
          hoverBg: "#1d1d1d",
        },
        topbar: { bg: "#111111", text: "#fafafa", border: "#2b2b2b" },
        card: { bg: "#181818", border: "#2f2f2f" },
        state: { success: "#10b981", warning: "#f59e0b", danger: "#ef4444" },
      },
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
  ];

  const view = mount(
    <ThemeProfileDrawer
      open
      onOpenChange={onOpenChange}
      templates={templates}
      onSave={onSave}
    />
  );

  try {
    expect(view.container.textContent).toContain("New Profile");
    expect(view.container.textContent).toContain("Palette preview");

    const createButton = clickByText(view.container, "Create Profile");
    expect((createButton as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Neo Minimalist"), "Operations Dark");
      setInputValue(findInputByPlaceholder(view.container, "Short summary"), "Operations dashboard");
    });
    act(() => {
      const select = view.container.querySelector("select");
      setSelectValue(select ?? undefined, "template-2");
    });

    expect(view.container.textContent).toContain("Dark Admin");

    const swatchButton = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.getAttribute("title") === "#fafafa"
    );
    act(() => {
      swatchButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(clipboardWriteText).toHaveBeenCalledWith("#fafafa");

    clickByText(view.container, "Create Profile");
    expect(onSave).toHaveBeenCalledWith({
      name: "Operations Dark",
      description: "Operations dashboard",
      templateId: "template-2",
    });

    clickByText(view.container, "Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("ThemeProfileDrawer edit mode disables save while saving and handles no-template state", async () => {
  const { ThemeProfileDrawer } = await import(
    "../../../core/admin/ui/themes/ThemeProfileDrawer"
  );

  const onOpenChange = vi.fn();
  const profile = {
    id: "neo-minimalist",
    name: "Neo Minimalist",
    description: "Minimal layout.",
    templateId: "template-1",
    templateName: "Default Admin",
    palette: ["#0f172a"],
  };

  const emptyView = mount(
    <ThemeProfileDrawer
      open
      onOpenChange={onOpenChange}
      templates={[]}
      isSaving
      onSave={vi.fn()}
    />
  );

  try {
    expect(emptyView.container.textContent).toContain("No themes available");
    const saveButton = Array.from(emptyView.container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Saving...")
    ) as HTMLButtonElement | null | undefined;
    expect(saveButton?.disabled).toBe(true);
  } finally {
    emptyView.cleanup();
  }

  const onSave = vi.fn(async () => undefined);
  const templates = [
    {
      id: "template-1",
      name: "Default Admin",
      description: null,
      tokens: {
        base: { bg: "#ffffff", surface: "#f8fafc", text: "#0f172a", border: "#e2e8f0" },
        buttons: {
          primary: { bg: "#1d4ed8", text: "#fff", hoverBg: "#1e40af", hoverText: "#fff" },
          secondary: { bg: "#0f766e", text: "#fff", hoverBg: "#115e59", hoverText: "#fff" },
          outline: { border: "#e2e8f0", text: "#0f172a", hoverBg: "#f1f5f9", hoverText: "#0f172a" },
          ghost: { hoverBg: "#f1f5f9", hoverText: "#0f172a" },
        },
        inputs: {
          bg: "#ffffff",
          border: "#e2e8f0",
          text: "#0f172a",
          placeholder: "#94a3b8",
          focusRing: "#1d4ed8",
        },
        typography: {
          mutedText: "#64748b",
          sans: "Inter",
          display: "Space Grotesk",
          sm: "0.875rem",
          md: "1rem",
          lg: "1.125rem",
          xl: "1.25rem",
          "2xl": "1.5rem",
        },
        sidebar: {
          bg: "#ffffff",
          text: "#64748b",
          activeBg: "#e0f2fe",
          activeText: "#1d4ed8",
          hoverBg: "#f1f5f9",
        },
        topbar: { bg: "#ffffff", text: "#64748b", border: "#e2e8f0" },
        card: { bg: "#ffffff", border: "#e2e8f0" },
        state: { success: "#16a34a", warning: "#f59e0b", danger: "#ef4444" },
      },
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
  ];

  const editView = mount(
    <ThemeProfileDrawer
      open
      onOpenChange={onOpenChange}
      profile={profile}
      templates={templates}
      onSave={onSave}
    />
  );

  try {
    expect(editView.container.textContent).toContain("Edit Profile");
    expect(
      (findInputByPlaceholder(editView.container, "Neo Minimalist") as HTMLInputElement).value
    ).toBe("Neo Minimalist");
    expect(
      (findInputByPlaceholder(editView.container, "Short summary") as HTMLInputElement).value
    ).toBe("Minimal layout.");

    clickByText(editView.container, "Save Profile");
    expect(onSave).toHaveBeenCalledWith({
      name: "Neo Minimalist",
      description: "Minimal layout.",
      templateId: "template-1",
    });
  } finally {
    editView.cleanup();
  }
});
