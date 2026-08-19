// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test } from "vitest";
import { clickByText, flush, getBookingPageState, mount } from "./bookingPageFixtures";

const bookingPageState = getBookingPageState();

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
