import { expect, test } from "vitest";

import {
  resolveDashboardWidgets,
  type DashboardDataReaders,
} from "../../../core/services/dashboard/dashboardDataSources";
import type { TrafficOverview } from "../../../core/services/analytics/trafficAggregationTypes";
import type { DashboardLayout } from "../../../core/services/dashboard/dashboardTypes";

const trafficOverview: TrafficOverview = {
  rangeDays: 30,
  generatedAt: "2026-07-05T00:00:00.000Z",
  totals: {
    pageviews: 100,
    visitors: 40,
    sessions: 50,
    bounceRate: 0.25,
    avgPagesPerSession: 2,
  },
  previous: {
    pageviews: 80,
    visitors: 35,
    sessions: 45,
    bounceRate: 0.3,
    avgPagesPerSession: 1.8,
  },
  trend: [
    { date: "2026-07-01", value: 30 },
    { date: "2026-07-02", value: 70 },
  ],
  sources: [],
  devices: [],
  referrers: [],
  topPages: [],
};

const readers: DashboardDataReaders = {
  totals: async () => ({ pages: 1, entries: 2, media: 3, users: 4 }),
  recentEdits: async () => [],
  storage: async () => ({ usedBytes: 1024, limitBytes: null, usedPercent: null }),
  securitySummary: async () => ({ status: "ok", issues: 0, checks: [] }),
  contentTypeCounts: async () => [],
  contentOverTime: async () => [],
  contentQuery: async () => [],
  trafficOverview: async () => trafficOverview,
};

test("resolveDashboardWidgets reuses traffic overview for traffic counter widgets", async () => {
  const layout: DashboardLayout = {
    version: 1,
    widgets: [
      {
        id: "traffic",
        type: "totals-counters",
        title: "Traffic",
        config: {
          kind: "totals-counters",
          source: "traffic",
          metrics: ["visitors", "pageviews", "bounceRate"],
          rangeDays: 30,
        },
        position: { x: 0, y: 0, w: 12, h: 1 },
      },
    ],
  };

  const [result] = await resolveDashboardWidgets(layout, readers);

  expect(result).toMatchObject({
    type: "totals-counters",
    counters: [
      { key: "visitors", value: 40, delta: { trend: "up" } },
      { key: "pageviews", value: 100, delta: { trend: "up" }, spark: [30, 70] },
      { key: "bounceRate", value: 0.25, formatted: "25%", delta: { trend: "down" } },
    ],
  });
});

test("resolveDashboardWidgets returns unavailable state for failed readers", async () => {
  const layout: DashboardLayout = {
    version: 1,
    widgets: [
      {
        id: "bad",
        type: "content-type-counts",
        config: { kind: "content-type-counts", limit: 5, display: "list" },
        position: { x: 0, y: 0, w: 4, h: 2 },
      },
    ],
  };

  const [result] = await resolveDashboardWidgets(layout, {
    ...readers,
    contentTypeCounts: async () => {
      throw new Error("database unavailable");
    },
  });

  expect(result).toEqual({ type: "content-type-counts", error: "widget_data_unavailable" });
});
