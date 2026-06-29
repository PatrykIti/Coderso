// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SearchPage } from "../../../core/admin/ui/search/SearchPage";
import { useSearchResults } from "../../../core/admin/ui/search/useSearchResults";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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

afterEach(() => {
  vi.useRealTimers();
});

test("SearchPage renders empty state", () => {
  const html = renderAdminUi(<SearchPage />);

  expect(html).toContain("Search");
  expect(html).toContain("Type at least 2 characters to search.");
});

test("SearchPage renders fallback Try chips without recent searches", () => {
  const html = renderAdminUi(<SearchPage />);

  expect(html).toContain("Recent");
  expect(html).toContain("pages");
  expect(html).toContain("content");
  expect(html).toContain("media");
  expect(html).toContain("users");
  expect(html).toContain("Categories appear after a completed search.");
});

test("useSearchResults sends the selected date range", async () => {
  vi.useFakeTimers();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      items: [],
      categories: [],
      meta: {
        dateRange: "all-time",
        hasSearchableContent: true,
        hasQueryMatches: false,
        hasMatchesOutsideDateRange: false,
        returnedItems: 0,
      },
    });
  };

  function Harness() {
    useSearchResults("homepage", { limit: 50, dateRange: "all-time" });
    return null;
  }

  const { cleanup } = mount(<Harness />);

  try {
    await React.act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/search?q=homepage&limit=50&dateRange=all-time");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("useSearchResults keeps numeric overload compatible with global SearchBar", async () => {
  vi.useFakeTimers();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      items: [],
      categories: [],
      meta: {
        dateRange: "all-time",
        hasSearchableContent: true,
        hasQueryMatches: false,
        hasMatchesOutsideDateRange: false,
        returnedItems: 0,
      },
    });
  };

  function Harness() {
    useSearchResults("homepage", 8);
    return null;
  }

  const { cleanup } = mount(<Harness />);

  try {
    await React.act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/search?q=homepage&limit=8&dateRange=all-time");
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
  }
});
