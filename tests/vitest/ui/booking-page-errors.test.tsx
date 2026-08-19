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
