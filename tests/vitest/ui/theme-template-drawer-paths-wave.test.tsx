// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import type { AdminThemeTemplate } from "../../../core/admin/services/adminThemeClient";
import type { AdminThemeTokens } from "../../../core/services/adminThemes/tokenTypes";
import {
  clickButtonByText,
  mount,
  setInputValue,
  templateTimestamps,
} from "./themeTemplateDrawerFixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Exact-label lookups avoid substring collisions among the state/navigation
// labels ("Info" vs "Info text" vs "Info soft", "Sidebar accent" vs
// "Sidebar accent text"). inputIndex 1 = the hex text field of a ColorField,
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

// The Accents/Navigation/States sections each have their own "Invert section"
// button. Scope the click to the section that owns a known field label so the
// right section is inverted.
const findInvertButtonInSection = (container: HTMLElement, fieldLabel: string) => {
  const label = Array.from(container.querySelectorAll("label")).find(
    (element) => element.textContent === fieldLabel
  );
  // label -> header flex div -> ColorField root -> grid -> section container.
  const section = label?.parentElement?.parentElement?.parentElement?.parentElement;
  return Array.from(section?.querySelectorAll("button") ?? []).find((button) =>
    button.textContent?.includes("Invert section")
  );
};

const findPreviewVar = (container: HTMLElement, cssVar: string) => {
  for (const element of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
    const value = element.style.getPropertyValue(cssVar);
    if (value) return value;
  }
  return "";
};

const fullTemplate = {
  id: "tpl-full",
  name: "Complete",
  description: "Every token group present",
  ...templateTimestamps,
  tokens: {
    base: { bg: "#101010", surface: "#1b1b1b", border: "#303030", text: "#fafafa" },
    primarySoft: { bg: "#f0f9ff", text: "#075985" },
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
      muted: "#9a9a9a",
      accent: "#7dd3fc",
      accentForeground: "#083344",
      border: "#2d2d2d",
    },
    topbar: { bg: "#181818", text: "#f5f5f5", border: "#2d2d2d" },
    card: { bg: "#181818", border: "#2f2f2f" },
    state: {
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
      info: "#0ea5e9",
      successForeground: "#052e16",
      warningForeground: "#451a03",
      dangerForeground: "#450a0a",
      infoForeground: "#082f49",
      successSoft: "#d1fae5",
      warningSoft: "#fef3c7",
      dangerSoft: "#fee2e2",
      infoSoft: "#e0f2fe",
    },
    effects: {
      shadowSoft: "0 1px 2px rgba(28, 25, 23, 0.04)",
      shadowCard: "0 1px 3px rgba(28, 25, 23, 0.05)",
      shadowPop: "0 10px 34px rgba(28, 25, 23, 0.24)",
    },
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("ThemeTemplateDrawer edits sidebar muted/accent-text/border, state foregrounds and softs, and shadows", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn<
    (input: { name: string; description: string; tokens: AdminThemeTokens }) => Promise<void>
  >(async () => undefined);
  const view = mount(
    <ThemeTemplateDrawer
      open
      onOpenChange={() => undefined}
      template={fullTemplate as AdminThemeTemplate}
      onSave={onSave}
    />
  );

  try {
    React.act(() => {
      // Cards: the background color path is only reachable via this field.
      setInputValue(findHexInput(view.container, "Card Background"), "1a1a1a");
      // Navigation additions: muted, accent text, border.
      setInputValue(findHexInput(view.container, "Sidebar muted"), "111111");
      setInputValue(findHexInput(view.container, "Sidebar accent text"), "222222");
      setInputValue(findHexInput(view.container, "Sidebar border"), "333333");
      // State foregrounds.
      setInputValue(findHexInput(view.container, "Success text"), "444444");
      setInputValue(findHexInput(view.container, "Warning text"), "555555");
      setInputValue(findHexInput(view.container, "Danger text"), "666666");
      setInputValue(findHexInput(view.container, "Info text"), "777777");
      // State softs.
      setInputValue(findHexInput(view.container, "Success soft"), "888888");
      setInputValue(findHexInput(view.container, "Warning soft"), "999999");
      setInputValue(findHexInput(view.container, "Info soft"), "aaaaaa");
      // Shadows.
      setInputValue(findShadowInput(view.container, "Shadow · soft"), "0 0 1px rgba(0, 0, 0, 0.1)");
      setInputValue(
        findShadowInput(view.container, "Shadow · card"),
        "0 2px 9px rgba(0, 0, 0, 0.2)"
      );
      setInputValue(
        findShadowInput(view.container, "Shadow · pop"),
        "0 20px 60px rgba(0, 0, 0, 0.3)"
      );
    });

    // Live preview vars reflect the edited values.
    expect(findPreviewVar(view.container, "--admin-sidebar-muted")).toBe("#111111");
    expect(findPreviewVar(view.container, "--admin-state-danger-foreground")).toBe("#666666");
    expect(findPreviewVar(view.container, "--admin-state-success-soft")).toBe("#888888");
    expect(findPreviewVar(view.container, "--admin-shadow-pop")).toBe(
      "0 20px 60px rgba(0, 0, 0, 0.3)"
    );

    clickButtonByText(view.container, "Save Template");

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0]?.[0] as unknown as { tokens: Record<string, unknown> };
    expect(payload.tokens).toMatchObject({
      card: { bg: "#1a1a1a" },
      sidebar: {
        muted: "#111111",
        accentForeground: "#222222",
        border: "#333333",
      },
      state: {
        successForeground: "#444444",
        warningForeground: "#555555",
        dangerForeground: "#666666",
        infoForeground: "#777777",
        successSoft: "#888888",
        warningSoft: "#999999",
        infoSoft: "#aaaaaa",
      },
      effects: {
        shadowSoft: "0 0 1px rgba(0, 0, 0, 0.1)",
        shadowCard: "0 2px 9px rgba(0, 0, 0, 0.2)",
        shadowPop: "0 20px 60px rgba(0, 0, 0, 0.3)",
      },
    });
  } finally {
    view.cleanup();
  }
});

test("ThemeTemplateDrawer inverts the soft-primary accents section", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn<
    (input: { name: string; description: string; tokens: AdminThemeTokens }) => Promise<void>
  >(async () => undefined);
  const view = mount(
    <ThemeTemplateDrawer
      open
      onOpenChange={() => undefined}
      template={fullTemplate as AdminThemeTemplate}
      onSave={onSave}
    />
  );

  try {
    React.act(() => {
      setInputValue(findHexInput(view.container, "Primary soft (bg)"), "abcdef");
      setInputValue(findHexInput(view.container, "Primary soft (text)"), "112233");
    });

    const invertAccents = findInvertButtonInSection(view.container, "Primary soft (bg)");
    if (!invertAccents) {
      throw new Error("Missing accents invert button");
    }
    React.act(() => {
      invertAccents.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Invert of #abcdef => #543210; of #112233 => #eeddcc.
    expect(findPreviewVar(view.container, "--admin-primary-soft")).toBe("#543210");
    expect(findPreviewVar(view.container, "--admin-primary-soft-text")).toBe("#eeddcc");

    clickButtonByText(view.container, "Save Template");

    const payload = onSave.mock.calls[0]?.[0] as unknown as { tokens: Record<string, unknown> };
    expect(payload.tokens).toMatchObject({
      primarySoft: { bg: "#543210", text: "#eeddcc" },
    });
  } finally {
    view.cleanup();
  }
});

test("ThemeTemplateDrawer leaves non-six-digit hex values unchanged when inverting", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn<
    (input: { name: string; description: string; tokens: AdminThemeTokens }) => Promise<void>
  >(async () => undefined);
  const view = mount(
    <ThemeTemplateDrawer
      open
      onOpenChange={() => undefined}
      template={fullTemplate as AdminThemeTemplate}
      onSave={onSave}
    />
  );

  try {
    // A four-digit hex text normalizes to "#abcd", which is not a valid
    // six-digit color; the invert guard must return it unchanged.
    React.act(() => {
      setInputValue(findHexInput(view.container, "Background"), "abcd");
    });

    clickButtonByText(view.container, "Invert section");
    clickButtonByText(view.container, "Save Template");

    const payload = onSave.mock.calls[0]?.[0] as unknown as { tokens: Record<string, unknown> };
    expect(payload.tokens).toMatchObject({
      base: { bg: "#abcd" },
    });
  } finally {
    view.cleanup();
  }
});
