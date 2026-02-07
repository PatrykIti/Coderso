import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryEditor } from "../../../core/admin/ui/entries/EntryEditor";

test("EntryEditor renders main panels", () => {
  const html = renderToString(<EntryEditor />);

  expect(html).toContain("Loading entry fields");
  expect(html).toContain("Search Engine Optimization");
  expect(html).toContain("Taxonomy");
  expect(html).toContain("Runtime preview");
});
