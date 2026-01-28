import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { IntegrationsPage } from "../../../core/admin/ui/settings/IntegrationsPage";

test("IntegrationsPage renders integration cards", () => {
  const html = renderToString(<IntegrationsPage />);

  expect(html).toContain("Google Analytics");
  expect(html).toContain("Slack");
  expect(html).toContain("Zapier");
  expect(html).toContain("Sentry");
  expect(html).toContain("Connected");
  expect(html).toContain("Not connected");
});
