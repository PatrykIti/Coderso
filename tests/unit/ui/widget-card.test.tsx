import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { WidgetCard } from "../../../core/admin/ui/widgets/WidgetCard";

test("WidgetCard compact variant renders with visible border", () => {
  const html = renderAdminUi(
    <WidgetCard name="Hero" categoryLabel="Layout" variant="compact" />
  );

  expect(html).toContain("border-border/60");
  expect(html).toContain("bg-muted/20");
});
