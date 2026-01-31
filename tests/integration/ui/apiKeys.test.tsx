import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ApiKeysPage } from "../../../core/admin/ui/settings/ApiKeysPage";

test("ApiKeysPage renders", () => {
  const html = renderToString(<ApiKeysPage />);
  expect(html).toContain("API Keys");
  expect(html).toContain("Create API Key");
});

