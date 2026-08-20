// TASK-493-02-L02: sitemap submission + status-tracking service (Bun lane).
// Covers the full service flow with the GSC client stubbed through the
// dependency seam: submitSitemap records an error status on GSC failure and a
// submitted status on success, re-submits upsert in place on the unique
// source+sitemapUrl index, getSitemapStatus returns the latest rows ordered by
// update time, and refreshSitemapStatus applies GSC warnings/errors/
// lastDownloadedAt to matching feedpaths while degrading to local rows when
// GSC is unavailable. Outbound calls + real DB writes place this suite in the
// Bun lane. DB tests are gated on table availability (0079 DDL); when the
// public schema lacks it, run against a provisioned worker schema.
import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { seoSitemapSubmissions } from "../../../core/db/schema";
import type { GscClient } from "../../../core/services/seo/gscClient";
import {
  DEFAULT_SITEMAP_PATH,
  MAX_STATUS_ROWS,
  getSitemapStatus,
  normalizeOwnOriginSitemapPath,
  refreshSitemapStatus,
  submitSitemap,
  type SitemapSubmissionDeps,
} from "../../../core/services/seo/sitemapSubmissionService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasDbAndTables = hasDb && (await hasSeoTables());
const testIfTables = hasDbAndTables ? test : test.skip;

async function canConnect(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function hasSeoTables(): Promise<boolean> {
  try {
    await db.select({ id: seoSitemapSubmissions.id }).from(seoSitemapSubmissions).limit(1);
    return true;
  } catch {
    return false;
  }
}

const SITE_URL = "https://submit-test.example/";
const ENCODED_SITE_URL = encodeURIComponent(SITE_URL);
const fixturePath = (label: string) => `/sitemap-${label}-${randomUUID()}.xml`;

type StubCall = { method: string; path: string; body: unknown };

const makeClient = (
  options: {
    sitemapList?: unknown[];
    requestError?: Error;
    getError?: Error;
    siteUrl?: string;
  } = {}
): { client: GscClient; calls: StubCall[] } => {
  const calls: StubCall[] = [];
  const client: GscClient = {
    siteUrl: options.siteUrl ?? SITE_URL,
    request: async (method, path, body) => {
      calls.push({ method, path, body });
      if (method === "GET") {
        if (options.getError !== undefined) throw options.getError;
        if (path.endsWith("/sitemaps")) return { sitemap: options.sitemapList ?? [] };
      }
      if (options.requestError !== undefined) throw options.requestError;
      return null;
    },
    inspectUrl: async () => {
      throw new Error("unexpected inspectUrl call");
    },
  };
  return { client, calls };
};

const buildDeps = (client: GscClient): SitemapSubmissionDeps => ({
  db,
  getGscClient: async () => client,
});

const buildNotConfiguredDeps = (): SitemapSubmissionDeps => ({
  db,
  getGscClient: async () => {
    throw new Error("gsc_not_configured");
  },
});

const gscEntry = (path: string, overrides: Record<string, unknown> = {}) => ({
  path,
  lastSubmitted: "2026-01-01T00:00:00.000Z",
  lastDownloaded: null,
  isPending: true,
  warnings: "0",
  errors: "0",
  ...overrides,
});

const createdPaths: string[] = [];
const track = (path: string) => {
  createdPaths.push(path);
  return path;
};

afterAll(async () => {
  if (!hasDbAndTables) return;
  const paths = [...new Set(createdPaths)];
  if (paths.length === 0) return;
  await db.delete(seoSitemapSubmissions).where(inArray(seoSitemapSubmissions.sitemapUrl, paths));
});

describe("normalizeOwnOriginSitemapPath", () => {
  test("defaults to /sitemap.xml when omitted or empty", () => {
    expect(normalizeOwnOriginSitemapPath()).toBe(DEFAULT_SITEMAP_PATH);
    expect(normalizeOwnOriginSitemapPath(undefined)).toBe(DEFAULT_SITEMAP_PATH);
    expect(normalizeOwnOriginSitemapPath("")).toBe(DEFAULT_SITEMAP_PATH);
  });

  test("accepts a relative own-origin path", () => {
    expect(normalizeOwnOriginSitemapPath("/sitemap.xml")).toBe("/sitemap.xml");
    expect(normalizeOwnOriginSitemapPath("/blog/sitemap.xml")).toBe("/blog/sitemap.xml");
  });

  test("rejects absolute and protocol-relative URLs", () => {
    for (const attack of [
      "https://evil.example/",
      "http://evil.example/sitemap.xml",
      "//evil.example/sitemap.xml",
      "file:///etc/passwd",
    ]) {
      expect(() => normalizeOwnOriginSitemapPath(attack), attack).toThrow("sitemap_path_invalid");
    }
  });
});

test("submitSitemap propagates gsc_not_configured without persisting a row", async () => {
  await expect(submitSitemap({}, buildNotConfiguredDeps())).rejects.toThrow("gsc_not_configured");
});

test("MAX_STATUS_ROWS bounds the status list", () => {
  expect(MAX_STATUS_ROWS).toBeGreaterThan(0);
  expect(MAX_STATUS_ROWS).toBeLessThanOrEqual(500);
});

testIfTables(
  "submitSitemap PUTs the encoded feedpath and records submitted on success",
  async () => {
    const feedpath = track(fixturePath("success"));
    const { client, calls } = makeClient();

    const row = await submitSitemap({ sitemapPath: feedpath }, buildDeps(client));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      method: "PUT",
      path: `sites/${ENCODED_SITE_URL}/sitemaps/${encodeURIComponent(feedpath)}`,
    });
    expect(row).toMatchObject({
      sitemapUrl: feedpath,
      source: "google",
      status: "submitted",
      warnings: 0,
      errors: 0,
      lastSubmittedAt: expect.any(Date),
      lastErrorMessage: null,
    });

    const stored = await db
      .select()
      .from(seoSitemapSubmissions)
      .where(eq(seoSitemapSubmissions.sitemapUrl, feedpath));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ sitemapUrl: feedpath, status: "submitted", isPending: true });
  }
);

testIfTables("submitSitemap records error status and rethrows on GSC failure", async () => {
  const feedpath = track(fixturePath("error"));
  const { client, calls } = makeClient({ requestError: new Error("gsc_request_failed:403") });

  await expect(submitSitemap({ sitemapPath: feedpath }, buildDeps(client))).rejects.toThrow(
    "sitemap_submit_failed"
  );

  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ method: "PUT" });

  const stored = await db
    .select()
    .from(seoSitemapSubmissions)
    .where(eq(seoSitemapSubmissions.sitemapUrl, feedpath));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    sitemapUrl: feedpath,
    status: "error",
    isPending: false,
    lastErrorMessage: "gsc_request_failed:403",
    lastSubmittedAt: null,
  });
});

testIfTables("re-submitting the same feedpath upserts one row (idempotent)", async () => {
  const feedpath = track(fixturePath("idempotent"));
  const deps = buildDeps(makeClient().client);

  await submitSitemap({ sitemapPath: feedpath }, deps);
  await submitSitemap({ sitemapPath: feedpath }, deps);

  const stored = await db
    .select()
    .from(seoSitemapSubmissions)
    .where(eq(seoSitemapSubmissions.sitemapUrl, feedpath));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ status: "submitted" });
});

testIfTables("getSitemapStatus returns latest rows ordered by update time", async () => {
  const pathA = track(fixturePath("status-a"));
  const pathB = track(fixturePath("status-b"));
  const deps = buildDeps(makeClient().client);

  await submitSitemap({ sitemapPath: pathA }, deps);
  await submitSitemap({ sitemapPath: pathB }, deps);
  // Re-submit A so its updatedAt becomes the newest among the fixture rows.
  await submitSitemap({ sitemapPath: pathA }, deps);

  const rows = await getSitemapStatus(deps);
  const matching = rows.filter((row) => row.sitemapUrl === pathA || row.sitemapUrl === pathB);
  expect(matching).toHaveLength(2);
  expect(matching.map((row) => row.sitemapUrl)).toEqual([pathA, pathB]);
});

testIfTables("refreshSitemapStatus applies GSC warnings/errors/lastDownloadedAt", async () => {
  const feedpath = track(fixturePath("refresh"));
  const absolute = new URL(feedpath, SITE_URL).href;
  const { client, calls } = makeClient({
    sitemapList: [
      gscEntry(absolute, {
        warnings: "3",
        errors: "2",
        lastDownloaded: "2026-01-02T10:00:00.000Z",
        isPending: false,
      }),
    ],
  });
  const deps = buildDeps(client);
  await submitSitemap({ sitemapPath: feedpath }, deps);

  const rows = await refreshSitemapStatus(deps);

  const refreshCalls = calls.filter((call) => call.method === "GET");
  expect(refreshCalls).toHaveLength(1);
  expect(refreshCalls[0]).toMatchObject({
    method: "GET",
    path: `sites/${ENCODED_SITE_URL}/sitemaps`,
  });

  // The sanitized consumer row exposes warnings/errors; lastDownloadedAt and
  // isPending live on the DB row (outside the SeoSitemapSubmissionRow type),
  // so they are asserted at the persistence layer.
  const mine = rows.find((row) => row.sitemapUrl === feedpath);
  expect(mine).toMatchObject({ sitemapUrl: feedpath, warnings: 3, errors: 2 });

  const stored = await db
    .select()
    .from(seoSitemapSubmissions)
    .where(eq(seoSitemapSubmissions.sitemapUrl, feedpath));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ warnings: 3, errors: 2, isPending: false });
  expect(stored[0]?.lastDownloadedAt?.toISOString()).toBe("2026-01-02T10:00:00.000Z");
});

testIfTables("refreshSitemapStatus ignores GSC entries that have no local row", async () => {
  const feedpath = track(fixturePath("refresh-unknown"));
  const { client } = makeClient({
    sitemapList: [
      gscEntry(new URL(feedpath, SITE_URL).href, { warnings: "9", errors: "9" }),
      gscEntry("https://foreign.example/sitemap.xml", { warnings: "5", errors: "5" }),
    ],
  });
  const deps = buildDeps(client);
  await submitSitemap({ sitemapPath: feedpath }, deps);

  await refreshSitemapStatus(deps);

  const stored = await db
    .select()
    .from(seoSitemapSubmissions)
    .where(eq(seoSitemapSubmissions.sitemapUrl, feedpath));
  expect(stored[0]).toMatchObject({ warnings: 9, errors: 9 });
});

testIfTables("refreshSitemapStatus degrades to local rows when GSC is unconfigured", async () => {
  const feedpath = track(fixturePath("refresh-unconfigured"));
  await submitSitemap({ sitemapPath: feedpath }, buildDeps(makeClient().client));

  const rows = await refreshSitemapStatus(buildNotConfiguredDeps());

  expect(rows.find((row) => row.sitemapUrl === feedpath)).toMatchObject({ status: "submitted" });
});

testIfTables("refreshSitemapStatus degrades to local rows when the GSC request fails", async () => {
  const feedpath = track(fixturePath("refresh-failed"));
  const { client } = makeClient({ getError: new Error("gsc_request_failed:500") });
  const deps = buildDeps(client);
  await submitSitemap({ sitemapPath: feedpath }, deps);

  const rows = await refreshSitemapStatus(deps);

  expect(rows.find((row) => row.sitemapUrl === feedpath)).toMatchObject({
    status: "submitted",
    warnings: 0,
  });
});
