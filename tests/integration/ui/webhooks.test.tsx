import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WebhooksPage } from "../../../core/admin/ui/settings/WebhooksPage";

test("WebhooksPage renders", () => {
  const html = renderToString(<WebhooksPage />);
  expect(html).toContain("Webhooks");
  expect(html).toContain("Create Webhook");
});

