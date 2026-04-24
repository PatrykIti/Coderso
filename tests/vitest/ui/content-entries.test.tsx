import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { EntryList } from "../../../core/admin/ui/entries/EntryList";

test("EntryList renders admin shell list header", () => {
  const html = renderAdminUi(<EntryList />);

  expect(html).toContain("Entries");
  expect(html).toContain("New");
  expect(html).toContain("Loading entries");
});
