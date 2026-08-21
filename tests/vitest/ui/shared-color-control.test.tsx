// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test, vi } from "vitest";

import { SectionCanvas } from "../../../core/admin/ui/pages/editor/PageAuthoringCanvas";
import { ColorSwatchControl } from "../../../core/admin/ui/pages/editorControls/ColorSwatchControl";
import {
  SharedColorControl,
  describeSharedColorControlState,
} from "../../../core/admin/ui/shared/SharedColorControl";
import { PageEditorColorPaletteContext } from "../../../core/services/pages/pageEditorColorPaletteContext";
import { getPageEditorColorPalette } from "../../../core/services/pages/pageEditorControlUiModel";
import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";
import { mergeTokens } from "../../../core/services/theme/tokenUtils";
import { toPageCanvasBrandColorCssVariableMap } from "../../../core/ui/theme/tokenCss";
import {
  baseCanvasProps,
  createPageBlockV2,
  createPageSectionV2,
  sectionWithBrandBlockProps,
} from "./pageAuthoringCanvasHarness";

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

// TASK-481-03-L02: the brand swatch preview unification invariant. For a given
// brand token, the inline text-color toolbar swatch, the block-level
// ColorSwatchControl swatch, and the in-canvas content scope brand CSS var all
// resolve to the SAME site palette value (getPageEditorColorPalette(site)), and
// the committed mark stays the var(--color-*) token. jsdom/happy-dom does not
// resolve custom properties, so previews are asserted on style strings /
// previewValue; the real cascade is covered by the Playwright smoke
// (TASK-481-04-L01).
describe("brand swatch preview agreement (TASK-481-03)", () => {
  // Non-default site tokens so a stale DEFAULT_TOKENS fallback is visible.
  const site = mergeTokens(DEFAULT_TOKENS, {
    colors: { primary: "#0b3d91", secondary: "#7f1d1d", accent: "#166534" },
    neutrals: { border: "#475569" },
  });
  // The SINGLE palette owner both controls consume (inline via the context the
  // PageEditorRoot provider seeds, block via the registry palette prop).
  const palette = getPageEditorColorPalette(site);
  const brandIds = ["primary", "secondary", "accent", "border"] as const;

  const mountInlineCanvas = (onApplyTextMark = vi.fn()) => {
    const section = createPageSectionV2("content", {
      id: "sec-brand-agreement",
      blocks: [
        createPageBlockV2("heading", {
          id: "blk-brand-agreement",
          props: { text: "Canvas headline", level: "h2", align: "left" },
        }),
      ],
    });
    const view = mount(
      <PageEditorColorPaletteContext.Provider value={palette}>
        <SectionCanvas
          section={section}
          baseSection={section}
          selected
          selectedBlockPath={[{ index: 0 }]}
          selectedBlockId="blk-brand-agreement"
          inlineEditTarget={{ blockId: "blk-brand-agreement", propPath: "text" }}
          {...baseCanvasProps}
          onApplyTextMark={onApplyTextMark}
        />
      </PageEditorColorPaletteContext.Provider>
    );
    return { view, onApplyTextMark };
  };

  test("inline toolbar and block control preview the SAME site value for every brand id", () => {
    const { view: inlineView } = mountInlineCanvas();
    const blockView = mount(
      <PageEditorColorPaletteContext.Provider value={palette}>
        <ColorSwatchControl
          label="Accent"
          value="var(--color-accent)"
          onChange={vi.fn()}
          palette={palette}
        />
      </PageEditorColorPaletteContext.Provider>
    );

    try {
      for (const id of brandIds) {
        const swatch = palette.find((entry) => entry.id === id);
        expect(swatch?.previewValue, `palette entry for ${id}`).toBeTruthy();
        const previewValue = swatch?.previewValue as string;

        // Inline toolbar swatch (live-palette path through the context).
        const inlineSwatch = inlineView.container.querySelector(
          `[data-page-editor-text-color-swatch="${id}"]`
        ) as HTMLElement | null;
        expect(inlineSwatch, `inline ${id} swatch`).toBeTruthy();
        expect(inlineSwatch?.getAttribute("style") ?? "", `inline ${id} preview`).toContain(
          previewValue
        );
        expect(
          inlineSwatch?.getAttribute("style") ?? "",
          `inline ${id} must not fall back to DEFAULT_TOKENS`
        ).not.toContain(DEFAULT_TOKENS.colors.primary);

        // Block-level ColorSwatchControl swatch (same palette, same value).
        const blockSwatch = blockView.container.querySelector(
          `[data-page-editor-color-swatch="${id}"]`
        ) as HTMLElement | null;
        expect(blockSwatch, `block ${id} swatch`).toBeTruthy();
        expect(blockSwatch?.getAttribute("style") ?? "", `block ${id} preview`).toContain(
          previewValue
        );
      }
    } finally {
      inlineView.cleanup();
      blockView.cleanup();
    }
  });

  test("the in-canvas content scope resolves each brand var to the same site value", () => {
    const brandVars = toPageCanvasBrandColorCssVariableMap(site);
    const view = mount(
      <SectionCanvas {...sectionWithBrandBlockProps} contentBrandTokenVariables={brandVars} />
    );

    try {
      const sectionScope = view.container.querySelector(
        "section[data-page-editor-section] > [data-page-editor-content]"
      ) as HTMLElement | null;
      const blockScope = view.container.querySelector(
        '[data-page-editor-block-id="blk-brand-heading"] > [data-page-editor-content]'
      ) as HTMLElement | null;
      expect(sectionScope).toBeTruthy();
      expect(blockScope).toBeTruthy();
      for (const id of brandIds) {
        const swatch = palette.find((entry) => entry.id === id);
        expect(sectionScope?.getAttribute("style") ?? "", `section scope ${id}`).toContain(
          `--color-${id}: ${swatch?.previewValue}`
        );
        expect(blockScope?.getAttribute("style") ?? "", `block scope ${id}`).toContain(
          `--color-${id}: ${swatch?.previewValue}`
        );
      }
    } finally {
      view.cleanup();
    }
  });

  test("the committed mark value stays the var(--color-*) token (not the hex)", () => {
    const { view, onApplyTextMark } = mountInlineCanvas();

    try {
      const region = view.container.querySelector(
        '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
      ) as HTMLElement | null;
      const textNode = region?.firstChild;
      expect(textNode?.nodeType).toBe(Node.TEXT_NODE);
      React.act(() => {
        if (!region || !textNode) return;
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 6);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        region.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      });

      const accentSwatch = view.container.querySelector(
        '[data-page-editor-text-color-swatch="accent"]'
      ) as HTMLButtonElement | null;
      expect(accentSwatch?.disabled).toBe(false);
      React.act(() => {
        accentSwatch?.click();
      });

      expect(onApplyTextMark).toHaveBeenCalledWith(
        expect.objectContaining({
          blockId: "blk-brand-agreement",
          propPath: "text",
          type: "color",
          from: 0,
          to: 6,
          color: "var(--color-accent)",
        })
      );
    } finally {
      view.cleanup();
      window.getSelection()?.removeAllRanges();
    }
  });
});
