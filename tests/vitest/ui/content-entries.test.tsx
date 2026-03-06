import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { EntryList } from "../../../core/admin/ui/entries/EntryList";

test("EntryList renders sidebar and table", () => {
  const html = renderAdminUi(<EntryList />);

  expect(html).toContain("Content Types");
  expect(html).toContain("Create New Content");
  expect(html).toContain("Loading entries");
});
