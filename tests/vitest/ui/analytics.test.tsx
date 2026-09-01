// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";
import { ApiClientError } from "../../../core/admin/services/apiClient";
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
  cachedOverview: vi.fn<() => ReturnType<typeof makeOverview> | null>(() => null),
  cachedTopPages: vi.fn<() => { path: string; views: number; visitors: number }[] | null>(
    () => null
  ),
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
    analyticsState.cachedOverview.mockReset();
    analyticsState.cachedOverview.mockImplementation(() => null);
    analyticsState.cachedTopPages.mockReset();
    analyticsState.cachedTopPages.mockImplementation(() => null);
    analyticsState.getTrafficOverview.mockClear();
    analyticsState.getTopPages.mockClear();
    analyticsState.exportTopPages.mockClear();
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/analyticsClient", () => ({
  getTrafficOverview: analyticsState.getTrafficOverview,
  getTrafficOverviewCached: analyticsState.getTrafficOverview,
  getCachedTrafficOverview: analyticsState.cachedOverview,
  getTopPages: analyticsState.getTopPages,
  getTopPagesCached: analyticsState.getTopPages,
  getCachedTopPages: analyticsState.cachedTopPages,
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
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
    </header>
  ),
}));

// TopPagesDrawer renders through the real Radix Sheet which portals content to
// document.body outside the test container. Mock the Sheet surface (as the
// access-logs suites do) so drawer assertions can read rendered text from the
// same container the page is mounted into.
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

import {
  AnalyticsPage,
  buildTrafficKpiCards,
} from "../../../core/admin/ui/analytics/AnalyticsPage";
import { TopPagesDrawer } from "../../../core/admin/ui/analytics/TopPagesDrawer";

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

function clickButton(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${text}`);
  }
  React.act(() => {
    button.click();
  });
}

// The PageHeader now renders its actions (Refresh / Export) which share the
// label "Export" with the TopPagesDrawer footer button. The drawer renders
// after the page content in DOM order, so drawer-driven assertions must target
// the LAST matching button rather than the PageHeader action.
function clickLastButton(container: HTMLElement, text: string) {
  const buttons = Array.from(container.querySelectorAll("button")).filter(
    (candidate) => candidate.textContent?.trim() === text
  );
  const button = buttons.at(-1);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing last button ${text}`);
  }
  React.act(() => {
    button.click();
  });
}

function changeRange(container: HTMLElement, value: string) {
  const select = container.querySelector<HTMLSelectElement>('select[aria-label="Analytics range"]');
  if (!select) throw new Error("missing_range_select");
  React.act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

test("AnalyticsPage forces fresh client calls on refresh and exports scoped top pages", async () => {
  const view = mount(<AnalyticsPage />);

  try {
    await flushAsync();
    expect(view.container.textContent).not.toContain("/refreshed");

    analyticsState.overviewResult = makeOverview({
      totals: { visitors: 21, pageviews: 55, sessions: 11, bounceRate: 0.4 },
      previous: { visitors: 20 },
      topPages: [{ path: "/refreshed", views: 9, visitors: 7 }],
    });
    analyticsState.topPagesResult = [{ path: "/refreshed", views: 9, visitors: 7 }];

    clickButton(view.container, "Refresh");
    await flushAsync();

    expect(analyticsState.getTrafficOverview).toHaveBeenLastCalledWith(30, { force: true });
    expect(analyticsState.getTopPages).toHaveBeenLastCalledWith({
      limit: 50,
      rangeDays: 30,
      force: true,
    });
    expect(view.container.textContent).toContain("/refreshed");
    expect(view.container.textContent).toContain("Unique Visitors");

    clickButton(view.container, "Export");
    await flushAsync();
    expect(analyticsState.exportTopPages).toHaveBeenCalledWith({ limit: 50, rangeDays: 30 });
  } finally {
    view.cleanup();
  }
});

test("AnalyticsPage reports refresh failures through the destructive alert", async () => {
  analyticsState.overviewResult = makeOverview({
    totals: { visitors: 12 },
    topPages: [{ path: "/home", views: 1, visitors: 1 }],
  });
  analyticsState.topPagesResult = [{ path: "/home", views: 1, visitors: 1 }];
  const view = mount(<AnalyticsPage />);

  try {
    await flushAsync();
    expect(view.container.textContent).toContain("/home");
    expect(view.container.textContent).toContain("Unique Visitors");

    analyticsState.nextOverviewError = new ApiClientError(
      "analytics_down",
      "Analytics service offline",
      503
    );
    clickButton(view.container, "Refresh");
    await flushAsync();

    expect(view.container.textContent).toContain("Analytics unavailable");
    expect(view.container.textContent).toContain("Analytics service offline");
    expect(view.container.textContent).not.toContain("/home");
    expect(view.container.textContent).not.toContain("Unique Visitors");
  } finally {
    view.cleanup();
  }
});

test("AnalyticsPage serves cached ranges instantly and forces uncached ones", async () => {
  const view = mount(<AnalyticsPage />);

  try {
    await flushAsync();

    analyticsState.cachedOverview.mockReturnValue(
      makeOverview({
        totals: { visitors: 77 },
        topPages: [{ path: "/cached", views: 5, visitors: 3 }],
      })
    );
    analyticsState.cachedTopPages.mockReturnValue([{ path: "/cached", views: 5, visitors: 3 }]);
    changeRange(view.container, "90");
    expect(view.container.textContent).toContain("/cached");
    expect(view.container.textContent).not.toContain("Loading analytics...");
    await flushAsync();
    expect(analyticsState.getTrafficOverview).toHaveBeenLastCalledWith(90, { force: false });

    changeRange(view.container, "ytd");
    await flushAsync();
    expect(analyticsState.getTopPages).toHaveBeenLastCalledWith(
      expect.objectContaining({ rangeDays: 365 })
    );

    analyticsState.cachedOverview.mockReturnValue(null);
    analyticsState.cachedTopPages.mockReturnValue(null);
    changeRange(view.container, "7");
    expect(view.container.textContent).toContain("Loading analytics...");
    await flushAsync();
    expect(analyticsState.getTrafficOverview).toHaveBeenLastCalledWith(7, { force: true });
  } finally {
    view.cleanup();
  }
});

test("AnalyticsPage ignores stale range responses that settle after a newer request", async () => {
  const view = mount(<AnalyticsPage />);

  try {
    await flushAsync();
    analyticsState.nextOverviewError = new Error("stale-network");
    analyticsState.topPagesResult = [{ path: "/newest", views: 3, visitors: 2 }];

    changeRange(view.container, "7");
    changeRange(view.container, "90");
    await flushAsync();
    await flushAsync();

    expect(view.container.textContent).not.toContain("stale-network");
    expect(view.container.textContent).not.toContain("Failed to load analytics data.");
    expect(view.container.textContent).toContain("/newest");
    expect(analyticsState.getTopPages).toHaveBeenLastCalledWith(
      expect.objectContaining({ rangeDays: 90 })
    );
  } finally {
    view.cleanup();
  }
});

test("AnalyticsPage drawer reports download and api export failures without closing", async () => {
  analyticsState.overviewResult = makeOverview({
    topPages: [{ path: "/pricing", views: 82, visitors: 40 }],
  });
  analyticsState.topPagesResult = [{ path: "/pricing", views: 82, visitors: 40 }];
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: undefined,
  });
  const view = mount(<AnalyticsPage />);

  try {
    await flushAsync();
    clickButton(view.container, "View all");
    expect(view.container.textContent).toContain("Full ranking for the selected date range.");

    clickLastButton(view.container, "Export");
    await flushAsync();
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(
      "Failed to export top pages."
    );

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
    analyticsState.exportTopPages.mockRejectedValueOnce(
      new ApiClientError("export_failed", "Export service offline", 500)
    );
    clickLastButton(view.container, "Export");
    await flushAsync();
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(
      "Export service offline"
    );
    expect(view.container.textContent).toContain("Full ranking for the selected date range.");
  } finally {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
    view.cleanup();
  }
});

test("AnalyticsPage surfaces ApiClientError message on initial load failure", async () => {
  analyticsState.nextOverviewError = new ApiClientError(
    "analytics_down",
    "Analytics service offline",
    503
  );
  const view = mount(<AnalyticsPage />);

  try {
    await flushAsync();
    expect(view.container.textContent).toContain("Analytics unavailable");
    expect(view.container.textContent).toContain("Analytics service offline");
  } finally {
    view.cleanup();
  }
});

test("TopPagesDrawer downloads a text file on export and closes via the footer button", async () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const createObjectUrl = vi.fn<(input: Blob | MediaSource) => string>(() => "blob:mock-top-pages");
  const revokeObjectUrl = vi.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectUrl,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectUrl,
  });

  const onOpenChange = vi.fn();
  const onExport = vi.fn(async () => ({
    fileName: "traffic.csv",
    contentType: "text/csv",
    content: "path,views,visitors\n/home,1,1",
  }));
  const view = mount(
    <TopPagesDrawer
      open
      onOpenChange={onOpenChange}
      items={[{ path: "/home", views: 12, visitors: 9 }]}
      onExport={onExport}
    />
  );

  try {
    expect(view.container.textContent).toContain("Top Pages");
    expect(view.container.textContent).toContain("12 views");
    expect(view.container.textContent).toContain("9 visitors");

    clickButton(view.container, "Export");
    await flushAsync();

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(createObjectUrl.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:mock-top-pages");
    expect(view.container.querySelector('[role="alert"]')).toBeNull();

    clickButton(view.container, "Close");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
    view.cleanup();
  }
});

test("TopPagesDrawer shows an empty state and disables export without rows", () => {
  const view = mount(
    <TopPagesDrawer
      open
      onOpenChange={() => undefined}
      items={[]}
      onExport={vi.fn(async () => ({
        fileName: "traffic.csv",
        contentType: "text/csv",
        content: "",
      }))}
    />
  );

  try {
    expect(view.container.textContent).toContain(
      "No page views yet. Publish content or widen the date range."
    );
    expect(view.container.textContent).toContain("No rows to export.");
    const exportButton = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Export"
    );
    expect(exportButton).toBeInstanceOf(HTMLButtonElement);
    expect((exportButton as HTMLButtonElement).disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("AnalyticsPage drops data from loads that settle after unmount", async () => {
  let resolveLoad: (value: unknown) => void = () => undefined;
  analyticsState.getTrafficOverview.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveLoad = resolve as (value: unknown) => void;
      })
  );
  const view = mount(<AnalyticsPage />);
  view.cleanup();
  React.act(() => {
    resolveLoad(makeOverview());
  });
  await flushAsync();
  // The settled load was a no-op after teardown: no exception, no state leak.
  expect(analyticsState.getTrafficOverview).toHaveBeenCalledTimes(1);
});
