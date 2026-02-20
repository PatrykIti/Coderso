import { expect, test } from "bun:test";

import type { PageSummary } from "../../../core/admin/services/pagesClient";
import {
  filterPages,
  resolvePagesRefreshBackground,
} from "../../../core/admin/ui/pages/PageListPage";

const basePage: PageSummary = {
  id: "1",
  title: "About Us",
  slug: "about-us",
  status: "published",
  updatedAt: "2026-01-01T00:00:00.000Z",
  author: { id: "author-1", name: "Admin", email: "admin@example.com" },
};

test("filterPages matches query, status, and author", () => {
  const pages: PageSummary[] = [
    basePage,
    {
      ...basePage,
      id: "2",
      title: "Pricing",
      slug: "pricing",
      status: "draft",
      author: { id: "author-2", name: "Editor", email: "editor@example.com" },
    },
  ];

  expect(filterPages(pages, "about", "all", "any")).toHaveLength(1);
  expect(filterPages(pages, "", "draft", "any")).toHaveLength(1);
  expect(filterPages(pages, "", "all", "author-2")).toHaveLength(1);
  expect(filterPages(pages, "missing", "all", "any")).toHaveLength(0);
});

test("resolvePagesRefreshBackground keeps refresh in background when cache exists", () => {
  expect(
    resolvePagesRefreshBackground({
      hasHydrated: false,
      hasInitialCache: true,
    })
  ).toBe(true);
});

test("resolvePagesRefreshBackground shows loading when no cache and not hydrated", () => {
  expect(
    resolvePagesRefreshBackground({
      hasHydrated: false,
      hasInitialCache: false,
    })
  ).toBe(false);
});

test("resolvePagesRefreshBackground respects explicit override", () => {
  expect(
    resolvePagesRefreshBackground({
      explicitBackground: false,
      hasHydrated: true,
      hasInitialCache: true,
    })
  ).toBe(false);
});
