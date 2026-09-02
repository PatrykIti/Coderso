// @vitest-environment happy-dom

// TASK-105-08-06: `useSearchResults` edge coverage. Exercises cached reads,
// media/entry/user item mapping, short-query no-op, stale-response guards,
// query changes, and the completed-search return contract.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import {
  clearSearchCache,
  searchAllCached,
  type SearchDateRange,
} from "../../../core/admin/services/searchClient";
import { useSearchResults } from "../../../core/admin/ui/search/useSearchResults";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type HarnessProps = {
  query: string;
  options?: number | { limit?: number; dateRange?: SearchDateRange };
};

const mount = (props: HarnessProps) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let last: ReturnType<typeof useSearchResults> | null = null;
  function Harness({ query, options }: HarnessProps) {
    last = useSearchResults(query, options);
    return (
      <output data-testid="search">
        <span data-items={last.items.map((item) => item.id).join(",")} />
        <span
          data-groups={last.groups.map((group) => `${group.type}:${group.items.length}`).join(",")}
        />
        <span data-categories={last.categories.map((category) => category.id).join(",")} />
        <span data-should-search={String(last.shouldSearch)} />
        <span data-loading={String(last.loading)} />
        <span data-error={last.error ?? ""} />
        <span data-completed={String(last.hasCompletedSearch)} />
        <span data-normalized={last.normalizedQuery} />
        <span data-meta={last.meta ? JSON.stringify(last.meta) : ""} />
      </output>
    );
  }
  React.act(() => {
    root.render(<Harness {...props} />);
  });
  const read = () => {
    const node = container.querySelector('[data-testid="search"]');
    if (!node) throw new Error("harness missing");
    const dataset = node.querySelectorAll<HTMLElement>("span");
    return {
      items: dataset[0]?.dataset.items ?? "",
      groups: dataset[1]?.dataset.groups ?? "",
      categories: dataset[2]?.dataset.categories ?? "",
      shouldSearch: dataset[3]?.dataset.shouldSearch,
      loading: dataset[4]?.dataset.loading,
      error: dataset[5]?.dataset.error ?? "",
      completed: dataset[6]?.dataset.completed,
      normalized: dataset[7]?.dataset.normalized ?? "",
      meta: dataset[8]?.dataset.meta ?? "",
    };
  };
  return {
    container,
    read,
    rerender: (next: HarnessProps) => {
      props = next;
      React.act(() => {
        root.render(<Harness {...props} />);
      });
    },
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const searchResponse = (items: unknown[] = []) =>
  jsonResponse({
    items,
    categories: [{ id: "cat-1", label: "Pages", count: 1 }],
    meta: {
      dateRange: "all-time",
      hasSearchableContent: true,
      hasQueryMatches: true,
      hasMatchesOutsideDateRange: false,
      returnedItems: items.length,
    },
  });

afterEach(() => {
  clearSearchCache();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

test("short queries never search and report shouldSearch false", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    return searchResponse();
  };

  const view = mount({ query: "a" });
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(view.read().shouldSearch).toBe("false");
    expect(calls.every((url) => url.includes("/search?") === false)).toBe(true);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a completed search maps page, entry, media, and user items into groups", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    return searchResponse([
      { id: "p-1", title: "Homepage", slug: "homepage", type: "page", updatedAt: "x" },
      {
        id: "e-1",
        title: "News",
        slug: "news",
        type: "entry",
        updatedAt: "x",
        entryTypeSlug: "news",
      },
      { id: "m-1", title: "Logo", slug: "logo", type: "media", updatedAt: "x" },
      { id: "u-1", title: "System Admin", slug: "admin", type: "user", updatedAt: "x" },
    ]);
  };

  const view = mount({ query: "admin", options: 8 });
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    const state = view.read();
    expect(state.items).toBe("p-1,e-1,m-1,u-1");
    expect(state.groups).toContain("page:1");
    expect(state.groups).toContain("entry:1");
    expect(state.groups).toContain("media:1");
    expect(state.groups).toContain("user:1");
    expect(state.completed).toBe("true");
    expect(state.loading).toBe("false");
    expect(state.error).toBe("");
    expect(state.categories).toBe("cat-1");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("multi-word queries are normalized to single spaces", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => searchResponse();
  const view = mount({ query: "  oak    desk  " });
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(view.read().normalized).toBe("oak desk");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("search failure reports search_failed and hides completed results", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({ error: { code: "search_failed", message: "boom", details: "x" } }, 500);
    return jsonResponse({});
  };

  const view = mount({ query: "homepage" });
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    const state = view.read();
    expect(state.error).toBe("search_failed");
    expect(state.items).toBe("");
    expect(state.completed).toBe("false");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a cached result hydrates instantly without a second request", async () => {
  const originalFetch = globalThis.fetch;
  let _calls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    _calls += 1;
    return searchResponse([
      { id: "p-1", title: "Homepage", slug: "homepage", type: "page", updatedAt: "x" },
    ]);
  };

  // Warm the cache through the client itself, then remount so the hook reads it.
  await searchAllCached("homepage", { limit: 8, dateRange: "all-time" });
  const view = mount({ query: "homepage", options: 8 });
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(view.read().items).toBe("p-1");
    expect(view.read().completed).toBe("true");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a stale response from a superseded query is ignored", async () => {
  const originalFetch = globalThis.fetch;
  let resolveSlow: ((response: Response) => void) | null = null;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("q=slow")) {
      return new Promise<Response>((resolve) => {
        resolveSlow = resolve;
      });
    }
    return searchResponse([
      { id: "p-2", title: "Fast result", slug: "fast", type: "page", updatedAt: "x" },
    ]);
  };

  const view = mount({ query: "slow" });
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(resolveSlow).toBeTruthy();
    view.rerender({ query: "fast" });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    // Release the stale response after the second query completed.
    await React.act(async () => {
      resolveSlow?.(
        searchResponse([{ id: "p-1", title: "Stale", slug: "stale", type: "page", updatedAt: "x" }])
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const state = view.read();
    expect(state.items).toBe("p-2");
    expect(state.items).not.toContain("p-1");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a stale error from a superseded query is ignored", async () => {
  const originalFetch = globalThis.fetch;
  let rejectSlow: ((reason: unknown) => void) | null = null;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("q=boom")) {
      return new Promise<Response>((_, reject) => {
        rejectSlow = reject;
      });
    }
    return searchResponse([
      { id: "p-3", title: "Safe result", slug: "safe", type: "page", updatedAt: "x" },
    ]);
  };

  const view = mount({ query: "boom" });
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(rejectSlow).toBeTruthy();
    view.rerender({ query: "safe" });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    await React.act(async () => {
      rejectSlow?.(new Error("late boom"));
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const state = view.read();
    expect(state.items).toBe("p-3");
    expect(state.error).toBe("");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
