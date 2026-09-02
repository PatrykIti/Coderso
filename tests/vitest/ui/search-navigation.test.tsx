import { expect, test } from "vitest";

import { resolveSearchDestination } from "../../../core/admin/ui/search/searchNavigation";

test("resolveSearchDestination builds admin URLs", () => {
  expect(
    resolveSearchDestination({
      id: "page-1",
      title: "About",
      type: "page",
    })
  ).toBe("/admin/pages/page-1");

  expect(
    resolveSearchDestination({
      id: "entry-1",
      title: "News",
      type: "entry",
      entryTypeSlug: "news",
    })
  ).toBe("/admin/entries/news/entry-1");

  expect(
    resolveSearchDestination({
      id: "entry-2",
      title: "FAQ",
      type: "entry",
      categoryId: "entry:faq",
    })
  ).toBe("/admin/entries/faq/entry-2");

  expect(
    resolveSearchDestination({
      id: "media-1",
      title: "Logo",
      type: "media",
    })
  ).toBe("/admin/media?selected=media-1");

  expect(
    resolveSearchDestination({
      id: "user-1",
      title: "System Admin",
      type: "user",
    })
  ).toBe("/admin/users?user=user-1");
});

test("resolveSearchDestination falls back to the entries index", () => {
  expect(
    resolveSearchDestination({
      id: "entry-3",
      title: "Draft",
      type: "entry",
    })
  ).toBe("/admin/entries");
});

test("resolveSearchDestination returns null for unknown types", () => {
  expect(
    resolveSearchDestination({
      id: "x-2",
      title: "Unknown",
      type: "unknown",
    } as never)
  ).toBe(null);
});
