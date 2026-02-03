import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SecuritySettingsPage } from "../../../core/admin/ui/settings/SecuritySettingsPage";

test("SecuritySettingsPage renders cards and allowlist table", () => {
  const html = renderToString(<SecuritySettingsPage />);

  expect(html).toContain("Security Settings");
  expect(html).toContain("Request Context");
  expect(html).toContain("CSRF Protection");
  expect(html).toContain("CORS Policy");
  expect(html).toContain("Rate Limiting");
  expect(html).toContain("Session Limits");
  expect(html).toContain("Plugin Safety");
  expect(html).toContain("Active Restrictions");
  expect(html).toContain("Login Alerts");
  expect(html).toContain("IP Range (CIDR)");
  expect(html).toContain("Auto-save settings across all screens");
});
