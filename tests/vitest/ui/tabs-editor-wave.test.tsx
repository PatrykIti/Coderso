// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { tabsDefaults, type TabsData } from "../../../core/widgets/core/tabs";
import type { WidgetEditorProps } from "../../../core/widgets/types";

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
  if (!(element instanceof HTMLInputElement) || element.type !== "checkbox") return;
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

const findColorInputByLabel = (container: ParentNode, label: string) => {
  const input = Array.from(container.querySelectorAll('input[type="color"]')).find(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("aria-label") === label
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing color input "${label}"`);
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

const findCheckboxes = (container: ParentNode) =>
  Array.from(container.querySelectorAll('input[type="checkbox"]')).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.type === "checkbox"
  );

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const getSectionByTitle = (container: ParentNode, title: string) => {
  const section = Array.from(container.querySelectorAll("section")).find(
    (candidate) =>
      normalizeText(candidate.querySelector("h3")?.textContent) === normalizeText(title)
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
  initialVariant = "pills",
  context,
}: {
  editor: EditorKind;
  initialValue: TabsData;
  initialVariant?: string;
  context?: WidgetEditorProps<TabsData>["context"];
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

test("Tabs editors expose non-overlapping writable ownership metadata", async () => {
  const baseValue: TabsData = {
    items: [
      { id: "overview", label: "Overview", panelIntro: "Primary overview." },
      {
        id: "details",
        label: "Details",
        triggerDescription: "Deep dive",
        icon: "⭐",
        disabled: true,
      },
    ],
    options: {
      defaultItemId: "overview",
      activeId: "overview",
      orientation: "horizontal",
    },
  };
  const wizard = await renderEditor({ editor: "wizard", initialValue: baseValue });
  const visual = await renderEditor({ editor: "visual", initialValue: baseValue });
  const advanced = await renderEditor({ editor: "advanced", initialValue: baseValue });

  try {
    const wizardPaths = writablePaths(wizard.container);
    const visualPaths = writablePaths(visual.container);
    const advancedPaths = writablePaths(advanced.container);
    const duplicatePaths = [...wizardPaths, ...visualPaths, ...advancedPaths].filter(
      (path, index, paths) => paths.indexOf(path) !== index
    );

    expect(wizardPaths).toEqual([]);
    expect(visualPaths).toEqual(
      expect.arrayContaining([
        "variant",
        "options.defaultItemId",
        "items.0.label",
        "items.0.panelIntro",
        "items.0.triggerDescription",
        "items.0.icon",
        "items.0.disabled",
        "options.orientation",
        "options.alignment",
        "options.containerPadding",
        "options.triggerGap",
        "options.panelGap",
      ])
    );
    expect(wizardPaths).not.toContain("variant");
    expect(wizardPaths).not.toContain("items.count");
    expect(wizardPaths).not.toContain("options.orientation");
    expect(visualPaths).not.toContain("items.count");
    expect(advancedPaths).toEqual([]);
    expect(duplicatePaths).toEqual([]);
  } finally {
    wizard.cleanup();
    visual.cleanup();
    advanced.cleanup();
  }
});

test("Tabs wizard editor summarizes slot-owned panel count without mutating starter labels", async () => {
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
    context: {
      surface: "page-builder",
      slotTargets: [
        { definitionId: "panel", slotId: "panel:1", label: "Panel 1", kind: "repeatable" },
        { definitionId: "panel", slotId: "panel:2", label: "Panel 2", kind: "repeatable" },
        { definitionId: "panel", slotId: "panel:3", label: "Panel 3", kind: "repeatable" },
        { definitionId: "panel", slotId: "panel:4", label: "Panel 4", kind: "repeatable" },
      ],
    },
  });

  try {
    expect(() => getSectionByTitle(view.container, "Variant")).toThrow();
    expect(() => getSectionByTitle(view.container, "Layout")).toThrow();

    const structureSection = getSectionByTitle(view.container, "Starter tabs");
    expect(structureSection.querySelectorAll("select")).toHaveLength(0);
    expect(structureSection.textContent).toContain("4 panels from Structure");
    expect(structureSection.textContent).toContain("2 saved starter labels");
    expect(structureSection.textContent).toContain("Structure owns rendered tab panels");
    expect(structureSection.textContent).toContain("Visual Structure");
    expect(structureSection.textContent).not.toContain("Tab subtitle");
    expect(structureSection.textContent).toContain("Visual owns the default tab choice");

    expect(structureSection.querySelectorAll("input")).toHaveLength(0);
    expect(view.getValue().items?.[0]?.label).toBe("Overview");
    expect(view.getValue().items?.[0]?.description).toBe("Primary overview.");
    expect(structureSection.textContent).toContain("Primary overview.");
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("Tabs visual editor covers metadata, disabled-tab fallback, layout controls, and color parity", async () => {
  const confirmSpy = vi.fn(() => true);
  Object.defineProperty(window, "confirm", {
    value: confirmSpy,
    configurable: true,
  });
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-tabs",
    initialValue: {
      items: [
        { id: "intro", label: "Intro", triggerDescription: "Start here", icon: "⭐" },
        { id: "details", label: "Details", description: "Deep dive." },
        { id: "faq", label: "FAQ" },
      ],
      options: {
        activeId: "details",
        alignment: "edge" as never,
        triggerOverflow: "bad" as never,
      },
      style: {
        surfaceColor: "   ",
        borderColor: "",
        activeBackgroundColor: "#111111",
        activeTextColor: "   ",
        panelBackgroundColor: "   ",
      },
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant");
    expect(normalizeText(findButtonsByText(variantSection, "Pills")[0]?.textContent)).toContain(
      "current style"
    );
    expect(variantSection.querySelector('[data-tabs-variant-preview="pills"]')).not.toBeNull();
    expect(variantSection.querySelector('[data-tabs-variant-preview="underline"]')).not.toBeNull();
    expect(variantSection.querySelector('[data-tabs-variant-preview="minimal"]')).not.toBeNull();

    clickButton(findButtonsByText(variantSection, "Minimal")[0]);
    expect(view.getVariant()).toBe("minimal");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("minimal");

    const structureSection = getSectionByTitle(view.container, "Tab content");
    expect(findInputsByPlaceholder(structureSection, "Optional content intro text")[1]?.value).toBe(
      "Deep dive."
    );

    setInputValue(
      findInputsByPlaceholder(structureSection, "Optional tab subtitle")[0],
      "Start here first"
    );
    setInputValue(findInputsByPlaceholder(structureSection, "e.g. ⭐")[0], "🚀");
    setCheckboxValue(findCheckboxes(structureSection)[1], true);

    expect(confirmSpy).not.toHaveBeenCalled();

    const layoutSection = getSectionByTitle(view.container, "Layout");
    const alignmentSelect = findSelectByOptions(layoutSection, ["start", "center", "end"]);
    const orientationSelect = findSelectByOptions(layoutSection, ["horizontal", "vertical"]);
    const containerPaddingSelect = findSelectByOptions(layoutSection, ["sm", "md", "lg"]);
    const allSpacingSelects = Array.from(layoutSection.querySelectorAll("select")).filter(
      (element): element is HTMLSelectElement =>
        element instanceof HTMLSelectElement &&
        Array.from(element.options)
          .map((option) => option.value)
          .join(",") === "sm,md,lg"
    );
    const triggerGapSelect = allSpacingSelects[1];
    const panelGapSelect = allSpacingSelects[2];

    expect(alignmentSelect.value).toBe("start");
    expect(orientationSelect.value).toBe("horizontal");
    expect(layoutSection.textContent).not.toContain("Scroll");
    expect(layoutSection.textContent).not.toContain("overflow");
    setSelectValue(alignmentSelect, "center");
    setSelectValue(orientationSelect, "vertical");
    setSelectValue(containerPaddingSelect, "lg");
    setSelectValue(triggerGapSelect, "sm");
    setSelectValue(panelGapSelect, "lg");

    const triggerStyleSection = getSectionByTitle(view.container, "Tab label style");
    const triggerTextSizeSelect = findSelectByOptions(triggerStyleSection, ["xs", "sm", "base"]);
    const triggerWeightSelect = findSelectByOptions(triggerStyleSection, [
      "normal",
      "medium",
      "semibold",
    ]);
    const motionSelect = findSelectByOptions(triggerStyleSection, ["none", "fade", "slide"]);
    setSelectValue(triggerTextSizeSelect, "base");
    setSelectValue(triggerWeightSelect, "semibold");
    setSelectValue(motionSelect, "slide");

    const colorsSection = getSectionByTitle(view.container, "Colors");
    const surfaceColorInput = findColorInputByLabel(colorsSection, "Surface color swatch");
    const panelBackgroundInput = findColorInputByLabel(colorsSection, "Content background swatch");
    const borderColorInput = findColorInputByLabel(colorsSection, "Border color swatch");
    const activeBackgroundInput = findColorInputByLabel(colorsSection, "Active background swatch");
    const inactiveTextColorInput = findColorInputByLabel(
      colorsSection,
      "Inactive text color swatch"
    );
    const activeTextColorInput = findColorInputByLabel(colorsSection, "Active text color swatch");

    expect(colorsSection.textContent).not.toContain("var(--color");
    expect(colorsSection.textContent).toContain("Theme default");
    expect(colorsSection.textContent).toContain("fallback preview");
    expect(colorsSection.textContent).not.toContain("Saved custom color");
    expect(findInputsByPlaceholder(colorsSection, "var(--color-surface)")).toHaveLength(0);
    expect(
      Array.from(colorsSection.querySelectorAll("button")).filter(
        (button) => button.textContent === "Clear"
      )
    ).toHaveLength(6);
    expect(surfaceColorInput.value).toBe("#f8fafc");
    expect(panelBackgroundInput.value).toBe("#f8fafc");
    expect(borderColorInput.value).toBe("#cbd5e1");
    expect(activeBackgroundInput.value).toBe("#111111");
    expect(activeTextColorInput.value).toBe("#ffffff");
    expect(inactiveTextColorInput.value).toBe("#0f172a");

    setInputValue(surfaceColorInput, "#f3f4f6");
    setInputValue(borderColorInput, "#d1d5db");
    setInputValue(activeBackgroundInput, "#111827");
    setInputValue(activeTextColorInput, "#fafafa");
    setInputValue(inactiveTextColorInput, "#334155");
    setInputValue(panelBackgroundInput, "#ffffff");

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: "intro",
            triggerDescription: "Start here first",
            icon: "🚀",
          }),
          expect.objectContaining({
            id: "details",
            panelIntro: "Deep dive.",
            disabled: true,
          }),
        ]),
        options: expect.objectContaining({
          defaultItemId: "details",
          activeId: "intro",
          alignment: "center",
          orientation: "vertical",
          triggerOverflow: "wrap",
          containerPadding: "lg",
          triggerGap: "sm",
          panelGap: "lg",
          triggerTextSize: "base",
          triggerFontWeight: "semibold",
          motion: "slide",
        }),
        style: expect.objectContaining({
          surfaceColor: "#f3f4f6",
          borderColor: "#d1d5db",
          activeBackgroundColor: "#111827",
          activeTextColor: "#fafafa",
          inactiveTextColor: "#334155",
          panelBackgroundColor: "#ffffff",
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("Tabs colors section surfaces contrast advisories when trigger colors lose readability", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {
      ...tabsDefaults,
      style: {
        ...tabsDefaults.style,
        surfaceColor: "#111111",
        inactiveTextColor: "#111111",
        activeBackgroundColor: "#222222",
        activeTextColor: "#222222",
      },
    },
  });

  try {
    const colorsSection = getSectionByTitle(view.container, "Colors");
    expect(colorsSection.textContent).toContain(
      "Active tab: Configured colors may be hard to read together."
    );
    expect(colorsSection.textContent).toContain(
      "Inactive tab: Configured colors may be hard to read together."
    );
  } finally {
    view.cleanup();
  }
});

test("Tabs advanced editor exposes read-only human summaries without raw diagnostics", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialVariant: "legacy-tabs",
    initialValue: {
      items: [
        { id: "dup", label: "   ", description: "   ", disabled: true },
        { id: "dup", label: "Specs", description: "Specification sheet.", disabled: true },
      ],
      options: {
        activeId: "missing",
        defaultItemId: "missing",
        alignment: "end",
        orientation: "vertical",
        triggerOverflow: "scroll",
        motion: "fade",
      },
      style: {
        surfaceColor: "   ",
        borderColor: "token-border",
        activeBackgroundColor: "",
        activeTextColor: "",
        panelBackgroundColor: "",
      },
    },
  });

  try {
    const diagnosticsSection = getSectionByTitle(view.container, "Behavior summary");
    const itemsSection = getSectionByTitle(view.container, "Saved tabs summary");
    const displaySection = getSectionByTitle(view.container, "Saved display summary");
    const summarySection = getSectionByTitle(view.container, "Contract summary");

    expect(diagnosticsSection.textContent).toContain("Opens on");
    expect(diagnosticsSection.textContent).toContain("Default tab");
    expect(diagnosticsSection.textContent).toContain("Unavailable tabs");
    expect(diagnosticsSection.textContent).toContain("Saved scroll overflow is legacy");
    expect(diagnosticsSection.textContent).toContain("tabs wrap onto extra lines");
    expect(itemsSection.textContent).toContain("Tab 1; intro text saved; no subtitle; no icon");
    expect(itemsSection.textContent).toContain("Specs; intro text saved");
    expect(displaySection.textContent).toContain("Vertical; End aligned");
    expect(displaySection.textContent).toContain("Fade motion");
    expect(displaySection.textContent).toContain("saved color choices");
    expect(summarySection.textContent).toContain("Structure panel changes");
    expect(summarySection.textContent).toContain("Advanced only summarizes the saved state");
    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.textContent).not.toContain('"id"');
    expect(view.container.textContent).not.toContain("trigger-");
    expect(view.container.textContent).not.toContain("panel-");
    expect(view.container.textContent).not.toContain("token-border");
    expect(view.container.textContent).not.toContain("Runtime payload");
    expect(view.container.textContent).not.toContain("Technical ids");

    expect(() => getSectionByTitle(view.container, "Variant")).toThrow();
    expect(() => getSectionByTitle(view.container, "Tab content")).toThrow();
    expect(() => getSectionByTitle(view.container, "Layout")).toThrow();
    expect(() => getSectionByTitle(view.container, "Tab label style")).toThrow();
    expect(() => getSectionByTitle(view.container, "Colors")).toThrow();
    expect(view.container.querySelectorAll("input, select, button")).toHaveLength(0);
    expect(writablePaths(view.container)).toEqual([]);
    expect(view.onChangeSpy).not.toHaveBeenCalled();
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
