import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { GeneralSettingsPage } from "../../../core/admin/ui/settings/GeneralSettingsPage";

test("GeneralSettingsPage renders general settings cards", () => {
  const html = renderAdminUi(<GeneralSettingsPage />);

  expect(html).toContain("Site Identity");
  expect(html).toContain("Branding");
  expect(html).toContain("Save changes");
  expect(html).toContain("Auto-save settings across all screens");
});
