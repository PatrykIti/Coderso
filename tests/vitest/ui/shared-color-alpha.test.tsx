// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

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

import { SharedColorControl } from "../../../core/admin/ui/shared/SharedColorControl";
import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";

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

const dispatchInputValue = (input: HTMLInputElement, value: string) => {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

  React.act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

// The free-text color field commits on blur/Enter only (never per keystroke), so a
// `key={value}` remount cannot mutate the draft mid-typing. Simulate typing then blur.
const typeThenBlur = (input: HTMLInputElement, value: string) => {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

  React.act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  React.act(() => {
    // React delegates onBlur to the bubbling "focusout" event at the root.
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("HI-1 round-trips an 8-digit hex: picker shows base, opacity slider reflects alpha", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#0812209e"
      onChange={onChange}
      pickerFallback="#ffffff"
    />
  );

  try {
    const picker = view.container.querySelector(
      'input[aria-label="Overlay swatch"]'
    ) as HTMLInputElement | null;
    const slider = view.container.querySelector('input[type="range"]') as HTMLInputElement | null;

    // HTML picker cannot show alpha -> shows the base color.
    expect(picker?.value).toBe("#081220");
    // Opacity slider reflects the alpha channel (0x9e / 255 ≈ 62%).
    expect(slider).toBeTruthy();
    expect(Number(slider?.value)).toBe(62);
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("HI-1 classifies an alpha value as selected_swatch in swatch-only mode", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#0812209e"
      onChange={onChange}
      pickerFallback="#ffffff"
      showValueInput={false}
    />
  );

  try {
    const state = view.container.querySelector("[data-shared-color-state]");
    expect(state?.getAttribute("data-shared-color-state")).toBe("selected_swatch");
    expect(view.container.textContent).toContain("Selected color");
    // No opacity slider in swatch-only mode.
    expect(view.container.querySelector('input[type="range"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("HSL remains canonical text while picker, alpha, and state use literal metadata", () => {
  const onChange = vi.fn();
  const value = "hsla(210,50%,40%,.5)";
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value={value}
      onChange={onChange}
      pickerFallback="#ffffff"
    />
  );

  try {
    const picker = view.container.querySelector(
      'input[aria-label="Overlay swatch"]'
    ) as HTMLInputElement | null;
    const text = view.container.querySelector(
      'input[aria-label="Overlay value"]'
    ) as HTMLInputElement | null;
    const slider = view.container.querySelector('input[type="range"]') as HTMLInputElement | null;

    expect(picker?.value).toBe("#336699");
    expect(text?.value).toBe(value);
    expect(slider?.value).toBe("50");
    expect(view.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
      "selected_swatch"
    );
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("HI-2 slider authoring recomposes base + new alpha", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#081220"
      onChange={onChange}
      pickerFallback="#ffffff"
    />
  );

  try {
    const slider = view.container.querySelector('input[type="range"]') as HTMLInputElement | null;
    expect(slider).toBeTruthy();
    dispatchInputValue(slider as HTMLInputElement, "50");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#08122080");
  } finally {
    view.cleanup();
  }
});

test("HI-2 editing the base color via the picker keeps the current alpha", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#0812209e"
      onChange={onChange}
      pickerFallback="#ffffff"
    />
  );

  try {
    const picker = view.container.querySelector(
      'input[aria-label="Overlay swatch"]'
    ) as HTMLInputElement | null;
    dispatchInputValue(picker as HTMLInputElement, "#112233");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#1122339e");
  } finally {
    view.cleanup();
  }
});

test("type rgba canonicalizes a leading-dot alpha on commit through the owner", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#000000"
      onChange={onChange}
      pickerFallback="#ffffff"
    />
  );

  try {
    const text = view.container.querySelector(
      'input[aria-label="Overlay value"]'
    ) as HTMLInputElement | null;
    typeThenBlur(text as HTMLInputElement, "rgba(8,17,31,.84)");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("rgba(8, 17, 31, 0.84)");
  } finally {
    view.cleanup();
  }
});

test("free-text field does not commit mid-typing: incremental hex8 entry is not corrupted", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#000000"
      onChange={onChange}
      pickerFallback="#ffffff"
    />
  );

  try {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    const text = view.container.querySelector(
      'input[aria-label="Overlay value"]'
    ) as HTMLInputElement;

    // Type `#0812209e` one character at a time. Each intermediate `#081`/`#0812`... is a
    // valid color, but the field must NOT commit and remount until blur/Enter.
    for (const draft of [
      "#",
      "#0",
      "#08",
      "#081",
      "#0812",
      "#08122",
      "#081220",
      "#0812209",
      "#0812209e",
    ]) {
      React.act(() => {
        setValue?.call(text, draft);
        text.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    // No commit occurred during typing, and the draft survived intact (no remount).
    expect(onChange).not.toHaveBeenCalled();
    expect(text.value).toBe("#0812209e");

    // Blur commits the full, uncorrupted value (React onBlur = bubbling "focusout").
    React.act(() => {
      text.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("#0812209e");
    expect(onChange).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("checks raw byte length before ASCII-space normalization in SharedColorControl", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#000000"
      onChange={onChange}
      pickerFallback="#ffffff"
    />
  );

  try {
    const text = view.container.querySelector(
      'input[aria-label="Overlay value"]'
    ) as HTMLInputElement;
    const terminal = "transparent";
    const atCap = `${" ".repeat(CSS_COLOR_VALUE_MAX_LENGTH - terminal.length)}${terminal}`;
    const overCap = `${atCap} `;

    typeThenBlur(text, atCap);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("transparent");

    onChange.mockClear();
    typeThenBlur(text, overCap);
    expect(onChange).not.toHaveBeenCalled();
    expect(text.value).toBe(overCap);
  } finally {
    view.cleanup();
  }
});

test("rejects Unicode whitespace, C0/C1 controls, and out-of-range literals without mutation", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#000000"
      onChange={onChange}
      pickerFallback="#ffffff"
    />
  );

  try {
    const text = view.container.querySelector(
      'input[aria-label="Overlay value"]'
    ) as HTMLInputElement;
    for (const draft of [
      "\u00a0#abc",
      "\u2003#abc",
      "\u001f#abc",
      "\u0085#abc",
      "rgb(999,0,0)",
      "hsl(361,100%,50%)",
    ]) {
      typeThenBlur(text, draft);
      expect(text.value).toBe(draft);
    }
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("HI-3 transparent shortcut emits the transparent keyword", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#0812209e"
      onChange={onChange}
      pickerFallback="#ffffff"
      showValueInput={false}
      allowTransparent
    />
  );

  try {
    const transparentButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Use transparent")
    );
    React.act(() => {
      transparentButton?.click();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("transparent");
  } finally {
    view.cleanup();
  }
});

test("HI-3 theme token keeps token classification and hides the opacity slider", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="var(--color-brand)"
      onChange={onChange}
      pickerFallback="#ffffff"
      showValueInput={false}
    />
  );

  try {
    const state = view.container.querySelector("[data-shared-color-state]");
    expect(state?.getAttribute("data-shared-color-state")).toBe("theme_token");
    expect(view.container.textContent).toContain("Theme token");
    expect(view.container.querySelector('input[type="range"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("HI-3 clear fires the configured onClear when a value is present", () => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="#0812209e"
      onChange={onChange}
      onClear={onClear}
      pickerFallback="#ffffff"
    />
  );

  try {
    const clearButton = view.container.querySelector("button");
    expect(clearButton?.disabled).toBe(false);
    React.act(() => {
      clearButton?.click();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});
