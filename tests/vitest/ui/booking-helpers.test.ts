import { describe, expect, test, vi } from "vitest";

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

import {
  dayLabel,
  formatDateTime,
  formatReservationStatus,
  formatResourceType,
  groupReservationsByWeek,
  isReservationToday,
  normalizeOptionalText,
  parseNumberInRange,
  parseOptionalNumber,
  parseTimeInput,
  readClientError,
  resourceTone,
  startOfWeek,
  toIsoFromLocal,
  toTimeInput,
  weekRangeLabel,
} from "../../../core/admin/ui/booking/bookingHelpers";
import type { BookingReservationRecord } from "../../../core/admin/services/bookingClient";

describe("bookingHelpers", () => {
  test("readClientError prefers api client errors, then generic errors, then fallback", () => {
    expect(
      readClientError({ name: "ApiClientError", message: "API denied" }, "Fallback message")
    ).toBe("API denied");
    expect(readClientError(new Error("Generic boom"), "Fallback message")).toBe("Generic boom");
    expect(readClientError("bad", "Fallback message")).toBe("Fallback message");
  });

  test("parseNumberInRange validates numeric input and bounds", () => {
    expect(
      parseNumberInRange("12.9", "Capacity", {
        min: 1,
        max: 20,
      })
    ).toBe(12);
    expect(() => parseNumberInRange("abc", "Capacity", { min: 1, max: 20 })).toThrow(
      "Capacity must be a number."
    );
    expect(() => parseNumberInRange("30", "Capacity", { min: 1, max: 20 })).toThrow(
      "Capacity must be between 1 and 20."
    );
  });

  test("parseOptionalNumber handles blanks, floors values, and validates bounds", () => {
    expect(parseOptionalNumber("   ", "Price")).toBeNull();
    expect(parseOptionalNumber("15.7", "Price", 0, 100)).toBe(15);
    expect(() => parseOptionalNumber("abc", "Price")).toThrow("Price must be a number.");
    expect(() => parseOptionalNumber("-1", "Price", 0, 100)).toThrow(
      "Price must be between 0 and 100."
    );
  });

  test("normalizeOptionalText trims text and returns null for blanks", () => {
    expect(normalizeOptionalText("  Booking  ")).toBe("Booking");
    expect(normalizeOptionalText("   ")).toBeNull();
  });

  test("toTimeInput and parseTimeInput convert valid time values", () => {
    expect(toTimeInput(545)).toBe("09:05");
    expect(parseTimeInput("09:05", "Start time")).toBe(545);
    expect(() => parseTimeInput("9:05", "Start time")).toThrow("Start time must use HH:MM format.");
    expect(() => parseTimeInput("24:00", "Start time")).toThrow(
      "Start time must use HH:MM format."
    );
  });

  test("toIsoFromLocal validates presence and date parsing", () => {
    expect(toIsoFromLocal("2026-03-10T09:00", "Start time")).toContain("2026-03-10");
    expect(() => toIsoFromLocal("   ", "Start time")).toThrow("Start time is required.");
    expect(() => toIsoFromLocal("not-a-date", "Start time")).toThrow("Start time is invalid.");
  });

  test("format helpers expose readable fallback-friendly strings", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
    expect(formatDateTime("2026-03-10T09:00:00.000Z", "Bad/Timezone")).toBe(
      "2026-03-10T09:00:00.000Z"
    );
    expect(formatReservationStatus("no_show")).toBe("No Show");
    expect(formatResourceType("bay")).toBe("Bay");
    expect(dayLabel(1)).toBe("Monday");
    expect(dayLabel(99)).toBe("Day 99");
  });
});

const makeReservation = (
  overrides: Partial<BookingReservationRecord>
): BookingReservationRecord => ({
  id: "r",
  serviceId: "service-1",
  resourceId: "resource-1",
  formSubmissionId: null,
  status: "confirmed",
  customerName: "Customer",
  customerEmail: null,
  customerPhone: null,
  notes: null,
  startsAt: "2026-06-22T09:00:00.000Z",
  endsAt: "2026-06-22T10:00:00.000Z",
  timezone: "UTC",
  metadata: {},
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

describe("groupReservationsByWeek + calendar derivations (TASK-479-17-L01)", () => {
  test("buckets real reservations by weekday, sorted by time, with stable resource tone", () => {
    const weekStart = new Date("2026-06-22T00:00:00.000Z"); // Monday (UTC)
    const order = ["resource-1", "resource-2"];
    const cols = groupReservationsByWeek(
      [
        makeReservation({
          id: "r2",
          resourceId: "resource-1",
          customerName: "Bob",
          startsAt: "2026-06-22T11:00:00.000Z",
          timezone: "UTC",
        }),
        makeReservation({
          id: "r1",
          resourceId: "resource-1",
          customerName: "Ann",
          startsAt: "2026-06-22T09:00:00.000Z",
          timezone: "UTC",
        }),
        makeReservation({
          id: "rx",
          resourceId: "resource-2",
          customerName: "Bad",
          startsAt: "not-a-date",
          timezone: "UTC",
        }),
      ],
      weekStart,
      order
    );

    expect(cols).toHaveLength(7);
    expect(cols[0].label).toBe("Mon");
    expect(cols[0].blocks.map((block) => block.name)).toEqual(["Ann", "Bob"]); // sorted by time
    expect(cols[0].blocks.map((block) => block.time)).toEqual(["09:00", "11:00"]);
    expect(cols[0].blocks.every((block) => block.tone === resourceTone("resource-1", order))).toBe(
      true
    ); // stable tone per resource
    // malformed startsAt skipped, never throws:
    expect(cols.flatMap((col) => col.blocks).some((block) => block.name === "Bad")).toBe(false);
    expect(cols.flatMap((col) => col.blocks)).toHaveLength(2);
  });

  test("buckets a reservation by its OWN timezone day, not the UTC day", () => {
    const weekStart = new Date("2026-06-22T00:00:00.000Z"); // Monday (UTC)
    const order = ["resource-1"];
    // 23:30Z Monday is already Tuesday 01:30 in Warsaw (UTC+2 summer time).
    const cols = groupReservationsByWeek(
      [
        makeReservation({
          id: "tz",
          customerName: "Eva",
          startsAt: "2026-06-22T23:30:00.000Z",
          timezone: "Europe/Warsaw",
        }),
      ],
      weekStart,
      order
    );

    expect(cols[0].blocks).toHaveLength(0); // not Monday in Warsaw
    expect(cols[1].label).toBe("Tue");
    expect(cols[1].blocks.map((block) => block.name)).toEqual(["Eva"]);
  });

  test("resourceTone is stable per resource, wraps the palette, and falls back for unknown ids", () => {
    const order = ["a", "b", "c", "d", "e"];
    expect(resourceTone("a", order)).toBe(resourceTone("a", order));
    expect(resourceTone("b", order)).not.toBe(resourceTone("a", order));
    expect(resourceTone("e", order)).toBe(resourceTone("a", order)); // wraps after 4 tones
    expect(resourceTone("missing", order)).toBe(resourceTone("a", order)); // fallback index 0
  });

  test("startOfWeek anchors to Monday (UTC) and weekRangeLabel spans Mon..Sun", () => {
    const weekStart = startOfWeek(new Date("2026-06-25T15:00:00.000Z")); // Thursday
    expect(weekStart.toISOString()).toBe("2026-06-22T00:00:00.000Z");
    expect(weekRangeLabel(weekStart)).toBe("Jun 22 – Jun 28, 2026");
  });

  test("isReservationToday compares the calendar day in the reservation's own timezone", () => {
    const now = new Date("2026-06-22T22:00:00.000Z");
    expect(isReservationToday({ startsAt: "2026-06-22T21:00:00.000Z", timezone: "UTC" }, now)).toBe(
      true
    );
    // In Warsaw (UTC+2) the same instant is already 2026-06-23 — not "today".
    expect(
      isReservationToday({ startsAt: "2026-06-22T21:00:00.000Z", timezone: "Europe/Warsaw" }, now)
    ).toBe(false);
    expect(isReservationToday({ startsAt: "not-a-date", timezone: "UTC" }, now)).toBe(false);
  });
});
