import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { WebhooksPage } from "../../../core/admin/ui/settings/WebhooksPage";

test("WebhooksPage renders", () => {
  const html = renderAdminUi(<WebhooksPage />);
  expect(html).toContain("Webhooks");
  expect(html).toContain("Create Webhook");
});

