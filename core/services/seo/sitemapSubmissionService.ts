/**
 * Sitemap submission and status-tracking service (TASK-493-02-L02).
 *
 * Submits the site's own sitemap to Google Search Console (GSC) through the
 * L01 client (`getGscClient`) and persists the outcome in
 * `seo_sitemap_submissions`, keyed by the unique `source + sitemapUrl` index:
 *
 * - `submitSitemap` PUTs `sites/{siteUrl}/sitemaps/{feedpath}` with the
 *   `webmasters` (write) scope, then upserts a `submitted` row on success or
 *   an `error` row (redacted, machine-readable message) before rethrowing
 *   `sitemap_submit_failed`.
 * - `getSitemapStatus` reads the latest rows, bounded and ordered by update
 *   time.
 * - `refreshSitemapStatus` GETs the GSC sitemap list and updates
 *   warnings/errors/lastDownloadedAt/isPending for matching feedpaths. It is
 *   best-effort: when GSC is unconfigured or a request fails it degrades to
 *   the local rows instead of throwing.
 *
 * Security: the credential and the minted access token live only inside the
 * L01 client. This module never receives, persists, or logs them; it persists
 * only status/counts and the own-origin feedpath. `normalizeOwnOriginSitemapPath`
 * rejects attacker-supplied absolute URLs (`https://...`, `//...`, `file://`,
 * backslash tricks) so no outbound SSRF is possible.
 *
 * The module is importable without a database (lazy default deps, mirroring
 * `gscSyncService`): importing it never opens a connection.
 */

import { and, desc, eq, sql } from "drizzle-orm";

import type { db } from "../../db/client";
import { seoSitemapSubmissions } from "../../db/schema";
import type { GscClient } from "./gscClient";
import {
  seoSitemapStatuses,
  toNumber,
  type SeoSitemapStatus,
  type SeoSitemapSubmissionRow,
} from "./seoSearchPerformanceTypes";

/** Default feedpath used when no `sitemapPath` is provided. */
export const DEFAULT_SITEMAP_PATH = "/sitemap.xml";

/** Submission target label; `seo_sitemap_submissions.source` column value. */
export const SUBMISSION_SOURCE = "google";

/** Bounded read size for `getSitemapStatus` / `refreshSitemapStatus`. */
export const MAX_STATUS_ROWS = 50;

export type SitemapSubmissionDeps = {
  db: typeof db;
  getGscClient: (scope?: string) => Promise<GscClient>;
};

/** Machine-readable GSC error code prefix (`gsc_*` optionally suffixed `:<status>`). */
const GSC_ERROR_CODE = /^gsc_[a-z_]+(?::\d+)?/;

/**
 * Own-origin sitemap path guard.
 *
 * Only a relative path is allowed; `undefined`/empty input defaults to
 * `/sitemap.xml`. Attacker-supplied absolute URLs, protocol-relative URLs,
 * scheme-bearing strings, control characters, and backslash tricks are
 * rejected with `sitemap_path_invalid` so the feedpath can never point GSC
 * calls at an arbitrary host (no SSRF).
 */
export function normalizeOwnOriginSitemapPath(raw?: string): string {
  if (raw === undefined || raw === null || raw === "") return DEFAULT_SITEMAP_PATH;
  if (typeof raw !== "string") throw new Error("sitemap_path_invalid");
  const value = raw.trim();
  if (!value.startsWith("/")) throw new Error("sitemap_path_invalid");
  if (value.startsWith("//")) throw new Error("sitemap_path_invalid");
  if (value.includes("\\")) throw new Error("sitemap_path_invalid");
  if (value.includes("://")) throw new Error("sitemap_path_invalid");
  if (hasControlChar(value)) throw new Error("sitemap_path_invalid");
  return value;
}

const hasControlChar = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
};

const toSubmissionStatus = (raw: string): SeoSitemapStatus =>
  (seoSitemapStatuses as readonly string[]).includes(raw) ? (raw as SeoSitemapStatus) : "pending";

const sanitizeSubmissionRow = (
  row: typeof seoSitemapSubmissions.$inferSelect
): SeoSitemapSubmissionRow => ({
  sitemapUrl: row.sitemapUrl,
  source: row.source,
  status: toSubmissionStatus(row.status),
  urlCount: row.urlCount,
  warnings: row.warnings,
  errors: row.errors,
  lastSubmittedAt: row.lastSubmittedAt,
  lastErrorMessage: row.lastErrorMessage,
});

/**
 * Redact an outbound error into a machine-readable, secret-free code.
 *
 * GSC client errors already use `gsc_*` codes, but a raw or misbehaving error
 * may embed URLs, tokens, or credentials. Only the leading `gsc_...[:status]`
 * token is kept (capped in length); everything else degrades to the generic
 * `gsc_request_failed` code.
 */
const redactGscError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "";
  const match = GSC_ERROR_CODE.exec(message.trim());
  return match ? match[0].slice(0, 64) : "gsc_request_failed";
};

type SubmissionUpsert = {
  feedpath: string;
  status: SeoSitemapStatus;
  isPending: boolean;
  lastSubmittedAt?: Date;
  lastErrorMessage?: string;
};

/**
 * Upsert one `seo_sitemap_submissions` row keyed by the unique
 * `source + sitemapUrl` index. The row always reflects the latest attempt:
 * the conflict branch overwrites status, pending flag, submit timestamp, error
 * message, and update time with the would-be-inserted values.
 */
const upsertSubmission = async (
  runtimeDb: typeof db,
  input: SubmissionUpsert
): Promise<SeoSitemapSubmissionRow> => {
  const [row] = await runtimeDb
    .insert(seoSitemapSubmissions)
    .values({
      sitemapUrl: input.feedpath,
      source: SUBMISSION_SOURCE,
      status: input.status,
      isPending: input.isPending,
      lastSubmittedAt: input.lastSubmittedAt,
      lastErrorMessage: input.lastErrorMessage,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [seoSitemapSubmissions.source, seoSitemapSubmissions.sitemapUrl],
      set: {
        status: sql`excluded.status`,
        isPending: sql`excluded.is_pending`,
        lastSubmittedAt: sql`excluded.last_submitted_at`,
        lastErrorMessage: sql`excluded.last_error_message`,
        updatedAt: sql`excluded.updated_at`,
      },
    })
    .returning();
  return sanitizeSubmissionRow(row);
};

const buildDefaultDeps = async (): Promise<SitemapSubmissionDeps> => {
  const [{ db }, { getGscClient }] = await Promise.all([
    import("../../db/client"),
    import("./gscClient"),
  ]);
  return { db, getGscClient };
};

/**
 * Submit the site's own sitemap to GSC and persist the outcome.
 *
 * The feedpath is validated by `normalizeOwnOriginSitemapPath` first (rejects
 * absolute URLs, so no SSRF), then the GSC client is minted with the write
 * scope (`webmasters`). A failed PUT records an `error` row with a redacted,
 * machine-readable `lastErrorMessage` and rethrows `sitemap_submit_failed`; a
 * successful PUT records a `submitted` row with `lastSubmittedAt`. GSC
 * configuration errors (`gsc_not_configured`) propagate untouched.
 */
export async function submitSitemap(
  input: { sitemapPath?: string },
  deps?: SitemapSubmissionDeps
): Promise<SeoSitemapSubmissionRow> {
  const feedpath = normalizeOwnOriginSitemapPath(input.sitemapPath);
  const runtimeDeps = deps ?? (await buildDefaultDeps());
  const client = await runtimeDeps.getGscClient("webmasters");
  try {
    await client.request(
      "PUT",
      `sites/${encodeURIComponent(client.siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`
    );
  } catch (error) {
    await upsertSubmission(runtimeDeps.db, {
      feedpath,
      status: "error",
      isPending: false,
      lastErrorMessage: redactGscError(error),
    });
    throw new Error("sitemap_submit_failed");
  }
  return upsertSubmission(runtimeDeps.db, {
    feedpath,
    status: "submitted",
    isPending: true,
    lastSubmittedAt: new Date(),
  });
}

const readLocalStatus = async (runtimeDb: typeof db): Promise<SeoSitemapSubmissionRow[]> => {
  const rows = await runtimeDb
    .select()
    .from(seoSitemapSubmissions)
    .orderBy(desc(seoSitemapSubmissions.updatedAt), desc(seoSitemapSubmissions.createdAt))
    .limit(MAX_STATUS_ROWS);
  return rows.map(sanitizeSubmissionRow);
};

/**
 * Read the latest submission rows (bounded by `MAX_STATUS_ROWS`, newest
 * update first). Each row is already the latest for its `source + sitemapUrl`
 * pair because re-submits upsert in place.
 */
export async function getSitemapStatus(
  deps?: SitemapSubmissionDeps
): Promise<SeoSitemapSubmissionRow[]> {
  const runtimeDeps = deps ?? (await buildDefaultDeps());
  return readLocalStatus(runtimeDeps.db);
}

const feedpathFromGscPath = (path: string): string | null => {
  if (path.startsWith("/")) return path;
  try {
    const parsed = new URL(path);
    return parsed.pathname || null;
  } catch {
    return null;
  }
};

const parseIsoDate = (value: unknown): Date | null => {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Apply a GSC `GET sitemaps` payload to matching local rows.
 *
 * GSC reports each sitemap as an absolute `path` plus `lastDownloaded`,
 * `isPending`, `warnings`, and `errors` (string counts). Entries are matched
 * to local rows by their own-origin feedpath (the URL pathname); only rows
 * already known locally are updated, so a refresh never invents submissions.
 * The update is bounded by GSC's sitemap list size, which is small.
 */
const applySitemapStatusPayload = async (runtimeDb: typeof db, payload: unknown): Promise<void> => {
  const list =
    payload !== null &&
    typeof payload === "object" &&
    Array.isArray((payload as { sitemap?: unknown }).sitemap)
      ? (payload as { sitemap: unknown[] }).sitemap
      : [];
  if (list.length === 0) return;

  const localRows = await runtimeDb
    .select({ sitemapUrl: seoSitemapSubmissions.sitemapUrl })
    .from(seoSitemapSubmissions)
    .where(eq(seoSitemapSubmissions.source, SUBMISSION_SOURCE));
  const known = new Set(localRows.map((row) => row.sitemapUrl));

  for (const item of list) {
    if (item === null || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const path = typeof raw.path === "string" ? raw.path : "";
    const feedpath = feedpathFromGscPath(path);
    if (feedpath === null || !known.has(feedpath)) continue;

    await runtimeDb
      .update(seoSitemapSubmissions)
      .set({
        warnings: Math.trunc(toNumber(raw.warnings as number | string | null | undefined)),
        errors: Math.trunc(toNumber(raw.errors as number | string | null | undefined)),
        lastDownloadedAt: parseIsoDate(raw.lastDownloaded),
        isPending: typeof raw.isPending === "boolean" ? raw.isPending : true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(seoSitemapSubmissions.source, SUBMISSION_SOURCE),
          eq(seoSitemapSubmissions.sitemapUrl, feedpath)
        )
      );
  }
};

/**
 * Refresh submission status from GSC (best-effort).
 *
 * GETs `sites/{siteUrl}/sitemaps` and updates warnings/errors/
 * lastDownloadedAt/isPending for matching feedpaths, then returns the local
 * rows. Any GSC failure (unconfigured, credential, token, or request error)
 * degrades to the local rows without throwing so the status surface always
 * answers; the service error codes stay machine-readable.
 */
export async function refreshSitemapStatus(
  deps?: SitemapSubmissionDeps
): Promise<SeoSitemapSubmissionRow[]> {
  const runtimeDeps = deps ?? (await buildDefaultDeps());
  try {
    const client = await runtimeDeps.getGscClient("webmasters.readonly");
    const payload = await client.request(
      "GET",
      `sites/${encodeURIComponent(client.siteUrl)}/sitemaps`
    );
    await applySitemapStatusPayload(runtimeDeps.db, payload);
  } catch {
    // Best-effort refresh: fall back to the local rows.
  }
  return readLocalStatus(runtimeDeps.db);
}
