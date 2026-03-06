import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { EmailSettingsPage } from "../../../core/admin/ui/settings/EmailSettingsPage";

test("EmailSettingsPage renders", () => {
  const html = renderAdminUi(<EmailSettingsPage />);
  expect(html).toContain("Email Settings");
  expect(html).toContain("Save changes");
  expect(html).toContain("Auto-save settings across all screens");
});
