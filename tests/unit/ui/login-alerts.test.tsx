import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { LoginAlertsPage } from "../../../core/admin/ui/settings/LoginAlertsPage";

test("LoginAlertsPage renders toggles", () => {
  const html = renderAdminUi(<LoginAlertsPage />);

  expect(html).toContain("Suspicious Login Alerts");
  expect(html).toContain("Alert on new device");
  expect(html).toContain("Alert on new location");
  expect(html).toContain("Admin-only alerts");
  expect(html).toContain("Email");
  expect(html).toContain("Webhook");
});
