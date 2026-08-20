/**
 * Vitest lane (Bun-free): pure aggregation over fixture rows for the
 * TASK-493-04-L01 SEO performance service.
 *
 * No `db/client` or runtime adapters are imported at module load: fixtures are
 * injected directly into the exported pure helpers (`aggregateOverview`,
 * `aggregateSearchPerformance`, `attachDocumentPerformance`).
 */
import { describe, expect, test } from "vitest";

import {
  DEFAULT_TOP_QUERIES,
  MAX_TOP_QUERIES,
  aggregateOverview,
  aggregateSearchPerformance,
  attachDocumentPerformance,
} from "../../../core/services/seo/seoPerformanceService";
import {
  seoIndexingStates,
  type SeoIndexedPage,
  type SeoSearchMetricPoint,
  type SeoSearchQueryRow,
  type SeoSitemapSubmissionRow,
} from "../../../core/services/seo/seoSearchPerformanceTypes";
import type { SeoListItem } from "../../../core/services/seo/seoTypes";

const indexedPage = (overrides: Partial<SeoIndexedPage> = {}): SeoIndexedPage => ({
  url: "https://example.com/about",
  targetType: "page",
  targetId: "page-1",
  indexingState: "INDEXED",
  coverageState: "Submitted and indexed",
  verdict: "PASS",
  lastCrawledAt: new Date("2026-07-01T00:00:00.000Z"),
  ...overrides,
});

const metricPoint = (overrides: Partial<SeoSearchMetricPoint> = {}): SeoSearchMetricPoint => ({
  url: "https://example.com/about",
  date: new Date("2026-07-01T00:00:00.000Z"),
  clicks: 5,
  impressions: 100,
  ctr: 0.05,
  position: 3,
  ...overrides,
});

const queryRow = (overrides: Partial<SeoSearchQueryRow> = {}): SeoSearchQueryRow => ({
  url: "https://example.com/about",
  query: "coderso cms",
  clicks: 5,
  impressions: 100,
  ctr: 0.05,
  position: 3,
  ...overrides,
});

const sitemapRow = (overrides: Partial<SeoSitemapSubmissionRow> = {}): SeoSitemapSubmissionRow => ({
  sitemapUrl: "/sitemap.xml",
  source: "google",
  status: "submitted",
  urlCount: 42,
  warnings: 0,
  errors: 0,
  lastSubmittedAt: new Date("2026-07-10T00:00:00.000Z"),
  lastErrorMessage: null,
  ...overrides,
});

const listItem = (overrides: Partial<SeoListItem> = {}): SeoListItem => ({
  id: "doc-1",
  targetType: "page",
  targetId: "page-1",
  slug: "/about",
  title: "About",
  description: "About us",
  canonicalUrl: "https://example.com/about",
  robots: "index,follow",
  score: 85,
  status: "ok",
  issues: [],
  lastAuditAt: new Date("2026-07-01T00:00:00.000Z"),
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-02T00:00:00.000Z"),
  targetTitle: "About",
  ...overrides,
});

describe("aggregateOverview", () => {
  test("counts INDEXED vs NOT_INDEXED pages and reports the row total", () => {
    const overview = aggregateOverview({
      indexed: [
        indexedPage({ url: "https://example.com/a", indexingState: "INDEXED" }),
        indexedPage({ url: "https://example.com/b", indexingState: "INDEXED" }),
        indexedPage({ url: "https://example.com/c", indexingState: "NOT_INDEXED" }),
        indexedPage({ url: "https://example.com/d", indexingState: "EXCLUDED" }),
        indexedPage({ url: "https://example.com/e", indexingState: "UNKNOWN" }),
      ],
      metrics: [],
      avgScore: 60,
    });
    expect(overview.indexedPages).toBe(2);
    expect(overview.notIndexedPages).toBe(1);
    expect(overview.totalPages).toBe(5);
  });

  test("normalizes raw GSC coverage strings into enum members before counting", () => {
    const rawPage = {
      ...indexedPage({ url: "https://example.com/c" }),
      indexingState: "Crawled - currently not indexed",
    } as unknown as SeoIndexedPage;
    const overview = aggregateOverview({
      indexed: [indexedPage(), rawPage],
      metrics: [],
      avgScore: 0,
    });
    expect(overview.indexedPages).toBe(1);
    expect(overview.notIndexedPages).toBe(1);
  });

  test("sums clicks/impressions via toNumber (numeric-string columns coerced)", () => {
    const metrics: SeoSearchMetricPoint[] = [
      metricPoint({ clicks: 5, impressions: 100 }),
      {
        url: "https://example.com/contact",
        date: new Date("2026-07-01T00:00:00.000Z"),
        clicks: "2",
        impressions: "50",
        ctr: "0.04",
        position: "5",
      } as unknown as SeoSearchMetricPoint,
    ];
    const overview = aggregateOverview({ indexed: [], metrics, avgScore: 0 });
    expect(overview.totalClicks).toBe(7);
    expect(overview.totalImpressions).toBe(150);
  });

  test("computes CTR and impressions-weighted average position", () => {
    const metrics = [
      metricPoint({ clicks: 5, impressions: 100, position: 3 }),
      metricPoint({ url: "https://example.com/contact", clicks: 2, impressions: 50, position: 5 }),
    ];
    const overview = aggregateOverview({ indexed: [], metrics, avgScore: 0 });
    expect(overview.totalClicks).toBe(7);
    expect(overview.totalImpressions).toBe(150);
    expect(overview.averageCtr).toBeCloseTo(7 / 150, 10);
    // (3*100 + 5*50) / 150
    expect(overview.averagePosition).toBeCloseTo((3 * 100 + 5 * 50) / 150, 10);
  });

  test("carries the average meta score through unchanged", () => {
    const overview = aggregateOverview({ indexed: [], metrics: [], avgScore: 66.66666666666667 });
    expect(overview.averageScore).toBeCloseTo(66.66666666666667, 10);
  });

  test("maps the latest sitemap submission row", () => {
    const overview = aggregateOverview({
      indexed: [],
      metrics: [],
      sitemap: sitemapRow({ status: "error", urlCount: 7 }),
      avgScore: 0,
    });
    expect(overview.sitemap).toEqual({
      status: "error",
      urlCount: 7,
      lastSubmittedAt: new Date("2026-07-10T00:00:00.000Z"),
    });
  });

  test("empty input yields zeroed totals and a null sitemap (never throws)", () => {
    const overview = aggregateOverview({ indexed: [], metrics: [], avgScore: 0 });
    expect(overview).toEqual({
      indexedPages: 0,
      totalPages: 0,
      notIndexedPages: 0,
      totalImpressions: 0,
      totalClicks: 0,
      averageCtr: 0,
      averagePosition: 0,
      averageScore: 0,
      sitemap: { status: null, urlCount: null, lastSubmittedAt: null },
    });
  });
});

describe("aggregateSearchPerformance", () => {
  const range = { startDate: "2026-07-01", endDate: "2026-07-28" };

  test("orders the date series ascending and merges same-day rows", () => {
    const performance = aggregateSearchPerformance({
      metrics: [
        metricPoint({ date: new Date("2026-07-03T00:00:00.000Z"), clicks: 3, impressions: 30 }),
        metricPoint({ date: new Date("2026-07-01T00:00:00.000Z"), clicks: 5, impressions: 100 }),
        metricPoint({ date: new Date("2026-07-02T00:00:00.000Z"), clicks: 1, impressions: 10 }),
        metricPoint({ date: new Date("2026-07-01T00:00:00.000Z"), clicks: 2, impressions: 20 }),
      ],
      queries: [],
      range,
    });
    expect(performance.series.map((point) => point.date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
    expect(performance.series[0]).toEqual({ date: "2026-07-01", clicks: 7, impressions: 120 });
    expect(performance.series[1]).toEqual({ date: "2026-07-02", clicks: 1, impressions: 10 });
    expect(performance.series[2]).toEqual({ date: "2026-07-03", clicks: 3, impressions: 30 });
  });

  test("folds totals, CTR, and impressions-weighted position", () => {
    const performance = aggregateSearchPerformance({
      metrics: [
        metricPoint({ clicks: 5, impressions: 100, position: 3 }),
        metricPoint({
          url: "https://example.com/contact",
          clicks: 2,
          impressions: 50,
          position: 5,
        }),
      ],
      queries: [],
      range,
    });
    expect(performance.totals.totalClicks).toBe(7);
    expect(performance.totals.totalImpressions).toBe(150);
    expect(performance.totals.averageCtr).toBeCloseTo(7 / 150, 10);
    expect(performance.totals.averagePosition).toBeCloseTo((3 * 100 + 5 * 50) / 150, 10);
  });

  test("truncates top queries to the requested limit, ranked by clicks", () => {
    const performance = aggregateSearchPerformance({
      metrics: [],
      queries: [
        queryRow({ query: "seo audit", clicks: 3, impressions: 30 }),
        queryRow({ query: "coderso cms", clicks: 5, impressions: 100 }),
        queryRow({ query: "page builder", clicks: 1, impressions: 10 }),
      ],
      range,
      limit: 2,
    });
    expect(performance.topQueries.map((query) => query.query)).toEqual([
      "coderso cms",
      "seo audit",
    ]);
  });

  test("breaks click ties by impressions descending, then query ascending", () => {
    const performance = aggregateSearchPerformance({
      metrics: [],
      queries: [
        queryRow({ query: "zeta", clicks: 5, impressions: 30 }),
        queryRow({ query: "alpha", clicks: 5, impressions: 100 }),
        queryRow({ query: "beta", clicks: 5, impressions: 100 }),
      ],
      range,
      limit: 3,
    });
    expect(performance.topQueries.map((query) => query.query)).toEqual(["alpha", "beta", "zeta"]);
  });

  test("coerces numeric-string columns via toNumber and aggregates per query", () => {
    const performance = aggregateSearchPerformance({
      metrics: [],
      queries: [
        {
          url: "https://example.com/about",
          query: "coderso cms",
          clicks: "4",
          impressions: "80",
          ctr: "0.05",
          position: "3",
        } as unknown as SeoSearchQueryRow,
        {
          ...queryRow({ query: "coderso cms", clicks: 6, impressions: 120, position: 7 }),
        } as unknown as SeoSearchQueryRow,
      ],
      range,
      limit: 5,
    });
    expect(performance.topQueries).toHaveLength(1);
    expect(performance.topQueries[0].query).toBe("coderso cms");
    expect(performance.topQueries[0].clicks).toBe(10);
    expect(performance.topQueries[0].impressions).toBe(200);
    expect(performance.topQueries[0].ctr).toBeCloseTo(10 / 200, 10);
    // (3*80 + 7*120) / 200
    expect(performance.topQueries[0].position).toBeCloseTo((3 * 80 + 7 * 120) / 200, 10);
  });

  test("defaults the top-query limit and clamps out-of-range limits", () => {
    const manyQueries = Array.from({ length: 120 }, (_, index) =>
      queryRow({ query: `query-${String(index).padStart(3, "0")}`, clicks: index + 1 })
    );
    expect(
      aggregateSearchPerformance({ metrics: [], queries: manyQueries, range }).topQueries
    ).toHaveLength(DEFAULT_TOP_QUERIES);
    expect(
      aggregateSearchPerformance({ metrics: [], queries: manyQueries, range, limit: 500 })
        .topQueries
    ).toHaveLength(MAX_TOP_QUERIES);
    expect(
      aggregateSearchPerformance({ metrics: [], queries: manyQueries, range, limit: 0 }).topQueries
    ).toHaveLength(1);
  });

  test("empty input yields zeroed totals, empty series/queries, and passes the range through", () => {
    const performance = aggregateSearchPerformance({ metrics: [], queries: [], range });
    expect(performance.range).toEqual(range);
    expect(performance.totals).toEqual({
      totalImpressions: 0,
      totalClicks: 0,
      averageCtr: 0,
      averagePosition: 0,
    });
    expect(performance.series).toEqual([]);
    expect(performance.topQueries).toEqual([]);
  });
});

describe("attachDocumentPerformance", () => {
  test("documents without index rows carry explicit performance: null", () => {
    const items = attachDocumentPerformance({
      documents: [listItem({ slug: "/orphan" })],
      indexed: [],
      metrics: [],
    });
    expect(items).toHaveLength(1);
    expect("performance" in items[0]).toBe(true);
    expect(items[0].performance).toBeNull();
  });

  test("preserves SeoIndexingState enum values when matched by target key", () => {
    const items = attachDocumentPerformance({
      documents: [listItem()],
      indexed: [indexedPage({ indexingState: "NOT_INDEXED" })],
      metrics: [],
    });
    expect(items[0].performance).not.toBeNull();
    expect(items[0].performance?.indexingState).toBe("NOT_INDEXED");
    expect(seoIndexingStates).toContain(items[0].performance?.indexingState);
  });

  test("normalizes leaked raw strings so no plain string escapes", () => {
    const rawPage = {
      ...indexedPage({ url: "https://example.com/about" }),
      indexingState: "Crawled - currently not indexed",
    } as unknown as SeoIndexedPage;
    const items = attachDocumentPerformance({
      documents: [listItem()],
      indexed: [rawPage],
      metrics: [],
    });
    expect(items[0].performance?.indexingState).toBe("NOT_INDEXED");
    expect(seoIndexingStates).toContain(items[0].performance?.indexingState);
  });

  test("joins by URL/slug path when the indexed page has no target key", () => {
    const items = attachDocumentPerformance({
      documents: [listItem({ slug: "/contact", canonicalUrl: null, targetId: "page-9" })],
      indexed: [
        indexedPage({
          url: "https://example.com/contact/",
          targetType: null,
          targetId: null,
          indexingState: "INDEXED",
        }),
      ],
      metrics: [],
    });
    expect(items[0].performance).not.toBeNull();
    expect(items[0].performance?.indexingState).toBe("INDEXED");
  });

  test("sums metric rows across every matching path for a document", () => {
    const items = attachDocumentPerformance({
      documents: [listItem()],
      indexed: [indexedPage()],
      metrics: [
        metricPoint({ clicks: 5, impressions: 100, position: 3 }),
        metricPoint({ clicks: 2, impressions: 50, position: 5 }),
      ],
    });
    expect(items[0].performance).toEqual({
      indexingState: "INDEXED",
      impressions: 150,
      clicks: 7,
      ctr: 7 / 150,
      position: (3 * 100 + 5 * 50) / 150,
    });
  });

  test("matched documents without metric rows report zeroed performance", () => {
    const items = attachDocumentPerformance({
      documents: [listItem()],
      indexed: [indexedPage()],
      metrics: [],
    });
    expect(items[0].performance).toEqual({
      indexingState: "INDEXED",
      impressions: 0,
      clicks: 0,
      ctr: 0,
      position: 0,
    });
  });
});
