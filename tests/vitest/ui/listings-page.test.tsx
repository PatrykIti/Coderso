import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { ListingEditorPage } from "../../../core/admin/ui/listings/ListingEditorPage";
import { ListingFiltersPage } from "../../../core/admin/ui/listings/ListingFiltersPage";
import { ListingListPage } from "../../../core/admin/ui/listings/ListingListPage";
import { ListingSearchPage } from "../../../core/admin/ui/listings/ListingSearchPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("ListingListPage renders listings shell and loading state", () => {
  const html = renderAdminUi(<ListingListPage />, {
    path: "/admin/advanced/listings",
  });

  expect(html).toContain("Listings");
  expect(html).toContain("New");
  expect(html).toContain("Loading listing queries");
  expect(html).toContain("Queries");
  expect(html).toContain("Templates");
});

test("ListingListPage renders cached queries without loading placeholder", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.listingQueriesList,
      JSON.stringify({
        value: [
          {
            id: "listing-query-1",
            name: "Cached listing query",
            description: "Cache hydration smoke test",
            query: {
              source: "entries",
              sourceConfig: {
                contentTypeId: "services",
                includeDrafts: false,
              },
              filters: [],
              sort: [{ field: "id", dir: "asc" }],
              pagination: { limit: 12, offset: 0 },
              fields: ["id", "title"],
            },
            createdAt: "2026-02-18T00:00:00.000Z",
            updatedAt: "2026-02-18T00:00:00.000Z",
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<ListingListPage />, {
      path: "/admin/advanced/listings",
    });

    expect(html).toContain("Cached listing query");
    expect(html).not.toContain("Loading listing queries");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("ListingListPage keeps cached empty state without loading placeholder", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.listingQueriesList,
      JSON.stringify({
        value: [],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<ListingListPage />, {
      path: "/admin/advanced/listings",
    });

    expect(html).not.toContain("Loading listing queries");
    expect(html).toContain("Queries");
    expect(html).toContain("Templates");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("ListingEditorPage renders query builder panels in create mode", () => {
  const html = renderAdminUi(<ListingEditorPage />, {
    path: "/admin/advanced/listings/new",
  });

  expect(html).toContain("New listing query");
  expect(html).toContain("Source");
  expect(html).toContain("Filters");
  expect(html).toContain("Sort and Pagination");
  expect(html).toContain("Fields and Template");
  expect(html).toContain("Live Preview");
  expect(html).toContain("Save query");
});

test("ListingFiltersPage renders preview shell", () => {
  const html = renderAdminUi(<ListingFiltersPage />, {
    path: "/admin/advanced/filters",
  });

  expect(html).toContain("Filters");
  expect(html).toContain("Run preview");
  expect(html).toContain("Runtime query string");
  expect(html).toContain("Show examples");
  expect(html).toContain("Runtime tokens use listing query ID");
  expect(html).toContain("How this works");
});

test("ListingSearchPage renders public search preview shell", () => {
  const html = renderAdminUi(<ListingSearchPage />, {
    path: "/admin/advanced/search",
  });

  expect(html).toContain("Search");
  expect(html).toContain("Run preview");
  expect(html).toContain("global public search");
  expect(html).toContain("What this preview searches");
  expect(html).toContain("Not indexed yet");
});
