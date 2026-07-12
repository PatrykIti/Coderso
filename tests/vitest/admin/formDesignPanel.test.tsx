// @vitest-environment happy-dom
//
// TASK-516-02: Form Design Inspector Panel — admin/UI render lane (Bun-free).
// Verifies control-group rendering, the GROUP-LEVEL REPLACE merge protocol,
// per-control reset (bypasses patchGroup), whole-theme reset, and the local
// ControlDefaultHint behavior (incl. the TASK-507 FIX B "never render undefined"
// guard) + the SharedColorControl cleared-state UI for color tokens.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { FormDesignPanel } from "../../../core/admin/ui/forms/FormDesignPanel";
import type { FormFormTheme } from "../../../core/services/forms/formTheme";
import { FORM_COLOR_CONSUMER_CASES, buildFormColorTheme } from "../forms/formColorConsumerTable";

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

// Radix Select renders a hidden native <select> (BubbleSelect) that mirrors the
// SelectItem values; dispatching a native "change" on it drives onValueChange.
const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setInputValue = (element: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const buildUniformColorTheme = (value: string): FormFormTheme => {
  const theme = buildFormColorTheme("canonical");
  for (const entry of FORM_COLOR_CONSUMER_CASES) {
    (theme[entry.group] as Record<string, string>)[entry.key] = value;
  }
  return theme;
};

const optionValues = (select: HTMLSelectElement) =>
  Array.from(select.options).map((option) => option.value);

const findSelectByOptions = (container: HTMLElement, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find(
    (select) => optionValues(select).join(",") === values.join(",")
  ) as HTMLSelectElement | undefined;

const buttonWithText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === text
  ) as HTMLButtonElement | undefined;

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders every control group with resolved-default hints (no theme)", () => {
  const onThemeChange = vi.fn();
  const view = mount(<FormDesignPanel theme={undefined} onThemeChange={onThemeChange} />);
  try {
    const text = view.container.textContent ?? "";
    expect(text).toContain("Form Design");
    expect(text).toContain("Layout");
    expect(text).toContain("Container");
    expect(text).toContain("Typography");
    expect(text).toContain("Inputs");
    expect(text).toContain("Submit");

    // Concrete resolved default surfaced for an unset enum token (layout.width → "md").
    expect(text).toContain("Default: md");

    // Color swatches use SharedColorControl's own cleared-state UI, NOT a
    // ControlDefaultHint — the cleared label is "Theme default".
    expect(text).toContain("Theme default");

    // TASK-507 FIX B: no control ever prints the literal "undefined" (an unset color
    // token / the undefined-default submit.label render nothing, not "Default: undefined").
    expect(text).not.toContain("undefined");
  } finally {
    view.cleanup();
  }
});

test("all ten Form Design color controls expose canonical table state without mount mutation", () => {
  const onThemeChange = vi.fn();
  const view = mount(
    <FormDesignPanel theme={buildFormColorTheme("raw")} onThemeChange={onThemeChange} />
  );
  try {
    for (const entry of FORM_COLOR_CONSUMER_CASES) {
      const control = view.container.querySelector(`[data-widget-control="${entry.controlId}"]`);
      expect(control?.getAttribute("data-widget-control-path")).toBe(
        `theme.${entry.group}.${entry.key}`
      );
      expect(control?.getAttribute("data-shared-color-state")).toBe(
        entry.canonical === "currentColor" || entry.canonical === "inherit"
          ? "inherited"
          : "selected_swatch"
      );
    }
    expect(onThemeChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test.each(["currentColor", "inherit"])(
  "all ten Form Design controls expose the inherited DOM state for %s",
  (keyword) => {
    const onThemeChange = vi.fn();
    const view = mount(
      <FormDesignPanel theme={buildUniformColorTheme(keyword)} onThemeChange={onThemeChange} />
    );
    try {
      for (const entry of FORM_COLOR_CONSUMER_CASES) {
        expect(
          view.container
            .querySelector(`[data-widget-control="${entry.controlId}"]`)
            ?.getAttribute("data-shared-color-state")
        ).toBe("inherited");
      }
      expect(view.container.querySelectorAll('[data-shared-color-state="inherited"]')).toHaveLength(
        FORM_COLOR_CONSUMER_CASES.length
      );
      expect(onThemeChange).not.toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  }
);

test("every Form Design color control supports one scoped picker replacement and clear", () => {
  for (const entry of FORM_COLOR_CONSUMER_CASES) {
    const onThemeChange = vi.fn();
    const theme = buildFormColorTheme("canonical");
    const view = mount(<FormDesignPanel theme={theme} onThemeChange={onThemeChange} />);
    try {
      const control = view.container.querySelector(
        `[data-widget-control="${entry.controlId}"]`
      ) as HTMLElement | null;
      const swatch = control?.querySelector('input[type="color"]') as HTMLInputElement | null;
      expect(swatch).not.toBeNull();
      React.act(() => {
        if (swatch) setInputValue(swatch, "#102030");
      });

      const currentGroup = { ...(theme[entry.group] as Record<string, string>) };
      expect(onThemeChange).toHaveBeenNthCalledWith(1, {
        [entry.group]: { ...currentGroup, [entry.key]: entry.pickerReplacement },
      });

      const clearButton = control?.querySelector("button") as HTMLButtonElement | null;
      expect(clearButton?.disabled).toBe(false);
      React.act(() => {
        clearButton?.click();
      });
      const clearedGroup: Record<string, string> = { ...currentGroup };
      delete clearedGroup[entry.key];
      expect(onThemeChange).toHaveBeenNthCalledWith(2, {
        [entry.group]: clearedGroup,
      });
      expect(onThemeChange).toHaveBeenCalledTimes(2);
    } finally {
      view.cleanup();
    }
  }
});

test("changing a Select emits a GROUP-LEVEL REPLACE patch merged over the current group", () => {
  const onThemeChange = vi.fn();
  const theme: FormFormTheme = { layout: { align: "left" } };
  // Radix Select only keeps its native <select> mirror (BubbleSelect) alive while
  // the trigger has a <form> ancestor (isFormControl) — wrap the panel so the
  // hidden native select persists for a deterministic change dispatch.
  const view = mount(
    <form>
      <FormDesignPanel theme={theme} onThemeChange={onThemeChange} />
    </form>
  );
  try {
    const widthSelect = findSelectByOptions(view.container, ["sm", "md", "lg", "xl", "full"]);
    expect(widthSelect).toBeTruthy();
    React.act(() => {
      setSelectValue(widthSelect, "lg");
    });
    // patchGroup builds the COMPLETE next group (existing align + new width).
    expect(onThemeChange).toHaveBeenCalledWith({ layout: { align: "left", width: "lg" } });
  } finally {
    view.cleanup();
  }
});

test("toggling a Switch emits a merged group patch", () => {
  const onThemeChange = vi.fn();
  const view = mount(<FormDesignPanel theme={undefined} onThemeChange={onThemeChange} />);
  try {
    const cardSwitch = view.container.querySelector('[role="switch"]') as HTMLElement | null;
    expect(cardSwitch).toBeTruthy();
    React.act(() => {
      cardSwitch?.click();
    });
    // Default surface.card resolves to true → toggling emits false.
    expect(onThemeChange).toHaveBeenCalledWith({ surface: { card: false } });
  } finally {
    view.cleanup();
  }
});

test("per-control reset on a group with OTHER set keys emits the reduced group (key absent)", () => {
  const onThemeChange = vi.fn();
  const theme: FormFormTheme = { layout: { align: "left", width: "sm" } };
  const view = mount(<FormDesignPanel theme={theme} onThemeChange={onThemeChange} />);
  try {
    // width is SET → its hint renders a reset button (resolved effective value "sm").
    const resetWidth = buttonWithText(view.container, "Reset (default: sm)");
    expect(resetWidth).toBeTruthy();
    React.act(() => {
      resetWidth?.click();
    });
    // clearKey bypasses patchGroup: width is removed, align survives (NOT re-added).
    expect(onThemeChange).toHaveBeenCalledWith({ layout: { align: "left" } });
    const call = onThemeChange.mock.calls[0]?.[0] as { layout?: Record<string, unknown> };
    expect(call.layout && "width" in call.layout).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("resetting the LAST set key of a group emits { [group]: undefined }", () => {
  const onThemeChange = vi.fn();
  const theme: FormFormTheme = { layout: { width: "sm" } };
  const view = mount(<FormDesignPanel theme={theme} onThemeChange={onThemeChange} />);
  try {
    const resetWidth = buttonWithText(view.container, "Reset (default: sm)");
    expect(resetWidth).toBeTruthy();
    React.act(() => {
      resetWidth?.click();
    });
    expect(onThemeChange).toHaveBeenCalledWith({ layout: undefined });
  } finally {
    view.cleanup();
  }
});

test('"Reset to default theme" emits undefined (drops the whole theme)', () => {
  const onThemeChange = vi.fn();
  const theme: FormFormTheme = { layout: { width: "lg" }, surface: { card: false } };
  const view = mount(<FormDesignPanel theme={theme} onThemeChange={onThemeChange} />);
  try {
    const resetAll = buttonWithText(view.container, "Reset to default theme");
    expect(resetAll).toBeTruthy();
    React.act(() => {
      resetAll?.click();
    });
    expect(onThemeChange).toHaveBeenCalledWith(undefined);
  } finally {
    view.cleanup();
  }
});

test("ControlDefaultHint shows a reset affordance (not a plain default) when a token is set", () => {
  const onThemeChange = vi.fn();
  const theme: FormFormTheme = { layout: { width: "lg" } };
  const view = mount(<FormDesignPanel theme={theme} onThemeChange={onThemeChange} />);
  try {
    const text = view.container.textContent ?? "";
    // Set token → reset affordance carrying the resolved effective value.
    expect(text).toContain("Reset (default: lg)");
    // Still no literal "undefined" anywhere.
    expect(text).not.toContain("undefined");
  } finally {
    view.cleanup();
  }
});
