import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WebhooksPage } from "../../../core/admin/ui/settings/WebhooksPage";
import { WebhookDrawer } from "../../../core/admin/ui/settings/WebhookDrawer";

test("WebhooksPage renders table and drawer content", () => {
  const html = renderToString(
    <>
      <WebhooksPage />
      <WebhookDrawer
        open
        onOpenChange={() => undefined}
        mode="create"
        webhook={null}
      />
    </>
  );

  expect(html).toContain("Webhooks");
  expect(html).toContain("Create Webhook");
  expect(html).toContain("URL");
  expect(html).toContain("Event Triggers");
  expect(html).toContain("Create New Webhook");
});
