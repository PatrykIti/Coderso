// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { newsletterDefaults, type NewsletterData } from "../../../core/widgets/core/newsletter";

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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
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

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  act(() => {
    if (element.checked !== checked) {
      element.click();
    }
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
  vi.restoreAllMocks();
});

test("Newsletter wizard editor covers variant fallback, submit normalization, and consent branching", async () => {
  const { NewsletterWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");

  const { cleanup, container, getLatestValue, getLatestVariant, onChangeSpy, onVariantChangeSpy } =
    mountNewsletterHarness({
      initialValue: {
        submit: { label: "" },
        consent: { enabled: false },
      },
      initialVariant: "legacy-newsletter",
      render: (props) => <NewsletterWizardEditor {...props} />,
    });

  try {
    const variantSelect = getSelectByOptions(container, ["inline", "stacked", "minimal"]);
    expect(variantSelect.value).toBe("inline");
    expect(findInputByPlaceholder(container, "I agree to receive updates.")).toBeUndefined();

    setSelectValue(variantSelect, "minimal");
    expect(getLatestVariant()).toBe("minimal");
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("minimal");

    setInputValue(getInputByPlaceholder(container, "Join our newsletter"), "Weekly dispatch");
    setTextareaValue(
      getTextareaByPlaceholder(container, "Short supporting line"),
      "Product updates every Friday."
    );

    setInputValue(getInputByPlaceholder(container, "Subscribe"), "   ");
    expect(getLatestValue().submit?.label).toBe(newsletterDefaults.submit?.label);

    setInputValue(getInputByPlaceholder(container, "Subscribe"), "Join now");
    expect(getLatestValue().submit?.label).toBe("Join now");

    const consentToggle = getCheckboxes(container)[0];
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

test("Newsletter visual editor covers variant cards, consent gates, integration switching, and color fallback", async () => {
  const { NewsletterVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");

  const { cleanup, container, getLatestValue, getLatestVariant, onChangeSpy } =
    mountNewsletterHarness({
      initialValue: {
        title: "Campaign updates",
        description: "Weekly launch notes.",
        placeholder: "team@example.com",
        consent: {
          enabled: true,
          label: "Legacy opt-in",
        },
        submit: {
          label: "Stay posted",
          successMessage: "",
        },
        integration: {
          webhookId: "legacy_hook",
        },
        style: {
          spacing: "wide" as never,
          alignment: "edge" as never,
          background: "transparent",
        },
      },
      initialVariant: "legacy-variant",
      render: (props) => <NewsletterVisualEditor {...props} />,
    });

  try {
    const variantSection = getSectionByTitle(container, "Variant and form structure");
    expect(normalizeText(variantSection.textContent)).toContain("inline");
    expect(normalizeText(variantSection.textContent)).toContain("selected");

    clickButton(getButtonsByText(variantSection, "Minimal")[0]);
    expect(getLatestVariant()).toBe("minimal");

    const contentSection = getSectionByTitle(container, "Content and copy");
    setInputValue(getInputByPlaceholder(contentSection, "Join our newsletter"), "Launch notes");
    setTextareaValue(
      getTextareaByPlaceholder(contentSection, "Short supporting line"),
      "Monthly digest for operators."
    );
    setInputValue(getInputByPlaceholder(contentSection, "you@example.com"), "ops@example.com");
    expect(getLatestValue()).toMatchObject({
      title: "Launch notes",
      description: "Monthly digest for operators.",
      placeholder: "ops@example.com",
    });

    const consentSection = getSectionByTitle(container, "Consent and submit behavior");
    setInputValue(getInputByPlaceholder(consentSection, "Subscribe"), "Keep me posted");
    setInputValue(
      getInputByPlaceholder(consentSection, "Thanks for joining!"),
      "Check your inbox."
    );
    expect(getLatestValue().submit).toMatchObject({
      label: "Keep me posted",
      successMessage: "Check your inbox.",
    });

    let consentCheckboxes = getCheckboxes(consentSection);
    expect(consentCheckboxes).toHaveLength(2);

    setCheckboxValue(consentCheckboxes[1], true);
    expect(getLatestValue().consent?.required).toBe(true);

    setCheckboxValue(consentCheckboxes[0], false);
    expect(getLatestValue().consent?.enabled).toBe(false);
    expect(findInputByPlaceholder(consentSection, "I agree to receive updates.")).toBeUndefined();

    consentCheckboxes = getCheckboxes(consentSection);
    expect(consentCheckboxes).toHaveLength(1);
    setCheckboxValue(consentCheckboxes[0], true);
    setInputValue(
      getInputByPlaceholder(consentSection, "I agree to receive updates."),
      "Permission to email me."
    );

    expect(getLatestValue().consent).toMatchObject({
      enabled: true,
      label: "Permission to email me.",
      required: true,
    });

    const integrationSection = getSectionByTitle(container, "Integration target");
    expect(getInputByPlaceholder(integrationSection, "webhook_newsletter_signup").value).toBe(
      "legacy_hook"
    );
    expect(
      findInputByPlaceholder(integrationSection, "https://example.com/subscribe")
    ).toBeUndefined();

    const integrationSelect = getSelectByOptions(integrationSection, ["action-url", "webhook"]);
    expect(integrationSelect.value).toBe("webhook");
    setSelectValue(integrationSelect, "action-url");
    setInputValue(
      getInputByPlaceholder(integrationSection, "https://example.com/subscribe"),
      "https://example.com/newsletter"
    );
    setSelectValue(integrationSelect, "webhook");
    setInputValue(
      getInputByPlaceholder(integrationSection, "webhook_newsletter_signup"),
      "newsletter_sync"
    );

    expect(getLatestValue().integration).toMatchObject({
      mode: "webhook",
      actionUrl: "https://example.com/newsletter",
      webhookId: "newsletter_sync",
    });

    const colorsSection = getSectionByTitle(container, "Colors and emphasis");
    const colorInput = Array.from(colorsSection.querySelectorAll('input[type="color"]'))[0];
    expect((colorInput as HTMLInputElement | null | undefined)?.value).toBe("#ffffff");

    setInputValue(colorInput, "#112233");
    expect(getLatestValue().style?.background).toBe("#112233");
    expect((colorInput as HTMLInputElement | null | undefined)?.value).toBe("#112233");

    setInputValue(getInputByPlaceholder(colorsSection, "transparent"), "paper");
    expect((colorInput as HTMLInputElement | null | undefined)?.value).toBe("#ffffff");

    const spacingSection = getSectionByTitle(container, "Spacing and alignment");
    const spacingSelect = getSelectByOptions(spacingSection, ["none", "sm", "md", "lg", "xl"]);
    const alignmentSelect = getSelectByOptions(spacingSection, ["start", "center", "end"]);

    expect(spacingSelect.value).toBe("md");
    expect(alignmentSelect.value).toBe("start");

    setSelectValue(spacingSelect, "xl");
    setSelectValue(alignmentSelect, "end");

    expect(getLatestValue().style).toMatchObject({
      spacing: "xl",
      alignment: "end",
      background: "paper",
    });
    expect(onChangeSpy).toHaveBeenCalled();
  } finally {
    cleanup();
  }
});

test("Newsletter advanced editor covers fallback summary, raw integration metadata, and normalize action", async () => {
  const { NewsletterAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");

  const { cleanup, container, getLatestValue, onChangeSpy } = mountNewsletterHarness({
    initialValue: {
      submit: { label: "" },
      integration: {
        webhookId: "legacy-advanced-hook",
      },
      consent: {
        enabled: true,
      },
      style: {
        spacing: "wide" as never,
        alignment: "edge" as never,
      },
    },
    initialVariant: "legacy-newsletter",
    render: (props) => <NewsletterAdvancedEditor {...props} />,
  });

  try {
    expect(normalizeText(container.textContent)).toContain(
      "resolved variant: inline. resolved integration mode: webhook. consent required: false."
    );

    const layoutSection = getSectionByTitle(container, "Layout tokens");
    const spacingSelect = getSelectByOptions(layoutSection, ["none", "sm", "md", "lg", "xl"]);
    const alignmentSelect = getSelectByOptions(layoutSection, ["start", "center", "end"]);

    expect(spacingSelect.value).toBe("md");
    expect(alignmentSelect.value).toBe("start");

    setSelectValue(spacingSelect, "xl");
    setSelectValue(alignmentSelect, "center");

    const integrationSection = getSectionByTitle(container, "Raw integration metadata");
    const integrationSelect = getSelectByOptions(integrationSection, ["action-url", "webhook"]);

    expect(integrationSelect.value).toBe("webhook");
    setSelectValue(integrationSelect, "action-url");
    setInputValue(
      getInputByPlaceholder(integrationSection, "https://example.com/subscribe"),
      "https://example.com/raw-signup"
    );
    setInputValue(
      getInputByPlaceholder(integrationSection, "webhook_newsletter_signup"),
      "hook_override"
    );

    expect(getLatestValue().integration).toMatchObject({
      mode: "action-url",
      actionUrl: "https://example.com/raw-signup",
      webhookId: "hook_override",
    });

    clickButton(getButtonsByText(container, "Normalize newsletter payload")[0]);

    expect(getLatestValue()).toMatchObject({
      title: newsletterDefaults.title,
      description: newsletterDefaults.description,
      placeholder: newsletterDefaults.placeholder,
      consent: {
        enabled: true,
        label: newsletterDefaults.consent?.label,
        required: false,
      },
      submit: {
        label: newsletterDefaults.submit?.label,
        successMessage: newsletterDefaults.submit?.successMessage,
      },
      integration: {
        mode: "action-url",
        actionUrl: "https://example.com/raw-signup",
        webhookId: "hook_override",
      },
      style: {
        spacing: "xl",
        alignment: "center",
        background: undefined,
      },
    });
    expect(normalizeText(container.textContent)).toContain(
      "resolved variant: inline. resolved integration mode: action-url. consent required: false."
    );
    expect(onChangeSpy).toHaveBeenCalled();
  } finally {
    cleanup();
  }
});

test("Newsletter editors render sparse defaults and ignore variant changes without a handler", async () => {
  const { NewsletterAdvancedEditor, NewsletterVisualEditor, NewsletterWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/NewsletterEditors");

  const sparseValue: NewsletterData = {
    title: undefined,
    description: undefined,
    placeholder: undefined,
    consent: {},
    submit: {},
    integration: {},
    style: {},
  };

  const wizardView = mount(
    <NewsletterWizardEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="legacy-newsletter"
    />
  );

  try {
    const variantSelect = getSelectByOptions(wizardView.container, [
      "inline",
      "stacked",
      "minimal",
    ]);
    expect(variantSelect.value).toBe("inline");
    expect(getInputByPlaceholder(wizardView.container, "Join our newsletter").value).toBe(
      newsletterDefaults.title ?? ""
    );
    expect(getTextareaByPlaceholder(wizardView.container, "Short supporting line").value).toBe(
      newsletterDefaults.description ?? ""
    );
    setSelectValue(variantSelect, "stacked");
    expect(variantSelect.value).toBe("inline");
  } finally {
    wizardView.cleanup();
  }

  const visualView = mount(
    <NewsletterVisualEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="legacy-newsletter"
    />
  );

  try {
    const variantSection = getSectionByTitle(visualView.container, "Variant and form structure");
    clickButton(getButtonsByText(variantSection, "Minimal")[0]);

    expect(getInputByPlaceholder(visualView.container, "Join our newsletter").value).toBe(
      newsletterDefaults.title ?? ""
    );
    expect(getTextareaByPlaceholder(visualView.container, "Short supporting line").value).toBe(
      newsletterDefaults.description ?? ""
    );
    expect(getInputByPlaceholder(visualView.container, "you@example.com").value).toBe(
      newsletterDefaults.placeholder ?? ""
    );

    const integrationSection = getSectionByTitle(visualView.container, "Integration target");
    expect(getSelectByOptions(integrationSection, ["action-url", "webhook"]).value).toBe(
      "action-url"
    );
    expect(getInputByPlaceholder(integrationSection, "https://example.com/subscribe").value).toBe(
      ""
    );
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <NewsletterAdvancedEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="legacy-newsletter"
    />
  );

  try {
    const layoutSection = getSectionByTitle(advancedView.container, "Layout tokens");
    expect(getSelectByOptions(layoutSection, ["none", "sm", "md", "lg", "xl"]).value).toBe("md");
    expect(getSelectByOptions(layoutSection, ["start", "center", "end"]).value).toBe("start");
  } finally {
    advancedView.cleanup();
  }
});
