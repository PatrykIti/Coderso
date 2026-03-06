import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { EntryBulkActionsBar } from "../../../core/admin/ui/entries/EntryBulkActionsBar";

test("EntryBulkActionsBar renders selection count and actions", () => {
  const html = renderAdminUi(
    <EntryBulkActionsBar
      selectedCount={3}
      action=""
      onActionChange={() => undefined}
      onApply={() => undefined}
      onClear={() => undefined}
    />
  );

  expect(html).toContain("Selected");
  expect(html).toContain("3");
  expect(html).toContain("Bulk actions");
  expect(html).toContain("Apply");
  expect(html).toContain("Clear selection");
});
