// @vitest-environment happy-dom

// TASK-479-16-L03 / L04: locks the Filters preview restyle (soft info card +
// SectionCard controls + rounded-xl example cards) while proving the runtime-token
// preview wiring is presentation-only — "Show examples" toggles the example cards
// and "Use example" still writes the runtime-token Input.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ListingQueryRecord } from "../../../core/admin/services/listingsClient";

const lq = (id: string, name: string): ListingQueryRecord => ({
  id,
  name,
  description: null,
  query: {
    source: "entries",
    sourceConfig: {},
    filters: [],
    sort: [{ field: "updatedAt", dir: "desc" }],
    pagination: { limit: 12, offset: 0 },
    fields: ["id", "title"],
  },
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
});

const listState = vi.hoisted(() => ({ queries: [] as unknown[] }));

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
  };
});

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
  broadcastCacheEvent: () => undefined,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ListingFiltersPage } from "../../../core/admin/ui/listings/ListingFiltersPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const mount = (node: React.ReactNode, path = "/admin/advanced/filters") => {
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

describe("Filters preview restyle", () => {
  it("renders the restyled controls + toggles examples + Use example writes the token input", async () => {
    seedListingQueries([lq("11111111-1111-4111-8111-111111111111", "Latest articles")]);
    const view = mount(<ListingFiltersPage />);
    try {
      await flush();
      expect(view.container.querySelector("h1")?.textContent).toContain("Filters");
      expect(findButton(view.container, /run preview/i)).toBeTruthy();

      await click(findButton(view.container, /show examples/i));
      await click(findButton(view.container, /use example/i)); // first match -> setQueryString

      const tokenInput = view.container.querySelector(
        'input[placeholder^="lq."]'
      ) as HTMLInputElement | null;
      expect(tokenInput?.value).toMatch(/^lq\./);
    } finally {
      view.cleanup();
    }
  });
});
