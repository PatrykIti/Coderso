// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

const makeOverview = (overrides?: {
  totals?: Partial<{
    pages: number;
    publishedPages: number;
    entries: number;
    media: number;
    users: number;
  }>;
  current?: Partial<{
    pages: number;
    publishedPages: number;
    entries: number;
    media: number;
    users: number;
  }>;
  previous?: Partial<{
    pages: number;
    publishedPages: number;
    entries: number;
    media: number;
    users: number;
  }>;
}) => ({
  rangeDays: 30,
  generatedAt: "2026-06-01T00:00:00.000Z",
  totals: {
    pages: 0,
    publishedPages: 0,
    entries: 0,
    media: 0,
    users: 0,
    ...overrides?.totals,
  },
  current: {
    pages: 0,
    publishedPages: 0,
    entries: 0,
    media: 0,
    users: 0,
    ...overrides?.current,
  },
  previous: {
    pages: 0,
    publishedPages: 0,
    entries: 0,
    media: 0,
    users: 0,
    ...overrides?.previous,
  },
  trend: [],
});

const analyticsState = vi.hoisted(() => ({
  overviewResult: {
    rangeDays: 30,
    generatedAt: "2026-06-01T00:00:00.000Z",
    totals: { pages: 0, publishedPages: 0, entries: 0, media: 0, users: 0 },
    current: { pages: 0, publishedPages: 0, entries: 0, media: 0, users: 0 },
    previous: { pages: 0, publishedPages: 0, entries: 0, media: 0, users: 0 },
    trend: [],
  },
  topContentResult: [] as Array<{
    id: string;
    type: "page" | "entry";
    title: string;
    slug: string | null;
    updatedAt: string;
    score: number;
  }>,
  nextOverviewError: null as unknown,
  getOverview: vi.fn(async (rangeDays: number) => {
    if (analyticsState.nextOverviewError) {
      const error = analyticsState.nextOverviewError;
      analyticsState.nextOverviewError = null;
      throw error;
    }
    return { ...analyticsState.overviewResult, rangeDays };
  }),
  getTopContent: vi.fn(async () => analyticsState.topContentResult),
  exportTopContent: vi.fn(async () => ({
    fileName: "analytics.csv",
    contentType: "text/csv",
    content: "type,title,slug,updatedAt,score",
    rangeDays: 30,
    totalRows: 0,
  })),
  reset() {
    analyticsState.overviewResult = {
      rangeDays: 30,
      generatedAt: "2026-06-01T00:00:00.000Z",
      totals: { pages: 0, publishedPages: 0, entries: 0, media: 0, users: 0 },
      current: { pages: 0, publishedPages: 0, entries: 0, media: 0, users: 0 },
      previous: { pages: 0, publishedPages: 0, entries: 0, media: 0, users: 0 },
      trend: [],
    };
    analyticsState.topContentResult = [];
    analyticsState.nextOverviewError = null;
    analyticsState.getOverview.mockClear();
    analyticsState.getTopContent.mockClear();
    analyticsState.exportTopContent.mockClear();
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/analyticsClient", () => ({
  getOverview: analyticsState.getOverview,
  getTopContent: analyticsState.getTopContent,
  exportTopContent: analyticsState.exportTopContent,
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
  buildAnalyticsKpiCards,
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

test("buildAnalyticsKpiCards renders no-data and no-period states without fake percentages", () => {
  const emptyCards = buildAnalyticsKpiCards(makeOverview());
  expect(emptyCards.map((card) => card.value)).toEqual(["-", "-", "-"]);
  expect(emptyCards.map((card) => card.change)).toEqual([
    "No data yet",
    "No data yet",
    "No data yet",
  ]);
  expect(emptyCards.every((card) => card.trend === "neutral")).toBe(true);

  const quietCards = buildAnalyticsKpiCards(
    makeOverview({
      totals: { pages: 4, publishedPages: 2, entries: 3, media: 1 },
    })
  );
  expect(quietCards.map((card) => card.change)).toEqual([
    "No activity in range",
    "No activity in range",
    "No activity in range",
  ]);

  const newDataCards = buildAnalyticsKpiCards(
    makeOverview({
      totals: { publishedPages: 1 },
      current: { publishedPages: 1 },
    })
  );
  expect(newDataCards[0]?.change).toBe("New");
  expect(newDataCards[0]?.trend).toBe("up");
});

test("AnalyticsPage requests range-scoped Top Content and clears stale rows after reload failure", async () => {
  analyticsState.overviewResult = makeOverview({
    totals: { pages: 1, publishedPages: 1 },
    current: { publishedPages: 1 },
  });
  analyticsState.topContentResult = [
    {
      id: "page-1",
      type: "page",
      title: "Homepage",
      slug: "home",
      updatedAt: "2026-06-01T00:00:00.000Z",
      score: 100,
    },
  ];

  const view = mount(<AnalyticsPage />);

  try {
    await flushAsync();
    expect(view.container.textContent).toContain("Homepage");
    expect(analyticsState.getTopContent).toHaveBeenCalledWith({ limit: 50, rangeDays: 30 });

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
    expect(analyticsState.getTopContent).toHaveBeenLastCalledWith({ limit: 50, rangeDays: 7 });
    expect(view.container.textContent).toContain("Analytics unavailable");
    expect(view.container.textContent).not.toContain("Homepage");
  } finally {
    view.cleanup();
  }
});
