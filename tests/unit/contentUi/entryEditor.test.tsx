import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryEditor } from "../../../core/admin/ui/entries/EntryEditor";

test("EntryEditor renders schema-based fields", () => {
  const html = renderToString(<EntryEditor />);

  expect(html).toContain("Edit Entry");
  expect(html).toContain("Preview");
  expect(html).toContain("Publish");
  expect(html).toContain("Loading entry fields");
  expect(html).toContain("Publishing");
});
