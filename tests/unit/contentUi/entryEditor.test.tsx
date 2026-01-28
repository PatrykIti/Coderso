import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryEditor } from "../../../core/admin/ui/entries/EntryEditor";

test("EntryEditor renders schema-based fields", () => {
  const html = renderToString(<EntryEditor />);

  expect(html).toContain("Edit Entry");
  expect(html).toContain("Preview");
  expect(html).toContain("Update");
  expect(html).toContain("Entry content");
  expect(html).toContain("Publishing");
});
