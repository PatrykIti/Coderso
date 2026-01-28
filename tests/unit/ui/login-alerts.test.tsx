import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { LoginAlertsPage } from "../../../core/admin/ui/settings/LoginAlertsPage";

test("LoginAlertsPage renders toggles", () => {
  const html = renderToString(<LoginAlertsPage />);

  expect(html).toContain("Suspicious Login Alerts");
  expect(html).toContain("Admin-only alerts");
  expect(html).toContain("Email");
  expect(html).toContain("Webhook");
});
