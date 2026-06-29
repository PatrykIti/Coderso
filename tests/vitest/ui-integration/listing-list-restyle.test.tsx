// @vitest-environment happy-dom

// TASK-479-16-L01 / L04: locks the Listings LIST restyle (soft/violet PageHeader,
// `line` tab strip, rounded-2xl query card grid with a derived summary + source
// badge + a REAL result-limit badge) while proving the restyle is presentation
// only — selection still surfaces the bulk cluster and the delete control still
// opens the real confirm dialog.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ListingQueryRecord } from "../../../core/admin/services/listingsClient";

const lq = (
  name: string,
  source: ListingQueryRecord["query"]["source"],
  overrides: Partial<ListingQueryRecord["query"]> = {}
): ListingQueryRecord => ({
  id: `${name.toLowerCase().replace(/\s+/g, "-")}-id`,
  name,
  description: null,
  query: {
    source,
    sourceConfig: {},
    filters: overrides.filters ?? [],
    sort: overrides.sort ?? [{ field: "updatedAt", dir: "desc" }],
    pagination: overrides.pagination ?? { limit: 12, offset: 0 },
    fields: overrides.fields ?? ["id", "title"],
  },
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
});

const listState = vi.hoisted(() => ({
  queries: [] as unknown[],
}));

const seedListingQueries = (items: ListingQueryRecord[]) => {
  listState.queries = items;
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/listingsClient", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/services/listingsClient");
  return {
    ...actual,
    getCachedListingQueries: () => listState.queries,
    listListingQueriesCached: vi.fn(async () => listState.queries),
    getCachedListingTemplates: () => [],
    listListingTemplatesCached: vi.fn(async () => []),
    deleteListingQuery: vi.fn(async () => undefined),
    deleteListingTemplate: vi.fn(async () => undefined),
  };
});

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
  broadcastCacheEvent: () => undefined,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../core/admin/ui/listings/ListingTemplateManager", () => ({
  ListingTemplateManager: () => null,
}));

// Native role=checkbox button so selection toggles fire deterministically.
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    onCheckedChange,
    checked,
    ...props
  }: {
    onCheckedChange?: (checked: boolean) => void;
    checked?: boolean | "indeterminate";
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked === true}
      onClick={() => onCheckedChange?.(checked !== true)}
      {...props}
    />
  ),
}));

import {
  ListingListPage,
  summarizeListingQuery,
} from "../../../core/admin/ui/listings/ListingListPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const mount = (node: React.ReactNode, path = "/admin/advanced/listings") => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminRouterProvider initialPath={path}>{node}</AdminRouterProvider>);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
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

const click = (el: Element | null | undefined) =>
  React.act(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

const findButton = (container: HTMLElement, re: RegExp) =>
  Array.from(container.querySelectorAll("button")).find(
    (b) => re.test(b.textContent || "") || re.test(b.getAttribute("aria-label") || "")
  );

beforeEach(() => {
  listState.queries = [];
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("Listings list restyle", () => {
  it("renders header, tabs, and query records as rounded-2xl cards", async () => {
    seedListingQueries([lq("Latest articles", "entries"), lq("Events", "posts")]);
    const view = mount(<ListingListPage />);
    try {
      await flush();
      expect(view.container.querySelector("h1")?.textContent).toContain("Listings");
      expect(findButton(view.container, /new/i)).toBeTruthy();
      expect(view.container.querySelector("[class*='rounded-2xl']")).toBeTruthy();
      // Tab strip renders both triggers.
      expect(view.container.textContent).toMatch(/queries/i);
      expect(view.container.textContent).toMatch(/templates/i);
      // Derived summary (source label "Content entries") + the REAL result-limit badge.
      expect(view.container.textContent).toMatch(/content entries|entries/i);
      expect(view.container.textContent).toMatch(/per page/i); // no invented layout badge
    } finally {
      view.cleanup();
    }
  });

  it("summarizeListingQuery derives a readable line from the query model", () => {
    expect(
      summarizeListingQuery(
        lq("X", "entries", { filters: [{ field: "status", op: "eq", value: "published" }] })
      )
    ).toMatch(/status.*eq.*published/i);
    // Defensive: empty filters/sort still produce the source label.
    expect(summarizeListingQuery(lq("Y", "posts", { sort: [] }))).toMatch(/posts/i);
  });

  it("selecting a query card still surfaces the bulk cluster", async () => {
    seedListingQueries([lq("Latest articles", "entries")]);
    const view = mount(<ListingListPage />);
    try {
      await flush();
      await click(view.container.querySelector('[aria-label^="Select "]'));
      expect(view.container.textContent).toMatch(/selected/i); // ListingBulkActionsBar "Selected 1"
    } finally {
      view.cleanup();
    }
  });

  it("delete control opens the confirm dialog (behavior preserved)", async () => {
    seedListingQueries([lq("Latest articles", "entries")]);
    const view = mount(<ListingListPage />);
    try {
      await flush();
      await click(findButton(view.container, /delete/i));
      await flush();
      expect(document.body.textContent).toMatch(/delete listing query/i);
    } finally {
      view.cleanup();
    }
  });
});
