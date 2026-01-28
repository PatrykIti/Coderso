import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ApiKeyDialog } from "../../../core/admin/ui/settings/ApiKeyDialog";
import { ApiKeysPage } from "../../../core/admin/ui/settings/ApiKeysPage";

test("ApiKeysPage renders header and table", () => {
  const html = renderToString(<ApiKeysPage />);

  expect(html).toContain("API Keys");
  expect(html).toContain("Create API Key");
  expect(html).toContain("Scope");
  expect(html).toContain("Status");
});

test("ApiKeyDialog renders create form", () => {
  const html = renderToString(
    <ApiKeyDialog open onOpenChange={() => undefined} />
  );

  expect(html).toContain("Create API Key");
  expect(html).toContain("Key Name");
  expect(html).toContain("Scopes");
});
