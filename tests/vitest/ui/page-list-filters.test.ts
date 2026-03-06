import { expect, test } from "vitest";

import type { PageSummary } from "../../../core/admin/services/pagesClient";
import {
  filterPages,
  resolvePageListMountRefreshOptions,
} from "../../../core/admin/ui/pages/PageListPage";
import { resolveCacheRefreshBackground } from "../../../core/admin/utils/cacheRefresh";

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

test("resolvePageListMountRefreshOptions keeps mount refresh in background when cache exists", () => {
  expect(
    resolvePageListMountRefreshOptions(true)
  ).toEqual({
    force: false,
    background: true,
  });
});

test("resolvePageListMountRefreshOptions uses foreground forced fetch when cache is missing", () => {
  expect(
    resolvePageListMountRefreshOptions(false)
  ).toEqual({
    force: true,
    background: false,
  });
});

test("resolveCacheRefreshBackground respects explicit override", () => {
  expect(
    resolveCacheRefreshBackground({
      explicitBackground: false,
      hasHydrated: true,
    })
  ).toBe(false);
});
