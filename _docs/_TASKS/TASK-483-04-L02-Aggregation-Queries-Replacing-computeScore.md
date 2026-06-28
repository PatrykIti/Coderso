# TASK-483-04-L02: Aggregation Queries Replacing computeScore
# FileName: TASK-483-04-L02-Aggregation-Queries-Replacing-computeScore.md

**Parent Subtask:** TASK-483-04
**Priority:** High
**Category:** Tools / Analytics / Services
**Estimated Effort:** Large
**Dependencies:** TASK-483-01-L03, TASK-483-04-L01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

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
import { and, gte, lt, sql, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { analyticsPageviews, analyticsSessions } from "../../db/schema";

export async function getTrafficOverview(input: TrafficOverviewQuery): Promise<TrafficOverview> {
  const { rangeDays, now } = normalizeTrafficOverviewQuery(input);
  const start = addDays(now, -(rangeDays - 1));
  const prevStart = addDays(start, -rangeDays);

  const totals = await computeTotals(start, now);
  const previous = await computeTotals(prevStart, start);

  const trend = await dailyPageviews(start, rangeDays);     // index: created_at
  const sources = await breakdown(analyticsSessions.sourceKind, start, now);
  const devices = await breakdown(analyticsSessions.deviceClass, start, now);
  const referrers = await topReferrers(start, now, 10);
  const topPages = await getTopPages({ rangeDays, limit: 10, now });

  return { rangeDays, generatedAt: now.toISOString(), totals, previous,
           trend, sources, devices, referrers, topPages };
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
  const rows = await db.select({
      path: analyticsPageviews.path,
      views: sql<number>`count(*)`,
      visitors: sql<number>`count(distinct ${analyticsSessions.visitorHash})`,
    }).from(analyticsPageviews)
    .innerJoin(analyticsSessions, eq(analyticsPageviews.sessionId, analyticsSessions.id))
    .where(gte(analyticsPageviews.createdAt, start))
    .groupBy(analyticsPageviews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows.map((r) => ({ path: r.path, views: Number(r.views), visitors: Number(r.visitors) }));
}
```

Data flow: routes (L03) call `getTrafficOverview` / `getTopPages`; the admin
client caches the results; the UI renders real KPIs/series. `topPages.views` is a
real `count(*)` ordering — the synthetic `computeScore` is no longer used for the
traffic surface.

Error handling: DB failures surface as `analytics_query_failed`
(machine-readable) mapped through `mapAnalyticsError` at the route boundary.
Empty ranges return zeroed totals and empty arrays (no nulls).

Regression-test shape (Bun, DB-backed,
`tests/integration/analytics/trafficAggregation.test.ts`):

```ts
test("bounce rate = single-pageview sessions / sessions", async () => {
  await seed([{ views: 1 }, { views: 1 }, { views: 3 }]); // scoped fixtures
  const o = await getTrafficOverview({ rangeDays: 7, now });
  expect(o.totals.sessions).toBe(3);
  expect(o.totals.bounceRate).toBeCloseTo(2 / 3);
});
test("top pages ranked by real view count", async () => {
  const top = await getTopPages({ rangeDays: 30, limit: 5, now });
  expect(top[0].views).toBeGreaterThanOrEqual(top[1].views);
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

- **Bun** DB-backed suite with uniquely scoped fixtures (own `visitor_hash`
  prefixes/paths); clean up only owned rows; `set -a && source .env && set +a`.
- Cover totals, previous-window deltas, bounce, sources/devices/referrers, and
  top-pages ordering, plus empty-range zeros.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
