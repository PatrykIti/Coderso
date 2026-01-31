import { expect, test } from "bun:test";

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
