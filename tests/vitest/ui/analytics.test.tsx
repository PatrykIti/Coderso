// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

type TrafficTotals = {
  pageviews: number;
  visitors: number;
  sessions: number;
  bounceRate: number;
  avgPagesPerSession: number;
};

const emptyTotals = (): TrafficTotals => ({
  pageviews: 0,
  visitors: 0,
  sessions: 0,
  bounceRate: 0,
  avgPagesPerSession: 0,
});

const makeOverview = (overrides?: {
  totals?: Partial<TrafficTotals>;
  previous?: Partial<TrafficTotals>;
  trend?: { date: string; value: number }[];
  topPages?: { path: string; views: number; visitors: number }[];
}) => ({
  rangeDays: 30,
  generatedAt: "2026-06-01T00:00:00.000Z",
  totals: { ...emptyTotals(), ...overrides?.totals },
  previous: { ...emptyTotals(), ...overrides?.previous },
  trend: overrides?.trend ?? [],
  sources: [],
  devices: [],
  referrers: [],
  topPages: overrides?.topPages ?? [],
});

const analyticsState = vi.hoisted(() => ({
  overviewResult: {
    rangeDays: 30,
    generatedAt: "2026-06-01T00:00:00.000Z",
    totals: {
      pageviews: 0,
      visitors: 0,
      sessions: 0,
      bounceRate: 0,
      avgPagesPerSession: 0,
    },
    previous: {
      pageviews: 0,
      visitors: 0,
      sessions: 0,
      bounceRate: 0,
      avgPagesPerSession: 0,
    },
    trend: [] as { date: string; value: number }[],
    sources: [] as { key: string; label: string; value: number }[],
    devices: [] as { key: string; label: string; value: number }[],
    referrers: [] as { key: string; label: string; value: number }[],
    topPages: [] as { path: string; views: number; visitors: number }[],
  },
  topPagesResult: [] as Array<{ path: string; views: number; visitors: number }>,
  nextOverviewError: null as unknown,
  getTrafficOverview: vi.fn(async (rangeDays: number) => {
    if (analyticsState.nextOverviewError) {
      const error = analyticsState.nextOverviewError;
      analyticsState.nextOverviewError = null;
      throw error;
    }
    return { ...analyticsState.overviewResult, rangeDays };
  }),
  getTopPages: vi.fn(async () => analyticsState.topPagesResult),
  exportTopPages: vi.fn(async () => ({
    fileName: "traffic.csv",
    contentType: "text/csv",
    content: "path,views,visitors",
    rangeDays: 30,
    totalRows: 0,
  })),
  reset() {
    analyticsState.overviewResult = {
      rangeDays: 30,
      generatedAt: "2026-06-01T00:00:00.000Z",
      totals: {
        pageviews: 0,
        visitors: 0,
        sessions: 0,
        bounceRate: 0,
        avgPagesPerSession: 0,
      },
      previous: {
        pageviews: 0,
        visitors: 0,
        sessions: 0,
        bounceRate: 0,
        avgPagesPerSession: 0,
      },
      trend: [],
      sources: [],
      devices: [],
      referrers: [],
      topPages: [],
    };
    analyticsState.topPagesResult = [];
    analyticsState.nextOverviewError = null;
    analyticsState.getTrafficOverview.mockClear();
    analyticsState.getTopPages.mockClear();
    analyticsState.exportTopPages.mockClear();
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/analyticsClient", () => ({
  getTrafficOverview: analyticsState.getTrafficOverview,
  getTrafficOverviewCached: analyticsState.getTrafficOverview,
  getCachedTrafficOverview: vi.fn(() => null),
  getTopPages: analyticsState.getTopPages,
  getTopPagesCached: analyticsState.getTopPages,
  getCachedTopPages: vi.fn(() => null),
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
      <option value="90">Last 90 days</option>
      <option value="ytd">Year to date</option>
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
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  ),
}));

import {
  AnalyticsPage,
  buildTrafficKpiCards,
} from "../../../core/admin/ui/analytics/AnalyticsPage";

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

const flushAsync = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  analyticsState.reset();
});

test("AnalyticsPage renders loading shell before client data resolves", () => {
  const html = renderAdminUi(<AnalyticsPage />);

  expect(html).toContain("Analytics Overview");
  expect(html).toContain("Loading analytics...");
});

test("buildTrafficKpiCards renders zeroed, new, and delta states", () => {
  const emptyCards = buildTrafficKpiCards(makeOverview());
  expect(emptyCards.map((card) => card.id)).toEqual([
    "visitors",
    "pageviews",
    "sessions",
    "bounce",
  ]);
  expect(emptyCards.map((card) => card.value)).toEqual(["0", "0", "0", "0%"]);
  expect(emptyCards.every((card) => card.change === "No activity in range")).toBe(true);
  expect(emptyCards.every((card) => card.trend === "neutral")).toBe(true);

  const deltaCards = buildTrafficKpiCards(
    makeOverview({
      totals: { visitors: 10, pageviews: 20, sessions: 8, bounceRate: 0.25 },
      previous: { visitors: 5, pageviews: 10, sessions: 4, bounceRate: 0.5 },
    })
  );
  expect(deltaCards[0]?.value).toBe("10");
  expect(deltaCards[0]?.change).toBe("100%");
  expect(deltaCards[0]?.trend).toBe("up");
  expect(deltaCards[3]?.value).toBe("25%");

  const newCards = buildTrafficKpiCards(
    makeOverview({ totals: { visitors: 5 }, previous: { visitors: 0 } })
  );
  expect(newCards[0]?.change).toBe("New");
  expect(newCards[0]?.trend).toBe("up");
});

test("AnalyticsPage requests range-scoped Top Pages and clears stale rows after reload failure", async () => {
  analyticsState.overviewResult = makeOverview({
    totals: { visitors: 12, pageviews: 30 },
    previous: { visitors: 6, pageviews: 15 },
    topPages: [{ path: "/home", views: 42, visitors: 30 }],
  });
  analyticsState.topPagesResult = [{ path: "/home", views: 42, visitors: 30 }];

  const view = mount(<AnalyticsPage />);

  try {
    await flushAsync();
    expect(view.container.textContent).toContain("/home");
    expect(analyticsState.getTopPages).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, rangeDays: 30 })
    );

    analyticsState.nextOverviewError = new Error("network");
    const select = view.container.querySelector<HTMLSelectElement>(
      'select[aria-label="Analytics range"]'
    );

    React.act(() => {
      if (!select) throw new Error("missing_range_select");
      select.value = "7";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("Loading analytics...");

    await flushAsync();
    expect(analyticsState.getTopPages).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 50, rangeDays: 7 })
    );
    expect(view.container.textContent).toContain("Analytics unavailable");
    expect(view.container.textContent).not.toContain("/home");
  } finally {
    view.cleanup();
  }
});
