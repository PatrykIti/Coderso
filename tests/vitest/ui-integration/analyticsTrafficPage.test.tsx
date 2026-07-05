// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

// TASK-483-05-L02: render flow for the traffic-rewired Analytics page with a
// mocked traffic client — KPIs, real top-pages view counts, CSV export, and the
// error path.

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

const topPages = [
  { path: "/home", views: 42, visitors: 30 },
  { path: "/pricing", views: 18, visitors: 14 },
];

const analyticsState = vi.hoisted(() => ({
  getCachedTrafficOverview: vi.fn(() => null),
  getCachedTopPages: vi.fn(() => null),
  getTrafficOverviewCached: vi.fn(async () => overview),
  getTopPagesCached: vi.fn(async () => topPages),
  exportTopPages: vi.fn(async () => ({
    fileName: "traffic.csv",
    contentType: "text/csv",
    content: "path,views,visitors",
    rangeDays: 30,
    totalRows: 0,
  })),
  reset() {
    analyticsState.getCachedTrafficOverview.mockReset();
    analyticsState.getCachedTrafficOverview.mockReturnValue(null);
    analyticsState.getCachedTopPages.mockReset();
    analyticsState.getCachedTopPages.mockReturnValue(null);
    analyticsState.getTrafficOverviewCached.mockClear();
    analyticsState.getTrafficOverviewCached.mockImplementation(async () => overview);
    analyticsState.getTopPagesCached.mockClear();
    analyticsState.getTopPagesCached.mockImplementation(async () => topPages);
    analyticsState.exportTopPages.mockClear();
  },
}));

vi.mock("@/services/analyticsClient", () => ({
  getCachedTrafficOverview: analyticsState.getCachedTrafficOverview,
  getTrafficOverviewCached: analyticsState.getTrafficOverviewCached,
  getCachedTopPages: analyticsState.getCachedTopPages,
  getTopPagesCached: analyticsState.getTopPagesCached,
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

beforeEach(() => {
  analyticsState.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("renders visitor/pageview/session/bounce KPIs from traffic overview", async () => {
  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Unique Visitors");
    expect(view.container.textContent).toContain("Pageviews");
    expect(view.container.textContent).toContain("Sessions");
    expect(view.container.textContent).toContain("Bounce Rate");
    // Real KPI values rendered from totals.
    expect(view.container.textContent).toContain("80");
    expect(view.container.textContent).toContain("32%");
  } finally {
    view.cleanup();
  }
});

test("top-pages table shows real view counts (not computeScore)", async () => {
  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("/pricing");
    expect(view.container.textContent).toContain("18");
    // No activity-score percentage from the old content-inventory table.
    expect(view.container.textContent).not.toContain("score");
  } finally {
    view.cleanup();
  }
});

test("export button calls exportTopPages", async () => {
  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    const exportButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Export")
    );
    React.act(() => {
      exportButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(analyticsState.exportTopPages).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, rangeDays: 30 })
    );
  } finally {
    view.cleanup();
  }
});

test("refresh button forces a fresh data refetch (bypasses the SPA cache)", async () => {
  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    analyticsState.getTrafficOverviewCached.mockClear();
    analyticsState.getTopPagesCached.mockClear();
    const refreshButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Refresh")
    );
    expect(refreshButton).toBeTruthy();
    React.act(() => {
      refreshButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(analyticsState.getTrafficOverviewCached).toHaveBeenCalledWith(30, { force: true });
    expect(analyticsState.getTopPagesCached).toHaveBeenCalledWith(
      expect.objectContaining({ rangeDays: 30, force: true })
    );
  } finally {
    view.cleanup();
  }
});

test("api error shows Alert", async () => {
  analyticsState.getTrafficOverviewCached.mockRejectedValueOnce(new Error("boom"));
  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Analytics unavailable");
  } finally {
    view.cleanup();
  }
});
