import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { BackupsPage } from "../../../core/admin/ui/backups/BackupsPage";

test("BackupsPage renders schedule and table", () => {
  const html = renderAdminUi(<BackupsPage />);

  expect(html).toContain("Backup Schedule");
  expect(html).toContain("Recent Backups");
  expect(html).toContain("Create Backup Now");
});
