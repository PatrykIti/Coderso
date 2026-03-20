import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AssistantSettingsPage } from "../../../core/admin/ui/settings/AssistantSettingsPage";

test("AssistantSettingsPage renders assistant settings", () => {
  const html = renderAdminUi(<AssistantSettingsPage />);

  expect(html).toContain("Assistant Settings");
  expect(html).toContain("Assistant");
  expect(html).toContain("Launcher avatar");
  expect(html).toContain("Save changes");
  expect(html).toContain("Auto-save settings across all screens");
});
