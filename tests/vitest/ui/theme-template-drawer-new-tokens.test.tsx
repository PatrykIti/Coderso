// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { AdminThemeTemplate } from "../../../core/admin/services/adminThemeClient";
import { assertAdminThemeTokens } from "../../../core/services/adminThemes/tokenValidation";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mirror the repo idiom (see theme-template-drawer-wave.test.tsx): mock the
// shared primitives so the drawer renders flat under happy-dom. The Tabs mock
// renders ALL tab panels, so the new "Accents" tab + the Navigation/States
// additions are visible without driving Radix tab activation.
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
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

// Exact-label lookup avoids the substring collisions among the new state labels
// (e.g. "Info" vs "Info text" vs "Info soft", "Sidebar accent" vs
// "Sidebar accent text"). `inputIndex` 1 = the hex text field of a ColorField,
// 0 = the single field of a TextField (shadows).
const findInputByLabel = (container: HTMLElement, labelText: string, inputIndex: number) => {
  const label = Array.from(container.querySelectorAll("label")).find(
    (element) => element.textContent === labelText
  );
  const inputs = label?.parentElement?.parentElement?.querySelectorAll("input");
  return (inputs?.[inputIndex] as HTMLInputElement | null | undefined) ?? null;
};

const findHexInput = (container: HTMLElement, labelText: string) =>
  findInputByLabel(container, labelText, 1);

const findShadowInput = (container: HTMLElement, labelText: string) =>
  findInputByLabel(container, labelText, 0);

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

const findPreviewVar = (container: HTMLElement, cssVar: string) => {
  for (const element of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
    const value = element.style.getPropertyValue(cssVar);
    if (value) return value;
  }
  return "";
};

// A LEGACY template lacking every group added by TASK-479-05-L02 (no
// primarySoft / effects / new sidebar / new state keys). The drawer must
// back-fill these via mergeAdminThemeTokens at init, render the new pickers,
// and persist a COMPLETE token object.
const legacyTemplate = {
  id: "tpl-legacy",
  name: "Legacy",
  description: "Pre-479-05 export",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
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
    topbar: { bg: "#181818", text: "#f5f5f5", border: "#2d2d2d" },
    card: { bg: "#181818", border: "#2f2f2f" },
    state: { success: "#10b981", warning: "#f59e0b", danger: "#ef4444" },
  },
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("ThemeTemplateDrawer surfaces every new TASK-479-05 picker", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const view = mount(<ThemeTemplateDrawer open onOpenChange={() => undefined} />);

  try {
    const labels = Array.from(view.container.querySelectorAll("label")).map(
      (element) => element.textContent
    );
    // Accents tab.
    expect(labels).toContain("Primary soft (bg)");
    expect(labels).toContain("Primary soft (text)");
    expect(labels).toContain("Shadow · soft");
    expect(labels).toContain("Shadow · card");
    expect(labels).toContain("Shadow · pop");
    // Navigation tab additions.
    expect(labels).toContain("Sidebar muted");
    expect(labels).toContain("Sidebar accent");
    expect(labels).toContain("Sidebar accent text");
    expect(labels).toContain("Sidebar border");
    // States tab additions.
    expect(labels).toContain("Info");
    expect(labels).toContain("Info text");
    expect(labels).toContain("Success text");
    expect(labels).toContain("Warning text");
    expect(labels).toContain("Danger text");
    expect(labels).toContain("Success soft");
    expect(labels).toContain("Warning soft");
    expect(labels).toContain("Info soft");

    // The new "Accents" tab trigger is present.
    const triggers = Array.from(view.container.querySelectorAll("button")).map(
      (element) => element.textContent
    );
    expect(triggers).toContain("Accents");
  } finally {
    view.cleanup();
  }
});

test("editing the new pickers updates the live preview var and the saved tokens", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn(async (_payload: { tokens: Record<string, unknown> }) => undefined);
  const view = mount(
    <ThemeTemplateDrawer
      open
      onOpenChange={() => undefined}
      template={legacyTemplate as AdminThemeTemplate}
      onSave={onSave}
    />
  );

  try {
    React.act(() => {
      setInputValue(findHexInput(view.container, "Primary soft (bg)"), "abcdef");
      setInputValue(findHexInput(view.container, "Sidebar accent"), "112233");
      setInputValue(findHexInput(view.container, "Info"), "445566");
      setInputValue(findHexInput(view.container, "Info soft"), "778899");
      setInputValue(findHexInput(view.container, "Danger text"), "001122");
      setInputValue(
        findShadowInput(view.container, "Shadow · card"),
        "0 2px 9px rgba(0, 0, 0, 0.2)"
      );
    });

    // Live preview: the per-tab PreviewPanel spreads toAdminThemeCssVariableMap,
    // so the new primary-soft value is painted onto the preview surface var.
    expect(findPreviewVar(view.container, "--admin-primary-soft")).toBe("#abcdef");
    expect(findPreviewVar(view.container, "--admin-state-info-soft")).toBe("#778899");

    clickButtonByText(view.container, "Save Template");

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0]?.[0] as {
      tokens: Record<string, unknown>;
    };

    expect(payload.tokens).toMatchObject({
      primarySoft: expect.objectContaining({ bg: "#abcdef" }),
      sidebar: expect.objectContaining({ accent: "#112233" }),
      state: expect.objectContaining({
        info: "#445566",
        infoSoft: "#778899",
        dangerForeground: "#001122",
      }),
      effects: expect.objectContaining({
        shadowCard: "0 2px 9px rgba(0, 0, 0, 0.2)",
      }),
    });

    // The saved object is a COMPLETE shape that passes the strict write-path
    // validator (back-filled groups + the edited new fields), proving an old
    // export without the new groups does not crash the editor.
    expect(() => assertAdminThemeTokens(payload.tokens)).not.toThrow();
  } finally {
    view.cleanup();
  }
});
