import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { StatCard } from "../../../core/admin/ui/dashboard/StatCard";

test("StatCard renders label and value", () => {
  const html = renderAdminUi(
    <StatCard label="Visitors" value="1,000" delta="+5%" />
  );

  expect(html).toContain("Visitors");
  expect(html).toContain("1,000");
});
