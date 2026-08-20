/**
 * SEO aggregation service (TASK-493-04-L01).
 *
 * Turns the raw persisted rows from the subtask-01 tables (`seo_indexed_pages`,
 * `seo_search_metrics`, `seo_search_queries`, `seo_sitemap_submissions`) into
 * the real SEO Manager surface: an overview (indexed pages, impressions,
 * clicks, weighted position, average meta score, sitemap status), a
 * search-performance report (date series + top queries), and per-document
 * performance rows.
 *
 * Data flow: select rows from the 01 tables (+ a direct `seo_documents` read,
 * never `seoService.ts`) -> coerce numeric columns via `toNumber` -> fold into
 * `SeoOverview` / `SeoSearchPerformance` / `SeoListItemWithPerformance`. The
 * folding math lives in pure exported helpers (`aggregateOverview`,
 * `aggregateSearchPerformance`, `attachDocumentPerformance`) so it unit-tests
 * without a database. Empty tables yield zeroed totals (never throw); the UI
 * renders an explicit empty state.
 *
 * Cross-stream guard (TASK-493): this module reads `seo_documents` directly
 * (including `seo_documents.score` for the average meta score via the PRIVATE
 * `meanSeoScore` helper) and never calls `analyzeSeoDocument`,
 * `resolvePublicSeoMetadata`, or any `seoService.ts` export. TASK-551 owns
 * `seoService.ts`.
 *
 * The module is importable without a database (lazy default deps, mirroring
 * `gscSyncService`/`sitemapSubmissionService`): importing it never opens a
 * connection or pulls server adapters into a Bun-free test.
 */

import { and, desc, eq, gte, lte } from "drizzle-orm";

import type { db } from "../../db/client";
import {
  contentEntries,
  pages,
  seoDocuments,
  seoIndexedPages,
  seoSearchMetrics,
  seoSearchQueries,
  seoSitemapSubmissions,
} from "../../db/schema";
import { clampWindow, type SyncWindow } from "./gscSyncService";
import {
  normalizeIndexingState,
  seoSitemapStatuses,
  toNumber,
  type SeoIndexedPage,
  type SeoSearchMetricPoint,
  type SeoSearchQueryRow,
  type SeoSitemapStatus,
  type SeoSitemapSubmissionRow,
} from "./seoSearchPerformanceTypes";
import type {
  SeoDocument,
  SeoDocumentPerformance,
  SeoIssue,
  SeoListItem,
  SeoListItemWithPerformance,
  SeoOverview,
  SeoSearchPerformance,
  SeoStatus,
  SeoTargetType,
  SeoTopQuery,
} from "./seoTypes";

/** Default top-queries truncation when no `limit` is provided. */
export const DEFAULT_TOP_QUERIES = 10;

/** Hard ceiling for `getSearchPerformance`'s `limit` option. */
export const MAX_TOP_QUERIES = 100;

export type SeoPerformanceDeps = {
  db: typeof db;
};

type TargetRow = {
  id: string;
  title: string;
  slug: string | null;
  targetType: SeoTargetType;
};

const toDayString = (date: Date): string => date.toISOString().slice(0, 10);

const dayStart = (isoDay: string): Date => new Date(`${isoDay}T00:00:00.000Z`);

const dayEnd = (isoDay: string): Date => new Date(`${isoDay}T23:59:59.999Z`);

const normalizeSlug = (value: string | null): string | null => {
  if (!value) return null;
  return value.startsWith("/") ? value : `/${value}`;
};

/**
 * Normalize a URL or relative path into a stable path key for the URL/slug
 * join. Absolute URLs are reduced to their pathname; relative slugs gain a
 * leading slash; a single trailing slash is stripped so `/about` and
 * `/about/` match the same document.
 */
const pathKeyOf = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const pathname = new URL(trimmed).pathname.replace(/\/+$/, "");
      return pathname.length > 0 ? pathname : "/";
    } catch {
      // Fall through to the relative-path normalization for malformed URLs.
    }
  }
  const path = (trimmed.startsWith("/") ? trimmed : `/${trimmed}`).replace(/\/+$/, "");
  return path.length > 0 ? path : "/";
};

const clampTopQueriesLimit = (value: number | null | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TOP_QUERIES;
  return Math.min(MAX_TOP_QUERIES, Math.max(1, Math.floor(value)));
};

const isSeoSitemapStatus = (value: string): value is SeoSitemapStatus =>
  (seoSitemapStatuses as readonly string[]).includes(value);

const toSubmissionStatus = (value: string): SeoSitemapStatus =>
  isSeoSitemapStatus(value) ? value : "pending";

const sanitizeIndexedPage = (row: typeof seoIndexedPages.$inferSelect): SeoIndexedPage => ({
  url: row.url,
  targetType: row.targetType === "page" || row.targetType === "entry" ? row.targetType : null,
  targetId: row.targetId ?? null,
  indexingState: normalizeIndexingState(row.indexingState),
  coverageState: row.coverageState ?? null,
  verdict: row.verdict ?? null,
  lastCrawledAt: row.lastCrawledAt ?? null,
});

const sanitizeMetricPoint = (row: typeof seoSearchMetrics.$inferSelect): SeoSearchMetricPoint => ({
  url: row.url,
  date: row.date,
  clicks: toNumber(row.clicks),
  impressions: toNumber(row.impressions),
  ctr: toNumber(row.ctr),
  position: toNumber(row.position),
});

const sanitizeQueryRow = (row: typeof seoSearchQueries.$inferSelect): SeoSearchQueryRow => ({
  url: row.url,
  query: row.query,
  clicks: toNumber(row.clicks),
  impressions: toNumber(row.impressions),
  ctr: toNumber(row.ctr),
  position: toNumber(row.position),
});

const sanitizeSitemapSubmission = (
  row: typeof seoSitemapSubmissions.$inferSelect
): SeoSitemapSubmissionRow => ({
  sitemapUrl: row.sitemapUrl,
  source: row.source,
  status: toSubmissionStatus(row.status),
  urlCount: row.urlCount ?? null,
  warnings: row.warnings,
  errors: row.errors,
  lastSubmittedAt: row.lastSubmittedAt ?? null,
  lastErrorMessage: row.lastErrorMessage ?? null,
});

const buildDefaultDeps = async (): Promise<SeoPerformanceDeps> => {
  const { db } = await import("../../db/client");
  return { db };
};

/**
 * Average meta-heuristic score across audited `seo_documents` (0..100 scale,
 * `score` is null until the document is audited). Documents without a score
 * are excluded; an entirely unaudited table yields 0.
 */
const meanSeoScore = async (runtimeDb: typeof db): Promise<number> => {
  const rows = await runtimeDb.select({ score: seoDocuments.score }).from(seoDocuments);
  const scores = rows
    .map((row) => row.score)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

const readIndexedPages = async (runtimeDb: typeof db): Promise<SeoIndexedPage[]> => {
  const rows = await runtimeDb.select().from(seoIndexedPages);
  return rows.map(sanitizeIndexedPage);
};

const readSearchMetrics = async (runtimeDb: typeof db): Promise<SeoSearchMetricPoint[]> => {
  const rows = await runtimeDb.select().from(seoSearchMetrics);
  return rows.map(sanitizeMetricPoint);
};

const readLatestSitemapSubmission = async (
  runtimeDb: typeof db
): Promise<SeoSitemapSubmissionRow | null> => {
  const [row] = await runtimeDb
    .select()
    .from(seoSitemapSubmissions)
    .orderBy(desc(seoSitemapSubmissions.updatedAt), desc(seoSitemapSubmissions.createdAt))
    .limit(1);
  return row ? sanitizeSitemapSubmission(row) : null;
};

const readMetricsForRange = async (
  runtimeDb: typeof db,
  window: SyncWindow
): Promise<SeoSearchMetricPoint[]> => {
  const rows = await runtimeDb
    .select()
    .from(seoSearchMetrics)
    .where(
      and(
        gte(seoSearchMetrics.date, dayStart(window.startDate)),
        lte(seoSearchMetrics.date, dayEnd(window.endDate))
      )
    );
  return rows.map(sanitizeMetricPoint);
};

const readQueriesForRange = async (
  runtimeDb: typeof db,
  window: SyncWindow
): Promise<SeoSearchQueryRow[]> => {
  const rows = await runtimeDb
    .select()
    .from(seoSearchQueries)
    .where(
      and(
        gte(seoSearchQueries.date, dayStart(window.startDate)),
        lte(seoSearchQueries.date, dayEnd(window.endDate))
      )
    );
  return rows.map(sanitizeQueryRow);
};

/**
 * Resolve a `targetId` into the URL/path keys that identify its pages: the
 * `seo_indexed_pages.url` rows that reference the target directly, plus the
 * matching `seo_documents` slug and canonicalUrl. Metric/query rows are then
 * matched by path key, so absolute GSC URLs and relative slugs agree.
 */
const resolveTargetUrlKeys = async (runtimeDb: typeof db, targetId: string): Promise<string[]> => {
  const [indexed, docs] = await Promise.all([
    runtimeDb
      .select({ url: seoIndexedPages.url })
      .from(seoIndexedPages)
      .where(eq(seoIndexedPages.targetId, targetId)),
    runtimeDb
      .select({ slug: seoDocuments.slug, canonicalUrl: seoDocuments.canonicalUrl })
      .from(seoDocuments)
      .where(eq(seoDocuments.targetId, targetId)),
  ]);
  const keys = new Set<string>();
  for (const row of indexed) keys.add(pathKeyOf(row.url));
  for (const doc of docs) {
    if (doc.slug) keys.add(pathKeyOf(doc.slug));
    if (doc.canonicalUrl) keys.add(pathKeyOf(doc.canonicalUrl));
  }
  return [...keys];
};

const weightedPositionOf = (rows: Array<{ position: number; impressions: number }>): number => {
  let weight = 0;
  let weightedSum = 0;
  for (const row of rows) {
    const impressions = Math.max(0, row.impressions);
    weight += impressions;
    weightedSum += Math.max(0, row.position) * impressions;
  }
  return weight > 0 ? weightedSum / weight : 0;
};

/**
 * Fold already-fetched rows into a `SeoOverview`. Pure and unit-testable: no
 * DB access. Empty tables yield zeroed totals (never throw).
 */
export function aggregateOverview(rows: {
  indexed: SeoIndexedPage[];
  metrics: SeoSearchMetricPoint[];
  sitemap?: SeoSitemapSubmissionRow | null;
  avgScore: number;
}): SeoOverview {
  let indexedPages = 0;
  let notIndexedPages = 0;
  for (const page of rows.indexed) {
    const state = normalizeIndexingState(page.indexingState);
    if (state === "INDEXED") indexedPages += 1;
    else if (state === "NOT_INDEXED") notIndexedPages += 1;
  }

  const totalClicks = rows.metrics.reduce((sum, metric) => sum + toNumber(metric.clicks), 0);
  const totalImpressions = rows.metrics.reduce(
    (sum, metric) => sum + toNumber(metric.impressions),
    0
  );

  const sitemap = rows.sitemap
    ? {
        status: rows.sitemap.status ?? null,
        urlCount: rows.sitemap.urlCount ?? null,
        lastSubmittedAt: rows.sitemap.lastSubmittedAt ?? null,
      }
    : { status: null, urlCount: null, lastSubmittedAt: null };

  return {
    indexedPages,
    totalPages: rows.indexed.length,
    notIndexedPages,
    totalImpressions,
    totalClicks,
    averageCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    averagePosition: weightedPositionOf(rows.metrics),
    averageScore: rows.avgScore,
    sitemap,
  };
}

/**
 * Fold already-fetched metric/query rows into a `SeoSearchPerformance`. The
 * date series is ordered ascending by UTC day; queries are grouped by query
 * text, ranked by clicks (ties: impressions, then query), and truncated to
 * `limit`. Pure and unit-testable: no DB access.
 */
export function aggregateSearchPerformance(rows: {
  metrics: SeoSearchMetricPoint[];
  queries: SeoSearchQueryRow[];
  range: { startDate: string; endDate: string };
  limit?: number;
}): SeoSearchPerformance {
  const limit = clampTopQueriesLimit(rows.limit);

  const totalClicks = rows.metrics.reduce((sum, metric) => sum + toNumber(metric.clicks), 0);
  const totalImpressions = rows.metrics.reduce(
    (sum, metric) => sum + toNumber(metric.impressions),
    0
  );

  const byDay = new Map<string, { clicks: number; impressions: number }>();
  for (const metric of rows.metrics) {
    const key = toDayString(metric.date);
    const bucket = byDay.get(key) ?? { clicks: 0, impressions: 0 };
    bucket.clicks += toNumber(metric.clicks);
    bucket.impressions += toNumber(metric.impressions);
    byDay.set(key, bucket);
  }
  const series = [...byDay.entries()]
    .map(([date, values]) => ({ date, clicks: values.clicks, impressions: values.impressions }))
    .sort((left, right) => left.date.localeCompare(right.date));

  const byQuery = new Map<
    string,
    { clicks: number; impressions: number; position: number; positionWeight: number }
  >();
  for (const query of rows.queries) {
    const key = query.query.trim();
    if (key.length === 0) continue;
    const bucket = byQuery.get(key) ?? {
      clicks: 0,
      impressions: 0,
      position: 0,
      positionWeight: 0,
    };
    const impressions = toNumber(query.impressions);
    bucket.clicks += toNumber(query.clicks);
    bucket.impressions += impressions;
    bucket.position += Math.max(0, toNumber(query.position)) * Math.max(0, impressions);
    bucket.positionWeight += Math.max(0, impressions);
    byQuery.set(key, bucket);
  }
  const topQueries: SeoTopQuery[] = [...byQuery.entries()]
    .map(([query, values]) => ({
      query,
      clicks: values.clicks,
      impressions: values.impressions,
      ctr: values.impressions > 0 ? values.clicks / values.impressions : 0,
      position: values.positionWeight > 0 ? values.position / values.positionWeight : 0,
    }))
    .sort(
      (left, right) =>
        right.clicks - left.clicks ||
        right.impressions - left.impressions ||
        left.query.localeCompare(right.query)
    )
    .slice(0, limit);

  return {
    range: rows.range,
    totals: {
      totalImpressions,
      totalClicks,
      averageCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      averagePosition: weightedPositionOf(rows.metrics),
    },
    series,
    topQueries,
  };
}

const summarizePerformance = (
  page: SeoIndexedPage,
  metricRows: SeoSearchMetricPoint[]
): SeoDocumentPerformance => {
  const clicks = metricRows.reduce((sum, metric) => sum + toNumber(metric.clicks), 0);
  const impressions = metricRows.reduce((sum, metric) => sum + toNumber(metric.impressions), 0);
  return {
    indexingState: normalizeIndexingState(page.indexingState),
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: weightedPositionOf(metricRows),
  };
};

const firstPageForPath = (
  paths: ReadonlySet<string>,
  pagesByPath: Map<string, SeoIndexedPage[]>
): SeoIndexedPage | undefined => {
  for (const path of paths) {
    const matches = pagesByPath.get(path);
    if (matches && matches.length > 0) return matches[0];
  }
  return undefined;
};

/**
 * Join documents to their index page and metric rows by target key (exact
 * `targetType:targetId`) or URL/slug path key. Documents without any index
 * row carry an explicit `performance: null` — never a missing key. Pure and
 * unit-testable: no DB access.
 */
export function attachDocumentPerformance(input: {
  documents: SeoListItem[];
  indexed: SeoIndexedPage[];
  metrics: SeoSearchMetricPoint[];
}): SeoListItemWithPerformance[] {
  const byTarget = new Map<string, SeoIndexedPage>();
  const pagesByPath = new Map<string, SeoIndexedPage[]>();
  for (const page of input.indexed) {
    if (page.targetType && page.targetId) {
      byTarget.set(`${page.targetType}:${page.targetId}`, page);
    }
    const path = pathKeyOf(page.url);
    const matches = pagesByPath.get(path) ?? [];
    matches.push(page);
    pagesByPath.set(path, matches);
  }

  const metricsByPath = new Map<string, SeoSearchMetricPoint[]>();
  for (const metric of input.metrics) {
    const path = pathKeyOf(metric.url);
    const matches = metricsByPath.get(path) ?? [];
    matches.push(metric);
    metricsByPath.set(path, matches);
  }

  return input.documents.map((document) => {
    const paths = new Set<string>();
    if (document.slug) paths.add(pathKeyOf(document.slug));
    if (document.canonicalUrl) paths.add(pathKeyOf(document.canonicalUrl));

    const page =
      (document.targetType && document.targetId
        ? byTarget.get(`${document.targetType}:${document.targetId}`)
        : undefined) ?? firstPageForPath(paths, pagesByPath);
    if (!page) {
      return { ...document, performance: null };
    }

    paths.add(pathKeyOf(page.url));
    const metricRows = [...paths].flatMap((path) => metricsByPath.get(path) ?? []);
    return { ...document, performance: summarizePerformance(page, metricRows) };
  });
}

/**
 * Full SEO overview: indexed-page counts, aggregate search totals, average
 * meta score, and the latest sitemap submission status. Empty tables yield
 * zeroed totals (never throw).
 */
export async function getSeoOverview(deps?: SeoPerformanceDeps): Promise<SeoOverview> {
  const runtimeDeps = deps ?? (await buildDefaultDeps());
  const [indexed, metrics, sitemap, avgScore] = await Promise.all([
    readIndexedPages(runtimeDeps.db),
    readSearchMetrics(runtimeDeps.db),
    readLatestSitemapSubmission(runtimeDeps.db),
    meanSeoScore(runtimeDeps.db),
  ]);
  return aggregateOverview({ indexed, metrics, sitemap, avgScore });
}

/**
 * Search-performance report for the resolved window: totals, an ascending
 * date series, and the top queries. `startDate`/`endDate` are `YYYY-MM-DD`
 * strings validated and clamped by the canonical window contract
 * (`gsc_sync_window_invalid` on malformed or out-of-range input); `limit`
 * clamps to `[1, MAX_TOP_QUERIES]`. An optional `targetId` narrows the rows
 * to the target's URL/path keys.
 */
export async function getSearchPerformance(
  opts: { targetId?: string; startDate?: string; endDate?: string; limit?: number } = {},
  deps?: SeoPerformanceDeps
): Promise<SeoSearchPerformance> {
  const runtimeDeps = deps ?? (await buildDefaultDeps());
  const window = clampWindow({ startDate: opts.startDate, endDate: opts.endDate });
  const limit = clampTopQueriesLimit(opts.limit);
  const targetPathKeys = opts.targetId
    ? new Set(await resolveTargetUrlKeys(runtimeDeps.db, opts.targetId))
    : null;

  const [metricRows, queryRows] = await Promise.all([
    readMetricsForRange(runtimeDeps.db, window),
    readQueriesForRange(runtimeDeps.db, window),
  ]);
  const metrics = targetPathKeys
    ? metricRows.filter((metric) => targetPathKeys.has(pathKeyOf(metric.url)))
    : metricRows;
  const queries = targetPathKeys
    ? queryRows.filter((query) => targetPathKeys.has(pathKeyOf(query.url)))
    : queryRows;

  return aggregateSearchPerformance({ metrics, queries, range: window, limit });
}

const mapDocument = (row: typeof seoDocuments.$inferSelect): SeoDocument => ({
  id: row.id,
  targetType: row.targetType as SeoTargetType,
  targetId: row.targetId,
  slug: row.slug ?? null,
  title: row.title ?? null,
  description: row.description ?? null,
  canonicalUrl: row.canonicalUrl ?? null,
  robots: row.robots ?? null,
  score: row.score ?? null,
  status: row.status as SeoStatus,
  issues: (row.issues as SeoIssue[]) ?? [],
  lastAuditAt: row.lastAuditAt ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const loadTargets = async (runtimeDb: typeof db): Promise<TargetRow[]> => {
  const [pageRows, entryRows] = await Promise.all([
    runtimeDb.select({ id: pages.id, title: pages.title, slug: pages.slug }).from(pages),
    runtimeDb
      .select({ id: contentEntries.id, title: contentEntries.title, slug: contentEntries.slug })
      .from(contentEntries),
  ]);
  return [
    ...pageRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: normalizeSlug(row.slug),
      targetType: "page" as const,
    })),
    ...entryRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: normalizeSlug(row.slug),
      targetType: "entry" as const,
    })),
  ];
};

const indexTargets = (targets: TargetRow[]): Map<string, TargetRow> => {
  const byKey = new Map<string, TargetRow>();
  for (const target of targets) {
    byKey.set(`${target.targetType}:${target.id}`, target);
    if (target.slug) {
      byKey.set(`${target.targetType}:${target.slug}`, target);
      byKey.set(`${target.targetType}:${target.slug.replace(/^\//, "")}`, target);
    }
  }
  return byKey;
};

const resolveTarget = (
  byKey: Map<string, TargetRow>,
  document: Pick<SeoDocument, "targetType" | "targetId" | "slug">
): TargetRow | null => {
  const exact = byKey.get(`${document.targetType}:${document.targetId}`);
  if (exact) return exact;
  if (!document.slug) return null;
  return (
    byKey.get(`${document.targetType}:${document.slug}`) ??
    byKey.get(`${document.targetType}:${document.slug.replace(/^\//, "")}`) ??
    null
  );
};

/**
 * List every `seo_documents` row with its joined per-document performance
 * (index page + summed metrics). Documents without index rows carry an
 * explicit `performance: null`. Rows are ordered newest-updated first, like
 * the existing SEO lists.
 */
export async function listSeoDocumentsWithPerformance(
  deps?: SeoPerformanceDeps
): Promise<SeoListItemWithPerformance[]> {
  const runtimeDeps = deps ?? (await buildDefaultDeps());
  const [docRows, indexedRows, metricRows, targets] = await Promise.all([
    runtimeDeps.db.select().from(seoDocuments),
    runtimeDeps.db.select().from(seoIndexedPages),
    runtimeDeps.db.select().from(seoSearchMetrics),
    loadTargets(runtimeDeps.db),
  ]);

  const targetByKey = indexTargets(targets);
  const documents: SeoListItem[] = docRows
    .map((row) => {
      const document = mapDocument(row);
      const target = resolveTarget(targetByKey, document);
      return {
        ...document,
        targetTitle: target?.title ?? document.title ?? document.slug ?? document.targetId,
      };
    })
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  return attachDocumentPerformance({
    documents,
    indexed: indexedRows.map(sanitizeIndexedPage),
    metrics: metricRows.map(sanitizeMetricPoint),
  });
}
