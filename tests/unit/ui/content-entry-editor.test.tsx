import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { EntryEditor } from "../../../core/admin/ui/entries/EntryEditor";

test("EntryEditor renders main panels", () => {
  const html = renderAdminUi(<EntryEditor />);

  expect(html).toContain("Loading entry fields");
  expect(html).toContain("Search Engine Optimization");
  expect(html).toContain("Taxonomy");
  expect(html).toContain("Runtime preview");
});
