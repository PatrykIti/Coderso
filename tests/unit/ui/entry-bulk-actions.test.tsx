import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryBulkActionsBar } from "../../../core/admin/ui/entries/EntryBulkActionsBar";

test("EntryBulkActionsBar renders selection count and actions", () => {
  const html = renderToString(
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
