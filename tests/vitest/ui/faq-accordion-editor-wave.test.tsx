// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  faqAccordionDefaults,
  faqAccordionItemMax,
  type FaqAccordionData,
} from "../../../core/widgets/core/faqAccordion";

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
    disabled,
    placeholder,
    type,
    min,
    max,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    placeholder?: string;
    type?: string;
    min?: number;
    max?: number;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      type={type}
      min={min}
      max={max}
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

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    readOnly,
    placeholder,
    rows,
    className,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    readOnly?: boolean;
    placeholder?: string;
    rows?: number;
    className?: string;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      rows={rows}
      className={className}
      {...props}
    />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("../../../core/admin/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    onOpenChange,
    onConfirm,
    children,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void | Promise<void>;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div data-faq-confirm-dialog={title}>
        <p>{title}</p>
        <p>{description}</p>
        {children ? <div>{children}</div> : null}
        <button type="button" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
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

const dispatchDragEvent = (target: Element | null | undefined, type: string) => {
  if (!target || typeof DragEvent === "undefined") return;
  React.act(() => {
    const event = new DragEvent(type, {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "dataTransfer", {
      configurable: true,
      value: {
        effectAllowed: "",
        setDragImage: vi.fn(),
        setData: vi.fn(),
      },
    });
    target.dispatchEvent(event);
  });
};

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputsByPlaceholderPrefix = (container: HTMLElement, prefix: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement &&
      (element.getAttribute("placeholder") ?? "").startsWith(prefix)
  );

const findTextareaByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findButtonByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find((element) =>
    (element.textContent ?? "").includes(text)
  );

const findButtonsByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).filter((element) =>
    (element.textContent ?? "").includes(text)
  );

const findButtonsByTitle = (container: HTMLElement, title: string) =>
  Array.from(container.querySelectorAll("button")).filter(
    (element) => element.getAttribute("title") === title
  );

const findSelectByOptions = (container: HTMLElement, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findAllInputsByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findCheckboxesWithAriaLabel = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("input[type='checkbox']")).filter(
    (element) => element instanceof HTMLInputElement && element.hasAttribute("aria-label")
  );

const findUnnamedCheckboxes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("input[type='checkbox']")).filter(
    (element) => element instanceof HTMLInputElement && !element.hasAttribute("aria-label")
  );

const findColorInputForPlaceholder = (container: HTMLElement, placeholder: string, index = 0) => {
  const textInput = findAllInputsByPlaceholder(container, placeholder)[index];
  if (!(textInput instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}" (${index})`);
  }
  const colorInput = textInput.parentElement?.querySelector('input[type="color"]');
  if (!(colorInput instanceof HTMLInputElement)) {
    throw new Error(`Missing color input for placeholder "${placeholder}" (${index})`);
  }
  return colorInput;
};

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
  initialVariant = "single-column",
}: {
  editor: EditorKind;
  initialValue: FaqAccordionData;
  initialVariant?: string;
}) => {
  const { FaqAccordionAdvancedEditor, FaqAccordionVisualEditor, FaqAccordionWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/FaqAccordionEditors");

  const editorMap = {
    wizard: FaqAccordionWizardEditor,
    visual: FaqAccordionVisualEditor,
    advanced: FaqAccordionAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<FaqAccordionData>(initialValue);
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
  vi.restoreAllMocks();
});

test("FaqAccordion wizard editor updates variant, description, answer mode, and onboarding questions across the full wizard scope", async () => {
  const view = await renderEditor({
    editor: "wizard",
    initialValue: faqAccordionDefaults,
    initialVariant: "unexpected",
  });

  try {
    const variantSelect = findSelectByOptions(view.container, [
      "single-column",
      "two-column",
      "compact",
    ]);

    expect(variantSelect).toBeInstanceOf(HTMLSelectElement);
    expect((variantSelect as HTMLSelectElement).value).toBe("single-column");

    const questionInputs = findInputsByPlaceholderPrefix(view.container, "Question ");
    expect(questionInputs).toHaveLength(faqAccordionDefaults.items.length);

    setSelectValue(variantSelect, "compact");
    setInputValue(
      findInputByPlaceholder(view.container, "Frequently asked questions"),
      "Billing FAQ"
    );
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Address objections with short and clear answers."),
      "Everything about billing and setup."
    );
    setInputValue(findInputByPlaceholder(view.container, "⭐"), "❔");
    setSelectValue(findSelectByOptions(view.container, ["plain", "markdown"]), "markdown");
    setInputValue(questionInputs[0], "How fast is launch?");
    setInputValue(questionInputs[1], "Can I edit content myself?");

    expect(view.getVariant()).toBe("compact");
    expect(view.onVariantChangeSpy).toHaveBeenCalledWith("compact");
    expect(view.getValue().header?.title).toBe("Billing FAQ");
    expect(view.getValue().header?.description).toBe("Everything about billing and setup.");
    expect(view.getValue().items).toHaveLength(faqAccordionDefaults.items.length);
    expect(view.getValue().items[0]?.icon).toBe("❔");
    expect(view.getValue().items[0]?.answerFormat).toBe("markdown");
    expect(view.getValue().items[0]?.question).toBe("How fast is launch?");
    expect(view.getValue().items[1]?.question).toBe("Can I edit content myself?");
  } finally {
    view.cleanup();
  }
});

test("FaqAccordion visual editor covers FAQ item management, drag/drop, open-state labels, style controls, and SEO", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "compact",
    initialValue: {
      header: {
        title: "FAQ",
        description: "Old description",
      },
      items: [
        {
          id: "first",
          question: "First question",
          answer: "First answer",
          answerFormat: "plain",
          icon: "1",
        },
        {
          id: "second",
          question: "Second question",
          answer: "Second answer",
          answerFormat: "plain",
          icon: "2",
        },
      ],
      options: {
        allowMultipleOpen: false,
        defaultOpenIndex: 0,
      },
      style: {
        surface: "surface-token",
        border: "border-token",
        divider: "divider-token",
        spacing: "md",
        maxWidth: "xl",
        headerAlign: "center",
        sectionPaddingX: "md",
        sectionPaddingY: "md",
        panelRadius: "lg",
        borderWidth: "1",
        headerTitleSize: "auto",
        motion: "none",
      },
      seo: {
        emitFaqJsonLd: false,
      },
    },
  });

  try {
    const colorInputs = Array.from(view.container.querySelectorAll("input[type='color']"));
    expect((colorInputs[0] as HTMLInputElement | null | undefined)?.value).toBe("#ffffff");
    expect((colorInputs[1] as HTMLInputElement | null | undefined)?.value).toBe("#e2e8f0");
    expect((colorInputs[2] as HTMLInputElement | null | undefined)?.value).toBe("#e2e8f0");
    expect(view.container.textContent).toContain(
      "Custom token active. Swatch preview uses the fallback until you replace it with a hex color."
    );

    clickElement(findButtonByText(view.container, "Two Column"));
    expect(view.getVariant()).toBe("two-column");
    expect(view.onVariantChangeSpy).toHaveBeenCalledWith("two-column");

    setSelectValue(
      findSelectByOptions(view.container, ["1", "2", "3", String(faqAccordionItemMax)]),
      "1"
    );
    expect(view.getValue().items).toHaveLength(1);

    const removeButtonsWhenSingle = findButtonsByTitle(view.container, "Remove");
    expect((removeButtonsWhenSingle[0] as HTMLButtonElement | null | undefined)?.disabled).toBe(
      true
    );

    clickElement(findButtonByText(view.container, "Add item"));
    expect(view.getValue().items).toHaveLength(2);
    expect(view.getValue().items[1]).toEqual(
      expect.objectContaining({
        question: "Question 2",
        answer: "Answer 2",
        answerFormat: "plain",
      })
    );

    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Address objections with short and clear answers."),
      "Short answers first."
    );
    setInputValue(
      findInputByPlaceholder(view.container, "Frequently asked questions"),
      "Launch FAQ"
    );

    const questionInputs = findInputsByPlaceholderPrefix(view.container, "Question ");
    setInputValue(questionInputs[0], "What is included?");
    setInputValue(findInputByPlaceholder(view.container, "⭐"), "📌");
    setSelectValue(findSelectByOptions(view.container, ["plain", "markdown"]), "markdown");

    const answerAreas = Array.from(view.container.querySelectorAll("textarea")).filter(
      (element) =>
        element instanceof HTMLTextAreaElement &&
        (element.getAttribute("placeholder") ?? "").startsWith("Answer ")
    );
    setTextareaValue(answerAreas[0], "Setup and support.");

    const draggableItems = view.container.querySelectorAll("[data-faq-drag-item]");
    dispatchDragEvent(draggableItems[0], "dragstart");
    dispatchDragEvent(draggableItems[1], "dragover");
    dispatchDragEvent(draggableItems[1], "drop");
    expect(view.getValue().items[0]?.question).toBe("Question 2");
    expect(view.getValue().items[1]?.question).toBe("What is included?");

    clickElement(findButtonsByTitle(view.container, "Move up")[1]);
    expect(view.getValue().items[0]?.question).toBe("What is included?");
    expect(view.getValue().items[0]?.answerFormat).toBe("markdown");
    expect(view.getValue().items[0]?.icon).toBe("📌");

    clickElement(findButtonsByTitle(view.container, "Remove")[1]);
    expect(view.container.textContent).toContain("Remove FAQ item?");
    clickElement(findButtonByText(view.container, "Cancel"));
    expect(view.container.textContent).not.toContain("Remove FAQ item?");

    const defaultOpenSelect = findSelectByOptions(view.container, ["-1", "0", "1"]);
    expect(
      Array.from((defaultOpenSelect as HTMLSelectElement).options).some((option) =>
        option.textContent?.includes("What is included?")
      )
    ).toBe(true);
    setSelectValue(defaultOpenSelect, "-1");

    const unnamedCheckboxes = findUnnamedCheckboxes(view.container);
    toggleCheckbox(unnamedCheckboxes[0], true);
    setInputValue(colorInputs[0], "#111111");
    setInputValue(findInputByPlaceholder(view.container, "var(--color-bg)"), "#123456");
    const borderInputs = findAllInputsByPlaceholder(view.container, "var(--color-border)");
    setInputValue(borderInputs[0], "#654321");
    setInputValue(borderInputs[1], "#abcdef");
    clickElement(findButtonsByText(view.container, "Clear")[1]);
    clickElement(findButtonsByText(view.container, "Clear")[2]);
    setSelectValue(findSelectByOptions(view.container, ["sm", "md", "lg", "xl", "full"]), "full");
    setSelectValue(findSelectByOptions(view.container, ["left", "center", "right"]), "left");
    setSelectValue(findSelectByOptions(view.container, ["auto", "sm", "md", "lg", "xl"]), "xl");
    setSelectValue(findSelectByOptions(view.container, ["none", "smooth"]), "smooth");
    setSelectValue(findSelectByOptions(view.container, ["none", "sm", "md", "lg"]), "lg");
    setSelectValue(findSelectByOptions(view.container, ["0", "1", "2", "3"]), "2");
    toggleCheckbox(unnamedCheckboxes[1], true);

    const selectionCheckboxes = findCheckboxesWithAriaLabel(view.container);
    toggleCheckbox(selectionCheckboxes[1], true);
    clickElement(findButtonByText(view.container, "Delete selected"));
    expect(view.container.textContent).toContain("Delete selected FAQ items?");
    clickElement(findButtonsByText(view.container, "Delete selected").at(-1));
    expect(view.getValue().items).toHaveLength(1);

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        header: expect.objectContaining({
          title: "Launch FAQ",
          description: "Short answers first.",
        }),
        items: [
          expect.objectContaining({
            question: "What is included?",
            answer: "Setup and support.",
            answerFormat: "markdown",
            icon: "📌",
          }),
        ],
        options: expect.objectContaining({
          allowMultipleOpen: true,
          defaultOpenIndex: -1,
        }),
        style: expect.objectContaining({
          surface: "#123456",
          border: undefined,
          divider: undefined,
          maxWidth: "full",
          headerAlign: "left",
          headerTitleSize: "xl",
          motion: "smooth",
          borderWidth: "2",
          sectionPaddingX: "lg",
        }),
        seo: expect.objectContaining({
          emitFaqJsonLd: true,
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("FaqAccordion visual editor keeps item count capped when add item is used at faqAccordionItemMax", async () => {
  const initialItems = Array.from({ length: faqAccordionItemMax }, (_, index) => ({
    id: `faq-seed-${index + 1}`,
    question: `Question seed ${index + 1}`,
    answer: `Answer seed ${index + 1}`,
  }));

  const view = await renderEditor({
    editor: "visual",
    initialVariant: "single-column",
    initialValue: {
      items: initialItems,
    },
  });

  try {
    expect(view.getValue().items).toHaveLength(faqAccordionItemMax);

    clickElement(findButtonByText(view.container, "Add item"));

    expect(view.getValue().items).toHaveLength(faqAccordionItemMax);
    expect(view.getValue().items[faqAccordionItemMax - 1]).toEqual(
      expect.objectContaining({
        id: `faq-seed-${faqAccordionItemMax}`,
        question: `Question seed ${faqAccordionItemMax}`,
        answer: `Answer seed ${faqAccordionItemMax}`,
      })
    );
  } finally {
    view.cleanup();
  }
});

test("FaqAccordion advanced editor keeps diagnostics read-only and confirm-gates normalization", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialVariant: "compact",
    initialValue: {
      items: [
        { id: "duplicate", question: "", answer: "" },
        { id: "duplicate", question: "Keep this", answer: "Already filled" },
      ],
      options: {
        allowMultipleOpen: false,
        defaultOpenIndex: 99,
      },
      style: {
        surface: "surface-token",
        border: "border-token",
        divider: "divider-token",
        spacing: "invalid" as "md",
      },
      seo: {
        emitFaqJsonLd: false,
      },
    },
  });

  try {
    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"defaultOpenIndex": 1');
    expect(snapshot?.textContent).toContain('"spacing": "md"');
    expect(snapshot?.textContent).toContain('"id": "faq-2"');

    expect(view.container.querySelector("input[type='number']")).toBeNull();
    expect(findSelectByOptions(view.container, ["-1", "0", "1"])).toBeUndefined();
    expect(findInputByPlaceholder(view.container, "var(--color-bg)")).toBeUndefined();
    expect(findAllInputsByPlaceholder(view.container, "var(--color-border)")).toHaveLength(0);
    expect(findButtonByText(view.container, "Reset to defaults")).toBeUndefined();

    clickElement(findButtonByText(view.container, "Review normalization"));
    expect(view.container.textContent).toContain("Review diagnostics, then confirm normalization.");
    clickElement(findButtonByText(view.container, "Confirm normalization"));
    expect(view.getValue().items[0]?.question).toBe("How long does setup take?");
    expect(view.getValue().items[1]?.id).toBe("faq-2");
    expect(view.getValue().options?.defaultOpenIndex).toBe(1);
    expect(view.getValue().style?.spacing).toBe("md");
  } finally {
    view.cleanup();
  }
});

test("FaqAccordion editors fall back to default UI values when normalized payload is sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/faqAccordion", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/faqAccordion")>(
      "../../../core/widgets/core/faqAccordion"
    );

    return {
      ...actual,
      normalizeFaqAccordionData: (value: FaqAccordionData) => ({
        ...actual.normalizeFaqAccordionData(value),
        header: {
          title: undefined,
          description: undefined,
        } as FaqAccordionData["header"],
        options: {
          allowMultipleOpen: undefined,
          defaultOpenIndex: undefined,
        } as FaqAccordionData["options"],
        style: {
          surface: undefined,
          border: undefined,
          divider: undefined,
          spacing: undefined,
        } as FaqAccordionData["style"],
      }),
      normalizeFaqAccordionItems: () =>
        [
          {
            id: undefined,
            question: undefined,
            answer: undefined,
          },
          {
            id: undefined,
            question: undefined,
            answer: undefined,
          },
        ] as FaqAccordionData["items"],
    };
  });

  const { FaqAccordionAdvancedEditor, FaqAccordionVisualEditor, FaqAccordionWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/FaqAccordionEditors");

  const view = mount(
    <>
      <FaqAccordionWizardEditor
        value={{} as FaqAccordionData}
        onChange={() => undefined}
        variant="legacy"
      />
      <FaqAccordionVisualEditor
        value={{} as FaqAccordionData}
        onChange={() => undefined}
        variant="legacy"
      />
      <FaqAccordionAdvancedEditor
        value={{} as FaqAccordionData}
        onChange={() => undefined}
        variant="legacy"
      />
    </>
  );

  try {
    expect(
      (
        findSelectByOptions(view.container, ["single-column", "two-column", "compact"]) as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("single-column");
    expect(
      (
        findInputByPlaceholder(view.container, "Frequently asked questions") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("");
    expect(
      (
        findTextareaByPlaceholder(
          view.container,
          "Address objections with short and clear answers."
        ) as HTMLTextAreaElement | undefined
      )?.value
    ).toBe("");
    expect(
      (findInputByPlaceholder(view.container, "Question 1") as HTMLInputElement | null | undefined)
        ?.value
    ).toBe("");
    expect(
      (
        findTextareaByPlaceholder(view.container, "Answer 1") as
          | HTMLTextAreaElement
          | null
          | undefined
      )?.value
    ).toBe("");
    expect(
      (
        findSelectByOptions(view.container, ["none", "sm", "md", "lg"]) as unknown as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("md");
    expect(
      (
        findSelectByOptions(view.container, ["sm", "md", "lg", "xl", "full"]) as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("xl");
    const advancedSection = Array.from(view.container.querySelectorAll("section")).find((section) =>
      section.textContent?.includes("Style token diagnostics")
    );
    if (!advancedSection) throw new Error("Missing Advanced style diagnostics");
    expect(advancedSection.querySelector("input[type='number']")).toBeNull();
    expect(advancedSection.querySelectorAll("input[type='checkbox']")).toHaveLength(0);
    expect(advancedSection.textContent).toContain("Default surface");
    expect(advancedSection.textContent).toContain("Default border");
    expect(advancedSection.textContent).toContain("Default divider");
    expect(advancedSection.querySelectorAll("input[type='color']")).toHaveLength(0);
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/faqAccordion");
    vi.resetModules();
  }
});
