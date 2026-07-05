// Traffic aggregation service (TASK-483-04).
//
// L01: query normalizers/clamps (pure, owned here — never duplicated in the
//   schema module).
// L02: real traffic metrics computed from the ingested rows, replacing the
//   synthetic computeScore ranking with a genuine top-pages-by-views query.
// L03: CSV export for top-pages-by-views, reusing the shared formula-injection
//   guard from analyticsService.ts.
//
// This module imports db/client (opens a postgres() pool at import, throws
// without DATABASE_URL), so even its pure functions are exercised in the Bun
// lane — matching the serializeTopContentCsv precedent.

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { analyticsPageviews, analyticsSessions } from "../../db/schema";
import { serializeCsvRow } from "./analyticsService";
import type { TopContentExport } from "./analyticsTypes";
import type {
  TopPageRow,
  TopPagesQuery,
  TrafficBreakdownRow,
  TrafficOverview,
  TrafficOverviewQuery,
  TrafficTotals,
} from "./trafficAggregationTypes";

// --- L01: normalizers / clamps (pure; single source of truth) ---------------

export const clampRangeDays = (v: number) => Math.min(Math.max(Math.floor(v), 1), 365);
export const clampLimit = (v: number) => Math.min(Math.max(Math.floor(v), 1), 100);

export function normalizeTrafficOverviewQuery(q: TrafficOverviewQuery) {
  return { rangeDays: clampRangeDays(q.rangeDays), now: q.now ?? new Date() };
}

export function normalizeTopPagesQuery(q: TopPagesQuery) {
  return {
    rangeDays: clampRangeDays(q.rangeDays),
    limit: clampLimit(q.limit),
    now: q.now ?? new Date(),
  };
}

// --- L02: aggregation queries -----------------------------------------------

// Date helpers exist only as PRIVATE consts in analyticsService.ts; duplicate the
// two trivial one-liners locally rather than entangling the two services.
const formatDay = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

// Machine-readable DB-failure boundary: every public entry point wraps its query
// batch so mapAnalyticsError (route, L03) receives "analytics_query_failed".
async function runQueries<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("analytics_")) throw error;
    throw new Error("analytics_query_failed");
  }
}

// Label maps: TrafficBreakdownRow requires both key and label. Human labels are
// owned HERE (service), never derived in the UI.
const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  internal: "Internal",
  referral: "Referral",
  search: "Search",
  social: "Social",
};
const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  bot: "Bot",
  unknown: "Unknown",
};

async function computeTotals(start: Date, end: Date): Promise<TrafficTotals> {
  const [pv] = await db
    .select({ c: sql<number>`count(*)` })
    .from(analyticsPageviews)
    .where(and(gte(analyticsPageviews.createdAt, start), lt(analyticsPageviews.createdAt, end)));
  const [vis] = await db
    .select({ c: sql<number>`count(distinct ${analyticsSessions.visitorHash})` })
    .from(analyticsSessions)
    .where(and(gte(analyticsSessions.startedAt, start), lt(analyticsSessions.startedAt, end)));
  const [sess] = await db
    .select({
      total: sql<number>`count(*)`,
      bounced: sql<number>`count(*) filter (where ${analyticsSessions.pageviewCount} = 1)`,
      views: sql<number>`coalesce(sum(${analyticsSessions.pageviewCount}),0)`,
    })
    .from(analyticsSessions)
    .where(and(gte(analyticsSessions.startedAt, start), lt(analyticsSessions.startedAt, end)));
  const sessions = Number(sess?.total ?? 0);
  return {
    pageviews: Number(pv?.c ?? 0),
    visitors: Number(vis?.c ?? 0),
    sessions,
    bounceRate: sessions ? Number(sess?.bounced ?? 0) / sessions : 0,
    avgPagesPerSession: sessions ? Number(sess?.views ?? 0) / sessions : 0,
  };
}

async function breakdown(
  column: typeof analyticsSessions.sourceKind | typeof analyticsSessions.deviceClass,
  labels: Record<string, string>,
  start: Date,
  end: Date
): Promise<TrafficBreakdownRow[]> {
  const rows = await db
    .select({ key: column, value: sql<number>`count(*)` })
    .from(analyticsSessions)
    .where(and(gte(analyticsSessions.startedAt, start), lt(analyticsSessions.startedAt, end)))
    .groupBy(column)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({ key: r.key, label: labels[r.key] ?? r.key, value: Number(r.value) }));
}

async function topReferrers(start: Date, end: Date, limit: number): Promise<TrafficBreakdownRow[]> {
  const rows = await db
    .select({ host: analyticsSessions.referrerHost, value: sql<number>`count(*)` })
    .from(analyticsSessions)
    .where(
      and(
        gte(analyticsSessions.startedAt, start),
        lt(analyticsSessions.startedAt, end),
        sql`${analyticsSessions.referrerHost} is not null`
      )
    )
    .groupBy(analyticsSessions.referrerHost)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  // Referrer hosts have no curated label map: label = key (the host itself).
  return rows.map((r) => ({ key: r.host ?? "", label: r.host ?? "", value: Number(r.value) }));
}

async function dailyPageviews(start: Date, end: Date, rangeDays: number) {
  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${analyticsPageviews.createdAt})`,
      value: sql<number>`count(*)`,
    })
    .from(analyticsPageviews)
    .where(and(gte(analyticsPageviews.createdAt, start), lt(analyticsPageviews.createdAt, end)))
    .groupBy(sql`date_trunc('day', ${analyticsPageviews.createdAt})`);
  // Densify: emit one zero-filled point per day, same pattern as
  // analyticsService.ts dailyCounts + buildTrend (formatDay/addDays walk).
  const byDay = new Map(rows.map((r) => [formatDay(new Date(r.day)), Number(r.value)]));
  return Array.from({ length: rangeDays }, (_, i) => {
    const key = formatDay(addDays(start, i));
    return { date: key, value: byDay.get(key) ?? 0 };
  });
}

export async function getTopPages(input: TopPagesQuery): Promise<TopPageRow[]> {
  const { rangeDays, limit, now } = normalizeTopPagesQuery(input);
  const start = addDays(now, -(rangeDays - 1));
  // Two-sided window [start, now) — same as computeTotals. The upper bound is
  // mandatory: without it, queries anchored to a historical `now` (the test
  // isolation strategy) would leak rows written later by other suites sharing
  // the remote test DB.
  const rows = await runQueries(() =>
    db
      .select({
        path: analyticsPageviews.path,
        views: sql<number>`count(*)`,
        visitors: sql<number>`count(distinct ${analyticsSessions.visitorHash})`,
      })
      .from(analyticsPageviews)
      .innerJoin(analyticsSessions, eq(analyticsPageviews.sessionId, analyticsSessions.id))
      .where(and(gte(analyticsPageviews.createdAt, start), lt(analyticsPageviews.createdAt, now)))
      .groupBy(analyticsPageviews.path)
      .orderBy(desc(sql`count(*)`))
      .limit(limit)
  );
  return rows.map((r) => ({ path: r.path, views: Number(r.views), visitors: Number(r.visitors) }));
}

export async function getTrafficOverview(input: TrafficOverviewQuery): Promise<TrafficOverview> {
  const { rangeDays, now } = normalizeTrafficOverviewQuery(input);
  const start = addDays(now, -(rangeDays - 1));
  const prevStart = addDays(start, -rangeDays);

  return runQueries(async () => {
    const totals = await computeTotals(start, now);
    const previous = await computeTotals(prevStart, start);

    const trend = await dailyPageviews(start, now, rangeDays);
    const sources = await breakdown(analyticsSessions.sourceKind, SOURCE_LABELS, start, now);
    const devices = await breakdown(analyticsSessions.deviceClass, DEVICE_LABELS, start, now);
    const referrers = await topReferrers(start, now, 10);
    const topPages = await getTopPages({ rangeDays, limit: 10, now });

    return {
      rangeDays,
      generatedAt: now.toISOString(),
      totals,
      previous,
      trend,
      sources,
      devices,
      referrers,
      topPages,
    };
  });
}

// --- L03: CSV export (reuses the shared formula-injection guard) -------------

export function serializeTopPagesCsv(rows: TopPageRow[]) {
  const headers = ["path", "views", "visitors"] as const;
  return [
    serializeCsvRow(headers),
    ...rows.map((r) => serializeCsvRow([r.path, String(r.views), String(r.visitors)])),
  ].join("\n");
}

export async function exportTopPagesCsv(input: TopPagesQuery): Promise<TopContentExport> {
  const opts = normalizeTopPagesQuery(input);
  const rows = await getTopPages(opts);
  return {
    fileName: `coderso-traffic-top-pages-${opts.rangeDays}d-${formatDay(opts.now)}.csv`,
    contentType: "text/csv",
    content: serializeTopPagesCsv(rows),
    rangeDays: opts.rangeDays,
    totalRows: rows.length,
  };
}
