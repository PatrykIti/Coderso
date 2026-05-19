// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { newsletterDefaults, type NewsletterData } from "../../../core/widgets/core/newsletter";

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

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
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
  React.act(() => {
    if (element.checked !== checked) {
      element.click();
    }
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
  return input instanceof HTMLInputElement ? input : undefined;
};

const getInputByPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
  const input = findInputByPlaceholder(container, placeholder, index);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}" (${index})`);
  }
  return input;
};

const getTextareaByPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
  const textarea = Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  )[index];
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing textarea with placeholder "${placeholder}" (${index})`);
  }
  return textarea;
};

const getSelectByOptions = (container: ParentNode, values: string[]) => {
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

const getCheckboxes = (container: ParentNode) =>
  Array.from(container.querySelectorAll('input[type="checkbox"]')).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
  );

const getButtonsByText = (container: ParentNode, text: string) => {
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

const mountNewsletterHarness = ({
  initialValue,
  initialVariant,
  render,
}: {
  initialValue: NewsletterData;
  initialVariant: string;
  render: (props: {
    value: NewsletterData;
    onChange: (next: NewsletterData) => void;
    variant: string;
    onVariantChange: (next: string) => void;
  }) => React.ReactNode;
}) => {
  let latestValue = initialValue;
  let latestVariant = initialVariant;
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<NewsletterData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);

    return render({
      value,
      onChange: (next) => {
        latestValue = next;
        onChangeSpy(next);
        setValue(next);
      },
      variant,
      onVariantChange: (next) => {
        latestVariant = next;
        onVariantChangeSpy(next);
        setVariant(next);
      },
    });
  };

  return {
    ...mount(<Harness />),
    getLatestValue: () => latestValue,
    getLatestVariant: () => latestVariant,
    onChangeSpy,
    onVariantChangeSpy,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  formsRuntimeMockState.forms = [];
  formsRuntimeMockState.details.clear();
  formsRuntimeMockState.errors.clear();
  vi.restoreAllMocks();
});

test("Newsletter wizard keeps variant ownership in Visual and updates copy fields", async () => {
  const { NewsletterWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");

  const { cleanup, container, getLatestValue, onChangeSpy } = mountNewsletterHarness({
    initialValue: {
      submit: { label: "" },
      consent: { enabled: true },
    },
    initialVariant: "minimal",
    render: (props) => <NewsletterWizardEditor {...props} />,
  });

  try {
    expect(normalizeText(container.textContent)).toContain("change the variant in visual");
    expect(normalizeText(container.textContent)).toContain(
      "description stays saved, but the minimal variant does not render it"
    );

    setInputValue(getInputByPlaceholder(container, "Join our newsletter"), "Weekly dispatch");
    setTextareaValue(
      getTextareaByPlaceholder(container, "Short supporting line"),
      "Product updates every Friday."
    );
    setInputValue(getInputByPlaceholder(container, "Subscribe"), "Join now");

    const consentToggle = getCheckboxes(container)[0];
    setCheckboxValue(consentToggle, false);
    expect(findInputByPlaceholder(container, "I agree to receive updates.")).toBeUndefined();

    setCheckboxValue(consentToggle, true);
    setInputValue(
      getInputByPlaceholder(container, "I agree to receive updates."),
      "Send me product updates."
    );

    expect(getLatestValue()).toMatchObject({
      title: "Weekly dispatch",
      description: "Product updates every Friday.",
      submit: { label: "Join now" },
      consent: {
        enabled: true,
        label: "Send me product updates.",
      },
    });
    expect(onChangeSpy).toHaveBeenCalled();
  } finally {
    cleanup();
  }
});

test("Newsletter visual editor covers forms-runtime binding, semantics, preview, and style controls", async () => {
  formsRuntimeMockState.forms = [
    {
      id: "form-public",
      name: "Newsletter",
      slug: "newsletter",
      status: "published",
      description: null,
      successMessage: "Thanks!",
      successRedirectUrl: null,
      submissionAccess: "public",
      settings: {},
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
  ];
  formsRuntimeMockState.details.set("form-public", {
    form: formsRuntimeMockState.forms[0]!,
    fields: [
      {
        id: "field-1",
        type: "text",
        label: "First name",
        name: "first_name",
        required: false,
        settings: {},
        orderIndex: 0,
      },
      {
        id: "field-2",
        type: "email",
        label: "Email",
        name: "email",
        required: true,
        settings: {},
        orderIndex: 1,
      },
      {
        id: "field-3",
        type: "checkbox",
        label: "Consent",
        name: "consent",
        required: false,
        settings: {},
        orderIndex: 2,
      },
    ],
  });

  const { NewsletterVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");

  const { cleanup, container, getLatestValue, getLatestVariant, onChangeSpy } =
    mountNewsletterHarness({
      initialValue: {
        title: "Campaign updates",
        description: "Weekly launch notes.",
        placeholder: "team@example.com",
        stateCopy: {
          loadingMessage: "Sending...",
          successMessage: "Done.",
          errorMessage: "Try again.",
        },
        form: {
          emailFieldName: "email",
          emailLabel: "Email address",
          showEmailLabel: false,
          consentFieldName: "consent",
          firstName: {
            enabled: false,
            label: "First name",
            placeholder: "Your first name",
            fieldName: "first_name",
            required: false,
          },
        },
        consent: {
          enabled: true,
          label: "Legacy opt-in",
          required: false,
        },
        integration: {
          mode: "action-url",
          method: "post",
          actionUrl: "",
          webhookId: "",
        },
        submission: {
          mode: "static",
          formId: "",
          analyticsEvent: "",
          successBehavior: "show-message-hide-form",
        },
        style: {
          spacing: "wide" as never,
          alignment: "edge" as never,
          width: "oversized" as never,
          background: "transparent",
          textColor: "",
          buttonBackground: "",
          buttonTextColor: "",
        },
      },
      initialVariant: "legacy-newsletter",
      render: (props) => <NewsletterVisualEditor {...props} />,
    });

  try {
    const variantSection = getSectionByTitle(container, "Variant and form structure");
    clickButton(getButtonsByText(variantSection, "Minimal")[0]);
    expect(getLatestVariant()).toBe("minimal");

    const semanticsSection = getSectionByTitle(container, "Form semantics and consent");
    setInputValue(getInputByPlaceholder(semanticsSection, "Email address"), "Work email");
    const showLabelToggle = getCheckboxes(semanticsSection)[0];
    setCheckboxValue(showLabelToggle, true);
    setInputValue(getInputByPlaceholder(semanticsSection, "email"), "subscriber_email");

    const firstNameToggle = getCheckboxes(semanticsSection)[1];
    setCheckboxValue(firstNameToggle, true);
    setInputValue(getInputByPlaceholder(semanticsSection, "first_name"), "first_name");
    setCheckboxValue(getCheckboxes(semanticsSection)[2], true);

    const consentCheckboxes = getCheckboxes(semanticsSection);
    setCheckboxValue(consentCheckboxes[4], true);
    setInputValue(getInputByPlaceholder(semanticsSection, "consent"), "consent_newsletter");
    setSelectValue(getSelectByOptions(semanticsSection, ["single", "double"]), "double");
    setTextareaValue(
      getTextareaByPlaceholder(
        semanticsSection,
        "Please check your inbox to confirm your subscription."
      ),
      "Please confirm from your inbox."
    );
    expect(normalizeText(semanticsSection.textContent)).toContain(
      "double opt-in enforcement remains provider-owned"
    );

    const runtimeSection = getSectionByTitle(container, "Submission runtime");
    setSelectValue(
      getSelectByOptions(runtimeSection, ["static", "forms-runtime"]),
      "forms-runtime"
    );
    await React.act(async () => {
      await (
        window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
      ).happyDOM?.waitUntilComplete?.();
    });
    setSelectValue(getSelectByOptions(runtimeSection, ["form-public"]), "form-public");
    expect(normalizeText(runtimeSection.textContent)).toContain(
      "this form does not have a redirect configured"
    );

    setInputValue(getInputByPlaceholder(runtimeSection, "Sending..."), "Saving...");
    setInputValue(
      getInputByPlaceholder(runtimeSection, "Unable to submit the form. Please try again."),
      "Retry later."
    );
    setInputValue(getInputByPlaceholder(runtimeSection, "Thanks for joining!"), "Joined!");
    setInputValue(getInputByPlaceholder(runtimeSection, "newsletter_submit"), "newsletter_signup");
    clickButton(getButtonsByText(runtimeSection, "Success state")[0]);
    expect(normalizeText(runtimeSection.textContent)).toContain("joined!");

    const integrationSection = getSectionByTitle(container, "Integration target");
    setInputValue(
      getInputByPlaceholder(integrationSection, "https://example.com/subscribe"),
      "example.com"
    );
    expect(normalizeText(integrationSection.textContent)).toContain(
      "action url must be https:// or an approved"
    );

    const colorsSection = getSectionByTitle(container, "Colors and emphasis");
    setInputValue(getInputByPlaceholder(colorsSection, "transparent"), "#f8fafc");
    const colorInputs = Array.from(colorsSection.querySelectorAll('input[type="color"]'));
    setInputValue(colorInputs[1], "#111827");
    setInputValue(colorInputs[2], "#1d4ed8");
    setInputValue(colorInputs[3], "#ffffff");

    const spacingSection = getSectionByTitle(container, "Spacing and alignment");
    setSelectValue(getSelectByOptions(spacingSection, ["none", "sm", "md", "lg", "xl"]), "xl");
    setSelectValue(getSelectByOptions(spacingSection, ["start", "center", "end"]), "end");
    setSelectValue(
      getSelectByOptions(spacingSection, ["narrow", "default", "wide", "full"]),
      "wide"
    );

    expect(getLatestValue()).toMatchObject({
      form: {
        emailLabel: "Work email",
        showEmailLabel: true,
        emailFieldName: "subscriber_email",
        consentFieldName: "consent_newsletter",
        firstName: {
          enabled: true,
          fieldName: "first_name",
          required: true,
        },
      },
      optIn: {
        mode: "double",
        confirmationCopy: "Please confirm from your inbox.",
      },
      submission: {
        mode: "forms-runtime",
        formId: "form-public",
        analyticsEvent: "newsletter_signup",
      },
      stateCopy: {
        loadingMessage: "Saving...",
        successMessage: "Joined!",
        errorMessage: "Retry later.",
      },
      style: {
        spacing: "xl",
        alignment: "end",
        width: "wide",
      },
    });
    expect(onChangeSpy).toHaveBeenCalled();
  } finally {
    cleanup();
  }
});

test("Newsletter visual editor warns when a bound form is internal or incompatible", async () => {
  formsRuntimeMockState.forms = [];
  formsRuntimeMockState.details.set("form-internal", {
    form: {
      id: "form-internal",
      name: "Internal form",
      slug: "internal",
      status: "published",
      description: null,
      successMessage: null,
      successRedirectUrl: null,
      submissionAccess: "internal",
      settings: {},
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
    fields: [
      {
        id: "field-1",
        type: "email",
        label: "Reply email",
        name: "reply_email",
        required: true,
        settings: {},
        orderIndex: 0,
      },
      {
        id: "field-2",
        type: "text",
        label: "First name",
        name: "first_name",
        required: true,
        settings: {},
        orderIndex: 1,
      },
    ],
  });

  const { NewsletterVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");

  const view = mount(
    <NewsletterVisualEditor
      value={{
        ...newsletterDefaults,
        form: {
          ...newsletterDefaults.form,
          emailFieldName: "reply_email",
          firstName: {
            ...newsletterDefaults.form?.firstName,
            enabled: true,
            required: false,
          },
        },
        submission: {
          ...newsletterDefaults.submission,
          mode: "forms-runtime",
          formId: "form-internal",
        },
      }}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  try {
    await React.act(async () => {
      await (
        window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
      ).happyDOM?.waitUntilComplete?.();
    });
    const runtimeSection = getSectionByTitle(view.container, "Submission runtime");
    expect(normalizeText(runtimeSection.textContent)).toContain("internal submissions require");
    expect(normalizeText(runtimeSection.textContent)).toContain("missing matching form fields");
    expect(normalizeText(runtimeSection.textContent)).toContain("must require them too");
  } finally {
    view.cleanup();
  }
});

test("Newsletter visual editor publishes page-builder preview hydration for forms-runtime", async () => {
  formsRuntimeMockState.forms = [
    {
      id: "form-preview",
      name: "Newsletter preview",
      slug: "newsletter-preview",
      status: "published",
      description: "Runtime hydrated",
      successMessage: "Joined!",
      successRedirectUrl: "/thanks",
      submissionAccess: "public",
      settings: {},
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
  ];
  formsRuntimeMockState.details.set("form-preview", {
    form: formsRuntimeMockState.forms[0]!,
    fields: [
      {
        id: "field-1",
        type: "email",
        label: "Email",
        name: "email",
        required: true,
        settings: {},
        orderIndex: 0,
      },
      {
        id: "field-2",
        type: "checkbox",
        label: "Consent",
        name: "consent",
        required: false,
        settings: {},
        orderIndex: 1,
      },
    ],
  });

  const { NewsletterVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");
  const setPreviewState = vi.fn();

  const view = mount(
    <NewsletterVisualEditor
      value={{
        ...newsletterDefaults,
        submission: {
          ...newsletterDefaults.submission,
          mode: "forms-runtime",
          formId: "form-preview",
        },
      }}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
      context={{
        surface: "page-builder",
        setPreviewState,
      }}
    />
  );

  try {
    await React.act(async () => {
      await (
        window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
      ).happyDOM?.waitUntilComplete?.();
    });

    expect(setPreviewState).toHaveBeenCalledWith({ status: "loading" });
    expect(setPreviewState).toHaveBeenLastCalledWith({
      status: "ready",
      dataPatch: {
        resolved: {
          formId: "form-preview",
          formName: "Newsletter preview",
          description: "Runtime hydrated",
          status: "published",
          successMessage: "Joined!",
          successRedirectUrl: "/thanks",
          submissionAccess: "public",
          fields: [
            {
              id: "field-1",
              type: "email",
              label: "Email",
              name: "email",
              required: true,
              settings: {},
              orderIndex: 0,
            },
            {
              id: "field-2",
              type: "checkbox",
              label: "Consent",
              name: "consent",
              required: false,
              settings: {},
              orderIndex: 1,
            },
          ],
        },
      },
    });
  } finally {
    view.cleanup();
  }
});

test("Newsletter advanced editor summarizes the active transport and normalizes payload", async () => {
  const { NewsletterAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");

  const { cleanup, container, getLatestValue, onChangeSpy } = mountNewsletterHarness({
    initialValue: {
      integration: {
        mode: "action-url",
        method: "get",
        actionUrl: "example.com",
        webhookId: "legacy-webhook",
      },
      submission: {
        mode: "static",
        formId: "",
        analyticsEvent: "newsletter_signup",
        successBehavior: "show-message-hide-form",
      },
    },
    initialVariant: "legacy-newsletter",
    render: (props) => <NewsletterAdvancedEditor {...props} />,
  });

  try {
    expect(normalizeText(container.textContent)).toContain("active integration field: actionurl");
    expect(normalizeText(container.textContent)).toContain("action status: invalid");
    expect(normalizeText(container.textContent)).toContain("ignored field: webhookid");

    const metadataSection = getSectionByTitle(container, "Raw integration metadata");
    setInputValue(
      getInputByPlaceholder(metadataSection, "https://example.com/subscribe"),
      "https://example.com/newsletter"
    );
    setInputValue(
      getInputByPlaceholder(metadataSection, "webhook_newsletter_signup"),
      "hook_override"
    );

    clickButton(getButtonsByText(container, "Normalize newsletter payload")[0]);

    expect(getLatestValue()).toMatchObject({
      integration: {
        actionUrl: "https://example.com/newsletter",
        webhookId: "hook_override",
      },
    });
    expect(onChangeSpy).toHaveBeenCalled();
  } finally {
    cleanup();
  }
});

test("Newsletter advanced editor explains that forms-runtime owns submit", async () => {
  const { NewsletterAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");

  const view = mount(
    <NewsletterAdvancedEditor
      value={{
        ...newsletterDefaults,
        submission: {
          ...newsletterDefaults.submission,
          mode: "forms-runtime",
          formId: "form-public",
        },
        integration: {
          mode: "action-url",
          method: "get",
          actionUrl: "https://example.com/newsletter",
          webhookId: "legacy-hook",
        },
      }}
      onChange={() => undefined}
      variant="inline"
    />
  );

  try {
    expect(normalizeText(view.container.textContent)).toContain("active integration field: formid");
    expect(normalizeText(view.container.textContent)).toContain(
      "ignored field: actionurl and webhookid stay inactive while the bound form owns submit."
    );
  } finally {
    view.cleanup();
  }
});
