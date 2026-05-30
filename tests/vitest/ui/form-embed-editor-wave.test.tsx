// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { FormRecord } from "../../../core/admin/services/formsClient";
import { formEmbedDefaults, type FormEmbedData } from "../../../core/widgets/core/formEmbed";

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

const detailState = vi.hoisted(() => ({
  current: {} as Record<
    string,
    { form: FormRecord; fields: Array<Record<string, unknown>> } | null
  >,
}));

vi.mock("@/ui/forms/hooks/useForms", () => ({
  useForms: () => formsState.current,
}));

vi.mock("@/services/formsClient", () => ({
  getFormDetailCached: vi.fn(async (formId: string) => detailState.current[formId] ?? null),
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
    rerender: (next: React.ReactNode) => {
      React.act(() => {
        root.render(next);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flushAsyncWork = async () => {
  await React.act(async () => {
    await (
      window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
    ).happyDOM?.waitUntilComplete?.();
  });
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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const getSectionByTitle = (container: ParentNode, title: string) => {
  const section = Array.from(container.querySelectorAll("section")).find((candidate) =>
    Array.from(candidate.querySelectorAll("h1,h2,h3,h4,p,span")).some(
      (element) => normalizeText(element.textContent) === normalizeText(title)
    )
  );
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing section "${title}"`);
  }
  return section;
};

const getTextareaByPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
  const textarea = Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
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

const getWidgetControl = (container: ParentNode, id: string) => {
  const control = container.querySelector(`[data-widget-control="${id}"]`);
  if (!(control instanceof HTMLElement)) {
    throw new Error(`Missing widget control "${id}"`);
  }
  return control;
};

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
  const { FormEmbedAdvancedEditor, FormEmbedVisualEditor, FormEmbedWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/FormEmbedEditors");

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
  await flushAsyncWork();

  return {
    ...view,
    onChangeSpy,
    getLatestValue: () => latestValue,
    rerender: async () => {
      view.rerender(<Harness />);
      await flushAsyncWork();
    },
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
  detailState.current = {};
  vi.restoreAllMocks();
});

test("FormEmbed wizard owns only form selection and setup diagnostics", async () => {
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
      title: "Existing title",
      layout: {
        alignment: "bad" as never,
        width: "bad" as never,
      },
      style: {
        background: "#ffffff",
      },
    },
  });

  try {
    const formSection = getSectionByTitle(view.container, "Form selection");
    const diagnosticsSection = getSectionByTitle(view.container, "Setup diagnostics");

    expect(formSection.getAttribute("data-widget-editor-mode")).toBe("wizard");
    expect(formSection.getAttribute("data-widget-editor-section-role")).toBe("setup");
    expect(diagnosticsSection.getAttribute("data-widget-control-ownership")).toBeNull();
    expect(view.container.textContent).toContain("Select form");
    expect(view.container.textContent).not.toContain("Content");
    expect(view.container.textContent).not.toContain("Layout");
    expect(view.container.textContent).not.toContain("Field labels");
    expect(view.container.textContent).not.toContain("Style");
    expect(view.container.textContent).not.toContain("Submit behavior");

    const writablePaths = Array.from(
      view.container.querySelectorAll('[data-widget-control-ownership="writable"]')
    ).map((element) => element.getAttribute("data-widget-control-path"));
    expect(writablePaths).toEqual(["formId"]);

    setSelectValue(getSelects(formSection)[0], "form-public");

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(view.getLatestValue()).toMatchObject({
      formId: "form-public",
      title: "Existing title",
      style: {
        background: "#ffffff",
      },
    });
  } finally {
    view.cleanup();
  }
});

test("FormEmbed visual owns public copy and presentation without changing selected form", async () => {
  formsState.current = {
    items: [
      makeForm({
        id: "form-internal",
        name: "Staff intake",
        submissionAccess: "internal",
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
    expect(() => getSectionByTitle(view.container, "Form selection")).toThrow();
    expect(view.container.textContent).toContain("Form preview");
    expect(
      getSectionByTitle(view.container, "Form preview").getAttribute(
        "data-widget-editor-section-role"
      )
    ).toBe("summary");
    expect(view.container.textContent).toContain("Internal submissions require");
    expect(view.container.textContent).toContain("approved internal integration");
    expect(view.container.textContent).not.toContain("forms.submit");

    const writablePaths = Array.from(
      view.container.querySelectorAll('[data-widget-control-ownership="writable"]')
    ).map((element) => element.getAttribute("data-widget-control-path"));
    expect(writablePaths).toEqual(
      expect.arrayContaining([
        "title",
        "description",
        "submitLabel",
        "successMessage",
        "layout.alignment",
        "layout.width",
        "layout.spacing",
        "layout.buttonAlignment",
        "fields.showLabels",
        "fields.showRequiredIndicator",
        "style.background",
        "style.surface",
        "style.borderColor",
        "style.borderWidth",
        "style.radius",
        "style.inputSize",
        "navigation.backLabel",
        "navigation.nextLabel",
        "submitBehavior.loadingLabel",
        "submitBehavior.successBehavior",
      ])
    );
    expect(writablePaths).not.toContain("formId");

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

    setInputValue(contentInputs[0], "Lead form");
    setTextareaValue(descriptionTextarea, "Ask anything");
    setInputValue(contentInputs[1], "Request demo");
    setTextareaValue(successTextarea, "We received your request.");

    const layoutSelects = getSelects(getSectionByTitle(view.container, "Layout"));
    setSelectValue(layoutSelects[0], "center");
    setSelectValue(layoutSelects[1], "xl");
    setSelectValue(layoutSelects[2], "lg");
    setSelectValue(layoutSelects[3], "end");

    const fieldToggles = getCheckboxes(getSectionByTitle(view.container, "Field labels"));
    setCheckboxValue(fieldToggles[0], false);
    setCheckboxValue(fieldToggles[1], false);

    const styleSection = getSectionByTitle(view.container, "Style");
    const colorInputs = getColorInputs(styleSection);
    const nonColorStyleInputs = Array.from(styleSection.querySelectorAll("input")).filter(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement && element.type !== "color"
    );
    const styleSelects = getSelects(styleSection);

    expect(colorInputs[0]?.value).toBe("#ffffff");
    expect(colorInputs[1]?.value).toBe("#ffffff");
    expect(colorInputs[2]?.value).toBe("#112233");
    expect(nonColorStyleInputs).toHaveLength(0);
    expect(styleSection.textContent).toContain("Saved custom color");
    expect(styleSection.textContent).not.toContain("Custom token active");
    expect(styleSection.textContent).not.toContain("var(--color-bg)");
    expect(styleSection.textContent).not.toContain("var(--color-border)");
    expect(Array.from(styleSelects[1]!.options).map((option) => option.value)).toContain("none");
    expect(Array.from(styleSelects[2]!.options).map((option) => option.value)).toContain("none");

    setInputValue(colorInputs[0], "#abcdef");
    setInputValue(colorInputs[1], "#ddeeff");
    setInputValue(colorInputs[2], "#445566");
    setSelectValue(styleSelects[0], "2");
    setSelectValue(styleSelects[1], "lg");
    setSelectValue(styleSelects[2], "sm");

    const navigationInputs = Array.from(
      getSectionByTitle(view.container, "Multi-step navigation").querySelectorAll("input")
    ).filter(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement && element.type !== "checkbox"
    );
    setInputValue(navigationInputs[0], "Previous");
    setInputValue(navigationInputs[1], "Continue");
    setInputValue(navigationInputs[2], "14");

    const submitSection = getSectionByTitle(view.container, "Submit behavior");
    const submitInputs = Array.from(submitSection.querySelectorAll("input")).filter(
      (element): element is HTMLInputElement => element instanceof HTMLInputElement
    );
    setInputValue(submitInputs[0], "Sending...");
    setSelectValue(getSelects(submitSection)[0], "show-message-keep-form");

    expect(view.getLatestValue()).toMatchObject({
      formId: "form-internal",
      title: "Lead form",
      description: "Ask anything",
      submitLabel: "Request demo",
      successMessage: "We received your request.",
      layout: {
        alignment: "center",
        width: "xl",
        spacing: "lg",
        sectionPaddingY: "lg",
        buttonAlignment: "end",
      },
      fields: {
        showLabels: false,
        showRequiredIndicator: false,
      },
      style: {
        background: "#abcdef",
        surface: "#ddeeff",
        borderColor: "#445566",
        borderWidth: "2",
        radius: "lg",
        inputSize: "sm",
      },
      navigation: {
        backLabel: "Previous",
        nextLabel: "Continue",
        savedProgressTtlDays: 14,
      },
      submitBehavior: {
        loadingLabel: "Sending...",
        successBehavior: "show-message-keep-form",
      },
    });
  } finally {
    view.cleanup();
  }
});

test("FormEmbed visual reports theme-default colors truthfully and clears authored color state", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: formEmbedDefaults,
  });

  try {
    const styleSection = getSectionByTitle(view.container, "Style");
    expect(styleSection.textContent).toContain("Transparent");
    expect(styleSection.textContent).toContain("Theme default");
    expect(styleSection.textContent).not.toContain("Saved custom color");

    const borderControl = getWidgetControl(styleSection, "form-embed.style-border-color");
    const borderSwatch = borderControl.querySelector('input[type="color"]');
    setInputValue(borderSwatch, "#445566");

    expect(view.getLatestValue().style?.borderColor).toBe("#445566");
    expect(borderControl.textContent).toContain("Selected color");

    const clearButton = Array.from(borderControl.querySelectorAll("button")).find(
      (button) => button.textContent === "Clear"
    );
    clickButton(clearButton);

    expect(view.getLatestValue().style?.borderColor).toBeUndefined();
    expect(borderControl.textContent).toContain("Theme default");
  } finally {
    view.cleanup();
  }
});

test("FormEmbed visual clamps saved-progress TTL zero to one", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {},
  });

  try {
    const navigationInputs = Array.from(
      getSectionByTitle(view.container, "Multi-step navigation").querySelectorAll("input")
    ).filter(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement && element.type !== "checkbox"
    );

    setInputValue(navigationInputs[2], "0");

    expect(view.getLatestValue().navigation?.savedProgressTtlDays).toBe(1);
  } finally {
    view.cleanup();
  }
});

test("FormEmbed advanced is read-only and redacts runtime security values", async () => {
  formsState.current = {
    items: [
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
    editor: "advanced",
    initialValue: {
      formId: "form-public",
      resolved: {
        formName: "Public request",
        submissionAccess: "public",
        submissionNonce: "raw-nonce-secret",
        botProtection: {
          provider: "recaptcha_v3",
          siteKey: "site-key-1",
          action: "public_write",
        },
      },
    },
  });

  try {
    expect(view.container.textContent).toContain("Runtime diagnostics");
    expect(view.container.textContent).toContain("Submission security");
    expect(view.container.textContent).toContain("Authoring summary");
    expect(view.container.textContent).toContain("Contract summary");
    expect(() => getSectionByTitle(view.container, "Form selection")).toThrow();
    expect(view.container.querySelector('[data-widget-control-ownership="writable"]')).toBeNull();
    expect(getSelects(view.container)).toHaveLength(0);
    expect(view.container.querySelectorAll("input,select,textarea,button,pre")).toHaveLength(0);
    expect(view.container.textContent).toContain("Enabled for public submissions");
    expect(view.container.textContent).toContain("Bot protection");
    expect(view.container.textContent).toContain("Enabled");
    expect(view.container.textContent).toContain("Copy");
    expect(view.container.textContent).toContain("After submit");
    expect(view.container.textContent).not.toContain("Normalized payload snapshot");
    expect(view.container.textContent).not.toContain("raw value redacted");
    expect(view.container.textContent).not.toContain("public key redacted");
    expect(view.container.textContent).not.toContain("[redacted]");
    expect(view.container.textContent).not.toContain("[public site key configured]");
    expect(view.container.textContent).not.toContain("recaptcha_v3");
    expect(view.container.textContent).not.toContain("raw-nonce-secret");
    expect(view.container.textContent).not.toContain("site-key-1");
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("FormEmbed advanced does not count pristine defaults as authored overrides", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialValue: formEmbedDefaults,
  });

  try {
    expect(view.container.textContent).toContain("Theme defaults");
    expect(view.container.textContent).toContain("default success message");
    expect(view.container.textContent).not.toContain("success message configured");
    expect(view.container.textContent).not.toContain("saved color override");
  } finally {
    view.cleanup();
  }
});

test("FormEmbed modes split diagnostics and multi-step metadata using fetched form detail", async () => {
  const publicForm = makeForm({
    id: "form-public",
    name: "Lead intake",
    status: "draft",
    submissionAccess: "public",
    settings: {
      layoutMode: "multi_step",
      saveProgress: true,
      stepTitles: ["Contact", "Details"],
      preset: "contact",
      automationRetry: {
        enabled: false,
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
      },
    },
  });

  formsState.current = {
    items: [publicForm],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
  detailState.current = {
    "form-public": {
      form: publicForm,
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Name",
          name: "name",
          required: true,
          settings: {},
        },
        {
          id: "field-2",
          type: "textarea",
          label: "Notes",
          name: "notes",
          required: false,
          settings: {},
        },
      ],
    },
  };

  const wizard = await renderEditor({
    editor: "wizard",
    initialValue: {
      formId: "form-public",
      resolved: {
        error: "form_unpublished",
      },
    },
  });

  try {
    expect(wizard.container.textContent).toContain("Field count: 2");
    expect(wizard.container.textContent).toContain("Text, Long text");
    expect(wizard.container.textContent).toContain("Multi-step");
    expect(wizard.container.textContent).toContain("Save progress");
    expect(wizard.container.textContent).toContain(
      "Runtime warning: Selected form is not published yet."
    );
    expect(wizard.container.textContent).not.toContain("form_unpublished");
    expect(wizard.container.textContent).toContain("Setup diagnostics");
    expect(wizard.container.textContent).not.toContain("Content");
    expect(wizard.container.textContent).not.toContain("Style");
  } finally {
    wizard.cleanup();
  }

  const visual = await renderEditor({
    editor: "visual",
    initialValue: {
      formId: "form-public",
    },
  });

  try {
    expect(visual.container.textContent).toContain("Form preview");
    expect(visual.container.textContent).toContain("Content");
    expect(visual.container.textContent).toContain("Style");
    expect(visual.container.textContent).toContain("Submit behavior");
    expect(visual.container.textContent).toContain("Multi-step navigation");
    expect(visual.container.textContent).toContain("Title color");
    expect(() => getSectionByTitle(visual.container, "Form selection")).toThrow();
  } finally {
    visual.cleanup();
  }

  const advanced = await renderEditor({
    editor: "advanced",
    initialValue: {
      formId: "form-public",
      resolved: {
        botProtection: {
          provider: "recaptcha_v3",
          siteKey: "site-key-1",
          action: "public_write",
        },
      },
    },
  });

  try {
    expect(advanced.container.textContent).toContain("Runtime diagnostics");
    expect(advanced.container.textContent).toContain("Submission security");
    expect(advanced.container.textContent).toContain("Authoring summary");
    expect(advanced.container.textContent).toContain("Selected form");
    expect(advanced.container.textContent).toContain("Lead intake");
    expect(advanced.container.textContent).toContain("Form detail status");
    expect(advanced.container.textContent).toContain("Loaded");
    expect(advanced.container.textContent).toContain("Bot protection");
    expect(advanced.container.textContent).toContain("Enabled");
    expect(advanced.container.textContent).not.toContain("Normalized payload snapshot");
    expect(advanced.container.textContent).not.toContain("form-public");
    expect(advanced.container.textContent).not.toContain("Detail cache status");
    expect(advanced.container.textContent).not.toContain("recaptcha_v3");
    expect(advanced.container.textContent).not.toContain("site-key-1");
  } finally {
    advanced.cleanup();
  }
});
