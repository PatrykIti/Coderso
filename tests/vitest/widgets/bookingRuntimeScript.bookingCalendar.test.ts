// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import { getBookingRuntimeClientScript } from "../../../core/widgets/core/bookingRuntimeScript";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const mountCalendar = () => {
  document.body.innerHTML = `
    <section
      data-nextless-booking-calendar="1"
      data-flow-id="booking-flow"
      data-slots-endpoint="https://example.test/api/booking/slots"
      data-slot-interval="15"
      data-default-date="2030-01-05"
      data-min-date="2030-01-10"
      data-max-date="2030-01-20"
    >
      <select data-booking-service>
        <option value="service-1" data-resource-ids="resource-1" selected>Oil Change</option>
      </select>
      <select data-booking-resource>
        <option value="resource-1" data-timezone="UTC" selected>Mechanic</option>
      </select>
      <input data-booking-date type="date" />
      <button type="button" data-booking-refresh>Refresh</button>
      <p data-booking-slots-status data-loading="Loading slots..."></p>
      <p data-booking-selected-summary data-empty="No slot selected yet."></p>
      <div
        data-booking-slots
        data-empty="No available slots for selected date."
        data-missing="Choose service, resource, and date first."
        data-error="Unable to load slots right now."
      ></div>
    </section>
  `;
};

afterEach(() => {
  document.body.innerHTML = "";
  delete (window as typeof window & { __nextlessBookingRuntimeClient?: boolean })
    .__nextlessBookingRuntimeClient;
  delete (window as typeof window & { __nextlessBookingRuntimeState?: unknown })
    .__nextlessBookingRuntimeState;
  vi.restoreAllMocks();
});

test("booking runtime clamps default and changed dates to the configured policy", async () => {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ items: [] }), {
        headers: { "Content-Type": "application/json" },
      })
  );
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  mountCalendar();
  const script = getBookingRuntimeClientScript();
  new Function(script)();
  await flush();

  const dateInput = document.querySelector("[data-booking-date]");
  expect(dateInput).toBeInstanceOf(HTMLInputElement);
  expect((dateInput as HTMLInputElement).min).toBe("2030-01-10");
  expect((dateInput as HTMLInputElement).max).toBe("2030-01-20");
  expect((dateInput as HTMLInputElement).value).toBe("2030-01-10");

  const firstCall = fetchMock.mock.calls[0] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(firstCall).toBeDefined();
  if (!firstCall) {
    throw new Error("Expected first fetch call.");
  }
  let requestUrl = new URL(String(firstCall[0]));
  expect(requestUrl.searchParams.get("date")).toBe("2030-01-10");

  fetchMock.mockClear();
  (dateInput as HTMLInputElement).value = "2030-01-25";
  dateInput?.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();

  expect((dateInput as HTMLInputElement).value).toBe("2030-01-20");
  const secondCall = fetchMock.mock.calls[0] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(secondCall).toBeDefined();
  if (!secondCall) {
    throw new Error("Expected second fetch call.");
  }
  requestUrl = new URL(String(secondCall[0]));
  expect(requestUrl.searchParams.get("date")).toBe("2030-01-20");
});

test("booking runtime uses slot interval mode, renders week picker, and clears selection", async () => {
  document.body.innerHTML = `
    <section
      data-nextless-booking-calendar="1"
      data-flow-id="booking-flow"
      data-slots-endpoint="https://example.test/api/booking/slots"
      data-slot-interval="15"
      data-date-picker-mode="week"
      data-slot-interval-mode="non-overlapping"
      data-summary-locale="pl-PL"
    >
      <select data-booking-service>
        <option
          value="service-1"
          data-resource-ids="resource-1"
          data-duration-minutes="30"
          data-price-cents="5000"
          data-currency="PLN"
          selected
        >
          Oil Change
        </option>
      </select>
      <select data-booking-resource>
        <option value="resource-1" data-timezone="Europe/Warsaw" selected>Mechanic</option>
      </select>
      <input data-booking-date type="date" value="2030-01-15" />
      <button type="button" data-booking-refresh>Refresh</button>
      <button type="button" data-booking-clear-selection>Clear selection</button>
      <div data-booking-week-picker>
        <button type="button" data-booking-week-prev>Previous</button>
        <p data-booking-week-label></p>
        <button type="button" data-booking-week-next>Next</button>
        <div data-booking-week-days></div>
      </div>
      <div data-booking-service-context></div>
      <p data-booking-resource-timezone></p>
      <p data-booking-slots-status data-loading="Loading slots..."></p>
      <div data-booking-loading-skeleton hidden></div>
      <p data-booking-selected-summary data-empty="No slot selected yet."></p>
      <div
        data-booking-slots
        data-empty="No available slots for selected date."
        data-missing="Choose service, resource, and date first."
        data-error="Unable to load slots right now."
      ></div>
    </section>
  `;

  const slotSelected = vi.fn();
  window.addEventListener("nextless:booking-slot-selected", slotSelected);

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.searchParams.get("date") === "2030-01-15") {
      return new Response(
        JSON.stringify({
          items: [
            {
              startsAt: "2030-01-15T08:00:00.000Z",
              endsAt: "2030-01-15T08:30:00.000Z",
              timezone: "Europe/Warsaw",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ items: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  new Function(getBookingRuntimeClientScript())();
  await flush();

  const intervalUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
  expect(intervalUrl.searchParams.get("intervalMinutes")).toBe("30");
  expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  expect(document.querySelector("[data-booking-resource-timezone]")?.textContent).toContain(
    "Europe/Warsaw"
  );

  const slotButton = document.querySelector("[data-booking-slots] button");
  expect(slotButton).toBeInstanceOf(HTMLButtonElement);
  React.act(() => {
    slotButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(slotSelected).toHaveBeenCalled();
  React.act(() => {
    document
      .querySelector("[data-booking-clear-selection]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(slotSelected.mock.calls.at(-1)?.[0]?.detail?.selection).toBeNull();
});
