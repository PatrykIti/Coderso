import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { EntryEditor } from "../../../core/admin/ui/entries/EntryEditor";

test("EntryEditor renders schema-based fields", () => {
  const html = renderAdminUi(<EntryEditor />);

  expect(html).toContain("Edit Content");
  expect(html).toContain("Runtime preview");
  expect(html).toContain("Publish");
  expect(html).toContain("Loading entry fields");
});
