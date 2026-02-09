import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { GeneralSettingsPage } from "../../../core/admin/ui/settings/GeneralSettingsPage";

test("GeneralSettingsPage renders general settings cards", () => {
  const html = renderToString(<GeneralSettingsPage />);

  expect(html).toContain("Site Identity");
  expect(html).toContain("Branding");
  expect(html).toContain("Assistant");
  expect(html).toContain("Save changes");
  expect(html).toContain("Auto-save settings across all screens");
});
