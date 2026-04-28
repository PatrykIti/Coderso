// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  spacerHeightTokens,
  type SpacerData,
} from "../../../core/widgets/core/spacer";

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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) =>
    values.filter(Boolean).join(" "),
}));

const variantSelectValues = ["responsive", "fixed"];
const heightSelectValues = [...spacerHeightTokens, "custom"];

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

const setInputValue = (element: Element | null | undefined, value: string) => {
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

const setSelectValue = (element: Element | null | undefined, value: string) => {
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

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  act(() => {
    element.click();
  });
};

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  act(() => {
    element.click();
  });
};

const findInputByPlaceholder = (
  container: ParentNode,
  placeholder: string,
  index = 0
) => {
  const input = Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  )[index];
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}" (${index})`);
  }
  return input;
};

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

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

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter(
    (element): element is HTMLSelectElement => {
      if (!(element instanceof HTMLSelectElement)) return false;
      const optionValues = Array.from(element.options).map((option) => option.value);
      return values.every((value) => optionValues.includes(value));
    }
  );

const findButtonByText = (container: ParentNode, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (element): element is HTMLButtonElement =>
      element instanceof HTMLButtonElement && element.textContent?.includes(text) === true
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button "${text}"`);
  }
  return button;
};

const findCheckbox = (container: ParentNode, index = 0) => {
  const checkbox = Array.from(container.querySelectorAll('input[type="checkbox"]'))[index];
  if (!(checkbox instanceof HTMLInputElement)) {
    throw new Error(`Missing checkbox (${index})`);
  }
  return checkbox;
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

const getDiagnosticsSnapshot = (container: ParentNode): SpacerData => {
  const snapshot = container.querySelector("pre");
  if (!(snapshot instanceof HTMLPreElement)) {
    throw new Error("Missing diagnostics snapshot");
  }
  return JSON.parse(snapshot.textContent ?? "{}") as SpacerData;
};

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
  initialVariant = "responsive",
}: {
  editor: EditorKind;
  initialValue: SpacerData;
  initialVariant?: string;
}) => {
  const {
    SpacerAdvancedEditor,
    SpacerVisualEditor,
    SpacerWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/SpacerEditors");

  const editorMap = {
    wizard: SpacerWizardEditor,
    visual: SpacerVisualEditor,
    advanced: SpacerAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState(initialValue);
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
  vi.restoreAllMocks();
});

test("Spacer wizard editor covers legacy variant fallback, token/custom height changes, and guide toggles", async () => {
  const view = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy-spacer",
    initialValue: {
      height: {
        desktop: "bad-value",
        tablet: "24",
        mobile: "40px",
      },
    },
  });

  try {
    const variantSelect = findSelectByOptions(view.container, variantSelectValues);
    expect(variantSelect.value).toBe("responsive");

    const initialHeightSelect = findSelectsByOptions(view.container, heightSelectValues)[0];
    const initialHeightInput = findInputByPlaceholder(view.container, "e.g. 48px");
    const guideToggle = findCheckbox(view.container);

    expect(initialHeightSelect?.value).toBe("16");
    expect(initialHeightInput.value).toBe("");
    expect(guideToggle.checked).toBe(true);

    setSelectValue(variantSelect, "fixed");
    expect(view.getVariant()).toBe("fixed");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("fixed");

    const unchangedCalls = view.onChangeSpy.mock.calls.length;
    setSelectValue(findSelectsByOptions(view.container, heightSelectValues)[0], "custom");
    expect(view.onChangeSpy).toHaveBeenCalledTimes(unchangedCalls);

    setSelectValue(findSelectsByOptions(view.container, heightSelectValues)[0], "20");
    expect(view.getValue()).toEqual({
      height: {
        desktop: "20",
        tablet: "20",
        mobile: "20",
      },
      showGuideInEditor: true,
    });

    setInputValue(findInputByPlaceholder(view.container, "e.g. 48px"), "48");
    expect(view.getValue()).toEqual({
      height: {
        desktop: "48px",
        tablet: "48px",
        mobile: "48px",
      },
      showGuideInEditor: true,
    });
    expect(findSelectsByOptions(view.container, heightSelectValues)[0]?.value).toBe("custom");
    expect(findInputByPlaceholder(view.container, "e.g. 48px").value).toBe("48px");

    setCheckboxValue(findCheckbox(view.container), false);
    expect(view.getValue()).toEqual({
      height: {
        desktop: "48px",
        tablet: "48px",
        mobile: "48px",
      },
      showGuideInEditor: false,
    });
  } finally {
    view.cleanup();
  }
});

test("Spacer visual editor covers fixed-mode fallback, responsive per-breakpoint edits, and guide state", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "fixed",
    initialValue: {
      height: {
        desktop: "10",
        tablet: "",
        mobile: "33px",
      },
      showGuideInEditor: false,
    },
  });

  try {
    const getVariantSection = () =>
      getSectionByTitle(view.container, "Variant and responsive behavior");
    const getHeightsSection = () => getSectionByTitle(view.container, "Responsive heights");

    expect(normalizeText(findButtonByText(getVariantSection(), "Fixed").textContent)).toContain(
      "selected"
    );
    expect(
      normalizeText(findButtonByText(getVariantSection(), "Responsive").textContent)
    ).toContain("pick");
    expect(normalizeText(getHeightsSection().textContent)).toContain(
      "fixed mode uses desktop height for tablet and mobile."
    );
    expect(normalizeText(getHeightsSection().textContent)).not.toContain("tablet height");

    clickButton(findButtonByText(getVariantSection(), "Responsive"));
    expect(view.getVariant()).toBe("responsive");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("responsive");

    expect(
      normalizeText(findButtonByText(getVariantSection(), "Responsive").textContent)
    ).toContain("selected");
    expect(normalizeText(getHeightsSection().textContent)).toContain("tablet height");
    expect(normalizeText(getHeightsSection().textContent)).toContain("mobile height");

    const heightSelects = findSelectsByOptions(getHeightsSection(), heightSelectValues);
    expect(heightSelects).toHaveLength(3);
    setSelectValue(heightSelects[1], "24");
    setInputValue(findInputsByPlaceholder(getHeightsSection(), "e.g. 48px")[2], "44");
    expect(view.getValue()).toEqual({
      height: {
        desktop: "10",
        tablet: "24",
        mobile: "44px",
      },
      showGuideInEditor: false,
    });
    expect(findSelectsByOptions(getHeightsSection(), heightSelectValues)[2]?.value).toBe(
      "custom"
    );

    setCheckboxValue(findCheckbox(getSectionByTitle(view.container, "Editor guide")), true);
    expect(view.getValue()).toEqual({
      height: {
        desktop: "10",
        tablet: "24",
        mobile: "44px",
      },
      showGuideInEditor: true,
    });
  } finally {
    view.cleanup();
  }
});

test("Spacer advanced editor keeps technical per-breakpoint controls while snapshot follows the active variant", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialVariant: "fixed",
    initialValue: {
      height: {
        desktop: "bad-value",
        tablet: "24",
        mobile: "bad-mobile",
      },
    },
  });

  try {
    const getTechnicalSection = () => getSectionByTitle(view.container, "Technical height tokens");

    expect(normalizeText(getTechnicalSection().textContent)).toContain("desktop height");
    expect(normalizeText(getTechnicalSection().textContent)).toContain("tablet height");
    expect(normalizeText(getTechnicalSection().textContent)).toContain("mobile height");
    expect(findSelectsByOptions(getTechnicalSection(), heightSelectValues)).toHaveLength(3);
    expect(
      findSelectsByOptions(getTechnicalSection(), heightSelectValues).map((select) => select.value)
    ).toEqual(["16", "24", "8"]);

    expect(getDiagnosticsSnapshot(view.container)).toEqual({
      height: {
        desktop: "16",
        tablet: "16",
        mobile: "16",
      },
      showGuideInEditor: true,
    });

    setInputValue(findInputsByPlaceholder(getTechnicalSection(), "e.g. 48px")[1], "44");
    setSelectValue(findSelectsByOptions(getTechnicalSection(), heightSelectValues)[2], "20");
    expect(view.getValue()).toEqual({
      height: {
        desktop: "16",
        tablet: "44px",
        mobile: "20",
      },
      showGuideInEditor: true,
    });
    expect(getDiagnosticsSnapshot(view.container)).toEqual({
      height: {
        desktop: "16",
        tablet: "16",
        mobile: "16",
      },
      showGuideInEditor: true,
    });

    setInputValue(findInputsByPlaceholder(getTechnicalSection(), "e.g. 48px")[0], "52");
    expect(view.getValue()).toEqual({
      height: {
        desktop: "52px",
        tablet: "44px",
        mobile: "20",
      },
      showGuideInEditor: true,
    });
    expect(getDiagnosticsSnapshot(view.container)).toEqual({
      height: {
        desktop: "52px",
        tablet: "52px",
        mobile: "52px",
      },
      showGuideInEditor: true,
    });
  } finally {
    view.cleanup();
  }
});

test("Spacer editors fall back to default height controls when normalized data omits height branches", async () => {
  vi.resetModules();

  let responsiveNormalizationCalls = 0;

  vi.doMock("../../../core/widgets/core/spacer", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/spacer")>(
      "../../../core/widgets/core/spacer"
    );

    return {
      ...actual,
      resolveSpacerVariant: vi.fn(() => "responsive"),
      normalizeSpacerData: vi.fn((_data: SpacerData, variant = "responsive") => {
        if (variant === "missing-height") {
          return {
            showGuideInEditor: false,
          } satisfies SpacerData;
        }

        if (variant === "empty-height") {
          return {
            height: {},
            showGuideInEditor: false,
          } satisfies SpacerData;
        }

        if (variant === "responsive") {
          responsiveNormalizationCalls += 1;

          return responsiveNormalizationCalls === 1
            ? ({
                showGuideInEditor: false,
              } satisfies SpacerData)
            : ({
                height: {},
                showGuideInEditor: false,
              } satisfies SpacerData);
        }

        return actual.normalizeSpacerData(_data, variant);
      }),
    };
  });

  const advancedMissingHeightView = await renderEditor({
    editor: "advanced",
    initialVariant: "missing-height",
    initialValue: {},
  });
  const advancedEmptyHeightView = await renderEditor({
    editor: "advanced",
    initialVariant: "empty-height",
    initialValue: {},
  });
  const wizardMissingHeightView = await renderEditor({
    editor: "wizard",
    initialVariant: "missing-height",
    initialValue: {},
  });
  const wizardEmptyHeightView = await renderEditor({
    editor: "wizard",
    initialVariant: "empty-height",
    initialValue: {},
  });

  try {
    const missingHeightTechnicalSection = getSectionByTitle(
      advancedMissingHeightView.container,
      "Technical height tokens"
    );
    expect(
      findSelectsByOptions(missingHeightTechnicalSection, heightSelectValues).map(
        (select) => select.value
      )
    ).toEqual(["16", "12", "8"]);
    expect(
      findInputsByPlaceholder(missingHeightTechnicalSection, "e.g. 48px").map(
        (input) => input.value
      )
    ).toEqual(["", "", ""]);
    expect(getDiagnosticsSnapshot(advancedMissingHeightView.container)).toEqual({
      showGuideInEditor: false,
    });

    const emptyHeightTechnicalSection = getSectionByTitle(
      advancedEmptyHeightView.container,
      "Technical height tokens"
    );
    expect(
      findSelectsByOptions(emptyHeightTechnicalSection, heightSelectValues).map(
        (select) => select.value
      )
    ).toEqual(["16", "12", "8"]);
    expect(
      findInputsByPlaceholder(emptyHeightTechnicalSection, "e.g. 48px").map(
        (input) => input.value
      )
    ).toEqual(["", "", ""]);
    expect(getDiagnosticsSnapshot(advancedEmptyHeightView.container)).toEqual({
      height: {},
      showGuideInEditor: false,
    });

    expect(findSelectByOptions(wizardMissingHeightView.container, variantSelectValues).value).toBe(
      "responsive"
    );
    expect(
      findSelectsByOptions(wizardMissingHeightView.container, heightSelectValues)[0]?.value
    ).toBe("16");
    expect(findInputByPlaceholder(wizardMissingHeightView.container, "e.g. 48px").value).toBe("");
    expect(findCheckbox(wizardMissingHeightView.container).checked).toBe(false);

    expect(findSelectByOptions(wizardEmptyHeightView.container, variantSelectValues).value).toBe(
      "responsive"
    );
    expect(findSelectsByOptions(wizardEmptyHeightView.container, heightSelectValues)[0]?.value).toBe(
      "16"
    );
    expect(findInputByPlaceholder(wizardEmptyHeightView.container, "e.g. 48px").value).toBe("");
    expect(findCheckbox(wizardEmptyHeightView.container).checked).toBe(false);
  } finally {
    advancedMissingHeightView.cleanup();
    advancedEmptyHeightView.cleanup();
    wizardMissingHeightView.cleanup();
    wizardEmptyHeightView.cleanup();
    vi.doUnmock("../../../core/widgets/core/spacer");
    vi.resetModules();
  }
});
