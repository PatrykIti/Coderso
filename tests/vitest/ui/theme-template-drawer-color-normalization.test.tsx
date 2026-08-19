// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import type { AdminThemeTemplate } from "../../../core/admin/services/adminThemeClient";
import {
  clickButtonByText,
  findColorTextInputByLabel,
  mount,
  setInputValue,
  templateTimestamps,
} from "./themeTemplateDrawerFixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
});

test("ThemeTemplateDrawer normalizes text-entered color values without hash prefixes", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn(async () => undefined);
  const template = {
    id: "tpl-4",
    name: "Signal",
    description: "Signal palette",
    ...templateTimestamps,
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
      onOpenChange={() => undefined}
      template={template as AdminThemeTemplate}
      onSave={onSave}
    />
  );

  try {
    React.act(() => {
      setInputValue(findColorTextInputByLabel(view.container, "Background"), "112233");
      setInputValue(findColorTextInputByLabel(view.container, "Muted Text"), "445566");
      setInputValue(findColorTextInputByLabel(view.container, "Placeholder"), "778899");
      setInputValue(findColorTextInputByLabel(view.container, "Top Bar Border"), "aabbcc");
      setInputValue(findColorTextInputByLabel(view.container, "Card Border"), "ccddee");
      setInputValue(findColorTextInputByLabel(view.container, "Danger"), "ee1122");
    });

    clickButtonByText(view.container, "Save Template");

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.objectContaining({
          base: expect.objectContaining({
            bg: "#112233",
          }),
          typography: expect.objectContaining({
            mutedText: "#445566",
          }),
          inputs: expect.objectContaining({
            placeholder: "#778899",
          }),
          topbar: expect.objectContaining({
            border: "#aabbcc",
          }),
          card: expect.objectContaining({
            border: "#ccddee",
          }),
          state: expect.objectContaining({
            danger: "#ee1122",
          }),
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ThemeTemplateDrawer normalizes blank and invalid color text inputs while preserving hashed values", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn(async () => undefined);
  const template = {
    id: "tpl-5",
    name: "Terminal",
    description: "Terminal palette",
    ...templateTimestamps,
    tokens: {
      base: { bg: "#111111", surface: "#222222", border: "#333333", text: "#eeeeee" },
      typography: {
        mutedText: "#999999",
        sans: "IBM Plex Sans",
        display: "IBM Plex Mono",
        sm: "0.875rem",
        md: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      buttons: {
        primary: { bg: "#fafafa", text: "#111111", hoverBg: "#d4d4d4", hoverText: "#111111" },
        secondary: { bg: "#2a2a2a", text: "#f5f5f5", hoverBg: "#303030", hoverText: "#ffffff" },
        outline: { border: "#555555", text: "#f5f5f5", hoverBg: "#202020", hoverText: "#ffffff" },
        ghost: { hoverBg: "#1f1f1f", hoverText: "#ffffff" },
      },
      inputs: {
        bg: "#151515",
        border: "#3a3a3a",
        text: "#fafafa",
        placeholder: "#888888",
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
      onOpenChange={() => undefined}
      template={template as AdminThemeTemplate}
      onSave={onSave}
    />
  );

  try {
    React.act(() => {
      setInputValue(findColorTextInputByLabel(view.container, "Background"), "");
      setInputValue(findColorTextInputByLabel(view.container, "Surface"), "zzzzzz");
      setInputValue(findColorTextInputByLabel(view.container, "Border"), "#abcdef");
    });

    clickButtonByText(view.container, "Invert section");
    clickButtonByText(view.container, "Save Template");

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.objectContaining({
          base: expect.objectContaining({
            bg: "#ffffff",
            surface: "#zzzzzz",
            border: "#543210",
          }),
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});
