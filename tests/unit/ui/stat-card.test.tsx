import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { StatCard } from "../../../core/admin/ui/dashboard/StatCard";

test("StatCard renders label and value", () => {
  const html = renderToString(
    <StatCard label="Visitors" value="1,000" delta="+5%" />
  );

  expect(html).toContain("Visitors");
  expect(html).toContain("1,000");
});
