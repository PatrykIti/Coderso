// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  bookingCalendarDefaults,
  type BookingCalendarData,
} from "../../../core/widgets/core/bookingCalendar";

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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

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

const findLabeledField = (
  container: ParentNode,
  text: string,
  selector: "input" | "textarea"
) =>
  Array.from(container.querySelectorAll("label"))
    .find((label) => normalizeText(label.textContent).startsWith(normalizeText(text)))
    ?.querySelector(selector);

const findInputByLabel = (container: ParentNode, text: string) =>
  findLabeledField(container, text, "input");

const findTextareaByLabel = (container: ParentNode, text: string) =>
  findLabeledField(container, text, "textarea");

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
}: {
  editor: EditorKind;
  initialValue: BookingCalendarData;
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
  });

  try {
    expect(
      (findInputByLabel(view.container, "Flow key") as HTMLInputElement | null | undefined)?.value
    ).toBe(bookingCalendarDefaults.flowId);
    expect(
      (findInputByLabel(view.container, "Title") as HTMLInputElement | null | undefined)?.value
    ).toBe(bookingCalendarDefaults.title);
    expect(
      (findTextareaByLabel(view.container, "Description") as HTMLTextAreaElement | null | undefined)
        ?.value
    ).toBe(bookingCalendarDefaults.description);
    expect(
      (
        findInputByLabel(view.container, "Slot interval (minutes)") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("180");

    setInputValue(findInputByLabel(view.container, "Flow key"), " concierge-flow ");
    setInputValue(findInputByLabel(view.container, "Title"), " Priority booking ");
    setTextareaValue(
      findTextareaByLabel(view.container, "Description"),
      " Reserve time with a specialist. "
    );
    setInputValue(findInputByLabel(view.container, "Service label"), " Offering ");
    setInputValue(findInputByLabel(view.container, "Resource label"), " Specialist ");
    setInputValue(findInputByLabel(view.container, "Date label"), " Visit date ");
    setInputValue(findInputByLabel(view.container, "Refresh button"), " Reload slots ");
    setInputValue(findInputByLabel(view.container, "Slot interval (minutes)"), "not-a-number");

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(
      view.onChangeSpy.mock.calls.some(
        ([next]) => (next as BookingCalendarData).intervalMinutes === 15
      )
    ).toBe(true);

    setInputValue(findInputByLabel(view.container, "Slot interval (minutes)"), "4");

    expect(view.getLatestValue()).toMatchObject({
      flowId: "concierge-flow",
      title: "Priority booking",
      description: "Reserve time with a specialist.",
      serviceLabel: "Offering",
      resourceLabel: "Specialist",
      dateLabel: "Visit date",
      refreshLabel: "Reload slots",
      intervalMinutes: 5,
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
      (
        findInputByLabel(view.container, "Missing selection") as
          | HTMLInputElement
          | undefined
      )?.value
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

test("BookingCalendar advanced editor normalizes resolved payload and runtime error updates", async () => {
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
    expect(
      (findInputByLabel(view.container, "Slots endpoint") as HTMLInputElement | null | undefined)?.value
    ).toBe(bookingCalendarDefaults.slotsEndpoint);
    expect(
      (
        findInputByLabel(view.container, "Default service ID") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("svc-2");
    expect(
      (
        findInputByLabel(view.container, "Default resource ID") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("res-2");
    expect(
      (
        findInputByLabel(view.container, "Runtime error flag") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("resolver-timeout");

    setInputValue(
      findInputByLabel(view.container, "Slots endpoint"),
      " /api/proxy/booking/slots "
    );
    setInputValue(findInputByLabel(view.container, "Default service ID"), " primary-service ");
    setInputValue(findInputByLabel(view.container, "Default resource ID"), " room-a ");
    setInputValue(findInputByLabel(view.container, "Runtime error flag"), "   ");

    const withoutError = view.getLatestValue();
    expect(withoutError.slotsEndpoint).toBe("/api/proxy/booking/slots");
    expect(withoutError.defaultServiceId).toBe("primary-service");
    expect(withoutError.defaultResourceId).toBe("room-a");
    expect(withoutError.resolved?.slotsToken).toBeNull();
    expect(withoutError.resolved?.services).toEqual([
      {
        id: "svc-1",
        name: "Intro call",
        description: "Planning session",
        durationMinutes: 44,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 2,
        priceCents: 0,
        currency: "usd",
        status: "active",
        submissionAccess: "internal",
        resourceIds: ["res-1"],
      },
    ]);
    expect(withoutError.resolved?.resources).toEqual([
      {
        id: "res-1",
        name: "Room A",
        type: "room",
        timezone: "Europe/Warsaw",
        capacity: 1,
        status: "inactive",
      },
    ]);
    expect("error" in (withoutError.resolved ?? {})).toBe(false);

    setInputValue(
      findInputByLabel(view.container, "Runtime error flag"),
      " booking_nonce_unavailable "
    );

    expect(view.getLatestValue().resolved?.error).toBe("booking_nonce_unavailable");
  } finally {
    view.cleanup();
  }
});
