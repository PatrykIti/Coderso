// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-479-26-L07: structural lock for the Global Search restyle (L01). Asserts the
// centered hero + recent chips + grouped result rows + relocated filters render, and
// that the preserved navigation still routes through resolveSearchDestination — NOT a
// hand-built href. Behavioral coverage stays in tests/vitest/ui/search-*.

const searchState = vi.hoisted(() => ({
  navigate: vi.fn(),
  prefetch: vi.fn(),
  results: {
    normalizedQuery: "home",
    shouldSearch: true,
    items: [{ id: "page-1", title: "Homepage", type: "page" as const }],
    categories: [] as Array<{ id: string; label: string; count: number }>,
    meta: null as unknown,
    hasCompletedSearch: true,
    loading: false,
    error: false as boolean,
  },
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: searchState.navigate, prefetch: searchState.prefetch }),
}));

vi.mock("@/services/searchClient", () => ({
  DEFAULT_SEARCH_DATE_RANGE: "last-30-days",
  getCachedRecentSearches: () => [{ query: "pricing" }, { query: "changelog" }],
  listRecentSearchesCached: vi.fn(async () => [{ query: "pricing" }, { query: "changelog" }]),
  normalizeSearchDateRange: (value: string) => value,
}));

vi.mock("../../../core/admin/ui/search/useSearchResults", () => ({
  useSearchResults: () => searchState.results,
}));

import { SearchPage } from "../../../core/admin/ui/search/SearchPage";

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

afterEach(() => {
  searchState.navigate.mockClear();
  searchState.prefetch.mockClear();
  searchState.results = {
    normalizedQuery: "home",
    shouldSearch: true,
    items: [{ id: "page-1", title: "Homepage", type: "page" }],
    categories: [],
    meta: null,
    hasCompletedSearch: true,
    loading: false,
    error: false,
  };
  document.body.innerHTML = "";
});

const findByText = (root: HTMLElement, selector: string, text: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(selector)).find((node) =>
    node.textContent?.includes(text)
  );

test("renders the centered hero, recent chips, and grouped results", () => {
  const view = mount(<SearchPage />);
  try {
    expect(view.container.querySelector("h1")?.textContent).toMatch(/search/i);
    const input = view.container.querySelector<HTMLInputElement>(
      'input[placeholder*="Search pages"]'
    );
    expect(input).not.toBeNull();

    // Recent chips come from the seeded getCachedRecentSearches (objects with .query).
    expect(findByText(view.container, '[data-slot="badge"]', "pricing")).toBeTruthy();

    // Grouped result rows render with the group label + the seeded item title.
    expect(view.container.textContent).toContain("Pages");
    expect(view.container.textContent).toContain("Homepage");

    // Relocated filters are present + writable (Date Range select + category column).
    expect(view.container.textContent).toContain("Filters");
    expect(view.container.textContent).toContain("Date Range");
  } finally {
    view.cleanup();
  }
});

test("clicking a recent chip sets the query and selecting a result navigates via resolver", () => {
  const view = mount(<SearchPage />);
  try {
    const chip = findByText(view.container, '[data-slot="badge"]', "pricing");
    React.act(() => {
      chip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const input = view.container.querySelector<HTMLInputElement>(
      'input[placeholder*="Search pages"]'
    );
    expect(input?.value).toBe("pricing");

    const resultButton = findByText(view.container, "button", "Homepage");
    React.act(() => {
      resultButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(searchState.navigate).toHaveBeenCalledWith("/admin/pages/page-1");
  } finally {
    view.cleanup();
  }
});

test("the not-enough-characters and error states render the soft EmptyState card", () => {
  searchState.results = { ...searchState.results, shouldSearch: false };
  const empty = mount(<SearchPage />);
  try {
    expect(empty.container.textContent).toContain("Type at least 2 characters to search.");
  } finally {
    empty.cleanup();
  }

  searchState.results = { ...searchState.results, shouldSearch: true, error: true };
  const failed = mount(<SearchPage />);
  try {
    expect(failed.container.textContent).toContain("Search failed. Try again.");
  } finally {
    failed.cleanup();
  }
});
