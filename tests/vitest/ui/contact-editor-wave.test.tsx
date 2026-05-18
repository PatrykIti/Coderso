// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { contactDefaults, type ContactData } from "../../../core/widgets/core/contact";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const formsRuntimeMockState = vi.hoisted(() => ({
  forms: [] as Array<{
    id: string;
    name: string;
    slug: string;
    status: "draft" | "published" | "archived";
    description: string | null;
    successMessage: string | null;
    successRedirectUrl: string | null;
    submissionAccess: "public" | "internal";
    settings: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>,
  details: new Map<
    string,
    {
      form: {
        id: string;
        name: string;
        slug: string;
        status: "draft" | "published" | "archived";
        description: string | null;
        successMessage: string | null;
        successRedirectUrl: string | null;
        submissionAccess: "public" | "internal";
        settings: Record<string, unknown>;
        createdAt: string;
        updatedAt: string;
      };
      fields: Array<{
        id: string;
        type: string;
        label: string;
        name: string;
        required: boolean;
        settings: Record<string, unknown>;
        orderIndex: number;
      }>;
    }
  >(),
  errors: new Map<string, Error>(),
}));

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
    type,
    placeholder,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
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

vi.mock("@/ui/forms/hooks/useForms", () => ({
  useForms: () => ({
    items: formsRuntimeMockState.forms,
    isLoading: false,
    error: null,
    refresh: async () => undefined,
  }),
}));

vi.mock("@/services/formsClient", () => ({
  getFormDetailCached: vi.fn(async (id: string) => {
    const error = formsRuntimeMockState.errors.get(id);
    if (error) throw error;
    return formsRuntimeMockState.details.get(id) ?? null;
  }),
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

const clickButtonByText = (container: ParentNode, text: string, index = 0) => {
  const button = Array.from(container.querySelectorAll("button")).filter((candidate) =>
    candidate.textContent?.includes(text)
  )[index];
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text} (${index})`);
  }
  React.act(() => {
    button.click();
  });
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findSection = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((element) =>
    element.textContent?.includes(title)
  );

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  formsRuntimeMockState.forms = [];
  formsRuntimeMockState.details.clear();
  formsRuntimeMockState.errors.clear();
  vi.restoreAllMocks();
});

test("ContactWizardEditor uses variant cards, exposes hours, and shows minimal form fallback copy", async () => {
  const { ContactWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContactEditors");

  let latestValue: ContactData = {
    ...contactDefaults,
    contact: {
      ...contactDefaults.contact,
      hours: "",
    },
  };
  let currentVariant = "form-left";

  const Harness = () => {
    const [value, setValue] = useState<ContactData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <ContactWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          currentVariant = next;
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Section header");
    expect(view.container.textContent).toContain("Business hours");

    setInputValue(findInputByPlaceholder(view.container, "Get in touch"), "Contact us");
    setTextareaValue(
      findTextareaByPlaceholder(
        view.container,
        "Optional supporting copy for the contact section."
      ),
      "Tell us what you need."
    );
    setInputValue(findInputByPlaceholder(view.container, "Mon-Fri 9-5"), "24/7 support");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "This contact form is not connected yet."),
      "This Contact form stays presentational for now."
    );

    expect(latestValue.title).toBe("Contact us");
    expect(latestValue.description).toBe("Tell us what you need.");
    expect(latestValue.contact?.hours).toBe("24/7 support");
    expect(latestValue.form?.submission?.staticMessage).toBe(
      "This Contact form stays presentational for now."
    );

    clickButtonByText(view.container, "Minimal");
    expect(currentVariant).toBe("minimal");
    expect(view.container.textContent).toContain(
      "Minimal layout shows contact details only, so form controls stay hidden here."
    );
    expect(findInputByPlaceholder(view.container, "Send message")).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("ContactVisualEditor separates required/order UX and exposes metadata, map, and social controls", async () => {
  const { ContactVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContactEditors");

  let latestValue: ContactData = {
    ...contactDefaults,
    form: {
      ...contactDefaults.form,
      fields: ["name", "email", "message"],
      required: ["email"],
    },
    map: {
      ...contactDefaults.map,
      enabled: false,
      embedUrl: "",
    },
    contact: {
      ...contactDefaults.contact,
      social: [],
    },
  };
  let currentVariant = "minimal";

  const Harness = () => {
    const [value, setValue] = useState<ContactData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <ContactVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          currentVariant = next;
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain(
      "Minimal layout shows contact details only. Form-field controls are hidden"
    );
    expect(findInputByPlaceholder(view.container, "Send message")).toBeUndefined();

    clickButtonByText(view.container, "Form left");
    expect(currentVariant).toBe("form-left");
    expect(view.container.textContent).toContain("Visible fields");
    expect(view.container.textContent).toContain("Required fields");
    expect(view.container.textContent).toContain("Field order");

    setCheckboxValue(
      Array.from(view.container.querySelectorAll("input[type='checkbox']")).find((element) => {
        const rowText = element.parentElement?.textContent ?? "";
        return rowText.includes("Name") && rowText.includes("Hidden from the form.");
      }),
      true
    );
    expect(latestValue.form?.fields).toContain("name");

    const fieldLayoutSelect = findSelectByOptions(view.container, ["one", "two"]);
    setSelectValue(fieldLayoutSelect, "two");
    expect(latestValue.form?.fieldLayout).toBe("two");

    const spanSelect = Array.from(view.container.querySelectorAll("select")).find((element) => {
      if (!(element instanceof HTMLSelectElement)) return false;
      const values = Array.from(element.options).map((option) => option.value);
      return values.includes("half") && values.includes("full");
    });
    setSelectValue(spanSelect, "half");
    expect(latestValue.form?.fieldSettings?.name?.span).toBe("half");

    setInputValue(findInputByPlaceholder(view.container, "Get in touch"), "Reach the team");
    setInputValue(findInputByPlaceholder(view.container, "Contact details"), "Ways to reach us");

    const mapSection = findSection(view.container, "Map source and display behavior");
    if (!mapSection) throw new Error("Missing map section");
    setCheckboxValue(mapSection.querySelector("input[type='checkbox']"), true);
    setInputValue(findInputByPlaceholder(view.container, "https://maps.google.com/..."), "notaurl");
    expect(view.container.textContent).toContain(
      "Use a valid http:// or https:// map embed URL. HTTPS is recommended."
    );
    setSelectValue(findSelectByOptions(mapSection, ["sm", "md", "lg", "xl"]), "lg");
    expect(latestValue.map?.height).toBe("lg");

    clickButtonByText(view.container, "Add social link");
    setInputValue(findInputByPlaceholder(view.container, "LinkedIn"), "Support team");
    setInputValue(
      findInputByPlaceholder(view.container, "https://example.com/profile"),
      "https://example.com/support"
    );
    const platformSelect = Array.from(view.container.querySelectorAll("select")).find((element) => {
      if (!(element instanceof HTMLSelectElement)) return false;
      const values = Array.from(element.options).map((option) => option.value);
      return values.includes("linkedin") && values.includes("custom");
    });
    setSelectValue(platformSelect, "linkedin");

    expect(latestValue.contact?.social?.[0]).toMatchObject({
      platform: "linkedin",
      label: "Support team",
      href: "https://example.com/support",
    });

    const maxWidthSelect = findSelectByOptions(view.container, ["none", "md", "lg", "xl", "2xl"]);
    setSelectValue(maxWidthSelect, "2xl");
    const paddingSelect = findSelectByOptions(view.container, ["none", "sm", "md", "lg"]);
    setSelectValue(paddingSelect, "lg");

    expect(latestValue.style).toMatchObject({
      maxWidth: "2xl",
      paddingX: "lg",
    });
  } finally {
    view.cleanup();
  }
});

test("ContactAdvancedEditor reports normalization results and redacts diagnostics", async () => {
  const { ContactAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContactEditors");

  let latestValue: ContactData = {
    form: {
      fields: ["email", "email" as never],
      required: ["name"],
      submitLabel: "",
    },
    map: {
      enabled: false,
      embedUrl: "ftp://invalid-map",
    },
    style: {
      spacing: "wide" as never,
      columns: "stacked" as never,
      borderWidth: "9" as never,
    },
    resolved: {
      submissionNonce: "secret-nonce",
    },
  } as ContactData;

  const Harness = () => {
    const [value, setValue] = useState<ContactData>(latestValue);

    return (
      <ContactAdvancedEditor
        value={value}
        variant="form-left"
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("[redacted]");
    clickButtonByText(view.container, "Apply normalization now");
    expect(view.container.textContent).toContain("Payload normalized.");
    expect(latestValue.form).toMatchObject({
      fields: ["email"],
      required: [],
      submitLabel: "Send message",
    });
    expect(latestValue.style).toMatchObject({
      spacing: "md",
      columns: "two",
      borderWidth: "1",
    });
  } finally {
    view.cleanup();
  }
});

test("ContactVisualEditor exposes Forms runtime binding, mapping, and compatibility warnings", async () => {
  const { ContactVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContactEditors");

  const publishedForm = {
    id: "form-public",
    name: "Public support",
    slug: "public-support",
    status: "published" as const,
    description: null,
    successMessage: null,
    successRedirectUrl: null,
    submissionAccess: "public" as const,
    settings: {},
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
  };
  const incompatibleForm = {
    ...publishedForm,
    id: "form-incompatible",
    name: "Incompatible support",
    slug: "incompatible-support",
  };
  const internalForm = {
    ...publishedForm,
    id: "form-internal",
    name: "Internal support",
    slug: "internal-support",
    submissionAccess: "internal" as const,
  };

  formsRuntimeMockState.forms = [publishedForm, incompatibleForm, internalForm];
  formsRuntimeMockState.details.set(publishedForm.id, {
    form: publishedForm,
    fields: [
      {
        id: "field-1",
        type: "text",
        label: "Full name",
        name: "full_name",
        required: true,
        settings: {},
        orderIndex: 0,
      },
      {
        id: "field-2",
        type: "email",
        label: "Reply email",
        name: "reply_email",
        required: true,
        settings: {},
        orderIndex: 1,
      },
      {
        id: "field-3",
        type: "textarea",
        label: "Message",
        name: "message_body",
        required: true,
        settings: {},
        orderIndex: 2,
      },
    ],
  });
  formsRuntimeMockState.details.set(incompatibleForm.id, {
    form: incompatibleForm,
    fields: [
      {
        id: "field-1",
        type: "text",
        label: "Full name",
        name: "full_name",
        required: true,
        settings: {},
        orderIndex: 0,
      },
      {
        id: "field-2",
        type: "email",
        label: "Reply email",
        name: "reply_email",
        required: true,
        settings: {},
        orderIndex: 1,
      },
      {
        id: "field-3",
        type: "textarea",
        label: "Message",
        name: "message_body",
        required: true,
        settings: {},
        orderIndex: 2,
      },
      {
        id: "field-4",
        type: "checkbox",
        label: "Consent",
        name: "consent",
        required: true,
        settings: {},
        orderIndex: 3,
      },
    ],
  });
  formsRuntimeMockState.details.set(internalForm.id, {
    form: internalForm,
    fields: [
      {
        id: "field-1",
        type: "text",
        label: "Full name",
        name: "full_name",
        required: true,
        settings: {},
        orderIndex: 0,
      },
      {
        id: "field-2",
        type: "email",
        label: "Reply email",
        name: "reply_email",
        required: true,
        settings: {},
        orderIndex: 1,
      },
      {
        id: "field-3",
        type: "textarea",
        label: "Message",
        name: "message_body",
        required: true,
        settings: {},
        orderIndex: 2,
      },
    ],
  });

  let latestValue: ContactData = {
    ...contactDefaults,
    form: {
      ...contactDefaults.form,
      fields: ["name", "email", "message"],
      submission: {
        ...contactDefaults.form?.submission,
        mode: "forms-runtime",
        formId: publishedForm.id,
        fieldMap: {
          name: "full_name",
          email: "",
          phone: "",
          message: "message_body",
        },
      },
    },
  };
  let currentVariant = "form-left";

  const Harness = () => {
    const [value, setValue] = useState<ContactData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <ContactVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          currentVariant = next;
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flushEffects();

    let runtimeSection = findSection(view.container, "Submission runtime binding");
    if (!runtimeSection) throw new Error("Missing runtime section");
    expect(runtimeSection.textContent).toContain("Field mapping");
    expect(runtimeSection.textContent).toContain("Success message override");

    let runtimeSelects = Array.from(runtimeSection.querySelectorAll("select"));
    const nameMappingSelect = runtimeSelects[2] as HTMLSelectElement;
    expect(Array.from(nameMappingSelect.options).map((option) => option.value)).not.toContain(
      "reply_email"
    );
    setSelectValue(runtimeSelects[3], "reply_email");
    expect(latestValue.form?.submission?.fieldMap?.email).toBe("reply_email");

    setSelectValue(runtimeSelects[1], incompatibleForm.id);
    await flushEffects();
    runtimeSection = findSection(view.container, "Submission runtime binding");
    if (!runtimeSection) throw new Error("Missing runtime section");
    expect(runtimeSection.textContent).toContain(
      "This binding will stay static on public pages until the field set matches."
    );

    runtimeSelects = Array.from(runtimeSection.querySelectorAll("select"));
    setSelectValue(runtimeSelects[1], internalForm.id);
    await flushEffects();
    runtimeSection = findSection(view.container, "Submission runtime binding");
    if (!runtimeSection) throw new Error("Missing runtime section");
    expect(runtimeSection.textContent).toContain("forms.submit");
    expect(latestValue.form?.submission?.formId).toBe(internalForm.id);
  } finally {
    view.cleanup();
  }
});
