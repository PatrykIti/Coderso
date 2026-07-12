// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  SharedColorControl,
  describeSharedColorControlState,
} from "../../../core/admin/ui/widgets/editors/SharedColorControl";

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

// The free-text color field commits on blur/Enter only (not per keystroke), so typing
// is followed by a blur to trigger the normalize + onChange emit.
const commitTextValue = (input: HTMLInputElement, value: string) => {
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

const invalidPresentColorValues = [
  ["ASCII spaces", "   "],
  ["NBSP", "\u00a0"],
  ["EM SPACE", "\u2003"],
  ["C0 control", "\u0000"],
  ["C1 control", "\u0085"],
] as const;

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
    commitTextValue(text as HTMLInputElement, "var(--color-accent)");

    expect(onSwatchChange).toHaveBeenCalledTimes(1);
    expect(onSwatchChange).toHaveBeenCalledWith("#445566");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("var(--color-accent)");
  } finally {
    view.cleanup();
  }
});

test("can hide the technical text input while keeping theme token truthfulness", () => {
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
    expect(view.container.textContent).toContain("Theme token");
    expect(view.container.textContent).toContain("fallback preview");
    expect(view.container.textContent).not.toContain("Saved custom color");

    dispatchInputValue(swatch as HTMLInputElement, "#112233");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#112233");
  } finally {
    view.cleanup();
  }
});

test("can treat known token values as theme defaults in swatch-only mode", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Surface"
      value="var(--color-bg)"
      onChange={onChange}
      pickerFallback="#ffffff"
      showValueInput={false}
      treatAsThemeDefaultValues={["var(--color-bg)"]}
    />
  );

  try {
    expect(view.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
      "theme_default_token"
    );
    expect(view.container.textContent).toContain("Theme default");
    expect(view.container.textContent).toContain("matches the widget default");
    expect(view.container.textContent).not.toContain("Saved custom color");
  } finally {
    view.cleanup();
  }
});

test("describes every state with exactly the shared four-field shape", () => {
  const customCleared = describeSharedColorControlState({
    value: undefined,
    clearedState: {
      label: "No inline color",
      description: "No inline value is saved.",
      clearResultLabel: "removes the inline value",
    },
  });
  expect(customCleared).toEqual({
    kind: "cleared",
    label: "No inline color",
    description: "No inline value is saved.",
    clearResultLabel: "removes the inline value",
  });
  const states = [
    describeSharedColorControlState({ value: undefined }),
    describeSharedColorControlState({ value: "transparent" }),
    describeSharedColorControlState({
      value: "var(--color-bg)",
      treatAsThemeDefaultValues: ["var(--color-bg)"],
    }),
    describeSharedColorControlState({ value: "var(--color-accent)" }),
    describeSharedColorControlState({ value: "#112233" }),
    describeSharedColorControlState({ value: "hsl(210, 50%, 40%)" }),
    describeSharedColorControlState({ value: "currentColor", colorProfile: "inherited-render" }),
    describeSharedColorControlState({ value: "color-mix(in srgb, red, blue)" }),
  ];
  expect(states.map((state) => state.kind)).toEqual([
    "cleared",
    "transparent",
    "theme_default_token",
    "theme_token",
    "selected_swatch",
    "selected_swatch",
    "inherited",
    "saved_custom",
  ]);
  for (const state of [customCleared, ...states]) {
    expect(Object.keys(state), state.kind).toEqual([
      "kind",
      "label",
      "description",
      "clearResultLabel",
    ]);
  }
});

test("pins the exact profile/context state matrix and inherited copy", () => {
  const inherited = {
    kind: "inherited",
    label: "Inherited color",
    description:
      "An inherited color is preserved for retained rendering. The swatch is only a fallback preview.",
    clearResultLabel: "removes the saved color value",
  } as const;

  expect(describeSharedColorControlState({ value: "currentColor" }).kind).toBe("saved_custom");
  expect(describeSharedColorControlState({ value: "inherit" }).kind).toBe("saved_custom");
  expect(
    describeSharedColorControlState({ value: "currentColor", colorProfile: "inherited-render" })
  ).toEqual(inherited);
  expect(
    describeSharedColorControlState({ value: "inherit", colorProfile: "inherited-render" })
  ).toEqual(inherited);
  expect(
    describeSharedColorControlState({
      value: "currentColor",
      colorProfile: "inherited-render",
      allowInheritKeyword: false,
    })
  ).toEqual(inherited);
  expect(
    describeSharedColorControlState({
      value: "inherit",
      colorProfile: "inherited-render",
      allowInheritKeyword: false,
    }).kind
  ).toBe("saved_custom");
  expect(describeSharedColorControlState({ value: "   " }).kind).toBe("saved_custom");
  expect(describeSharedColorControlState({ value: "color-mix(in srgb, red, blue)" }).kind).toBe(
    "saved_custom"
  );
});

test("exposes inherited and saved-custom state on the root without mount mutation", () => {
  const onCurrentColorChange = vi.fn();
  const currentColor = mount(
    <SharedColorControl
      label="Color"
      value="currentColor"
      onChange={onCurrentColorChange}
      colorProfile="inherited-render"
    />
  );
  try {
    expect(currentColor.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
      "inherited"
    );
    expect(currentColor.container.textContent).not.toContain("Saved custom color");
    expect(onCurrentColorChange).not.toHaveBeenCalled();
  } finally {
    currentColor.cleanup();
  }

  const onInheritChange = vi.fn();
  const inherit = mount(
    <SharedColorControl
      label="Color"
      value="inherit"
      onChange={onInheritChange}
      colorProfile="inherited-render"
      showValueInput={false}
    />
  );
  try {
    expect(inherit.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
      "inherited"
    );
    expect(inherit.container.textContent).toContain("Inherited color");
    expect(inherit.container.textContent).toContain(
      "An inherited color is preserved for retained rendering. The swatch is only a fallback preview."
    );
    expect(onInheritChange).not.toHaveBeenCalled();
  } finally {
    inherit.cleanup();
  }

  const onCustomChange = vi.fn();
  const custom = mount(
    <SharedColorControl
      label="Color"
      value="color-mix(in srgb, red, blue)"
      onChange={onCustomChange}
      showValueInput={false}
    />
  );
  try {
    expect(custom.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
      "saved_custom"
    );
    expect(custom.container.textContent).toContain("Saved custom color");
    expect(onCustomChange).not.toHaveBeenCalled();
  } finally {
    custom.cleanup();
  }
});

test("allowInheritKeyword narrows only inherit in descriptor and commit paths", () => {
  const onCurrentColorChange = vi.fn();
  const currentColor = mount(
    <SharedColorControl
      label="Color"
      value="currentColor"
      onChange={onCurrentColorChange}
      colorProfile="inherited-render"
      allowInheritKeyword={false}
    />
  );
  try {
    expect(onCurrentColorChange).not.toHaveBeenCalled();
    const text = currentColor.container.querySelector(
      'input[aria-label="Color value"]'
    ) as HTMLInputElement;
    commitTextValue(text, " CURRENTCOLOR ");
    expect(onCurrentColorChange).toHaveBeenCalledTimes(1);
    expect(onCurrentColorChange).toHaveBeenCalledWith("currentColor");
  } finally {
    currentColor.cleanup();
  }

  const onInheritChange = vi.fn();
  const inherit = mount(
    <SharedColorControl
      label="Color"
      value="inherit"
      onChange={onInheritChange}
      colorProfile="inherited-render"
      allowInheritKeyword={false}
    />
  );
  try {
    expect(inherit.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
      "saved_custom"
    );
    const text = inherit.container.querySelector(
      'input[aria-label="Color value"]'
    ) as HTMLInputElement;
    commitTextValue(text, " INHERIT ");
    expect(onInheritChange).not.toHaveBeenCalled();
  } finally {
    inherit.cleanup();
  }
});

test("authoring cannot be widened and unknown state stays replaceable", () => {
  const onTextChange = vi.fn();
  const textView = mount(
    <SharedColorControl label="Color" value="#000000" onChange={onTextChange} allowInheritKeyword />
  );
  try {
    const text = textView.container.querySelector(
      'input[aria-label="Color value"]'
    ) as HTMLInputElement;
    commitTextValue(text, "currentColor");
    commitTextValue(text, "inherit");
    expect(onTextChange).not.toHaveBeenCalled();
  } finally {
    textView.cleanup();
  }

  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Color"
      value="currentColor"
      onChange={onChange}
      allowInheritKeyword
      showValueInput={false}
    />
  );
  try {
    expect(view.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
      "saved_custom"
    );
    const swatch = view.container.querySelector('input[aria-label="Color swatch"]');
    dispatchInputValue(swatch as HTMLInputElement, "#112233");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#112233");
  } finally {
    view.cleanup();
  }
});

test("can expose a transparent shortcut in swatch-only mode", () => {
  const onChange = vi.fn();
  const view = mount(
    <SharedColorControl
      label="Overlay"
      value="transparent"
      onChange={onChange}
      pickerFallback="#ffffff"
      showValueInput={false}
      allowTransparent
    />
  );

  try {
    expect(view.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
      "transparent"
    );
    expect(view.container.textContent).toContain("Transparent");
    const transparentButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Use transparent")
    );
    expect(transparentButton).toBeTruthy();
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
    expect(view.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
      "cleared"
    );
    const button = view.container.querySelector("button");
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute("aria-label")).toBe("Clear Border; removes the saved color value");

    React.act(() => {
      button?.click();
    });

    expect(onClear).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test.each(invalidPresentColorValues)(
  "keeps invalid stored %s replaceable and clearable without a mount commit",
  (_label, value) => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    const view = mount(
      <SharedColorControl
        label="Color"
        value={value}
        onChange={onChange}
        onClear={onClear}
        pickerFallback="#334455"
      />
    );

    try {
      expect(view.container.firstElementChild?.getAttribute("data-shared-color-state")).toBe(
        "saved_custom"
      );
      expect(
        (view.container.querySelector('input[aria-label="Color value"]') as HTMLInputElement | null)
          ?.value
      ).toBe(value);
      expect(onChange).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();

      const clearButton = view.container.querySelector("button");
      expect(clearButton?.disabled).toBe(false);
      expect(clearButton?.getAttribute("aria-label")).toBe(
        "Clear Color; removes the saved color value"
      );

      React.act(() => {
        clearButton?.click();
      });

      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  }
);

test("rgba text now previews the extracted base color in the swatch while still allowing clear", () => {
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

    expect((swatch as HTMLInputElement | null)?.value).toBe("#0a141e");
    expect((text as HTMLInputElement | null)?.value).toBe("rgba(10, 20, 30, 0.4)");
    expect(button?.disabled).toBe(false);
    expect(button?.getAttribute("aria-label")).toBe("Clear Overlay; removes the saved color value");

    React.act(() => {
      button?.click();
    });

    expect(onClear).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});
