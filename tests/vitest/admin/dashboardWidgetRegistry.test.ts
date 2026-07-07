import { expect, test } from "vitest";

import {
  DASHBOARD_WIDGET_CATALOG,
  DASHBOARD_WIDGET_RENDERERS,
  createDashboardWidget,
  dashboardWidgetCatalog,
  getDashboardWidgetDescriptor,
  getWidgetRenderer,
  isWidgetDataEmpty,
} from "../../../core/admin/ui/dashboard/widgetRegistry";
import { DASHBOARD_WIDGET_TYPES } from "../../../core/services/dashboard/dashboardTypes";
import type { DashboardWidgetData } from "../../../core/services/dashboard/dashboardTypes";
import { normalizeDashboardWidgetConfig } from "../../../core/services/dashboard/dashboardWidgetContract";

const sortedTypes = [...DASHBOARD_WIDGET_TYPES].sort();

const CONFIGURABLE_TYPES = new Set([
  "totals-counters",
  "content-type-counts",
  "content-over-time",
  "recent-activity",
  "quick-actions",
  "content-query",
]);

test("renderer registry is exhaustive over the widget-type enum", () => {
  expect(Object.keys(DASHBOARD_WIDGET_RENDERERS).sort()).toEqual(sortedTypes);
  for (const type of DASHBOARD_WIDGET_TYPES) {
    expect(typeof DASHBOARD_WIDGET_RENDERERS[type]).toBe("function");
    expect(getWidgetRenderer(type)).toBe(DASHBOARD_WIDGET_RENDERERS[type]);
  }
});

test("catalog is exhaustive and each entry is self-consistent", () => {
  expect(Object.keys(DASHBOARD_WIDGET_CATALOG).sort()).toEqual(sortedTypes);
  expect(dashboardWidgetCatalog.map((entry) => entry.type)).toEqual([...DASHBOARD_WIDGET_TYPES]);
  for (const type of DASHBOARD_WIDGET_TYPES) {
    const entry = DASHBOARD_WIDGET_CATALOG[type];
    expect(entry.type).toBe(type);
    expect(entry.label.length).toBeGreaterThan(0);
    expect(entry.description.length).toBeGreaterThan(0);
    expect(entry.icon).toBeTruthy();
    expect(entry.defaultConfig.kind).toBe(type);
    expect(entry.defaultLayout.w).toBeGreaterThanOrEqual(1);
    expect(entry.defaultLayout.h).toBeGreaterThanOrEqual(1);
    expect(getDashboardWidgetDescriptor(type)).toBe(entry);
  }
});

test("configFields descriptors exist per configurable type and match the config schema", () => {
  for (const type of DASHBOARD_WIDGET_TYPES) {
    const entry = DASHBOARD_WIDGET_CATALOG[type];
    expect(Array.isArray(entry.configFields)).toBe(true);
    if (CONFIGURABLE_TYPES.has(type)) {
      expect(entry.configFields.length).toBeGreaterThan(0);
    } else {
      // storage-usage / site-health / security-summary carry only `kind`.
      expect(entry.configFields.length).toBe(0);
    }

    const base = entry.defaultConfig as Record<string, unknown>;
    for (const field of entry.configFields) {
      // Static select options must round-trip through the schema owner: setting
      // the descriptor's declared value yields exactly that value — this fails
      // loudly if a control drifts from the contract enum.
      if (field.control === "select" && Array.isArray(field.options)) {
        for (const option of field.options) {
          const config = normalizeDashboardWidgetConfig(type, {
            ...base,
            [field.key]: option.value,
          });
          expect((config as Record<string, unknown>)[field.key]).toBe(option.value);
        }
      }
      if (field.control === "multiselect" && Array.isArray(field.options)) {
        const values = field.options.map((option) => option.value);
        const config = normalizeDashboardWidgetConfig(type, { ...base, [field.key]: values });
        expect((config as Record<string, unknown>)[field.key]).toEqual(values);
      }
      if (field.control === "slider" || field.control === "number") {
        expect(field.max).toBeGreaterThanOrEqual(field.min);
      }
    }
  }
});

test("createDashboardWidget clones catalog defaults with the given y", () => {
  const widget = createDashboardWidget("content-query", 5);
  expect(widget.type).toBe("content-query");
  expect(widget.config.kind).toBe("content-query");
  expect(widget.position.y).toBe(5);
  expect(widget.position.w).toBe(DASHBOARD_WIDGET_CATALOG["content-query"].defaultLayout.w);
  // Config must be a clone, not a shared reference with the catalog default.
  expect(widget.config).not.toBe(DASHBOARD_WIDGET_CATALOG["content-query"].defaultConfig);
});

test("isWidgetDataEmpty is true only for empty list-shaped data", () => {
  const cases: { data: DashboardWidgetData; empty: boolean }[] = [
    { data: { type: "recent-activity", items: [] }, empty: true },
    {
      data: {
        type: "recent-activity",
        items: [
          {
            id: "a",
            type: "page",
            title: "Home",
            path: "/",
            status: "published",
            updatedAt: new Date().toISOString(),
            author: { id: null, name: null, email: null },
          },
        ],
      },
      empty: false,
    },
    { data: { type: "content-type-counts", counts: [] }, empty: true },
    {
      data: {
        type: "content-type-counts",
        counts: [{ id: "1", slug: "post", label: "Post", count: 3 }],
      },
      empty: false,
    },
    { data: { type: "content-query", columns: [], rows: [] }, empty: true },
    {
      data: { type: "content-query", columns: [{ key: "t", label: "T" }], rows: [{ t: "x" }] },
      empty: false,
    },
    { data: { type: "quick-actions", actions: [] }, empty: true },
    {
      data: { type: "quick-actions", actions: [{ id: "a", label: "Pages", target: "pages" }] },
      empty: false,
    },
    {
      data: {
        type: "content-over-time",
        variant: "area",
        categories: ["a"],
        series: [{ id: "s", label: "S", points: [] }],
      },
      empty: true,
    },
    {
      data: {
        type: "content-over-time",
        variant: "area",
        categories: ["a"],
        series: [{ id: "s", label: "S", points: [1] }],
      },
      empty: false,
    },
    { data: { type: "totals-counters", counters: [] }, empty: false },
    {
      data: { type: "storage-usage", usedBytes: 0, limitBytes: null, usedPercent: null },
      empty: false,
    },
    {
      data: {
        type: "site-health",
        security: { status: "ok", issues: 0, checks: [] },
        storage: { usedPercent: null },
      },
      empty: false,
    },
    {
      data: { type: "security-summary", security: { status: "ok", issues: 0, checks: [] } },
      empty: false,
    },
  ];

  for (const { data, empty } of cases) {
    expect(isWidgetDataEmpty(data)).toBe(empty);
  }
});
