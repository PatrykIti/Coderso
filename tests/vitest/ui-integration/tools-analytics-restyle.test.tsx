// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-479-26-L07: structural lock for the Analytics restyle (L03). Asserts the
// KPI StatCards (the three real buildAnalyticsKpiCards metrics), the area "Traffic"
// + "Top pages" cards bound to seeded series, and the preserved range Select +
// top-content drawer — with the unbacked Sources donut asserted ABSENT.

const overview = {
  rangeDays: 30,
  generatedAt: "2026-06-01T00:00:00.000Z",
  totals: { pages: 12, publishedPages: 9, entries: 24, media: 36, users: 5 },
  current: { pages: 4, publishedPages: 3, entries: 6, media: 9, users: 1 },
  previous: { pages: 2, publishedPages: 2, entries: 4, media: 6, users: 1 },
  trend: [
    { date: "Mar 1", value: 4 },
    { date: "Mar 7", value: 9 },
  ],
};

const topContent = [
  {
    id: "page-1",
    type: "page" as const,
    title: "Homepage",
    slug: "home",
    updatedAt: "2026-06-01T00:00:00.000Z",
    score: 80,
  },
];

const analyticsState = vi.hoisted(() => ({
  getCachedOverview: vi.fn(),
  getCachedTopContent: vi.fn(),
  exportTopContent: vi.fn(async () => ({
    fileName: "analytics.csv",
    contentType: "text/csv",
    content: "type,title",
    rangeDays: 30,
    totalRows: 0,
  })),
}));

vi.mock("@/services/analyticsClient", () => ({
  getCachedOverview: analyticsState.getCachedOverview,
  getOverviewCached: vi.fn(async () => overview),
  getCachedTopContent: analyticsState.getCachedTopContent,
  getTopContentCached: vi.fn(async () => topContent),
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
  analyticsState.getCachedOverview.mockReset();
  analyticsState.getCachedTopContent.mockReset();
  analyticsState.exportTopContent.mockClear();
  document.body.innerHTML = "";
});

test("renders KPI cards + area/bar cards from seeded analytics (no Sources donut)", async () => {
  analyticsState.getCachedOverview.mockReturnValue(overview);
  analyticsState.getCachedTopContent.mockReturnValue(topContent);

  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    // KPI labels come from buildAnalyticsKpiCards (real metrics), NOT "Visitors".
    expect(view.container.textContent).toContain("Published Pages");
    expect(view.container.textContent).not.toContain("Visitors");
    // Traffic area card + seeded trend labels.
    expect(view.container.textContent).toMatch(/traffic/i);
    expect(view.container.textContent).toContain("Mar 1");
    // Top pages bound to the derived topPages series.
    expect(view.container.textContent).toContain("/home");
    // Dropped, unbacked surfaces are absent.
    expect(view.container.textContent).not.toMatch(/\bsources\b/i);
    expect(view.container.textContent).not.toMatch(/bounce/i);
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

test("the top-content View all action opens the TopContentDrawer", async () => {
  analyticsState.getCachedOverview.mockReturnValue(overview);
  analyticsState.getCachedTopContent.mockReturnValue(topContent);

  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Homepage");
    const viewAll = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("View all")
    );
    React.act(() => {
      viewAll?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(
      document.body.querySelector('button[aria-label="Close top content drawer"]')
    ).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("a seeded analytics error surfaces the destructive Alert", async () => {
  analyticsState.getCachedOverview.mockReturnValue(null);
  analyticsState.getCachedTopContent.mockReturnValue(null);
  const failing = await import("@/services/analyticsClient");
  vi.spyOn(failing, "getOverviewCached").mockRejectedValueOnce(new Error("analytics down"));

  const view = mount(<AnalyticsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Analytics unavailable");
  } finally {
    view.cleanup();
  }
});
