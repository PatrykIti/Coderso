// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  accordionDefaults,
  accordionItemMax,
  type AccordionData,
} from "../../../core/widgets/core/accordion";
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

const toggleCheckbox = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  React.act(() => {
    element.click();
  });
};

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findAllInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputsByType = (container: ParentNode, type: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) => element instanceof HTMLInputElement && element.type === type
  );

const findButtonByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((element) =>
    (element.textContent ?? "").includes(text)
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const readDiagnostics = (container: ParentNode) => {
  const diagnostics = container.querySelector("pre");
  if (!(diagnostics instanceof HTMLPreElement)) {
    throw new Error("Missing diagnostics preview");
  }
  return JSON.parse(diagnostics.textContent ?? "{}") as AccordionData;
};

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
  initialVariant = "soft",
  initialContext,
}: {
  editor: EditorKind;
  initialValue: AccordionData;
  initialVariant?: string;
  initialContext?: WidgetEditorProps<AccordionData>["context"];
}) => {
  const { AccordionAdvancedEditor, AccordionVisualEditor, AccordionWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/AccordionEditors");

  const editorMap = {
    wizard: AccordionWizardEditor,
    visual: AccordionVisualEditor,
    advanced: AccordionAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<AccordionData>(initialValue);
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
        context={initialContext}
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

test("Accordion wizard editor resolves legacy variants, preserves a valid open item, and updates generated items", async () => {
  const view = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy",
    initialValue: {
      items: [
        { id: "1", title: "Intro", description: "Start here" },
        { id: "2", title: "Pricing", description: "Plans overview" },
      ],
      options: {
        initiallyOpenId: "2",
        allowMultiple: false,
      },
      style: accordionDefaults.style,
    },
  });

  try {
    expect(view.container.innerHTML).toContain('data-widget-editor-section="accordion.items"');
    expect(findButtonByText(view.container, "Soft")?.textContent).toContain("Selected");
    expect(findButtonByText(view.container, "Bordered")?.textContent).toContain("Pick");

    clickElement(findButtonByText(view.container, "Bordered"));
    expect(view.getVariant()).toBe("bordered");
    expect(view.onVariantChangeSpy).toHaveBeenCalledWith("bordered");

    setSelectValue(
      findSelectByOptions(view.container, ["2", "3", "4", String(accordionItemMax)]),
      "4"
    );

    expect(view.getValue().items).toHaveLength(4);
    expect(view.getValue().options?.initiallyOpenId).toBe("2");
    expect(view.getValue().items?.[2]).toEqual(
      expect.objectContaining({
        id: "3",
        title: "Section 3",
      })
    );

    setSelectValue(findSelectByOptions(view.container, ["1", "2", "3", "4"]), "4");
    expect(view.getValue().options?.initiallyOpenId).toBe("4");

    setInputValue(findInputByPlaceholder(view.container, "Section 4"), "Support");
    setInputValue(findAllInputsByPlaceholder(view.container, "Optional summary text")[3], "SLA");
    setInputValue(findAllInputsByPlaceholder(view.container, "Optional icon or emoji")[3], "✨");

    expect(view.getValue().items?.[3]).toEqual(
      expect.objectContaining({
        id: "4",
        title: "Support",
        description: "SLA",
        icon: "✨",
      })
    );
    expect(view.onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("Accordion visual editor covers behavior controls, style fallbacks, and structure updates", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "compact",
    initialContext: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "item",
          slotId: "item:1",
          label: "Item 1",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "item",
          slotId: "item:2",
          label: "Item 2",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "item",
          slotId: "item:3",
          label: "Item 3",
          kind: "repeatable",
          instanceId: "3",
        },
      ],
    },
    initialValue: {
      items: [
        { id: "alpha", title: "Alpha", description: "First item" },
        { id: "beta", title: "Beta", description: "Second item" },
      ],
      options: {
        initiallyOpenId: "alpha",
        allowMultiple: false,
      },
      style: {
        surfaceColor: "   ",
        borderColor: "",
        summaryTextColor: " ",
      },
    },
  });

  try {
    expect(view.container.innerHTML).toContain(
      'data-widget-editor-section="accordion.behavior-style"'
    );
    expect(view.container.textContent).not.toContain("Initially open item");
    expect(view.container.textContent).toContain(
      "Use the shared Structure controls in Visual mode"
    );
    expect(
      findSelectByOptions(view.container, ["2", "3", "4", String(accordionItemMax)])
    ).toBeUndefined();
    const surfaceInput = findInputByPlaceholder(view.container, "var(--color-surface)");
    const borderInput = findInputByPlaceholder(view.container, "var(--color-border)");
    const [summaryInput, bodyInput] = findAllInputsByPlaceholder(
      view.container,
      "var(--color-text)"
    );
    const clearButtons = Array.from(view.container.querySelectorAll("button")).filter((button) =>
      (button.textContent ?? "").includes("Clear")
    );
    const colorPickers = findInputsByType(view.container, "color");

    expect((surfaceInput as HTMLInputElement | null | undefined)?.value).toBe("");
    expect((borderInput as HTMLInputElement | null | undefined)?.value).toBe(
      accordionDefaults.style?.borderColor
    );
    expect((summaryInput as HTMLInputElement | null | undefined)?.value).toBe(
      accordionDefaults.style?.summaryTextColor
    );
    expect((bodyInput as HTMLInputElement | null | undefined)?.value).toBe("");
    expect(clearButtons).toHaveLength(4);
    expect(colorPickers).toHaveLength(4);

    clickElement(findButtonByText(view.container, "Soft"));
    expect(view.getVariant()).toBe("soft");
    expect(view.onVariantChangeSpy).toHaveBeenCalledWith("soft");

    expect(view.getValue().items).toHaveLength(2);
    expect(findInputByPlaceholder(view.container, "Section 3")).toBeTruthy();

    setInputValue(findInputByPlaceholder(view.container, "Section 3"), "Delivery");
    setInputValue(findAllInputsByPlaceholder(view.container, "Optional icon or emoji")[2], "🔥");
    expect(view.getValue().items).toHaveLength(3);
    expect(view.getValue().items?.[2]).toEqual(
      expect.objectContaining({
        id: "3",
        title: "Delivery",
        icon: "🔥",
      })
    );
    setSelectValue(
      findSelectByOptions(view.container, ["__none__", "alpha", "beta", "3"]),
      "__none__"
    );
    expect(view.getValue().options?.defaultOpenIds).toEqual([]);
    expect(view.getValue().options?.initiallyOpenId).toBeUndefined();

    setSelectValue(findSelectByOptions(view.container, ["single", "multiple"]), "multiple");

    expect(view.getValue().options?.openMode).toBe("multiple");
    expect(view.getValue().options?.defaultOpenIds).toEqual([]);

    setSelectValue(findSelectByOptions(view.container, ["none", "subtle", "smooth"]), "smooth");
    setSelectValue(findSelectByOptions(view.container, ["sm", "md", "lg", "full"]), "sm");
    setSelectValue(findSelectByOptions(view.container, ["sm", "md", "lg", "xl"]), "xl");
    setSelectValue(findSelectByOptions(view.container, ["sm", "base", "lg"]), "lg");
    setSelectValue(findSelectByOptions(view.container, ["medium", "semibold", "bold"]), "bold");

    setInputValue(surfaceInput, "#101010");
    setInputValue(borderInput, "#202020");
    setInputValue(summaryInput, "#303030");
    setInputValue(bodyInput, "#404040");
    clickElement(clearButtons[1]);
    clickElement(clearButtons[2]);
    expect(view.getValue().style?.borderColor).toBe(accordionDefaults.style?.borderColor);
    expect(view.getValue().style?.summaryTextColor).toBe(accordionDefaults.style?.summaryTextColor);

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        options: expect.objectContaining({
          openMode: "multiple",
          defaultOpenIds: [],
          collapsible: true,
          allowMultiple: true,
          motion: "smooth",
        }),
        layout: expect.objectContaining({
          maxWidth: "sm",
        }),
        style: expect.objectContaining({
          surfaceColor: "#101010",
          borderColor: accordionDefaults.style?.borderColor,
          summaryTextColor: accordionDefaults.style?.summaryTextColor,
          descriptionTextColor: "#404040",
          radius: "xl",
          summaryFontSize: "lg",
          summaryFontWeight: "bold",
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("Accordion advanced editor shows normalized diagnostics and keeps the preview in sync with edits", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialVariant: "unknown",
    initialContext: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "item",
          slotId: "item:1",
          label: "Item 1",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "item",
          slotId: "item:2",
          label: "Item 2",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "item",
          slotId: "item:3",
          label: "Item 3",
          kind: "repeatable",
          instanceId: "3",
        },
      ],
    },
    initialValue: {
      items: [
        { id: " ", title: " ", description: " " },
        { id: "1", title: "Custom title", description: "  Helpful details  " },
      ],
      options: {
        initiallyOpenId: "missing",
      },
      style: {
        surfaceColor: " ",
        borderColor: "accent-border",
        summaryTextColor: "",
      },
    },
  });

  try {
    expect(findButtonByText(view.container, "Soft")?.textContent).toContain("Selected");

    expect(readDiagnostics(view.container)).toEqual({
      items: [
        { id: "1", title: "Section 1" },
        { id: "2", title: "Custom title", description: "Helpful details" },
      ],
      options: {
        openMode: "single",
        defaultOpenIds: ["1"],
        collapsible: true,
        initiallyOpenId: "1",
        allowMultiple: false,
        motion: "none",
      },
      style: {
        borderColor: "accent-border",
        summaryTextColor: accordionDefaults.style?.summaryTextColor,
      },
      layout: {
        maxWidth: "full",
      },
    });

    setSelectValue(
      findSelectByOptions(view.container, ["2", "3", "4", String(accordionItemMax)]),
      "3"
    );
    setInputValue(findInputByPlaceholder(view.container, "Section 3"), "Rollout");
    setInputValue(findAllInputsByPlaceholder(view.container, "Optional icon or emoji")[2], "📌");
    setSelectValue(findSelectByOptions(view.container, ["single", "multiple"]), "multiple");
    setInputValue(
      findAllInputsByPlaceholder(view.container, "var(--color-text)")[0],
      "var(--color-muted)"
    );
    setSelectValue(findSelectByOptions(view.container, ["none", "subtle", "smooth"]), "subtle");

    expect(readDiagnostics(view.container)).toEqual({
      items: [
        { id: "1", title: "Section 1" },
        { id: "2", title: "Custom title", description: "Helpful details" },
        { id: "3", title: "Rollout", icon: "📌" },
      ],
      options: {
        openMode: "multiple",
        defaultOpenIds: ["1"],
        collapsible: true,
        initiallyOpenId: "1",
        allowMultiple: true,
        motion: "subtle",
      },
      style: {
        borderColor: "accent-border",
        summaryTextColor: "var(--color-muted)",
      },
      layout: {
        maxWidth: "full",
      },
    });
    expect(view.onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
