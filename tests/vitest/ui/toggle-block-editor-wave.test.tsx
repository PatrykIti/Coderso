// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ToggleBlockData } from "../../../core/widgets/core/toggleBlock";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
  cn: (...values: Array<string | boolean | null | undefined>) =>
    values.filter(Boolean).join(" "),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButton = (element: Element | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  act(() => {
    element.click();
  });
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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const getSectionByTitle = (container: ParentNode, title: string) => {
  const section = Array.from(container.querySelectorAll("section")).find((candidate) =>
    Array.from(candidate.querySelectorAll("p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing section "${title}"`);
  }
  return section;
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
  withVariantChange = true,
}: {
  editor: EditorKind;
  initialValue: ToggleBlockData;
  initialVariant?: string;
  withVariantChange?: boolean;
}) => {
  const {
    ToggleBlockAdvancedEditor,
    ToggleBlockVisualEditor,
    ToggleBlockWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/ToggleBlockEditors");

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
        onVariantChange={
          withVariantChange
            ? (next) => {
                latestVariant = next;
                onVariantChangeSpy(next);
                setVariant(next);
              }
            : undefined
        }
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
  vi.restoreAllMocks();
});

test("ToggleBlock wizard editor covers variant fallback and label normalization", async () => {
  const view = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy-toggle",
    initialValue: {},
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant");
    expect(normalizeText(findButtonByText(variantSection, "Switch").textContent)).toContain(
      "selected"
    );
    expect(normalizeText(findButtonByText(variantSection, "Cards").textContent)).toContain("pick");
    expect(view.container.textContent).not.toContain("Behavior and Style");

    clickButton(findButtonByText(variantSection, "Cards"));
    expect(view.getVariant()).toBe("cards");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("cards");

    const labelsSection = getSectionByTitle(view.container, "Labels");
    const primaryInput = findInputByPlaceholder(labelsSection, "View A");
    const secondaryInput = findInputByPlaceholder(labelsSection, "View B");
    const helperInput = findInputByPlaceholder(
      labelsSection,
      "Switch between two content views."
    );

    expect(primaryInput.value).toBe("View A");
    expect(secondaryInput.value).toBe("View B");
    expect(helperInput.value).toBe("Switch between two content views.");

    setInputValue(primaryInput, " Overview ");
    setInputValue(secondaryInput, "   ");
    setInputValue(helperInput, "");

    expect(view.getValue()).toEqual({
      labels: {
        primary: "Overview",
        secondary: "View B",
        helper: "Switch between two content views.",
      },
      options: {
        defaultState: "primary",
      },
      style: {
        surfaceColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        accentColor: "var(--color-text)",
      },
    });
    expect(view.onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ToggleBlock visual editor covers behavior controls and style token normalization", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "cards",
    initialValue: {
      labels: {
        primary: "Summary",
        secondary: "Details",
        helper: "Switch views",
      },
      options: {
        defaultState: "secondary",
      },
      style: {
        surfaceColor: "   ",
        borderColor: "",
        accentColor: "#111111",
      },
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant");
    expect(normalizeText(findButtonByText(variantSection, "Cards").textContent)).toContain(
      "selected"
    );

    clickButton(findButtonByText(variantSection, "Switch"));
    expect(view.getVariant()).toBe("switch");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("switch");

    const behaviorSection = getSectionByTitle(view.container, "Behavior and Style");
    const stateSelect = findSelectByOptions(behaviorSection, ["primary", "secondary"]);
    const surfaceInput = findInputByPlaceholder(behaviorSection, "var(--color-surface)");
    const borderInput = findInputByPlaceholder(behaviorSection, "var(--color-border)");
    const accentInput = findInputByPlaceholder(behaviorSection, "var(--color-text)");

    expect(stateSelect.value).toBe("secondary");
    expect(view.container.textContent).not.toContain("Diagnostics");

    setSelectValue(stateSelect, "primary");
    setInputValue(surfaceInput, " #fafafa ");
    setInputValue(borderInput, "   ");
    setInputValue(accentInput, " #ff5500 ");

    expect(view.getValue()).toEqual({
      labels: {
        primary: "Summary",
        secondary: "Details",
        helper: "Switch views",
      },
      options: {
        defaultState: "primary",
      },
      style: {
        surfaceColor: "#fafafa",
        borderColor: "var(--color-border)",
        accentColor: "#ff5500",
      },
    });
    expect(view.onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ToggleBlock advanced editor renders diagnostics from normalized data and tolerates missing variant callback", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialVariant: "legacy-toggle",
    withVariantChange: false,
    initialValue: {
      labels: {
        primary: " Overview ",
        secondary: "   ",
        helper: "  ",
      },
      options: {
        defaultState: "secondary",
      },
      style: {
        surfaceColor: "",
        borderColor: " #222222 ",
        accentColor: "   ",
      },
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant");
    expect(normalizeText(findButtonByText(variantSection, "Switch").textContent)).toContain(
      "selected"
    );

    clickButton(findButtonByText(variantSection, "Cards"));
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();

    expect(getDiagnosticsSnapshot(view.container)).toEqual({
      labels: {
        primary: "Overview",
        secondary: "View B",
        helper: "Switch between two content views.",
      },
      options: {
        defaultState: "secondary",
      },
      style: {
        surfaceColor: "var(--color-surface)",
        borderColor: "#222222",
        accentColor: "var(--color-text)",
      },
    });

    const labelsSection = getSectionByTitle(view.container, "Labels");
    const behaviorSection = getSectionByTitle(view.container, "Behavior and Style");
    const helperInput = findInputByPlaceholder(
      labelsSection,
      "Switch between two content views."
    );
    const stateSelect = findSelectByOptions(behaviorSection, ["primary", "secondary"]);
    const surfaceInput = findInputByPlaceholder(behaviorSection, "var(--color-surface)");

    setInputValue(helperInput, "Shared context");
    setSelectValue(stateSelect, "primary");
    setInputValue(surfaceInput, " #f5f5f5 ");

    expect(getDiagnosticsSnapshot(view.container)).toEqual({
      labels: {
        primary: "Overview",
        secondary: "View B",
        helper: "Shared context",
      },
      options: {
        defaultState: "primary",
      },
      style: {
        surfaceColor: "#f5f5f5",
        borderColor: "#222222",
        accentColor: "var(--color-text)",
      },
    });
    expect(view.onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ToggleBlock editor controls fall back safely when normalized fields are partial", async () => {
  vi.resetModules();

  vi.doMock("../../../core/widgets/core/toggleBlock", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/toggleBlock")>(
      "../../../core/widgets/core/toggleBlock"
    );

    const partialNormalized: ToggleBlockData = {
      labels: {
        primary: undefined,
        secondary: undefined,
        helper: undefined,
      },
      style: {
        surfaceColor: undefined,
        borderColor: undefined,
        accentColor: undefined,
      },
    };

    const partialDefaults: ToggleBlockData = {
      labels: {
        primary: undefined,
        secondary: "Fallback secondary",
        helper: undefined,
      },
      style: {
        surfaceColor: undefined,
        borderColor: "var(--fallback-border)",
        accentColor: undefined,
      },
    };

    return {
      ...actual,
      normalizeToggleBlockData: vi.fn(() => partialNormalized),
      toggleBlockDefaults: partialDefaults,
    };
  });

  const wizardView = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy-toggle",
    initialValue: {},
  });
  const visualView = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-toggle",
    initialValue: {},
  });
  const advancedView = await renderEditor({
    editor: "advanced",
    initialVariant: "legacy-toggle",
    initialValue: {},
  });

  try {
    const wizardLabels = getSectionByTitle(wizardView.container, "Labels");
    expect(findInputByPlaceholder(wizardLabels, "View A").value).toBe("");
    expect(findInputByPlaceholder(wizardLabels, "View B").value).toBe("Fallback secondary");
    expect(findInputByPlaceholder(wizardLabels, "Switch between two content views.").value).toBe(
      ""
    );

    const visualBehavior = getSectionByTitle(visualView.container, "Behavior and Style");
    expect(findSelectByOptions(visualBehavior, ["primary", "secondary"]).value).toBe("primary");
    expect(findInputByPlaceholder(visualBehavior, "var(--color-surface)").value).toBe("");
    expect(findInputByPlaceholder(visualBehavior, "var(--color-border)").value).toBe(
      "var(--fallback-border)"
    );
    expect(findInputByPlaceholder(visualBehavior, "var(--color-text)").value).toBe("");

    expect(getDiagnosticsSnapshot(advancedView.container)).toEqual({
      labels: {},
      style: {},
    });
  } finally {
    wizardView.cleanup();
    visualView.cleanup();
    advancedView.cleanup();
    vi.doUnmock("../../../core/widgets/core/toggleBlock");
    vi.resetModules();
  }
});

test("ToggleBlock visual editor uses empty strings when secondary and border defaults are absent", async () => {
  vi.resetModules();

  vi.doMock("../../../core/widgets/core/toggleBlock", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/toggleBlock")>(
      "../../../core/widgets/core/toggleBlock"
    );

    return {
      ...actual,
      normalizeToggleBlockData: vi.fn(() => ({
        labels: {},
        style: {},
      })),
      toggleBlockDefaults: {
        labels: {
          primary: "View A",
          helper: "Switch between two content views.",
        },
        options: {
          defaultState: "primary",
        },
        style: {
          surfaceColor: "var(--color-surface)",
          accentColor: "var(--color-text)",
        },
      } satisfies ToggleBlockData,
    };
  });

  const view = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-toggle",
    initialValue: {},
  });

  try {
    const labelsSection = getSectionByTitle(view.container, "Labels");
    const behaviorSection = getSectionByTitle(view.container, "Behavior and Style");

    expect(findInputByPlaceholder(labelsSection, "View B").value).toBe("");
    expect(findInputByPlaceholder(behaviorSection, "var(--color-border)").value).toBe("");
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/toggleBlock");
    vi.resetModules();
  }
});
