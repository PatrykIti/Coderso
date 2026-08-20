/**
 * GSC data-sync service (TASK-493-03-L02).
 *
 * Pulls search-performance and URL-inspection data from Google Search Console
 * through the L01 client and persists it into the subtask-01 tables:
 *
 * - `syncSearchPerformance` calls `searchAnalytics/query` twice (dimensions
 *   `["date","page"]` and `["date","page","query"]`) and upserts
 *   `seo_search_metrics` / `seo_search_queries` idempotently (keyed by the
 *   unique indexes `url+date` and `url+query+date`), so a re-run overwrites
 *   the same day buckets instead of duplicating rows.
 * - `syncIndexedPages` runs a BOUNDED per-URL URL Inspection loop over the
 *   sitemap's public page/entry URLs (at most `maxUrls`, clamped to 50 per
 *   run) and upserts `seo_indexed_pages` with `normalizeIndexingState`
 *   applied. A `gsc_request_failed:429` soft-skips the remaining URLs.
 *
 * Security: the credential and the minted access token live only inside the
 * L01 client. This service never receives, persists, or logs them; it persists
 * only URLs, query strings, and aggregate counts. All dates are validated and
 * clamped (`clampWindow`) before any outbound call.
 *
 * The module is importable without a database (lazy default deps, mirroring
 * `sitemapService`/`searchIndexService`): importing it never opens a
 * connection or pulls server adapters into a Bun-free test.
 */

import { sql } from "drizzle-orm";

import type { db } from "../../db/client";
import { seoIndexedPages, seoSearchMetrics, seoSearchQueries } from "../../db/schema";
import type { GscClient, GscInspectionResult } from "./gscClient";
import { normalizeIndexingState, toNumber } from "./seoSearchPerformanceTypes";
import type { SitemapEntry } from "./sitemapService";

/** GSC keeps 16 months of search analytics data; windows are clamped to it. */
export const GSC_MAX_WINDOW_MONTHS = 16;

/** Default sync window length (inclusive days) when no dates are provided. */
export const DEFAULT_WINDOW_DAYS = 28;

/** Per-run cap for the URL Inspection loop (GSC v1 quota is ~2000/day). */
export const MAX_INSPECT_URLS_PER_RUN = 50;

export type SyncWindow = {
  startDate: string;
  endDate: string;
};

export type SearchPerformanceSyncResult = {
  metrics: number;
  queries: number;
};

export type IndexedPagesSyncResult = {
  inspected: number;
  skipped: number;
  total: number;
};

export type GscSyncDeps = {
  db: typeof db;
  getGscClient: (scope?: string) => Promise<GscClient>;
  collectSitemapUrls: () => Promise<SitemapEntry[]>;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a strict `YYYY-MM-DD` calendar date at UTC midnight. Rejects malformed
 * strings and impossible calendar dates (`2024-02-30` rolls over in JS, so the
 * round-trip check catches it). Returns null instead of throwing so callers
 * can map the failure to `gsc_sync_window_invalid`.
 */
export function parseDay(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

const toDayString = (date: Date): string => date.toISOString().slice(0, 10);

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/**
 * Clamp a sync window to GSC's supported range and validate every provided
 * date before any outbound call.
 *
 * - Defaults: last `DEFAULT_WINDOW_DAYS` days (inclusive), ending today.
 * - Malformed, impossible, or future dates throw `gsc_sync_window_invalid`.
 * - A start before GSC's 16-month retention is clamped forward to the
 *   retention boundary; a window that lies entirely outside the range (for
 *   example an end date older than 16 months) also throws.
 *
 * Exported because the 04-L02 route contract references this helper for its
 * schema-level window guard.
 */
export function clampWindow(input: { startDate?: string; endDate?: string }): SyncWindow {
  const today = startOfUtcDay(new Date());
  const minStart = new Date(today);
  minStart.setUTCMonth(minStart.getUTCMonth() - GSC_MAX_WINDOW_MONTHS);

  const parsedEnd = input.endDate === undefined ? today : parseDay(input.endDate);
  if (parsedEnd === null || parsedEnd.getTime() > today.getTime()) {
    throw new Error("gsc_sync_window_invalid");
  }

  let start: Date;
  if (input.startDate === undefined) {
    start = new Date(parsedEnd);
    start.setUTCDate(start.getUTCDate() - (DEFAULT_WINDOW_DAYS - 1));
  } else {
    const parsedStart = parseDay(input.startDate);
    if (parsedStart === null || parsedStart.getTime() > parsedEnd.getTime()) {
      throw new Error("gsc_sync_window_invalid");
    }
    start = parsedStart;
  }

  if (start.getTime() < minStart.getTime()) {
    start = new Date(minStart);
  }
  if (start.getTime() > parsedEnd.getTime()) {
    throw new Error("gsc_sync_window_invalid");
  }

  return { startDate: toDayString(start), endDate: toDayString(parsedEnd) };
}

/**
 * Clamp an integer into `[min, max]`. Non-finite or non-numeric input degrades
 * to `min` so a caller-provided bound can never expand a security limit.
 */
export function clampInt(value: number, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

const buildDefaultDeps = async (): Promise<GscSyncDeps> => {
  const [{ db }, { getGscClient }, { collectSitemapUrls }] = await Promise.all([
    import("../../db/client"),
    import("./gscClient"),
    import("./sitemapService"),
  ]);
  return { db, getGscClient, collectSitemapUrls };
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;

const resolveKeys = (row: Record<string, unknown>): unknown[] | null => {
  if (!Array.isArray(row.keys) || row.keys.length === 0) return null;
  return row.keys;
};

const resolveKeyString = (keys: unknown[], index: number): string | null => {
  const value = keys[index];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asScalar = (value: unknown): string | number | null | undefined =>
  typeof value === "string" || typeof value === "number" ? value : null;

/** Extract the `rows` array from a GSC search-analytics payload. */
const extractRows = (payload: unknown): unknown[] => {
  if (payload === null || typeof payload !== "object") return [];
  const rows = (payload as { rows?: unknown }).rows;
  return Array.isArray(rows) ? rows : [];
};

/**
 * Parse one GSC `searchAnalytics/query` row for a metric point
 * (`keys = [date, page]`). Returns null for rows that cannot be keyed.
 */
const parseMetricPoint = (row: Record<string, unknown>): { url: string; date: Date } | null => {
  const keys = resolveKeys(row);
  if (keys === null || keys.length < 2) return null;
  const url = resolveKeyString(keys, 1);
  const date = parseDay(keys[0]);
  if (url === null || date === null) return null;
  return { url, date };
};

/**
 * Parse one GSC `searchAnalytics/query` row for a query row
 * (`keys = [date, page, query]`). Returns null for rows that cannot be keyed.
 */
const parseQueryRow = (
  row: Record<string, unknown>
): { url: string; query: string; date: Date } | null => {
  const keys = resolveKeys(row);
  if (keys === null || keys.length < 3) return null;
  const url = resolveKeyString(keys, 1);
  const query = resolveKeyString(keys, 2);
  const date = parseDay(keys[0]);
  if (url === null || query === null || date === null) return null;
  return { url, query, date };
};

const upsertMetrics = async (runtimeDb: typeof db, rows: unknown[], now: Date): Promise<void> => {
  const values: Array<{
    url: string;
    date: Date;
    clicks: number;
    impressions: number;
    ctr: string;
    position: string;
    syncedAt: Date;
  }> = [];
  for (const row of rows) {
    const parsed = asObject(row);
    if (parsed === null) continue;
    const point = parseMetricPoint(parsed);
    if (point === null) continue;
    values.push({
      url: point.url,
      date: point.date,
      clicks: Math.trunc(toNumber(asScalar(parsed.clicks))),
      impressions: Math.trunc(toNumber(asScalar(parsed.impressions))),
      ctr: String(toNumber(asScalar(parsed.ctr))),
      position: String(toNumber(asScalar(parsed.position))),
      syncedAt: now,
    });
  }
  if (values.length === 0) return;

  await runtimeDb
    .insert(seoSearchMetrics)
    .values(values)
    .onConflictDoUpdate({
      target: [seoSearchMetrics.url, seoSearchMetrics.date],
      set: {
        clicks: sql`excluded.clicks`,
        impressions: sql`excluded.impressions`,
        ctr: sql`excluded.ctr`,
        position: sql`excluded.position`,
        syncedAt: sql`excluded.synced_at`,
      },
    });
};

const upsertQueries = async (runtimeDb: typeof db, rows: unknown[], now: Date): Promise<void> => {
  const values: Array<{
    url: string;
    query: string;
    date: Date;
    clicks: number;
    impressions: number;
    ctr: string;
    position: string;
    syncedAt: Date;
  }> = [];
  for (const row of rows) {
    const parsed = asObject(row);
    if (parsed === null) continue;
    const queryRow = parseQueryRow(parsed);
    if (queryRow === null) continue;
    values.push({
      url: queryRow.url,
      query: queryRow.query,
      date: queryRow.date,
      clicks: Math.trunc(toNumber(asScalar(parsed.clicks))),
      impressions: Math.trunc(toNumber(asScalar(parsed.impressions))),
      ctr: String(toNumber(asScalar(parsed.ctr))),
      position: String(toNumber(asScalar(parsed.position))),
      syncedAt: now,
    });
  }
  if (values.length === 0) return;

  await runtimeDb
    .insert(seoSearchQueries)
    .values(values)
    .onConflictDoUpdate({
      target: [seoSearchQueries.url, seoSearchQueries.query, seoSearchQueries.date],
      set: {
        clicks: sql`excluded.clicks`,
        impressions: sql`excluded.impressions`,
        ctr: sql`excluded.ctr`,
        position: sql`excluded.position`,
        syncedAt: sql`excluded.synced_at`,
      },
    });
};

const upsertIndexedPage = async (
  runtimeDb: typeof db,
  result: GscInspectionResult,
  now: Date
): Promise<void> => {
  await runtimeDb
    .insert(seoIndexedPages)
    .values({
      url: result.url,
      coverageState: result.coverageState,
      indexingState: normalizeIndexingState(result.indexingState),
      verdict: result.verdict,
      robotsState: result.robotsTxtState,
      googleCanonical: result.googleCanonical,
      userCanonical: result.userCanonical,
      lastCrawledAt: result.lastCrawledAt,
      lastFetchedAt: now,
      syncedAt: now,
    })
    .onConflictDoUpdate({
      target: [seoIndexedPages.url],
      set: {
        coverageState: sql`excluded.coverage_state`,
        indexingState: sql`excluded.indexing_state`,
        verdict: sql`excluded.verdict`,
        robotsState: sql`excluded.robots_state`,
        googleCanonical: sql`excluded.google_canonical`,
        userCanonical: sql`excluded.user_canonical`,
        lastCrawledAt: sql`excluded.last_crawled_at`,
        lastFetchedAt: sql`excluded.last_fetched_at`,
        syncedAt: sql`excluded.synced_at`,
      },
    });
};

/**
 * Pull Search Analytics data for the clamped window and upsert metric + query
 * rows. Idempotent: re-running overwrites the same `url+date` / `url+query+date`
 * buckets. Throws `gsc_sync_window_invalid`, `gsc_not_configured`,
 * `gsc_credential_invalid`, or `gsc_request_failed:<status>` from the client.
 */
export async function syncSearchPerformance(
  input: { startDate?: string; endDate?: string },
  deps?: GscSyncDeps
): Promise<SearchPerformanceSyncResult> {
  const window = clampWindow(input);
  const runtimeDeps = deps ?? (await buildDefaultDeps());
  const client = await runtimeDeps.getGscClient("webmasters.readonly");
  const property = encodeURIComponent(client.siteUrl);

  const byPage = await client.request("POST", `sites/${property}/searchAnalytics/query`, {
    startDate: window.startDate,
    endDate: window.endDate,
    dimensions: ["date", "page"],
    rowLimit: 25000,
  });
  const byPageRows = extractRows(byPage);
  await upsertMetrics(runtimeDeps.db, byPageRows, new Date());

  const byQuery = await client.request("POST", `sites/${property}/searchAnalytics/query`, {
    startDate: window.startDate,
    endDate: window.endDate,
    dimensions: ["date", "page", "query"],
    rowLimit: 25000,
  });
  const byQueryRows = extractRows(byQuery);
  await upsertQueries(runtimeDeps.db, byQueryRows, new Date());

  return {
    metrics: Array.isArray(byPageRows) ? byPageRows.length : 0,
    queries: Array.isArray(byQueryRows) ? byQueryRows.length : 0,
  };
}

/**
 * Inspect the sitemap's public URLs through the v1 URL Inspection endpoint and
 * upsert `seo_indexed_pages`. The loop is BOUNDED to at most 50 URLs per run
 * (`maxUrls` is clamped to `[1, 50]`). A `gsc_request_failed:429` response
 * soft-skips the remainder of the run without failing the sync.
 */
export async function syncIndexedPages(
  options: { maxUrls?: number } = {},
  deps?: GscSyncDeps
): Promise<IndexedPagesSyncResult> {
  const maxUrls = clampInt(
    options.maxUrls ?? MAX_INSPECT_URLS_PER_RUN,
    1,
    MAX_INSPECT_URLS_PER_RUN
  );
  const runtimeDeps = deps ?? (await buildDefaultDeps());
  const client = await runtimeDeps.getGscClient("webmasters.readonly");
  const urls = (await runtimeDeps.collectSitemapUrls()).slice(0, maxUrls);

  let inspected = 0;
  let skipped = 0;
  for (const entry of urls) {
    try {
      const result = await client.inspectUrl(entry.loc);
      await upsertIndexedPage(runtimeDeps.db, result, new Date());
      inspected += 1;
    } catch (error) {
      if (error instanceof Error && error.message === "gsc_request_failed:429") {
        skipped = urls.length - inspected;
        break;
      }
      throw error;
    }
  }

  return { inspected, skipped, total: urls.length };
}
