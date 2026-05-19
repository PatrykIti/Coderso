// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { AppointmentFormData } from "../../../core/widgets/core/appointmentForm";
import type { WidgetEditorContext } from "../../../core/widgets/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    [key: string]: unknown;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} {...props} />
  ),
}));

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
    rows,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} rows={rows} {...props} />,
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

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  React.act(() => {
    element.click();
  });
};

const findLabelInput = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("label"))
    .find((label) => label.textContent?.includes(text))
    ?.querySelector("input");

const findLabelTextarea = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("label"))
    .find((label) => label.textContent?.includes(text))
    ?.querySelector("textarea");

const findLabelSelect = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("label"))
    .find((label) => label.textContent?.includes(text))
    ?.querySelector("select");

const findToggleByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll('input[type="checkbox"]')).find((element) =>
    element.parentElement?.textContent?.includes(text)
  );

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButtonByText = (container: ParentNode, text: string, index = 0) => {
  const matches = Array.from(container.querySelectorAll("button")).filter((button) =>
    button.textContent?.includes(text)
  );
  const button = matches[index];
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button containing text "${text}" at index ${index}`);
  }
  React.act(() => {
    button.click();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("AppointmentForm editors cover normalized defaults, field toggles, copy updates, and runtime payload edits", async () => {
  const {
    AppointmentFormAdvancedEditor,
    AppointmentFormVisualEditor,
    AppointmentFormWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/AppointmentFormEditors");

  const onChangeSpy = vi.fn();
  let latestVariant = "default";
  let latestValue: AppointmentFormData = {
    flowId: "   ",
    title: "",
    description: "",
    submitLabel: " ",
    successMessage: "",
    showPhone: false,
    showNotes: false,
    submissionEndpoint: " ",
    noSelectionMessage: " ",
    resolved: {
      submissionNonce: " ",
      error: " ",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<AppointmentFormData>(latestValue);
    const [variant, setVariant] = useState(latestVariant);
    return (
      <>
        <AppointmentFormWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            latestVariant = next;
            setVariant(next);
          }}
        />
        <AppointmentFormVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            latestVariant = next;
            setVariant(next);
          }}
        />
        <AppointmentFormAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            latestVariant = next;
            setVariant(next);
          }}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect(
      (findLabelInput(view.container, "Flow key") as HTMLInputElement | null | undefined)?.value
    ).toBe("booking-flow");

    setSelectValue(findLabelSelect(view.container, "Variant"), "sidebar");
    setInputValue(findLabelInput(view.container, "Flow key"), "concierge-flow");
    setInputValue(findLabelInput(view.container, "Locale override"), "pl-PL");
    setInputValue(findLabelInput(view.container, "Success redirect URL"), "/booking/confirmed");
    setInputValue(findLabelInput(view.container, "Title"), "Priority booking");
    setTextareaValue(findLabelTextarea(view.container, "Description"), "Reserve a selected slot.");
    setInputValue(findLabelInput(view.container, "Submit button"), "Reserve now");
    setInputValue(findLabelInput(view.container, "Loading message"), "Submitting booking");
    setInputValue(findLabelInput(view.container, "Success message"), "Reservation confirmed");

    setInputValue(findLabelInput(view.container, "Summary label"), "Chosen slot");
    setInputValue(findLabelInput(view.container, "Empty summary message"), "Choose a slot first");
    setInputValue(findLabelInput(view.container, "No selection error"), "No slot selected");
    setCheckboxValue(findToggleByText(view.container, "Include resource in summary"), false);
    setSelectValue(findLabelSelect(view.container, "Name mode"), "split");
    setInputValue(findLabelInput(view.container, "First name label"), "Given name");
    setInputValue(findLabelInput(view.container, "First name placeholder"), "Jamie");
    setInputValue(findLabelInput(view.container, "Last name label"), "Family name");
    setInputValue(findLabelInput(view.container, "Last name placeholder"), "Doe");
    expect(findLabelInput(view.container, "Phone label")).toBeUndefined();
    expect(findLabelInput(view.container, "Notes label")).toBeUndefined();
    setCheckboxValue(findToggleByText(view.container, "Show email field"), false);
    expect(findLabelInput(view.container, "Email label")).toBeUndefined();
    setCheckboxValue(findToggleByText(view.container, "Show email field"), true);
    setCheckboxValue(findToggleByText(view.container, "Require email field"), true);
    setInputValue(findLabelInput(view.container, "Email label"), "Contact email");
    setInputValue(findLabelInput(view.container, "Email placeholder"), "bookings@example.com");
    setCheckboxValue(findToggleByText(view.container, "Show phone field"), true);
    setCheckboxValue(findToggleByText(view.container, "Require phone field"), true);
    setInputValue(findLabelInput(view.container, "Phone label"), "Mobile number");
    setInputValue(findLabelInput(view.container, "Phone placeholder"), "+48 600 700 800");
    setInputValue(
      findLabelInput(view.container, "Phone validation pattern"),
      "^\\\\+?[0-9 ]{7,20}$"
    );
    setInputValue(findLabelInput(view.container, "Phone help text"), "Include country code");
    setCheckboxValue(findToggleByText(view.container, "Show notes field"), true);
    setInputValue(findLabelInput(view.container, "Notes label"), "Additional details");
    setInputValue(findLabelInput(view.container, "Notes placeholder"), "Share context");
    setInputValue(findLabelInput(view.container, "Notes max length"), "750");
    setCheckboxValue(findToggleByText(view.container, "Show consent checkbox"), true);
    setInputValue(findLabelInput(view.container, "Consent label"), "I agree to the booking terms");
    setCheckboxValue(findToggleByText(view.container, "Require consent"), true);
    setInputValue(findLabelInput(view.container, "Privacy URL"), "/privacy");
    setInputValue(findLabelInput(view.container, "Terms URL"), "/terms");

    setInputValue(findLabelInput(view.container, "Submission endpoint"), "/api/booking/custom");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestVariant).toBe("sidebar");
    expect(latestValue).toMatchObject({
      flowId: "concierge-flow",
      locale: "pl-PL",
      successRedirectUrl: "/booking/confirmed",
      title: "Priority booking",
      description: "Reserve a selected slot.",
      submitLabel: "Reserve now",
      loadingMessage: "Submitting booking",
      successMessage: "Reservation confirmed",
      slotSummaryLabel: "Chosen slot",
      slotSummaryEmptyMessage: "Choose a slot first",
      noSelectionMessage: "No slot selected",
      showServiceInSummary: true,
      showResourceInSummary: false,
      nameMode: "split",
      customerFirstNameLabel: "Given name",
      customerFirstNamePlaceholder: "Jamie",
      customerLastNameLabel: "Family name",
      customerLastNamePlaceholder: "Doe",
      showEmail: true,
      requiredEmail: true,
      customerEmailLabel: "Contact email",
      customerEmailPlaceholder: "bookings@example.com",
      showPhone: true,
      requiredPhone: true,
      customerPhoneLabel: "Mobile number",
      customerPhonePlaceholder: "+48 600 700 800",
      phonePattern: "^\\\\+?[0-9 ]{7,20}$",
      phonePatternMessage: "Include country code",
      showNotes: true,
      notesLabel: "Additional details",
      notesPlaceholder: "Share context",
      notesMaxLength: 750,
      consent: {
        enabled: true,
        label: "I agree to the booking terms",
        required: true,
        privacyUrl: "/privacy",
        termsUrl: "/terms",
      },
      submissionEndpoint: "/api/booking/custom",
    });
    expect(view.container.textContent).toContain(
      "Server-injected booking nonce. Read-only in the editor."
    );
    expect(view.container.textContent).toContain("No runtime warning");
  } finally {
    view.cleanup();
  }
});

test("AppointmentForm wizard shows same-surface booking flow pairing feedback", async () => {
  const { AppointmentFormWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/AppointmentFormEditors");

  let latestValue: AppointmentFormData = {
    flowId: "booking-flow",
  };
  const onChangeSpy = vi.fn();
  const context: WidgetEditorContext = {
    surface: "page-builder",
    bookingFlows: {
      calendars: [
        { blockId: "calendar-1", flowId: "booking-flow", label: "Primary calendar" },
        { blockId: "calendar-2", flowId: "concierge-flow", label: "Concierge calendar" },
      ],
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<AppointmentFormData>(latestValue);
    return (
      <AppointmentFormWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant="default"
        onVariantChange={() => undefined}
        context={context}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(
      view.container.querySelector('[data-appointment-flow-feedback="matched"]')?.textContent
    ).toContain("Primary calendar");

    setInputValue(findLabelInput(view.container, "Flow key"), "missing-flow");
    expect(
      view.container.querySelector('[data-appointment-flow-feedback="mismatch"]')?.textContent
    ).toContain("booking-flow, concierge-flow");
  } finally {
    view.cleanup();
  }
});

test("AppointmentForm visual editor authors bounded custom fields", async () => {
  const { AppointmentFormVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/AppointmentFormEditors");

  let latestValue: AppointmentFormData = {
    flowId: "booking-flow",
  };

  const Harness = () => {
    const [value, setValue] = useState<AppointmentFormData>(latestValue);
    return (
      <AppointmentFormVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="default"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    clickButtonByText(view.container, "Add custom field");

    expect(view.container.textContent).toContain("Custom field 1");
    setInputValue(findLabelInput(view.container, "Field label"), "Company");
    setSelectValue(findLabelSelect(view.container, "Field type"), "select");
    setTextareaValue(findLabelTextarea(view.container, "Options"), "Email\nPhone");
    setCheckboxValue(findToggleByText(view.container, "Required field"), true);

    expect(latestValue.customFields?.[0]).toEqual(
      expect.objectContaining({
        label: "Company",
        type: "select",
        required: true,
        options: ["Email", "Phone"],
      })
    );

    clickButtonByText(view.container, "Remove");
    expect(latestValue.customFields).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("AppointmentForm editors render safe empty-string fallbacks when normalized fields are sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/appointmentForm", async () => {
    const actual = await vi.importActual<
      typeof import("../../../core/widgets/core/appointmentForm")
    >("../../../core/widgets/core/appointmentForm");

    return {
      ...actual,
      normalizeAppointmentFormData: vi.fn((value: AppointmentFormData) => ({
        ...value,
        flowId: undefined,
        title: undefined,
        description: undefined,
        submitLabel: undefined,
        loadingMessage: undefined,
        successMessage: undefined,
        showServiceInSummary: undefined,
        showResourceInSummary: undefined,
        locale: undefined,
        successRedirectUrl: undefined,
        slotSummaryLabel: undefined,
        slotSummaryEmptyMessage: undefined,
        customerFirstNameLabel: undefined,
        customerLastNameLabel: undefined,
        customerNameLabel: undefined,
        customerFirstNamePlaceholder: undefined,
        customerLastNamePlaceholder: undefined,
        customerNamePlaceholder: undefined,
        showEmail: undefined,
        requiredEmail: undefined,
        customerEmailLabel: undefined,
        customerEmailPlaceholder: undefined,
        showPhone: undefined,
        requiredPhone: undefined,
        nameMode: undefined,
        customerPhoneLabel: undefined,
        customerPhonePlaceholder: undefined,
        phonePattern: undefined,
        phonePatternMessage: undefined,
        showNotes: undefined,
        notesLabel: undefined,
        notesPlaceholder: undefined,
        notesMaxLength: undefined,
        consent: undefined,
        submissionEndpoint: undefined,
        noSelectionMessage: undefined,
        resolved: undefined,
      })),
    };
  });

  const {
    AppointmentFormAdvancedEditor,
    AppointmentFormVisualEditor,
    AppointmentFormWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/AppointmentFormEditors");

  const view = mount(
    <>
      <AppointmentFormWizardEditor
        value={{}}
        onChange={() => undefined}
        variant="default"
        onVariantChange={() => undefined}
      />
      <AppointmentFormVisualEditor
        value={{}}
        onChange={() => undefined}
        variant="default"
        onVariantChange={() => undefined}
      />
      <AppointmentFormAdvancedEditor
        value={{}}
        onChange={() => undefined}
        variant="default"
        onVariantChange={() => undefined}
      />
    </>
  );

  try {
    const textInputs = Array.from(
      view.container.querySelectorAll<HTMLInputElement>(
        'input:not([type="checkbox"]):not([type="number"])'
      )
    );

    expect(textInputs.every((input) => input.value === "")).toBe(true);
    expect(
      (findLabelTextarea(view.container, "Description") as HTMLTextAreaElement | null | undefined)
        ?.value
    ).toBe("");
    expect(
      (findToggleByText(view.container, "Show email field") as HTMLInputElement | null | undefined)
        ?.checked
    ).toBe(true);
    expect(
      (findToggleByText(view.container, "Show phone field") as HTMLInputElement | null | undefined)
        ?.checked
    ).toBe(true);
    expect(
      (findToggleByText(view.container, "Show notes field") as HTMLInputElement | null | undefined)
        ?.checked
    ).toBe(true);
    expect(
      (findLabelInput(view.container, "Notes max length") as HTMLInputElement | null | undefined)
        ?.value
    ).toBe("500");
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/appointmentForm");
    vi.resetModules();
  }
});
