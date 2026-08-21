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
