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

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
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

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const findColorInputs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("input[type='color']")) as HTMLInputElement[];

const clickButtonByText = (container: HTMLElement, text: string) => {
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

test("ThemeTemplateDrawer create mode updates tokens, inverts base colors, saves, and cancels", async () => {
  const { ThemeTemplateDrawer } = await import(
    "../../../core/admin/ui/themes/ThemeTemplateDrawer"
  );

  const onOpenChange = vi.fn();
  const onSave = vi.fn(async () => undefined);
  const view = mount(
    <ThemeTemplateDrawer open onOpenChange={onOpenChange} onSave={onSave} />
  );

  try {
    expect(view.container.textContent).toContain("New Theme Template");
    expect(view.container.textContent).toContain("Theme tokens");

    const createButton = clickButtonByText(view.container, "Create Template");
    expect((createButton as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Admin Pro"), "Admin Pro");
      setInputValue(findInputByPlaceholder(view.container, "Short summary"), "Primary admin theme");
    });

    const colorInputs = Array.from(
      view.container.querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    act(() => {
      setInputValue(colorInputs[0], "#123456");
    });

    clickButtonByText(view.container, "Invert section");
    clickButtonByText(view.container, "Create Template");

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Admin Pro",
        description: "Primary admin theme",
        tokens: expect.objectContaining({
          base: expect.objectContaining({
            bg: "#edcba9",
          }),
        }),
      })
    );

    clickButtonByText(view.container, "Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("ThemeTemplateDrawer edit mode renders template values and respects saving state", async () => {
  const { ThemeTemplateDrawer } = await import(
    "../../../core/admin/ui/themes/ThemeTemplateDrawer"
  );

  const onOpenChange = vi.fn();
  const template = {
    id: "tpl-1",
    name: "Studio",
    description: "Editorial palette",
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
        secondary: { bg: "#262626", text: "#fafafa", hoverBg: "#303030", hoverText: "#ffffff" },
        outline: { border: "#555555", text: "#fafafa", hoverBg: "#202020", hoverText: "#ffffff" },
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

  const view = mount(
    <ThemeTemplateDrawer
      open
      onOpenChange={onOpenChange}
      template={template}
      isSaving
      onSave={vi.fn()}
    />
  );

  try {
    expect(view.container.textContent).toContain("Edit Theme Template");
    expect(view.container.textContent).toContain("Saving...");

    const saveButton = Array.from(view.container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Saving...")
    );
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    const nameInput = findInputByPlaceholder(view.container, "Admin Pro") as HTMLInputElement;
    const descriptionInput = findInputByPlaceholder(
      view.container,
      "Short summary"
    ) as HTMLInputElement;

    expect(nameInput.value).toBe("Studio");
    expect(descriptionInput.value).toBe("Editorial palette");
    expect(nameInput.disabled).toBe(true);
    expect(descriptionInput.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("ThemeTemplateDrawer edit mode updates tokens across typography, buttons, inputs, navigation, cards, and states", async () => {
  const { ThemeTemplateDrawer } = await import(
    "../../../core/admin/ui/themes/ThemeTemplateDrawer"
  );

  const onOpenChange = vi.fn();
  const onSave = vi.fn(async () => undefined);
  const template = {
    id: "tpl-2",
    name: "Editorial",
    description: "Editorial palette",
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

  const view = mount(
    <ThemeTemplateDrawer
      open
      onOpenChange={onOpenChange}
      template={template}
      onSave={onSave}
    />
  );

  try {
    const colorInputs = findColorInputs(view.container);

    act(() => {
      setInputValue(
        findInputByPlaceholder(
          view.container,
          '"IBM Plex Sans", Arial, sans-serif'
        ),
        '"Work Sans", Arial, sans-serif'
      );
      setInputValue(
        findInputByPlaceholder(
          view.container,
          '"Space Grotesk", Arial, sans-serif'
        ),
        '"Archivo Black", Arial, sans-serif'
      );
      setInputValue(
        findInputByPlaceholder(view.container, "1.5rem"),
        "1.75rem"
      );
      setInputValue(colorInputs[5], "#123456");
      setInputValue(colorInputs[19], "#224466");
      setInputValue(colorInputs[24], "#335577");
      setInputValue(colorInputs[30], "#446688");
      setInputValue(colorInputs[32], "#55aa77");
    });

    const invertButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (candidate) => candidate.textContent?.includes("Invert section")
    );

    act(() => {
      invertButtons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[3]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[4]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[5]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[6]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    clickButtonByText(view.container, "Save Template");

    const payload = onSave.mock.calls[0]?.[0];
    expect(payload.name).toBe("Editorial");
    expect(payload.description).toBe("Editorial palette");
    expect(payload.tokens.typography).toEqual(
      expect.objectContaining({
        sans: '"Work Sans", Arial, sans-serif',
        display: '"Archivo Black", Arial, sans-serif',
        "2xl": "1.75rem",
        mutedText: "#4f4f4f",
      })
    );
    expect(payload.tokens.buttons.primary.bg).not.toBe(template.tokens.buttons.primary.bg);
    expect(payload.tokens.inputs.bg).not.toBe(template.tokens.inputs.bg);
    expect(payload.tokens.sidebar.bg).not.toBe(template.tokens.sidebar.bg);
    expect(payload.tokens.card.bg).not.toBe(template.tokens.card.bg);
    expect(payload.tokens.state.success).not.toBe(template.tokens.state.success);
  } finally {
    view.cleanup();
  }
});
