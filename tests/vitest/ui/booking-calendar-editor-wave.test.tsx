// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  bookingCalendarDefaults,
  type BookingCalendarData,
} from "../../../core/widgets/core/bookingCalendar";
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
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-input-type={type}
      {...props}
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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

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

const findLabeledField = (container: ParentNode, text: string, selector: "input" | "textarea") =>
  Array.from(container.querySelectorAll("label"))
    .find((label) => normalizeText(label.textContent).startsWith(normalizeText(text)))
    ?.querySelector(selector);

const findInputByLabel = (container: ParentNode, text: string) =>
  findLabeledField(container, text, "input");

const findTextareaByLabel = (container: ParentNode, text: string) =>
  findLabeledField(container, text, "textarea");

const findSelectByLabel = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("label"))
    .find((label) => normalizeText(label.textContent).startsWith(normalizeText(text)))
    ?.querySelector("select");

const findCheckboxByLabel = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("label"))
    .find((label) => normalizeText(label.textContent).startsWith(normalizeText(text)))
    ?.querySelector('input[type="checkbox"]');

const findInputByAriaLabel = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (input) =>
      input instanceof HTMLInputElement &&
      normalizeText(input.getAttribute("aria-label")) === normalizeText(text)
  );

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
  context,
}: {
  editor: EditorKind;
  initialValue: BookingCalendarData;
  context?: WidgetEditorContext;
}) => {
  const {
    BookingCalendarAdvancedEditor,
    BookingCalendarVisualEditor,
    BookingCalendarWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/BookingCalendarEditors");

  const editorMap = {
    wizard: BookingCalendarWizardEditor,
    visual: BookingCalendarVisualEditor,
    advanced: BookingCalendarAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();

  let latestValue = initialValue;

  const Harness = () => {
    const [value, setValue] = useState(initialValue);

    return (
      <Editor
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

  return {
    ...view,
    onChangeSpy,
    getLatestValue: () => latestValue,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("BookingCalendar wizard editor normalizes defaults and clamps interval changes", async () => {
  const view = await renderEditor({
    editor: "wizard",
    initialValue: {
      flowId: "   ",
      title: "   ",
      description: "   ",
      serviceLabel: "   ",
      resourceLabel: "   ",
      dateLabel: "   ",
      refreshLabel: "   ",
      intervalMinutes: 999,
    },
    context: {
      surface: "page-builder",
      blockId: "calendar-1",
      bookingFlows: {
        calendars: [
          { blockId: "calendar-1", flowId: "booking-flow", label: "Current calendar" },
          { blockId: "calendar-2", flowId: "concierge-flow", label: "Concierge calendar" },
        ],
      },
    },
  });

  try {
    expect(
      (findSelectByLabel(view.container, "Booking flow") as HTMLSelectElement | null | undefined)
        ?.value
    ).toBe("__coderso_booking_flow_default__");
    expect(findInputByLabel(view.container, "Title")).toBeUndefined();
    expect(findTextareaByLabel(view.container, "Description")).toBeUndefined();
    expect(
      (findInputByLabel(view.container, "Slot interval (minutes)") as HTMLInputElement | undefined)
        ?.value
    ).toBe("180");

    React.act(() => {
      const bookingFlow = findSelectByLabel(view.container, "Booking flow");
      if (bookingFlow instanceof HTMLSelectElement) {
        bookingFlow.value = "calendar-2";
        bookingFlow.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    setInputValue(findInputByLabel(view.container, "Slot interval (minutes)"), "not-a-number");
    setInputValue(findInputByLabel(view.container, "Default date"), "2030-02-15");
    setInputValue(findInputByLabel(view.container, "Minimum date"), "2030-02-10");
    setInputValue(findInputByLabel(view.container, "Maximum date"), "2030-02-20");

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(
      view.onChangeSpy.mock.calls.some(
        ([next]) => (next as BookingCalendarData).intervalMinutes === 15
      )
    ).toBe(true);

    setInputValue(findInputByLabel(view.container, "Slot interval (minutes)"), "4");

    expect(view.getLatestValue()).toMatchObject({
      flowId: "concierge-flow",
      intervalMinutes: 5,
      defaultDate: "2030-02-15",
      minDate: "2030-02-10",
      maxDate: "2030-02-20",
    });
  } finally {
    view.cleanup();
  }
});

test("BookingCalendar visual editor updates status-copy fields from normalized defaults", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {
      title: "   ",
      description: "   ",
      loadingMessage: "   ",
      emptySlotsMessage: "   ",
      missingSelectionMessage: "   ",
      errorMessage: "   ",
      selectedSlotEmptyMessage: "   ",
    },
  });

  try {
    expect(
      (findInputByLabel(view.container, "Loading") as HTMLInputElement | null | undefined)?.value
    ).toBe(bookingCalendarDefaults.loadingMessage);
    expect(
      (findInputByLabel(view.container, "No slots") as HTMLInputElement | null | undefined)?.value
    ).toBe(bookingCalendarDefaults.emptySlotsMessage);
    expect(
      (findInputByLabel(view.container, "Missing selection") as HTMLInputElement | undefined)?.value
    ).toBe(bookingCalendarDefaults.missingSelectionMessage);
    expect(
      (findInputByLabel(view.container, "Error") as HTMLInputElement | null | undefined)?.value
    ).toBe(bookingCalendarDefaults.errorMessage);

    setInputValue(findInputByLabel(view.container, "Title"), " Availability calendar ");
    setTextareaValue(
      findTextareaByLabel(view.container, "Description"),
      " Pick a service to see the next open times. "
    );
    setInputValue(findInputByLabel(view.container, "Loading"), "Checking availability...");
    setInputValue(findInputByLabel(view.container, "No slots"), "No openings on that date.");
    setInputValue(
      findInputByLabel(view.container, "Missing selection"),
      "Select a service, resource, and date."
    );
    setInputValue(findInputByLabel(view.container, "Error"), "Calendar temporarily offline.");
    setInputValue(
      findInputByLabel(view.container, "Selected slot placeholder"),
      "Pick a slot to continue."
    );

    expect(view.getLatestValue()).toMatchObject({
      title: "Availability calendar",
      description: "Pick a service to see the next open times.",
      loadingMessage: "Checking availability...",
      emptySlotsMessage: "No openings on that date.",
      missingSelectionMessage: "Select a service, resource, and date.",
      errorMessage: "Calendar temporarily offline.",
      selectedSlotEmptyMessage: "Pick a slot to continue.",
    });
  } finally {
    view.cleanup();
  }
});

test("BookingCalendar advanced editor normalizes resolved payload and keeps diagnostics read-only", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialValue: {
      slotsEndpoint: "   ",
      defaultServiceId: " svc-2 ",
      defaultResourceId: " res-2 ",
      resolved: {
        slotsToken: "   ",
        error: " resolver-timeout ",
        services: [
          {
            id: " svc-1 ",
            name: " Intro call ",
            description: " Planning session ",
            durationMinutes: 44.9,
            bufferBeforeMinutes: -1,
            bufferAfterMinutes: 2.8,
            priceCents: -5,
            currency: " usd ",
            status: "active",
            submissionAccess: "internal",
            resourceIds: [" res-1 ", " ", "res-1"],
          },
          {
            id: " ",
            name: "Broken service",
            description: null,
            durationMinutes: 30,
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 0,
            priceCents: null,
            currency: null,
            resourceIds: ["res-1"],
          },
        ],
        resources: [
          {
            id: " res-1 ",
            name: " Room A ",
            type: " room ",
            timezone: " Europe/Warsaw ",
            capacity: 0,
            status: "inactive",
          },
          {
            id: "res-2",
            name: "Broken resource",
            type: "staff",
            timezone: " ",
            capacity: 2,
            status: "active",
          },
        ],
      },
    },
  });

  try {
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Services: 1 · Resources: 1")
    );
    expect(findInputByLabel(view.container, "Slots endpoint")).toBeUndefined();
    expect(normalizeText(view.container.textContent)).toContain("slot loading routedefault");
    expect(normalizeText(view.container.textContent)).toContain(
      "default servicesaved default service"
    );
    expect(normalizeText(view.container.textContent)).toContain(
      "default resourcesaved default resource"
    );
    expect(view.container.textContent).not.toContain("svc-2");
    expect(view.container.textContent).not.toContain("res-2");
    expect(view.container.textContent).toContain("resolver-timeout");
    expect(findSelectByLabel(view.container, "Default service")).toBeUndefined();
    expect(findSelectByLabel(view.container, "Default resource")).toBeUndefined();
    expect(findInputByLabel(view.container, "Runtime error flag")).toBeUndefined();
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("BookingCalendar advanced editor prefers preview catalog counts from editor context", async () => {
  const { BookingCalendarAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/BookingCalendarEditors");

  const context: WidgetEditorContext = {
    surface: "page-builder",
    widgetPreviewData: {
      bookingCalendarResolved: {
        services: [
          {
            id: "service-1",
            name: "Oil Change",
            description: null,
            durationMinutes: 30,
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 0,
            priceCents: 5000,
            currency: "PLN",
            status: "active",
            submissionAccess: "public",
            resourceIds: ["resource-1"],
          },
        ],
        resources: [
          {
            id: "resource-1",
            name: "Mechanic",
            type: "staff",
            timezone: "Europe/Warsaw",
            capacity: 1,
            status: "active",
          },
        ],
        slotsToken: null,
      },
    },
  };

  const view = mount(
    <BookingCalendarAdvancedEditor
      value={{}}
      onChange={() => undefined}
      variant="default"
      context={context}
    />
  );

  try {
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Services: 1 · Resources: 1")
    );
  } finally {
    view.cleanup();
  }
});

test("BookingCalendar advanced editor excludes current calendar from flow diagnostics", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialValue: {
      flowId: "self-flow",
    },
    context: {
      surface: "page-builder",
      blockId: "calendar-1",
      bookingFlows: {
        calendars: [
          { blockId: "calendar-1", flowId: "self-flow", label: "Choose appointment slot" },
          { blockId: "calendar-2", flowId: "peer-flow", label: "Concierge calendar" },
        ],
      },
    },
  });

  try {
    const text = normalizeText(view.container.textContent);

    expect(text).toContain("booking flowsaved custom booking flow");
    expect(text).not.toContain("matches choose appointment slot");
  } finally {
    view.cleanup();
  }
});

test("BookingCalendar visual editor updates context and date-picker controls", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {},
  });

  try {
    React.act(() => {
      const datePickerMode = findSelectByLabel(view.container, "Date picker mode");
      if (datePickerMode instanceof HTMLSelectElement) {
        datePickerMode.value = "week";
        datePickerMode.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const slotIntervalMode = findSelectByLabel(view.container, "Slot interval mode");
      if (slotIntervalMode instanceof HTMLSelectElement) {
        slotIntervalMode.value = "non-overlapping";
        slotIntervalMode.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const showDescription = findCheckboxByLabel(view.container, "Show service description");
      if (showDescription instanceof HTMLInputElement) {
        showDescription.click();
      }
      const dateLanguage = findSelectByLabel(view.container, "Date language");
      if (dateLanguage instanceof HTMLSelectElement) {
        dateLanguage.value = "pl-PL";
        dateLanguage.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    setInputValue(
      findInputByLabel(view.container, "Empty state"),
      "Contact us for manual booking."
    );

    expect(view.getLatestValue()).toMatchObject({
      datePickerMode: "week",
      slotIntervalMode: "non-overlapping",
      showServiceDescription: true,
      summaryLocale: "pl-PL",
      emptyStateMessage: "Contact us for manual booking.",
    });
  } finally {
    view.cleanup();
  }
});

test("BookingCalendar surface color controls use swatches without asking for token text", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {
      style: {
        frameBackground: "var(--color-bg)",
        frameBorderColor: "#112233",
        selectedSlotBackground: "var(--color-primary)",
      },
    },
  });

  try {
    const backgroundSwatch = findInputByAriaLabel(view.container, "Frame background swatch");
    const borderSwatch = findInputByAriaLabel(view.container, "Frame border swatch");
    const selectedSlotSwatch = findInputByAriaLabel(
      view.container,
      "Selected slot background swatch"
    );

    expect((backgroundSwatch as HTMLInputElement | null)?.value).toBe("#ffffff");
    expect((borderSwatch as HTMLInputElement | null)?.value).toBe("#112233");
    expect((selectedSlotSwatch as HTMLInputElement | null)?.value).toBe("#2563eb");
    expect(findInputByAriaLabel(view.container, "Frame background value")).toBeUndefined();

    setInputValue(borderSwatch, "#445566");
    expect(view.getLatestValue().style).toMatchObject({
      frameBackground: "var(--color-bg)",
      frameBorderColor: "#445566",
      selectedSlotBackground: "var(--color-primary)",
    });

    const clearButton = backgroundSwatch?.closest(".space-y-2")?.querySelector("button");
    React.act(() => {
      clearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.getLatestValue().style).toMatchObject({
      frameBorderColor: "#445566",
      selectedSlotBackground: "var(--color-primary)",
    });
    expect(view.getLatestValue().style?.frameBackground).toBeUndefined();
  } finally {
    view.cleanup();
  }
});
