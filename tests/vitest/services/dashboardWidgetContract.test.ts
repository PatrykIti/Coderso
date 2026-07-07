import { expect, test } from "vitest";

import {
  DASHBOARD_LAYOUT_INVALID,
  DASHBOARD_MAX_WIDGETS,
  DEFAULT_DASHBOARD_LAYOUT,
  adaptLegacyDashboardLayout,
  normalizeDashboardLayout,
  normalizeDashboardWidgetConfig,
} from "../../../core/services/dashboard/dashboardWidgetContract";

test("normalizeDashboardLayout rejects unknown keys and over-limit widgets", () => {
  expect(() =>
    normalizeDashboardLayout({
      version: 1,
      widgets: [
        {
          id: "one",
          type: "storage-usage",
          config: { kind: "storage-usage" },
          position: { x: 0, y: 0, w: 4, h: 2 },
          extra: true,
        },
      ],
    })
  ).toThrow(DASHBOARD_LAYOUT_INVALID);

  expect(() =>
    normalizeDashboardLayout({
      version: 1,
      widgets: Array.from({ length: DASHBOARD_MAX_WIDGETS + 1 }, (_entry, index) => ({
        id: `widget-${index}`,
        type: "storage-usage",
        config: { kind: "storage-usage" },
        position: { x: 0, y: index, w: 4, h: 2 },
      })),
    })
  ).toThrow(DASHBOARD_LAYOUT_INVALID);
});

test("normalizeDashboardWidgetConfig filters traffic and cms counter metrics by source", () => {
  expect(
    normalizeDashboardWidgetConfig("totals-counters", {
      kind: "totals-counters",
      source: "traffic",
      metrics: ["pages", "visitors", "pageviews"],
    })
  ).toMatchObject({
    source: "traffic",
    metrics: ["visitors", "pageviews"],
  });

  expect(
    normalizeDashboardWidgetConfig("totals-counters", {
      kind: "totals-counters",
      source: "cms",
      metrics: ["visitors", "pages", "entries"],
    })
  ).toMatchObject({
    source: "cms",
    metrics: ["pages", "entries"],
  });
});

test("adaptLegacyDashboardLayout defaults corrupt stored layouts without mutating the default", () => {
  const adapted = adaptLegacyDashboardLayout({ widgets: [{ bad: true }] });

  expect(adapted).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  adapted.widgets[0]!.title = "Changed";
  expect(DEFAULT_DASHBOARD_LAYOUT.widgets[0]!.title).toBe("Overview");
});
