import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryList } from "../../../core/admin/ui/entries/EntryList";

test("EntryList renders sidebar and table", () => {
  const html = renderToString(<EntryList />);

  expect(html).toContain("Content Types");
  expect(html).toContain("Create New Content");
  expect(html).toContain("Loading entries");
});
