import { expect, test } from "bun:test";

// Bun lane: trafficAggregationService.ts imports db/client (opens a postgres()
// pool at import, throws without DATABASE_URL), so even these pure functions are
// exercised here rather than in Vitest — mirroring the serializeTopContentCsv
// precedent.
import {
  normalizeTopPagesQuery,
  normalizeTrafficOverviewQuery,
  serializeTopPagesCsv,
} from "../../../core/services/analytics/trafficAggregationService";

test("range clamps to [1,365]", () => {
  expect(normalizeTrafficOverviewQuery({ rangeDays: 9999 }).rangeDays).toBe(365);
  expect(normalizeTrafficOverviewQuery({ rangeDays: 0 }).rangeDays).toBe(1);
});

test("range floors fractional days", () => {
  expect(normalizeTrafficOverviewQuery({ rangeDays: 7.9 }).rangeDays).toBe(7);
});

test("overview normalizer defaults now to a Date", () => {
  const out = normalizeTrafficOverviewQuery({ rangeDays: 30 });
  expect(out.now).toBeInstanceOf(Date);
});

test("overview normalizer preserves an explicit now", () => {
  const now = new Date(Date.UTC(1980, 0, 1));
  expect(normalizeTrafficOverviewQuery({ rangeDays: 30, now }).now).toBe(now);
});

test("top-pages limit clamps to [1,100]", () => {
  expect(normalizeTopPagesQuery({ rangeDays: 30, limit: 500 }).limit).toBe(100);
  expect(normalizeTopPagesQuery({ rangeDays: 30, limit: 0 }).limit).toBe(1);
});

test("top-pages normalizer clamps range and floors limit", () => {
  const out = normalizeTopPagesQuery({ rangeDays: 9999, limit: 10.7 });
  expect(out.rangeDays).toBe(365);
  expect(out.limit).toBe(10);
});

test("serializeTopPagesCsv emits path,views,visitors header", () => {
  const csv = serializeTopPagesCsv([{ path: "/pricing", views: 12, visitors: 8 }]);
  expect(csv.split("\n")[0]).toBe("path,views,visitors");
  expect(csv).toContain("/pricing,12,8");
});

test("serializeTopPagesCsv guards formula-injection paths", () => {
  const csv = serializeTopPagesCsv([
    { path: '=HYPERLINK("https://evil.example")', views: 1, visitors: 1 },
  ]);
  // Leading '=' is prefixed with a single quote and the cell is quoted because it
  // contains a comma/quote.
  expect(csv).toContain('"\'=HYPERLINK(""https://evil.example"")"');
});
