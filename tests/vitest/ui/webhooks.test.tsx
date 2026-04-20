import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { WebhooksPage } from "../../../core/admin/ui/settings/WebhooksPage";
import { WebhookDrawer } from "../../../core/admin/ui/settings/WebhookDrawer";

test("WebhooksPage renders table and drawer content", () => {
  const html = renderAdminUi(
    <>
      <WebhooksPage />
      <WebhookDrawer
        open
        onOpenChange={() => undefined}
        mode="create"
        webhook={null}
        onSave={async () => undefined}
      />
    </>
  );

  expect(html).toContain("Webhooks");
  expect(html).toContain("Create Webhook");
  expect(html).toContain("URL");
  expect(html).toContain("Event Triggers");
  expect(html).toContain("Create New Webhook");
});
