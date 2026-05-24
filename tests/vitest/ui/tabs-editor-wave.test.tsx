// @vitest-environment happy-dom

import React, { useState } from "react";
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

    expect(wizardPaths).toEqual(expect.arrayContaining(["items.count", "options.defaultItemId"]));
    expect(visualPaths).toEqual(
      expect.arrayContaining([
        "variant",
        "items.0.label",
        "items.0.panelIntro",
        "items.0.triggerDescription",
        "items.0.icon",
        "items.0.disabled",
        "options.orientation",
        "options.alignment",
        "options.triggerOverflow",
        "options.containerPadding",
        "options.triggerGap",
        "options.panelGap",
      ])
    );
    expect(wizardPaths).not.toContain("variant");
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

test("Tabs wizard editor covers starter item-count growth and default-tab selection", async () => {
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
    expect(() => getSectionByTitle(view.container, "Variant")).toThrow();
    expect(() => getSectionByTitle(view.container, "Layout")).toThrow();

    const structureSection = getSectionByTitle(view.container, "Starter tabs");
    const countSelect = findSelectByOptions(structureSection, [
      String(tabsItemMin),
      "3",
      "4",
      "5",
      String(tabsItemMax),
    ]);
    const defaultSelect = findSelectByOptions(structureSection, ["overview", "details"]);

    expect(structureSection.textContent).toContain("matching panel slot");
    expect(structureSection.textContent).not.toContain("Trigger subtitle");
    expect(structureSection.textContent).toContain("Visual owns daily label edits");
    expect(defaultSelect.value).toBe("overview");

    setSelectValue(countSelect, "3");
    expect(view.getValue().items).toHaveLength(3);
    expect(view.getValue().items?.[2]).toEqual(
      expect.objectContaining({
        id: "3",
        label: "Tab 3",
        disabled: false,
      })
    );
    expect(view.getValue().options).toEqual(
      expect.objectContaining({
        defaultItemId: "overview",
        activeId: "overview",
      })
    );

    const updatedDefaultSelect = findSelectByOptions(structureSection, [
      "overview",
      "details",
      "3",
    ]);
    setSelectValue(updatedDefaultSelect, "3");
    expect(view.getValue().options?.defaultItemId).toBe("3");
    expect(view.getValue().options?.activeId).toBe("3");

    expect(structureSection.querySelectorAll("input")).toHaveLength(0);
    expect(view.getValue().items?.[0]?.label).toBe("Overview");
    expect(view.getValue().items?.[0]?.panelIntro).toBe("Primary overview.");
    expect(view.onChangeSpy).toHaveBeenCalled();
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
      "selected"
    );
    expect(variantSection.querySelector('[data-tabs-variant-preview="pills"]')).not.toBeNull();
    expect(variantSection.querySelector('[data-tabs-variant-preview="underline"]')).not.toBeNull();
    expect(variantSection.querySelector('[data-tabs-variant-preview="minimal"]')).not.toBeNull();

    clickButton(findButtonsByText(variantSection, "Minimal")[0]);
    expect(view.getVariant()).toBe("minimal");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("minimal");

    const structureSection = getSectionByTitle(view.container, "Tab content");
    expect(findInputsByPlaceholder(structureSection, "Optional panel intro text")[1]?.value).toBe(
      "Deep dive."
    );

    setInputValue(
      findInputsByPlaceholder(structureSection, "Optional trigger subtitle")[0],
      "Start here first"
    );
    setInputValue(findInputsByPlaceholder(structureSection, "e.g. ⭐")[0], "🚀");
    setCheckboxValue(findCheckboxes(structureSection)[1], true);

    expect(confirmSpy).not.toHaveBeenCalled();

    const layoutSection = getSectionByTitle(view.container, "Layout");
    const alignmentSelect = findSelectByOptions(layoutSection, ["start", "center", "end"]);
    const orientationSelect = findSelectByOptions(layoutSection, ["horizontal", "vertical"]);
    const overflowSelect = findSelectByOptions(layoutSection, ["wrap", "scroll"]);
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
    expect(overflowSelect.value).toBe("wrap");
    setSelectValue(alignmentSelect, "center");
    setSelectValue(orientationSelect, "vertical");
    setSelectValue(overflowSelect, "scroll");
    setSelectValue(containerPaddingSelect, "lg");
    setSelectValue(triggerGapSelect, "sm");
    setSelectValue(panelGapSelect, "lg");

    const triggerStyleSection = getSectionByTitle(view.container, "Trigger style");
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
    const surfaceColorInput = findInputByPlaceholder(colorsSection, "var(--color-surface)", 0);
    const panelBackgroundInput = findInputByPlaceholder(colorsSection, "var(--color-surface)", 1);
    const borderColorInput = findInputByPlaceholder(colorsSection, "var(--color-border)");
    const activeBackgroundInput = findInputByPlaceholder(colorsSection, "var(--color-text)", 0);
    const inactiveTextColorInput = findInputByPlaceholder(colorsSection, "var(--color-text)", 1);
    const activeTextColorInput = findInputByPlaceholder(colorsSection, "var(--color-background)");

    expect(surfaceColorInput.value).toBe("");
    expect(panelBackgroundInput.value).toBe("");
    expect(borderColorInput.value).toBe(tabsDefaults.style?.borderColor);
    expect(activeBackgroundInput.value).toBe("#111111");
    expect(activeTextColorInput.value).toBe(tabsDefaults.style?.activeTextColor);
    expect(inactiveTextColorInput.value).toBe(tabsDefaults.style?.inactiveTextColor);

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
          triggerOverflow: "scroll",
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

test("Tabs advanced editor exposes read-only runtime diagnostics and normalized payload", async () => {
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
    const diagnosticsSection = getSectionByTitle(view.container, "Runtime diagnostics");
    const idsSection = getSectionByTitle(view.container, "Technical ids");
    const payloadSection = getSectionByTitle(view.container, "Runtime payload");
    const summarySection = getSectionByTitle(view.container, "Contract summary");
    const snapshotBefore = payloadSection.querySelector("pre");

    expect(diagnosticsSection.textContent).toContain("Active tab");
    expect(diagnosticsSection.textContent).toContain("Default tab");
    expect(diagnosticsSection.textContent).toContain("Disabled tabs");
    expect(diagnosticsSection.textContent).toContain("Root-scoped tabs");
    expect(idsSection.textContent).toContain("trigger suffix=trigger-dup");
    expect(idsSection.textContent).toContain("panel suffix=panel-2");
    expect(summarySection.textContent).toContain("Advanced is read-only diagnostics");
    expect(snapshotBefore?.textContent).toContain('"id": "dup"');
    expect(snapshotBefore?.textContent).toContain('"id": "2"');
    expect(snapshotBefore?.textContent).toContain('"label": "Tab 1"');
    expect(snapshotBefore?.textContent).toContain('"panelIntro": "Specification sheet."');
    expect(snapshotBefore?.textContent).toContain('"defaultItemId": "dup"');
    expect(snapshotBefore?.textContent).toContain('"activeId": "dup"');
    expect(snapshotBefore?.textContent).toContain('"alignment": "end"');
    expect(snapshotBefore?.textContent).toContain('"orientation": "vertical"');
    expect(snapshotBefore?.textContent).toContain('"triggerOverflow": "scroll"');
    expect(snapshotBefore?.textContent).toContain('"motion": "fade"');
    expect(snapshotBefore?.textContent).toContain('"disabled": false');
    expect(snapshotBefore?.textContent).not.toContain('"surfaceColor"');
    expect(snapshotBefore?.textContent).toContain('"borderColor": "token-border"');

    expect(() => getSectionByTitle(view.container, "Variant")).toThrow();
    expect(() => getSectionByTitle(view.container, "Tab content")).toThrow();
    expect(() => getSectionByTitle(view.container, "Layout")).toThrow();
    expect(() => getSectionByTitle(view.container, "Trigger style")).toThrow();
    expect(() => getSectionByTitle(view.container, "Colors")).toThrow();
    expect(view.container.querySelectorAll("input, select, button")).toHaveLength(0);
    expect(writablePaths(view.container)).toEqual([]);
    expect(view.onChangeSpy).not.toHaveBeenCalled();
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
