// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-483-05-L02: structural lock for the traffic Analytics rewire. Asserts the
// four real traffic KPI StatCards (visitors / pageviews / sessions / bounce), the
// area "Traffic" + "Top pages" cards bound to seeded traffic series, the new
// sources / devices / referrers breakdown visuals, and the preserved range
// Select + top-pages drawer.

const overview = {
  rangeDays: 30,
  generatedAt: "2026-06-01T00:00:00.000Z",
  totals: {
    pageviews: 120,
    visitors: 80,
    sessions: 96,
    bounceRate: 0.32,
    avgPagesPerSession: 1.25,
  },
  previous: {
    pageviews: 60,
    visitors: 40,
    sessions: 48,
    bounceRate: 0.5,
    avgPagesPerSession: 1.25,
  },
  trend: [
    { date: "Mar 1", value: 4 },
    { date: "Mar 7", value: 9 },
  ],
  sources: [{ key: "direct", label: "Direct", value: 50 }],
  devices: [{ key: "desktop", label: "Desktop", value: 70 }],
  referrers: [{ key: "example.com", label: "example.com", value: 12 }],
  topPages: [{ path: "/home", views: 42, visitors: 30 }],
};

const topPages = [{ path: "/home", views: 42, visitors: 30 }];

const analyticsState = vi.hoisted(() => ({
  getCachedTrafficOverview: vi.fn(),
  getCachedTopPages: vi.fn(),
  exportTopPages: vi.fn(async () => ({
    fileName: "traffic.csv",
    contentType: "text/csv",
    content: "path,views,visitors",
    rangeDays: 30,
    totalRows: 0,
  })),
}));

vi.mock("@/services/analyticsClient", () => ({
  getCachedTrafficOverview: analyticsState.getCachedTrafficOverview,
  getTrafficOverviewCached: vi.fn(async () => overview),
  getCachedTopPages: analyticsState.getCachedTopPages,
  getTopPagesCached: vi.fn(async () => topPages),
  exportTopPages: analyticsState.exportTopPages,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <select
      aria-label="Analytics range"
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      <option value="7">Last 7 days</option>
      <option value="30">Last 30 days</option>
    </select>
  ),
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    topbarActions,
  }: {
    children: React.ReactNode;
    topbarActions?: React.ReactNode;
  }) => (
    <main>
      {topbarActions}
      {children}
    </main>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}));

import { AnalyticsPage } from "../../../core/admin/ui/analytics/AnalyticsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  analyticsState.getCachedTrafficOverview.mockReset();
  analyticsState.getCachedTopPages.mockReset();
  analyticsState.exportTopPages.mockClear();
  document.body.innerHTML = "";
});

test("renders traffic KPI cards + area/bar cards + breakdowns from seeded analytics", async () => {
  analyticsState.getCachedTrafficOverview.mockReturnValue(overview);
  analyticsState.getCachedTopPages.mockReturnValue(topPages);

  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    // Traffic KPI labels come from buildTrafficKpiCards (real metrics).
    expect(view.container.textContent).toContain("Unique Visitors");
    expect(view.container.textContent).toMatch(/bounce/i);
    // Traffic area card + seeded trend labels.
    expect(view.container.textContent).toMatch(/traffic/i);
    expect(view.container.textContent).toContain("Mar 1");
    // Top pages bound to the seeded traffic topPages series.
    expect(view.container.textContent).toContain("/home");
    // New source / device / referrer breakdown visuals render.
    expect(view.container.textContent).toContain("Sources");
    expect(view.container.textContent).toContain("Devices");
    expect(view.container.textContent).toContain("Referrers");
    // Preserved range Select + Export action.
    expect(view.container.querySelector('select[aria-label="Analytics range"]')).not.toBeNull();
    expect(
      Array.from(view.container.querySelectorAll("button")).some((button) =>
        button.textContent?.includes("Export")
      )
    ).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("the top-pages View all action opens the TopPagesDrawer", async () => {
  analyticsState.getCachedTrafficOverview.mockReturnValue(overview);
  analyticsState.getCachedTopPages.mockReturnValue(topPages);

  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("/home");
    const viewAll = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("View all")
    );
    React.act(() => {
      viewAll?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(
      document.body.querySelector('button[aria-label="Close top pages drawer"]')
    ).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("a seeded analytics error surfaces the destructive Alert", async () => {
  analyticsState.getCachedTrafficOverview.mockReturnValue(null);
  analyticsState.getCachedTopPages.mockReturnValue(null);
  const failing = await import("@/services/analyticsClient");
  vi.spyOn(failing, "getTrafficOverviewCached").mockRejectedValueOnce(new Error("analytics down"));

  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Analytics unavailable");
  } finally {
    view.cleanup();
  }
});
