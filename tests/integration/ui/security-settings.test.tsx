import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SecuritySettingsPage } from "../../../core/admin/ui/settings/SecuritySettingsPage";

test("SecuritySettingsPage renders", () => {
  const html = renderAdminUi(<SecuritySettingsPage />);
  expect(html).toContain("Security Settings");
  expect(html).toContain("Auth protection");
  expect(html).toContain("CSRF");
});
