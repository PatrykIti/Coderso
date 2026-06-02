// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import { getBookingRuntimeClientScript } from "../../../core/widgets/core/bookingRuntimeScript";

type FetchMockImplementation = (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;

const flush = async () => {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
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
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-booking-slots-status
        data-loading="Loading slots..."
      ></p>
      <p data-booking-selected-summary data-empty="No slot selected yet."></p>
      <div
        role="list"
        aria-label="Available time slots"
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
  const fetchMock = vi.fn<FetchMockImplementation>(
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
  expect(document.querySelector("[data-booking-slots]")?.getAttribute("aria-busy")).toBe("false");
  expect(document.querySelector("[data-booking-slots-status]")?.textContent).toBe(
    "No available slots for selected date."
  );

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
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-booking-slots-status
        data-loading="Loading slots..."
      ></p>
      <div data-booking-loading-skeleton hidden></div>
      <p data-booking-selected-summary data-empty="No slot selected yet."></p>
      <div
        role="list"
        aria-label="Available time slots"
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
  expect(document.querySelector("[data-booking-slots-status]")?.textContent).toBe(
    "1 available time slot."
  );

  const slotButton = document.querySelector("[data-booking-slots] button");
  expect(slotButton).toBeInstanceOf(HTMLButtonElement);
  expect(document.querySelector("[data-booking-slots] [role='listitem']")).toBeTruthy();
  expect(slotButton?.getAttribute("aria-pressed")).toBe("false");
  React.act(() => {
    slotButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(slotSelected).toHaveBeenCalled();
  expect(document.querySelector("[data-booking-slots] button")?.getAttribute("aria-pressed")).toBe(
    "true"
  );
  React.act(() => {
    document
      .querySelector("[data-booking-clear-selection]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(slotSelected.mock.calls.at(-1)?.[0]?.detail?.selection).toBeNull();
  expect(document.querySelector("[data-booking-slots] button")?.getAttribute("aria-pressed")).toBe(
    "false"
  );
});

test("booking runtime renders catalog and status copy as literal text", async () => {
  const payload = '<img src=x onerror="window.__bookingCalendarXss=1">';

  document.body.innerHTML = `
    <section
      data-nextless-booking-calendar="1"
      data-flow-id="booking-flow"
      data-slots-endpoint="/api/booking/slots"
      data-slot-interval="15"
      data-show-service-description="true"
    >
      <select data-booking-service>
        <option value="service-1" data-resource-ids="resource-1" selected></option>
      </select>
      <select data-booking-resource>
        <option value="resource-1" data-timezone="UTC" selected>Mechanic</option>
      </select>
      <input data-booking-date type="date" value="2030-01-15" />
      <button type="button" data-booking-refresh>Refresh</button>
      <div data-booking-service-context></div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-booking-slots-status
        data-loading="Loading slots..."
      ></p>
      <p data-booking-selected-summary data-empty="No slot selected yet."></p>
      <div
        role="list"
        aria-label="Available time slots"
        data-booking-slots
      ></div>
    </section>
  `;

  const serviceOption = document.querySelector("[data-booking-service] option");
  expect(serviceOption).toBeInstanceOf(HTMLOptionElement);
  if (!(serviceOption instanceof HTMLOptionElement)) {
    throw new Error("Expected service option.");
  }
  serviceOption.textContent = payload;
  serviceOption.dataset.description = payload;

  const slotsNode = document.querySelector("[data-booking-slots]");
  expect(slotsNode).toBeInstanceOf(HTMLElement);
  if (!(slotsNode instanceof HTMLElement)) {
    throw new Error("Expected slots node.");
  }
  slotsNode.dataset.empty = payload;
  slotsNode.dataset.missing = payload;
  slotsNode.dataset.error = payload;

  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ items: [] }), {
        headers: { "Content-Type": "application/json" },
      })
  ) as typeof globalThis.fetch;

  new Function(getBookingRuntimeClientScript())();
  await flush();

  expect(document.querySelectorAll("img")).toHaveLength(0);
  expect(document.querySelector("[data-booking-service-context]")?.textContent).toContain(payload);
  expect(slotsNode.textContent).toContain(payload);

  const serviceSelect = document.querySelector("[data-booking-service]");
  expect(serviceSelect).toBeInstanceOf(HTMLSelectElement);
  if (!(serviceSelect instanceof HTMLSelectElement)) {
    throw new Error("Expected service select.");
  }

  serviceSelect.value = "";
  serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();

  expect(document.querySelectorAll("img")).toHaveLength(0);
  expect(slotsNode.textContent).toContain(payload);

  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ error: "booking_slots_failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
  ) as typeof globalThis.fetch;

  serviceSelect.value = "service-1";
  serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();

  expect(document.querySelectorAll("img")).toHaveLength(0);
  expect(slotsNode.textContent).toContain(payload);
  expect((window as typeof window & { __bookingCalendarXss?: number }).__bookingCalendarXss).toBe(
    undefined
  );
});

test("booking runtime builds bounded week dates without duplicate buttons or availability requests", async () => {
  document.body.innerHTML = `
    <section
      data-nextless-booking-calendar="1"
      data-flow-id="booking-flow"
      data-slots-endpoint="/api/booking/slots"
      data-slot-interval="15"
      data-date-picker-mode="week"
      data-default-date="2030-01-18"
      data-min-date="2030-01-18"
      data-max-date="2030-01-20"
    >
      <select data-booking-service>
        <option value="service-1" data-resource-ids="resource-1" selected>Oil Change</option>
      </select>
      <select data-booking-resource>
        <option value="resource-1" data-timezone="UTC" selected>Mechanic</option>
      </select>
      <input data-booking-date type="date" value="2030-01-18" />
      <button type="button" data-booking-refresh>Refresh</button>
      <div data-booking-week-picker>
        <button type="button" data-booking-week-prev>Previous</button>
        <p data-booking-week-label></p>
        <button type="button" data-booking-week-next>Next</button>
        <div data-booking-week-days></div>
      </div>
      <div data-booking-service-context></div>
      <p data-booking-resource-timezone></p>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-booking-slots-status
        data-loading="Loading slots..."
      ></p>
      <p data-booking-selected-summary data-empty="No slot selected yet."></p>
      <div
        role="list"
        aria-label="Available time slots"
        data-booking-slots
        data-empty="No available slots for selected date."
        data-missing="Choose service, resource, and date first."
        data-error="Unable to load slots right now."
      ></div>
    </section>
  `;

  const fetchMock = vi.fn<FetchMockImplementation>(
    async () =>
      new Response(JSON.stringify({ items: [] }), {
        headers: { "Content-Type": "application/json" },
      })
  );
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  new Function(getBookingRuntimeClientScript())();
  await flush();

  const weekDates = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-booking-week-days] button")
  ).map((button) => button.dataset.bookingWeekDate);
  expect(weekDates).toEqual(["2030-01-18", "2030-01-19", "2030-01-20"]);
  expect(new Set(weekDates).size).toBe(weekDates.length);
  expect(document.querySelector("[data-booking-week-label]")?.textContent).toBe(
    "2030-01-18 - 2030-01-20"
  );

  const fetchCalls = fetchMock.mock.calls;
  const requestedDates = fetchCalls.map(([input]) =>
    new URL(String(input), window.location.origin).searchParams.get("date")
  );
  expect(requestedDates.slice(0, 4)).toEqual([
    "2030-01-18",
    "2030-01-19",
    "2030-01-20",
    "2030-01-18",
  ]);
  expect(new Set(requestedDates.slice(0, 3)).size).toBe(3);
});
