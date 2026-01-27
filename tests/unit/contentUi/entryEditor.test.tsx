import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryEditor } from "../../../core/admin/ui/entries/EntryEditor";

test("EntryEditor renders schema-based fields", () => {
  const html = renderToString(<EntryEditor />);

  expect(html).toContain("Entry Editor");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("Summary");
  expect(html).toContain("Preview Link");
});
