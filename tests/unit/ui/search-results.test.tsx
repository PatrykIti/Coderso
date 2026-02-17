import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import {
  SearchResults,
  groupResults,
  type SearchItem,
} from "../../../core/admin/ui/search/SearchResults";

test("SearchResults highlights active item", () => {
  const items: SearchItem[] = [
    { id: "page-1", type: "page", title: "Homepage" },
    { id: "entry-1", type: "entry", title: "Launch announcement" },
  ];
  const groups = groupResults(items);
  const html = renderAdminUi(
    <SearchResults query="home" groups={groups} activeIndex={1} />
  );

  expect(html).toContain("Pages");
  expect(html).toContain("Content");
  expect(html).toContain('data-active="true"');
});
