// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { contactDefaults, type ContactData } from "../../../core/widgets/core/contact";

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

const setTextareaValue = (element: Element | undefined, value: string) => {
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

const setSelectValue = (element: Element | undefined, value: string) => {
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

const setCheckboxValue = (element: Element | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  act(() => {
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
  act(() => {
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
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
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

const findFieldToggleCheckbox = (container: ParentNode, label: string) => {
  return Array.from(container.querySelectorAll("input[type='checkbox']")).find((element) => {
    if (!(element instanceof HTMLInputElement)) return false;
    const rowText = element.parentElement?.textContent ?? "";
    return (
      rowText.includes(label) &&
      (rowText.includes("Visible in form.") || rowText.includes("Hidden in form."))
    );
  });
};

const findRequiredFieldCheckbox = (container: ParentNode, label: string) =>
  Array.from(container.querySelectorAll("input[type='checkbox']")).find((element) => {
    if (!(element instanceof HTMLInputElement)) return false;
    const rowText = element.parentElement?.textContent ?? "";
    return rowText.includes(label) && rowText.includes("Mark as required and change order.");
  });

const findRequiredFieldCard = (container: ParentNode, label: string) => {
  const checkbox = findRequiredFieldCheckbox(container, label);
  const card = checkbox?.parentElement?.parentElement;
  if (
    card instanceof HTMLDivElement &&
    card.textContent?.includes(label) &&
    card.textContent.includes("Mark as required and change order.")
  ) {
    return card;
  }
  return undefined;
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("ContactWizardEditor covers variant fallback, form field guard branches, and contact detail updates", async () => {
  const { ContactWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/ContactEditors"
  );

  const onChangeSpy = vi.fn();
  let latestValue: ContactData = {
    form: {
      fields: ["email"],
      required: ["email", "phone"],
      submitLabel: "   ",
    },
    contact: {
      phone: "",
      email: "",
      address: "",
    },
  };
  let currentVariant = "unsupported";

  const Harness = () => {
    const [value, setValue] = useState<ContactData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <ContactWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
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
    expect(view.container.textContent).toContain("Form on the left, contact details on the right.");

    setSelectValue(
      findSelectByOptions(view.container, ["form-left", "form-right", "minimal"]),
      "form-right"
    );
    expect(currentVariant).toBe("form-right");
    expect(view.container.textContent).toContain("Contact details on the left, form on the right.");

    setCheckboxValue(findFieldToggleCheckbox(view.container, "Email"), false);
    expect(latestValue.form?.fields).toEqual(["email"]);
    expect(latestValue.form?.required).toEqual(["email"]);

    setCheckboxValue(findFieldToggleCheckbox(view.container, "Phone"), true);
    expect(latestValue.form?.fields).toEqual(["email", "phone"]);

    setCheckboxValue(findFieldToggleCheckbox(view.container, "Email"), false);
    expect(latestValue.form?.fields).toEqual(["phone"]);
    expect(latestValue.form?.required).toEqual([]);

    setInputValue(findInputByPlaceholder(view.container, "Send message"), "Reach support");
    setInputValue(findInputByPlaceholder(view.container, "+1 555 123 456"), "+48 600 700 800");
    setInputValue(
      findInputByPlaceholder(view.container, "hello@example.com"),
      "support@example.com"
    );
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "123 Market Street"),
      "Marszalkowska 1"
    );

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.form?.submitLabel).toBe("Reach support");
    expect(latestValue.contact).toMatchObject({
      phone: "+48 600 700 800",
      email: "support@example.com",
      address: "Marszalkowska 1",
    });
  } finally {
    view.cleanup();
  }
});

test("ContactVisualEditor covers variant cards, required and ordering rules, contact details, map visibility, and style controls", async () => {
  const { ContactVisualEditor } = await import(
    "../../../core/admin/ui/widgets/editors/ContactEditors"
  );

  const onChangeSpy = vi.fn();
  let latestValue: ContactData = {
    form: {
      fields: ["email", "phone", "message", "phone" as never, "unknown" as never],
      required: ["phone", "name"],
      submitLabel: "Contact us",
    },
    contact: {
      phone: "+48 123 123 123",
      email: "contact@example.com",
      address: "Main Square 1",
      hours: "",
    },
    map: {
      enabled: false,
      embedUrl: "",
    },
    style: {
      spacing: "wide" as never,
      background: "bad-token",
      columns: "stacked" as never,
      surfaceColor: "not-a-hex",
      borderColor: "#abcd",
      borderWidth: "9" as never,
    },
  };
  let currentVariant = "form-right";

  const Harness = () => {
    const [value, setValue] = useState<ContactData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <ContactVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
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
    expect(view.container.textContent).toContain("Submit label");
    expect(view.container.textContent).not.toContain(
      "Columns apply only to `form-left` and `form-right` variants."
    );

    const colorInputs = Array.from(
      view.container.querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    expect(colorInputs.map((input) => input.value)).toEqual([
      "#ffffff",
      "#ffffff",
      "#e2e8f0",
    ]);

    clickButtonByText(view.container, "Minimal");
    expect(currentVariant).toBe("minimal");
    expect(view.container.textContent).toContain(
      "Columns apply only to `form-left` and `form-right` variants."
    );
    expect(findInputByPlaceholder(view.container, "Send message")).toBeUndefined();

    clickButtonByText(view.container, "Form left");
    expect(currentVariant).toBe("form-left");

    const rulesSection = findSection(view.container, "Form fields and required rules");
    if (!rulesSection) {
      throw new Error("Missing rules section");
    }

    setCheckboxValue(
      findRequiredFieldCheckbox(rulesSection, "Email"),
      true
    );
    expect(latestValue.form?.required).toEqual(["phone", "email"]);
    setCheckboxValue(findRequiredFieldCheckbox(rulesSection, "Email"), false);
    expect(latestValue.form?.required).toEqual(["phone"]);
    setCheckboxValue(findRequiredFieldCheckbox(rulesSection, "Email"), true);
    expect(latestValue.form?.required).toEqual(["phone", "email"]);

    const phoneCard = findRequiredFieldCard(rulesSection, "Phone");
    if (!phoneCard) {
      throw new Error("Missing phone card");
    }
    clickButtonByText(phoneCard, "Move up");
    expect(latestValue.form?.fields).toEqual(["phone", "email", "message"]);
    clickButtonByText(findRequiredFieldCard(rulesSection, "Phone") ?? rulesSection, "Move down");
    expect(latestValue.form?.fields).toEqual(["email", "phone", "message"]);

    setCheckboxValue(findFieldToggleCheckbox(rulesSection, "Email"), false);
    expect(latestValue.form?.fields).toEqual(["phone", "message"]);
    expect(latestValue.form?.required).toEqual(["phone"]);

    setInputValue(findInputByPlaceholder(view.container, "Send message"), "Talk to us");
    setInputValue(findInputByPlaceholder(view.container, "+1 555 123 456"), "+48 222 333 444");
    setInputValue(
      findInputByPlaceholder(view.container, "hello@example.com"),
      "hello@nextless.dev"
    );
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "123 Market Street"),
      "Nowy Swiat 10"
    );
    setInputValue(findInputByPlaceholder(view.container, "Mon-Fri 9-5"), "24/7 support");

    const mapSection = findSection(view.container, "Map source and display behavior");
    if (!mapSection) {
      throw new Error("Missing map section");
    }

    setCheckboxValue(mapSection.querySelector("input[type='checkbox']") ?? undefined, true);
    setInputValue(
      findInputByPlaceholder(view.container, "https://maps.google.com/..."),
      "https://maps.example.com/embed"
    );
    expect(latestValue.map).toMatchObject({
      enabled: true,
      embedUrl: "https://maps.example.com/embed",
    });

    setCheckboxValue(mapSection.querySelector("input[type='checkbox']") ?? undefined, false);
    expect(findInputByPlaceholder(view.container, "https://maps.google.com/...")).toBeUndefined();

    setInputValue(colorInputs[0], "#112233");
    setInputValue(colorInputs[1], "#334455");
    setInputValue(colorInputs[2], "#556677");
    setInputValue(
      findInputByPlaceholder(view.container, "transparent or #f8fafc"),
      "var(--surface-contact)"
    );
    setSelectValue(findSelectByOptions(view.container, ["0", "1", "2", "3"]), "3");
    setSelectValue(findSelectByOptions(view.container, ["sm", "md", "lg", "xl"]), "xl");
    setSelectValue(findSelectByOptions(view.container, ["one", "two"]), "one");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.form?.submitLabel).toBe("Talk to us");
    expect(latestValue.contact).toMatchObject({
      phone: "+48 222 333 444",
      email: "hello@nextless.dev",
      address: "Nowy Swiat 10",
      hours: "24/7 support",
    });
    expect(latestValue.contact?.hours).toBe("24/7 support");
    expect(latestValue.style).toMatchObject({
      background: "var(--surface-contact)",
      surfaceColor: "#334455",
      borderColor: "#556677",
      borderWidth: "3",
      spacing: "xl",
      columns: "one",
    });
  } finally {
    view.cleanup();
  }
});

test("ContactAdvancedEditor covers map metadata updates, normalization, and diagnostics output", async () => {
  const { ContactAdvancedEditor } = await import(
    "../../../core/admin/ui/widgets/editors/ContactEditors"
  );

  const onChangeSpy = vi.fn();
  let latestValue: ContactData = {
    form: {
      fields: ["email", "email" as never, "unknown" as never],
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
  };

  const Harness = () => {
    const [value, setValue] = useState<ContactData>(latestValue);

    return (
      <ContactAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const initialSnapshot = view.container.querySelector("pre");
    expect(initialSnapshot?.textContent).toContain('"fields": [\n      "email"\n    ]');
    expect(initialSnapshot?.textContent).toContain('"submitLabel": "Send message"');
    expect(initialSnapshot?.textContent).toContain('"borderWidth": "1"');

    setCheckboxValue(
      view.container.querySelector("input[type='checkbox']") ?? undefined,
      true
    );
    setInputValue(
      findInputByPlaceholder(view.container, "https://maps.google.com/..."),
      "https://maps.example.com/advanced"
    );

    clickButtonByText(view.container, "Apply normalization now");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.form).toMatchObject({
      fields: ["email"],
      required: ["email"],
      submitLabel: "Send message",
    });
    expect(latestValue.map).toMatchObject({
      enabled: true,
      embedUrl: "https://maps.example.com/advanced",
    });
    expect(latestValue.style).toMatchObject({
      spacing: "md",
      columns: "two",
      borderWidth: "1",
    });

    const finalSnapshot = view.container.querySelector("pre");
    expect(finalSnapshot?.textContent).toContain('"enabled": true');
    expect(finalSnapshot?.textContent).toContain(
      '"embedUrl": "https://maps.example.com/advanced"'
    );
  } finally {
    view.cleanup();
  }
});

test("Contact editors cover sparse defaults, minimal variant fallback, and default map metadata state", async () => {
  const {
    ContactAdvancedEditor,
    ContactVisualEditor,
    ContactWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/ContactEditors");

  const sparseValue: ContactData = {
    form: {},
    contact: {},
    map: {},
    style: {},
  };

  const wizardView = mount(
    <ContactWizardEditor value={sparseValue} onChange={() => undefined} variant="form-left" />
  );

  try {
    expect(
      (findInputByPlaceholder(wizardView.container, "Send message") as HTMLInputElement | undefined)
        ?.value
    ).toBe("Send message");
    expect(
      (findInputByPlaceholder(wizardView.container, "+1 555 123 456") as HTMLInputElement | undefined)
        ?.value
    ).toBe(contactDefaults.contact?.phone);
  } finally {
    wizardView.cleanup();
  }

  let latestValue: ContactData = sparseValue;

  const VisualHarness = () => {
    const [value, setValue] = useState<ContactData>(latestValue);

    return (
      <ContactVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="minimal"
      />
    );
  };

  const visualView = mount(<VisualHarness />);

  try {
    expect(visualView.container.textContent).toContain(
      "Columns apply only to `form-left` and `form-right` variants."
    );
    clickButtonByText(visualView.container, "Form left");
    expect(visualView.container.textContent).toContain(
      "Columns apply only to `form-left` and `form-right` variants."
    );

    const mapSection = findSection(visualView.container, "Map source and display behavior");
    if (!mapSection) {
      throw new Error("Missing map section");
    }

    expect(findInputByPlaceholder(visualView.container, "https://maps.google.com/...")).toBeUndefined();

    setCheckboxValue(mapSection.querySelector("input[type='checkbox']") ?? undefined, true);
    setInputValue(
      findInputByPlaceholder(visualView.container, "https://maps.google.com/..."),
      "https://maps.example.com/minimal"
    );

    expect(latestValue.map).toMatchObject({
      enabled: true,
      embedUrl: "https://maps.example.com/minimal",
    });

    const colorsSection = findSection(visualView.container, "Colors, borders, and surface styling");
    if (!colorsSection) {
      throw new Error("Missing colors section");
    }

    expect(
      (findInputByPlaceholder(colorsSection, "transparent or #f8fafc") as HTMLInputElement | undefined)
        ?.value
    ).toBe(contactDefaults.style?.background);
    expect(
      (findInputByPlaceholder(colorsSection, "var(--color-bg) or #ffffff") as HTMLInputElement | undefined)
        ?.value
    ).toBe(contactDefaults.style?.surfaceColor);
    expect(
      (
        findSelectByOptions(colorsSection, ["0", "1", "2", "3"]) as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("1");

    const spacingSection = findSection(visualView.container, "Spacing and columns");
    if (!spacingSection) {
      throw new Error("Missing spacing section");
    }

    expect(
      (
        findSelectByOptions(spacingSection, ["sm", "md", "lg", "xl"]) as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("md");
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <ContactAdvancedEditor value={sparseValue} onChange={() => undefined} />
  );

  try {
    expect(
      (advancedView.container.querySelector("input[type='checkbox']") as HTMLInputElement | undefined)
        ?.checked
    ).toBe(false);
    expect(
      (
        findInputByPlaceholder(advancedView.container, "https://maps.google.com/...") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("");
  } finally {
    advancedView.cleanup();
  }
});
