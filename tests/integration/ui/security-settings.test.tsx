import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SecuritySettingsPage } from "../../../core/admin/ui/settings/SecuritySettingsPage";

test("SecuritySettingsPage renders", () => {
  const html = renderToString(<SecuritySettingsPage />);
  expect(html).toContain("Security Settings");
  expect(html).toContain("CSRF Protection");
});
