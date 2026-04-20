// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { FormRecord } from "../../../core/admin/services/formsClient";
import type { FormEmbedData } from "../../../core/widgets/core/formEmbed";

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

  const findPlaceholder = (value: React.ReactNode): string | undefined => {
    for (const child of React.Children.toArray(value)) {
      if (!React.isValidElement(child)) continue;
      if (typeof child.props.placeholder === "string") return child.props.placeholder;
      const nested = findPlaceholder(child.props.children);
      if (nested) return nested;
    }
    return undefined;
  };

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
    }) => {
      const placeholder = findPlaceholder(children);
      return (
        <div>
          <select
            value={value ?? ""}
            disabled={disabled}
            onChange={(event) => onValueChange?.(event.target.value)}
          >
            {collectOptions(children).map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          {placeholder && !(value ?? "") ? <span>{placeholder}</span> : null}
        </div>
      );
    },
    SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectItem: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
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
    placeholder,
    rows,
    className,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={className}
      {...props}
    />
  ),
}));

const formsState = vi.hoisted(() => ({
  current: {
    items: [] as FormRecord[],
    isLoading: false,
    error: null as string | null,
    refresh: vi.fn(),
  },
}));

vi.mock("@/ui/forms/hooks/useForms", () => ({
  useForms: () => formsState.current,
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
    rerender: (next: React.ReactNode) => {
      act(() => {
        root.render(next);
      });
    },
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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
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

const getInputByPlaceholder = (
  container: ParentNode,
  placeholder: string,
  index = 0
) => {
  const input = Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement &&
      element.getAttribute("placeholder") === placeholder
  )[index];
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input "${placeholder}" (${index})`);
  }
  return input;
};

const getTextareaByPlaceholder = (
  container: ParentNode,
  placeholder: string,
  index = 0
) => {
  const textarea = Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  )[index];
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing textarea "${placeholder}" (${index})`);
  }
  return textarea;
};

const getCheckboxes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.type === "checkbox"
  );

const getSelects = (container: ParentNode) =>
  Array.from(container.querySelectorAll("select")).filter(
    (element): element is HTMLSelectElement => element instanceof HTMLSelectElement
  );

const getColorInputs = (container: ParentNode) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.type === "color"
  );

const makeForm = (overrides: Partial<FormRecord> = {}): FormRecord => ({
  id: "form-1",
  name: "Contact",
  slug: "contact",
  status: "published",
  description: "Contact form",
  successMessage: "Saved",
  successRedirectUrl: null,
  submissionAccess: "public",
  settings: {
    layoutMode: "single",
    saveProgress: false,
    stepTitles: [],
    preset: "contact",
    automationRetry: {
      enabled: false,
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
    },
  },
  createdAt: "2026-03-09T08:00:00.000Z",
  updatedAt: "2026-03-09T08:00:00.000Z",
  ...overrides,
});

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
}: {
  editor: EditorKind;
  initialValue: FormEmbedData;
}) => {
  const {
    FormEmbedAdvancedEditor,
    FormEmbedVisualEditor,
    FormEmbedWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/FormEmbedEditors");

  const editorMap = {
    wizard: FormEmbedWizardEditor,
    visual: FormEmbedVisualEditor,
    advanced: FormEmbedAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();
  let latestValue = initialValue;

  const Harness = () => {
    const [value, setValue] = useState<FormEmbedData>(initialValue);

    return (
      <Editor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant="standard"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  return {
    ...view,
    onChangeSpy,
    getLatestValue: () => latestValue,
    rerender: () => view.rerender(<Harness />),
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  formsState.current = {
    items: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
  vi.restoreAllMocks();
});

test("FormEmbed wizard editor normalizes content defaults and updates layout and field toggles", async () => {
  formsState.current = {
    items: [makeForm({ id: "form-public", name: "Public contact" })],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };

  const view = await renderEditor({
    editor: "wizard",
    initialValue: {
      formId: "   ",
      title: "   ",
      description: "   ",
      submitLabel: "   ",
      layout: {
        alignment: "bad" as never,
        width: "bad" as never,
        spacing: "bad" as never,
        buttonAlignment: "bad" as never,
      },
      fields: {},
      resolved: {
        successMessage: "Resolved fallback",
      },
    },
  });

  try {
    expect(view.container.textContent).toContain("Select form");

    const contentSection = getSectionByTitle(view.container, "Content");
    const contentInputs = Array.from(contentSection.querySelectorAll("input")).filter(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement && element.type !== "color"
    );
    const descriptionTextarea = getTextareaByPlaceholder(
      contentSection,
      "Optional description text"
    );
    const successTextarea = getTextareaByPlaceholder(
      contentSection,
      "Leave blank to use form fallback"
    );

    expect(contentInputs[0]?.value).toBe("");
    expect(contentInputs[1]?.value).toBe("Send message");
    expect(descriptionTextarea.value).toBe("");
    expect(successTextarea.value).toBe("Resolved fallback");

    const layoutSection = getSectionByTitle(view.container, "Layout");
    const layoutSelects = getSelects(layoutSection);

    expect(layoutSelects.map((select) => select.value)).toEqual([
      "start",
      "md",
      "md",
      "start",
    ]);

    const fieldsSection = getSectionByTitle(view.container, "Field labels");
    const fieldToggles = getCheckboxes(fieldsSection);

    expect(fieldToggles.map((toggle) => toggle.checked)).toEqual([true, true]);

    setSelectValue(getSelects(getSectionByTitle(view.container, "Form selection"))[0], "form-public");
    expect(view.getLatestValue()).toMatchObject({
      formId: "form-public",
      layout: {
        alignment: "start",
        width: "md",
        spacing: "md",
        buttonAlignment: "start",
      },
      fields: {
        showLabels: true,
        showRequiredIndicator: true,
      },
    });

    setSelectValue(layoutSelects[0], "");
    setSelectValue(layoutSelects[1], "");
    setSelectValue(layoutSelects[2], "");
    setSelectValue(layoutSelects[3], "");

    expect(view.getLatestValue()).toMatchObject({
      layout: {
        alignment: "start",
        width: "md",
        spacing: "md",
        buttonAlignment: "start",
      },
    });

    setInputValue(contentInputs[0], "Lead form");
    setTextareaValue(descriptionTextarea, "Ask anything");
    setInputValue(contentInputs[1], "Request demo");
    setTextareaValue(successTextarea, "We received your request.");
    setSelectValue(layoutSelects[0], "center");
    setSelectValue(layoutSelects[1], "xl");
    setSelectValue(layoutSelects[2], "lg");
    setSelectValue(layoutSelects[3], "end");
    setCheckboxValue(fieldToggles[0], false);
    setCheckboxValue(fieldToggles[1], false);

    expect(view.getLatestValue()).toMatchObject({
      fields: {
        showLabels: false,
        showRequiredIndicator: false,
      },
    });

    setCheckboxValue(fieldToggles[0], true);
    setCheckboxValue(fieldToggles[1], true);

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(view.getLatestValue()).toMatchObject({
      formId: "form-public",
      title: "Lead form",
      description: "Ask anything",
      submitLabel: "Request demo",
      successMessage: "We received your request.",
      layout: {
        alignment: "center",
        width: "xl",
        spacing: "lg",
        buttonAlignment: "end",
      },
      fields: {
        showLabels: true,
        showRequiredIndicator: true,
      },
    });
  } finally {
    view.cleanup();
  }
});

test("FormEmbed visual editor shows the internal access warning and updates style controls", async () => {
  formsState.current = {
    items: [
      makeForm({
        id: "form-internal",
        name: "Staff intake",
        submissionAccess: "internal",
      }),
      makeForm({
        id: "form-public",
        name: "Public request",
        submissionAccess: "public",
      }),
    ],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };

  const view = await renderEditor({
    editor: "visual",
    initialValue: {
      formId: "form-internal",
      style: {
        background: "not-a-color",
        surface: "   ",
        borderColor: "#112233",
        borderWidth: "9" as never,
        radius: "9" as never,
        inputSize: "9" as never,
      },
    },
  });

  try {
    expect(view.container.textContent).toContain("Internal submissions require");
    expect(view.container.textContent).toContain("forms.submit");

    const styleSection = getSectionByTitle(view.container, "Style");
    const colorInputs = getColorInputs(styleSection);
    const backgroundTextInput = getInputByPlaceholder(styleSection, "transparent");
    const surfaceTextInput = getInputByPlaceholder(styleSection, "var(--color-bg)");
    const borderTextInput = getInputByPlaceholder(styleSection, "var(--color-border)");
    const styleSelects = getSelects(styleSection);

    expect(colorInputs[0]?.value).toBe("#ffffff");
    expect(colorInputs[1]?.value).toBe("#ffffff");
    expect(colorInputs[2]?.value).toBe("#112233");
    expect(backgroundTextInput.value).toBe("not-a-color");
    expect(surfaceTextInput.value).toBe("var(--color-bg)");
    expect(borderTextInput.value).toBe("#112233");
    expect(styleSelects.map((select) => select.value)).toEqual(["1", "md", "md"]);

    setSelectValue(getSelects(getSectionByTitle(view.container, "Form selection"))[0], "form-public");
    expect(view.container.textContent).not.toContain("Internal submissions require");
    expect(view.getLatestValue()).toMatchObject({
      formId: "form-public",
      style: {
        borderWidth: "1",
        radius: "md",
        inputSize: "md",
      },
    });

    setSelectValue(styleSelects[0], "");
    setSelectValue(styleSelects[1], "");
    setSelectValue(styleSelects[2], "");

    expect(view.getLatestValue()).toMatchObject({
      style: {
        borderWidth: "1",
        radius: "md",
        inputSize: "md",
      },
    });

    setInputValue(colorInputs[0], "#abcdef");
    setInputValue(surfaceTextInput, "var(--surface-card)");
    setInputValue(borderTextInput, "#445566");
    setSelectValue(styleSelects[0], "2");
    setSelectValue(styleSelects[1], "lg");
    setSelectValue(styleSelects[2], "sm");

    expect(view.getLatestValue()).toMatchObject({
      formId: "form-public",
      style: {
        background: "#abcdef",
        surface: "var(--surface-card)",
        borderColor: "#445566",
        borderWidth: "2",
        radius: "lg",
        inputSize: "sm",
      },
    });
  } finally {
    view.cleanup();
  }
});

test("FormEmbed advanced editor covers loading and empty form states before selecting an internal form", async () => {
  formsState.current = {
    items: [],
    isLoading: true,
    error: null,
    refresh: vi.fn(),
  };

  const view = await renderEditor({
    editor: "advanced",
    initialValue: {},
  });

  try {
    const formSection = getSectionByTitle(view.container, "Form selection");
    const formSelect = getSelects(formSection)[0];

    expect(view.container.textContent).toContain("Loading forms...");
    expect(formSelect.options).toHaveLength(1);
    expect(formSelect.options[0]?.textContent).toBe("No forms found");
    expect(formSelect.options[0]?.disabled).toBe(true);

    formsState.current = {
      items: [
        makeForm({
          id: "form-internal",
          name: "Internal request",
          submissionAccess: "internal",
        }),
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    };

    view.rerender();

    expect(view.container.textContent).toContain("Select form");

    setSelectValue(getSelects(getSectionByTitle(view.container, "Form selection"))[0], "form-internal");

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(view.getLatestValue()).toMatchObject({
      formId: "form-internal",
    });
    expect(view.container.textContent).toContain("Internal submissions require");
  } finally {
    view.cleanup();
  }
});
