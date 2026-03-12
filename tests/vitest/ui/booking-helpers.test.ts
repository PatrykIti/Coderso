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
  normalizeOptionalText,
  parseNumberInRange,
  parseOptionalNumber,
  parseTimeInput,
  readClientError,
  toIsoFromLocal,
  toTimeInput,
} from "../../../core/admin/ui/booking/bookingHelpers";

describe("bookingHelpers", () => {
  test("readClientError prefers api client errors, then generic errors, then fallback", () => {
    expect(
      readClientError(
        { name: "ApiClientError", message: "API denied" },
        "Fallback message"
      )
    ).toBe("API denied");
    expect(readClientError(new Error("Generic boom"), "Fallback message")).toBe(
      "Generic boom"
    );
    expect(readClientError("bad", "Fallback message")).toBe("Fallback message");
  });

  test("parseNumberInRange validates numeric input and bounds", () => {
    expect(
      parseNumberInRange("12.9", "Capacity", {
        min: 1,
        max: 20,
      })
    ).toBe(12);
    expect(() =>
      parseNumberInRange("abc", "Capacity", { min: 1, max: 20 })
    ).toThrow("Capacity must be a number.");
    expect(() =>
      parseNumberInRange("30", "Capacity", { min: 1, max: 20 })
    ).toThrow("Capacity must be between 1 and 20.");
  });

  test("parseOptionalNumber handles blanks, floors values, and validates bounds", () => {
    expect(parseOptionalNumber("   ", "Price")).toBeNull();
    expect(parseOptionalNumber("15.7", "Price", 0, 100)).toBe(15);
    expect(() => parseOptionalNumber("abc", "Price")).toThrow(
      "Price must be a number."
    );
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
    expect(() => parseTimeInput("9:05", "Start time")).toThrow(
      "Start time must use HH:MM format."
    );
    expect(() => parseTimeInput("24:00", "Start time")).toThrow(
      "Start time must use HH:MM format."
    );
  });

  test("toIsoFromLocal validates presence and date parsing", () => {
    expect(toIsoFromLocal("2026-03-10T09:00", "Start time")).toContain("2026-03-10");
    expect(() => toIsoFromLocal("   ", "Start time")).toThrow(
      "Start time is required."
    );
    expect(() => toIsoFromLocal("not-a-date", "Start time")).toThrow(
      "Start time is invalid."
    );
  });

  test("format helpers expose readable fallback-friendly strings", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
    expect(formatDateTime("2026-03-10T09:00:00.000Z", "Bad/Timezone")).toBe(
      "2026-03-10T09:00:00.000Z"
    );
    expect(formatReservationStatus("no_show")).toBe("No Show");
    expect(formatResourceType("room")).toBe("Room");
    expect(dayLabel(1)).toBe("Monday");
    expect(dayLabel(99)).toBe("Day 99");
  });
});
