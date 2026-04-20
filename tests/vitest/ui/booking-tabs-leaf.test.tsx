import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
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
  Checkbox: ({ checked, defaultChecked }: { checked?: boolean; defaultChecked?: boolean }) => (
    <input
      type="checkbox"
      checked={checked ?? defaultChecked}
      readOnly
    />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    placeholder,
    type,
  }: {
    value?: string | number;
    placeholder?: string;
    type?: string;
  }) => <input value={value} placeholder={placeholder} type={type} readOnly />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
  }: {
    children: React.ReactNode;
    colSpan?: number;
  }) => <td colSpan={colSpan}>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value }: { value?: string }) => <textarea readOnly defaultValue={value} />,
}));

import { BookingAvailabilityTab } from "../../../core/admin/ui/booking/components/AvailabilityTab";
import { BookingReservationsTab } from "../../../core/admin/ui/booking/components/ReservationsTab";
import { BookingServicesTab } from "../../../core/admin/ui/booking/components/ServicesTab";
import { BookingSlotPreviewTab } from "../../../core/admin/ui/booking/components/SlotPreviewTab";

const resource = {
  id: "resource-1",
  name: "Room A",
  slug: "room-a",
  type: "bay",
  timezone: "Europe/Warsaw",
  status: "active",
  capacity: 4,
  settings: {},
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

test("BookingAvailabilityTab renders loading, schedules, and blackout states", () => {
  const loadingHtml = renderToString(
    <BookingAvailabilityTab
      resources={[resource]}
      resourcesById={new Map([[resource.id, resource]])}
      selectedResourceId={resource.id}
      onSelectResource={() => undefined}
      scheduleRows={[]}
      scheduleDraft={{
        dayOfWeek: "1",
        startTime: "09:00",
        endTime: "17:00",
        timezone: "Europe/Warsaw",
        isAvailable: true,
      }}
      scheduleLoading
      scheduleSaving={false}
      onScheduleDraftChange={() => undefined}
      onAddScheduleRow={() => undefined}
      onRemoveScheduleRow={() => undefined}
      onSaveSchedules={() => undefined}
      blackoutForm={{
        resourceId: "all",
        startsAt: "2026-03-06T09:00",
        endsAt: "2026-03-06T12:00",
        reason: "",
      }}
      blackouts={[]}
      blackoutsLoading
      saving={false}
      onBlackoutFormChange={() => undefined}
      onCreateBlackout={() => undefined}
      onDeleteBlackout={() => undefined}
    />
  );

  const filledHtml = renderToString(
    <BookingAvailabilityTab
      resources={[resource]}
      resourcesById={new Map([[resource.id, resource]])}
      selectedResourceId={resource.id}
      onSelectResource={() => undefined}
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
      scheduleSaving
      onScheduleDraftChange={() => undefined}
      onAddScheduleRow={() => undefined}
      onRemoveScheduleRow={() => undefined}
      onSaveSchedules={() => undefined}
      blackoutForm={{
        resourceId: resource.id,
        startsAt: "2026-03-06T09:00",
        endsAt: "2026-03-06T12:00",
        reason: "Maintenance",
      }}
      blackouts={[
        {
          id: "blackout-1",
          resourceId: resource.id,
          startsAt: "2026-03-06T09:00:00.000Z",
          endsAt: "2026-03-06T12:00:00.000Z",
          reason: "Maintenance",
          createdAt: "2026-03-06T08:00:00.000Z",
        },
      ]}
      blackoutsLoading={false}
      saving
      onBlackoutFormChange={() => undefined}
      onCreateBlackout={() => undefined}
      onDeleteBlackout={() => undefined}
    />
  );

  expect(loadingHtml).toContain("Loading schedules...");
  expect(loadingHtml).toContain("Loading blackouts...");
  expect(filledHtml).toContain("Schedules");
  expect(filledHtml).toContain("Save schedules");
  expect(filledHtml).toContain("available");
  expect(filledHtml).toContain("Blackout windows");
  expect(filledHtml).toContain("Maintenance");
  expect(filledHtml).toContain("Create blackout");
});

test("BookingAvailabilityTab renders empty states, disabled save, and blackout resource fallbacks", () => {
  const emptyHtml = renderToString(
    <BookingAvailabilityTab
      resources={[]}
      resourcesById={new Map()}
      selectedResourceId=""
      onSelectResource={() => undefined}
      scheduleRows={[]}
      scheduleDraft={{
        dayOfWeek: "1",
        startTime: "09:00",
        endTime: "17:00",
        timezone: "Europe/Warsaw",
        isAvailable: false,
      }}
      scheduleLoading={false}
      scheduleSaving={false}
      onScheduleDraftChange={() => undefined}
      onAddScheduleRow={() => undefined}
      onRemoveScheduleRow={() => undefined}
      onSaveSchedules={() => undefined}
      blackoutForm={{
        resourceId: "all",
        startsAt: "2026-03-06T09:00",
        endsAt: "2026-03-06T12:00",
        reason: "",
      }}
      blackouts={[]}
      blackoutsLoading={false}
      saving={false}
      onBlackoutFormChange={() => undefined}
      onCreateBlackout={() => undefined}
      onDeleteBlackout={() => undefined}
    />
  );

  const fallbackHtml = renderToString(
    <BookingAvailabilityTab
      resources={[resource]}
      resourcesById={new Map([[resource.id, resource]])}
      selectedResourceId={resource.id}
      onSelectResource={() => undefined}
      scheduleRows={[]}
      scheduleDraft={{
        dayOfWeek: "5",
        startTime: "08:00",
        endTime: "12:00",
        timezone: "UTC",
        isAvailable: true,
      }}
      scheduleLoading={false}
      scheduleSaving={false}
      onScheduleDraftChange={() => undefined}
      onAddScheduleRow={() => undefined}
      onRemoveScheduleRow={() => undefined}
      onSaveSchedules={() => undefined}
      blackoutForm={{
        resourceId: "all",
        startsAt: "2026-03-07T09:00",
        endsAt: "2026-03-07T12:00",
        reason: "",
      }}
      blackouts={[
        {
          id: "blackout-all",
          resourceId: null,
          startsAt: "2026-03-06T09:00:00.000Z",
          endsAt: "2026-03-06T12:00:00.000Z",
          reason: "",
          createdAt: "2026-03-06T08:00:00.000Z",
        },
        {
          id: "blackout-missing",
          resourceId: "missing-resource",
          startsAt: "2026-03-07T09:00:00.000Z",
          endsAt: "2026-03-07T12:00:00.000Z",
          reason: "",
          createdAt: "2026-03-07T08:00:00.000Z",
        },
      ]}
      blackoutsLoading={false}
      saving={false}
      onBlackoutFormChange={() => undefined}
      onCreateBlackout={() => undefined}
      onDeleteBlackout={() => undefined}
    />
  );

  expect(emptyHtml).toContain("No schedule rows.");
  expect(emptyHtml).toContain("No blackout windows yet.");
  expect(emptyHtml).toContain("disabled");
  expect(fallbackHtml).toContain("All resources");
  expect(fallbackHtml).toContain("missing-resource");
});

test("BookingReservationsTab renders loading, populated table, and manual form", () => {
  const loadingHtml = renderToString(
    <BookingReservationsTab
      reservations={[]}
      reservationsLoading
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
      onReservationFormChange={() => undefined}
      onReservationStatusDraftChange={() => undefined}
      onCreateReservation={() => undefined}
      onUpdateReservationStatus={() => undefined}
    />
  );

  const filledHtml = renderToString(
    <BookingReservationsTab
      reservations={[
        {
          id: "reservation-1",
          serviceId: service.id,
          resourceId: resource.id,
          formSubmissionId: null,
          status: "confirmed",
          startsAt: "2026-03-06T10:00:00.000Z",
          endsAt: "2026-03-06T11:00:00.000Z",
          timezone: "Europe/Warsaw",
          customerName: "Ada Lovelace",
          customerEmail: "ada@example.com",
          customerPhone: "+48123123123",
          notes: "Window seat",
          metadata: {},
          createdAt: "2026-03-06T08:00:00.000Z",
          updatedAt: "2026-03-06T08:00:00.000Z",
        },
      ]}
      reservationsLoading={false}
      services={[service]}
      resources={[resource]}
      servicesById={new Map([[service.id, service]])}
      resourcesById={new Map([[resource.id, resource]])}
      reservationStatusDrafts={{ "reservation-1": "cancelled" }}
      reservationForm={{
        serviceId: service.id,
        resourceId: resource.id,
        startsAt: "2026-03-06T10:00",
        endsAt: "2026-03-06T11:00",
        timezone: "Europe/Warsaw",
        customerName: "Ada Lovelace",
        customerEmail: "ada@example.com",
        customerPhone: "+48123123123",
        notes: "Window seat",
      }}
      saving
      onReservationFormChange={() => undefined}
      onReservationStatusDraftChange={() => undefined}
      onCreateReservation={() => undefined}
      onUpdateReservationStatus={() => undefined}
    />
  );

  expect(loadingHtml).toContain("Loading reservations...");
  expect(filledHtml).toContain("Reservations");
  expect(filledHtml).toContain("Ada Lovelace");
  expect(filledHtml).toContain("Consultation");
  expect(filledHtml).toContain("Room A");
  expect(filledHtml).toContain("Create reservation");
  expect(filledHtml).toContain("Manual reservation creation");
});

test("BookingReservationsTab renders empty reservations and falls back to raw ids", () => {
  const emptyHtml = renderToString(
    <BookingReservationsTab
      reservations={[]}
      reservationsLoading={false}
      services={[]}
      resources={[]}
      servicesById={new Map()}
      resourcesById={new Map()}
      reservationStatusDrafts={{}}
      reservationForm={{
        serviceId: "",
        resourceId: "",
        startsAt: "2026-03-06T10:00",
        endsAt: "2026-03-06T11:00",
        timezone: "Europe/Warsaw",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        notes: "",
      }}
      saving={false}
      onReservationFormChange={() => undefined}
      onReservationStatusDraftChange={() => undefined}
      onCreateReservation={() => undefined}
      onUpdateReservationStatus={() => undefined}
    />
  );

  const fallbackHtml = renderToString(
    <BookingReservationsTab
      reservations={[
        {
          id: "reservation-2",
          serviceId: "service-missing",
          resourceId: "resource-missing",
          formSubmissionId: null,
          status: "pending",
          startsAt: "2026-03-06T10:00:00.000Z",
          endsAt: "2026-03-06T11:00:00.000Z",
          timezone: "Europe/Warsaw",
          customerName: "Grace Hopper",
          customerEmail: "",
          customerPhone: "",
          notes: "",
          metadata: {},
          createdAt: "2026-03-06T08:00:00.000Z",
          updatedAt: "2026-03-06T08:00:00.000Z",
        },
      ]}
      reservationsLoading={false}
      services={[]}
      resources={[]}
      servicesById={new Map()}
      resourcesById={new Map()}
      reservationStatusDrafts={{}}
      reservationForm={{
        serviceId: "",
        resourceId: "",
        startsAt: "2026-03-06T10:00",
        endsAt: "2026-03-06T11:00",
        timezone: "Europe/Warsaw",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        notes: "",
      }}
      saving={false}
      onReservationFormChange={() => undefined}
      onReservationStatusDraftChange={() => undefined}
      onCreateReservation={() => undefined}
      onUpdateReservationStatus={() => undefined}
    />
  );

  expect(emptyHtml).toContain("No reservations yet.");
  expect(fallbackHtml).toContain("service-missing");
  expect(fallbackHtml).toContain("resource-missing");
});

test("BookingServicesTab renders services, edit form, and resource assignment", () => {
  const loadingHtml = renderToString(
    <BookingServicesTab
      services={[]}
      servicesLoading
      selectedServiceId=""
      editingServiceId={null}
      serviceForm={{
        name: "",
        slug: "",
        description: "",
        status: "inactive",
        submissionAccess: "public",
        durationMinutes: "60",
        bufferBeforeMinutes: "0",
        bufferAfterMinutes: "0",
        priceCents: "",
        currency: "",
      }}
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

  const filledHtml = renderToString(
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
      serviceResourceSaving
      saving
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

  expect(loadingHtml).toContain("Loading services...");
  expect(loadingHtml).toContain("Loading service resources...");
  expect(filledHtml).toContain("Services");
  expect(filledHtml).toContain("Consultation");
  expect(filledHtml).toContain("internal");
  expect(filledHtml).toContain("Edit service");
  expect(filledHtml).toContain("Cancel edit");
  expect(filledHtml).toContain("Service resource assignment");
  expect(filledHtml).toContain("Required");
  expect(filledHtml).toContain("Save assignment");
});

test("BookingServicesTab renders empty service and resource-assignment fallbacks", () => {
  const html = renderToString(
    <BookingServicesTab
      services={[]}
      servicesLoading={false}
      selectedServiceId=""
      editingServiceId={null}
      serviceForm={{
        name: "",
        slug: "",
        description: "",
        status: "inactive",
        submissionAccess: "public",
        durationMinutes: "30",
        bufferBeforeMinutes: "0",
        bufferAfterMinutes: "0",
        priceCents: "",
        currency: "",
      }}
      resources={[]}
      serviceResourceIds={[]}
      requiredServiceResourceIds={[]}
      serviceResourceLoading={false}
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

  expect(html).toContain("No services yet.");
  expect(html).toContain("New service");
  expect(html).toContain("Create service");
  expect(html).toContain("Create resources first to configure mapping.");
  expect(html).toContain("disabled");
});

test("BookingServicesTab renders public-access, no-price, and unchecked resource requirement states", () => {
  const html = renderToString(
    <BookingServicesTab
      services={[
        {
          ...service,
          id: "service-public",
          name: "Walk-in",
          priceCents: null,
          currency: null,
          settings: {},
          status: "inactive",
        },
      ]}
      servicesLoading={false}
      selectedServiceId=""
      editingServiceId={null}
      serviceForm={{
        name: "",
        slug: "",
        description: "",
        status: "inactive",
        submissionAccess: "public",
        durationMinutes: "45",
        bufferBeforeMinutes: "5",
        bufferAfterMinutes: "5",
        priceCents: "",
        currency: "",
      }}
      resources={[resource]}
      serviceResourceIds={[]}
      requiredServiceResourceIds={[resource.id]}
      serviceResourceLoading={false}
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

  expect(html).toContain("Walk-in");
  expect(html).toContain("public");
  expect(html).toContain(">—<");
  expect(html).toContain("New service");
  expect(html).toContain("Create service");
  expect(html).not.toContain("Cancel edit");
  expect(html).toContain("Enabled");
  expect(html).toContain("Required");
  expect(html).toContain("Save assignment");
  expect(html).toContain("disabled");
});

test("BookingSlotPreviewTab renders empty and populated preview results", () => {
  const emptyHtml = renderToString(
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
      onSlotPreviewFormChange={() => undefined}
      onPreviewSlots={() => undefined}
    />
  );

  const filledHtml = renderToString(
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
      previewSlots={[
        {
          startsAt: "2026-03-06T10:00:00.000Z",
          endsAt: "2026-03-06T11:00:00.000Z",
          timezone: "Europe/Warsaw",
        },
      ]}
      previewLoading
      onSlotPreviewFormChange={() => undefined}
      onPreviewSlots={() => undefined}
    />
  );

  expect(emptyHtml).toContain("Slot preview");
  expect(emptyHtml).toContain("No preview slots yet. Run preview to load slots.");
  expect(filledHtml).toContain("Run preview");
  expect(filledHtml).toContain("Result count:");
  expect(filledHtml).toContain(">1<");
  expect(filledHtml).toContain("Ends:");
});

test("BookingSlotPreviewTab disables preview while loading", () => {
  const html = renderToString(
    <BookingSlotPreviewTab
      services={[]}
      resources={[]}
      slotPreviewForm={{
        serviceId: "",
        resourceId: "",
        date: "",
        timezone: "UTC",
        intervalMinutes: "15",
      }}
      previewSlots={[]}
      previewLoading
      onSlotPreviewFormChange={() => undefined}
      onPreviewSlots={() => undefined}
    />
  );

  expect(html).toContain("Result count:");
  expect(html).toContain(">0<");
  expect(html).toContain("disabled");
});
