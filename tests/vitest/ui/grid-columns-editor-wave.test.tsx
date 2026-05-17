// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  gridColumnsColumnMax,
  gridColumnsColumnMin,
  gridColumnsDefaults,
  type GridColumnsData,
} from "../../../core/widgets/core/gridColumns";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

const allSpanOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));

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

const queryInputByPlaceholder = (container: ParentNode, placeholder: string, index = 0) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  )[index];

const findInputByPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
  const input = queryInputByPlaceholder(container, placeholder, index);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}" (${index})`);
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

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter(
    (element): element is HTMLSelectElement => {
      if (!(element instanceof HTMLSelectElement)) return false;
      const optionValues = Array.from(element.options).map((option) => option.value);
      return values.every((value) => optionValues.includes(value));
    }
  );

const findButtonsByText = (container: ParentNode, text: string) => {
  const buttons = Array.from(container.querySelectorAll("button")).filter(
    (element): element is HTMLButtonElement =>
      element instanceof HTMLButtonElement && element.textContent?.includes(text) === true
  );
  if (buttons.length === 0) {
    throw new Error(`Missing button "${text}"`);
  }
  return buttons;
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

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
  initialVariant = "equal",
  withVariantChange = true,
  context,
}: {
  editor: EditorKind;
  initialValue: GridColumnsData;
  initialVariant?: string;
  withVariantChange?: boolean;
  context?: import("../../../core/widgets/types").WidgetEditorProps<GridColumnsData>["context"];
}) => {
  const { GridColumnsAdvancedEditor, GridColumnsVisualEditor, GridColumnsWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/GridColumnsEditors");

  const editorMap = {
    wizard: GridColumnsWizardEditor,
    visual: GridColumnsVisualEditor,
    advanced: GridColumnsAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<GridColumnsData>(initialValue);
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
        context={context}
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

test("GridColumns wizard editor covers variant fallback, count clamp, label edits, and gap updates", async () => {
  const view = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy-grid",
    initialValue: {
      columns: [
        { id: "1", label: "   " },
        { id: "2", label: "Aside" },
        { id: "3", label: "Stats" },
        { id: "4", label: "Promo" },
        { id: "5", label: "FAQ" },
        { id: "6", label: "CTA" },
        { id: "7", label: "Overflow" },
      ],
      layout: {
        gapX: "bad" as never,
      },
    },
  });

  try {
    const variantSelect = findSelectByOptions(view.container, [
      "equal",
      "asymmetric",
      "masonry-lite",
    ]);
    const countSelect = findSelectByOptions(view.container, [
      String(gridColumnsColumnMin),
      "3",
      "4",
      "5",
      String(gridColumnsColumnMax),
    ]);
    const gapSelects = findSelectsByOptions(view.container, ["none", "2", "3", "4", "6", "8"]);

    expect(variantSelect.value).toBe("equal");
    expect(countSelect.value).toBe(String(gridColumnsColumnMax));
    expect(findInputByPlaceholder(view.container, "Column 1").value).toBe("Column 1");
    expect(findInputByPlaceholder(view.container, "Column 2").value).toBe("Aside");
    expect(gapSelects).toHaveLength(2);
    expect(gapSelects[0]?.value).toBe(gridColumnsDefaults.layout?.gapX);
    expect(gapSelects[1]?.value).toBe(gridColumnsDefaults.layout?.gapY);

    setSelectValue(variantSelect, "masonry-lite");
    expect(view.getVariant()).toBe("masonry-lite");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("masonry-lite");

    setSelectValue(countSelect, "4");
    expect(view.getValue().columns).toHaveLength(4);
    expect(view.getValue().columns?.[2]).toEqual(
      expect.objectContaining({
        id: "3",
        label: "Stats",
      })
    );
    expect(view.getValue().columns?.[3]).toEqual(
      expect.objectContaining({
        id: "4",
        label: "Promo",
        desktopSpan: "6",
        tabletSpan: "6",
        mobileSpan: "12",
      })
    );

    setInputValue(findInputByPlaceholder(view.container, "Column 1"), "Overview");
    setInputValue(findInputByPlaceholder(view.container, "Column 2"), "Sidebar");
    setSelectValue(gapSelects[0], "8");
    setSelectValue(gapSelects[1], "3");

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ label: "Overview" }),
          expect.objectContaining({ label: "Sidebar" }),
        ]),
        layout: expect.objectContaining({
          gapX: "8",
          gapY: "3",
        }),
      })
    );

    setSelectValue(countSelect, "2");
    expect(view.getValue().columns).toHaveLength(2);
    expect(view.onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("GridColumns variant controls ignore changes when variant handlers are absent", async () => {
  const wizardView = await renderEditor({
    editor: "wizard",
    initialVariant: "equal",
    initialValue: gridColumnsDefaults,
    withVariantChange: false,
  });
  const visualView = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: gridColumnsDefaults,
    withVariantChange: false,
  });

  try {
    const wizardVariantSelect = findSelectByOptions(wizardView.container, [
      "equal",
      "asymmetric",
      "masonry-lite",
    ]);
    const visualVariantSection = getSectionByTitle(
      visualView.container,
      "Variant and layout structure"
    );

    setSelectValue(wizardVariantSelect, "masonry-lite");
    clickButton(findButtonsByText(visualVariantSection, "Masonry Lite")[0]);

    expect(wizardView.getVariant()).toBe("equal");
    expect(wizardView.onVariantChangeSpy).not.toHaveBeenCalled();
    expect(visualView.getVariant()).toBe("equal");
    expect(visualView.onVariantChangeSpy).not.toHaveBeenCalled();
    expect(
      normalizeText(findButtonsByText(visualVariantSection, "Equal")[0]?.textContent)
    ).toContain("selected");
    expect(
      normalizeText(findButtonsByText(visualVariantSection, "Masonry Lite")[0]?.textContent)
    ).toContain("pick");
  } finally {
    wizardView.cleanup();
    visualView.cleanup();
  }
});

test("GridColumns visual editor covers variant cards, column sizing controls, and conditional card surface fields", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-grid",
    initialValue: {
      columns: [
        { id: "1", label: "Main", desktopSpan: "bad" as never },
        { id: "2", label: "Aside" },
      ],
      layout: {
        align: "edge" as never,
        gapX: "bad" as never,
      },
      style: {
        cardizeColumns: false,
        columnBackground: "token-surface",
        columnBorderColor: "#cbd5e1",
        columnBorderWidth: "9" as never,
        columnRadius: "pill" as never,
        columnPadding: "0" as never,
      },
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant and layout structure");
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");
    const surfaceSection = getSectionByTitle(view.container, "Gap and column surface");

    expect(normalizeText(findButtonsByText(variantSection, "Equal")[0]?.textContent)).toContain(
      "selected"
    );

    clickButton(findButtonsByText(variantSection, "Asymmetric")[0]);
    expect(view.getVariant()).toBe("asymmetric");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("asymmetric");

    const alignmentSelect = findSelectByOptions(variantSection, [
      "start",
      "center",
      "end",
      "stretch",
    ]);
    expect(alignmentSelect.value).toBe("start");
    setSelectValue(alignmentSelect, "stretch");

    const removeButton = findButtonsByText(columnSection, "Remove last config")[0];
    const addButton = findButtonsByText(columnSection, "Add column config")[0];
    expect(removeButton.disabled).toBe(true);
    expect(addButton.disabled).toBe(false);

    clickButton(addButton);
    clickButton(addButton);
    expect(view.getValue().columns).toHaveLength(4);
    expect(findInputByPlaceholder(columnSection, "Column 3").value).toBe("Column 3");

    setInputValue(findInputByPlaceholder(columnSection, "Column 3"), "Stats");
    const spanSelects = findSelectsByOptions(columnSection, allSpanOptions);
    setSelectValue(spanSelects[0], "8");
    setSelectValue(spanSelects[1], "4");
    setSelectValue(spanSelects[2], "12");

    clickButton(findButtonsByText(columnSection, "Remove last config")[0]);
    expect(view.getValue().columns).toHaveLength(3);

    const gapSelects = findSelectsByOptions(surfaceSection, ["none", "2", "3", "4", "6", "8"]);
    expect(gapSelects).toHaveLength(2);
    expect(gapSelects[0]?.value).toBe(gridColumnsDefaults.layout?.gapX);
    expect(gapSelects[1]?.value).toBe(gridColumnsDefaults.layout?.gapY);
    expect(queryInputByPlaceholder(surfaceSection, "var(--color-surface)")).toBeUndefined();

    setSelectValue(gapSelects[0], "8");
    setSelectValue(gapSelects[1], "2");

    clickButton(findButtonsByText(variantSection, "Masonry Lite")[0]);
    expect(view.getVariant()).toBe("masonry-lite");

    const cardizeToggle = surfaceSection.querySelector('input[type="checkbox"]');
    expect((cardizeToggle as HTMLInputElement | null | undefined)?.disabled).toBe(true);
    expect(normalizeText(surfaceSection.textContent)).toContain("masonry lite always renders");
    expect(view.getValue().style?.cardizeColumns).toBe(false);

    const backgroundTokenInput = findInputByPlaceholder(surfaceSection, "var(--color-surface)");
    const borderTokenInput = findInputByPlaceholder(surfaceSection, "var(--color-border)");
    const colorInputs = Array.from(surfaceSection.querySelectorAll('input[type="color"]'));
    expect((colorInputs[0] as HTMLInputElement | null | undefined)?.value).toBe("#f8fafc");
    expect((colorInputs[1] as HTMLInputElement | null | undefined)?.value).toBe("#cbd5e1");

    setInputValue(colorInputs[0], "#0f172a");
    setInputValue(colorInputs[1], "#475569");
    setInputValue(backgroundTokenInput, "#111827");
    setInputValue(borderTokenInput, "#334155");

    const borderWidthSelect = findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]);
    const radiusSelect = findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]);
    const paddingSelect = findSelectByOptions(surfaceSection, ["none", "2", "3", "4", "5", "6"]);
    setSelectValue(borderWidthSelect, "2");
    setSelectValue(radiusSelect, "2xl");
    setSelectValue(paddingSelect, "6");

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        layout: expect.objectContaining({
          align: "stretch",
          gapX: "8",
          gapY: "2",
        }),
        columns: expect.arrayContaining([
          expect.objectContaining({
            desktopSpan: "8",
            tabletSpan: "4",
            mobileSpan: "12",
          }),
          expect.objectContaining({
            label: "Stats",
          }),
        ]),
        style: expect.objectContaining({
          cardizeColumns: false,
          columnBackground: "#111827",
          columnBorderColor: "#334155",
          columnBorderWidth: "2",
          columnRadius: "2xl",
          columnPadding: "6",
        }),
      })
    );

    setCheckboxValue(surfaceSection.querySelector('input[type="checkbox"]') ?? undefined, false);
    expect(view.getValue().style?.cardizeColumns).toBe(false);
    expect(queryInputByPlaceholder(surfaceSection, "var(--color-surface)")).toBeInstanceOf(
      HTMLInputElement
    );
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor surfaces slot/config mismatch warnings when structure drift exists", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: {
      columns: [
        { id: "1", label: "Main" },
        { id: "2", label: "Aside" },
        { id: "3", label: "Extra" },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        { definitionId: "column", slotId: "column:1", label: "Column 1", kind: "repeatable" },
        { definitionId: "column", slotId: "column:2", label: "Column 2", kind: "repeatable" },
      ],
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant and layout structure");
    expect(normalizeText(variantSection.textContent)).toContain("current slot instances: 2");
    expect(normalizeText(variantSection.textContent)).toContain("out of sync");
  } finally {
    view.cleanup();
  }
});

test("GridColumns editors fall back to safe defaults when normalization returns sparse data", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/gridColumns", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/gridColumns")>(
      "../../../core/widgets/core/gridColumns"
    );

    return {
      ...actual,
      normalizeGridColumnsData: vi.fn((value: GridColumnsData) => value),
      gridColumnsDefaults: {
        ...actual.gridColumnsDefaults,
        layout: {
          ...actual.gridColumnsDefaults.layout,
          gapX: undefined,
          gapY: undefined,
        },
        style: {
          ...actual.gridColumnsDefaults.style,
          cardizeColumns: true,
          columnBackground: undefined,
          columnBorderColor: undefined,
          columnBorderWidth: undefined,
          columnRadius: undefined,
          columnPadding: undefined,
        },
      },
    };
  });

  const wizardView = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy-grid",
    initialValue: {},
  });
  const visualEmptyView = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-grid",
    initialValue: {},
  });
  const visualPartialView = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-grid",
    initialValue: {
      columns: [{}],
      layout: {},
    },
  });
  const advancedView = await renderEditor({
    editor: "advanced",
    initialValue: {},
  });

  try {
    const wizardVariantSelect = findSelectByOptions(wizardView.container, [
      "equal",
      "asymmetric",
      "masonry-lite",
    ]);
    const wizardCountSelect = findSelectByOptions(wizardView.container, [
      String(gridColumnsColumnMin),
      "3",
      "4",
      "5",
      String(gridColumnsColumnMax),
    ]);
    const wizardGapSelects = findSelectsByOptions(wizardView.container, [
      "none",
      "2",
      "3",
      "4",
      "6",
      "8",
    ]);

    expect(wizardVariantSelect.value).toBe("equal");
    expect(wizardCountSelect.value).toBe(String(gridColumnsColumnMin));
    expect(findInputByPlaceholder(wizardView.container, "Column 1").value).toBe("");
    expect(findInputByPlaceholder(wizardView.container, "Column 2").value).toBe("");
    expect(wizardGapSelects[0]?.value).toBe("6");
    expect(wizardGapSelects[1]?.value).toBe("6");

    setInputValue(findInputByPlaceholder(wizardView.container, "Column 1"), "Ignored");
    expect(wizardView.getValue()).toEqual({});

    setSelectValue(wizardCountSelect, "3");
    expect(wizardView.getValue()).toEqual({
      columns: [
        { id: "1", label: "Column 1", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Column 2", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "3", label: "Column 3", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      ],
    });

    const visualVariantSection = getSectionByTitle(
      visualEmptyView.container,
      "Variant and layout structure"
    );
    const visualColumnSection = getSectionByTitle(
      visualPartialView.container,
      "Column sizing and labels"
    );
    const visualSurfaceSection = getSectionByTitle(
      visualPartialView.container,
      "Gap and column surface"
    );
    const alignmentSelect = findSelectByOptions(visualVariantSection, [
      "start",
      "center",
      "end",
      "stretch",
    ]);
    const addButton = findButtonsByText(visualEmptyView.container, "Add column config")[0];
    const removeButton = findButtonsByText(visualEmptyView.container, "Remove last config")[0];
    const visualGapSelects = findSelectsByOptions(visualSurfaceSection, [
      "none",
      "2",
      "3",
      "4",
      "6",
      "8",
    ]);
    const visualSpanSelects = findSelectsByOptions(visualColumnSection, allSpanOptions);
    const visualColorInputs = Array.from(
      visualSurfaceSection.querySelectorAll('input[type="color"]')
    ).filter((element): element is HTMLInputElement => element instanceof HTMLInputElement);

    expect(alignmentSelect.value).toBe("start");
    expect(addButton.disabled).toBe(false);
    expect(removeButton.disabled).toBe(true);

    clickButton(addButton);
    expect(visualEmptyView.getValue().columns).toHaveLength(3);

    expect(visualColumnSection.textContent).toContain("slot: column:1");
    expect(findInputByPlaceholder(visualColumnSection, "Column 1").value).toBe("");
    expect(visualSpanSelects).toHaveLength(3);
    expect(visualSpanSelects[0]?.value).toBe("6");
    expect(visualSpanSelects[1]?.value).toBe("6");
    expect(visualSpanSelects[2]?.value).toBe("12");

    expect(visualGapSelects[0]?.value).toBe("6");
    expect(visualGapSelects[1]?.value).toBe("6");
    expect(visualColorInputs[0]?.value).toBe("#f8fafc");
    expect(visualColorInputs[1]?.value).toBe("#e2e8f0");
    expect(findInputByPlaceholder(visualSurfaceSection, "var(--color-surface)").value).toBe("");
    expect(findInputByPlaceholder(visualSurfaceSection, "var(--color-border)").value).toBe("");
    expect(findSelectByOptions(visualSurfaceSection, ["0", "1", "2", "3"]).value).toBe("1");
    expect(findSelectByOptions(visualSurfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("xl");
    expect(findSelectByOptions(visualSurfaceSection, ["none", "2", "3", "4", "5", "6"]).value).toBe(
      "4"
    );

    const advancedSection = getSectionByTitle(advancedView.container, "Technical layout tokens");
    const advancedSelects = Array.from(advancedSection.querySelectorAll("select")).filter(
      (element): element is HTMLSelectElement => element instanceof HTMLSelectElement
    );
    const advancedCardizeToggle = advancedSection.querySelector('input[type="checkbox"]');

    expect(advancedSelects[0]?.value).toBe("start");
    expect(advancedSelects[1]?.value).toBe("6");
    expect(advancedSelects[2]?.value).toBe("6");
    expect(advancedSelects[3]?.value).toBe("1");
    expect(advancedSelects[4]?.value).toBe("4");
    expect((advancedCardizeToggle as HTMLInputElement | null | undefined)?.checked).toBe(true);
  } finally {
    wizardView.cleanup();
    visualEmptyView.cleanup();
    visualPartialView.cleanup();
    advancedView.cleanup();
    vi.doUnmock("../../../core/widgets/core/gridColumns");
    vi.resetModules();
  }
});

test("GridColumns advanced editor covers normalized diagnostics and technical token updates", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialValue: {
      columns: [
        { id: "dup", label: "   ", desktopSpan: "bad" as never },
        {
          id: "dup",
          label: "Details",
          tabletSpan: "bad" as never,
          mobileSpan: "bad" as never,
        },
      ],
      layout: {
        align: "edge" as never,
        gapX: "bad" as never,
        gapY: "3",
      },
      style: {
        cardizeColumns: false,
        columnBackground: "token-surface",
        columnBorderColor: "token-border",
        columnBorderWidth: "9" as never,
        columnRadius: "pill" as never,
        columnPadding: "0" as never,
      },
    },
  });

  try {
    const technicalSection = getSectionByTitle(view.container, "Technical layout tokens");
    const snapshotSection = getSectionByTitle(view.container, "Raw payload snapshot");
    const snapshotBefore = snapshotSection.querySelector("pre");

    expect(snapshotBefore?.textContent).toContain('"id": "dup"');
    expect(snapshotBefore?.textContent).toContain('"id": "2"');
    expect(snapshotBefore?.textContent).toContain('"label": "Column 1"');
    expect(snapshotBefore?.textContent).toContain('"gapX": "6"');
    expect(snapshotBefore?.textContent).toContain('"gapY": "3"');
    expect(snapshotBefore?.textContent).toContain('"align": "start"');
    expect(snapshotBefore?.textContent).toContain('"columnBorderWidth": "1"');
    expect(snapshotBefore?.textContent).toContain('"columnRadius": "xl"');
    expect(snapshotBefore?.textContent).toContain('"columnPadding": "4"');

    const technicalSelects = Array.from(technicalSection.querySelectorAll("select"));
    setSelectValue(technicalSelects[0], "center");
    setSelectValue(technicalSelects[1], "8");
    setSelectValue(technicalSelects[2], "2");

    const cardizeToggle = technicalSection.querySelector('input[type="checkbox"]');
    setCheckboxValue(cardizeToggle ?? undefined, true);

    const borderWidthSelect = findSelectByOptions(technicalSection, ["0", "1", "2", "3"]);
    const paddingSelect = findSelectByOptions(technicalSection, ["none", "2", "3", "4", "5", "6"]);
    setSelectValue(borderWidthSelect, "3");
    setSelectValue(paddingSelect, "6");

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        layout: expect.objectContaining({
          align: "center",
          gapX: "8",
          gapY: "2",
        }),
        style: expect.objectContaining({
          cardizeColumns: true,
          columnBorderWidth: "3",
          columnPadding: "6",
        }),
      })
    );

    const snapshotAfter = getSectionByTitle(view.container, "Raw payload snapshot").querySelector(
      "pre"
    );
    expect(snapshotAfter?.textContent).toContain('"align": "center"');
    expect(snapshotAfter?.textContent).toContain('"gapX": "8"');
    expect(snapshotAfter?.textContent).toContain('"gapY": "2"');
    expect(snapshotAfter?.textContent).toContain('"cardizeColumns": true');
    expect(snapshotAfter?.textContent).toContain('"columnBorderWidth": "3"');
    expect(snapshotAfter?.textContent).toContain('"columnPadding": "6"');
    expect(view.onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
