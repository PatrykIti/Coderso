// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  accordionDefaults,
  accordionItemMax,
  type AccordionData,
} from "../../../core/widgets/core/accordion";

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
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const toggleCheckbox = (element: Element | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  act(() => {
    element.click();
  });
};

const clickElement = (element: Element | undefined) => {
  if (!element) return;
  act(() => {
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
}: {
  editor: EditorKind;
  initialValue: AccordionData;
  initialVariant?: string;
}) => {
  const {
    AccordionAdvancedEditor,
    AccordionVisualEditor,
    AccordionWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/AccordionEditors");

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

    expect(view.getValue().items?.[3]).toEqual(
      expect.objectContaining({
        id: "4",
        title: "Support",
        description: "SLA",
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
    const surfaceInput = findInputByPlaceholder(view.container, "var(--color-surface)");
    const borderInput = findInputByPlaceholder(view.container, "var(--color-border)");
    const summaryInput = findInputByPlaceholder(view.container, "var(--color-text)");

    expect((surfaceInput as HTMLInputElement | undefined)?.value).toBe(
      accordionDefaults.style?.surfaceColor
    );
    expect((borderInput as HTMLInputElement | undefined)?.value).toBe(
      accordionDefaults.style?.borderColor
    );
    expect((summaryInput as HTMLInputElement | undefined)?.value).toBe(
      accordionDefaults.style?.summaryTextColor
    );

    clickElement(findButtonByText(view.container, "Soft"));
    expect(view.getVariant()).toBe("soft");
    expect(view.onVariantChangeSpy).toHaveBeenCalledWith("soft");

    setSelectValue(
      findSelectByOptions(view.container, ["2", "3", "4", String(accordionItemMax)]),
      "3"
    );
    expect(view.getValue().items).toHaveLength(3);
    expect(view.getValue().items?.[2]).toEqual(
      expect.objectContaining({
        id: "3",
        title: "Section 3",
      })
    );

    setSelectValue(findSelectByOptions(view.container, ["alpha", "beta", "3"]), "3");
    expect(view.getValue().options?.initiallyOpenId).toBe("3");

    setInputValue(findInputByPlaceholder(view.container, "Section 3"), "Delivery");
    expect(view.getValue().items?.[2]?.title).toBe("Delivery");

    const allowMultipleCheckbox = view.container.querySelector("input[type='checkbox']");
    toggleCheckbox(allowMultipleCheckbox ?? undefined, true);

    setInputValue(surfaceInput, "#101010");
    setInputValue(borderInput, "#202020");
    setInputValue(summaryInput, "#303030");

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        options: expect.objectContaining({
          allowMultiple: true,
          initiallyOpenId: "3",
        }),
        style: expect.objectContaining({
          surfaceColor: "#101010",
          borderColor: "#202020",
          summaryTextColor: "#303030",
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
        { id: "1", title: "Section 1", description: undefined },
        { id: "2", title: "Custom title", description: "Helpful details" },
      ],
      options: {
        initiallyOpenId: "1",
        allowMultiple: false,
      },
      style: {
        surfaceColor: accordionDefaults.style?.surfaceColor,
        borderColor: "accent-border",
        summaryTextColor: accordionDefaults.style?.summaryTextColor,
      },
    });

    setSelectValue(
      findSelectByOptions(view.container, ["2", "3", "4", String(accordionItemMax)]),
      "3"
    );
    setInputValue(findInputByPlaceholder(view.container, "Section 3"), "Rollout");
    toggleCheckbox(view.container.querySelector("input[type='checkbox']") ?? undefined, true);
    setInputValue(
      findInputByPlaceholder(view.container, "var(--color-text)"),
      "var(--color-muted)"
    );

    expect(readDiagnostics(view.container)).toEqual({
      items: [
        { id: "1", title: "Section 1", description: undefined },
        { id: "2", title: "Custom title", description: "Helpful details" },
        { id: "3", title: "Rollout", description: undefined },
      ],
      options: {
        initiallyOpenId: "1",
        allowMultiple: true,
      },
      style: {
        surfaceColor: accordionDefaults.style?.surfaceColor,
        borderColor: "accent-border",
        summaryTextColor: "var(--color-muted)",
      },
    });
    expect(view.onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
