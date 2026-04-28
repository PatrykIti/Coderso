import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { WebhooksPage } from "../../../core/admin/ui/settings/WebhooksPage";

test("WebhooksPage renders", () => {
  const html = renderAdminUi(<WebhooksPage />);
  expect(html).toContain("Webhooks");
  expect(html).toContain("Create Webhook");
});

