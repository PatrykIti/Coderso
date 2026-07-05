# TASK-483-04-L02: Aggregation Queries Replacing computeScore
# FileName: TASK-483-04-L02-Aggregation-Queries-Replacing-computeScore.md

**Parent Subtask:** TASK-483-04
**Priority:** High
**Category:** Tools / Analytics / Services
**Estimated Effort:** Large
**Dependencies:** TASK-483-01-L03, TASK-483-04-L01
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

- **Goal:** Compute real traffic metrics from the ingested rows and produce a
  `TrafficOverview`, replacing the synthetic `computeScore(index, total)` ranking
  with a genuine top-pages-by-views query.
- **Owning module(s) to extend:**
  `core/services/analytics/trafficAggregationService.ts` (add
  `getTrafficOverview`, `getTopPages`, breakdown helpers).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/ADMIN_CACHE.md`.
- **Out-of-scope:** routes/CSV (L03), the content-inventory `getTopContent` (it
  stays; this is a parallel real ranking). Do not delete `computeScore` in this
  leaf — TASK-483-05 stops the UI from rendering it.

## Implementation Pseudocode

```ts
import { and, eq, gte, lt, sql, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { analyticsPageviews, analyticsSessions } from "../../db/schema";

// Date helpers: `formatDay`/`addDays` exist only as PRIVATE consts in
// core/services/analytics/analyticsService.ts (lines 18-20). Do NOT import
// them — duplicate the two one-liners locally in this service (they are
// trivial and the parent forbids entangling with analyticsService.ts):
const formatDay = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

// Machine-readable DB-failure boundary: every public entry point wraps its
// query batch so mapAnalyticsError (route, L03) receives "analytics_query_failed".
async function runQueries<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("analytics_")) throw error;
    throw new Error("analytics_query_failed");
  }
}

export async function getTrafficOverview(input: TrafficOverviewQuery): Promise<TrafficOverview> {
  const { rangeDays, now } = normalizeTrafficOverviewQuery(input);
  const start = addDays(now, -(rangeDays - 1));
  const prevStart = addDays(start, -rangeDays);

  return runQueries(async () => {
    const totals = await computeTotals(start, now);
    const previous = await computeTotals(prevStart, start);

    const trend = await dailyPageviews(start, now, rangeDays); // index: created_at
    const sources = await breakdown(analyticsSessions.sourceKind, SOURCE_LABELS, start, now);
    const devices = await breakdown(analyticsSessions.deviceClass, DEVICE_LABELS, start, now);
    const referrers = await topReferrers(start, now, 10);
    const topPages = await getTopPages({ rangeDays, limit: 10, now });

    return { rangeDays, generatedAt: now.toISOString(), totals, previous,
             trend, sources, devices, referrers, topPages };
  });
}

async function computeTotals(start: Date, end: Date): Promise<TrafficTotals> {
  const [pv] = await db.select({ c: sql<number>`count(*)` }).from(analyticsPageviews)
    .where(and(gte(analyticsPageviews.createdAt, start), lt(analyticsPageviews.createdAt, end)));
  const [vis] = await db.select({ c: sql<number>`count(distinct ${analyticsSessions.visitorHash})` })
    .from(analyticsSessions)
    .where(and(gte(analyticsSessions.startedAt, start), lt(analyticsSessions.startedAt, end)));
  const [sess] = await db.select({
      total: sql<number>`count(*)`,
      bounced: sql<number>`count(*) filter (where ${analyticsSessions.pageviewCount} = 1)`,
      views: sql<number>`coalesce(sum(${analyticsSessions.pageviewCount}),0)`,
    }).from(analyticsSessions)
    .where(and(gte(analyticsSessions.startedAt, start), lt(analyticsSessions.startedAt, end)));
  const sessions = Number(sess?.total ?? 0);
  return {
    pageviews: Number(pv?.c ?? 0),
    visitors: Number(vis?.c ?? 0),
    sessions,
    bounceRate: sessions ? Number(sess.bounced) / sessions : 0,
    avgPagesPerSession: sessions ? Number(sess.views) / sessions : 0,
  };
}

export async function getTopPages(input: TopPagesQuery): Promise<TopPageRow[]> {
  const { rangeDays, limit, now } = normalizeTopPagesQuery(input);
  const start = addDays(now, -(rangeDays - 1));
  // Two-sided window [start, now) — same as computeTotals. The upper bound is
  // mandatory: without it, queries anchored to a historical `now` (the test
  // isolation strategy below) would leak rows written later by other suites
  // sharing the remote test DB.
  const rows = await runQueries(() => db.select({
      path: analyticsPageviews.path,
      views: sql<number>`count(*)`,
      visitors: sql<number>`count(distinct ${analyticsSessions.visitorHash})`,
    }).from(analyticsPageviews)
    .innerJoin(analyticsSessions, eq(analyticsPageviews.sessionId, analyticsSessions.id))
    .where(and(gte(analyticsPageviews.createdAt, start), lt(analyticsPageviews.createdAt, now)))
    .groupBy(analyticsPageviews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(limit));
  return rows.map((r) => ({ path: r.path, views: Number(r.views), visitors: Number(r.visitors) }));
}

// --- breakdown helpers (all two-sided [start, end)) ---

// Label maps: TrafficBreakdownRow (L01) requires both `key` and `label`.
// Human labels are owned HERE (service), never derived in the UI.
const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct", internal: "Internal", referral: "Referral",
  search: "Search", social: "Social",
};
const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop", mobile: "Mobile", tablet: "Tablet",
  bot: "Bot", unknown: "Unknown",
};

async function breakdown(
  column: typeof analyticsSessions.sourceKind | typeof analyticsSessions.deviceClass,
  labels: Record<string, string>,
  start: Date,
  end: Date,
): Promise<TrafficBreakdownRow[]> {
  const rows = await db.select({ key: column, value: sql<number>`count(*)` })
    .from(analyticsSessions)
    .where(and(gte(analyticsSessions.startedAt, start), lt(analyticsSessions.startedAt, end)))
    .groupBy(column)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({ key: r.key, label: labels[r.key] ?? r.key, value: Number(r.value) }));
}

async function topReferrers(start: Date, end: Date, limit: number): Promise<TrafficBreakdownRow[]> {
  const rows = await db.select({ host: analyticsSessions.referrerHost, value: sql<number>`count(*)` })
    .from(analyticsSessions)
    .where(and(
      gte(analyticsSessions.startedAt, start),
      lt(analyticsSessions.startedAt, end),
      sql`${analyticsSessions.referrerHost} is not null`,
    ))
    .groupBy(analyticsSessions.referrerHost)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  // Referrer hosts have no curated label map: label = key (the host itself).
  return rows.map((r) => ({ key: r.host ?? "", label: r.host ?? "", value: Number(r.value) }));
}

async function dailyPageviews(start: Date, end: Date, rangeDays: number) {
  const rows = await db.select({
      day: sql<string>`date_trunc('day', ${analyticsPageviews.createdAt})`,
      value: sql<number>`count(*)`,
    }).from(analyticsPageviews)
    .where(and(gte(analyticsPageviews.createdAt, start), lt(analyticsPageviews.createdAt, end)))
    .groupBy(sql`date_trunc('day', ${analyticsPageviews.createdAt})`);
  // Densify: emit one point per day (zero-filled), same pattern as
  // analyticsService.ts `dailyCounts` + `buildTrend` (formatDay/addDays walk).
  const byDay = new Map(rows.map((r) => [formatDay(new Date(r.day)), Number(r.value)]));
  return Array.from({ length: rangeDays }, (_, i) => {
    const key = formatDay(addDays(start, i));
    return { date: key, value: byDay.get(key) ?? 0 };
  });
}
```

Data flow: routes (L03) call `getTrafficOverview` / `getTopPages`; the admin
client caches the results; the UI renders real KPIs/series. `topPages.views` is a
real `count(*)` ordering — the synthetic `computeScore` is no longer used for the
traffic surface.

Error handling: DB failures surface as `analytics_query_failed`
(machine-readable) via the `runQueries` try/catch above, mapped through
`mapAnalyticsError` at the route boundary (L03). Empty ranges return zeroed
totals and empty arrays (no nulls).

Regression-test shape (Bun, DB-backed,
`tests/integration/analytics/trafficAggregation.test.ts` — the family's shared
directory for Bun DB-backed analytics suites; TASK-483-01-L02 adds it to the
root `package.json` `test:bun` glob before this leaf lands, so do NOT re-edit
the script here — just place the suite in the covered directory):

**Shared-DB isolation strategy (mandatory).** The remote Postgres is shared
concurrently by TASK-482/484 streams and the owner, so tests MUST NOT depend on
global table emptiness and MUST NOT truncate/delete whole tables — ever. Each
test run anchors `now` to a per-run unique HISTORICAL window (e.g.
`new Date(Date.UTC(1980, 0, 1) + randomOffsetDays * 86_400_000)` with a random
offset per run), seeds only rows whose timestamps fall inside `[start, now)`,
and asserts exact totals only inside that owned window. Because every query is
two-sided `[start, end)` (including `getTopPages` above), rows written by other
suites at other times can never leak in. Cleanup deletes only the exact rows
the test created (tracked ids / owned `visitor_hash` prefix). Ordering-only
assertions (no exact totals) are used for anything not scoped to the owned
window.

```ts
// Per-run unique historical anchor: no other suite writes rows in this window.
const now = new Date(Date.UTC(1980, 0, 1) + Math.floor(Math.random() * 10_000) * 86_400_000);

test("bounce rate = single-pageview sessions / sessions", async () => {
  // seed() inserts sessions/pageviews with startedAt/createdAt INSIDE [start, now)
  const seeded = await seed(now, [{ views: 1 }, { views: 1 }, { views: 3 }]); // owned rows only
  const o = await getTrafficOverview({ rangeDays: 7, now });
  expect(o.totals.sessions).toBe(3);           // exact: window is uniquely owned
  expect(o.totals.bounceRate).toBeCloseTo(2 / 3);
  await cleanup(seeded);                       // delete ONLY the seeded row ids
});
test("top pages ranked by real view count", async () => {
  const top = await getTopPages({ rangeDays: 30, limit: 5, now }); // same owned window
  expect(top[0].views).toBeGreaterThanOrEqual(top[1].views);       // ordering-only
});
test("DB failure surfaces analytics_query_failed", async () => {
  // e.g. stub db.select to reject, expect getTrafficOverview to throw
  // Error("analytics_query_failed")
});
```

## Security Contract

- **Endpoint visibility:** none (service; routes in L03 enforce access).
- **Auth model / RBAC / CSRF:** N/A here.
- **Rate-limit bucket:** N/A (enforced at the admin route; authenticated reads
  bypass per existing admin policy).
- **Validation schema-owner module:** consumes normalized queries from L01.
- **Anti-abuse controls:** N/A (internal read).
- **Secret/PII handling:** queries aggregate only; `visitor_hash` is used solely
  inside `count(distinct ...)` and must never be selected into a response or log.

## Testing Requirements

- **Bun** DB-backed suite at
  `tests/integration/analytics/trafficAggregation.test.ts` (the directory is in
  the `test:bun` glob via TASK-483-01-L02's additive script update — confirm the
  suite appears in a `bun run test:bun` run) with uniquely scoped fixtures (per-run
  historical `now` window + own `visitor_hash` prefixes/paths); clean up only
  owned rows; never truncate shared tables; never assume tables are empty;
  `set -a && source .env && set +a`.
- Cover totals, previous-window deltas, bounce, sources/devices/referrers, and
  top-pages ordering, plus empty-range zeros and the
  `analytics_query_failed` rethrow.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
