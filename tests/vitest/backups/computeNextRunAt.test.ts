import { describe, expect, it } from "vitest";

import { computeNextRunAt } from "../../../core/services/backups/backupService";

const RUN_HOUR_UTC = 3;

const assertAnchored = (date: Date) => {
  expect(date.getUTCHours()).toBe(RUN_HOUR_UTC);
  expect(date.getUTCMinutes()).toBe(0);
  expect(date.getUTCSeconds()).toBe(0);
  expect(date.getUTCMilliseconds()).toBe(0);
};

describe("computeNextRunAt", () => {
  it("advances one day for daily and anchors to 03:00 UTC", () => {
    const from = new Date("2026-01-15T10:00:00.000Z");
    const next = computeNextRunAt("daily", from);
    expect(next.toISOString()).toBe("2026-01-16T03:00:00.000Z");
    assertAnchored(next);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
  });

  it("advances seven days for weekly", () => {
    const from = new Date("2026-01-15T10:00:00.000Z");
    const next = computeNextRunAt("weekly", from);
    expect(next.toISOString()).toBe("2026-01-22T03:00:00.000Z");
    assertAnchored(next);
  });

  it("advances one month for monthly on a stable day-of-month", () => {
    const from = new Date("2026-01-15T10:00:00.000Z");
    const next = computeNextRunAt("monthly", from);
    expect(next.toISOString()).toBe("2026-02-15T03:00:00.000Z");
    assertAnchored(next);
  });

  it("clamps monthly Jan 31 -> Feb 28 in a non-leap year (no overflow into March)", () => {
    const from = new Date("2026-01-31T10:00:00.000Z");
    const next = computeNextRunAt("monthly", from);
    expect(next.toISOString()).toBe("2026-02-28T03:00:00.000Z");
    assertAnchored(next);
  });

  it("clamps monthly Jan 31 -> Feb 29 in a leap year", () => {
    const from = new Date("2024-01-31T10:00:00.000Z");
    const next = computeNextRunAt("monthly", from);
    expect(next.toISOString()).toBe("2024-02-29T03:00:00.000Z");
    assertAnchored(next);
  });

  it("clamps monthly at the year rollover (Dec 31 -> Jan 31)", () => {
    const from = new Date("2026-12-31T10:00:00.000Z");
    const next = computeNextRunAt("monthly", from);
    expect(next.toISOString()).toBe("2027-01-31T03:00:00.000Z");
    assertAnchored(next);
  });

  it("always returns a time strictly in the future relative to `from` (same-day anchor)", () => {
    // A `from` already at the anchor hour must still push forward, never equal.
    const anchored = new Date("2026-01-15T03:00:00.000Z");
    const dailyNext = computeNextRunAt("daily", anchored);
    expect(dailyNext.getTime()).toBeGreaterThan(anchored.getTime());
    expect(dailyNext.toISOString()).toBe("2026-01-16T03:00:00.000Z");

    // A `from` just before the anchor hour on the target next day is still future.
    const early = new Date("2026-01-15T01:00:00.000Z");
    const dailyEarly = computeNextRunAt("daily", early);
    expect(dailyEarly.getTime()).toBeGreaterThan(early.getTime());
    expect(dailyEarly.toISOString()).toBe("2026-01-16T03:00:00.000Z");
  });

  it("does not mutate the `from` argument", () => {
    const from = new Date("2026-01-15T10:00:00.000Z");
    const snapshot = from.toISOString();
    computeNextRunAt("monthly", from);
    expect(from.toISOString()).toBe(snapshot);
  });
});
