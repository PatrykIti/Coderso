// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const bookingPageState = vi.hoisted(() => {
  const resource = {
    id: "resource-1",
    name: "Room A",
    type: "room",
    timezone: "Europe/Warsaw",
    status: "active",
    capacity: 4,
    createdAt: "2026-03-08T10:00:00.000Z",
    updatedAt: "2026-03-08T10:00:00.000Z",
  };

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
    createdAt: "2026-03-08T10:00:00.000Z",
    updatedAt: "2026-03-08T10:00:00.000Z",
  };

  const reservation = {
    id: "reservation-1",
    serviceId: "service-1",
    resourceId: "resource-1",
    status: "confirmed" as const,
    startsAt: "2026-03-08T12:00:00.000Z",
    endsAt: "2026-03-08T13:00:00.000Z",
    timezone: "Europe/Warsaw",
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.com",
    customerPhone: "+48123123123",
    notes: "Window seat",
    createdAt: "2026-03-08T09:00:00.000Z",
    updatedAt: "2026-03-08T09:00:00.000Z",
  };

  const blackout = {
    id: "blackout-1",
    resourceId: "resource-1",
    startsAt: "2026-03-09T09:00:00.000Z",
    endsAt: "2026-03-09T10:00:00.000Z",
    reason: "Maintenance",
    createdAt: "2026-03-08T08:00:00.000Z",
    updatedAt: "2026-03-08T08:00:00.000Z",
  };

  const schedules = [
    {
      dayOfWeek: 1,
      startMinute: 540,
      endMinute: 1020,
      timezone: "Europe/Warsaw",
      isAvailable: true,
    },
  ];

  const serviceResources = [
    {
      serviceId: "service-1",
      resourceId: "resource-1",
      isRequired: true,
    },
  ];

  const previewSlots = [
    {
      startsAt: "2026-03-10T10:00:00.000Z",
      endsAt: "2026-03-10T11:00:00.000Z",
      resourceId: "resource-1",
      serviceId: "service-1",
    },
  ];

  return {
    resources: [resource],
    services: [service],
    reservations: [reservation],
    blackouts: [blackout],
    cachedResources: [resource] as (typeof resource)[] | undefined,
    cachedServices: [service] as (typeof service)[] | undefined,
    cachedReservations: [reservation] as (typeof reservation)[] | undefined,
    cachedBlackouts: [blackout] as (typeof blackout)[] | undefined,
    schedulesByResource: {
      "resource-1": [...schedules],
    } as Record<string, typeof schedules>,
    serviceResourcesByService: {
      "service-1": [...serviceResources],
    } as Record<string, typeof serviceResources>,
    previewSlots,
    subscribers: new Set<(event: { key: string }) => void>(),
    listResourceCalls: [] as Array<boolean | undefined>,
    listServiceCalls: [] as Array<boolean | undefined>,
    listReservationCalls: [] as Array<boolean | undefined>,
    listBlackoutCalls: [] as Array<boolean | undefined>,
    scheduleCalls: [] as string[],
    serviceResourceCalls: [] as string[],
    createResourceCalls: [] as Array<Record<string, unknown>>,
    updateResourceCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    deleteResourceCalls: [] as string[],
    createServiceCalls: [] as Array<Record<string, unknown>>,
    updateServiceCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    deleteServiceCalls: [] as string[],
    saveServiceResourceCalls: [] as Array<{ id: string; payload: Array<Record<string, unknown>> }>,
    saveScheduleCalls: [] as Array<{ id: string; payload: Array<Record<string, unknown>> }>,
    createBlackoutCalls: [] as Array<Record<string, unknown>>,
    deleteBlackoutCalls: [] as string[],
    createReservationCalls: [] as Array<Record<string, unknown>>,
    updateReservationStatusCalls: [] as Array<{ id: string; status: string }>,
    previewSlotCalls: [] as Array<Record<string, unknown>>,
    resourceSaveError: null as unknown,
    resourceDeleteError: null as unknown,
    serviceSaveError: null as unknown,
    serviceDeleteError: null as unknown,
    serviceResourceSaveError: null as unknown,
    scheduleSaveError: null as unknown,
    blackoutSaveError: null as unknown,
    blackoutDeleteError: null as unknown,
    reservationSaveError: null as unknown,
    reservationStatusError: null as unknown,
    slotPreviewError: null as unknown,
    reset() {
      this.resources = [resource];
      this.services = [service];
      this.reservations = [reservation];
      this.blackouts = [blackout];
      this.cachedResources = [resource];
      this.cachedServices = [service];
      this.cachedReservations = [reservation];
      this.cachedBlackouts = [blackout];
      this.schedulesByResource = {
        "resource-1": [...schedules],
      };
      this.serviceResourcesByService = {
        "service-1": [...serviceResources],
      };
      this.previewSlots = [...previewSlots];
      this.subscribers.clear();
      this.listResourceCalls = [];
      this.listServiceCalls = [];
      this.listReservationCalls = [];
      this.listBlackoutCalls = [];
      this.scheduleCalls = [];
      this.serviceResourceCalls = [];
      this.createResourceCalls = [];
      this.updateResourceCalls = [];
      this.deleteResourceCalls = [];
      this.createServiceCalls = [];
      this.updateServiceCalls = [];
      this.deleteServiceCalls = [];
      this.saveServiceResourceCalls = [];
      this.saveScheduleCalls = [];
      this.createBlackoutCalls = [];
      this.deleteBlackoutCalls = [];
      this.createReservationCalls = [];
      this.updateReservationStatusCalls = [];
      this.previewSlotCalls = [];
      this.resourceSaveError = null;
      this.resourceDeleteError = null;
      this.serviceSaveError = null;
      this.serviceDeleteError = null;
      this.serviceResourceSaveError = null;
      this.scheduleSaveError = null;
      this.blackoutSaveError = null;
      this.blackoutDeleteError = null;
      this.reservationSaveError = null;
      this.reservationStatusError = null;
      this.slotPreviewError = null;
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
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

vi.mock("@/components/ui/tabs", () => ({
  // TASK-479-17-L02: surface the controlled `value` as `data-active-tab` while
  // still rendering ALL children, so the existing all-tabs-rendered flow tests
  // stay unaffected and the New-booking tab switch is observable.
  Tabs: ({ value, children }: { value?: string; children: React.ReactNode }) => (
    <div data-active-tab={value}>{children}</div>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    bookingResourcesList: "bookingResourcesList",
    bookingServicesList: "bookingServicesList",
    bookingReservationsList: "bookingReservationsList",
    bookingBlackoutsList: "bookingBlackoutsList",
  },
}));

vi.mock("@/services/bookingClient", () => ({
  getCachedBookingResources: () => bookingPageState.cachedResources,
  getCachedBookingServices: () => bookingPageState.cachedServices,
  getCachedBookingReservations: () => bookingPageState.cachedReservations,
  getCachedBookingBlackouts: () => bookingPageState.cachedBlackouts,
  resolveBookingSubmissionAccess: (
    settings: Record<string, unknown> | null | undefined,
    fallback = "public"
  ) => (settings?.submissionAccess as string | undefined) ?? fallback,
  withBookingSubmissionAccess: (
    settings: Record<string, unknown> | null | undefined,
    submissionAccess: string
  ) => ({ ...(settings ?? {}), submissionAccess }),
  listBookingResourcesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    bookingPageState.listResourceCalls.push(force);
    return bookingPageState.resources;
  }),
  listBookingServicesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    bookingPageState.listServiceCalls.push(force);
    return bookingPageState.services;
  }),
  listBookingReservationsCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    bookingPageState.listReservationCalls.push(force);
    return bookingPageState.reservations;
  }),
  listBookingBlackoutsCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    bookingPageState.listBlackoutCalls.push(force);
    return bookingPageState.blackouts;
  }),
  listBookingSchedulesCached: vi.fn(async (resourceId: string) => {
    bookingPageState.scheduleCalls.push(resourceId);
    return bookingPageState.schedulesByResource[resourceId] ?? [];
  }),
  listBookingServiceResourcesCached: vi.fn(async (serviceId: string) => {
    bookingPageState.serviceResourceCalls.push(serviceId);
    return bookingPageState.serviceResourcesByService[serviceId] ?? [];
  }),
  createBookingResource: vi.fn(async (input: Record<string, unknown>) => {
    bookingPageState.createResourceCalls.push(input);
    if (bookingPageState.resourceSaveError) throw bookingPageState.resourceSaveError;
    const created = {
      id: "resource-2",
      createdAt: "2026-03-08T10:30:00.000Z",
      updatedAt: "2026-03-08T10:30:00.000Z",
      ...input,
    };
    bookingPageState.resources = [...bookingPageState.resources, created as never];
    return created;
  }),
  updateBookingResource: vi.fn(async (id: string, input: Record<string, unknown>) => {
    bookingPageState.updateResourceCalls.push({ id, input });
    if (bookingPageState.resourceSaveError) throw bookingPageState.resourceSaveError;
    bookingPageState.resources = bookingPageState.resources.map((item) =>
      item.id === id ? ({ ...item, ...input } as never) : item
    );
    return { ok: true };
  }),
  deleteBookingResource: vi.fn(async (id: string) => {
    bookingPageState.deleteResourceCalls.push(id);
    if (bookingPageState.resourceDeleteError) throw bookingPageState.resourceDeleteError;
    bookingPageState.resources = bookingPageState.resources.filter((item) => item.id !== id);
    return { ok: true };
  }),
  createBookingService: vi.fn(async (input: Record<string, unknown>) => {
    bookingPageState.createServiceCalls.push(input);
    if (bookingPageState.serviceSaveError) throw bookingPageState.serviceSaveError;
    const created = {
      id: "service-2",
      createdAt: "2026-03-08T10:30:00.000Z",
      updatedAt: "2026-03-08T10:30:00.000Z",
      ...input,
    };
    bookingPageState.services = [...bookingPageState.services, created as never];
    return created;
  }),
  updateBookingService: vi.fn(async (id: string, input: Record<string, unknown>) => {
    bookingPageState.updateServiceCalls.push({ id, input });
    if (bookingPageState.serviceSaveError) throw bookingPageState.serviceSaveError;
    bookingPageState.services = bookingPageState.services.map((item) =>
      item.id === id ? ({ ...item, ...input } as never) : item
    );
    return { ok: true };
  }),
  deleteBookingService: vi.fn(async (id: string) => {
    bookingPageState.deleteServiceCalls.push(id);
    if (bookingPageState.serviceDeleteError) throw bookingPageState.serviceDeleteError;
    bookingPageState.services = bookingPageState.services.filter((item) => item.id !== id);
    return { ok: true };
  }),
  setBookingServiceResources: vi.fn(async (id: string, payload: Array<Record<string, unknown>>) => {
    bookingPageState.saveServiceResourceCalls.push({ id, payload });
    if (bookingPageState.serviceResourceSaveError) throw bookingPageState.serviceResourceSaveError;
    bookingPageState.serviceResourcesByService[id] = payload as never;
    return { ok: true };
  }),
  setBookingSchedules: vi.fn(async (id: string, payload: Array<Record<string, unknown>>) => {
    bookingPageState.saveScheduleCalls.push({ id, payload });
    if (bookingPageState.scheduleSaveError) throw bookingPageState.scheduleSaveError;
    bookingPageState.schedulesByResource[id] = payload as never;
    return { ok: true };
  }),
  createBookingBlackout: vi.fn(async (input: Record<string, unknown>) => {
    bookingPageState.createBlackoutCalls.push(input);
    if (bookingPageState.blackoutSaveError) throw bookingPageState.blackoutSaveError;
    const created = {
      id: "blackout-2",
      createdAt: "2026-03-08T10:30:00.000Z",
      updatedAt: "2026-03-08T10:30:00.000Z",
      ...input,
    };
    bookingPageState.blackouts = [...bookingPageState.blackouts, created as never];
    return created;
  }),
  deleteBookingBlackout: vi.fn(async (id: string) => {
    bookingPageState.deleteBlackoutCalls.push(id);
    if (bookingPageState.blackoutDeleteError) throw bookingPageState.blackoutDeleteError;
    bookingPageState.blackouts = bookingPageState.blackouts.filter((item) => item.id !== id);
    return { ok: true };
  }),
  createBookingReservation: vi.fn(async (input: Record<string, unknown>) => {
    bookingPageState.createReservationCalls.push(input);
    if (bookingPageState.reservationSaveError) throw bookingPageState.reservationSaveError;
    const created = {
      id: "reservation-2",
      status: "confirmed",
      createdAt: "2026-03-08T10:30:00.000Z",
      updatedAt: "2026-03-08T10:30:00.000Z",
      ...input,
    };
    bookingPageState.reservations = [...bookingPageState.reservations, created as never];
    return created;
  }),
  updateBookingReservationStatus: vi.fn(async (id: string, status: string) => {
    bookingPageState.updateReservationStatusCalls.push({ id, status });
    if (bookingPageState.reservationStatusError) throw bookingPageState.reservationStatusError;
    bookingPageState.reservations = bookingPageState.reservations.map((item) =>
      item.id === id ? ({ ...item, status } as never) : item
    );
    return { ok: true };
  }),
  previewBookingSlots: vi.fn(async (input: Record<string, unknown>) => {
    bookingPageState.previewSlotCalls.push(input);
    if (bookingPageState.slotPreviewError) throw bookingPageState.slotPreviewError;
    return bookingPageState.previewSlots;
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    activeHref,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    activeHref?: string;
  }) => (
    <div data-active-href={activeHref}>
      <div>{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    bookingPageState.subscribers.add(handler);
    return () => bookingPageState.subscribers.delete(handler);
  },
}));

vi.mock("../../../core/admin/ui/booking/components/ResourcesTab", () => ({
  BookingResourcesTab: ({
    resources,
    resourcesLoading,
    selectedResourceId,
    editingResourceId,
    onSelectResource,
    onResourceFormChange,
    onSubmitResource,
    onEditResource,
    onDeleteResource,
    onCancelEdit,
  }: {
    resources: Array<{ id: string; name: string }>;
    resourcesLoading: boolean;
    selectedResourceId: string;
    editingResourceId: string | null;
    onSelectResource: (id: string) => void;
    onResourceFormChange: (patch: Record<string, unknown>) => void;
    onSubmitResource: () => void;
    onEditResource: (item: { id: string; name: string }) => void;
    onDeleteResource: (id: string) => void;
    onCancelEdit: () => void;
  }) => (
    <div>
      <span>{`resources:${resources.length}`}</span>
      <span>{`resources-loading:${String(resourcesLoading)}`}</span>
      <span>{`selected-resource:${selectedResourceId}`}</span>
      <span>{`editing-resource:${editingResourceId ?? "none"}`}</span>
      <button type="button" onClick={() => onSelectResource(resources[0]?.id ?? "")}>
        select-resource
      </button>
      <button
        type="button"
        onClick={() =>
          onResourceFormChange({
            name: "Room B",
            slug: "room-b",
            type: "room",
            status: "active",
            timezone: "Europe/Warsaw",
            capacity: "6",
          })
        }
      >
        fill-resource
      </button>
      <button type="button" onClick={onSubmitResource}>
        submit-resource
      </button>
      <button
        type="button"
        onClick={() => onEditResource(resources[0]!)}
        disabled={resources.length === 0}
      >
        edit-resource
      </button>
      <button
        type="button"
        onClick={() =>
          onResourceFormChange({
            name: "Room A Updated",
            slug: "room-a",
            type: "room",
            status: "active",
            timezone: "Europe/Warsaw",
            capacity: "8",
          })
        }
      >
        fill-updated-resource
      </button>
      <button type="button" onClick={() => onDeleteResource(resources[0]?.id ?? "")}>
        delete-resource
      </button>
      <button type="button" onClick={onCancelEdit}>
        cancel-resource
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/booking/components/ServicesTab", () => ({
  BookingServicesTab: ({
    services,
    selectedServiceId,
    editingServiceId,
    serviceResourceIds,
    requiredServiceResourceIds,
    serviceResourceLoading,
    serviceResourceSaving,
    onSelectService,
    onServiceFormChange,
    onSubmitService,
    onEditService,
    onDeleteService,
    onCancelEdit,
    onToggleServiceResource,
    onToggleRequiredServiceResource,
    onSaveServiceResources,
  }: {
    services: Array<{ id: string; name: string }>;
    selectedServiceId: string;
    editingServiceId: string | null;
    serviceResourceIds: string[];
    requiredServiceResourceIds: string[];
    serviceResourceLoading: boolean;
    serviceResourceSaving: boolean;
    onSelectService: (id: string) => void;
    onServiceFormChange: (patch: Record<string, unknown>) => void;
    onSubmitService: () => void;
    onEditService: (item: { id: string; name: string }) => void;
    onDeleteService: (id: string) => void;
    onCancelEdit: () => void;
    onToggleServiceResource: (resourceId: string, enabled: boolean) => void;
    onToggleRequiredServiceResource: (resourceId: string, required: boolean) => void;
    onSaveServiceResources: () => void;
  }) => (
    <div>
      <span>{`services:${services.length}`}</span>
      <span>{`selected-service:${selectedServiceId}`}</span>
      <span>{`editing-service:${editingServiceId ?? "none"}`}</span>
      <span>{`service-resource-count:${serviceResourceIds.length}`}</span>
      <span>{`required-resource-count:${requiredServiceResourceIds.length}`}</span>
      <span>{`service-resource-loading:${String(serviceResourceLoading)}`}</span>
      <span>{`service-resource-saving:${String(serviceResourceSaving)}`}</span>
      <button type="button" onClick={() => onSelectService(services[0]?.id ?? "")}>
        select-service
      </button>
      <button
        type="button"
        onClick={() =>
          onServiceFormChange({
            name: "Workshop",
            slug: "workshop",
            status: "active",
            description: "Hands-on session",
            durationMinutes: "90",
            bufferBeforeMinutes: "15",
            bufferAfterMinutes: "15",
            priceCents: "25000",
            currency: "PLN",
            submissionAccess: "public",
          })
        }
      >
        fill-service
      </button>
      <button type="button" onClick={onSubmitService}>
        submit-service
      </button>
      <button
        type="button"
        onClick={() => onEditService(services[0]!)}
        disabled={services.length === 0}
      >
        edit-service
      </button>
      <button
        type="button"
        onClick={() =>
          onServiceFormChange({
            name: "Consultation Pro",
            slug: "consultation",
            status: "active",
            description: "Updated service",
            durationMinutes: "75",
            bufferBeforeMinutes: "5",
            bufferAfterMinutes: "10",
            priceCents: "18000",
            currency: "PLN",
            submissionAccess: "internal",
          })
        }
      >
        fill-updated-service
      </button>
      <button type="button" onClick={() => onDeleteService(services[0]?.id ?? "")}>
        delete-service
      </button>
      <button type="button" onClick={onCancelEdit}>
        cancel-service
      </button>
      <button type="button" onClick={() => onToggleServiceResource("resource-1", true)}>
        enable-service-resource
      </button>
      <button type="button" onClick={() => onToggleRequiredServiceResource("resource-1", true)}>
        require-service-resource
      </button>
      <button type="button" onClick={onSaveServiceResources}>
        save-service-resources
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/booking/components/AvailabilityTab", () => ({
  BookingAvailabilityTab: ({
    scheduleRows,
    hasUnsavedScheduleDraft,
    scheduleDraftGuidance,
    scheduleLoading,
    scheduleSaving,
    blackouts,
    blackoutsLoading,
    onScheduleDraftChange,
    onAddScheduleRow,
    onRemoveScheduleRow,
    onResetScheduleDraft,
    onSaveSchedules,
    onBlackoutFormChange,
    onCreateBlackout,
    onDeleteBlackout,
  }: {
    scheduleRows: unknown[];
    hasUnsavedScheduleDraft: boolean;
    scheduleDraftGuidance: string | null;
    scheduleLoading: boolean;
    scheduleSaving: boolean;
    blackouts: Array<{ id: string }>;
    blackoutsLoading: boolean;
    onScheduleDraftChange: (patch: Record<string, unknown>) => void;
    onAddScheduleRow: () => void;
    onRemoveScheduleRow: (index: number) => void;
    onResetScheduleDraft: () => void;
    onSaveSchedules: () => void;
    onBlackoutFormChange: (patch: Record<string, unknown>) => void;
    onCreateBlackout: () => void;
    onDeleteBlackout: (id: string) => void;
  }) => (
    <div>
      <span>{`schedules:${scheduleRows.length}`}</span>
      <span>{`schedule-draft-unsaved:${String(hasUnsavedScheduleDraft)}`}</span>
      <span>{`schedule-draft-guidance:${scheduleDraftGuidance ?? "none"}`}</span>
      <span>{`schedule-loading:${String(scheduleLoading)}`}</span>
      <span>{`schedule-saving:${String(scheduleSaving)}`}</span>
      <span>{`blackouts:${blackouts.length}`}</span>
      <span>{`blackouts-loading:${String(blackoutsLoading)}`}</span>
      <button
        type="button"
        onClick={() =>
          onScheduleDraftChange({
            dayOfWeek: "1",
            startTime: "09:00",
            endTime: "17:00",
            timezone: "Europe/Warsaw",
            isAvailable: true,
          })
        }
      >
        fill-schedule
      </button>
      <button
        type="button"
        onClick={() =>
          onScheduleDraftChange({
            dayOfWeek: "1",
            startTime: "17:00",
            endTime: "09:00",
            timezone: "Europe/Warsaw",
            isAvailable: true,
          })
        }
      >
        fill-invalid-schedule
      </button>
      <button type="button" onClick={onAddScheduleRow}>
        add-schedule
      </button>
      <button type="button" onClick={() => onRemoveScheduleRow(0)}>
        remove-schedule
      </button>
      <button type="button" onClick={onResetScheduleDraft}>
        reset-schedule-draft
      </button>
      <button type="button" onClick={onSaveSchedules}>
        save-schedules
      </button>
      <button
        type="button"
        onClick={() =>
          onBlackoutFormChange({
            resourceId: "resource-1",
            startsAt: "2026-03-10T09:00",
            endsAt: "2026-03-10T11:00",
            reason: "Maintenance",
          })
        }
      >
        fill-blackout
      </button>
      <button
        type="button"
        onClick={() =>
          onBlackoutFormChange({
            resourceId: "resource-1",
            startsAt: "2026-03-10T11:00",
            endsAt: "2026-03-10T09:00",
            reason: "Broken",
          })
        }
      >
        fill-invalid-blackout
      </button>
      <button type="button" onClick={onCreateBlackout}>
        create-blackout
      </button>
      <button type="button" onClick={() => onDeleteBlackout(blackouts[0]?.id ?? "")}>
        delete-blackout
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/booking/components/ReservationsTab", () => ({
  BookingReservationsTab: ({
    reservations,
    reservationsLoading,
    onReservationFormChange,
    onReservationStatusDraftChange,
    onCreateReservation,
    onUpdateReservationStatus,
  }: {
    reservations: Array<{ id: string }>;
    reservationsLoading: boolean;
    onReservationFormChange: (patch: Record<string, unknown>) => void;
    onReservationStatusDraftChange: (id: string, status: string) => void;
    onCreateReservation: () => void;
    onUpdateReservationStatus: (id: string) => void;
  }) => (
    <div>
      <span>{`reservations:${reservations.length}`}</span>
      <span>{`reservations-loading:${String(reservationsLoading)}`}</span>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            startsAt: "2026-03-10T10:00",
            endsAt: "2026-03-10T11:00",
            timezone: "Europe/Warsaw",
            customerName: "Grace Hopper",
            customerEmail: "grace@example.com",
            customerPhone: "+48111222333",
            notes: "Needs projector",
          })
        }
      >
        fill-reservation
      </button>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "",
            resourceId: "",
            startsAt: "",
            endsAt: "",
            timezone: "Europe/Warsaw",
            customerName: "",
            customerEmail: "",
            customerPhone: "",
            notes: "",
          })
        }
      >
        fill-invalid-reservation
      </button>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            startsAt: "2026-03-10T10:00",
            endsAt: "2026-03-10T11:00",
            timezone: "Europe/Warsaw",
            customerName: "",
            customerEmail: "grace@example.com",
            customerPhone: "+48111222333",
            notes: "",
          })
        }
      >
        fill-reservation-missing-name
      </button>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            startsAt: "2026-03-10T11:00",
            endsAt: "2026-03-10T10:00",
            timezone: "Europe/Warsaw",
            customerName: "Grace Hopper",
            customerEmail: "grace@example.com",
            customerPhone: "+48111222333",
            notes: "",
          })
        }
      >
        fill-reservation-invalid-range
      </button>
      <button type="button" onClick={onCreateReservation}>
        create-reservation
      </button>
      <button
        type="button"
        onClick={() => onReservationStatusDraftChange("reservation-1", "cancelled")}
      >
        draft-reservation-status
      </button>
      <button type="button" onClick={() => onUpdateReservationStatus("reservation-1")}>
        update-reservation-status
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/booking/components/SlotPreviewTab", () => ({
  BookingSlotPreviewTab: ({
    previewSlots,
    previewLoading,
    onSlotPreviewFormChange,
    onPreviewSlots,
  }: {
    previewSlots: unknown[];
    previewLoading: boolean;
    onSlotPreviewFormChange: (patch: Record<string, unknown>) => void;
    onPreviewSlots: () => void;
  }) => (
    <div>
      <span>{`preview-slots:${previewSlots.length}`}</span>
      <span>{`preview-loading:${String(previewLoading)}`}</span>
      <button
        type="button"
        onClick={() =>
          onSlotPreviewFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            date: "2026-03-10",
            timezone: "Europe/Warsaw",
            intervalMinutes: "15",
          })
        }
      >
        fill-slot-preview
      </button>
      <button
        type="button"
        onClick={() =>
          onSlotPreviewFormChange({
            serviceId: "",
            resourceId: "",
            date: "",
            timezone: "Europe/Warsaw",
            intervalMinutes: "15",
          })
        }
      >
        fill-invalid-slot-preview
      </button>
      <button type="button" onClick={onPreviewSlots}>
        preview-slots
      </button>
    </div>
  ),
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  bookingPageState.reset();
  window.history.replaceState({}, "", "/");
});

test("BookingPage drives booking flows across resources, services, availability, reservations, slot preview, refresh, and cache bus", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Booking");
    expect(view.container.textContent).toContain("resources:1");
    expect(view.container.textContent).toContain("services:1");
    expect(view.container.textContent).toContain("reservations:1");
    expect(view.container.textContent).toContain("blackouts:1");
    expect(bookingPageState.listResourceCalls).toContain(true);
    expect(bookingPageState.listServiceCalls).toContain(true);
    expect(bookingPageState.listReservationCalls).toContain(true);
    expect(bookingPageState.listBlackoutCalls).toContain(true);
    expect(bookingPageState.scheduleCalls).toContain("resource-1");
    expect(bookingPageState.serviceResourceCalls).toContain("service-1");

    // TASK-479-17-L01: restyled chrome + stat row fed by REAL state.
    expect(view.container.textContent).toContain("Bookings today"); // stat row label
    expect(view.container.textContent).toContain("Upcoming");
    expect(view.container.textContent).toContain("Resources"); // real-count stat (replaces Utilization)
    expect(view.container.textContent).not.toContain("Utilization"); // no fabricated %
    expect(view.container.textContent).toContain("Beta"); // PageHeader badge
    expect(view.container.textContent).toContain("New booking"); // action present
    expect(view.container.textContent).toContain("Room A"); // resources rail (real resource)

    // New-booking flips the CONTROLLED active tab resources -> reservations.
    const activeTab = () =>
      view.container.querySelector("[data-active-tab]")?.getAttribute("data-active-tab");
    expect(activeTab()).toBe("resources"); // real default landing tab
    clickByText(view.container, "New booking");
    await flush();
    expect(activeTab()).toBe("reservations"); // switch observed via controlled value

    clickByText(view.container, "Refresh");
    await flush();
    expect(view.container.textContent).toContain("Booking data refreshed");

    clickByText(view.container, "fill-resource");
    await flush();
    clickByText(view.container, "submit-resource");
    await flush();
    expect(bookingPageState.createResourceCalls[0]).toEqual({
      name: "Room B",
      slug: "room-b",
      type: "room",
      status: "active",
      timezone: "Europe/Warsaw",
      capacity: 6,
    });

    clickByText(view.container, "edit-resource");
    await flush();
    clickByText(view.container, "fill-updated-resource");
    await flush();
    clickByText(view.container, "submit-resource");
    await flush();
    expect(bookingPageState.updateResourceCalls[0]).toEqual({
      id: "resource-1",
      input: expect.objectContaining({
        name: "Room A Updated",
        capacity: 8,
      }),
    });

    clickByText(view.container, "delete-resource");
    await flush();
    expect(bookingPageState.deleteResourceCalls).toContain("resource-1");

    clickByText(view.container, "fill-service");
    await flush();
    clickByText(view.container, "submit-service");
    await flush();
    expect(bookingPageState.createServiceCalls[0]).toEqual(
      expect.objectContaining({
        name: "Workshop",
        durationMinutes: 90,
        settings: expect.objectContaining({
          submissionAccess: "public",
        }),
      })
    );

    clickByText(view.container, "edit-service");
    await flush();
    clickByText(view.container, "fill-updated-service");
    await flush();
    clickByText(view.container, "submit-service");
    await flush();
    expect(bookingPageState.updateServiceCalls[0]).toEqual({
      id: "service-1",
      input: expect.objectContaining({
        name: "Consultation Pro",
        durationMinutes: 75,
      }),
    });

    clickByText(view.container, "enable-service-resource");
    clickByText(view.container, "require-service-resource");
    clickByText(view.container, "save-service-resources");
    await flush();
    expect(bookingPageState.saveServiceResourceCalls[0]).toEqual({
      id: "service-2",
      payload: [{ resourceId: "resource-1", isRequired: true }],
    });

    clickByText(view.container, "delete-service");
    await flush();
    expect(bookingPageState.deleteServiceCalls).toContain("service-1");

    clickByText(view.container, "fill-schedule");
    clickByText(view.container, "add-schedule");
    await flush();
    clickByText(view.container, "save-schedules");
    await flush();
    expect(bookingPageState.saveScheduleCalls[0]).toEqual({
      id: "resource-2",
      payload: expect.arrayContaining([
        expect.objectContaining({
          dayOfWeek: 1,
          startMinute: 540,
          endMinute: 1020,
        }),
      ]),
    });

    clickByText(view.container, "fill-blackout");
    clickByText(view.container, "create-blackout");
    await flush();
    expect(bookingPageState.createBlackoutCalls[0]).toEqual(
      expect.objectContaining({
        resourceId: "resource-1",
        reason: "Maintenance",
      })
    );

    clickByText(view.container, "delete-blackout");
    await flush();
    expect(bookingPageState.deleteBlackoutCalls).toContain("blackout-1");

    clickByText(view.container, "fill-reservation");
    clickByText(view.container, "create-reservation");
    await flush();
    expect(bookingPageState.createReservationCalls[0]).toEqual(
      expect.objectContaining({
        serviceId: "service-1",
        resourceId: "resource-1",
        customerName: "Grace Hopper",
      })
    );

    clickByText(view.container, "draft-reservation-status");
    clickByText(view.container, "update-reservation-status");
    await flush();
    expect(bookingPageState.updateReservationStatusCalls[0]).toEqual({
      id: "reservation-1",
      status: "cancelled",
    });

    clickByText(view.container, "fill-slot-preview");
    clickByText(view.container, "preview-slots");
    await flush();
    expect(bookingPageState.previewSlotCalls[0]).toEqual({
      serviceId: "service-1",
      resourceId: "resource-1",
      date: "2026-03-10",
      timezone: "Europe/Warsaw",
      intervalMinutes: 15,
    });
    expect(view.container.textContent).toContain("Found 1 available slots.");

    await React.act(async () => {
      for (const subscriber of bookingPageState.subscribers) {
        subscriber({ key: "bookingResourcesList" });
        subscriber({ key: "bookingServicesList" });
        subscriber({ key: "bookingReservationsList" });
        subscriber({ key: "bookingBlackoutsList" });
      }
      await Promise.resolve();
    });

    expect(bookingPageState.listResourceCalls.length).toBeGreaterThan(1);
    expect(bookingPageState.listServiceCalls.length).toBeGreaterThan(1);
    expect(bookingPageState.listReservationCalls.length).toBeGreaterThan(1);
    expect(bookingPageState.listBlackoutCalls.length).toBeGreaterThan(1);
  } finally {
    view.cleanup();
  }
});

test("BookingPage renders the weekly calendar block + resources rail from real in-week reservation data", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  // Fixed "today" inside the fixture reservation's week (Mon 2026-03-02 .. Sun
  // 2026-03-08) so the current-week grid deterministically contains the real
  // reservation. Only Date is faked — timers/microtasks stay real so the async
  // flush machinery is unaffected.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-04T12:00:00.000Z"));
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    // Calendar + rail are BookingPage-owned JSX inside the (mocked) TabsContent,
    // so these resolve from real fixture state — not the stubbed tab components.
    expect(view.container.textContent).toContain("This week"); // calendar section header
    expect(view.container.textContent).toContain("Ada Lovelace"); // calendar block (real reservation)
    expect(view.container.textContent).toContain("Room A"); // resources rail (real resource)
    expect(view.container.textContent).toContain("13:00"); // startsAt in the reservation's own timezone
  } finally {
    view.cleanup();
    vi.useRealTimers();
  }
});

test("BookingPage reports validation errors for invalid schedule, blackout, reservation, and slot preview inputs", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    clickByText(view.container, "fill-invalid-schedule");
    clickByText(view.container, "add-schedule");
    await flush();
    expect(view.container.textContent).toContain("Schedule row is invalid");

    clickByText(view.container, "fill-invalid-blackout");
    clickByText(view.container, "create-blackout");
    await flush();
    expect(view.container.textContent).toContain("Blackout save failed");

    clickByText(view.container, "fill-invalid-reservation");
    clickByText(view.container, "create-reservation");
    await flush();
    expect(view.container.textContent).toContain("Reservation save failed");

    clickByText(view.container, "fill-invalid-slot-preview");
    clickByText(view.container, "preview-slots");
    await flush();
    expect(view.container.textContent).toContain("Slot preview failed");
  } finally {
    view.cleanup();
  }
});

test("BookingPage blocks schedule save when a draft row is still unsaved and allows reset before saving", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    clickByText(view.container, "fill-schedule");
    await flush();
    expect(view.container.textContent).toContain("schedule-draft-unsaved:true");

    clickByText(view.container, "save-schedules");
    await flush();
    expect(bookingPageState.saveScheduleCalls).toHaveLength(0);
    expect(view.container.textContent).toContain(
      "schedule-draft-guidance:Add the draft row or reset it before saving schedules."
    );

    clickByText(view.container, "reset-schedule-draft");
    clickByText(view.container, "remove-schedule");
    await flush();
    expect(view.container.textContent).toContain("schedule-draft-unsaved:false");

    clickByText(view.container, "save-schedules");
    await flush();
    expect(bookingPageState.saveScheduleCalls[0]).toEqual({
      id: "resource-1",
      payload: [],
    });
  } finally {
    view.cleanup();
  }
});

test("BookingPage handles cancel flows, reservation-status errors, resource save errors, and empty slot previews", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    clickByText(view.container, "edit-resource");
    await flush();
    expect(view.container.textContent).toContain("editing-resource:resource-1");

    clickByText(view.container, "cancel-resource");
    await flush();
    expect(view.container.textContent).toContain("editing-resource:none");

    clickByText(view.container, "edit-service");
    await flush();
    expect(view.container.textContent).toContain("editing-service:service-1");

    clickByText(view.container, "cancel-service");
    await flush();
    expect(view.container.textContent).toContain("editing-service:none");

    bookingPageState.resourceSaveError = new Error("Resource write failed");
    clickByText(view.container, "fill-resource");
    clickByText(view.container, "submit-resource");
    await flush();
    expect(view.container.textContent).toContain("Resource save failed");
    expect(view.container.textContent).toContain("Resource write failed");

    bookingPageState.resourceSaveError = null;
    bookingPageState.reservationStatusError = new Error("Reservation status failed");
    clickByText(view.container, "draft-reservation-status");
    clickByText(view.container, "update-reservation-status");
    await flush();
    expect(view.container.textContent).toContain("Status update failed");
    expect(view.container.textContent).toContain("Reservation status failed");

    bookingPageState.reservationStatusError = null;
    bookingPageState.previewSlots = [];
    clickByText(view.container, "fill-slot-preview");
    clickByText(view.container, "preview-slots");
    await flush();
    expect(view.container.textContent).toContain(
      "No available slots for selected date and resource."
    );
  } finally {
    view.cleanup();
  }
});

test("BookingPage reports delete-service/delete-blackout failures and reservation validation errors", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    bookingPageState.serviceDeleteError = new Error("Service delete failed");
    clickByText(view.container, "delete-service");
    await flush();
    expect(view.container.textContent).toContain("Delete failed");
    expect(view.container.textContent).toContain("Service delete failed");

    bookingPageState.serviceDeleteError = null;
    bookingPageState.blackoutDeleteError = {
      name: "ApiClientError",
      message: "Blackout delete denied",
    };
    clickByText(view.container, "delete-blackout");
    await flush();
    expect(view.container.textContent).toContain("Unable to delete blackout.");

    clickByText(view.container, "fill-reservation-missing-name");
    clickByText(view.container, "create-reservation");
    await flush();
    expect(view.container.textContent).toContain("Customer name is required.");

    clickByText(view.container, "fill-reservation-invalid-range");
    clickByText(view.container, "create-reservation");
    await flush();
    expect(view.container.textContent).toContain("End time must be later than start time.");
  } finally {
    view.cleanup();
  }
});
