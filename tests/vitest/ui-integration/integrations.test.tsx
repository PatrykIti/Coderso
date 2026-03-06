import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { IntegrationsPage } from "../../../core/admin/ui/settings/IntegrationsPage";

test("IntegrationsPage renders", () => {
  const html = renderAdminUi(<IntegrationsPage />);
  expect(html).toContain("Integrations");
  expect(html).toContain("Request new");
});
