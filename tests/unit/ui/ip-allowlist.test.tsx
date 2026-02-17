import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { IpAllowlistPage } from "../../../core/admin/ui/settings/IpAllowlistPage";

test("IpAllowlistPage renders table and drawer", () => {
  const html = renderAdminUi(<IpAllowlistPage />);

  expect(html).toContain("IP Allowlist");
  expect(html).toContain("Active Restrictions");
  expect(html).toContain("Add New IP Range");
  expect(html).toContain("Loading allowlist");
});
