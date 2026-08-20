// TASK-493-03-L02: GSC data-sync service (Bun lane). Covers the full sync flow
// with the GSC client stubbed through the service's dependency seam: Search
// Analytics rows upsert into the right tables, re-syncs are idempotent on the
// unique indexes, `normalizeIndexingState` is applied to URL-inspection
// results, the window clamp rejects malformed/out-of-range windows before any
// outbound call, and the URL Inspection loop is bounded to 50 URLs per run
// with a 429 soft-skip. Outbound calls + real DB writes place this suite in
// the Bun lane.
import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { seoIndexedPages, seoSearchMetrics, seoSearchQueries } from "../../../core/db/schema";
import type { GscClient, GscInspectionResult } from "../../../core/services/seo/gscClient";
import {
  clampInt,
  clampWindow,
  syncIndexedPages,
  syncSearchPerformance,
  type GscSyncDeps,
} from "../../../core/services/seo/gscSyncService";
import type { SeoIndexingState } from "../../../core/services/seo/seoSearchPerformanceTypes";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasDbAndTables = hasDb && (await hasSeoTables());
const testIfDb = hasDb ? test : test.skip;
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
    await db.select({ id: seoSearchMetrics.id }).from(seoSearchMetrics).limit(1);
    return true;
  } catch {
    return false;
  }
}

const SITE_URL = "https://sync-test.example/";
const ENCODED_SITE_URL = encodeURIComponent(SITE_URL);
const fixtureUrl = (label: string) => `https://sync-test.example/${label}-${randomUUID()}`;

type StubCall = { method: string; path: string; body: unknown };

const makeClient = (
  options: {
    metricsRows?: unknown[];
    queryRows?: unknown[];
    inspections?: Array<GscInspectionResult | Error>;
    siteUrl?: string;
  } = {}
): { client: GscClient; calls: StubCall[]; inspections: { count: number } } => {
  const calls: StubCall[] = [];
  const inspections = { count: 0 };
  const rows = options.metricsRows ?? [];
  const queryRows = options.queryRows ?? [];
  const inspectionsQueue = [...(options.inspections ?? [])];

  const client: GscClient = {
    siteUrl: options.siteUrl ?? SITE_URL,
    request: async (method, path, body) => {
      calls.push({ method, path, body });
      const dims =
        body !== null &&
        typeof body === "object" &&
        Array.isArray((body as { dimensions?: unknown }).dimensions)
          ? (body as { dimensions: unknown[] }).dimensions
          : [];
      if (dims.includes("query")) return { rows: queryRows };
      return { rows };
    },
    inspectUrl: async (url) => {
      inspections.count += 1;
      const next = inspectionsQueue.shift();
      if (next instanceof Error) throw next;
      if (next === undefined) {
        return {
          url,
          indexingState: "UNKNOWN",
          coverageState: null,
          verdict: null,
          pageFetchState: null,
          robotsTxtState: null,
          googleCanonical: null,
          userCanonical: null,
          lastCrawledAt: null,
        };
      }
      return next;
    },
  };
  return { client, calls, inspections };
};

const buildDeps = (client: GscClient, urls: string[] = []): GscSyncDeps => ({
  db,
  getGscClient: async () => client,
  collectSitemapUrls: async () => urls.map((loc) => ({ loc })),
});

const metricRow = (url: string, date: string, overrides: Record<string, unknown> = {}) => ({
  keys: [date, url],
  clicks: 12,
  impressions: 400,
  ctr: 0.03,
  position: 7.5,
  ...overrides,
});

const queryRow = (
  url: string,
  date: string,
  query: string,
  overrides: Record<string, unknown> = {}
) => ({
  keys: [date, url, query],
  clicks: 4,
  impressions: 60,
  ctr: 0.0667,
  position: 3.2,
  ...overrides,
});

const inspection = (
  url: string,
  state: string,
  overrides: Partial<Omit<GscInspectionResult, "url" | "indexingState">> = {}
): GscInspectionResult => ({
  url,
  indexingState: state as SeoIndexingState,
  coverageState: "Submitted and indexed",
  verdict: "PASS",
  pageFetchState: "SUCCESSFUL",
  robotsTxtState: "ALLOWED",
  googleCanonical: url,
  userCanonical: url,
  lastCrawledAt: new Date("2026-01-15T10:00:00.000Z"),
  ...overrides,
});

const createdUrls: string[] = [];
const track = (url: string) => {
  createdUrls.push(url);
  return url;
};

afterAll(async () => {
  if (!hasDbAndTables) return;
  const urls = [...new Set(createdUrls)];
  if (urls.length === 0) return;
  await db.delete(seoSearchMetrics).where(inArray(seoSearchMetrics.url, urls));
  await db.delete(seoSearchQueries).where(inArray(seoSearchQueries.url, urls));
  await db.delete(seoIndexedPages).where(inArray(seoIndexedPages.url, urls));
});

describe("clampWindow", () => {
  test("defaults to the last 28 days ending today", () => {
    const today = new Date();
    const expectedEnd = today.toISOString().slice(0, 10);
    const expectedStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 27)
    )
      .toISOString()
      .slice(0, 10);
    expect(clampWindow({})).toEqual({ startDate: expectedStart, endDate: expectedEnd });
  });

  test("accepts an explicit in-range window", () => {
    const { startDate, endDate } = clampWindow({ startDate: "2026-01-01", endDate: "2026-01-31" });
    expect(startDate).toBe("2026-01-01");
    expect(endDate).toBe("2026-01-31");
  });

  test("rejects malformed and impossible calendar dates", () => {
    expect(() => clampWindow({ startDate: "not-a-date" })).toThrow("gsc_sync_window_invalid");
    expect(() => clampWindow({ endDate: "2024/01/01" })).toThrow("gsc_sync_window_invalid");
    expect(() => clampWindow({ startDate: "2024-02-30" })).toThrow("gsc_sync_window_invalid");
    expect(() => clampWindow({ startDate: "2024-13-01" })).toThrow("gsc_sync_window_invalid");
  });

  test("rejects future and inverted windows", () => {
    expect(() => clampWindow({ endDate: "2099-01-01" })).toThrow("gsc_sync_window_invalid");
    expect(() => clampWindow({ startDate: "2099-01-01", endDate: "2099-12-31" })).toThrow(
      "gsc_sync_window_invalid"
    );
    expect(() => clampWindow({ startDate: "2026-06-01", endDate: "2026-01-01" })).toThrow(
      "gsc_sync_window_invalid"
    );
  });

  test("clamps an over-wide window to GSC's 16-month retention boundary", () => {
    const today = new Date();
    const minStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 16, today.getUTCDate())
    );
    const window = clampWindow({ startDate: "2020-01-01", endDate: "2026-01-01" });
    expect(window.startDate).toBe(minStart.toISOString().slice(0, 10));
    expect(window.endDate).toBe("2026-01-01");
  });

  test("rejects a window lying entirely outside GSC retention", () => {
    expect(() => clampWindow({ startDate: "2020-01-01", endDate: "2024-01-01" })).toThrow(
      "gsc_sync_window_invalid"
    );
  });
});

describe("clampInt", () => {
  test("clamps values into [min, max] and degrades non-finite input to min", () => {
    expect(clampInt(50, 1, 50)).toBe(50);
    expect(clampInt(100, 1, 50)).toBe(50);
    expect(clampInt(0, 1, 50)).toBe(1);
    expect(clampInt(-5, 1, 50)).toBe(1);
    expect(clampInt(Number.NaN, 1, 50)).toBe(1);
    expect(clampInt(7, 1, 50)).toBe(7);
  });
});

testIfTables(
  "syncSearchPerformance upserts seo_search_metrics and seo_search_queries rows",
  async () => {
    const urlA = track(fixtureUrl("metrics-a"));
    const urlB = track(fixtureUrl("metrics-b"));
    const { client, calls } = makeClient({
      metricsRows: [
        metricRow(urlA, "2026-01-01"),
        metricRow(urlB, "2026-01-01", { clicks: 5, impressions: 100, ctr: 0.05, position: 2 }),
      ],
      queryRows: [
        queryRow(urlA, "2026-01-01", "seo pipeline"),
        queryRow(urlA, "2026-01-02", "idempotent sync"),
      ],
    });

    const result = await syncSearchPerformance(
      { startDate: "2026-01-01", endDate: "2026-01-31" },
      buildDeps(client)
    );

    expect(result).toEqual({ metrics: 2, queries: 2 });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: `sites/${ENCODED_SITE_URL}/searchAnalytics/query`,
      body: {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        dimensions: ["date", "page"],
        rowLimit: 25000,
      },
    });
    expect(calls[1]?.body).toMatchObject({
      dimensions: ["date", "page", "query"],
      rowLimit: 25000,
    });

    const metricRows = await db
      .select()
      .from(seoSearchMetrics)
      .where(inArray(seoSearchMetrics.url, [urlA, urlB]));
    expect(metricRows).toHaveLength(2);
    const byUrl = new Map(metricRows.map((row) => [row.url, row]));
    expect(byUrl.get(urlA)).toMatchObject({
      url: urlA,
      clicks: 12,
      impressions: 400,
      ctr: "0.03",
      position: "7.5",
    });
    expect(byUrl.get(urlB)).toMatchObject({
      clicks: 5,
      impressions: 100,
      ctr: "0.05",
      position: "2",
    });

    const queryRows = await db
      .select()
      .from(seoSearchQueries)
      .where(eq(seoSearchQueries.url, urlA));
    expect(queryRows).toHaveLength(2);
    expect(queryRows.map((row) => row.query).sort()).toEqual(["idempotent sync", "seo pipeline"]);
  }
);

testIfTables("re-sync overwrites the same buckets idempotently (no duplicate rows)", async () => {
  const urlA = track(fixtureUrl("idempotent"));
  const depsBuilder = (metricsRows: unknown[], queryRows: unknown[]) =>
    buildDeps(makeClient({ metricsRows, queryRows }).client);

  await syncSearchPerformance(
    { startDate: "2026-01-01", endDate: "2026-01-07" },
    depsBuilder([metricRow(urlA, "2026-01-01")], [queryRow(urlA, "2026-01-01", "rerun me")])
  );

  await syncSearchPerformance(
    { startDate: "2026-01-01", endDate: "2026-01-07" },
    depsBuilder(
      [metricRow(urlA, "2026-01-01", { clicks: 99, impressions: 999 })],
      [queryRow(urlA, "2026-01-01", "rerun me", { clicks: 77 })]
    )
  );

  const metricRows = await db.select().from(seoSearchMetrics).where(eq(seoSearchMetrics.url, urlA));
  expect(metricRows).toHaveLength(1);
  expect(metricRows[0]).toMatchObject({ clicks: 99, impressions: 999 });

  const queryRows = await db.select().from(seoSearchQueries).where(eq(seoSearchQueries.url, urlA));
  expect(queryRows).toHaveLength(1);
  expect(queryRows[0]).toMatchObject({ clicks: 77, query: "rerun me" });
});

test("syncSearchPerformance rejects an invalid window before any outbound call", async () => {
  const { client, calls } = makeClient({
    metricsRows: [metricRow("https://never.example/x", "2026-01-01")],
  });
  await expect(
    syncSearchPerformance({ startDate: "2024-02-30", endDate: "2026-01-31" }, buildDeps(client))
  ).rejects.toThrow("gsc_sync_window_invalid");
  await expect(syncSearchPerformance({ endDate: "2099-01-01" }, buildDeps(client))).rejects.toThrow(
    "gsc_sync_window_invalid"
  );
  expect(calls).toHaveLength(0);
});

test("syncSearchPerformance propagates client configuration errors", async () => {
  const deps: GscSyncDeps = {
    db,
    getGscClient: async () => {
      throw new Error("gsc_not_configured");
    },
    collectSitemapUrls: async () => [],
  };
  await expect(syncSearchPerformance({}, deps)).rejects.toThrow("gsc_not_configured");
});

testIfTables(
  "syncIndexedPages applies normalizeIndexingState and upserts seo_indexed_pages",
  async () => {
    const urlA = track(fixtureUrl("inspect-a"));
    const urlB = track(fixtureUrl("inspect-b"));
    const urlC = track(fixtureUrl("inspect-c"));
    const { client } = makeClient({
      inspections: [
        inspection(urlA, "INDEXED"),
        inspection(urlB, "not indexed", { coverageState: "Crawled - currently not indexed" }),
        inspection(urlC, "EXCLUDED", { verdict: "NEUTRAL", robotsTxtState: "DISALLOWED" }),
      ],
    });

    const result = await syncIndexedPages({}, buildDeps(client, [urlA, urlB, urlC]));
    expect(result).toEqual({ inspected: 3, skipped: 0, total: 3 });

    const rows = await db
      .select()
      .from(seoIndexedPages)
      .where(inArray(seoIndexedPages.url, [urlA, urlB, urlC]));
    expect(rows).toHaveLength(3);
    const byUrl = new Map(rows.map((row) => [row.url, row]));
    expect(byUrl.get(urlA)).toMatchObject({
      indexingState: "INDEXED",
      coverageState: "Submitted and indexed",
      verdict: "PASS",
      robotsState: "ALLOWED",
      googleCanonical: urlA,
    });
    expect(byUrl.get(urlB)?.indexingState).toBe("NOT_INDEXED");
    expect(byUrl.get(urlC)).toMatchObject({
      indexingState: "EXCLUDED",
      verdict: "NEUTRAL",
      robotsState: "DISALLOWED",
    });
  }
);

testIfTables(
  "syncIndexedPages inspects at most 50 URLs per run and clamps maxUrls",
  async () => {
    const urls = Array.from({ length: 60 }, (_, index) => track(fixtureUrl(`many-${index}`)));
    const { client, inspections } = makeClient({
      inspections: urls.map((url) => inspection(url, "INDEXED")),
    });

    const result = await syncIndexedPages({ maxUrls: 100 }, buildDeps(client, urls));
    expect(result).toEqual({ inspected: 50, skipped: 0, total: 50 });
    expect(inspections.count).toBe(50);

    const rows = await db.select().from(seoIndexedPages).where(inArray(seoIndexedPages.url, urls));
    expect(rows).toHaveLength(50);

    const { client: boundedClient, inspections: boundedInspections } = makeClient({
      inspections: [inspection(urls[0] ?? "", "INDEXED")],
    });
    const bounded = await syncIndexedPages({ maxUrls: 0 }, buildDeps(boundedClient, urls));
    expect(bounded).toEqual({ inspected: 1, skipped: 0, total: 1 });
    expect(boundedInspections.count).toBe(1);
  },
  30000
);

testIfTables("syncIndexedPages soft-skips the remainder on gsc_request_failed:429", async () => {
  const urls = Array.from({ length: 5 }, (_, index) => track(fixtureUrl(`quota-${index}`)));
  const quotaError = new Error("gsc_request_failed:429");
  const { client, inspections } = makeClient({
    inspections: [
      inspection(urls[0] ?? "", "INDEXED"),
      inspection(urls[1] ?? "", "INDEXED"),
      quotaError,
      inspection(urls[3] ?? "", "INDEXED"),
      inspection(urls[4] ?? "", "INDEXED"),
    ],
  });

  const result = await syncIndexedPages({ maxUrls: 5 }, buildDeps(client, urls));
  expect(result).toEqual({ inspected: 2, skipped: 3, total: 5 });
  expect(inspections.count).toBe(3);
});
