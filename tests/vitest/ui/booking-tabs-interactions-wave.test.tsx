// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    "aria-label"?: string;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (value: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} type={type} {...props} />,
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
  ): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <>{placeholder ?? null}</>,
  };
});

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) => (
    <td colSpan={colSpan}>{children}</td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    rows,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
  }) => <textarea value={value} onChange={onChange} rows={rows} />,
}));

import { BookingAvailabilityTab } from "../../../core/admin/ui/booking/components/AvailabilityTab";
import { BookingReservationsTab } from "../../../core/admin/ui/booking/components/ReservationsTab";
import { BookingServicesTab } from "../../../core/admin/ui/booking/components/ServicesTab";
import { BookingSlotPreviewTab } from "../../../core/admin/ui/booking/components/SlotPreviewTab";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const resource = {
  id: "resource-1",
  name: "Room A",
  type: "room",
  timezone: "Europe/Warsaw",
  status: "active",
  capacity: 4,
  createdAt: "2026-03-06T10:00:00.000Z",
  updatedAt: "2026-03-06T10:00:00.000Z",
} as const;

const service = {
  id: "service-1",
  name: "Consultation",
  slug: "consultation",
  description: "Primary service",
  durationMinutes: 60,
  bufferBeforeMinutes: 10,
  bufferAfterMinutes: 15,
  priceCents: 15000,
  currency: "PLN",
  status: "active",
  settings: { submissionAccess: "internal" },
  createdAt: "2026-03-06T10:00:00.000Z",
  updatedAt: "2026-03-06T10:00:00.000Z",
} as const;

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
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input for value ${value}`);
  }
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing textarea for value ${value}`);
  }
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Missing select for value ${value}`);
  }
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.click();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("BookingAvailabilityTab routes draft, schedule, and blackout callbacks", () => {
  const onSelectResource = vi.fn();
  const onScheduleDraftChange = vi.fn();
  const onAddScheduleRow = vi.fn();
  const onRemoveScheduleRow = vi.fn();
  const onSaveSchedules = vi.fn();
  const onBlackoutFormChange = vi.fn();
  const onCreateBlackout = vi.fn();
  const onDeleteBlackout = vi.fn();

  const view = mount(
    <BookingAvailabilityTab
      resources={[resource]}
      resourcesById={new Map([[resource.id, resource]])}
      selectedResourceId={resource.id}
      onSelectResource={onSelectResource}
      scheduleRows={[
        {
          dayOfWeek: 1,
          startMinute: 540,
          endMinute: 1020,
          timezone: "Europe/Warsaw",
          isAvailable: true,
        },
      ]}
      scheduleDraft={{
        dayOfWeek: "1",
        startTime: "09:00",
        endTime: "17:00",
        timezone: "Europe/Warsaw",
        isAvailable: true,
      }}
      scheduleLoading={false}
      scheduleSaving={false}
      onScheduleDraftChange={onScheduleDraftChange}
      onAddScheduleRow={onAddScheduleRow}
      onRemoveScheduleRow={onRemoveScheduleRow}
      onSaveSchedules={onSaveSchedules}
      blackoutForm={{
        resourceId: "all",
        startsAt: "2026-03-06T09:00",
        endsAt: "2026-03-06T12:00",
        reason: "",
      }}
      blackouts={[
        {
          id: "blackout-1",
          resourceId: resource.id,
          startsAt: "2026-03-06T09:00:00.000Z",
          endsAt: "2026-03-06T12:00:00.000Z",
          reason: "Maintenance",
          createdAt: "2026-03-06T08:00:00.000Z",
          updatedAt: "2026-03-06T08:00:00.000Z",
        },
      ]}
      blackoutsLoading={false}
      saving={false}
      onBlackoutFormChange={onBlackoutFormChange}
      onCreateBlackout={onCreateBlackout}
      onDeleteBlackout={onDeleteBlackout}
    />
  );

  try {
    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(
      view.container.querySelectorAll('input:not([type="checkbox"])')
    );
    const checkbox = view.container.querySelector('input[type="checkbox"]');
    const textarea = view.container.querySelector("textarea");
    const iconButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => !button.textContent?.trim()
    );

    setSelectValue(selects[0], resource.id);
    setSelectValue(selects[1], "5");
    setInputValue(inputs[0], "08:30");
    setInputValue(inputs[1], "16:30");
    setInputValue(inputs[2], "UTC");
    if (!(checkbox instanceof HTMLInputElement)) {
      throw new Error("Missing availability checkbox");
    }
    act(() => {
      checkbox.click();
    });
    clickByText(view.container, "Add row");
    if (!(iconButtons[0] instanceof HTMLButtonElement)) {
      throw new Error("Missing schedule delete button");
    }
    act(() => {
      iconButtons[0].click();
    });
    clickByText(view.container, "Save schedules");

    setSelectValue(selects[2], resource.id);
    setInputValue(inputs[3], "2026-03-07T09:00");
    setInputValue(inputs[4], "2026-03-07T12:30");
    setTextareaValue(textarea, "Blocked");
    clickByText(view.container, "Create blackout");
    if (!(iconButtons[1] instanceof HTMLButtonElement)) {
      throw new Error("Missing blackout delete button");
    }
    act(() => {
      iconButtons[1].click();
    });

    expect(onSelectResource).toHaveBeenCalledWith(resource.id);
    expect(onScheduleDraftChange).toHaveBeenCalledWith({ dayOfWeek: "5" });
    expect(onScheduleDraftChange).toHaveBeenCalledWith({ startTime: "08:30" });
    expect(onScheduleDraftChange).toHaveBeenCalledWith({ endTime: "16:30" });
    expect(onScheduleDraftChange).toHaveBeenCalledWith({ timezone: "UTC" });
    expect(onScheduleDraftChange).toHaveBeenCalledWith({ isAvailable: false });
    expect(onAddScheduleRow).toHaveBeenCalled();
    expect(onRemoveScheduleRow).toHaveBeenCalledWith(0);
    expect(onSaveSchedules).toHaveBeenCalled();
    expect(onBlackoutFormChange).toHaveBeenCalledWith({ resourceId: resource.id });
    expect(onBlackoutFormChange).toHaveBeenCalledWith({ startsAt: "2026-03-07T09:00" });
    expect(onBlackoutFormChange).toHaveBeenCalledWith({ endsAt: "2026-03-07T12:30" });
    expect(onBlackoutFormChange).toHaveBeenCalledWith({ reason: "Blocked" });
    expect(onCreateBlackout).toHaveBeenCalled();
    expect(onDeleteBlackout).toHaveBeenCalledWith("blackout-1");
  } finally {
    view.cleanup();
  }
});

test("BookingReservationsTab routes status and manual reservation form callbacks", () => {
  const onReservationFormChange = vi.fn();
  const onReservationStatusDraftChange = vi.fn();
  const onCreateReservation = vi.fn();
  const onUpdateReservationStatus = vi.fn();

  const view = mount(
    <BookingReservationsTab
      reservations={[
        {
          id: "reservation-1",
          serviceId: service.id,
          resourceId: resource.id,
          status: "confirmed",
          startsAt: "2026-03-06T10:00:00.000Z",
          endsAt: "2026-03-06T11:00:00.000Z",
          timezone: "Europe/Warsaw",
          customerName: "Ada Lovelace",
          customerEmail: "ada@example.com",
          customerPhone: "+48123123123",
          notes: "Window seat",
          createdAt: "2026-03-06T08:00:00.000Z",
          updatedAt: "2026-03-06T08:00:00.000Z",
        },
      ]}
      reservationsLoading={false}
      services={[service]}
      resources={[resource]}
      servicesById={new Map([[service.id, service]])}
      resourcesById={new Map([[resource.id, resource]])}
      reservationStatusDrafts={{}}
      reservationForm={{
        serviceId: service.id,
        resourceId: resource.id,
        startsAt: "2026-03-06T10:00",
        endsAt: "2026-03-06T11:00",
        timezone: "Europe/Warsaw",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        notes: "",
      }}
      saving={false}
      onReservationFormChange={onReservationFormChange}
      onReservationStatusDraftChange={onReservationStatusDraftChange}
      onCreateReservation={onCreateReservation}
      onUpdateReservationStatus={onUpdateReservationStatus}
    />
  );

  try {
    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textarea = view.container.querySelector("textarea");

    setSelectValue(selects[0], "cancelled");
    clickByText(view.container, "Save");
    setSelectValue(selects[1], service.id);
    setSelectValue(selects[2], resource.id);
    setInputValue(inputs[0], "2026-03-07T09:00");
    setInputValue(inputs[1], "2026-03-07T10:30");
    setInputValue(inputs[2], "UTC");
    setInputValue(inputs[3], "Grace Hopper");
    setInputValue(inputs[4], "grace@example.com");
    setInputValue(inputs[5], "+48111111111");
    setTextareaValue(textarea, "Manual note");
    clickByText(view.container, "Create reservation");

    expect(onReservationStatusDraftChange).toHaveBeenCalledWith("reservation-1", "cancelled");
    expect(onUpdateReservationStatus).toHaveBeenCalledWith("reservation-1");
    expect(onReservationFormChange).toHaveBeenCalledWith({ serviceId: service.id });
    expect(onReservationFormChange).toHaveBeenCalledWith({ resourceId: resource.id });
    expect(onReservationFormChange).toHaveBeenCalledWith({ startsAt: "2026-03-07T09:00" });
    expect(onReservationFormChange).toHaveBeenCalledWith({ endsAt: "2026-03-07T10:30" });
    expect(onReservationFormChange).toHaveBeenCalledWith({ timezone: "UTC" });
    expect(onReservationFormChange).toHaveBeenCalledWith({ customerName: "Grace Hopper" });
    expect(onReservationFormChange).toHaveBeenCalledWith({ customerEmail: "grace@example.com" });
    expect(onReservationFormChange).toHaveBeenCalledWith({ customerPhone: "+48111111111" });
    expect(onReservationFormChange).toHaveBeenCalledWith({ notes: "Manual note" });
    expect(onCreateReservation).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("BookingServicesTab routes service form, edit/delete, assignment, and save callbacks", () => {
  const onSelectService = vi.fn();
  const onServiceFormChange = vi.fn();
  const onSubmitService = vi.fn();
  const onEditService = vi.fn();
  const onDeleteService = vi.fn();
  const onCancelEdit = vi.fn();
  const onToggleServiceResource = vi.fn();
  const onToggleRequiredServiceResource = vi.fn();
  const onSaveServiceResources = vi.fn();

  const view = mount(
    <BookingServicesTab
      services={[service]}
      servicesLoading={false}
      selectedServiceId={service.id}
      editingServiceId={service.id}
      serviceForm={{
        name: service.name,
        slug: service.slug,
        description: service.description ?? "",
        status: "active",
        submissionAccess: "internal",
        durationMinutes: "60",
        bufferBeforeMinutes: "10",
        bufferAfterMinutes: "15",
        priceCents: "15000",
        currency: "PLN",
      }}
      resources={[resource]}
      serviceResourceIds={[resource.id]}
      requiredServiceResourceIds={[resource.id]}
      serviceResourceLoading={false}
      serviceResourceSaving={false}
      saving={false}
      onSelectService={onSelectService}
      onServiceFormChange={onServiceFormChange}
      onSubmitService={onSubmitService}
      onEditService={onEditService}
      onDeleteService={onDeleteService}
      onCancelEdit={onCancelEdit}
      onToggleServiceResource={onToggleServiceResource}
      onToggleRequiredServiceResource={onToggleRequiredServiceResource}
      onSaveServiceResources={onSaveServiceResources}
    />
  );

  try {
    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(
      view.container.querySelectorAll('input:not([type="checkbox"])')
    );
    const checkboxes = Array.from(view.container.querySelectorAll('input[type="checkbox"]'));
    const textarea = view.container.querySelector("textarea");

    clickByText(view.container, "Edit");
    clickByText(view.container, "Delete");
    setInputValue(inputs[0], "Updated service");
    setInputValue(inputs[1], "updated-service");
    setTextareaValue(textarea, "Updated description");
    setSelectValue(selects[0], "inactive");
    setSelectValue(selects[1], "public");
    setInputValue(inputs[2], "45");
    setInputValue(inputs[3], "5");
    setInputValue(inputs[4], "10");
    setInputValue(inputs[5], "9000");
    setInputValue(inputs[6], "EUR");
    clickByText(view.container, "Save service");
    clickByText(view.container, "Cancel edit");
    setSelectValue(selects[2], service.id);
    act(() => {
      checkboxes[1]?.click();
      checkboxes[0]?.click();
    });
    clickByText(view.container, "Save assignment");

    expect(onSelectService).toHaveBeenCalledWith(service.id);
    expect(onEditService).toHaveBeenCalledWith(service);
    expect(onDeleteService).toHaveBeenCalledWith(service.id);
    expect(onServiceFormChange).toHaveBeenCalledWith({ name: "Updated service" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ slug: "updated-service" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ description: "Updated description" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ status: "inactive" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ submissionAccess: "public" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ durationMinutes: "45" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ bufferBeforeMinutes: "5" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ bufferAfterMinutes: "10" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ priceCents: "9000" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ currency: "EUR" });
    expect(onSubmitService).toHaveBeenCalled();
    expect(onCancelEdit).toHaveBeenCalled();
    expect(onToggleServiceResource).toHaveBeenCalledWith(resource.id, false);
    expect(onToggleRequiredServiceResource).toHaveBeenCalledWith(resource.id, false);
    expect(onSaveServiceResources).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("BookingSlotPreviewTab routes form changes and preview action", () => {
  const onSlotPreviewFormChange = vi.fn();
  const onPreviewSlots = vi.fn();

  const view = mount(
    <BookingSlotPreviewTab
      services={[service]}
      resources={[resource]}
      slotPreviewForm={{
        serviceId: service.id,
        resourceId: resource.id,
        date: "2026-03-06",
        timezone: "Europe/Warsaw",
        intervalMinutes: "30",
      }}
      previewSlots={[]}
      previewLoading={false}
      onSlotPreviewFormChange={onSlotPreviewFormChange}
      onPreviewSlots={onPreviewSlots}
    />
  );

  try {
    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(view.container.querySelectorAll("input"));

    setSelectValue(selects[0], service.id);
    setSelectValue(selects[1], resource.id);
    setInputValue(inputs[0], "2026-03-10");
    setInputValue(inputs[1], "UTC");
    setInputValue(inputs[2], "15");
    clickByText(view.container, "Run preview");

    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({ serviceId: service.id });
    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({ resourceId: resource.id });
    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({ date: "2026-03-10" });
    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({ timezone: "UTC" });
    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({ intervalMinutes: "15" });
    expect(onPreviewSlots).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
