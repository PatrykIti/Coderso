import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { WidgetCard } from "../../../core/admin/ui/widgets/WidgetCard";

test("WidgetCard compact variant renders with visible border", () => {
  const html = renderAdminUi(
    <WidgetCard name="Hero" categoryLabel="Layout" variant="compact" />
  );

  expect(html).toContain("border-border/60");
  expect(html).toContain("bg-muted/20");
});

test("WidgetCard exposes grid selection and action menu slots", () => {
  const html = renderAdminUi(
    <WidgetCard
      name="Hero"
      categoryLabel="Layout"
      selected
      onSelectionChange={() => undefined}
      actions={<button type="button">Open widget actions</button>}
    />
  );

  expect(html).toContain("Select Hero");
  expect(html).toContain("Open widget actions");
  expect(html).not.toContain("Add Hero to favorites");
});
