// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { AppointmentFormData } from "../../../core/widgets/core/appointmentForm";

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
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      {...props}
    />
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

const setCheckboxValue = (element: Element | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  act(() => {
    element.click();
  });
};

const findLabelInput = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("label")).find((label) =>
    label.textContent?.includes(text)
  )?.querySelector("input");

const findLabelTextarea = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("label")).find((label) =>
    label.textContent?.includes(text)
  )?.querySelector("textarea");

const findToggleByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll('input[type="checkbox"]')).find((element) =>
    element.parentElement?.textContent?.includes(text)
  );

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
    return (
      <>
        <AppointmentFormWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant="default"
          onVariantChange={() => undefined}
        />
        <AppointmentFormVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant="default"
          onVariantChange={() => undefined}
        />
        <AppointmentFormAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant="default"
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect((findLabelInput(view.container, "Flow key") as HTMLInputElement | undefined)?.value).toBe("booking-flow");

    setInputValue(findLabelInput(view.container, "Flow key"), "concierge-flow");
    setInputValue(findLabelInput(view.container, "Title"), "Priority booking");
    setTextareaValue(findLabelTextarea(view.container, "Description"), "Reserve a selected slot.");
    setInputValue(findLabelInput(view.container, "Submit button"), "Reserve now");
    setInputValue(findLabelInput(view.container, "Success message"), "Reservation confirmed");

    setInputValue(findLabelInput(view.container, "Summary label"), "Selected slot");
    setInputValue(findLabelInput(view.container, "No selection message"), "Choose a slot first");
    setCheckboxValue(findToggleByText(view.container, "Show phone field"), true);
    setInputValue(findLabelInput(view.container, "Phone label"), "Phone");
    setInputValue(findLabelInput(view.container, "Phone placeholder"), "+48 600 700 800");
    setCheckboxValue(findToggleByText(view.container, "Show notes field"), true);
    setInputValue(findLabelInput(view.container, "Notes label"), "Notes");
    setInputValue(findLabelInput(view.container, "Notes placeholder"), "Share context");

    setInputValue(findLabelInput(view.container, "Submission endpoint"), "/api/booking/custom");
    setInputValue(findLabelInput(view.container, "No selection error"), "No slot selected");
    setInputValue(findLabelInput(view.container, "Submission nonce"), "nonce-1");
    setInputValue(findLabelInput(view.container, "Runtime error"), "booking_nonce_unavailable");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue).toMatchObject({
      flowId: "concierge-flow",
      title: "Priority booking",
      description: "Reserve a selected slot.",
      submitLabel: "Reserve now",
      successMessage: "Reservation confirmed",
      slotSummaryLabel: "Selected slot",
      slotSummaryEmptyMessage: "Choose a slot first",
      showPhone: true,
      customerPhoneLabel: "Phone",
      customerPhonePlaceholder: "+48 600 700 800",
      showNotes: true,
      notesLabel: "Notes",
      notesPlaceholder: "Share context",
      submissionEndpoint: "/api/booking/custom",
      noSelectionMessage: "No slot selected",
      resolved: {
        submissionNonce: "nonce-1",
        error: "booking_nonce_unavailable",
      },
    });
  } finally {
    view.cleanup();
  }
});
