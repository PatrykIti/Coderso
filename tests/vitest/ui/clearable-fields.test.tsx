// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const toastInfo = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    info: toastInfo,
  },
}));

import {
  applySharedColorPickerChange,
  ColorTokenHint,
  ColorContrastNotice,
  ClearableFieldHeader,
  ClearableInputField,
  SharedColorFieldInputs,
  hasClearableFieldValue,
  isPickerRepresentableColorValue,
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
  toastInfo.mockReset();
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

test("shared color picker representable-value detection stays bounded to hex and rgb without alpha", () => {
  expect(isPickerRepresentableColorValue("#112233")).toBe(true);
  expect(isPickerRepresentableColorValue("rgb(17, 34, 51)")).toBe(true);
  expect(isPickerRepresentableColorValue("rgba(17, 34, 51, 0.4)")).toBe(false);
  expect(isPickerRepresentableColorValue("var(--color-border)")).toBe(false);
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
    expect(button?.getAttribute("aria-label")).toBe("Clear Surface");
    React.act(() => {
      button?.click();
    });
    expect(onClear).not.toHaveBeenCalled();
    expect(toastInfo).not.toHaveBeenCalled();
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
    expect(button?.getAttribute("aria-label")).toBe("Clear Surface");
    React.act(() => {
      button?.click();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalledWith("transparent");
    expect(toastInfo).toHaveBeenCalledWith("Surface cleared.", {
      action: {
        label: "Undo",
        onClick: expect.any(Function),
      },
    });

    const [, options] = toastInfo.mock.calls[0] ?? [];
    expect(options?.action?.label).toBe("Undo");
    React.act(() => {
      options?.action?.onClick?.();
    });
    expect(onChange).toHaveBeenCalledWith("transparent");
  } finally {
    filled.cleanup();
  }
});

test("clearable field header emits shared feedback even without an undo handler", () => {
  const onClear = vi.fn();
  const view = mount(
    <ClearableFieldHeader
      label="Background gradient"
      value="linear-gradient(45deg, #111111, #222222)"
      onClear={onClear}
    />
  );

  try {
    const button = view.container.querySelector("button");
    expect(button?.disabled).toBe(false);
    expect(button?.getAttribute("aria-label")).toBe("Clear Background gradient");
    React.act(() => {
      button?.click();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(toastInfo).toHaveBeenCalledWith("Background gradient cleared.");
  } finally {
    view.cleanup();
  }
});

test("clearable field header can describe post-clear semantics in accessible name", () => {
  const view = mount(
    <ClearableFieldHeader
      label="Panel surface"
      value="#ffffff"
      onClear={() => undefined}
      clearResultLabel="removes the panel surface override"
    />
  );

  try {
    const button = view.container.querySelector("button");
    expect(button?.getAttribute("aria-label")).toBe(
      "Clear Panel surface; removes the panel surface override"
    );
  } finally {
    view.cleanup();
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
    expect(view.container.textContent).toContain("Theme token active");

    if (!colorInput) throw new Error("Missing color input");
    React.act(() => {
      colorInput.value = "#123456";
      colorInput.dispatchEvent(new Event("input", { bubbles: true }));
      colorInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("shared color field inputs keep picker writes for hex and rgb values", () => {
  const onHexChange = vi.fn();
  applySharedColorPickerChange({
    currentValue: "#112233",
    nextValue: "#445566",
    onChange: onHexChange,
  });
  expect(onHexChange).toHaveBeenCalledWith("#445566");

  const onRgbChange = vi.fn();
  applySharedColorPickerChange({
    currentValue: "rgb(17, 34, 51)",
    nextValue: "#778899",
    onChange: onRgbChange,
  });
  expect(onRgbChange).toHaveBeenCalledWith("#778899");
});

test("shared color field inputs allow explicit picker override callbacks for token values", () => {
  const onChange = vi.fn();
  const onPickerChange = vi.fn();

  applySharedColorPickerChange({
    currentValue: "var(--color-border)",
    nextValue: "#abcdef",
    onChange,
    onPickerChange,
  });

  expect(onPickerChange).toHaveBeenCalledWith("#abcdef");
  expect(onChange).not.toHaveBeenCalled();
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
