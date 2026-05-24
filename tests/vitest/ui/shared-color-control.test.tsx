// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { SharedColorControl } from "../../../core/admin/ui/widgets/editors/SharedColorControl";

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
    placeholder,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    [key: string]: unknown;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} {...props} />
  ),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const render = (next: React.ReactNode) => {
    React.act(() => {
      root.render(next);
    });
  };

  render(node);

  return {
    container,
    rerender: render,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const dispatchInputValue = (input: HTMLInputElement, value: string) => {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

  React.act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("keeps CSS variable text authority across rerenders while swatch uses fallback hex", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Surface"
      value="var(--color-surface)"
      onChange={onChange}
      placeholder="var(--color-surface)"
      pickerFallback="#123456"
    />
  );

  try {
    let swatch = view.container.querySelector('input[aria-label="Surface swatch"]');
    let text = view.container.querySelector('input[aria-label="Surface value"]');
    expect((swatch as HTMLInputElement | null)?.value).toBe("#123456");
    expect((text as HTMLInputElement | null)?.value).toBe("var(--color-surface)");

    view.rerender(
      <SharedColorControl
        label="Surface"
        value="var(--color-surface)"
        onChange={onChange}
        placeholder="var(--color-surface)"
        pickerFallback="#123456"
      />
    );

    swatch = view.container.querySelector('input[aria-label="Surface swatch"]');
    text = view.container.querySelector('input[aria-label="Surface value"]');
    expect((swatch as HTMLInputElement | null)?.value).toBe("#123456");
    expect((text as HTMLInputElement | null)?.value).toBe("var(--color-surface)");
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("routes swatch and text edits through their respective handlers", () => {
  const onChange = vi.fn();
  const onSwatchChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Accent"
      value="#112233"
      onChange={onChange}
      onSwatchChange={onSwatchChange}
      pickerFallback="#abcdef"
    />
  );

  try {
    const swatch = view.container.querySelector('input[aria-label="Accent swatch"]');
    const text = view.container.querySelector('input[aria-label="Accent value"]');
    expect(swatch).toBeTruthy();
    expect(text).toBeTruthy();

    dispatchInputValue(swatch as HTMLInputElement, "#445566");
    dispatchInputValue(text as HTMLInputElement, "var(--color-accent)");

    expect(onSwatchChange).toHaveBeenCalledTimes(1);
    expect(onSwatchChange).toHaveBeenCalledWith("#445566");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("var(--color-accent)");
  } finally {
    view.cleanup();
  }
});

test("can hide the technical text input while keeping swatch overrides", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Frame"
      value="var(--color-surface)"
      onChange={onChange}
      pickerFallback="#ffffff"
      showValueInput={false}
    />
  );

  try {
    const swatch = view.container.querySelector('input[aria-label="Frame swatch"]');
    const text = view.container.querySelector('input[aria-label="Frame value"]');
    expect((swatch as HTMLInputElement | null)?.value).toBe("#ffffff");
    expect(text).toBeNull();
    expect(view.container.textContent).toContain("Theme or custom color active");

    dispatchInputValue(swatch as HTMLInputElement, "#112233");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#112233");
  } finally {
    view.cleanup();
  }
});

test("clear stays disabled when only fallback swatch state exists", () => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Border"
      value={undefined}
      onChange={onChange}
      onClear={onClear}
      pickerFallback="#334455"
    />
  );

  try {
    const button = view.container.querySelector("button");
    expect(button?.disabled).toBe(true);

    React.act(() => {
      button?.click();
    });

    expect(onClear).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("rgba text keeps fallback swatch preview while still allowing clear", () => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="rgba(10, 20, 30, 0.4)"
      onChange={onChange}
      onClear={onClear}
      pickerFallback="#102030"
    />
  );

  try {
    const swatch = view.container.querySelector('input[aria-label="Overlay swatch"]');
    const text = view.container.querySelector('input[aria-label="Overlay value"]');
    const button = view.container.querySelector("button");

    expect((swatch as HTMLInputElement | null)?.value).toBe("#102030");
    expect((text as HTMLInputElement | null)?.value).toBe("rgba(10, 20, 30, 0.4)");
    expect(button?.disabled).toBe(false);

    React.act(() => {
      button?.click();
    });

    expect(onClear).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});
