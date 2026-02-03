import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EmailSettingsPage } from "../../../core/admin/ui/settings/EmailSettingsPage";

test("EmailSettingsPage renders", () => {
  const html = renderToString(<EmailSettingsPage />);
  expect(html).toContain("Email Settings");
  expect(html).toContain("Save changes");
  expect(html).toContain("Auto-save settings across all screens");
});
