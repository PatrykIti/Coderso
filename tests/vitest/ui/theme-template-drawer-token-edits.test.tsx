// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import type { AdminThemeTemplate } from "../../../core/admin/services/adminThemeClient";
import {
  clickButtonByText,
  findColorInputByLabel,
  findColorInputs,
  findColorTextInputByLabel,
  findInputByPlaceholder,
  mount,
  setInputValue,
  templateTimestamps,
} from "./themeTemplateDrawerFixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
});

test("ThemeTemplateDrawer create mode updates tokens, inverts base colors, saves, and cancels", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onOpenChange = vi.fn();
  const onSave = vi.fn(async () => undefined);
  const view = mount(<ThemeTemplateDrawer open onOpenChange={onOpenChange} onSave={onSave} />);

  try {
    expect(view.container.textContent).toContain("New Theme Template");
    expect(view.container.textContent).toContain("Theme tokens");

    const createButton = clickButtonByText(view.container, "Create Template");
    expect((createButton as HTMLButtonElement).disabled).toBe(true);

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Admin Pro"), "Admin Pro");
      setInputValue(findInputByPlaceholder(view.container, "Short summary"), "Primary admin theme");
    });

    const colorInputs = Array.from(
      view.container.querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    React.act(() => {
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
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onOpenChange = vi.fn();
  const template = {
    id: "tpl-1",
    name: "Studio",
    description: "Editorial palette",
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
      template={template as AdminThemeTemplate}
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
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onOpenChange = vi.fn();
  const onSave = vi.fn(async () => undefined);
  const template = {
    id: "tpl-2",
    name: "Editorial",
    description: "Editorial palette",
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
      onOpenChange={onOpenChange}
      template={template as AdminThemeTemplate}
      onSave={onSave}
    />
  );

  try {
    const colorInputs = findColorInputs(view.container);

    React.act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, '"IBM Plex Sans", Arial, sans-serif'),
        '"Work Sans", Arial, sans-serif'
      );
      setInputValue(
        findInputByPlaceholder(view.container, '"Space Grotesk", Arial, sans-serif'),
        '"Archivo Black", Arial, sans-serif'
      );
      setInputValue(findInputByPlaceholder(view.container, "1.5rem"), "1.75rem");
      setInputValue(colorInputs[5], "#123456");
      setInputValue(colorInputs[19], "#224466");
      setInputValue(colorInputs[24], "#335577");
      setInputValue(colorInputs[30], "#446688");
      setInputValue(colorInputs[32], "#55aa77");
    });

    const invertButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (candidate) => candidate.textContent?.includes("Invert section")
    );

    React.act(() => {
      invertButtons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[3]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[4]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[5]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      invertButtons[6]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    clickButtonByText(view.container, "Save Template");

    const payload = (
      onSave.mock.calls as unknown as Array<
        [{ name?: string; description?: string | null; tokens: typeof template.tokens }]
      >
    )[0]?.[0];
    if (!payload) throw new Error("missing_template_payload");
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

test("ThemeTemplateDrawer updates top bar, card, and state color tokens", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn(async () => undefined);
  const template = {
    id: "tpl-3",
    name: "Studio",
    description: "Admin palette",
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
      setInputValue(findColorInputByLabel(view.container, "Top Bar Border"), "#112233");
      setInputValue(findColorInputByLabel(view.container, "Card Border"), "#223344");
      setInputValue(findColorInputByLabel(view.container, "Success"), "#11aa22");
      setInputValue(findColorInputByLabel(view.container, "Warning"), "#ccaa11");
      setInputValue(findColorInputByLabel(view.container, "Danger"), "#cc1122");
    });

    clickButtonByText(view.container, "Save Template");

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.objectContaining({
          topbar: expect.objectContaining({
            border: "#112233",
          }),
          card: expect.objectContaining({
            border: "#223344",
          }),
          state: expect.objectContaining({
            success: "#11aa22",
            warning: "#ccaa11",
            danger: "#cc1122",
          }),
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ThemeTemplateDrawer updates remaining typography, button, and input token callbacks", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn(async () => undefined);
  const template = {
    id: "tpl-6",
    name: "Contrast",
    description: "High contrast admin palette",
    ...templateTimestamps,
    tokens: {
      base: { bg: "#111111", surface: "#1f1f1f", border: "#333333", text: "#eeeeee" },
      typography: {
        mutedText: "#999999",
        sans: "IBM Plex Sans",
        display: "IBM Plex Serif",
        sm: "0.875rem",
        md: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      buttons: {
        primary: { bg: "#f4f4f5", text: "#101010", hoverBg: "#d4d4d8", hoverText: "#111111" },
        secondary: { bg: "#27272a", text: "#f4f4f5", hoverBg: "#3f3f46", hoverText: "#ffffff" },
        outline: { border: "#52525b", text: "#f4f4f5", hoverBg: "#18181b", hoverText: "#ffffff" },
        ghost: { hoverBg: "#27272a", hoverText: "#fafafa" },
      },
      inputs: {
        bg: "#171717",
        border: "#404040",
        text: "#fafafa",
        placeholder: "#737373",
        focusRing: "#38bdf8",
      },
      sidebar: {
        bg: "#18181b",
        text: "#e4e4e7",
        activeBg: "#27272a",
        activeText: "#ffffff",
        hoverBg: "#3f3f46",
      },
      topbar: {
        bg: "#09090b",
        text: "#f4f4f5",
        border: "#27272a",
      },
      card: {
        bg: "#111827",
        border: "#374151",
      },
      state: {
        success: "#22c55e",
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
    const colorInputs = findColorInputs(view.container);

    React.act(() => {
      setInputValue(colorInputs[3], "#010203");
      setInputValue(findInputByPlaceholder(view.container, "0.875rem"), "0.9375rem");
      setInputValue(findInputByPlaceholder(view.container, "1rem"), "1.0625rem");
      setInputValue(findInputByPlaceholder(view.container, "1.125rem"), "1.1875rem");
      setInputValue(findInputByPlaceholder(view.container, "1.25rem"), "1.375rem");
      setInputValue(colorInputs[6], "#111122");
      setInputValue(colorInputs[7], "#222233");
      setInputValue(colorInputs[8], "#333344");
      setInputValue(colorInputs[9], "#444455");
      setInputValue(colorInputs[10], "#555566");
      setInputValue(colorInputs[11], "#666677");
      setInputValue(colorInputs[12], "#777788");
      setInputValue(colorInputs[13], "#888899");
      setInputValue(colorInputs[14], "#9999aa");
      setInputValue(colorInputs[15], "#aaaabb");
      setInputValue(colorInputs[16], "#bbbbcc");
      setInputValue(colorInputs[17], "#ccccdd");
      setInputValue(colorInputs[18], "#ddddee");
      setInputValue(colorInputs[20], "#123123");
      setInputValue(colorInputs[21], "#234234");
      setInputValue(colorInputs[22], "#345345");
      setInputValue(colorInputs[23], "#456456");
    });

    clickButtonByText(view.container, "Save Template");

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.objectContaining({
          typography: expect.objectContaining({
            sm: "0.9375rem",
            md: "1.0625rem",
            lg: "1.1875rem",
            xl: "1.375rem",
          }),
          base: expect.objectContaining({
            text: "#010203",
          }),
          buttons: expect.objectContaining({
            primary: expect.objectContaining({
              text: "#111122",
              hoverBg: "#222233",
              hoverText: "#333344",
            }),
            secondary: expect.objectContaining({
              bg: "#444455",
              text: "#555566",
              hoverBg: "#666677",
              hoverText: "#777788",
            }),
            outline: expect.objectContaining({
              border: "#888899",
              text: "#9999aa",
              hoverBg: "#aaaabb",
              hoverText: "#bbbbcc",
            }),
            ghost: expect.objectContaining({
              hoverBg: "#ccccdd",
              hoverText: "#ddddee",
            }),
          }),
          inputs: expect.objectContaining({
            border: "#123123",
            text: "#234234",
            placeholder: "#345345",
            focusRing: "#456456",
          }),
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ThemeTemplateDrawer updates remaining input and navigation fields from text values", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn(async () => undefined);
  const template = {
    id: "tpl-6",
    name: "Transit",
    description: "Navigation-heavy palette",
    ...templateTimestamps,
    tokens: {
      base: { bg: "#111111", surface: "#1b1b1b", border: "#2f2f2f", text: "#f5f5f5" },
      typography: {
        mutedText: "#9a9a9a",
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
        placeholder: "#8a8a8a",
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
      setInputValue(findColorTextInputByLabel(view.container, "Focus Ring"), " 1122aa ");
      setInputValue(findColorTextInputByLabel(view.container, "Input Text"), "334455");
      setInputValue(findColorTextInputByLabel(view.container, "Sidebar Text"), "556677");
      setInputValue(findColorTextInputByLabel(view.container, "Active Background"), "778899");
      setInputValue(findColorTextInputByLabel(view.container, "Active Text"), "99aabb");
      setInputValue(findColorTextInputByLabel(view.container, "Hover Background"), "bbccdd");
      setInputValue(findColorTextInputByLabel(view.container, "Top Bar Background"), "ccddee");
      setInputValue(findColorTextInputByLabel(view.container, "Top Bar Text"), "ddeeff");
    });

    clickButtonByText(view.container, "Save Template");

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.objectContaining({
          inputs: expect.objectContaining({
            text: "#334455",
            focusRing: "#1122aa",
          }),
          sidebar: expect.objectContaining({
            text: "#556677",
            activeBg: "#778899",
            activeText: "#99aabb",
            hoverBg: "#bbccdd",
          }),
          topbar: expect.objectContaining({
            bg: "#ccddee",
            text: "#ddeeff",
          }),
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});
