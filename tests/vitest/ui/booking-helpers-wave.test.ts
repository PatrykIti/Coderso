import { describe, expect, test } from "vitest";

import {
  formatDateTime,
  formatTime,
  isoDateInTimeZone,
} from "../../../core/admin/ui/booking/bookingHelpers";

describe("bookingHelpers edge inputs (TASK-105-04 A4)", () => {
  test("formatDateTime defaults the timezone to UTC when none is provided", () => {
    const result = formatDateTime("2026-03-04T12:00:00.000Z");
    // en-US medium date + short time rendered in UTC -> 12:00 PM.
    expect(result).toContain("Mar 4, 2026");
    expect(result).toContain("12:00");
  });

  test("isoDateInTimeZone defaults the timezone to UTC when none is provided", () => {
    expect(isoDateInTimeZone("2026-03-04T12:00:00.000Z")).toBe("2026-03-04");
    expect(isoDateInTimeZone("2026-03-04T23:30:00.000Z")).toBe("2026-03-04");
  });

  test("formatTime returns an empty string for unparseable dates", () => {
    expect(formatTime("not-a-date")).toBe("");
    expect(formatTime("")).toBe("");
  });

  test("formatTime defaults the timezone to UTC when none is provided", () => {
    // en-GB 24-hour format in UTC -> "12:00".
    expect(formatTime("2026-03-04T12:00:00.000Z")).toBe("12:00");
    expect(formatTime("2026-03-04T23:30:00.000Z")).toBe("23:30");
  });

  test("isoDateInTimeZone returns an empty string for an unparseable timezone", () => {
    expect(isoDateInTimeZone("2026-03-04T12:00:00.000Z", "Not/AZone")).toBe("");
  });

  test("formatTime returns an empty string for an unparseable timezone", () => {
    expect(formatTime("2026-03-04T12:00:00.000Z", "Not/AZone")).toBe("");
  });
});
