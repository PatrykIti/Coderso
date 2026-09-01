// @vitest-environment happy-dom

// TASK-105-08-06: `SearchPage` interaction suite. Covers the recent-search
// chip row, date range + category filters, content-type tabs, and empty-state
// copy variants through the real searchClient + fetch mock.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { clearSearchCache } from "../../../core/admin/services/searchClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SearchPage } from "../../../core/admin/ui/search/SearchPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/search">
        <SearchPage />
      </AdminRouterProvider>
    );
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const setInput = (input: HTMLInputElement | null, value: string) => {
  if (!input) throw new Error("input missing");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const click = (element: Element | null | undefined) => {
  if (!element) throw new Error("click target missing");
  const target = element as HTMLElement;
  React.act(() => {
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const waitSearch = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
};

afterEach(() => {
  clearSearchCache();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

test("recent searches load and populate the chip row", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent"))
      return jsonResponse({ items: [{ query: "homepage", createdAt: "x" }] });
    if (url.includes("/search")) return jsonResponse({ items: [], categories: [], meta: {} });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const chip = Array.from(view.container.querySelectorAll("span,button")).find(
      (entry) => entry.textContent?.trim() === "homepage"
    ) as HTMLElement | null;
    expect(chip).toBeTruthy();
    click(chip);
    const input = view.container.querySelector("input[placeholder*='Search pages']");
    expect((input as HTMLInputElement | null)?.value).toBe("homepage");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("recent searches failure surfaces the API message", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent"))
      return jsonResponse(
        { error: { code: "recent_failed", message: "Recent exploded", details: "x" } },
        500
      );
    if (url.includes("/search")) return jsonResponse({ items: [], categories: [], meta: {} });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(view.container.textContent).toContain("Recent exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("completed search renders grouped results and category checkboxes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          { id: "p-1", title: "Homepage", slug: "homepage", type: "page", updatedAt: "x" },
          {
            id: "e-1",
            title: "Launch News",
            slug: "launch",
            type: "entry",
            updatedAt: "x",
            categoryId: "cat-1",
          },
        ],
        categories: [{ id: "cat-1", label: "Content", count: 1 }],
        meta: {
          dateRange: "all-time",
          hasSearchableContent: true,
          hasQueryMatches: true,
          hasMatchesOutsideDateRange: false,
          returnedItems: 2,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "home");
    await waitSearch();
    expect(view.container.textContent).toContain("Homepage");
    expect(view.container.textContent).toContain("Launch News");
    const category = Array.from(view.container.querySelectorAll("label")).find((entry) =>
      entry.textContent?.includes("Content")
    );
    expect(category).toBeTruthy();
    expect(category?.textContent).toContain("1");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("category filter narrows the visible results", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "p-1",
            title: "Homepage",
            slug: "homepage",
            type: "page",
            updatedAt: "x",
            categoryId: "cat-page",
          },
          {
            id: "e-1",
            title: "Launch News",
            slug: "launch",
            type: "entry",
            updatedAt: "x",
            categoryId: "cat-entry",
          },
        ],
        categories: [
          { id: "cat-page", label: "Pages", count: 1 },
          { id: "cat-entry", label: "Content", count: 1 },
        ],
        meta: {
          dateRange: "all-time",
          hasSearchableContent: true,
          hasQueryMatches: true,
          hasMatchesOutsideDateRange: false,
          returnedItems: 2,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "home");
    await waitSearch();
    const contentLabel = Array.from(view.container.querySelectorAll("label")).find((entry) =>
      entry.textContent?.includes("Content")
    );
    const checkbox = contentLabel?.querySelector<HTMLElement>('[data-slot="checkbox"]');
    click(checkbox);
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Launch News");
    expect(view.container.textContent).not.toContain("Homepage");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("tabs filter results by content type", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          { id: "p-1", title: "Homepage", slug: "homepage", type: "page", updatedAt: "x" },
          { id: "e-1", title: "Launch News", slug: "launch", type: "entry", updatedAt: "x" },
        ],
        categories: [],
        meta: {
          dateRange: "all-time",
          hasSearchableContent: true,
          hasQueryMatches: true,
          hasMatchesOutsideDateRange: false,
          returnedItems: 2,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "home");
    await waitSearch();
    const mediaTab = Array.from(view.container.querySelectorAll('[role="tab"]')).find((tab) =>
      tab.textContent?.includes("Media")
    );
    click(mediaTab);
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain('No media results for "home".');
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("no searchable content surfaces the dedicated empty state", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [],
        categories: [],
        meta: {
          dateRange: "all-time",
          hasSearchableContent: false,
          hasQueryMatches: false,
          hasMatchesOutsideDateRange: false,
          returnedItems: 0,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "anything");
    await waitSearch();
    expect(view.container.textContent).toContain("No searchable content yet.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("matches outside the date range suggest switching ranges", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [],
        categories: [],
        meta: {
          dateRange: "last-7-days",
          hasSearchableContent: true,
          hasQueryMatches: true,
          hasMatchesOutsideDateRange: true,
          returnedItems: 0,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "old");
    await waitSearch();
    expect(view.container.textContent).toContain('No results for "old" in Last 7 days.');
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("search failure renders the error empty state", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse(
        { error: { code: "search_failed", message: "Search exploded", details: "x" } },
        500
      );
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "broken");
    await waitSearch();
    expect(view.container.textContent).toContain("Search failed. Try again.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("recent searches failure with a non-API error falls back to generic copy", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) throw new TypeError("network down");
    if (url.includes("/search")) return jsonResponse({ items: [], categories: [], meta: {} });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(view.container.textContent).toContain("Failed to load recent searches.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("categories load from cached recent searches on mount", async () => {
  window.localStorage.setItem(
    "search:recent",
    JSON.stringify({ value: [{ query: "cached-query", createdAt: "x" }], savedAt: Date.now() })
  );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search")) return jsonResponse({ items: [], categories: [], meta: {} });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const chip = Array.from(view.container.querySelectorAll("span,button")).find(
      (entry) => entry.textContent?.trim() === "cached-query"
    );
    expect(chip).toBeTruthy();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("searching shows the loading empty state before the request resolves", async () => {
  const originalFetch = globalThis.fetch;
  let resolveSearch: ((response: Response) => void) | null = null;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search")) {
      return new Promise<Response>((resolve) => {
        resolveSearch = resolve;
      });
    }
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "home");
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(view.container.textContent).toContain("Searching...");
    await React.act(async () => {
      resolveSearch?.(
        jsonResponse({
          items: [],
          categories: [],
          meta: {
            hasSearchableContent: true,
            hasQueryMatches: true,
            hasMatchesOutsideDateRange: false,
            returnedItems: 0,
          },
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("View All switches the content-type tab and unchecking a category narrows results", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "p-1",
            title: "Homepage",
            slug: "homepage",
            type: "page",
            updatedAt: "x",
            categoryId: "cat-page",
          },
          {
            id: "e-1",
            title: "Launch News",
            slug: "launch",
            type: "entry",
            updatedAt: "x",
            categoryId: "cat-entry",
          },
        ],
        categories: [
          { id: "cat-page", label: "Pages", count: 1 },
          { id: "cat-entry", label: "Content", count: 1 },
        ],
        meta: {
          dateRange: "all-time",
          hasSearchableContent: true,
          hasQueryMatches: true,
          hasMatchesOutsideDateRange: false,
          returnedItems: 2,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "home");
    await waitSearch();
    const contentLabel = Array.from(view.container.querySelectorAll("label")).find((entry) =>
      entry.textContent?.includes("Content")
    );
    const checkbox = contentLabel?.querySelector<HTMLElement>('[data-slot="checkbox"]');
    click(checkbox);
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Launch News");
    expect(view.container.textContent).not.toContain("Homepage");
    // Unchecking restores both groups.
    click(checkbox);
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Homepage");
    // Clear resets the whole selection.
    const clearButton = Array.from(view.container.querySelectorAll("button")).find(
      (entry) => entry.textContent?.trim() === "Clear"
    );
    click(clearButton);
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Homepage");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("checking a category with zero matching items shows the filter empty state", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "p-1",
            title: "Homepage",
            slug: "homepage",
            type: "page",
            updatedAt: "x",
            categoryId: "cat-page",
          },
        ],
        categories: [
          { id: "cat-page", label: "Pages", count: 1 },
          { id: "cat-entry", label: "Content", count: 1 },
        ],
        meta: {
          dateRange: "all-time",
          hasSearchableContent: true,
          hasQueryMatches: true,
          hasMatchesOutsideDateRange: false,
          returnedItems: 1,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "home");
    await waitSearch();
    const contentLabel = Array.from(view.container.querySelectorAll("label")).find((entry) =>
      entry.textContent?.includes("Content")
    );
    click(contentLabel?.querySelector<HTMLElement>('[data-slot="checkbox"]'));
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("No results match the active category filters.");
    expect(view.container.textContent).toContain("Active categories: Content.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("prefetching a page result warms the pages route", async () => {
  const originalFetch = globalThis.fetch;
  let prefetchedPages = false;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/admin/api/pages")) {
      prefetchedPages = true;
      return jsonResponse({ items: [], pagination: { page: 1, pageSize: 50, total: 0 } });
    }
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "p-1",
            title: "Homepage",
            slug: "homepage",
            type: "page",
            updatedAt: "x",
            categoryId: "cat-page",
          },
        ],
        categories: [{ id: "cat-page", label: "Pages", count: 1 }],
        meta: {
          dateRange: "all-time",
          hasSearchableContent: true,
          hasQueryMatches: true,
          hasMatchesOutsideDateRange: false,
          returnedItems: 1,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "home");
    await waitSearch();
    const row = Array.from(view.container.querySelectorAll("button")).find(
      (entry) => entry.textContent?.includes("Homepage") && !entry.textContent?.includes("View All")
    );
    React.act(() => {
      row?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(prefetchedPages).toBe(true);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("selecting a page result navigates to the page editor", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "p-1",
            title: "Homepage",
            slug: "homepage",
            type: "page",
            updatedAt: "x",
            categoryId: "cat-page",
          },
        ],
        categories: [{ id: "cat-page", label: "Pages", count: 1 }],
        meta: {
          dateRange: "all-time",
          hasSearchableContent: true,
          hasQueryMatches: true,
          hasMatchesOutsideDateRange: false,
          returnedItems: 1,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "home");
    await waitSearch();
    const row = Array.from(view.container.querySelectorAll("button")).find(
      (entry) => entry.textContent?.includes("Homepage") && !entry.textContent?.includes("View All")
    );
    click(row);
    expect(window.location.pathname).toContain("/pages/p-1");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("View All on a result group switches the content tab", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "e-1",
            title: "Launch News",
            slug: "launch",
            type: "entry",
            updatedAt: "x",
            categoryId: "cat-entry",
          },
        ],
        categories: [{ id: "cat-entry", label: "Content", count: 1 }],
        meta: {
          dateRange: "all-time",
          hasSearchableContent: true,
          hasQueryMatches: true,
          hasMatchesOutsideDateRange: false,
          returnedItems: 1,
        },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "launch");
    await waitSearch();
    const viewAll = Array.from(view.container.querySelectorAll("button")).find(
      (entry) => entry.textContent?.trim() === "View All"
    );
    click(viewAll);
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Launch News");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("date range select changes the applied filter", async () => {
  const originalFetch = globalThis.fetch;
  let requestedRange: string | null = null;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search")) {
      const match = /dateRange=([^&]+)/.exec(url);
      requestedRange = match?.[1] ?? null;
      return jsonResponse({
        items: [],
        categories: [],
        meta: {
          dateRange: requestedRange,
          hasSearchableContent: true,
          hasQueryMatches: false,
          hasMatchesOutsideDateRange: false,
          returnedItems: 0,
        },
      });
    }
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input[placeholder*='Search pages']"), "home");
    await waitSearch();
    const trigger = view.container.querySelector('[data-slot="select-trigger"]');
    click(trigger);
    await React.act(async () => {
      await Promise.resolve();
    });
    const option = Array.from(document.body.querySelectorAll('[role="option"]')).find((entry) =>
      entry.textContent?.includes("Last 30 days")
    );
    click(option);
    await waitSearch();
    expect(requestedRange).toBe("last-30-days");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
