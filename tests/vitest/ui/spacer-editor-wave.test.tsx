// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { spacerHeightTokens, type SpacerData } from "../../../core/widgets/core/spacer";

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
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

const variantSelectValues = ["responsive", "fixed"];
const heightSelectValues = [...spacerHeightTokens.filter((token) => token !== "0"), "custom"];

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

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  React.act(() => {
    element.click();
  });
};

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  React.act(() => {
    element.click();
  });
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
    Array.from(candidate.querySelectorAll("p, h3")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing section "${title}"`);
  }
  return section;
};

const writablePaths = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-widget-control-path]"))
    .filter((element) => element.getAttribute("data-widget-control-readonly") !== "true")
    .map((element) => element.getAttribute("data-widget-control-path"))
    .filter((path): path is string => Boolean(path));

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
  const { SpacerAdvancedEditor, SpacerVisualEditor, SpacerWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SpacerEditors");

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

test("Spacer editors expose truthful mode ownership metadata", async () => {
  const baseValue: SpacerData = {
    height: {
      desktop: "16",
      tablet: "12",
      mobile: "8",
    },
    showGuideInEditor: true,
  };
  const wizard = await renderEditor({ editor: "wizard", initialValue: baseValue });
  const visual = await renderEditor({ editor: "visual", initialValue: baseValue });
  const advanced = await renderEditor({ editor: "advanced", initialValue: baseValue });

  try {
    expect(writablePaths(wizard.container)).toEqual([]);
    expect(writablePaths(visual.container)).toEqual(
      expect.arrayContaining([
        "variant",
        "height",
        "height.desktop",
        "height.tablet",
        "height.mobile",
        "showGuideInEditor",
      ])
    );
    expect(writablePaths(advanced.container)).toEqual([]);
  } finally {
    wizard.cleanup();
    visual.cleanup();
    advanced.cleanup();
  }
});

test("Spacer wizard editor keeps mode and height guidance read-only while daily editing stays in Visual", async () => {
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
    const variantSummary = view.container.querySelector(
      '[data-widget-control="spacer.wizard.variant"]'
    );
    expect(variantSummary?.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(variantSummary?.textContent).toContain("Responsive");

    const initialHeightSelect = findSelectsByOptions(view.container, heightSelectValues)[0];
    const guideToggle = view.container.querySelector('input[type="checkbox"]');

    expect(initialHeightSelect).toBeUndefined();
    expect(normalizeText(view.container.textContent)).toContain(
      "desktop: 16 / tablet: 24 / phone: 40px"
    );
    expect(normalizeText(view.container.textContent)).toContain(
      "visual owns spacer heights after setup"
    );
    expect(guideToggle).toBeNull();
    expect(normalizeText(view.container.textContent)).toContain(
      "visual owns the editor guide toggle after setup"
    );
    expect(
      Array.from(view.container.querySelectorAll("select")).some((element) => {
        if (!(element instanceof HTMLSelectElement)) return false;
        const optionValues = Array.from(element.options).map((option) => option.value);
        return variantSelectValues.every((value) => optionValues.includes(value));
      })
    ).toBe(false);
    expect(view.getVariant()).toBe("legacy-spacer");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
    expect(findSelectsByOptions(view.container, heightSelectValues)[0]).toBeUndefined();
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
    expect(normalizeText(getHeightsSection().textContent)).toContain(
      "applies to desktop previews and wide screens"
    );
    expect(normalizeText(getHeightsSection().textContent)).toContain(
      "applies to tablet previews before desktop takes over"
    );
    expect(normalizeText(getHeightsSection().textContent)).toContain(
      "applies to phone previews before tablet takes over"
    );
    expect(normalizeText(getHeightsSection().textContent)).toContain(
      "saved custom value is active. pick a preset to replace it."
    );
    expect(normalizeText(getHeightsSection().textContent)).not.toContain("clamp(");
    expect(normalizeText(getHeightsSection().textContent)).not.toContain("tailwind");
    expect(normalizeText(getHeightsSection().textContent)).not.toContain("1024px");
    expect(normalizeText(getHeightsSection().textContent)).not.toContain("768px");

    const heightSelects = findSelectsByOptions(getHeightsSection(), heightSelectValues);
    expect(heightSelects).toHaveLength(3);
    setSelectValue(heightSelects[1], "24");
    setSelectValue(heightSelects[2], "12");
    expect(view.getValue()).toEqual({
      height: {
        desktop: "10",
        tablet: "24",
        mobile: "12",
      },
      showGuideInEditor: false,
    });
    expect(findSelectsByOptions(getHeightsSection(), heightSelectValues)[2]?.value).toBe("12");

    setCheckboxValue(findCheckbox(getSectionByTitle(view.container, "Editor guide")), true);
    expect(view.getValue()).toEqual({
      height: {
        desktop: "10",
        tablet: "24",
        mobile: "12",
      },
      showGuideInEditor: true,
    });
  } finally {
    view.cleanup();
  }
});

test("Spacer presets preserve hidden fixed-mode values and stay transient after manual overrides", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "fixed",
    initialValue: {
      height: {
        desktop: "40px",
        tablet: "24",
        mobile: "12",
      },
      showGuideInEditor: true,
    },
  });

  try {
    const getVariantSection = () =>
      getSectionByTitle(view.container, "Variant and responsive behavior");
    const getHeightsSection = () => getSectionByTitle(view.container, "Responsive heights");

    expect(normalizeText(getHeightsSection().textContent)).toContain(
      "manual heights are active. presets stay available as shortcuts."
    );
    expect(normalizeText(getHeightsSection().textContent)).toContain(
      "fixed mode preserves the saved tablet and mobile heights. presets update the desktop height only while fixed is active, so switch to responsive to apply a full preset across phone, tablet, and desktop."
    );

    clickButton(findButtonByText(getHeightsSection(), "Hero gap"));
    expect(view.getValue()).toEqual({
      height: {
        desktop: "24",
        tablet: "24",
        mobile: "12",
      },
      showGuideInEditor: true,
    });
    expect(normalizeText(getHeightsSection().textContent)).toContain(
      "manual heights are active. presets stay available as shortcuts."
    );

    clickButton(findButtonByText(getVariantSection(), "Responsive"));
    expect(view.getVariant()).toBe("responsive");
    expect(
      findSelectsByOptions(getHeightsSection(), heightSelectValues).map((select) => select.value)
    ).toEqual(["24", "24", "12"]);

    clickButton(findButtonByText(getHeightsSection(), "Hero gap"));
    expect(view.getValue()).toEqual({
      height: {
        desktop: "24",
        tablet: "20",
        mobile: "16",
      },
      showGuideInEditor: true,
    });
    expect(normalizeText(getHeightsSection().textContent)).toContain("current preset: hero gap.");

    setSelectValue(findSelectsByOptions(getHeightsSection(), heightSelectValues)[2], "12");
    expect(view.getValue()).toEqual({
      height: {
        desktop: "24",
        tablet: "20",
        mobile: "12",
      },
      showGuideInEditor: true,
    });
    expect(normalizeText(getHeightsSection().textContent)).toContain(
      "manual heights are active. presets stay available as shortcuts."
    );
  } finally {
    view.cleanup();
  }
});

test("Spacer advanced editor is read-only and reflects runtime fixed-mode spacing", async () => {
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
    const runtimeSection = getSectionByTitle(view.container, "Runtime spacing summary");
    const supportSection = getSectionByTitle(view.container, "Support summary");

    expect(normalizeText(runtimeSection.textContent)).toContain("desktop height");
    expect(normalizeText(runtimeSection.textContent)).toContain("section gap");
    expect(normalizeText(runtimeSection.textContent)).not.toContain("hero gap");
    expect(normalizeText(supportSection.textContent)).toContain("fixed rhythm");
    expect(normalizeText(supportSection.textContent)).toContain(
      "tablet or mobile fallback values are preserved for responsive mode."
    );
    expect(view.container.querySelectorAll("input, select, button")).toHaveLength(0);
    expect(view.container.querySelector("pre")).toBeNull();
    expect(writablePaths(view.container)).toEqual([]);
    expect(view.onChangeSpy).not.toHaveBeenCalled();
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

        return actual.normalizeSpacerData(_data);
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
    const missingHeightRuntimeSection = getSectionByTitle(
      advancedMissingHeightView.container,
      "Runtime spacing summary"
    );
    expect(normalizeText(missingHeightRuntimeSection.textContent)).toContain("section gap");
    expect(normalizeText(missingHeightRuntimeSection.textContent)).toContain("standard gap");
    expect(normalizeText(missingHeightRuntimeSection.textContent)).toContain("card gap");
    expect(
      advancedMissingHeightView.container.querySelectorAll("input, select, button")
    ).toHaveLength(0);
    expect(advancedMissingHeightView.container.querySelector("pre")).toBeNull();

    const emptyHeightRuntimeSection = getSectionByTitle(
      advancedEmptyHeightView.container,
      "Runtime spacing summary"
    );
    expect(normalizeText(emptyHeightRuntimeSection.textContent)).toContain("section gap");
    expect(normalizeText(emptyHeightRuntimeSection.textContent)).toContain("standard gap");
    expect(normalizeText(emptyHeightRuntimeSection.textContent)).toContain("card gap");
    expect(
      advancedEmptyHeightView.container.querySelectorAll("input, select, button")
    ).toHaveLength(0);
    expect(advancedEmptyHeightView.container.querySelector("pre")).toBeNull();

    const wizardMissingVariantSummary = wizardMissingHeightView.container.querySelector(
      '[data-widget-control="spacer.wizard.variant"]'
    );
    expect(wizardMissingVariantSummary?.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(wizardMissingVariantSummary?.textContent).toContain("Responsive");
    expect(normalizeText(wizardMissingHeightView.container.textContent)).toContain(
      "desktop: 16 / tablet: 12 / phone: 8"
    );
    expect(wizardMissingHeightView.container.querySelector('input[type="checkbox"]')).toBeNull();

    const wizardEmptyVariantSummary = wizardEmptyHeightView.container.querySelector(
      '[data-widget-control="spacer.wizard.variant"]'
    );
    expect(wizardEmptyVariantSummary?.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(wizardEmptyVariantSummary?.textContent).toContain("Responsive");
    expect(normalizeText(wizardEmptyHeightView.container.textContent)).toContain(
      "desktop: 16 / tablet: 12 / phone: 8"
    );
    expect(wizardEmptyHeightView.container.querySelector('input[type="checkbox"]')).toBeNull();
  } finally {
    advancedMissingHeightView.cleanup();
    advancedEmptyHeightView.cleanup();
    wizardMissingHeightView.cleanup();
    wizardEmptyHeightView.cleanup();
    vi.doUnmock("../../../core/widgets/core/spacer");
    vi.resetModules();
  }
});
