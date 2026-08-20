// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

// TASK-493-05-L01: real-data rewire of the SEO Manager. Renders the overview +
// search-performance data through the mocked seoClient seam, verifies the
// Sync/Submit write actions refetch with force, and pins the cacheKeys
// contract (seoList/seoDetail byte-identical, seoOverview added).

const seoState = vi.hoisted(() => ({
  cachedList: null as unknown[] | null,
  listError: null as unknown,
  overview: null as Record<string, unknown> | null,
  overviewError: null as unknown,
  performance: null as Record<string, unknown> | null,
  performanceError: null as unknown,
  syncError: null as unknown,
  submitError: null as unknown,
  list: vi.fn(async () => {
    if (seoState.listError) throw seoState.listError;
    return seoState.cachedList ?? [];
  }),
  getOverview: vi.fn(async () => {
    if (seoState.overviewError) throw seoState.overviewError;
    return seoState.overview;
  }),
  getCachedOverview: vi.fn(() => seoState.overview),
  getPerformance: vi.fn(async () => {
    if (seoState.performanceError) throw seoState.performanceError;
    return seoState.performance;
  }),
  sync: vi.fn(async () => {
    if (seoState.syncError) throw seoState.syncError;
    return undefined;
  }),
  submit: vi.fn(async () => {
    if (seoState.submitError) throw seoState.submitError;
    return undefined;
  }),
  runAudit: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services/seoClient", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/seoClient")>("@/services/seoClient");
  return {
    ...actual,
    getCachedSeo: () => seoState.cachedList,
    listSeoCached: seoState.list,
    getCachedSeoOverview: seoState.getCachedOverview,
    getSeoOverview: seoState.getOverview,
    getSearchPerformance: seoState.getPerformance,
    syncSearchPerformance: seoState.sync,
    submitSitemap: seoState.submit,
    runSeoAudit: seoState.runAudit,
    updateSeo: seoState.update,
  };
});

import { SeoManagerPage } from "../../../core/admin/ui/seo/SeoManagerPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const overviewFixture = {
  indexedPages: 42,
  totalPages: 50,
  notIndexedPages: 8,
  totalImpressions: 1234,
  totalClicks: 56,
  averageCtr: 0.045,
  averagePosition: 9.3,
  averageScore: 65,
  sitemap: { status: "submitted", urlCount: 42, lastSubmittedAt: null },
};

const performanceFixture = {
  range: { startDate: "2026-07-01", endDate: "2026-07-31" },
  totals: { totalImpressions: 1234, totalClicks: 56, averageCtr: 0.045, averagePosition: 9.3 },
  series: [{ date: "2026-07-01", clicks: 2, impressions: 40 }],
  topQueries: [
    { query: "coderso cms", clicks: 30, impressions: 900, ctr: 0.033, position: 3.1 },
    { query: "seo checklist", clicks: 26, impressions: 334, ctr: 0.078, position: 5.2 },
  ],
};

const emptyPerformanceFixture = {
  range: { startDate: "2026-07-01", endDate: "2026-07-31" },
  totals: { totalImpressions: 0, totalClicks: 0, averageCtr: 0, averagePosition: 0 },
  series: [],
  topQueries: [],
};

const seedRealData = () => {
  seoState.cachedList = null;
  seoState.listError = null;
  seoState.overview = { ...overviewFixture };
  seoState.overviewError = null;
  seoState.performance = { ...performanceFixture, topQueries: [...performanceFixture.topQueries] };
  seoState.performanceError = null;
  seoState.syncError = null;
  seoState.submitError = null;
};

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

const findButton = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label)
  );

const hasStatValue = (container: HTMLElement, label: string, value: string) =>
  Array.from(container.querySelectorAll("div")).some(
    (element) => element.textContent === `${label}${value}`
  );

afterEach(() => {
  seoState.cachedList = null;
  seoState.listError = null;
  seoState.overview = null;
  seoState.overviewError = null;
  seoState.performance = null;
  seoState.performanceError = null;
  seoState.syncError = null;
  seoState.submitError = null;
  seoState.list.mockClear();
  seoState.getOverview.mockClear();
  seoState.getCachedOverview.mockClear();
  seoState.getPerformance.mockClear();
  seoState.sync.mockClear();
  seoState.submit.mockClear();
  seoState.runAudit.mockClear();
  seoState.update.mockClear();
  document.body.innerHTML = "";
});

test("renders real indexedPages and search-performance totals", async () => {
  seedRealData();
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("SEO Manager");
    // Fifth stat card is backed by the real overview payload.
    expect(hasStatValue(view.container, "Indexed pages", "42")).toBe(true);
    // The 479-26-L02 4-up stays present with its original labels.
    expect(view.container.textContent).toContain("Avg. score");
    expect(view.container.textContent).toContain("Optimized pages");
    expect(view.container.textContent).toContain("Warnings");
    // Search-performance panel renders real totals + top queries.
    expect(view.container.textContent).toContain("Impressions");
    expect(view.container.textContent).toContain("1234");
    expect(view.container.textContent).toContain("Clicks");
    expect(view.container.textContent).toContain("56");
    expect(view.container.textContent).toContain("Top queries");
    expect(view.container.textContent).toContain("coderso cms");
  } finally {
    view.cleanup();
  }
});

test("an empty overview shows zeros and the performance empty-state copy", async () => {
  seedRealData();
  seoState.overview = null;
  seoState.performance = { ...emptyPerformanceFixture };
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(hasStatValue(view.container, "Indexed pages", "0")).toBe(true);
    expect(view.container.textContent).toContain("No search performance data yet");
  } finally {
    view.cleanup();
  }
});

test("Sync performance POSTs, refetches the list and revalidates the overview", async () => {
  seedRealData();
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    // Read-through on mount: the cached overview seeds the initial state.
    expect(seoState.getCachedOverview).toHaveBeenCalled();

    seoState.overview = { ...overviewFixture, indexedPages: 99 };
    const syncButton = findButton(view.container, "Sync performance");
    expect(syncButton).toBeTruthy();
    React.act(() => {
      syncButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(seoState.sync).toHaveBeenCalledTimes(1);
    expect(seoState.sync).toHaveBeenCalledWith();
    // Force revalidate of overview + list after the write lands.
    expect(seoState.getOverview).toHaveBeenLastCalledWith({ force: true });
    expect(seoState.list).toHaveBeenLastCalledWith({ force: true });
    expect(hasStatValue(view.container, "Indexed pages", "99")).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("Submit sitemap POSTs and revalidates the overview", async () => {
  seedRealData();
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    seoState.overview = { ...overviewFixture, indexedPages: 77 };
    const submitButton = findButton(view.container, "Submit sitemap");
    expect(submitButton).toBeTruthy();
    React.act(() => {
      submitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(seoState.submit).toHaveBeenCalledTimes(1);
    expect(seoState.submit).toHaveBeenCalledWith();
    expect(seoState.getOverview).toHaveBeenLastCalledWith({ force: true });
    expect(hasStatValue(view.container, "Indexed pages", "77")).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("a 403 on sync disables the SEO write actions without crashing", async () => {
  seedRealData();
  seoState.syncError = new ApiClientError(
    "forbidden",
    "You don't have permission to modify SEO settings.",
    403
  );
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    const syncButton = findButton(view.container, "Sync performance");
    const submitButton = findButton(view.container, "Submit sitemap");
    React.act(() => {
      syncButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("SEO Manager");
    expect((syncButton as HTMLButtonElement | undefined)?.disabled).toBe(true);
    expect((submitButton as HTMLButtonElement | undefined)?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("a 409 gsc_not_configured surfaces the connect hint", async () => {
  seedRealData();
  seoState.syncError = new ApiClientError(
    "gsc_not_configured",
    "Google Search Console is not configured for this site.",
    409
  );
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    const syncButton = findButton(view.container, "Sync performance");
    React.act(() => {
      syncButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("Google Search Console not connected");
    expect(view.container.textContent).toContain(
      "Connect Google Search Console in Settings → Integrations."
    );
  } finally {
    view.cleanup();
  }
});

test("cacheKeys contract: seoList/seoDetail unchanged, seoOverview added", () => {
  expect(cacheKeys.seoList).toBe("seo:list");
  expect(cacheKeys.seoDetail("seo-1")).toBe("seo:detail:seo-1");
  expect(cacheKeys.seoOverview).toBe("seo:overview");
});
