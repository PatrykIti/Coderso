// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import type {
  BookingBlackoutRecord,
  BookingReservationRecord,
  BookingResourceRecord,
  BookingScheduleInput,
  BookingServiceRecord,
  BookingSlotRecord,
} from "../../../core/admin/services/bookingClient";
import { BookingAvailabilityTab } from "../../../core/admin/ui/booking/components/AvailabilityTab";
import { BookingReservationsTab } from "../../../core/admin/ui/booking/components/ReservationsTab";
import { BookingServicesTab } from "../../../core/admin/ui/booking/components/ServicesTab";
import { BookingSlotPreviewTab } from "../../../core/admin/ui/booking/components/SlotPreviewTab";
import type {
  BlackoutFormState,
  ReservationFormState,
  ScheduleDraftState,
  ServiceFormState,
  SlotPreviewFormState,
} from "../../../core/admin/ui/booking/bookingTypes";

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
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/select", () => ({
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
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <tr className={className}>{children}</tr>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("../../../core/admin/ui/booking/bookingHelpers", () => ({
  dayLabel: (day: number) => `Day ${day}`,
  formatDateTime: (value: string, timezone?: string) =>
    timezone ? `${value} @ ${timezone}` : value,
  formatReservationStatus: (status: string) => `status:${status}`,
  toTimeInput: (minutes: number) => `t-${minutes}`,
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

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setTextareaValue = (element: Element | null, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const resources: BookingResourceRecord[] = [
  {
    id: "resource-1",
    name: "Bay A",
    slug: "bay-a",
    type: "bay",
    status: "active",
    timezone: "UTC",
    capacity: 2,
    settings: {},
    createdAt: "2026-03-06T09:00:00.000Z",
    updatedAt: "2026-03-06T09:00:00.000Z",
  },
  {
    id: "resource-2",
    name: "Bay B",
    slug: "bay-b",
    type: "bay",
    status: "active",
    timezone: "Europe/Warsaw",
    capacity: 1,
    settings: {},
    createdAt: "2026-03-06T09:00:00.000Z",
    updatedAt: "2026-03-06T09:00:00.000Z",
  },
];

const services: BookingServiceRecord[] = [
  {
    id: "service-1",
    name: "Inspection",
    slug: "inspection",
    status: "active",
    description: "Annual inspection",
    durationMinutes: 60,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 15,
    priceCents: 2500,
    currency: "USD",
    settings: { submissionAccess: "public" },
    createdAt: "2026-03-06T09:00:00.000Z",
    updatedAt: "2026-03-06T09:00:00.000Z",
  },
  {
    id: "service-2",
    name: "Repair",
    slug: "repair",
    status: "inactive",
    description: "Repair visit",
    durationMinutes: 90,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 20,
    priceCents: null,
    currency: null,
    settings: { submissionAccess: "internal" },
    createdAt: "2026-03-06T09:00:00.000Z",
    updatedAt: "2026-03-06T09:00:00.000Z",
  },
];

const resourcesById = new Map(resources.map((item) => [item.id, item]));
const servicesById = new Map(services.map((item) => [item.id, item]));

const scheduleDraft: ScheduleDraftState = {
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "17:00",
  timezone: "UTC",
  isAvailable: true,
};

const blackoutForm: BlackoutFormState = {
  resourceId: "all",
  startsAt: "2026-03-06T09:00",
  endsAt: "2026-03-06T12:00",
  reason: "Maintenance",
};

const scheduleRows: BookingScheduleInput[] = [
  {
    dayOfWeek: 1,
    startMinute: 540,
    endMinute: 1020,
    timezone: "UTC",
    isAvailable: true,
  },
];

const blackouts: BookingBlackoutRecord[] = [
  {
    id: "blackout-1",
    resourceId: "resource-1",
    startsAt: "2026-03-06T09:00:00.000Z",
    endsAt: "2026-03-06T12:00:00.000Z",
    reason: "Maintenance",
    createdAt: "2026-03-06T08:00:00.000Z",
  },
];

const serviceForm: ServiceFormState = {
  name: "Inspection",
  slug: "inspection",
  status: "active",
  description: "Annual inspection",
  durationMinutes: "60",
  bufferBeforeMinutes: "10",
  bufferAfterMinutes: "15",
  priceCents: "2500",
  currency: "USD",
  submissionAccess: "public",
};

const reservations: BookingReservationRecord[] = [
  {
    id: "reservation-1",
    serviceId: "service-1",
    resourceId: "resource-1",
    formSubmissionId: null,
    status: "pending",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerPhone: "+48123456789",
    notes: "Needs wheelchair access",
    startsAt: "2026-03-07T09:00:00.000Z",
    endsAt: "2026-03-07T10:00:00.000Z",
    timezone: "UTC",
    metadata: {},
    createdAt: "2026-03-06T08:00:00.000Z",
    updatedAt: "2026-03-06T08:00:00.000Z",
  },
];

const reservationForm: ReservationFormState = {
  serviceId: "service-1",
  resourceId: "resource-1",
  startsAt: "2026-03-08T10:00",
  endsAt: "2026-03-08T11:00",
  timezone: "UTC",
  customerName: "John Smith",
  customerEmail: "john@example.com",
  customerPhone: "+48987654321",
  notes: "Phone booking",
};

const slotPreviewForm: SlotPreviewFormState = {
  serviceId: "service-1",
  resourceId: "resource-1",
  date: "2026-03-09",
  timezone: "UTC",
  intervalMinutes: "30",
};

const previewSlots: BookingSlotRecord[] = [
  {
    startsAt: "2026-03-09T09:00:00.000Z",
    endsAt: "2026-03-09T09:30:00.000Z",
    timezone: "UTC",
  },
];

test("BookingAvailabilityTab renders loading and empty states", () => {
  const view = mount(
    <BookingAvailabilityTab
      resources={resources}
      resourcesById={resourcesById}
      selectedResourceId=""
      onSelectResource={() => undefined}
      scheduleRows={[]}
      scheduleDraft={scheduleDraft}
      scheduleLoading
      scheduleSaving={false}
      onScheduleDraftChange={() => undefined}
      onAddScheduleRow={() => undefined}
      onRemoveScheduleRow={() => undefined}
      onSaveSchedules={() => undefined}
      blackoutForm={blackoutForm}
      blackouts={[]}
      blackoutsLoading
      saving={false}
      onBlackoutFormChange={() => undefined}
      onCreateBlackout={() => undefined}
      onDeleteBlackout={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Loading schedules...");
    expect(view.container.textContent).toContain("Loading blackouts...");
  } finally {
    view.cleanup();
  }
});

test("BookingAvailabilityTab forwards schedule and blackout interactions", () => {
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
      resources={resources}
      resourcesById={resourcesById}
      selectedResourceId="resource-1"
      onSelectResource={onSelectResource}
      scheduleRows={scheduleRows}
      scheduleDraft={scheduleDraft}
      scheduleLoading={false}
      scheduleSaving={false}
      onScheduleDraftChange={onScheduleDraftChange}
      onAddScheduleRow={onAddScheduleRow}
      onRemoveScheduleRow={onRemoveScheduleRow}
      onSaveSchedules={onSaveSchedules}
      blackoutForm={blackoutForm}
      blackouts={blackouts}
      blackoutsLoading={false}
      saving={false}
      onBlackoutFormChange={onBlackoutFormChange}
      onCreateBlackout={onCreateBlackout}
      onDeleteBlackout={onDeleteBlackout}
    />
  );

  try {
    expect(view.container.textContent).toContain("Day 1");
    expect(view.container.textContent).toContain("Maintenance");

    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textarea = view.container.querySelector("textarea");
    const buttons = Array.from(view.container.querySelectorAll("button"));

    act(() => {
      setSelectValue(selects[0], "resource-2");
      setSelectValue(selects[1], "2");
      setInputValue(inputs[0], "08:00");
      setInputValue(inputs[1], "16:00");
      setInputValue(inputs[2], "Europe/Warsaw");
      (inputs[3] as HTMLInputElement | undefined)?.click();
      buttons[0]?.click();
      buttons[1]?.click();
      buttons[2]?.click();

      setSelectValue(selects[2], "resource-2");
      setInputValue(inputs[4], "2026-03-07T09:00");
      setInputValue(inputs[5], "2026-03-07T11:00");
      setTextareaValue(textarea, "Holiday");
      buttons[3]?.click();
      buttons[4]?.click();
    });

    expect(onSelectResource).toHaveBeenCalledWith("resource-2");
    expect(onScheduleDraftChange).toHaveBeenCalledWith({ dayOfWeek: "2" });
    expect(onScheduleDraftChange).toHaveBeenCalledWith({ startTime: "08:00" });
    expect(onScheduleDraftChange).toHaveBeenCalledWith({ endTime: "16:00" });
    expect(onScheduleDraftChange).toHaveBeenCalledWith({
      timezone: "Europe/Warsaw",
    });
    expect(onScheduleDraftChange).toHaveBeenCalledWith({ isAvailable: false });
    expect(onAddScheduleRow).toHaveBeenCalledOnce();
    expect(onRemoveScheduleRow).toHaveBeenCalledWith(0);
    expect(onSaveSchedules).toHaveBeenCalledOnce();
    expect(onBlackoutFormChange).toHaveBeenCalledWith({ resourceId: "resource-2" });
    expect(onBlackoutFormChange).toHaveBeenCalledWith({
      startsAt: "2026-03-07T09:00",
    });
    expect(onBlackoutFormChange).toHaveBeenCalledWith({
      endsAt: "2026-03-07T11:00",
    });
    expect(onBlackoutFormChange).toHaveBeenCalledWith({ reason: "Holiday" });
    expect(onCreateBlackout).toHaveBeenCalledOnce();
    expect(onDeleteBlackout).toHaveBeenCalledWith("blackout-1");
  } finally {
    view.cleanup();
  }
});

test("BookingServicesTab renders loading states", () => {
  const view = mount(
    <BookingServicesTab
      services={[]}
      servicesLoading
      selectedServiceId=""
      editingServiceId={null}
      serviceForm={serviceForm}
      resources={[]}
      serviceResourceIds={[]}
      requiredServiceResourceIds={[]}
      serviceResourceLoading
      serviceResourceSaving={false}
      saving={false}
      onSelectService={() => undefined}
      onServiceFormChange={() => undefined}
      onSubmitService={() => undefined}
      onEditService={() => undefined}
      onDeleteService={() => undefined}
      onCancelEdit={() => undefined}
      onToggleServiceResource={() => undefined}
      onToggleRequiredServiceResource={() => undefined}
      onSaveServiceResources={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Loading services...");
    expect(view.container.textContent).toContain("Loading service resources...");
  } finally {
    view.cleanup();
  }
});

test("BookingServicesTab forwards list, form, and assignment actions", () => {
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
      services={services}
      servicesLoading={false}
      selectedServiceId="service-1"
      editingServiceId="service-1"
      serviceForm={serviceForm}
      resources={resources}
      serviceResourceIds={["resource-1"]}
      requiredServiceResourceIds={["resource-1"]}
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
    expect(view.container.textContent).toContain("Inspection");
    expect(view.container.textContent).toContain("internal");

    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textarea = view.container.querySelector("textarea");
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const checkboxes = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];

    act(() => {
      buttons.find((button) => button.textContent?.includes("Edit"))?.click();
      buttons.find((button) => button.textContent?.includes("Delete"))?.click();

      setInputValue(inputs[0], "Repair");
      setInputValue(inputs[1], "repair");
      setTextareaValue(textarea, "Updated service");
      setSelectValue(selects[0], "inactive");
      setSelectValue(selects[1], "internal");
      setInputValue(inputs[2], "90");
      setInputValue(inputs[3], "5");
      setInputValue(inputs[4], "20");
      setInputValue(inputs[5], "5000");
      setInputValue(inputs[6], "EUR");

      buttons.find((button) => button.textContent?.includes("Save service"))?.click();
      buttons.find((button) => button.textContent?.includes("Cancel edit"))?.click();

      setSelectValue(selects[2], "service-2");
      checkboxes[0]?.click();
      checkboxes[1]?.click();
      buttons.find((button) => button.textContent?.includes("Save assignment"))?.click();
    });

    expect(onEditService).toHaveBeenCalledWith(services[0]);
    expect(onDeleteService).toHaveBeenCalledWith("service-1");
    expect(onServiceFormChange).toHaveBeenCalledWith({ name: "Repair" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ slug: "repair" });
    expect(onServiceFormChange).toHaveBeenCalledWith({
      description: "Updated service",
    });
    expect(onServiceFormChange).toHaveBeenCalledWith({ status: "inactive" });
    expect(onServiceFormChange).toHaveBeenCalledWith({
      submissionAccess: "internal",
    });
    expect(onServiceFormChange).toHaveBeenCalledWith({ durationMinutes: "90" });
    expect(onServiceFormChange).toHaveBeenCalledWith({
      bufferBeforeMinutes: "5",
    });
    expect(onServiceFormChange).toHaveBeenCalledWith({
      bufferAfterMinutes: "20",
    });
    expect(onServiceFormChange).toHaveBeenCalledWith({ priceCents: "5000" });
    expect(onServiceFormChange).toHaveBeenCalledWith({ currency: "EUR" });
    expect(onSubmitService).toHaveBeenCalledOnce();
    expect(onCancelEdit).toHaveBeenCalledOnce();
    expect(onSelectService).toHaveBeenCalledWith("service-2");
    expect(onToggleServiceResource).toHaveBeenCalledWith("resource-1", false);
    expect(onToggleRequiredServiceResource).toHaveBeenCalledWith("resource-1", false);
    expect(onSaveServiceResources).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("BookingReservationsTab renders loading state", () => {
  const view = mount(
    <BookingReservationsTab
      reservations={[]}
      reservationsLoading
      services={services}
      resources={resources}
      servicesById={servicesById}
      resourcesById={resourcesById}
      reservationStatusDrafts={{}}
      reservationForm={reservationForm}
      saving={false}
      onReservationFormChange={() => undefined}
      onReservationStatusDraftChange={() => undefined}
      onCreateReservation={() => undefined}
      onUpdateReservationStatus={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Loading reservations...");
  } finally {
    view.cleanup();
  }
});

test("BookingReservationsTab forwards status and form actions", () => {
  const onReservationFormChange = vi.fn();
  const onReservationStatusDraftChange = vi.fn();
  const onCreateReservation = vi.fn();
  const onUpdateReservationStatus = vi.fn();
  const view = mount(
    <BookingReservationsTab
      reservations={reservations}
      reservationsLoading={false}
      services={services}
      resources={resources}
      servicesById={servicesById}
      resourcesById={resourcesById}
      reservationStatusDrafts={{ "reservation-1": "confirmed" }}
      reservationForm={reservationForm}
      saving={false}
      onReservationFormChange={onReservationFormChange}
      onReservationStatusDraftChange={onReservationStatusDraftChange}
      onCreateReservation={onCreateReservation}
      onUpdateReservationStatus={onUpdateReservationStatus}
    />
  );

  try {
    expect(view.container.textContent).toContain("Jane Doe");
    expect(view.container.textContent).toContain("2026-03-07T09:00:00.000Z @ UTC");

    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textarea = view.container.querySelector("textarea");
    const buttons = Array.from(view.container.querySelectorAll("button"));

    act(() => {
      setSelectValue(selects[0], "cancelled");
      buttons.find((button) => button.textContent?.includes("Save"))?.click();

      setSelectValue(selects[1], "service-2");
      setSelectValue(selects[2], "resource-2");
      setInputValue(inputs[0], "2026-03-08T12:00");
      setInputValue(inputs[1], "2026-03-08T13:00");
      setInputValue(inputs[2], "Europe/Warsaw");
      setInputValue(inputs[3], "Alice");
      setInputValue(inputs[4], "alice@example.com");
      setInputValue(inputs[5], "+48111000222");
      setTextareaValue(textarea, "VIP");

      buttons.find((button) => button.textContent?.includes("Create reservation"))?.click();
    });

    expect(onReservationStatusDraftChange).toHaveBeenCalledWith(
      "reservation-1",
      "cancelled"
    );
    expect(onUpdateReservationStatus).toHaveBeenCalledWith("reservation-1");
    expect(onReservationFormChange).toHaveBeenCalledWith({ serviceId: "service-2" });
    expect(onReservationFormChange).toHaveBeenCalledWith({ resourceId: "resource-2" });
    expect(onReservationFormChange).toHaveBeenCalledWith({
      startsAt: "2026-03-08T12:00",
    });
    expect(onReservationFormChange).toHaveBeenCalledWith({
      endsAt: "2026-03-08T13:00",
    });
    expect(onReservationFormChange).toHaveBeenCalledWith({
      timezone: "Europe/Warsaw",
    });
    expect(onReservationFormChange).toHaveBeenCalledWith({ customerName: "Alice" });
    expect(onReservationFormChange).toHaveBeenCalledWith({
      customerEmail: "alice@example.com",
    });
    expect(onReservationFormChange).toHaveBeenCalledWith({
      customerPhone: "+48111000222",
    });
    expect(onReservationFormChange).toHaveBeenCalledWith({ notes: "VIP" });
    expect(onCreateReservation).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("BookingSlotPreviewTab renders empty state", () => {
  const view = mount(
    <BookingSlotPreviewTab
      services={services}
      resources={resources}
      slotPreviewForm={slotPreviewForm}
      previewSlots={[]}
      previewLoading={false}
      onSlotPreviewFormChange={() => undefined}
      onPreviewSlots={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("No preview slots yet.");
    expect(view.container.textContent).toContain("Result count: 0");
  } finally {
    view.cleanup();
  }
});

test("BookingSlotPreviewTab forwards form changes and renders preview slots", () => {
  const onSlotPreviewFormChange = vi.fn();
  const onPreviewSlots = vi.fn();
  const view = mount(
    <BookingSlotPreviewTab
      services={services}
      resources={resources}
      slotPreviewForm={slotPreviewForm}
      previewSlots={previewSlots}
      previewLoading={false}
      onSlotPreviewFormChange={onSlotPreviewFormChange}
      onPreviewSlots={onPreviewSlots}
    />
  );

  try {
    expect(view.container.textContent).toContain("Result count: 1");
    expect(view.container.textContent).toContain("2026-03-09T09:00:00.000Z @ UTC");

    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const button = view.container.querySelector("button");

    act(() => {
      setSelectValue(selects[0], "service-2");
      setSelectValue(selects[1], "resource-2");
      setInputValue(inputs[0], "2026-03-10");
      setInputValue(inputs[1], "Europe/Warsaw");
      setInputValue(inputs[2], "45");
      button?.click();
    });

    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({ serviceId: "service-2" });
    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({ resourceId: "resource-2" });
    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({ date: "2026-03-10" });
    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({
      timezone: "Europe/Warsaw",
    });
    expect(onSlotPreviewFormChange).toHaveBeenCalledWith({
      intervalMinutes: "45",
    });
    expect(onPreviewSlots).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});
