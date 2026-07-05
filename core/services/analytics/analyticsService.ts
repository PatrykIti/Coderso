import { and, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

import { db } from "../../db/client";
import { contentEntries, media, pages, users } from "../../db/schema";
import type {
  AnalyticsOverview,
  AnalyticsTotals,
  TopContentExport,
  TopContentItem,
  TopContentQuery,
  TopContentType,
  TrendPoint,
} from "./analyticsTypes";

const clampRangeDays = (value: number) => Math.min(Math.max(Math.floor(value), 1), 365);

const formatDay = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

async function countRows(table: AnyPgTable, where?: SQL) {
  const base = db.select({ count: sql<number>`count(*)` }).from(table);
  const query = where ? base.where(where) : base;
  const [row] = await query;
  return Number(row?.count ?? 0);
}

async function dailyCounts(table: AnyPgTable, column: AnyPgColumn, start: Date) {
  const dayExpr = sql<string>`date_trunc('day', ${column})`;
  const rows = await db
    .select({
      day: dayExpr.as("day"),
      count: sql<number>`count(*)`,
    })
    .from(table)
    .where(gte(column, start))
    .groupBy(dayExpr);

  const map = new Map<string, number>();
  for (const row of rows) {
    const key = formatDay(new Date(row.day));
    map.set(key, Number(row.count));
  }
  return map;
}

function buildTrend(start: Date, days: number, maps: Array<Map<string, number>>): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    const key = formatDay(date);
    const total = maps.reduce((sum, map) => sum + (map.get(key) ?? 0), 0);
    points.push({ date: key, value: total });
  }
  return points;
}

export async function getAnalyticsOverview(rangeDays: number): Promise<AnalyticsOverview> {
  const days = clampRangeDays(rangeDays);
  const now = new Date();
  const currentStart = addDays(now, -(days - 1));
  const previousStart = addDays(currentStart, -days);

  const totals: AnalyticsTotals = {
    pages: await countRows(pages),
    publishedPages: await countRows(pages, eq(pages.status, "published")),
    entries: await countRows(contentEntries),
    media: await countRows(media),
    users: await countRows(users),
  };

  const current: AnalyticsTotals = {
    pages: await countRows(pages, gte(pages.createdAt, currentStart)),
    publishedPages: await countRows(
      pages,
      and(eq(pages.status, "published"), gte(pages.createdAt, currentStart))
    ),
    entries: await countRows(contentEntries, gte(contentEntries.createdAt, currentStart)),
    media: await countRows(media, gte(media.createdAt, currentStart)),
    users: await countRows(users, gte(users.createdAt, currentStart)),
  };

  const previous: AnalyticsTotals = {
    pages: await countRows(
      pages,
      and(gte(pages.createdAt, previousStart), lt(pages.createdAt, currentStart))
    ),
    publishedPages: await countRows(
      pages,
      and(
        eq(pages.status, "published"),
        gte(pages.createdAt, previousStart),
        lt(pages.createdAt, currentStart)
      )
    ),
    entries: await countRows(
      contentEntries,
      and(gte(contentEntries.createdAt, previousStart), lt(contentEntries.createdAt, currentStart))
    ),
    media: await countRows(
      media,
      and(gte(media.createdAt, previousStart), lt(media.createdAt, currentStart))
    ),
    users: await countRows(
      users,
      and(gte(users.createdAt, previousStart), lt(users.createdAt, currentStart))
    ),
  };

  const pagesDaily = await dailyCounts(pages, pages.createdAt, currentStart);
  const entriesDaily = await dailyCounts(contentEntries, contentEntries.createdAt, currentStart);
  const mediaDaily = await dailyCounts(media, media.createdAt, currentStart);
  const trend = buildTrend(currentStart, days, [pagesDaily, entriesDaily, mediaDaily]);

  return {
    rangeDays: days,
    generatedAt: now.toISOString(),
    totals,
    current,
    previous,
    trend,
  };
}

const computeScore = (index: number, total: number) => {
  if (total <= 1) return 100;
  const step = 100 / total;
  return Math.max(10, Math.round(100 - index * step));
};

type NormalizedTopContentQuery = {
  limit: number;
  rangeDays: number;
  type?: TopContentType;
  now: Date;
};

export function normalizeTopContentQuery(input: TopContentQuery): NormalizedTopContentQuery {
  return {
    limit: Math.min(Math.max(Math.floor(input.limit), 1), 50),
    rangeDays: clampRangeDays(input.rangeDays),
    type: input.type,
    now: input.now ?? new Date(),
  };
}

export async function getTopContent(input: TopContentQuery) {
  const options = normalizeTopContentQuery(input);
  const start = addDays(options.now, -(options.rangeDays - 1));

  const pagesRows =
    options.type === "entry"
      ? []
      : await db
          .select({
            id: pages.id,
            title: pages.title,
            slug: pages.slug,
            updatedAt: pages.updatedAt,
          })
          .from(pages)
          .where(gte(pages.updatedAt, start))
          .orderBy(desc(pages.updatedAt))
          .limit(options.limit);

  const entryRows =
    options.type === "page"
      ? []
      : await db
          .select({
            id: contentEntries.id,
            title: contentEntries.title,
            slug: contentEntries.slug,
            updatedAt: contentEntries.updatedAt,
          })
          .from(contentEntries)
          .where(gte(contentEntries.updatedAt, start))
          .orderBy(desc(contentEntries.updatedAt))
          .limit(options.limit);

  const merged = [
    ...pagesRows.map((row) => ({ ...row, type: "page" as const })),
    ...entryRows.map((row) => ({ ...row, type: "entry" as const })),
  ];

  merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const top = merged.slice(0, options.limit);

  return top.map(
    (row, index): TopContentItem => ({
      id: row.id,
      type: row.type,
      title: row.title,
      slug: row.slug,
      updatedAt: row.updatedAt.toISOString(),
      score: computeScore(index, top.length),
    })
  );
}

const csvHeaders = ["type", "title", "slug", "updatedAt", "score"] as const;

const shouldGuardCsvCell = (value: string) => /^[=+\-@\t\r]/.test(value.trimStart());

// Exported (additive, no behavior change — TASK-483-04-L03) so
// trafficAggregationService.ts can DRY-reuse the same formula-injection guard for
// its top-pages CSV export instead of redefining it.
export const escapeCsvCell = (value: string) => {
  const guarded = shouldGuardCsvCell(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
};

export const serializeCsvRow = (values: readonly string[]) => values.map(escapeCsvCell).join(",");

export function serializeTopContentCsv(items: TopContentItem[]) {
  return [
    serializeCsvRow(csvHeaders),
    ...items.map((item) =>
      serializeCsvRow([item.type, item.title, item.slug ?? "", item.updatedAt, String(item.score)])
    ),
  ].join("\n");
}

export async function exportTopContentCsv(input: TopContentQuery): Promise<TopContentExport> {
  const options = normalizeTopContentQuery(input);
  const items = await getTopContent(options);
  return {
    fileName: `coderso-analytics-top-content-${options.rangeDays}d-${formatDay(options.now)}.csv`,
    contentType: "text/csv",
    content: serializeTopContentCsv(items),
    rangeDays: options.rangeDays,
    totalRows: items.length,
  };
}

export type { TopContentType };
