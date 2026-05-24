// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ToggleBlockData } from "../../../core/widgets/core/toggleBlock";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const toastInfo = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    info: toastInfo,
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      className={className}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string; disabled: boolean }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
            disabled: Boolean(child.props.disabled),
          },
        ];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
      disabled,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
      disabled?: boolean;
    }) => (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectValue: ({
      children,
      placeholder,
    }: {
      children?: React.ReactNode;
      placeholder?: string;
    }) => <>{children ?? placeholder ?? null}</>,
  };
});

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  React.act(() => {
    element.click();
  });
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const getSectionByTitle = (container: ParentNode, title: string) => {
  const section = Array.from(container.querySelectorAll("section")).find((candidate) =>
    Array.from(candidate.querySelectorAll("h3, p")).some(
      (node) => normalizeText(node.textContent) === normalizeText(title)
    )
  );
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing section "${title}"`);
  }
  return section;
};

const findButtonByText = (container: ParentNode, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (element) =>
      element instanceof HTMLButtonElement && element.textContent?.includes(text) === true
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button "${text}"`);
  }
  return button;
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) => {
  const input = Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}"`);
  }
  return input;
};

const findInputByAriaLabel = (container: ParentNode, label: string) => {
  const input = Array.from(container.querySelectorAll("input")).find(
    (element) => element instanceof HTMLInputElement && element.getAttribute("aria-label") === label
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with aria-label "${label}"`);
  }
  return input;
};

const findSelectByOptions = (container: ParentNode, values: string[]) => {
  const select = Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select with options ${values.join(", ")}`);
  }
  return select;
};

const getDiagnosticsSnapshot = (container: ParentNode): ToggleBlockData => {
  const snapshot = container.querySelector("pre");
  if (!(snapshot instanceof HTMLPreElement)) {
    throw new Error("Missing diagnostics snapshot");
  }
  return JSON.parse(snapshot.textContent ?? "{}") as ToggleBlockData;
};

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
  initialVariant = "switch",
}: {
  editor: EditorKind;
  initialValue: ToggleBlockData;
  initialVariant?: string;
}) => {
  const { ToggleBlockAdvancedEditor, ToggleBlockVisualEditor, ToggleBlockWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ToggleBlockEditors");

  const editorMap = {
    wizard: ToggleBlockWizardEditor,
    visual: ToggleBlockVisualEditor,
    advanced: ToggleBlockAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<ToggleBlockData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);

    return (
      <Editor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          latestVariant = next;
          onVariantChangeSpy(next);
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  return {
    ...view,
    getValue: () => latestValue,
    getVariant: () => latestVariant,
    onChangeSpy,
    onVariantChangeSpy,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  toastInfo.mockReset();
  vi.restoreAllMocks();
});

test("ToggleBlock wizard editor guides setup through variant, labels, and starting pane", async () => {
  const view = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy-toggle",
    initialValue: {},
  });

  try {
    expect(view.container.textContent).toContain("Step 1: Variant");
    expect(view.container.textContent).toContain("Step 2: Labels");
    expect(view.container.textContent).toContain("Step 3: Starting pane");
    expect(view.container.textContent).not.toContain("Theme");
    expect(view.container.textContent).not.toContain("Diagnostics");
    expect(
      view.container
        .querySelector('[data-widget-control="toggle-block.variant-preview.switch"]')
        ?.getAttribute("data-widget-control-ownership")
    ).toBe("preview");
    expect(
      view.container
        .querySelector('[data-widget-control="toggle-block.variant-preview.cards"]')
        ?.getAttribute("data-widget-control-ownership")
    ).toBe("preview");

    clickButton(findButtonByText(view.container, "Cards"));
    expect(view.getVariant()).toBe("cards");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("cards");

    const labelsSection = getSectionByTitle(view.container, "Step 2: Labels");
    const primaryInput = findInputByPlaceholder(labelsSection, "View A");
    const helperInput = findInputByPlaceholder(labelsSection, "Switch between two content views.");
    setInputValue(primaryInput, " Overview ");
    setInputValue(helperInput, "");

    const startingPaneSection = getSectionByTitle(view.container, "Step 3: Starting pane");
    const stateSelect = findSelectByOptions(startingPaneSection, ["primary", "secondary"]);
    setSelectValue(stateSelect, "secondary");

    expect(view.container.textContent).toContain(
      "Secondary pane opens first in preview and runtime"
    );
    expect(view.getValue()).toEqual({
      labels: {
        primary: "Overview",
        secondary: "View B",
        helper: "",
        ariaLabel: "Toggle content view",
        selectedSuffix: "selected",
      },
      options: {
        defaultState: "secondary",
        motion: "none",
      },
      style: {
        surfaceColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        accentColor: "var(--color-text)",
        accentContrastColor: "var(--color-background)",
        panes: {
          primary: {
            surface: "default",
            padding: "comfortable",
            radius: "md",
            borderEmphasis: "subtle",
          },
          secondary: {
            surface: "default",
            padding: "comfortable",
            radius: "md",
            borderEmphasis: "subtle",
          },
        },
      },
    });
  } finally {
    view.cleanup();
  }
});

test("ToggleBlock visual editor uses shared color controls, motion, and contrast advisory", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "switch",
    initialValue: {},
  });

  try {
    expect(view.container.textContent).toContain("Experience");
    expect(view.container.textContent).toContain("Theme");
    expect(view.container.textContent).toContain("Pane authoring");
    expect(view.container.textContent).not.toContain("Diagnostics");
    expect(view.container.textContent).not.toContain("Accessibility");

    clickButton(findButtonByText(view.container, "Cards"));
    expect(view.getVariant()).toBe("cards");

    const experienceSection = getSectionByTitle(view.container, "Experience");
    const motionSelect = findSelectByOptions(experienceSection, ["none", "fade", "slide"]);
    setSelectValue(motionSelect, "slide");

    const themeSection = getSectionByTitle(view.container, "Theme");
    expect(findInputByAriaLabel(themeSection, "Accent color swatch").value).toBe("#0f172a");
    expect(findInputByAriaLabel(themeSection, "Accent contrast color swatch").value).toBe(
      "#ffffff"
    );

    setInputValue(findInputByAriaLabel(themeSection, "Accent color value"), "#111111");
    setInputValue(findInputByAriaLabel(themeSection, "Accent contrast color value"), "#222222");

    expect(view.container.textContent).toContain("Configured colors may be hard to read together.");
    expect(view.container.textContent).toContain(
      "Toggle Block stays intentionally limited to two panes."
    );
    expect(view.getValue().options?.motion).toBe("slide");
    expect(view.getValue().style?.accentColor).toBe("#111111");
    expect(view.getValue().style?.accentContrastColor).toBe("#222222");
  } finally {
    view.cleanup();
  }
});

test("ToggleBlock advanced editor manages accessibility copy, pane tokens, and diagnostics", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialVariant: "cards",
    initialValue: {},
  });

  try {
    expect(view.container.textContent).toContain("Accessibility");
    expect(view.container.textContent).toContain("Pane cards");
    expect(view.container.textContent).toContain("Advanced tools");
    expect(view.container.textContent).toContain("Diagnostics");
    expect(
      view.container.querySelector('[data-widget-editor-section="toggle-block.variant"]')
    ).toBeNull();
    expect(
      view.container.querySelector('[data-widget-editor-section="toggle-block.theme"]')
    ).toBeNull();

    const accessibilitySection = getSectionByTitle(view.container, "Accessibility");
    setInputValue(
      findInputByPlaceholder(accessibilitySection, "Toggle content view"),
      "Przelacz widok"
    );
    setInputValue(findInputByPlaceholder(accessibilitySection, "selected"), "aktywny");

    const paneSection = getSectionByTitle(view.container, "Pane cards");
    const selects = Array.from(paneSection.querySelectorAll("select"));
    setSelectValue(selects[0], "contrast");
    setSelectValue(selects[3], "strong");
    setSelectValue(selects[4], "soft");
    setSelectValue(selects[6], "lg");

    expect(getDiagnosticsSnapshot(view.container)).toEqual({
      labels: {
        primary: "View A",
        secondary: "View B",
        helper: "Switch between two content views.",
        ariaLabel: "Przelacz widok",
        selectedSuffix: "aktywny",
      },
      options: {
        defaultState: "primary",
        motion: "none",
      },
      style: {
        surfaceColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        accentColor: "var(--color-text)",
        accentContrastColor: "var(--color-background)",
        panes: {
          primary: {
            surface: "contrast",
            padding: "comfortable",
            radius: "md",
            borderEmphasis: "strong",
          },
          secondary: {
            surface: "soft",
            padding: "comfortable",
            radius: "lg",
            borderEmphasis: "subtle",
          },
        },
      },
    });
  } finally {
    view.cleanup();
  }
});

test("ToggleBlock advanced editor resets to defaults with undo toast", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialValue: {
      labels: {
        primary: "Overview",
        secondary: "Specs",
        helper: "Focus",
      },
      options: {
        defaultState: "secondary",
        motion: "fade",
      },
      style: {
        accentColor: "#111111",
        accentContrastColor: "#ffffff",
        panes: {
          primary: {
            surface: "contrast",
            padding: "compact",
            radius: "sm",
            borderEmphasis: "strong",
          },
        },
      },
    },
  });

  try {
    clickButton(findButtonByText(view.container, "Reset to defaults"));

    expect(view.getValue()).toEqual({
      labels: {
        primary: "View A",
        secondary: "View B",
        helper: "Switch between two content views.",
        ariaLabel: "Toggle content view",
        selectedSuffix: "selected",
      },
      options: {
        defaultState: "primary",
        motion: "none",
      },
      style: {
        surfaceColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        accentColor: "var(--color-text)",
        accentContrastColor: "var(--color-background)",
        panes: {
          primary: {
            surface: "default",
            padding: "comfortable",
            radius: "md",
            borderEmphasis: "subtle",
          },
          secondary: {
            surface: "default",
            padding: "comfortable",
            radius: "md",
            borderEmphasis: "subtle",
          },
        },
      },
    });
    expect(toastInfo).toHaveBeenCalledTimes(1);
    expect(toastInfo.mock.calls[0]?.[0]).toBe("Toggle Block reset to defaults.");
  } finally {
    view.cleanup();
  }
});
