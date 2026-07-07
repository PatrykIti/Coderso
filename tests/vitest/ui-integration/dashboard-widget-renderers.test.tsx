// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

// TASK-480-04-L03 / 05-L03: the widget host dispatches through the exhaustive
// renderer registry and owns the cross-cutting states the registry does not
// (loading = no payload, error resolution, data/kind mismatch, ready). Each
// renderer must also survive its degenerate data edges (null storage limit →
// no limit bar, empty time series → no data points, unknown quick-action target
// → safe fallback link, content-query numeric cell → rendered as text). These
// assert VISIBLE effect (DOM/text), not mere presence.

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { DashboardWidgetHost } from "../../../core/admin/ui/dashboard/DashboardWidgetHost";
import { createDashboardWidget } from "../../../core/admin/ui/dashboard/widgetRegistry";
import type {
  DashboardWidget,
  DashboardWidgetResolution,
  DashboardWidgetType,
} from "../../../core/services/dashboard/dashboardTypes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Array<{ unmount: () => void; container: HTMLElement }> = [];

const makeWidget = (type: DashboardWidgetType, overrides: Partial<DashboardWidget> = {}) => ({
  ...createDashboardWidget(type, 0),
  ...overrides,
});

const mountHost = (widget: DashboardWidget, data?: DashboardWidgetResolution) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <DashboardWidgetHost widget={widget} data={data} editMode={false} />
      </AdminRouterProvider>
    );
  });
  roots.push({
    unmount: () => {
      React.act(() => root.unmount());
      container.remove();
    },
    container,
  });
  return container;
};

const text = (container: HTMLElement) => container.textContent ?? "";

afterEach(() => {
  while (roots.length) roots.pop()?.unmount();
});

// ---------------------------------------------------------------------------
// Host cross-cutting states
// ---------------------------------------------------------------------------

test("host renders the unavailable fallback when the payload is missing (loading)", () => {
  const container = mountHost(makeWidget("totals-counters"), undefined);
  expect(text(container)).toContain("This widget has no data for the current source.");
});

test("host renders the unavailable fallback for an error resolution", () => {
  const container = mountHost(makeWidget("content-query"), {
    type: "content-query",
    error: "widget_data_unavailable",
  });
  expect(text(container)).toContain("This widget has no data for the current source.");
});

test("host treats a data/kind mismatch as no payload (unavailable)", () => {
  // A `storage-usage` payload handed to a `totals-counters` widget must NOT be
  // rendered as counters; the host drops the mismatched payload to `undefined`.
  const container = mountHost(makeWidget("totals-counters"), {
    type: "storage-usage",
    usedBytes: 10,
    limitBytes: 100,
    usedPercent: 10,
  });
  expect(text(container)).toContain("This widget has no data for the current source.");
});

test("host renders the matching renderer in the ready state", () => {
  const container = mountHost(makeWidget("totals-counters"), {
    type: "totals-counters",
    counters: [{ key: "pages", label: "Total Pages", formatted: "1,234", value: 1234 }],
  });
  const body = text(container);
  expect(body).toContain("Total Pages");
  expect(body).toContain("1,234");
  expect(body).not.toContain("This widget has no data");
});

// ---------------------------------------------------------------------------
// Per-renderer: normal + empty + degenerate edge
// ---------------------------------------------------------------------------

test("totals-counters renders a stat per counter and nothing for an empty set", () => {
  const normal = mountHost(makeWidget("totals-counters"), {
    type: "totals-counters",
    counters: [
      { key: "pages", label: "Pages", formatted: "12", value: 12 },
      { key: "entries", label: "Entries", formatted: "34", value: 34 },
    ],
  });
  expect(text(normal)).toContain("Pages");
  expect(text(normal)).toContain("34");

  const empty = mountHost(makeWidget("totals-counters"), {
    type: "totals-counters",
    counters: [],
  });
  // Empty set: the grid renders but carries no stat labels/values.
  expect(text(empty)).not.toContain("Pages");
});

test("content-type-counts renders bars, the empty message, and a donut", () => {
  const bars = mountHost(makeWidget("content-type-counts"), {
    type: "content-type-counts",
    counts: [
      { id: "1", slug: "post", label: "Posts", count: 8 },
      { id: "2", slug: "page", label: "Pages", count: 2 },
    ],
  });
  expect(text(bars)).toContain("Posts");
  // Widest bar (count 8) is the 100% reference; the 2-count bar is 25% wide.
  const widths = Array.from(bars.querySelectorAll<HTMLElement>(".bg-primary")).map(
    (node) => node.style.width
  );
  expect(widths).toContain("100%");
  expect(widths).toContain("25%");

  const empty = mountHost(makeWidget("content-type-counts"), {
    type: "content-type-counts",
    counts: [],
  });
  expect(text(empty)).toContain("No content types yet.");

  const donut = mountHost(makeWidget("content-type-counts"), {
    type: "content-type-counts",
    counts: [{ id: "1", slug: "post", label: "Posts", count: 8 }],
    segments: [{ label: "Posts", value: 8, color: "#abcdef" }],
  });
  // Donut branch draws an SVG and a legend row for each segment.
  expect(donut.querySelector("svg")).not.toBeNull();
  expect(text(donut)).toContain("Posts");
});

test("content-over-time renders a chart with data and no data points for an empty series", () => {
  const area = mountHost(makeWidget("content-over-time"), {
    type: "content-over-time",
    variant: "area",
    categories: ["2026-01-01", "2026-01-02", "2026-01-03"],
    series: [{ id: "created", label: "Created", points: [1, 4, 2] }],
  });
  expect(text(area)).toContain("Created");
  // Area chart marks the final point with a <circle>; with data there is one.
  expect(area.querySelectorAll("circle").length).toBeGreaterThan(0);

  const emptySeries = mountHost(makeWidget("content-over-time"), {
    type: "content-over-time",
    variant: "area",
    categories: ["2026-01-01"],
    series: [{ id: "created", label: "Created", points: [] }],
  });
  // Degenerate empty series: the SVG still renders but plots no data points.
  expect(emptySeries.querySelector("svg")).not.toBeNull();
  expect(emptySeries.querySelectorAll("circle").length).toBe(0);
  // The series legend badge is still shown.
  expect(text(emptySeries)).toContain("Created");

  const bar = mountHost(makeWidget("content-over-time"), {
    type: "content-over-time",
    variant: "bar",
    categories: ["2026-01-01", "2026-01-02"],
    series: [{ id: "created", label: "Created", points: [3, 6] }],
  });
  // Bar variant renders one bar per point (tallest = 100% height).
  const heights = Array.from(bar.querySelectorAll<HTMLElement>(".bg-primary\\/80")).map(
    (node) => node.style.height
  );
  expect(heights).toContain("100%");
});

test("recent-activity renders rows and the empty message", () => {
  const rows = mountHost(makeWidget("recent-activity"), {
    type: "recent-activity",
    items: [
      {
        id: "a",
        type: "page",
        title: "Homepage",
        path: "/",
        status: "published",
        updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
        author: { id: null, name: "Alex", email: null },
      },
    ],
  });
  expect(text(rows)).toContain("Homepage");

  const empty = mountHost(makeWidget("recent-activity"), {
    type: "recent-activity",
    items: [],
  });
  expect(text(empty)).toContain("No recent edits yet.");
});

test("storage-usage shows a percentage with a limit and 'no limit' when the limit is null", () => {
  const withLimit = mountHost(makeWidget("storage-usage"), {
    type: "storage-usage",
    usedBytes: 512,
    limitBytes: 1024,
    usedPercent: 50,
  });
  expect(text(withLimit)).toContain("50%");
  expect(text(withLimit)).toContain("of 1 KB");

  const noLimit = mountHost(makeWidget("storage-usage"), {
    type: "storage-usage",
    usedBytes: 512,
    limitBytes: null,
    usedPercent: null,
  });
  // Degenerate: null limit → shows "no limit", never a "of <limit>" bar caption.
  expect(text(noLimit)).toContain("no limit");
  expect(text(noLimit)).not.toContain(" of ");
});

test("site-health renders storage + security bars and handles a null storage percent", () => {
  const normal = mountHost(makeWidget("site-health"), {
    type: "site-health",
    storage: { usedPercent: 40 },
    security: {
      status: "warning",
      issues: 1,
      checks: [
        { id: "csrf", label: "CSRF", status: "ok", detail: "ok" },
        { id: "headers", label: "Headers", status: "warning", detail: "weak" },
      ],
    },
  });
  expect(text(normal)).toContain("40%");
  // 2 checks, 1 issue → 50% security score.
  expect(text(normal)).toContain("50%");

  const noLimit = mountHost(makeWidget("site-health"), {
    type: "site-health",
    storage: { usedPercent: null },
    security: { status: "ok", issues: 0, checks: [] },
  });
  // Degenerate: null storage percent → "No limit"; empty checks → 100% security.
  expect(text(noLimit)).toContain("No limit");
  expect(text(noLimit)).toContain("100%");
});

test("security-summary renders checks and falls back to an empty summary when unset", () => {
  const withData = mountHost(makeWidget("security-summary"), {
    type: "security-summary",
    security: {
      status: "warning",
      issues: 2,
      checks: [{ id: "rateLimit", label: "Rate limiting", status: "warning", detail: "loose" }],
    },
  });
  expect(text(withData)).toContain("2 issues detected.");
  expect(text(withData)).toContain("Rate limiting");

  const undefinedData = mountHost(makeWidget("security-summary"), undefined);
  // Renderer synthesizes an empty ok-summary rather than the host fallback.
  expect(text(undefinedData)).toContain("All checks passed.");
  expect(text(undefinedData)).toContain("No security checks reported.");
});

test("quick-actions renders a link per action; an unknown target falls back safely", () => {
  const container = mountHost(makeWidget("quick-actions"), {
    type: "quick-actions",
    actions: [
      { id: "a", label: "Open Pages", target: "pages" },
      { id: "b", label: "Open Dashboard", target: "dashboard" },
      // Degenerate: a target outside the known enum must not crash and must
      // resolve to the same safe fallback the dashboard target uses.
      { id: "c", label: "Mystery", target: "totally-bogus" as never },
    ],
  });
  const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));
  const byLabel = (label: string) => links.find((a) => a.textContent?.includes(label));
  const pages = byLabel("Open Pages");
  const dashboard = byLabel("Open Dashboard");
  const mystery = byLabel("Mystery");
  expect(pages).toBeDefined();
  expect(dashboard).toBeDefined();
  expect(mystery).toBeDefined();
  // Unknown target collapses onto the dashboard fallback href, distinct from a
  // real content route like /pages.
  expect(mystery?.getAttribute("href")).toBe(dashboard?.getAttribute("href"));
  expect(mystery?.getAttribute("href")).not.toBe(pages?.getAttribute("href"));
});

test("content-query renders a numeric cell as text, a status badge, and the empty message", () => {
  const rows = mountHost(makeWidget("content-query"), {
    type: "content-query",
    columns: [
      { key: "title", label: "Title" },
      { key: "views", label: "Views" },
      { key: "status", label: "Status" },
    ],
    rows: [{ title: "First Post", views: 42, status: "published" }],
  });
  const body = text(rows);
  expect(body).toContain("First Post");
  // Degenerate: a numeric cell is stringified for display, not dropped.
  expect(body).toContain("42");
  // The status column routes through StatusBadge (capitalized label).
  expect(rows.querySelector('[class*="capitalize"]')?.textContent?.toLowerCase()).toContain(
    "published"
  );

  const empty = mountHost(makeWidget("content-query"), {
    type: "content-query",
    columns: [{ key: "title", label: "Title" }],
    rows: [],
  });
  expect(text(empty)).toContain("No matching entries.");
});
