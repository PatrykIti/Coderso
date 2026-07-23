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

const dispatchInputValue = (input: HTMLInputElement, value: string) => {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  toastInfo.mockReset();
});

test("clearable field helper treats every non-empty raw string as present", () => {
  const matrix: ReadonlyArray<readonly [label: string, value: unknown, expected: boolean]> = [
    ["undefined", undefined, false],
    ["null", null, false],
    ["empty string", "", false],
    ["ASCII spaces", "   ", true],
    ["NBSP", "\u00a0", true],
    ["EM SPACE", "\u2003", true],
    ["C0 control", "\u0000", true],
    ["C1 control", "\u0085", true],
    ["transparent", "transparent", true],
    ["hex color", "#ffffff", true],
  ];

  for (const [label, value, expected] of matrix) {
    expect(hasClearableFieldValue(value), label).toBe(expected);
  }
});

test("shared color picker uses metadata for literals and fallback for every nonliteral kind", () => {
  expect(resolveColorPickerValue("#112233", "#ffffff")).toBe("#112233");
  expect(resolveColorPickerValue("rgb(17, 34, 51)", "#ffffff")).toBe("#112233");
  expect(resolveColorPickerValue("rgba(17, 34, 51, 0.4)", "#ffffff")).toBe("#112233");
  expect(resolveColorPickerValue("hsl(210, 50%, 40%)", "#ffffff")).toBe("#336699");
  expect(resolveColorPickerValue("var(--color-border)", "#ffffff")).toBe("#ffffff");
  expect(resolveColorPickerValue("transparent", "#ffffff")).toBe("#ffffff");
  expect(resolveColorPickerValue("currentColor", "#ffffff", "inherited-render")).toBe("#ffffff");
  expect(resolveColorPickerValue("inherit", "#ffffff", "inherited-render")).toBe("#ffffff");
  expect(resolveColorPickerValue("unknown", "#ffffff")).toBe("#ffffff");
  expect(resolveColorPickerValue("unknown", "invalid-fallback")).toBe("#000000");
});

test("shared color picker representability is true exactly for hex, RGB, and HSL", () => {
  expect(isPickerRepresentableColorValue("#112233")).toBe(true);
  expect(isPickerRepresentableColorValue("rgb(17, 34, 51)")).toBe(true);
  expect(isPickerRepresentableColorValue("rgba(17, 34, 51, 0.4)")).toBe(true);
  expect(isPickerRepresentableColorValue("hsla(210, 50%, 40%, 0.4)")).toBe(true);
  expect(isPickerRepresentableColorValue("var(--color-border)")).toBe(false);
  expect(isPickerRepresentableColorValue("transparent")).toBe(false);
  expect(isPickerRepresentableColorValue("currentColor", "inherited-render")).toBe(false);
  expect(isPickerRepresentableColorValue("inherit", "inherited-render")).toBe(false);
  expect(isPickerRepresentableColorValue("unknown")).toBe(false);
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
    dispatchInputValue(colorInput, "#123456");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#123456");
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
  expect(onHexChange).toHaveBeenCalledTimes(1);

  const onRgbChange = vi.fn();
  applySharedColorPickerChange({
    currentValue: "rgb(17, 34, 51)",
    nextValue: "#778899",
    onChange: onRgbChange,
  });
  expect(onRgbChange).toHaveBeenCalledWith("#778899");
  expect(onRgbChange).toHaveBeenCalledTimes(1);

  const onHslChange = vi.fn();
  applySharedColorPickerChange({
    currentValue: "hsl(210, 50%, 40%)",
    nextValue: "#aabbcc",
    onChange: onHslChange,
  });
  expect(onHslChange).toHaveBeenCalledTimes(1);
  expect(onHslChange).toHaveBeenCalledWith("#aabbcc");
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
  expect(onPickerChange).toHaveBeenCalledTimes(1);
  expect(onChange).not.toHaveBeenCalled();
});

test("color token hint appears only for canonical tokens, never HSL or unknown values", () => {
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

  const hsl = mount(<ColorTokenHint value="hsl(210, 50%, 40%)" />);
  try {
    expect(hsl.container.textContent).toBe("");
  } finally {
    hsl.cleanup();
  }

  const unknown = mount(<ColorTokenHint value="color-mix(in srgb, red, blue)" />);
  try {
    expect(unknown.container.textContent).toBe("");
  } finally {
    unknown.cleanup();
  }

  const token = mount(<ColorTokenHint value="var(--color-border)" />);
  try {
    expect(token.container.textContent).toContain("Theme token active");
  } finally {
    token.cleanup();
  }
});

test("shared contrast advisory derives RGB metadata for every literal kind", () => {
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
      foreground: "hsl(0, 0%, 0%)",
      background: "rgb(255, 255, 255)",
    })
  ).toEqual(expect.objectContaining({ status: "ok" }));

  expect(
    resolveColorContrastAdvisory({
      foreground: "hsl(0, 100%, 50%)",
      background: "#ffffff",
    })
  ).toEqual(expect.objectContaining({ status: "warning" }));

  expect(
    resolveColorContrastAdvisory({
      foreground: "#00000080",
      background: "hsl(0, 0%, 100%)",
    })
  ).toEqual(expect.objectContaining({ status: "ok" }));
});

test("shared contrast advisory is unknown for alpha zero and every nonliteral kind", () => {
  for (const foreground of [
    "#0000",
    "rgba(0,0,0,0)",
    "hsla(0,0%,0%,0)",
    "var(--color-text)",
    "transparent",
    "currentColor",
    "inherit",
    "unknown",
  ]) {
    expect(
      resolveColorContrastAdvisory({
        foreground,
        background: "#ffffff",
        colorProfile: "inherited-render",
      }),
      foreground
    ).toEqual(expect.objectContaining({ status: "unknown" }));
  }

  expect(
    resolveColorContrastAdvisory({
      foreground: "#000000",
      background: "var(--color-surface)",
      fallbackBackground: "#ffffff",
    })
  ).toEqual(
    expect.objectContaining({
      status: "unknown",
    })
  );
});

test("color contrast notice renders warnings but hides successful advisories", () => {
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
