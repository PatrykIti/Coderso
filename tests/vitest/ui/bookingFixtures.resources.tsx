// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

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
    resourcesListError: null as unknown,
    servicesListError: null as unknown,
    reservationsListError: null as unknown,
    blackoutsListError: null as unknown,
    schedulesListError: null as unknown,
    serviceResourcesListError: null as unknown,
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
      this.resourcesListError = null;
      this.servicesListError = null;
      this.reservationsListError = null;
      this.blackoutsListError = null;
      this.schedulesListError = null;
      this.serviceResourcesListError = null;
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
    if (bookingPageState.resourcesListError) throw bookingPageState.resourcesListError;
    return bookingPageState.resources;
  }),
  listBookingServicesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    bookingPageState.listServiceCalls.push(force);
    if (bookingPageState.servicesListError) throw bookingPageState.servicesListError;
    return bookingPageState.services;
  }),
  listBookingReservationsCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    bookingPageState.listReservationCalls.push(force);
    if (bookingPageState.reservationsListError) throw bookingPageState.reservationsListError;
    return bookingPageState.reservations;
  }),
  listBookingBlackoutsCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    bookingPageState.listBlackoutCalls.push(force);
    if (bookingPageState.blackoutsListError) throw bookingPageState.blackoutsListError;
    return bookingPageState.blackouts;
  }),
  listBookingSchedulesCached: vi.fn(async (resourceId: string) => {
    bookingPageState.scheduleCalls.push(resourceId);
    if (bookingPageState.schedulesListError) throw bookingPageState.schedulesListError;
    return bookingPageState.schedulesByResource[resourceId] ?? [];
  }),
  listBookingServiceResourcesCached: vi.fn(async (serviceId: string) => {
    bookingPageState.serviceResourceCalls.push(serviceId);
    if (bookingPageState.serviceResourcesListError)
      throw bookingPageState.serviceResourcesListError;
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
      <button type="button" onClick={() => onDeleteResource(selectedResourceId)}>
        delete-selected-resource
      </button>
      <button
        type="button"
        onClick={() =>
          onResourceFormChange({
            name: "",
            slug: "",
            type: "room",
            status: "active",
            timezone: "Europe/Warsaw",
            capacity: "4",
          })
        }
      >
        fill-empty-resource
      </button>
      <button
        type="button"
        onClick={() =>
          onResourceFormChange({
            name: "Room B",
            slug: "room-b",
            type: "room",
            status: "active",
            timezone: "",
            capacity: "6",
          })
        }
      >
        fill-resource-no-timezone
      </button>
      <button type="button" onClick={onCancelEdit}>
        cancel-resource
      </button>
    </div>
  ),
}));

export const mount = (node: React.ReactNode) => {
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

export const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

export const clickByText = (container: HTMLElement, text: string) => {
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

export const getBookingPageState = () => bookingPageState;
