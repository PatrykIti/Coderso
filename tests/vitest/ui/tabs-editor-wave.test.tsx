// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  tabsDefaults,
  tabsItemMax,
  tabsItemMin,
  type TabsData,
} from "../../../core/widgets/core/tabs";

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
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  act(() => {
    element.click();
  });
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
  const input = Array.from(container.querySelectorAll("input")).filter(
    (element) =>
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
  initialVariant = "pills",
}: {
  editor: EditorKind;
  initialValue: TabsData;
  initialVariant?: string;
}) => {
  const { TabsAdvancedEditor, TabsVisualEditor, TabsWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/TabsEditors");

  const editorMap = {
    wizard: TabsWizardEditor,
    visual: TabsVisualEditor,
    advanced: TabsAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<TabsData>(initialValue);
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

test("Tabs wizard editor covers variant fallback, item-count growth, active-tab selection, and item normalization", async () => {
  const view = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy-tabs",
    initialValue: {
      items: [
        { id: "overview", label: "Overview", description: "Primary overview." },
        { id: "details", label: "Details" },
      ],
      options: {
        activeId: "missing",
      },
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant");
    expect(normalizeText(findButtonsByText(variantSection, "Pills")[0]?.textContent)).toContain(
      "selected"
    );

    clickButton(findButtonsByText(variantSection, "Underline")[0]);
    expect(view.getVariant()).toBe("underline");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("underline");

    const structureSection = getSectionByTitle(view.container, "Tabs Structure");
    const countSelect = findSelectByOptions(structureSection, [
      String(tabsItemMin),
      "3",
      "4",
      "5",
      String(tabsItemMax),
    ]);
    const initialActiveSelect = findSelectByOptions(structureSection, ["overview", "details"]);

    expect(initialActiveSelect.value).toBe("overview");

    setSelectValue(countSelect, "3");
    expect(view.getValue().items).toHaveLength(3);
    expect(view.getValue().items?.[2]).toEqual(
      expect.objectContaining({
        id: "3",
        label: "Tab 3",
      })
    );
    expect(view.getValue().options?.activeId).toBe("overview");

    const activeSelect = findSelectByOptions(structureSection, ["overview", "details", "3"]);
    setSelectValue(activeSelect, "3");
    expect(view.getValue().options?.activeId).toBe("3");

    setInputValue(findInputByPlaceholder(structureSection, "Tab 1"), "   ");
    setInputValue(findInputByPlaceholder(structureSection, "Tab 3"), "Support");
    const descriptionInputs = findInputsByPlaceholder(structureSection, "Optional tab description");
    setInputValue(descriptionInputs[2], "Help panel details.");

    expect(view.getValue().items?.[0]?.label).toBe("Tab 1");
    expect(view.getValue().items?.[2]).toEqual(
      expect.objectContaining({
        id: "3",
        label: "Support",
        description: "Help panel details.",
      })
    );
    expect(view.onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("Tabs visual editor covers variant cards, alignment fallback, active-tab preservation, and style token updates", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-tabs",
    initialValue: {
      items: [
        { id: "intro", label: "Intro" },
        { id: "details", label: "Details", description: "Deep dive." },
        { id: "faq", label: "FAQ" },
      ],
      options: {
        activeId: "details",
        alignment: "edge" as never,
      },
      style: {
        surfaceColor: "   ",
        borderColor: "",
        activeBackgroundColor: "#111111",
        activeTextColor: "   ",
      },
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant");
    expect(normalizeText(findButtonsByText(variantSection, "Pills")[0]?.textContent)).toContain(
      "selected"
    );

    clickButton(findButtonsByText(variantSection, "Minimal")[0]);
    expect(view.getVariant()).toBe("minimal");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("minimal");

    const structureSection = getSectionByTitle(view.container, "Tabs Structure");
    const activeSelect = findSelectByOptions(structureSection, ["intro", "details", "faq"]);
    expect(activeSelect.value).toBe("details");

    const countSelect = findSelectByOptions(structureSection, [
      String(tabsItemMin),
      "3",
      "4",
      "5",
      String(tabsItemMax),
    ]);
    setSelectValue(countSelect, "2");
    expect(view.getValue().items).toHaveLength(2);
    expect(view.getValue().options?.activeId).toBe("details");

    const layoutSection = getSectionByTitle(view.container, "Layout");
    const alignmentSelect = findSelectByOptions(layoutSection, ["start", "center", "end"]);
    const surfaceColorInput = findInputByPlaceholder(layoutSection, "var(--color-surface)");
    const borderColorInput = findInputByPlaceholder(layoutSection, "var(--color-border)");
    const activeBackgroundInput = findInputByPlaceholder(layoutSection, "var(--color-text)");
    const activeTextColorInput = findInputByPlaceholder(layoutSection, "var(--color-background)");

    expect(alignmentSelect.value).toBe("start");
    expect(surfaceColorInput.value).toBe(tabsDefaults.style?.surfaceColor);
    expect(borderColorInput.value).toBe(tabsDefaults.style?.borderColor);
    expect(activeBackgroundInput.value).toBe("#111111");
    expect(activeTextColorInput.value).toBe(tabsDefaults.style?.activeTextColor);

    setSelectValue(alignmentSelect, "center");
    setInputValue(surfaceColorInput, "#f3f4f6");
    setInputValue(borderColorInput, "#d1d5db");
    setInputValue(activeBackgroundInput, "#111827");
    setInputValue(activeTextColorInput, "#fafafa");

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        options: expect.objectContaining({
          activeId: "details",
          alignment: "center",
        }),
        style: expect.objectContaining({
          surfaceColor: "#f3f4f6",
          borderColor: "#d1d5db",
          activeBackgroundColor: "#111827",
          activeTextColor: "#fafafa",
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("Tabs advanced editor covers diagnostics normalization, technical field updates, and variant switching", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialVariant: "legacy-tabs",
    initialValue: {
      items: [
        { id: "dup", label: "   ", description: "   " },
        { id: "dup", label: "Specs", description: "Specification sheet." },
      ],
      options: {
        activeId: "missing",
        alignment: "end",
      },
      style: {
        surfaceColor: "   ",
        borderColor: "token-border",
        activeBackgroundColor: "",
        activeTextColor: "",
      },
    },
  });

  try {
    const diagnosticsSection = getSectionByTitle(view.container, "Diagnostics");
    const snapshotBefore = diagnosticsSection.querySelector("pre");

    expect(snapshotBefore?.textContent).toContain('"id": "dup"');
    expect(snapshotBefore?.textContent).toContain('"id": "2"');
    expect(snapshotBefore?.textContent).toContain('"label": "Tab 1"');
    expect(snapshotBefore?.textContent).toContain('"activeId": "dup"');
    expect(snapshotBefore?.textContent).toContain('"alignment": "end"');
    expect(snapshotBefore?.textContent).not.toContain('"surfaceColor"');
    expect(snapshotBefore?.textContent).toContain('"borderColor": "token-border"');

    const variantSection = getSectionByTitle(view.container, "Variant");
    clickButton(findButtonsByText(variantSection, "Minimal")[0]);
    expect(view.getVariant()).toBe("minimal");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("minimal");

    const structureSection = getSectionByTitle(view.container, "Tabs Structure");
    const activeSelect = findSelectByOptions(structureSection, ["dup", "2"]);
    setSelectValue(activeSelect, "2");
    const descriptionInputs = findInputsByPlaceholder(structureSection, "Optional tab description");
    setInputValue(descriptionInputs[0], "Primary details restored.");

    const layoutSection = getSectionByTitle(view.container, "Layout");
    const borderColorInput = findInputByPlaceholder(layoutSection, "var(--color-border)");
    setInputValue(borderColorInput, "#222222");

    const snapshotAfter = getSectionByTitle(view.container, "Diagnostics").querySelector("pre");
    expect(view.getValue()).toEqual(
      expect.objectContaining({
        options: expect.objectContaining({
          activeId: "2",
        }),
        style: expect.objectContaining({
          borderColor: "#222222",
        }),
      })
    );
    expect(snapshotAfter?.textContent).toContain('"activeId": "2"');
    expect(snapshotAfter?.textContent).toContain('"borderColor": "#222222"');
    expect(snapshotAfter?.textContent).toContain('"description": "Primary details restored."');
  } finally {
    view.cleanup();
  }
});
