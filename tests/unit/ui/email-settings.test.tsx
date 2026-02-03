import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EmailSettingsPage } from "../../../core/admin/ui/settings/EmailSettingsPage";

test("EmailSettingsPage renders email settings cards", () => {
  const html = renderToString(<EmailSettingsPage />);

  expect(html).toContain("SMTP Server Configuration");
  expect(html).toContain("Default Sender Info");
  expect(html).toContain("Test Email");
  expect(html).toContain("Connection Status");
  expect(html).toContain("Auto-save settings across all screens");
});

test("EmailSettingsPage renders test email CTA", () => {
  const html = renderToString(<EmailSettingsPage />);

  expect(html).toContain("Send Test Email");
});
