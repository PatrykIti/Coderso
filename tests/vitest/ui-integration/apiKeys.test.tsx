import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ApiKeysPage } from "../../../core/admin/ui/settings/ApiKeysPage";

test("ApiKeysPage renders", () => {
  const html = renderAdminUi(<ApiKeysPage />);
  expect(html).toContain("API Keys");
  expect(html).toContain("Create API Key");
});

