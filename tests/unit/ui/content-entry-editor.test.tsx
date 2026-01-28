import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryEditor } from "../../../core/admin/ui/entries/EntryEditor";

test("EntryEditor renders main panels", () => {
  const html = renderToString(<EntryEditor />);

  expect(html).toContain("Entry content");
  expect(html).toContain("Media");
  expect(html).toContain("Relations");
  expect(html).toContain("Search Engine Optimization");
  expect(html).toContain("Taxonomy");
});
