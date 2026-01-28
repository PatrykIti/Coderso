import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SecuritySettingsPage } from "../../../core/admin/ui/settings/SecuritySettingsPage";

test("SecuritySettingsPage renders cards and allowlist table", () => {
  const html = renderToString(<SecuritySettingsPage />);

  expect(html).toContain("Security Settings");
  expect(html).toContain("Password Policy");
  expect(html).toContain("Two-Factor Authentication");
  expect(html).toContain("Session Management");
  expect(html).toContain("Active Restrictions");
  expect(html).toContain("Login Alerts");
  expect(html).toContain("IP Range (CIDR)");
});
