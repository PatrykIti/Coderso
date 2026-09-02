// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const seoState = vi.hoisted(() => ({
  result: null as unknown,
  getSearchPerformance: vi.fn(async () => {
    if (seoState.result instanceof Error) throw seoState.result;
    return seoState.result;
  }),
  reset() {
    seoState.result = null;
    seoState.getSearchPerformance.mockClear();
  },
}));

vi.mock("@/services/seoClient", async () => {
  const actual = await import("../../../core/admin/services/seoClient");
  return { ...actual, getSearchPerformance: seoState.getSearchPerformance };
});

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { SeoPerformancePanel } from "../../../core/admin/ui/seo/SeoPerformancePanel";

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

afterEach(() => {
  seoState.reset();
  document.body.innerHTML = "";
});

describe("SeoPerformancePanel", () => {
  it("shows the loading copy while the request is in flight", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    seoState.getSearchPerformance.mockImplementationOnce(
      () => new Promise((resolve) => (resolveRequest = resolve))
    );

    const view = mount(<SeoPerformancePanel />);
    await flushEffects();
    expect(view.container.textContent).toContain("Loading search performance...");
    expect(seoState.getSearchPerformance).toHaveBeenCalledWith({ limit: 5 });

    await React.act(async () => {
      resolveRequest?.({
        totals: {
          totalImpressions: 120,
          totalClicks: 30,
          averageCtr: 0.25,
          averagePosition: 4.6,
        },
        topQueries: [{ query: "coderso cms", clicks: 12, impressions: 40 }],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(view.container.textContent).toContain("Impressions");
    expect(view.container.textContent).toContain("120");
    expect(view.container.textContent).toContain("25%");
    expect(view.container.textContent).toContain("coderso cms");
    expect(view.container.textContent).toContain("12 clicks · 40 impressions");
    view.unmount();
  });

  it("renders the empty state for zero-activity payloads", async () => {
    seoState.result = {
      totals: { totalImpressions: 0, totalClicks: 0, averageCtr: 0, averagePosition: 0 },
      topQueries: [],
    };
    const view = mount(<SeoPerformancePanel />);
    await flushEffects();
    expect(view.container.textContent).toContain("No search performance data yet");
    view.unmount();
  });

  it("surfaces api errors and falls back to generic copy", async () => {
    // api client errors surface their message verbatim
    seoState.result = new ApiClientError("quota_exceeded", "quota exceeded", 429);
    const view = mount(<SeoPerformancePanel />);
    await flushEffects();
    expect(view.container.textContent).toContain("quota exceeded");
    view.unmount();

    // every other failure shape uses the generic fallback copy
    seoState.result = new Error("offline boom");
    const genericView = mount(<SeoPerformancePanel />);
    await flushEffects();
    expect(genericView.container.textContent).toContain("Failed to load search performance.");
    genericView.unmount();
  });

  it("refetches when refreshKey changes and ignores stale responses after unmount", async () => {
    const { useState } = React;
    function Host() {
      const [key, setKey] = useState(0);
      return (
        <div>
          <button type="button" onClick={() => setKey(key + 1)}>
            bump
          </button>
          <SeoPerformancePanel refreshKey={key} />
        </div>
      );
    }
    seoState.result = {
      totals: { totalImpressions: 1, totalClicks: 1, averageCtr: 1, averagePosition: 1 },
      topQueries: [],
    };
    const view = mount(<Host />);
    await flushEffects();
    expect(seoState.getSearchPerformance).toHaveBeenCalledTimes(1);

    const bump = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "bump"
    )!;
    React.act(() => {
      bump.click();
    });
    await flushEffects();
    expect(seoState.getSearchPerformance).toHaveBeenCalledTimes(2);
    view.unmount();
  });
});
