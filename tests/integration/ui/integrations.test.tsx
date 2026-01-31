import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { IntegrationsPage } from "../../../core/admin/ui/settings/IntegrationsPage";

test("IntegrationsPage renders", () => {
  const html = renderToString(<IntegrationsPage />);
  expect(html).toContain("Integrations");
  expect(html).toContain("Request new");
});
