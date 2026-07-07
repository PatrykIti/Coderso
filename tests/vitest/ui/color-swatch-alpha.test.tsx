// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ColorSwatchControl } from "../../../core/admin/ui/pages/editorControls/ColorSwatchControl";
import { getPageEditorColorPalette } from "../../../core/services/pages/pageEditorControlUiModel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const render = (element: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(element);
  });
  mounted.push({ root, container });
  return container;
};

const click = (element: Element | null | undefined) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

// Set a native input value through the prototype setter (React tracks the
// last-controlled value on the instance) then dispatch the event, mirroring
// page-editor-control-primitives.test.tsx — NO fireEvent/screen.
const setInputValue = (input: HTMLInputElement, value: string, eventType: string) => {
  React.act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event(eventType, { bubbles: true }));
  });
};

const blur = (input: HTMLInputElement, value: string) => {
  React.act(() => {
    input.value = value;
    // React delegates onBlur to the bubbling "focusout" event at the root.
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
};

const pressEnter = (input: HTMLInputElement, value: string) => {
  React.act(() => {
    input.value = value;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
};

const hexField = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>("[data-page-editor-color-hex]");
const pickerField = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>("[data-page-editor-color-picker]");
const opacitySlider = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('[data-page-editor-slider="Color opacity"]');

afterEach(() => {
  for (const { root, container } of mounted) {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
  mounted = [];
});

test("round-trips a stored #rrggbbaa value across text, picker, and opacity slider (HI-1)", () => {
  const container = render(
    <ColorSwatchControl label="Bg" value="#0812209e" onChange={vi.fn()} allowTransparent />
  );

  expect(hexField(container)?.value).toBe("#0812209e");
  // Native picker shows the BASE color only (alpha lives on the slider).
  expect(pickerField(container)?.value).toBe("#081220");
  // 0x9e/255*100 ≈ 62.
  const slider = opacitySlider(container);
  expect(slider).toBeTruthy();
  expect(Number(slider?.value)).toBe(62);
  expect(slider?.disabled).toBe(false);
});

test("authors alpha via the opacity slider while preserving the base color (HI-2)", () => {
  const onChange = vi.fn();
  const container = render(<ColorSwatchControl label="Bg" value="#081220" onChange={onChange} />);

  const slider = opacitySlider(container)!;
  setInputValue(slider, "50", "input");
  setInputValue(slider, "50", "change");
  expect(onChange).toHaveBeenCalledWith("#08122080");
});

test("editing the base color via the native picker keeps the current alpha (HI-2)", () => {
  const onChange = vi.fn();
  const container = render(<ColorSwatchControl label="Bg" value="#0812209e" onChange={onChange} />);

  const picker = pickerField(container)!;
  setInputValue(picker, "#112233", "input");
  expect(onChange).toHaveBeenCalledWith("#1122339e");
});

test("accepts a typed leading-dot rgba() and canonicalizes the alpha on emit", () => {
  const onChange = vi.fn();
  const container = render(<ColorSwatchControl label="Bg" value="#081220" onChange={onChange} />);

  blur(hexField(container)!, "rgba(8,17,31,.84)");
  // The render boundary rejects `.84`; normalizeAdminColorValue emits `0.84`.
  expect(onChange).toHaveBeenCalledWith("rgba(8,17,31,0.84)");
});

test("accepts a typed 8-digit hex and emits it byte-identically on Enter", () => {
  const onChange = vi.fn();
  const container = render(<ColorSwatchControl label="Bg" value="#081220" onChange={onChange} />);

  pressEnter(hexField(container)!, "#0a0f1acc");
  expect(onChange).toHaveBeenCalledWith("#0a0f1acc");
});

test("rejects an unknown value and reverts the field without emitting", () => {
  const onChange = vi.fn();
  const container = render(<ColorSwatchControl label="Bg" value="#aabbcc" onChange={onChange} />);

  const field = hexField(container)!;
  blur(field, "url(x)");
  expect(onChange).not.toHaveBeenCalled();
  expect(field.value).toBe("#aabbcc");
});

test("keeps the transparent swatch clearing the value with null (HI-3)", () => {
  const onChange = vi.fn();
  const container = render(
    <ColorSwatchControl label="Bg" value="#fef3c7" onChange={onChange} allowTransparent />
  );

  click(container.querySelector('[data-page-editor-color-swatch="transparent"]'));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(null);
});

test("keeps a palette pick emitting the opaque token value (HI-3)", () => {
  const onChange = vi.fn();
  const palette = getPageEditorColorPalette();
  const container = render(
    <ColorSwatchControl label="Bg" value="#081220" onChange={onChange} palette={palette} />
  );

  const target = palette[1] ?? palette[0]!;
  click(container.querySelector(`[data-page-editor-color-swatch="${target.id}"]`));
  expect(onChange).toHaveBeenCalledWith(target.value);
});

test("shows a token value as raw text with a disabled slider and a hint (HI-3)", () => {
  const container = render(
    <ColorSwatchControl label="Bg" value="var(--color-brand)" onChange={vi.fn()} />
  );

  expect(hexField(container)?.value).toBe("var(--color-brand)");
  expect(opacitySlider(container)?.disabled).toBe(true);
  expect(container.querySelector("[data-page-editor-color-hint]")).toBeTruthy();
});
