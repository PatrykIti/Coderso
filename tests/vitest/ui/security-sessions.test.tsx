import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SessionsPage } from "../../../core/admin/ui/settings/SessionsPage";

test("SessionsPage renders sessions table", () => {
  const html = renderAdminUi(<SessionsPage />);

  expect(html).toContain("Where you&#x27;re signed in");
  expect(html).toContain("Device/OS");
  expect(html).toContain("Loading sessions");
});
