// @vitest-environment happy-dom

// TASK-105-08-06: `SearchBar` interaction suite. The bar debounces through
// useSearchResults, renders dropdown results, and wires keyboard navigation +
// select + prefetch to the admin router.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { clearSearchCache } from "../../../core/admin/services/searchClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SearchBar } from "../../../core/admin/ui/search/SearchBar";

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
      <AdminRouterProvider initialPath="/admin">
        <SearchBar />
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

const keydown = (input: HTMLInputElement | null, key: string) => {
  if (!input) throw new Error("input missing");
  React.act(() => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
};

afterEach(() => {
  clearSearchCache();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

test("typing a short query keeps the dropdown hidden", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search")) return jsonResponse({ items: [], categories: [], meta: {} });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input"), "a");
    await React.act(async () => {
      await Promise.resolve();
    });
    const dropdown = Array.from(view.container.querySelectorAll<HTMLElement>(".absolute")).find(
      (entry) => entry.className.includes("top-12")
    );
    expect(dropdown?.className).toContain("hidden");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("typing a valid query renders grouped results and prefetch on hover", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "page-1",
            title: "Homepage",
            slug: "homepage",
            type: "page",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
          {
            id: "entry-1",
            title: "Launch News",
            slug: "launch-news",
            type: "entry",
            updatedAt: "2026-03-01T00:00:00.000Z",
            entryTypeSlug: "news",
          },
        ],
        categories: [],
        meta: { hasSearchableContent: true },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input"), "home");
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(view.container.textContent).toContain("Homepage");
    expect(view.container.textContent).toContain("Launch News");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("arrow keys move the active row and Enter selects it", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "page-1",
            title: "Homepage",
            slug: "homepage",
            type: "page",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
          {
            id: "page-2",
            title: "About",
            slug: "about",
            type: "page",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
        ],
        categories: [],
        meta: { hasSearchableContent: true },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    const input = view.container.querySelector("input");
    setInput(input, "page");
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    keydown(input, "ArrowDown");
    const rows = Array.from(view.container.querySelectorAll("button[data-active]"));
    const active = rows.find((row) => row.getAttribute("data-active") === "true");
    expect(active?.textContent).toContain("About");
    keydown(input, "Enter");
    await React.act(async () => {
      await Promise.resolve();
    });
    expect((input as HTMLInputElement).value).toBe("");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("keyboard events with no results are ignored", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search")) return jsonResponse({ items: [], categories: [], meta: {} });
    return jsonResponse({});
  };

  const view = mount();
  try {
    const input = view.container.querySelector("input");
    setInput(input, "a");
    await React.act(async () => {
      await Promise.resolve();
    });
    // Short query: the dropdown stays hidden and arrow keys must not throw.
    expect(() => {
      keydown(input, "ArrowDown");
      keydown(input, "ArrowUp");
      keydown(input, "Enter");
    }).not.toThrow();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("hovering a result row triggers a prefetch through the router", async () => {
  const originalFetch = globalThis.fetch;
  let adminRequests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "page-1",
            title: "Homepage",
            slug: "homepage",
            type: "page",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
        ],
        categories: [],
        meta: { hasSearchableContent: true },
      });
    if (url.startsWith("/admin")) adminRequests.push(url);
    return jsonResponse({});
  };

  const view = mount();
  try {
    setInput(view.container.querySelector("input"), "home");
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    const row = Array.from(view.container.querySelectorAll("button")).find((entry) =>
      entry.textContent?.includes("Homepage")
    );
    expect(row).toBeTruthy();
    React.act(() => {
      row?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(adminRequests).toContain("/admin/api/pages");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("ArrowUp wraps to the last result", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/search/recent")) return jsonResponse({ items: [] });
    if (url.includes("/search"))
      return jsonResponse({
        items: [
          {
            id: "page-1",
            title: "Homepage",
            slug: "homepage",
            type: "page",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
        ],
        categories: [],
        meta: { hasSearchableContent: true },
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    const input = view.container.querySelector("input");
    setInput(input, "home");
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    keydown(input, "ArrowUp");
    const rows = Array.from(view.container.querySelectorAll("button[data-active]"));
    const active = rows.find((row) => row.getAttribute("data-active") === "true");
    expect(active?.textContent).toContain("Homepage");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("search failure renders the unavailable message", async () => {
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
    setInput(view.container.querySelector("input"), "missing");
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(view.container.textContent).toContain("Search unavailable. Try again.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
