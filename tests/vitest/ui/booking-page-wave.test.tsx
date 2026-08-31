// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { clickByText, flush, getBookingPageState, mount } from "./bookingFixtures.resources";
import "./bookingFixtures.services";
import "./bookingFixtures.schedules";
import "./bookingFixtures.submissions";

const bookingPageState = getBookingPageState();

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  bookingPageState.reset();
  window.history.replaceState({}, "", "/");
});

test("BookingPage rejects a blank resource name and falls back to UTC for an empty timezone", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    clickByText(view.container, "fill-empty-resource");
    clickByText(view.container, "submit-resource");
    await flush();
    expect(view.container.textContent).toContain("Resource save failed");
    expect(view.container.textContent).toContain("Resource name is required.");

    clickByText(view.container, "fill-resource-no-timezone");
    clickByText(view.container, "submit-resource");
    await flush();
    expect(bookingPageState.createResourceCalls[0]).toEqual(
      expect.objectContaining({
        name: "Room B",
        timezone: "UTC",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("BookingPage rejects a blank service name and reports service save failures", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    clickByText(view.container, "fill-empty-service");
    clickByText(view.container, "submit-service");
    await flush();
    expect(view.container.textContent).toContain("Service save failed");
    expect(view.container.textContent).toContain("Service name is required.");

    bookingPageState.serviceSaveError = new Error("Service write failed");
    clickByText(view.container, "fill-service");
    clickByText(view.container, "submit-service");
    await flush();
    expect(view.container.textContent).toContain("Service save failed");
    expect(view.container.textContent).toContain("Service write failed");
  } finally {
    view.cleanup();
  }
});

test("BookingPage reports resource delete failures", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    bookingPageState.resourceDeleteError = new Error("Resource delete failed");
    clickByText(view.container, "delete-resource");
    await flush();
    expect(view.container.textContent).toContain("Delete failed");
    expect(view.container.textContent).toContain("Resource delete failed");
  } finally {
    view.cleanup();
  }
});

test("BookingPage toggles resource assignment both ways and saves the resulting mapping", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    // Initial mapping: resource-1 enabled and required.
    expect(view.container.textContent).toContain("service-resource-count:1");
    expect(view.container.textContent).toContain("required-resource-count:1");

    // Disable: removes the id from both enabled and required lists.
    clickByText(view.container, "disable-service-resource");
    await flush();
    expect(view.container.textContent).toContain("service-resource-count:0");
    expect(view.container.textContent).toContain("required-resource-count:0");

    // Re-enable, then drop only the required flag.
    clickByText(view.container, "enable-service-resource");
    clickByText(view.container, "require-service-resource");
    await flush();
    expect(view.container.textContent).toContain("service-resource-count:1");
    expect(view.container.textContent).toContain("required-resource-count:1");

    clickByText(view.container, "unrequire-service-resource");
    await flush();
    expect(view.container.textContent).toContain("service-resource-count:1");
    expect(view.container.textContent).toContain("required-resource-count:0");

    clickByText(view.container, "save-service-resources");
    await flush();
    expect(bookingPageState.saveServiceResourceCalls[0]).toEqual({
      id: "service-1",
      payload: [{ resourceId: "resource-1", isRequired: false }],
    });
  } finally {
    view.cleanup();
  }
});

test("BookingPage reports service-resources save failures", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    bookingPageState.serviceResourceSaveError = new Error("Assignment failed");
    clickByText(view.container, "enable-service-resource");
    clickByText(view.container, "require-service-resource");
    clickByText(view.container, "save-service-resources");
    await flush();
    expect(view.container.textContent).toContain("Save failed");
    expect(view.container.textContent).toContain("Assignment failed");
  } finally {
    view.cleanup();
  }
});

test("BookingPage empty catalog renders empty rails and short-circuits schedule and assignment saves", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  bookingPageState.resources = [];
  bookingPageState.services = [];
  bookingPageState.cachedResources = undefined;
  bookingPageState.cachedServices = undefined;
  bookingPageState.cachedReservations = undefined;
  bookingPageState.cachedBlackouts = undefined;
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("resources:0");
    expect(view.container.textContent).toContain("services:0");
    expect(view.container.textContent).toContain("No resources yet.");

    clickByText(view.container, "save-schedules");
    await flush();
    expect(bookingPageState.saveScheduleCalls).toHaveLength(0);

    clickByText(view.container, "save-service-resources");
    await flush();
    expect(bookingPageState.saveServiceResourceCalls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("BookingPage list load failures stay transient under Refresh and settle into the refresh success banner", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  bookingPageState.resourcesListError = new Error("Sync broke");
  bookingPageState.servicesListError = new Error("Sync broke");
  bookingPageState.reservationsListError = new Error("Sync broke");
  bookingPageState.blackoutsListError = new Error("Sync broke");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    clickByText(view.container, "Refresh");
    await flush();
    // handleRefreshAll always reports a full-cycle success banner; the four
    // per-list error feedbacks (if (!background) arms) execute transiently.
    expect(view.container.textContent).toContain("Booking data refreshed");
    expect(view.container.textContent).not.toContain("Unable to load");
  } finally {
    view.cleanup();
  }
});

test("BookingPage reports schedule load failures in a visible alert", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  bookingPageState.schedulesListError = new Error("Schedule sync failed");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Unable to load schedules");
    expect(view.container.textContent).toContain("Schedule sync failed");
  } finally {
    view.cleanup();
  }
});

test("BookingPage reports service-resource mapping load failures in a visible alert", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  bookingPageState.serviceResourcesListError = new Error("Service map exploded");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Unable to load service resources");
    expect(view.container.textContent).toContain("Service map exploded");
  } finally {
    view.cleanup();
  }
});

test("BookingPage clears an error banner when any later background refresh succeeds", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    const fireCacheKey = async (key: string) => {
      await React.act(async () => {
        for (const subscriber of bookingPageState.subscribers) {
          subscriber({ key });
        }
        await Promise.resolve();
      });
      await flush();
    };

    const seedStatusError = async () => {
      bookingPageState.reservationStatusError = new Error("Status broke");
      clickByText(view.container, "draft-reservation-status");
      clickByText(view.container, "update-reservation-status");
      await flush();
      expect(view.container.textContent).toContain("Status update failed");
      expect(view.container.textContent).toContain("Status broke");
      bookingPageState.reservationStatusError = null;
    };

    await seedStatusError();
    await fireCacheKey("bookingResourcesList");
    expect(view.container.textContent).not.toContain("Status update failed");

    await seedStatusError();
    await fireCacheKey("bookingServicesList");
    expect(view.container.textContent).not.toContain("Status update failed");

    await seedStatusError();
    await fireCacheKey("bookingReservationsList");
    expect(view.container.textContent).not.toContain("Status update failed");

    await seedStatusError();
    await fireCacheKey("bookingBlackoutsList");
    expect(view.container.textContent).not.toContain("Status update failed");
  } finally {
    view.cleanup();
  }
});

test("BookingPage cancels all background loads when unmounted before effects settle", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);
  view.cleanup();
  await flush();

  // The Promise.resolve().then(...) guards see active=false, so no network
  // call is issued after an immediate unmount.
  expect(bookingPageState.listResourceCalls).toHaveLength(0);
  expect(bookingPageState.listServiceCalls).toHaveLength(0);
  expect(bookingPageState.listReservationCalls).toHaveLength(0);
  expect(bookingPageState.listBlackoutCalls).toHaveLength(0);
  expect(bookingPageState.scheduleCalls).toHaveLength(0);
  expect(bookingPageState.serviceResourceCalls).toHaveLength(0);
});

test("BookingPage falls back to the first remaining resource/service after the selected one is deleted", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    clickByText(view.container, "fill-resource");
    clickByText(view.container, "submit-resource");
    await flush();
    expect(view.container.textContent).toContain("selected-resource:resource-2");

    clickByText(view.container, "delete-selected-resource");
    await flush();
    expect(bookingPageState.deleteResourceCalls).toContain("resource-2");
    expect(view.container.textContent).toContain("selected-resource:resource-1");

    clickByText(view.container, "fill-service");
    clickByText(view.container, "submit-service");
    await flush();
    expect(view.container.textContent).toContain("selected-service:service-2");

    clickByText(view.container, "delete-selected-service");
    await flush();
    expect(bookingPageState.deleteServiceCalls).toContain("service-2");
    expect(view.container.textContent).toContain("selected-service:service-1");
  } finally {
    view.cleanup();
  }
});

test("BookingPage slot preview enforces resource and date fields and defaults the timezone to UTC", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    clickByText(view.container, "fill-slot-preview-missing-resource");
    clickByText(view.container, "preview-slots");
    await flush();
    expect(view.container.textContent).toContain("Slot preview failed");
    expect(view.container.textContent).toContain("Resource is required.");

    clickByText(view.container, "fill-slot-preview-missing-date");
    clickByText(view.container, "preview-slots");
    await flush();
    expect(view.container.textContent).toContain("Slot preview failed");
    expect(view.container.textContent).toContain("Date is required.");

    clickByText(view.container, "fill-slot-preview-no-timezone");
    clickByText(view.container, "preview-slots");
    await flush();
    expect(bookingPageState.previewSlotCalls[0]).toEqual(
      expect.objectContaining({
        timezone: "UTC",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("BookingPage ignores status updates when no status draft exists for the reservation", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();
    clickByText(view.container, "update-reservation-status-missing");
    await flush();
    expect(bookingPageState.updateReservationStatusCalls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("BookingPage requires a resource for new reservations and defaults the timezone to UTC", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();
    clickByText(view.container, "fill-reservation-missing-resource");
    clickByText(view.container, "create-reservation");
    await flush();
    expect(view.container.textContent).toContain("Reservation save failed");
    expect(view.container.textContent).toContain("Resource is required.");

    clickByText(view.container, "fill-reservation-no-timezone");
    clickByText(view.container, "create-reservation");
    await flush();
    expect(bookingPageState.createReservationCalls[0]).toEqual(
      expect.objectContaining({
        serviceId: "service-1",
        resourceId: "resource-1",
        timezone: "UTC",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("BookingPage reports schedule save failures in a visible alert", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  bookingPageState.scheduleSaveError = new Error("Schedule write failed");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();
    clickByText(view.container, "fill-schedule");
    clickByText(view.container, "add-schedule");
    clickByText(view.container, "save-schedules");
    await flush();
    expect(view.container.textContent).toContain("Schedule save failed");
    expect(view.container.textContent).toContain("Schedule write failed");
  } finally {
    view.cleanup();
  }
});

test("BookingPage stores null resourceId for all-resources blackouts and defaults schedule timezone to UTC", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();

    clickByText(view.container, "fill-blackout-all");
    clickByText(view.container, "create-blackout");
    await flush();
    expect(bookingPageState.createBlackoutCalls[0]).toEqual(
      expect.objectContaining({
        resourceId: null,
        reason: "Maintenance",
      })
    );

    clickByText(view.container, "fill-schedule-no-timezone");
    clickByText(view.container, "add-schedule");
    await flush();
    clickByText(view.container, "save-schedules");
    await flush();
    expect(bookingPageState.saveScheduleCalls[0].payload[1]).toEqual(
      expect.objectContaining({
        dayOfWeek: 1,
        startMinute: 540,
        endMinute: 1020,
        timezone: "UTC",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("BookingPage edits a service whose optional fields are null without crashing the form", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  const sparseService = {
    id: "service-1",
    name: "Consultation",
    slug: "consultation",
    description: null,
    durationMinutes: 60,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 15,
    priceCents: null,
    currency: null,
    status: "active",
    settings: { submissionAccess: "public" },
    createdAt: "2026-03-08T10:00:00.000Z",
    updatedAt: "2026-03-08T10:00:00.000Z",
  };
  bookingPageState.services = [sparseService as never];
  bookingPageState.cachedServices = [sparseService as never];
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();
    clickByText(view.container, "edit-service");
    clickByText(view.container, "submit-service");
    await flush();
    expect(bookingPageState.updateServiceCalls[0]).toEqual({
      id: "service-1",
      input: expect.objectContaining({
        name: "Consultation",
        description: null,
        priceCents: null,
        currency: null,
      }),
    });
  } finally {
    view.cleanup();
  }
});

test("BookingPage weekly calendar renders every in-week reservation in its own timezone with the resource rail", async () => {
  window.history.replaceState({}, "", "/admin/advanced/booking");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-04T12:00:00.000Z"));
  const secondReservation = {
    id: "reservation-2",
    serviceId: "service-1",
    resourceId: "resource-1",
    status: "confirmed" as const,
    startsAt: "2026-03-04T09:00:00.000Z",
    endsAt: "2026-03-04T10:00:00.000Z",
    timezone: "Europe/Warsaw",
    customerName: "Grace Hopper",
    customerEmail: "grace@example.com",
    customerPhone: "+48111222333",
    notes: "",
    createdAt: "2026-03-04T08:00:00.000Z",
    updatedAt: "2026-03-04T08:00:00.000Z",
  };
  bookingPageState.reservations = [...bookingPageState.reservations, secondReservation as never];
  bookingPageState.cachedReservations = [
    ...(bookingPageState.cachedReservations ?? []),
    secondReservation as never,
  ];
  const { BookingPage } = await import("../../../core/admin/ui/booking/BookingPage");
  const view = mount(<BookingPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("This week");
    expect(view.container.textContent).toContain("Ada Lovelace");
    expect(view.container.textContent).toContain("Grace Hopper");
    expect(view.container.textContent).toContain("10:00");
    expect(view.container.textContent).toContain("13:00");
    expect(view.container.textContent).toContain("Room A");
  } finally {
    view.cleanup();
    vi.useRealTimers();
  }
});
