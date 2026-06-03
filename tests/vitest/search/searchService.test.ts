import { expect, test } from "vitest";

import {
  buildPrefixQuery,
  normalizeSearchDateRange,
  normalizeSearchQuery,
  resolveSearchDateRangeSince,
  resolveSearchLimit,
  searchAll,
} from "../../../core/services/search/searchService";

test("normalizeSearchQuery trims and collapses whitespace", () => {
  expect(normalizeSearchQuery("  hello   world ")).toBe("hello world");
});

test("resolveSearchLimit clamps values", () => {
  expect(resolveSearchLimit(undefined, 20)).toBe(20);
  expect(resolveSearchLimit(0, 20)).toBe(20);
  expect(resolveSearchLimit(5.7, 20)).toBe(5);
  expect(resolveSearchLimit(120, 20)).toBe(50);
});

test("normalizeSearchDateRange defaults unknown values", () => {
  expect(normalizeSearchDateRange("last-30-days")).toBe("last-30-days");
  expect(normalizeSearchDateRange("bogus")).toBe("last-7-days");
  expect(normalizeSearchDateRange(undefined)).toBe("last-7-days");
});

test("resolveSearchDateRangeSince resolves finite ranges", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  expect(resolveSearchDateRangeSince("last-7-days", now)?.toISOString()).toBe(
    "2026-05-25T12:00:00.000Z"
  );
  expect(resolveSearchDateRangeSince("last-30-days", now)?.toISOString()).toBe(
    "2026-05-02T12:00:00.000Z"
  );
  expect(resolveSearchDateRangeSince("last-12-months", now)?.toISOString()).toBe(
    "2025-06-01T12:00:00.000Z"
  );
  expect(resolveSearchDateRangeSince("all-time", now)).toBeNull();
});

test("buildPrefixQuery creates prefix tsquery", () => {
  expect(buildPrefixQuery("about")).toBe("about:*");
  expect(buildPrefixQuery("about us")).toBe("about:* & us:*");
  expect(buildPrefixQuery("  ab#out   us  ")).toBe("ab:* & out:* & us:*");
  expect(buildPrefixQuery("user@example.com")).toBe("user:* & example:* & com:*");
  expect(buildPrefixQuery("###")).toBeNull();
});

test("searchAll returns empty for short queries", async () => {
  const results = await searchAll("a");
  expect(results).toEqual([]);
});
