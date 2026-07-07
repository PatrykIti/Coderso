import { expect, test } from "vitest";

import type { DashboardDataReaders } from "../../../core/services/dashboard/dashboardDataSources";
import { resolveWidgetDataBatch as resolveBatch } from "../../../core/services/dashboard/dashboardWidgetData";

const readers: DashboardDataReaders = {
  totals: async () => ({ pages: 3, entries: 2, media: 1, users: 1 }),
  recentEdits: async () => [],
  storage: async () => ({ usedBytes: 0, limitBytes: null, usedPercent: null }),
  securitySummary: async () => ({ status: "ok", issues: 0, checks: [] }),
  contentTypeCounts: async () => [],
  contentOverTime: async () => [],
  contentQuery: async () => [],
  trafficOverview: async () => ({
    rangeDays: 30,
    generatedAt: "2026-07-05T00:00:00.000Z",
    totals: { pageviews: 0, visitors: 0, sessions: 0, bounceRate: 0, avgPagesPerSession: 0 },
    previous: { pageviews: 0, visitors: 0, sessions: 0, bounceRate: 0, avgPagesPerSession: 0 },
    trend: [],
    sources: [],
    devices: [],
    referrers: [],
    topPages: [],
  }),
};

test("resolveWidgetDataBatch normalizes draft widgets and preserves ids", async () => {
  const result = await resolveBatch(
    {
      widgets: [
        {
          id: "draft-totals",
          type: "totals-counters",
          config: { kind: "totals-counters", source: "cms", metrics: ["pages", "entries"] },
        },
      ],
    },
    readers
  );

  expect(result.widgets[0]?.id).toBe("draft-totals");
  expect(result.widgets[0]?.data).toMatchObject({
    type: "totals-counters",
    counters: [
      { key: "pages", value: 3 },
      { key: "entries", value: 2 },
    ],
  });
});

test("resolveWidgetDataBatch rejects unknown request fields", async () => {
  await expect(
    resolveBatch({
      widgets: [{ id: "x", type: "storage-usage", extra: true }],
    })
  ).rejects.toThrow("dashboard_layout_invalid");
});
