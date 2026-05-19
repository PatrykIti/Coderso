// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  ColorTokenHint,
  ColorContrastNotice,
  ClearableInputField,
  SharedColorFieldInputs,
  hasClearableFieldValue,
  resolveColorContrastAdvisory,
  resolveColorPickerValue,
} from "../../../core/admin/ui/widgets/editors/ClearableFields";

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

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("clearable field helper detects real values without treating empty text as set", () => {
  expect(hasClearableFieldValue(undefined)).toBe(false);
  expect(hasClearableFieldValue("   ")).toBe(false);
  expect(hasClearableFieldValue("transparent")).toBe(true);
  expect(hasClearableFieldValue("#ffffff")).toBe(true);
});

test("shared color picker resolves hex and rgb values but falls back for rgba and custom tokens", () => {
  expect(resolveColorPickerValue("#112233", "#ffffff")).toBe("#112233");
  expect(resolveColorPickerValue("rgb(17, 34, 51)", "#ffffff")).toBe("#112233");
  expect(resolveColorPickerValue("rgba(17, 34, 51, 0.4)", "#ffffff")).toBe("#ffffff");
  expect(resolveColorPickerValue("var(--color-border)", "#ffffff")).toBe("#ffffff");
});

test("clearable input disables empty clear and delegates configured clear behavior", () => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const view = mount(
    <ClearableInputField
      label="Surface"
      value=""
      onChange={onChange}
      onClear={onClear}
      placeholder="transparent"
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

  const filled = mount(
    <ClearableInputField
      label="Surface"
      value="transparent"
      onChange={onChange}
      onClear={onClear}
      placeholder="transparent"
    />
  );

  try {
    const button = filled.container.querySelector("button");
    expect(button?.disabled).toBe(false);
    React.act(() => {
      button?.click();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalledWith("transparent");
  } finally {
    filled.cleanup();
  }
});

test("shared color field inputs preserve text tokens while showing a token hint", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorFieldInputs
      value="var(--color-border)"
      onChange={onChange}
      placeholder="var(--color-border)"
      pickerFallback="#e2e8f0"
    />
  );

  try {
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const colorInput = inputs.find(
      (input): input is HTMLInputElement =>
        input instanceof HTMLInputElement && input.type === "color"
    );
    const textInput = inputs.find(
      (input): input is HTMLInputElement =>
        input instanceof HTMLInputElement && input.type !== "color"
    );

    expect(colorInput?.value).toBe("#e2e8f0");
    expect(textInput?.value).toBe("var(--color-border)");
    expect(view.container.textContent).toContain("Custom token active");
  } finally {
    view.cleanup();
  }
});

test("color token hint stays hidden for empty and hex values", () => {
  const empty = mount(<ColorTokenHint value={undefined} />);
  try {
    expect(empty.container.textContent).toBe("");
  } finally {
    empty.cleanup();
  }

  const hex = mount(<ColorTokenHint value="#112233" />);
  try {
    expect(hex.container.textContent).toBe("");
  } finally {
    hex.cleanup();
  }
});

test("shared contrast advisory warns for low-contrast colors and stays unknown for tokens", () => {
  expect(
    resolveColorContrastAdvisory({
      foreground: "#ffffff",
      background: "#ffffff",
    })
  ).toEqual(
    expect.objectContaining({
      status: "warning",
    })
  );

  expect(
    resolveColorContrastAdvisory({
      foreground: "var(--color-text)",
      background: "#ffffff",
    })
  ).toEqual(
    expect.objectContaining({
      status: "unknown",
    })
  );

  const advisory = resolveColorContrastAdvisory({
    foreground: "#ffffff",
    background: "#ffffff",
  });
  const view = mount(<ColorContrastNotice advisory={advisory} label="Marker contrast advisory" />);

  try {
    expect(view.container.textContent).toContain("Configured colors may be hard to read together");
  } finally {
    view.cleanup();
  }
});
