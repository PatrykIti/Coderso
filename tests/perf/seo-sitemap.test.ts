// TASK-493-06-L01: SEO sitemap + overview performance gates (Bun lane).
//
// Locks the two hot SEO read paths to a response-time budget:
//
// - Pure benchmarks over `buildSitemapXml` (the XML emission for /sitemap.xml)
//   and `aggregateOverview` (the folding math behind /seo/overview) at 2000
//   seeded URLs/rows. These are deterministic and never flaky; budgets are
//   generous and overridable with `readBudget`-style env vars (the repo perf
//   convention from `tests/perf/admin-request-baseline.test.ts`).
// - DB-gated real-path measurements: /sitemap.xml at 50 seeded published URLs
//   and the GET /seo/overview route handler at 200 indexed/metric rows, each
//   with a warm-up call and a generous wall-clock budget. Both are skipped
//   when the 0079 tables are unavailable and only ever touch rows this file
//   creates.
import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../core/db/client";
import { pages, seoIndexedPages, seoSearchMetrics } from "../../core/db/schema";
import { registerSeoRoutes } from "../../core/server/routes/seoRoutes";
import { validate } from "../../core/server/validation/schemaValidator";
import { aggregateOverview } from "../../core/services/seo/seoPerformanceService";
import { buildSitemapXml, type SitemapEntry } from "../../core/services/seo/sitemapService";
import {
  insertPublishedLegacyPage,
  requestPublicPath,
  testIfDb,
} from "../integration/runtime/pages-runtime-test-support";

const percentile = (values: number[], target: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil((target / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
};

const readBudget = (envKey: string, fallback: number) => {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasDbAndTables = hasDb && (await hasSeoTables());
const testIfTables = hasDbAndTables ? test : test.skip;
// Bun's `test` typing does not expose the `{ timeout }` options argument; the
// repo pattern casts a named variant (see pages-runtime-test-support).
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const testIfTablesWithOptions = testIfTables as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

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
    await db.execute(sql`select 1 from seo_search_metrics limit 1`);
    return true;
  } catch {
    return false;
  }
}

// ---- fixtures owned by this file -----------------------------------------

const SITEMAP_ORIGIN = "http://perf-sitemap.test";
const OVERVIEW_URL_PREFIX = "https://perf-overview.example";
const cleanedOverviewUrls = new Set<string>();
// Legacy pages created through `insertPublishedLegacyPage` are tracked by the
// support module, but that module's `afterEach` does not reliably attach to
// every test file when several files share it in one process. This file owns
// the rows it creates.
const cleanedPageIds = new Set<string>();

const makeSitemapEntries = (count: number): SitemapEntry[] => {
  const entries: SitemapEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    entries.push({
      loc: `/page-${index}`,
      lastmod: `2026-07-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    });
  }
  return entries;
};

const makeIndexedRows = (count: number) => {
  const indexed: Array<typeof seoIndexedPages.$inferInsert> = [];
  const metrics: Array<typeof seoSearchMetrics.$inferInsert> = [];
  for (let index = 0; index < count; index += 1) {
    const url = `${OVERVIEW_URL_PREFIX}/page-${index}`;
    cleanedOverviewUrls.add(url);
    indexed.push({
      url,
      targetType: index % 2 === 0 ? "page" : "entry",
      indexingState: index % 3 === 0 ? "INDEXED" : "NOT_INDEXED",
      verdict: "PASS",
      syncedAt: new Date(),
    });
    metrics.push({
      url,
      date: new Date(Date.UTC(2026, 6, 1 + (index % 28))),
      clicks: index % 11,
      impressions: 100 + index,
      ctr: "0.05",
      position: "8.5",
      syncedAt: new Date(),
    });
  }
  return { indexed, metrics };
};

afterEach(async () => {
  // The support module already clears the site cache and restores settings;
  // this file owns both the overview fixture rows and the legacy pages it
  // inserts directly (their cleanup cannot rely on the shared module hook).
  if (hasDbAndTables) {
    const urls = [...cleanedOverviewUrls];
    if (urls.length > 0) {
      await db.delete(seoSearchMetrics).where(inArray(seoSearchMetrics.url, urls));
      await db.delete(seoIndexedPages).where(inArray(seoIndexedPages.url, urls));
      cleanedOverviewUrls.clear();
    }
    const pageIds = [...cleanedPageIds];
    if (pageIds.length > 0) {
      await db.delete(pages).where(inArray(pages.id, pageIds));
      cleanedPageIds.clear();
    }
  }
});

// ---- pure, deterministic gates -------------------------------------------

test("buildSitemapXml stays within budget at 2000 URLs", () => {
  const budgetMs = readBudget("CODERSO_PERF_SITEMAP_BUILD_P95_MS", 150);
  const entries = makeSitemapEntries(2000);

  // Warm up JIT/allocator paths, then measure.
  buildSitemapXml(entries.slice(0, 20), SITEMAP_ORIGIN);
  const samples: number[] = [];
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const started = performance.now();
    buildSitemapXml(entries, SITEMAP_ORIGIN);
    samples.push(performance.now() - started);
  }

  const p95 = percentile(samples, 95);
  expect(p95).toBeLessThan(budgetMs);
  // Sanity: the emitted document really contains the 2000 URLs (a no-op
  // implementation would trivially pass the budget).
  const xml = buildSitemapXml(entries, SITEMAP_ORIGIN);
  expect((xml.match(/<url>/g) ?? []).length).toBe(2000);
});

test("aggregateOverview stays within budget at 2000 indexed pages and 2000 metric rows", () => {
  const budgetMs = readBudget("CODERSO_PERF_OVERVIEW_AGG_P95_MS", 150);
  const { indexed, metrics } = makeIndexedRows(2000);
  const input = {
    indexed: indexed.map((row, index) => ({
      url: row.url ?? "",
      targetType: row.targetType as "page" | "entry" | null,
      targetId: null,
      indexingState: row.indexingState as "INDEXED" | "NOT_INDEXED" | "EXCLUDED" | "UNKNOWN",
      coverageState: null,
      verdict: row.verdict ?? null,
      lastCrawledAt: null,
    })),
    metrics: metrics.map((row) => ({
      url: row.url ?? "",
      date: row.date as Date,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: 0.05,
      position: 8.5,
    })),
    avgScore: 87,
  };

  aggregateOverview({ ...input, sitemap: null });
  const samples: number[] = [];
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const started = performance.now();
    aggregateOverview({ ...input, sitemap: null });
    samples.push(performance.now() - started);
  }

  const p95 = percentile(samples, 95);
  expect(p95).toBeLessThan(budgetMs);
});

// ---- real-path, DB-gated gates -------------------------------------------

testIfDbWithOptions(
  "GET /sitemap.xml serves 50 seeded published URLs within budget",
  async () => {
    const budgetMs = readBudget("CODERSO_PERF_SITEMAP_REQUEST_MS", 8000);
    const token = randomUUID().slice(0, 8);
    for (let index = 0; index < 50; index += 1) {
      const created = await insertPublishedLegacyPage({
        title: `Sitemap Perf ${token} ${index}`,
        slug: `/perf-sitemap-${token}-${index}`,
        data: { schemaVersion: 2, sections: [] },
      });
      cleanedPageIds.add(created.id);
    }

    // Warm-up: first request pays connection-pool and settings warmup.
    await requestPublicPath("/sitemap.xml");
    const samples: number[] = [];
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const started = performance.now();
      const response = await requestPublicPath("/sitemap.xml");
      const elapsed = performance.now() - started;
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain(`/perf-sitemap-${token}-0`);
      samples.push(elapsed);
    }

    expect(percentile(samples, 95)).toBeLessThan(budgetMs);
  },
  { timeout: 60_000 }
);

testIfTablesWithOptions(
  "GET /seo/overview stays within budget at 200 indexed/metric rows",
  async () => {
    const budgetMs = readBudget("CODERSO_PERF_OVERVIEW_REQUEST_MS", 5000);
    const { indexed, metrics } = makeIndexedRows(200);
    await db.insert(seoIndexedPages).values(indexed);
    await db.insert(seoSearchMetrics).values(metrics);

    // Real route wiring: registerSeoRoutes with the production validator and
    // the real default service deps (DB-backed reads).
    const routes: Array<{
      method: string;
      path: string;
      handlers: Array<
        (ctx: {
          params: Record<string, string>;
          query: Record<string, string | undefined>;
          body: unknown;
        }) => Promise<unknown> | unknown
      >;
    }> = [];
    registerSeoRoutes(
      {
        get: (path, ...handlers) => routes.push({ method: "GET", path, handlers }),
        post: (path, ...handlers) => routes.push({ method: "POST", path, handlers }),
        patch: (path, ...handlers) => routes.push({ method: "PATCH", path, handlers }),
      },
      { requirePermission: () => async () => undefined, validate }
    );
    const overviewRoute = routes.find(
      (route) => route.method === "GET" && route.path === "/seo/overview"
    );
    const handler = overviewRoute?.handlers.at(-1);
    if (!handler) throw new Error("missing_overview_route");

    // Warm-up, then measure the real handler (DB reads + aggregation).
    await handler({ params: {}, query: {}, body: null });
    const samples: number[] = [];
    for (let iteration = 0; iteration < 5; iteration += 1) {
      const started = performance.now();
      const result = await handler({ params: {}, query: {}, body: null });
      expect(result).toMatchObject({ totalPages: 200, totalImpressions: expect.any(Number) });
      samples.push(performance.now() - started);
    }

    expect(percentile(samples, 95)).toBeLessThan(budgetMs);
  },
  { timeout: 60_000 }
);
