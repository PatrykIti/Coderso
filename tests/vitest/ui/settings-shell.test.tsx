import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SettingsShell } from "../../../core/admin/ui/layouts/SettingsShell";

test("SettingsShell uses independent scroll containers", () => {
  const html = renderAdminUi(
    <SettingsShell sidebar={<div>Sidebar</div>} preview={<div>Preview</div>}>
      <div>Content</div>
    </SettingsShell>
  );

  const overscrollCount = (html.match(/overscroll-contain/g) ?? []).length;
  expect(overscrollCount).toBeGreaterThanOrEqual(3);
  expect(html).toContain("overflow-hidden");
});
