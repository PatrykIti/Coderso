import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { DeviceSwitcher } from "../../../core/admin/ui/pages/DeviceSwitcher";

test("DeviceSwitcher renders device buttons", () => {
  const html = renderAdminUi(<DeviceSwitcher />);

  expect(html).toContain("Desktop");
  expect(html).toContain("Tablet");
  expect(html).toContain("Mobile");
});
