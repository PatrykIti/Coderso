import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WebhooksPage } from "../../../core/admin/ui/settings/WebhooksPage";

test("WebhooksPage renders table and drawer content", () => {
  const html = renderToString(<WebhooksPage />);

  expect(html).toContain("Webhooks");
  expect(html).toContain("Create Webhook");
  expect(html).toContain("URL");
  expect(html).toContain("Event Triggers");
  expect(html).toContain("Create New Webhook");
});
