// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { AdminThemeTemplate } from "../../../core/admin/services/adminThemeClient";

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
    <div
      data-sheet-open={String(Boolean(open))}
      data-has-open-change={String(Boolean(onOpenChange))}
    >
      {children}
    </div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    disabled,
    rows,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
    rows?: number;
    placeholder?: string;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      disabled={disabled}
      rows={rows}
      placeholder={placeholder}
    />
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

const setInputValue = (
  element: HTMLInputElement | HTMLTextAreaElement | null | undefined,
  value: string
) => {
  if (!element) {
    throw new Error(`Missing input for value: ${value}`);
  }
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const findColorTextInputByLabel = (container: HTMLElement, labelText: string, index = 0) => {
  const labels = Array.from(container.querySelectorAll("label")).filter((element) =>
    element.textContent?.includes(labelText)
  );
  const label = labels[index];
  const inputs = label?.parentElement?.parentElement?.querySelectorAll("input");
  return (inputs?.[1] as HTMLInputElement | null | undefined) ?? null;
};

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  ) as HTMLInputElement | null | undefined;

const clickButtonByText = (container: HTMLElement, text: string) => {
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

const template = {
  id: "tpl-wave",
  name: "Studio",
  description: "Editorial palette",
  createdAt: "2026-04-20T00:00:00.000Z",
  updatedAt: "2026-04-20T00:00:00.000Z",
  tokens: {
    base: { bg: "#101010", surface: "#1b1b1b", border: "#303030", text: "#fafafa" },
    typography: {
      mutedText: "#b0b0b0",
      sans: "Inter",
      display: "Space Grotesk",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
    },
    buttons: {
      primary: { bg: "#fafafa", text: "#111111", hoverBg: "#e0e0e0", hoverText: "#111111" },
      secondary: { bg: "#262626", text: "#ededed", hoverBg: "#303030", hoverText: "#ffffff" },
      outline: { border: "#555555", text: "#f5f5f5", hoverBg: "#202020", hoverText: "#ffffff" },
      ghost: { hoverBg: "#2a2a2a", hoverText: "#ffffff" },
    },
    inputs: {
      bg: "#121212",
      border: "#3a3a3a",
      text: "#fafafa",
      placeholder: "#9a9a9a",
      focusRing: "#7dd3fc",
    },
    sidebar: {
      bg: "#161616",
      text: "#e5e5e5",
      activeBg: "#262626",
      activeText: "#ffffff",
      hoverBg: "#202020",
    },
    topbar: {
      bg: "#181818",
      text: "#f5f5f5",
      border: "#2d2d2d",
    },
    card: {
      bg: "#181818",
      border: "#2f2f2f",
    },
    state: {
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
    },
  },
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("ThemeTemplateDrawer saves focus ring and navigation token text-input updates", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn(async () => undefined);
  const view = mount(
    <ThemeTemplateDrawer
      open
      onOpenChange={() => undefined}
      template={template as AdminThemeTemplate}
      onSave={onSave}
    />
  );

  try {
    React.act(() => {
      setInputValue(findColorTextInputByLabel(view.container, "Focus Ring"), "123abc");
      setInputValue(findColorTextInputByLabel(view.container, "Sidebar Text"), "224466");
      setInputValue(findColorTextInputByLabel(view.container, "Active Background"), "335577");
      setInputValue(findColorTextInputByLabel(view.container, "Active Text"), "446688");
      setInputValue(findColorTextInputByLabel(view.container, "Hover Background"), "557799");
      setInputValue(findColorTextInputByLabel(view.container, "Top Bar Background"), "6688aa");
      setInputValue(findColorTextInputByLabel(view.container, "Top Bar Text"), "7799bb");
    });

    clickButtonByText(view.container, "Save Template");

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.objectContaining({
          inputs: expect.objectContaining({
            focusRing: "#123abc",
          }),
          sidebar: expect.objectContaining({
            text: "#224466",
            activeBg: "#335577",
            activeText: "#446688",
            hoverBg: "#557799",
          }),
          topbar: expect.objectContaining({
            bg: "#6688aa",
            text: "#7799bb",
          }),
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ThemeTemplateDrawer create mode tolerates missing onSave handler", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onOpenChange = vi.fn();
  const view = mount(<ThemeTemplateDrawer open onOpenChange={onOpenChange} />);

  try {
    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Admin Pro"), "No handler");
    });

    expect(() => clickButtonByText(view.container, "Create Template")).not.toThrow();

    clickButtonByText(view.container, "Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});
